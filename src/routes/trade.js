const express = require('express');
const db = require('../db/database');
const { requireNation } = require('../middleware/auth');
const { BASE_PRICES, RESOURCES } = require('../game/economy');
const router = express.Router();

// GET /trade
router.get('/', (req, res) => {
  const resource = req.query.resource || 'all';
  const type = req.query.type || 'all';

  let query = `
    SELECT t.*, n.name as nation_name, n.flag_url
    FROM trade_offers t
    JOIN nations n ON n.id = t.nation_id
    WHERE t.active = 1
  `;
  const params = [];

  if (resource !== 'all') {
    query += ' AND t.resource = ?';
    params.push(resource);
  }
  if (type !== 'all') {
    query += ' AND t.offer_type = ?';
    params.push(type);
  }
  query += ' ORDER BY t.created_at DESC LIMIT 200';

  const offers = db.prepare(query).all(...params);

  // Market prices (average of recent trades)
  const marketPrices = {};
  for (const r of RESOURCES) {
    const recent = db.prepare(`
      SELECT AVG(price_per_unit) as avg_price FROM trade_history
      WHERE resource = ? AND date > datetime('now', '-7 days')
    `).get(r);
    marketPrices[r] = recent.avg_price || BASE_PRICES[r];
  }

  const recentTrades = db.prepare(`
    SELECT th.*, bn.name as buyer_name, sn.name as seller_name
    FROM trade_history th
    JOIN nations bn ON bn.id = th.buyer_id
    JOIN nations sn ON sn.id = th.seller_id
    ORDER BY th.date DESC LIMIT 20
  `).all();

  res.render('trade/index', {
    offers, marketPrices, RESOURCES, BASE_PRICES, recentTrades,
    selectedResource: resource, selectedType: type,
    nation: res.locals.nation,
    error: req.query.error || null,
    success: req.query.success || null,
  });
});

// GET /trade/create
router.get('/create', requireNation, (req, res) => {
  res.render('trade/create', { RESOURCES, BASE_PRICES, error: null, values: {}, nation: req.nation });
});

// POST /trade/create - Post a new offer
router.post('/create', requireNation, (req, res) => {
  const { resource, quantity, price_per_unit, offer_type } = req.body;
  const qty = parseFloat(quantity);
  const price = parseFloat(price_per_unit);

  if (!RESOURCES.includes(resource)) {
    return res.render('trade/create', { RESOURCES, BASE_PRICES, error: 'Invalid resource.', values: req.body, nation: req.nation });
  }
  if (isNaN(qty) || qty <= 0) {
    return res.render('trade/create', { RESOURCES, BASE_PRICES, error: 'Invalid quantity.', values: req.body, nation: req.nation });
  }
  if (isNaN(price) || price <= 0) {
    return res.render('trade/create', { RESOURCES, BASE_PRICES, error: 'Invalid price.', values: req.body, nation: req.nation });
  }
  if (!['buy', 'sell'].includes(offer_type)) {
    return res.render('trade/create', { RESOURCES, BASE_PRICES, error: 'Invalid offer type.', values: req.body, nation: req.nation });
  }

  const nation = db.prepare('SELECT * FROM nations WHERE id = ?').get(req.nation.id);

  if (offer_type === 'sell') {
    if (nation[resource] < qty) {
      return res.render('trade/create', { RESOURCES, BASE_PRICES, error: `Not enough ${resource}.`, values: req.body, nation: req.nation });
    }
    // Reserve the resources
    db.prepare(`UPDATE nations SET ${resource} = ${resource} - ? WHERE id = ?`).run(qty, req.nation.id);
  } else {
    // Buy: need enough money
    const total = qty * price;
    if (nation.money < total) {
      return res.render('trade/create', { RESOURCES, BASE_PRICES, error: 'Not enough money to post buy offer.', values: req.body, nation: req.nation });
    }
    db.prepare('UPDATE nations SET money = money - ? WHERE id = ?').run(total, req.nation.id);
  }

  db.prepare(`
    INSERT INTO trade_offers (nation_id, resource, quantity, price_per_unit, offer_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.nation.id, resource, qty, price, offer_type);

  res.redirect('/trade?success=Offer+posted');
});

// POST /trade/accept/:id
router.post('/accept/:id', requireNation, (req, res) => {
  const offer = db.prepare(`
    SELECT t.*, n.name as seller_name
    FROM trade_offers t
    JOIN nations n ON n.id = t.nation_id
    WHERE t.id = ? AND t.active = 1
  `).get(req.params.id);

  if (!offer) return res.redirect('/trade?error=Offer+not+found+or+expired');
  if (offer.nation_id === req.nation.id) return res.redirect('/trade?error=Cannot+accept+your+own+offer');

  const total = offer.quantity * offer.price_per_unit;
  const nation = db.prepare('SELECT * FROM nations WHERE id = ?').get(req.nation.id);
  const poster = db.prepare('SELECT * FROM nations WHERE id = ?').get(offer.nation_id);

  if (offer.offer_type === 'sell') {
    // Buyer needs money
    if (nation.money < total) return res.redirect('/trade?error=Not+enough+money');

    // Transfer resources and money
    db.prepare(`UPDATE nations SET ${offer.resource} = ${offer.resource} + ?, money = money - ? WHERE id = ?`).run(
      offer.quantity, total, req.nation.id
    );
    db.prepare('UPDATE nations SET money = money + ? WHERE id = ?').run(total, offer.nation_id);

  } else {
    // Poster is buyer, accepter is seller - needs the resource
    if (nation[offer.resource] < offer.quantity) {
      return res.redirect(`/trade?error=Not+enough+${offer.resource}`);
    }
    // Transfer
    db.prepare(`UPDATE nations SET ${offer.resource} = ${offer.resource} - ?, money = money + ? WHERE id = ?`).run(
      offer.quantity, total, req.nation.id
    );
    db.prepare(`UPDATE nations SET ${offer.resource} = ${offer.resource} + ? WHERE id = ?`).run(
      offer.quantity, offer.nation_id
    );
    // Poster already paid, money was reserved - poster gets resource
  }

  // Mark offer as inactive
  db.prepare('UPDATE trade_offers SET active = 0 WHERE id = ?').run(offer.id);

  // Record trade history
  const buyerId = offer.offer_type === 'sell' ? req.nation.id : offer.nation_id;
  const sellerId = offer.offer_type === 'sell' ? offer.nation_id : req.nation.id;
  db.prepare(`
    INSERT INTO trade_history (buyer_id, seller_id, resource, quantity, price_per_unit, total)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(buyerId, sellerId, offer.resource, offer.quantity, offer.price_per_unit, total);

  res.redirect('/trade?success=Trade+completed');
});

// POST /trade/cancel/:id
router.post('/cancel/:id', requireNation, (req, res) => {
  const offer = db.prepare('SELECT * FROM trade_offers WHERE id = ? AND nation_id = ? AND active = 1').get(
    req.params.id, req.nation.id
  );
  if (!offer) return res.redirect('/trade?error=Offer+not+found');

  // Refund reserved resources
  if (offer.offer_type === 'sell') {
    db.prepare(`UPDATE nations SET ${offer.resource} = ${offer.resource} + ? WHERE id = ?`).run(offer.quantity, req.nation.id);
  } else {
    const total = offer.quantity * offer.price_per_unit;
    db.prepare('UPDATE nations SET money = money + ? WHERE id = ?').run(total, req.nation.id);
  }

  db.prepare('UPDATE trade_offers SET active = 0 WHERE id = ?').run(offer.id);
  res.redirect('/trade?success=Offer+cancelled');
});

module.exports = router;

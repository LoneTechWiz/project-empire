const express = require('express');
const db = require('../db/database');
const { requireNation } = require('../middleware/auth');
const router = express.Router();

// Max military based on city count
function getMaxMilitary(nation, cities) {
  const cityCount = cities.length;
  return {
    soldiers: cityCount * 15000,
    tanks: cityCount * 1250,
    aircraft: cityCount * 75,
    ships: cityCount * 15,
    spies: Math.min(60, cityCount * 5),
    missiles: 0, // no max, limited by capacity
    nukes: 0,
  };
}

// Buy costs per unit
const BUY_COSTS = {
  soldiers: { money: 5, food: 0.01 },
  tanks: { money: 60, steel: 0.5, gasoline: 0.1 },
  aircraft: { money: 4000, aluminum: 5, gasoline: 5 },
  ships: { money: 50000, steel: 30, aluminum: 20 },
  spies: { money: 50000 },
  missiles: { money: 150000, aluminum: 100, gasoline: 75, munitions: 75 },
  nukes: { money: 1750000, aluminum: 750, gasoline: 500, munitions: 375, uranium: 250 },
};

// GET /military
router.get('/', requireNation, (req, res) => {
  const cities = db.prepare('SELECT * FROM cities WHERE nation_id = ?').all(req.nation.id);
  const maxMilitary = getMaxMilitary(req.nation, cities);
  const projects = JSON.parse(req.nation.projects || '[]');
  res.render('military/index', {
    nation: req.nation,
    maxMilitary,
    BUY_COSTS,
    cities,
    projects,
    error: req.query.error || null,
    success: req.query.success || null,
  });
});

// POST /military/buy
router.post('/buy', requireNation, (req, res) => {
  const { unit, quantity } = req.body;
  const qty = parseInt(quantity);

  if (!BUY_COSTS[unit] || isNaN(qty) || qty <= 0) {
    return res.redirect('/military?error=Invalid+unit+or+quantity');
  }

  const cities = db.prepare('SELECT * FROM cities WHERE nation_id = ?').all(req.nation.id);
  const maxMilitary = getMaxMilitary(req.nation, cities);
  const current = req.nation[unit] || 0;

  // Check max (missiles/nukes have no max from cities)
  if (maxMilitary[unit] !== undefined && maxMilitary[unit] > 0) {
    if (current + qty > maxMilitary[unit]) {
      return res.redirect(`/military?error=Exceeds+maximum+${unit}`);
    }
  }

  // Check resources
  const costs = BUY_COSTS[unit];
  const nation = db.prepare('SELECT * FROM nations WHERE id = ?').get(req.nation.id);

  for (const [resource, perUnit] of Object.entries(costs)) {
    const total = perUnit * qty;
    if (nation[resource] < total) {
      return res.redirect(`/military?error=Not+enough+${resource}`);
    }
  }

  // Deduct resources
  let updateParts = [`${unit} = ${unit} + ${qty}`];
  for (const [resource, perUnit] of Object.entries(costs)) {
    updateParts.push(`${resource} = ${resource} - ${perUnit * qty}`);
  }
  db.prepare(`UPDATE nations SET ${updateParts.join(', ')} WHERE id = ?`).run(req.nation.id);

  res.redirect('/military?success=Units+purchased');
});

// POST /military/disband
router.post('/disband', requireNation, (req, res) => {
  const { unit, quantity } = req.body;
  const qty = parseInt(quantity);

  if (!BUY_COSTS[unit] || isNaN(qty) || qty <= 0) {
    return res.redirect('/military?error=Invalid+unit+or+quantity');
  }

  const current = req.nation[unit] || 0;
  if (qty > current) {
    return res.redirect('/military?error=Not+enough+units+to+disband');
  }

  db.prepare(`UPDATE nations SET ${unit} = ${unit} - ? WHERE id = ?`).run(qty, req.nation.id);
  res.redirect('/military?success=Units+disbanded');
});

module.exports = router;
module.exports.BUY_COSTS = BUY_COSTS;
module.exports.getMaxMilitary = getMaxMilitary;

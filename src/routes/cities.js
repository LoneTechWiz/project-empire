const express = require('express');
const db = require('../db/database');
const { requireNation } = require('../middleware/auth');
const { getCityPower, getCityCommerce, calcCityProduction } = require('../game/economy');
const router = express.Router();

// Improvement costs
const IMP_COSTS = {
  imp_coalpower: 5000,
  imp_oilpower: 4000,
  imp_nuclearpower: 500000,
  imp_windpower: 3000,
  imp_coalmine: 1000,
  imp_oilwell: 1500,
  imp_ironmine: 9500,
  imp_bauxitemine: 9500,
  imp_leadmine: 7500,
  imp_uraniummine: 25000,
  imp_farm: 1000,
  imp_oilrefinery: 45000,
  imp_steelmill: 45000,
  imp_aluminumrefinery: 30000,
  imp_munitionsfactory: 35000,
  imp_policestation: 10000,
  imp_hospital: 100000,
  imp_recyclingcenter: 125000,
  imp_subway: 250000,
  imp_supermarket: 5000,
  imp_bank: 15000,
  imp_mall: 50000,
  imp_stadium: 100000,
};

const IMP_NAMES = {
  imp_coalpower: 'Coal Power Plant',
  imp_oilpower: 'Oil Power Plant',
  imp_nuclearpower: 'Nuclear Power Plant',
  imp_windpower: 'Wind Power',
  imp_coalmine: 'Coal Mine',
  imp_oilwell: 'Oil Well',
  imp_ironmine: 'Iron Mine',
  imp_bauxitemine: 'Bauxite Mine',
  imp_leadmine: 'Lead Mine',
  imp_uraniummine: 'Uranium Mine',
  imp_farm: 'Farm',
  imp_oilrefinery: 'Oil Refinery',
  imp_steelmill: 'Steel Mill',
  imp_aluminumrefinery: 'Aluminum Refinery',
  imp_munitionsfactory: 'Munitions Factory',
  imp_policestation: 'Police Station',
  imp_hospital: 'Hospital',
  imp_recyclingcenter: 'Recycling Center',
  imp_subway: 'Subway',
  imp_supermarket: 'Supermarket',
  imp_bank: 'Bank',
  imp_mall: 'Mall',
  imp_stadium: 'Stadium',
};

const MAX_PER_IMP = {
  imp_coalpower: 5,
  imp_oilpower: 5,
  imp_nuclearpower: 5,
  imp_windpower: 50,
  imp_coalmine: 10,
  imp_oilwell: 10,
  imp_ironmine: 10,
  imp_bauxitemine: 10,
  imp_leadmine: 10,
  imp_uraniummine: 5,
  imp_farm: 20,
  imp_oilrefinery: 5,
  imp_steelmill: 5,
  imp_aluminumrefinery: 5,
  imp_munitionsfactory: 5,
  imp_policestation: 5,
  imp_hospital: 5,
  imp_recyclingcenter: 5,
  imp_subway: 3,
  imp_supermarket: 5,
  imp_bank: 5,
  imp_mall: 5,
  imp_stadium: 3,
};

function infraCost(current, target) {
  let cost = 0;
  for (let i = current; i < target; i++) {
    cost += 300 + (i * 150);
  }
  return cost;
}

function cityBuyCost(cityCount) {
  // Each city costs more than the last
  return 50000 + (cityCount * 50000);
}

// GET /cities
router.get('/', requireNation, (req, res) => {
  const cities = db.prepare('SELECT * FROM cities WHERE nation_id = ?').all(req.nation.id);
  const cityStats = cities.map(c => ({
    ...c,
    power: getCityPower(c),
    commerce: getCityCommerce(c),
    production: calcCityProduction(c, req.nation),
  }));
  const buyCost = cityBuyCost(cities.length);
  res.render('cities/index', { cities: cityStats, buyCost, nation: req.nation, IMP_COSTS, IMP_NAMES, error: req.query.error || null, success: req.query.success || null });
});

// POST /cities/buy - Buy a new city
router.post('/buy', requireNation, (req, res) => {
  const { city_name } = req.body;
  const cities = db.prepare('SELECT * FROM cities WHERE nation_id = ?').all(req.nation.id);
  const cost = cityBuyCost(cities.length);

  if (!city_name || city_name.trim().length < 1) {
    return res.redirect('/cities?error=Please+enter+a+city+name');
  }
  if (req.nation.money < cost) {
    return res.redirect('/cities?error=Not+enough+money');
  }

  db.prepare('INSERT INTO cities (nation_id, name, infrastructure, land) VALUES (?, ?, 20, 500)').run(
    req.nation.id, city_name.trim()
  );
  db.prepare('UPDATE nations SET money = money - ? WHERE id = ?').run(cost, req.nation.id);
  db.prepare('INSERT INTO activity_log (nation_id, message) VALUES (?, ?)').run(
    req.nation.id, `New city founded: ${city_name.trim()}.`
  );

  res.redirect('/cities');
});

// GET /cities/:id - City detail
router.get('/:id', requireNation, (req, res) => {
  const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.id, req.nation.id);
  if (!city) return res.status(404).render('404', { message: 'City not found.' });

  const power = getCityPower(city);
  const commerce = getCityCommerce(city);
  const production = calcCityProduction(city, req.nation);

  res.render('cities/detail', { city, power, commerce, production, nation: req.nation, IMP_COSTS, IMP_NAMES, MAX_PER_IMP, error: req.query.error || null });
});

// POST /cities/:id/build - Build improvement
router.post('/:id/build', requireNation, (req, res) => {
  const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.id, req.nation.id);
  if (!city) return res.status(404).send('Not found');

  const { improvement } = req.body;
  if (!IMP_COSTS[improvement]) return res.redirect(`/cities/${city.id}?error=Invalid+improvement`);

  const currentCount = city[improvement] || 0;
  const max = MAX_PER_IMP[improvement] || 5;
  if (currentCount >= max) return res.redirect(`/cities/${city.id}?error=Max+reached`);

  const cost = IMP_COSTS[improvement];
  if (req.nation.money < cost) return res.redirect(`/cities/${city.id}?error=Not+enough+money`);

  db.prepare(`UPDATE cities SET ${improvement} = ${improvement} + 1 WHERE id = ?`).run(city.id);
  db.prepare('UPDATE nations SET money = money - ? WHERE id = ?').run(cost, req.nation.id);

  res.redirect(`/cities/${city.id}`);
});

// POST /cities/:id/demolish - Remove improvement
router.post('/:id/demolish', requireNation, (req, res) => {
  const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.id, req.nation.id);
  if (!city) return res.status(404).send('Not found');

  const { improvement } = req.body;
  if (!IMP_COSTS[improvement]) return res.redirect(`/cities/${city.id}?error=Invalid+improvement`);

  const currentCount = city[improvement] || 0;
  if (currentCount <= 0) return res.redirect(`/cities/${city.id}?error=Nothing+to+demolish`);

  db.prepare(`UPDATE cities SET ${improvement} = ${improvement} - 1 WHERE id = ?`).run(city.id);
  // Refund 25%
  const refund = Math.floor(IMP_COSTS[improvement] * 0.25);
  db.prepare('UPDATE nations SET money = money + ? WHERE id = ?').run(refund, req.nation.id);

  res.redirect(`/cities/${city.id}`);
});

// POST /cities/:id/infra - Upgrade infrastructure
router.post('/:id/infra', requireNation, (req, res) => {
  const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.id, req.nation.id);
  if (!city) return res.status(404).send('Not found');

  const target = parseFloat(req.body.target);
  if (isNaN(target) || target <= city.infrastructure || target > 5000) {
    return res.redirect(`/cities/${city.id}?error=Invalid+infrastructure+value`);
  }

  const cost = infraCost(city.infrastructure, target);
  if (req.nation.money < cost) return res.redirect(`/cities/${city.id}?error=Not+enough+money`);

  db.prepare('UPDATE cities SET infrastructure = ? WHERE id = ?').run(target, city.id);
  db.prepare('UPDATE nations SET money = money - ? WHERE id = ?').run(cost, req.nation.id);

  res.redirect(`/cities/${city.id}`);
});

// POST /cities/:id/land - Buy land
router.post('/:id/land', requireNation, (req, res) => {
  const city = db.prepare('SELECT * FROM cities WHERE id = ? AND nation_id = ?').get(req.params.id, req.nation.id);
  if (!city) return res.status(404).send('Not found');

  const amount = parseFloat(req.body.amount);
  if (isNaN(amount) || amount <= 0 || amount > 5000) {
    return res.redirect(`/cities/${city.id}?error=Invalid+land+amount`);
  }

  const cost = amount * 400;
  if (req.nation.money < cost) return res.redirect(`/cities/${city.id}?error=Not+enough+money`);

  db.prepare('UPDATE cities SET land = land + ? WHERE id = ?').run(amount, city.id);
  db.prepare('UPDATE nations SET money = money - ? WHERE id = ?').run(cost, req.nation.id);

  res.redirect(`/cities/${city.id}`);
});

module.exports = router;
module.exports.IMP_COSTS = IMP_COSTS;
module.exports.IMP_NAMES = IMP_NAMES;
module.exports.MAX_PER_IMP = MAX_PER_IMP;

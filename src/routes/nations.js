const express = require('express');
const db = require('../db/database');
const { requireAuth, requireNation } = require('../middleware/auth');
const { calcCityProduction, getCityPower, getCityCommerce } = require('../game/economy');
const router = express.Router();

const GOVERNMENTS = ['Absolute Monarchy', 'Democracy', 'Federal Republic', 'Theocracy',
  'Oligarchy', 'Anarchy', 'Socialist Republic', 'Constitutional Monarchy', 'Republic', 'Dictatorship'];
const RELIGIONS = ['None', 'Christianity', 'Islam', 'Buddhism', 'Hinduism', 'Sikhism',
  'Judaism', 'Animism', 'Mormonism', 'Catholicism', 'Atheism', 'Shinto'];
const CONTINENTS = ['Africa', 'Antarctica', 'Asia', 'Australia', 'Europe', 'North America', 'South America'];
const COLORS = ['aqua', 'black', 'blue', 'brown', 'green', 'gray', 'lime', 'maroon',
  'olive', 'orange', 'pink', 'purple', 'red', 'teal', 'white', 'yellow'];
const WAR_POLICIES = ['Attrition', 'Turtle', 'Blitzkrieg', 'Fortress', 'Moneybags', 'Pirate', 'Tactician', 'Guardian', 'Covert', 'Arcane'];
const DOMESTIC_POLICIES = ['Manifest Destiny', 'Open Markets', 'Technological Advancement', 'Imperialism', 'International Trade', 'Urbanization', 'Rapid Expansion', 'None'];

// GET /nation/create
router.get('/create', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id FROM nations WHERE user_id = ?').get(req.session.userId);
  if (existing) return res.redirect('/dashboard');
  res.render('nation/create', { error: null, GOVERNMENTS, RELIGIONS, CONTINENTS, COLORS, values: {} });
});

// POST /nation/create
router.post('/create', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id FROM nations WHERE user_id = ?').get(req.session.userId);
  if (existing) return res.redirect('/dashboard');

  const { name, leader_name, continent, color, government_type, religion, capital } = req.body;
  const values = { name, leader_name, continent, color, government_type, religion, capital };

  if (!name || !leader_name || !continent || !color) {
    return res.render('nation/create', { error: 'Required fields missing.', GOVERNMENTS, RELIGIONS, CONTINENTS, COLORS, values });
  }
  if (name.length < 3 || name.length > 40) {
    return res.render('nation/create', { error: 'Nation name must be 3-40 characters.', GOVERNMENTS, RELIGIONS, CONTINENTS, COLORS, values });
  }

  const existing2 = db.prepare('SELECT id FROM nations WHERE name = ?').get(name);
  if (existing2) {
    return res.render('nation/create', { error: 'Nation name already taken.', GOVERNMENTS, RELIGIONS, CONTINENTS, COLORS, values });
  }

  try {
    const result = db.prepare(`
      INSERT INTO nations (user_id, name, leader_name, continent, color, government_type, religion, capital)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.session.userId, name, leader_name, continent, color, government_type || 'Republic', religion || 'None', capital || name);

    const nationId = result.lastInsertRowid;

    // Create starting city
    db.prepare(`
      INSERT INTO cities (nation_id, name, infrastructure, land)
      VALUES (?, ?, 10, 250)
    `).run(nationId, capital || name);

    db.prepare(`INSERT INTO activity_log (nation_id, message) VALUES (?, ?)`).run(
      nationId, `${name} was founded by ${leader_name}.`
    );

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('nation/create', { error: 'Could not create nation.', GOVERNMENTS, RELIGIONS, CONTINENTS, COLORS, values });
  }
});

// GET /nation/:id - View a nation
router.get('/:id', (req, res) => {
  const nation = db.prepare('SELECT n.*, u.username FROM nations n JOIN users u ON u.id = n.user_id WHERE n.id = ?').get(req.params.id);
  if (!nation) return res.status(404).render('404', { message: 'Nation not found.' });

  const cities = db.prepare('SELECT * FROM cities WHERE nation_id = ?').all(nation.id);
  const alliance = nation.alliance_id
    ? db.prepare('SELECT * FROM alliances WHERE id = ?').get(nation.alliance_id)
    : null;

  const activeWars = db.prepare(`
    SELECT w.*,
      an.name as attacker_name, dn.name as defender_name
    FROM wars w
    JOIN nations an ON an.id = w.attacker_id
    JOIN nations dn ON dn.id = w.defender_id
    WHERE (w.attacker_id = ? OR w.defender_id = ?) AND w.status = 'active'
  `).all(nation.id, nation.id);

  const recentActivity = db.prepare(
    'SELECT * FROM activity_log WHERE nation_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(nation.id);

  // Per-city production
  const cityStats = cities.map(c => ({
    ...c,
    power: getCityPower(c),
    commerce: getCityCommerce(c),
    production: calcCityProduction(c, nation),
  }));

  const totalInfra = cities.reduce((s, c) => s + c.infrastructure, 0);
  const totalLand = cities.reduce((s, c) => s + c.land, 0);

  const isOwn = res.locals.nation && res.locals.nation.id === nation.id;

  res.render('nation/view', {
    nation, cities: cityStats, alliance, activeWars, recentActivity,
    totalInfra, totalLand, isOwn,
    projects: JSON.parse(nation.projects || '[]'),
  });
});

// GET /nation/:id/edit - Edit nation settings
router.get('/:id/edit', requireNation, (req, res) => {
  if (req.nation.id != req.params.id) return res.status(403).send('Forbidden');
  res.render('nation/edit', {
    nation: req.nation, error: null,
    GOVERNMENTS, RELIGIONS, COLORS, WAR_POLICIES, DOMESTIC_POLICIES,
  });
});

// POST /nation/:id/edit
router.post('/:id/edit', requireNation, (req, res) => {
  if (req.nation.id != req.params.id) return res.status(403).send('Forbidden');
  const { leader_name, color, government_type, religion, war_policy, domestic_policy, capital } = req.body;

  db.prepare(`
    UPDATE nations SET leader_name=?, color=?, government_type=?, religion=?,
    war_policy=?, domestic_policy=?, capital=? WHERE id=?
  `).run(leader_name, color, government_type, religion, war_policy, domestic_policy, capital, req.nation.id);

  res.redirect(`/nation/${req.nation.id}`);
});

module.exports = router;
module.exports.CONTINENTS = CONTINENTS;
module.exports.COLORS = COLORS;

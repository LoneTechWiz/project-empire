const express = require('express');
const session = require('express-session');
const path = require('path');
const cron = require('node-cron');
const db = require('./db/database');
const { loadUser } = require('./middleware/auth');
const { applyTick } = require('./game/economy');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'empire-secret-key-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
  },
}));

// Load user into locals
app.use(loadUser);

// Helper locals
app.locals.formatNumber = (n) => {
  if (n === null || n === undefined) return '0';
  return Math.floor(n).toLocaleString('en-US');
};
app.locals.formatDecimal = (n, places = 2) => {
  if (n === null || n === undefined) return '0.00';
  return parseFloat(n).toFixed(places);
};
app.locals.formatMoney = (n) => {
  if (n === null || n === undefined) return '$0';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.floor(n).toLocaleString();
};
app.locals.timeAgo = (date) => {
  if (!date) return '';
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};
app.locals.resourceIcon = (resource) => {
  const icons = {
    money: '💰', food: '🌾', coal: '⚫', oil: '🛢️', iron: '🔩',
    bauxite: '🪨', lead: '🔘', uranium: '☢️', gasoline: '⛽',
    munitions: '💣', steel: '🔧', aluminum: '⬜',
  };
  return icons[resource] || '📦';
};

// Routes
const authRoutes = require('./routes/auth');
const nationRoutes = require('./routes/nations');
const cityRoutes = require('./routes/cities');
const militaryRoutes = require('./routes/military');
const warRoutes = require('./routes/wars');
const allianceRoutes = require('./routes/alliances');
const tradeRoutes = require('./routes/trade');
const rankingsRoutes = require('./routes/rankings');
const messageRoutes = require('./routes/messages');

app.use('/', authRoutes);
app.use('/nation', nationRoutes);
app.use('/cities', cityRoutes);
app.use('/military', militaryRoutes);
app.use('/wars', warRoutes);
app.use('/alliances', allianceRoutes);
app.use('/trade', tradeRoutes);
app.use('/rankings', rankingsRoutes);
app.use('/messages', messageRoutes);

// Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const nation = db.prepare('SELECT * FROM nations WHERE user_id = ?').get(req.session.userId);
  if (!nation) return res.redirect('/nation/create');

  const cities = db.prepare('SELECT * FROM cities WHERE nation_id = ?').all(nation.id);
  const activeWars = db.prepare(`
    SELECT w.*, an.name as attacker_name, dn.name as defender_name
    FROM wars w JOIN nations an ON an.id = w.attacker_id JOIN nations dn ON dn.id = w.defender_id
    WHERE (w.attacker_id = ? OR w.defender_id = ?) AND w.status = 'active'
  `).all(nation.id, nation.id);

  const recentActivity = db.prepare(
    'SELECT * FROM activity_log WHERE nation_id = ? ORDER BY created_at DESC LIMIT 5'
  ).all(nation.id);

  const worldNews = db.prepare(`
    SELECT al.*, n.name as nation_name
    FROM activity_log al JOIN nations n ON n.id = al.nation_id
    ORDER BY al.created_at DESC LIMIT 20
  `).all();

  const alliance = nation.alliance_id
    ? db.prepare('SELECT * FROM alliances WHERE id = ?').get(nation.alliance_id)
    : null;

  const { calcCityProduction, getCityPower } = require('./game/economy');
  const cityStats = cities.map(c => ({
    ...c,
    power: getCityPower(c),
    production: calcCityProduction(c, nation),
  }));

  // Sum total production per turn
  const totalProduction = {};
  for (const c of cityStats) {
    for (const [r, v] of Object.entries(c.production)) {
      totalProduction[r] = (totalProduction[r] || 0) + v;
    }
  }

  const rankResult = db.prepare(`
    SELECT COUNT(*) as rank FROM nations WHERE score > ?
  `).get(nation.score);
  const rank = (rankResult.rank || 0) + 1;

  res.render('dashboard', {
    nation, cities: cityStats, activeWars, recentActivity,
    worldNews, alliance, totalProduction, rank,
    RESOURCES: require('./game/economy').RESOURCES,
  });
});

// Home page
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');

  const nationCount = db.prepare('SELECT COUNT(*) as cnt FROM nations').get();
  const allianceCount = db.prepare('SELECT COUNT(*) as cnt FROM alliances').get();
  const warCount = db.prepare('SELECT COUNT(*) as cnt FROM wars WHERE status = ?').get('active');

  res.render('index', {
    nationCount: nationCount.cnt,
    allianceCount: allianceCount.cnt,
    warCount: warCount.cnt,
  });
});

// Search
app.get('/search', (req, res) => {
  const q = req.query.q || '';
  const nations = q ? db.prepare(`
    SELECT n.*, u.username FROM nations n JOIN users u ON u.id = n.user_id
    WHERE n.name LIKE ? OR n.leader_name LIKE ? LIMIT 20
  `).all(`%${q}%`, `%${q}%`) : [];

  const alliances = q ? db.prepare(
    'SELECT * FROM alliances WHERE name LIKE ? OR acronym LIKE ? LIMIT 10'
  ).all(`%${q}%`, `%${q}%`) : [];

  res.render('search', { nations, alliances, q, nation: res.locals.nation });
});

// 404
app.use((req, res) => {
  res.status(404).render('404', { message: 'Page not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('404', { message: 'Internal server error.' });
});

// Game tick - every 2 hours (or every minute for dev)
const isDev = process.env.NODE_ENV !== 'production';
const tickSchedule = isDev ? '*/10 * * * *' : '0 */2 * * *'; // every 10 min in dev
cron.schedule(tickSchedule, () => {
  console.log('[TICK] Applying game tick...');
  try {
    applyTick(db);
    db.prepare("UPDATE game_settings SET value = ? WHERE key = 'last_tick'").run(Date.now().toString());
    console.log('[TICK] Done.');
  } catch (err) {
    console.error('[TICK] Error:', err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Nations of Empire running at http://localhost:${PORT}`);
  console.log(`Game ticks: ${tickSchedule}`);
});

module.exports = app;

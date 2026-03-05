const db = require('../db/database');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

function requireNation(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  const nation = db.prepare('SELECT * FROM nations WHERE user_id = ?').get(req.session.userId);
  if (!nation) {
    return res.redirect('/nation/create');
  }
  req.nation = nation;
  next();
}

function loadUser(req, res, next) {
  if (req.session && req.session.userId) {
    const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(req.session.userId);
    if (user) {
      req.user = user;
      const nation = db.prepare('SELECT * FROM nations WHERE user_id = ?').get(user.id);
      req.nation = nation || null;
      res.locals.user = user;
      res.locals.nation = nation || null;
      res.locals.unreadMessages = 0;

      // Unread messages
      if (nation) {
        const unreadCount = db.prepare(
          'SELECT COUNT(*) as cnt FROM messages WHERE receiver_id = ? AND read = 0'
        ).get(nation.id);
        res.locals.unreadMessages = unreadCount ? unreadCount.cnt : 0;
      }
    }
  } else {
    res.locals.user = null;
    res.locals.nation = null;
    res.locals.unreadMessages = 0;
  }
  next();
}

module.exports = { requireAuth, requireNation, loadUser };

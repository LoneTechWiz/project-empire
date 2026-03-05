const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/database');
const router = express.Router();

// GET /register
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('auth/register', { error: null, values: {} });
});

// POST /register
router.post('/register', async (req, res) => {
  const { username, email, password, confirm } = req.body;
  const values = { username, email };

  if (!username || !email || !password) {
    return res.render('auth/register', { error: 'All fields are required.', values });
  }
  if (password !== confirm) {
    return res.render('auth/register', { error: 'Passwords do not match.', values });
  }
  if (password.length < 6) {
    return res.render('auth/register', { error: 'Password must be at least 6 characters.', values });
  }
  if (username.length < 3 || username.length > 20) {
    return res.render('auth/register', { error: 'Username must be 3-20 characters.', values });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.render('auth/register', { error: 'Username or email already taken.', values });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, hash);
    req.session.userId = result.lastInsertRowid;
    req.session.username = username;
    res.redirect('/nation/create');
  } catch (err) {
    console.error(err);
    res.render('auth/register', { error: 'Registration failed. Try again.', values });
  }
});

// GET /login
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('auth/login', { error: null });
});

// POST /login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('auth/login', { error: 'All fields are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.render('auth/login', { error: 'Invalid username or password.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.render('auth/login', { error: 'Invalid username or password.' });
  }

  db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/dashboard');
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;

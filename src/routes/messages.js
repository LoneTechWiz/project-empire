const express = require('express');
const db = require('../db/database');
const { requireNation } = require('../middleware/auth');
const router = express.Router();

// GET /messages - Inbox
router.get('/', requireNation, (req, res) => {
  const inbox = db.prepare(`
    SELECT m.*, n.name as sender_name, n.flag_url as sender_flag
    FROM messages m
    JOIN nations n ON n.id = m.sender_id
    WHERE m.receiver_id = ?
    ORDER BY m.sent_at DESC
    LIMIT 50
  `).all(req.nation.id);

  const sent = db.prepare(`
    SELECT m.*, n.name as receiver_name
    FROM messages m
    JOIN nations n ON n.id = m.receiver_id
    WHERE m.sender_id = ?
    ORDER BY m.sent_at DESC
    LIMIT 20
  `).all(req.nation.id);

  // Mark all as read
  db.prepare('UPDATE messages SET read = 1 WHERE receiver_id = ?').run(req.nation.id);

  res.render('messages/index', { inbox, sent, nation: req.nation });
});

// GET /messages/compose
router.get('/compose', requireNation, (req, res) => {
  const toNationId = req.query.to || '';
  let toNation = null;
  if (toNationId) {
    toNation = db.prepare('SELECT id, name FROM nations WHERE id = ?').get(toNationId);
  }
  res.render('messages/compose', { toNation, error: null, nation: req.nation });
});

// POST /messages/compose
router.post('/compose', requireNation, (req, res) => {
  const { to_nation_id, subject, content } = req.body;
  if (!to_nation_id || !content) {
    return res.render('messages/compose', { toNation: null, error: 'Recipient and message required.', nation: req.nation });
  }

  const receiver = db.prepare('SELECT * FROM nations WHERE id = ?').get(to_nation_id);
  if (!receiver) return res.render('messages/compose', { toNation: null, error: 'Nation not found.', nation: req.nation });
  if (receiver.id === req.nation.id) return res.render('messages/compose', { toNation: null, error: 'Cannot message yourself.', nation: req.nation });

  db.prepare(`
    INSERT INTO messages (sender_id, receiver_id, subject, content)
    VALUES (?, ?, ?, ?)
  `).run(req.nation.id, receiver.id, subject || '(No Subject)', content);

  res.redirect('/messages?success=Message+sent');
});

// GET /messages/:id
router.get('/:id', requireNation, (req, res) => {
  const message = db.prepare(`
    SELECT m.*, sn.name as sender_name, rn.name as receiver_name
    FROM messages m
    JOIN nations sn ON sn.id = m.sender_id
    JOIN nations rn ON rn.id = m.receiver_id
    WHERE m.id = ?
  `).get(req.params.id);

  if (!message) return res.status(404).render('404', { message: 'Message not found.' });
  if (message.sender_id !== req.nation.id && message.receiver_id !== req.nation.id) {
    return res.status(403).send('Forbidden');
  }

  db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(message.id);
  res.render('messages/view', { message, nation: req.nation });
});

module.exports = router;

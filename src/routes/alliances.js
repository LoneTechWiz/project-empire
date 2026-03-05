const express = require('express');
const db = require('../db/database');
const { requireNation } = require('../middleware/auth');
const router = express.Router();

const COLORS = ['aqua', 'black', 'blue', 'brown', 'green', 'gray', 'lime', 'maroon',
  'olive', 'orange', 'pink', 'purple', 'red', 'teal', 'white', 'yellow'];

// GET /alliances - List all alliances
router.get('/', (req, res) => {
  const alliances = db.prepare(`
    SELECT a.*, COUNT(n.id) as member_count
    FROM alliances a
    LEFT JOIN nations n ON n.alliance_id = a.id AND n.alliance_position != 'Applicant'
    GROUP BY a.id
    ORDER BY member_count DESC
  `).all();

  res.render('alliances/index', { alliances, nation: res.locals.nation });
});

// GET /alliances/create
router.get('/create', requireNation, (req, res) => {
  if (req.nation.alliance_id) return res.redirect(`/alliances/${req.nation.alliance_id}`);
  res.render('alliances/create', { error: null, COLORS, values: {} });
});

// POST /alliances/create
router.post('/create', requireNation, (req, res) => {
  if (req.nation.alliance_id) return res.redirect('/alliances');

  const { name, acronym, color, description, forum_link, discord_link } = req.body;
  const values = { name, acronym, color, description, forum_link, discord_link };

  if (!name || !acronym) {
    return res.render('alliances/create', { error: 'Name and acronym are required.', COLORS, values });
  }
  if (name.length < 3 || name.length > 50) {
    return res.render('alliances/create', { error: 'Alliance name must be 3-50 characters.', COLORS, values });
  }

  const existing = db.prepare('SELECT id FROM alliances WHERE name = ? OR acronym = ?').get(name, acronym);
  if (existing) {
    return res.render('alliances/create', { error: 'Alliance name or acronym already taken.', COLORS, values });
  }

  const result = db.prepare(`
    INSERT INTO alliances (name, acronym, color, description, forum_link, discord_link)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, acronym, color || 'gray', description || '', forum_link || '', discord_link || '');

  db.prepare(`
    UPDATE nations SET alliance_id = ?, alliance_position = 'Leader' WHERE id = ?
  `).run(result.lastInsertRowid, req.nation.id);

  res.redirect(`/alliances/${result.lastInsertRowid}`);
});

// GET /alliances/:id - View alliance
router.get('/:id', (req, res) => {
  const alliance = db.prepare('SELECT * FROM alliances WHERE id = ?').get(req.params.id);
  if (!alliance) return res.status(404).render('404', { message: 'Alliance not found.' });

  const members = db.prepare(`
    SELECT n.*, u.username
    FROM nations n
    JOIN users u ON u.id = n.user_id
    WHERE n.alliance_id = ? AND n.alliance_position != 'Applicant'
    ORDER BY n.score DESC
  `).all(alliance.id);

  const applicants = db.prepare(`
    SELECT n.*, u.username
    FROM nations n
    JOIN users u ON u.id = n.user_id
    WHERE n.alliance_id = ? AND n.alliance_position = 'Applicant'
  `).all(alliance.id);

  const totalScore = members.reduce((s, m) => s + m.score, 0);
  const isLeader = res.locals.nation && res.locals.nation.alliance_id === alliance.id &&
    ['Leader', 'Heir', 'Officer'].includes(res.locals.nation.alliance_position);
  const isMember = res.locals.nation && res.locals.nation.alliance_id === alliance.id;

  res.render('alliances/view', {
    alliance, members, applicants, totalScore, isLeader, isMember,
    nation: res.locals.nation,
    error: req.query.error || null,
    success: req.query.success || null,
  });
});

// POST /alliances/:id/apply
router.post('/:id/apply', requireNation, (req, res) => {
  const alliance = db.prepare('SELECT * FROM alliances WHERE id = ?').get(req.params.id);
  if (!alliance) return res.status(404).send('Not found');

  if (req.nation.alliance_id) return res.redirect(`/alliances/${req.params.id}?error=Already+in+an+alliance`);

  db.prepare(`UPDATE nations SET alliance_id = ?, alliance_position = 'Applicant' WHERE id = ?`).run(
    alliance.id, req.nation.id
  );

  res.redirect(`/alliances/${alliance.id}?success=Application+submitted`);
});

// POST /alliances/:id/leave
router.post('/:id/leave', requireNation, (req, res) => {
  const alliance = db.prepare('SELECT * FROM alliances WHERE id = ?').get(req.params.id);
  if (!alliance) return res.status(404).send('Not found');

  if (req.nation.alliance_id !== alliance.id) return res.redirect('/alliances?error=Not+in+this+alliance');

  if (req.nation.alliance_position === 'Leader') {
    const others = db.prepare(`
      SELECT COUNT(*) as cnt FROM nations WHERE alliance_id = ? AND id != ? AND alliance_position != 'Applicant'
    `).get(alliance.id, req.nation.id);
    if (others.cnt > 0) {
      return res.redirect(`/alliances/${alliance.id}?error=Transfer+leadership+before+leaving`);
    }
  }

  db.prepare(`UPDATE nations SET alliance_id = NULL, alliance_position = 'None' WHERE id = ?`).run(req.nation.id);
  res.redirect('/alliances?success=Left+alliance');
});

// POST /alliances/:id/accept/:nationId
router.post('/:id/accept/:nationId', requireNation, (req, res) => {
  const alliance = db.prepare('SELECT * FROM alliances WHERE id = ?').get(req.params.id);
  if (!alliance) return res.status(404).send('Not found');

  const isOfficer = req.nation.alliance_id === alliance.id &&
    ['Leader', 'Heir', 'Officer'].includes(req.nation.alliance_position);
  if (!isOfficer) return res.redirect(`/alliances/${alliance.id}?error=No+permission`);

  const applicant = db.prepare('SELECT * FROM nations WHERE id = ? AND alliance_id = ? AND alliance_position = ?')
    .get(req.params.nationId, alliance.id, 'Applicant');
  if (!applicant) return res.redirect(`/alliances/${alliance.id}?error=Applicant+not+found`);

  db.prepare(`UPDATE nations SET alliance_position = 'Member' WHERE id = ?`).run(applicant.id);
  res.redirect(`/alliances/${alliance.id}?success=Member+accepted`);
});

// POST /alliances/:id/reject/:nationId
router.post('/:id/reject/:nationId', requireNation, (req, res) => {
  const alliance = db.prepare('SELECT * FROM alliances WHERE id = ?').get(req.params.id);
  if (!alliance) return res.status(404).send('Not found');

  const isOfficer = req.nation.alliance_id === alliance.id &&
    ['Leader', 'Heir', 'Officer'].includes(req.nation.alliance_position);
  if (!isOfficer) return res.redirect(`/alliances/${alliance.id}?error=No+permission`);

  db.prepare(`UPDATE nations SET alliance_id = NULL, alliance_position = 'None' WHERE id = ?`).run(req.params.nationId);
  res.redirect(`/alliances/${alliance.id}?success=Application+rejected`);
});

// POST /alliances/:id/promote/:nationId
router.post('/:id/promote/:nationId', requireNation, (req, res) => {
  const alliance = db.prepare('SELECT * FROM alliances WHERE id = ?').get(req.params.id);
  if (!alliance) return res.status(404).send('Not found');

  if (req.nation.alliance_id !== alliance.id || req.nation.alliance_position !== 'Leader') {
    return res.redirect(`/alliances/${alliance.id}?error=No+permission`);
  }

  const member = db.prepare('SELECT * FROM nations WHERE id = ? AND alliance_id = ?').get(req.params.nationId, alliance.id);
  if (!member) return res.redirect(`/alliances/${alliance.id}?error=Member+not+found`);

  const positions = ['Member', 'Officer', 'Heir', 'Leader'];
  const idx = positions.indexOf(member.alliance_position);
  if (idx < positions.length - 1) {
    const newPosition = positions[idx + 1];
    db.prepare(`UPDATE nations SET alliance_position = ? WHERE id = ?`).run(newPosition, member.id);
    if (newPosition === 'Leader') {
      db.prepare(`UPDATE nations SET alliance_position = 'Heir' WHERE id = ?`).run(req.nation.id);
    }
  }

  res.redirect(`/alliances/${alliance.id}?success=Member+promoted`);
});

// GET /alliances/:id/edit
router.get('/:id/edit', requireNation, (req, res) => {
  const alliance = db.prepare('SELECT * FROM alliances WHERE id = ?').get(req.params.id);
  if (!alliance) return res.status(404).send('Not found');

  if (req.nation.alliance_id !== alliance.id || !['Leader', 'Heir'].includes(req.nation.alliance_position)) {
    return res.redirect(`/alliances/${alliance.id}?error=No+permission`);
  }

  res.render('alliances/edit', { alliance, COLORS, error: null });
});

// POST /alliances/:id/edit
router.post('/:id/edit', requireNation, (req, res) => {
  const alliance = db.prepare('SELECT * FROM alliances WHERE id = ?').get(req.params.id);
  if (!alliance) return res.status(404).send('Not found');

  if (req.nation.alliance_id !== alliance.id || !['Leader', 'Heir'].includes(req.nation.alliance_position)) {
    return res.redirect(`/alliances/${alliance.id}?error=No+permission`);
  }

  const { color, description, forum_link, discord_link } = req.body;
  db.prepare(`UPDATE alliances SET color=?, description=?, forum_link=?, discord_link=? WHERE id=?`).run(
    color, description || '', forum_link || '', discord_link || '', alliance.id
  );

  res.redirect(`/alliances/${alliance.id}?success=Alliance+updated`);
});

// POST /alliances/:id/bank/deposit
router.post('/:id/bank/deposit', requireNation, (req, res) => {
  const alliance = db.prepare('SELECT * FROM alliances WHERE id = ?').get(req.params.id);
  if (!alliance) return res.status(404).send('Not found');
  if (req.nation.alliance_id !== alliance.id || req.nation.alliance_position === 'Applicant') {
    return res.redirect(`/alliances/${alliance.id}?error=No+permission`);
  }

  const resources = ['money', 'food', 'coal', 'oil', 'uranium', 'iron', 'bauxite', 'lead', 'gasoline', 'munitions', 'steel', 'aluminum'];
  const nation = db.prepare('SELECT * FROM nations WHERE id = ?').get(req.nation.id);

  const updates = [];
  const allianceUpdates = [];

  for (const r of resources) {
    const amount = parseFloat(req.body[r] || 0);
    if (amount > 0 && nation[r] >= amount) {
      updates.push(`${r} = ${r} - ${amount}`);
      allianceUpdates.push(`bank_${r} = bank_${r} + ${amount}`);
    }
  }

  if (updates.length > 0) {
    db.prepare(`UPDATE nations SET ${updates.join(', ')} WHERE id = ?`).run(req.nation.id);
    db.prepare(`UPDATE alliances SET ${allianceUpdates.join(', ')} WHERE id = ?`).run(alliance.id);
  }

  res.redirect(`/alliances/${alliance.id}?success=Resources+deposited`);
});

// POST /alliances/:id/bank/withdraw
router.post('/:id/bank/withdraw', requireNation, (req, res) => {
  const alliance = db.prepare('SELECT * FROM alliances WHERE id = ?').get(req.params.id);
  if (!alliance) return res.status(404).send('Not found');

  if (req.nation.alliance_id !== alliance.id || !['Leader', 'Heir', 'Officer'].includes(req.nation.alliance_position)) {
    return res.redirect(`/alliances/${alliance.id}?error=No+permission`);
  }

  const resources = ['money', 'food', 'coal', 'oil', 'uranium', 'iron', 'bauxite', 'lead', 'gasoline', 'munitions', 'steel', 'aluminum'];
  const targetId = parseInt(req.body.target_nation) || req.nation.id;
  const target = db.prepare('SELECT * FROM nations WHERE id = ? AND alliance_id = ?').get(targetId, alliance.id);
  if (!target) return res.redirect(`/alliances/${alliance.id}?error=Target+not+in+alliance`);

  const alliances = db.prepare('SELECT * FROM alliances WHERE id = ?').get(alliance.id);
  const updates = [];
  const nationUpdates = [];

  for (const r of resources) {
    const amount = parseFloat(req.body[r] || 0);
    if (amount > 0 && alliances[`bank_${r}`] >= amount) {
      updates.push(`bank_${r} = bank_${r} - ${amount}`);
      nationUpdates.push(`${r} = ${r} + ${amount}`);
    }
  }

  if (updates.length > 0) {
    db.prepare(`UPDATE alliances SET ${updates.join(', ')} WHERE id = ?`).run(alliance.id);
    db.prepare(`UPDATE nations SET ${nationUpdates.join(', ')} WHERE id = ?`).run(target.id);
  }

  res.redirect(`/alliances/${alliance.id}?success=Resources+withdrawn`);
});

module.exports = router;

const express = require('express');
const db = require('../db/database');
const router = express.Router();

// GET /rankings
router.get('/', (req, res) => {
  const category = req.query.category || 'score';
  const validCategories = ['score', 'soldiers', 'tanks', 'aircraft', 'ships', 'cities', 'nukes'];
  const sortBy = validCategories.includes(category) ? category : 'score';

  let orderBy = sortBy === 'cities'
    ? '(SELECT COUNT(*) FROM cities WHERE nation_id = n.id) DESC'
    : `n.${sortBy} DESC`;

  const nations = db.prepare(`
    SELECT n.*, u.username,
      a.name as alliance_name, a.acronym as alliance_acronym,
      (SELECT COUNT(*) FROM cities WHERE nation_id = n.id) as city_count
    FROM nations n
    JOIN users u ON u.id = n.user_id
    LEFT JOIN alliances a ON a.id = n.alliance_id
    ORDER BY ${orderBy}
    LIMIT 100
  `).all();

  const allianceRankings = db.prepare(`
    SELECT a.*, COUNT(n.id) as member_count, SUM(n.score) as total_score
    FROM alliances a
    LEFT JOIN nations n ON n.alliance_id = a.id AND n.alliance_position != 'Applicant'
    GROUP BY a.id
    ORDER BY total_score DESC
    LIMIT 50
  `).all();

  res.render('rankings/index', {
    nations, allianceRankings, category: sortBy,
    nation: res.locals.nation,
  });
});

module.exports = router;

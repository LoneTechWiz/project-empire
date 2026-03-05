const express = require('express');
const db = require('../db/database');
const { requireNation } = require('../middleware/auth');
const { resolveAttack, checkWarEnd } = require('../game/war');
const router = express.Router();

const MAX_OFFENSIVE_WARS = 5;
const MAX_DEFENSIVE_WARS = 3;

// GET /wars
router.get('/', requireNation, (req, res) => {
  const offensiveWars = db.prepare(`
    SELECT w.*, n.name as enemy_name, n.id as enemy_id, n.flag_url as enemy_flag
    FROM wars w
    JOIN nations n ON n.id = w.defender_id
    WHERE w.attacker_id = ? AND w.status = 'active'
  `).all(req.nation.id);

  const defensiveWars = db.prepare(`
    SELECT w.*, n.name as enemy_name, n.id as enemy_id, n.flag_url as enemy_flag
    FROM wars w
    JOIN nations n ON n.id = w.attacker_id
    WHERE w.defender_id = ? AND w.status = 'active'
  `).all(req.nation.id);

  const recentWars = db.prepare(`
    SELECT w.*,
      an.name as attacker_name, dn.name as defender_name,
      an.id as attacker_nation_id, dn.id as defender_nation_id
    FROM wars w
    JOIN nations an ON an.id = w.attacker_id
    JOIN nations dn ON dn.id = w.defender_id
    WHERE (w.attacker_id = ? OR w.defender_id = ?) AND w.status != 'active'
    ORDER BY w.end_date DESC LIMIT 20
  `).all(req.nation.id, req.nation.id);

  res.render('wars/index', {
    nation: req.nation,
    offensiveWars, defensiveWars, recentWars,
    error: req.query.error || null,
    success: req.query.success || null,
  });
});

// GET /wars/declare/:nationId
router.get('/declare/:nationId', requireNation, (req, res) => {
  const target = db.prepare('SELECT * FROM nations WHERE id = ?').get(req.params.nationId);
  if (!target) return res.status(404).render('404', { message: 'Nation not found.' });
  if (target.id === req.nation.id) return res.redirect('/wars?error=Cannot+attack+yourself');

  const existingWar = db.prepare(`
    SELECT id FROM wars WHERE attacker_id = ? AND defender_id = ? AND status = 'active'
  `).get(req.nation.id, target.id);
  if (existingWar) return res.redirect('/wars?error=Already+at+war+with+this+nation');

  const offensiveCount = db.prepare(`SELECT COUNT(*) as cnt FROM wars WHERE attacker_id = ? AND status = 'active'`).get(req.nation.id);
  if (offensiveCount.cnt >= MAX_OFFENSIVE_WARS) {
    return res.redirect('/wars?error=Max+offensive+wars+reached');
  }

  res.render('wars/declare', { nation: req.nation, target, error: null });
});

// POST /wars/declare/:nationId
router.post('/declare/:nationId', requireNation, (req, res) => {
  const target = db.prepare('SELECT * FROM nations WHERE id = ?').get(req.params.nationId);
  if (!target) return res.status(404).send('Not found');
  if (target.id === req.nation.id) return res.redirect('/wars?error=Cannot+attack+yourself');

  if (target.beige_turns > 0) return res.redirect(`/wars?error=${target.name}+is+on+beige+protection`);
  if (req.nation.beige_turns > 0) return res.redirect('/wars?error=You+are+on+beige+protection');

  const existingWar = db.prepare(`
    SELECT id FROM wars WHERE attacker_id = ? AND defender_id = ? AND status = 'active'
  `).get(req.nation.id, target.id);
  if (existingWar) return res.redirect('/wars?error=Already+at+war+with+this+nation');

  const offensiveCount = db.prepare(`SELECT COUNT(*) as cnt FROM wars WHERE attacker_id = ? AND status = 'active'`).get(req.nation.id);
  if (offensiveCount.cnt >= MAX_OFFENSIVE_WARS) return res.redirect('/wars?error=Max+offensive+wars+reached');

  const defensiveCount = db.prepare(`SELECT COUNT(*) as cnt FROM wars WHERE defender_id = ? AND status = 'active'`).get(target.id);
  if (defensiveCount.cnt >= MAX_DEFENSIVE_WARS) return res.redirect('/wars?error=Target+has+max+defensive+wars');

  const { reason } = req.body;

  const result = db.prepare(`
    INSERT INTO wars (attacker_id, defender_id, reason) VALUES (?, ?, ?)
  `).run(req.nation.id, target.id, reason || '');

  db.prepare('INSERT INTO activity_log (nation_id, message) VALUES (?, ?)').run(
    req.nation.id, `${req.nation.name} declared war on ${target.name}.`
  );
  db.prepare('INSERT INTO activity_log (nation_id, message) VALUES (?, ?)').run(
    target.id, `${req.nation.name} declared war on ${target.name}.`
  );

  res.redirect(`/wars/${result.lastInsertRowid}`);
});

// GET /wars/:id - War detail
router.get('/:id', requireNation, (req, res) => {
  const war = db.prepare(`
    SELECT w.*,
      an.name as attacker_name, dn.name as defender_name,
      an.flag_url as attacker_flag, dn.flag_url as defender_flag,
      an.soldiers as a_soldiers, an.tanks as a_tanks, an.aircraft as a_aircraft, an.ships as a_ships,
      an.missiles as a_missiles, an.nukes as a_nukes,
      dn.soldiers as d_soldiers, dn.tanks as d_tanks, dn.aircraft as d_aircraft, dn.ships as d_ships,
      dn.missiles as d_missiles, dn.nukes as d_nukes
    FROM wars w
    JOIN nations an ON an.id = w.attacker_id
    JOIN nations dn ON dn.id = w.defender_id
    WHERE w.id = ?
  `).get(req.params.id);

  if (!war) return res.status(404).render('404', { message: 'War not found.' });

  const isAttacker = req.nation.id === war.attacker_id;
  const isDefender = req.nation.id === war.defender_id;
  const isParticipant = isAttacker || isDefender;

  const attacks = db.prepare(`
    SELECT wa.*, n.name as attacker_nation_name
    FROM war_attacks wa
    JOIN nations n ON n.id = wa.attacker_id
    WHERE wa.war_id = ?
    ORDER BY wa.date DESC LIMIT 30
  `).all(war.id);

  res.render('wars/detail', {
    war, attacks, nation: req.nation,
    isAttacker, isDefender, isParticipant,
    error: req.query.error || null,
    success: req.query.success || null,
  });
});

// POST /wars/:id/attack - Perform an attack
router.post('/:id/attack', requireNation, (req, res) => {
  const war = db.prepare('SELECT * FROM wars WHERE id = ?').get(req.params.id);
  if (!war || war.status !== 'active') return res.redirect(`/wars/${req.params.id}?error=War+not+active`);

  const isAttacker = req.nation.id === war.attacker_id;
  const isDefender = req.nation.id === war.defender_id;
  if (!isAttacker && !isDefender) return res.redirect(`/wars/${req.params.id}?error=Not+a+participant`);

  const { attack_type } = req.body;
  if (!['ground', 'airstrike', 'naval', 'missile', 'nuke'].includes(attack_type)) {
    return res.redirect(`/wars/${req.params.id}?error=Invalid+attack+type`);
  }

  // Check action points (simplified: 3 attacks per day, tracked by war model or per-day count)
  const today = new Date().toISOString().slice(0, 10);
  const attacksToday = db.prepare(`
    SELECT COUNT(*) as cnt FROM war_attacks
    WHERE war_id = ? AND attacker_id = ? AND date(date) = ?
  `).get(war.id, req.nation.id, today);

  if (attacksToday.cnt >= 3) {
    return res.redirect(`/wars/${req.params.id}?error=No+action+points+remaining`);
  }

  const enemyId = isAttacker ? war.defender_id : war.attacker_id;
  const enemy = db.prepare('SELECT * FROM nations WHERE id = ?').get(enemyId);
  const attacker = db.prepare('SELECT * FROM nations WHERE id = ?').get(req.nation.id);

  const attackResult = resolveAttack(attack_type, attacker, enemy, war);

  // Record the attack
  db.prepare(`
    INSERT INTO war_attacks (war_id, attacker_id, attack_type, success,
      attacker_soldier_casualties, attacker_tank_casualties, attacker_aircraft_casualties, attacker_ship_casualties,
      defender_soldier_casualties, defender_tank_casualties, defender_aircraft_casualties, defender_ship_casualties,
      infra_destroyed, money_looted, resistance_change, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    war.id, req.nation.id, attack_type, attackResult.success ? 1 : 0,
    attackResult.attacker_soldier_casualties || 0,
    attackResult.attacker_tank_casualties || 0,
    attackResult.attacker_aircraft_casualties || 0,
    attackResult.attacker_ship_casualties || 0,
    attackResult.defender_soldier_casualties || 0,
    attackResult.defender_tank_casualties || 0,
    attackResult.defender_aircraft_casualties || 0,
    attackResult.defender_ship_casualties || 0,
    attackResult.infra_destroyed || 0,
    attackResult.money_looted || 0,
    attackResult.resistance_change || 0,
    attackResult.notes || '',
  );

  // Apply casualties and loot
  if (attackResult.success) {
    // Apply to attacker
    db.prepare(`UPDATE nations SET
      soldiers = MAX(0, soldiers - ?),
      tanks = MAX(0, tanks - ?),
      aircraft = MAX(0, aircraft - ?),
      ships = MAX(0, ships - ?),
      soldier_casualties = soldier_casualties + ?,
      tank_casualties = tank_casualties + ?,
      aircraft_casualties = aircraft_casualties + ?,
      ship_casualties = ship_casualties + ?
    WHERE id = ?`).run(
      attackResult.attacker_soldier_casualties || 0,
      attackResult.attacker_tank_casualties || 0,
      attackResult.attacker_aircraft_casualties || 0,
      attackResult.attacker_ship_casualties || 0,
      attackResult.attacker_soldier_casualties || 0,
      attackResult.attacker_tank_casualties || 0,
      attackResult.attacker_aircraft_casualties || 0,
      attackResult.attacker_ship_casualties || 0,
      req.nation.id
    );

    // Apply to defender
    db.prepare(`UPDATE nations SET
      soldiers = MAX(0, soldiers - ?),
      tanks = MAX(0, tanks - ?),
      aircraft = MAX(0, aircraft - ?),
      ships = MAX(0, ships - ?),
      soldier_casualties = soldier_casualties + ?,
      tank_casualties = tank_casualties + ?,
      aircraft_casualties = aircraft_casualties + ?,
      ship_casualties = ship_casualties + ?,
      money = MAX(0, money - ?)
    WHERE id = ?`).run(
      attackResult.defender_soldier_casualties || 0,
      attackResult.defender_tank_casualties || 0,
      attackResult.defender_aircraft_casualties || 0,
      attackResult.defender_ship_casualties || 0,
      attackResult.defender_soldier_casualties || 0,
      attackResult.defender_tank_casualties || 0,
      attackResult.defender_aircraft_casualties || 0,
      attackResult.defender_ship_casualties || 0,
      attackResult.money_looted || 0,
      enemyId
    );

    // Give loot to attacker
    if (attackResult.money_looted > 0) {
      db.prepare('UPDATE nations SET money = money + ? WHERE id = ?').run(attackResult.money_looted, req.nation.id);
    }

    // Destroy infra in random enemy city
    if (attackResult.infra_destroyed > 0) {
      const enemyCities = db.prepare('SELECT * FROM cities WHERE nation_id = ? ORDER BY RANDOM() LIMIT 1').get(enemyId);
      if (enemyCities) {
        const newInfra = Math.max(0, enemyCities.infrastructure - attackResult.infra_destroyed);
        db.prepare('UPDATE cities SET infrastructure = ? WHERE id = ?').run(newInfra, enemyCities.id);
      }
    }

    // Update missiles/nukes
    if (attack_type === 'missile' && attackResult.attacker_missile_casualties) {
      db.prepare('UPDATE nations SET missiles = MAX(0, missiles - 1) WHERE id = ?').run(req.nation.id);
    }
    if (attack_type === 'nuke' && attackResult.attacker_nuke_casualties) {
      db.prepare('UPDATE nations SET nukes = MAX(0, nukes - 1) WHERE id = ?').run(req.nation.id);
    }

    // Update resistance
    const resistanceField = isAttacker ? 'defender_resistance' : 'attacker_resistance';
    const newResistance = Math.max(0, war[resistanceField] - (attackResult.resistance_change || 0));
    db.prepare(`UPDATE wars SET ${resistanceField} = ? WHERE id = ?`).run(newResistance, war.id);

    // Check for war end
    const updatedWar = db.prepare('SELECT * FROM wars WHERE id = ?').get(war.id);
    const outcome = checkWarEnd(updatedWar, updatedWar.attacker_resistance, updatedWar.defender_resistance);
    if (outcome) {
      db.prepare(`UPDATE wars SET status = 'peace', end_date = CURRENT_TIMESTAMP WHERE id = ?`).run(war.id);
      const winnerId = outcome === 'attacker_victory' ? war.attacker_id : war.defender_id;
      const loserId = outcome === 'attacker_victory' ? war.defender_id : war.attacker_id;

      if (outcome === 'attacker_victory') {
        db.prepare('UPDATE nations SET offensive_wars_won = offensive_wars_won + 1 WHERE id = ?').run(war.attacker_id);
        db.prepare('UPDATE nations SET defensive_wars_lost = defensive_wars_lost + 1, beige_turns = 3 WHERE id = ?').run(war.defender_id);
      } else {
        db.prepare('UPDATE nations SET defensive_wars_won = defensive_wars_won + 1, beige_turns = 3 WHERE id = ?').run(war.defender_id);
        db.prepare('UPDATE nations SET offensive_wars_lost = offensive_wars_lost + 1 WHERE id = ?').run(war.attacker_id);
      }

      db.prepare('INSERT INTO activity_log (nation_id, message) VALUES (?, ?)').run(winnerId, `Won war! (War #${war.id})`);
      db.prepare('INSERT INTO activity_log (nation_id, message) VALUES (?, ?)').run(loserId, `Lost war. (War #${war.id})`);
    }
  } else {
    // Failed attack: still apply attacker casualties
    db.prepare(`UPDATE nations SET
      soldiers = MAX(0, soldiers - ?),
      tanks = MAX(0, tanks - ?),
      aircraft = MAX(0, aircraft - ?),
      ship_casualties = ship_casualties + ?
    WHERE id = ?`).run(
      attackResult.attacker_soldier_casualties || 0,
      attackResult.attacker_tank_casualties || 0,
      attackResult.attacker_aircraft_casualties || 0,
      attackResult.attacker_ship_casualties || 0,
      req.nation.id
    );
  }

  res.redirect(`/wars/${war.id}?success=Attack+complete`);
});

// POST /wars/:id/peace - Offer peace
router.post('/:id/peace', requireNation, (req, res) => {
  const war = db.prepare('SELECT * FROM wars WHERE id = ?').get(req.params.id);
  if (!war || war.status !== 'active') return res.redirect(`/wars/${req.params.id}?error=War+not+active`);

  const isParticipant = req.nation.id === war.attacker_id || req.nation.id === war.defender_id;
  if (!isParticipant) return res.redirect(`/wars/${req.params.id}?error=Not+a+participant`);

  db.prepare(`UPDATE wars SET status = 'peace', end_date = CURRENT_TIMESTAMP WHERE id = ?`).run(war.id);
  db.prepare('INSERT INTO activity_log (nation_id, message) VALUES (?, ?)').run(
    req.nation.id, `Peace declared in War #${war.id}.`
  );

  res.redirect('/wars?success=Peace+declared');
});

module.exports = router;

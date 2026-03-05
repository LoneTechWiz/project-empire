/**
 * War engine: handles attack resolution
 * Mirrors Politics & War mechanics
 */

const { getCityPower } = require('./economy');

// Attack success rates
const BASE_SUCCESS = {
  ground: 0.5,    // base 50% + modifiers
  airstrike: 0.5,
  naval: 0.5,
  spy: 0.5,
  missile: 0.9,
  nuke: 1.0,
};

// Resistance damage on success
const RESISTANCE_DAMAGE = {
  ground: { attacker: 0, defender: 15 },
  airstrike: { attacker: 0, defender: 12 },
  naval: { attacker: 0, defender: 12 },
  spy: { attacker: 0, defender: 10 },
  missile: { attacker: 0, defender: 20 },
  nuke: { attacker: 0, defender: 40 },
};

function rollDice(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Resolve a ground attack
 * @returns {object} attack result
 */
function resolveGroundAttack(attacker, defender, war) {
  const result = {
    success: false,
    attacker_soldier_casualties: 0,
    attacker_tank_casualties: 0,
    defender_soldier_casualties: 0,
    defender_tank_casualties: 0,
    money_looted: 0,
    infra_destroyed: 0,
    resistance_change: 0,
    notes: '',
  };

  if (attacker.soldiers < 1 && attacker.tanks < 1) {
    result.notes = 'No ground forces to attack with.';
    return result;
  }

  // Strength calculation
  const attackerStrength = attacker.soldiers * 1 + attacker.tanks * 40;
  const defenderStrength = defender.soldiers * 1 + defender.tanks * 40;

  // Ground control bonus
  let atkMult = 1;
  let defMult = 1;
  if (war.ground_control === 'attacker') atkMult = 1.5;
  if (war.ground_control === 'defender') defMult = 1.5;
  if (war.air_control === 'attacker') atkMult *= 1.25;
  if (war.air_control === 'defender') defMult *= 1.25;

  const roll = rollDice(0.4, 1.0);
  const successThreshold = clamp(
    (attackerStrength * atkMult) / ((attackerStrength * atkMult) + (defenderStrength * defMult)),
    0.1, 0.9
  );

  if (roll <= successThreshold) {
    result.success = true;
    result.resistance_change = RESISTANCE_DAMAGE.ground.defender;
    // Loot money
    result.money_looted = Math.min(defender.money * 0.05, 50000);
    // Infra damage
    result.infra_destroyed = rollDice(10, 25);
    // Casualties
    result.attacker_soldier_casualties = Math.floor(rollDice(0.005, 0.015) * attacker.soldiers);
    result.attacker_tank_casualties = Math.floor(rollDice(0, 0.005) * attacker.tanks);
    result.defender_soldier_casualties = Math.floor(rollDice(0.01, 0.025) * defender.soldiers);
    result.defender_tank_casualties = Math.floor(rollDice(0.005, 0.015) * defender.tanks);
  } else {
    // Failed attack - attacker takes some casualties
    result.attacker_soldier_casualties = Math.floor(rollDice(0.01, 0.025) * attacker.soldiers);
    result.attacker_tank_casualties = Math.floor(rollDice(0.005, 0.01) * attacker.tanks);
    result.defender_soldier_casualties = Math.floor(rollDice(0.003, 0.008) * defender.soldiers);
    result.notes = 'Attack failed.';
  }

  return result;
}

/**
 * Resolve an airstrike
 */
function resolveAirstrike(attacker, defender, war) {
  const result = {
    success: false,
    attacker_aircraft_casualties: 0,
    defender_aircraft_casualties: 0,
    infra_destroyed: 0,
    resistance_change: 0,
    notes: '',
    money_looted: 0,
  };

  if (attacker.aircraft < 1) {
    result.notes = 'No aircraft to attack with.';
    return result;
  }

  const atkStrength = attacker.aircraft * 3;
  const defStrength = defender.aircraft * 3;

  let atkMult = 1;
  if (war.air_control === 'attacker') atkMult = 1.5;
  if (war.air_control === 'defender') atkMult = 0.75;

  const successChance = clamp(atkStrength * atkMult / (atkStrength * atkMult + defStrength + 1), 0.1, 0.9);

  if (Math.random() <= successChance) {
    result.success = true;
    result.resistance_change = RESISTANCE_DAMAGE.airstrike.defender;
    result.infra_destroyed = rollDice(5, 20);
    result.attacker_aircraft_casualties = Math.floor(rollDice(0.005, 0.015) * attacker.aircraft);
    result.defender_aircraft_casualties = Math.floor(rollDice(0.01, 0.03) * defender.aircraft);
    result.money_looted = rollDice(1000, 10000);
  } else {
    result.attacker_aircraft_casualties = Math.floor(rollDice(0.01, 0.03) * attacker.aircraft);
    result.defender_aircraft_casualties = Math.floor(rollDice(0.002, 0.008) * defender.aircraft);
    result.notes = 'Airstrike failed.';
  }

  return result;
}

/**
 * Resolve a naval attack
 */
function resolveNavalAttack(attacker, defender, war) {
  const result = {
    success: false,
    attacker_ship_casualties: 0,
    defender_ship_casualties: 0,
    infra_destroyed: 0,
    resistance_change: 0,
    notes: '',
    money_looted: 0,
  };

  if (attacker.ships < 1) {
    result.notes = 'No ships to attack with.';
    return result;
  }

  const atkStrength = attacker.ships * 4;
  const defStrength = defender.ships * 4;

  const successChance = clamp(atkStrength / (atkStrength + defStrength + 1), 0.1, 0.9);

  if (Math.random() <= successChance) {
    result.success = true;
    result.resistance_change = RESISTANCE_DAMAGE.naval.defender;
    result.infra_destroyed = rollDice(5, 15);
    result.attacker_ship_casualties = Math.floor(rollDice(0.005, 0.015) * attacker.ships);
    result.defender_ship_casualties = Math.floor(rollDice(0.01, 0.03) * defender.ships);
    result.money_looted = rollDice(1000, 20000);
  } else {
    result.attacker_ship_casualties = Math.floor(rollDice(0.01, 0.025) * attacker.ships);
    result.notes = 'Naval attack failed.';
  }

  return result;
}

/**
 * Resolve a missile strike
 */
function resolveMissile(attacker, defender) {
  const result = {
    success: false,
    infra_destroyed: 0,
    resistance_change: 0,
    notes: '',
    money_looted: 0,
    attacker_missile_casualties: 1,
    defender_soldier_casualties: 0,
  };

  if (attacker.missiles < 1) {
    result.notes = 'No missiles available.';
    result.attacker_missile_casualties = 0;
    return result;
  }

  result.success = true;
  result.resistance_change = RESISTANCE_DAMAGE.missile.defender;
  result.infra_destroyed = rollDice(100, 250);
  result.defender_soldier_casualties = Math.floor(rollDice(100, 500));

  return result;
}

/**
 * Resolve a nuclear strike
 */
function resolveNuke(attacker, defender) {
  const result = {
    success: false,
    infra_destroyed: 0,
    resistance_change: 0,
    notes: '',
    money_looted: 0,
    attacker_nuke_casualties: 1,
    defender_soldier_casualties: 0,
    radiation: true,
  };

  if (attacker.nukes < 1) {
    result.notes = 'No nuclear weapons available.';
    result.attacker_nuke_casualties = 0;
    return result;
  }

  result.success = true;
  result.resistance_change = RESISTANCE_DAMAGE.nuke.defender;
  result.infra_destroyed = rollDice(500, 1500);
  result.defender_soldier_casualties = Math.floor(rollDice(1000, 5000));
  result.money_looted = rollDice(50000, 200000);

  return result;
}

/**
 * Main dispatch: resolve any attack type
 */
function resolveAttack(attackType, attacker, defender, war) {
  switch (attackType) {
    case 'ground': return resolveGroundAttack(attacker, defender, war);
    case 'airstrike': return resolveAirstrike(attacker, defender, war);
    case 'naval': return resolveNavalAttack(attacker, defender, war);
    case 'missile': return resolveMissile(attacker, defender);
    case 'nuke': return resolveNuke(attacker, defender);
    default: return { success: false, notes: 'Unknown attack type.' };
  }
}

/**
 * Update war control after attack
 */
function updateWarControl(war, attackType, success, isAttacker) {
  const updates = {};
  if (!success) return updates;

  if (attackType === 'ground' && isAttacker) {
    const atkWins = (war.ground_control === 'attacker' ? 1 : 0);
    const defWins = (war.ground_control === 'defender' ? 1 : 0);
    updates.ground_control = success ? 'attacker' : war.ground_control;
  }
  if (attackType === 'airstrike' && isAttacker && success) {
    updates.air_control = 'attacker';
  }
  if (attackType === 'naval' && isAttacker && success) {
    updates.naval_control = 'attacker';
  }

  return updates;
}

/**
 * Check if war should end (resistance <= 0)
 */
function checkWarEnd(war, attackerResistance, defenderResistance) {
  if (defenderResistance <= 0) return 'attacker_victory';
  if (attackerResistance <= 0) return 'defender_victory';
  return null;
}

module.exports = { resolveAttack, updateWarControl, checkWarEnd };

/**
 * Economy engine: calculates resource production/consumption per turn
 * Mirrors Politics & War mechanics
 */

const RESOURCES = ['food', 'coal', 'oil', 'iron', 'bauxite', 'lead', 'uranium',
  'gasoline', 'munitions', 'steel', 'aluminum'];

// Market prices (base)
const BASE_PRICES = {
  food: 125,
  coal: 50,
  oil: 60,
  iron: 60,
  bauxite: 70,
  lead: 45,
  uranium: 2750,
  gasoline: 325,
  munitions: 150,
  steel: 140,
  aluminum: 170,
  money: 1,
};

// Per-improvement production/consumption (per turn = per 2 hours)
// These are daily values divided by 12 (12 turns per day)
const IMP_PRODUCTION = {
  imp_coalmine: { coal: 3 },
  imp_oilwell: { oil: 3 },
  imp_ironmine: { iron: 3 },
  imp_bauxitemine: { bauxite: 3 },
  imp_leadmine: { lead: 3 },
  imp_uraniummine: { uranium: 3 },
  imp_farm: { food: 12 },
  imp_oilrefinery: { gasoline: 6, oil: -3 },
  imp_steelmill: { steel: 9, coal: -3, iron: -3 },
  imp_aluminumrefinery: { aluminum: 9, bauxite: -3 },
  imp_munitionsfactory: { munitions: 18, lead: -6 },
  // Commerce buildings produce money based on commerce rate
  imp_policestation: { commerce: 1 },
  imp_hospital: { commerce: 1 },
  imp_recyclingcenter: { commerce: 2 },
  imp_subway: { commerce: 8 },
  imp_supermarket: { commerce: 3 },
  imp_bank: { commerce: 5 },
  imp_mall: { commerce: 9 },
  imp_stadium: { commerce: 12 },
};

// Power requirements per improvement slot (not per building)
const POWER_CONSUMPTION = {
  imp_coalmine: 1.2,
  imp_oilwell: 1.2,
  imp_ironmine: 1.2,
  imp_bauxitemine: 1.2,
  imp_leadmine: 1.2,
  imp_uraniummine: 1.2,
  imp_farm: 1,
  imp_oilrefinery: 3,
  imp_steelmill: 3,
  imp_aluminumrefinery: 3,
  imp_munitionsfactory: 3.5,
  imp_policestation: 0.5,
  imp_hospital: 0.5,
  imp_recyclingcenter: 0.5,
  imp_subway: 0.5,
  imp_supermarket: 0.5,
  imp_bank: 0.5,
  imp_mall: 0.5,
  imp_stadium: 0.5,
};

// Power output per power plant
const POWER_OUTPUT = {
  imp_coalpower: 500,
  imp_oilpower: 500,
  imp_nuclearpower: 2000,
  imp_windpower: 250,
};

/**
 * Calculate commerce rate for a city (0-100%)
 */
function getCityCommerce(city) {
  const commerceBuildings = ['imp_policestation', 'imp_hospital', 'imp_recyclingcenter',
    'imp_subway', 'imp_supermarket', 'imp_bank', 'imp_mall', 'imp_stadium'];
  let commerce = 0;
  for (const b of commerceBuildings) {
    const imp = IMP_PRODUCTION[b];
    if (imp && imp.commerce) {
      commerce += city[b] * imp.commerce;
    }
  }
  return Math.min(commerce, 100);
}

/**
 * Calculate power available vs needed for a city
 */
function getCityPower(city) {
  let available = 0;
  for (const [plant, output] of Object.entries(POWER_OUTPUT)) {
    available += (city[plant] || 0) * output;
  }
  let needed = 0;
  for (const [imp, consumption] of Object.entries(POWER_CONSUMPTION)) {
    needed += (city[imp] || 0) * consumption;
  }
  return { available, needed, powered: available >= needed };
}

/**
 * Calculate production for one city per turn
 * Returns delta object: { food: +N, coal: +N, money: +N, ... }
 */
function calcCityProduction(city, nation) {
  const { powered } = getCityPower(city);
  const commerceRate = getCityCommerce(city);

  const delta = {};
  for (const r of RESOURCES) delta[r] = 0;
  delta.money = 0;

  if (!powered) {
    // No power = no production (except wind & nuclear still run, farms still run)
    // Simplified: farms and windpower still work
  }

  const imps = [
    'imp_coalmine', 'imp_oilwell', 'imp_ironmine', 'imp_bauxitemine',
    'imp_leadmine', 'imp_uraniummine', 'imp_farm',
    'imp_oilrefinery', 'imp_steelmill', 'imp_aluminumrefinery', 'imp_munitionsfactory',
  ];

  for (const imp of imps) {
    const count = city[imp] || 0;
    if (count === 0) continue;
    const production = IMP_PRODUCTION[imp];
    if (!production) continue;

    for (const [resource, amount] of Object.entries(production)) {
      if (resource === 'commerce') continue;
      if (delta[resource] !== undefined) {
        delta[resource] += count * amount * (powered ? 1 : 0.5);
      }
    }
  }

  // Commerce => money
  // Formula: infrastructure * commerce_rate * 0.01 * base_rate
  const infra = city.infrastructure || 0;
  const moneyPerTurn = (infra * (commerceRate / 100) * 527) / 12;
  delta.money += moneyPerTurn;

  // Population upkeep food consumption
  const population = Math.floor(infra * 100 + city.land * 0.5);
  const foodConsumed = (population / 1000) / 12;
  delta.food -= foodConsumed;

  return delta;
}

/**
 * Calculate military upkeep per turn
 */
function calcMilitaryUpkeep(nation) {
  return {
    money: -(
      nation.soldiers * 1.25 +
      nation.tanks * 50 +
      nation.aircraft * 500 +
      nation.ships * 3750 +
      nation.missiles * 0 +
      nation.nukes * 0
    ) / 12,
    food: -(nation.soldiers * 0.001) / 12,
    gasoline: -(
      nation.tanks * 0.01 +
      nation.aircraft * 0.05 +
      nation.ships * 0.1
    ) / 12,
    munitions: -(
      nation.soldiers * 0.0005 +
      nation.tanks * 0.005
    ) / 12,
  };
}

/**
 * Apply one game tick to all nations
 */
function applyTick(db) {
  const nations = db.prepare(`
    SELECT n.*, GROUP_CONCAT(c.id) as city_ids
    FROM nations n
    LEFT JOIN cities c ON c.nation_id = n.id
    GROUP BY n.id
  `).all();

  const updateNation = db.prepare(`
    UPDATE nations SET
      money = money + ?,
      food = MAX(0, food + ?),
      coal = MAX(0, coal + ?),
      oil = MAX(0, oil + ?),
      uranium = MAX(0, uranium + ?),
      iron = MAX(0, iron + ?),
      bauxite = MAX(0, bauxite + ?),
      lead = MAX(0, lead + ?),
      gasoline = MAX(0, gasoline + ?),
      munitions = MAX(0, munitions + ?),
      steel = MAX(0, steel + ?),
      aluminum = MAX(0, aluminum + ?),
      turns = MIN(turns + 1, 10),
      beige_turns = MAX(0, beige_turns - 1),
      score = ?
    WHERE id = ?
  `);

  const getCities = db.prepare('SELECT * FROM cities WHERE nation_id = ?');

  const tick = db.transaction(() => {
    for (const nation of nations) {
      const cities = getCities.all(nation.id);
      const totals = {};
      for (const r of [...RESOURCES, 'money']) totals[r] = 0;

      for (const city of cities) {
        const cityDelta = calcCityProduction(city, nation);
        for (const [r, v] of Object.entries(cityDelta)) {
          if (totals[r] !== undefined) totals[r] += v;
        }
      }

      // Military upkeep
      const upkeep = calcMilitaryUpkeep(nation);
      for (const [r, v] of Object.entries(upkeep)) {
        if (totals[r] !== undefined) totals[r] += v;
      }

      // Score = based on cities, infra, military
      const cityCount = cities.length;
      const totalInfra = cities.reduce((s, c) => s + (c.infrastructure || 0), 0);
      const score = cityCount * 100 +
        totalInfra * 0.5 +
        nation.soldiers * 0.000045 +
        nation.tanks * 0.0015 +
        nation.aircraft * 0.005 +
        nation.ships * 0.025 +
        nation.spies * 0.003 +
        nation.missiles * 0.5 +
        nation.nukes * 10;

      updateNation.run(
        totals.money, totals.food, totals.coal, totals.oil,
        totals.uranium, totals.iron, totals.bauxite, totals.lead,
        totals.gasoline, totals.munitions, totals.steel, totals.aluminum,
        score, nation.id
      );
    }

    // Expire beige wars
    db.prepare(`
      UPDATE wars SET status = 'expired', end_date = CURRENT_TIMESTAMP
      WHERE status = 'active' AND datetime(start_date, '+5 days') < CURRENT_TIMESTAMP
    `).run();
  });

  tick();
}

module.exports = { applyTick, calcCityProduction, calcMilitaryUpkeep, getCityPower, getCityCommerce, BASE_PRICES, RESOURCES };

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alliances (before nations so nations can FK to it)
CREATE TABLE IF NOT EXISTS alliances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  acronym TEXT NOT NULL,
  flag_url TEXT DEFAULT '/img/default_alliance_flag.png',
  color TEXT DEFAULT 'gray',
  description TEXT DEFAULT '',
  forum_link TEXT DEFAULT '',
  discord_link TEXT DEFAULT '',
  founded_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- Alliance bank
  bank_money REAL DEFAULT 0,
  bank_food REAL DEFAULT 0,
  bank_coal REAL DEFAULT 0,
  bank_oil REAL DEFAULT 0,
  bank_uranium REAL DEFAULT 0,
  bank_iron REAL DEFAULT 0,
  bank_bauxite REAL DEFAULT 0,
  bank_lead REAL DEFAULT 0,
  bank_gasoline REAL DEFAULT 0,
  bank_munitions REAL DEFAULT 0,
  bank_steel REAL DEFAULT 0,
  bank_aluminum REAL DEFAULT 0
);

-- Nations
CREATE TABLE IF NOT EXISTS nations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT UNIQUE NOT NULL,
  leader_name TEXT NOT NULL,
  flag_url TEXT DEFAULT '/img/default_flag.png',
  continent TEXT DEFAULT 'North America',
  color TEXT DEFAULT 'gray',
  government_type TEXT DEFAULT 'Republic',
  religion TEXT DEFAULT 'None',
  war_policy TEXT DEFAULT 'Moderate',
  domestic_policy TEXT DEFAULT 'None',
  capital TEXT DEFAULT '',
  founded_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- Score & ranking
  score REAL DEFAULT 0,
  -- Resources
  money REAL DEFAULT 500000,
  food REAL DEFAULT 3000,
  coal REAL DEFAULT 0,
  oil REAL DEFAULT 0,
  uranium REAL DEFAULT 0,
  iron REAL DEFAULT 0,
  bauxite REAL DEFAULT 0,
  lead REAL DEFAULT 0,
  gasoline REAL DEFAULT 0,
  munitions REAL DEFAULT 0,
  steel REAL DEFAULT 0,
  aluminum REAL DEFAULT 0,
  -- Military
  soldiers INTEGER DEFAULT 0,
  tanks INTEGER DEFAULT 0,
  aircraft INTEGER DEFAULT 0,
  ships INTEGER DEFAULT 0,
  spies INTEGER DEFAULT 0,
  missiles INTEGER DEFAULT 0,
  nukes INTEGER DEFAULT 0,
  -- Military casualties (all time)
  soldier_casualties INTEGER DEFAULT 0,
  tank_casualties INTEGER DEFAULT 0,
  aircraft_casualties INTEGER DEFAULT 0,
  ship_casualties INTEGER DEFAULT 0,
  -- War stuff
  beige_turns INTEGER DEFAULT 0,
  offensive_wars_won INTEGER DEFAULT 0,
  defensive_wars_won INTEGER DEFAULT 0,
  offensive_wars_lost INTEGER DEFAULT 0,
  defensive_wars_lost INTEGER DEFAULT 0,
  -- Alliance
  alliance_id INTEGER REFERENCES alliances(id) ON DELETE SET NULL,
  alliance_position TEXT DEFAULT 'None', -- None, Applicant, Member, Officer, Heir, Leader
  -- National projects (stored as comma-separated or JSON)
  projects TEXT DEFAULT '[]',
  -- Turns/action points
  turns INTEGER DEFAULT 10,
  -- Vacation mode
  vacation_mode INTEGER DEFAULT 0,
  -- Game color bonus
  color_bonus REAL DEFAULT 0
);

-- Cities
CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nation_id INTEGER NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  founded_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  infrastructure REAL DEFAULT 10,
  land REAL DEFAULT 250,
  -- Power plants
  imp_coalpower INTEGER DEFAULT 0,
  imp_oilpower INTEGER DEFAULT 0,
  imp_nuclearpower INTEGER DEFAULT 0,
  imp_windpower INTEGER DEFAULT 0,
  -- Resource improvements
  imp_coalmine INTEGER DEFAULT 0,
  imp_oilwell INTEGER DEFAULT 0,
  imp_ironmine INTEGER DEFAULT 0,
  imp_bauxitemine INTEGER DEFAULT 0,
  imp_leadmine INTEGER DEFAULT 0,
  imp_uraniummine INTEGER DEFAULT 0,
  imp_farm INTEGER DEFAULT 0,
  -- Industry
  imp_oilrefinery INTEGER DEFAULT 0,
  imp_steelmill INTEGER DEFAULT 0,
  imp_aluminumrefinery INTEGER DEFAULT 0,
  imp_munitionsfactory INTEGER DEFAULT 0,
  -- Commerce
  imp_policestation INTEGER DEFAULT 0,
  imp_hospital INTEGER DEFAULT 0,
  imp_recyclingcenter INTEGER DEFAULT 0,
  imp_subway INTEGER DEFAULT 0,
  imp_supermarket INTEGER DEFAULT 0,
  imp_bank INTEGER DEFAULT 0,
  imp_mall INTEGER DEFAULT 0,
  imp_stadium INTEGER DEFAULT 0
);

-- Wars
CREATE TABLE IF NOT EXISTS wars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attacker_id INTEGER NOT NULL REFERENCES nations(id),
  defender_id INTEGER NOT NULL REFERENCES nations(id),
  war_type TEXT DEFAULT 'Ordinary',
  start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_date DATETIME,
  status TEXT DEFAULT 'active', -- active, peace, expired
  reason TEXT DEFAULT '',
  -- Resistance (each side starts at 100, hits 0 = loss)
  attacker_resistance INTEGER DEFAULT 100,
  defender_resistance INTEGER DEFAULT 100,
  -- Action points per day
  attacker_action_points INTEGER DEFAULT 3,
  defender_action_points INTEGER DEFAULT 3,
  -- Control
  ground_control TEXT DEFAULT 'none', -- attacker, defender, none
  air_control TEXT DEFAULT 'none',
  naval_control TEXT DEFAULT 'none',
  -- Totals
  attacker_infra_destroyed REAL DEFAULT 0,
  defender_infra_destroyed REAL DEFAULT 0,
  attacker_money_looted REAL DEFAULT 0,
  defender_money_looted REAL DEFAULT 0
);

-- War attacks
CREATE TABLE IF NOT EXISTS war_attacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  war_id INTEGER NOT NULL REFERENCES wars(id) ON DELETE CASCADE,
  attacker_id INTEGER NOT NULL REFERENCES nations(id),
  attack_type TEXT NOT NULL, -- ground, airstrike, naval, spy, missile, nuke
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  success INTEGER DEFAULT 0,
  -- Casualties
  attacker_soldier_casualties INTEGER DEFAULT 0,
  attacker_tank_casualties INTEGER DEFAULT 0,
  attacker_aircraft_casualties INTEGER DEFAULT 0,
  attacker_ship_casualties INTEGER DEFAULT 0,
  defender_soldier_casualties INTEGER DEFAULT 0,
  defender_tank_casualties INTEGER DEFAULT 0,
  defender_aircraft_casualties INTEGER DEFAULT 0,
  defender_ship_casualties INTEGER DEFAULT 0,
  -- Destruction
  infra_destroyed REAL DEFAULT 0,
  money_looted REAL DEFAULT 0,
  -- Action used
  resistance_change INTEGER DEFAULT 0,
  notes TEXT DEFAULT ''
);

-- Trade offers
CREATE TABLE IF NOT EXISTS trade_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nation_id INTEGER NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  quantity REAL NOT NULL,
  price_per_unit REAL NOT NULL,
  offer_type TEXT NOT NULL, -- buy, sell
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  active INTEGER DEFAULT 1
);

-- Trade history
CREATE TABLE IF NOT EXISTS trade_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL REFERENCES nations(id),
  seller_id INTEGER NOT NULL REFERENCES nations(id),
  resource TEXT NOT NULL,
  quantity REAL NOT NULL,
  price_per_unit REAL NOT NULL,
  total REAL NOT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alliance member log
CREATE TABLE IF NOT EXISTS alliance_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nation_id INTEGER NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
  alliance_id INTEGER NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Messages / telegrams
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES nations(id),
  receiver_id INTEGER NOT NULL REFERENCES nations(id),
  subject TEXT DEFAULT '(No Subject)',
  content TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read INTEGER DEFAULT 0
);

-- Nation news/activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nation_id INTEGER NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Game settings
CREATE TABLE IF NOT EXISTS game_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO game_settings VALUES ('turn_length_minutes', '120');
INSERT OR IGNORE INTO game_settings VALUES ('game_name', 'Nations of Empire');
INSERT OR IGNORE INTO game_settings VALUES ('last_tick', '0');

/* ============================================================
   Zeugnis-Verteidigung – Spieldaten & Balancing (v5)
   Tower, Gegner, Wellen, Karten, Fähigkeiten, Eliten, Erfolge
   ============================================================ */
'use strict';

const CONFIG = {
  COLS: 24,
  ROWS: 16,
  CELL: 40,
  LIVES: 20,
  START_GOLD: 130,
  SELL_FACTOR: 0.7,
  HP_GROWTH_EARLY: 1.17,   // HP-Wachstum pro Welle bis HP_BREAK (sanfter Einstieg)
  HP_GROWTH_LATE: 1.28,    // HP-Wachstum danach (Oberstufe wird ernst)
  HP_BREAK: 9,             // Wechselpunkt der Wachstumsphasen
  BOUNTY_GROWTH: 1.115,    // Belohnungs-Multiplikator pro Welle
  WAVE_BONUS_BASE: 22,     // Bonus am Wellenende: BASE + PER_WAVE * w
  WAVE_BONUS_PER_WAVE: 5,
  EARLY_BONUS_PER_SEC: 2,  // Motivation pro gesparter Sekunde bei frühem Wellenstart
  WAVE_PAUSE: 18,          // Sekunden zwischen den Wellen
  BOSS_SLOW_RESIST: 0.5,   // Bosse werden nur halb so stark verlangsamt
  TOTAL_WAVES: 26,
  ELITE_CHANCE: 0.16,      // Chance auf Elite-Gegner im Endlosmodus
  ELITE_HP: 2.2,
  ELITE_BOUNTY: 3,
};

const DIFFICULTIES = {
  hauptschule:  { label: 'Hauptschule',  emoji: '🙂', hpMul: 0.80, desc: 'Entspanntes Lerntempo – Gegner mit 80% Lebenspunkten.' },
  realschule:   { label: 'Realschule',   emoji: '😐', hpMul: 1.00, desc: 'Der Klassiker – normale Gegnerstärke.' },
  gymnasium:    { label: 'Gymnasium',    emoji: '😰', hpMul: 1.25, desc: 'G8 lässt grüßen – Gegner mit 125% Lebenspunkten.' },
};

/* ---------- KARTEN ----------
   spawns: Schultore (mehrere möglich), core: Zeugnis, obstacles: feste Hindernisse. */
const MAPS = {
  pausenhof: {
    id: 'pausenhof', label: 'Pausenhof', emoji: '🏫',
    desc: 'Der Klassiker: ein Tor, freie Fläche.',
    spawns: [{ x: 0, y: 7 }], core: { x: 23, y: 8 }, obstacles: [],
  },
  doppeltor: {
    id: 'doppeltor', label: 'Doppeltor', emoji: '🚪',
    desc: 'Zwei Schultore! Gegner kommen abwechselnd von beiden.',
    spawns: [{ x: 0, y: 3 }, { x: 0, y: 12 }], core: { x: 23, y: 8 }, obstacles: [],
  },
  schulweg: {
    id: 'schulweg', label: 'Schulweg', emoji: '🛣️',
    desc: 'Diagonal über den Hof – der längste Weg ist der beste.',
    spawns: [{ x: 0, y: 1 }], core: { x: 23, y: 14 }, obstacles: [],
  },
  klassenzimmer: {
    id: 'klassenzimmer', label: 'Klassenzimmer', emoji: '🪑',
    desc: 'Vollgestellt mit Tischgruppen – baue um die Möbel herum.',
    spawns: [{ x: 0, y: 7 }], core: { x: 23, y: 8 },
    obstacles: [
      [5, 3], [6, 3], [5, 4], [6, 4],
      [11, 7], [12, 7], [11, 8], [12, 8],
      [17, 3], [18, 3], [17, 4], [18, 4],
      [5, 11], [6, 11], [5, 12], [6, 12],
      [17, 11], [18, 11], [17, 12], [18, 12],
    ],
  },
};
const MAP_ORDER = ['pausenhof', 'doppeltor', 'schulweg', 'klassenzimmer'];

/* ---------- AKTIVE FÄHIGKEITEN ---------- */
const ABILITIES = {
  hitzefrei: { id: 'hitzefrei', key: 'Q', emoji: '🥵', name: 'Hitzefrei!', cd: 75, dur: 5,
               desc: 'Friert alle Gegner 5 Sekunden ein (Bosse: nur 50% langsamer).' },
  energy:    { id: 'energy', key: 'W', emoji: '⚡', name: 'Energydrink exen', cd: 60, dur: 10,
               desc: 'Alle Tower greifen 10 Sekunden lang 50% schneller an.' },
  brot:      { id: 'brot', key: 'E', emoji: '🥪', name: 'Pausenbrot', cd: 90, heal: 2,
               desc: 'Stellt sofort 2 Zeugnis-Integrität wieder her.' },
};
const ABILITY_ORDER = ['hitzefrei', 'energy', 'brot'];

/* ---------- ELITE-AFFIXE (Endlosmodus) ---------- */
const ELITES = {
  regen:  { id: 'regen',  name: 'Regenerierend', emoji: '♻️', ring: '80,200,90',
            desc: 'Heilt sich ständig selbst.' },
  schild: { id: 'schild', name: 'Schildwache',   emoji: '🛡️', ring: '80,150,240',
            desc: 'Nimmt weniger Schaden und schirmt Gegner in der Nähe ab.' },
  tempo:  { id: 'tempo',  name: 'Tempomacher',   emoji: '💨', ring: '240,210,80',
            desc: 'Schneller und beschleunigt Gegner in der Nähe.' },
};

/* ---------- ERFOLGE ---------- */
const ACHIEVEMENTS = [
  { id: 'streber',    emoji: '🤓', name: 'Streber',             desc: 'Schaffe Welle 13, ohne ein einziges Leak zu kassieren.' },
  { id: 'einser',     emoji: '🎓', name: 'Einser-Abi',          desc: 'Gewinne mit voller Zeugnis-Integrität (20/20).' },
  { id: 'lowbudget',  emoji: '📇', name: 'Low Budget',          desc: 'Schaffe Welle 8 und baue dabei ausschließlich Karteikarten.' },
  { id: 'vollausbau', emoji: '⭐', name: 'Vollausbau',          desc: 'Bringe einen Tower auf Stufe 3.' },
  { id: 'sparfuchs',  emoji: '🦊', name: 'Sparfuchs',           desc: 'Habe 1.000 💪 Motivation gleichzeitig auf der hohen Kante.' },
  { id: 'magnat',     emoji: '💰', name: 'Motivations-Magnat',  desc: 'Verdiene insgesamt 5.000 💪 in einem Durchlauf.' },
  { id: 'student',    emoji: '🍻', name: 'Ewiger Student',      desc: 'Erreiche im Endlosmodus das 10. Semester.' },
  { id: 'blitz',      emoji: '⚡', name: 'Blitzstart',          desc: 'Starte 5 Wellen in Folge vorzeitig (Frühstart-Bonus).' },
];

/* ---------- TOWER ----------
   levels[0].cost = Baukosten, levels[1..2].cost = Upgradekosten.
   Spezialfelder: splash, slow/slowDur, buff (Tempo-Aura), shred (Panzerungs-Aura),
   income (Motivation pro Welle), chain/chainRange (Kettenblitz),
   pierce (ignoriert Panzerung), bossBonus. */
const TOWER_TYPES = {
  karteikarten: {
    id: 'karteikarten', name: 'Karteikarten', emoji: '📇', hotkey: '1',
    desc: 'Wirft Karteikarten im Sekundentakt. Günstig, schnell, zuverlässig.',
    proj: { speed: 380, emoji: '📇', size: 13, arc: 16 },
    levels: [
      { cost: 50,  dmg: 7,  cd: 0.50, range: 110 },
      { cost: 45,  dmg: 13, cd: 0.46, range: 120, name: 'Spickzettel',           emoji: '🗒️' },
      { cost: 85,  dmg: 24, cd: 0.42, range: 132, name: 'Eselsbrücken-Batterie', emoji: '🧠' },
    ],
  },
  lerncrunch: {
    id: 'lerncrunch', name: 'Lerncrunch', emoji: '☕', hotkey: '2',
    desc: 'Pauken mit Kaffee: solider Dauerschaden, das Arbeitstier.',
    proj: { speed: 340, emoji: '☕', size: 15, arc: 22 },
    levels: [
      { cost: 75,  dmg: 16, cd: 0.80, range: 130 },
      { cost: 70,  dmg: 30, cd: 0.75, range: 142, name: 'Lerncrunch Deluxe', emoji: '🍫' },
      { cost: 140, dmg: 58, cd: 0.70, range: 156, name: 'All-Nighter',       emoji: '🌙' },
    ],
  },
  lerngruppe: {
    id: 'lerngruppe', name: 'Lerngruppe', emoji: '👥', hotkey: '3',
    desc: 'Gemeinsam lernt es sich besser: Flächenschaden im Umkreis des Einschlags.',
    proj: { speed: 300, emoji: '📚', size: 15, arc: 34 },
    levels: [
      { cost: 110, dmg: 12, cd: 1.10, range: 115, splash: 55 },
      { cost: 100, dmg: 23, cd: 1.05, range: 124, splash: 66, name: 'Lern-WG',  emoji: '🛋️' },
      { cost: 190, dmg: 44, cd: 1.00, range: 136, splash: 80, name: 'Lern-AG',  emoji: '🏫' },
    ],
  },
  frist: {
    id: 'frist', name: 'Fristverlängerung', emoji: '📋', hotkey: '4',
    desc: 'Antrag eingereicht! Verlangsamt Gegner deutlich. (Bosse: halbe Wirkung)',
    proj: { speed: 320, emoji: '📋', size: 14, arc: 24 },
    levels: [
      { cost: 90,  dmg: 4,  cd: 0.90, range: 120, slow: 0.35, slowDur: 1.6 },
      { cost: 75,  dmg: 8,  cd: 0.88, range: 132, slow: 0.45, slowDur: 1.9, name: 'Attest vom Arzt',  emoji: '🤒' },
      { cost: 140, dmg: 14, cd: 0.85, range: 146, slow: 0.55, slowDur: 2.2, name: 'Härtefallantrag', emoji: '⚖️' },
    ],
  },
  referat: {
    id: 'referat', name: 'Zusatzreferat', emoji: '🎤', hotkey: '5',
    desc: 'Freiwillige Meldung! Riesige Reichweite, gewaltiger Einzelschaden, langsam.',
    proj: { speed: 540, emoji: '📊', size: 16, arc: 8 },
    levels: [
      { cost: 140, dmg: 55,  cd: 2.20, range: 210 },
      { cost: 120, dmg: 105, cd: 2.10, range: 235, name: 'Referat mit Handout',  emoji: '📊' },
      { cost: 230, dmg: 200, cd: 2.00, range: 265, name: 'PowerPoint-Overkill',  emoji: '💻' },
    ],
  },
  wlan: {
    id: 'wlan', name: 'WLAN-Störer', emoji: '📡', hotkey: '6',
    desc: 'Instabiles Schul-WLAN: Blitz springt auf nahe Gegner über (−30% je Sprung).',
    proj: null, chainRange: 110, chainFalloff: 0.7,
    levels: [
      { cost: 170, dmg: 30,  cd: 1.30, range: 125, chains: 3 },
      { cost: 150, dmg: 60,  cd: 1.25, range: 138, chains: 4, name: 'Störsender 5G',    emoji: '📶' },
      { cost: 280, dmg: 115, cd: 1.20, range: 152, chains: 5, name: 'Totalausfall',     emoji: '🛜' },
    ],
  },
  kiosk: {
    id: 'kiosk', name: 'Energydrink-Kiosk', emoji: '🥤', hotkey: '7',
    desc: 'Greift nicht an, aber pusht benachbarte Tower: +Angriffstempo (stapelt nicht).',
    proj: null,
    levels: [
      { cost: 120, dmg: 0, cd: 0, range: 100, buff: 0.25 },
      { cost: 100, dmg: 0, cd: 0, range: 115, buff: 0.40, name: 'Energy-Großhandel', emoji: '🧃' },
      { cost: 180, dmg: 0, cd: 0, range: 130, buff: 0.60, name: 'Koffein-Imperium',  emoji: '⚡' },
    ],
  },
  schulsprecher: {
    id: 'schulsprecher', name: 'Schulsprecher', emoji: '📣', hotkey: '8',
    desc: 'Setzt sich für dich ein: senkt die Panzerung aller Gegner in Reichweite.',
    proj: null,
    levels: [
      { cost: 160, dmg: 0, cd: 0, range: 110, shred: 0.15 },
      { cost: 140, dmg: 0, cd: 0, range: 125, shred: 0.25, name: 'Schülervertretung', emoji: '🗳️' },
      { cost: 240, dmg: 0, cd: 0, range: 140, shred: 0.40, name: 'Schülerstreik',     emoji: '✊' },
    ],
  },
  nachhilfe: {
    id: 'nachhilfe', name: 'Nachhilfe-Session', emoji: '🧑‍🏫', hotkey: '9',
    desc: 'Profi-Hilfe: ignoriert Panzerung komplett, +60% Schaden gegen Bosse.',
    proj: { speed: 420, emoji: '✏️', size: 15, arc: 18 },
    pierce: true, bossBonus: 1.6,
    levels: [
      { cost: 200, dmg: 40,  cd: 1.50, range: 150 },
      { cost: 170, dmg: 75,  cd: 1.45, range: 165, name: 'Profi-Nachhilfe', emoji: '👩‍🏫' },
      { cost: 320, dmg: 140, cd: 1.40, range: 185, name: 'Privatdozent',    emoji: '🎓' },
    ],
  },
  nebenjob: {
    id: 'nebenjob', name: 'Nebenjob', emoji: '💼', hotkey: '0',
    desc: 'Schichten im Getränkemarkt: bringt am Ende jeder Welle Motivation ein.',
    proj: null,
    levels: [
      { cost: 150, dmg: 0, cd: 0, range: 0, income: 25 },
      { cost: 120, dmg: 0, cd: 0, range: 0, income: 50, name: 'Wochenend-Schicht', emoji: '🛒' },
      { cost: 200, dmg: 0, cd: 0, range: 0, income: 90, name: 'Eigenes Start-up',  emoji: '🚀' },
    ],
  },
};

const TOWER_ORDER = ['karteikarten', 'lerncrunch', 'lerngruppe', 'frist', 'referat', 'wlan', 'kiosk', 'schulsprecher', 'nachhilfe', 'nebenjob'];

/* ---------- GEGNER ----------
   hp = Basiswert bei Welle 1; wird beim Spawn mit hpMul(Welle) skaliert.
   dmg = Schaden am Zeugnis beim Durchkommen. armor = prozentuale Schadensreduktion. */
const ENEMY_TYPES = {
  hausaufgabe:   { id: 'hausaufgabe',   name: 'Hausaufgabe',                emoji: '📄', hp: 34,  speed: 55,  bounty: 4,   dmg: 1 },
  diktat:        { id: 'diktat',        name: 'Diktat',                     emoji: '✏️', hp: 52,  speed: 48,  bounty: 5,   dmg: 1 },
  vokabeltest:   { id: 'vokabeltest',   name: 'Vokabeltest',                emoji: '📝', hp: 20,  speed: 88,  bounty: 3,   dmg: 1, fast: true },
  sport:         { id: 'sport',         name: 'Sportunterricht',            emoji: '🏃', hp: 27,  speed: 108, bounty: 4,   dmg: 1, fast: true },
  gruppenarbeit: { id: 'gruppenarbeit', name: 'Gruppenarbeit',              emoji: '🧑‍🤝‍🧑', hp: 58, speed: 50, bounty: 6, dmg: 1, split: { type: 'einzelaufgabe', count: 3 } },
  einzelaufgabe: { id: 'einzelaufgabe', name: 'Einzelaufgabe',              emoji: '📃', hp: 14,  speed: 72,  bounty: 2,   dmg: 1 },
  klassenarbeit: { id: 'klassenarbeit', name: 'Klassenarbeit',              emoji: '📕', hp: 115, speed: 40,  bounty: 10,  dmg: 2, armor: 0.25 },
  muendlich:     { id: 'muendlich',     name: 'Mündliche Prüfung',          emoji: '🗣️', hp: 62,  speed: 58,  bounty: 7,   dmg: 1, slowImmune: true },
  klausur:       { id: 'klausur',       name: 'Mathe-Klausur',              emoji: '📐', hp: 165, speed: 36,  bounty: 14,  dmg: 2, armor: 0.45 },
  lehrer:        { id: 'lehrer',        name: 'Schlecht gelaunter Lehrer',  emoji: '👨‍🏫', hp: 620, speed: 33, bounty: 55,  dmg: 3, armor: 0.30, boss: true },
  elternsprechtag:{id: 'elternsprechtag',name:'Elternsprechtag',            emoji: '👪', hp: 680, speed: 30,  bounty: 65,  dmg: 3, boss: true, slowImmune: true },
  zp10:          { id: 'zp10',          name: 'Abschlussprüfung Kl. 10',    emoji: '🧾', hp: 900, speed: 30,  bounty: 130, dmg: 5, armor: 0.35, boss: true },
  facharbeit:    { id: 'facharbeit',    name: 'Die Facharbeit',             emoji: '📚', hp: 950, speed: 28,  bounty: 140, dmg: 5, armor: 0.30, boss: true },
  konferenz:     { id: 'konferenz',     name: 'Zeugniskonferenz',           emoji: '🧑‍⚖️', hp: 1050, speed: 27, bounty: 160, dmg: 5, armor: 0.40, boss: true },
  abi:           { id: 'abi',           name: 'DIE ABITURPRÜFUNG',          emoji: '🎓', hp: 1500, speed: 26,  bounty: 600, dmg: 20, armor: 0.45, boss: true, final: true },
};

/* ---------- WELLEN ----------
   comp: [TypId, Anzahl, Abstand in Sekunden] – Gruppen spawnen nacheinander. */
const WAVES = [
  { year: 1,  hj: 1, title: 'Erste Hausaufgaben',                comp: [['hausaufgabe', 8, 1.1]] },
  { year: 1,  hj: 2, title: 'Noch mehr Hausaufgaben',            comp: [['hausaufgabe', 7, 1.0], ['diktat', 3, 1.3]] },
  { year: 2,  hj: 1, title: 'Vokabeltest-Schwarm',               comp: [['vokabeltest', 14, 0.55]] },
  { year: 2,  hj: 2, title: 'Diktat-Doppelstunde',               comp: [['diktat', 8, 1.0], ['hausaufgabe', 6, 0.8]] },
  { year: 3,  hj: 1, title: 'Bundesjugendspiele',                comp: [['sport', 11, 0.7]] },
  { year: 3,  hj: 2, title: 'BOSS: Schlecht gelaunter Lehrer',   comp: [['hausaufgabe', 6, 0.8], ['lehrer', 1, 2.0]], boss: true },
  { year: 4,  hj: 1, title: 'Gruppenarbeit (na toll …)',         comp: [['gruppenarbeit', 6, 1.4]] },
  { year: 4,  hj: 2, title: 'Die erste echte Klassenarbeit',     comp: [['klassenarbeit', 5, 1.8], ['vokabeltest', 8, 0.5]] },
  { year: 5,  hj: 1, title: 'Neue Schule, neue Fächer',          comp: [['vokabeltest', 12, 0.5], ['sport', 7, 0.7]] },
  { year: 5,  hj: 2, title: 'Klassenarbeits-Phase',              comp: [['klassenarbeit', 6, 1.5], ['diktat', 6, 0.9]] },
  { year: 6,  hj: 1, title: 'Mündliche Noten zählen!',           comp: [['muendlich', 9, 1.0]] },
  { year: 6,  hj: 2, title: 'BOSS: Elternsprechtag',             comp: [['gruppenarbeit', 6, 1.2], ['elternsprechtag', 1, 2.0]], boss: true },
  { year: 7,  hj: 1, title: 'Sportfest-Sprint',                  comp: [['sport', 14, 0.5], ['vokabeltest', 8, 0.45]] },
  { year: 7,  hj: 2, title: 'Klassenarbeiten im Akkord',         comp: [['klassenarbeit', 8, 1.2]] },
  { year: 8,  hj: 1, title: 'Projektwoche eskaliert',            comp: [['gruppenarbeit', 8, 1.1], ['muendlich', 6, 0.9]] },
  { year: 8,  hj: 2, title: 'Die erste Mathe-Klausur',           comp: [['klausur', 5, 2.0], ['hausaufgabe', 8, 0.6]] },
  { year: 9,  hj: 1, title: 'Prüfungs-Marathon',                 comp: [['muendlich', 9, 0.8], ['sport', 8, 0.55]] },
  { year: 9,  hj: 2, title: 'BOSS: Lehrer mit Kaffeeentzug',     comp: [['klassenarbeit', 5, 1.3], ['lehrer', 1, 2.0]], boss: true },
  { year: 10, hj: 1, title: 'Hausaufgaben-Lawine',               comp: [['hausaufgabe', 22, 0.35], ['einzelaufgabe', 10, 0.3]] },
  { year: 10, hj: 2, title: 'BOSS: Abschlussprüfung Kl. 10',     comp: [['klausur', 3, 1.6], ['zp10', 1, 2.0]], boss: true },
  { year: 11, hj: 1, title: 'Oberstufe: Klausurenphase',         comp: [['klausur', 6, 1.4], ['muendlich', 7, 0.8]] },
  { year: 11, hj: 2, title: 'Alles gleichzeitig fällig',         comp: [['klassenarbeit', 7, 1.0], ['klausur', 5, 1.3]] },
  { year: 12, hj: 1, title: 'BOSS: Die Facharbeit',              comp: [['gruppenarbeit', 8, 0.9], ['facharbeit', 1, 2.0]], boss: true },
  { year: 12, hj: 2, title: 'BOSS: Zeugniskonferenz',            comp: [['muendlich', 10, 0.7], ['konferenz', 1, 2.0]], boss: true },
  { year: 13, hj: 1, title: 'Vorabi-Klausuren',                  comp: [['klausur', 8, 1.1], ['sport', 10, 0.5]] },
  { year: 13, hj: 2, title: 'FINALE: DIE ABITURPRÜFUNG',         comp: [['klassenarbeit', 6, 1.0], ['abi', 1, 3.0]], boss: true, final: true },
];

/* HP-/Bounty-Skalierung pro Welle (gilt auch im Endlosmodus).
   Zweiphasig: sanfter Einstieg, ab der Mittelstufe zieht es an. */
function hpMul(wave) {
  const b = CONFIG.HP_BREAK;
  if (wave <= b) return Math.pow(CONFIG.HP_GROWTH_EARLY, wave - 1);
  return Math.pow(CONFIG.HP_GROWTH_EARLY, b - 1) * Math.pow(CONFIG.HP_GROWTH_LATE, wave - b);
}
function bountyMul(wave) { return Math.pow(CONFIG.BOUNTY_GROWTH, wave - 1); }
function waveBonus(wave) { return CONFIG.WAVE_BONUS_BASE + CONFIG.WAVE_BONUS_PER_WAVE * wave; }

/* Endlosmodus: prozedural generierte Wellen nach dem Abi ("Studium"). */
const ENDLESS_POOL = [
  [['klausur', 8, 1.0], ['muendlich', 8, 0.7]],
  [['klassenarbeit', 10, 0.9], ['sport', 10, 0.45]],
  [['gruppenarbeit', 10, 0.8], ['vokabeltest', 14, 0.35]],
  [['hausaufgabe', 26, 0.3], ['klausur', 5, 1.2]],
  [['muendlich', 12, 0.6], ['klassenarbeit', 8, 0.9]],
];
const ENDLESS_BOSSES = ['lehrer', 'elternsprechtag', 'zp10', 'facharbeit', 'konferenz', 'abi'];

function makeEndlessWave(wave) {
  const n = wave - CONFIG.TOTAL_WAVES;             // 1, 2, 3 …
  const comp = ENDLESS_POOL[(n - 1) % ENDLESS_POOL.length].map(g => [g[0], g[1], g[2]]);
  const isBoss = n % 3 === 0;
  if (isBoss) comp.push([ENDLESS_BOSSES[Math.floor((n / 3 - 1)) % ENDLESS_BOSSES.length], 1 + Math.floor(n / 9), 2.5]);
  return { year: 13, hj: 2, endless: n, title: `Studium, ${n}. Semester`, comp, boss: isBoss };
}

function getWave(wave) {
  return wave <= CONFIG.TOTAL_WAVES ? WAVES[wave - 1] : makeEndlessWave(wave);
}

/* Export für Node (Tests/Simulation); im Browser global. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, DIFFICULTIES, MAPS, MAP_ORDER, ABILITIES, ABILITY_ORDER, ELITES, ACHIEVEMENTS,
                     TOWER_TYPES, TOWER_ORDER, ENEMY_TYPES, WAVES, hpMul, bountyMul, waveBonus, getWave, makeEndlessWave };
}

/* ============================================================
   Zeugnis-Verteidigung – Spiel-Engine (v5)
   Teil 1: Setup, Zustand, Audio + Musik, Sprites, Terrain,
           Speichern/Laden, Erfolge, Menü
   ============================================================ */
'use strict';

/* ---------- Canvas & DOM ---------- */
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const { COLS, ROWS, CELL } = CONFIG;
canvas.width = COLS * CELL;
const PADY = 18;                 // oberer Randstreifen, damit die oberste Reihe (Tuerme/Gegner) nicht abgeschnitten wird
canvas.height = ROWS * CELL + PADY;

const $ = (id) => document.getElementById(id);
const ui = {
  menu: $('menu'), game: $('game'), diffButtons: $('diffButtons'), mapButtons: $('mapButtons'),
  menuContinue: $('menuContinue'), menuHigh: $('menuHigh'),
  lives: $('lives'), gold: $('gold'), waveNum: $('waveNum'), waveName: $('waveName'),
  statLives: $('statLives'), btnWave: $('btnWave'), btnPause: $('btnPause'),
  btnSound: $('btnSound'), btnMusic: $('btnMusic'), btnAch: $('btnAch'), btnHelp: $('btnHelp'),
  btnCloseHelp: $('btnCloseHelp'), btnCloseAch: $('btnCloseAch'), volSlider: $('volSlider'),
  helpPanel: $('helpPanel'), achPanel: $('achPanel'), achList: $('achList'),
  buildButtons: $('buildButtons'), infoPanel: $('infoPanel'),
  wavePreview: $('wavePreview'), abilityBar: $('abilityBar'), toast: $('toast'), tooltip: $('tooltip'),
  endscreen: $('endscreen'), endTitle: $('endTitle'), endText: $('endText'),
  endStats: $('endStats'), btnRestart: $('btnRestart'),
};

const cellCx = (i) => (i % COLS) * CELL + CELL / 2;
const cellCy = (i) => ((i / COLS) | 0) * CELL + CELL / 2;
const dist2 = (x1, y1, x2, y2) => (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
const fmt = (n) => Math.round(n).toLocaleString('de-DE');

/* ---------- Spielzustand ---------- */
const S = {
  running: false, paused: false, speed: 1, soundOn: true, musicOn: true,
  difficulty: null, diffKey: null, map: null, mapKey: 'pausenhof', mapSel: 'pausenhof',
  gold: 0, lives: 0,
  wave: 0, inWave: false, betweenT: null, endless: false,
  blocked: new Uint8Array(COLS * ROWS),
  obstacles: new Set(),
  spawnIdxs: [], coreIdx: -1,
  dist: null, flow: null, routes: [],
  towers: [], towerAt: new Map(),
  enemies: [], projectiles: [], particles: [], floats: [], beams: [],
  spawnQueue: [], spawnT: 0, spawnIdxPtr: 0, gateCounter: 0,
  buildSel: null, selTower: null, selSet: null,
  hoverCell: -1, hoverValid: false, hoverReason: '', ghostRoutes: null,
  mouseX: -1, mouseY: -1,
  shakeT: 0, time: 0,
  freezeUntil: 0, frenzyUntil: 0,
  abilReady: { hitzefrei: 0, energy: 0, brot: 0 },
  earlyStreak: 0,
  stats: { kills: 0, leaks: 0, earned: 0, built: 0, builtTypes: {} },
  achUnlocked: new Set(),
};

/* ---------- Audio: SFX + prozedurale Musik + Lautstärke ---------- */
let AC = null, masterGain = null, sfxGain = null, musicGain = null;
function audio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = AC.createGain(); masterGain.gain.value = 0.9; masterGain.connect(AC.destination);
      sfxGain = AC.createGain(); sfxGain.gain.value = 1.0; sfxGain.connect(masterGain);
      musicGain = AC.createGain(); musicGain.gain.value = 0.45; musicGain.connect(masterGain);
    } catch (e) { /* kein Audio verfügbar */ }
  }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function setVolume(v) { if (masterGain) masterGain.gain.value = v; }

function tone(f0, f1, dur, type = 'square', vol = 0.16, delay = 0) {
  if (!S.soundOn) return;
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator(), g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g); g.connect(sfxGain);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}
const snd = {
  shoot:   () => tone(760, 420, 0.05, 'square', 0.05),
  zap:     () => { tone(1400, 300, 0.08, 'sawtooth', 0.07); tone(900, 200, 0.1, 'square', 0.05, 0.02); },
  hit:     () => tone(260, 200, 0.04, 'triangle', 0.07),
  kill:    () => tone(330, 90, 0.13, 'sawtooth', 0.10),
  leak:    () => { tone(160, 70, 0.4, 'sawtooth', 0.22); tone(110, 55, 0.5, 'square', 0.14, 0.05); },
  build:   () => { tone(420, 420, 0.06, 'square', 0.12); tone(640, 640, 0.07, 'square', 0.12, 0.06); },
  upgrade: () => { tone(520, 780, 0.1, 'square', 0.14); tone(780, 1040, 0.12, 'square', 0.12, 0.09); },
  sell:    () => tone(500, 180, 0.16, 'square', 0.12),
  error:   () => tone(130, 90, 0.18, 'square', 0.16),
  wave:    () => { tone(392, 392, 0.11, 'square', 0.15); tone(523, 523, 0.14, 'square', 0.15, 0.12); },
  boss:    () => { tone(98, 98, 0.3, 'sawtooth', 0.2); tone(92, 92, 0.35, 'sawtooth', 0.2, 0.3); tone(196, 110, 0.5, 'square', 0.16, 0.62); },
  victory: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'square', 0.16, i * 0.16)),
  defeat:  () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.92, 0.25, 'sawtooth', 0.16, i * 0.2)),
  coin:    () => tone(880, 1320, 0.07, 'square', 0.08),
  ability: () => { tone(660, 990, 0.12, 'square', 0.14); tone(990, 1320, 0.14, 'triangle', 0.1, 0.1); },
  ach:     () => [659, 880, 1175].forEach((f, i) => tone(f, f, 0.14, 'square', 0.13, i * 0.12)),
};

/* Lo-Fi-Hintergrundmusik: kleiner Sequencer (A-Moll-Pentatonik) */
const MELODY = [0, 3, 5, 7, 10, 7, 5, 3, 0, 3, 7, 12, 10, 7, 12, 15];
const BASSLINE = [0, 0, -4, -4, 3, 3, -2, -2];
let musicTimer = null, musicNext = 0, musicStep = 0;
function noteFreq(base, semis) { return base * Math.pow(2, semis / 12); }
function scheduleMusicNote(t, i) {
  if (!AC) return;
  // Lead (jede 8tel), gelegentlich Pause für Luftigkeit
  if (i % 16 !== 7 && i % 16 !== 15) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square';
    o.frequency.value = noteFreq(440, MELODY[i % MELODY.length]);
    g.gain.setValueAtTime(0.028, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.24);
  }
  if (i % 2 === 0) {                       // Bass (jede 4tel)
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'triangle';
    o.frequency.value = noteFreq(110, BASSLINE[(i / 2) % BASSLINE.length]);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.45);
  }
}
function musicTick() {
  if (!AC || !S.musicOn) return;
  const now = AC.currentTime;
  if (musicNext < now) musicNext = now + 0.05;
  while (musicNext < now + 0.3) {
    scheduleMusicNote(musicNext, musicStep);
    musicNext += 0.24;
    musicStep++;
  }
}
function startMusic() {
  if (!audio()) return;
  if (!musicTimer) musicTimer = setInterval(musicTick, 110);
}

/* ---------- Emoji-Sprites (vor-gerendert) ---------- */
const spriteCache = new Map();
function sprite(emoji, px) {
  const key = emoji + '_' + px;
  let c = spriteCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    const pad = Math.ceil(px * 0.35);
    c.width = c.height = px + pad * 2;
    const cc = c.getContext('2d');
    cc.font = px + 'px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    cc.textAlign = 'center'; cc.textBaseline = 'middle';
    cc.fillText(emoji, c.width / 2, c.height / 2 + px * 0.06);
    spriteCache.set(key, c);
  }
  return c;
}
function drawEmoji(emoji, x, y, px) {
  const c = sprite(emoji, px);
  ctx.drawImage(c, x - c.width / 2, y - c.height / 2);
}

/* ---------- Terrain (pro Karte gerendert) ---------- */
const terrain = document.createElement('canvas');
terrain.width = COLS * CELL; terrain.height = ROWS * CELL;

function renderTerrain(map) {
  const t = terrain.getContext('2d');
  t.clearRect(0, 0, terrain.width, terrain.height);
  t.fillStyle = '#f6f1e2';
  t.fillRect(0, 0, terrain.width, terrain.height);
  for (let i = 0; i < 130; i++) {                       // Papier-Flecken
    t.fillStyle = 'rgba(120,100,60,' + (0.02 + Math.random() * 0.03) + ')';
    const r = 4 + Math.random() * 16;
    t.beginPath();
    t.arc(Math.random() * terrain.width, Math.random() * terrain.height, r, 0, Math.PI * 2);
    t.fill();
  }
  t.strokeStyle = 'rgba(110,150,200,0.4)';              // Karo-Linien
  t.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) { t.beginPath(); t.moveTo(x * CELL + 0.5, 0); t.lineTo(x * CELL + 0.5, terrain.height); t.stroke(); }
  for (let y = 0; y <= ROWS; y++) { t.beginPath(); t.moveTo(0, y * CELL + 0.5); t.lineTo(terrain.width, y * CELL + 0.5); t.stroke(); }
  t.strokeStyle = 'rgba(200,60,50,0.35)';               // rote Heftrand-Linie
  t.lineWidth = 2;
  t.beginPath(); t.moveTo(CELL * 1.5, 0); t.lineTo(CELL * 1.5, terrain.height); t.stroke();
  for (let y = 0; y < ROWS; y++) {                      // Kachel-Bevel (3D-Fliesen)
    for (let x = 0; x < COLS; x++) {
      const px = x * CELL, py = y * CELL;
      t.fillStyle = 'rgba(255,255,255,0.20)';
      t.fillRect(px + 1, py + 1, CELL - 2, 1.5);
      t.fillRect(px + 1, py + 1, 1.5, CELL - 2);
      t.fillStyle = 'rgba(90,70,40,0.10)';
      t.fillRect(px + 1, py + CELL - 2.5, CELL - 2, 1.5);
      t.fillRect(px + CELL - 2.5, py + 1, 1.5, CELL - 2);
    }
  }
  const lg = t.createLinearGradient(0, 0, terrain.width, terrain.height);   // Licht von oben links
  lg.addColorStop(0, 'rgba(255,250,230,0.20)');
  lg.addColorStop(0.5, 'rgba(255,250,230,0)');
  lg.addColorStop(1, 'rgba(60,40,10,0.16)');
  t.fillStyle = lg; t.fillRect(0, 0, terrain.width, terrain.height);
  const vg = t.createRadialGradient(terrain.width / 2, terrain.height / 2, terrain.height * 0.45, terrain.width / 2, terrain.height / 2, terrain.width * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,40,10,0.20)');
  t.fillStyle = vg; t.fillRect(0, 0, terrain.width, terrain.height);
  // Spawn- und Zielzellen einfärben
  t.fillStyle = 'rgba(90,60,30,0.25)';
  for (const s of map.spawns) t.fillRect(s.x * CELL, s.y * CELL, CELL, CELL);
  t.fillStyle = 'rgba(240,200,80,0.3)';
  t.fillRect(map.core.x * CELL, map.core.y * CELL, CELL, CELL);
  // Hindernisse (Tischgruppen) als 3D-Blöcke einbacken
  for (const [ox, oy] of map.obstacles) {
    const px = ox * CELL, py = oy * CELL;
    t.fillStyle = 'rgba(40,25,5,0.30)';
    t.fillRect(px + 7, py + 8, CELL - 10, CELL - 10);
    const grd = t.createLinearGradient(px, py - 8, px, py + CELL);
    grd.addColorStop(0, '#b08a58'); grd.addColorStop(1, '#7a5c34');
    t.fillStyle = grd;
    t.fillRect(px + 3, py - 5, CELL - 6, CELL - 1);
    t.fillStyle = '#c9a06a';
    t.fillRect(px + 3, py - 5, CELL - 6, CELL - 14);
    t.strokeStyle = 'rgba(50,32,12,0.6)'; t.lineWidth = 1;
    t.strokeRect(px + 3, py - 5, CELL - 6, CELL - 1);
    t.font = '20px "Segoe UI Emoji", sans-serif';
    t.textAlign = 'center'; t.textBaseline = 'middle';
    t.fillText('🪑', px + CELL / 2, py + CELL / 2 - 6);
  }
  // Plattenkante
  t.fillStyle = 'rgba(255,250,230,0.30)';
  t.fillRect(0, 0, terrain.width, 2); t.fillRect(0, 0, 2, terrain.height);
  t.fillStyle = 'rgba(40,25,8,0.40)';
  t.fillRect(0, terrain.height - 3, terrain.width, 3); t.fillRect(terrain.width - 3, 0, 3, terrain.height);
}

/* ---------- Pfade neu berechnen (alle Schultore) ---------- */
function recomputeFlow(newDist) {
  S.dist = newDist || computeDist(S.blocked, COLS, ROWS, S.map.core);
  S.flow = computeFlow(S.dist, COLS, ROWS);
  S.routes = S.map.spawns.map(sp => traceRoute(S.flow, S.dist, COLS, sp, S.map.core));
}

/* ---------- Speichern / Laden / Highscores / Erfolge ---------- */
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
  catch (e) { return fallback; }
}
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
function lsDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

function saveGame() {
  if (!S.running) return;
  lsSet('zv_save', {
    v: 1, diff: S.diffKey, map: S.mapKey,
    gold: S.gold, lives: S.lives, wave: S.wave, endless: S.endless,
    stats: S.stats, earlyStreak: S.earlyStreak,
    towers: S.towers.map(t => [t.typeId, t.lvl, t.x, t.y, t.invested, t.prio, Math.round(t.dealt)]),
  });
}
function clearSave() { lsDel('zv_save'); }

function recordBest(victory, grade) {
  const best = lsGet('zv_best', {});
  const k = S.diffKey;
  const e = best[k] || { wave: 0, grade: null, semester: 0 };
  e.wave = Math.max(e.wave, S.inWave ? S.wave - 1 : S.wave);
  if (victory && grade !== null && (e.grade === null || grade < e.grade)) e.grade = grade;
  if (S.wave > CONFIG.TOTAL_WAVES) e.semester = Math.max(e.semester, S.wave - CONFIG.TOTAL_WAVES);
  best[k] = e;
  lsSet('zv_best', best);
}

function loadAchievements() {
  S.achUnlocked = new Set(lsGet('zv_ach', []));
}
function unlock(id) {
  if (S.achUnlocked.has(id)) return;
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return;
  S.achUnlocked.add(id);
  lsSet('zv_ach', [...S.achUnlocked]);
  snd.ach();
  showToast(`🏆 Erfolg freigeschaltet: ${a.emoji} <b>${a.name}</b><div class="toast-sub">${a.desc}</div>`, 3800);
}
function checkGoldAchievements() {
  if (S.gold >= 1000) unlock('sparfuchs');
  if (S.stats.earned >= 5000) unlock('magnat');
}
function onlyKarteikartenBuilt() {
  const keys = Object.keys(S.stats.builtTypes);
  return keys.length === 1 && keys[0] === 'karteikarten';
}

/* ---------- Spielstart / Fortsetzen ---------- */
function initGame(diffKey, mapKey) {
  S.diffKey = diffKey; S.difficulty = DIFFICULTIES[diffKey];
  S.mapKey = mapKey; S.map = MAPS[mapKey];
  S.coreIdx = cellIdx(S.map.core.x, S.map.core.y, COLS);
  S.spawnIdxs = S.map.spawns.map(sp => cellIdx(sp.x, sp.y, COLS));
  S.blocked = new Uint8Array(COLS * ROWS);
  S.obstacles = new Set();
  for (const [ox, oy] of S.map.obstacles) {
    const i = cellIdx(ox, oy, COLS);
    S.blocked[i] = 1;
    S.obstacles.add(i);
  }
  S.towers = []; S.towerAt = new Map();
  S.enemies = []; S.projectiles = []; S.particles = []; S.floats = []; S.beams = [];
  S.wave = 0; S.inWave = false; S.betweenT = null; S.endless = false;
  S.buildSel = null; S.selTower = null; S.selSet = null;
  S.freezeUntil = 0; S.frenzyUntil = 0;
  S.abilReady = { hitzefrei: 0, energy: 0, brot: 0 };
  S.earlyStreak = 0; S.gateCounter = 0; S.time = 0;
  S.stats = { kills: 0, leaks: 0, earned: 0, built: 0, builtTypes: {} };
  renderTerrain(S.map);
  recomputeFlow();
  S.running = true;
  ui.menu.hidden = true;
  ui.game.hidden = false;
  audio();
  startMusic();
}

function startGame(diffKey, mapKey) {
  initGame(diffKey, mapKey);
  S.gold = CONFIG.START_GOLD;
  S.lives = CONFIG.LIVES;
  clearSave();
  snd.wave();
  showToast(`<b>${S.difficulty.emoji} ${S.difficulty.label} – ${S.map.emoji} ${S.map.label}</b><div class="toast-sub">Baue deine Verteidigung und starte die 1. Welle!</div>`, 4200);
  refreshHUD(); refreshWavePreview(); refreshInfoPanel(); refreshAbilityBar();
}

function resumeGame(sv) {
  initGame(sv.diff, sv.map);
  S.gold = sv.gold; S.lives = sv.lives; S.wave = sv.wave; S.endless = !!sv.endless;
  S.stats = sv.stats || S.stats;
  if (!S.stats.builtTypes) S.stats.builtTypes = {};
  S.earlyStreak = sv.earlyStreak || 0;
  for (const row of sv.towers || []) {
    const [typeId, lvl, x, y, invested, prio, dealt] = row;
    if (!TOWER_TYPES[typeId] || x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
    const i = cellIdx(x, y, COLS);
    if (S.blocked[i]) continue;
    S.blocked[i] = 1;
    const t = { typeId, lvl: Math.min(2, lvl | 0), x, y, cx: x * CELL + CELL / 2, cy: y * CELL + CELL / 2,
                cdT: 0, auraT: 0, buffVal: 0, buffUntil: 0, flashT: 0,
                invested: invested || TOWER_TYPES[typeId].levels[0].cost,
                prio: prio || 'first', dealt: dealt || 0 };
    S.towers.push(t); S.towerAt.set(i, t);
  }
  recomputeFlow();
  S.betweenT = CONFIG.WAVE_PAUSE;
  snd.wave();
  showToast(`<b>Willkommen zurück!</b><div class="toast-sub">${S.map.emoji} ${S.map.label} · ${S.difficulty.label} · Weiter mit Welle ${S.wave + 1}</div>`, 4000);
  refreshHUD(); refreshWavePreview(); refreshInfoPanel(); refreshAbilityBar();
}

/* ---------- Menü aufbauen ---------- */
function buildMenu() {
  loadAchievements();
  // Kartenwahl
  ui.mapButtons.innerHTML = '';
  for (const key of MAP_ORDER) {
    const m = MAPS[key];
    const b = document.createElement('button');
    b.className = 'map-btn' + (key === S.mapSel ? ' selected' : '');
    b.innerHTML = `<span class="m-emoji">${m.emoji}</span><span class="m-name">${m.label}</span><span class="m-desc">${m.desc}</span>`;
    b.addEventListener('click', () => {
      S.mapSel = key;
      ui.mapButtons.querySelectorAll('.map-btn').forEach(x => x.classList.toggle('selected', x === b));
    });
    ui.mapButtons.appendChild(b);
  }
  // Schwierigkeitswahl (klick = Start)
  ui.diffButtons.innerHTML = '';
  for (const [key, d] of Object.entries(DIFFICULTIES)) {
    const b = document.createElement('button');
    b.className = 'diff-btn';
    b.innerHTML = `<span class="d-emoji">${d.emoji}</span><span class="d-name">${d.label}</span><span class="d-desc">${d.desc}</span>`;
    b.addEventListener('click', () => startGame(key, S.mapSel));
    ui.diffButtons.appendChild(b);
  }
  // Weiterspielen-Button (falls Spielstand existiert)
  const sv = lsGet('zv_save', null);
  ui.menuContinue.innerHTML = '';
  if (sv && sv.v === 1 && DIFFICULTIES[sv.diff] && MAPS[sv.map]) {
    const b = document.createElement('button');
    b.className = 'btn btn-gold btn-continue';
    b.textContent = `▶ Weiterspielen: ${MAPS[sv.map].emoji} ${MAPS[sv.map].label} · ${DIFFICULTIES[sv.diff].label} · nach Welle ${sv.wave}`;
    b.addEventListener('click', () => resumeGame(sv));
    ui.menuContinue.appendChild(b);
  }
  // Highscores
  const best = lsGet('zv_best', {});
  let h = '';
  for (const [key, d] of Object.entries(DIFFICULTIES)) {
    const e = best[key];
    if (!e) continue;
    const parts = [`beste Welle: <b>${e.wave}</b>`];
    if (e.grade !== null && e.grade !== undefined) parts.push(`Bestnote: <b>${e.grade.toFixed(1).replace('.', ',')}</b>`);
    if (e.semester) parts.push(`Endlos: <b>${e.semester}. Semester</b>`);
    h += `<div>${d.emoji} ${d.label} – ${parts.join(' · ')}</div>`;
  }
  ui.menuHigh.innerHTML = h ? `<b>🏅 Deine Rekorde</b>${h}` : '';
}

/* ============================================================
   Teil 2: Wellen, Gegner, Eliten, Tower, Fähigkeiten, Kampf
   ============================================================ */

function waveLabel(w) {
  const wv = getWave(w);
  return wv.endless ? `Studium, ${wv.endless}. Semester` : `Klasse ${wv.year}, ${wv.hj}. Halbjahr`;
}

function startWave() {
  if (S.inWave || !S.running) return;
  if (S.betweenT !== null && S.betweenT > 0.5) {       // Frühstart-Bonus
    const bonus = Math.round(S.betweenT * CONFIG.EARLY_BONUS_PER_SEC);
    if (bonus > 0) {
      S.gold += bonus; S.stats.earned += bonus;
      addFloat(cellCx(S.spawnIdxs[0]) + 34, cellCy(S.spawnIdxs[0]) - 12, `+${bonus} 💪 Frühstart`, '#2a9d2a');
      snd.coin();
      S.earlyStreak++;
      if (S.earlyStreak >= 5) unlock('blitz');
    }
  } else if (S.betweenT !== null) {
    S.earlyStreak = 0;                                  // Auto-Start bricht die Serie
  }
  S.betweenT = null;
  S.wave++;
  S.inWave = true;
  if (S.wave - CONFIG.TOTAL_WAVES >= 10) unlock('student');
  const wv = getWave(S.wave);
  S.spawnQueue = [];
  let t = 0.8;
  for (const [typeId, count, gap] of wv.comp) {
    for (let i = 0; i < count; i++) { S.spawnQueue.push({ type: typeId, t }); t += gap; }
    t += 1.2;
  }
  S.spawnT = 0; S.spawnIdxPtr = 0;
  if (wv.boss) snd.boss(); else snd.wave();
  showToast(`<b>Welle ${S.wave}: ${wv.title}</b><div class="toast-sub">${waveLabel(S.wave)}</div>`, 3500, wv.boss);
  refreshHUD(); refreshWavePreview();
}

function spawnEnemy(typeId, wave) {
  const base = ENEMY_TYPES[typeId];
  let hp = Math.max(1, Math.round(base.hp * hpMul(wave) * S.difficulty.hpMul));
  let bounty = Math.max(1, Math.round(base.bounty * bountyMul(wave)));
  // Elite-Affixe im Endlosmodus
  let elite = null;
  if (wave > CONFIG.TOTAL_WAVES && !base.boss && Math.random() < CONFIG.ELITE_CHANCE) {
    const keys = Object.keys(ELITES);
    elite = keys[Math.floor(Math.random() * keys.length)];
    hp = Math.round(hp * CONFIG.ELITE_HP);
    bounty = Math.round(bounty * CONFIG.ELITE_BOUNTY);
  }
  const gate = S.gateCounter++ % S.map.spawns.length;
  const gIdx = S.spawnIdxs[gate];
  S.enemies.push({
    type: base, name: base.name, emoji: base.emoji,
    hp, maxHp: hp, wave, bounty,
    speed: base.speed, dmg: base.dmg,
    armor: base.armor || 0, boss: !!base.boss, slowImmune: !!base.slowImmune,
    split: base.split || null, final: !!base.final,
    elite, auraShield: false, auraHaste: false,
    shredVal: 0, shredUntil: 0,
    x: -CELL * 0.4, y: cellCy(gIdx) + (Math.random() * 10 - 5),
    cell: gIdx, gate, entering: true,
    slowPct: 0, slowUntil: 0, remaining: 1e9,
    size: base.boss ? 30 : (elite ? 25 : 21), wobble: Math.random() * Math.PI * 2,
  });
}

function spawnSplitChildren(parent) {
  const base = ENEMY_TYPES[parent.split.type];
  for (let i = 0; i < parent.split.count; i++) {
    const hp = Math.max(1, Math.round(base.hp * hpMul(parent.wave) * S.difficulty.hpMul));
    S.enemies.push({
      type: base, name: base.name, emoji: base.emoji,
      hp, maxHp: hp, wave: parent.wave,
      bounty: Math.max(1, Math.round(base.bounty * bountyMul(parent.wave))),
      speed: base.speed, dmg: base.dmg,
      armor: base.armor || 0, boss: false, slowImmune: !!base.slowImmune, split: null, final: false,
      elite: null, auraShield: false, auraHaste: false,
      shredVal: 0, shredUntil: 0,
      x: parent.x + (Math.random() * 22 - 11), y: parent.y + (Math.random() * 22 - 11),
      cell: parent.cell, gate: parent.gate, entering: parent.entering,
      slowPct: 0, slowUntil: 0, remaining: parent.remaining,
      size: 18, wobble: Math.random() * Math.PI * 2,
    });
  }
}

/* ---------- Gegner ---------- */
function slowFactor(e) {
  if (S.freezeUntil > S.time) return e.boss ? 0.5 : 0;  // Hitzefrei!
  return (e.slowUntil <= S.time || e.slowPct <= 0) ? 1 : 1 - e.slowPct;
}

function updateEnemies(dt) {
  // Elite-Auren markieren (Schildwache / Tempomacher)
  for (const e of S.enemies) { e.auraShield = false; e.auraHaste = false; }
  for (const e of S.enemies) {
    if (!e.elite || e.hp <= 0) continue;
    if (e.elite === 'regen') {
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.015 * dt);
      continue;
    }
    const flag = e.elite === 'schild' ? 'auraShield' : 'auraHaste';
    for (const o of S.enemies) {
      if (o === e) continue;
      if (dist2(e.x, e.y, o.x, o.y) <= 90 * 90) o[flag] = true;
    }
  }
  const coreX = cellCx(S.coreIdx), coreY = cellCy(S.coreIdx);
  for (let k = S.enemies.length - 1; k >= 0; k--) {
    const e = S.enemies[k];
    let sp = e.speed * slowFactor(e);
    if (e.elite === 'tempo') sp *= 1.3;
    if (e.auraHaste) sp *= 1.15;
    e.wobble += dt * 6;
    let tx, ty;
    if (e.entering)              { tx = cellCx(S.spawnIdxs[e.gate]); ty = cellCy(S.spawnIdxs[e.gate]); }
    else if (e.cell === S.coreIdx) { tx = coreX; ty = coreY; }
    else {
      const nxt = S.flow[e.cell];
      if (nxt === -1) { tx = e.x; ty = e.y; }
      else { tx = cellCx(nxt); ty = cellCy(nxt); }
    }
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    const step = sp * dt;
    if (d <= step + 0.5) {
      e.x = tx; e.y = ty;
      if (e.entering) e.entering = false;
      else if (e.cell === S.coreIdx) { leak(e); S.enemies.splice(k, 1); continue; }
      else if (S.flow[e.cell] !== -1) e.cell = S.flow[e.cell];
    } else if (step > 0) {
      e.x += dx / d * step; e.y += dy / d * step;
    }
    e.remaining = e.entering ? 1e9 : (S.dist[e.cell] * CELL + Math.hypot(tx - e.x, ty - e.y));
  }
}

function leak(e) {
  S.lives -= e.dmg;
  S.stats.leaks++;
  S.shakeT = 0.3;
  snd.leak();
  addFloat(cellCx(S.coreIdx), cellCy(S.coreIdx) - 24, `-${e.dmg} 🎓`, '#d03020', 1.1, 15);
  ui.statLives.classList.remove('hurt'); void ui.statLives.offsetWidth; ui.statLives.classList.add('hurt');
  if (S.lives <= 0) { S.lives = 0; refreshHUD(); gameOver(false, e); return; }
  refreshHUD();
}

/* ---------- Schaden & Effekte ---------- */
function applyDamage(e, dmg, src) {
  if (e.hp <= 0) return;
  let eff = dmg;
  if (!src.pierce) {
    const armor = Math.max(0, e.armor - (e.shredUntil > S.time ? e.shredVal : 0));
    eff *= (1 - armor);
  }
  if (src.bossBonus && e.boss) eff *= src.bossBonus;
  if (e.elite === 'schild') eff *= 0.70;
  if (e.auraShield) eff *= 0.85;
  eff = Math.max(1, Math.round(eff));
  if (src.srcT) src.srcT.dealt += Math.min(e.hp, eff);   // Schadensstatistik
  e.hp -= eff;
  addFloat(e.x + (Math.random() * 14 - 7), e.y - e.size * 0.8, '-' + fmt(eff), src.pierce ? '#9040c0' : '#b04030', 0.7, 11);
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  e.hp = 0;
  const i = S.enemies.indexOf(e);
  if (i >= 0) S.enemies.splice(i, 1);
  S.gold += e.bounty; S.stats.earned += e.bounty; S.stats.kills++;
  addFloat(e.x, e.y - 14, '+' + e.bounty + ' 💪', '#caa030', 0.9, 12);
  burst(e.x, e.y, e.boss ? 16 : 7, e.boss ? '#f0c850' : '#c0a060');
  S.particles.push({ ring: true, x: e.x, y: e.y + e.size * 0.4, t: 0.32, life: 0.32, r0: e.size * 0.4, color: e.boss ? '240,200,80' : '170,140,80' });
  snd.kill();
  checkGoldAchievements();
  if (e.split) spawnSplitChildren(e);
}

function applySlow(e, pct, dur) {
  if (e.slowImmune || pct <= 0) return;
  const p = pct * (e.boss ? CONFIG.BOSS_SLOW_RESIST : 1);
  if (p >= e.slowPct || e.slowUntil <= S.time) { e.slowPct = p; e.slowUntil = S.time + dur; }
}

/* ---------- Tower ---------- */
function towerLv(t)    { return TOWER_TYPES[t.typeId].levels[t.lvl]; }
function towerName(t)  { const tt = TOWER_TYPES[t.typeId]; return tt.levels[t.lvl].name || tt.name; }
function towerEmoji(t) { const tt = TOWER_TYPES[t.typeId]; return tt.levels[t.lvl].emoji || tt.emoji; }
function isSel(t)      { return S.selSet ? S.selSet.has(t) : t === S.selTower; }
function isSupport(lv) { return lv.buff !== undefined || lv.shred !== undefined || lv.income !== undefined; }

const PRIO_ORDER = ['first', 'strong', 'boss'];
const PRIO_LABEL = { first: 'Erster', strong: 'Stärkster', boss: 'Boss zuerst' };

function pickTarget(t, lv) {
  const r2 = lv.range * lv.range;
  let best = null, score = Infinity;
  for (const e of S.enemies) {
    if (e.x < -2) continue;
    if (dist2(t.cx, t.cy, e.x, e.y) > r2) continue;
    let s;
    if (t.prio === 'strong') s = -e.hp;
    else if (t.prio === 'boss') s = (e.boss ? 0 : 1) * 1e12 + e.remaining;
    else s = e.remaining;
    if (s < score) { score = s; best = e; }
  }
  return best;
}

function updateTowers(dt) {
  const frenzy = S.frenzyUntil > S.time ? 0.5 : 0;
  for (const t of S.towers) {
    if (t.flashT > 0) t.flashT -= dt;
    const tt = TOWER_TYPES[t.typeId];
    const lv = tt.levels[t.lvl];
    if (lv.income !== undefined) continue;             // Nebenjob: zahlt am Wellenende
    if (lv.buff !== undefined) {                       // Kiosk-Aura: Tower-Tempo
      t.auraT -= dt;
      if (t.auraT <= 0) {
        t.auraT = 0.4;
        const r2 = lv.range * lv.range;
        for (const o of S.towers) {
          if (o === t) continue;
          if (isSupport(TOWER_TYPES[o.typeId].levels[o.lvl])) continue;
          if (dist2(t.cx, t.cy, o.cx, o.cy) <= r2 && (lv.buff >= o.buffVal || o.buffUntil <= S.time)) {
            o.buffVal = lv.buff; o.buffUntil = S.time + 0.65;
          }
        }
      }
      continue;
    }
    if (lv.shred !== undefined) {                      // Schulsprecher-Aura: Gegner-Panzerung
      t.auraT -= dt;
      if (t.auraT <= 0) {
        t.auraT = 0.4;
        const r2 = lv.range * lv.range;
        for (const e of S.enemies) {
          if (e.x < -2) continue;
          if (dist2(t.cx, t.cy, e.x, e.y) <= r2 && (lv.shred >= e.shredVal || e.shredUntil <= S.time)) {
            e.shredVal = lv.shred; e.shredUntil = S.time + 0.65;
          }
        }
      }
      continue;
    }
    if (t.buffUntil <= S.time) t.buffVal = 0;
    t.cdT -= dt;
    if (t.cdT > 0) continue;
    const target = pickTarget(t, lv);
    if (!target) { t.cdT = 0.05; continue; }
    if (tt.chainRange) fireChain(t, tt, lv, target);
    else fire(t, tt, lv, target);
    t.cdT = lv.cd / (1 + t.buffVal + frenzy);
  }
}

function fire(t, tt, lv, target) {
  S.projectiles.push({
    x: t.cx, y: t.cy - 8,
    speed: tt.proj.speed, emoji: tt.proj.emoji, size: tt.proj.size,
    dmg: lv.dmg, splash: lv.splash || 0,
    slow: lv.slow || 0, slowDur: lv.slowDur || 0,
    pierce: !!tt.pierce, bossBonus: tt.bossBonus || 0, srcT: t,
    arc: (tt.proj.arc || 18), flight: 0,
    T: Math.max(0.12, Math.hypot(target.x - t.cx, target.y - (t.cy - 8)) / tt.proj.speed),
    target, lx: target.x, ly: target.y,
  });
  t.flashT = 0.1;
  snd.shoot();
}

function fireChain(t, tt, lv, target) {                 // WLAN-Störer: Kettenblitz
  let cur = target, dmg = lv.dmg;
  const hit = new Set([cur]);
  S.beams.push({ x1: t.cx, y1: t.cy - 14, x2: cur.x, y2: cur.y, t: 0.18, life: 0.18 });
  applyDamage(cur, dmg, { pierce: false, bossBonus: 0, srcT: t });
  const cr2 = tt.chainRange * tt.chainRange;
  for (let j = 1; j < lv.chains; j++) {
    let nxt = null, bd = Infinity;
    for (const e of S.enemies) {
      if (hit.has(e) || e.hp <= 0 || e.x < -2) continue;
      const d = dist2(cur.x, cur.y, e.x, e.y);
      if (d <= cr2 && d < bd) { bd = d; nxt = e; }
    }
    if (!nxt) break;
    dmg *= tt.chainFalloff;
    hit.add(nxt);
    S.beams.push({ x1: cur.x, y1: cur.y, x2: nxt.x, y2: nxt.y, t: 0.18, life: 0.18 });
    applyDamage(nxt, dmg, { pierce: false, bossBonus: 0, srcT: t });
    cur = nxt;
  }
  t.flashT = 0.1;
  snd.zap();
}

function updateProjectiles(dt) {
  for (let k = S.projectiles.length - 1; k >= 0; k--) {
    const p = S.projectiles[k];
    p.flight += dt;
    const alive = p.target && p.target.hp > 0;
    if (alive) { p.lx = p.target.x; p.ly = p.target.y; }
    const dx = p.lx - p.x, dy = p.ly - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + (alive ? p.target.size * 0.45 : 2)) {
      impact(p, alive);
      S.projectiles.splice(k, 1);
    } else {
      p.x += dx / d * step; p.y += dy / d * step;
    }
  }
}

function impact(p, targetAlive) {
  snd.hit();
  burst(p.lx, p.ly, 3, '#999077', 60);
  if (p.splash > 0) {
    const r2 = p.splash * p.splash;
    for (let i = S.enemies.length - 1; i >= 0; i--) {
      const e = S.enemies[i];
      if (dist2(p.lx, p.ly, e.x, e.y) <= r2) {
        applyDamage(e, p.dmg, p);
        if (p.slow) applySlow(e, p.slow, p.slowDur);
      }
    }
  } else if (targetAlive) {
    applyDamage(p.target, p.dmg, p);
    if (p.slow) applySlow(p.target, p.slow, p.slowDur);
  }
}

/* ---------- Aktive Fähigkeiten ---------- */
function castAbility(id) {
  if (!S.running || S.paused) return;
  const a = ABILITIES[id];
  if (!a || S.time < S.abilReady[id]) { snd.error(); return; }
  S.abilReady[id] = S.time + a.cd;
  snd.ability();
  if (id === 'hitzefrei') {
    S.freezeUntil = S.time + a.dur;
    showToast(`${a.emoji} <b>${a.name}</b><div class="toast-sub">Alle Gegner ${a.dur}s eingefroren!</div>`, 2200);
  } else if (id === 'energy') {
    S.frenzyUntil = S.time + a.dur;
    showToast(`${a.emoji} <b>${a.name}</b><div class="toast-sub">+50% Angriffstempo für ${a.dur}s!</div>`, 2200);
  } else if (id === 'brot') {
    S.lives = Math.min(CONFIG.LIVES, S.lives + a.heal);
    addFloat(cellCx(S.coreIdx), cellCy(S.coreIdx) - 28, `+${a.heal} 🎓`, '#2a9d2a', 1.2, 15);
    showToast(`${a.emoji} <b>${a.name}</b><div class="toast-sub">+${a.heal} Zeugnis-Integrität</div>`, 2200);
    refreshHUD();
  }
  refreshAbilityBar();
}

/* ---------- Wellenfortschritt ---------- */
function updateWave(dt) {
  if (S.inWave) {
    S.spawnT += dt;
    while (S.spawnIdxPtr < S.spawnQueue.length && S.spawnQueue[S.spawnIdxPtr].t <= S.spawnT) {
      spawnEnemy(S.spawnQueue[S.spawnIdxPtr].type, S.wave);
      S.spawnIdxPtr++;
    }
    if (S.spawnIdxPtr >= S.spawnQueue.length && S.enemies.length === 0) waveCleared();
  } else if (S.betweenT !== null) {
    S.betweenT -= dt;
    if (S.betweenT <= 0) startWave();
  }
}

function waveCleared() {
  S.inWave = false;
  let bonus = waveBonus(S.wave);
  S.gold += bonus; S.stats.earned += bonus;
  // Nebenjob-Einkommen
  let income = 0;
  for (const t of S.towers) {
    const lv = towerLv(t);
    if (lv.income) {
      income += lv.income;
      addFloat(t.cx, t.cy - 22, '+' + lv.income + ' 💪', '#caa030', 1.1, 12);
    }
  }
  if (income) { S.gold += income; S.stats.earned += income; }
  snd.coin();
  checkGoldAchievements();
  if (S.wave >= 13 && S.stats.leaks === 0) unlock('streber');
  if (S.wave >= 8 && S.stats.built > 0 && onlyKarteikartenBuilt()) unlock('lowbudget');
  if (S.wave === CONFIG.TOTAL_WAVES && !S.endless) { gameOver(true, null); return; }
  showToast(`<b>Welle ${S.wave} geschafft!</b><div class="toast-sub">+${bonus} 💪 Wellenbonus${income ? ` · +${income} 💪 Nebenjob` : ''}</div>`, 2600);
  S.betweenT = CONFIG.WAVE_PAUSE;
  recordBest(false, null);
  saveGame();
  refreshHUD(); refreshWavePreview();
}

/* ---------- Bauen / Upgrade / Verkauf / Gruppen ---------- */
function enemyCells() {
  const cells = [];
  for (const e of S.enemies) if (!e.entering) cells.push(e.cell);
  return cells;
}

function placeTower(typeId, cx, cy) {
  const tt = TOWER_TYPES[typeId];
  const cost = tt.levels[0].cost;
  if (S.gold < cost) { snd.error(); showToast('Nicht genug 💪 Motivation!', 1400); return false; }
  const i = cellIdx(cx, cy, COLS);
  if (S.obstacles.has(i)) { snd.error(); showToast('Da steht eine Tischgruppe im Weg!', 1500); return false; }
  const res = tryPlace(S.blocked, COLS, ROWS, S.map.spawns, S.map.core, cx, cy, enemyCells());
  if (!res.ok) { snd.error(); showToast(res.reason, 1700); return false; }
  S.blocked[i] = 1;
  const t = { typeId, lvl: 0, x: cx, y: cy, cx: cx * CELL + CELL / 2, cy: cy * CELL + CELL / 2,
              cdT: 0, auraT: 0, buffVal: 0, buffUntil: 0, flashT: 0, invested: cost,
              prio: 'first', dealt: 0 };
  S.towers.push(t); S.towerAt.set(i, t);
  S.gold -= cost; S.stats.built++;
  S.stats.builtTypes[typeId] = (S.stats.builtTypes[typeId] || 0) + 1;
  recomputeFlow(res.dist);
  snd.build();
  saveGame();
  refreshHUD();
  return true;
}

function upgradeTower(t) {
  const tt = TOWER_TYPES[t.typeId];
  if (t.lvl >= tt.levels.length - 1) return;
  const cost = tt.levels[t.lvl + 1].cost;
  if (S.gold < cost) { snd.error(); showToast('Nicht genug 💪 für das Upgrade!', 1400); return; }
  S.gold -= cost; t.lvl++; t.invested += cost;
  if (t.lvl >= 2) unlock('vollausbau');
  snd.upgrade();
  burst(t.cx, t.cy, 10, '#f0c850', 90);
  saveGame();
  refreshHUD(); refreshInfoPanel();
}

function sellTower(t, opts) {
  const o = opts || {};
  const refund = Math.round(t.invested * CONFIG.SELL_FACTOR);
  S.gold += refund;
  const i = cellIdx(t.x, t.y, COLS);
  S.blocked[i] = 0; S.towerAt.delete(i);
  S.towers.splice(S.towers.indexOf(t), 1);
  if (S.selTower === t) S.selTower = null;
  if (S.selSet) S.selSet.delete(t);
  if (!o.skipRecompute) recomputeFlow();
  if (!o.silent) {
    snd.sell();
    addFloat(t.cx, t.cy - 10, '+' + refund + ' 💪', '#caa030', 0.9, 12);
    saveGame();
    refreshHUD(); refreshInfoPanel();
  }
  return refund;
}

function upgradeGroup() {
  if (!S.selSet) { if (S.selTower) upgradeTower(S.selTower); return; }
  let count = 0, spent = 0;
  for (;;) {
    let best = null, bestCost = Infinity;
    for (const t of S.selSet) {
      const tt = TOWER_TYPES[t.typeId];
      if (t.lvl >= tt.levels.length - 1) continue;
      const c = tt.levels[t.lvl + 1].cost;
      if (c < bestCost) { bestCost = c; best = t; }
    }
    if (!best || S.gold < bestCost) break;
    S.gold -= bestCost; best.lvl++; best.invested += bestCost;
    if (best.lvl >= 2) unlock('vollausbau');
    burst(best.cx, best.cy, 8, '#f0c850', 90);
    count++; spent += bestCost;
  }
  if (count) { snd.upgrade(); showToast(`${count} Upgrade${count > 1 ? 's' : ''} gekauft (−${spent} 💪)`, 1700); saveGame(); }
  else { snd.error(); showToast('Kein Upgrade möglich – zu wenig 💪 oder alles auf Max!', 1700); }
  refreshHUD(); refreshInfoPanel();
}

function sellGroup() {
  if (!S.selSet) { if (S.selTower) sellTower(S.selTower); return; }
  const list = [...S.selSet];
  let sum = 0;
  for (const t of list) sum += sellTower(t, { silent: true, skipRecompute: true });
  recomputeFlow();
  S.selSet = null; S.selTower = null;
  snd.sell();
  showToast(`${list.length} Tower verkauft: +${sum} 💪`, 1800);
  saveGame();
  refreshHUD(); refreshInfoPanel();
}

function cyclePrio() {
  const list = S.selSet ? [...S.selSet] : (S.selTower ? [S.selTower] : []);
  if (!list.length) return;
  const cur = PRIO_ORDER.indexOf(list[0].prio);
  const nxt = PRIO_ORDER[(cur + 1) % PRIO_ORDER.length];
  for (const t of list) t.prio = nxt;
  saveGame();
  refreshInfoPanel();
}

/* ---------- Spielende ---------- */
function gameOver(victory, killer) {
  S.running = false;
  const grade = victory ? 1 + 3 * (CONFIG.LIVES - S.lives) / (CONFIG.LIVES - 1) : null;
  recordBest(victory, grade);
  clearSave();
  const ep = ui.endscreen.querySelector('.end-panel');
  ep.classList.toggle('victory', victory);
  ep.classList.toggle('defeat', !victory);
  const wavesDone = victory ? S.wave : Math.max(0, S.wave - 1);
  // Top-3 Schadens-Tower
  const top = [...S.towers].sort((a, b) => b.dealt - a.dealt).slice(0, 3)
    .filter(t => t.dealt > 0)
    .map((t, i) => `<div>${['🥇', '🥈', '🥉'][i]} ${towerEmoji(t)} ${towerName(t)}: <b>${fmt(t.dealt)}</b> Schaden</div>`).join('');
  ui.endStats.innerHTML =
    `<div>📅 Wellen überstanden: <b>${wavesDone}</b></div>` +
    `<div>⚔️ Besiegte Herausforderungen: <b>${fmt(S.stats.kills)}</b></div>` +
    `<div>💪 Verdiente Motivation: <b>${fmt(S.stats.earned)}</b></div>` +
    `<div>🏗️ Gebaute Tower: <b>${fmt(S.stats.built)}</b></div>` +
    `<div>🎓 Zeugnis-Integrität: <b>${S.lives}/${CONFIG.LIVES}</b></div>` +
    (top ? `<div style="margin-top:6px">${top}</div>` : '');
  if (victory) {
    if (S.lives >= CONFIG.LIVES) unlock('einser');
    ui.endTitle.textContent = '🎉 ABSCHLUSS GESCHAFFT!';
    ui.endText.innerHTML = `Dein Zeugnis hat alle 13 Schuljahre überstanden!<br>Abschlussnote: <b>${grade.toFixed(1).replace('.', ',')}</b>`;
    snd.victory();
    addContinueButton();
  } else {
    const bc = $('btnContinue'); if (bc) bc.hidden = true;
    ui.endTitle.textContent = '💀 SITZENGEBLIEBEN!';
    ui.endText.innerHTML = killer
      ? `Dein Zeugnis wurde von <b>${killer.emoji} ${killer.name}</b> vernichtet.`
      : 'Dein Zeugnis wurde vernichtet.';
    snd.defeat();
  }
  ui.endscreen.hidden = false;
}

function addContinueButton() {
  let b = $('btnContinue');
  if (!b) {
    b = document.createElement('button');
    b.id = 'btnContinue'; b.className = 'btn btn-gold'; b.style.marginRight = '10px';
    b.textContent = '🎓 Weiter studieren (Endlosmodus)';
    b.addEventListener('click', () => {
      S.endless = true; S.running = true;
      ui.endscreen.hidden = true;
      S.betweenT = CONFIG.WAVE_PAUSE;
      showToast('<b>Endlosmodus: Das Studium beginnt!</b><div class="toast-sub">Achtung: Jetzt tauchen Elite-Gegner auf!</div>', 3400);
      saveGame();
      refreshHUD(); refreshWavePreview();
    });
    ui.btnRestart.parentNode.insertBefore(b, ui.btnRestart);
  }
  b.hidden = false;
}

/* ---------- Schwebetexte & Partikel ---------- */
function addFloat(x, y, txt, color, life = 0.9, size = 13) {
  S.floats.push({ x, y, txt, color, t: life, life, size });
}
function burst(x, y, n, color, sp = 120) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random() * 0.8);
    S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.45 + Math.random() * 0.25, color, size: 2 + Math.random() * 2.5 });
  }
}
function updateFx(dt) {
  for (let i = S.floats.length - 1; i >= 0; i--) { const f = S.floats[i]; f.t -= dt; f.y -= 28 * dt; if (f.t <= 0) S.floats.splice(i, 1); }
  for (let i = S.particles.length - 1; i >= 0; i--) {
    const p = S.particles[i];
    p.t -= dt;
    if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.vy += 260 * dt; }
    if (p.t <= 0) S.particles.splice(i, 1);
  }
  for (let i = S.beams.length - 1; i >= 0; i--) { S.beams[i].t -= dt; if (S.beams[i].t <= 0) S.beams.splice(i, 1); }
}

/* ---------- Haupt-Update ---------- */
function update(dt) {
  S.time += dt;
  if (S.shakeT > 0) S.shakeT -= dt;
  updateWave(dt);
  updateEnemies(dt);
  updateTowers(dt);
  updateProjectiles(dt);
  updateFx(dt);
}

/* ============================================================
   Teil 3: Rendering, HUD, Panels, Eingabe, Game-Loop
   ============================================================ */

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(html, ms = 2500, boss = false) {
  ui.toast.innerHTML = html;
  ui.toast.hidden = false;
  ui.toast.classList.toggle('boss', !!boss);
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), ms);
}

/* ---------- Rendering ---------- */
const TIER_COLORS = [
  ['#cdb58c', '#a98c5e', '#8a6d3f'],
  ['#c6c8cc', '#9a9da4', '#6e7077'],
  ['#ecd47e', '#c8a040', '#9a7a28'],
];
const ROUTE_COLORS = ['rgba(70,110,200,0.50)', 'rgba(150,80,200,0.50)'];

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function drawRange(cx, cy, r, isAura) {
  if (!r) return;
  ctx.fillStyle = isAura ? 'rgba(80,180,240,0.10)' : 'rgba(240,200,80,0.10)';
  ctx.strokeStyle = isAura ? 'rgba(80,180,240,0.65)' : 'rgba(200,160,50,0.65)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
}

function drawRoute(route, color) {
  if (!route || route.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 6]);
  ctx.lineDashOffset = -((S.time * 26) % 13);
  ctx.beginPath();
  ctx.moveTo(-4, route[0].y * CELL + CELL / 2);
  for (const c of route) ctx.lineTo(c.x * CELL + CELL / 2, c.y * CELL + CELL / 2);
  ctx.stroke();
  ctx.restore();
}

function drawSpawn3D(gIdx) {
  const sx = cellCx(gIdx), sy = cellCy(gIdx);
  ctx.fillStyle = 'rgba(40,25,5,0.30)';
  ctx.beginPath(); ctx.ellipse(sx + 3, sy + 15, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
  const grd = ctx.createLinearGradient(sx - 16, sy, sx + 16, sy);
  grd.addColorStop(0, '#8a5a30'); grd.addColorStop(0.5, '#a87040'); grd.addColorStop(1, '#6b4424');
  ctx.fillStyle = grd;
  roundRect(sx - 16, sy - 24, 32, 40, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,8,0.6)'; ctx.lineWidth = 1.2;
  roundRect(sx - 16, sy - 24, 32, 40, 8); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,0.30)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx - 13, sy + 12); ctx.lineTo(sx - 13, sy - 21); ctx.lineTo(sx + 13, sy - 21); ctx.stroke();
  drawEmoji('🚪', sx, sy - 2, 24);
}

function drawCore3D() {
  const cx0 = cellCx(S.coreIdx), cy0 = cellCy(S.coreIdx);
  const pulse = 1 + Math.sin(S.time * 3) * 0.12;
  ctx.fillStyle = 'rgba(40,25,5,0.30)';
  ctx.beginPath(); ctx.ellipse(cx0 + 3, cy0 + 14, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
  const ped = [['#9a7a28', 16, 13], ['#c8a040', 14, 9], ['#ecd47e', 12, 5]];
  for (const [c, rx, dy] of ped) {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(cx0, cy0 + dy, rx, rx * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,10,0.35)'; ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(cx0, cy0 - 8, 2, cx0, cy0 - 8, 26 * pulse);
  g.addColorStop(0, 'rgba(240,200,80,0.85)');
  g.addColorStop(1, 'rgba(240,200,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx0, cy0 - 8, 26 * pulse, 0, Math.PI * 2); ctx.fill();
  const fl = Math.sin(S.time * 2) * 3;
  drawEmoji('🎓', cx0, cy0 - 12 + fl, 27);
}

function drawTowerBlock(t) {
  const px = t.x * CELL, py = t.y * CELL;
  const cols = TIER_COLORS[t.lvl];
  const H = 10 + t.lvl * 4;
  const inset = 4;
  const x0 = px + inset, y0 = py + inset, w = CELL - inset * 2, h = CELL - inset * 2;
  ctx.fillStyle = 'rgba(40,25,5,0.32)';
  roundRect(x0 + 4, y0 + 5, w, h, 7); ctx.fill();
  const side = ctx.createLinearGradient(0, y0 - H, 0, y0 + h);
  side.addColorStop(0, cols[1]); side.addColorStop(1, shade(cols[2], -22));
  ctx.fillStyle = side;
  roundRect(x0, y0 - H, w, h + H, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,8,0.55)'; ctx.lineWidth = 1;
  roundRect(x0, y0 - H, w, h + H, 7); ctx.stroke();
  const top = ctx.createLinearGradient(x0, y0 - H, x0 + w, y0 - H + h);
  top.addColorStop(0, shade(cols[0], 16)); top.addColorStop(1, cols[1]);
  ctx.fillStyle = top;
  roundRect(x0, y0 - H, w, h, 6); ctx.fill();
  ctx.strokeStyle = isSel(t) ? '#f0c850' : shade(cols[2], 10);
  ctx.lineWidth = isSel(t) ? 2.5 : 1.2;
  roundRect(x0, y0 - H, w, h, 6); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,250,220,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + 3, y0 - H + h - 3); ctx.lineTo(x0 + 3, y0 - H + 3); ctx.lineTo(x0 + w - 3, y0 - H + 3);
  ctx.stroke();
  drawEmoji(towerEmoji(t), t.cx, t.cy - H, 21);
  for (let i = 0; i < t.lvl; i++) {
    ctx.fillStyle = '#f0c850'; ctx.strokeStyle = '#6b5320'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x0 + 6 + i * 7, y0 - H + 6, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (t.buffVal > 0) drawEmoji('⚡', x0 + w - 6, y0 - H + 7, 10);
  if (t.flashT > 0) {
    ctx.fillStyle = `rgba(255,240,180,${Math.min(0.7, t.flashT * 6)})`;
    ctx.beginPath(); ctx.arc(t.cx, t.cy - H - 8, 7, 0, Math.PI * 2); ctx.fill();
  }
}

function drawEnemy3D(e) {
  const frozen = S.freezeUntil > S.time && !e.boss;
  const hop = frozen ? 0 : Math.abs(Math.sin(e.wobble)) * 3.2;
  const bobY = -hop;
  const sh = 1 - hop * 0.04;
  if (e.boss) {
    const pul = 0.65 + Math.sin(S.time * 5) * 0.15;
    ctx.fillStyle = `rgba(200,56,40,${0.14 * pul + 0.08})`;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.size * 0.42, e.size * 0.8 * pul + 7, e.size * 0.34 * pul + 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (e.elite) {                                       // Elite-Glühring
    const ring = ELITES[e.elite].ring;
    const pul = 0.7 + Math.sin(S.time * 4 + e.wobble) * 0.2;
    ctx.strokeStyle = `rgba(${ring},${0.5 * pul + 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.size * 0.42, e.size * 0.62, e.size * 0.27, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,25,5,0.30)';
  ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + e.size * 0.45, e.size * 0.44 * sh, e.size * 0.19 * sh, 0, 0, Math.PI * 2); ctx.fill();
  if (frozen) {
    ctx.fillStyle = 'rgba(120,180,255,0.45)';
    ctx.beginPath(); ctx.arc(e.x, e.y + bobY, e.size * 0.66, 0, Math.PI * 2); ctx.fill();
  } else if (slowFactor(e) < 1) {
    ctx.fillStyle = 'rgba(70,130,230,0.30)';
    ctx.beginPath(); ctx.arc(e.x, e.y + bobY, e.size * 0.62, 0, Math.PI * 2); ctx.fill();
    drawEmoji('💤', e.x + e.size * 0.5, e.y + bobY - e.size * 0.55, 10);
  }
  drawEmoji(e.emoji, e.x, e.y + bobY, e.size);
  if (frozen) drawEmoji('❄️', e.x + e.size * 0.45, e.y + bobY - e.size * 0.5, 12);
  if (e.boss) drawEmoji('👑', e.x, e.y + bobY - e.size * 0.72, 13);
  if (e.elite) drawEmoji(ELITES[e.elite].emoji, e.x - e.size * 0.5, e.y + bobY - e.size * 0.6, 12);
  const w = e.boss ? 34 : 24, h = 4;
  const pct = Math.max(0, e.hp / e.maxHp);
  const bx = e.x - w / 2, by = e.y + bobY - e.size * 0.62 - 8;
  ctx.fillStyle = 'rgba(20,10,5,0.78)'; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
  ctx.fillStyle = pct > 0.5 ? '#46b830' : pct > 0.25 ? '#d8a020' : '#c83020';
  ctx.fillRect(bx, by, w * pct, h);
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.fillRect(bx, by, w * pct, 1.4);
}

function drawProjectiles() {
  for (const p of S.projectiles) {
    const f = Math.min(1, p.flight / p.T);
    const z = 4 * p.arc * f * (1 - f);
    ctx.fillStyle = 'rgba(40,25,5,0.22)';
    ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 3, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    drawEmoji(p.emoji, p.x, p.y - z, p.size);
  }
}

function drawBeams() {                                  // Kettenblitze
  for (const b of S.beams) {
    const a = Math.max(0, b.t / b.life);
    ctx.strokeStyle = `rgba(90,200,255,${0.85 * a})`;
    ctx.lineWidth = 2.5 * a + 0.5;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    const segs = 4;
    for (let i = 1; i <= segs; i++) {
      const f = i / segs;
      const mx = b.x1 + (b.x2 - b.x1) * f + (i < segs ? (Math.random() * 10 - 5) : 0);
      const my = b.y1 + (b.y2 - b.y1) * f + (i < segs ? (Math.random() * 10 - 5) : 0);
      ctx.lineTo(mx, my);
    }
    ctx.stroke();
  }
}

function drawFx() {
  for (const p of S.particles) {
    if (p.ring) {
      const f = 1 - p.t / p.life;
      ctx.strokeStyle = `rgba(${p.color},${0.55 * (1 - f)})`;
      ctx.lineWidth = 2.5 * (1 - f) + 0.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r0 + f * 26, (p.r0 + f * 26) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    ctx.globalAlpha = Math.max(0, Math.min(1, p.t / 0.45));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (const f of S.floats) {
    ctx.globalAlpha = Math.max(0, f.t / f.life);
    ctx.font = `bold ${f.size}px 'Trebuchet MS', sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(250,245,230,0.85)';
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function updateGhost() {
  S.ghostRoutes = null;
  if (!S.buildSel || S.hoverCell < 0) { S.hoverValid = false; return; }
  const cx = S.hoverCell % COLS, cy = (S.hoverCell / COLS) | 0;
  if (S.obstacles.has(S.hoverCell)) { S.hoverValid = false; S.hoverReason = 'Tischgruppe!'; return; }
  const res = tryPlace(S.blocked, COLS, ROWS, S.map.spawns, S.map.core, cx, cy, enemyCells());
  S.hoverValid = res.ok;
  S.hoverReason = res.reason || '';
  if (res.ok) {
    const fl = computeFlow(res.dist, COLS, ROWS);
    S.ghostRoutes = S.map.spawns.map(sp => traceRoute(fl, res.dist, COLS, sp, S.map.core));
  }
}

function drawGhost() {
  if (!S.buildSel || S.hoverCell < 0) return;
  const cx = S.hoverCell % COLS, cy = (S.hoverCell / COLS) | 0;
  const px = cx * CELL, py = cy * CELL;
  const tt = TOWER_TYPES[S.buildSel];
  const lv = tt.levels[0];
  const ok = S.hoverValid && S.gold >= lv.cost;
  drawRange(px + CELL / 2, py + CELL / 2, lv.range, isSupport(lv));
  ctx.fillStyle = ok ? 'rgba(70,200,80,0.30)' : 'rgba(220,50,40,0.35)';
  ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
  ctx.globalAlpha = 0.55;
  const inset = 4, H = 10;
  const x0 = px + inset, y0 = py + inset, w = CELL - inset * 2, h = CELL - inset * 2;
  ctx.fillStyle = ok ? '#a98c5e' : '#b07060';
  roundRect(x0, y0 - H, w, h + H, 7); ctx.fill();
  ctx.fillStyle = ok ? '#e2d0a8' : '#d9a090';
  roundRect(x0, y0 - H, w, h, 6); ctx.fill();
  drawEmoji(tt.emoji, px + CELL / 2, py + CELL / 2 - H, 21);
  ctx.globalAlpha = 1;
}

const sceneList = [];
function draw() {
  ctx.save();
  ctx.fillStyle = '#f6f1e2';                 // Hintergrund inkl. oberem Randstreifen (Heft-Oberrand)
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (S.shakeT > 0) {
    const m = S.shakeT * 14;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  ctx.translate(0, PADY);                     // Spielfeld nach unten schieben -> oben Platz fuer Tuerme/Gegner
  ctx.drawImage(terrain, 0, 0);
  if (S.running || S.wave > 0) {
    S.routes.forEach((r, i) => drawRoute(r, ROUTE_COLORS[i % ROUTE_COLORS.length]));
    if (S.ghostRoutes) S.ghostRoutes.forEach(r => drawRoute(r, 'rgba(200,140,40,0.60)'));
    const showR = S.selTower || (S.hoverCell >= 0 && !S.buildSel ? S.towerAt.get(S.hoverCell) : null);
    if (showR) {
      const lv = towerLv(showR);
      drawRange(showR.cx, showR.cy, lv.range, isSupport(lv));
    }
    sceneList.length = 0;
    for (const gIdx of S.spawnIdxs) sceneList.push({ y: cellCy(gIdx), kind: 0, gIdx });
    sceneList.push({ y: cellCy(S.coreIdx), kind: 1 });
    for (const t of S.towers) sceneList.push({ y: t.cy, kind: 2, t });
    for (const e of S.enemies) sceneList.push({ y: e.y, kind: 3, e });
    sceneList.sort((a, b) => a.y - b.y);
    for (const it of sceneList) {
      if (it.kind === 2) drawTowerBlock(it.t);
      else if (it.kind === 3) drawEnemy3D(it.e);
      else if (it.kind === 0) drawSpawn3D(it.gIdx);
      else drawCore3D();
    }
    drawProjectiles();
    drawBeams();
    drawFx();
    drawGhost();
    if (S.freezeUntil > S.time) {                       // Hitzefrei-Overlay
      ctx.fillStyle = 'rgba(120,180,255,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  ctx.restore();
}

/* ---------- HUD & Panels ---------- */
const hudCache = { gold: null, lives: null, btn: '', abil: '' };

function frameHUD() {
  if (hudCache.gold !== S.gold) {
    hudCache.gold = S.gold;
    ui.gold.textContent = fmt(S.gold);
    refreshBuildAfford(); refreshActionBtns();
  }
  if (hudCache.lives !== S.lives) { hudCache.lives = S.lives; ui.lives.textContent = S.lives; }
  let label, dis = false;
  if (!S.running) { label = '…'; dis = true; }
  else if (S.inWave) { label = '⚔️ Welle läuft …'; dis = true; }
  else if (S.betweenT === null) label = '▶ 1. Welle starten';
  else label = `▶ Nächste Welle (${Math.ceil(S.betweenT)}s) +Bonus`;
  if (hudCache.btn !== label) { hudCache.btn = label; ui.btnWave.textContent = label; ui.btnWave.disabled = dis; }
  // Fähigkeiten-Cooldowns
  const abilKey = ABILITY_ORDER.map(id => {
    const rem = Math.max(0, S.abilReady[id] - S.time);
    const active = (id === 'hitzefrei' && S.freezeUntil > S.time) || (id === 'energy' && S.frenzyUntil > S.time);
    return Math.ceil(rem) + (active ? 'a' : '');
  }).join('_');
  if (hudCache.abil !== abilKey) { hudCache.abil = abilKey; refreshAbilityBar(); }
}

function refreshHUD() {
  hudCache.gold = S.gold; hudCache.lives = S.lives;
  ui.gold.textContent = fmt(S.gold);
  ui.lives.textContent = S.lives;
  const totalStr = (S.endless || S.wave > CONFIG.TOTAL_WAVES) ? '∞' : CONFIG.TOTAL_WAVES;
  ui.waveNum.textContent = `${S.wave}/${totalStr}`;
  if (S.inWave) ui.waveName.textContent = `${waveLabel(S.wave)} – ${getWave(S.wave).title}`;
  else if (S.wave === 0) ui.waveName.textContent = 'Sommerferien – baue deine Verteidigung!';
  else if (S.wave === CONFIG.TOTAL_WAVES && !S.endless) ui.waveName.textContent = 'Abschluss erreicht!';
  else ui.waveName.textContent = `Pause – gleich: ${getWave(S.wave + 1).title}`;
  refreshBuildAfford(); refreshActionBtns();
}

function refreshBuildAfford() {
  for (const id of TOWER_ORDER)
    buildBtnEls[id].disabled = S.gold < TOWER_TYPES[id].levels[0].cost;
}

function refreshActionBtns() {
  const bu = $('btnUp');
  if (bu && S.selTower && !S.selSet) {
    const tt = TOWER_TYPES[S.selTower.typeId];
    if (S.selTower.lvl < tt.levels.length - 1)
      bu.disabled = S.gold < tt.levels[S.selTower.lvl + 1].cost;
  }
  const ba = $('btnUpAll');
  if (ba && S.selSet) {
    let cheapest = Infinity;
    for (const t of S.selSet) {
      const tt = TOWER_TYPES[t.typeId];
      if (t.lvl < tt.levels.length - 1) cheapest = Math.min(cheapest, tt.levels[t.lvl + 1].cost);
    }
    ba.disabled = S.gold < cheapest;
  }
}

const row = (l, v, n) =>
  `<tr><td>${l}</td><td>${v}${(n !== undefined && n !== null && n !== false) ? ` <span class="upArrow">→ ${n}</span>` : ''}</td></tr>`;

function dmgRank(t) {
  return 1 + S.towers.filter(o => o.dealt > t.dealt).length;
}

function statRows(lv, nxt) {
  let h = '';
  if (lv.buff !== undefined) h += row('Aura-Angriffstempo', `+${Math.round(lv.buff * 100)}%`, nxt && `+${Math.round(nxt.buff * 100)}%`);
  else if (lv.shred !== undefined) h += row('Panzerung senken', `−${Math.round(lv.shred * 100)}%`, nxt && `−${Math.round(nxt.shred * 100)}%`);
  else if (lv.income !== undefined) h += row('Einkommen/Welle', `💪 ${lv.income}`, nxt && `💪 ${nxt.income}`);
  else {
    h += row('Schaden', lv.dmg, nxt && nxt.dmg);
    h += row('Schussrate', (1 / lv.cd).toFixed(2) + '/s', nxt && (1 / nxt.cd).toFixed(2) + '/s');
    h += row('DPS', Math.round(lv.dmg / lv.cd), nxt && Math.round(nxt.dmg / nxt.cd));
  }
  if (lv.range) h += row('Reichweite', lv.range, nxt && nxt.range);
  if (lv.splash) h += row('Splash-Radius', lv.splash, nxt && nxt.splash);
  if (lv.slow) h += row('Verlangsamung', Math.round(lv.slow * 100) + '%', nxt && Math.round(nxt.slow * 100) + '%');
  if (lv.chains) h += row('Blitz-Sprünge', lv.chains, nxt && nxt.chains);
  return h;
}

function refreshInfoPanel() {
  if (S.selSet && S.selSet.size) {
    const list = [...S.selSet];
    const tt = TOWER_TYPES[list[0].typeId];
    const counts = [0, 0, 0];
    let dps = 0, sellSum = 0, upCost = 0, upgradable = 0, dealt = 0;
    for (const t of list) {
      counts[t.lvl]++;
      const lv = tt.levels[t.lvl];
      if (!isSupport(lv)) dps += lv.dmg / lv.cd;
      dealt += t.dealt;
      sellSum += Math.round(t.invested * CONFIG.SELL_FACTOR);
      if (t.lvl < tt.levels.length - 1) { upCost += tt.levels[t.lvl + 1].cost; upgradable++; }
    }
    let h = `<div class="info-title">${tt.emoji} ${list.length}× ${tt.name}</div>`;
    h += '<div class="info-desc">Mehrfachauswahl – „Alle aufwerten" kauft vom günstigsten Upgrade aufwärts.</div><table class="info-stats">';
    h += row('Stufe 1 / 2 / 3', counts.join(' / '));
    if (dps > 0) h += row('Gesamt-DPS', Math.round(dps));
    if (dealt > 0) h += row('Verursachter Schaden', fmt(dealt));
    if (upgradable) h += row(`Offene Upgrades (${upgradable})`, '💪 ' + upCost);
    h += '</table><div class="info-actions">';
    h += upgradable
      ? '<button class="btn" id="btnUpAll">⬆ Alle aufwerten [U]</button>'
      : '<button class="btn" disabled>★ Alle auf Max</button>';
    h += `<button class="btn btn-sell" id="btnSellAll">Alle verkaufen 💪 ${sellSum} [V]</button></div>`;
    if (!isSupport(tt.levels[0]))
      h += `<div class="info-actions" style="margin-top:6px"><button class="btn" id="btnPrio">🎯 Ziel: ${PRIO_LABEL[list[0].prio]} [P]</button></div>`;
    ui.infoPanel.innerHTML = h;
    const ba = $('btnUpAll');
    if (ba) ba.addEventListener('click', upgradeGroup);
    $('btnSellAll').addEventListener('click', sellGroup);
    const bp = $('btnPrio');
    if (bp) bp.addEventListener('click', cyclePrio);
    refreshActionBtns();
  } else if (S.selTower) {
    const t = S.selTower, tt = TOWER_TYPES[t.typeId], lv = towerLv(t);
    const nxt = t.lvl < tt.levels.length - 1 ? tt.levels[t.lvl + 1] : null;
    let h = `<div class="info-title">${towerEmoji(t)} ${towerName(t)} <span style="color:#9a865e">(Stufe ${t.lvl + 1}/3)</span></div>`;
    h += `<div class="info-desc">${tt.desc}</div><table class="info-stats">`;
    h += statRows(lv, nxt);
    if (t.dealt > 0) h += row('Verursachter Schaden', `${fmt(t.dealt)} <span style="color:#9a865e">(#${dmgRank(t)})</span>`);
    h += '</table><div class="info-actions">';
    h += nxt
      ? `<button class="btn" id="btnUp">⬆ ${nxt.name || 'Upgrade'} (💪 ${nxt.cost}) [U]</button>`
      : '<button class="btn" disabled>★ Maximale Stufe</button>';
    h += `<button class="btn btn-sell" id="btnSell">Verkaufen 💪 ${Math.round(t.invested * CONFIG.SELL_FACTOR)} [V]</button></div>`;
    if (!isSupport(tt.levels[0]))
      h += `<div class="info-actions" style="margin-top:6px"><button class="btn" id="btnPrio">🎯 Ziel: ${PRIO_LABEL[t.prio]} [P]</button></div>`;
    ui.infoPanel.innerHTML = h;
    const bu = $('btnUp');
    if (bu) bu.addEventListener('click', () => upgradeTower(t));
    $('btnSell').addEventListener('click', () => sellTower(t));
    const bp = $('btnPrio');
    if (bp) bp.addEventListener('click', cyclePrio);
    refreshActionBtns();
  } else if (S.buildSel) {
    const tt = TOWER_TYPES[S.buildSel], lv = tt.levels[0];
    let h = `<div class="info-title">${tt.emoji} ${tt.name}</div><div class="info-desc">${tt.desc}</div><table class="info-stats">`;
    h += row('Kosten', '💪 ' + lv.cost);
    h += statRows(lv, null);
    h += '</table><div class="info-desc">Klicke auf den Schulhof zum Bauen.<br>Rechtsklick/Esc: abbrechen.</div>';
    ui.infoPanel.innerHTML = h;
  } else {
    ui.infoPanel.innerHTML = '<div class="info-empty">Wähle einen Tower zum Bauen –<br>oder klicke einen gebauten Tower an.<br><br>Doppelklick: alle gleicher Art.</div>';
  }
}

function refreshWavePreview() {
  const w = S.inWave ? S.wave : S.wave + 1;
  if (!S.endless && w > CONFIG.TOTAL_WAVES && !S.inWave) {
    ui.wavePreview.innerHTML = '<h3>🎉 Alle Wellen geschafft!</h3>';
    return;
  }
  const wv = getWave(w);
  let h = `<h3>${S.inWave ? '⚔️ Aktuelle Welle' : '🔮 Nächste Welle'} ${w}: ${wv.title}</h3>`;
  for (const [tid, count] of wv.comp) {
    const et = ENEMY_TYPES[tid];
    const traits = [];
    if (et.fast) traits.push('schnell');
    if (et.armor) traits.push(`${Math.round(et.armor * 100)}% Panzer`);
    if (et.slowImmune) traits.push('slow-immun');
    if (et.split) traits.push('teilt sich');
    const hp = fmt(et.hp * hpMul(w) * S.difficulty.hpMul);
    h += `<div class="wp-row${et.boss ? ' wp-boss' : ''}"><span><span class="wp-em">${et.emoji}</span> ${count}× ${et.name}</span><span class="wp-traits">${hp} HP${traits.length ? ' · ' + traits.join(' · ') : ''}</span></div>`;
  }
  if (w > CONFIG.TOTAL_WAVES) h += '<div class="wp-row wp-traits">⚠️ Elite-Gegner möglich (♻️🛡️💨)</div>';
  ui.wavePreview.innerHTML = h;
}

/* ---------- Fähigkeiten-Leiste ---------- */
const abilBtnEls = {};
function buildAbilityBar() {
  ui.abilityBar.innerHTML = '';
  for (const id of ABILITY_ORDER) {
    const a = ABILITIES[id];
    const b = document.createElement('button');
    b.className = 'abil-btn';
    b.innerHTML = `<span class="a-emoji">${a.emoji}</span><span class="a-key">${a.key}</span><span class="a-cd" hidden></span>`;
    b.addEventListener('click', () => castAbility(id));
    b.addEventListener('mouseenter', (ev) => {
      ui.tooltip.innerHTML = `<b>${a.emoji} ${a.name}</b> [${a.key}]<br>${a.desc}<br>Abklingzeit: <b>${a.cd}s</b>`;
      ui.tooltip.hidden = false;
      moveTooltip(ev);
    });
    b.addEventListener('mousemove', moveTooltip);
    b.addEventListener('mouseleave', hideTooltip);
    ui.abilityBar.appendChild(b);
    abilBtnEls[id] = b;
  }
}
function refreshAbilityBar() {
  for (const id of ABILITY_ORDER) {
    const b = abilBtnEls[id];
    if (!b) continue;
    const rem = Math.max(0, S.abilReady[id] - S.time);
    const cd = b.querySelector('.a-cd');
    b.disabled = rem > 0;
    cd.hidden = rem <= 0;
    if (rem > 0) cd.textContent = Math.ceil(rem) + 's';
    const active = (id === 'hitzefrei' && S.freezeUntil > S.time) || (id === 'energy' && S.frenzyUntil > S.time);
    b.classList.toggle('active', active);
  }
}

/* ---------- Erfolge-Panel ---------- */
function openAchievements() {
  let h = '';
  for (const a of ACHIEVEMENTS) {
    const got = S.achUnlocked.has(a.id);
    h += `<div class="ach-row${got ? ' got' : ''}"><span class="ach-emoji">${got ? a.emoji : '🔒'}</span><span><b>${a.name}</b><br><span class="ach-desc">${a.desc}</span></span></div>`;
  }
  ui.achList.innerHTML = h || '<i>Keine Erfolge definiert.</i>';
  ui.achPanel.hidden = false;
  S.achWasPaused = S.paused;
  if (S.running && !S.paused) togglePause();
}

/* ---------- Bau-Buttons ---------- */
const buildBtnEls = {};
for (const id of TOWER_ORDER) {
  const tt = TOWER_TYPES[id];
  const b = document.createElement('button');
  b.className = 'build-btn';
  b.innerHTML = `<span class="b-key">${tt.hotkey}</span><span class="b-emoji">${tt.emoji}</span><span class="b-name">${tt.name}</span><span class="b-cost">💪 ${tt.levels[0].cost}</span>`;
  b.addEventListener('click', () => selectBuild(S.buildSel === id ? null : id));
  b.addEventListener('mouseenter', (ev) => showTowerTooltip(ev, id));
  b.addEventListener('mousemove', moveTooltip);
  b.addEventListener('mouseleave', hideTooltip);
  ui.buildButtons.appendChild(b);
  buildBtnEls[id] = b;
}

function selectBuild(id) {
  S.buildSel = id;
  if (id) { S.selTower = null; S.selSet = null; }
  for (const k in buildBtnEls) buildBtnEls[k].classList.toggle('selected', k === S.buildSel);
  refreshInfoPanel();
}

/* ---------- Tooltips ---------- */
function showTowerTooltip(ev, id) {
  const tt = TOWER_TYPES[id], lv = tt.levels[0];
  let s = `<b>${tt.emoji} ${tt.name}</b><br>${tt.desc}<br>`;
  if (lv.buff !== undefined) s += `Aura: <b>+${Math.round(lv.buff * 100)}% Angriffstempo</b> · Reichweite: <b>${lv.range}</b>`;
  else if (lv.shred !== undefined) s += `Aura: <b>−${Math.round(lv.shred * 100)}% Gegner-Panzerung</b> · Reichweite: <b>${lv.range}</b>`;
  else if (lv.income !== undefined) s += `Einkommen: <b>💪 ${lv.income} pro Welle</b>`;
  else s += `Schaden: <b>${lv.dmg}</b> · Tempo: <b>${(1 / lv.cd).toFixed(1)}/s</b> · DPS: <b>${Math.round(lv.dmg / lv.cd)}</b><br>Reichweite: <b>${lv.range}</b>`;
  if (lv.splash) s += `<br>Splash-Radius: <b>${lv.splash}</b>`;
  if (lv.slow) s += `<br>Verlangsamung: <b>${Math.round(lv.slow * 100)}%</b> für ${lv.slowDur}s`;
  if (lv.chains) s += `<br>Springt auf <b>${lv.chains} Gegner</b> über (−30% je Sprung)`;
  if (tt.pierce) s += `<br><b>Ignoriert Panzerung</b> · +${Math.round((tt.bossBonus - 1) * 100)}% gegen Bosse`;
  ui.tooltip.innerHTML = s;
  ui.tooltip.hidden = false;
  moveTooltip(ev);
}

function showEnemyTooltip(ev, e) {
  const traits = [];
  if (e.type.fast) traits.push('🏃 schnell');
  if (e.armor) traits.push(`🛡️ ${Math.round(e.armor * 100)}% Panzerung`);
  if (e.slowImmune) traits.push('🚫 slow-immun');
  if (e.split) traits.push('➗ teilt sich');
  if (e.boss) traits.push('👑 Boss');
  if (e.elite) traits.push(`${ELITES[e.elite].emoji} Elite: ${ELITES[e.elite].name}`);
  ui.tooltip.innerHTML = `<b>${e.emoji} ${e.name}</b><br>HP: <b>${fmt(e.hp)} / ${fmt(e.maxHp)}</b><br>Schaden am Zeugnis: <b>${e.dmg}</b>${traits.length ? '<br>' + traits.join(' · ') : ''}`;
  ui.tooltip.hidden = false;
  moveTooltip(ev);
}

function showPlacedTowerTooltip(ev, t) {
  const lv = towerLv(t);
  let s = `<b>${towerEmoji(t)} ${towerName(t)}</b> (Stufe ${t.lvl + 1})`;
  if (lv.buff !== undefined) s += `<br>Aura: <b>+${Math.round(lv.buff * 100)}%</b> Angriffstempo`;
  else if (lv.shred !== undefined) s += `<br>Aura: <b>−${Math.round(lv.shred * 100)}%</b> Gegner-Panzerung`;
  else if (lv.income !== undefined) s += `<br>Einkommen: <b>💪 ${lv.income}</b>/Welle`;
  else s += `<br>DPS: <b>${Math.round(lv.dmg / lv.cd)}</b> · Schaden gesamt: <b>${fmt(t.dealt)}</b>`;
  s += '<br><i>Klicken: auswählen · Doppelklick: alle dieser Art</i>';
  ui.tooltip.innerHTML = s;
  ui.tooltip.hidden = false;
  moveTooltip(ev);
}

function moveTooltip(ev) {
  if (ui.tooltip.hidden) return;
  let x = ev.clientX + 14, y = ev.clientY + 14;
  const r = ui.tooltip.getBoundingClientRect();
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 10;
  if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 10;
  ui.tooltip.style.left = x + 'px';
  ui.tooltip.style.top = y + 'px';
}
function hideTooltip() { ui.tooltip.hidden = true; }

/* ---------- Eingabe (Maus + Touch) ---------- */
function canvasPos(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * (canvas.width / r.width), y: (ev.clientY - r.top) * (canvas.height / r.height) - PADY };
}

canvas.addEventListener('mousemove', (ev) => {
  const p = canvasPos(ev);
  S.mouseX = p.x; S.mouseY = p.y;
  const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
  S.hoverCell = (cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS) ? cellIdx(cx, cy, COLS) : -1;
  if (!S.buildSel) {
    for (const e of S.enemies) {
      if (dist2(p.x, p.y, e.x, e.y) <= (e.size * 0.7) ** 2) { showEnemyTooltip(ev, e); return; }
    }
    const t = S.towerAt.get(S.hoverCell);
    if (t) { showPlacedTowerTooltip(ev, t); return; }
  }
  hideTooltip();
});
canvas.addEventListener('mouseleave', () => { S.hoverCell = -1; hideTooltip(); });

/* Klick + manuelle Doppelklick/Doppel-Tipp-Erkennung (Maus & Touch) */
let lastTapTime = 0, lastTapCell = -1;
canvas.addEventListener('click', (ev) => {
  if (!S.running) return;
  const p = canvasPos(ev);
  const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
  const idx = cellIdx(cx, cy, COLS);
  if (S.buildSel) { placeTower(S.buildSel, cx, cy); return; }   // Auswahl bleibt: Ketten-Bau
  const now = performance.now();
  const t = S.towerAt.get(idx);
  if (t && idx === lastTapCell && now - lastTapTime < 380) {    // Doppelklick/Doppel-Tipp
    S.selTower = t;
    S.selSet = new Set(S.towers.filter(o => o.typeId === t.typeId));
    snd.coin();
  } else {
    S.selTower = t || null;
    S.selSet = null;
  }
  lastTapTime = now; lastTapCell = idx;
  refreshInfoPanel();
});

canvas.addEventListener('contextmenu', (ev) => {
  ev.preventDefault();
  if (S.buildSel) selectBuild(null);
  else { S.selTower = null; S.selSet = null; refreshInfoPanel(); }
});

window.addEventListener('keydown', (ev) => {
  if (!ui.menu.hidden) return;
  const k = ev.key;
  if (k >= '0' && k <= '9') {
    const idx = k === '0' ? 9 : (+k - 1);
    const id = TOWER_ORDER[idx];
    if (id) selectBuild(S.buildSel === id ? null : id);
  }
  else if (k === 'Escape') { selectBuild(null); S.selTower = null; S.selSet = null; refreshInfoPanel(); }
  else if (k === ' ') { ev.preventDefault(); togglePause(); }
  else if (k === 'u' || k === 'U') { if (S.selSet) upgradeGroup(); else if (S.selTower) upgradeTower(S.selTower); }
  else if (k === 'v' || k === 'V') { if (S.selSet) sellGroup(); else if (S.selTower) sellTower(S.selTower); }
  else if (k === 'p' || k === 'P') { cyclePrio(); }
  else if (k === 'q' || k === 'Q') { castAbility('hitzefrei'); }
  else if (k === 'w' || k === 'W') { castAbility('energy'); }
  else if (k === 'e' || k === 'E') { castAbility('brot'); }
  else if (k === 'n' || k === 'N' || k === 'Enter') { if (!S.inWave && S.running) startWave(); }
});

/* ---------- Buttons ---------- */
function togglePause() {
  if (!S.running) return;
  S.paused = !S.paused;
  ui.btnPause.classList.toggle('active', S.paused);
  if (S.paused) showToast('⏸ PAUSE', 600000);
  else ui.toast.classList.remove('show');
}
ui.btnPause.addEventListener('click', togglePause);
ui.btnWave.addEventListener('click', startWave);
document.querySelectorAll('.speedBtn').forEach(b => {
  b.addEventListener('click', () => {
    S.speed = +b.dataset.speed;
    document.querySelectorAll('.speedBtn').forEach(x => x.classList.toggle('active', x === b));
  });
});
ui.btnSound.addEventListener('click', () => {
  S.soundOn = !S.soundOn;
  ui.btnSound.textContent = S.soundOn ? '🔊' : '🔇';
});
ui.btnMusic.addEventListener('click', () => {
  S.musicOn = !S.musicOn;
  ui.btnMusic.classList.toggle('active', S.musicOn);
  if (S.musicOn) startMusic();
});
ui.volSlider.addEventListener('input', () => setVolume(ui.volSlider.value / 100));
ui.btnAch.addEventListener('click', openAchievements);
ui.btnCloseAch.addEventListener('click', () => {
  ui.achPanel.hidden = true;
  if (!S.achWasPaused && S.paused) togglePause();
});
ui.btnHelp.addEventListener('click', () => {
  ui.helpPanel.hidden = false;
  S.helpWasPaused = S.paused;
  if (S.running && !S.paused) togglePause();
});
ui.btnCloseHelp.addEventListener('click', () => {
  ui.helpPanel.hidden = true;
  if (!S.helpWasPaused && S.paused) togglePause();
});
ui.btnRestart.addEventListener('click', () => { clearSave(); location.reload(); });

/* ---------- Game-Loop ---------- */
let lastT = performance.now();
function frame(now) {
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.05) dt = 0.05;
  if (S.running && !S.paused) {
    const dtEff = dt * S.speed;
    const n = Math.max(1, Math.ceil(dtEff / 0.02));
    const sub = dtEff / n;
    for (let i = 0; i < n; i++) { update(sub); if (!S.running) break; }
  }
  updateGhost();
  draw();
  frameHUD();
  requestAnimationFrame(frame);
}

/* ---------- Boot ---------- */
buildAbilityBar();
buildMenu();
renderTerrain(MAPS[S.mapSel]);
requestAnimationFrame(frame);

// state.js — Zentraler Gamestate mit localStorage-Persistenz.
// Ein einziger Key: algo_save_v1

const SAVE_KEY = 'algo_save_v1';
const BACKUP_KEY = 'algo_save_backup_v1';
const BACKUP_KEY_2 = 'algo_save_backup_v2'; // älterer, zweiter Slot (Rotation)
const BACKUP_MAX = 500000; // ~500 KB Soft-Limit für Backup-Slot (lange Spielstände möglich).
const SAVE_WARN_BYTES = 400000; // ab hier meldet lastSaveSize "groß" an die UI

const INITIAL_PROFILE = {
  interests: {
    gaming: 0, 'politik-links': 0, 'politik-rechts': 0, 'politik-mitte': 0,
    lifestyle: 0, wissenschaft: 0, verschwoerung: 0, humor: 0,
    hass: 0, feminismus: 0, 'anti-feminismus': 0, musik: 0,
    sport: 0, klima: 0, 'true-crime': 0
  },
  political_lean_estimated: 0,   // -1..+1
  outrage_tolerance: 0.2,         // 0..1
  followed: [],
  muted: [],
  weekly_screentime: 0,
  hiddenTopics: []
};

const INITIAL_WEIGHTS = {
  affinity: 1.0,
  engagement: 0.9,
  recency: 0.3,
  social: 0.6,
  ads: 0.4,
  diversity: 0.08,   // niedrig = Filterblase
  quality: 0.1,
  outragePenalty: 0.0,
  balance: 0.0
};

function freshSave() {
  const now = Date.now();
  return {
    meta: { version: 3, createdAt: now, lastSavedAt: now, day: 1, playtimeMs: 0 },
    character: { name: 'Alex', pronoun: 'sie/ihr', avatar: 0, interests_initial: [], city: 'Greifshafen', bio: '', protagonist: 'alex' },
    currentWeek: 0,
    weekFeedIndex: 0,
    history: [],
    userProfile: structuredClone(INITIAL_PROFILE),
    weights: structuredClone(INITIAL_WEIGHTS),
    unlockedMechanics: [],
    seenPosts: [],
    actionsThisWeek: [],
    ownPosts: [],
    reflections: { halftime: null, mid: null, final: null, manifest: null },
    guildMemberships: [],
    guildReactions: {},
    electionVote: null,
    electionData: null,
    shitstormHistory: [],
    badges: [],
    sandboxRules: null,
    contentWarningsAccepted: {},
    weekFeedCache: {},
    postReplies: {},
    commentSelections: {},
    likedPosts: {},
    sharedPosts: {},
    initialProfileSnapshot: null,
    dmThreads: {},
    dmReplies: {},
    dmUnread: 0,
    npcArcs: { lea_close: 0, finn_path: 0, mira_close: 0, self_aware: 0 },
    storiesViewed: {},
    placesVisited: {},
    soundEnabled: true,
    theme: 'dark',
    challengeMode: null,
    minigameResults: {},
    ending: null,
    placeEvents: {},
    microReflections: {},
    ownPostReplies: {},
    pushNotificationsSeen: {},
    tutorialDone: false,
    trendingViewed: {},
    conceptsSeen: {},
    bookmarks: {},
    hashtagFilters: {},
    soundVolume: 0.6,
    selfcheck: { pre: null, post: null },
    fontScale: 1.0,
    highContrast: false,
    ttsEnabled: false,
    helpSeen: false,
    storyReactions: {},
    sandboxTourDone: false,
    reports: {},
    feedShiftShownWeek: -1,
    microObservedWeeks: {},
    trendingWhySeen: false,
    random_seed: Math.floor(Math.random() * 1e9)
  };
}

// Sehr leichter Pub/Sub für „wurde gespeichert"-Listener. Wird debounced
// gerufen, damit ein Rendervorgang mit vielen Saves nicht 30 Toasts auslöst.
const _saveListeners = [];
let _savePendingTimer = null;
function _notifySaved() {
  if (_savePendingTimer) clearTimeout(_savePendingTimer);
  _savePendingTimer = setTimeout(() => {
    _savePendingTimer = null;
    for (const cb of _saveListeners) { try { cb(); } catch (e) { /* ignore */ } }
  }, 400);
}

export const Store = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
        this._migrate();
        return true;
      }
    } catch (e) {
      console.warn('Save konnte nicht gelesen werden', e);
    }
    return false;
  },

  _migrate() {
    // Defensiv: fehlende Keys über die ganze Save-Struktur ergänzen.
    // Iteration für Iteration kamen neue Felder dazu — alte Saves dürfen nicht crashen.
    const base = freshSave();
    function fillIn(target, src) {
      if (!target || typeof target !== 'object' || Array.isArray(target)) return;
      if (!src || typeof src !== 'object' || Array.isArray(src)) return;
      for (const k of Object.keys(src)) {
        const sv = src[k];
        if (!(k in target)) {
          target[k] = sv;
        } else if (sv && typeof sv === 'object' && !Array.isArray(sv) &&
                   target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
          // Tieferes Auffüllen für verschachtelte Strukturen wie userProfile,
          // userProfile.interests, weights, character, meta, npcArcs, selfcheck.
          fillIn(target[k], sv);
        }
      }
    }
    fillIn(this.data, base);
    // Charakter-Defaults (alte Saves hatten z.B. keinen `protagonist`-Key).
    if (!this.data.character.protagonist) this.data.character.protagonist = 'alex';
    if (typeof this.data.character.bio !== 'string') this.data.character.bio = '';
    // meta.version inkrementieren wäre hier ein Ort, falls künftige Saves
    // strukturelle Brüche markieren müssen.
  },

  hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  },

  start(character) {
    this.data = freshSave();
    this.data.character = { ...this.data.character, ...character };
    // Startinteressen ins Profil einspeisen
    for (const tag of character.interests_initial || []) {
      this.data.userProfile.interests[tag] = 0.4;
    }
    // Snapshot des Start-Profils für die Sandbox-Vergleichs-Simulation.
    this.data.initialProfileSnapshot = structuredClone(this.data.userProfile);
    this.save();
  },

  // Größe des letzten Saves (Bytes) — die UI warnt einmalig, wenn der
  // Spielstand sich dem localStorage-Limit nähert.
  lastSaveSize: 0,

  save() {
    try {
      this.data.meta.lastSavedAt = Date.now();
      const json = JSON.stringify(this.data);
      this.lastSaveSize = json.length;
      localStorage.setItem(SAVE_KEY, json);
      _notifySaved();
    } catch (e) {
      console.warn('Speichern fehlgeschlagen (Privat-Modus?)', e);
    }
  },

  saveIsLarge() {
    return this.lastSaveSize > SAVE_WARN_BYTES;
  },

  // Aktive Spielzeit aufaddieren (Heartbeat aus main.js, nur bei sichtbarem Tab).
  addPlaytime(ms) {
    if (!this.data) return;
    this.data.meta.playtimeMs = (this.data.meta.playtimeMs || 0) + ms;
    // Bewusst ohne save(): der nächste reguläre Save nimmt den Wert mit,
    // sonst würde der Heartbeat alle 30s einen Schreibzyklus erzwingen.
  },

  onSaved(cb) {
    if (typeof cb === 'function') _saveListeners.push(cb);
  },

  // Backup mit Rotation: der bisherige Slot 1 wandert nach Slot 2, bevor er
  // überschrieben wird. So vernichtet ein zweiter Reset (z.B. nach einem
  // korrupten Import) nicht das letzte gute Backup.
  _writeBackup() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw || raw.length >= BACKUP_MAX) return;
      const prev = localStorage.getItem(BACKUP_KEY);
      if (prev) localStorage.setItem(BACKUP_KEY_2, prev);
      localStorage.setItem(BACKUP_KEY, JSON.stringify({ ts: Date.now(), data: raw }));
    } catch (e) { /* ignore */ }
  },

  reset() {
    // Vor dem Löschen: Backup anlegen, damit "Spielstand löschen" nicht
    // versehentlich Wochen Arbeit vernichtet.
    this._writeBackup();
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    this.data = null;
  },

  hasBackup() {
    try { return !!(localStorage.getItem(BACKUP_KEY) || localStorage.getItem(BACKUP_KEY_2)); }
    catch { return false; }
  },

  getBackupInfo() {
    const info = [];
    for (const [slot, key] of [[1, BACKUP_KEY], [2, BACKUP_KEY_2]]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        info.push({ slot, ts: JSON.parse(raw).ts });
      } catch (e) { /* ignore */ }
    }
    return info.length ? { ts: info[0].ts, slots: info } : null;
  },

  restoreBackup(slot = 1) {
    try {
      const raw = localStorage.getItem(slot === 2 ? BACKUP_KEY_2 : BACKUP_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed?.data) return false;
      localStorage.setItem(SAVE_KEY, parsed.data);
      this.data = JSON.parse(parsed.data);
      this._migrate();
      return true;
    } catch (e) { return false; }
  },

  importJson(jsonStr) {
    // Vor dem Überschreiben: Backup des aktuellen Stands anlegen.
    this._writeBackup();
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed?.character || !parsed?.userProfile) {
        throw new Error('Datei sieht nicht nach einem Streem-Spielstand aus.');
      }
      this.data = parsed;
      this._migrate();
      this.save();
      return true;
    } catch (e) {
      console.warn('Import fehlgeschlagen:', e);
      return false;
    }
  },

  exportJson() {
    // Export-Metadaten mitschreiben, damit ein Import über Spiel-Versionen
    // hinweg nachvollziehbar bleibt (ohne den Live-Save zu verändern).
    const copy = structuredClone(this.data);
    copy.meta = { ...copy.meta, exportedAt: Date.now(), exportVersion: copy.meta?.version || 3 };
    return JSON.stringify(copy, null, 2);
  },

  // ---- Profile-Updates ----
  recordAction(postId, type, post) {
    // Gewichtung der Interaktionstypen (didaktisch: Empörung boostet Thema trotzdem)
    const weight = {
      like: 3,
      comment: 5,
      angry_comment: 5,     // boostet gleich wie neutral — das ist der Witz
      share: 8,
      dwell: 1,
      profile_click: 2,
      skip: -0.2,
      mute: -4,
      follow: 6,
      tw_view: 2,
      tw_skip: -1
    }[type] || 1;

    const p = this.data.userProfile;
    const step = weight * 0.05;

    for (const tag of post.tags || []) {
      if (!(tag in p.interests)) p.interests[tag] = 0;
      p.interests[tag] = clamp(p.interests[tag] + step, 0, 1);
    }
    // Political lean driften lassen
    if (post.political_lean !== undefined && weight > 0) {
      p.political_lean_estimated = clamp(
        p.political_lean_estimated + post.political_lean * step * 0.6,
        -1, 1
      );
    }
    // Outrage-Toleranz
    if (post.outrage_score !== undefined && weight > 0) {
      p.outrage_tolerance = clamp(p.outrage_tolerance + post.outrage_score * step * 0.3, 0, 1);
    }

    this.data.actionsThisWeek.push({ postId, type, week: this.data.currentWeek, ts: Date.now() });
    if (!this.data.seenPosts.includes(postId)) {
      this.data.seenPosts.push(postId);
    }
    if (!this.data.postReplies) this.data.postReplies = {};
    if (type === 'comment' || type === 'angry_comment') {
      if (!this.data.postReplies[postId]) this.data.postReplies[postId] = [];
      this.data.postReplies[postId].push({ type, week: this.data.currentWeek, ts: Date.now() });
    }
    this.save();
  },

  endWeek(feedSeen) {
    const snap = structuredClone(this.data.userProfile);
    this.data.history.push({
      week: this.data.currentWeek,
      actions: this.data.actionsThisWeek.slice(),
      feedSeen: feedSeen.slice(),
      profileSnapshot: snap
    });
    this.data.actionsThisWeek = [];
    this.data.weekFeedIndex = 0;
    this.data.currentWeek += 1;
    this.save();
  },

  // "Was wäre wenn?": die zuletzt abgeschlossene Woche zurücksetzen, damit
  // SuS einen Wendepunkt mit anderer Entscheidung erneut spielen können.
  // Bewusst begrenzt: DM-Antworten und Gilden-Beitritte bleiben bestehen
  // (sie sind Teil der Geschichte), aber Feed-Interaktionen der Woche
  // werden zurückgenommen und das Profil auf den Wochenanfang gestellt.
  replayLastWeek() {
    const hist = this.data.history;
    if (!hist.length) return false;
    const last = hist.pop();
    const weekNum = last.week;
    // Profil auf den Stand vor dieser Woche zurücksetzen.
    const prevSnap = hist.length
      ? hist[hist.length - 1].profileSnapshot
      : this.data.initialProfileSnapshot;
    if (prevSnap) this.data.userProfile = structuredClone(prevSnap);
    // Feed-Interaktionen der Woche zurücknehmen.
    const weekPostIds = new Set([
      ...(last.feedSeen || []),
      ...(last.actions || []).map(a => a.postId)
    ]);
    this.data.seenPosts = this.data.seenPosts.filter(id => !weekPostIds.has(id));
    for (const store of ['likedPosts', 'sharedPosts', 'bookmarks', 'reports']) {
      const obj = this.data[store] || {};
      for (const [id, v] of Object.entries(obj)) {
        if (v && v.week === weekNum) delete obj[id];
      }
    }
    if (this.data.commentSelections) {
      for (const id of weekPostIds) delete this.data.commentSelections[id];
    }
    this.data.ownPosts = (this.data.ownPosts || []).filter(p => p.week !== weekNum);
    if (this.data.weekFeedCache) delete this.data.weekFeedCache[weekNum];
    this.data.actionsThisWeek = [];
    this.data.weekFeedIndex = 0;
    this.data.currentWeek = weekNum;
    this.save();
    return true;
  },

  cacheWeekFeed(weekNum, postIds) {
    if (!this.data.weekFeedCache) this.data.weekFeedCache = {};
    this.data.weekFeedCache[weekNum] = postIds.slice();
    this.save();
  },

  getWeekFeedCache(weekNum) {
    return this.data.weekFeedCache?.[weekNum] || null;
  },

  unlock(name) {
    if (!this.data.unlockedMechanics.includes(name)) {
      this.data.unlockedMechanics.push(name);
      this.save();
      return true;
    }
    return false;
  },

  isUnlocked(name) {
    return this.data.unlockedMechanics.includes(name);
  },

  addBadge(title, desc) {
    if (!this.data.badges.some(b => b.title === title)) {
      this.data.badges.push({ title, desc, week: this.data.currentWeek });
      this.save();
      return true;
    }
    return false;
  },

  follow(charId) {
    if (!this.data.userProfile.followed.includes(charId)) {
      this.data.userProfile.followed.push(charId);
      this.save();
    }
  },

  unfollow(charId) {
    this.data.userProfile.followed = this.data.userProfile.followed.filter(x => x !== charId);
    this.save();
  },

  mute(charId) {
    if (!this.data.userProfile.muted.includes(charId)) {
      this.data.userProfile.muted.push(charId);
      this.save();
    }
  },

  addOwnPost(post) {
    this.data.ownPosts.push({ ...post, week: this.data.currentWeek, ts: Date.now() });
    this.save();
  },

  getDay() {
    // Tag leitet sich aus currentWeek ab (didaktisch)
    const w = this.data.currentWeek;
    if (w < 9) return 1;
    if (w < 19) return 2;
    return 3;
  }
};

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Deterministischer Seed für reproduzierbare Feeds (pro Woche)
export function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

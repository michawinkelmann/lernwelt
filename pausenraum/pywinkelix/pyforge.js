// ═══════════════════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════════════════
const SAVE_KEY = "pyforge_save";
const SAVE_VERSION = 2;

const DEFAULT_STATE = {
  version: SAVE_VERSION,
  currentLevel: 0,
  currentChallenge: 0,
  completed: [],
  xp: 0,
  unlockedAchievements: [],
  hintFreeCount: 0,
  errorFixCount: 0,
  hintsUsed: {},
  errorsSeen: 0,
  runCount: 0,
  // — onboarding / identity
  avatar: null,            // {id, emoji, name}
  // — streak
  streak: { lastDay: null, count: 0, longest: 0 },
  // — pedagogy
  reflections: {},         // {levelId: {confidence: 1-5}}
  reflectionAsked: [],     // [levelId]
  // — settings
  settings: {
    theme: "dark",         // "dark" | "light"
    fontSize: "md",        // "sm" | "md" | "lg"
    sound: true,
    confetti: true,
    reducedMotion: false,
    pomodoro: false,
    // — wave 13: accessibility
    dyslexiaFont: false,
    highContrast: false,
    // — wave 14: voice + stats
    voiceRate: 0.95,
    voiceURI: "",
    // — wave 15
    voiceAnnounce: false,                // speak achievements/level-ups
  },
  // — wave 14: concept tracker — { conceptId: countSeen }
  concepts: {},
  longestSessionMinutes: 0,
  // — wave 15: per-day history for sparkline { "YYYY-M-D": { conceptId: countToday } }
  conceptHistory: {},
  // — wave 17: first-time tutorial
  tutorialShown: false,
  cutscenesSeen: 0,
  // — sandbox (single-file legacy + multi-file wave 8)
  sandbox: { code: "# Freier Modus — probiere alles aus!\nprint(\"Hallo!\")\n" },
  sandboxFiles: null,                  // {active, files:[{id, name, code}]} (lazy)
  // — adaptive hints (wave 8)
  attemptsByChallenge: {},             // {chId: nFailedChecks}
  // — daily challenge (wave 8)
  dailyHistory: {},                    // {YYYY-M-D: chId}
  // — per-challenge notes (wave 9)
  notedChallenges: 0,                  // count of challenges with non-empty notes
  // — speedrun (wave 10)
  speedrun: null,                      // {startedAt, target, solved, skipped, queue, filter} or null
  speedrunsCompleted: 0,
  speedrunBest: 0,                     // legacy: best across all pools
  speedrunBests: {},                   // wave 13: {pool: best} per pool ("all"|"original"|"bonus"|"todo"|"daily"|"custom")
  // — per-challenge editor state (wave 18): keep each task's code + output
  challengeCode: {},                   // {chId: lastEditorCode}
  challengeOutput: {},                 // {chId: lastOutputHTML}
  // — meta
  startedAt: null,
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e) {}
}
function loadState() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      state = mergeState(DEFAULT_STATE, parsed);
      return true;
    }
  } catch(e) {}
  return false;
}
function mergeState(base, loaded) {
  const out = JSON.parse(JSON.stringify(base));
  for (const k in loaded) {
    if (loaded[k] !== null && typeof loaded[k] === "object" && !Array.isArray(loaded[k])) {
      out[k] = {...(out[k] || {}), ...loaded[k]};
    } else {
      out[k] = loaded[k];
    }
  }
  return out;
}
function resetState() {
  const settings = state.settings; // preserve user settings
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  state.settings = settings;
  state.startedAt = Date.now();
  saveState();
}

// ═══════════════════════════════════════════════════════════
//  EDITOR WRAPPER (CodeMirror w/ textarea fallback)
// ═══════════════════════════════════════════════════════════
const Editor = {
  cm: null,
  _ta() { return document.getElementById("codeArea"); },
  getValue() { return this.cm ? this.cm.getValue() : this._ta().value; },
  setValue(v) {
    if (this.cm) {
      this.cm.setValue(v);
      this.cm.refresh();
    } else {
      this._ta().value = v;
    }
  },
  focus() { (this.cm ? this.cm : this._ta()).focus(); },
  init() {
    if (typeof CodeMirror === "undefined") return; // fallback: plain textarea
    const ta = this._ta();
    this.cm = CodeMirror.fromTextArea(ta, {
      mode: "python",
      theme: resolvedTheme(state.settings?.theme) === "light" ? "default" : "material-darker",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      matchBrackets: true,
      autoCloseBrackets: true,
      lineWrapping: false,
      viewportMargin: Infinity,
      extraKeys: {
        "Ctrl-Enter": () => handleRun(),
        "Cmd-Enter":  () => handleRun(),
        "Tab": (cm) => cm.replaceSelection("    ", "end"),
      },
    });
    this.cm.setSize("100%", "100%");
    this.cm.on("change", () => {
      ta.value = this.cm.getValue();
      if (sandboxMode) SandboxFiles.saveActiveCode(ta.value);
      else saveCurrentChallengeCode(ta.value);
    });
  },
  setTheme(theme) {
    if (this.cm) this.cm.setOption("theme", theme === "light" ? "default" : "material-darker");
  },
};

// ═══════════════════════════════════════════════════════════
//  AVATARS
// ═══════════════════════════════════════════════════════════
const AVATARS = [
  { id: "warrior", emoji: "⚔️",   nameKey: "avatarWarrior" },
  { id: "mage",    emoji: "\u{1f9d9}",       nameKey: "avatarMage" },
  { id: "rogue",   emoji: "\u{1f977}",       nameKey: "avatarRogue" },
  { id: "ranger",  emoji: "\u{1f3f9}",       nameKey: "avatarRanger" },
  { id: "healer",  emoji: "\u{1f489}",       nameKey: "avatarHealer" },
  { id: "robot",   emoji: "\u{1f916}",       nameKey: "avatarRobot" },
];

function getAvatar() {
  if (!state.avatar) return AVATARS[0];
  return AVATARS.find(a => a.id === state.avatar.id) || AVATARS[0];
}
function avatarDisplayName() {
  return state.avatar?.name || t(getAvatar().nameKey);
}

// ═══════════════════════════════════════════════════════════
//  STREAK SYSTEM
// ═══════════════════════════════════════════════════════════
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function yesterdayKey() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function bumpStreak() {
  const today = todayKey();
  const s = state.streak || { lastDay: null, count: 0, longest: 0 };
  if (s.lastDay === today) return;
  if (s.lastDay === yesterdayKey()) s.count = (s.count || 0) + 1;
  else s.count = 1;
  s.lastDay = today;
  s.longest = Math.max(s.longest || 0, s.count);
  state.streak = s;
  saveState();
}

// ═══════════════════════════════════════════════════════════
//  SETTINGS / THEMING / A11Y
// ═══════════════════════════════════════════════════════════
function resolvedTheme(setting) {
  if (setting === "auto") {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    return m && m.matches ? "dark" : "light";
  }
  return setting || "dark";
}
function applySettings() {
  const s = state.settings || DEFAULT_STATE.settings;
  document.documentElement.dataset.theme = resolvedTheme(s.theme);
  document.documentElement.dataset.fontsize = s.fontSize || "md";
  document.documentElement.dataset.motion = s.reducedMotion ? "reduced" : "full";
  document.documentElement.dataset.font = s.dyslexiaFont ? "dyslexia" : "default";
  document.documentElement.dataset.contrast = s.highContrast ? "high" : "normal";
}
// React to system theme changes while "Auto" is selected.
(function watchSystemTheme() {
  try {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!m) return;
    const handler = () => {
      if (state.settings?.theme === "auto") {
        applySettings();
        Editor.setTheme(resolvedTheme("auto"));
      }
    };
    if (m.addEventListener) m.addEventListener("change", handler);
    else if (m.addListener) m.addListener(handler);
  } catch (e) {}
})();
function setSetting(key, value) {
  state.settings[key] = value;
  saveState();
  applySettings();
  if (key === "theme") Editor.setTheme(resolvedTheme(value));
  if (key === "theme" || key === "fontSize") renderAll();
  if (key === "pomodoro") {
    if (value) Pomodoro.start(); else Pomodoro.stop();
  }
}

// ═══════════════════════════════════════════════════════════
//  CODE PATTERN CHECKS (lightweight AST-ish via regex)
// ═══════════════════════════════════════════════════════════
function stripComments(code) {
  return code.replace(/#.*$/gm, "");
}
const CodeCheck = {
  usesIf:        c => /\bif\b\s+[^\n]+:/.test(stripComments(c)),
  usesElif:      c => /\belif\b\s+[^\n]+:/.test(stripComments(c)),
  usesElse:      c => /\belse\s*:/.test(stripComments(c)),
  usesWhile:     c => /\bwhile\b\s+[^\n]+:/.test(stripComments(c)),
  usesFor:       c => /\bfor\b\s+\w+\s+in\b/.test(stripComments(c)),
  usesDef:       c => /\bdef\s+\w+\s*\(/.test(stripComments(c)),
  usesClass:     c => /\bclass\s+\w+\s*[:(]/.test(stripComments(c)),
  usesReturn:    c => /\breturn\b/.test(stripComments(c)),
  usesList:      c => /\[[^\]]*\]/.test(stripComments(c)),
  usesDict:      c => /\{[^{}]*:\s*[^{}]+\}/.test(stripComments(c)),
  usesFstring:   c => /f["'][^"']*\{[^}]+\}/.test(stripComments(c)),
  usesComprehension: c => /\[[^\]]*\bfor\b[^\]]*\]/.test(stripComments(c)),
  usesTryExcept: c => /\btry\b\s*:/.test(stripComments(c)) && /\bexcept\b/.test(stripComments(c)),
  usesLambda:    c => /\blambda\b/.test(stripComments(c)),
  usesPrint:     c => /\bprint\s*\(/.test(stripComments(c)),
  callsFn(c, name) { return new RegExp(`\\b${name}\\s*\\(`).test(stripComments(c)); },
  hasVar(c, name) { return new RegExp(`\\b${name}\\s*=`).test(stripComments(c)); },

  // Optional: AST-based check using Skulpt's parser (more robust than regex).
  // Walks the AST looking for a node whose _astname matches the given type.
  // Examples: "If", "For", "While", "FunctionDef", "ClassDef", "Return", "Call".
  // Returns false if Skulpt isn't loaded or the code doesn't parse.
  astHasNode(code, nodeName) {
    try {
      if (typeof Sk === "undefined" || !Sk.parser || !Sk.astFromParse) return false;
      const cst = Sk.parser.parse("<check>", code).cst;
      const ast = Sk.astFromParse(cst, "<check>", { __future__: Sk.python3 });
      let found = false;
      (function walk(n) {
        if (found || n === null || n === undefined) return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        if (typeof n !== "object") return;
        if (n._astname === nodeName) { found = true; return; }
        for (const k in n) if (!k.startsWith("_") && typeof n[k] === "object") walk(n[k]);
      })(ast);
      return found;
    } catch (e) {
      return false;
    }
  },

  // Quick syntactic sanity-check via Skulpt (no execution). Returns null on
  // success or an error string on parse failure. Useful for pre-validating
  // code before running it.
  syntaxError(code) {
    try {
      if (typeof Sk === "undefined" || !Sk.parser) return null;
      Sk.parser.parse("<check>", code);
      return null;
    } catch (e) {
      return String(e && e.message || e);
    }
  },
};

// ═══════════════════════════════════════════════════════════
//  CONCEPT TRACKER (wave 14)
// ═══════════════════════════════════════════════════════════
const CONCEPTS = [
  { id: "print",   icon: "📤", label_en: "print()",            label_de: "print()",          test: c => CodeCheck.usesPrint(c) },
  { id: "var",     icon: "📦", label_en: "Variables",          label_de: "Variablen",        test: c => /^[ \t]*[a-zA-Z_]\w*\s*=\s*[^=]/m.test(stripComments(c)) },
  { id: "if",      icon: "🔀", label_en: "if/else",            label_de: "if/else",          test: c => CodeCheck.usesIf(c) },
  { id: "for",     icon: "🔁", label_en: "for-loop",           label_de: "for-Schleife",     test: c => CodeCheck.usesFor(c) },
  { id: "while",   icon: "⏳", label_en: "while-loop",         label_de: "while-Schleife",   test: c => CodeCheck.usesWhile(c) },
  { id: "def",     icon: "🛠", label_en: "Functions",          label_de: "Funktionen",       test: c => CodeCheck.usesDef(c) },
  { id: "class",   icon: "🏛", label_en: "Classes",            label_de: "Klassen",          test: c => CodeCheck.usesClass(c) },
  { id: "list",    icon: "📋", label_en: "Lists",              label_de: "Listen",           test: c => CodeCheck.usesList(c) },
  { id: "dict",    icon: "📖", label_en: "Dicts",              label_de: "Dicts",            test: c => CodeCheck.usesDict(c) },
  { id: "fstring", icon: "🪄", label_en: "f-strings",          label_de: "f-Strings",        test: c => CodeCheck.usesFstring(c) },
  { id: "comp",    icon: "✨", label_en: "Comprehensions",     label_de: "Comprehensions",   test: c => CodeCheck.usesComprehension(c) },
  { id: "try",     icon: "🛡", label_en: "try / except",       label_de: "try / except",     test: c => CodeCheck.usesTryExcept(c) },
  { id: "lambda",  icon: "λ",  label_en: "lambda",             label_de: "lambda",           test: c => CodeCheck.usesLambda(c) },
  { id: "import",  icon: "📥", label_en: "imports",            label_de: "imports",          test: c => /^\s*(import|from)\s+\w/m.test(stripComments(c)) },
  { id: "turtle",  icon: "🐢", label_en: "Turtle drawing",     label_de: "Turtle-Grafik",    test: c => /\bimport\s+turtle\b|\bfrom\s+turtle\s+import\b/.test(c) },
];

function detectConcepts(code) {
  const found = [];
  for (const c of CONCEPTS) {
    try { if (c.test(code)) found.push(c.id); } catch (e) {}
  }
  return found;
}

function trackConceptsFromCode(code) {
  if (!code || !code.trim()) return;
  const found = detectConcepts(code);
  if (found.length === 0) return;
  if (!state.concepts) state.concepts = {};
  const today = todayKey();
  if (!state.conceptHistory) state.conceptHistory = {};
  if (!state.conceptHistory[today]) state.conceptHistory[today] = {};
  for (const id of found) {
    state.concepts[id] = (state.concepts[id] || 0) + 1;
    state.conceptHistory[today][id] = (state.conceptHistory[today][id] || 0) + 1;
  }
  // Trim history older than 30 days to keep storage bounded
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const k of Object.keys(state.conceptHistory)) {
    const [y, m, d] = k.split("-").map(Number);
    if (!y || !m || !d) continue;
    const ts = new Date(y, m - 1, d).getTime();
    if (ts < cutoff) delete state.conceptHistory[k];
  }
  saveState();
}

// ═══════════════════════════════════════════════════════════
//  UI RENDERING
// ═══════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);

function getCurrentChallenge() {
  return LEVELS[state.currentLevel]?.challenges[state.currentChallenge];
}

// ── Per-challenge editor persistence (wave 18) ──
// Each task remembers the student's code AND its last output, so switching
// away and back (via the sidebar) restores exactly what they had.
function saveCurrentChallengeCode(code) {
  if (sandboxMode) return;
  const ch = getCurrentChallenge();
  if (!ch) return;
  if (!state.challengeCode) state.challengeCode = {};
  state.challengeCode[ch.id] = code;
  saveState();
}
function saveChallengeOutput(chId, html) {
  if (!chId) return;
  if (!state.challengeOutput) state.challengeOutput = {};
  state.challengeOutput[chId] = html;
  saveState();
}
function restoreChallengeOutput(ch) {
  const outEl = $("outputArea");
  if (!outEl) return;
  const saved = ch && state.challengeOutput ? state.challengeOutput[ch.id] : null;
  outEl.innerHTML = (saved != null && saved !== "")
    ? saved
    : `<span class="info">${t("outputPlaceholder")}</span>`;
}

function renderAll() {
  // Defensive: a failure in one render step must not block the others.
  // A single broken render path used to leave the lesson stuck on
  // "Loading…" with a blank progress sidebar — fail loudly to console
  // instead of silently.
  const steps = [
    ["renderHeader",   renderHeader],
    ["renderLesson",   renderLesson],
    ["renderProgress", renderProgress],
  ];
  for (const [name, fn] of steps) {
    try { fn(); }
    catch (e) { console.error("[PyWinkelix] " + name + " failed:", e); }
  }
  if (teacherMode) {
    try { renderTeacherPanel(); }
    catch (e) { console.error("[PyWinkelix] renderTeacherPanel failed:", e); }
  }
}

function renderHeader() {
  const level = LEVELS[state.currentLevel];
  $("levelPill").textContent = `${t("level")} ${level.id}: ${tLevel(level)}`;
  const totalXp = state.xp;
  const levelXp = level.id * 100;
  const prevLevelXp = (level.id - 1) * 100;
  const progress = Math.min(100, ((totalXp - prevLevelXp) / (levelXp - prevLevelXp)) * 100);
  $("xpBar").style.width = Math.max(0, progress) + "%";
  $("xpLabel").textContent = `XP: ${totalXp}`;

  // Streak badge
  const streakEl = $("streakBadge");
  if (streakEl) {
    const c = state.streak?.count || 0;
    if (c > 0) {
      streakEl.hidden = false;
      streakEl.textContent = `\u{1f525} ${c}`;
      streakEl.title = `${t("streakTitle")}: ${c} ${t("days")} (${t("best")}: ${state.streak.longest})`;
    } else {
      streakEl.hidden = true;
    }
  }

  // Avatar badge
  const avEl = $("avatarBadge");
  if (avEl) {
    const av = getAvatar();
    avEl.innerHTML = `<span class="avatar-emoji">${av.emoji}</span><span class="avatar-name">${escapeHTML(avatarDisplayName())}</span>`;
    avEl.title = t("editAvatar");
  }

  // Update static UI labels
  $("hdrLesson").textContent = t("lesson");
  $("hdrEditor").innerHTML = `\u{1f4bb} ${t("pythonEditor")}`;
  $("hdrProgress").textContent = t("progress");
  $("hdrLevels").textContent = t("levels");
  $("hdrAchievements").textContent = t("achievements");
  $("btnRun").innerHTML = t("btnRun");
  $("btnCheck").innerHTML = t("btnCheck");
  $("btnDownload").innerHTML = t("btnDownload");
  $("btnResetCode").innerHTML = t("btnResetCode");
  if ($("btnShare")) $("btnShare").innerHTML = t("btnShare");
  if ($("btnStep")) $("btnStep").innerHTML = t("btnStep");
  if ($("btnSnippets")) $("btnSnippets").innerHTML = t("btnSnippets");
  $("btnPrev").innerHTML = t("btnPrev");
  $("btnNext").innerHTML = t("btnNext");
  $("refToggle").innerHTML = t("quickRef");
  $("footerText").innerHTML = t("footer");
  $("btnSandboxToggle").innerHTML = sandboxMode ? `✨ ${t("exitSandbox")}` : `\u{1f9ea} ${t("sandbox")}`;
  $("btnSettings").title = t("settings");
  $("btnSettings").setAttribute("aria-label", t("settings"));

  // Welcome modal
  $("welcomeTitle").textContent = t("welcomeTitle");
  $("welcomeText").textContent = t("welcomeText");
  $("welcomeSubtext").textContent = t("welcomeSubtext");
  $("btnStart").textContent = t("btnStart");
  $("btnContinue").textContent = t("btnContinue");
  $("btnReset2").textContent = t("btnResetProgress");
  if ($("btnImportSave")) $("btnImportSave").textContent = t("importSave");

  // Class assignment banner in welcome
  if (classAssignment) {
    $("welcomeClassBanner").hidden = false;
    $("welcomeClassHead").textContent = t("classAssignment");
    const name = classAssignment.name ? `<b>${escapeHTML(classAssignment.name)}</b> — ` : "";
    const count = classAssignment.taskIds.size;
    const isDE = currentLang === "de";
    $("welcomeClassBody").innerHTML = `${name}${count} ${isDE ? "Aufgaben" : "tasks"} ${isDE ? "ausgewählt" : "selected"}`;
  }

  // Avatar modal
  if ($("avTitle")) $("avTitle").textContent = t("chooseAvatar");
  if ($("avSubtitle")) $("avSubtitle").textContent = t("chooseAvatarSub");
  if ($("avNameLabel")) $("avNameLabel").textContent = t("yourName");
  if ($("avNameInput")) $("avNameInput").placeholder = t("namePlaceholder");
  if ($("avConfirm")) $("avConfirm").textContent = t("letsGo");

  // Settings modal
  if ($("settingsTitle")) $("settingsTitle").textContent = t("settings");
  if ($("setThemeLabel")) $("setThemeLabel").textContent = t("theme");
  if ($("setFontLabel")) $("setFontLabel").textContent = t("textSize");
  if ($("setSoundLabel")) $("setSoundLabel").textContent = t("sound");
  if ($("setConfettiLabel")) $("setConfettiLabel").textContent = t("confetti");
  if ($("setMotionLabel")) $("setMotionLabel").textContent = t("reducedMotion");
  if ($("setPomodoroLabel")) $("setPomodoroLabel").textContent = t("pomodoroTimer");
  if ($("setExportLabel")) $("setExportLabel").textContent = t("dataExport");
  if ($("btnExportSave")) $("btnExportSave").textContent = `\u{2b07} ${t("exportSave")}`;
  if ($("btnImportSave2")) $("btnImportSave2").textContent = `\u{2b06} ${t("importSave")}`;
  if ($("setPrivacyLabel")) $("setPrivacyLabel").textContent = t("privacy");
  if ($("setPrivacyText")) $("setPrivacyText").innerHTML = t("privacyText");
  if ($("settingsClose")) $("settingsClose").textContent = t("close");

  // Teacher panel static labels
  $("teacherPwTitle").textContent = t("teacherMode");
  $("teacherPwPrompt").textContent = t("teacherPwPrompt");
  $("hdrTeacher").innerHTML = `\u{1f9d1}‍\u{1f3eb} ${t("teacherMode")}`;
  $("tBtnSolution").textContent = t("solution");
  $("tBtnOverview").textContent = t("overview");
  $("tBtnDidactics").textContent = t("didactics");
  if ($("tBtnClass"))  $("tBtnClass").textContent  = t("tClassTab");
  if ($("tBtnCustom")) $("tBtnCustom").textContent = t("tCustomTab");
  $("tBtnNotes").textContent = t("notes");
  $("tBtnExit").innerHTML = `✖ ${t("exit")}`;
  $("tAllHintsTitle").textContent = t("allHints");
  $("tValidationTitle").textContent = t("validationLogic");
  $("tLoadSolution").innerHTML = t("loadSolution");
  $("tRunSolution").innerHTML = t("runSolution");
  $("tOverviewTitle").textContent = t("allChallengesOverview");
  $("tThChallenge").textContent = t("challengeCol");
  $("tThStatus").textContent = t("status");
  $("tStatsTitle").textContent = t("statistics");
  $("tDidacticTitle").textContent = t("didacticNotes");
  $("tCommonErrorsTitle").textContent = t("commonMistakes");
  $("tDiffTitle").textContent = t("differentiationIdeas");
  $("tNotesTitle").textContent = t("yourNotes");
  $("tNotesArea").placeholder = t("notesPlaceholder");
}

function renderLesson() {
  if (sandboxMode) {
    renderSandboxLesson();
    return;
  }
  const ch = getCurrentChallenge();
  if (!ch) return;
  const lvl = LEVELS[state.currentLevel];
  const type = ch.type || "code";

  $("chTitle").textContent = `${t("challenge")} ${ch.id}: ${tChTitle(ch)}`;
  $("chSubtitle").textContent = `${tLevel(lvl)} • ${ch.xp} XP`;

  // Lesson class-assignment banner
  const lcb = $("lessonClassBanner");
  if (lcb) {
    if (classAssignment && classAssignment.taskIds.has(ch.id)) {
      lcb.hidden = false;
      const name = classAssignment.name ? ` — <b>${escapeHTML(classAssignment.name)}</b>` : "";
      lcb.innerHTML = `<span class="cb-icon">📚</span><span>${t("classAssignment")}${name}</span>`;
    } else {
      lcb.hidden = true;
    }
  }

  // Task type pill
  renderTaskTypePill(type);

  // Story banner
  const storyEl = $("storyBanner");
  if (storyEl) {
    const story = getLevelStory(lvl.id);
    if (story && state.currentChallenge === 0) {
      storyEl.hidden = false;
      storyEl.innerHTML = `<span class="story-icon">\u{1f4dc}</span><span>${story}</span>`;
    } else {
      storyEl.hidden = true;
    }
  }

  // Boss banner — last challenge in a level is the "Boss"
  const bossEl = $("bossBanner");
  if (bossEl) {
    const isBoss = state.currentChallenge === lvl.challenges.length - 1;
    if (isBoss && lvl.challenges.length > 1) {
      bossEl.hidden = false;
      bossEl.innerHTML = `<span class="boss-icon">\u{1f451}</span><span><b>${t("bossBattle")}</b> — ${t("bossIntro")}</span>`;
      document.querySelector(".lesson-card")?.classList.add("boss-mode");
    } else {
      bossEl.hidden = true;
      document.querySelector(".lesson-card")?.classList.remove("boss-mode");
    }
  }

  // Objectives
  const objEl = $("objectivesBox");
  if (objEl) {
    const objs = tChObjectives(ch);
    if (objs && objs.length) {
      objEl.hidden = false;
      objEl.innerHTML = `<div class="obj-title">\u{1f3af} ${t("learningGoals")}</div>` +
        "<ul>" + objs.map(o => `<li>${o}</li>`).join("") + "</ul>";
    } else {
      objEl.hidden = true;
    }
  }

  $("chInstructions").innerHTML = tChInstructions(ch);

  // Hints (common to all task types)
  renderHintArea(ch);

  // Dispatch type-specific UI
  if (type === "parsons") {
    renderParsonsChallenge(ch);
  } else if (type === "output_quiz") {
    renderOutputQuizChallenge(ch);
  } else {
    // "code" or "bug_hunt"
    renderCodeChallenge(ch);
  }

  // Nav (same for all types)
  const isFirst = state.currentLevel === 0 && state.currentChallenge === 0;
  const isLast = state.currentLevel === LEVELS.length - 1 && state.currentChallenge === LEVELS[LEVELS.length-1].challenges.length - 1;
  $("btnPrev").disabled = isFirst;
  $("btnNext").disabled = isLast;
  $("btnPrev").hidden = false;
  $("btnNext").hidden = false;

  renderReference();
}

function renderTaskTypePill(type) {
  const pill = $("taskTypePill");
  if (!pill) return;
  if (type === "code") { pill.hidden = true; return; }
  const labels = {
    parsons:     { en: "\u{1f9e9} Parsons puzzle",   de: "\u{1f9e9} Parsons-Puzzle",     cls: "tt-parsons" },
    bug_hunt:    { en: "\u{1f41b} Bug hunt",         de: "\u{1f41b} Bug-Jagd",           cls: "tt-bug" },
    output_quiz: { en: "❓ Output quiz",              de: "❓ Output-Quiz",                cls: "tt-quiz" },
  };
  const info = labels[type];
  if (!info) { pill.hidden = true; return; }
  pill.hidden = false;
  pill.className = "task-type-pill " + info.cls;
  pill.textContent = currentLang === "de" ? info.de : info.en;
}

function renderHintArea(ch) {
  const hintArea = $("hintArea");
  const usedHints = state.hintsUsed[ch.id] || 0;
  const hints = tChHints(ch);
  let hintHTML = "";
  if (hints && hints.length > 0) {
    for (let i = 0; i < Math.min(usedHints, hints.length); i++) {
      hintHTML += `<div class="hint-item">\u{1f4a1} ${hints[i]}</div>`;
    }
    if (usedHints < hints.length) {
      hintHTML += `<button class="hint-btn" onclick="revealHint()">\u{1f4a1} ${t("hint")} ${usedHints + 1}/${hints.length}</button>`;
    }
  }
  if (state.completed.includes(ch.id)) {
    hintHTML += `<div class="complete-banner">✅ ${t("challengeComplete")}</div>`;
    const type = ch.type || "code";
    if ((type === "code" || type === "bug_hunt") && SOLUTIONS[ch.id]) {
      hintHTML += `<button class="compare-btn" onclick="Compare.open(getCurrentChallenge())">${t("compareSolution")}</button>`;
    }
  }
  hintArea.innerHTML = hintHTML;
  LessonNotes.render(ch);
}

// ═══════════════════════════════════════════════════════════
//  PER-CHALLENGE NOTES (localStorage)
// ═══════════════════════════════════════════════════════════
const LessonNotes = {
  _key(chId) { return "pyforge_note_" + chId; },
  _label() { return currentLang === "de" ? "Meine Notizen" : "My notes"; },
  _placeholder() { return currentLang === "de" ? "Was hast du gelernt? Was war knifflig?…" : "What did you learn? What was tricky?…"; },
  expanded: false,

  load(chId) {
    try { return localStorage.getItem(this._key(chId)) || ""; } catch (e) { return ""; }
  },
  save(chId, text) {
    try { localStorage.setItem(this._key(chId), text); } catch (e) {}
    // Track for achievement
    const key = "pyforge_notes_index";
    let idx;
    try { idx = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { idx = []; }
    if (text && text.trim() && !idx.includes(chId)) {
      idx.push(chId);
      try { localStorage.setItem(key, JSON.stringify(idx)); } catch (e) {}
    }
    if (!text || !text.trim()) {
      idx = idx.filter(x => x !== chId);
      try { localStorage.setItem(key, JSON.stringify(idx)); } catch (e) {}
    }
    state.notedChallenges = idx.length;
    saveState();
    checkAchievements();
  },
  countAll() {
    try { return (JSON.parse(localStorage.getItem("pyforge_notes_index") || "[]") || []).length; }
    catch (e) { return 0; }
  },

  render(ch) {
    const wrap = $("lessonNotes");
    const area = $("lessonNotesArea");
    const lab  = $("lessonNotesLabel");
    if (!wrap || !area || !ch) return;
    lab.textContent = this._label();
    area.placeholder = this._placeholder();
    area.value = this.load(ch.id);
    area.hidden = !this.expanded;
    $("lessonNotesToggle").setAttribute("aria-expanded", this.expanded ? "true" : "false");
    $("lessonNotesToggle").classList.toggle("open", this.expanded);
    // re-wire input each render (cheap)
    area.oninput = () => this.save(ch.id, area.value);
  },
  toggle() {
    this.expanded = !this.expanded;
    const area = $("lessonNotesArea");
    if (area) {
      area.hidden = !this.expanded;
      if (this.expanded) area.focus();
    }
    const btn = $("lessonNotesToggle");
    if (btn) {
      btn.setAttribute("aria-expanded", this.expanded ? "true" : "false");
      btn.classList.toggle("open", this.expanded);
    }
  },
};

function renderCodeChallenge(ch) {
  // Hide alt UIs
  $("quizArea").hidden = true; $("quizArea").innerHTML = "";
  $("parsonsArea").hidden = true; $("parsonsArea").innerHTML = "";
  // Show editor controls
  $("btnCheck").hidden = false;
  $("btnRun").hidden = false;
  $("btnStep").hidden = false;
  $("btnSnippets").hidden = false;
  $("btnDownload").hidden = false;
  $("btnResetCode").hidden = false;
  $("btnShare").hidden = false;
  document.querySelector(".editor-card")?.classList.remove("dimmed");
  // Load code: prefer the student's saved code for this task, else the starter.
  const ta = $("codeArea");
  if (!ta.dataset.loaded || ta.dataset.loaded !== ch.id) {
    const saved = state.challengeCode ? state.challengeCode[ch.id] : undefined;
    let code;
    if (typeof saved === "string") {
      code = saved;
    } else {
      code = (ch.type === "bug_hunt") ? (ch.buggyCode || tChStarter(ch)) : tChStarter(ch);
    }
    Editor.setValue(code);
    ta.dataset.loaded = ch.id;
    // Restore the output this task last produced (or the placeholder).
    restoreChallengeOutput(ch);
    switchOutputTab("text");
  }
}

function renderOutputQuizChallenge(ch) {
  // Hide editor-action buttons (no coding)
  $("btnCheck").hidden = true;
  $("btnRun").hidden = true;
  $("btnStep").hidden = true;
  $("btnSnippets").hidden = true;
  $("btnDownload").hidden = true;
  $("btnResetCode").hidden = true;
  $("btnShare").hidden = true;
  $("parsonsArea").hidden = true;
  $("parsonsArea").innerHTML = "";
  document.querySelector(".editor-card")?.classList.add("dimmed");

  const quiz = ch.quiz || {};
  const code = (currentLang === "de" && quiz.code_de) ? quiz.code_de : (quiz.code || "");
  const options = (currentLang === "de" && quiz.options_de) ? quiz.options_de : (quiz.options || []);

  const done = state.completed.includes(ch.id);
  const html = `
    <div class="quiz-code-block"><pre><code>${escapeHTML(code)}</code></pre></div>
    <div class="quiz-q">${currentLang === "de" ? "Was ist die Ausgabe?" : "What is the output?"}</div>
    <div class="quiz-options">
      ${options.map((o, i) =>
        `<button class="quiz-option" data-i="${i}" ${done ? "disabled" : ""}>${escapeHTML(o)}</button>`
      ).join("")}
    </div>
    <div class="quiz-feedback" id="quizFeedback"></div>
  `;
  const q = $("quizArea");
  q.hidden = false;
  q.innerHTML = html;
  q.querySelectorAll(".quiz-option").forEach(btn => {
    btn.addEventListener("click", () => onQuizAnswer(ch, parseInt(btn.dataset.i, 10)));
  });
}

function onQuizAnswer(ch, idx) {
  const fb = $("quizFeedback");
  const correct = (ch.quiz && ch.quiz.correct === idx);
  const buttons = $("quizArea").querySelectorAll(".quiz-option");
  buttons.forEach((b, i) => {
    b.classList.remove("right","wrong");
    if (i === idx) b.classList.add(correct ? "right" : "wrong");
    if (correct && i === ch.quiz.correct) b.classList.add("right");
  });
  if (correct) {
    fb.className = "quiz-feedback ok";
    fb.textContent = "✅ " + (currentLang === "de" ? "Richtig!" : "Correct!");
    completeChallenge(ch);
  } else {
    fb.className = "quiz-feedback err";
    fb.textContent = "❌ " + (currentLang === "de" ? "Versuch es nochmal." : "Try again.");
    state.errorsSeen++;
    soundError();
    saveState();
  }
}

function renderParsonsChallenge(ch) {
  $("btnCheck").hidden = false;
  $("btnRun").hidden = true;
  $("btnStep").hidden = true;
  $("btnSnippets").hidden = true;
  $("btnDownload").hidden = true;
  $("btnResetCode").hidden = true;
  $("btnShare").hidden = true;
  $("quizArea").hidden = true;
  $("quizArea").innerHTML = "";
  document.querySelector(".editor-card")?.classList.add("dimmed");

  const parsons = ch.parsons || {};
  const correct = parsons.lines || [];
  const distractors = parsons.distractors || [];
  const allItems = [...correct, ...distractors];
  // shuffle (deterministic per challenge id so users see same)
  const seed = Array.from(ch.id).reduce((a, c) => a + c.charCodeAt(0), 0);
  const shuffled = allItems.map((line, idx) => ({ line, key: ((idx + 1) * 9301 + seed * 49297) % 233280 }))
    .sort((a, b) => a.key - b.key)
    .map(x => x.line);

  const done = state.completed.includes(ch.id);
  const html = `
    <div class="parsons-cols">
      <div>
        <div class="parsons-label">${currentLang === "de" ? "Bausteine" : "Available lines"}</div>
        <ul class="parsons-list" id="parsonsBank"></ul>
      </div>
      <div>
        <div class="parsons-label">${currentLang === "de" ? "Deine Lösung" : "Your solution"}</div>
        <ul class="parsons-list parsons-target" id="parsonsTarget"></ul>
      </div>
    </div>
    <div class="parsons-feedback" id="parsonsFeedback"></div>
  `;
  const wrap = $("parsonsArea");
  wrap.hidden = false;
  wrap.innerHTML = html;

  const bank = $("parsonsBank");
  const target = $("parsonsTarget");
  shuffled.forEach((line, i) => {
    const li = document.createElement("li");
    li.className = "parsons-item";
    li.draggable = !done;
    li.dataset.line = line;
    li.textContent = line;
    li.addEventListener("click", () => {
      if (done) return;
      // toggle move bank <-> target
      const inBank = li.parentElement === bank;
      (inBank ? target : bank).appendChild(li);
    });
    li.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", line); e.dataTransfer.effectAllowed = "move"; li.classList.add("dragging"); });
    li.addEventListener("dragend",  () => li.classList.remove("dragging"));
    bank.appendChild(li);
  });
  [bank, target].forEach(list => {
    list.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
    list.addEventListener("drop", e => {
      e.preventDefault();
      const dragging = document.querySelector(".parsons-item.dragging");
      if (dragging) list.appendChild(dragging);
    });
  });
  // restore prior arrangement if completed
  if (done && Array.isArray(parsons.lines)) {
    target.innerHTML = "";
    correct.forEach(line => {
      const found = Array.from(bank.children).find(c => c.dataset.line === line);
      if (found) target.appendChild(found);
    });
  }
}

function checkParsons(ch) {
  const target = $("parsonsTarget");
  if (!target) return { pass: false, msg: t("noOutput") };
  const lines = Array.from(target.children).map(c => c.dataset.line);
  const correct = (ch.parsons?.lines || []);
  if (lines.length !== correct.length) {
    return { pass: false, msg: currentLang === "de" ? `Du brauchst genau ${correct.length} Zeilen.` : `You need exactly ${correct.length} lines.` };
  }
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== correct[i]) {
      return { pass: false, msg: currentLang === "de" ? `Zeile ${i+1} stimmt noch nicht.` : `Line ${i+1} is not right yet.` };
    }
  }
  return { pass: true, msg: currentLang === "de" ? "Perfekt zusammengesetzt!" : "Perfectly assembled!" };
}

function renderSandboxLesson() {
  $("chTitle").textContent = `\u{1f9ea} ${t("sandboxTitle")}`;
  $("chSubtitle").textContent = t("sandboxSubtitle");
  $("storyBanner").hidden = true;
  $("objectivesBox").hidden = true;
  $("chInstructions").innerHTML = `<p>${t("sandboxIntro")}</p>
<ul style="margin-top:8px;padding-left:18px">
  <li>${t("sandboxBullet1")}</li>
  <li>${t("sandboxBullet2")}</li>
  <li>${t("sandboxBullet3")}</li>
</ul>`;
  $("hintArea").innerHTML = "";
  const activeFile = SandboxFiles.active();
  const sandboxKey = "__sandbox_" + activeFile.id;
  if ($("codeArea").dataset.loaded !== sandboxKey) {
    Editor.setValue(activeFile.code || DEFAULT_STATE.sandbox.code);
    $("codeArea").dataset.loaded = sandboxKey;
  }
  SandboxFiles.render();
  $("btnPrev").hidden = true;
  $("btnNext").hidden = true;
  $("btnCheck").hidden = true;
  $("btnRun").hidden = false;
  $("btnStep").hidden = false;
  $("btnSnippets").hidden = false;
  $("btnDownload").hidden = false;
  $("btnResetCode").hidden = true;
  $("btnShare").hidden = false;
  // make sure alt UIs are hidden in sandbox
  $("quizArea").hidden = true; $("quizArea").innerHTML = "";
  $("parsonsArea").hidden = true; $("parsonsArea").innerHTML = "";
  document.querySelector(".editor-card")?.classList.remove("dimmed");
  document.querySelector(".lesson-card")?.classList.remove("boss-mode");
  $("bossBanner").hidden = true;
  if ($("taskTypePill")) $("taskTypePill").hidden = true;
  renderReference();
}

function renderReference() {
  const lvl = sandboxMode ? LEVELS.length - 1 : state.currentLevel;
  const refs = [
    `<h4>print()</h4><code>print("text")</code> &mdash; ${t("refPrint")}<br><code>print(f"Value: {x}")</code> &mdash; ${t("refFstringFmt")}`,
    `<h4>${t("refConditionals")}</h4><code>if x &gt; 0:</code> / <code>elif:</code> / <code>else:</code><br>Operators: <code>== != &lt; &gt; &lt;= &gt;= and or not</code>`,
    `<h4>${t("refLoops")}</h4><code>for i in range(n):</code><br><code>while condition:</code><br><code>break</code> / <code>continue</code>`,
    `<h4>${t("refFunctions")}</h4><code>def name(param=default):</code><br><code>return value</code>`,
    `<h4>${t("refLists")}</h4><code>lst = [1, 2, 3]</code><br><code>.append() .remove() .sort()</code><br><code>lst[0:3]</code> &mdash; ${t("refSlicing")}`,
    `<h4>${t("refDicts")}</h4><code>d = {"key": "val"}</code><br><code>d["key"]</code> ${t("refAccess")}<br><code>for k, v in d.items():</code>`,
    `<h4>${t("refStrings")}</h4><code>.split() .strip() .lower() .upper()</code><br><code>.startswith() .replace()</code><br><code>ord() chr()</code>`,
    `<h4>${t("refClasses")}</h4><code>class Name:</code><br><code>def __init__(self):</code><br><code>def __str__(self):</code>`,
    `<h4>${t("refInheritance")}</h4><code>class Child(Parent):</code><br><code>super().__init__()</code><br>${t("refOverrideMethods")}`,
    `<h4>${t("ref2DLists")}</h4><code>grid[row][col]</code><br><code>[[val]*cols for _ in range(rows)]</code>`,
    `<h4>${t("refAdvanced")}</h4><code>[x for x in lst if cond]</code><br><code>try: except:</code><br><code>lambda x: x*2</code>`,
    `<h4>${t("refEverything")}</h4>${t("refKnowItAll")}`,
  ];
  $("refContent").innerHTML = refs.slice(0, lvl + 1).join("<br>");
}

function renderProgress() {
  let html = "";
  LEVELS.forEach((level, li) => {
    const challenges = level.challenges;
    const doneCount = challenges.filter(c => state.completed.includes(c.id)).length;
    const allDone = doneCount === challenges.length;
    const isCurrent = li === state.currentLevel && !sandboxMode;
    const dotClass = allDone ? "done" : isCurrent ? "current" : "";
    const itemClass = isCurrent ? "active" : "";

    html += `<li class="level-item ${itemClass}" onclick="goToLevel(${li})" role="button" tabindex="0" aria-label="${t("level")} ${level.id}: ${tLevel(level)}">
      <span class="level-dot ${dotClass}"></span>
      <span style="flex:1">${level.id}. ${tLevel(level)}</span>
      <span style="font-size:11px;color:var(--muted)">${doneCount}/${challenges.length}</span>
    </li>`;

    if (isCurrent) {
      html += '<ul class="challenge-list">';
      challenges.forEach((ch, ci) => {
        const done = state.completed.includes(ch.id);
        const active = ci === state.currentChallenge;
        html += `<li class="ch-item ${done ? 'done' : ''} ${active ? 'active-ch' : ''}" onclick="goToChallenge(${li},${ci})" role="button" tabindex="0">
          <span class="ch-icon">${done ? '✓' : active ? '●' : '○'}</span>
          ${ch.id} ${tChTitle(ch)}
        </li>`;
      });
      html += '</ul>';
    }
  });
  $("levelList").innerHTML = html;

  // Achievements
  let achHTML = "";
  ACHIEVEMENTS.forEach(ach => {
    const unlocked = state.unlockedAchievements.includes(ach.id);
    const achDE = (currentLang === "de" && typeof ACHIEVEMENTS_DE !== "undefined") ? ACHIEVEMENTS_DE[ach.id] : null;
    const achName = achDE ? achDE.name : ach.name;
    const achDesc = achDE ? achDE.desc : ach.desc;
    achHTML += `<div class="achievement ${unlocked ? 'unlocked' : ''}" role="listitem" aria-label="${achName} ${unlocked ? t("unlocked") : t("locked")}">
      <span class="ach-icon">${unlocked ? ach.icon : '\u{1f512}'}</span>
      <div class="ach-info">
        <div class="ach-name">${achName}</div>
        <div class="ach-desc">${achDesc}</div>
      </div>
    </div>`;
  });
  $("achievementList").innerHTML = achHTML;
}

// ═══════════════════════════════════════════════════════════
//  PYTHON EXECUTION
// ═══════════════════════════════════════════════════════════
let skulptReady = typeof Sk !== "undefined";
let inputQueue = [];

function codeUsesTurtle(code) {
  return /\bimport\s+turtle\b|\bfrom\s+turtle\s+import\b/.test(code);
}
function prepareTurtleCanvas() {
  const ta = document.getElementById("turtleArea");
  if (!ta) return;
  ta.innerHTML = ""; // clear previous drawing
  document.getElementById("outTabTurtle").hidden = false;
  Sk.TurtleGraphics = Sk.TurtleGraphics || {};
  Sk.TurtleGraphics.target = "turtleArea";
  // size to available area at run-time
  const rect = ta.getBoundingClientRect();
  Sk.TurtleGraphics.width  = Math.max(280, Math.floor(rect.width  - 4));
  Sk.TurtleGraphics.height = Math.max(220, Math.floor(rect.height - 4));
}
function switchOutputTab(name) {
  const tabs = { text: "outputArea", turtle: "turtleArea", vars: "varsArea" };
  for (const [k, areaId] of Object.entries(tabs)) {
    const isActive = (k === name);
    const area = document.getElementById(areaId);
    if (area) area.hidden = !isActive;
    const btnId = "outTab" + k[0].toUpperCase() + k.slice(1);
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive);
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  VARIABLES INSPECTOR (after a run, peek at globals)
// ═══════════════════════════════════════════════════════════
function pyRepr(v) {
  if (v === undefined || v === null) return "None";
  try {
    if (typeof Sk !== "undefined" && Sk.misceval && typeof Sk.misceval.objectRepr === "function") {
      const r = Sk.misceval.objectRepr(v);
      return (r && typeof r.v === "string") ? r.v : String(r);
    }
  } catch (e) {}
  try {
    if (typeof Sk !== "undefined" && Sk.ffi && typeof Sk.ffi.remapToJs === "function") {
      const js = Sk.ffi.remapToJs(v);
      if (typeof js === "string") return JSON.stringify(js);
      return JSON.stringify(js);
    }
  } catch (e) {}
  return String(v);
}
function pyTypeName(v) {
  if (!v) return "?";
  if (v.tp$name) return v.tp$name;
  if (v.ob$type && v.ob$type.prototype && v.ob$type.prototype.tp$name) return v.ob$type.prototype.tp$name;
  return typeof v;
}
// Best-effort conversion of a Skulpt value to a JS structure for visual rendering.
// Returns null when we can't / shouldn't convert (functions, classes, …).
function tryRemap(v) {
  try {
    if (typeof Sk === "undefined" || !Sk.ffi || !Sk.ffi.remapToJs) return null;
    return Sk.ffi.remapToJs(v);
  } catch (e) { return null; }
}

function inspectVars(mod) {
  if (!mod) return [];
  const dict = mod.$d || mod.tp$dict || {};
  const out = [];
  for (const k in dict) {
    if (!Object.prototype.hasOwnProperty.call(dict, k)) continue;
    if (k.startsWith("__") && k.endsWith("__")) continue;
    // skip well-known builtins that may leak in
    if (["print","input","len","range","int","float","str","list","dict","tuple","set","bool","abs","min","max","sum","sorted","map","filter","enumerate","zip","type","repr","chr","ord","round"].includes(k)) continue;
    const v = dict[k];
    if (!v) continue;
    const type = pyTypeName(v);
    out.push({
      name: k,
      value: pyRepr(v),
      type,
      js: tryRemap(v),
      // attributes: for user-defined class instances, grab self.* fields
      attrs: pickInstanceAttrs(v),
    });
  }
  return out;
}

// For a user-defined class instance, return its instance dict ($d) as a JS map
// of { attrName: { repr, type } } — used for the "object" diagram.
function pickInstanceAttrs(v) {
  try {
    if (!v || !v.$d) return null;
    const t = pyTypeName(v);
    if (["int","float","str","bool","list","dict","tuple","set","NoneType","function","method","builtin_function_or_method","type"].includes(t)) return null;
    const attrs = {};
    for (const k in v.$d) {
      if (!Object.prototype.hasOwnProperty.call(v.$d, k)) continue;
      if (k.startsWith("__") && k.endsWith("__")) continue;
      attrs[k] = { repr: pyRepr(v.$d[k]), type: pyTypeName(v.$d[k]) };
    }
    return Object.keys(attrs).length ? attrs : null;
  } catch (e) { return null; }
}

function showVariables(vars) {
  const area = document.getElementById("varsArea");
  const tab  = document.getElementById("outTabVars");
  if (!area || !tab) return;
  if (!vars || vars.length === 0) {
    tab.hidden = true;
    area.innerHTML = "";
    return;
  }
  tab.hidden = false;
  area.innerHTML = renderVariablesDiagrams(vars);
}

// Render each variable as a visual "card" — list as boxed cells, dict as
// key-value rows, instance as an object box, primitives as compact pills.
function renderVariablesDiagrams(vars) {
  const isDE = currentLang === "de";
  const cards = vars.map(v => renderVarCard(v)).join("");
  return `<div class="vars-head">${isDE ? "Variablen nach dem Run" : "Variables after this run"}:</div>
          <div class="vars-grid">${cards}</div>`;
}

function renderVarCard(v) {
  if (Array.isArray(v.js)) return renderListCard(v);
  if (v.js && typeof v.js === "object" && v.type === "dict") return renderDictCard(v);
  if (v.attrs) return renderObjectCard(v);
  return renderPrimitiveCard(v);
}

// Wrap renderVarCard so the step debugger can mark variables that were just
// added or changed in the current step.
function renderVarCardWithDiff(v, diff) {
  const html = renderVarCard(v);
  if (!diff) return html;
  let mark = "";
  if (diff.added && diff.added.includes(v.name))   mark = " diff-added";
  else if (diff.changed && diff.changed.includes(v.name)) mark = " diff-changed";
  if (!mark) return html;
  return html.replace(/class="var-card/, `class="var-card${mark}`);
}

function renderPrimitiveCard(v) {
  const valColor = v.type === "str" ? "var-str"
                 : (v.type === "int" || v.type === "float") ? "var-num"
                 : (v.type === "bool" || v.type === "NoneType") ? "var-bool"
                 : "";
  return `<div class="var-card prim">
    <div class="var-card-head">
      <span class="var-name">${escapeHTML(v.name)}</span>
      <span class="var-type">${escapeHTML(v.type)}</span>
    </div>
    <div class="var-prim-value ${valColor}"><code>${escapeHTML(truncate(v.value, 90))}</code></div>
  </div>`;
}

function renderListCard(v) {
  const items = v.js || [];
  const cells = items.slice(0, 40).map((it, i) => {
    const repr = formatItem(it);
    return `<div class="list-cell">
      <div class="list-idx">${i}</div>
      <div class="list-val"><code>${escapeHTML(truncate(repr, 22))}</code></div>
    </div>`;
  }).join("");
  const overflow = items.length > 40 ? `<div class="list-cell more">+${items.length - 40}</div>` : "";
  return `<div class="var-card list-card">
    <div class="var-card-head">
      <span class="var-name">${escapeHTML(v.name)}</span>
      <span class="var-type">list · ${items.length}</span>
    </div>
    <div class="list-row">${cells}${overflow}</div>
  </div>`;
}

function renderDictCard(v) {
  const entries = Object.entries(v.js || {}).slice(0, 30);
  const rows = entries.map(([k, val]) =>
    `<div class="dict-row">
       <div class="dict-key"><code>${escapeHTML(truncate(formatItem(k), 24))}</code></div>
       <span class="dict-arrow">→</span>
       <div class="dict-val"><code>${escapeHTML(truncate(formatItem(val), 36))}</code></div>
     </div>`
  ).join("");
  const total = Object.keys(v.js || {}).length;
  const overflow = total > 30 ? `<div class="dict-more">+${total - 30} ${currentLang === "de" ? "weitere" : "more"}</div>` : "";
  return `<div class="var-card dict-card">
    <div class="var-card-head">
      <span class="var-name">${escapeHTML(v.name)}</span>
      <span class="var-type">dict · ${total}</span>
    </div>
    <div class="dict-body">${rows}${overflow}</div>
  </div>`;
}

function renderObjectCard(v) {
  const attrs = v.attrs || {};
  const rows = Object.entries(attrs).map(([k, info]) =>
    `<div class="obj-row">
       <div class="obj-attr">self.<b>${escapeHTML(k)}</b></div>
       <div class="obj-val"><code>${escapeHTML(truncate(info.repr, 40))}</code></div>
     </div>`
  ).join("");
  return `<div class="var-card obj-card">
    <div class="var-card-head">
      <span class="var-name">${escapeHTML(v.name)}</span>
      <span class="var-type obj-class">${escapeHTML(v.type)}</span>
    </div>
    <div class="obj-body">${rows}</div>
  </div>`;
}

function formatItem(x) {
  if (x === null || x === undefined) return "None";
  if (typeof x === "string") return `"${x}"`;
  if (typeof x === "boolean") return x ? "True" : "False";
  if (Array.isArray(x)) return `[${x.length}]`;
  if (typeof x === "object") return `{…}`;
  return String(x);
}

function truncate(s, n) { return (s && s.length > n) ? s.slice(0, n - 1) + "…" : (s || ""); }

// ═══════════════════════════════════════════════════════════
//  TIP OF THE DAY
// ═══════════════════════════════════════════════════════════
const TIPS = [
  { en: "Press Ctrl+Enter to run code instantly.",                                  de: "Drücke Strg+Enter, um Code blitzschnell auszuführen." },
  { en: "Stuck? Hints are not cheating!",                                           de: "Steckst du fest? Hinweise sind keine Schande!" },
  { en: "Try the 🧪 Sandbox (top of the editor) for free experimentation.",         de: "Probier den 🧪 Sandbox-Modus (oben am Editor) zum freien Experimentieren." },
  { en: "Never forget the colon (:) after if, for, def, and class.",                de: "Vergiss nie den Doppelpunkt (:) nach if, for, def und class." },
  { en: "Python is case-sensitive: Print() ≠ print()",                               de: "Python ist case-sensitive: Print() ≠ print()" },
  { en: "= assigns, == compares. Easy to mix up!",                                  de: "= ist Zuweisung, == ist Vergleich. Leicht zu verwechseln!" },
  { en: "Infinite loop? Maybe you forgot to update the counter?",                   de: "Endlosschleife? Vergessen, den Zähler zu erhöhen?" },
  { en: "List indices start at 0, not 1.",                                          de: "Listen-Index beginnt bei 0, nicht bei 1." },
  { en: 'f-strings are your friend: f"Hello {name}"',                               de: 'f-Strings sind dein Freund: f"Hallo {name}"' },
  { en: "Share code with classmates via the 🔗 Share button.",                      de: "Teile Code mit Mitschüler:innen über den 🔗 Teilen-Button." },
  { en: "Don't forget `self` as first parameter in class methods.",                 de: "Vergiss `self` nicht als ersten Parameter in Klassen-Methoden." },
  { en: "In Parsons puzzles you can drag OR just click lines to move them.",         de: "Bei Parsons-Puzzles kannst du Zeilen ziehen ODER einfach anklicken." },
  { en: "Teacher mode (🔒 bottom-right) shows solutions and didactic tips.",         de: "Im Lehrer-Modus (🔒 unten rechts) findest du Lösungen und didaktische Hinweise." },
  { en: "Try `import turtle` to draw graphics!",                                    de: "Probier `import turtle` für eine Zeichen-Spielwiese!" },
  { en: "Tab in the editor = 4 spaces, automatically.",                             de: "Tab im Editor = 4 Leerzeichen, automatisch." },
  { en: "return GIVES a value back. print only SHOWS it.",                           de: "return GIBT einen Wert zurück. print ZEIGT ihn nur an." },
  { en: "Press ? to see all keyboard shortcuts.",                                   de: "Drücke ?, um alle Tastatur-Shortcuts zu sehen." },
  { en: "Change the theme in Settings (⚙ at the top).",                             de: "Theme wechseln in den Einstellungen (⚙ oben)." },
  { en: "There are 4 task types: 💻 Code, 🧩 Parsons, 🐛 Bug-Hunt, ❓ Quiz.",         de: "Vier Aufgabentypen im Spiel: 💻 Code, 🧩 Parsons, 🐛 Bug-Jagd, ❓ Quiz." },
  { en: "Check Achievements — maybe one is almost unlocked!",                       de: "Schau dir die Achievements an — vielleicht ist eines schon fast erreicht!" },
  { en: "Your streak (🔥) grows when you run code on consecutive days.",             de: "Deine Streak (🔥) wächst, wenn du jeden Tag mindestens einmal Code ausführst." },
  { en: "Math precedence: 2 + 3 * 4 = 14, not 20.",                                 de: "Punkt-vor-Strich: 2 + 3 * 4 = 14, nicht 20." },
  { en: "When in doubt, add parentheses: (a + b) * c",                              de: "Im Zweifel: Klammern setzen: (a + b) * c" },
  { en: "Backup your progress: Settings → Export.",                                 de: "Speichere deinen Fortschritt als Backup: Einstellungen → Exportieren." },
  { en: "Boss-Battle = last challenge of each level (👑).",                          de: "Boss-Kampf = letzte Aufgabe jedes Levels (👑)." },
  { en: "Each run shows globals in the 🔍 Vars tab — great for debugging!",          de: "Jeder Run zeigt globale Variablen im 🔍 Vars-Tab — super zum Debuggen!" },
  { en: "Need bigger text? Settings → Text size → L.",                              de: "Größere Schrift? Einstellungen → Schriftgröße → L." },
  { en: "Print intermediate values to understand what's happening.",                 de: "Gib Zwischenwerte aus, um zu verstehen, was passiert." },
  { en: "Variables can be reassigned: x = 5, then x = x + 1.",                      de: "Variablen kann man neu zuweisen: x = 5, dann x = x + 1." },
  { en: "Dictionaries look things up by name, not by position.",                    de: "Dictionaries suchen nach Namen — nicht nach Position." },
];
function tipOfTheDay() {
  const startKey = "pyforge_first_visit";
  let start = parseInt(localStorage.getItem(startKey), 10);
  if (!Number.isFinite(start)) {
    start = Date.now();
    try { localStorage.setItem(startKey, String(start)); } catch (e) {}
  }
  const dayIdx = Math.floor((Date.now() - start) / (24 * 3600 * 1000));
  const tip = TIPS[Math.abs(dayIdx) % TIPS.length];
  return currentLang === "de" ? tip.de : tip.en;
}

// ═══════════════════════════════════════════════════════════
//  VOICE READER (Web Speech API — a11y)
// ═══════════════════════════════════════════════════════════
const Voice = {
  available() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  },
  cleanForSpeech(html) {
    if (!html) return "";
    let txt = String(html)
      .replace(/<\s*br\s*\/?\s*>/gi, ". ")
      .replace(/<\/p>\s*<p>/gi, ". ")
      .replace(/<li>/gi, "; ")
      .replace(/<\/li>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return txt;
  },
  speak(text) {
    if (!this.available()) {
      toast(`⚠️ ${currentLang === "de" ? "Vorlesen wird vom Browser nicht unterstützt" : "Speech not supported in this browser"}`, { kind: "error" });
      return;
    }
    const clean = this.cleanForSpeech(text);
    if (!clean) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = currentLang === "de" ? "de-DE" : "en-US";
    u.rate = state.settings?.voiceRate || 0.95;
    u.pitch = 1.0;
    // pick user-selected voice if available
    if (state.settings?.voiceURI) {
      const voices = speechSynthesis.getVoices();
      const chosen = voices.find(v => v.voiceURI === state.settings.voiceURI);
      if (chosen) u.voice = chosen;
    }
    u.onend   = () => { this._speaking = null; this._refreshButtons(); };
    u.onerror = () => { this._speaking = null; this._refreshButtons(); };
    this._speaking = u;
    speechSynthesis.speak(u);
    this._refreshButtons();
  },
  stop() {
    if (!this.available()) return;
    speechSynthesis.cancel();
    this._speaking = null;
    this._refreshButtons();
  },
  toggle(text) {
    if (this._speaking) this.stop();
    else this.speak(text);
  },
  _speaking: null,
  _refreshButtons() {
    document.querySelectorAll(".speak-btn").forEach(b => {
      b.classList.toggle("speaking", !!this._speaking);
      b.title = this._speaking
        ? (currentLang === "de" ? "Stoppen" : "Stop")
        : (currentLang === "de" ? "Vorlesen" : "Read aloud");
    });
  },
};

function populateVoiceOptions() {
  const select = $("setVoice");
  if (!select || !Voice.available()) return;
  const voices = speechSynthesis.getVoices() || [];
  const langPrefix = currentLang === "de" ? "de" : "en";
  // Filter to voices that match the current UI lang first, then fall back to all
  let filtered = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
  if (filtered.length === 0) filtered = voices;
  const placeholder = currentLang === "de" ? "— automatisch —" : "— auto —";
  select.innerHTML = `<option value="">${placeholder}</option>` +
    filtered.map(v =>
      `<option value="${escapeHTML(v.voiceURI)}">${escapeHTML(v.name)} (${escapeHTML(v.lang)})</option>`
    ).join("");
  select.value = state.settings?.voiceURI || "";
}

// Read the current challenge's title + instructions + already-revealed hints.
function speakCurrentLesson() {
  const ch = getCurrentChallenge();
  if (!ch) return;
  const title = `${tChTitle(ch)}.`;
  const instr = tChInstructions(ch);
  const revealedHints = ((tChHints(ch) || []).slice(0, state.hintsUsed[ch.id] || 0)).join(". ");
  Voice.toggle(`${title} ${instr} ${revealedHints}`);
}

// Refresh ALL welcome-modal strings in the current language, independent of
// renderHeader. Called at init and whenever the language is switched, so the
// title/buttons and the tip/daily banners always agree on one language.
function refreshWelcomeModalI18n() {
  if ($("welcomeTitle"))   $("welcomeTitle").textContent   = t("welcomeTitle");
  if ($("welcomeText"))    $("welcomeText").textContent    = t("welcomeText");
  if ($("welcomeSubtext")) $("welcomeSubtext").textContent = t("welcomeSubtext");
  if ($("btnStart"))       $("btnStart").textContent       = t("btnStart");
  if ($("btnContinue"))    $("btnContinue").textContent    = t("btnContinue");
  if ($("btnReset2"))      $("btnReset2").textContent      = t("btnResetProgress");
  if ($("btnImportSave"))  $("btnImportSave").textContent  = t("importSave");
  if ($("btnSpeedrun"))    $("btnSpeedrun").innerHTML       = "\u{1f3c3} Speedrun";
  const wm = $("welcomeModal");
  if (wm && !wm.hidden) { showTipOnWelcome(); showDailyOnWelcome(); }
}

function showTipOnWelcome() {
  const banner = document.getElementById("tipBanner");
  if (!banner) return;
  document.getElementById("tipHead").textContent = t("tipOfTheDay");
  document.getElementById("tipBody").textContent = tipOfTheDay();
  banner.hidden = false;
}

function runPython(code, isCheck) {
  return new Promise((resolve, reject) => {
    if (!skulptReady) {
      reject(new Error(t("interpreterLoading")));
      return;
    }
    let output = "";
    inputQueue = [];

    const usesTurtle = codeUsesTurtle(code);
    if (usesTurtle) prepareTurtleCanvas();
    else document.getElementById("outTabTurtle").hidden = true;

    Sk.configure({
      output: function(text) { output += text; },
      read: function(x) {
        if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
          throw "File not found: '" + x + "'";
        return Sk.builtinFiles["files"][x];
      },
      inputfun: function(prompt) {
        if (inputQueue.length > 0) return inputQueue.shift();
        const val = window.prompt(prompt || "Input:");
        return val === null ? "" : val;
      },
      inputfunTakesPrompt: true,
      __future__: Sk.python3,
      execLimit: usesTurtle ? 30000 : 10000,
    });

    Sk.misceval.asyncToPromise(function() {
      return Sk.importMainWithBody("<stdin>", false, code, true);
    }).then(function(mod) {
      if (usesTurtle) switchOutputTab("turtle");
      resolve({ output, mod });
    }).catch(function(err) {
      if (usesTurtle) switchOutputTab("turtle"); // partial drawings stay visible
      reject(err);
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  FRIENDLY ERROR TRANSLATION
// ═══════════════════════════════════════════════════════════
function friendlyError(errStr, code) {
  const raw = String(errStr);
  const isDE = currentLang === "de";
  const lineMatch = raw.match(/line\s+(\d+)/i);
  const lineHint = lineMatch ? ` (${isDE ? "Zeile" : "line"} ${lineMatch[1]})` : "";

  const rules = [
    { re: /SyntaxError.*EOL while scanning string literal/i, msg: isDE ? "Es fehlt ein schließendes Anführungszeichen \" am Ende deines Strings." : "A closing quote \" is missing at the end of your string." },
    { re: /SyntaxError.*invalid syntax/i,                   msg: isDE ? "Syntaxfehler. Prüfe Klammern, Doppelpunkte (:) und Schreibweisen." : "Syntax error. Check brackets, colons (:) and spelling." },
    { re: /SyntaxError.*unexpected indent/i,                msg: isDE ? "Eine Zeile ist zu weit eingerückt. Achte auf 4 Leerzeichen pro Ebene." : "A line is indented too far. Use 4 spaces per level." },
    { re: /SyntaxError.*expected an indented block/i,       msg: isDE ? "Nach einem Doppelpunkt (z. B. if/for/def) muss eingerückter Code folgen." : "Indented code must follow a colon (if/for/def)." },
    { re: /NameError.*name '([^']+)' is not defined/i,      msg: (m) => isDE ? `Die Variable oder Funktion '${m[1]}' ist nicht definiert. Tippfehler? Vergessen, einen Wert zuzuweisen?` : `The name '${m[1]}' is not defined. Typo or missing assignment?` },
    { re: /TypeError.*unsupported operand type/i,           msg: isDE ? "Du versuchst, unterschiedliche Typen zu kombinieren (z. B. Text + Zahl). Nutze str() oder int()." : "You're mixing incompatible types (e.g. text + number). Use str() or int()." },
    { re: /TypeError.*can only concatenate str.*not "int"/i,msg: isDE ? "Strings und Zahlen kannst du nicht direkt mit + verbinden. Versuche f-Strings: f\"...{x}...\"" : "Can't add str and int directly. Use an f-string: f\"...{x}...\"" },
    { re: /TypeError.*'int' object is not iterable/i,       msg: isDE ? "Eine Zahl ist nicht 'durchlaufbar'. Nutze range(n) statt n in einer Schleife." : "A number isn't iterable. Use range(n) instead of n in a loop." },
    { re: /TypeError.*missing \d+ required positional argument/i, msg: isDE ? "Deinem Funktionsaufruf fehlt ein Argument." : "Your function call is missing an argument." },
    { re: /IndexError.*list index out of range/i,           msg: isDE ? "Du greifst auf ein Listenelement zu, das nicht existiert. Index startet bei 0." : "You're accessing a list item that doesn't exist. Indexing starts at 0." },
    { re: /KeyError: '?([^'\n]+)'?/i,                       msg: (m) => isDE ? `Der Schlüssel '${m[1]}' existiert nicht im Dictionary. Nutze .get(key, default)?` : `Key '${m[1]}' doesn't exist in the dictionary. Try .get(key, default)?` },
    { re: /ZeroDivisionError/i,                             msg: isDE ? "Division durch 0 ist nicht erlaubt. Prüfe den Nenner mit if." : "Division by zero is not allowed. Check the divisor with if." },
    { re: /ValueError.*invalid literal for int/i,           msg: isDE ? "Der Text lässt sich nicht in eine Zahl umwandeln. Prüfe die Eingabe." : "This text can't be converted to a number. Check the input." },
    { re: /AttributeError.*'(\w+)' object has no attribute '(\w+)'/i, msg: (m) => isDE ? `Ein '${m[1]}'-Objekt hat keine Methode '${m[2]}'. Tippfehler?` : `'${m[1]}' has no '${m[2]}'. Typo?` },
    { re: /IndentationError/i,                              msg: isDE ? "Einrückungs-Fehler. Mische niemals Tabs und Leerzeichen." : "Indentation error. Never mix tabs and spaces." },
    { re: /ExternalError: TimeLimitError/i,                 msg: isDE ? "Dein Programm braucht zu lange. Endlosschleife? Prüfe deine while-Bedingung." : "Your program is too slow. Infinite loop? Check your while condition." },
  ];

  for (const r of rules) {
    const m = raw.match(r.re);
    if (m) {
      const head = typeof r.msg === "function" ? r.msg(m) : r.msg;
      return `\u{1f4a1} ${head}${lineHint}\n\n${isDE ? "Technischer Fehler" : "Technical error"}: ${raw}`;
    }
  }
  return raw;
}

// ═══════════════════════════════════════════════════════════
//  SOUND (WebAudio, no files)
// ═══════════════════════════════════════════════════════════
let audioCtx = null;
function beep(freq, duration, type = "sine", gain = 0.05) {
  if (!state.settings?.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    o.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}
function soundSuccess() {
  beep(660, 0.12, "sine", 0.08);
  setTimeout(() => beep(880, 0.18, "sine", 0.08), 110);
}
function soundError()  { beep(180, 0.18, "square", 0.04); }
function soundAchievement() {
  beep(523, 0.1, "triangle", 0.06);
  setTimeout(() => beep(659, 0.1, "triangle", 0.06), 90);
  setTimeout(() => beep(784, 0.18, "triangle", 0.07), 180);
}
function soundLevelUp() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.15, "triangle", 0.07), i * 90));
}

// ═══════════════════════════════════════════════════════════
//  TOAST + CONFETTI
// ═══════════════════════════════════════════════════════════
function toast(html, opts = {}) {
  const container = $("toastContainer") || (() => {
    const c = document.createElement("div");
    c.id = "toastContainer";
    document.body.appendChild(c);
    return c;
  })();
  const el = document.createElement("div");
  el.className = "toast " + (opts.kind || "info");
  el.innerHTML = html;
  el.setAttribute("role", "status");
  container.appendChild(el);
  // animate in
  requestAnimationFrame(() => el.classList.add("show"));
  const ttl = opts.ttl || 3500;
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
  }, ttl);
}

function confetti() {
  if (!state.settings?.confetti) return;
  if (state.settings?.reducedMotion) return;
  const canvas = $("confettiCanvas");
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.hidden = false;
  const ctx = canvas.getContext("2d");
  const colors = ["#7cf4b0", "#ffcf5a", "#ff6b6b", "#64b4ff", "#c084fc"];
  const N = 140;
  const pieces = [];
  for (let i = 0; i < N; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of pieces) {
      p.vy += 0.05;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y < canvas.height + 40) alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.5);
      ctx.restore();
    }
    if (alive > 0 && frame < 400) requestAnimationFrame(tick);
    else { canvas.hidden = true; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  tick();
}

// ═══════════════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════════════
async function handleRun() {
  const code = Editor.getValue();
  const outEl = $("outputArea");
  outEl.innerHTML = `<span class="info">${t("running")}</span>`;
  switchOutputTab("text");
  state.runCount = (state.runCount || 0) + 1;
  bumpStreak();
  if (sandboxMode) SandboxFiles.saveActiveCode(code);
  const chBefore = sandboxMode ? null : getCurrentChallenge();
  try {
    const { output, mod } = await runPython(code, false);
    outEl.innerHTML = escapeHTML(output) || `<span class="info">${t("noOutput")}</span>`;
    showVariables(inspectVars(mod));
  } catch(err) {
    outEl.innerHTML = `<span class="err">${escapeHTML(friendlyError(err, code))}</span>`;
    showVariables([]);
    soundError();
    state.errorsSeen++;
    saveState();
  }
  if (chBefore) saveChallengeOutput(chBefore.id, outEl.innerHTML);
}

async function handleCheck() {
  if (sandboxMode) return;
  const ch = getCurrentChallenge();
  if (!ch) return;

  const type = ch.type || "code";

  // Parsons: check arrangement, no code execution
  if (type === "parsons") {
    const result = checkParsons(ch);
    const fb = $("parsonsFeedback");
    if (result.pass) {
      if (fb) { fb.className = "parsons-feedback ok"; fb.textContent = "✅ " + result.msg; }
      completeChallenge(ch);
    } else {
      if (fb) { fb.className = "parsons-feedback err"; fb.textContent = "❌ " + result.msg; }
      if (state.errorsSeen > 0) state.errorFixCount++;
      state.errorsSeen++;
      soundError();
      adaptiveHintNudge(ch);
      saveState();
    }
    return;
  }

  // Output-quiz uses its own button handler — no manual check
  if (type === "output_quiz") return;

  // code / bug_hunt: run Python and validate via ch.check(output, code)
  const code = Editor.getValue();
  const outEl = $("outputArea");
  outEl.innerHTML = `<span class="info">${t("checking")}</span>`;
  switchOutputTab("text");

  try {
    const { output, mod } = await runPython(code, true);
    const result = ch.check.length >= 2 ? ch.check(output, code) : ch.check(output);
    showVariables(inspectVars(mod));

    if (result.pass) {
      outEl.innerHTML = escapeHTML(output) + `\n\n<span class="ok">✅ ${escapeHTML(result.msg)}</span>`;
      // Save code + output for THIS task before any auto-advance kicks in,
      // so revisiting it later shows exactly this state.
      saveChallengeOutput(ch.id, outEl.innerHTML);
      saveCurrentChallengeCode(code);
      completeChallenge(ch);
    } else {
      outEl.innerHTML = escapeHTML(output) + `\n\n<span class="err">❌ ${escapeHTML(result.msg)}</span>`;
      if (state.errorsSeen > 0) state.errorFixCount++;
      state.errorsSeen++;
      soundError();
      adaptiveHintNudge(ch);
      saveChallengeOutput(ch.id, outEl.innerHTML);
    }
  } catch(err) {
    outEl.innerHTML = `<span class="err">${escapeHTML(friendlyError(err, code))}</span>`;
    showVariables([]);
    state.errorsSeen++;
    soundError();
    saveChallengeOutput(ch.id, outEl.innerHTML);
  }
  saveState();
}

// Auto-reveal next hint after every 3rd failed attempt for a single challenge.
// Keeps students from being stuck silently. Only nudges if the student hasn't
// already revealed all hints.
function adaptiveHintNudge(ch) {
  if (!ch || !ch.hints || ch.hints.length === 0) return;
  if (!state.attemptsByChallenge) state.attemptsByChallenge = {};
  state.attemptsByChallenge[ch.id] = (state.attemptsByChallenge[ch.id] || 0) + 1;
  const tries = state.attemptsByChallenge[ch.id];
  const usedHints = state.hintsUsed[ch.id] || 0;
  if (tries >= 3 && tries % 3 === 0 && usedHints < ch.hints.length) {
    state.hintsUsed[ch.id] = usedHints + 1;
    saveState();
    renderLesson();
    const hint = (tChHints(ch) || [])[usedHints];
    if (hint) toast(`\u{1f4a1} <b>${currentLang === "de" ? "Hinweis automatisch geöffnet" : "Hint auto-revealed"}</b><br>${escapeHTML(hint)}`, { kind: "info", ttl: 6000 });
  }
}

function completeChallenge(ch) {
  const alreadyDone = state.completed.includes(ch.id);
  const lvl = LEVELS[state.currentLevel];
  const isBoss = lvl.challenges.indexOf(ch) === lvl.challenges.length - 1;

  if (!alreadyDone) {
    state.completed.push(ch.id);
    state.xp += ch.xp;
    bumpStreak();
    // Track which Python concepts the student's solution actually used.
    // Skips parsons/quiz where Editor.getValue() isn't the solution.
    const type = ch.type || "code";
    if (type === "code" || type === "bug_hunt") {
      trackConceptsFromCode(Editor.getValue());
    }
  }

  // Speedrun advances on every solved task (even repeats during a run)
  if (state.speedrun) Speedrun.onSolved(ch.id);

  soundSuccess();

  // Auto-advance to the next task shortly after the success message. Fires on
  // EVERY successful check — first time or a repeat — so revisiting and
  // re-solving a task also moves you on. Skipped during a speedrun (it drives
  // its own navigation) and on the last task of a level (so the level-complete
  // celebration / cutscene can play first).
  if (!state.speedrun && !isBoss) {
    const fromLevel = state.currentLevel;
    const fromChallenge = state.currentChallenge;
    setTimeout(() => {
      // Only advance if the student is still on the task they just solved
      // (they may have clicked elsewhere in the sidebar in the meantime).
      if (!state.speedrun &&
          state.currentLevel === fromLevel &&
          state.currentChallenge === fromChallenge) {
        goNext();
      }
    }, 1500);
  }

  // Everything below is first-completion only (XP rewards already added above).
  if (alreadyDone) { saveState(); renderAll(); return; }

  if (!state.hintsUsed[ch.id] || state.hintsUsed[ch.id] === 0) {
    state.hintFreeCount = (state.hintFreeCount || 0) + 1;
  }

  showXPFloat(ch.xp);
  checkAchievements();

  if (isBoss && lvl.challenges.length > 1) {
    setTimeout(() => {
      confetti();
      soundLevelUp();
      toast(`\u{1f451} <b>${t("bossDefeated")}</b><br>${tLevel(lvl)}`, { kind: "achievement", ttl: 4500 });
    }, 300);
  }

  // Level finished?
  const allDone = lvl.challenges.every(c => state.completed.includes(c.id));
  if (allDone) {
    setTimeout(() => {
      if (!isBoss) confetti();
      if (!isBoss) soundLevelUp();
      toast(`\u{1f389} <b>${t("levelComplete")}</b><br>${tLevel(lvl)}`, { kind: "success", ttl: 4500 });
      // Story cutscene first (if any), then reflection
      Cutscene.maybePlayForLevel(lvl.id, () => maybeAskReflection(lvl.id));
    }, 700);
  }

  saveState();
  renderAll();
}

function showXPFloat(xp) {
  if (state.settings?.reducedMotion) {
    toast(`+${xp} XP`, { kind: "success", ttl: 1500 });
    return;
  }
  const el = document.createElement("div");
  el.className = "xp-float";
  el.textContent = `+${xp} XP`;
  el.style.left = "50%";
  el.style.top = "40%";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function checkAchievements() {
  ACHIEVEMENTS.forEach(ach => {
    if (!state.unlockedAchievements.includes(ach.id) && ach.check(state)) {
      state.unlockedAchievements.push(ach.id);
      const achDE = currentLang === "de" && typeof ACHIEVEMENTS_DE !== "undefined" ? ACHIEVEMENTS_DE[ach.id] : null;
      const name = achDE ? achDE.name : ach.name;
      const desc = achDE ? achDE.desc : ach.desc;
      soundAchievement();
      if (state.settings?.voiceAnnounce && typeof Voice !== "undefined") {
        const prefix = currentLang === "de" ? "Erfolg freigeschaltet: " : "Achievement unlocked: ";
        Voice.speak(prefix + name);
      }
      toast(
        `<div class="toast-ach">
          <div class="toast-ach-icon">${ach.icon}</div>
          <div class="toast-ach-body">
            <div class="toast-ach-head">\u{1f3c6} ${t("achievementUnlocked")}</div>
            <div class="toast-ach-name">${escapeHTML(name)}</div>
            <div class="toast-ach-desc">${escapeHTML(desc)}</div>
          </div>
        </div>`,
        { kind: "achievement", ttl: 5000 }
      );
    }
  });
}

function revealHint() {
  const ch = getCurrentChallenge();
  if (!ch) return;
  state.hintsUsed[ch.id] = (state.hintsUsed[ch.id] || 0) + 1;
  saveState();
  renderLesson();
}

function handleDownload() {
  const code = Editor.getValue();
  let filename;
  if (sandboxMode) {
    filename = "sandbox.py";
  } else {
    const ch = getCurrentChallenge();
    if (!ch) return;
    const slug = ch.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    filename = `challenge_${ch.id}_${slug}.py`;
  }
  const blob = new Blob([code], { type: "text/x-python" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
//  URL CODE SHARING
// ═══════════════════════════════════════════════════════════
function b64encodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64decodeUtf8(str) {
  try { return decodeURIComponent(escape(atob(str))); } catch(e) { return null; }
}
function handleShare() {
  const code = Editor.getValue();
  if (!code.trim()) {
    toast(`⚠️ ${currentLang === "de" ? "Kein Code zum Teilen." : "No code to share."}`, { kind: "error" });
    return;
  }
  const encoded = b64encodeUtf8(code);
  if (encoded.length > 5000) {
    toast(`⚠️ ${currentLang === "de" ? "Code ist zu lang für eine URL." : "Code too long for a URL."}`, { kind: "error" });
    return;
  }
  const url = location.origin + location.pathname + "#code=" + encoded;
  openShareModal(url);
}

function openShareModal(url) {
  const isDE = currentLang === "de";
  $("shareTitle").textContent  = isDE ? "🔗 Code teilen" : "🔗 Share code";
  $("shareIntro").textContent  = isDE
    ? "QR-Code mit dem Handy scannen — oder den Link direkt verschicken."
    : "Scan the QR code with a phone, or share the link directly.";
  $("shareCopyBtn").textContent  = isDE ? "📋 Link kopieren" : "📋 Copy link";
  $("shareCloseBtn").textContent = t("close");
  $("shareUrlText").value = url;
  // Render QR code (uses qrcodejs from CDN; falls back to URL-only if missing)
  const qrEl = $("shareQr");
  qrEl.innerHTML = "";
  if (typeof QRCode !== "undefined") {
    try {
      new QRCode(qrEl, {
        text: url,
        width: 220, height: 220,
        correctLevel: QRCode.CorrectLevel.M,
      });
    } catch (e) {
      qrEl.innerHTML = `<div class="qr-fallback">${isDE ? "QR-Code konnte nicht erstellt werden." : "QR could not be generated."}</div>`;
    }
  } else {
    qrEl.innerHTML = `<div class="qr-fallback">${isDE ? "QR-Bibliothek nicht geladen (Internet?)." : "QR library not loaded (no internet?)."}</div>`;
  }
  $("shareModal").hidden = false;
}

function fallbackPrompt(url) {
  window.prompt(currentLang === "de" ? "Link kopieren:" : "Copy link:", url);
}
function maybeLoadSnippetFromURL() {
  const hash = location.hash;
  if (!hash.startsWith("#snippet=")) return;
  try {
    const params = new URLSearchParams(hash.substring(9));
    const name = params.get("name") || (currentLang === "de" ? "Geteilt" : "Shared");
    const encoded = params.get("code");
    if (!encoded) return;
    const code = b64decodeUtf8(encoded);
    if (!code) return;
    const list = Snippets.userList();
    list.push({ id: "u" + Date.now().toString(36), title: name, code });
    Snippets.saveUserList(list);
    state.savedSnippets = list.length;
    saveState();
    checkAchievements();
    history.replaceState(null, "", location.pathname);
    setTimeout(() => {
      Snippets.open();
      Snippets.setTab("mine");
      toast(`📥 <b>${currentLang === "de" ? "Snippet importiert" : "Snippet imported"}</b><br>${escapeHTML(name)}`, { kind: "success", ttl: 4500 });
    }, 300);
  } catch (e) {
    toast(`⚠️ ${currentLang === "de" ? "Ungültiger Snippet-Link" : "Invalid snippet link"}`, { kind: "error" });
  }
}

function maybeLoadCodeFromURL() {
  const hash = location.hash;
  if (!hash.startsWith("#code=")) return;
  const decoded = b64decodeUtf8(hash.substring(6));
  if (!decoded) return;
  // load shared code into a new sandbox tab
  SandboxFiles.ensure();
  state.sandboxFiles.files.push({
    id: "f" + Date.now().toString(36),
    name: "shared.py",
    code: decoded,
  });
  state.sandboxFiles.active = state.sandboxFiles.files.length - 1;
  state.sandbox.code = decoded;
  saveState();
  sandboxMode = true;
  // clear hash so refresh doesn't re-trigger
  history.replaceState(null, "", location.pathname);
  toast(`\u{1f517} <b>${currentLang === "de" ? "Geteilter Code geladen" : "Shared code loaded"}</b><br>${currentLang === "de" ? "Du bist jetzt im Sandbox-Modus." : "You're now in sandbox mode."}`, { kind: "success", ttl: 4500 });
}

// ═══════════════════════════════════════════════════════════
//  STEP-BY-STEP DEBUGGER
// ═══════════════════════════════════════════════════════════
const Stepper = {
  snapshots: [],
  current: 0,

  // Split code into top-level statements. A new block begins on a non-indented,
  // non-blank line. Comments and blank lines glue to the next statement.
  splitTopLevel(code) {
    const lines = code.split("\n");
    const blocks = [];
    let current = [];
    for (const line of lines) {
      const isNewStart = current.length > 0 && /^\S/.test(line) && line.trim().length > 0;
      if (isNewStart) {
        blocks.push(current.join("\n"));
        current = [];
      }
      current.push(line);
    }
    if (current.length > 0) blocks.push(current.join("\n"));
    return blocks
      .map(b => b.replace(/\s+$/, ""))
      .filter(b => b.trim().length > 0 && !b.split("\n").every(l => !l.trim() || l.trim().startsWith("#")));
  },

  // Detect `for X in range(N):` and `for X in [literal_list]:` and expand
  // into sub-versions so the step debugger can replay each iteration.
  // Returns { versions: [string], counter, totalIter } or null for
  // unrecognised loops (while, dynamic iterables, etc — stay atomic).
  maybeExpandLoop(block) {
    // Form 1: range(N)
    const mR = block.match(/^for\s+(\w+)\s+in\s+range\s*\(\s*(\d+)\s*\)\s*:/);
    if (mR) {
      const N = parseInt(mR[2], 10);
      if (!Number.isFinite(N) || N < 2 || N > 20) return null;
      const counter = mR[1];
      const versions = [];
      for (let i = 0; i <= N; i++) {
        versions.push(block.replace(/range\s*\(\s*\d+\s*\)/, `range(${i})`));
      }
      return { versions, counter, totalIter: N };
    }
    // Form 2: [literal_list] (no nested [] / {} for safety)
    const mL = block.match(/^for\s+(\w+)\s+in\s+(\[[^\[\]{}\n]*\])\s*:/);
    if (mL) {
      const counter = mL[1];
      const literal = mL[2];
      const items = literal.slice(1, -1).split(",").map(s => s.trim()).filter(s => s.length > 0);
      if (items.length < 2 || items.length > 15) return null;
      const versions = [];
      for (let i = 0; i <= items.length; i++) {
        const sub = "[" + items.slice(0, i).join(", ") + "]";
        const idx = block.indexOf(literal);
        versions.push(block.slice(0, idx) + sub + block.slice(idx + literal.length));
      }
      return { versions, counter, totalIter: items.length };
    }
    return null;
  },

  // Pre-compute the full list of execution steps (each step has a code to run
  // and metadata about whether it represents a loop iteration).
  buildSteps(blocks) {
    const steps = [];
    for (let i = 0; i < blocks.length; i++) {
      const displayBlock = blocks[i];
      const exp = this.maybeExpandLoop(displayBlock);
      if (exp) {
        for (let j = 0; j < exp.versions.length; j++) {
          steps.push({
            execBlock: exp.versions[j],
            displayBlock,
            loopIter: j,
            loopTotal: exp.totalIter,
            loopCounter: exp.counter,
            isLoopLast: (j === exp.versions.length - 1),
          });
        }
      } else {
        steps.push({ execBlock: displayBlock, displayBlock });
      }
    }
    return steps;
  },

  async run(code) {
    const blocks = this.splitTopLevel(code);
    if (blocks.length === 0) {
      toast(`⚠️ ${currentLang === "de" ? "Kein Code zum Steppen" : "No code to step through"}`, { kind: "error" });
      return;
    }
    const steps = this.buildSteps(blocks);
    if (steps.length > 60) {
      if (!confirm(currentLang === "de"
        ? `Dein Programm hat ${steps.length} Schritte — das kann etwas dauern. Trotzdem fortfahren?`
        : `Your program has ${steps.length} steps — this may take a moment. Continue?`)) return;
    }
    const snapshots = [];
    let stable = "";       // resolved code prefix that won't change
    let lastOutput = "";
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      // The code we'll actually run: resolved prefix + this step's execBlock.
      const toRun = stable ? (stable + "\n" + s.execBlock) : s.execBlock;
      try {
        const { output, mod } = await runPython(toRun, false);
        const vars = inspectVars(mod);
        const newOutput = output.startsWith(lastOutput) ? output.slice(lastOutput.length) : output;
        snapshots.push({
          step: i + 1,
          totalSteps: steps.length,
          block: s.displayBlock,
          codeSoFar: stable ? (stable + "\n" + s.displayBlock) : s.displayBlock,
          vars,
          output,
          newOutput,
          loopIter: s.loopIter,
          loopTotal: s.loopTotal,
          loopCounter: s.loopCounter,
          error: null,
        });
        lastOutput = output;
        // Promote into stable: for non-loop steps every step, for loop steps
        // only after the last iteration (so subsequent steps see the loop run
        // fully, not the partial range(j) version).
        if (s.loopIter === undefined || s.isLoopLast) {
          stable = stable ? (stable + "\n" + s.displayBlock) : s.displayBlock;
        }
      } catch (e) {
        snapshots.push({
          step: i + 1,
          totalSteps: steps.length,
          block: s.displayBlock,
          codeSoFar: stable ? (stable + "\n" + s.displayBlock) : s.displayBlock,
          vars: [],
          output: lastOutput,
          newOutput: "",
          loopIter: s.loopIter,
          loopTotal: s.loopTotal,
          loopCounter: s.loopCounter,
          error: String(e),
        });
        break;
      }
    }
    this.snapshots = snapshots;
    // Compute per-step diff vs. previous step (added / changed names)
    for (let i = 0; i < snapshots.length; i++) {
      const prev = i > 0 ? snapshots[i - 1].vars : [];
      const curr = snapshots[i].vars;
      const prevMap = Object.fromEntries(prev.map(v => [v.name, v.value]));
      const added = [], changed = [];
      for (const v of curr) {
        if (!(v.name in prevMap)) added.push(v.name);
        else if (prevMap[v.name] !== v.value) changed.push(v.name);
      }
      snapshots[i].diff = { added, changed };
    }
    this.current = 0;
    this.open();
  },

  open() {
    if (this.snapshots.length === 0) return;
    const isDE = currentLang === "de";
    $("stepTitle").textContent = isDE ? "Schritt für Schritt" : "Step through";
    $("stepCodeTitle").textContent = isDE ? "Code bis hier" : "Code so far";
    $("stepVarsTitle").textContent = isDE ? "Variablen jetzt" : "Variables now";
    $("stepOutputTitle").textContent = isDE ? "Ausgabe bis hier" : "Output so far";
    $("stepPrev").textContent = isDE ? "◀ Zurück" : "◀ Prev";
    $("stepNext").textContent = isDE ? "Weiter ▶" : "Next ▶";
    $("stepSlider").max = String(this.snapshots.length);
    $("stepSlider").value = "1";
    $("stepModal").hidden = false;
    this.show(0);
  },
  close() { $("stepModal").hidden = true; },

  show(idx) {
    this.current = Math.max(0, Math.min(this.snapshots.length - 1, idx));
    const snap = this.snapshots[this.current];
    const isDE = currentLang === "de";
    let metaText = `${isDE ? "Schritt" : "Step"} ${snap.step} / ${snap.totalSteps}`;
    if (snap.loopIter !== undefined && snap.loopCounter) {
      const iterLabel = isDE ? "Iteration" : "iteration";
      metaText += ` · 🔁 ${iterLabel} ${snap.loopIter}/${snap.loopTotal}`;
      if (snap.loopIter > 0) metaText += ` (${snap.loopCounter} = ${snap.loopIter - 1})`;
    }
    $("stepMeta").textContent = metaText;

    // Render code with the most recent block highlighted
    const codeEl = $("stepCode");
    const lines = snap.codeSoFar.split("\n");
    const recentBlockLines = snap.block.split("\n").length;
    const startHighlight = lines.length - recentBlockLines;
    codeEl.innerHTML = lines.map((l, i) => {
      const safe = escapeHTML(l || " ");
      return i >= startHighlight ? `<span class="step-line-active">${safe}</span>` : `<span class="step-line">${safe}</span>`;
    }).join("\n");

    // Variables diagrams
    const varsEl = $("stepVars");
    if (snap.error) {
      varsEl.innerHTML = `<div class="step-error">${escapeHTML(friendlyError(snap.error, snap.codeSoFar))}</div>`;
    } else if (snap.vars.length === 0) {
      varsEl.innerHTML = `<div class="step-empty">${isDE ? "(noch keine Variablen)" : "(no variables yet)"}</div>`;
    } else {
      varsEl.innerHTML = `<div class="vars-grid step-vars-grid">${snap.vars.map(v => renderVarCardWithDiff(v, snap.diff)).join("")}</div>`;
      // Diff legend
      if (snap.diff && (snap.diff.added.length || snap.diff.changed.length)) {
        const tag = (cls, label) =>
          `<span class="diff-tag diff-${cls}">${label}</span>`;
        const pieces = [];
        if (snap.diff.added.length)   pieces.push(tag("added",   (isDE ? "neu" : "new") + ": " + snap.diff.added.join(", ")));
        if (snap.diff.changed.length) pieces.push(tag("changed", (isDE ? "geändert" : "changed") + ": " + snap.diff.changed.join(", ")));
        varsEl.insertAdjacentHTML("afterbegin", `<div class="diff-row">${pieces.join(" ")}</div>`);
      }
    }

    // Output panel
    const outEl = $("stepOutput");
    outEl.textContent = snap.output || (isDE ? "(noch keine Ausgabe)" : "(no output yet)");

    // Slider sync
    $("stepSlider").value = String(snap.step);
    $("stepPrev").disabled = this.current === 0;
    $("stepNext").disabled = this.current === this.snapshots.length - 1;
  },
  next() { this.show(this.current + 1); },
  prev() { this.show(this.current - 1); },
};

async function handleStep() {
  if (sandboxMode) SandboxFiles.saveActiveCode(Editor.getValue());
  const code = Editor.getValue();
  const outEl = $("outputArea");
  outEl.innerHTML = `<span class="info">${currentLang === "de" ? "Schritte werden berechnet…" : "Computing steps…"}</span>`;
  await Stepper.run(code);
  outEl.innerHTML = currentLang === "de" ? "Schritt-Modus geöffnet." : "Step mode opened.";
}

// ═══════════════════════════════════════════════════════════
//  SOLUTION COMPARE
// ═══════════════════════════════════════════════════════════
const Compare = {
  open(ch) {
    if (!ch || !SOLUTIONS[ch.id]) return;
    const isDE = currentLang === "de";
    $("compareTitle").textContent = isDE ? "Vergleiche mit Beispiel" : "Compare with example";
    $("compareIntro").textContent = isDE
      ? "Es gibt viele Wege zur Lösung. Deine funktioniert — hier ist ein Beispiel."
      : "There are many ways to solve this. Yours works — here's one example solution.";
    $("compareYours").textContent  = isDE ? "Deine Lösung" : "Your solution";
    $("compareTheirs").textContent = isDE ? "Beispiel"     : "Example";
    $("compareClose").textContent  = t("close");
    $("compareYoursCode").textContent  = Editor.getValue();
    $("compareTheirsCode").textContent = SOLUTIONS[ch.id];
    $("compareModal").hidden = false;
  },
  close() { $("compareModal").hidden = true; },
};

function handleResetCode() {
  if (sandboxMode) {
    const blank = "# " + (currentLang === "de" ? "Frei los…" : "Have at it…") + "\n";
    SandboxFiles.saveActiveCode(blank);
    Editor.setValue(blank);
    return;
  }
  const ch = getCurrentChallenge();
  if (!ch) return;
  const starter = (ch.type === "bug_hunt") ? (ch.buggyCode || tChStarter(ch)) : tChStarter(ch);
  Editor.setValue(starter);
  $("codeArea").dataset.loaded = ch.id;
  // Forget this task's saved code + output so reset is a true reset.
  if (state.challengeCode) delete state.challengeCode[ch.id];
  if (state.challengeOutput) delete state.challengeOutput[ch.id];
  saveState();
  restoreChallengeOutput(ch);
  switchOutputTab("text");
}

function goToLevel(li) {
  if (typeof Voice !== "undefined") Voice.stop();
  sandboxMode = false;
  state.currentLevel = li;
  state.currentChallenge = 0;
  $("codeArea").dataset.loaded = "";
  saveState();
  renderAll();
}

function goToChallenge(li, ci) {
  if (typeof Voice !== "undefined") Voice.stop();
  sandboxMode = false;
  state.currentLevel = li;
  state.currentChallenge = ci;
  $("codeArea").dataset.loaded = "";
  saveState();
  renderAll();
}

function goNext() {
  const level = LEVELS[state.currentLevel];
  if (state.currentChallenge < level.challenges.length - 1) {
    state.currentChallenge++;
  } else if (state.currentLevel < LEVELS.length - 1) {
    state.currentLevel++;
    state.currentChallenge = 0;
  }
  $("codeArea").dataset.loaded = "";
  saveState();
  renderAll();
}

function goPrev() {
  if (state.currentChallenge > 0) {
    state.currentChallenge--;
  } else if (state.currentLevel > 0) {
    state.currentLevel--;
    state.currentChallenge = LEVELS[state.currentLevel].challenges.length - 1;
  }
  $("codeArea").dataset.loaded = "";
  saveState();
  renderAll();
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════
//  SANDBOX (with multi-file tabs, wave 8)
// ═══════════════════════════════════════════════════════════
let sandboxMode = false;
function toggleSandbox() {
  sandboxMode = !sandboxMode;
  $("codeArea").dataset.loaded = "";
  renderAll();
  SandboxFiles.render();
}

const SandboxFiles = {
  // Ensure state.sandboxFiles is initialised. Migrates legacy
  // single-file state.sandbox.code into the multi-file structure on first use.
  ensure() {
    if (!state.sandboxFiles || !Array.isArray(state.sandboxFiles.files) || state.sandboxFiles.files.length === 0) {
      const legacy = state.sandbox?.code || DEFAULT_STATE.sandbox.code;
      state.sandboxFiles = {
        active: 0,
        files: [{ id: "f" + Date.now().toString(36), name: "main.py", code: legacy }],
      };
      saveState();
    }
    if (state.sandboxFiles.active < 0 || state.sandboxFiles.active >= state.sandboxFiles.files.length) {
      state.sandboxFiles.active = 0;
    }
  },

  active() { this.ensure(); return state.sandboxFiles.files[state.sandboxFiles.active]; },

  saveActiveCode(code) {
    this.ensure();
    state.sandboxFiles.files[state.sandboxFiles.active].code = code;
    // keep legacy single-code in sync (used by sharing & download fallback)
    state.sandbox.code = code;
    saveState();
  },

  switchTo(idx) {
    this.ensure();
    if (idx < 0 || idx >= state.sandboxFiles.files.length) return;
    state.sandboxFiles.active = idx;
    saveState();
    $("codeArea").dataset.loaded = "";
    if (sandboxMode) renderLesson();
    this.render();
  },

  newFile() {
    this.ensure();
    const n = state.sandboxFiles.files.length + 1;
    state.sandboxFiles.files.push({
      id: "f" + Date.now().toString(36),
      name: `untitled${n}.py`,
      code: "# " + (currentLang === "de" ? "Neue Datei" : "New file") + "\n",
    });
    state.sandboxFiles.active = state.sandboxFiles.files.length - 1;
    saveState();
    $("codeArea").dataset.loaded = "";
    if (sandboxMode) renderLesson();
    this.render();
  },

  rename(idx) {
    this.ensure();
    const f = state.sandboxFiles.files[idx];
    if (!f) return;
    const name = window.prompt(currentLang === "de" ? "Neuer Name:" : "New name:", f.name);
    if (!name) return;
    f.name = name.trim() || f.name;
    saveState();
    this.render();
  },

  close(idx) {
    this.ensure();
    if (state.sandboxFiles.files.length <= 1) {
      toast(`⚠️ ${currentLang === "de" ? "Letzte Datei kann nicht geschlossen werden" : "Can't close the last file"}`, { kind: "error" });
      return;
    }
    const f = state.sandboxFiles.files[idx];
    if (f.code && f.code.trim() && !f.code.trim().startsWith("#")) {
      if (!confirm(currentLang === "de"
        ? `Datei "${f.name}" wirklich schließen? Nicht gespeicherter Code geht verloren.`
        : `Close "${f.name}"? Unsaved code will be lost.`)) return;
    }
    state.sandboxFiles.files.splice(idx, 1);
    if (state.sandboxFiles.active >= state.sandboxFiles.files.length) {
      state.sandboxFiles.active = state.sandboxFiles.files.length - 1;
    }
    saveState();
    $("codeArea").dataset.loaded = "";
    if (sandboxMode) renderLesson();
    this.render();
  },

  render() {
    const bar = $("sandboxTabs");
    if (!bar) return;
    if (!sandboxMode) {
      bar.hidden = true;
      return;
    }
    this.ensure();
    bar.hidden = false;
    const tabsHTML = state.sandboxFiles.files.map((f, i) => `
      <div class="sb-tab ${i === state.sandboxFiles.active ? "active" : ""}" data-i="${i}">
        <span class="sb-tab-name" title="${escapeHTML(currentLang === "de" ? "Doppelklick: umbenennen" : "Double-click to rename")}">${escapeHTML(f.name)}</span>
        <button class="sb-tab-close" data-i="${i}" aria-label="Close" title="${currentLang === "de" ? "Schließen" : "Close"}">×</button>
      </div>
    `).join("");
    bar.innerHTML = tabsHTML + `<button class="sb-tab-new" id="sbTabNew" title="${currentLang === "de" ? "Neue Datei" : "New file"}">+ ${currentLang === "de" ? "Neu" : "New"}</button>`;
    bar.querySelectorAll(".sb-tab").forEach(el => {
      const i = parseInt(el.dataset.i, 10);
      el.addEventListener("click", e => {
        if (e.target.classList.contains("sb-tab-close")) return;
        this.switchTo(i);
      });
      el.addEventListener("dblclick", () => this.rename(i));
    });
    bar.querySelectorAll(".sb-tab-close").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        this.close(parseInt(btn.dataset.i, 10));
      });
    });
    $("sbTabNew").addEventListener("click", () => this.newFile());
  },
};

// ═══════════════════════════════════════════════════════════
//  DAILY CHALLENGE
// ═══════════════════════════════════════════════════════════
const DailyChallenge = {
  todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  },
  // Deterministic hash so the same day always picks the same task,
  // and consecutive days produce well-spaced picks.
  _hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  },
  pick() {
    const all = [];
    for (const lvl of LEVELS) for (const c of lvl.challenges) all.push(c);
    if (all.length === 0) return null;
    const key = this.todayKey();
    if (state.dailyHistory?.[key]) {
      const cached = all.find(c => c.id === state.dailyHistory[key]);
      if (cached) return cached;
    }
    const idx = this._hash(key) % all.length;
    const chosen = all[idx];
    if (!state.dailyHistory) state.dailyHistory = {};
    state.dailyHistory[key] = chosen.id;
    saveState();
    return chosen;
  },
  navigateTo(ch) {
    if (!ch) return;
    sandboxMode = false;
    SandboxFiles.render();
    for (let li = 0; li < LEVELS.length; li++) {
      const ci = LEVELS[li].challenges.findIndex(c => c.id === ch.id);
      if (ci >= 0) {
        state.currentLevel = li;
        state.currentChallenge = ci;
        $("codeArea").dataset.loaded = "";
        saveState();
        renderAll();
        return;
      }
    }
  },
  // Deterministic 5-task speedrun seed for today (same for all students).
  dailySpeedrunIds(count = 5) {
    const all = [];
    for (const lvl of LEVELS) for (const c of lvl.challenges) all.push(c.id);
    if (all.length === 0) return [];
    const ids = [];
    let cur = this._hash(this.todayKey() + "-speedrun");
    while (ids.length < count && ids.length < all.length) {
      cur = (cur * 1103515245 + 12345) >>> 0;
      const pick = all[cur % all.length];
      if (!ids.includes(pick)) ids.push(pick);
    }
    return ids;
  },
  isToday(chId) {
    return state.dailyHistory?.[this.todayKey()] === chId;
  },
  doneToday() {
    const chId = state.dailyHistory?.[this.todayKey()];
    return chId && state.completed.includes(chId);
  },
};

function showDailyOnWelcome() {
  const ch = DailyChallenge.pick();
  const banner = $("welcomeDailyBanner");
  if (!ch || !banner) return;
  banner.hidden = false;
  const isDE = currentLang === "de";
  $("welcomeDailyHead").textContent = isDE ? "Tagesaufgabe" : "Daily challenge";
  const lvlIdx = LEVELS.findIndex(l => l.challenges.some(c => c.id === ch.id));
  const lvl = LEVELS[lvlIdx];
  const done = state.completed.includes(ch.id);
  const status = done ? ` <span style="color:var(--accent)">✓</span>` : "";
  $("welcomeDailyBody").innerHTML =
    `${ch.id} — <b>${escapeHTML(tChTitle(ch))}</b>${status}<br><span style="font-size:11px;color:var(--muted)">${escapeHTML(tLevel(lvl))}</span>`;
  const sprintBtn = $("welcomeDailySprint");
  if (sprintBtn) {
    sprintBtn.hidden = false;
    sprintBtn.textContent = isDE ? "🏃 5er-Sprint" : "🏃 5-sprint";
    sprintBtn.title = isDE
      ? "Heute überall gleich: 5 zufällige Aufgaben mit Timer."
      : "Same for everyone today: 5 random tasks with a timer.";
    sprintBtn.onclick = () => {
      $("welcomeModal").hidden = true;
      const ids = DailyChallenge.dailySpeedrunIds(5);
      Speedrun.startFromQueue(ids, "daily");
    };
  }
  const goBtn = $("welcomeDailyGo");
  if (goBtn) {
    goBtn.hidden = false;
    goBtn.textContent = isDE ? (done ? "Erneut →" : "Starten →") : (done ? "Replay →" : "Start →");
    goBtn.onclick = () => {
      $("welcomeModal").hidden = true;
      DailyChallenge.navigateTo(ch);
    };
  }
}

// ═══════════════════════════════════════════════════════════
//  REFLECTION
// ═══════════════════════════════════════════════════════════
//  FIRST-TIME WELCOME TUTORIAL (wave 17)
// ═══════════════════════════════════════════════════════════
const Tutorial = {
  steps: [
    { id: "btnRun",           text_en: "Click ▶ Run to execute your Python code and see the output.",
                               text_de: "Klick ▶ Ausführen, um deinen Python-Code laufen zu lassen und das Ergebnis zu sehen." },
    { id: "btnCheck",          text_en: "When you think your solution is right, click ✓ Check to validate the task.",
                               text_de: "Wenn du denkst, deine Lösung stimmt, klick ✓ Prüfen — die Aufgabe wird validiert." },
    { id: "btnStep",           text_en: "Step through your code line by line — see variables grow and change.",
                               text_de: "Geh deinen Code Schritt für Schritt durch — sieh, wie Variablen entstehen und sich ändern." },
    { id: "btnSnippets",       text_en: "Insert ready-made templates (or save your own) here.",
                               text_de: "Hier fügst du fertige Vorlagen ein — oder speicherst deine eigenen." },
    { id: "btnSandboxToggle",  text_en: "Switch to Sandbox to experiment freely with your own ideas.",
                               text_de: "Wechsle in die Sandbox, um frei mit eigenen Ideen zu experimentieren." },
    { id: "btnStats",          text_en: "Open My Stats to see your XP, concepts mastered, and achievements.",
                               text_de: 'Öffne "Meine Statistik" — XP, Konzepte und Erfolge auf einen Blick.' },
    { id: "btnHelp",           text_en: "Press ? any time to see all keyboard shortcuts.",
                               text_de: "Drück jederzeit ?, um alle Tastatur-Shortcuts zu sehen." },
  ],
  current: 0,

  start() {
    if (state.tutorialShown) return;
    this.current = 0;
    requestAnimationFrame(() => this.show());
  },

  show() {
    const step = this.steps[this.current];
    if (!step) return this.finish();
    const target = document.getElementById(step.id);
    if (!target || target.hidden || target.offsetParent === null) return this.next();

    const rect = target.getBoundingClientRect();
    const spotlight = $("tutorialSpotlight");
    spotlight.style.left   = Math.round(rect.left - 6) + "px";
    spotlight.style.top    = Math.round(rect.top  - 6) + "px";
    spotlight.style.width  = Math.round(rect.width  + 12) + "px";
    spotlight.style.height = Math.round(rect.height + 12) + "px";

    const isDE = currentLang === "de";
    $("tutorialStepNum").textContent = `${this.current + 1} / ${this.steps.length}`;
    $("tutorialTitle").textContent   = isDE ? "Willkommen!" : "Welcome!";
    $("tutorialText").textContent    = isDE ? step.text_de : step.text_en;
    $("tutorialSkip").textContent    = isDE ? "Tour überspringen" : "Skip tour";
    const isLast = this.current === this.steps.length - 1;
    $("tutorialNext").textContent = isLast ? (isDE ? "Los geht's!" : "Got it!") : (isDE ? "Weiter →" : "Next →");

    // Place the tooltip below the target if there's room, otherwise above
    const tip = $("tutorialTip");
    $("tutorialOverlay").hidden = false;
    requestAnimationFrame(() => {
      const tipH = tip.offsetHeight || 180;
      const tipW = tip.offsetWidth  || 320;
      const margin = 12;
      let top;
      if (rect.bottom + margin + tipH < window.innerHeight) top = rect.bottom + margin;
      else if (rect.top - margin - tipH > 0)                top = rect.top - margin - tipH;
      else                                                  top = Math.max(8, window.innerHeight - tipH - 16);
      const left = Math.max(8, Math.min(window.innerWidth - tipW - 8, rect.left));
      tip.style.left = left + "px";
      tip.style.top  = top  + "px";
    });
  },

  next() {
    this.current += 1;
    if (this.current >= this.steps.length) return this.finish();
    this.show();
  },
  skip()   { this.finish(); },
  finish() {
    state.tutorialShown = true;
    saveState();
    $("tutorialOverlay").hidden = true;
  },
};

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  STORY CUTSCENES (wave 16)
// ═══════════════════════════════════════════════════════════
const Cutscene = {
  active: null,        // { levelId, scenes, idx, onDone }
  shownKey() { return "pyforge_cutscenes_seen"; },
  shown() {
    try { return JSON.parse(localStorage.getItem(this.shownKey()) || "[]"); }
    catch (e) { return []; }
  },
  markShown(levelId) {
    const list = this.shown();
    if (!list.includes(levelId)) {
      list.push(levelId);
      try { localStorage.setItem(this.shownKey(), JSON.stringify(list)); } catch (e) {}
    }
  },

  maybePlayForLevel(levelId, onDone) {
    if (typeof CUTSCENES === "undefined") return (onDone && onDone());
    const cs = CUTSCENES[levelId];
    if (!cs) return (onDone && onDone());
    if (this.shown().includes(levelId)) return (onDone && onDone());
    this.play(levelId, cs, onDone);
  },

  play(levelId, cs, onDone) {
    const isDE = currentLang === "de";
    this.active = {
      levelId,
      title: isDE ? cs.title_de : cs.title_en,
      scenes: cs.scenes.map(s => ({ art: s.art, text: isDE ? s.text_de : s.text_en })),
      idx: 0,
      onDone: onDone || null,
    };
    $("cutscenePrev").textContent = isDE ? "◀ Zurück" : "◀ Prev";
    $("cutsceneNext").textContent = isDE ? "Weiter ▶" : "Next ▶";
    $("cutsceneSkip").textContent = isDE ? "Überspringen" : "Skip";
    $("cutsceneModal").hidden = false;
    this.renderCurrent();
  },

  renderCurrent() {
    const a = this.active;
    if (!a) return;
    const s = a.scenes[a.idx];
    $("cutsceneTitle").textContent = a.title;
    $("cutsceneArt").textContent = s.art;
    $("cutsceneText").textContent = s.text;
    $("cutsceneProgress").textContent = `${a.idx + 1} / ${a.scenes.length}`;
    $("cutscenePrev").disabled = (a.idx === 0);
    const isLast = (a.idx === a.scenes.length - 1);
    const isDE = currentLang === "de";
    $("cutsceneNext").textContent = isLast
      ? (isDE ? "Abschließen ✓" : "Done ✓")
      : (isDE ? "Weiter ▶" : "Next ▶");
  },

  next() {
    const a = this.active;
    if (!a) return;
    if (a.idx < a.scenes.length - 1) {
      a.idx += 1;
      this.renderCurrent();
    } else {
      this.finish();
    }
  },
  prev() {
    const a = this.active;
    if (!a || a.idx === 0) return;
    a.idx -= 1;
    this.renderCurrent();
  },
  skip() { this.finish(); },
  finish() {
    if (!this.active) return;
    const levelId = this.active.levelId;
    const cb = this.active.onDone;
    this.active = null;
    $("cutsceneModal").hidden = true;
    this.markShown(levelId);
    // The Pythonia-Legend achievement counts cutscenes; re-check after marking.
    try { checkAchievements(); } catch (e) {}
    if (cb) cb();
  },
};

function maybeAskReflection(levelId) {
  if (!state.reflectionAsked) state.reflectionAsked = [];
  if (state.reflectionAsked.includes(levelId)) return;
  state.reflectionAsked.push(levelId);
  saveState();
  setTimeout(() => openReflection(levelId), 1200);
}
function openReflection(levelId) {
  $("reflectionTitle").textContent = t("howConfident");
  $("reflectionSubtitle").textContent = `${t("level")} ${levelId}: ${tLevel(LEVELS[levelId - 1])}`;
  $("reflectionModal").hidden = false;
  $("reflectionModal").dataset.level = levelId;
  document.querySelectorAll(".smiley-btn").forEach(b => b.classList.remove("selected"));
}
function closeReflection() { $("reflectionModal").hidden = true; }
function submitReflection(value) {
  const levelId = parseInt($("reflectionModal").dataset.level, 10);
  if (!state.reflections) state.reflections = {};
  state.reflections[levelId] = { confidence: value, date: Date.now() };
  saveState();
  closeReflection();
  toast(`\u{1f64f} ${t("thanksForFeedback")}`, { kind: "info", ttl: 2500 });
}

// ═══════════════════════════════════════════════════════════
//  AVATAR ONBOARDING
// ═══════════════════════════════════════════════════════════
function openAvatarModal(isInitial) {
  const m = $("avatarModal");
  if (!m) return;
  m.hidden = false;
  m.dataset.initial = isInitial ? "1" : "0";
  renderAvatarChoices();
  $("avNameInput").value = state.avatar?.name || "";
  $("avTitle").textContent = t("chooseAvatar");
  $("avSubtitle").textContent = t("chooseAvatarSub");
  $("avNameLabel").textContent = t("yourName");
  $("avNameInput").placeholder = t("namePlaceholder");
  $("avConfirm").textContent = t("letsGo");
}
function renderAvatarChoices() {
  const grid = $("avGrid");
  if (!grid) return;
  const selectedId = state.avatar?.id || AVATARS[0].id;
  grid.innerHTML = AVATARS.map(a => `
    <button class="av-choice ${a.id === selectedId ? "selected" : ""}" data-id="${a.id}" aria-label="${t(a.nameKey)}">
      <span class="av-emoji">${a.emoji}</span>
      <span class="av-label">${t(a.nameKey)}</span>
    </button>
  `).join("");
  grid.querySelectorAll(".av-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      grid.querySelectorAll(".av-choice").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });
}
function confirmAvatar() {
  const grid = $("avGrid");
  const selected = grid.querySelector(".av-choice.selected");
  const id = selected ? selected.dataset.id : AVATARS[0].id;
  const name = $("avNameInput").value.trim();
  state.avatar = { id, name };
  saveState();
  $("avatarModal").hidden = true;
  renderAll();
  toast(`\u{2728} ${t("welcomeHero")}, ${escapeHTML(avatarDisplayName())}!`, { kind: "success", ttl: 3000 });
  // Fire the first-time tutorial AFTER renderAll so the buttons it
  // highlights are in their final positions. Wrapped in try/catch
  // so a tutorial glitch can never leave the page blank.
  setTimeout(() => {
    try { Tutorial.start(); }
    catch (e) { console.error("[PyWinkelix] Tutorial.start failed:", e); }
  }, 400);
}

// ═══════════════════════════════════════════════════════════
//  SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
function openSettings() {
  $("settingsModal").hidden = false;
  const s = state.settings;
  document.querySelectorAll('input[name="set-theme"]').forEach(i => i.checked = (i.value === s.theme));
  document.querySelectorAll('input[name="set-font"]').forEach(i  => i.checked = (i.value === s.fontSize));
  $("setSound").checked = !!s.sound;
  $("setConfetti").checked = !!s.confetti;
  $("setMotion").checked = !!s.reducedMotion;
  if ($("setPomodoro")) $("setPomodoro").checked = !!s.pomodoro;
  if ($("setPomodoroLabel")) $("setPomodoroLabel").textContent = t("pomodoroTimer");
  if ($("setDyslexia")) $("setDyslexia").checked = !!s.dyslexiaFont;
  if ($("setDyslexiaLabel")) $("setDyslexiaLabel").textContent = t("dyslexiaFont");
  if ($("setContrast")) $("setContrast").checked = !!s.highContrast;
  if ($("setContrastLabel")) $("setContrastLabel").textContent = t("highContrast");
  if ($("setVoiceRate")) $("setVoiceRate").value = s.voiceRate || 0.95;
  if ($("setVoiceRateLabel")) $("setVoiceRateLabel").textContent = t("voiceRate");
  if ($("setVoiceLabel")) $("setVoiceLabel").textContent = t("voice");
  if ($("setVoiceAnnounce")) $("setVoiceAnnounce").checked = !!s.voiceAnnounce;
  if ($("setVoiceAnnounceLabel")) $("setVoiceAnnounceLabel").textContent = t("voiceAnnounce");
  populateVoiceOptions();
}
function closeSettings() { $("settingsModal").hidden = true; }

function collectLessonNotes() {
  const notes = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("pyforge_note_")) {
        const text = localStorage.getItem(k);
        if (text && text.trim()) notes[k.substring("pyforge_note_".length)] = text;
      }
    }
  } catch (e) {}
  return notes;
}

function exportSave() {
  const payload = { ...state, _notes: collectLessonNotes() };
  const data = JSON.stringify(payload, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url; a.download = `pywinkelix-save-${stamp}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(`\u{1f4be} ${t("saveExported")}`, { kind: "success" });
}
function importSave(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      // Restore notes (separate from state) before applying state
      const notes = parsed._notes;
      if (notes && typeof notes === "object") {
        for (const [chId, text] of Object.entries(notes)) {
          try { localStorage.setItem("pyforge_note_" + chId, text); } catch (err) {}
        }
        // refresh index of noted challenges
        try { localStorage.setItem("pyforge_notes_index", JSON.stringify(Object.keys(notes))); } catch (err) {}
      }
      delete parsed._notes;
      state = mergeState(DEFAULT_STATE, parsed);
      saveState();
      applySettings();
      renderAll();
      $("welcomeModal").hidden = true;
      toast(`\u{1f4e5} ${t("saveImported")}`, { kind: "success" });
    } catch (err) {
      toast(`⚠️ ${t("invalidSaveFile")}`, { kind: "error" });
    }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════
//  CODE SNIPPETS (built-in templates + user-saved snippets)
// ═══════════════════════════════════════════════════════════
const SNIPPET_TEMPLATES = [
  { id: "hello",  title_en: "Hello, World!",          title_de: "Hallo Welt",
    code: `print("Hello, World!")` },
  { id: "vars",   title_en: "Variables (4 types)",    title_de: "Variablen (4 Typen)",
    code: `name = "Aria"    # str\nlevel = 7         # int\nspeed = 2.5       # float\nalive = True      # bool\n\nprint(name, level, speed, alive)` },
  { id: "fstr",   title_en: "f-string output",        title_de: "f-String-Ausgabe",
    code: `name = "Hero"\nhp = 100\nprint(f"{name} has {hp} HP.")` },
  { id: "if",     title_en: "if / elif / else",       title_de: "if / elif / else",
    code: `score = 80\nif score >= 90:\n    print("Top")\nelif score >= 60:\n    print("Pass")\nelse:\n    print("Try again")` },
  { id: "forrange", title_en: "for + range",          title_de: "for + range",
    code: `for i in range(5):\n    print(i)` },
  { id: "forlist", title_en: "for over list",         title_de: "for über Liste",
    code: `items = ["sword", "shield", "potion"]\nfor item in items:\n    print(item)` },
  { id: "while",  title_en: "while countdown",        title_de: "while Countdown",
    code: `count = 5\nwhile count > 0:\n    print(count)\n    count -= 1\nprint("Liftoff!")` },
  { id: "def",    title_en: "function with return",   title_de: "Funktion mit return",
    code: `def square(x):\n    return x * x\n\nprint(square(5))` },
  { id: "class",  title_en: "class skeleton",         title_de: "Klassen-Gerüst",
    code: `class Player:\n    def __init__(self, name, hp):\n        self.name = name\n        self.hp = hp\n\n    def greet(self):\n        print(f"I am {self.name}!")\n\np = Player("Aria", 100)\np.greet()` },
  { id: "dictiter", title_en: "dict iteration",       title_de: "Dict iterieren",
    code: `inventory = {"sword": 1, "potion": 3, "key": 2}\nfor item, count in inventory.items():\n    print(f"{item}: {count}")` },
  { id: "compr",  title_en: "list comprehension",     title_de: "List Comprehension",
    code: `nums = [1, 2, 3, 4, 5]\nsquares = [n * n for n in nums]\nevens   = [n for n in nums if n % 2 == 0]\nprint(squares)\nprint(evens)` },
  { id: "turtsq", title_en: "🐢 turtle: square",       title_de: "🐢 Turtle: Quadrat",
    code: `import turtle\nt = turtle.Turtle()\n\nfor _ in range(4):\n    t.forward(100)\n    t.right(90)` },
  { id: "turtstar", title_en: "🐢 turtle: star",       title_de: "🐢 Turtle: Stern",
    code: `import turtle\nt = turtle.Turtle()\n\nfor _ in range(5):\n    t.forward(120)\n    t.right(144)` },
  { id: "turtcolor", title_en: "🐢 turtle: colored spiral", title_de: "🐢 Turtle: bunte Spirale",
    code: `import turtle\nt = turtle.Turtle()\nt.speed(0)\n\ncolors = ["red", "orange", "yellow", "green", "blue", "purple"]\nfor i in range(60):\n    t.color(colors[i % 6])\n    t.forward(i * 3)\n    t.right(59)` },
];

const SNIP_KEY = "pyforge_user_snippets";
const Snippets = {
  active: "builtins",

  userList() {
    try { return JSON.parse(localStorage.getItem(SNIP_KEY)) || []; }
    catch (e) { return []; }
  },
  saveUserList(list) {
    try { localStorage.setItem(SNIP_KEY, JSON.stringify(list)); } catch (e) {}
  },

  open() {
    $("snippetsTitle").textContent = currentLang === "de" ? "Code-Snippets" : "Code snippets";
    $("snipTabBuiltins").textContent = currentLang === "de" ? "📦 Vorlagen" : "📦 Templates";
    $("snipTabMine").textContent     = currentLang === "de" ? "⭐ Eigene"   : "⭐ Mine";
    $("snippetsClose").textContent   = t("close");
    $("snippetsSaveCurrent").textContent = currentLang === "de" ? "+ Aktuellen Code speichern" : "+ Save current code";
    $("snippetsModal").hidden = false;
    this.setTab(this.active);
  },
  close() { $("snippetsModal").hidden = true; },

  setTab(name) {
    this.active = name;
    $("snipTabBuiltins").classList.toggle("active", name === "builtins");
    $("snipTabMine").classList.toggle("active", name === "mine");
    $("snipTabBuiltins").setAttribute("aria-selected", name === "builtins");
    $("snipTabMine").setAttribute("aria-selected", name === "mine");
    $("snippetsSaveCurrent").hidden = name !== "mine";
    this.render();
  },

  render() {
    const list = $("snippetsList");
    const items = this.active === "builtins"
      ? SNIPPET_TEMPLATES.map(tpl => ({
          id: tpl.id,
          title: currentLang === "de" ? tpl.title_de : tpl.title_en,
          code: tpl.code,
          builtin: true,
        }))
      : this.userList();

    if (items.length === 0) {
      list.innerHTML = `<div class="snip-empty">${currentLang === "de" ? "Noch keine eigenen Snippets. Bau dir welche!" : "No snippets yet — make some!"}</div>`;
      return;
    }
    list.innerHTML = items.map(s => `
      <div class="snip-item">
        <div class="snip-item-head">
          <div class="snip-item-title">${escapeHTML(s.title)}</div>
          <div class="snip-item-actions">
            <button class="t-btn snip-insert" data-id="${s.id}" data-source="${s.builtin ? "builtin" : "user"}">${currentLang === "de" ? "Einfügen" : "Insert"}</button>
            <button class="t-btn snip-share" data-id="${s.id}" data-source="${s.builtin ? "builtin" : "user"}" title="${currentLang === "de" ? "Link kopieren" : "Copy share link"}">🔗</button>
            ${s.builtin ? "" : `<button class="t-btn snip-delete" data-id="${s.id}" title="${currentLang === "de" ? "Löschen" : "Delete"}">🗑</button>`}
          </div>
        </div>
        <pre class="snip-code">${escapeHTML(truncate(s.code, 280))}</pre>
      </div>
    `).join("");
    list.querySelectorAll(".snip-insert").forEach(btn => {
      btn.addEventListener("click", () => {
        const snip = this._resolve(btn.dataset.id, btn.dataset.source);
        if (snip) this.insert(snip.code);
      });
    });
    list.querySelectorAll(".snip-share").forEach(btn => {
      btn.addEventListener("click", () => {
        const snip = this._resolve(btn.dataset.id, btn.dataset.source);
        if (snip) this.share(snip);
      });
    });
    list.querySelectorAll(".snip-delete").forEach(btn => {
      btn.addEventListener("click", () => this.delete(btn.dataset.id));
    });
  },

  _resolve(id, source) {
    if (source === "builtin") {
      const tpl = SNIPPET_TEMPLATES.find(x => x.id === id);
      if (!tpl) return null;
      return { title: currentLang === "de" ? tpl.title_de : tpl.title_en, code: tpl.code };
    }
    return this.userList().find(x => x.id === id);
  },

  share(snip) {
    const title = (snip.title || "snippet").slice(0, 60);
    const encoded = b64encodeUtf8(snip.code);
    if (encoded.length > 4500) {
      toast(`⚠️ ${currentLang === "de" ? "Snippet ist zu lang für eine URL." : "Snippet too long for a URL."}`, { kind: "error" });
      return;
    }
    const params = new URLSearchParams();
    params.set("name", title);
    params.set("code", encoded);
    const url = location.origin + location.pathname + "#snippet=" + params.toString();
    this.close();
    openShareModal(url);
  },

  insert(code) {
    if (Editor.cm) {
      const doc = Editor.cm.getDoc();
      doc.replaceSelection(code, "around");
      Editor.cm.focus();
    } else {
      const ta = $("codeArea");
      const start = ta.selectionStart || ta.value.length;
      const end = ta.selectionEnd || ta.value.length;
      ta.value = ta.value.slice(0, start) + code + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + code.length;
      ta.focus();
    }
    this.close();
    if (sandboxMode) {
      state.sandbox.code = Editor.getValue();
      saveState();
    }
    state.snippetsUsed = (state.snippetsUsed || 0) + 1;
    saveState();
    checkAchievements();
    toast(`📋 ${currentLang === "de" ? "Snippet eingefügt" : "Snippet inserted"}`, { kind: "info", ttl: 1800 });
  },

  promptSave() {
    const code = Editor.getValue().trim();
    if (!code) {
      toast(`⚠️ ${currentLang === "de" ? "Editor ist leer" : "Editor is empty"}`, { kind: "error" });
      return;
    }
    $("saveSnipTitle").textContent = currentLang === "de" ? "Snippet speichern" : "Save snippet";
    $("lblSaveSnipName").textContent = currentLang === "de" ? "Name" : "Snippet name";
    $("saveSnipName").value = "";
    $("saveSnipConfirm").textContent = currentLang === "de" ? "Speichern" : "Save";
    $("saveSnipCancel").textContent  = currentLang === "de" ? "Abbrechen" : "Cancel";
    $("saveSnipModal").hidden = false;
    setTimeout(() => $("saveSnipName").focus(), 50);
  },
  confirmSave() {
    const name = $("saveSnipName").value.trim();
    if (!name) {
      toast(`⚠️ ${currentLang === "de" ? "Name fehlt" : "Name missing"}`, { kind: "error" });
      return;
    }
    const code = Editor.getValue();
    const list = this.userList();
    list.push({ id: "u" + Date.now().toString(36), title: name, code });
    this.saveUserList(list);
    $("saveSnipModal").hidden = true;
    this.setTab("mine");
    state.savedSnippets = list.length;
    saveState();
    checkAchievements();
    toast(`⭐ ${currentLang === "de" ? "Snippet gespeichert" : "Snippet saved"}`, { kind: "success" });
  },

  delete(id) {
    if (!confirm(currentLang === "de" ? "Snippet wirklich löschen?" : "Delete this snippet?")) return;
    const list = this.userList().filter(s => s.id !== id);
    this.saveUserList(list);
    this.render();
  },
};

// ═══════════════════════════════════════════════════════════
//  POMODORO TIMER (25/5 default, optional)
// ═══════════════════════════════════════════════════════════
const Pomodoro = {
  phase: "work",          // "work" | "break"
  remaining: 0,
  intervalId: null,
  WORK_SECS: 25 * 60,
  BREAK_SECS: 5 * 60,

  enabled() { return !!state.settings?.pomodoro; },

  start() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (!this.enabled()) { this.stop(); return; }
    this.phase = "work";
    this.remaining = this.WORK_SECS;
    this.render();
    this.intervalId = setInterval(() => this.tick(), 1000);
    $("pomodoroPill").hidden = false;
  },
  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    $("pomodoroPill").hidden = true;
  },
  tick() {
    this.remaining -= 1;
    if (this.remaining <= 0) this.onPhaseEnd();
    else this.render();
  },
  onPhaseEnd() {
    soundLevelUp();
    if (this.phase === "work") {
      this.phase = "break";
      this.remaining = this.BREAK_SECS;
      toast(`🍅 ${currentLang === "de" ? "Pause! 5 Minuten Atem holen." : "Break time! Take 5 minutes."}`, { kind: "success", ttl: 5000 });
      state.pomodoroCompleted = (state.pomodoroCompleted || 0) + 1;
      saveState();
      checkAchievements();
    } else {
      this.phase = "work";
      this.remaining = this.WORK_SECS;
      toast(`💪 ${currentLang === "de" ? "Weiter! 25 Minuten Fokus." : "Back to it! 25 minutes of focus."}`, { kind: "info", ttl: 5000 });
    }
    this.render();
  },
  render() {
    const pill = $("pomodoroPill");
    if (!pill) return;
    const mins = Math.floor(this.remaining / 60);
    const secs = this.remaining % 60;
    const icon = this.phase === "work" ? "🍅" : "☕";
    pill.textContent = `${icon} ${mins}:${String(secs).padStart(2, "0")}`;
    pill.className = "pomodoro-pill " + this.phase;
  },
};

// ═══════════════════════════════════════════════════════════
//  SPEEDRUN — random challenges back-to-back with a timer
// ═══════════════════════════════════════════════════════════
const Speedrun = {
  tickerId: null,

  collect(filter) {
    const all = [];
    for (const lvl of LEVELS) for (const c of lvl.challenges) all.push(c);
    switch (filter) {
      case "original": return all.filter(c => !c.id.includes("B"));
      case "bonus":    return all.filter(c => c.id.includes("B"));
      case "todo":     return all.filter(c => !state.completed.includes(c.id));
      default:         return all;
    }
  },

  start({ count, filter }) {
    const pool = this.collect(filter);
    if (pool.length === 0) {
      toast(`⚠️ ${currentLang === "de" ? "Pool ist leer" : "Pool is empty"}`, { kind: "error" });
      return;
    }
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const queue = shuffled.slice(0, Math.min(count, shuffled.length)).map(c => c.id);
    this.startFromQueue(queue, filter);
  },

  // Start a speedrun with a pre-computed challenge queue (used by Daily Speedrun).
  startFromQueue(queueIds, filter = "custom") {
    if (!Array.isArray(queueIds) || queueIds.length === 0) return;
    state.speedrun = {
      startedAt: Date.now(),
      target: queueIds.length,
      solved: [],
      skipped: [],
      queue: queueIds.slice(),
      filter,
    };
    saveState();
    this.startTicker();
    this.gotoNext();
  },

  active() { return !!state.speedrun; },

  startTicker() {
    if (this.tickerId) clearInterval(this.tickerId);
    this.tickerId = setInterval(() => this.renderPill(), 1000);
    this.renderPill();
  },
  stopTicker() {
    if (this.tickerId) clearInterval(this.tickerId);
    this.tickerId = null;
  },

  renderPill() {
    const pill = $("speedrunPill");
    if (!pill) return;
    const sr = state.speedrun;
    if (!sr) {
      pill.hidden = true;
      $("btnSpeedrunSkip").hidden = true;
      return;
    }
    pill.hidden = false;
    $("btnSpeedrunSkip").hidden = false;
    const elapsed = Math.floor((Date.now() - sr.startedAt) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    pill.innerHTML = `🏃 <b>${sr.solved.length}/${sr.target}</b> · ⏱${mins}:${String(secs).padStart(2, "0")} <button class="sr-abort" id="srAbortBtn" title="${currentLang === "de" ? "Abbrechen" : "Abort"}">✖</button>`;
    $("srAbortBtn").onclick = () => this.abort();
  },

  gotoNext() {
    const sr = state.speedrun;
    if (!sr || sr.queue.length === 0) { this.finish(); return; }
    const chId = sr.queue[0];
    for (let li = 0; li < LEVELS.length; li++) {
      const ci = LEVELS[li].challenges.findIndex(c => c.id === chId);
      if (ci >= 0) {
        sandboxMode = false;
        state.currentLevel = li;
        state.currentChallenge = ci;
        $("codeArea").dataset.loaded = "";
        saveState();
        renderAll();
        return;
      }
    }
    sr.queue.shift();
    saveState();
    this.gotoNext();
  },

  onSolved(chId) {
    const sr = state.speedrun;
    if (!sr) return;
    const i = sr.queue.indexOf(chId);
    if (i >= 0) {
      sr.queue.splice(i, 1);
      sr.solved.push(chId);
      saveState();
      if (sr.queue.length === 0) { this.finish(); return; }
      setTimeout(() => this.gotoNext(), 1200);
    }
  },

  skip() {
    const sr = state.speedrun;
    if (!sr) return;
    const chId = sr.queue.shift();
    if (chId) sr.skipped.push(chId);
    saveState();
    if (sr.queue.length === 0) this.finish();
    else this.gotoNext();
  },

  abort() {
    if (!state.speedrun) return;
    if (!confirm(currentLang === "de" ? "Speedrun wirklich abbrechen?" : "Abort the speedrun?")) return;
    state.speedrun = null;
    saveState();
    this.stopTicker();
    this.renderPill();
  },

  finish() {
    const sr = state.speedrun;
    if (!sr) return;
    const elapsed = Math.floor((Date.now() - sr.startedAt) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const pool = sr.filter || "all";
    state.speedrun = null;
    state.speedrunsCompleted = (state.speedrunsCompleted || 0) + 1;
    state.speedrunBest = Math.max(state.speedrunBest || 0, sr.solved.length);
    state.speedrunBests = state.speedrunBests || {};
    state.speedrunBests[pool] = Math.max(state.speedrunBests[pool] || 0, sr.solved.length);
    saveState();
    this.stopTicker();
    this.renderPill();
    checkAchievements();
    confetti();
    soundLevelUp();

    const isDE = currentLang === "de";
    $("srResultTitle").textContent = isDE ? "🏁 Run abgeschlossen!" : "🏁 Run complete!";
    const poolLabels = {
      all:      isDE ? "Alle"             : "All",
      original: isDE ? "Originale"        : "Originals",
      bonus:    isDE ? "Bonus"            : "Bonus",
      todo:     isDE ? "Noch offen"       : "Todo",
      daily:    isDE ? "Tages-Sprint"     : "Daily",
      custom:   isDE ? "Eigene Auswahl"   : "Custom",
    };
    const poolLabel = poolLabels[pool] || pool;
    const poolBest = (state.speedrunBests || {})[pool] || sr.solved.length;
    $("srStats").innerHTML = `
      <div class="sr-stat-row"><span>${isDE ? "Pool" : "Pool"}</span><b>${escapeHTML(poolLabel)}</b></div>
      <div class="sr-stat-row"><span>${isDE ? "Gelöst" : "Solved"}</span><b>${sr.solved.length}/${sr.target}</b></div>
      <div class="sr-stat-row"><span>${isDE ? "Übersprungen" : "Skipped"}</span><b>${sr.skipped.length}</b></div>
      <div class="sr-stat-row"><span>${isDE ? "Zeit" : "Time"}</span><b>${mins}:${String(secs).padStart(2, "0")}</b></div>
      <div class="sr-stat-row"><span>${isDE ? "Pro Aufgabe" : "Per task"}</span><b>${sr.solved.length ? Math.round(elapsed / sr.solved.length) : 0}s</b></div>
      <div class="sr-stat-row"><span>${isDE ? "Beste in diesem Pool" : "Best in this pool"}</span><b>${poolBest}</b></div>
      <div class="sr-stat-row"><span>${isDE ? "Gesamt-Bestmarke" : "All-time best"}</span><b>${state.speedrunBest}</b></div>
    `;
    $("speedrunResultModal").hidden = false;
  },
};

function openSpeedrunModal() {
  $("speedrunModal").hidden = false;
  const isDE = currentLang === "de";
  $("speedrunTitle").textContent = isDE ? "🏃 Speedrun" : "🏃 Speedrun";
  $("speedrunIntro").textContent = isDE
    ? "Zufällige Aufgaben hintereinander. Wie viele schaffst du?"
    : "Random challenges, back to back. How many can you crack?";
  $("lblSrCount").textContent  = isDE ? "Wie viele Aufgaben?" : "How many challenges?";
  $("lblSrFilter").textContent = isDE ? "Pool" : "Pool";
  $("speedrunStart").textContent  = isDE ? "Start →" : "Start →";
  $("speedrunCancel").textContent = t("close");
}

// Render a 14-day sparkline SVG for one concept based on conceptHistory.
function renderConceptSparkline(conceptId) {
  const hist = state.conceptHistory || {};
  const days = 14;
  const values = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    values.push((hist[k] && hist[k][conceptId]) || 0);
  }
  const max = Math.max(1, ...values);
  const w = 56, h = 14, pad = 1;
  const stepX = (w - 2*pad) / Math.max(1, days - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (v / max) * (h - 2*pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="concept-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" /></svg>`;
}

// ═══════════════════════════════════════════════════════════
//  PERSONAL STATS PAGE (wave 14)
// ═══════════════════════════════════════════════════════════
const Stats = {
  open() {
    const isDE = currentLang === "de";
    $("statsTitle").textContent = isDE ? "📊 Meine Statistik" : "📊 My stats";
    $("statsClose").textContent = t("close");
    $("statsConceptsTitle").textContent = isDE ? "Verwendete Konzepte" : "Concepts used";
    $("statsAchTitle").textContent = isDE ? "Achievements" : "Achievements";

    const total = LEVELS.reduce((a, l) => a + l.challenges.length, 0);
    const done = (state.completed || []).length;
    const tiles = [
      { num: state.xp || 0,                             lbl: "XP" },
      { num: `${done}/${total}`,                        lbl: isDE ? "Aufgaben" : "Challenges" },
      { num: state.streak?.longest || 0,                lbl: isDE ? "🔥 längste" : "🔥 longest" },
      { num: state.runCount || 0,                       lbl: isDE ? "Runs" : "Runs" },
      { num: `${state.unlockedAchievements.length}/${ACHIEVEMENTS.length}`, lbl: isDE ? "Erfolge" : "Achievements" },
      { num: state.hintFreeCount || 0,                  lbl: isDE ? "Ohne Hilfe" : "Hint-free" },
      { num: state.errorFixCount || 0,                  lbl: isDE ? "Bugs gefixt" : "Bugs fixed" },
      { num: state.speedrunBest || 0,                   lbl: isDE ? "🏃 Rekord" : "🏃 best" },
    ];
    $("statsGrid").innerHTML = tiles.map(t =>
      `<div class="stat-tile"><div class="stat-num">${t.num}</div><div class="stat-label">${t.lbl}</div></div>`
    ).join("");

    // Concept tracker
    const concepts = state.concepts || {};
    $("statsConcepts").innerHTML = CONCEPTS.map(c => {
      const n = concepts[c.id] || 0;
      const lbl = isDE ? c.label_de : c.label_en;
      const cls = n >= 3 ? "mastered" : n > 0 ? "seen" : "untouched";
      const sparkSvg = (n > 0) ? renderConceptSparkline(c.id) : "";
      return `<div class="concept-pill ${cls}" title="${isDE ? "Verwendet" : "Used"}: ${n}×">
        <span class="concept-ic">${c.icon}</span>
        <span class="concept-lbl">${escapeHTML(lbl)}</span>
        ${sparkSvg}
        ${n > 0 ? `<span class="concept-cnt">${n}</span>` : ""}
      </div>`;
    }).join("");

    // Achievements grid (compact)
    $("statsAchievements").innerHTML = ACHIEVEMENTS.map(a => {
      const got = state.unlockedAchievements.includes(a.id);
      const ach_de = (currentLang === "de" && typeof ACHIEVEMENTS_DE !== "undefined") ? ACHIEVEMENTS_DE[a.id] : null;
      const name = ach_de ? ach_de.name : a.name;
      const desc = ach_de ? ach_de.desc : a.desc;
      return `<div class="stat-ach ${got ? "got" : ""}" title="${escapeHTML(desc)}">
        <span class="stat-ach-ic">${got ? a.icon : "🔒"}</span>
        <span class="stat-ach-name">${escapeHTML(name)}</span>
      </div>`;
    }).join("");

    $("statsModal").hidden = false;
  },
  close() { $("statsModal").hidden = true; },
};

// ═══════════════════════════════════════════════════════════
//  KONAMI CODE EASTER EGG (↑↑↓↓←→←→BA → +50 XP)
// ═══════════════════════════════════════════════════════════
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
let konamiProgress = 0;
function watchKonami(e) {
  const expected = KONAMI[konamiProgress];
  if (e.key.toLowerCase() === expected.toLowerCase()) {
    konamiProgress += 1;
    if (konamiProgress === KONAMI.length) {
      konamiProgress = 0;
      triggerKonami();
    }
  } else {
    konamiProgress = 0;
  }
}
function triggerKonami() {
  if (state.konamiUsed) return;
  state.konamiUsed = true;
  state.xp = (state.xp || 0) + 50;
  saveState();
  checkAchievements();
  confetti();
  setTimeout(() => confetti(), 200);
  soundLevelUp();
  toast(`🎮 <b>${currentLang === "de" ? "Cheat-Code aktiviert!" : "Cheat code activated!"}</b><br>${currentLang === "de" ? "+50 XP, weil du ein:e echte:r Hacker:in bist." : "+50 XP because you're a real hacker."}`,
    { kind: "achievement", ttl: 5000 });
  renderAll();
}

// ═══════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS HELP
// ═══════════════════════════════════════════════════════════
const SHORTCUTS = [
  { keys: ["Ctrl/Cmd", "Enter"], desc_en: "Run code",           desc_de: "Code ausführen" },
  { keys: ["Ctrl/Cmd", "F"],      desc_en: "Find in editor",     desc_de: "Im Editor suchen" },
  { keys: ["Shift", "Ctrl/Cmd", "F"], desc_en: "Find & replace", desc_de: "Suchen & ersetzen" },
  { keys: ["Alt", "G"],           desc_en: "Jump to line",       desc_de: "Zur Zeile springen" },
  { keys: ["Tab"],                desc_en: "Indent 4 spaces",     desc_de: "4 Leerzeichen einrücken" },
  { keys: ["Alt", "→"],          desc_en: "Next challenge",     desc_de: "Nächste Aufgabe" },
  { keys: ["Alt", "←"],          desc_en: "Previous challenge", desc_de: "Vorherige Aufgabe" },
  { keys: ["?"],                  desc_en: "Show this help",     desc_de: "Diese Hilfe zeigen" },
];
function openShortcutsHelp() {
  const m = $("shortcutsModal");
  if (!m) return;
  $("shortcutsTitle").textContent = t("shortcuts");
  $("shortcutsCloseBtn").textContent = t("close");
  const list = $("shortcutsList");
  list.innerHTML = SHORTCUTS.map(s =>
    `<div class="shortcut-row">
       <div class="shortcut-keys">${s.keys.map(k => `<kbd>${escapeHTML(k)}</kbd>`).join(" + ")}</div>
       <div class="shortcut-desc">${currentLang === "de" ? s.desc_de : s.desc_en}</div>
     </div>`
  ).join("");
  m.hidden = false;
}
function closeShortcutsHelp() { const m = $("shortcutsModal"); if (m) m.hidden = true; }

// ═══════════════════════════════════════════════════════════
//  TEACHER MODE
// ═══════════════════════════════════════════════════════════
const T_HASH = "5db1fee4b5703808c48078a76768b155b421b210c0761cd6a5d223f4d99f1eaa";
let teacherMode = false;
let teacherTab = "solution";

async function hashSHA256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

async function attemptTeacherLogin() {
  const input = $("teacherPwInput").value;
  const hashed = await hashSHA256(input);
  if (hashed === T_HASH) {
    teacherMode = true;
    $("teacherPwModal").hidden = true;
    $("teacherPwInput").value = "";
    $("teacherPwError").textContent = "";
    $("teacherBtn").classList.add("active-teacher");
    $("teacherBtn").innerHTML = currentLang === "de" ? "\u{1f513} Lehrer" : "\u{1f513} Teacher";
    activateTeacherUI();
  } else {
    $("teacherPwError").textContent = t("teacherPwError");
    $("teacherPwInput").value = "";
    $("teacherPwInput").focus();
  }
}

function exitTeacherMode() {
  teacherMode = false;
  $("teacherPanel").hidden = true;
  $("teacherBtn").classList.remove("active-teacher");
  $("teacherBtn").innerHTML = "\u{1f512}";
  document.querySelector(".progress-card").hidden = false;
}

function activateTeacherUI() {
  $("teacherPanel").hidden = false;
  document.querySelector(".progress-card").hidden = true;
  const main = document.querySelector("main");
  const tp = $("teacherPanel");
  if (!tp.parentElement || tp.parentElement !== main) main.appendChild(tp);
  tp.style.gridColumn = "3";
  tp.style.gridRow = "1 / span 2";
  setTeacherTab("solution");
  renderTeacherPanel();
}

function setTeacherTab(tab) {
  teacherTab = tab;
  const tabs = ["solution","overview","didactics","class","custom","notes"];
  tabs.forEach(t => {
    const el = $("tTab" + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) el.hidden = (t !== tab);
    const btn = $("tBtn" + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.toggle("active-t-btn", t === tab);
  });
  renderTeacherPanel();
}

function renderTeacherPanel() {
  if (!teacherMode) return;
  const ch = getCurrentChallenge();
  const level = LEVELS[state.currentLevel];
  if (!ch) return;

  $("tSolutionTitle").textContent = `${t("solutionFor")} ${ch.id} — ${tChTitle(ch)}`;
  $("tSolutionCode").textContent = SOLUTIONS[ch.id] || t("noSolution");
  const hints = tChHints(ch);
  $("tAllHints").innerHTML = hints ? "<ol>" + hints.map(h => `<li>${h}</li>`).join("") + "</ol>" : t("noHints");
  $("tValidation").textContent = ch.check.toString();

  let tbody = "";
  let totalXP = 0, doneXP = 0, totalCh = 0, doneCh = 0;
  LEVELS.forEach(lv => {
    lv.challenges.forEach(c => {
      const done = state.completed.includes(c.id);
      totalXP += c.xp; totalCh++;
      if (done) { doneXP += c.xp; doneCh++; }
      const statusIcon = done ? "✅" : "⬜";
      tbody += `<tr onclick="goToChallenge(${LEVELS.indexOf(lv)},${lv.challenges.indexOf(c)});renderTeacherPanel()">
        <td>${c.id}</td><td>${c.title}</td><td><span class="t-xp-badge">${c.xp} XP</span></td><td>${statusIcon}</td>
      </tr>`;
    });
  });
  $("tOverviewBody").innerHTML = tbody;
  // Reflections summary
  const reflectionLines = Object.entries(state.reflections || {})
    .map(([lvl, r]) => `${t("level")} ${lvl}: ${"⭐".repeat(r.confidence)} (${r.confidence}/5)`)
    .join("<br>") || `<span style="color:var(--muted)">${t("noReflections")}</span>`;

  $("tStats").innerHTML = `
    ${t("challengesCompleted")}: <b>${doneCh}/${totalCh}</b><br>
    ${t("xpEarned")}: <b>${doneXP}/${totalXP}</b><br>
    ${t("hintsUsed")}: <b>${Object.values(state.hintsUsed).reduce((a,b)=>a+b,0)}</b><br>
    ${t("errorsEncountered")}: <b>${state.errorsSeen || 0}</b><br>
    ${t("hintFreeCompletions")}: <b>${state.hintFreeCount || 0}</b><br>
    ${t("achievements")}: <b>${state.unlockedAchievements.length}/${ACHIEVEMENTS.length}</b><br>
    ${t("streakTitle")}: <b>${state.streak?.count || 0}</b> (${t("best")}: ${state.streak?.longest || 0})<br>
    <hr style="border:none;border-top:1px solid var(--line);margin:6px 0">
    <b>${t("selfReflections")}:</b><br>${reflectionLines}
  `;

  const didSrc = (currentLang === "de" && typeof DIDACTICS_DE !== "undefined") ? DIDACTICS_DE : DIDACTICS;
  const did = didSrc[level.id] || DIDACTICS[level.id] || {};
  $("tDidacticNotes").innerHTML = did.notes || t("noNotes");
  $("tCommonErrors").innerHTML = did.errors || t("noErrors");
  $("tDifferentiation").innerHTML = did.differentiation || t("noDifferentiation");

  const savedNotes = localStorage.getItem("pyforge_teacher_notes") || "";
  $("tNotesArea").value = savedNotes;

  // Class tab
  if (teacherTab === "class") ClassMode.render();
  // Custom tab
  if (teacherTab === "custom") CustomChallenges.renderList();
}

// ═══════════════════════════════════════════════════════════
//  CLASS MODE (multi-save import + roster aggregation)
// ═══════════════════════════════════════════════════════════
const ClassMode = {
  saves: [],

  reset() {
    this.saves = [];
    this.render();
  },

  async addFiles(fileList) {
    for (const f of Array.from(fileList || [])) {
      try {
        const text = await f.text();
        const data = JSON.parse(text);
        if (data && typeof data === "object") {
          // tag with filename if no avatar name
          if (!data.avatar?.name) {
            data.avatar = data.avatar || {};
            data.avatar.name = f.name.replace(/\.json$/i, "");
          }
          this.saves.push(data);
        }
      } catch (e) {
        toast(`⚠️ ${currentLang === "de" ? "Konnte nicht laden" : "Could not load"}: ${escapeHTML(f.name)}`, { kind: "error" });
      }
    }
    this.render();
  },

  totalChallenges() {
    let n = 0;
    for (const lv of LEVELS) n += lv.challenges.length;
    return n;
  },

  aggregate() {
    const total = this.totalChallenges();
    const n = this.saves.length;
    if (n === 0) return null;
    let xpSum = 0, doneSum = 0, achSum = 0, streakSum = 0;
    const taskCounts = {}; // {chId: count of students who finished it}
    for (const s of this.saves) {
      xpSum    += s.xp || 0;
      doneSum  += (s.completed || []).length;
      achSum   += (s.unlockedAchievements || []).length;
      streakSum += s.streak?.longest || 0;
      for (const c of (s.completed || [])) {
        taskCounts[c] = (taskCounts[c] || 0) + 1;
      }
    }
    // hardest = the task with lowest count among tasks any student attempted
    const counts = Object.entries(taskCounts).sort((a,b) => a[1] - b[1]);
    const easiest = counts[counts.length - 1];
    const hardest = counts[0];
    return {
      n,
      total,
      avgXp: Math.round(xpSum / n),
      avgDone: (doneSum / n).toFixed(1),
      avgAch: (achSum / n).toFixed(1),
      avgLongestStreak: (streakSum / n).toFixed(1),
      mostSolved: easiest,
      leastSolved: hardest,
    };
  },

  render() {
    const dropzone = $("classDropzone");
    if (!dropzone) return;
    $("classDropzoneText").innerHTML = currentLang === "de"
      ? "Ziehe .json-Spielstände hierher<br>oder klicke zum Auswählen"
      : "Drop .json save files here<br>or click to select multiple";
    $("tClassImportTitle").textContent = currentLang === "de" ? "Schüler-Spielstände importieren" : "Import student saves";
    $("tClassStatsTitle").textContent  = currentLang === "de" ? "Zusammenfassung" : "Aggregate";
    $("tClassRosterTitle").textContent = currentLang === "de" ? "Schüler:innen" : "Roster";
    $("thClsName").textContent = currentLang === "de" ? "Name" : "Name";
    $("thClsXp").textContent   = "XP";
    $("thClsCh").textContent   = currentLang === "de" ? "Fertig" : "Done";
    if ($("thClsNotes")) $("thClsNotes").textContent = "📝";

    const hasSaves = this.saves.length > 0;
    $("classClearBtn").hidden     = !hasSaves;
    $("classExportCsvBtn").hidden = !hasSaves;
    $("classStatsSection").hidden = !hasSaves;
    $("classTableSection").hidden = !hasSaves;
    if (!hasSaves) return;

    const agg = this.aggregate();
    const stats = $("classStats");
    const total = agg.total;
    const isDE = currentLang === "de";
    stats.innerHTML = `
      <div><b>${agg.n}</b> ${isDE ? "Spielstände" : "saves"}</div>
      <div>${isDE ? "Ø XP" : "Avg XP"}: <b>${agg.avgXp}</b></div>
      <div>${isDE ? "Ø abgeschlossen" : "Avg done"}: <b>${agg.avgDone}/${total}</b></div>
      <div>${isDE ? "Ø Achievements" : "Avg achievements"}: <b>${agg.avgAch}/${ACHIEVEMENTS.length}</b></div>
      <div>${isDE ? "Ø längste Streak" : "Avg longest streak"}: <b>${agg.avgLongestStreak}</b></div>
      ${agg.leastSolved ? `<div>${isDE ? "Schwierigste Aufgabe" : "Hardest task"}: <b>${agg.leastSolved[0]}</b> (${agg.leastSolved[1]}/${agg.n})</div>` : ""}
      ${agg.mostSolved  ? `<div>${isDE ? "Leichteste Aufgabe" : "Easiest task"}: <b>${agg.mostSolved[0]}</b> (${agg.mostSolved[1]}/${agg.n})</div>` : ""}
    `;
    const tbody = $("classTableBody");
    tbody.innerHTML = this.saves.map((s, i) => {
      const name = s.avatar?.name || `#${i + 1}`;
      const avEmoji = (AVATARS.find(a => a.id === s.avatar?.id) || AVATARS[0]).emoji;
      const xp = s.xp || 0;
      const done = (s.completed || []).length;
      const ach = (s.unlockedAchievements || []).length;
      const streak = s.streak?.longest || 0;
      const noteCount = s._notes ? Object.keys(s._notes).length : 0;
      const noteBadge = noteCount > 0
        ? `<button class="class-note-badge" data-i="${i}" title="${currentLang === "de" ? "Notizen ansehen" : "View notes"}">📝 ${noteCount}</button>`
        : "—";
      return `<tr>
        <td>${avEmoji} ${escapeHTML(name)}</td>
        <td>${xp}</td>
        <td>${done}/${total}</td>
        <td>${ach}</td>
        <td>${streak}</td>
        <td>${noteBadge}</td>
      </tr>`;
    }).join("");
    tbody.querySelectorAll(".class-note-badge").forEach(b => {
      b.addEventListener("click", () => this.openNotesModal(parseInt(b.dataset.i, 10)));
    });
  },

  openNotesModal(idx) {
    const s = this.saves[idx];
    if (!s || !s._notes) return;
    const isDE = currentLang === "de";
    const name = s.avatar?.name || `#${idx + 1}`;
    const entries = Object.entries(s._notes).sort(([a], [b]) => a.localeCompare(b));
    $("classNotesTitle").textContent = `📝 ${isDE ? "Notizen von" : "Notes by"} ${name}`;
    $("classNotesClose").textContent = t("close");
    $("classNotesBody").innerHTML = entries.length === 0
      ? `<div style="color:var(--muted);font-style:italic">${isDE ? "Keine Notizen" : "No notes"}</div>`
      : entries.map(([chId, text]) =>
          `<div class="cn-row">
             <div class="cn-cid">${escapeHTML(chId)}</div>
             <div class="cn-text">${escapeHTML(text)}</div>
           </div>`
        ).join("");
    $("classNotesModal").hidden = false;
  },

  exportCsv() {
    const total = this.totalChallenges();
    const lines = ["name,xp,done,total,achievements,longest_streak"];
    for (const s of this.saves) {
      const name = (s.avatar?.name || "").replace(/[",\n]/g, " ");
      lines.push([
        `"${name}"`,
        s.xp || 0,
        (s.completed || []).length,
        total,
        (s.unlockedAchievements || []).length,
        s.streak?.longest || 0,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pywinkelix-class-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// ═══════════════════════════════════════════════════════════
//  CUSTOM CHALLENGES (teacher-authored, persisted in localStorage)
// ═══════════════════════════════════════════════════════════
const CUSTOM_KEY = "pyforge_custom_challenges";
const CUSTOM_LEVEL_ID = 13;
const CustomChallenges = {
  list: [],
  editingId: null,

  load() {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      this.list = raw ? JSON.parse(raw) : [];
    } catch (e) { this.list = []; }
  },

  persist() {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(this.list)); } catch (e) {}
  },

  injectAsLevel() {
    if (this.list.length === 0) {
      // remove level 13 if it exists
      const idx = LEVELS.findIndex(l => l.id === CUSTOM_LEVEL_ID);
      if (idx >= 0) LEVELS.splice(idx, 1);
      return;
    }
    const challenges = this.list.map(c => this.toChallenge(c));
    let existing = LEVELS.find(l => l.id === CUSTOM_LEVEL_ID);
    if (existing) {
      existing.challenges = challenges;
    } else {
      LEVELS.push({
        id: CUSTOM_LEVEL_ID,
        title: "Teacher",
        title_de: "Lehrkraft",
        desc: "Custom challenges",
        desc_de: "Eigene Aufgaben",
        challenges,
      });
    }
  },

  toChallenge(c) {
    const expected = (c.expected || "").trim();
    const id = `13.${c.id}`;
    return {
      id,
      title: c.title || "Untitled",
      title_de: c.title || "Untitled",
      xp: c.xp || 20,
      type: "code",
      instructions: c.instructions || "<p>—</p>",
      instructions_de: c.instructions || "<p>—</p>",
      starter: c.starter || "",
      starter_de: c.starter || "",
      hints: (c.hints || []).slice(),
      hints_de: (c.hints || []).slice(),
      check(output) {
        if (!expected) return { pass: true, msg: "OK" };
        if (output.trim() === expected) return { pass: true, msg: "OK!" };
        return { pass: false, msg: `Expected:\n${expected}\n\nGot:\n${output.trim()}` };
      },
    };
  },

  openEditor(id) {
    this.editingId = id || null;
    const c = id ? this.list.find(x => x.id === id) : { title: "", instructions: "", starter: "", expected: "", hints: [], xp: 20 };
    if (!c) return;
    $("customTitle").value = c.title || "";
    $("customInstructions").value = c.instructions || "";
    $("customStarter").value = c.starter || "";
    $("customExpected").value = c.expected || "";
    $("customHints").value = (c.hints || []).join("\n");
    $("customXp").value = c.xp || 20;
    $("customDeleteBtn").hidden = !id;
    $("customEditorModal").hidden = false;
  },
  closeEditor() {
    $("customEditorModal").hidden = true;
    this.editingId = null;
  },
  saveEditor() {
    const title = $("customTitle").value.trim();
    if (!title) {
      toast(`⚠️ ${currentLang === "de" ? "Titel fehlt" : "Title is missing"}`, { kind: "error" });
      return;
    }
    const data = {
      id: this.editingId || ("c" + Date.now().toString(36)),
      title,
      instructions: $("customInstructions").value,
      starter: $("customStarter").value,
      expected: $("customExpected").value,
      hints: $("customHints").value.split("\n").map(s => s.trim()).filter(Boolean),
      xp: parseInt($("customXp").value, 10) || 20,
    };
    const idx = this.list.findIndex(c => c.id === data.id);
    if (idx >= 0) this.list[idx] = data;
    else this.list.push(data);
    this.persist();
    this.injectAsLevel();
    this.renderList();
    this.closeEditor();
    renderAll();
    toast(`💾 ${currentLang === "de" ? "Aufgabe gespeichert" : "Challenge saved"}`, { kind: "success" });
  },
  deleteEditing() {
    if (!this.editingId) return;
    if (!confirm(currentLang === "de" ? "Aufgabe löschen?" : "Delete this challenge?")) return;
    this.list = this.list.filter(c => c.id !== this.editingId);
    this.persist();
    this.injectAsLevel();
    this.renderList();
    this.closeEditor();
    renderAll();
  },
  exportAll() {
    const blob = new Blob([JSON.stringify(this.list, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pywinkelix-custom-challenges-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  async importFile(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      // simple merge by id; new entries appended
      for (const c of parsed) {
        if (!c.id) c.id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2,4);
        const idx = this.list.findIndex(x => x.id === c.id);
        if (idx >= 0) this.list[idx] = c;
        else this.list.push(c);
      }
      this.persist();
      this.injectAsLevel();
      this.renderList();
      renderAll();
      toast(`📥 ${currentLang === "de" ? "Aufgaben importiert" : "Challenges imported"} (${parsed.length})`, { kind: "success" });
    } catch (e) {
      toast(`⚠️ ${currentLang === "de" ? "Ungültige Datei" : "Invalid file"}`, { kind: "error" });
    }
  },
  renderList() {
    const ul = $("customList");
    if (!ul) return;
    $("tCustomTitle").textContent = currentLang === "de" ? "Deine eigenen Aufgaben" : "Your own challenges";
    $("tCustomIntro").textContent = currentLang === "de"
      ? 'Eigene Aufgaben erscheinen als Level 13 ("Lehrkraft") für deine Schüler:innen. Werden nur in diesem Browser gespeichert (export für Backup).'
      : 'Custom challenges appear as Level 13 ("Teacher") for your students. Stored only in this browser unless exported.';
    if (this.list.length === 0) {
      ul.innerHTML = `<li class="custom-empty">${currentLang === "de" ? "Noch keine eigenen Aufgaben." : "No custom challenges yet."}</li>`;
      return;
    }
    ul.innerHTML = this.list.map(c => `
      <li class="custom-item" data-id="${c.id}">
        <div class="custom-item-title">${escapeHTML(c.title)}</div>
        <div class="custom-item-meta">${c.xp} XP · ${(c.hints || []).length} hints</div>
        <button class="t-btn custom-edit" data-id="${c.id}">${currentLang === "de" ? "Bearbeiten" : "Edit"}</button>
      </li>
    `).join("");
    ul.querySelectorAll(".custom-edit").forEach(btn => {
      btn.addEventListener("click", () => this.openEditor(btn.dataset.id));
    });
  },
};

// ═══════════════════════════════════════════════════════════
//  CLASS LINK BUILDER + STUDENT-SIDE ASSIGNMENT BANNER
// ═══════════════════════════════════════════════════════════
const ClassLink = {
  open() {
    $("classLinkOut").hidden = true;
    $("lblClassLinkName").textContent = currentLang === "de" ? "Klassen-Name (optional)" : "Class name (optional)";
    $("classLinkIntro").textContent = currentLang === "de"
      ? "Wähle Aufgaben, auf die sich deine Klasse konzentrieren soll. Schüler:innen sehen einen Klassen-Banner."
      : 'Pick the challenges your students should focus on. They will see a "Class assignment" banner.';
    $("lblClassLinkUrl").textContent = currentLang === "de" ? "Diese URL mit deiner Klasse teilen:" : "Share this URL with your class:";
    $("classLinkBuildBtn").textContent = currentLang === "de" ? "Link erzeugen" : "Build link";
    $("classLinkCloseBtn").textContent = t("close");
    const pick = $("classLinkPick");
    pick.innerHTML = LEVELS.map(lv => `
      <div class="cl-level">
        <div class="cl-level-h">
          <label><input type="checkbox" class="cl-lvl" data-lvl="${lv.id}"> <b>${lv.id}.</b> ${escapeHTML(tLevel(lv))}</label>
        </div>
        <div class="cl-ch-list">
          ${lv.challenges.map(c => `<label class="cl-ch"><input type="checkbox" class="cl-task" data-id="${c.id}"> ${escapeHTML(c.id)} ${escapeHTML(tChTitle(c))}</label>`).join("")}
        </div>
      </div>
    `).join("");
    pick.querySelectorAll(".cl-lvl").forEach(cb => {
      cb.addEventListener("change", e => {
        const lvlId = parseInt(cb.dataset.lvl, 10);
        const lvl = LEVELS.find(l => l.id === lvlId);
        if (!lvl) return;
        lvl.challenges.forEach(c => {
          const child = pick.querySelector(`.cl-task[data-id="${c.id}"]`);
          if (child) child.checked = cb.checked;
        });
      });
    });
    $("classLinkModal").hidden = false;
  },
  close() { $("classLinkModal").hidden = true; },
  build() {
    const selected = Array.from(document.querySelectorAll(".cl-task:checked")).map(i => i.dataset.id);
    if (selected.length === 0) {
      toast(`⚠️ ${currentLang === "de" ? "Wähle mindestens eine Aufgabe" : "Pick at least one challenge"}`, { kind: "error" });
      return;
    }
    const className = $("classLinkName").value.trim();
    const params = new URLSearchParams();
    if (className) params.set("class", className);
    params.set("tasks", selected.join(","));
    const url = location.origin + location.pathname + "?" + params.toString();
    $("classLinkUrl").value = url;
    $("classLinkOut").hidden = false;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast(`🔗 ${currentLang === "de" ? "Link kopiert!" : "Link copied!"}`, { kind: "success" });
      }).catch(() => {});
    }
  },
};

let classAssignment = null; // {name, taskIds: Set}
function readClassAssignmentFromURL() {
  try {
    const url = new URL(location.href);
    const tasks = url.searchParams.get("tasks");
    if (!tasks) return null;
    const taskIds = new Set(tasks.split(",").map(s => s.trim()).filter(Boolean));
    if (taskIds.size === 0) return null;
    return { name: url.searchParams.get("class") || "", taskIds };
  } catch (e) { return null; }
}

function loadSolutionInEditor() {
  const ch = getCurrentChallenge();
  if (!ch || !SOLUTIONS[ch.id]) return;
  Editor.setValue(SOLUTIONS[ch.id]);
  $("codeArea").dataset.loaded = ch.id;
}
async function runSolutionInEditor() {
  const ch = getCurrentChallenge();
  if (!ch || !SOLUTIONS[ch.id]) return;
  Editor.setValue(SOLUTIONS[ch.id]);
  $("codeArea").dataset.loaded = ch.id;
  await handleRun();
}

// ═══════════════════════════════════════════════════════════
//  HELPERS for new data fields
// ═══════════════════════════════════════════════════════════
function tChObjectives(ch) {
  if (currentLang === "de" && ch.objectives_de) return ch.objectives_de;
  return ch.objectives || null;
}
function getLevelStory(levelId) {
  const src = (currentLang === "de" && typeof LEVEL_STORIES_DE !== "undefined") ? LEVEL_STORIES_DE : (typeof LEVEL_STORIES !== "undefined" ? LEVEL_STORIES : {});
  return src[levelId] || null;
}

// ═══════════════════════════════════════════════════════════
//  PWA
// ═══════════════════════════════════════════════════════════
function registerPWA() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function() {
  if (typeof Sk === "undefined") {
    setTimeout(() => { skulptReady = typeof Sk !== "undefined"; }, 3000);
  }

  const hasSave = loadState();
  applySettings();

  if (hasSave && state.completed.length > 0) {
    $("btnContinue").hidden = false;
  }
  $("btnStart").addEventListener("click", () => {
    resetState();
    applySettings();
    $("welcomeModal").hidden = true;
    openAvatarModal(true);
    // Tutorial.start() now runs inside confirmAvatar() — see there.
  });
  $("btnContinue").addEventListener("click", () => {
    $("welcomeModal").hidden = true;
    if (!state.avatar) {
      openAvatarModal(true);
      // Tutorial fires from confirmAvatar()
    } else {
      renderAll();
      // Show tutorial once for returning players upgrading from older waves.
      setTimeout(() => {
        try { Tutorial.start(); }
        catch (e) { console.error("[PyWinkelix] Tutorial.start failed:", e); }
      }, 400);
    }
  });
  $("btnReset2").addEventListener("click", () => {
    if (confirm(t("confirmReset"))) {
      resetState();
      applySettings();
      $("welcomeModal").hidden = true;
      openAvatarModal(true);
    }
  });

  // Import save from welcome
  const btnImport = $("btnImportSave");
  if (btnImport) {
    btnImport.addEventListener("click", () => $("importFile").click());
  }
  const importFile = $("importFile");
  if (importFile) {
    importFile.addEventListener("change", e => {
      if (e.target.files[0]) importSave(e.target.files[0]);
    });
  }

  // Editor buttons
  $("btnRun").addEventListener("click", handleRun);
  $("btnCheck").addEventListener("click", handleCheck);
  $("btnStep").addEventListener("click", handleStep);
  $("btnSnippets").addEventListener("click", () => Snippets.open());
  // Snippets modal
  $("snipTabBuiltins").addEventListener("click", () => Snippets.setTab("builtins"));
  $("snipTabMine").addEventListener("click", () => Snippets.setTab("mine"));
  $("snippetsClose").addEventListener("click", () => Snippets.close());
  $("snippetsSaveCurrent").addEventListener("click", () => Snippets.promptSave());
  $("saveSnipConfirm").addEventListener("click", () => Snippets.confirmSave());
  $("saveSnipCancel").addEventListener("click", () => { $("saveSnipModal").hidden = true; });
  $("saveSnipName").addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); Snippets.confirmSave(); }
  });
  $("btnDownload").addEventListener("click", handleDownload);
  $("btnResetCode").addEventListener("click", handleResetCode);
  // Step modal controls
  $("stepClose").addEventListener("click", () => Stepper.close());
  $("stepPrev").addEventListener("click", () => Stepper.prev());
  $("stepNext").addEventListener("click", () => Stepper.next());
  $("stepSlider").addEventListener("input", e => Stepper.show(parseInt(e.target.value, 10) - 1));
  // Compare modal
  $("compareClose").addEventListener("click", () => Compare.close());
  $("btnPrev").addEventListener("click", goPrev);
  $("btnNext").addEventListener("click", goNext);
  $("btnSandboxToggle").addEventListener("click", toggleSandbox);

  // Tab key + Ctrl+Enter
  $("codeArea").addEventListener("keydown", function(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 4;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleRun();
    }
  });
  $("codeArea").addEventListener("input", function() {
    if (sandboxMode) {
      state.sandbox.code = this.value;
      saveState();
    } else {
      saveCurrentChallengeCode(this.value);
    }
  });

  // Reference toggle
  $("refToggle").addEventListener("click", () => {
    const el = $("refContent");
    el.hidden = !el.hidden;
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", function(e) {
    if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
  });

  // Settings
  $("btnSettings").addEventListener("click", openSettings);
  $("settingsClose").addEventListener("click", closeSettings);
  document.querySelectorAll('input[name="set-theme"]').forEach(i =>
    i.addEventListener("change", e => setSetting("theme", e.target.value))
  );
  document.querySelectorAll('input[name="set-font"]').forEach(i =>
    i.addEventListener("change", e => setSetting("fontSize", e.target.value))
  );
  $("setSound").addEventListener("change", e => setSetting("sound", e.target.checked));
  $("setConfetti").addEventListener("change", e => setSetting("confetti", e.target.checked));
  $("setMotion").addEventListener("change", e => setSetting("reducedMotion", e.target.checked));
  $("setPomodoro").addEventListener("change", e => setSetting("pomodoro", e.target.checked));
  $("setDyslexia").addEventListener("change", e => setSetting("dyslexiaFont", e.target.checked));
  $("setContrast").addEventListener("change", e => setSetting("highContrast", e.target.checked));
  $("setVoiceRate").addEventListener("input", e => setSetting("voiceRate", parseFloat(e.target.value)));
  $("setVoice").addEventListener("change", e => setSetting("voiceURI", e.target.value));
  $("setVoiceAnnounce").addEventListener("change", e => setSetting("voiceAnnounce", e.target.checked));
  $("btnSpeak").addEventListener("click", speakCurrentLesson);

  // Stats button
  $("btnStats").addEventListener("click", () => Stats.open());
  $("statsClose").addEventListener("click", () => Stats.close());

  // Tutorial buttons
  $("tutorialNext")?.addEventListener("click", () => Tutorial.next());
  $("tutorialSkip")?.addEventListener("click", () => Tutorial.skip());

  // Welcome-modal language picker
  document.querySelectorAll(".lang-pick").forEach(btn => {
    btn.addEventListener("click", () => {
      setLang(btn.dataset.lang);                 // updates currentLang + renderAll
      try { refreshWelcomeModalI18n(); } catch (e) {}  // welcome title/buttons + tip/daily
      document.querySelectorAll(".lang-pick").forEach(b =>
        b.classList.toggle("active", b.dataset.lang === currentLang));
    });
  });
  document.querySelectorAll(".lang-pick").forEach(b =>
    b.classList.toggle("active", b.dataset.lang === currentLang));

  // Cutscene modal
  $("cutsceneNext")?.addEventListener("click", () => Cutscene.next());
  $("cutscenePrev")?.addEventListener("click", () => Cutscene.prev());
  $("cutsceneSkip")?.addEventListener("click", () => Cutscene.skip());

  // Share modal
  $("shareCloseBtn")?.addEventListener("click", () => { $("shareModal").hidden = true; });
  $("shareCopyBtn")?.addEventListener("click", () => {
    const url = $("shareUrlText").value;
    if (!url) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast(`📋 ${currentLang === "de" ? "Kopiert!" : "Copied!"}`, { kind: "success", ttl: 2000 });
      }).catch(() => $("shareUrlText").select());
    } else {
      $("shareUrlText").select();
    }
  });

  // Populate voice list once speechSynthesis voices are loaded
  if (Voice.available()) {
    populateVoiceOptions();
    speechSynthesis.onvoiceschanged = populateVoiceOptions;
  }
  $("btnExportSave").addEventListener("click", exportSave);
  $("btnImportSave2").addEventListener("click", () => $("importFile2").click());
  $("importFile2").addEventListener("change", e => {
    if (e.target.files[0]) importSave(e.target.files[0]);
  });

  // Avatar
  $("avConfirm").addEventListener("click", confirmAvatar);
  $("avatarBadge").addEventListener("click", () => openAvatarModal(false));

  // Reflection
  document.querySelectorAll(".smiley-btn").forEach(b => {
    b.addEventListener("click", () => submitReflection(parseInt(b.dataset.value, 10)));
  });
  $("reflectionSkip").addEventListener("click", closeReflection);

  // Teacher mode
  $("teacherBtn").addEventListener("click", () => {
    if (teacherMode) exitTeacherMode();
    else {
      $("teacherPwModal").hidden = false;
      $("teacherPwInput").value = "";
      $("teacherPwInput").focus();
    }
  });
  $("teacherPwSubmit").addEventListener("click", () => attemptTeacherLogin());
  $("teacherPwCancel").addEventListener("click", () => {
    $("teacherPwModal").hidden = true;
    $("teacherPwInput").value = "";
  });
  $("teacherPwInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); attemptTeacherLogin(); }
  });
  $("tNotesArea").addEventListener("input", () => {
    localStorage.setItem("pyforge_teacher_notes", $("tNotesArea").value);
  });

  // Share button + URL code import
  $("btnShare").addEventListener("click", handleShare);
  maybeLoadCodeFromURL();
  maybeLoadSnippetFromURL();

  // Output tabs (text / turtle / vars)
  $("outTabText").addEventListener("click", () => switchOutputTab("text"));
  $("outTabTurtle").addEventListener("click", () => switchOutputTab("turtle"));
  $("outTabVars").addEventListener("click", () => switchOutputTab("vars"));

  // Tip of the day + daily challenge on welcome screen
  if (!$("welcomeModal").hidden) {
    showTipOnWelcome();
    showDailyOnWelcome();
  }

  // Keyboard shortcuts help (press ?)
  document.addEventListener("keydown", e => {
    if (e.key === "?" && !["INPUT","TEXTAREA"].includes(e.target.tagName) && !document.querySelector(".CodeMirror-focused")) {
      e.preventDefault();
      openShortcutsHelp();
    }
  });
  $("shortcutsCloseBtn")?.addEventListener("click", closeShortcutsHelp);
  $("btnHelp")?.addEventListener("click", openShortcutsHelp);

  // ─── Class Mode (multi-save import + roster) ───
  const dz = $("classDropzone");
  if (dz) {
    dz.addEventListener("click", () => $("classFileInput").click());
    dz.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("classFileInput").click(); } });
    dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("hover"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("hover"));
    dz.addEventListener("drop", e => {
      e.preventDefault();
      dz.classList.remove("hover");
      ClassMode.addFiles(e.dataTransfer.files);
    });
  }
  $("classFileInput")?.addEventListener("change", e => ClassMode.addFiles(e.target.files));
  $("classClearBtn")?.addEventListener("click", () => ClassMode.reset());
  $("classExportCsvBtn")?.addEventListener("click", () => ClassMode.exportCsv());
  $("classBuildLinkBtn")?.addEventListener("click", () => ClassLink.open());
  $("classNotesClose")?.addEventListener("click", () => { $("classNotesModal").hidden = true; });

  // ─── Class Link Builder ───
  $("classLinkBuildBtn")?.addEventListener("click", () => ClassLink.build());
  $("classLinkCloseBtn")?.addEventListener("click", () => ClassLink.close());

  // ─── Custom Challenges ───
  CustomChallenges.load();
  CustomChallenges.injectAsLevel();
  $("customAddBtn")?.addEventListener("click", () => CustomChallenges.openEditor(null));
  $("customExportBtn")?.addEventListener("click", () => CustomChallenges.exportAll());
  $("customImportBtn")?.addEventListener("click", () => $("customImportFile").click());
  $("customImportFile")?.addEventListener("change", e => {
    if (e.target.files[0]) CustomChallenges.importFile(e.target.files[0]);
  });
  $("customSaveBtn")?.addEventListener("click", () => CustomChallenges.saveEditor());
  $("customCancelBtn")?.addEventListener("click", () => CustomChallenges.closeEditor());
  $("customDeleteBtn")?.addEventListener("click", () => CustomChallenges.deleteEditing());

  // ─── Class assignment from URL ───
  classAssignment = readClassAssignmentFromURL();

  // Initial language + UI
  document.documentElement.lang = currentLang;
  updateStaticUI();
  $("outputArea").textContent = t("outputPlaceholder");

  if (!state.startedAt) state.startedAt = Date.now();

  // Mount CodeMirror editor (falls back to plain textarea if CM didn't load)
  Editor.init();

  // Pomodoro auto-start if enabled
  if (Pomodoro.enabled()) Pomodoro.start();

  // Konami code easter egg
  document.addEventListener("keydown", watchKonami);

  // Lesson notes toggle
  $("lessonNotesToggle")?.addEventListener("click", () => LessonNotes.toggle());
  // initial count for achievements
  state.notedChallenges = LessonNotes.countAll();

  // Speedrun: setup + listeners
  $("btnSpeedrun")?.addEventListener("click", () => {
    $("welcomeModal").hidden = true;
    if (!state.avatar) {
      openAvatarModal(true);
      // we still want to show the speedrun modal on top of avatar — easier: ask for avatar first, then setup
    }
    openSpeedrunModal();
  });
  $("speedrunStart")?.addEventListener("click", () => {
    const count  = parseInt(document.querySelector('input[name="sr-count"]:checked')?.value, 10) || 10;
    const filter = document.querySelector('input[name="sr-filter"]:checked')?.value || "all";
    $("speedrunModal").hidden = true;
    Speedrun.start({ count, filter });
  });
  $("speedrunCancel")?.addEventListener("click", () => { $("speedrunModal").hidden = true; });
  $("btnSpeedrunSkip")?.addEventListener("click", () => Speedrun.skip());
  $("srResultClose")?.addEventListener("click", () => { $("speedrunResultModal").hidden = true; });
  $("srResultAgain")?.addEventListener("click", () => {
    $("speedrunResultModal").hidden = true;
    openSpeedrunModal();
  });
  // Resume any in-flight speedrun
  if (state.speedrun && state.speedrun.queue && state.speedrun.queue.length > 0) Speedrun.startTicker();

  renderAll();
  // Guarantee the welcome modal is fully in the current language, even if a
  // render step above hiccupped — title/buttons + tip + daily, all together.
  refreshWelcomeModalI18n();
  registerPWA();
});

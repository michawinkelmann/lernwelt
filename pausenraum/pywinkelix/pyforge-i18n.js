// ═══════════════════════════════════════════════════════════
//  INTERNATIONALIZATION (i18n) – English / Deutsch
// ═══════════════════════════════════════════════════════════
function _detectInitialLang() {
  try {
    const saved = localStorage.getItem("pyforge_lang");
    if (saved === "de" || saved === "en") return saved;
  } catch (e) {}
  try {
    const nav = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    if (nav.startsWith("de")) return "de";
  } catch (e) {}
  return "en";
}
let currentLang = _detectInitialLang();

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("pyforge_lang", lang);
  document.documentElement.lang = lang;
  updateStaticUI();
  if (typeof renderAll === "function") renderAll();
}

function t(key) {
  return (UI_STRINGS[key] && UI_STRINGS[key][currentLang]) || UI_STRINGS[key]?.en || key;
}

function tLevel(level) {
  if (currentLang === "de" && level.title_de) return level.title_de;
  return level.title;
}

function tLevelDesc(level) {
  if (currentLang === "de" && level.desc_de) return level.desc_de;
  return level.desc;
}

function tChTitle(ch) {
  if (currentLang === "de" && ch.title_de) return ch.title_de;
  return ch.title;
}

function tChInstructions(ch) {
  if (currentLang === "de" && ch.instructions_de) return ch.instructions_de;
  return ch.instructions;
}

function tChHints(ch) {
  if (currentLang === "de" && ch.hints_de) return ch.hints_de;
  return ch.hints;
}

function tChStarter(ch) {
  if (currentLang === "de" && ch.starter_de) return ch.starter_de;
  return ch.starter;
}

// Update static HTML elements that don't go through renderAll
function updateStaticUI() {
  const langBtn = document.getElementById("langBtn");
  if (langBtn) langBtn.textContent = currentLang === "de" ? "DE | en" : "en | DE";
  document.title = currentLang === "de" ? "PyWinkelix - Python lernen" : "PyWinkelix - Learn Python";
}

// ─── UI Strings ───
const UI_STRINGS = {
  // Welcome modal
  welcomeTitle:        { en: "Welcome to PyWinkelix",  de: "Willkommen bei PyWinkelix" },
  welcomeText:         { en: "Learn Python step by step through 12 levels of gaming-themed challenges.",
                         de: "Lerne Python Schritt für Schritt durch 12 Level mit spielerischen Aufgaben." },
  welcomeSubtext:      { en: "Built-in Python interpreter · No setup required · Progress saves automatically",
                         de: "Eingebauter Python-Interpreter · Keine Installation nötig · Fortschritt wird automatisch gespeichert" },
  btnStart:            { en: "Start Learning",  de: "Loslegen" },
  btnContinue:         { en: "Continue",  de: "Fortsetzen" },
  btnResetProgress:    { en: "Reset Progress",  de: "Fortschritt zurücksetzen" },

  // Header
  level:               { en: "Level",  de: "Level" },

  // Card headers
  lesson:              { en: "Lesson",  de: "Lektion" },
  pythonEditor:        { en: "Python Editor",  de: "Python-Editor" },
  progress:            { en: "Progress",  de: "Fortschritt" },

  // Challenge
  challenge:           { en: "Challenge",  de: "Aufgabe" },

  // Editor
  outputPlaceholder:   { en: "Output will appear here...",  de: "Ausgabe erscheint hier..." },
  btnRun:              { en: "▶ Run",  de: "▶ Ausführen" },
  btnCheck:            { en: "✓ Check",  de: "✓ Prüfen" },
  btnDownload:         { en: "⭳ Download .py",  de: "⭳ Download .py" },
  btnResetCode:        { en: "↻ Reset Code",  de: "↻ Code zurücksetzen" },

  // Lesson nav
  btnPrev:             { en: "« Previous",  de: "« Zurück" },
  btnNext:             { en: "Next »",  de: "Weiter »" },

  // Quick Reference
  quickRef:            { en: "📖 Quick Reference",  de: "📖 Kurzreferenz" },

  // Hints
  hint:                { en: "Hint",  de: "Hinweis" },
  challengeComplete:   { en: "Challenge Complete!",  de: "Aufgabe abgeschlossen!" },

  // Status
  running:             { en: "Running...",  de: "Wird ausgeführt..." },
  checking:            { en: "Checking...",  de: "Wird geprüft..." },
  noOutput:            { en: "(No output)",  de: "(Keine Ausgabe)" },

  // Progress panel
  levels:              { en: "Levels",  de: "Level" },
  achievements:        { en: "Achievements",  de: "Erfolge" },

  // Confirm
  confirmReset:        { en: "Reset all progress?",  de: "Gesamten Fortschritt zurücksetzen?" },

  // Teacher mode
  teacherMode:         { en: "Teacher Mode",  de: "Lehrer-Modus" },
  teacherPwPrompt:     { en: "Enter password to unlock",  de: "Passwort eingeben zum Entsperren" },
  teacherPwError:      { en: "Incorrect password.",  de: "Falsches Passwort." },
  solution:            { en: "Solution",  de: "Lösung" },
  overview:            { en: "Overview",  de: "Übersicht" },
  didactics:           { en: "Didactics",  de: "Didaktik" },
  notes:               { en: "Notes",  de: "Notizen" },
  exit:                { en: "Exit",  de: "Beenden" },
  solutionFor:         { en: "Solution: Challenge",  de: "Lösung: Aufgabe" },
  allHints:            { en: "All Hints",  de: "Alle Hinweise" },
  validationLogic:     { en: "Validation Logic",  de: "Validierungslogik" },
  loadSolution:        { en: "📋 Load solution into editor",  de: "📋 Lösung in Editor laden" },
  runSolution:         { en: "▶ Run solution",  de: "▶ Lösung ausführen" },
  allChallengesOverview:{ en: "All Challenges Overview",  de: "Übersicht aller Aufgaben" },
  challengeCol:        { en: "Challenge",  de: "Aufgabe" },
  status:              { en: "Status",  de: "Status" },
  statistics:          { en: "Statistics",  de: "Statistiken" },
  challengesCompleted: { en: "Challenges completed",  de: "Aufgaben abgeschlossen" },
  xpEarned:            { en: "XP earned",  de: "XP verdient" },
  hintsUsed:           { en: "Hints used",  de: "Hinweise verwendet" },
  errorsEncountered:   { en: "Errors encountered",  de: "Fehler aufgetreten" },
  hintFreeCompletions: { en: "Hint-free completions",  de: "Ohne Hinweise gelöst" },
  didacticNotes:       { en: "Didactic Notes for Current Challenge",  de: "Didaktische Hinweise zur aktuellen Aufgabe" },
  commonMistakes:      { en: "Common Mistakes & Misconceptions",  de: "Häufige Fehler & Missverständnisse" },
  differentiationIdeas:{ en: "Differentiation Ideas",  de: "Differenzierungsideen" },
  yourNotes:           { en: "Your Notes (saved in browser)",  de: "Deine Notizen (im Browser gespeichert)" },
  notesPlaceholder:    { en: "Write your notes here... (auto-saved)",  de: "Schreibe deine Notizen hier... (automatisch gespeichert)" },
  noNotes:             { en: "No specific notes for this level.",  de: "Keine spezifischen Hinweise für dieses Level." },
  noErrors:            { en: "No common errors documented.",  de: "Keine häufigen Fehler dokumentiert." },
  noDifferentiation:   { en: "No differentiation ideas documented.",  de: "Keine Differenzierungsideen dokumentiert." },
  noSolution:          { en: "(No solution available)",  de: "(Keine Lösung verfügbar)" },
  noHints:             { en: "(No hints)",  de: "(Keine Hinweise)" },

  // Footer
  footer:              { en: "PyWinkelix · Dr. Winkelmann · Python Learning Game",
                         de: "PyWinkelix · Dr. Winkelmann · Python-Lernspiel" },

  // Reference headings (non-code parts)
  refPrint:            { en: "display output",  de: "Ausgabe anzeigen" },
  refFstringFmt:       { en: "f-string formatting",  de: "f-String-Formatierung" },
  refConditionals:     { en: "Conditionals",  de: "Bedingungen" },
  refLoops:            { en: "Loops",  de: "Schleifen" },
  refFunctions:        { en: "Functions",  de: "Funktionen" },
  refLists:            { en: "Lists",  de: "Listen" },
  refDicts:            { en: "Dicts",  de: "Dicts" },
  refStrings:          { en: "Strings",  de: "Strings" },
  refClasses:          { en: "Classes",  de: "Klassen" },
  refInheritance:      { en: "Inheritance",  de: "Vererbung" },
  ref2DLists:          { en: "2D Lists",  de: "2D-Listen" },
  refAdvanced:         { en: "Advanced",  de: "Fortgeschritten" },
  refEverything:       { en: "Everything!",  de: "Alles!" },
  refKnowItAll:        { en: "You know it all now. Check previous levels for reference.",
                         de: "Du kannst jetzt alles. Schau in vorherige Level für Referenzen." },
  refAccess:           { en: "access",  de: "Zugriff" },
  refOverrideMethods:  { en: "Override methods",  de: "Methoden überschreiben" },
  refSlicing:          { en: "slicing",  de: "Slicing" },

  // ─── Avatars ───
  avatarWarrior:       { en: "Warrior",       de: "Kriegerin" },
  avatarMage:          { en: "Mage",          de: "Magierin" },
  avatarRogue:         { en: "Rogue",         de: "Schurke" },
  avatarRanger:        { en: "Ranger",        de: "Waldläuferin" },
  avatarHealer:        { en: "Healer",        de: "Heilerin" },
  avatarRobot:         { en: "Robot",         de: "Roboter" },

  chooseAvatar:        { en: "Choose your hero", de: "Wähle deine Heldin / deinen Helden" },
  chooseAvatarSub:     { en: "Your character will accompany you through all 12 levels.",
                         de: "Dein Charakter begleitet dich durch alle 12 Level." },
  yourName:            { en: "Your name (optional)", de: "Dein Name (optional)" },
  namePlaceholder:     { en: "Type your name…",  de: "Trag deinen Namen ein…" },
  letsGo:              { en: "Let's go!",      de: "Los geht's!" },
  editAvatar:          { en: "Edit avatar",    de: "Avatar bearbeiten" },
  welcomeHero:         { en: "Welcome",        de: "Willkommen" },

  // ─── Settings ───
  settings:            { en: "Settings",       de: "Einstellungen" },
  theme:               { en: "Theme",          de: "Design" },
  textSize:            { en: "Text size",      de: "Schriftgröße" },
  sound:               { en: "Sound",          de: "Sound" },
  confetti:            { en: "Confetti",       de: "Konfetti" },
  reducedMotion:       { en: "Reduced motion", de: "Weniger Bewegung" },
  dataExport:          { en: "Save data",      de: "Spielstand" },
  exportSave:          { en: "Export",         de: "Exportieren" },
  importSave:          { en: "Import",         de: "Importieren" },
  privacy:             { en: "Privacy",        de: "Datenschutz" },
  privacyText:         { en: "All data stays in your browser. No cookies, no tracking, no servers. You can export your save as JSON and import it on another device.",
                         de: "Alle Daten bleiben in deinem Browser. Keine Cookies, kein Tracking, keine Server. Du kannst deinen Spielstand als JSON exportieren und auf einem anderen Gerät importieren." },
  close:               { en: "Close",          de: "Schließen" },
  saveExported:        { en: "Save exported", de: "Spielstand exportiert" },
  saveImported:        { en: "Save imported", de: "Spielstand importiert" },
  invalidSaveFile:     { en: "Invalid save file", de: "Ungültige Spielstand-Datei" },

  // ─── Streak ───
  streakTitle:         { en: "Streak",         de: "Serie" },
  days:                { en: "days",           de: "Tage" },
  best:                { en: "best",           de: "Bestmarke" },

  // ─── Achievements / Level UI ───
  achievementUnlocked: { en: "Achievement unlocked", de: "Erfolg freigeschaltet" },
  levelComplete:       { en: "Level complete!",     de: "Level abgeschlossen!" },
  unlocked:            { en: "unlocked",            de: "freigeschaltet" },
  locked:              { en: "locked",              de: "gesperrt" },

  // ─── Reflection ───
  howConfident:        { en: "How confident do you feel now?", de: "Wie sicher fühlst du dich jetzt?" },
  thanksForFeedback:   { en: "Thanks for the feedback!", de: "Danke für die Rückmeldung!" },
  selfReflections:     { en: "Self-reflections", de: "Selbsteinschätzungen" },
  noReflections:       { en: "(none yet)",       de: "(noch keine)" },

  // ─── Objectives / Story ───
  learningGoals:       { en: "What you'll learn", de: "Was du danach kannst" },

  // ─── Sandbox ───
  sandbox:             { en: "Sandbox",          de: "Sandbox" },
  exitSandbox:         { en: "Exit sandbox",     de: "Sandbox verlassen" },
  sandboxTitle:        { en: "Sandbox — free coding mode", de: "Sandbox — freier Modus" },
  sandboxSubtitle:     { en: "No challenge. No pressure. Just code.", de: "Keine Aufgabe. Kein Druck. Einfach coden." },
  sandboxIntro:        { en: "Here you can experiment freely — try your own ideas, paste code, or play around.",
                         de: "Hier kannst du frei experimentieren — eigene Ideen ausprobieren, Code einfügen oder einfach spielen." },
  sandboxBullet1:      { en: "Your code is saved automatically.", de: "Dein Code wird automatisch gespeichert." },
  sandboxBullet2:      { en: "Press Ctrl+Enter to run.",           de: "Drücke Strg+Enter zum Ausführen." },
  sandboxBullet3:      { en: "Use the Quick Reference below for help.", de: "Nutze die Kurzreferenz unten als Hilfe." },

  interpreterLoading:  { en: "Python interpreter is still loading. Please wait a moment and try again.",
                         de: "Python-Interpreter lädt noch. Bitte einen Moment warten und nochmal versuchen." },

  // ─── Wave 2: task types, boss, sharing ───
  bossBattle:          { en: "Boss Battle",                              de: "Boss-Kampf" },
  bossIntro:           { en: "Combine what you've learned to win!",      de: "Kombiniere alles, was du gelernt hast!" },
  bossDefeated:        { en: "Boss defeated!",                           de: "Boss besiegt!" },
  btnShare:            { en: "\u{1f517} Share",                          de: "\u{1f517} Teilen" },
  shareCopiedTitle:    { en: "Link copied!",                             de: "Link kopiert!" },

  // ─── Wave 3: shortcuts, turtle, tips ───
  shortcuts:           { en: "Keyboard shortcuts",                       de: "Tastatur-Kürzel" },
  tipOfTheDay:         { en: "Tip of the day",                           de: "Tipp des Tages" },

  // ─── Wave 5: class mode + custom challenges ───
  tClassTab:           { en: "Class",                                    de: "Klasse" },
  tCustomTab:          { en: "Custom",                                   de: "Eigene" },
  classAssignment:     { en: "Class assignment",                         de: "Klassen-Aufgabe" },

  // ─── Wave 6: step debugger + compare ───
  btnStep:             { en: "👣 Step",                                  de: "👣 Schritt" },
  compareSolution:     { en: "🔍 Compare with example solution",         de: "🔍 Mit Beispiellösung vergleichen" },

  // ─── Wave 7: snippets, pomodoro, easter egg ───
  btnSnippets:         { en: "📋 Snippets",                              de: "📋 Snippets" },
  pomodoroTimer:       { en: "Pomodoro timer (25/5)",                    de: "Pomodoro-Timer (25/5)" },

  // ─── Wave 13: accessibility ───
  dyslexiaFont:        { en: "Dyslexia-friendly font",                   de: "Lese-freundliche Schrift" },
  highContrast:        { en: "High contrast",                            de: "Hoher Kontrast" },
  readAloud:           { en: "Read aloud",                               de: "Vorlesen" },

  // ─── Wave 14: voice settings + stats ───
  voiceRate:           { en: "Voice speed",                              de: "Sprechtempo" },
  voice:               { en: "Voice",                                    de: "Stimme" },
  myStats:             { en: "My stats",                                 de: "Meine Statistik" },

  // ─── Wave 15: announce + QR ───
  voiceAnnounce:       { en: "Voice announce achievements",              de: "Erfolge laut ansagen" },
};

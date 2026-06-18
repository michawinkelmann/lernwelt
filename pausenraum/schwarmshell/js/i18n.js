// SchwarmShell — Internationalisierung (i18n)
//
// Skelett für mehrsprachige Texte. Aktiv: Deutsch (Default) und Englisch (Pilot).
// Die meisten Spielinhalte (Story, NPC-Dialoge, man-Texte, Quest-Texte in data.js)
// sind weiterhin nur in Deutsch — sie sind im Code hartcodiert und ein vollständiger
// Sprach-Switch wäre eigene Arbeit. Hier wird zunächst die User-Interface-Schicht
// übersetzt: Settings, Toasts, System-Meldungen, Phase-Pill-Suffix.
//
// Verwendung:
//   t("settings.title")                  → "Einstellungen" / "Settings"
//   t("toast.badgeUnlocked", "Pipe Wizard") → "Badge freigeschaltet: Pipe Wizard"
//
// Eigene Strings hinzufügen: einfach in DICT.de und DICT.en denselben Key
// ergänzen. Wenn ein Key in der Ziel-Sprache fehlt, fällt t() auf Deutsch zurück.
(function(){
  const DICT = {
    de: {
      "settings.title": "Einstellungen",
      "settings.difficulty": "Schwierigkeit",
      "settings.difficulty.desc": "Bestimmt, wie viel Hilfe das Spiel automatisch anbietet.",
      "settings.difficulty.story": "Story (viel Hilfe)",
      "settings.difficulty.classic": "Klassisch",
      "settings.difficulty.hardcore": "Hardcore (keine Hilfen)",
      "settings.sound": "Sound",
      "settings.sound.desc": "Kurze Töne bei Erfolg / Badge / Fehler (Web Audio, kein Download).",
      "settings.sound.on": "Sound: an",
      "settings.sound.off": "Sound: aus",
      "settings.motion": "Bewegung",
      "settings.motion.desc": "Reduziert Animationen (z.B. wenn dir Bewegungen zu viel sind).",
      "settings.motion.on": "Reduzierte Bewegung: an",
      "settings.motion.off": "Reduzierte Bewegung: aus",
      "settings.concepts": "Konzept-Karten",
      "settings.concepts.desc": "Beim ersten Auftreten erscheinen kurze Erklärungen zu Pipes, Permissions und Prozessen.",
      "settings.concepts.reset": "Konzept-Karten wieder zeigen",
      "settings.concepts.resetDone": "Konzept-Karten werden beim nächsten Anlass wieder gezeigt.",
      "settings.replay": "Replay",
      "settings.replay.desc": "Zeigt deine letzten Befehle und Ausgaben als kompakten Spielmitschnitt.",
      "settings.replay.show": "Replay anzeigen",
      "settings.replay.clear": "Mitschnitt löschen",
      "settings.replay.cleared": "Replay-Mitschnitt gelöscht.",
      "settings.language": "Sprache",
      "settings.language.desc": "Wechselt die Sprache der Benutzeroberfläche. Spielinhalte bleiben Deutsch.",
      "settings.close": "Schließen",
      "settings.badge": "Einstellungen",
      "toast.badgeUnlocked": "🏅 Badge freigeschaltet",
      "toast.tutorialSkipped": "Tutorial übersprungen. help / quests zeigen dir, wo's weitergeht.",
      "toast.replayCopied": "Replay in die Zwischenablage kopiert.",
      "toast.copyUnavailable": "Automatisches Kopieren nicht verfügbar.",
      "toast.copyFailed": "Kopieren fehlgeschlagen.",
      "toast.conceptsDisabled": "Konzept-Karten deaktiviert (kann in den Einstellungen wieder aktiviert werden).",
      "toast.difficulty": "Schwierigkeit: {0}",
      "confirm.skipTutorial": "Tutorial wirklich überspringen? Du kannst die Hinweise später nicht erneut starten.",
      "confirm.reset": "Willst du wirklich resetten? Dabei wird dein Autosave gelöscht und dein Fortschritt geht verloren.",
      "phase.suffix.1": "Tutorial",
      "phase.suffix.2": "Quests",
      "phase.suffix.3": "Bossfight",
      "phase.suffix.4": "Mentor",
      "phase.suffix.5": "Real Life",
      "phase.suffix.6": "Scriptlab",
      "phase.label": "Phase {0} · {1}"
    },
    en: {
      "settings.title": "Settings",
      "settings.difficulty": "Difficulty",
      "settings.difficulty.desc": "Controls how much help the game offers automatically.",
      "settings.difficulty.story": "Story (lots of help)",
      "settings.difficulty.classic": "Classic",
      "settings.difficulty.hardcore": "Hardcore (no helpers)",
      "settings.sound": "Sound",
      "settings.sound.desc": "Short cues on success / badge / error (Web Audio, no download).",
      "settings.sound.on": "Sound: on",
      "settings.sound.off": "Sound: off",
      "settings.motion": "Motion",
      "settings.motion.desc": "Reduces animations (e.g. if motion bothers you).",
      "settings.motion.on": "Reduced motion: on",
      "settings.motion.off": "Reduced motion: off",
      "settings.concepts": "Concept cards",
      "settings.concepts.desc": "Show one-time explanations of pipes, permissions and processes on first use.",
      "settings.concepts.reset": "Show concept cards again",
      "settings.concepts.resetDone": "Concept cards will show again on the next trigger.",
      "settings.replay": "Replay",
      "settings.replay.desc": "Shows your recent commands and outputs as a compact game log.",
      "settings.replay.show": "Show replay",
      "settings.replay.clear": "Clear log",
      "settings.replay.cleared": "Replay log cleared.",
      "settings.language": "Language",
      "settings.language.desc": "Switches the UI language. Game content remains in German.",
      "settings.close": "Close",
      "settings.badge": "Settings",
      "toast.badgeUnlocked": "🏅 Badge unlocked",
      "toast.tutorialSkipped": "Tutorial skipped. help / quests will tell you where to go next.",
      "toast.replayCopied": "Replay copied to clipboard.",
      "toast.copyUnavailable": "Clipboard not available.",
      "toast.copyFailed": "Copy failed.",
      "toast.conceptsDisabled": "Concept cards disabled (can be re-enabled in Settings).",
      "toast.difficulty": "Difficulty: {0}",
      "confirm.skipTutorial": "Really skip the tutorial? You cannot restart the hints later.",
      "confirm.reset": "Really reset? Your autosave will be deleted and progress lost.",
      "phase.suffix.1": "Tutorial",
      "phase.suffix.2": "Quests",
      "phase.suffix.3": "Boss fight",
      "phase.suffix.4": "Mentor",
      "phase.suffix.5": "Real life",
      "phase.suffix.6": "Scriptlab",
      "phase.label": "Phase {0} · {1}"
    }
  };

  function currentLocale(){
    try{
      const loc = (typeof state !== "undefined" && state && state.settings && state.settings.locale) || "de";
      return DICT[loc] ? loc : "de";
    }catch(_e){ return "de"; }
  }

  function t(key, ...args){
    const loc = currentLocale();
    let s = (DICT[loc] && DICT[loc][key]) || (DICT.de && DICT.de[key]) || key;
    // Einfache Platzhalter: {0}, {1}, …
    args.forEach((v, i)=>{ s = s.replaceAll("{" + i + "}", String(v)); });
    return s;
  }

  window.t = t;
  window.SCHWARM_I18N = { DICT, currentLocale };
})();

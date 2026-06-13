// highscore.js — lokale Bestenlisten je Spiel (Top 10, Initialen, localStorage).
// Kein Server: Die Liste gilt pro Gerät/Browser — ideal für den Klassen-Modus
// am Beamer (alle spielen nacheinander am selben Gerät).

const PRAEFIX = "lernwelt-highscore-";

function lies(spielId) {
  try {
    const roh = localStorage.getItem(PRAEFIX + spielId);
    const liste = roh ? JSON.parse(roh) : [];
    return Array.isArray(liste) ? liste : [];
  } catch (_f) { return []; }
}

function schreibe(spielId, liste) {
  try { localStorage.setItem(PRAEFIX + spielId, JSON.stringify(liste)); } catch (_f) { /* voll/gesperrt */ }
}

// Reine Logik (in Node testbar): sortiert ein, kappt auf 10, liefert Platz (1-basiert) oder 0.
export function ordneEin(liste, eintrag, richtung = "absteigend") {
  const neu = [...liste, eintrag].sort((a, b) =>
    richtung === "aufsteigend" ? a.punkte - b.punkte : b.punkte - a.punkte);
  const gekappt = neu.slice(0, 10);
  const platz = gekappt.indexOf(eintrag);
  return { liste: gekappt, platz: platz < 0 ? 0 : platz + 1 };
}

export function istHighscore(spielId, punkte, richtung = "absteigend") {
  const liste = lies(spielId);
  if (liste.length < 10) return true;
  return richtung === "aufsteigend"
    ? punkte < liste[liste.length - 1].punkte
    : punkte > liste[liste.length - 1].punkte;
}

export function speichereHighscore(spielId, name, punkte, richtung = "absteigend") {
  const eintrag = { name: String(name).slice(0, 3).toUpperCase() || "???", punkte, datum: new Date().toISOString().slice(0, 10) };
  const { liste, platz } = ordneEin(lies(spielId), eintrag, richtung);
  schreibe(spielId, liste);
  return platz;
}

export function holeHighscores(spielId) { return lies(spielId); }

export function loescheHighscores(spielId) {
  try { localStorage.removeItem(PRAEFIX + spielId); } catch (_f) { /* egal */ }
}

// HTML der Bestenliste (escaped; Anzeige-Formatierung via formatiere, z. B. Sekunden)
export function bestenlisteHtml(spielId, einheit = "", formatiere = null) {
  const esc = s => String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
  const liste = lies(spielId);
  if (!liste.length) return `<p class="hs-leer">Noch keine Einträge — sei die oder der Erste!</p>`;
  return `<ol class="hs-liste">` + liste.map(e =>
    `<li><span class="hs-name">${esc(e.name)}</span><span class="hs-punkte">${esc(formatiere ? formatiere(e.punkte) : e.punkte)}${einheit ? " " + esc(einheit) : ""}</span><span class="hs-datum">${esc(e.datum || "")}</span></li>`).join("") + `</ol>`;
}

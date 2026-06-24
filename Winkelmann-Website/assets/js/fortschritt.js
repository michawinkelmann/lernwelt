// fortschritt.js — lokale Fortschrittsverwaltung (nur localStorage, kein Server).
// Speichert pro Aufgaben-ID den Status (geloest/versucht) mit Zeitstempel und Themen-Zuordnung,
// merkt sich den Aufgabenumfang besuchter Themen und bietet Export/Import als JSON-Datei.
// Zusaetzlich (Lernbuero): Lektions-/Phasen-/Checkpoint-Stand, Ampeln und Lerntagebuch.

const SCHLUESSEL = "lernwelt-fortschritt";

// ---------- Laden & Speichern ----------

function leererStand() {
  return { version: 1, aufgaben: {}, themen: {}, lernbuero: { kurse: {}, tagebuch: [] }, projekte: {}, feedback: {}, regelheft: [] };
}

function lade() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return leererStand();
    const daten = JSON.parse(roh);
    if (!daten || daten.version !== 1 || typeof daten.aufgaben !== "object") return leererStand();
    daten.themen = daten.themen || {};
    // Lernbuero-Zweig nachruesten, falls aelterer Stand ohne ihn geladen wird.
    if (!daten.lernbuero || typeof daten.lernbuero !== "object") daten.lernbuero = { kurse: {}, tagebuch: [] };
    if (typeof daten.lernbuero.kurse !== "object" || !daten.lernbuero.kurse) daten.lernbuero.kurse = {};
    if (!Array.isArray(daten.lernbuero.tagebuch)) daten.lernbuero.tagebuch = [];
    if (!daten.projekte || typeof daten.projekte !== "object") daten.projekte = {};
    if (!daten.feedback || typeof daten.feedback !== "object") daten.feedback = {};
    if (!Array.isArray(daten.regelheft)) daten.regelheft = [];
    return daten;
  } catch (e) {
    return leererStand();
  }
}

function speichere(daten) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(daten));
  } catch (e) { /* Speicher voll oder blockiert — Fortschritt geht dann nicht verloren, nur nicht gespeichert */ }
  document.dispatchEvent(new CustomEvent("fortschritt-geaendert"));
}

// ---------- Aufgaben-Status ----------

// Status: "geloest" | "versucht" | "offen"
export function holeAufgabenStatus(aufgabenId) {
  const eintrag = lade().aufgaben[aufgabenId];
  return eintrag ? (eintrag.s === "g" ? "geloest" : "versucht") : "offen";
}

// „geloest" wird nie wieder zu „versucht" herabgestuft.
export function setzeAufgabenStatus(aufgabenId, status, themaId) {
  const daten = lade();
  const alt = daten.aufgaben[aufgabenId];
  if (alt && alt.s === "g" && status !== "geloest") return;
  daten.aufgaben[aufgabenId] = {
    s: status === "geloest" ? "g" : "v",
    t: new Date().toISOString(),
    th: themaId || (alt && alt.th) || ""
  };
  speichere(daten);
}

// Beim Laden einer Übungsseite aufrufen: merkt sich, wie viele Aufgaben das Thema umfasst.
export function merkeThemenUmfang(themaId, gesamt) {
  if (!themaId || !gesamt) return;
  const daten = lade();
  if (!daten.themen[themaId] || daten.themen[themaId].gesamt !== gesamt) {
    daten.themen[themaId] = { gesamt };
    speichere(daten);
  }
}

// ---------- Auswertung ----------

export function holeThemenFortschritt(themaId) {
  const daten = lade();
  const gesamt = daten.themen[themaId] ? daten.themen[themaId].gesamt : 0;
  let geloest = 0;
  for (const id in daten.aufgaben) {
    if (daten.aufgaben[id].th === themaId && daten.aufgaben[id].s === "g") geloest++;
  }
  return { geloest, gesamt };
}

// ---------- Lernbüro: Lektions-Stand ----------

function leereLektion() {
  return { phasen: {}, checkpoint: false, freigabe: false, ampel: {}, vorhersage: "" };
}

// Liefert eine Kopie des gespeicherten Lektionsstands (oder Standard).
export function holeLektionStand(kursId, lektionId) {
  const k = lade().lernbuero.kurse[kursId];
  const l = k && k[lektionId];
  return l ? Object.assign(leereLektion(), l, { phasen: Object.assign({}, l.phasen), ampel: Object.assign({}, l.ampel) }) : leereLektion();
}

// Interne Hilfe: Lektionseintrag holen/anlegen und Schreibvorgang ausführen.
function aendereLektion(kursId, lektionId, aenderung) {
  const daten = lade();
  const kurse = daten.lernbuero.kurse;
  if (!kurse[kursId]) kurse[kursId] = {};
  if (!kurse[kursId][lektionId]) kurse[kursId][lektionId] = leereLektion();
  aenderung(kurse[kursId][lektionId]);
  speichere(daten);
}

export function setzePhase(kursId, lektionId, phase, erledigt) {
  aendereLektion(kursId, lektionId, l => { l.phasen[phase] = !!erledigt; });
}

export function setzeCheckpoint(kursId, lektionId, bestanden) {
  aendereLektion(kursId, lektionId, l => { l.checkpoint = !!bestanden; });
}

export function setzeFreigabe(kursId, lektionId, frei) {
  aendereLektion(kursId, lektionId, l => { l.freigabe = !!frei; });
}

export function setzeAmpel(kursId, lektionId, zielIndex, wert) {
  aendereLektion(kursId, lektionId, l => { l.ampel[zielIndex] = wert; });
}

// POE-Vorhersage (Selbstabgleich): Vermutung aus dem Einstieg lokal merken und
// in der Sichern-Phase zur Aufloesung zeigen.
export function setzeVorhersage(kursId, lektionId, text) {
  aendereLektion(kursId, lektionId, l => { l.vorhersage = String(text || "").slice(0, 200); });
}
export function holeVorhersage(kursId, lektionId) {
  return holeLektionStand(kursId, lektionId).vorhersage || "";
}

// Freischalt-Logik: erste Lektion ODER Vorgänger bestanden ODER eigene Lehrkraft-Freigabe.
export function istLektionFrei(kursId, lektionIds, index) {
  if (index <= 0) return true;
  const eigen = holeLektionStand(kursId, lektionIds[index]);
  if (eigen.freigabe) return true;
  return holeLektionStand(kursId, lektionIds[index - 1]).checkpoint === true;
}

// ---------- Lernbüro: Lerntagebuch ----------

export function holeTagebuch() {
  return lade().lernbuero.tagebuch.slice();
}

export function ergaenzeTagebuch(eintrag) {
  const text = (eintrag && eintrag.text || "").trim();
  if (!text) return null;
  const daten = lade();
  const neu = {
    id: "t" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    text,
    kurs: eintrag.kurs || "",
    lektion: eintrag.lektion || "",
    datum: new Date().toISOString()
  };
  daten.lernbuero.tagebuch.push(neu);
  speichere(daten);
  return neu;
}

export function entferneTagebuch(id) {
  const daten = lade();
  daten.lernbuero.tagebuch = daten.lernbuero.tagebuch.filter(e => e.id !== id);
  speichere(daten);
}

// ---------- Lernbüro: Regelheft (gesammelte Merksätze, lokal, exportierbar) ----------
export function holeRegelheft() {
  return lade().regelheft.slice();
}
export function ergaenzeRegelheft(eintrag) {
  const html = (eintrag && eintrag.html || "").trim();
  if (!html) return null;
  const daten = lade();
  if (daten.regelheft.some(e => e.kurs === eintrag.kurs && e.lektion === eintrag.lektion && e.titel === eintrag.titel)) return null;
  const neu = { id: "r" + Date.now() + "-" + Math.floor(Math.random() * 1000), kurs: eintrag.kurs || "", lektion: eintrag.lektion || "", titel: eintrag.titel || "", html, datum: new Date().toISOString() };
  daten.regelheft.push(neu);
  speichere(daten);
  return neu;
}
export function entferneRegelheft(id) {
  const daten = lade();
  daten.regelheft = daten.regelheft.filter(e => e.id !== id);
  speichere(daten);
}

// ---------- Lernbüro: Projektkarten ----------

function leereKarte() { return { erledigt: false, zeigEs: {} }; }

export function holeProjektStand(projektId, kartenId) {
  const pr = lade().projekte[projektId];
  const k = pr && pr[kartenId];
  return k ? Object.assign(leereKarte(), k, { zeigEs: Object.assign({}, k.zeigEs) }) : leereKarte();
}

function aendereKarte(projektId, kartenId, fn) {
  const daten = lade();
  if (!daten.projekte[projektId]) daten.projekte[projektId] = {};
  if (!daten.projekte[projektId][kartenId]) daten.projekte[projektId][kartenId] = leereKarte();
  fn(daten.projekte[projektId][kartenId]);
  speichere(daten);
}

export function setzeProjektErledigt(projektId, kartenId, erledigt) {
  aendereKarte(projektId, kartenId, k => { k.erledigt = !!erledigt; });
}

export function setzeProjektZeigEs(projektId, kartenId, index, erledigt) {
  aendereKarte(projektId, kartenId, k => { k.zeigEs[index] = !!erledigt; });
}

// ---------- Lernbüro: Schüler-Feedback (Lektionsende) ----------

// Liefert das gespeicherte Feedback-Objekt einer Lektion oder {}.
export function holeFeedback(kursId, lektionId) {
  const k = lade().feedback[kursId];
  const f = k && k[lektionId];
  return f ? { verstaendlich: f.verstaendlich || "", schwierigkeit: f.schwierigkeit || "", freitext: f.freitext || "" } : {};
}

// Speichert (anonymes) Feedback einer Lektion; legt Branch/Objekte bei Bedarf an.
export function speichereFeedback(kursId, lektionId, obj) {
  const daten = lade();
  if (!daten.feedback[kursId]) daten.feedback[kursId] = {};
  daten.feedback[kursId][lektionId] = {
    verstaendlich: (obj && obj.verstaendlich) || "",
    schwierigkeit: (obj && obj.schwierigkeit) || "",
    freitext: ((obj && obj.freitext) || "").trim(),
    ts: new Date().toISOString()
  };
  speichere(daten);
}

// Lädt nur das Feedback und löst einen JSON-Download aus (für die Lehrkraft).
export function exportiereFeedback() {
  const daten = lade();
  const inhalt = { typ: "lernwelt-feedback", exportiert: new Date().toISOString(), feedback: daten.feedback };
  const blob = new Blob([JSON.stringify(inhalt, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lernwelt-feedback-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

// ---------- Export / Import ----------

export function exportiereFortschritt() {
  const daten = lade();
  const blob = new Blob([JSON.stringify(daten, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lernwelt-fortschritt-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

// Lernbüro-Stände beim Import zusammenführen (Häkchen/Bestanden/Freigabe: ODER; Ampel: lokal gewinnt; Tagebuch: vereinen).
function fuehreLernbueroZusammen(ziel, fremd) {
  if (!fremd || typeof fremd !== "object") return;
  const fremdKurse = fremd.kurse || {};
  for (const kursId in fremdKurse) {
    if (!ziel.kurse[kursId]) ziel.kurse[kursId] = {};
    for (const lektionId in fremdKurse[kursId]) {
      const f = fremdKurse[kursId][lektionId] || {};
      if (!ziel.kurse[kursId][lektionId]) ziel.kurse[kursId][lektionId] = leereLektion();
      const z = ziel.kurse[kursId][lektionId];
      for (const phase in (f.phasen || {})) z.phasen[phase] = z.phasen[phase] || !!f.phasen[phase];
      z.checkpoint = z.checkpoint || !!f.checkpoint;
      z.freigabe = z.freigabe || !!f.freigabe;
      for (const ziel2 in (f.ampel || {})) if (!(ziel2 in z.ampel)) z.ampel[ziel2] = f.ampel[ziel2];
    }
  }
  const vorhanden = new Set(ziel.tagebuch.map(e => e.id));
  (Array.isArray(fremd.tagebuch) ? fremd.tagebuch : []).forEach(e => {
    if (e && e.id && !vorhanden.has(e.id)) { ziel.tagebuch.push(e); vorhanden.add(e.id); }
  });
}

function fuehreProjekteZusammen(ziel, fremd) {
  if (!fremd || typeof fremd !== "object") return;
  for (const pid in fremd) {
    if (!ziel[pid]) ziel[pid] = {};
    for (const kid in fremd[pid]) {
      const f = fremd[pid][kid] || {};
      if (!ziel[pid][kid]) ziel[pid][kid] = leereKarte();
      const z = ziel[pid][kid];
      z.erledigt = z.erledigt || !!f.erledigt;
      for (const i in (f.zeigEs || {})) z.zeigEs[i] = z.zeigEs[i] || !!f.zeigEs[i];
    }
  }
}

// Feedback beim Import ergänzend übernehmen (nur fehlende Einträge, lokal gewinnt).
function fuehreFeedbackZusammen(ziel, fremd) {
  if (!fremd || typeof fremd !== "object") return;
  for (const kursId in fremd) {
    if (!ziel[kursId]) ziel[kursId] = {};
    for (const lektionId in fremd[kursId]) {
      if (!(lektionId in ziel[kursId])) ziel[kursId][lektionId] = fremd[kursId][lektionId];
    }
  }
}

// Zusammenführen: „geloest" gewinnt immer, sonst gewinnt der neuere Zeitstempel.
export function importiereFortschritt(datei) {
  return datei.text().then(text => {
    const fremd = JSON.parse(text);
    if (!fremd || fremd.version !== 1 || typeof fremd.aufgaben !== "object") {
      throw new Error("Das ist keine gültige Fortschrittsdatei.");
    }
    const daten = lade();
    for (const id in fremd.aufgaben) {
      const f = fremd.aufgaben[id];
      const e = daten.aufgaben[id];
      if (!e || f.s === "g" || (e.s !== "g" && f.t > e.t)) daten.aufgaben[id] = f;
    }
    for (const th in (fremd.themen || {})) {
      if (!daten.themen[th]) daten.themen[th] = fremd.themen[th];
    }
    fuehreLernbueroZusammen(daten.lernbuero, fremd.lernbuero);
    fuehreProjekteZusammen(daten.projekte, fremd.projekte);
    fuehreFeedbackZusammen(daten.feedback, fremd.feedback);
    (Array.isArray(fremd.regelheft) ? fremd.regelheft : []).forEach(e => {
      if (e && e.id && !daten.regelheft.some(x => x.id === e.id)) daten.regelheft.push(e);
    });
    speichere(daten);
    return Object.keys(fremd.aufgaben).length;
  });
}

// ---------- Zurücksetzen & Übersicht (Einstellungsseite) ----------

// Löscht den gesamten lokalen Fortschritt (Aufgaben, Lernbüro, Projekte, Feedback, Regelheft).
export function setzeFortschrittZurueck() {
  try { localStorage.removeItem(SCHLUESSEL); } catch (e) { /* blockiert */ }
  document.dispatchEvent(new CustomEvent("fortschritt-geaendert"));
}

// Kurze Zusammenfassung des gespeicherten Fortschritts (für die Einstellungsseite).
export function holeFortschrittUebersicht() {
  const d = lade();
  const auf = Object.values(d.aufgaben || {});
  const istGeloest = a => a && (a.s === "g" || a.s === "geloest");
  const istVersucht = a => a && (a.s === "v" || a.s === "versucht");
  const geloest = auf.filter(istGeloest).length;
  const versucht = auf.filter(istVersucht).length;
  let lektionen = 0;
  const kurse = (d.lernbuero && d.lernbuero.kurse) || {};
  for (const k in kurse) for (const l in kurse[k]) lektionen++;
  return {
    geloest, versucht, lektionen,
    regelheft: Array.isArray(d.regelheft) ? d.regelheft.length : 0,
    tagebuch: (d.lernbuero && Array.isArray(d.lernbuero.tagebuch)) ? d.lernbuero.tagebuch.length : 0,
    leer: geloest === 0 && versucht === 0 && lektionen === 0
  };
}

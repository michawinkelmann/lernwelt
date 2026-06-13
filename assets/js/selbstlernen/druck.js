// druck.js — erzeugt aus einem Lernbüro-Kurs ein druckbares Arbeitsblatt.
// Liest Kurs (daten/kurse/<kurs>.json) und alle referenzierten Aufgabendateien,
// rendert die Aufgaben der gewählten Spuren STATISCH (keine interaktiven Inputs)
// und blendet auf Wunsch einen Lösungsblock je Aufgabe ein (Lehrer-Exemplar).
// Reine Lehrkraft-Hilfe; bei fehlenden Feldern robust (überspringt/lässt leer).

import { rendereMathe } from "../mathe-render.js";

// ---------- kleine Helfer ----------
const $ = (sel, wurzel = document) => wurzel.querySelector(sel);

// HTML-Escaping für reine Textfelder (Fragen/Optionen dürfen bereits HTML + $…$ enthalten,
// die werden NICHT escaped — sie stammen aus den geprüften Aufgabendaten).
function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function leseParameter() {
  const p = new URLSearchParams(location.search);
  return {
    kurs: (p.get("kurs") || "").trim(),
    loesung: p.get("loesung") === "1" || p.get("loesung") === "true",
    spuren: (p.get("spuren") || "").trim().toLowerCase()  // basis | standard | plus
  };
}

// Welche Spurnamen sind bei der gewählten Stufe aktiv?
function aktiveSpuren(stufe) {
  if (stufe === "basis") return ["basis"];
  if (stufe === "plus") return ["basis", "standard", "plus"];
  return ["basis", "standard"]; // Standard = Basis + Standard (Default)
}

// JSON laden, bei Fehler null (robust)
async function ladeJson(pfad) {
  try {
    const r = await fetch(pfad);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// Aus einer Liste von {quelle, ids}-Einträgen die IDs in Reihenfolge sammeln.
function sammleRefs(eintraege, ziel) {
  if (!Array.isArray(eintraege)) return;
  for (const e of eintraege) {
    if (!e || !e.quelle || !Array.isArray(e.ids)) continue;
    for (const id of e.ids) ziel.push({ quelle: e.quelle, id });
  }
}

// ---------- Aufgaben-Index aufbauen ----------
// Lädt jede referenzierte Quelle genau einmal und liefert eine Map id -> Aufgabe.
async function baueAufgabenIndex(quellen) {
  const index = new Map();
  const geladen = await Promise.all(
    [...quellen].map(q => ladeJson(`../daten/aufgaben/${q}.json`).then(d => [q, d]))
  );
  for (const [, daten] of geladen) {
    if (!daten || !Array.isArray(daten.aufgaben)) continue;
    for (const a of daten.aufgaben) {
      if (a && a.id && !index.has(a.id)) index.set(a.id, a);
    }
  }
  return index;
}

// ---------- Aufgaben-Rendering (statisch, druckfreundlich) ----------
const SCHREIBLINIE = '<span class="dr-linie" aria-hidden="true"></span>';

function metaHinweis(a) {
  const teile = [];
  if (a.niveau) teile.push(`Niveau&nbsp;${escHtml(a.niveau)}`);
  if (a.afb) teile.push(`AFB&nbsp;${["", "I", "II", "III"][a.afb] || escHtml(a.afb)}`);
  if (!teile.length) return "";
  return `<span class="dr-meta">${teile.join(" · ")}</span>`;
}

// einzelne Lücke im Lückentext: feste Schreiblinie
function lueckenText(a) {
  const teile = String(a.text || "").split("___");
  let html = "";
  teile.forEach((t, i) => {
    html += escHtml(t).replace(/\n/g, "<br>");
    if (i < teile.length - 1) html += '<span class="dr-luecke" aria-hidden="true"></span>';
  });
  return `<p class="dr-luecketext">${html}</p>`;
}

function rendereKoerper(a) {
  const typ = a.typ;
  // Fragetext (darf HTML/Formeln enthalten)
  const frage = a.frage ? `<p class="dr-frage">${a.frage}</p>` : "";

  if (typ === "multiple-choice") {
    const opt = (a.optionen || []).map(o =>
      `<li class="dr-option"><span class="dr-kasten" aria-hidden="true">☐</span> <span>${o.text ?? ""}</span></li>`
    ).join("");
    return frage + `<ul class="dr-optionen">${opt}</ul>`;
  }

  if (typ === "luecke") {
    return frage + lueckenText(a);
  }

  if (typ === "zuordnung") {
    // Zwei Spalten zum Verbinden: rechte Spalte gemischt? Für Lehrer-Material Original-Reihenfolge ok.
    const paare = a.paare || [];
    const reihen = paare.map((p, i) =>
      `<tr><td class="dr-zu-links">${p.links ?? ""}</td>` +
      `<td class="dr-zu-mitte" aria-hidden="true">○&nbsp;&nbsp;&nbsp;○</td>` +
      `<td class="dr-zu-rechts">${p.rechts ?? ""}</td></tr>`
    ).join("");
    return frage +
      `<p class="dr-zu-hinweis">Verbinde mit Linien, was zusammengehört.</p>` +
      `<table class="dr-zuordnung">${reihen}</table>`;
  }

  if (typ === "reihenfolge") {
    const el = (a.elemente || []).map(t =>
      `<li class="dr-reihe-el"><span class="dr-nrkasten" aria-hidden="true"></span> <span>${t}</span></li>`
    ).join("");
    return frage +
      `<p class="dr-zu-hinweis">Nummeriere die Kästchen in der richtigen Reihenfolge (1, 2, 3 …).</p>` +
      `<ul class="dr-reihenfolge">${el}</ul>`;
  }

  if (typ === "numerisch") {
    const zeilen = (a.eingaben || []).map(e => {
      const label = e.label ? `${e.label} = ` : "Lösung: ";
      const einheit = e.einheit ? ` <span class="dr-einheit">${e.einheit}</span>` : "";
      return `<p class="dr-antwortzeile">${label}${SCHREIBLINIE}${einheit}</p>`;
    }).join("");
    return frage + (zeilen || `<p class="dr-antwortzeile">Lösung: ${SCHREIBLINIE}</p>`);
  }

  if (typ === "rechenweg") {
    const schritte = (a.schritte || []).map((s, i) => {
      const zeilen = (s.eingaben || []).map(e => {
        const label = e.label ? `${e.label} = ` : "";
        const einheit = e.einheit ? ` <span class="dr-einheit">${e.einheit}</span>` : "";
        return `<p class="dr-antwortzeile">${label}${SCHREIBLINIE}${einheit}</p>`;
      }).join("");
      const frageT = s.frage ? `<p class="dr-schritt-frage">${s.frage}</p>` : "";
      return `<li class="dr-schritt">${frageT}${zeilen}${SCHREIBLINIE}</li>`;
    }).join("");
    return frage + `<ol class="dr-schritte">${schritte}</ol>`;
  }

  if (typ === "freitext") {
    return frage + `<div class="dr-schreibfeld" aria-hidden="true">` +
      SCHREIBLINIE.repeat(5) + `</div>`;
  }

  if (typ === "parametrisiert") {
    // Werte werden sonst per Generator erzeugt; im Druck nur die Vorlage-Frage + Antwortlinie.
    return frage + `<p class="dr-antwortzeile">Lösung: ${SCHREIBLINIE}</p>`;
  }

  // Unbekannter Typ: wenigstens die Frage zeigen.
  return frage || `<p class="dr-frage">(Aufgabe ohne darstellbaren Inhalt)</p>`;
}

// ---------- Lösungsblock ----------
function rendereLoesung(a) {
  const typ = a.typ;
  let inhalt = "";

  if (typ === "multiple-choice") {
    const richtige = (a.optionen || []).filter(o => o.richtig).map(o => `<li>${o.text ?? ""}</li>`).join("");
    if (richtige) inhalt += `<p class="dr-loes-label">Richtig:</p><ul class="dr-loes-liste">${richtige}</ul>`;
  } else if (typ === "luecke") {
    const woerter = (a.luecken || []).map((l, i) => `<li>Lücke ${i + 1}: ${escHtml(l.antwort)}</li>`).join("");
    if (woerter) inhalt += `<ul class="dr-loes-liste">${woerter}</ul>`;
  } else if (typ === "zuordnung") {
    const zu = (a.paare || []).map(p => `<li>${p.links ?? ""} → ${p.rechts ?? ""}</li>`).join("");
    if (zu) inhalt += `<ul class="dr-loes-liste">${zu}</ul>`;
  } else if (typ === "numerisch") {
    const w = (a.eingaben || []).map(e => {
      const label = e.label ? `${e.label} = ` : "";
      const einheit = e.einheit ? ` ${escHtml(e.einheit)}` : "";
      return `<li>${label}${escHtml(e.antwort)}${einheit}</li>`;
    }).join("");
    if (w) inhalt += `<ul class="dr-loes-liste">${w}</ul>`;
  } else if (typ === "rechenweg") {
    const w = (a.schritte || []).flatMap(s => (s.eingaben || []).map(e => {
      const label = e.label ? `${e.label} = ` : "";
      const einheit = e.einheit ? ` ${escHtml(e.einheit)}` : "";
      return `<li>${label}${escHtml(e.antwort)}${einheit}</li>`;
    })).join("");
    if (w) inhalt += `<ul class="dr-loes-liste">${w}</ul>`;
  } else if (typ === "freitext") {
    if (a.musterloesung) inhalt += `<p class="dr-loes-label">Mögliche Lösung:</p><p>${a.musterloesung}</p>`;
  }

  // Vollständiger Lösungsweg (alle Typen, falls vorhanden) ergänzt die Kurzantwort.
  if (a.loesungsweg) {
    inhalt += `<p class="dr-loes-label">Lösungsweg:</p><p>${a.loesungsweg}</p>`;
  }
  if (typ === "freitext" && !a.musterloesung && !a.loesungsweg) {
    inhalt += `<p>Individuelle Lösung — siehe Bewertungshinweise.</p>`;
  }

  if (!inhalt) return "";
  return `<div class="dr-loesung"><span class="dr-loes-etikett">Lösung</span>${inhalt}</div>`;
}

function rendereAufgabe(a, nummer, mitLoesung) {
  const meta = metaHinweis(a);
  const koerper = rendereKoerper(a);
  const loesung = mitLoesung ? rendereLoesung(a) : "";
  return `<article class="dr-aufgabe">
    <div class="dr-aufgabe-kopf"><span class="dr-nummer">${nummer}</span>${meta}</div>
    <div class="dr-aufgabe-inhalt">${koerper}</div>
    ${loesung}
  </article>`;
}

// ---------- Arbeitsblatt zusammenbauen ----------
function lektionsAufgabenIds(lektion, spuren, mitSichern) {
  // Liefert Referenzen {quelle,id} der gewählten Spuren + optional Sichern, ohne Dubletten je Lektion.
  const refs = [];
  const phasen = lektion.phasen || {};
  const ueben = phasen.ueben || {};
  for (const spur of spuren) sammleRefs(ueben[spur], refs);
  if (mitSichern && phasen.sichern) sammleRefs(phasen.sichern.aufgaben, refs);

  // Dubletten je Lektion vermeiden (gleiche id nur einmal).
  const gesehen = new Set();
  const eindeutig = [];
  for (const r of refs) {
    if (gesehen.has(r.id)) continue;
    gesehen.add(r.id);
    eindeutig.push(r);
  }
  return eindeutig;
}

function baueArbeitsblatt(kurs, index, opt) {
  const spuren = aktiveSpuren(opt.spuren);
  const teile = [];

  // Kopf
  const titel = kurs.titel || kurs.kurs || "Arbeitsblatt";
  const untertitel = kurs.untertitel ? `<p class="dr-untertitel">${escHtml(kurs.untertitel)}</p>` : "";
  const spurText = { basis: "Basis", standard: "Basis + Standard", plus: "Basis + Standard + Plus" }[opt.spuren] || "Basis + Standard";
  const exemplar = opt.loesung
    ? '<span class="dr-exemplar">Lehrer-Exemplar (mit Lösungen)</span>'
    : "";
  teile.push(`<header class="dr-kopf">
    <h1 class="dr-titel">${escHtml(titel)}</h1>
    ${untertitel}
    <p class="dr-felder"><span>Name: ${SCHREIBLINIE}</span><span>Datum: ${SCHREIBLINIE}</span><span>Klasse: ${SCHREIBLINIE}</span></p>
    <p class="dr-spurinfo">Spuren: ${escHtml(spurText)}${opt.sichern ? " · inkl. Sichern-Aufgaben" : ""} ${exemplar}</p>
  </header>`);

  // Lektionen nach Blöcken gruppieren (Blöcke definieren Reihenfolge + Überschriften).
  const lektionMap = new Map((kurs.lektionen || []).map(l => [l.id, l]));
  const bloecke = Array.isArray(kurs.bloecke) && kurs.bloecke.length
    ? kurs.bloecke
    : [{ titel: null, lektionen: (kurs.lektionen || []).map(l => l.id) }];

  let nummer = 0;
  let aufgabenGesamt = 0;

  for (const block of bloecke) {
    const blockTeile = [];
    if (block.titel) blockTeile.push(`<h2 class="dr-block">${escHtml(block.titel)}</h2>`);

    for (const lid of (block.lektionen || [])) {
      const lektion = lektionMap.get(lid);
      if (!lektion) continue;
      const refs = lektionsAufgabenIds(lektion, spuren, opt.sichern);
      const aufgabenHtml = [];
      for (const r of refs) {
        const a = index.get(r.id);
        if (!a) continue; // fehlende Aufgabe robust überspringen
        nummer += 1;
        aufgabenGesamt += 1;
        aufgabenHtml.push(rendereAufgabe(a, nummer, opt.loesung));
      }
      if (!aufgabenHtml.length) continue; // Lektionen ohne Aufgaben in der Auswahl auslassen
      const lTitel = lektion.titel ? escHtml(lektion.titel) : `Lektion ${escHtml(lektion.nr ?? "")}`;
      const lNr = lektion.nr ? `Lektion ${escHtml(lektion.nr)}: ` : "";
      blockTeile.push(`<section class="dr-lektion"><h3 class="dr-lektion-titel">${lNr}${lTitel}</h3>${aufgabenHtml.join("")}</section>`);
    }

    if (blockTeile.length > (block.titel ? 1 : 0)) {
      teile.push(`<section class="dr-block-bereich">${blockTeile.join("")}</section>`);
    }
  }

  if (!aufgabenGesamt) {
    teile.push(`<p class="dr-leer">Für die gewählte Spur enthält dieser Kurs keine darstellbaren Aufgaben. Wähle eine andere Spur oder beziehe die Sichern-Aufgaben ein.</p>`);
  }

  return teile.join("");
}

// ---------- Hauptablauf ----------
let KURS = null;
let INDEX = null;

async function ladeAlles(kursId) {
  KURS = await ladeJson(`../daten/kurse/${kursId}.json`);
  if (!KURS) return false;

  // Alle referenzierten Quellen einsammeln (ueben aller Spuren + sichern).
  const quellen = new Set();
  for (const l of (KURS.lektionen || [])) {
    const ph = l.phasen || {};
    const ub = ph.ueben || {};
    for (const spur of ["basis", "standard", "plus"]) {
      for (const e of (ub[spur] || [])) if (e && e.quelle) quellen.add(e.quelle);
    }
    if (ph.sichern) for (const e of (ph.sichern.aufgaben || [])) if (e && e.quelle) quellen.add(e.quelle);
  }
  INDEX = await baueAufgabenIndex(quellen);
  return true;
}

function aktuelleOptionen() {
  const spurRadio = document.querySelector('input[name="spuren"]:checked');
  return {
    spuren: spurRadio ? spurRadio.value : "standard",
    sichern: $("#opt-sichern")?.checked || false,
    loesung: $("#opt-loesung")?.checked || false
  };
}

async function neuRendern() {
  const bereich = $("#druckbereich");
  if (!KURS || !INDEX) {
    bereich.innerHTML = `<p class="dr-fehler">Der Kurs konnte nicht geladen werden.</p>`;
    return;
  }
  bereich.innerHTML = baueArbeitsblatt(KURS, INDEX, aktuelleOptionen());
  await rendereMathe(bereich);
}

function setzeOptionenAusUrl(p) {
  if (p.spuren && ["basis", "standard", "plus"].includes(p.spuren)) {
    const r = document.querySelector(`input[name="spuren"][value="${p.spuren}"]`);
    if (r) r.checked = true;
  }
  if (p.loesung) {
    const c = $("#opt-loesung");
    if (c) c.checked = true;
  }
}

async function init() {
  const p = leseParameter();
  const bereich = $("#druckbereich");

  if (!p.kurs) {
    $("#kurs-name").textContent = "kein Kurs angegeben";
    bereich.innerHTML = `<p class="dr-fehler">Kein Kurs angegeben. Rufe die Seite mit <code>?kurs=&lt;kurs-id&gt;</code> auf, z.&nbsp;B. <code>druck.html?kurs=ph-09</code>.</p>`;
    return;
  }

  setzeOptionenAusUrl(p);

  const ok = await ladeAlles(p.kurs);
  if (!ok) {
    $("#kurs-name").textContent = p.kurs;
    bereich.innerHTML = `<p class="dr-fehler">Der Kurs <code>${escHtml(p.kurs)}</code> konnte nicht geladen werden. Prüfe die Kurs-ID.</p>`;
    return;
  }

  $("#kurs-name").textContent = KURS.titel || p.kurs;

  // Bedienelemente live verdrahten
  for (const el of document.querySelectorAll('input[name="spuren"], #opt-sichern, #opt-loesung')) {
    el.addEventListener("change", () => { neuRendern(); });
  }
  const druck = $("#knopf-drucken");
  if (druck) druck.addEventListener("click", () => window.print());

  await neuRendern();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

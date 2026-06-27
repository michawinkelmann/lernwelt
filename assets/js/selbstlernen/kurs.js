// kurs.js — Lernbüro: Lernlandkarte + Lektions-Player für EINEN Kurs.
// Eine Kursseite (data-seite="lernbuero" data-kurs="…") zeigt ohne Hash die
// Lernlandkarte, bei Hash #lektion-<id> den geführten Lektions-Player.
// Inhalte werden NICHT gedoppelt: Aufgaben kommen über die Aufgaben-Engine
// (baueAufgabe) aus daten/aufgaben/<thema>.json, Erklärungen per Anker-Link.

import { WURZEL, aktuellerZweig } from "../komponenten.js";
import { rendereMathe } from "../mathe-render.js";
import { baueAufgabe } from "../aufgaben-engine.js";
import {
  holeAufgabenStatus, holeLektionStand, setzePhase, setzeCheckpoint, setzeFreigabe,
  setzeAmpel, istLektionFrei, holeTagebuch, ergaenzeTagebuch, entferneTagebuch,
  holeFeedback, speichereFeedback, exportiereFeedback, setzeVorhersage, holeVorhersage,
  holeRegelheft, ergaenzeRegelheft, entferneRegelheft
} from "../fortschritt.js";

let KURS = null;
let KURS_ID = "";
const AUFGABEN = new Map();   // quelle(themaId) -> Map(id -> aufgabe)
let HALTER = null;
let AUSBLICK = [];   // RS: gesammelte Gym-only-Zusatzaufgaben der aktuellen Lektion

const PHASEN = [
  ["ankommen", "Ankommen", "ja"],
  ["verstehen", "Verstehen", "ja"],
  ["ueben", "Üben", "Basis"],
  ["sichern", "Sichern", "ja"],
  ["extra", "Extra", "nein"]
];
const SPUREN = [["basis", "Basis", "Pflichtsockel"], ["standard", "Standard", ""], ["plus", "Plus", "AFB III"]];

// ---------- kleine Helfer ----------
function esc(t) { return String(t).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z])); }
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function url(rel) { return new URL(rel, WURZEL).href; }

function aufgabeVon(quelle, id) {
  const m = AUFGABEN.get(quelle);
  return m ? m.get(id) : null;
}

// Alle in einem Kurs referenzierten Aufgaben-Quellen einsammeln.
function alleQuellen() {
  const set = new Set();
  for (const l of KURS.lektionen) {
    const ph = l.phasen;
    (ph.ankommen?.aufgaben || []).forEach(g => set.add(g.quelle));
    (ph.sichern?.aufgaben || []).forEach(g => set.add(g.quelle));
    SPUREN.forEach(([s]) => (ph.ueben?.[s] || []).forEach(g => set.add(g.quelle)));
  }
  return [...set];
}

async function ladeQuellen() {
  await Promise.all(alleQuellen().map(async q => {
    try {
      const a = await fetch(url("daten/aufgaben/" + q + ".json"), { cache: "no-store" });
      if (!a.ok) return;
      const liste = (await a.json()).aufgaben || [];
      AUFGABEN.set(q, new Map(liste.map(x => [x.id, x])));
    } catch (_e) { /* fehlt → wird beim Rendern als Hinweis sichtbar */ }
  }));
}

// Sind alle Aufgaben dieser Gruppen-Liste gelöst? (leer ⇒ false, da nichts erfüllbar)
function alleGeloest(groups) {
  const ids = (groups || []).flatMap(g => g.ids);
  return ids.length > 0 && ids.every(id => holeAufgabenStatus(id) === "geloest");
}

// ---------- Aufgaben einer Gruppen-Liste rendern ----------
function rendereAufgaben(groups, schluessel) {
  const box = document.createElement("div");
  box.className = "aufgaben-liste";
  const zweig = aktuellerZweig();
  let i = 0;
  (groups || []).forEach(grp => {
    grp.ids.forEach(id => {
      const a = aufgabeVon(grp.quelle, id);
      if (!a) { box.append(el(`<p class="lb-luecke">Aufgabe ${esc(id)} nicht gefunden.</p>`)); return; }
      // Zweig-Filter: Gym-only-Aufgaben nicht inline; für RS aber unten als „Ausblick Gymnasium" sammeln.
      if (zweig !== "alle" && Array.isArray(a.zweig) && !a.zweig.includes(zweig)) {
        if (zweig === "rs" && !AUSBLICK.some(x => x.a.id === a.id)) AUSBLICK.push({ a, quelle: grp.quelle });
        return;
      }
      const art = baueAufgabe(a, i++, grp.quelle);
      art.id = "lb-" + schluessel + "-" + id;   // eindeutige DOM-ID (kein Konflikt mit Übungsseite)
      box.append(art);
    });
  });
  return box;
}

// Gym-only-Zusatzaufgaben (für RS) gesammelt ans Lektionsende.
function baueAusblick(l) {
  const sec = el(`<section class="lb-ausblick" aria-label="Ausblick Gymnasium">
    <div class="lb-ausblick-kopf"><span class="lb-ausblick-etikett">🎓 Ausblick Gymnasium</span></div>
    <p class="lb-phase-hinweis">Diese Zusatzaufgaben gehören zum Gymnasialzweig – freiwillig und ohne Druck. Schau sie dir an, wenn du Lust auf mehr hast oder später aufs Gymnasium wechseln möchtest.</p></section>`);
  const box = document.createElement("div");
  box.className = "aufgaben-liste";
  AUSBLICK.forEach((e, i) => {
    const art = baueAufgabe(e.a, i, e.quelle);
    art.id = "lb-ausblick-" + l.id + "-" + e.a.id;
    box.append(art);
  });
  sec.append(box);
  return sec;
}

// 🔀 „Gemischt üben" — Interleaving über den ganzen Themenblock.
// Belege: Rohrer & Taylor 2007; Brunmair & Richter 2019 (Meta-Analyse): besonders wirksam
// bei verwandten, leicht verwechselbaren Aufgabentypen — man übt das ERKENNEN des Lösungswegs.
function baueGemischtUeben(daten, l, koerper) {
  const quellen = [...new Set(SPUREN.flatMap(([s]) => (daten[s] || []).map(g => g.quelle)).filter(Boolean))];
  if (!quellen.length) return;
  // In dieser Lektion bereits sichtbare Aufgaben-IDs ausschließen (Radioname mc-<id> ist dokumentweit eindeutig).
  const schonGezeigt = new Set();
  const ph = l.phasen || {};
  (ph.ankommen?.aufgaben || []).forEach(g => (g.ids || []).forEach(id => schonGezeigt.add(id)));
  (ph.sichern?.aufgaben || []).forEach(g => (g.ids || []).forEach(id => schonGezeigt.add(id)));
  SPUREN.forEach(([s]) => (ph.ueben?.[s] || []).forEach(g => (g.ids || []).forEach(id => schonGezeigt.add(id))));

  const det = el(`<details class="lb-gemischt"><summary>🔀 Gemischt üben <span class="lb-gemischt-zusatz">– Aufgaben dieses Themas in zufälliger Mischung</span></summary></details>`);
  const liste = el(`<div class="lb-gemischt-liste"></div>`);
  det.append(liste);
  let gefuellt = false;
  det.addEventListener("toggle", () => {
    if (!det.open || gefuellt) return;
    gefuellt = true;
    const zweig = aktuellerZweig();
    const pool = [];
    const gesehen = new Set();
    quellen.forEach(q => {
      const m = AUFGABEN.get(q);
      if (!m) return;
      m.forEach((a, id) => {
        if (schonGezeigt.has(id) || gesehen.has(id)) return;
        if (zweig !== "alle" && Array.isArray(a.zweig) && !a.zweig.includes(zweig)) return;
        gesehen.add(id);
        pool.push({ a, quelle: q });
      });
    });
    if (!pool.length) {
      liste.append(el(`<p class="lb-luecke">Für eine Mischung gibt es hier gerade keine weiteren Aufgaben.</p>`));
      return;
    }
    // deterministisch mischen (pro Lektion stabil) – kleiner LCG, keine externe Abhängigkeit
    let seed = 19;
    for (const z of (l.id + ":gemischt")) seed = (seed * 31 + z.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
    const wahl = pool.slice(0, 8);
    liste.append(el(`<p class="lb-phase-hinweis">Verschiedene Aufgaben des Themas gemischt – so übst du, den passenden Lösungsweg selbst zu erkennen, statt immer „die nächste Aufgabe vom gleichen Typ" zu rechnen.</p>`));
    wahl.forEach((x, i) => {
      const art = baueAufgabe(x.a, i, x.quelle);
      art.id = "lb-gem-" + l.id + "-" + x.a.id;
      liste.append(art);
    });
    rendereMathe(liste);
  });
  koerper.append(det);
}

// ---------- Erklär-Abschnitt einbetten (Quelle bleibt die Erklärseite) ----------
const erklaerSpeicher = new Map();   // themaPfad -> { doc, basis } | null
async function ladeErklaerDoc(themaPfad) {
  if (!erklaerSpeicher.has(themaPfad)) {
    try {
      const basis = url(themaPfad + "index.html");
      const r = await fetch(basis);
      if (!r.ok) throw new Error(r.status);
      const doc = new DOMParser().parseFromString(await r.text(), "text/html");
      erklaerSpeicher.set(themaPfad, { doc, basis });
    } catch (_e) { erklaerSpeicher.set(themaPfad, null); }
  }
  return erklaerSpeicher.get(themaPfad);
}
function holeAbschnitt(eintrag, anker) {
  if (!eintrag || !anker) return null;
  const kopf = eintrag.doc.getElementById(anker.replace(/^#/, ""));
  const sec = kopf && kopf.closest("section");
  if (!sec) return null;
  const ziel = document.importNode(sec, true);
  // relative Links/Bilder absolut machen (Fragmente + externe URLs unangetastet)
  ziel.querySelectorAll("[href], [src]").forEach(eln => {
    ["href", "src"].forEach(attr => {
      const v = eln.getAttribute && eln.getAttribute(attr);
      if (!v || v.startsWith("#") || /^(?:[a-z]+:|\/\/)/i.test(v)) return;
      try { eln.setAttribute(attr, new URL(v, eintrag.basis).href); } catch (_e) {}
    });
  });
  ziel.querySelectorAll(".weiter-karte").forEach(e => e.remove());
  // Seite hat schon eine h1, die Phase eine h2 → Abschnitts-Überschrift auf h3 abstufen
  const h2 = ziel.querySelector("h2");
  if (h2) { const h3 = document.createElement("h3"); h3.innerHTML = h2.innerHTML; h2.replaceWith(h3); }
  ziel.classList.add("lb-erklaer-abschnitt");
  return ziel;
}
async function bindeAbschnittEin(halter, themaPfad, anker, daten) {
  const sec = holeAbschnitt(await ladeErklaerDoc(themaPfad), anker);
  halter.innerHTML = "";
  halter.removeAttribute("aria-busy");
  const vollLink = url(themaPfad + "index.html" + (anker || ""));
  if (sec) {
    halter.append(sec);
    halter.append(el(`<p class="lb-erklaer-quelle"><a href="${vollLink}" target="_blank" rel="noopener">Ganze Erklärseite in neuem Tab öffnen ↗</a></p>`));
    await rendereMathe(halter);
  } else {
    halter.append(el(`<p>Lies den passenden Abschnitt: <a href="${vollLink}">Zur Erklärseite ↗</a></p>`));
    if (daten && daten.interaktiv) halter.append(el(`<p><a href="${url(daten.interaktiv.href)}">${esc(daten.interaktiv.label)} ↗</a></p>`));
  }
}

// ============================================================
//  LERNLANDKARTE
// ============================================================
function rendereLandkarte() {
  HALTER.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "lernbuero";

  // Kopf
  const kopf = el(`<div class="lb-kopf">
    <p class="lb-untertitel">${esc(KURS.untertitel || "")}</p>
  </div>`);
  const leiste = el(`<div class="lb-leitleiste"></div>`);
  const taktung = KURS.taktung === "wochenplan" ? "Wochenplan" : "feste Lektionsfolge";
  const cp = KURS.checkpoints === "freischalten" ? "Checkpoints schalten frei (Lehrkraft kann freigeben)" : "Checkpoints nur als Empfehlung";
  leiste.append(el(`<span class="lb-chip">🗓️ ${esc(taktung)}</span>`));
  leiste.append(el(`<span class="lb-chip">🔓 ${esc(cp)}</span>`));
  leiste.append(el(`<span class="lb-chip">🚦 Ampel-Selbsteinschätzung</span>`));
  leiste.append(el(`<span class="lb-chip">📓 Lerntagebuch</span>`));
  wrap.append(kopf, leiste);
  wrap.append(el(`<div class="merkkasten"><span class="merk-etikett">So läuft eine Lektion</span>
    <p>Jede Lektion führt dich durch fünf Phasen: <strong>Ankommen · Verstehen · Üben · Sichern · Extra</strong>.
    In „Üben“ wählst du deine Spur: <strong>Basis</strong> ist Pflicht, <strong>Standard</strong> und <strong>Plus</strong> für mehr.
    Wenn du die Sichern-Aufgaben schaffst, wird die nächste Lektion frei. Keine Noten – dein Stand bleibt auf diesem Gerät.</p></div>`));

  const reihenfolge = (KURS.bloecke || KURS.wochen || []).flatMap(b => b.lektionen);
  const lektionVon = new Map(KURS.lektionen.map(l => [l.id, l]));
  if (KURS.landkarte) { const lkEl = baueLernlandkarte(reihenfolge); if (lkEl) wrap.append(lkEl); }

  // Themenblöcke (Lernlandkarte gruppiert nach Thema; Rückfall auf wochen)
  const bloecke = KURS.bloecke || KURS.wochen || [];
  bloecke.forEach(block => {
    // Block-Zweigfilter: rein-gymnasiale Themenblöcke (z. B. Sinusfunktion/Grenzprozesse in
    // Klasse 10, Thermodynamik in Physik 10) werden im Realschulzweig ausgeblendet.
    // Ohne block.zweig ist ein Block immer sichtbar (Standard).
    const bzweig = aktuellerZweig();
    if (Array.isArray(block.zweig) && bzweig !== "alle" && !block.zweig.includes(bzweig)) return;
    const titel = block.titel || block.spanne || "";
    const panel = el(`<section class="lb-woche" aria-label="${esc(titel)}">
      <div class="lb-woche-kopf"><h2>${esc(titel)}</h2>
        <span class="lb-woche-spanne">${block.lektionen.length} Lektionen</span></div>
      <div class="lb-lektionsliste"></div></section>`);
    const liste = panel.querySelector(".lb-lektionsliste");
    block.lektionen.forEach(id => {
      const l = lektionVon.get(id);
      if (l) liste.append(baueLektionsKarte(l, reihenfolge.indexOf(id), reihenfolge));
    });
    wrap.append(panel);
  });

  // Stoffverteilung (aufklappbar)
  if (KURS.stoffverteilung?.length) {
    const det = el(`<details class="lb-stoff"><summary>Stoffverteilung Halbjahr (KC-orientiert)</summary>
      <table><thead><tr><th>Wochen</th><th>Thema</th><th>Lektionen</th><th>KC-Schwerpunkt</th></tr></thead><tbody></tbody></table></details>`);
    const tb = det.querySelector("tbody");
    KURS.stoffverteilung.forEach(z => {
      tb.append(el(`<tr><td>${esc(z.wochen)}</td><td>${esc(z.thema)}</td><td>${esc(z.lektionen)}</td><td>${esc(z.kc)}</td></tr>`));
    });
    wrap.append(det);
  }

  // Lerntagebuch
  wrap.append(baueTagebuch(null));
  wrap.append(baueRegelheft());

  // Diskreter Link zum (passwortgeschützten) Lehrkraft-Bereich
  wrap.append(el(`<p class="lb-lehrkraft-link"><a href="lehrkraft.html">🔒 Lehrkraft-Bereich</a></p>`));

  HALTER.append(wrap);
  rendereMathe(wrap);
}

function baueLernlandkarte(reihenfolge) {
  const lk = KURS.landkarte;
  if (!lk || !Array.isArray(lk.knoten) || !lk.knoten.length) return null;
  const NS = "http://www.w3.org/2000/svg";
  const W = lk.breite || 640, H = lk.hoehe || 320, bw = lk.knotenBreite || 124, bh = lk.knotenHoehe || 42;
  const det = el(`<details class="lb-lernlandkarte"><summary>🗺️ Lernlandkarte – der rote Faden</summary></details>`);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Lernlandkarte: Themenübersicht mit deinem Fortschritt");
  svg.style.cssText = "width:100%;height:auto;display:block;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius);margin-top:.5rem";
  const pos = new Map(lk.knoten.map(n => [n.id, n]));
  let s = "";
  (lk.kanten || []).forEach(([a, b]) => { const A = pos.get(a), B = pos.get(b); if (A && B) s += `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="var(--linie)" stroke-width="2"/>`; });
  lk.knoten.forEach(n => {
    let fill = "var(--hauch)", rand = "var(--linie)", tf = "var(--text-leise)", klick = "";
    if (n.lektion) {
      const st = holeLektionStand(KURS_ID, n.lektion);
      const frei = istLektionFrei(KURS_ID, reihenfolge, reihenfolge.indexOf(n.lektion));
      if (st.checkpoint) { fill = "var(--ok)"; tf = "#fff"; rand = "var(--ok)"; }
      else if (frei) { fill = "var(--flaeche)"; rand = "var(--akzent)"; tf = "var(--text)"; }
      klick = ` data-lektion="${esc(n.lektion)}" style="cursor:pointer"`;
    }
    const teile = String(n.label).split("\n");
    const txt = teile.map((t, i) => `<text x="${n.x}" y="${n.y + 4 + (i - (teile.length - 1) / 2) * 14}" text-anchor="middle" font-size="12" fill="${tf}">${esc(t)}</text>`).join("");
    s += `<g${klick}><rect x="${n.x - bw / 2}" y="${n.y - bh / 2}" width="${bw}" height="${bh}" rx="9" fill="${fill}" stroke="${rand}" stroke-width="2"/>${txt}</g>`;
  });
  svg.innerHTML = s;
  svg.querySelectorAll("g[data-lektion]").forEach(g => g.addEventListener("click", () => gehe("#lektion-" + g.dataset.lektion)));
  det.append(svg);
  det.append(el(`<p class="lb-phase-hinweis">Die Lernlandkarte zeigt die wichtigsten Stationen als roten Faden. Alle Lektionen findest du vollständig in den Themenblöcken darunter. Tipp: Tippe auf ein freigeschaltetes Feld, um direkt zur Lektion zu springen. <span style="color:var(--ok)">Grün</span> = abgeschlossen.</p>`));
  return det;
}

function baueLektionsKarte(l, index, reihenfolge) {
  const stand = holeLektionStand(KURS_ID, l.id);
  const frei = istLektionFrei(KURS_ID, reihenfolge, index);
  const fertig = stand.checkpoint === true;
  const phasenGesamt = PHASEN.filter(([k]) => l.phasen[k]).length;
  const phasenDone = PHASEN.filter(([k]) => stand.phasen[k]).length;
  const basisGroups = l.phasen.ueben?.basis || [];
  const sockel = alleGeloest(basisGroups);

  const zustand = fertig ? "ist-fertig" : (frei ? "ist-frei" : "ist-gesperrt");
  const karte = el(`<div class="lb-lektion-karte ${zustand}">
    <span class="lb-lektion-nr" aria-hidden="true">${l.nr}</span>
    <div class="lb-lektion-text">
      <div class="lb-lektion-titel">${esc(l.titel)}</div>
      <div class="lb-lektion-meta">
        <span>${l.dauer}′</span><span>${l.ziele.length} Lernziele</span>
        <span class="lb-fortschritt-mini">Phasen ${phasenDone}/${phasenGesamt}</span>
        ${sockel ? '<span class="lb-badge sockel">✓ Basis-Sockel</span>' : ""}
      </div>
    </div>
    <div class="lb-lektion-aktion"></div>
  </div>`);
  const aktion = karte.querySelector(".lb-lektion-aktion");

  if (fertig) aktion.append(el(`<span class="lb-badge fertig">✓ abgeschlossen</span>`));
  if (frei) {
    const a = el(`<a class="knopf klein" href="#lektion-${l.id}">${stand.phasen.ankommen || fertig ? "Fortsetzen" : "Öffnen"}</a>`);
    aktion.append(a);
  } else {
    aktion.append(el(`<span class="lb-badge gesperrt">🔒 gesperrt</span>`));
    const frg = el(`<button type="button" class="knopf zweitrangig klein">Lehrkraft hat freigegeben</button>`);
    frg.addEventListener("click", () => { setzeFreigabe(KURS_ID, l.id, true); rendereLandkarte(); });
    aktion.append(frg);
  }
  return karte;
}

// ============================================================
//  LEKTIONS-PLAYER
// ============================================================
function rendereLektion(lektionId) {
  const index = KURS.lektionen.findIndex(l => l.id === lektionId);
  const l = KURS.lektionen[index];
  const reihenfolge = (KURS.bloecke || KURS.wochen || []).flatMap(b => b.lektionen);
  const posR = reihenfolge.indexOf(lektionId);
  HALTER.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "lernbuero";

  if (!l) { wrap.append(el(`<p class="einleitung">Diese Lektion gibt es nicht. <a href="#">Zur Lernlandkarte</a></p>`)); HALTER.append(wrap); return; }

  const zurueck = el(`<a class="lb-zurueck" href="#">← Zur Lernlandkarte</a>`);
  zurueck.addEventListener("click", e => { e.preventDefault(); gehe(""); });
  wrap.append(zurueck);

  // Gesperrt?
  if (!istLektionFrei(KURS_ID, reihenfolge, posR)) {
    const sperre = el(`<div class="lb-checkpoint"><div class="lb-checkpoint-text">
      <strong>Diese Lektion ist noch gesperrt.</strong>
      Schließe zuerst die vorige Lektion ab (Sichern-Aufgaben) – oder die Lehrkraft gibt frei.</div></div>`);
    const frg = el(`<button type="button" class="knopf zweitrangig klein">Lehrkraft hat freigegeben</button>`);
    frg.addEventListener("click", () => { setzeFreigabe(KURS_ID, l.id, true); rendereLektion(lektionId); });
    sperre.append(frg);
    wrap.append(sperre);
    HALTER.append(wrap); rendereMathe(wrap); fokussiere(wrap); return;
  }

  // Kopf
  const kopf = el(`<div class="lb-player-kopf">
    <h2 class="lb-lektion-h2" data-lb-fokus tabindex="-1">Lektion ${l.nr}: ${esc(l.titel)}</h2>
    <p class="lb-untertitel">${KURS.titel} · Lernbüro · ${l.dauer}′</p>
    <ul class="lb-ziele">${l.ziele.map(z => `<li><span>${z.replace(/^Ich kann\s+/, "")}</span></li>`).join("")}</ul>
    <p class="lb-ziel-transparenz">Die <strong>Basis-Aufgaben</strong> sind dein Pflichtziel. <strong>Standard</strong> und <strong>Plus</strong> bringen dich weiter – für „🟢 sicher“ in der Ampel solltest du auch die Standard-Aufgaben schaffen.</p>
  </div>`);
  // Lernbüro 2.0: KC-Kompetenzen (optional, abwärtskompatibel)
  if (Array.isArray(l.kompetenzen) && l.kompetenzen.length) {
    const kb = el(`<div class="lb-kompetenzen"><span class="lb-etikett">🎯 Kompetenzen (Kerncurriculum)</span><ul></ul></div>`);
    const kul = kb.querySelector("ul");
    l.kompetenzen.forEach(k => kul.append(el(`<li><span class="lb-komp-bereich">${esc(k.bereich)}</span> ${k.text}</li>`)));
    kopf.append(kb);
  }
  wrap.append(kopf);

  if (l.stopppunkt?.text) {
    wrap.append(el(`<div class="lb-stopp"><span class="lb-stopp-etikett">⏸ Stopp-Punkt – gemeinsam mit der Klasse</span><p>${esc(l.stopppunkt.text)}</p></div>`));
  }

  // Phasen
  AUSBLICK = [];
  PHASEN.forEach(([key, label, pflicht]) => {
    const daten = l.phasen[key];
    if (!daten) return;
    wrap.append(bauePhase(l, key, label, pflicht, daten));
  });

  // Ausblick Gymnasium (nur RS): gesammelte Gym-only-Zusatzaufgaben ans Ende der Lektion
  if (aktuellerZweig() === "rs" && AUSBLICK.length) wrap.append(baueAusblick(l));

  // Ampel
  wrap.append(baueAmpel(l));

  // Checkpoint
  const cp = baueCheckpoint(l);
  wrap.append(cp);

  // Lerntagebuch (Frage notieren, im Lektionskontext)
  wrap.append(baueTagebuch(l));

  // Dezentes Schüler-Feedback (standardmäßig zugeklappt; nur auf Bitte der Lehrkraft)
  wrap.append(baueFeedback(l));

  // Weiter zur nächsten Lektion (in Landkarten-/Block-Reihenfolge; klickbar, sobald abgeschlossen)
  const nextId = posR >= 0 && posR < reihenfolge.length - 1 ? reihenfolge[posR + 1] : null;
  const weiter = el(`<div class="lb-weiter"></div>`);
  let weiterKnopf = null, weiterHinweis = null;
  if (nextId) {
    const next = KURS.lektionen.find(x => x.id === nextId) || {};
    weiterHinweis = el(`<p class="lb-weiter-hinweis"></p>`);
    weiterKnopf = el(`<button type="button" class="knopf lb-weiter-knopf" disabled>Zur nächsten Lektion →</button>`);
    weiterKnopf.dataset.titel = (next.nr ? "Lektion " + next.nr + ": " : "") + (next.titel || "");
    weiterKnopf.addEventListener("click", () => gehe("#lektion-" + nextId));
    weiter.append(weiterHinweis, weiterKnopf);
  } else {
    const zurLk = el(`<a class="knopf zweitrangig" href="#">Zur Lernlandkarte</a>`);
    zurLk.addEventListener("click", e => { e.preventDefault(); gehe(""); });
    weiter.append(el(`<p class="lb-weiter-hinweis">Das war die letzte Lektion dieses Kurses – stark!</p>`), zurLk);
  }
  wrap.append(weiter);

  HALTER.append(wrap);
  rendereMathe(wrap);
  fokussiere(wrap);

  // Checkpoint live aus den Sichern-Aufgaben ableiten
  const aktualisiereCheckpoint = () => {
    const bestanden = alleGeloest(l.phasen.sichern?.aufgaben) || holeLektionStand(KURS_ID, l.id).checkpoint;
    if (bestanden && holeLektionStand(KURS_ID, l.id).checkpoint !== true) setzeCheckpoint(KURS_ID, l.id, true);
    zeichneCheckpoint(cp, l);
    if (weiterKnopf) {
      weiterKnopf.disabled = !bestanden;
      weiterHinweis.textContent = bestanden
        ? "Geschafft! Weiter mit " + weiterKnopf.dataset.titel
        : "Schließe die Sichern-Aufgaben ab, um direkt weiterzumachen.";
    }
  };
  aktualisiereCheckpoint();
  HALTER._cpHandler = aktualisiereCheckpoint;
}

// ---------- Lernbüro 3.0: Bausteine für problemorientierte Lektionen ----------
async function bindeInteraktivEin(halter, id, params) {
  if (!halter || !id) return;
  try {
    const mod = await import(new URL("../interaktiv/" + id + ".js", import.meta.url));
    if (typeof mod.mount === "function") { halter.innerHTML = ""; mod.mount(halter, params || {}); halter.removeAttribute("aria-busy"); }
    else halter.innerHTML = `<p class="lb-phase-hinweis">Interaktives Element nicht gefunden.</p>`;
  } catch (e) {
    halter.innerHTML = `<p class="lb-phase-hinweis">Interaktives Element konnte nicht geladen werden.</p>`;
  }
}

function baueFigur(svg, alt) {
  const f = el(`<figure class="lb-figur"></figure>`);
  const wrap = el(`<div class="lb-figur-svg"${alt ? ` role="img" aria-label="${esc(alt)}"` : ' aria-hidden="true"'}></div>`);
  wrap.innerHTML = svg;
  f.append(wrap);
  if (alt) f.append(el(`<figcaption>${esc(alt)}</figcaption>`));
  return f;
}

function baueEinstieg(e, l) {
  const box = el(`<div class="lb-einstieg"><span class="lb-etikett">💡 Worum geht’s?</span></div>`);
  if (e.problem) box.append(el(`<div class="lb-einstieg-text">${e.problem}</div>`));
  if (e.figur) box.append(baueFigur(e.figur, e.figurAlt));
  if (e.vorhersage) {
    const vp = el(`<div class="lb-vorhersage"><p class="lb-vorhersage-frage"><strong>Erst schätzen:</strong> ${e.vorhersage}</p></div>`);
    if (Array.isArray(e.optionen) && e.optionen.length) {
      const grp = el(`<div class="lb-vorhersage-knoepfe" role="group" aria-label="Deine Vermutung"></div>`);
      const status = el(`<p class="lb-vorhersage-hinweis" role="status"></p>`);
      e.optionen.forEach(opt => {
        const b = el(`<button type="button" class="lb-tipp-knopf" aria-pressed="false">${esc(opt)}</button>`);
        b.addEventListener("click", () => {
          grp.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
          if (l) setzeVorhersage(KURS_ID, l.id, opt);
          status.textContent = "Notiert. Am Ende der Lektion (Sichern) prüfst du deine Vermutung.";
        });
        grp.append(b);
      });
      vp.append(grp, status);
    }
    box.append(vp);
  }
  return box;
}

function baueBeispiel(b) {
  const box = el(`<div class="lb-beispiel"><span class="lb-etikett">✏️ Musterbeispiel</span></div>`);
  if (b.aufgabe) box.append(el(`<p class="lb-beispiel-aufgabe">${b.aufgabe}</p>`));
  if (Array.isArray(b.schritte) && b.schritte.length) {
    const hatTeilziele = b.schritte.some(s => s && typeof s === "object" && s.teilziel);
    if (!hatTeilziele) {
      const ol = el(`<ol class="lb-beispiel-schritte"></ol>`);
      b.schritte.forEach(s => ol.append(el(`<li>${s}</li>`)));
      box.append(ol);
    } else {
      let ol = null;
      b.schritte.forEach(s => {
        if (s && typeof s === "object" && s.teilziel) {
          box.append(el(`<p class="lb-teilziel">${s.teilziel}</p>`));
          ol = el(`<ol class="lb-beispiel-schritte"></ol>`); box.append(ol);
        } else {
          if (!ol) { ol = el(`<ol class="lb-beispiel-schritte"></ol>`); box.append(ol); }
          ol.append(el(`<li>${s}</li>`));
        }
      });
    }
  }
  if (b.selbst) box.append(el(`<details class="lb-mehr lb-jetztdu"><summary>Jetzt du: ${b.selbst.frage}</summary><div class="lb-mehr-koerper">${b.selbst.loesung}</div></details>`));
  return box;
}

function baueDarstellungen(d) {
  const box = el(`<div class="lb-darstellungen"><span class="lb-etikett">🔀 Dieselbe Sache, mehrere Sichtweisen</span></div>`);
  if (d.titel) box.append(el(`<p class="lb-phase-hinweis">${d.titel}</p>`));
  const grid = el(`<div class="lb-darstellungen-grid"></div>`);
  (d.eintraege || []).forEach(e => {
    const card = el(`<div class="lb-darstellung"><span class="lb-darstellung-art">${esc(e.art)}</span></div>`);
    if (e.figur) card.append(baueFigur(e.figur, e.figurAlt));
    if (e.html) card.append(el(`<div class="lb-darstellung-inhalt">${e.html}</div>`));
    else if (e.text) card.append(el(`<p class="lb-darstellung-inhalt">${e.text}</p>`));
    grid.append(card);
  });
  box.append(grid);
  return box;
}

function rendereErkunden(daten, koerper) {
  const erkunden = Array.isArray(daten.erkunden) ? daten.erkunden : (daten.erkunden ? [daten.erkunden] : []);
  erkunden.forEach(e => {
      const istExp = e.typ === "experiment" || e.typ === "real";
      const card = el(`<div class="lb-erkunden ${istExp ? "exp" : "sim"}"><span class="lb-etikett">${istExp ? "🧪 Real-Experiment" : "🔬 Simulation"}: ${esc(e.titel || "")}</span></div>`);
      if (e.hinweis) card.append(el(`<p class="lb-erkunden-hinweis">${e.hinweis}</p>`));
      if (e.material) card.append(el(`<p class="lb-erkunden-material"><strong>Material:</strong> ${e.material}</p>`));
      if (e.vorhersage) card.append(el(`<div class="lb-poe-vorhersage"><strong>Erst vorhersagen:</strong> ${e.vorhersage}</div>`));
      if (e.pfad) card.append(el(`<p><a class="knopf zweitrangig klein" href="${url(e.pfad)}">${e.linkLabel || (istExp ? "Versuchsanleitung öffnen" : "Simulation öffnen")} ↗</a></p>`));
      if (Array.isArray(e.auftraege) && e.auftraege.length) {
        const ul = el(`<ul class="lb-auftraege"></ul>`);
        e.auftraege.forEach(a => ul.append(el(`<li>${a}</li>`)));
        card.append(el(`<p class="lb-poe-label"><strong>${istExp ? "Durchführen & beobachten:" : "Beobachtungsaufträge:"}</strong></p>`), ul);
      }
      if (e.interaktiv) {
        const iid = typeof e.interaktiv === "string" ? e.interaktiv : e.interaktiv.id;
        const ititel = (e.interaktiv && e.interaktiv.titel) ? e.interaktiv.titel : "Messwerte auswerten";
        const ik = el(`<div class="lb-erkunden-mess"><span class="lb-etikett">🔬 ${esc(ititel)}</span><div class="lb-interaktiv" aria-busy="true"><p class="lb-phase-hinweis">Element wird geladen …</p></div></div>`);
        const ip = (e.interaktiv && typeof e.interaktiv === "object") ? (e.interaktiv.params || {}) : {};
        card.append(ik);
        bindeInteraktivEin(ik.querySelector(".lb-interaktiv"), iid, ip);
      }
      koerper.append(card);
  });
}

function zahlAusEingabe(text) {
  const t = String(text).trim().replace(",", ".");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  return parseFloat(t);
}
// Interaktive Blütenaufgabe: gemeinsamer Kontext + gestufte Blätter (a–d) mit Eingabefeld + Prüfen je Teil.
function baueBluete(b) {
  const box = el(`<div class="lb-bluete"><span class="lb-etikett">🌸 Aufgabe rund um einen Kontext</span></div>`);
  if (b.kontext) box.append(el(`<div class="lb-bluete-kontext">${b.kontext}</div>`));
  if (b.figur) box.append(baueFigur(b.figur, b.figurAlt));
  (b.blaetter || []).forEach(bl => {
    const blatt = el(`<div class="lb-bluete-blatt"></div>`);
    blatt.append(el(`<p class="lb-bluete-frage"><span class="lb-bluete-label">${esc(bl.label || "")}</span> ${bl.frage || ""}</p>`));
    const felder = Array.isArray(bl.felder) ? bl.felder : (bl.antwort != null ? [{ antwort: bl.antwort, toleranz: bl.toleranz, einheit: bl.einheit }] : []);
    if (felder.length) {
      const zeile = el(`<div class="lb-bluete-eingabe"></div>`);
      const inputs = felder.map((fld, i) => {
        const lab = el(`<label class="lb-bluete-feld">${fld.label ? esc(fld.label) + " " : ""}<input type="text" inputmode="decimal" autocomplete="off" aria-label="Antwort ${esc(bl.label || "")} Feld ${i + 1}">${fld.einheit ? " " + esc(fld.einheit) : ""}</label>`);
        zeile.append(lab);
        return lab.querySelector("input");
      });
      const knopf = el(`<button type="button" class="knopf klein">Prüfen</button>`);
      const status = el(`<span class="lb-bluete-status" role="status"></span>`);
      knopf.addEventListener("click", () => {
        let ok = true;
        felder.forEach((fld, i) => {
          const w = zahlAusEingabe(inputs[i].value);
          const gut = w !== null && Math.abs(w - fld.antwort) <= (fld.toleranz || 0) + 1e-9;
          inputs[i].style.borderColor = gut ? "var(--ok)" : "var(--fehler)";
          inputs[i].setAttribute("aria-invalid", String(!gut));
          if (!gut) ok = false;
        });
        status.innerHTML = ok ? '<strong style="color:var(--ok)">✓ richtig!</strong>' : '<strong style="color:var(--fehler)">✗ noch nicht – probier es nochmal oder sieh die Lösung.</strong>';
      });
      zeile.append(knopf, status);
      blatt.append(zeile);
    }
    if (bl.loesung) blatt.append(el(`<details class="lb-mehr"><summary>Lösung</summary><div class="lb-mehr-koerper">${bl.loesung}</div></details>`));
    box.append(blatt);
  });
  return box;
}

function bauePhase(l, key, label, pflicht, daten) {
  const sec = el(`<section class="lb-phase" data-phase="${key}">
    <div class="lb-phase-kopf">
      <h2>${label}</h2>
      <span class="lb-phase-zeit">${daten.zeit ? daten.zeit + "′" : ""}</span>
      <span class="lb-pflicht ${pflicht === "nein" ? "nein" : "ja"}">${pflicht === "ja" ? "Pflicht" : pflicht === "nein" ? "freiwillig" : "Pflicht: " + pflicht}</span>
    </div>
    <div class="lb-phase-koerper"></div>
  </section>`);
  const koerper = sec.querySelector(".lb-phase-koerper");

  // „erledigt"-Häkchen
  const stand = holeLektionStand(KURS_ID, l.id);
  const hk = el(`<label class="lb-phase-erledigt"><input type="checkbox" ${stand.phasen[key] ? "checked" : ""}> erledigt</label>`);
  hk.querySelector("input").addEventListener("change", e => setzePhase(KURS_ID, l.id, key, e.target.checked));
  sec.querySelector(".lb-phase-kopf").append(hk);

  if (key === "ankommen") {
    // Kurze Auffrischung (Vorwissen aktivieren) bleibt ganz am Anfang
    if (daten.hinweis) koerper.append(el(`<p class="lb-phase-hinweis">${esc(daten.hinweis)}</p>`));
    koerper.append(rendereAufgaben(daten.aufgaben, l.id + "-ank"));
    // Problemorientierter Einstieg mit Anschauung und Vorhersage
    if (daten.einstieg) koerper.append(baueEinstieg(daten.einstieg, l));
  }
  else if (key === "verstehen") {
    const neuFormat = Array.isArray(daten.schritte) && daten.schritte.some(s => s.kern);
    if (daten.text) koerper.append(el(`<p class="lb-phase-hinweis">${esc(daten.text)}</p>`));
    if (daten.vorueberlegung) koerper.append(el(`<div class="lb-vorueberlegung"><span class="lb-etikett">🧠 Vorüberlegungen</span><div class="lb-vorueberlegung-text">${daten.vorueberlegung}</div></div>`));
    if (daten.grundwissen) koerper.append(el(`<div class="lb-grundwissen"><span class="lb-etikett">📖 Grundwissen</span><div class="lb-grundwissen-text">${daten.grundwissen}</div></div>`));
    if (daten.erkundenZuerst) rendereErkunden(daten, koerper);
    if (!neuFormat) {
      const eHalter = el(`<div class="lb-erklaer" aria-busy="true"><p class="lb-phase-hinweis">Abschnitt wird geladen …</p></div>`);
      koerper.append(eHalter);
      bindeAbschnittEin(eHalter, l.themaPfad, daten.anker, daten);   // async, füllt nach
      if (daten.beobachtung) koerper.append(el(`<div class="lb-beobachtung"><span class="lb-etikett">🔍 Beobachtungsauftrag</span><p>${daten.beobachtung}</p></div>`));
      if (daten.sim) koerper.append(el(`<p><a class="knopf zweitrangig klein" href="${url(daten.sim.pfad)}">${esc(daten.sim.titel || "Simulation öffnen")} ↗</a></p>`));
      if (Array.isArray(daten.schritte) && daten.schritte.length) {
        const box = el(`<div class="lb-schritte"><span class="lb-etikett">🧭 Schritt für Schritt</span></div>`);
        daten.schritte.forEach((st, i) => {
          const blk = el(`<div class="lb-schritt"><h4><span class="lb-schritt-nr">${i + 1}</span>${esc(st.titel || "")}</h4></div>`);
          if (st.html) blk.append(el(`<div class="lb-schritt-text">${st.html}</div>`));
          if (st.check) blk.append(el(`<details class="lb-minicheck"><summary>${esc(st.check.frage)}</summary><div class="lb-minicheck-a">${st.check.antwort}</div></details>`));
          box.append(blk);
        });
        koerper.append(box);
      }
    } else {
      // Neues Format: kompakter Kernsatz sichtbar, Ausführliches einklappbar, mit Anschauung
      const box = el(`<div class="lb-schritte"><span class="lb-etikett">🧭 Schritt für Schritt</span></div>`);
      daten.schritte.forEach((st, i) => {
        const blk = el(`<div class="lb-schritt"><h4><span class="lb-schritt-nr">${i + 1}</span>${esc(st.titel || "")}</h4></div>`);
        if (st.kern) blk.append(el(`<div class="lb-kern">${st.kern}</div>`));
        if (st.figur) blk.append(baueFigur(st.figur, st.figurAlt));
        if (st.beispiel) blk.append(baueBeispiel(st.beispiel));
        if (st.details) blk.append(el(`<details class="lb-mehr"><summary>Mehr dazu</summary><div class="lb-mehr-koerper">${st.details}</div></details>`));
        if (st.minicheck) blk.append(el(`<details class="lb-minicheck"><summary>${esc(st.minicheck.frage)}</summary><div class="lb-minicheck-a">${st.minicheck.antwort}</div></details>`));
        box.append(blk);
      });
      koerper.append(box);
      if (daten.stolperstein) koerper.append(el(`<div class="lb-stolperstein"><span class="lb-etikett">⚠️ Typischer Stolperstein</span><div class="lb-stolperstein-text">${daten.stolperstein}</div></div>`));
      if (daten.darstellungen) koerper.append(baueDarstellungen(daten.darstellungen));
      if (daten.interaktiv) {
        const iid = typeof daten.interaktiv === "string" ? daten.interaktiv : daten.interaktiv.id;
        const ititel = (daten.interaktiv && daten.interaktiv.titel) ? daten.interaktiv.titel : "Selbst ausprobieren";
        const ikarte = el(`<div class="lb-erkunden sim"><span class="lb-etikett">🔬 ${esc(ititel)}</span><div class="lb-interaktiv" aria-busy="true"><p class="lb-phase-hinweis">Element wird geladen …</p></div></div>`);
        const iparams = (daten.interaktiv && typeof daten.interaktiv === "object") ? (daten.interaktiv.params || {}) : {};
        koerper.append(ikarte);
        bindeInteraktivEin(ikarte.querySelector(".lb-interaktiv"), iid, iparams);
      }
      if (daten.erklaerseite && l.themaPfad) koerper.append(el(`<p class="lb-erklaer-knopf"><a href="${url(l.themaPfad + "index.html" + (daten.anker || ""))}" target="_blank" rel="noopener">Ausführliche Erklärseite mit interaktiven Elementen öffnen ↗</a></p>`));
    }
    // Merksatz (mit Knopf „In mein Regelheft" – Dokumentation/Vernetzung)
    if (daten.merksatz) {
      const mk = el(`<div class="lb-merksatz"><span class="lb-etikett">📌 Merksatz</span><div class="lb-merksatz-text">${daten.merksatz}</div></div>`);
      const merkBtn = el(`<button type="button" class="knopf zweitrangig klein lb-regelheft-add">📒 In mein Regelheft</button>`);
      merkBtn.addEventListener("click", () => {
        if (ergaenzeRegelheft({ kurs: KURS_ID, lektion: l.id, titel: "Lektion " + l.nr + ": " + l.titel, html: daten.merksatz })) {
          merkBtn.textContent = "✓ Im Regelheft"; merkBtn.disabled = true;
        } else { merkBtn.textContent = "✓ schon im Regelheft"; merkBtn.disabled = true; }
      });
      mk.append(merkBtn);
      koerper.append(mk);
    }
    // Problemlöse-Strategien (Heurismen) – optional
    if (Array.isArray(daten.heurismen) && daten.heurismen.length) {
      const hb = el(`<div class="lb-heurismen"><span class="lb-etikett">🧠 Problemlöse-Strategien</span></div>`);
      const ul = el(`<ul></ul>`);
      daten.heurismen.forEach(h => ul.append(el(`<li>${h}</li>`)));
      hb.append(ul);
      koerper.append(hb);
    }
    // 🔗 Verwandte Begriffe (Querverlinkung, Serlo-Prinzip): Sprung zur einführenden Lektion desselben Kurses
    if (Array.isArray(daten.begriffe) && daten.begriffe.length) {
      const box = el(`<div class="lb-begriffe"><span class="lb-etikett">🔗 Verwandte Begriffe</span> <span class="lb-begriffe-hinweis">— kurz nachschlagen, wenn ein Begriff unklar ist:</span> </div>`);
      daten.begriffe.forEach((b, i) => {
        box.append(el(`<a class="lb-begriff-link" href="#lektion-${esc(b.lektion)}">${esc(b.wort)}</a>`));
        if (i < daten.begriffe.length - 1) box.append(document.createTextNode(" · "));
      });
      koerper.append(box);
    }
    // „Für die Lehrkraft"-Block (Lernaufgabe): einklappbar, Hinweise/Lösungen/Modellgrenzen
    if (daten.lehrkraft) koerper.append(el(`<details class="lb-lehrkraft"><summary>👩‍🏫 Für die Lehrkraft</summary><div class="lb-lehrkraft-koerper">${daten.lehrkraft}</div></details>`));
    // Selbsterklärung (Metakognition) – nur neues Format
    if (daten.selbsterklaerung) koerper.append(el(`<div class="lb-selbsterklaerung"><span class="lb-etikett">🗣️ In eigenen Worten</span><p>${daten.selbsterklaerung}</p></div>`));
    // POE-Erkunden (Position über daten.erkundenZuerst steuerbar)
    if (!daten.erkundenZuerst) rendereErkunden(daten, koerper);
    // Selbstcheck (verstanden?) – Fragen mit aufklappbarer Antwort
    if (Array.isArray(daten.selbstcheck) && daten.selbstcheck.length) {
      const box = el(`<div class="lb-selbstcheck"><span class="lb-etikett">✅ Selbstcheck – verstanden?</span></div>`);
      daten.selbstcheck.forEach(c => {
        const item = el(`<div class="lb-sc-item"><p class="lb-sc-frage">${c.frage}</p></div>`);
        const eingabe = el(`<textarea class="lb-sc-eingabe" rows="2" placeholder="Erst selbst beantworten …" aria-label="Deine Antwort"></textarea>`);
        const knopf = el(`<button type="button" class="knopf zweitrangig klein lb-sc-zeigen">Antwort zeigen</button>`);
        const loesung = el(`<div class="lb-sc-loesung" hidden><span class="lb-etikett">Musterantwort</span><div>${c.antwort}</div></div>`);
        knopf.addEventListener("click", () => { loesung.hidden = false; knopf.hidden = true; });
        item.append(eingabe, knopf, loesung);
        box.append(item);
      });
      koerper.append(box);
    }
  }
  else if (key === "ueben") {
    // Blütenaufgabe: gemeinsamer Kontext über Basis/Standard/Plus (selbstdifferenzierend)
    if (daten.bluete) koerper.append(baueBluete(daten.bluete));
    SPUREN.forEach(([s, slabel, sinfo]) => {
      const groups = daten[s] || [];
      const luecke = daten[s + "Luecke"];
      if (!groups.length && !luecke) return;
      const spur = el(`<div class="lb-spur ${s}"><h3><span class="lb-spur-tag">${slabel}</span> ${sinfo ? `<span class="lb-fortschritt-mini">${sinfo}</span>` : ""}</h3></div>`);
      if (groups.length) {
        const box = rendereAufgaben(groups, l.id + "-ueb-" + s);
        if (box.querySelector(".aufgabe")) spur.append(box);
        else if (aktuellerZweig() === "rs") spur.append(el(`<p class="lb-luecke">Dazu gibt es Gymnasial-Zusatzaufgaben – siehe „Ausblick Gymnasium" am Ende der Lektion.</p>`));
        else spur.append(el(`<p class="lb-luecke">Im gewählten Zweig ist hier keine zusätzliche Aufgabe vorgesehen.</p>`));
      } else spur.append(el(`<p class="lb-luecke">${esc(luecke)}</p>`));
      koerper.append(spur);
    });
    baueGemischtUeben(daten, l, koerper);
    if (daten.partner) koerper.append(el(`<div class="lb-partner"><span class="lb-etikett">👥 Partner-Auftrag</span> ${daten.partner}</div>`));
  }
  else if (key === "sichern") {
    // Rückbezug auf die Einstiegsfrage (Soll-Ist, schließt den roten Faden)
    if (daten.rueckbezug) koerper.append(el(`<div class="lb-rueckbezug"><span class="lb-etikett">🎯 Zurück zur Einstiegsfrage</span><div class="lb-rueckbezug-text">${daten.rueckbezug}</div></div>`));
    const poeVh = holeVorhersage(KURS_ID, l.id);
    if (poeVh) koerper.append(el(`<div class="lb-poe-rueckblick"><span class="lb-etikett">🔮 Deine Vorhersage</span><p>Am Anfang hast du <strong>${esc(poeVh)}</strong> vermutet. Passt das zu deinem Ergebnis? Begründe in einem Satz.</p></div>`));
    koerper.append(rendereAufgaben(daten.aufgaben, l.id + "-sich"));
    if (daten.transfer) koerper.append(el(`<div class="lb-beobachtung"><span class="lb-etikett">💭 Transferfrage</span><p>${daten.transfer}</p></div>`));
  }
  else if (key === "extra") {
    if (daten.text) koerper.append(el(`<p class="lb-phase-hinweis">${esc(daten.text)}</p>`));
    if (daten.links?.length) {
      const ul = el(`<ul class="lb-extra-links"></ul>`);
      daten.links.forEach(li => ul.append(el(`<li><a href="${url(li.href)}">${esc(li.label)} ↗</a></li>`)));
      koerper.append(ul);
    }
  }
  return sec;
}

function baueAmpel(l) {
  const stand = holeLektionStand(KURS_ID, l.id);
  // Adaptives Routing (Selbsteinschätzung → naechster Schritt): Links zur Erklaerstelle und zu Uebungen.
  const verstehen = l.phasen && l.phasen.verstehen;
  const vAnker = (verstehen && verstehen.anker) ? verstehen.anker : "";
  const erklaerLink = l.themaPfad ? url(l.themaPfad + "index.html" + vAnker) : "";
  const uebenLink = l.themaPfad ? url(l.themaPfad + "uebungen.html") : "";
  const routing = (erklaerLink || uebenLink)
    ? ` <span class="lb-ampel-routing">${erklaerLink ? `<a href="${erklaerLink}" target="_blank" rel="noopener">Erklärung ansehen ↗</a>` : ""}${erklaerLink && uebenLink ? " · " : ""}${uebenLink ? `<a href="${uebenLink}" target="_blank" rel="noopener">gezielt üben ↗</a>` : ""}</span>`
    : "";
  const sec = el(`<section class="lb-ampel" aria-label="Selbsteinschätzung">
    <h2>🚦 Wie sicher fühlst du dich?</h2></section>`);
  l.ziele.forEach((ziel, i) => {
    const block = el(`<div class="lb-ampel-ziel">
      <p class="lb-ampel-frage">${ziel}</p>
      <div class="lb-ampel-knoepfe" role="group"></div>
      <p class="lb-ampel-hinweis" role="status"></p></div>`);
    const knoepfe = block.querySelector(".lb-ampel-knoepfe");
    const hinweis = block.querySelector(".lb-ampel-hinweis");
    const optionen = [["gruen", "🟢", "sicher"], ["gelb", "🟡", "unsicher"], ["rot", "🔴", "brauche Hilfe"]];
    const setze = wert => {
      knoepfe.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.wert === wert)));
      if (wert === "gruen") hinweis.innerHTML = "Stark – weiter so! Wenn du magst, festige es mit einer <strong>Plus-Aufgabe</strong>.";
      else if (wert === "gelb") hinweis.innerHTML = "Fast sicher – so kommst du weiter:" + (routing || " Lies den Abschnitt noch einmal und übe eine Aufgabe mehr.");
      else hinweis.innerHTML = "<strong>Hol dir Hilfe</strong> und schreib deine Frage unten ins Lerntagebuch (geht nicht verloren)." + (routing ? " Davor hilft vielleicht:" + routing : "");
    };
    optionen.forEach(([w, sym, txt]) => {
      const b = el(`<button type="button" class="lb-ampel-knopf ${w}" data-wert="${w}" aria-pressed="${stand.ampel[i] === w}">${sym} ${txt}</button>`);
      b.addEventListener("click", () => { setzeAmpel(KURS_ID, l.id, i, w); setze(w); });
      knoepfe.append(b);
    });
    if (stand.ampel[i]) setze(stand.ampel[i]);
    sec.append(block);
  });
  return sec;
}

function baueCheckpoint(l) {
  const div = el(`<div class="lb-checkpoint"></div>`);
  zeichneCheckpoint(div, l);
  return div;
}

function zeichneCheckpoint(div, l) {
  const stand = holeLektionStand(KURS_ID, l.id);
  const bestanden = stand.checkpoint === true;
  div.classList.toggle("bestanden", bestanden);
  div.innerHTML = bestanden
    ? `<div class="lb-checkpoint-text"><strong>✓ Checkpoint bestanden</strong>Die nächste Lektion ist freigeschaltet. Gut gemacht!</div>`
    : `<div class="lb-checkpoint-text"><strong>Checkpoint: Sichern abschließen</strong>Löse die Sichern-Aufgaben, dann wird die nächste Lektion frei.</div>`;
  if (!bestanden) {
    const frg = el(`<button type="button" class="knopf zweitrangig klein">Lehrkraft hat freigegeben</button>`);
    frg.addEventListener("click", () => { setzeCheckpoint(KURS_ID, l.id, true); zeichneCheckpoint(div, l); });
    div.append(frg);
  }
}

// ---------- Lerntagebuch (geteilt) ----------
function baueTagebuch(lektion) {
  const sec = el(`<section class="lb-tagebuch" aria-label="Lerntagebuch">
    <h2>📓 Lerntagebuch${lektion ? " – Frage notieren" : ""}</h2>
    <form class="lb-tagebuch-form">
      <input type="text" maxlength="240" placeholder="Was möchtest du fragen oder dir merken?" aria-label="Neue Notiz">
      <button type="submit" class="knopf klein">Notieren</button>
    </form>
    <ul class="lb-tagebuch-liste"></ul></section>`);
  const form = sec.querySelector("form");
  const eingabe = sec.querySelector("input");
  const liste = sec.querySelector(".lb-tagebuch-liste");

  const zeichne = () => {
    const eintraege = holeTagebuch().filter(e => e.kurs === KURS_ID).reverse();
    liste.innerHTML = "";
    if (!eintraege.length) { liste.append(el(`<li class="lb-leer">Noch keine Notizen.</li>`)); return; }
    eintraege.forEach(e => {
      const li = el(`<li class="lb-tagebuch-eintrag"><span class="lb-te-text"></span><span class="lb-te-meta"></span><button type="button" class="lb-tagebuch-loeschen" aria-label="Notiz löschen" title="Löschen">×</button></li>`);
      li.querySelector(".lb-te-text").textContent = e.text;
      const lkt = KURS.lektionen.find(x => x.id === e.lektion);
      li.querySelector(".lb-te-meta").textContent = (lkt ? "L" + lkt.nr + " · " : "") + (e.datum || "").slice(0, 10);
      li.querySelector(".lb-tagebuch-loeschen").addEventListener("click", () => { entferneTagebuch(e.id); zeichne(); });
      liste.append(li);
    });
  };
  form.addEventListener("submit", ev => {
    ev.preventDefault();
    if (ergaenzeTagebuch({ text: eingabe.value, kurs: KURS_ID, lektion: lektion ? lektion.id : "" })) { eingabe.value = ""; zeichne(); }
  });
  zeichne();
  return sec;
}

// ---------- Mein Regelheft (gesammelte Merksätze, geteilt) ----------
function baueRegelheft() {
  const sec = el(`<details class="lb-regelheft"><summary>📒 Mein Regelheft (gesammelte Merksätze)</summary><div class="lb-regelheft-koerper"></div></details>`);
  const koerper = sec.querySelector(".lb-regelheft-koerper");
  const zeichne = () => {
    const eintraege = holeRegelheft().filter(e => e.kurs === KURS_ID).reverse();
    koerper.innerHTML = "";
    if (!eintraege.length) { koerper.append(el(`<p class="lb-leer">Noch keine Merksätze gesammelt. Tippe in einer Lektion beim Merksatz auf „In mein Regelheft".</p>`)); return; }
    eintraege.forEach(e => {
      const eintrag = el(`<div class="lb-regelheft-eintrag"><div class="lb-regelheft-titel"></div><div class="lb-regelheft-satz">${e.html}</div><button type="button" class="lb-tagebuch-loeschen" aria-label="Aus Regelheft entfernen" title="Entfernen">×</button></div>`);
      eintrag.querySelector(".lb-regelheft-titel").textContent = e.titel || "";
      eintrag.querySelector("button").addEventListener("click", () => { entferneRegelheft(e.id); zeichne(); });
      koerper.append(eintrag);
    });
    rendereMathe(koerper);
  };
  zeichne();
  return sec;
}

// ---------- Schüler-Feedback (Lektionsende, dezent & freiwillig) ----------
function baueFeedback(l) {
  const vorbelegt = holeFeedback(KURS_ID, l.id);
  const det = el(`<details class="lb-feedback">
    <summary>✍ Rückmeldung geben (optional)</summary>
    <div class="lb-feedback-koerper">
      <p class="lb-feedback-hinweis">Nur wenn deine Lehrkraft darum bittet. Anonym, freiwillig — bitte keine persönlichen Daten.</p>
    </div>
  </details>`);
  const koerper = det.querySelector(".lb-feedback-koerper");

  // Hilfsfunktion: ein Fieldset mit Radio-Chips bauen.
  const baueGruppe = (titel, name, optionen, vorwahl) => {
    const fs = el(`<fieldset class="lb-fb-gruppe"><legend>${esc(titel)}</legend><div class="lb-fb-chips"></div></fieldset>`);
    const box = fs.querySelector(".lb-fb-chips");
    optionen.forEach(([wert, label]) => {
      const id = name + "-" + wert;
      const chip = el(`<label class="lb-fb-chip" for="${id}">
        <input type="radio" id="${id}" name="${name}" value="${wert}" ${vorwahl === wert ? "checked" : ""}>
        <span>${esc(label)}</span></label>`);
      box.append(chip);
    });
    return fs;
  };

  const gruppeVerst = baueGruppe(
    "Wie verständlich war diese Lektion?",
    `fb-verst-${l.id}`,
    [["gut", "🟢 gut verständlich"], ["mittel", "🟡 teilweise"], ["schwer", "🔴 schwer verständlich"]],
    vorbelegt.verstaendlich
  );
  const gruppeSchwer = baueGruppe(
    "Schwierigkeit?",
    `fb-schwer-${l.id}`,
    [["leicht", "zu leicht"], ["passt", "genau richtig"], ["schwer", "zu schwer"]],
    vorbelegt.schwierigkeit
  );
  koerper.append(gruppeVerst, gruppeSchwer);

  // Optionaler Freitext
  const freiId = "fb-frei-" + l.id;
  const freiWrap = el(`<div class="lb-fb-frei">
    <label for="${freiId}">Was war unklar oder zu schwer? (freiwillig)</label>
    <textarea id="${freiId}" rows="3" maxlength="600" placeholder="Optional – nur wenn du magst."></textarea>
  </div>`);
  const freitext = freiWrap.querySelector("textarea");
  freitext.value = vorbelegt.freitext || "";
  koerper.append(freiWrap);

  // Aktionen + Bestätigung
  const aktion = el(`<div class="lb-fb-aktion"></div>`);
  const speichern = el(`<button type="button" class="knopf klein">Speichern</button>`);
  const exportieren = el(`<button type="button" class="knopf zweitrangig klein">Meine Rückmeldungen exportieren</button>`);
  const status = el(`<span class="lb-fb-status" role="status" aria-live="polite"></span>`);
  aktion.append(speichern, exportieren, status);
  koerper.append(aktion);

  const gewaehlt = name => {
    const t = det.querySelector(`input[name="${name}"]:checked`);
    return t ? t.value : "";
  };
  speichern.addEventListener("click", () => {
    speichereFeedback(KURS_ID, l.id, {
      verstaendlich: gewaehlt(`fb-verst-${l.id}`),
      schwierigkeit: gewaehlt(`fb-schwer-${l.id}`),
      freitext: freitext.value
    });
    status.textContent = "✓ Gespeichert — danke!";
  });
  exportieren.addEventListener("click", () => exportiereFeedback());

  return det;
}

// ---------- Routing ----------
function aktuelleLektionId() {
  const m = location.hash.match(/^#lektion-(.+)$/);
  return m ? m[1] : null;
}
function gehe(hash) { if (location.hash !== hash) location.hash = hash; else route(); }
function fokussiere(wrap) {
  const h = wrap.querySelector("[data-lb-fokus]");
  if (h) { try { h.focus({ preventScroll: false }); } catch (_e) {} }
  window.scrollTo({ top: 0, behavior: "auto" });
}

function zweigErlaubt() {
  const z = aktuellerZweig();
  return z === "alle" || !Array.isArray(KURS.zweig) || KURS.zweig.includes(z);
}
function rendereZweigHinweis() {
  HALTER.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "lernbuero";
  wrap.innerHTML = `<div class="merkkasten"><span class="merk-etikett">Nur im Gymnasialzweig</span>
    <p>Dieser Kurs gehört zur Oberstufe (Einführungs- bzw. Qualifikationsphase) und ist im Realschulzweig nicht vorgesehen. Stelle den Zweig oben auf „Gym“ oder „Alle“, um ihn zu öffnen – oder zurück zur <a href="${url("selbstlernen/index.html")}">Kursübersicht</a>.</p></div>`;
  HALTER.append(wrap);
}
function route() {
  HALTER._cpHandler = null;
  if (!zweigErlaubt()) { rendereZweigHinweis(); return; }
  const id = aktuelleLektionId();
  if (id) rendereLektion(id);
  else rendereLandkarte();
}

export async function starteKurs() {
  HALTER = document.getElementById("lernbuero");
  if (!HALTER) return;
  KURS_ID = document.body.dataset.kurs || "";
  try {
    const a = await fetch(url("daten/kurse/" + KURS_ID + ".json"));
    if (!a.ok) throw new Error(a.status);
    KURS = await a.json();
  } catch (_e) {
    HALTER.innerHTML = `<p class="einleitung">Der Kurs konnte nicht geladen werden. <a href="${url("selbstlernen/index.html")}">Zur Kursübersicht</a></p>`;
    return;
  }
  await ladeQuellen();
  window.addEventListener("hashchange", route);
  document.addEventListener("zweig-geaendert", route);   // Zweigwechsel: Filter neu anwenden
  // Fortschritt geändert (z. B. Aufgabe gelöst): Checkpoint im Player live nachziehen.
  document.addEventListener("fortschritt-geaendert", () => { if (HALTER._cpHandler) HALTER._cpHandler(); });
  route();
}

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
  holeFeedback, speichereFeedback, exportiereFeedback
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
  const taktung = KURS.taktung === "wochenplan" ? "Wochenplan mit Mindestmarke" : "feste Lektionsfolge";
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

  const reihenfolge = KURS.lektionen.map(l => l.id);
  const lektionVon = new Map(KURS.lektionen.map(l => [l.id, l]));

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
      ${block.mindestmarke ? `<p class="lb-mindestmarke">Mindestmarke: <strong>${esc(block.mindestmarke)}</strong></p>` : ""}
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

  // Diskreter Link zum (passwortgeschützten) Lehrkraft-Bereich
  wrap.append(el(`<p class="lb-lehrkraft-link"><a href="lehrkraft.html">🔒 Lehrkraft-Bereich</a></p>`));

  HALTER.append(wrap);
  rendereMathe(wrap);
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
  HALTER.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "lernbuero";

  if (!l) { wrap.append(el(`<p class="einleitung">Diese Lektion gibt es nicht. <a href="#">Zur Lernlandkarte</a></p>`)); HALTER.append(wrap); return; }

  const zurueck = el(`<a class="lb-zurueck" href="#">← Zur Lernlandkarte</a>`);
  zurueck.addEventListener("click", e => { e.preventDefault(); gehe(""); });
  wrap.append(zurueck);

  // Gesperrt?
  if (!istLektionFrei(KURS_ID, KURS.lektionen.map(x => x.id), index)) {
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
    <ul class="lb-ziele">${l.ziele.map(z => `<li><span>${z}</span></li>`).join("")}</ul>
  </div>`);
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

  HALTER.append(wrap);
  rendereMathe(wrap);
  fokussiere(wrap);

  // Checkpoint live aus den Sichern-Aufgaben ableiten
  const aktualisiereCheckpoint = () => {
    const bestanden = alleGeloest(l.phasen.sichern?.aufgaben) || holeLektionStand(KURS_ID, l.id).checkpoint;
    if (bestanden && holeLektionStand(KURS_ID, l.id).checkpoint !== true) setzeCheckpoint(KURS_ID, l.id, true);
    zeichneCheckpoint(cp, l);
  };
  aktualisiereCheckpoint();
  HALTER._cpHandler = aktualisiereCheckpoint;
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
    if (daten.hinweis) koerper.append(el(`<p class="lb-phase-hinweis">${esc(daten.hinweis)}</p>`));
    koerper.append(rendereAufgaben(daten.aufgaben, l.id + "-ank"));
  }
  else if (key === "verstehen") {
    if (daten.text) koerper.append(el(`<p class="lb-phase-hinweis">${esc(daten.text)}</p>`));
    const eHalter = el(`<div class="lb-erklaer" aria-busy="true"><p class="lb-phase-hinweis">Abschnitt wird geladen …</p></div>`);
    koerper.append(eHalter);
    bindeAbschnittEin(eHalter, l.themaPfad, daten.anker, daten);   // async, füllt nach
    if (daten.beobachtung) koerper.append(el(`<div class="lb-beobachtung"><span class="lb-etikett">🔍 Beobachtungsauftrag</span><p>${daten.beobachtung}</p></div>`));
    if (daten.sim) koerper.append(el(`<p><a class="knopf zweitrangig klein" href="${url(daten.sim.pfad)}">${esc(daten.sim.titel || "Simulation öffnen")} ↗</a></p>`));
  }
  else if (key === "ueben") {
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
    if (daten.partner) koerper.append(el(`<div class="lb-partner"><span class="lb-etikett">👥 Partner-Auftrag</span> ${daten.partner}</div>`));
  }
  else if (key === "sichern") {
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
      if (wert === "gruen") hinweis.textContent = "Stark – weiter so!";
      else if (wert === "gelb") hinweis.innerHTML = "Übe dieses Ziel mit einer <strong>Plus-Aufgabe</strong> oder lies den Abschnitt noch einmal.";
      else hinweis.innerHTML = '<strong>Hol die Lehrkraft.</strong> Schreib deine Frage unten ins Lerntagebuch, dann geht sie nicht verloren.';
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

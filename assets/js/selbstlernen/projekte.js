// projekte.js — Lernbüro: Projektkarten (Scratch/Calliope). Galerie + Kartenansicht.
// Programmiert wird im externen Editor (nur Link, keine Einbettung). Fortschritt lokal.

import { WURZEL } from "../komponenten.js";
import { rendereMathe } from "../mathe-render.js";
import { holeProjektStand, setzeProjektErledigt, setzeProjektZeigEs } from "../fortschritt.js";

let PROJEKT = null, PROJEKT_ID = "", HALTER = null;

function esc(t) { return String(t).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z])); }
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function url(rel) { return new URL(rel, WURZEL).href; }

export async function starteProjekte() {
  HALTER = document.getElementById("projekte");
  if (!HALTER) return;
  PROJEKT_ID = document.body.dataset.projekt || "";
  try {
    const a = await fetch(url("daten/projekte/" + PROJEKT_ID + ".json"));
    if (!a.ok) throw new Error(a.status);
    PROJEKT = await a.json();
  } catch (_e) {
    HALTER.innerHTML = `<p class="einleitung">Die Projektkarten konnten nicht geladen werden. <a href="${url("selbstlernen/index.html")}">Zur Übersicht</a></p>`;
    return;
  }
  window.addEventListener("hashchange", route);
  route();
}

function aktuelleKarteId() { const m = location.hash.match(/^#karte-(.+)$/); return m ? m[1] : null; }
function route() { const id = aktuelleKarteId(); if (id) rendereKarte(id); else rendereGalerie(); }

function werkzeugKnopf(klasse) {
  return el(`<p><a class="knopf ${klasse}" href="${esc(PROJEKT.werkzeugUrl)}" target="_blank" rel="noopener">${esc(PROJEKT.werkzeug)}-Editor öffnen ↗</a></p>`);
}

function rendereGalerie() {
  HALTER.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "lernbuero";
  wrap.append(el(`<div class="lb-kopf"><p class="lb-untertitel">${esc(PROJEKT.untertitel || "")}</p></div>`));
  const leiste = el(`<div class="lb-leitleiste"></div>`);
  leiste.append(el(`<span class="lb-chip">🧩 Projektkarten</span>`));
  leiste.append(el(`<span class="lb-chip">🛠 ${esc(PROJEKT.werkzeug)}</span>`));
  leiste.append(el(`<span class="lb-chip">👥 Partner-Abnahme</span>`));
  wrap.append(leiste);
  wrap.append(el(`<div class="merkkasten"><span class="merk-etikett">So arbeitest du mit den Karten</span>
    <p>Such dir eine Karte aus – die Reihenfolge ist frei. Programmiert wird im <strong>${esc(PROJEKT.werkzeug)}-Editor</strong> (öffnet in einem neuen Tab); die Karte nennt dir Ziel, Pflicht-Bausteine und Schritte. Wenn du feststeckst, hilft die gestufte Hilfe. Zum Schluss zeigst du dein Ergebnis einem Partner und hakst die Punkte ab. Keine Noten – dein Stand bleibt auf diesem Gerät.</p></div>`));
  if (PROJEKT.werkzeugHinweis) wrap.append(el(`<p class="lb-phase-hinweis">${esc(PROJEKT.werkzeugHinweis)}</p>`));
  wrap.append(werkzeugKnopf("klein zweitrangig"));

  const gitter = document.createElement("div"); gitter.className = "lb-lektionsliste";
  PROJEKT.karten.filter(k => k.status !== "geplant").forEach(k => {
    const stand = holeProjektStand(PROJEKT_ID, k.id);
    const karte = el(`<div class="lb-lektion-karte ${stand.erledigt ? "ist-fertig" : "ist-frei"}">
      <span class="lb-lektion-nr" aria-hidden="true">${k.nr}</span>
      <div class="lb-lektion-text">
        <div class="lb-lektion-titel">${esc(k.titel)}</div>
        <div class="lb-lektion-meta"><span>${esc(k.ziel)}</span>${k.kc ? `<span class="lb-badge">${esc(k.kc)}</span>` : ""}</div>
      </div>
      <div class="lb-lektion-aktion">${stand.erledigt ? '<span class="lb-badge fertig">✓ erledigt</span>' : ""}<a class="knopf klein" href="#karte-${k.id}">Öffnen</a></div>
    </div>`);
    gitter.append(karte);
  });
  wrap.append(gitter);
  HALTER.append(wrap);
  rendereMathe(wrap);
}

function baueListenPhase(titel, items, ordered) {
  const sec = el(`<section class="lb-phase"><div class="lb-phase-kopf"><h3>${esc(titel)}</h3></div><div class="lb-phase-koerper"></div></section>`);
  const liste = document.createElement(ordered ? "ol" : "ul");
  liste.className = ordered ? "lb-schritte" : "lb-bausteine";
  items.forEach(x => { const li = document.createElement("li"); li.innerHTML = x; liste.append(li); });
  sec.querySelector(".lb-phase-koerper").append(liste);
  return sec;
}

function baueHilfen(hilfen) {
  const sec = el(`<section class="lb-phase"><div class="lb-phase-kopf"><h3>Hilfe – Schritt für Schritt</h3></div><div class="lb-phase-koerper"></div></section>`);
  const bereich = el(`<div class="tipp-bereich" aria-live="polite"></div>`);
  const knopf = document.createElement("button");
  knopf.type = "button"; knopf.className = "knopf zweitrangig klein";
  let stufe = 0;
  knopf.textContent = `Hilfe anzeigen (0/${hilfen.length})`;
  knopf.addEventListener("click", async () => {
    if (stufe >= hilfen.length) return;
    const t = document.createElement("div"); t.className = "tipp";
    t.innerHTML = `<strong>Hilfe ${stufe + 1}:</strong> ${hilfen[stufe]}`;
    bereich.append(t); await rendereMathe(t); stufe++;
    knopf.textContent = stufe >= hilfen.length ? "Alle Hilfen angezeigt" : `Nächste Hilfe (${stufe}/${hilfen.length})`;
    if (stufe >= hilfen.length) knopf.disabled = true;
  });
  const koerper = sec.querySelector(".lb-phase-koerper");
  koerper.append(knopf, bereich);
  return sec;
}

function baueZeigEs(k) {
  const sec = el(`<section class="lb-zeiges" aria-label="Zeig es"><h3>👥 Zeig es – Abnahme mit Partner</h3>
    <p class="lb-phase-hinweis">Wenn alles passt, zeig es einem Partner und hakt gemeinsam ab.</p></section>`);
  const stand = holeProjektStand(PROJEKT_ID, k.id);
  k.zeigEs.forEach((punkt, i) => {
    const label = el(`<label class="lb-check-zeile"><input type="checkbox" ${stand.zeigEs[i] ? "checked" : ""}> <span>${punkt}</span></label>`);
    label.querySelector("input").addEventListener("change", e => setzeProjektZeigEs(PROJEKT_ID, k.id, i, e.target.checked));
    sec.append(label);
  });
  return sec;
}

function baueErledigt(k) {
  const stand = holeProjektStand(PROJEKT_ID, k.id);
  const div = el(`<div class="lb-checkpoint ${stand.erledigt ? "bestanden" : ""}">
    <div class="lb-checkpoint-text"><strong>${stand.erledigt ? "✓ Projekt erledigt" : "Projekt erledigt?"}</strong>Hak ab, wenn du fertig bist – das merkt sich dein Gerät.</div></div>`);
  const label = el(`<label class="lb-phase-erledigt"><input type="checkbox" ${stand.erledigt ? "checked" : ""}> erledigt</label>`);
  label.querySelector("input").addEventListener("change", e => {
    setzeProjektErledigt(PROJEKT_ID, k.id, e.target.checked);
    div.classList.toggle("bestanden", e.target.checked);
    div.querySelector("strong").textContent = e.target.checked ? "✓ Projekt erledigt" : "Projekt erledigt?";
  });
  div.append(label);
  return div;
}

function rendereKarte(kid) {
  const k = PROJEKT.karten.find(x => x.id === kid);
  HALTER.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "lernbuero";
  if (!k) { wrap.append(el(`<p class="einleitung">Diese Karte gibt es nicht. <a href="#">Zur Projektübersicht</a></p>`)); HALTER.append(wrap); return; }
  const zurueck = el(`<a class="lb-zurueck" href="#">← Zur Projektübersicht</a>`);
  zurueck.addEventListener("click", e => { e.preventDefault(); if (location.hash) location.hash = ""; else route(); });
  wrap.append(zurueck);
  wrap.append(el(`<div class="lb-player-kopf"><h2 class="lb-lektion-h2" data-lb-fokus tabindex="-1">Projekt ${k.nr}: ${esc(k.titel)}</h2>
    <p class="lb-untertitel">${esc(PROJEKT.titel)} · ${esc(PROJEKT.werkzeug)}</p></div>`));
  wrap.append(el(`<div class="lb-beobachtung"><span class="lb-etikett">🎯 Das ist das Ziel</span><p>${k.ziel}</p></div>`));
  wrap.append(werkzeugKnopf("zweitrangig klein"));
  if (k.pflichtbausteine?.length) wrap.append(baueListenPhase("Diese Bausteine müssen vorkommen", k.pflichtbausteine, false));
  if (k.schritte?.length) wrap.append(baueListenPhase("Auftrag – Schritt für Schritt", k.schritte, true));
  if (k.hilfen?.length) wrap.append(baueHilfen(k.hilfen));
  if (k.zeigEs?.length) wrap.append(baueZeigEs(k));
  if (k.plus?.length) {
    const p = el(`<div class="lb-partner"><span class="lb-etikett">⭐ Plus – wenn du Lust auf mehr hast</span></div>`);
    const ul = document.createElement("ul"); k.plus.forEach(x => { const li = document.createElement("li"); li.innerHTML = x; ul.append(li); });
    p.append(ul); wrap.append(p);
  }
  if (k.theorieAnker) wrap.append(el(`<p class="lb-erklaer-quelle"><a href="${url(k.theorieAnker.href)}">${esc(k.theorieAnker.label)} ↗</a></p>`));
  wrap.append(baueErledigt(k));
  HALTER.append(wrap);
  rendereMathe(wrap);
  const h = wrap.querySelector("[data-lb-fokus]"); if (h) { try { h.focus(); } catch (_e) {} }
  window.scrollTo({ top: 0, behavior: "auto" });
}

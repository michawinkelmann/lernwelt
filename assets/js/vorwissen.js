// vorwissen.js — „Das solltest du schon können"-Kasten auf Erklärseiten.
// Liest das vorwissen-Feld aus daten/themen.json und bietet je Vorwissens-Thema
// einen aufklappbaren Mini-Check mit 3 Aufgaben aus dem Bestand (Aufgaben-Engine).
// Wird von komponenten.js bei data-seite="thema" nachgeladen.

import { WURZEL, aktuellerZweig } from "./komponenten.js";
import { STUFEN_LABEL, ladeThemen } from "./uebersicht.js";

// Nur Typen mit automatischer Rückmeldung eignen sich für den Schnell-Check
const CHECK_TYPEN = new Set(["numerisch", "multiple-choice", "luecke", "zuordnung", "reihenfolge"]);

function findeAktuellesThema(themen) {
  const wurzelPfad = WURZEL.pathname;
  let rel = location.pathname.startsWith(wurzelPfad) ? location.pathname.slice(wurzelPfad.length) : location.pathname;
  rel = decodeURIComponent(rel);
  return themen.find(t => rel === t.pfad + "index.html" || rel === t.pfad || rel === t.pfad.replace(/\/$/, ""));
}

// 3 passende Diagnose-Aufgaben wählen: automatisch prüfbar, zum Zweig passend, leichteste zuerst
export function waehleCheckAufgaben(aufgaben, zweig, anzahl = 3) {
  return aufgaben
    .filter(a => CHECK_TYPEN.has(a.typ))
    .filter(a => zweig === "alle" || (a.zweig || []).includes(zweig))
    .sort((a, b) => (a.niveau - b.niveau) || (a.afb - b.afb))
    .slice(0, anzahl);
}

async function fuelleCheck(behaelter, vorThema) {
  behaelter.innerHTML = `<p>Aufgaben werden geladen …</p>`;
  try {
    const antwort = await fetch(new URL(`daten/aufgaben/${vorThema.id}.json`, WURZEL));
    if (!antwort.ok) throw new Error("HTTP " + antwort.status);
    const daten = await antwort.json();
    const auswahl = waehleCheckAufgaben(daten.aufgaben, aktuellerZweig());
    if (auswahl.length === 0) {
      behaelter.innerHTML = `<p>Für deine Zweig-Auswahl gibt es hier keinen Schnell-Check — schau direkt in die <a href="${WURZEL.href}${vorThema.pfad}uebungen.html">Übungen</a>.</p>`;
      return;
    }
    const [{ baueAufgabe }, { rendereMathe }] = await Promise.all([
      import("./aufgaben-engine.js"),
      import("./mathe-render.js")
    ]);
    behaelter.innerHTML = "";
    auswahl.forEach((aufgabe, i) => behaelter.append(baueAufgabe(aufgabe, i, vorThema.id)));
    const mehr = document.createElement("p");
    mehr.innerHTML = `Unsicher? Hier kannst du das Thema auffrischen: <a href="${WURZEL.href}${vorThema.pfad}index.html">${vorThema.titel}</a> · <a href="${WURZEL.href}${vorThema.pfad}uebungen.html">alle Übungen</a>`;
    behaelter.append(mehr);
    await rendereMathe(behaelter);
  } catch (fehler) {
    behaelter.innerHTML = `<p>Die Aufgaben konnten nicht geladen werden. Direkt zum Thema: <a href="${WURZEL.href}${vorThema.pfad}index.html">${vorThema.titel}</a></p>`;
  }
}

export async function rendereVorwissen() {
  const themen = await ladeThemen();
  const thema = findeAktuellesThema(themen);
  if (!thema || !Array.isArray(thema.vorwissen) || thema.vorwissen.length === 0) return;
  const index = new Map(themen.map(t => [t.id, t]));
  const ziele = thema.vorwissen.map(id => index.get(id)).filter(Boolean);
  if (ziele.length === 0) return;

  const kasten = document.createElement("aside");
  kasten.className = "merkkasten vorwissen-kasten";
  kasten.innerHTML = `<span class="merk-etikett">Das solltest du schon können</span>
    <p>Dieses Thema baut auf Bekanntem auf. Unsicher? Prüfe dich kurz — jede Frage kommt direkt aus dem verlinkten Thema.</p>`;

  for (const vorThema of ziele) {
    const block = document.createElement("div");
    block.className = "vorwissen-eintrag";
    const stufe = STUFEN_LABEL[vorThema.stufe] || vorThema.stufe;
    block.innerHTML = `<p><a href="${WURZEL.href}${vorThema.pfad}index.html"><strong>${vorThema.titel}</strong></a> <span class="abzeichen">${stufe}</span></p>`;
    const det = document.createElement("details");
    det.className = "vorwissen-check";
    det.innerHTML = `<summary>Kurz prüfen (3 Aufgaben)</summary><div class="aufgaben-liste"></div>`;
    det.addEventListener("toggle", () => {
      if (det.open) fuelleCheck(det.querySelector(".aufgaben-liste"), vorThema);
    }, { once: true });
    block.append(det);
    kasten.append(block);
  }

  const einleitung = document.querySelector("main .einleitung");
  if (einleitung) einleitung.after(kasten);
  else {
    const h1 = document.querySelector("main h1");
    if (h1) h1.after(kasten);
  }
}

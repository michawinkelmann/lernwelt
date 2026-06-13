// uebersicht.js — Lernbüro-Einstieg: Lektionskurse (daten/kurse.json) + Projektkurse
// (daten/projekte.json), gefiltert nach Schulzweig (Oberstufe = nur Gymnasium).
import { WURZEL, aktuellerZweig } from "../komponenten.js";

function esc(t) { return String(t).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z])); }
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

const STATUS_LABEL = { "in-arbeit": "Pilot · in Arbeit", "online": "verfügbar" };
let KURSE = null, PROJEKTE = null;

function passtZweig(k, zweig) {
  return zweig === "alle" || !Array.isArray(k.zweig) || k.zweig.includes(zweig);
}
function fachklasse(fach) { return fach === "physik" ? "physik" : fach === "informatik" ? "informatik" : "mathe"; }
function zTag(z) { return (z || ["gym", "rs"]).map(x => x === "gym" ? "Gym" : "RS").join(" · "); }

export async function rendereKursliste() {
  const halter = document.getElementById("kursliste");
  if (!halter) return;
  if (!KURSE) {
    try { KURSE = (await (await fetch(new URL("daten/kurse.json", WURZEL))).json()).kurse || []; }
    catch (_e) { halter.innerHTML = `<p class="einleitung">Die Kursliste konnte nicht geladen werden.</p>`; return; }
  }
  if (PROJEKTE === null) {
    try { PROJEKTE = (await (await fetch(new URL("daten/projekte.json", WURZEL))).json()).projekte || []; }
    catch (_e) { PROJEKTE = []; }
  }
  zeichne(halter);
  document.addEventListener("zweig-geaendert", () => zeichne(halter));
}

function karte(eintrag, zielUnter, zusatz) {
  const ziel = new URL(eintrag.pfad + "index.html", WURZEL).href;
  return el(`<article class="kachel ${fachklasse(eintrag.fach)}">
    <h3 class="kachel-titel"><a class="kachel-link" href="${ziel}">${esc(eintrag.titel)}</a></h3>
    <p>${esc(eintrag.kurz || "")}</p>
    <p class="kachel-fuss">
      <span class="abzeichen">${esc(STATUS_LABEL[eintrag.status] || eintrag.status)}</span>
      <span class="abzeichen zweig-tag">${zTag(eintrag.zweig)}</span>
      ${zusatz || ""}
      <a class="knopf klein" href="${ziel}">${zielUnter}</a>
    </p></article>`);
}

function zeichne(halter) {
  const zweig = aktuellerZweig();
  const sichtbar = k => k.status === "online" || k.status === "in-arbeit";
  const kurse = KURSE.filter(k => sichtbar(k) && passtZweig(k, zweig));
  const projekte = (PROJEKTE || []).filter(p => sichtbar(p) && passtZweig(p, zweig));
  halter.innerHTML = "";

  if (kurse.length) {
    const g = document.createElement("div"); g.className = "kacheln";
    kurse.forEach(k => g.append(karte(k, "Zum Kurs")));
    halter.append(g);
  } else {
    halter.append(el(`<p class="einleitung">Für den gewählten Zweig ist noch kein Lektionskurs freigeschaltet.</p>`));
  }

  if (projekte.length) {
    halter.append(el(`<h2>Projekte zum Selbermachen</h2>`));
    halter.append(el(`<p class="einleitung">Programmieren durch Machen: Projektkarten mit Ziel, Bausteinen, gestufter Hilfe und Partner-Abnahme. Programmiert wird im jeweiligen Online-Editor.</p>`));
    const g = document.createElement("div"); g.className = "kacheln";
    projekte.forEach(p => g.append(karte(p, "Zu den Projekten", `<span class="abzeichen">🛠 ${esc(p.werkzeug || "")}</span>`)));
    halter.append(g);
  }

  if (zweig === "rs") {
    const versteckt = KURSE.filter(k => sichtbar(k) && !passtZweig(k, zweig)).length;
    if (versteckt) halter.append(el(`<p class="einleitung">Hinweis: ${versteckt} Oberstufenkurse (Einführungs- und Qualifikationsphase) sind im Realschulzweig ausgeblendet. Stelle den Zweig oben auf „Gym“ oder „Alle“, um sie zu sehen.</p>`));
  }
}

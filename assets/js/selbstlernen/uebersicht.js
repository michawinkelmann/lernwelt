// uebersicht.js — Lernbüro-Einstieg: Lektionskurse (daten/kurse.json) + Projektkurse
// (daten/projekte.json), nach Fach (Mathematik · Physik · Informatik) gegliedert und
// nach Schulzweig gefiltert. Projektkarten erscheinen als Abschnitt unter Informatik.
import { WURZEL, aktuellerZweig } from "../komponenten.js";

function esc(t) { return String(t).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z])); }
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

const FACH_REIHEN = [["mathematik", "Mathematik"], ["physik", "Physik"], ["informatik", "Informatik"]];
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
  // Von der Startseite mit #lb-<fach> verlinkt: nach dem JS-Aufbau einmalig dorthin scrollen.
  if (location.hash) {
    const ziel = document.getElementById(location.hash.slice(1));
    if (ziel && ziel.scrollIntoView) ziel.scrollIntoView({ block: "start" });
  }
  document.addEventListener("zweig-geaendert", () => zeichne(halter));
}

function karte(eintrag, zielUnter, zusatz) {
  const ziel = new URL(eintrag.pfad + "index.html", WURZEL).href;
  return el(`<article class="kachel ${fachklasse(eintrag.fach)}">
    <h3 class="kachel-titel"><a class="kachel-link" href="${ziel}">${esc(eintrag.titel)}</a></h3>
    <p>${esc(eintrag.kurz || "")}</p>
    <p class="kachel-fuss">
      <span class="abzeichen zweig-tag">${zTag(eintrag.zweig)}</span>
      ${zusatz || ""}
      <a class="knopf klein" href="${ziel}">${zielUnter}</a>
    </p></article>`);
}

function gitter(eintraege, zielUnter, zusatzFn) {
  const g = document.createElement("div"); g.className = "kacheln";
  eintraege.forEach(e => g.append(karte(e, zielUnter, zusatzFn ? zusatzFn(e) : "")));
  return g;
}

function zeichne(halter) {
  const zweig = aktuellerZweig();
  const sichtbar = x => x.status === "online" || x.status === "in-arbeit";
  const kurse = KURSE.filter(k => sichtbar(k) && passtZweig(k, zweig));
  const projekte = (PROJEKTE || []).filter(p => sichtbar(p) && passtZweig(p, zweig));
  halter.innerHTML = "";
  let etwas = false;

  for (const [fach, label] of FACH_REIHEN) {
    const fk = kurse.filter(k => k.fach === fach);
    const fp = fach === "informatik" ? projekte : [];
    if (!fk.length && !fp.length) continue;
    etwas = true;
    halter.append(el(`<h2 class="lb-fach" id="lb-${fach}">${label}</h2>`));
    if (fk.length) halter.append(gitter(fk, "Zum Kurs"));
    if (fp.length) {
      halter.append(el(`<h3 class="lb-projekte-titel">Projekte zum Selbermachen</h3>`));
      halter.append(el(`<p class="einleitung">Programmieren durch Machen: Projektkarten mit Ziel, Bausteinen, gestufter Hilfe und Partner-Abnahme. Programmiert wird im jeweiligen Online-Editor.</p>`));
      halter.append(gitter(fp, "Zu den Projekten", p => `<span class="abzeichen">🛠 ${esc(p.werkzeug || "")}</span>`));
    }
  }

  if (!etwas) halter.append(el(`<p class="einleitung">Für den gewählten Zweig ist noch kein Kurs freigeschaltet.</p>`));

  if (zweig === "rs") {
    const versteckt = KURSE.filter(k => sichtbar(k) && !passtZweig(k, zweig)).length;
    if (versteckt) halter.append(el(`<p class="einleitung">Hinweis: ${versteckt} Oberstufenkurse (Einführungs- und Qualifikationsphase) sind im Realschulzweig ausgeblendet. Stelle den Zweig oben auf „Gym“ oder „Alle“, um sie zu sehen.</p>`));
  }
}

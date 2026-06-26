// uebersicht.js — generiert Start-, Fach- und Stufenübersichten aus daten/themen.json.
// Wird von komponenten.js aufgerufen; reagiert auf den Zweig-Umschalter.

import { WURZEL, aktuellerZweig } from "./komponenten.js";
import { holeThemenFortschritt } from "./fortschritt.js";

export const STUFEN_REIHENFOLGE = [
  "klasse-5", "klasse-6", "klasse-7", "klasse-8", "klasse-9", "klasse-10",
  "einfuehrungsphase", "qualifikationsphase"
];

export const STUFEN_LABEL = {
  "klasse-5": "Klasse 5",
  "klasse-6": "Klasse 6",
  "klasse-7": "Klasse 7",
  "klasse-8": "Klasse 8",
  "klasse-9": "Klasse 9",
  "klasse-10": "Klasse 10",
  "einfuehrungsphase": "Einführungsphase (Jg. 11)",
  "qualifikationsphase": "Qualifikationsphase (Jg. 12/13)"
};

const FACH_LABEL = { mathematik: "Mathematik", physik: "Physik", informatik: "Informatik" };
const FACH_BESCHREIBUNG = {
  mathematik: "Von den natürlichen Zahlen bis zur Integralrechnung — üben, verstehen, ausprobieren.",
  physik: "Phänomene erkunden, Experimente simulieren, Gesetzmäßigkeiten entdecken.",
  informatik: "Daten, Algorithmen und Automaten — die Grundlagen der digitalen Welt."
};

let themenVersprechen = null;

// themen.json einmal laden und zwischenspeichern
export function ladeThemen() {
  if (!themenVersprechen) {
    themenVersprechen = fetch(new URL("daten/themen.json", WURZEL))
      .then(antwort => {
        if (!antwort.ok) throw new Error("themen.json: HTTP " + antwort.status);
        return antwort.json();
      })
      .then(daten => daten.themen);
  }
  return themenVersprechen;
}

function passtZumZweig(thema, zweig) {
  return zweig === "alle" || thema.zweig.includes(zweig);
}

function statusAbzeichen(thema) {
  if (thema.status === "online") return "";
  return `<span class="abzeichen status-geplant">${thema.status === "in-arbeit" ? "in Arbeit" : "in Vorbereitung"}</span>`;
}

// „3 von 10 gelöst" — nur wenn das Thema schon besucht wurde (Umfang bekannt)
function fortschrittAbzeichen(themaId) {
  const f = holeThemenFortschritt(themaId);
  if (!f.gesamt) return "";
  const fertig = f.geloest >= f.gesamt;
  return `<span class="abzeichen fortschritt-tag${fertig ? " fertig" : ""}">${fertig ? "✓ " : ""}${f.geloest} von ${f.gesamt} gelöst</span>`;
}

// ---------- Startseite ----------

export async function rendereStartseite() {
  const ziel = document.getElementById("fach-kacheln");
  if (!ziel) return;
  const themen = await ladeThemen();

  function zeichne() {
    const zweig = aktuellerZweig();
    ziel.innerHTML = ["mathematik", "physik", "informatik"].map(fach => {
      const liste = themen.filter(t => t.fach === fach && passtZumZweig(t, zweig));
      const sims = liste.filter(t => t.hat_simulation).length;
      return `
        <article class="kachel ${fach}">
          ${kachelBild(fach)}
          <h2 class="kachel-titel">${FACH_LABEL[fach]}</h2>
          <p>${FACH_BESCHREIBUNG[fach]}</p>
          <div class="kachel-fuss">
            <span class="abzeichen">${liste.length} Themen</span>
            <span class="abzeichen sim">${sims} mit Simulation</span>
          </div>
          <div class="kachel-aktionen">
            <a class="knopf klein" href="${WURZEL.href}${fach}/index.html">Üben</a>
            <a class="knopf klein zweitrangig" href="${WURZEL.href}selbstlernen/index.html#lb-${fach}">Lernbüro</a>
          </div>
        </article>`;
    }).join("");
  }

  zeichne();
  document.addEventListener("zweig-geaendert", zeichne);
}

// Eigene kleine SVG-Illustrationen (kein Fremdmaterial)
function kachelBild(fach) {
  if (fach === "mathematik") return `<svg class="kachel-bild" viewBox="0 0 200 60" aria-hidden="true"><path d="M10 54 Q100 -46 190 54" fill="none" stroke="currentColor" stroke-width="3"/><line x1="10" y1="54" x2="190" y2="54" stroke="currentColor" stroke-width="1" opacity=".4"/></svg>`;
  if (fach === "physik") return `<svg class="kachel-bild" viewBox="0 0 200 60" aria-hidden="true"><path d="M10 50 Q60 4 110 27 T190 50" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="1 7" stroke-linecap="round"/><circle cx="10" cy="50" r="5" fill="currentColor"/></svg>`;
  return `<svg class="kachel-bild" viewBox="0 0 200 60" aria-hidden="true"><g fill="currentColor"><rect x="22" y="37" width="16" height="17" rx="2"/><rect x="50" y="20" width="16" height="34" rx="2"/><rect x="78" y="44" width="16" height="10" rx="2"/><rect x="106" y="9" width="16" height="45" rx="2"/><rect x="134" y="27" width="16" height="27" rx="2"/><rect x="162" y="16" width="16" height="38" rx="2"/></g></svg>`;
}

// ---------- Fachseite (Stufen-Übersicht) ----------

export async function rendereFachseite(fach) {
  const ziel = document.getElementById("stufen-liste");
  if (!ziel) return;
  const themen = await ladeThemen();

  function zeichne() {
    const zweig = aktuellerZweig();
    // Nur Stufen zeigen, in denen es für den gewählten Zweig auch Themen gibt
    // (bei „RS" verschwinden Einführungs- und Qualifikationsphase komplett)
    const stufen = STUFEN_REIHENFOLGE.filter(s =>
      themen.some(t => t.fach === fach && t.stufe === s && passtZumZweig(t, zweig)));
    ziel.innerHTML = stufen.map(stufe => {
      const liste = themen.filter(t => t.fach === fach && t.stufe === stufe && passtZumZweig(t, zweig));
      const sims = liste.filter(t => t.hat_simulation).length;
      return `
        <article class="kachel ${fach}">
          <h2><a class="kachel-link" href="${WURZEL.href}${fach}/${stufe}/index.html">${STUFEN_LABEL[stufe]}</a></h2>
          <div class="kachel-fuss">
            <span class="abzeichen">${liste.length} Themen</span>
            ${sims ? `<span class="abzeichen sim">${sims} mit Simulation</span>` : ""}
          </div>
        </article>`;
    }).join("");
  }

  zeichne();
  document.addEventListener("zweig-geaendert", zeichne);
}

// ---------- Stufenseite (Themen-Übersicht) ----------

export async function rendereStufenseite(fach, stufe) {
  const ziel = document.getElementById("themen-liste");
  if (!ziel) return;
  const themen = await ladeThemen();

  function zeichne() {
    const zweig = aktuellerZweig();
    const liste = themen.filter(t => t.fach === fach && t.stufe === stufe && passtZumZweig(t, zweig));
    if (liste.length === 0) {
      ziel.innerHTML = `<p class="einleitung">Für diese Auswahl gibt es hier (noch) keine Themen. Stelle den Zweig-Filter oben ggf. auf „Alle“.</p>`;
      return;
    }
    ziel.innerHTML = liste.map(t => {
      const istOnline = t.status === "online" || t.status === "in-arbeit";
      const titel = istOnline
        ? `<a class="kachel-link" href="${WURZEL.href}${t.pfad}index.html">${t.titel}</a>`
        : t.titel;
      const niveau = (t.niveau_kc && t.niveau_kc.length) ? `<span class="abzeichen">${t.niveau_kc.join(" + ")}</span>` : "";
      return `
        <article class="kachel ${fach}">
          <h2>${titel}</h2>
          <p>${t.kurz}</p>
          <div class="kachel-fuss">
            <span class="abzeichen zweig-tag">${t.zweig.map(z => z === "gym" ? "Gym" : "RS").join(" · ")}</span>
            ${niveau}
            ${t.hat_simulation ? `<span class="abzeichen sim">mit Simulation</span>` : ""}
            ${statusAbzeichen(t)}
            ${fortschrittAbzeichen(t.id)}
          </div>
        </article>`;
    }).join("");
    ziel.dataset.kaZweig = zweig;
    ergaenzeKlassenarbeitenHinweis(ziel, fach, stufe, zweig);
  }

  zeichne();
  document.addEventListener("zweig-geaendert", zeichne);
  document.addEventListener("fortschritt-geaendert", zeichne);
}

// Hinweis-Kasten „Klassenarbeiten zum Üben" unter der Themenliste einer Stufenseite —
// erscheint nur, wenn es für Fach + Stufe (+ Zweig) passende Arbeiten gibt.
async function ergaenzeKlassenarbeitenHinweis(ziel, fach, stufe, zweig) {
  try {
    const m = await import("./klassenarbeiten.js");
    const arbeiten = await m.ladeKlassenarbeiten();
    if (ziel.dataset.kaZweig !== zweig) return; // Zweig wurde inzwischen umgeschaltet
    const passende = arbeiten.filter(a => a.fach === fach && a.stufe === stufe
      && (zweig === "alle" || a.zweig.includes(zweig)));
    if (!passende.length) return;
    const kasten = document.createElement("div");
    kasten.className = "merkkasten klassenarbeiten-hinweis";
    kasten.innerHTML = `<span class="merk-etikett">Klassenarbeiten zum Üben</span>
      <p>Für diese Stufe ${passende.length === 1 ? "liegt eine echte Klassenarbeit" : `liegen ${passende.length} echte Klassenarbeiten`} aus früheren Durchgängen bereit — als PDF mit Erwartungshorizont zur Selbstkontrolle.
      <a href="${WURZEL.href}klassenarbeiten/index.html#${fach}-${stufe}">Zu den Klassenarbeiten</a></p>`;
    ziel.append(kasten);
  } catch (e) { /* Übersicht funktioniert auch ohne Klassenarbeiten-Daten */ }
}

// ---------- Üben-Übersicht (alle Fächer + Stufen auf einer Seite, ohne Zwischenebene) ----------
export async function rendereUebenUebersicht() {
  const ziel = document.getElementById("ueben-uebersicht");
  if (!ziel) return;
  const themen = await ladeThemen();

  function zeichne() {
    const zweig = aktuellerZweig();
    ziel.innerHTML = ["mathematik", "physik", "informatik"].map(fach => {
      const stufen = STUFEN_REIHENFOLGE.filter(s =>
        themen.some(t => t.fach === fach && t.stufe === s && passtZumZweig(t, zweig)));
      if (!stufen.length) return "";
      const karten = stufen.map(stufe => {
        const liste = themen.filter(t => t.fach === fach && t.stufe === stufe && passtZumZweig(t, zweig));
        const sims = liste.filter(t => t.hat_simulation).length;
        return `
          <article class="kachel ${fach}">
            <h3><a class="kachel-link" href="${WURZEL.href}${fach}/${stufe}/index.html">${STUFEN_LABEL[stufe]}</a></h3>
            <div class="kachel-fuss">
              <span class="abzeichen">${liste.length} Themen</span>
              ${sims ? `<span class="abzeichen sim">${sims} mit Simulation</span>` : ""}
            </div>
          </article>`;
      }).join("");
      return `<section class="ueben-fach"><h2>${FACH_LABEL[fach]}</h2><div class="kacheln">${karten}</div></section>`;
    }).join("");
  }

  zeichne();
  document.addEventListener("zweig-geaendert", zeichne);
}

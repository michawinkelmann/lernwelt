// klassenarbeiten.js — Übersicht „Klassenarbeiten zum Üben" aus daten/klassenarbeiten.json.
// Wird von komponenten.js bei data-seite="klassenarbeiten" nachgeladen (dynamischer Import).
// Rendert je Fach/Stufe die Arbeiten als Kacheln und darunter die Lernzettel als kompakte Liste.

import { WURZEL, aktuellerZweig } from "./komponenten.js";
import { STUFEN_REIHENFOLGE, STUFEN_LABEL, ladeThemen } from "./uebersicht.js";

const FACH_LABEL = { mathematik: "Mathematik", physik: "Physik", informatik: "Informatik" };

let versprechen = null;

// klassenarbeiten.json einmal laden und zwischenspeichern (ganzes Objekt)
function ladeDaten() {
  if (!versprechen) {
    versprechen = fetch(new URL("daten/klassenarbeiten.json", WURZEL))
      .then(antwort => {
        if (!antwort.ok) throw new Error("klassenarbeiten.json: HTTP " + antwort.status);
        return antwort.json();
      });
  }
  return versprechen;
}

// Kompatibel zur bisherigen Schnittstelle (uebersicht.js nutzt nur die Arbeiten)
export function ladeKlassenarbeiten() {
  return ladeDaten().then(daten => daten.arbeiten);
}

export function ladeLernzettel() {
  return ladeDaten().then(daten => daten.lernzettel || []);
}

function passtZumZweig(eintrag, zweig) {
  return zweig === "alle" || eintrag.zweig.includes(zweig);
}

export async function rendereKlassenarbeiten() {
  const ziel = document.getElementById("klassenarbeiten-liste");
  if (!ziel) return;
  const [arbeiten, lernzettel, themen] = await Promise.all([ladeKlassenarbeiten(), ladeLernzettel(), ladeThemen()]);
  const themenIndex = new Map(themen.map(t => [t.id, t]));

  function karte(arbeit) {
    const thema = themenIndex.get(arbeit.thema);
    const themaVerlinkbar = thema && (thema.status === "online" || thema.status === "in-arbeit");
    return `
      <article class="kachel ${arbeit.fach}">
        <h4 class="kachel-titel">${arbeit.titel}</h4>
        <p>${arbeit.nr ? arbeit.nr + " · " : ""}${arbeit.seiten} Seiten · Erwartungshorizont zur Selbstkontrolle enthalten</p>
        ${themaVerlinkbar ? `<p>Passend dazu üben: <a href="${WURZEL.href}${thema.pfad}index.html">${thema.titel}</a></p>` : ""}
        <div class="kachel-fuss">
          <span class="abzeichen zweig-tag">${arbeit.zweig.map(z => z === "gym" ? "Gym" : "RS").join(" · ")}</span>
          <a class="knopf klein" href="${WURZEL.href}${arbeit.datei}">PDF öffnen</a>
        </div>
      </article>`;
  }

  function zettelZeile(eintraege) {
    if (eintraege.length === 0) return "";
    const links = eintraege.map(z =>
      `<a href="${WURZEL.href}${z.datei}">${z.titel}</a>`).join(" · ");
    return `<p class="ka-lernzettel"><strong>Lernzettel (PDF):</strong> ${links}</p>`;
  }

  function zeichne() {
    const zweig = aktuellerZweig();
    const sichtbar = arbeiten.filter(a => passtZumZweig(a, zweig));
    const zettelSichtbar = lernzettel.filter(z => passtZumZweig(z, zweig));
    if (sichtbar.length === 0 && zettelSichtbar.length === 0) {
      ziel.innerHTML = `<p class="einleitung">Für diese Auswahl gibt es (noch) keine Klassenarbeiten. Stelle den Zweig-Filter oben ggf. auf „Alle".</p>`;
      return;
    }
    const faecher = ["mathematik", "physik", "informatik"]
      .filter(f => sichtbar.some(a => a.fach === f) || zettelSichtbar.some(z => z.fach === f));
    ziel.innerHTML = faecher.map(fach => {
      const stufen = STUFEN_REIHENFOLGE.filter(s =>
        sichtbar.some(a => a.fach === fach && a.stufe === s) ||
        zettelSichtbar.some(z => z.fach === fach && z.stufe === s));
      return `
        <section class="ka-fach" aria-labelledby="ka-${fach}">
          <h2 id="ka-${fach}">${FACH_LABEL[fach]}</h2>
          ${stufen.map(stufe => `
            <h3 id="${fach}-${stufe}">${STUFEN_LABEL[stufe]}</h3>
            <div class="kacheln">
              ${sichtbar.filter(a => a.fach === fach && a.stufe === stufe).map(karte).join("")}
            </div>
            ${zettelZeile(zettelSichtbar.filter(z => z.fach === fach && z.stufe === stufe))}`).join("")}
        </section>`;
    }).join("");
  }

  zeichne();
  document.addEventListener("zweig-geaendert", zeichne);
}

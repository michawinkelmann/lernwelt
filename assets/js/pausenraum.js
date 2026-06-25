// pausenraum.js — rendert die Spiele-Übersicht („Pausenraum") aus daten/spiele.json.
// Zwei Abschnitte mit Zwischenüberschriften: „Für zwischendurch" (allein/zu zweit)
// und „Für die ganze Klasse · Beamermodus" (kategorie: "klasse").
// Wird von komponenten.js bei data-seite="pausenraum" nachgeladen.

import { WURZEL } from "./komponenten.js";

const FACH_LABEL = { mathematik: "Mathematik", physik: "Physik", informatik: "Informatik" };

let versprechen = null;

export function ladeSpiele() {
  if (!versprechen) {
    versprechen = fetch(new URL("daten/spiele.json", WURZEL))
      .then(antwort => { if (!antwort.ok) throw new Error("spiele.json: HTTP " + antwort.status); return antwort.json(); })
      .then(daten => daten.spiele);
  }
  return versprechen;
}

function kachel(s) {
  const klasse = s.kategorie === "klasse";
  const badge = klasse
    ? `<span class="abzeichen sim">🖥️ Beamer · ganze Klasse</span>`
    : `<span class="abzeichen eignung-${s.eignung === "pc" ? "pc" : "touch"}" title="${s.eignung === "pc" ? "Braucht Tastatur bzw. Maus — am Tablet nur eingeschränkt spielbar." : "Am Tablet (Tippen/Wischen) und am PC gut spielbar."}">${s.eignung === "pc" ? "Am PC" : "Touch + PC"}</span>`;
  const zweitBadge = klasse
    ? (s.spieler ? `<span class="abzeichen">${s.spieler}</span>` : "")
    : `<span class="abzeichen">${s.fach ? "Passt zu " + FACH_LABEL[s.fach] : "Einfach Pause"}</span>`;
  return `
    <article class="kachel ${s.fach || ""}">
      <h3><a class="kachel-link" href="${WURZEL.href}${s.ordner}index.html">${s.titel}</a></h3>
      <p>${s.kurz}</p>
      <div class="kachel-fuss">
        ${badge}
        ${zweitBadge}
        ${s.ab ? `<span class="abzeichen">${s.ab}</span>` : ""}
      </div>
      <p class="spiel-dauer">${s.dauer}</p>
    </article>`;
}

function sektion(titel, intro, liste) {
  if (!liste.length) return "";
  return `
    <section aria-label="${titel}">
      <h2>${titel}</h2>
      ${intro ? `<p class="einleitung">${intro}</p>` : ""}
      <div class="kacheln">${liste.map(kachel).join("")}</div>
    </section>`;
}

export async function renderePausenraum() {
  const ziel = document.getElementById("spiele-liste");
  if (!ziel) return;
  ziel.classList.remove("kacheln");   // Container wird zum Abschnitts-Halter
  const spiele = await ladeSpiele();
  const solo = spiele.filter(s => s.kategorie !== "klasse");
  const klasse = spiele.filter(s => s.kategorie === "klasse");
  ziel.innerHTML =
    sektion("Für zwischendurch — allein oder zu zweit", "", solo) +
    sektion("Für die ganze Klasse · Beamermodus",
      "Spiele für die digitale Tafel: Begriffe, Punkte und Timer erscheinen groß — eine Person bedient, die ganze Klasse oder Teilgruppen spielen mit. Am besten oben rechts auf Vollbild schalten.",
      klasse);
}

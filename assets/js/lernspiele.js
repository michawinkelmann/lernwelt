// lernspiele.js — rendert die Trainingsraum-Übersicht aus daten/lernspiele.json.
// Zuerst die „Klassenstufen-Trainer" (Spiele mit stufenwahl: man wählt vorab die
// eigene Klassenstufe), darunter die übrigen Spiele gruppiert nach Fach.
// Lazy geladen über komponenten.js (data-seite="lernspiele").

import { WURZEL } from "./komponenten.js";

const FACH_LABEL = { mathematik: "Mathematik", physik: "Physik" };

export async function rendereLernspiele() {
  const ziel = document.getElementById("lernspiele-liste");
  if (!ziel) return;
  let daten;
  try {
    const antwort = await fetch(new URL("daten/lernspiele.json", WURZEL));
    daten = await antwort.json();
  } catch (_f) {
    ziel.innerHTML = `<p class="einleitung">Die Spielliste konnte nicht geladen werden — bitte Seite neu laden.</p>`;
    return;
  }
  const esc = s => String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));

  const kachel = s => `
          <article class="kachel ${s.fach}">
            <h3><a class="kachel-link" href="${WURZEL.href}${s.ordner}index.html">${esc(s.titel)}</a></h3>
            <p>${esc(s.kurz)}</p>
            <div class="kachel-fuss">
              ${s.stufenwahl ? `<span class="abzeichen sim">Klasse wählbar</span>` : ""}
              <span class="abzeichen eignung-${s.eignung === "pc" ? "pc" : "touch"}" title="${s.eignung === "pc" ? "Braucht Tastatur bzw. Maus — am Tablet nur eingeschränkt spielbar." : "Am Tablet (Tippen/Wischen) und am PC gut spielbar."}">${s.eignung === "pc" ? "Am PC" : "Touch + PC"}</span>
              <span class="abzeichen">${esc(s.stufen)}</span>
              ${s.highscore ? '<span class="abzeichen sim">Bestenliste</span>' : ""}
            </div>
          </article>`;

  const abschnitt = (id, titel, intro, liste) => liste.length ? `
      <section aria-labelledby="ls-${id}">
        <h2 id="ls-${id}">${titel}</h2>
        ${intro ? `<p class="einleitung">${intro}</p>` : ""}
        <div class="kacheln">${liste.map(kachel).join("")}</div>
      </section>` : "";

  const alle = daten.lernspiele;
  const teile = [];
  // 1) Klassenstufen-Trainer (über alle Fächer) — vorab die eigene Klasse wählbar
  teile.push(abschnitt("stufen", "Klassenstufen-Trainer",
    "Hier wählst du zuerst deine Klassenstufe — die Aufgaben passen sich automatisch an.",
    alle.filter(s => s.stufenwahl)));
  // 2) übrige Spiele nach Fach
  for (const fach of ["mathematik", "physik"]) {
    teile.push(abschnitt(fach, FACH_LABEL[fach], "",
      alle.filter(s => s.fach === fach && !s.stufenwahl)));
  }
  ziel.innerHTML = teile.join("");
}

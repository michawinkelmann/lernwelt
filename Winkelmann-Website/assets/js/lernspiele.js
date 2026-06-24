// lernspiele.js — rendert die Trainingsraum-Übersicht aus daten/lernspiele.json,
// gruppiert nach Fach. Lazy geladen über komponenten.js (data-seite="lernspiele").

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
  const gruppen = ["mathematik", "physik"];
  ziel.innerHTML = gruppen.map(fach => {
    const liste = daten.lernspiele.filter(s => s.fach === fach);
    if (!liste.length) return "";
    return `
      <section aria-labelledby="ls-${fach}">
        <h2 id="ls-${fach}">${FACH_LABEL[fach]}</h2>
        <div class="kacheln">
          ${liste.map(s => `
          <article class="kachel ${fach}">
            <h3><a class="kachel-link" href="${WURZEL.href}${s.ordner}index.html">${esc(s.titel)}</a></h3>
            <p>${esc(s.kurz)}</p>
            <div class="kachel-fuss">
              <span class="abzeichen eignung-${s.eignung === "pc" ? "pc" : "touch"}" title="${s.eignung === "pc" ? "Braucht Tastatur bzw. Maus — am Tablet nur eingeschränkt spielbar." : "Am Tablet (Tippen/Wischen) und am PC gut spielbar."}">${s.eignung === "pc" ? "Am PC" : "Touch + PC"}</span>
              <span class="abzeichen">${esc(s.stufen)}</span>
              ${s.highscore ? '<span class="abzeichen sim">Bestenliste</span>' : ""}
            </div>
          </article>`).join("")}
        </div>
      </section>`;
  }).join("");
}

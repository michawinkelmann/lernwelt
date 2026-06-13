// pausenraum.js — rendert die Spiele-Übersicht („Pausenraum") aus daten/spiele.json.
// Wird von komponenten.js bei data-seite="pausenraum" nachgeladen (dynamischer Import).

import { WURZEL } from "./komponenten.js";

const FACH_LABEL = { mathematik: "Mathematik", physik: "Physik", informatik: "Informatik" };

let versprechen = null;

export function ladeSpiele() {
  if (!versprechen) {
    versprechen = fetch(new URL("daten/spiele.json", WURZEL))
      .then(antwort => {
        if (!antwort.ok) throw new Error("spiele.json: HTTP " + antwort.status);
        return antwort.json();
      })
      .then(daten => daten.spiele);
  }
  return versprechen;
}

export async function renderePausenraum() {
  const ziel = document.getElementById("spiele-liste");
  if (!ziel) return;
  const spiele = await ladeSpiele();
  ziel.innerHTML = spiele.map(s => `
    <article class="kachel ${s.fach || ""}">
      <h2><a class="kachel-link" href="${WURZEL.href}${s.ordner}index.html">${s.titel}</a></h2>
      <p>${s.kurz}</p>
      <div class="kachel-fuss">
        <span class="abzeichen">${s.fach ? "Passt zu " + FACH_LABEL[s.fach] : "Einfach Pause"}</span>
        ${s.ab ? `<span class="abzeichen">${s.ab}</span>` : ""}
      </div>
      <p class="spiel-dauer">${s.dauer}</p>
    </article>`).join("");
}

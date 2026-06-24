// experimente.js — rendert die Experimente-Übersicht aus daten/experimente.json,
// gruppiert nach Fach; nur status online/in-arbeit erscheinen (wie bei Themen).

import { WURZEL } from "./komponenten.js";

const FACH_LABEL = { physik: "Physik", mathematik: "Mathematik", informatik: "Informatik" };

export async function rendereExperimente() {
  const ziel = document.getElementById("experimente-liste");
  if (!ziel) return;
  let daten;
  try {
    daten = await (await fetch(new URL("daten/experimente.json", WURZEL))).json();
  } catch (_f) {
    ziel.innerHTML = `<p class="einleitung">Die Liste konnte nicht geladen werden — bitte Seite neu laden.</p>`;
    return;
  }
  const esc = s => String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
  const sichtbar = daten.experimente.filter(e => e.status === "online" || e.status === "in-arbeit");
  ziel.innerHTML = ["physik", "mathematik", "informatik"].map(fach => {
    const liste = sichtbar.filter(e => e.fach === fach);
    if (!liste.length) return "";
    return `
      <section aria-labelledby="ex-${fach}">
        <h2 id="ex-${fach}">${FACH_LABEL[fach]}</h2>
        <div class="kacheln">
          ${liste.map(e => `
          <article class="kachel ${fach}">
            <h3><a class="kachel-link" href="${WURZEL.href}${e.pfad}index.html">${esc(e.titel)}</a></h3>
            <p>${esc(e.kurz)}</p>
            <div class="kachel-fuss">
              <span class="abzeichen">${esc(e.stufe)}</span>
              ${e.status === "in-arbeit" ? '<span class="abzeichen status-geplant">in Arbeit</span>' : ""}
            </div>
          </article>`).join("")}
        </div>
      </section>`;
  }).join("");
}

// experimente.js — rendert die Experimente-Übersicht aus daten/experimente.json.
// Reihenfolge: Mathematik + Informatik zuerst, dann Physik (getrennt nach
// Sekundarstufe I / II; Sek-II-Experimente mit Niveau-Kennzeichnung eA / gA + eA).
// Nur status online/in-arbeit erscheinen (wie bei Themen).

import { WURZEL } from "./komponenten.js";

const FACH_LABEL = { mathematik: "Mathematik", informatik: "Informatik", physik: "Physik" };
const esc = s => String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
const istSekII = stufe => /Einführungsphase|Qualifikationsphase/.test(stufe);

function kachel(e) {
  return `
          <article class="kachel ${e.fach}">
            <h3><a class="kachel-link" href="${WURZEL.href}${e.pfad}index.html">${esc(e.titel)}</a></h3>
            <p>${esc(e.kurz)}</p>
            <div class="kachel-fuss">
              <span class="abzeichen">${esc(e.stufe)}</span>
              ${e.niveau ? `<span class="abzeichen niveau">${esc(e.niveau)}</span>` : ""}
              ${e.status === "in-arbeit" ? '<span class="abzeichen status-geplant">in Arbeit</span>' : ""}
            </div>
          </article>`;
}
const grid = liste => `<div class="kacheln">${liste.map(kachel).join("")}</div>`;

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
  const sichtbar = daten.experimente.filter(e => e.status === "online" || e.status === "in-arbeit");
  const teile = [];
  // 1) Mathematik + Informatik zuerst
  for (const fach of ["mathematik", "informatik"]) {
    const liste = sichtbar.filter(e => e.fach === fach);
    if (liste.length) teile.push(`
      <section aria-labelledby="ex-${fach}">
        <h2 id="ex-${fach}">${FACH_LABEL[fach]}</h2>
        ${grid(liste)}
      </section>`);
  }
  // 2) Physik, getrennt nach Sekundarstufe I / II (Sek II mit Niveau-Badge)
  const physik = sichtbar.filter(e => e.fach === "physik");
  if (physik.length) {
    const sek1 = physik.filter(e => !istSekII(e.stufe));
    const sek2 = physik.filter(e => istSekII(e.stufe));
    let inner = "";
    if (sek1.length) inner += `<h3 class="ex-stufe">Sekundarstufe I</h3>${grid(sek1)}`;
    if (sek2.length) inner += `<h3 class="ex-stufe">Sekundarstufe II</h3>${grid(sek2)}`;
    teile.push(`
      <section aria-labelledby="ex-physik">
        <h2 id="ex-physik">Physik</h2>
        ${inner}
      </section>`);
  }
  ziel.innerHTML = teile.join("");
}

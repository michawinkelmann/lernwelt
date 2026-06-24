// simulationen.js — rendert die Simulations-Übersicht aus daten/simulationen.json,
// nach Fach gruppiert (Überschriften) und innerhalb nach Stufe sortiert — analog experimente.js.
import { WURZEL } from "./komponenten.js";

const FACH_LABEL = { physik: "Physik", mathematik: "Mathematik", informatik: "Informatik" };
const STUFE_ORDER = { "Klasse 5": 5, "Klasse 6": 6, "Klasse 7": 7, "Klasse 8": 8, "Klasse 9": 9, "Klasse 10": 10, "Einführungsphase": 11, "Qualifikationsphase": 12 };

export async function rendereSimulationen() {
  const ziel = document.getElementById("simulationen-liste");
  if (!ziel) return;
  let daten;
  try {
    daten = await (await fetch(new URL("daten/simulationen.json", WURZEL))).json();
  } catch (_f) {
    ziel.innerHTML = `<p class="einleitung">Die Liste konnte nicht geladen werden — bitte Seite neu laden.</p>`;
    return;
  }
  const esc = s => String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
  const nurFach = ziel.dataset.fach;            // Fach-Unterseite: nur dieses Fach
  const faecher = nurFach ? [nurFach] : ["physik", "mathematik", "informatik"];
  ziel.innerHTML = faecher.map(fach => {
    const liste = daten.simulationen.filter(e => e.fach === fach)
      .sort((a, b) => (STUFE_ORDER[a.stufe] || 99) - (STUFE_ORDER[b.stufe] || 99) || a.titel.localeCompare(b.titel, "de"));
    if (!liste.length) return "";
    return `
      <section aria-labelledby="sim-${fach}">
        <h2 id="sim-${fach}">${FACH_LABEL[fach]}</h2>
        <div class="kacheln">
          ${liste.map(e => `
          <article class="kachel ${fach}">
            <h3><a class="kachel-link" href="${WURZEL.href}${e.pfad}index.html">${esc(e.titel)}</a></h3>
            <p>${esc(e.kurz)}</p>
            <div class="kachel-fuss">${e.stufe ? `<span class="abzeichen">${esc(e.stufe)}</span>` : ""}</div>
          </article>`).join("")}
        </div>
      </section>`;
  }).join("");
}

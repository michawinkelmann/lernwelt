// lernzirkel-uebersicht.js — listet verfügbare Lernzirkel aus daten/lernzirkel.json,
// gegliedert nach Fach und Klasse. Lazy geladen über komponenten.js (data-seite="lernzirkel-uebersicht").
import { WURZEL } from "../komponenten.js";

const FACH_LABEL = { mathematik: "Mathematik", physik: "Physik", informatik: "Informatik" };
const FACHKLASSE = { mathematik: "mathe", physik: "physik", informatik: "informatik" };
const esc = s => String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));

export async function rendereLernzirkelUebersicht() {
  const ziel = document.getElementById("lernzirkel-liste");
  if (!ziel) return;
  let daten;
  try { daten = await (await fetch(new URL("daten/lernzirkel.json", WURZEL))).json(); }
  catch (_e) { ziel.innerHTML = `<p class="einleitung">Die Lernzirkel-Liste konnte nicht geladen werden — bitte Seite neu laden.</p>`; return; }
  const liste = daten.lernzirkel || [];
  const html = ["mathematik", "physik", "informatik"].map(fach => {
    const f = liste.filter(z => z.fach === fach);
    if (!f.length) return "";
    return `<section aria-labelledby="lz-${fach}">
        <h2 id="lz-${fach}">${FACH_LABEL[fach]}</h2>
        <div class="kacheln">
          ${f.map(z => `<article class="kachel ${FACHKLASSE[fach]}">
            <h3 class="kachel-titel"><a class="kachel-link" href="${WURZEL.href}${z.ordner}index.html">${esc(z.titel)}</a></h3>
            <p>${esc(z.kurz || "")}</p>
            <p class="kachel-fuss"><span class="abzeichen">${esc(z.stufe || "")}</span>
              <a class="knopf klein" href="${WURZEL.href}${z.ordner}index.html">Zum Lernzirkel</a></p>
          </article>`).join("")}
        </div></section>`;
  }).join("");
  ziel.innerHTML = html || `<p class="einleitung">Noch keine Lernzirkel verfügbar.</p>`;
}

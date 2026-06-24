// lernzirkel-uebersicht.js — listet verfügbare Lernzirkel aus daten/lernzirkel.json,
// gegliedert nach Fach und darin nach Klasse/Stufe. Lazy geladen über komponenten.js
// (data-seite="lernzirkel-uebersicht").
import { WURZEL } from "../komponenten.js";

const FACH_LABEL = { mathematik: "Mathematik", physik: "Physik", informatik: "Informatik" };
const FACHKLASSE = { mathematik: "mathe", physik: "physik", informatik: "informatik" };
const esc = s => String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));

// Sortierschlüssel für Stufen: Klasse 5–13 vor Einführungs- vor Qualifikationsphase.
function stufeRang(s) {
  const m = /Klasse\s*(\d+)/.exec(s || "");
  if (m) return Number(m[1]);
  if (/Einf[üu]hrungsphase/i.test(s || "")) return 90;
  if (/Qualifikationsphase/i.test(s || "")) return 91;
  return 99;
}

export async function rendereLernzirkelUebersicht() {
  const ziel = document.getElementById("lernzirkel-liste");
  if (!ziel) return;
  let daten;
  try { daten = await (await fetch(new URL("daten/lernzirkel.json", WURZEL))).json(); }
  catch (_e) { ziel.innerHTML = `<p class="einleitung">Die Lernzirkel-Liste konnte nicht geladen werden — bitte Seite neu laden.</p>`; return; }
  const liste = daten.lernzirkel || [];
  function kachel(z) {
    return `<article class="kachel ${FACHKLASSE[z.fach] || "mathe"}">
      <h3 class="kachel-titel"><a class="kachel-link" href="${WURZEL.href}${z.ordner}index.html">${esc(z.titel)}</a></h3>
      <p>${esc(z.kurz || "")}</p>
      <p class="kachel-fuss"><span class="abzeichen">${esc(z.stufe || "")}</span>
        <a class="knopf klein" href="${WURZEL.href}${z.ordner}index.html">Zum Lernzirkel</a></p>
    </article>`;
  }
  const html = ["mathematik", "physik", "informatik"].map(fach => {
    const f = liste.filter(z => z.fach === fach);
    if (!f.length) return "";
    // nach Stufe gruppieren und sortieren
    const stufen = [...new Set(f.map(z => z.stufe || ""))]
      .sort((a, b) => stufeRang(a) - stufeRang(b) || a.localeCompare(b, "de"));
    const bloecke = stufen.map(st => {
      const zk = f.filter(z => (z.stufe || "") === st);
      return `<h3 class="lz-stufe">${esc(st)}</h3>
        <div class="kacheln">${zk.map(kachel).join("")}</div>`;
    }).join("");
    return `<section aria-labelledby="lz-${fach}">
        <h2 id="lz-${fach}">${FACH_LABEL[fach]}</h2>
        ${bloecke}
      </section>`;
  }).join("");
  ziel.innerHTML = html || `<p class="einleitung">Noch keine Lernzirkel verfügbar.</p>`;
}

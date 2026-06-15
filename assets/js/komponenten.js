// komponenten.js — injiziert Kopfzeile, Navigation, Brotkrümel und Fußzeile,
// verwaltet Dunkelmodus und Zweig-Wahl (Gym/RS), startet die Übersichts-Renderer.
// Einzige Skript-Einbindung pro Seite: <script type="module" src="…/assets/js/komponenten.js"></script>

import { rendereStartseite, rendereFachseite, rendereStufenseite, rendereUebenUebersicht, STUFEN_LABEL } from "./uebersicht.js";
import { exportiereFortschritt, importiereFortschritt } from "./fortschritt.js";

// Projektwurzel aus der Lage dieses Moduls ableiten (assets/js/ → zwei Ebenen hoch).
// Funktioniert lokal (localhost:8000) und auf GitHub Pages (/<repo>/) gleichermaßen.
export const WURZEL = new URL("../../", import.meta.url);

const SPEICHER_THEMA = "lernwelt-thema";
const SPEICHER_ZWEIG = "lernwelt-zweig";

// ---------- Hilfen ----------

function lies(schluessel) {
  try { return localStorage.getItem(schluessel); } catch (e) { return null; }
}
function schreibe(schluessel, wert) {
  try { localStorage.setItem(schluessel, wert); } catch (e) { /* privater Modus o. ä. — ignorieren */ }
}

export function aktuellerZweig() {
  const z = lies(SPEICHER_ZWEIG);
  return (z === "gym" || z === "rs") ? z : "alle";
}

// Pfadsegmente der aktuellen Seite relativ zur Projektwurzel, z. B. ["mathematik", "klasse-9"]
function pfadSegmente() {
  let p = location.pathname;
  if (p.startsWith(WURZEL.pathname)) p = p.slice(WURZEL.pathname.length);
  return p.split("/").filter(s => s && s !== "index.html");
}

const FACH_LABEL = { mathematik: "Mathematik", physik: "Physik", informatik: "Informatik", simulationen: "Simulationen", experimente: "Experimente", klassenarbeiten: "Klassenarbeiten", pausenraum: "Pausenraum", lernspiele: "Trainingsraum", selbstlernen: "Lernbüro", suche: "Suche" };

// ---------- Kopfzeile ----------

function baueKopfzeile() {
  const segmente = pfadSegmente();
  const aktivesFach = segmente[0] || "";
  const kopf = document.createElement("header");
  kopf.className = "kopfzeile";
  kopf.innerHTML = `
    <div class="kopfzeile-innen">
      <a class="marke" href="${WURZEL.href}index.html"><b>Lernwelt</b><span>Mathematik · Physik · Informatik</span></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="hauptnav">Menü</button>
      <nav class="hauptnav" id="hauptnav" aria-label="Hauptnavigation">
        <ul>
          ${["mathematik", "physik", "informatik", "selbstlernen", "simulationen", "experimente", "klassenarbeiten", "lernspiele", "pausenraum", "suche"].map(f =>
            `<li><a href="${WURZEL.href}${f}/index.html" ${f === aktivesFach ? 'aria-current="true"' : ""}>${FACH_LABEL[f]}</a></li>`).join("")}
        </ul>
      </nav>
      <div class="kopf-werkzeuge">
        <div class="zweig" role="group" aria-label="Schulzweig filtern">
          <button type="button" data-zweig="alle">Alle</button>
          <button type="button" data-zweig="gym">Gym</button>
          <button type="button" data-zweig="rs">RS</button>
        </div>
        <button class="thema-knopf" type="button" aria-pressed="false" title="Dunkelmodus umschalten" aria-label="Dunkelmodus umschalten">☾</button>
      </div>
    </div>`;
  document.body.prepend(kopf);

  // Sprung-Link ganz an den Anfang
  const sprung = document.createElement("a");
  sprung.className = "sprung-link";
  sprung.href = "#inhalt";
  sprung.textContent = "Zum Inhalt springen";
  document.body.prepend(sprung);

  // Mobile Navigation
  const toggle = kopf.querySelector(".nav-toggle");
  const nav = kopf.querySelector(".hauptnav");
  function navSichtbarkeit() {
    if (matchMedia("(max-width: 760px)").matches) {
      nav.hidden = toggle.getAttribute("aria-expanded") !== "true";
    } else {
      nav.hidden = false;
    }
  }
  toggle.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", toggle.getAttribute("aria-expanded") === "true" ? "false" : "true");
    navSichtbarkeit();
  });
  matchMedia("(max-width: 760px)").addEventListener("change", navSichtbarkeit);
  navSichtbarkeit();

  // Dunkelmodus
  const themaKnopf = kopf.querySelector(".thema-knopf");
  function setzeThema(thema, speichern) {
    document.documentElement.setAttribute("data-theme", thema);
    themaKnopf.setAttribute("aria-pressed", String(thema === "dunkel"));
    themaKnopf.textContent = thema === "dunkel" ? "☀" : "☾";
    if (speichern) schreibe(SPEICHER_THEMA, thema);
  }
  const gespeichert = lies(SPEICHER_THEMA);
  setzeThema(gespeichert === "dunkel" || (!gespeichert && matchMedia("(prefers-color-scheme: dark)").matches) ? "dunkel" : "hell", false);
  themaKnopf.addEventListener("click", () =>
    setzeThema(document.documentElement.getAttribute("data-theme") === "dunkel" ? "hell" : "dunkel", true));

  // Zweig-Umschalter
  const zweigKnoepfe = kopf.querySelectorAll(".zweig button");
  function zeigeZweig(z) {
    zweigKnoepfe.forEach(k => k.setAttribute("aria-pressed", String(k.dataset.zweig === z)));
  }
  zeigeZweig(aktuellerZweig());
  zweigKnoepfe.forEach(k => k.addEventListener("click", () => {
    schreibe(SPEICHER_ZWEIG, k.dataset.zweig);
    zeigeZweig(k.dataset.zweig);
    document.dispatchEvent(new CustomEvent("zweig-geaendert", { detail: { zweig: k.dataset.zweig } }));
  }));
}

// ---------- Brotkrümel ----------

function baueBrotkruemel() {
  const segmente = pfadSegmente();
  if (segmente.length === 0) return; // Startseite: keine Brotkrümel
  const teile = [`<li><a href="${WURZEL.href}index.html">Start</a></li>`];
  let pfad = WURZEL.href;
  segmente.forEach((seg, i) => {
    pfad += seg + "/";
    const label = FACH_LABEL[seg] || STUFEN_LABEL[seg] || (document.querySelector("h1")?.textContent ?? seg);
    if (i === segmente.length - 1) {
      teile.push(`<li aria-current="page">${label}</li>`);
    } else {
      teile.push(`<li><a href="${pfad}index.html">${label}</a></li>`);
    }
  });
  const nav = document.createElement("nav");
  nav.className = "brotkruemel";
  nav.setAttribute("aria-label", "Brotkrümelnavigation");
  nav.innerHTML = `<ol>${teile.join("")}</ol>`;
  document.querySelector(".kopfzeile").after(nav);
}

// ---------- Fußzeile ----------

function baueFusszeile() {
  const fuss = document.createElement("footer");
  fuss.className = "fusszeile";
  fuss.innerHTML = `
    <div class="fusszeile-innen">
      <a href="${WURZEL.href}impressum.html">Impressum</a>
      <a href="${WURZEL.href}datenschutz.html">Datenschutz</a>
      <button type="button" class="fuss-knopf" data-aktion="export">Fortschritt exportieren</button>
      <button type="button" class="fuss-knopf" data-aktion="import">Fortschritt importieren</button>
      <input type="file" accept="application/json,.json" class="nur-screenreader" tabindex="-1" aria-hidden="true">
      <span class="fuss-meldung" role="status" aria-live="polite"></span>
      <p class="hinweis">Freiwilliges Übungsangebot ohne Noten. Dein Fortschritt bleibt auf deinem Gerät — keine Cookies, keine Konten, keine Datenübertragung.</p>
      <p class="hinweis">Eigene Inhalte unter <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de" rel="license">CC BY-NC-SA 4.0</a>, Website-Code unter MIT-Lizenz — Details in der Lizenzdatei des Projekts.</p>
    </div>`;
  document.body.append(fuss);

  const meldung = fuss.querySelector(".fuss-meldung");
  const dateiwahl = fuss.querySelector('input[type="file"]');
  fuss.querySelector('[data-aktion="export"]').addEventListener("click", () => {
    exportiereFortschritt();
    meldung.textContent = "Fortschrittsdatei wurde heruntergeladen.";
  });
  fuss.querySelector('[data-aktion="import"]').addEventListener("click", () => dateiwahl.click());
  dateiwahl.addEventListener("change", () => {
    const datei = dateiwahl.files && dateiwahl.files[0];
    if (!datei) return;
    importiereFortschritt(datei)
      .then(anzahl => { meldung.textContent = `Import erfolgreich (${anzahl} Einträge zusammengeführt).`; })
      .catch(() => { meldung.textContent = "Import fehlgeschlagen: keine gültige Fortschrittsdatei."; })
      .finally(() => { dateiwahl.value = ""; });
  });
}

// ---------- Start ----------

// Lehrkraft-Seiten: einfacher clientseitiger Sichtschutz (KEIN echter Passwortschutz —
// statische Seite, Inhalt steht im Quelltext). Hält Schüler casual fern, mehr nicht.
function lehrkraftFrei() {
  try { return sessionStorage.getItem("lernwelt-lehrkraft-frei") === "1"; } catch (e) { return false; }
}
function zeigeLehrkraftSperre() {
  const haupt = document.getElementById("inhalt");
  if (haupt) haupt.hidden = true;
  const sperre = document.createElement("div");
  sperre.className = "lehrkraft-sperre";
  sperre.innerHTML = `<form class="lehrkraft-sperre-box">
      <h1>Lehrkraft-Bereich</h1>
      <p>Diese Seite ist für Lehrkräfte gedacht. Bitte das Passwort eingeben.</p>
      <label class="lehrkraft-sperre-feld">Passwort
        <input type="password" autocomplete="off" aria-label="Passwort">
      </label>
      <button type="submit" class="knopf">Anzeigen</button>
      <p class="lehrkraft-sperre-fehler" role="alert" hidden>Falsches Passwort – bitte erneut versuchen.</p>
      <p class="hinweis">Einfacher Sichtschutz, kein echter Schutz. Gilt für diese Browser-Sitzung.</p>
      <p><a href="${WURZEL.href}index.html">Zur Startseite</a></p>
    </form>`;
  document.body.append(sperre);
  const eingabe = sperre.querySelector("input");
  eingabe.focus();
  sperre.querySelector("form").addEventListener("submit", ereignis => {
    ereignis.preventDefault();
    if (eingabe.value === "1337") {
      try { sessionStorage.setItem("lernwelt-lehrkraft-frei", "1"); } catch (_e) {}
      location.reload();
    } else {
      sperre.querySelector(".lehrkraft-sperre-fehler").hidden = false;
      eingabe.value = "";
      eingabe.focus();
    }
  });
}

// Lehrkraft-Seite fuer den Druck als A4-Handzettel aufbereiten: reine Navigations-
// Absaetze ausnehmen, Klapp-Tabellen oeffnen, Stand-Datum und Hinweis nur fuer den Druck.
function bereiteLehrkraftDruckVor() {
  const haupt = document.getElementById("inhalt");
  if (!haupt) return;
  const nav = haupt.querySelectorAll(":scope > p.einleitung");
  if (nav.length) { nav[0].classList.add("kein-druck"); nav[nav.length - 1].classList.add("kein-druck"); }
  haupt.querySelectorAll("details").forEach(d => { d.open = true; });
  const titel = haupt.querySelector("h1");
  if (titel) {
    const stand = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
    const kopf = document.createElement("p");
    kopf.className = "nur-druck druck-stand";
    kopf.textContent = `Lehrkraft-Handzettel \u00b7 Lernb\u00fcro \u00b7 Stand: ${stand}`;
    titel.after(kopf);
  }
  const fuss = document.createElement("p");
  fuss.className = "nur-druck druck-fuss";
  fuss.textContent = "Interne Moderationsseite \u2014 nicht zur Ausgabe an Lernende.";
  haupt.append(fuss);
}

const seite = document.body.dataset.seite;
if (seite === "lehrkraft" && !lehrkraftFrei()) {
  zeigeLehrkraftSperre();
} else {

const istEinbettung = new URLSearchParams(location.search).has("einbettung");
if (istEinbettung) {
  document.body.classList.add("einbettung");
  // Eingebettete Simulation meldet ihre Inhaltshöhe an die Elternseite, damit der iframe
  // ohne inneren Scrollbalken dargestellt werden kann (kein Doppel-Scroll im Lernbüro).
  const meldeHoehe = () => { try { parent.postMessage({ typ: "lernwelt-sim-hoehe", hoehe: document.documentElement.scrollHeight }, "*"); } catch (_e) {} };
  window.addEventListener("load", meldeHoehe);
  if (window.ResizeObserver) new ResizeObserver(meldeHoehe).observe(document.documentElement);
  setTimeout(meldeHoehe, 400); setTimeout(meldeHoehe, 1500);
} else {
  baueKopfzeile();
  baueBrotkruemel();
  baueFusszeile();
  // Eingebettete Sim-iframes auf ihre tatsächliche Inhaltshöhe bringen (Meldung der Kindseite).
  window.addEventListener("message", ereignis => {
    const d = ereignis.data;
    if (!d || d.typ !== "lernwelt-sim-hoehe" || typeof d.hoehe !== "number") return;
    document.querySelectorAll("iframe").forEach(rahmen => {
      if (rahmen.contentWindow === ereignis.source) rahmen.style.height = Math.max(200, Math.ceil(d.hoehe)) + "px";
    });
  });
}

if (seite === "lehrkraft") bereiteLehrkraftDruckVor();

// Seitentyp-abhängige Inhalte (Übersichten aus daten/themen.json)
if (seite === "start") rendereStartseite();
else if (seite === "fach") rendereFachseite(document.body.dataset.fach);
else if (seite === "stufe") rendereStufenseite(document.body.dataset.fach, document.body.dataset.stufe);
else if (seite === "ueben") rendereUebenUebersicht();
else if (seite === "pausenraum") {
  // Spiele-Übersicht erst bei Bedarf laden
  import("./pausenraum.js").then(m => m.renderePausenraum());
}
else if (seite === "klassenarbeiten") {
  // Klassenarbeiten-Übersicht erst bei Bedarf laden (hält andere Seiten schlank)
  import("./klassenarbeiten.js").then(m => m.rendereKlassenarbeiten());
}
else if (seite === "experimente") {
  // Experimente-Übersicht erst bei Bedarf laden
  import("./experimente.js").then(m => m.rendereExperimente());
}
else if (seite === "simulationen" || seite === "sim-fach") {
  import("./simulationen.js").then(m => m.rendereSimulationen());
}
else if (seite === "lernspiele") {
  // Trainingsraum-Übersicht erst bei Bedarf laden
  import("./lernspiele.js").then(m => m.rendereLernspiele());
}
else if (seite === "suche") {
  // Suchseite erst bei Bedarf laden (Index ueber die vier daten/-Registries)
  import("./suche.js").then(m => m.rendereSuche());
}
else if (seite === "selbstlernen") {
  // Lernbüro-Einstieg: Kursliste aus daten/kurse.json
  import("./selbstlernen/uebersicht.js").then(m => m.rendereKursliste());
}
else if (seite === "lernbuero") {
  // Lernbüro-Kurs: Lernlandkarte + Lektions-Player
  import("./selbstlernen/kurs.js").then(m => m.starteKurs());
}
else if (seite === "projekte") {
  // Lernbüro-Projektkarten (Scratch/Calliope)
  import("./selbstlernen/projekte.js").then(m => m.starteProjekte());
}
else if (seite === "thema") {
  // Erklärseiten: Vorwissens-Kasten mit Mini-Check (nur wenn Registry vorwissen kennt)
  import("./vorwissen.js").then(m => m.rendereVorwissen());
}
else if (seite === "tagesmischung") {
  // Gemischtes Training erst bei Bedarf laden
  import("./tagesmischung.js").then(m => m.starteTagesmischung());
}
else if (seite === "uebungen") {
  // Übungsseiten laden die Engine erst bei Bedarf (hält Übersichtsseiten schlank)
  import("./aufgaben-engine.js").then(m => m.starteUebungsseite());
}

// QR-Code oben rechts auf inhaltlichen Unterseiten (Lernbüro-Landkarte/Lektionen, Übungen, Erklärseiten …),
// verlinkt aufs aktuelle Verzeichnis. Start (eigener Hero-QR) und reine Canvas-Seiten ausgenommen.
if (seite && !["start", "lehrkraft", "simulation", "experiment", "lernspiel"].includes(seite)) {
  import("./qr-ecke.js").then(m => m.zeigeQrEcke());
}

} // Ende Lehrkraft-Guard

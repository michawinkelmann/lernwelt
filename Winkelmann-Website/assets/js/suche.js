// suche.js — clientseitige Suche über Themen, Simulationen, Klassenarbeiten und Spiele.
// Architektur (UMSETZUNGSPLAN §13, Phase 6): kein Server, keine externe Bibliothek.
// Die vier JSON-Registries in daten/ werden einmal geladen, im Speicher normalisiert
// und live gefiltert. Mehrwort-Anfragen sind UND-verknüpft; Umlaute werden in beiden
// Schreibweisen gefunden („Wärme" ↔ „waerme" ↔ „warme"). Der Zweig-Filter der
// Kopfzeile (Alle/Gym/RS) wirkt auch auf die Treffer.

const WURZEL = new URL("../../", import.meta.url);
const SPEICHER_ZWEIG = "lernwelt-zweig"; // dieselbe Konvention wie komponenten.js

const FACH_LABEL = { mathematik: "Mathematik", physik: "Physik", informatik: "Informatik" };
const STUFEN_LABEL = {
  "klasse-5": "Klasse 5", "klasse-6": "Klasse 6", "klasse-7": "Klasse 7",
  "klasse-8": "Klasse 8", "klasse-9": "Klasse 9", "klasse-10": "Klasse 10",
  "einfuehrungsphase": "Einführungsphase", "qualifikationsphase": "Qualifikationsphase"
};
const GRUPPEN = [
  ["themen", "Themen & Übungen"],
  ["simulationen", "Simulationen"],
  ["klassenarbeiten", "Klassenarbeiten (PDF)"],
  ["experimente", "Experimente"],
  ["lernspiele", "Trainingsraum"],
  ["spiele", "Pausenraum"]
];

// ---------- Textfaltung ----------

// Variante A: Kleinbuchstaben, diakritische Zeichen entfernt (ä→a), ß→ss.
// Liefert eine Indexkarte gefaltet→Original, damit Fundstellen später im
// Originaltitel markiert werden können.
export function falteMitKarte(text) {
  const zeichen = [];
  const karte = [];
  for (let i = 0; i < text.length; i++) {
    let f = text[i].toLowerCase();
    if (f === "ß") f = "ss";
    f = f.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const z of f) { zeichen.push(z); karte.push(i); }
  }
  return { gefaltet: zeichen.join(""), karte };
}

// Variante B: Umlaute als Digraphen (ä→ae, ö→oe, ü→ue, ß→ss) —
// findet die Schreibweise „waerme" in „Wärme".
export function falteUmlaute(text) {
  return text.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Anfrage in Wort-Tokens zerlegen; jedes Token in beiden Faltungen.
export function zerlegeAnfrage(anfrage) {
  return anfrage.trim().split(/\s+/)
    .map(t => ({ a: falteMitKarte(t).gefaltet, b: falteUmlaute(t) }))
    .filter(t => t.a.length > 0);
}

// ---------- Suchindex ----------

function eintragFertig(e) {
  const text = [e.titel, e.kurz || "", e.extra || ""].join(" ");
  e.titelA = falteMitKarte(e.titel).gefaltet;
  e.titelB = falteUmlaute(e.titel);
  e.suchA = falteMitKarte(text).gefaltet;
  e.suchB = falteUmlaute(text);
  return e;
}

// Baut aus den vier rohen Registries die flache Eintragsliste (reine Funktion,
// dadurch ohne Browser testbar).
export function baueEintraege(roh) {
  const eintraege = [];
  for (const t of ((roh.themen && roh.themen.themen) || [])) {
    // Geplante Themen haben noch keine Seiten — sie tauchen (wie in den
    // Übersichten) auch in der Suche nicht auf.
    if (t.status !== "online" && t.status !== "in-arbeit") continue;
    eintraege.push(eintragFertig({
      kategorie: "themen",
      titel: t.titel,
      kurz: t.kurz || "",
      extra: [FACH_LABEL[t.fach], STUFEN_LABEL[t.stufe], t.id].filter(Boolean).join(" "),
      ziel: WURZEL.href + t.pfad + "index.html",
      nebenziel: WURZEL.href + t.pfad + "uebungen.html",
      nebenlabel: "Direkt zu den Übungen",
      fach: t.fach, stufe: t.stufe, zweig: t.zweig, status: t.status
    }));
  }
  for (const s of ((roh.simulationen && roh.simulationen.simulationen) || [])) {
    eintraege.push(eintragFertig({
      kategorie: "simulationen",
      titel: s.titel,
      kurz: s.kurz || "",
      extra: [FACH_LABEL[s.fach], "Simulation", s.id].filter(Boolean).join(" "),
      ziel: WURZEL.href + s.pfad + "index.html",
      fach: s.fach
    }));
  }
  for (const a of ((roh.klassenarbeiten && roh.klassenarbeiten.arbeiten) || [])) {
    eintraege.push(eintragFertig({
      kategorie: "klassenarbeiten",
      titel: a.titel,
      kurz: [a.nr, FACH_LABEL[a.fach], STUFEN_LABEL[a.stufe], a.seiten ? a.seiten + " Seiten" : ""].filter(Boolean).join(" · "),
      extra: [FACH_LABEL[a.fach], STUFEN_LABEL[a.stufe], "Klassenarbeit PDF", a.id].filter(Boolean).join(" "),
      ziel: WURZEL.href + a.datei,
      fach: a.fach, stufe: a.stufe, zweig: a.zweig, pdf: true
    }));
  }
  // Fester Eintrag: Tagesmischung (eigener Bereich ohne Registry)
  eintraege.push(eintragFertig({
    kategorie: "lernspiele",
    titel: "Tagesmischung: gemischtes \u00dcben",
    kurz: "T\u00e4glich neue Aufgabenmischung aus deinen Themen \u00b7 Wiederholung inklusive",
    extra: "Tagesmischung mischen wiederholen \u00fcben Training gemischt Wiedervorlage tagesmischung",
    ziel: WURZEL.href + "lernspiele/tagesmischung/index.html",
    fach: "", stufe: "", zweig: ["gym", "rs"]
  }));
  // Fester Eintrag: CAS-Werkstatt (eigener Bereich ohne Registry)
  eintraege.push(eintragFertig({
    kategorie: "themen",
    titel: "CAS-Werkstatt: ClassPad II von Anfang an",
    kurz: "Mathematik \u00b7 Physik \u00b7 ab Klasse 8 (Gym) \u00b7 Anleitung + \u00dcbungsparcours",
    extra: "CAS ClassPad Taschenrechner solve Werkstatt Anleitung Grundlagen cas-werkstatt",
    ziel: WURZEL.href + "cas-werkstatt/index.html",
    fach: "mathematik", stufe: "", zweig: ["gym"]
  }));
  for (const z of ((roh.klassenarbeiten && roh.klassenarbeiten.lernzettel) || [])) {
    eintraege.push(eintragFertig({
      kategorie: "klassenarbeiten",
      titel: "Lernzettel: " + z.titel,
      kurz: [FACH_LABEL[z.fach], STUFEN_LABEL[z.stufe], z.seiten ? z.seiten + " Seiten" : ""].filter(Boolean).join(" \u00b7 "),
      extra: [FACH_LABEL[z.fach], STUFEN_LABEL[z.stufe], "Lernzettel Merkblatt PDF", z.id].filter(Boolean).join(" "),
      ziel: WURZEL.href + z.datei,
      fach: z.fach, stufe: z.stufe, zweig: z.zweig, pdf: true
    }));
  }
  for (const e of ((roh.experimente && roh.experimente.experimente) || [])) {
    if (e.status !== "online" && e.status !== "in-arbeit") continue;
    eintraege.push(eintragFertig({
      kategorie: "experimente",
      titel: e.titel,
      kurz: e.kurz || "",
      extra: [FACH_LABEL[e.fach] || "", e.stufe || "", "Experiment Versuch messen", e.id].filter(Boolean).join(" "),
      ziel: WURZEL.href + e.pfad + "index.html",
      fach: e.fach || null, status: e.status
    }));
  }
  for (const s of ((roh.lernspiele && roh.lernspiele.lernspiele) || [])) {
    eintraege.push(eintragFertig({
      kategorie: "lernspiele",
      titel: s.titel,
      kurz: s.kurz || "",
      extra: [FACH_LABEL[s.fach] || "", s.stufen || "", "Lernspiel Training Bestenliste", s.id].filter(Boolean).join(" "),
      ziel: WURZEL.href + s.ordner + "index.html",
      fach: s.fach || null
    }));
  }
  for (const s of ((roh.spiele && roh.spiele.spiele) || [])) {
    eintraege.push(eintragFertig({
      kategorie: "spiele",
      titel: s.titel,
      kurz: s.kurz || "",
      extra: [s.fach ? FACH_LABEL[s.fach] : "", "Spiel Pausenraum", s.id].filter(Boolean).join(" "),
      ziel: WURZEL.href + s.ordner + "index.html",
      fach: s.fach || null
    }));
  }
  return eintraege;
}

// ---------- Suche ----------

// Reine Suchfunktion: liefert Treffer gruppiert nach Kategorie, innerhalb der
// Gruppe nach Punkten (Titelanfang > Titel > Beschreibung) und Titel sortiert.
export function sucheEintraege(eintraege, anfrage, zweig = "alle") {
  const tokens = zerlegeAnfrage(anfrage);
  const gruppen = GRUPPEN.map(([kategorie, label]) => ({ kategorie, label, treffer: [] }));
  let anzahl = 0;
  if (tokens.length === 0) return { anzahl, tokens, gruppen };
  for (const e of eintraege) {
    if (zweig !== "alle" && Array.isArray(e.zweig) && e.zweig.length > 0 && !e.zweig.includes(zweig)) continue;
    if (!tokens.every(t => e.suchA.includes(t.a) || e.suchB.includes(t.b))) continue;
    let punkte = 0;
    for (const t of tokens) {
      if (e.titelA.startsWith(t.a)) punkte += 3;
      else if (e.titelA.includes(t.a) || e.titelB.includes(t.b)) punkte += 2;
      else punkte += 1;
    }
    gruppen.find(g => g.kategorie === e.kategorie).treffer.push(Object.assign({}, e, { punkte }));
    anzahl++;
  }
  for (const g of gruppen) {
    g.treffer.sort((x, y) => y.punkte - x.punkte || x.titel.localeCompare(y.titel, "de"));
  }
  return { anzahl, tokens, gruppen };
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[z]));
}

// Erste Fundstelle jedes Tokens (Faltung A) im Titel mit <mark> hervorheben.
// Arbeitet über die Indexkarte, damit Umlaut-Faltungen die Positionen nicht
// verschieben; überlappende Bereiche werden verschmolzen. HTML-sicher.
export function hebeHervor(titel, tokens) {
  const { gefaltet, karte } = falteMitKarte(titel);
  const bereiche = [];
  for (const t of tokens) {
    if (!t.a) continue;
    const i = gefaltet.indexOf(t.a);
    if (i < 0) continue;
    bereiche.push([karte[i], karte[i + t.a.length - 1] + 1]);
  }
  bereiche.sort((x, y) => x[0] - y[0]);
  const verschmolzen = [];
  for (const b of bereiche) {
    const letzte = verschmolzen[verschmolzen.length - 1];
    if (letzte && b[0] <= letzte[1]) letzte[1] = Math.max(letzte[1], b[1]);
    else verschmolzen.push([b[0], b[1]]);
  }
  let aus = "";
  let pos = 0;
  for (const [von, bis] of verschmolzen) {
    aus += esc(titel.slice(pos, von)) + "<mark>" + esc(titel.slice(von, bis)) + "</mark>";
    pos = bis;
  }
  return aus + esc(titel.slice(pos));
}

// ---------- Seite ----------

async function holeJson(pfad) {
  const antwort = await fetch(new URL(pfad, WURZEL));
  if (!antwort.ok) throw new Error(pfad + ": HTTP " + antwort.status);
  return antwort.json();
}

function aktuellerZweigLokal() {
  try {
    const z = localStorage.getItem(SPEICHER_ZWEIG);
    return (z === "gym" || z === "rs") ? z : "alle";
  } catch (_fehler) {
    return "alle";
  }
}

function abzeichenFuer(e) {
  const teile = [];
  if (e.fach && FACH_LABEL[e.fach]) teile.push(`<span class="abzeichen">${FACH_LABEL[e.fach]}</span>`);
  if (e.stufe && STUFEN_LABEL[e.stufe]) teile.push(`<span class="abzeichen">${STUFEN_LABEL[e.stufe]}</span>`);
  if (Array.isArray(e.zweig) && e.zweig.length === 1) teile.push(`<span class="abzeichen zweig-tag">${e.zweig[0] === "gym" ? "Gym" : "RS"}</span>`);
  if (e.kategorie === "simulationen") teile.push(`<span class="abzeichen sim">Simulation</span>`);
  if (e.pdf) teile.push(`<span class="abzeichen">PDF</span>`);
  if (e.status === "in-arbeit") teile.push(`<span class="abzeichen status-geplant">in Arbeit</span>`);
  return teile.join("");
}

export async function rendereSuche() {
  const feld = document.getElementById("suchfeld");
  const status = document.getElementById("suche-status");
  const ausgabe = document.getElementById("suche-ergebnisse");
  const einfuehrung = document.getElementById("suche-einfuehrung");
  if (!feld || !status || !ausgabe) return;

  const formular = document.querySelector(".suchformular");
  if (formular) formular.addEventListener("submit", e => e.preventDefault());

  let eintraege = [];
  try {
    const [themen, simulationen, klassenarbeiten, experimente, lernspiele, spiele] = await Promise.all([
      holeJson("daten/themen.json"),
      holeJson("daten/simulationen.json"),
      holeJson("daten/klassenarbeiten.json"),
      holeJson("daten/experimente.json"),
      holeJson("daten/lernspiele.json"),
      holeJson("daten/spiele.json")
    ]);
    eintraege = baueEintraege({ themen, simulationen, klassenarbeiten, experimente, lernspiele, spiele });
  } catch (fehler) {
    status.textContent = "Die Suchdaten konnten nicht geladen werden — bitte die Seite neu laden.";
    return;
  }

  function zeige() {
    const anfrage = feld.value.trim();
    if (anfrage.length < 2) {
      ausgabe.innerHTML = "";
      status.textContent = anfrage.length === 0 ? "" : "Bitte mindestens zwei Zeichen eingeben.";
      if (einfuehrung) einfuehrung.hidden = false;
      return;
    }
    if (einfuehrung) einfuehrung.hidden = true;
    const { anzahl, tokens, gruppen } = sucheEintraege(eintraege, anfrage, aktuellerZweigLokal());
    status.textContent = anzahl === 0
      ? `Keine Treffer für „${anfrage}“. Versuche es mit einem kürzeren Begriff — oder stöbere über die Fächer im Menü.`
      : `${anzahl} Treffer für „${anfrage}“`;
    ausgabe.innerHTML = gruppen.filter(g => g.treffer.length > 0).map(g => `
      <section class="suche-gruppe" aria-label="${g.label}">
        <h2>${g.label} <span class="treffer-zahl">(${g.treffer.length})</span></h2>
        <ul class="suche-liste">
          ${g.treffer.map(e => `
          <li>
            <a class="suche-treffer${e.fach ? " " + e.fach : ""}" href="${e.ziel}">
              <span class="treffer-titel">${hebeHervor(e.titel, tokens)}</span>
              <span class="treffer-abzeichen">${abzeichenFuer(e)}</span>
              ${e.kurz ? `<span class="treffer-kurz">${esc(e.kurz)}</span>` : ""}
            </a>
            ${e.nebenziel ? `<a class="treffer-nebenlink" href="${e.nebenziel}">${esc(e.nebenlabel)}</a>` : ""}
          </li>`).join("")}
        </ul>
      </section>`).join("");
  }

  let verzoegerung = 0;
  feld.addEventListener("input", () => {
    clearTimeout(verzoegerung);
    verzoegerung = setTimeout(() => {
      const q = feld.value.trim();
      history.replaceState(null, "", q ? "#q=" + encodeURIComponent(q) : location.pathname + location.search);
      zeige();
    }, 150);
  });

  document.querySelectorAll(".suche-chips button").forEach(knopf => {
    knopf.addEventListener("click", () => {
      feld.value = knopf.dataset.suche || knopf.textContent;
      history.replaceState(null, "", "#q=" + encodeURIComponent(feld.value));
      feld.focus();
      zeige();
    });
  });

  // Zweig-Umschalter der Kopfzeile wirkt sofort auf die Trefferliste
  document.addEventListener("zweig-geaendert", zeige);

  // Suchbegriff aus dem URL-Hash übernehmen (#q=…) — macht Suchen teilbar
  function uebernehmeHash() {
    const m = location.hash.match(/^#q=(.+)$/);
    if (m) {
      try { feld.value = decodeURIComponent(m[1]); } catch (_fehler) { feld.value = m[1]; }
    }
    zeige();
  }
  window.addEventListener("hashchange", uebernehmeHash);
  uebernehmeHash();
}

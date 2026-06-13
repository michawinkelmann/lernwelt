// aufgaben-engine.js — rendert und prüft Übungsaufgaben aus JSON (Schema: UMSETZUNGSPLAN §7.2).
// Acht Aufgabentypen: multiple-choice, numerisch, luecke, zuordnung, reihenfolge,
// freitext, rechenweg, parametrisiert. Gestufte Tipps, Lösungswege, Filterleiste,
// Fortschrittsbalken. Kein Tracking, keine Noten — reines Selbstlern-Feedback.

import { WURZEL, aktuellerZweig } from "./komponenten.js";
import { rendereMathe } from "./mathe-render.js";
import { holeAufgabenStatus, setzeAufgabenStatus, merkeThemenUmfang } from "./fortschritt.js";

// ---------- kleine Helfer ----------

function esc(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// akzeptiert Komma UND Punkt als Dezimaltrennzeichen
function zahlAusText(text) {
  const t = String(text).trim().replace(",", ".");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  return parseFloat(t);
}

function normalisiere(text) {
  return String(text).trim().toLowerCase().replace(/\s+/g, " ").replace(",", ".");
}

// deterministischer Zufall für parametrisierte Aufgaben
function mulberry32(saat) {
  return function () {
    saat |= 0; saat = (saat + 0x6D2B79F5) | 0;
    let t = Math.imul(saat ^ (saat >>> 15), 1 | saat);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function textSaat(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function ganzzahl(rng, von, bis) { return von + Math.floor(rng() * (bis - von + 1)); }

function mische(liste, rng = Math.random) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LOB = ["Richtig gelöst — stark!", "Genau so — gut gemacht!", "Stimmt — weiter so!"];
const MUT = [
  "Noch nicht richtig — schau dir den ersten Tipp an.",
  "Fast! Prüfe deinen Ansatz mit dem nächsten Tipp.",
  "Noch nicht — der Lösungsweg unten erklärt jeden Schritt."
];

// ---------- Generatoren für parametrisierte Aufgaben ----------
// Jede Familie liefert: { frage, eingaben, loesungsweg } — Tipps bleiben aus dem JSON.

// Zahl mit deutschem Dezimalkomma für KaTeX-Lösungswege
function de(zahl) { return String(zahl).replace(".", "{,}"); }

const GENERATOREN = {
  // Scheitelpunkt einer verschobenen Normalparabel bestimmen
  "scheitelpunkt": function (rng) {
    let d = 0, e = 0;
    while (d === 0) d = ganzzahl(rng, -6, 6);
    while (e === 0) e = ganzzahl(rng, -9, 9);
    const b = -2 * d, c = d * d + e;
    const bT = (b >= 0 ? "+ " + b : "- " + (-b));
    const cT = (c >= 0 ? "+ " + c : "- " + (-c));
    return {
      frage: `Bestimme den Scheitelpunkt der Parabel $f(x) = x^2 ${bT}x ${cT}$.`,
      eingaben: [
        { label: "$x_S$", antwort: d, toleranz: 0 },
        { label: "$y_S$", antwort: e, toleranz: 0 }
      ],
      loesungsweg: `Quadratische Ergänzung: $f(x) = (x ${d >= 0 ? "-" : "+"} ${Math.abs(d)})^2 ${e >= 0 ? "+" : "-"} ${Math.abs(e)}$, also $S(${d}\\,|\\,${e})$.`
    };
  },

  // Quadratische Gleichung x² + px + q = 0 mit ganzzahligen Lösungen (über Vieta erzeugt)
  "quadratische-gleichung": function (rng) {
    let x1 = 0, x2 = 0;
    while (x1 === 0) x1 = ganzzahl(rng, -9, -1);
    while (x2 === 0 || x2 === x1) x2 = ganzzahl(rng, 1, 9);
    const p = -(x1 + x2), q = x1 * x2;
    const pT = p === 0 ? "" : (p > 0 ? ` + ${p}x` : ` - ${-p}x`);
    const qT = q > 0 ? ` + ${q}` : ` - ${-q}`;
    return {
      frage: `Löse die quadratische Gleichung $x^2${pT}${qT} = 0$.`,
      eingaben: [
        { label: "kleinere Lösung $x_1$", antwort: Math.min(x1, x2), toleranz: 0 },
        { label: "größere Lösung $x_2$", antwort: Math.max(x1, x2), toleranz: 0 }
      ],
      loesungsweg: `p-q-Formel mit $p = ${p}$, $q = ${q}$: $x_{1,2} = ${de(-p / 2)} \pm \sqrt{${de((p / 2) * (p / 2))} ${q >= 0 ? "-" : "+"} ${Math.abs(q)}} = ${de(-p / 2)} \pm ${de(Math.abs(x2 - x1) / 2)}$. Lösungen: $x_1 = ${Math.min(x1, x2)}$ und $x_2 = ${Math.max(x1, x2)}$. Probe (Vieta): $x_1 + x_2 = ${x1 + x2} = -p$ und $x_1 \cdot x_2 = ${q} = q$. ✓`
    };
  },

  // Wurfweite des schiefen Wurfs (g = 9,81 m/s² fest)
  "wurfweite": function (rng) {
    const v0 = ganzzahl(rng, 8, 25);
    const alpha = 5 * ganzzahl(rng, 3, 14); // 15° … 70°
    const w = v0 * v0 * Math.sin(2 * alpha * Math.PI / 180) / 9.81;
    const wR = Math.round(w * 100) / 100;
    return {
      frage: `Ein Ball wird mit $v_0 = ${v0}\\,\\frac{\\text{m}}{\\text{s}}$ unter dem Winkel $\\alpha = ${alpha}^\\circ$ abgeworfen ($g = 9{,}81\\,\\frac{\\text{m}}{\\text{s}^2}$, ohne Luftwiderstand, Abwurf auf Bodenhöhe). Berechne die Wurfweite.`,
      eingaben: [{ label: "Wurfweite $W$", antwort: w, toleranz: Math.max(0.05, w * 0.01), einheit: "m" }],
      loesungsweg: `$W = \\frac{v_0^2 \\cdot \\sin(2\\alpha)}{g} = \\frac{${v0}^2 \\cdot \\sin(${2 * alpha}^\\circ)}{9{,}81} \\approx ${String(wR).replace(".", "{,}")}\\,\\text{m}$. Kontrolliere das Ergebnis in der Wurf-Simulation!`
    };
  },

  // Elektrische Feldstärke im Plattenkondensator: E = U/d
  "feldstaerke-kondensator": function (rng) {
    const u = 10 * ganzzahl(rng, 10, 50);           // 100 … 500 V
    const dCm = ganzzahl(rng, 4, 20) / 2;           // 2 … 10 cm
    const e = u / (dCm / 100);
    return {
      frage: `An einem Plattenkondensator liegt die Spannung $U = ${u}\\,\\text{V}$ an, der Plattenabstand beträgt $d = ${String(dCm).replace(".", "{,}")}\\,\\text{cm}$. Berechne die elektrische Feldstärke $E$ zwischen den Platten.`,
      eingaben: [{ label: "$E$", antwort: e, toleranz: Math.max(1, e * 0.005), einheit: "V/m" }],
      loesungsweg: `$E = \\frac{U}{d} = \\frac{${u}\\,\\text{V}}{${String(dCm / 100).replace(".", "{,}")}\\,\\text{m}} = ${String(Math.round(e * 100) / 100).replace(".", "{,}")}\\,\\frac{\\text{V}}{\\text{m}}$ — Plattenabstand vorher in Meter umrechnen!`
    };
  },

  // Maximale Vergleichszahl der binären Suche (n = Zweierpotenz)
  "binaere-suche": function (rng) {
    const k = ganzzahl(rng, 4, 10);
    const n = Math.pow(2, k);
    return {
      frage: `Eine sortierte Liste enthält $${n}$ Einträge. Wie viele Vergleiche braucht die binäre Suche höchstens, um einen Eintrag zu finden (oder festzustellen, dass er fehlt)?`,
      eingaben: [{ label: "Vergleiche (höchstens)", antwort: k + 1, toleranz: 0 }],
      loesungsweg: `Jeder Vergleich halbiert den Suchbereich: $${n} \\to ${n / 2} \\to \\dots \\to 1$. Das sind $${k}$ Halbierungen, plus der letzte Vergleich: höchstens $${k + 1}$ Vergleiche.`
    };
  },

  // Binärzahl in Dezimalzahl umwandeln
  "binaer-zu-dezimal": function (rng) {
    const z = ganzzahl(rng, 9, 63);
    const binaer = z.toString(2);
    const summanden = [];
    binaer.split("").forEach((ziffer, i) => {
      const wert = Math.pow(2, binaer.length - 1 - i);
      if (ziffer === "1") summanden.push(wert);
    });
    return {
      frage: `Wandle die Binärzahl $${binaer}_2$ in eine Dezimalzahl um.`,
      eingaben: [{ label: "Dezimalwert", antwort: z, toleranz: 0 }],
      loesungsweg: `Stellenwerte addieren: $${binaer}_2 = ${summanden.join(" + ")} = ${z}$.`
    };
  }
};

// ---------- Einstieg ----------

export async function starteUebungsseite() {
  const halter = document.getElementById("uebungen");
  if (!halter) return;
  const datensatz = document.body.dataset.aufgaben;
  const antwort = await fetch(new URL(`daten/aufgaben/${datensatz}.json`, WURZEL));
  if (!antwort.ok) {
    halter.innerHTML = `<p class="einleitung">Die Aufgaben konnten nicht geladen werden (${antwort.status}).</p>`;
    return;
  }
  const daten = await antwort.json();
  const themaId = document.body.dataset.thema || daten.thema || datensatz;
  merkeThemenUmfang(themaId, daten.aufgaben.length);

  halter.innerHTML = "";
  halter.append(baueFilterleiste(daten));
  halter.append(baueFortschrittsbalken());
  const liste = document.createElement("div");
  liste.className = "aufgaben-liste";
  halter.append(liste);

  daten.aufgaben.forEach((aufgabe, i) => liste.append(baueAufgabe(aufgabe, i, themaId)));
  await rendereMathe(halter);

  aktualisiereFilter(daten);
  aktualisiereBalken(daten);
  document.addEventListener("zweig-geaendert", () => aktualisiereFilter(daten));
  document.addEventListener("fortschritt-geaendert", () => { aktualisiereFilter(daten); aktualisiereBalken(daten); });
}

// ---------- Filterleiste & Fortschrittsbalken ----------

function baueFilterleiste(daten) {
  const zeile = document.createElement("div");
  zeile.className = "filterleiste";
  zeile.innerHTML = `
    <fieldset data-filter="afb"><legend>AFB</legend>
      ${[1, 2, 3].map(n => `<label><input type="checkbox" value="${n}" checked> ${["I", "II", "III"][n - 1]}</label>`).join("")}
    </fieldset>
    <label><input type="checkbox" data-filter="ungeloest"> nur ungelöste</label>
    <button type="button" class="knopf zweitrangig klein filter-druck">Drucken</button>`;
  zeile.querySelectorAll("input").forEach(eingabe =>
    eingabe.addEventListener("change", () => aktualisiereFilter(daten)));
  zeile.querySelector(".filter-druck").addEventListener("click", () => window.print());
  return zeile;
}

function baueFortschrittsbalken() {
  const kasten = document.createElement("div");
  kasten.className = "fortschrittsbalken";
  kasten.innerHTML = `
    <div class="balken" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Gelöste Aufgaben"><i></i></div>
    <p class="balken-text"></p>`;
  return kasten;
}

function aktualisiereBalken(daten) {
  const balken = document.querySelector(".fortschrittsbalken");
  if (!balken) return;
  const gesamt = daten.aufgaben.length;
  const geloest = daten.aufgaben.filter(a => holeAufgabenStatus(a.id) === "geloest").length;
  const prozent = gesamt ? Math.round(100 * geloest / gesamt) : 0;
  balken.querySelector("i").style.width = prozent + "%";
  balken.querySelector(".balken").setAttribute("aria-valuenow", prozent);
  balken.querySelector(".balken-text").textContent = `${geloest} von ${gesamt} Aufgaben gelöst`;
}

function aktualisiereFilter(daten) {
  const leiste = document.querySelector(".filterleiste");
  if (!leiste) return;
  const afbs = [...leiste.querySelectorAll('[data-filter="afb"] input:checked')].map(e => +e.value);
  const nurUngeloeste = leiste.querySelector('[data-filter="ungeloest"]').checked;
  const zweig = aktuellerZweig();
  let sichtbar = 0;
  daten.aufgaben.forEach(a => {
    const knoten = document.getElementById("aufgabe-" + a.id);
    if (!knoten) return;
    const passt =
      afbs.includes(a.afb) &&
      (zweig === "alle" || a.zweig.includes(zweig)) &&
      (!nurUngeloeste || holeAufgabenStatus(a.id) !== "geloest");
    knoten.hidden = !passt;
    if (passt) sichtbar++;
  });
  const text = document.querySelector(".balken-text");
  if (text) {
    const gesamt = daten.aufgaben.length;
    const geloest = daten.aufgaben.filter(a => holeAufgabenStatus(a.id) === "geloest").length;
    const zusatz = sichtbar < gesamt ? ` · ${sichtbar} von ${gesamt} angezeigt` : "";
    text.textContent = `${geloest} von ${gesamt} Aufgaben gelöst${zusatz}`;
  }
}

// ---------- Aufgaben-Gerüst ----------

export function baueAufgabe(aufgabe, index, themaId) {
  const artikel = document.createElement("article");
  artikel.className = "aufgabe";
  artikel.id = "aufgabe-" + aufgabe.id;

  const zusatzAbzeichen = aufgabe.niveau === 3 ? `<span class="abzeichen niveau">Zusatz</span>` : "";
  artikel.innerHTML = `
    <div class="aufgabe-kopf">
      <span class="aufgabe-nummer">Aufgabe ${index + 1}</span>
      <span class="abzeichen afb">AFB ${["I", "II", "III"][aufgabe.afb - 1]}</span>
      ${zusatzAbzeichen}
      <span class="abzeichen zweig-tag">${aufgabe.zweig.map(z => z === "gym" ? "Gym" : "RS").join(" · ")}</span>
      <span class="abzeichen geloest-tag" hidden>✓ gelöst</span>
    </div>
    <p class="frage"></p>
    <div class="aufgaben-koerper"></div>
    <div class="tipp-bereich" aria-live="polite"></div>
    <div class="knopfzeile"></div>
    <p class="rueckmeldung" role="status" hidden></p>
  `;

  const kontext = {
    aufgabe, themaId,
    koerper: artikel.querySelector(".aufgaben-koerper"),
    frage: artikel.querySelector(".frage"),
    knoepfe: artikel.querySelector(".knopfzeile"),
    rueckmeldung: artikel.querySelector(".rueckmeldung"),
    tippBereich: artikel.querySelector(".tipp-bereich"),
    artikel,
    fehlversuche: 0
  };
  kontext.frage.innerHTML = aufgabe.frage || "";

  // Typ-spezifischen Inhalt aufbauen; liefert eine pruefe()-Funktion oder null (Selbstkontrolle)
  const typen = {
    "multiple-choice": baueMultipleChoice,
    "numerisch": baueNumerisch,
    "luecke": baueLuecke,
    "zuordnung": baueZuordnung,
    "reihenfolge": baueReihenfolge,
    "freitext": baueFreitext,
    "rechenweg": baueRechenweg,
    "parametrisiert": baueParametrisiert
  };
  const bauen = typen[aufgabe.typ];
  if (!bauen) {
    kontext.koerper.innerHTML = `<p>Unbekannter Aufgabentyp: ${esc(aufgabe.typ)}</p>`;
    return artikel;
  }
  const pruefe = bauen(kontext);

  // Prüfen-Knopf (außer bei reiner Selbstkontrolle)
  if (pruefe) {
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.className = "knopf klein";
    knopf.textContent = "Prüfen";
    knopf.addEventListener("click", () => {
      const ok = pruefe();
      if (ok !== null) melde(kontext, ok); // null = Typ hat seine Meldung selbst ausgegeben
    });
    kontext.knoepfe.prepend(knopf);
  }

  // Gestufte Tipps
  if (Array.isArray(aufgabe.tipps) && aufgabe.tipps.length) {
    kontext.knoepfe.append(baueTippKnopf(aufgabe.tipps, kontext.tippBereich));
  }

  // Lösungsweg (aufklappbar, jederzeit zugänglich)
  if (aufgabe.loesungsweg) {
    artikel.append(baueLoesungsweg(aufgabe.loesungsweg, kontext));
  }

  // CAS-Anleitung (ClassPad II), optional — aufklappbar wie der Lösungsweg
  if (aufgabe.cas) {
    const cas = document.createElement("details");
    cas.className = "loesungsweg cas";
    cas.innerHTML = `<summary>CAS-Anleitung (ClassPad II)</summary><div class="loesung-inhalt">${aufgabe.cas}<p class="cas-werkstatt-verweis"><a href="${WURZEL.href}cas-werkstatt/index.html">Neu am ClassPad? Zur CAS-Werkstatt: Schritt für Schritt von Anfang an</a></p></div>`;
    cas.addEventListener("toggle", () => { if (cas.open) rendereMathe(cas); }, { once: true });
    artikel.append(cas);
  }

  // Bereits gelöste Aufgaben markieren
  if (holeAufgabenStatus(aufgabe.id) === "geloest") zeigeGeloest(artikel);

  return artikel;
}

function baueTippKnopf(tipps, bereich) {
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = "knopf zweitrangig klein";
  let stufe = 0;
  knopf.textContent = `Tipp anzeigen (0/${tipps.length})`;
  knopf.addEventListener("click", async () => {
    if (stufe >= tipps.length) return;
    const tipp = document.createElement("div");
    tipp.className = "tipp";
    tipp.innerHTML = `<strong>Tipp ${stufe + 1}:</strong> ${tipps[stufe]}`;
    bereich.append(tipp);
    await rendereMathe(tipp);
    stufe++;
    knopf.textContent = stufe >= tipps.length ? "Alle Tipps angezeigt" : `Nächster Tipp (${stufe}/${tipps.length})`;
    if (stufe >= tipps.length) knopf.disabled = true;
  });
  return knopf;
}

function baueLoesungsweg(text, kontext) {
  const details = document.createElement("details");
  details.className = "loesungsweg";
  details.innerHTML = `<summary>Lösungsweg anzeigen</summary><div class="loesung-inhalt">${text}</div>`;
  details.addEventListener("toggle", () => { if (details.open) rendereMathe(details); }, { once: true });
  kontext.artikel.append(details);
  return details;
}

// Nur anzeigen (ohne Fortschritt zu speichern) — für Zwischenmeldungen
function zeigeMeldung(kontext, ok, text) {
  const r = kontext.rueckmeldung;
  r.hidden = false;
  r.className = "rueckmeldung " + (ok ? "ok" : "fehler");
  r.innerHTML = `<span class="zeichen" aria-hidden="true">${ok ? "✓" : "✗"}</span> ${text}`;
}

function melde(kontext, ok, eigenerText) {
  const text = eigenerText || (ok
    ? LOB[Math.floor(Math.random() * LOB.length)]
    : MUT[Math.min(kontext.fehlversuche, MUT.length - 1)]);
  zeigeMeldung(kontext, ok, text);
  // Zentrales Antwort-Ereignis (z. B. für Tagesmischung/Wiedervorlage)
  document.dispatchEvent(new CustomEvent("aufgabe-beantwortet", {
    detail: { id: kontext.aufgabe.id, themaId: kontext.themaId, ok }
  }));
  if (ok) {
    setzeAufgabenStatus(kontext.aufgabe.id, "geloest", kontext.themaId);
    zeigeGeloest(kontext.artikel);
  } else {
    kontext.fehlversuche++;
    setzeAufgabenStatus(kontext.aufgabe.id, "versucht", kontext.themaId);
  }
}

function zeigeGeloest(artikel) {
  artikel.classList.add("ist-geloest");
  const abzeichen = artikel.querySelector(".geloest-tag");
  if (abzeichen) abzeichen.hidden = false;
}

// ---------- Typ: numerisch ----------

function baueNumerischeFelder(eingaben, ziel) {
  const kasten = document.createElement("div");
  kasten.className = "eingaben";
  eingaben.forEach((e, i) => {
    const label = document.createElement("label");
    label.innerHTML = `<span class="feld-label">${e.label || "Ergebnis"}</span>
      <input type="text" inputmode="decimal" autocomplete="off" data-index="${i}" aria-label="Antwortfeld ${i + 1}">
      ${e.einheit ? `<span class="einheit">${esc(e.einheit)}</span>` : ""}`;
    kasten.append(label);
  });
  ziel.append(kasten);
  return kasten;
}

function pruefeNumerischeFelder(eingaben, kasten) {
  let alleOk = true;
  eingaben.forEach((e, i) => {
    const feld = kasten.querySelector(`input[data-index="${i}"]`);
    const wert = zahlAusText(feld.value);
    const toleranz = e.toleranz || 0;
    const ok = wert !== null && Math.abs(wert - e.antwort) <= toleranz + 1e-9;
    feld.setAttribute("aria-invalid", String(!ok));
    feld.style.borderColor = ok ? "var(--ok)" : "var(--fehler)";
    if (!ok) alleOk = false;
  });
  return alleOk;
}

function baueNumerisch(kontext) {
  const kasten = baueNumerischeFelder(kontext.aufgabe.eingaben, kontext.koerper);
  return () => pruefeNumerischeFelder(kontext.aufgabe.eingaben, kasten);
}

// ---------- Typ: multiple-choice ----------

// Schlichter Klartext aus einem KaTeX-Text — als zugaenglicher Name (aria-label),
// denn gerendertes KaTeX ist fuer die Namensberechnung aria-hidden.
function ariaKlartext(t) {
  return String(t)
    .replace(/\$\$?/g, "")
    .replace(/\\cdot/g, "\u00b7")
    .replace(/\\(?:,|;|quad|qquad|!)/g, " ")
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, "$1")
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ").trim();
}

function baueMultipleChoice(kontext) {
  const optionen = kontext.aufgabe.optionen;
  const mehrfach = optionen.filter(o => o.richtig).length > 1;
  const name = "mc-" + kontext.aufgabe.id;
  const liste = document.createElement("ul");
  liste.className = "optionen";
  const reihenfolge = mische(optionen.map((o, i) => i));
  reihenfolge.forEach(i => {
    const o = optionen[i];
    const li = document.createElement("li");
    li.dataset.index = i;
    li.innerHTML = `
      <label>
        <input type="${mehrfach ? "checkbox" : "radio"}" name="${name}" value="${i}"${/\$/.test(o.text) ? ` aria-label="${esc(ariaKlartext(o.text))}"` : ""}>
        <span>${o.text}${o.erklaerung ? `<span class="erklaerung" hidden>${o.erklaerung}</span>` : ""}</span>
      </label>`;
    liste.append(li);
  });
  if (mehrfach) {
    const hinweis = document.createElement("p");
    hinweis.className = "einleitung";
    hinweis.textContent = "Mehrere Antworten können richtig sein.";
    kontext.koerper.append(hinweis);
  }
  kontext.koerper.append(liste);

  return () => {
    let ok = true;
    liste.querySelectorAll("li").forEach(li => {
      const i = +li.dataset.index;
      const gewaehlt = li.querySelector("input").checked;
      const richtig = !!optionen[i].richtig;
      li.classList.remove("richtig-markiert", "falsch-markiert");
      if (gewaehlt !== richtig) ok = false;
      if (gewaehlt && !richtig) {
        li.classList.add("falsch-markiert");
        const erkl = li.querySelector(".erklaerung");
        if (erkl) { erkl.hidden = false; rendereMathe(erkl); }
      }
    });
    if (ok) {
      liste.querySelectorAll("li").forEach(li => {
        const i = +li.dataset.index;
        if (optionen[i].richtig) li.classList.add("richtig-markiert");
        const erkl = li.querySelector(".erklaerung");
        if (erkl) { erkl.hidden = false; rendereMathe(erkl); }
      });
    }
    return ok;
  };
}

// ---------- Typ: luecke ----------

function baueLuecke(kontext) {
  const a = kontext.aufgabe;
  const teile = a.text.split("___");
  const p = document.createElement("p");
  p.className = "luecken-text";
  let html = "";
  teile.forEach((teil, i) => {
    html += teil;
    if (i < a.luecken.length) {
      const l = a.luecken[i];
      if (l.art === "dropdown") {
        const optionen = mische(l.optionen);
        html += `<select class="luecke-dropdown" data-index="${i}" aria-label="Lücke ${i + 1}">
          <option value="">– wählen –</option>
          ${optionen.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}
        </select>`;
      } else {
        html += `<input type="text" class="luecke-eingabe" autocomplete="off" data-index="${i}" aria-label="Lücke ${i + 1}">`;
      }
    }
  });
  p.innerHTML = html;
  kontext.koerper.append(p);

  return () => {
    let ok = true;
    a.luecken.forEach((l, i) => {
      const feld = p.querySelector(`[data-index="${i}"]`);
      const erwartet = Array.isArray(l.antwort) ? l.antwort : [l.antwort];
      const passt = erwartet.some(e => normalisiere(e) === normalisiere(feld.value));
      feld.setAttribute("aria-invalid", String(!passt));
      feld.style.borderColor = passt ? "var(--ok)" : "var(--fehler)";
      if (!passt) ok = false;
    });
    return ok;
  };
}

// ---------- Typ: zuordnung ----------

function baueZuordnung(kontext) {
  const paare = kontext.aufgabe.paare;
  const rechtsOptionen = mische(paare.map(p => p.rechts));
  const kasten = document.createElement("div");
  kasten.className = "zuordnung";
  paare.forEach((paar, i) => {
    const zeile = document.createElement("div");
    zeile.className = "paar";
    zeile.innerHTML = `
      <span>${paar.links}</span>
      <select data-index="${i}" aria-label="Zuordnung zu: ${esc(paar.links)}">
        <option value="">– zuordnen –</option>
        ${rechtsOptionen.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}
      </select>`;
    kasten.append(zeile);
  });
  kontext.koerper.append(kasten);

  return () => {
    let ok = true;
    paare.forEach((paar, i) => {
      const feld = kasten.querySelector(`select[data-index="${i}"]`);
      const passt = feld.value === paar.rechts;
      feld.setAttribute("aria-invalid", String(!passt));
      feld.style.borderColor = passt ? "var(--ok)" : "var(--fehler)";
      if (!passt) ok = false;
    });
    return ok;
  };
}

// ---------- Typ: reihenfolge ----------

function baueReihenfolge(kontext) {
  const elemente = kontext.aufgabe.elemente;
  const n = elemente.length;
  let anzeige = mische(elemente.map((_, i) => i));
  if (n > 1 && anzeige.every((v, i) => v === i)) anzeige = anzeige.reverse();

  const liste = document.createElement("ol");
  liste.className = "reihenfolge";
  anzeige.forEach(original => {
    const li = document.createElement("li");
    li.dataset.original = original;
    li.innerHTML = `
      <select aria-label="Position für: ${esc(elemente[original])}">
        <option value="">Position …</option>
        ${Array.from({ length: n }, (_, p) => `<option value="${p + 1}">${p + 1}.</option>`).join("")}
      </select>
      <span>${elemente[original]}</span>`;
    liste.append(li);
  });
  kontext.koerper.append(liste);

  return () => {
    const gewaehlt = [...liste.querySelectorAll("select")].map(s => s.value);
    if (gewaehlt.some(w => w === "")) {
      zeigeMeldung(kontext, false, "Bitte ordne jedem Element eine Position zu.");
      return null; // unvollständig — zählt nicht als Versuch
    }
    if (new Set(gewaehlt).size !== gewaehlt.length) {
      zeigeMeldung(kontext, false, "Jede Position darf nur einmal vorkommen.");
      return null;
    }
    let ok = true;
    liste.querySelectorAll("li").forEach(li => {
      const soll = +li.dataset.original + 1;
      const ist = +li.querySelector("select").value;
      const passt = soll === ist;
      li.style.borderColor = passt ? "var(--ok)" : "var(--fehler)";
      if (!passt) ok = false;
    });
    return ok;
  };
}

// ---------- Typ: freitext (Selbstkontrolle) ----------

function baueFreitext(kontext) {
  const a = kontext.aufgabe;
  kontext.koerper.innerHTML = `
    <textarea class="freitext-feld" aria-label="Deine Antwort" placeholder="Formuliere deine Antwort in eigenen Worten …"></textarea>
    <div class="freitext-aufloesung" hidden>
      <div class="merkkasten"><span class="merk-etikett">Musterlösung</span><div class="muster-inhalt">${a.musterloesung}</div></div>
      <p><strong>Vergleiche ehrlich:</strong> Wie gut passt deine Antwort?</p>
      <div class="selbstcheck">
        <button type="button" class="knopf klein" data-wert="richtig">Richtig</button>
        <button type="button" class="knopf zweitrangig klein" data-wert="teilweise">Teilweise</button>
        <button type="button" class="knopf zweitrangig klein" data-wert="nochmal">Nochmal üben</button>
      </div>
    </div>`;

  const aufloesung = kontext.koerper.querySelector(".freitext-aufloesung");
  const zeigen = document.createElement("button");
  zeigen.type = "button";
  zeigen.className = "knopf klein";
  zeigen.textContent = "Musterlösung anzeigen";
  zeigen.addEventListener("click", async () => {
    aufloesung.hidden = false;
    zeigen.disabled = true;
    await rendereMathe(aufloesung);
  });
  kontext.knoepfe.append(zeigen);

  aufloesung.querySelectorAll(".selbstcheck button").forEach(knopf => {
    knopf.addEventListener("click", () => {
      const wert = knopf.dataset.wert;
      if (wert === "richtig") {
        melde(kontext, true, "Super — als gelöst gespeichert!");
      } else if (wert === "teilweise") {
        melde(kontext, false, "Guter Anfang! Lies die Musterlösung noch einmal und ergänze deine Antwort.");
      } else {
        melde(kontext, false, "Kein Problem — die Aufgabe bleibt zum erneuten Üben offen.");
      }
    });
  });

  return null; // kein Prüfen-Knopf, reine Selbstkontrolle
}

// ---------- Typ: rechenweg ----------

function baueRechenweg(kontext) {
  const schritte = kontext.aufgabe.schritte;
  const kaesten = [];

  schritte.forEach((schritt, i) => {
    const kasten = document.createElement("div");
    kasten.className = "schritt" + (i > 0 ? " gesperrt" : "");
    kasten.innerHTML = `<p class="schritt-titel">Schritt ${i + 1} von ${schritte.length}</p><p class="schritt-frage">${schritt.frage}</p>`;
    const felder = baueNumerischeFelder(schritt.eingaben, kasten);

    const zeile = document.createElement("div");
    zeile.className = "knopfzeile";
    const pruefKnopf = document.createElement("button");
    pruefKnopf.type = "button";
    pruefKnopf.className = "knopf klein";
    pruefKnopf.textContent = "Schritt prüfen";
    zeile.append(pruefKnopf);
    if (Array.isArray(schritt.tipps) && schritt.tipps.length) {
      const tippBereich = document.createElement("div");
      tippBereich.className = "tipp-bereich";
      kasten.append(tippBereich);
      zeile.append(baueTippKnopf(schritt.tipps, tippBereich));
    }
    kasten.append(zeile);
    if (i > 0) kasten.querySelectorAll("input, button").forEach(el => { el.disabled = true; });

    pruefKnopf.addEventListener("click", () => {
      const ok = pruefeNumerischeFelder(schritt.eingaben, felder);
      if (ok) {
        kasten.classList.add("ist-ok");
        if (i + 1 < schritte.length) {
          kaesten[i + 1].classList.remove("gesperrt");
          kaesten[i + 1].querySelectorAll("input, button").forEach(el => { el.disabled = false; });
          zeigeMeldung(kontext, true, `Schritt ${i + 1} stimmt — weiter mit Schritt ${i + 2}!`);
          setzeAufgabenStatus(kontext.aufgabe.id, "versucht", kontext.themaId); // Zwischenstand
        } else {
          melde(kontext, true);
        }
      } else {
        melde(kontext, false);
      }
    });

    kontext.koerper.append(kasten);
    kaesten.push(kasten);
  });

  return null; // jeder Schritt hat seinen eigenen Prüfknopf
}

// ---------- Typ: parametrisiert ----------

function baueParametrisiert(kontext) {
  const a = kontext.aufgabe;
  const generator = GENERATOREN[a.generator];
  if (!generator) {
    kontext.koerper.innerHTML = `<p>Unbekannter Generator: ${esc(a.generator)}</p>`;
    return null;
  }

  let zaehler = 0;
  let instanz = null;
  let kasten = null;

  async function neuErzeugen() {
    const rng = mulberry32(textSaat(a.id) + zaehler);
    instanz = generator(rng);
    kontext.frage.innerHTML = instanz.frage;
    kontext.koerper.innerHTML = "";
    kasten = baueNumerischeFelder(instanz.eingaben, kontext.koerper);
    kontext.rueckmeldung.hidden = true;
    const loesung = kontext.artikel.querySelector("details.loesungsweg");
    if (loesung) loesung.remove();
    if (instanz.loesungsweg) {
      const details = baueLoesungsweg(instanz.loesungsweg, kontext);
      details.addEventListener("toggle", () => { if (details.open) rendereMathe(details); });
    }
    await rendereMathe(kontext.artikel);
  }

  const neuKnopf = document.createElement("button");
  neuKnopf.type = "button";
  neuKnopf.className = "knopf zweitrangig klein";
  neuKnopf.textContent = "Neue Aufgabe";
  neuKnopf.addEventListener("click", () => { zaehler++; neuErzeugen(); });
  kontext.knoepfe.append(neuKnopf);

  neuErzeugen();

  return () => pruefeNumerischeFelder(instanz.eingaben, kasten);
}

// tagesmischung.js — gemischtes Wiederhol-Training („Tagesmischung").
// Stellt pro Tag deterministisch eine frische Aufgabenmischung aus mehreren Themen
// zusammen (verschachteltes Wiederholen statt Blockueben) und pflegt eine lokale
// Wiedervorlage-Liste: falsch beantwortete Aufgaben werden ab dem Folgetag bevorzugt
// wieder eingestreut. Lazy geladen ueber komponenten.js (data-seite="tagesmischung").
//
// Architektur: Die Modulebene ist bewusst DOM- und localStorage-frei und kommt ohne
// statische Importe aus — sie laesst sich in Node importieren und testen (TESTS unten).
// Alle Browser-Abhaengigkeiten werden erst in starteTagesmischung() dynamisch geladen.

// ---------- Konstanten (keine Seiteneffekte) ----------

export const AUSWAHL_SCHLUESSEL = "lernwelt-tm-auswahl";
export const WIEDERVORLAGE_SCHLUESSEL = "lernwelt-wiedervorlage";

// Hoechstens zwei Aufgaben je Thema, damit die Mischung breit streut.
const MAX_PRO_THEMA = 2;

// Expandierende Wiedervorlage-Intervalle in Tagen (Leitner / spaced retrieval, Cepeda 2006):
// falsch → Stufe 1 (morgen faellig); bei richtiger Wiederholung 3 Tage, dann 7 Tage, dann graduiert.
export const WV_INTERVALLE = [1, 3, 7];

const STUFEN = [
  ["klasse-5", "Klasse 5"],
  ["klasse-6", "Klasse 6"],
  ["klasse-7", "Klasse 7"],
  ["klasse-8", "Klasse 8"],
  ["klasse-9", "Klasse 9"],
  ["klasse-10", "Klasse 10"],
  ["einfuehrungsphase", "Einführungsphase"],
  ["qualifikationsphase", "Qualifikationsphase"]
];

const FAECHER = [
  ["alle", "Alle Fächer"],
  ["mathematik", "Mathematik"],
  ["physik", "Physik"],
  ["informatik", "Informatik"]
];

// ---------- deterministischer Zufall (eigene kleine Implementierung) ----------

// FNV-1a-Hash: macht aus einem Seed-Text eine vorzeichenlose 32-Bit-Zahl.
export function textSaat(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: kleiner, schneller Pseudozufallsgenerator mit Saat.
export function mulberry32(saat) {
  return function () {
    saat |= 0;
    saat = (saat + 0x6D2B79F5) | 0;
    let t = Math.imul(saat ^ (saat >>> 15), 1 | saat);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates-Mischung mit eigenem Generator — liefert eine neue Liste.
export function mischeMitSeed(liste, rng) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Seed-Text der Tagesmischung: gleiche Einstellungen am gleichen Tag → gleiche Mischung.
export function baueSeedText(teile) {
  const { datum, zweig, fach, quelle, anzahl, salt = 0 } = teile;
  return ["tm", datum, zweig, fach, quelle, anzahl].join(":") + (salt ? ":salt" + salt : "");
}

// ---------- Datum (reine Funktionen) ----------

// Lokales Datum als JJJJ-MM-TT.
export function datumIso(datum = new Date()) {
  const j = datum.getFullYear();
  const m = String(datum.getMonth() + 1).padStart(2, "0");
  const t = String(datum.getDate()).padStart(2, "0");
  return j + "-" + m + "-" + t;
}

// Folgetag eines ISO-Datums (Monats- und Jahreswechsel inklusive).
export function morgenIso(heuteIso) {
  const [jahr, monat, tag] = String(heuteIso).split("-").map(Number);
  const morgen = new Date(Date.UTC(jahr, (monat || 1) - 1, (tag || 1) + 1));
  return morgen.toISOString().slice(0, 10);
}

// N Tage auf ein ISO-Datum addieren (fuer expandierende Wiedervorlage-Intervalle).
export function plusTage(heuteIso, tage) {
  const [jahr, monat, tag] = String(heuteIso).split("-").map(Number);
  const ziel = new Date(Date.UTC(jahr, (monat || 1) - 1, (tag || 1) + (tage | 0)));
  return ziel.toISOString().slice(0, 10);
}

// Faellig, sobald faelligAb erreicht oder ueberschritten ist (ISO-Strings vergleichen sich lexikografisch).
export function istFaellig(eintrag, heuteIso) {
  return !!(eintrag && typeof eintrag.faelligAb === "string" &&
    typeof heuteIso === "string" && eintrag.faelligAb <= heuteIso);
}

export function faelligeWiedervorlagen(liste, heuteIso) {
  return (Array.isArray(liste) ? liste : [])
    .filter(e => e && e.id && e.themaId && istFaellig(e, heuteIso));
}

// ---------- Filter & Prioritaet (reine Funktionen) ----------

// Zweig der Aufgabe muss zum Kopfzeilen-Filter passen; „alle" laesst alles durch.
export function passtZweig(aufgabenZweig, zweig) {
  if (zweig !== "gym" && zweig !== "rs") return true;
  return Array.isArray(aufgabenZweig) && aufgabenZweig.includes(zweig);
}

// Ziehreihenfolge: erst „versucht", dann Unbearbeitetes, „geloest" zuletzt.
export function prioritaet(status) {
  if (status === "versucht") return 0;
  if (status === "geloest") return 2;
  return 1;
}

// Themen-Kandidaten: sichtbarer Status, Fach-Filter, Quelle „meine" oder Stufe.
export function filtereThemen(themen, auswahl, meineThemenIds) {
  const sichtbar = new Set(["online", "in-arbeit"]);
  return (Array.isArray(themen) ? themen : []).filter(t => {
    if (!t || !sichtbar.has(t.status)) return false;
    if (auswahl.fach && auswahl.fach !== "alle" && t.fach !== auswahl.fach) return false;
    if (auswahl.quelle === "meine") return !!meineThemenIds && meineThemenIds.has(t.id);
    return t.stufe === auswahl.stufe;
  });
}

// ---------- Wiedervorlage-Pflege (reine Funktion) ----------

// Antwort einarbeiten (Leitner-Prinzip, expandierende Intervalle):
//  falsch               → Stufe 1, morgen faellig (Lapse setzt eine vorhandene Karte zurueck).
//  richtig & vorgemerkt → naechste Stufe, spaeter faellig; nach der letzten Stufe graduiert (raus).
//  richtig & nicht drin → nichts tun (nur falsch beantwortete Aufgaben kommen in die Wiedervorlage).
// `heute` ist das ISO-Datum von heute; die Faelligkeit wird daraus berechnet.
export function wendeAntwortAufWiedervorlage(liste, antwort, heute) {
  const sauber = (Array.isArray(liste) ? liste : []).filter(e => e && e.id);
  if (!antwort || !antwort.id) return sauber;
  const idx = sauber.findIndex(e => e.id === antwort.id);
  if (antwort.ok) {
    if (idx < 0) return sauber;                                  // war nicht vorgemerkt → nichts tun
    const naechste = (sauber[idx].stufe || 1) + 1;
    if (naechste > WV_INTERVALLE.length) return sauber.filter(e => e.id !== antwort.id); // graduiert
    const kopie = sauber.slice();
    kopie[idx] = Object.assign({}, sauber[idx], { stufe: naechste, faelligAb: plusTage(heute, WV_INTERVALLE[naechste - 1]) });
    return kopie;
  }
  const eintrag = { id: antwort.id, themaId: antwort.themaId || "", stufe: 1, faelligAb: plusTage(heute, WV_INTERVALLE[0]) };
  if (idx < 0) return sauber.concat([eintrag]);                  // neu anlegen
  const kopie = sauber.slice();
  kopie[idx] = eintrag;                                          // Lapse: zuruecksetzen
  return kopie;
}

// ---------- Ziehlogik ----------
// Stellt die Mischung zusammen. Bewusst ohne DOM/Speicher: Aufgaben kommen ueber den
// uebergebenen Lader (im Browser fetch, im Test ein Stub), der Aufgabenstatus ueber
// statusVon. Es werden nur so viele Themen geladen, wie tatsaechlich gebraucht werden.
//
// Prioritaet: (a) faellige Wiedervorlagen (hoechstens die halbe Mischung) →
// (b) Status „versucht" → (c) Unbearbeitetes → (d) „geloest" zuletzt.
// Reihum eine Aufgabe je Thema, bei Bedarf eine zweite Runde (max. 2 je Thema).

export async function stelleMischungZusammen(optionen) {
  const { themen, anzahl, zweig, saat, ladeAufgaben, statusVon, wiedervorlage = [], heute } = optionen;
  const zielAnzahl = Math.max(1, anzahl | 0);

  const reihenfolge = mischeMitSeed(themen, mulberry32((saat ^ textSaat("themenfolge")) >>> 0));
  const themaErlaubt = new Set(reihenfolge.map(t => t.id));

  // Aufgaben je Thema einmal laden, nach Zweig filtern, deterministisch mischen
  // und stabil nach Prioritaet sortieren — unabhaengig von der Ladereihenfolge.
  const kandidatenSpeicher = new Map();
  async function kandidatenVon(themaId) {
    if (!kandidatenSpeicher.has(themaId)) {
      let roh = null;
      try { roh = await ladeAufgaben(themaId); } catch (_f) { roh = null; }
      const passend = (Array.isArray(roh) ? roh : []).filter(a => a && a.id && passtZweig(a.zweig, zweig));
      const gemischt = mischeMitSeed(passend, mulberry32((saat ^ textSaat("thema:" + themaId)) >>> 0));
      gemischt.sort((a, b) => prioritaet(statusVon(a.id)) - prioritaet(statusVon(b.id)));
      kandidatenSpeicher.set(themaId, gemischt);
    }
    return kandidatenSpeicher.get(themaId);
  }

  const eintraege = [];
  const gewaehlt = new Set();
  const proThema = new Map();
  function nimm(aufgabe, themaId, wiederholung) {
    eintraege.push({ aufgabe, themaId, wiederholung });
    gewaehlt.add(aufgabe.id);
    proThema.set(themaId, (proThema.get(themaId) || 0) + 1);
  }

  // (a) Faellige Wiedervorlagen zuerst einstreuen — hoechstens die halbe Mischung.
  const maxWiederholungen = Math.floor(zielAnzahl / 2);
  let wiederholungen = 0;
  const faellige = mischeMitSeed(
    faelligeWiedervorlagen(wiedervorlage, heute).filter(e => themaErlaubt.has(e.themaId)),
    mulberry32((saat ^ textSaat("wiedervorlage")) >>> 0)
  );
  for (const merker of faellige) {
    if (wiederholungen >= maxWiederholungen || eintraege.length >= zielAnzahl) break;
    if (gewaehlt.has(merker.id) || (proThema.get(merker.themaId) || 0) >= MAX_PRO_THEMA) continue;
    const kandidaten = await kandidatenVon(merker.themaId);
    const aufgabe = kandidaten.find(a => a.id === merker.id);
    if (!aufgabe) continue;
    nimm(aufgabe, merker.themaId, true);
    wiederholungen++;
  }

  // (b)–(d) Reihum je Thema die beste noch freie Aufgabe — Ziel: breite Themenstreuung.
  for (let runde = 1; runde <= MAX_PRO_THEMA && eintraege.length < zielAnzahl; runde++) {
    for (const thema of reihenfolge) {
      if (eintraege.length >= zielAnzahl) break;
      if ((proThema.get(thema.id) || 0) >= runde) continue;
      const kandidaten = await kandidatenVon(thema.id);
      const aufgabe = kandidaten.find(a => !gewaehlt.has(a.id));
      if (aufgabe) nimm(aufgabe, thema.id, false);
    }
  }

  return {
    eintraege,
    themenAnzahl: new Set(eintraege.map(e => e.themaId)).size,
    wiederholungen
  };
}

// ---------- Selbsttests (in Node lauffaehig: ok() darf eine Promise liefern) ----------

function pruefThema(id) {
  return { id, fach: "mathematik", stufe: "klasse-7", status: "in-arbeit", titel: id, pfad: "mathematik/klasse-7/" + id + "/" };
}
function pruefAufgabe(id, zweig) {
  return { id, zweig: zweig || ["gym", "rs"], typ: "numerisch", niveau: 1, afb: 1, frage: id };
}
function pruefLader(datenProThema) {
  const lader = async themaId => { lader.aufrufe++; return datenProThema[themaId] || null; };
  lader.aufrufe = 0;
  return lader;
}
const OHNE_STATUS = () => "offen";

export const TESTS = [
  {
    name: "Seed deterministisch: gleicher Tag gleiche Folge, anderer Tag andere",
    ok: () => {
      const elemente = "abcdefghijkl".split("");
      const heute1 = baueSeedText({ datum: "2026-06-12", zweig: "alle", fach: "alle", quelle: "meine", anzahl: 5 });
      const heute2 = baueSeedText({ datum: "2026-06-12", zweig: "alle", fach: "alle", quelle: "meine", anzahl: 5 });
      const morgen = baueSeedText({ datum: "2026-06-13", zweig: "alle", fach: "alle", quelle: "meine", anzahl: 5 });
      const folge = text => mischeMitSeed(elemente, mulberry32(textSaat(text))).join("");
      return folge(heute1) === folge(heute2) && folge(heute1) !== folge(morgen) && heute1 !== morgen;
    }
  },
  {
    name: "Ziehprioritaet: versucht vor unbearbeitet, geloest zuletzt",
    ok: async () => {
      const status = { a1: "geloest", a2: "offen", a3: "versucht", a4: "geloest" };
      const ergebnis = await stelleMischungZusammen({
        themen: [pruefThema("t1")], anzahl: 2, zweig: "alle", saat: 7,
        ladeAufgaben: pruefLader({ t1: ["a1", "a2", "a3", "a4"].map(id => pruefAufgabe(id)) }),
        statusVon: id => status[id], wiedervorlage: [], heute: "2026-06-12"
      });
      const ids = ergebnis.eintraege.map(e => e.aufgabe.id);
      return ids.length === 2 && ids[0] === "a3" && ids[1] === "a2";
    }
  },
  {
    name: "Wiedervorlage: Faellige zuerst, hoechstens die halbe Mischung",
    ok: async () => {
      const daten = {}, merkliste = [], themen = [];
      for (let n = 1; n <= 4; n++) {
        daten["t" + n] = [pruefAufgabe("w" + n), pruefAufgabe("x" + n), pruefAufgabe("y" + n)];
        merkliste.push({ id: "w" + n, themaId: "t" + n, faelligAb: "2026-01-01" });
        themen.push(pruefThema("t" + n));
      }
      const e5 = await stelleMischungZusammen({
        themen, anzahl: 5, zweig: "alle", saat: 1, ladeAufgaben: pruefLader(daten),
        statusVon: OHNE_STATUS, wiedervorlage: merkliste, heute: "2026-06-12"
      });
      const anzahlWdh = e5.eintraege.filter(e => e.wiederholung).length;
      const vorneWdh = e5.eintraege.slice(0, anzahlWdh).every(e => e.wiederholung);
      const gemischtFaellig = [
        { id: "w1", themaId: "t1", faelligAb: "2099-01-01" },
        { id: "w2", themaId: "t2", faelligAb: "2026-01-01" }
      ];
      const e10 = await stelleMischungZusammen({
        themen, anzahl: 10, zweig: "alle", saat: 1, ladeAufgaben: pruefLader(daten),
        statusVon: OHNE_STATUS, wiedervorlage: gemischtFaellig, heute: "2026-06-12"
      });
      const nurFaellige = e10.eintraege.filter(e => e.wiederholung).map(e => e.aufgabe.id);
      return e5.eintraege.length === 5 && anzahlWdh === 2 && e5.wiederholungen === 2 && vorneWdh &&
        nurFaellige.length === 1 && nurFaellige[0] === "w2";
    }
  },
  {
    name: "Zweigfilter: nur Aufgaben des gewaehlten Zweigs",
    ok: async () => {
      const daten = { t1: [pruefAufgabe("g1", ["gym"]), pruefAufgabe("r1", ["rs"]), pruefAufgabe("b1", ["gym", "rs"])] };
      const ergebnis = await stelleMischungZusammen({
        themen: [pruefThema("t1")], anzahl: 3, zweig: "rs", saat: 3,
        ladeAufgaben: pruefLader(daten), statusVon: OHNE_STATUS, wiedervorlage: [], heute: "2026-06-12"
      });
      const ids = ergebnis.eintraege.map(e => e.aufgabe.id);
      return ids.length === 2 && ids.every(id => id === "r1" || id === "b1") &&
        passtZweig(["gym"], "rs") === false && passtZweig(["gym"], "alle") === true &&
        passtZweig(["gym", "rs"], "rs") === true;
    }
  },
  {
    name: "Anzahl und Streuung: hoechstens 2 je Thema, mindestens 3 Themen",
    ok: async () => {
      const daten = {}, themen = [];
      for (let n = 1; n <= 6; n++) {
        daten["t" + n] = [1, 2, 3].map(k => pruefAufgabe("t" + n + "-a" + k));
        themen.push(pruefThema("t" + n));
      }
      const ergebnis = await stelleMischungZusammen({
        themen, anzahl: 5, zweig: "alle", saat: 11, ladeAufgaben: pruefLader(daten),
        statusVon: OHNE_STATUS, wiedervorlage: [], heute: "2026-06-12"
      });
      const proThema = {};
      ergebnis.eintraege.forEach(e => { proThema[e.themaId] = (proThema[e.themaId] || 0) + 1; });
      return ergebnis.eintraege.length === 5 && ergebnis.themenAnzahl >= 3 &&
        Object.values(proThema).every(n => n <= 2);
    }
  },
  {
    name: "Faelligkeit: morgen nicht faellig, gestern und heute faellig",
    ok: () => {
      return istFaellig({ faelligAb: "2026-06-13" }, "2026-06-12") === false &&
        istFaellig({ faelligAb: "2026-06-11" }, "2026-06-12") === true &&
        istFaellig({ faelligAb: "2026-06-12" }, "2026-06-12") === true &&
        morgenIso("2026-06-12") === "2026-06-13" &&
        morgenIso("2026-06-30") === "2026-07-01" &&
        morgenIso("2026-12-31") === "2027-01-01";
    }
  },
  {
    name: "Wiedervorlage-Pflege: falsch legt an, expandierende Intervalle 1/3/7, graduiert",
    ok: () => {
      const nach1 = wendeAntwortAufWiedervorlage([], { id: "a1", themaId: "t1", ok: false }, "2026-06-12");
      const nach2 = wendeAntwortAufWiedervorlage(nach1, { id: "a1", themaId: "t1", ok: false }, "2026-06-19"); // Lapse → Stufe 1
      const nach3 = wendeAntwortAufWiedervorlage(nach2, { id: "a1", themaId: "t1", ok: true }, "2026-06-20");  // → Stufe 2 (+3)
      const nach4 = wendeAntwortAufWiedervorlage(nach3, { id: "a1", themaId: "t1", ok: true }, "2026-06-23");  // → Stufe 3 (+7)
      const nach5 = wendeAntwortAufWiedervorlage(nach4, { id: "a1", themaId: "t1", ok: true }, "2026-06-30");  // graduiert
      const fremd = wendeAntwortAufWiedervorlage([], { id: "z9", themaId: "t1", ok: true }, "2026-06-12");     // nicht drin → nichts
      return nach1.length === 1 && nach1[0].stufe === 1 && nach1[0].faelligAb === "2026-06-13" && nach1[0].themaId === "t1" &&
        nach2.length === 1 && nach2[0].stufe === 1 && nach2[0].faelligAb === "2026-06-20" &&
        nach3.length === 1 && nach3[0].stufe === 2 && nach3[0].faelligAb === "2026-06-23" &&
        nach4.length === 1 && nach4[0].stufe === 3 && nach4[0].faelligAb === "2026-06-30" &&
        nach5.length === 0 && fremd.length === 0 &&
        plusTage("2026-06-30", 1) === "2026-07-01" && plusTage("2026-12-31", 1) === "2027-01-01";
    }
  },
  {
    name: "Themenfilter: Status, Fach, Quelle meine und Stufe",
    ok: () => {
      const themen = [
        { id: "m1", fach: "mathematik", stufe: "klasse-7", status: "in-arbeit" },
        { id: "p1", fach: "physik", stufe: "klasse-7", status: "online" },
        { id: "m2", fach: "mathematik", stufe: "klasse-8", status: "geplant" },
        { id: "i1", fach: "informatik", stufe: "klasse-9", status: "online" }
      ];
      const meine = new Set(["p1", "m2"]);
      const a = filtereThemen(themen, { fach: "alle", quelle: "meine" }, meine).map(t => t.id);
      const b = filtereThemen(themen, { fach: "mathematik", quelle: "stufe", stufe: "klasse-7" }, meine).map(t => t.id);
      return a.join(",") === "p1" && b.join(",") === "m1";
    }
  },
  {
    name: "Sparsame Fetches: nur so viele Themen laden wie noetig",
    ok: async () => {
      const daten = {}, themen = [];
      for (let n = 1; n <= 8; n++) {
        daten["t" + n] = [pruefAufgabe("t" + n + "-a1"), pruefAufgabe("t" + n + "-a2")];
        themen.push(pruefThema("t" + n));
      }
      const lader = pruefLader(daten);
      const ergebnis = await stelleMischungZusammen({
        themen, anzahl: 3, zweig: "alle", saat: 5, ladeAufgaben: lader,
        statusVon: OHNE_STATUS, wiedervorlage: [], heute: "2026-06-12"
      });
      return ergebnis.eintraege.length === 3 && lader.aufrufe === 3;
    }
  },
  {
    name: "Modulebene browserfrei: Import in Node, Einstieg vorhanden",
    ok: () => typeof document === "undefined" && typeof starteTagesmischung === "function"
  }
];

// ---------- kleine HTML-Hilfe (rein) ----------

function escHtml(text) {
  return String(text).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
}

function anzahlText(n, einzahl, mehrzahl) {
  return n === 1 ? "1 " + einzahl : n + " " + mehrzahl;
}

// ---------- Browser-Einstieg ----------
// Erst hier werden DOM, localStorage und die uebrigen Module angefasst.

export async function starteTagesmischung() {
  const halter = document.getElementById("tagesmischung");
  if (!halter) return;

  const [komponenten, engine, mathe, fortschritt] = await Promise.all([
    import("./komponenten.js"),
    import("./aufgaben-engine.js"),
    import("./mathe-render.js"),
    import("./fortschritt.js")
  ]);
  const { WURZEL, aktuellerZweig } = komponenten;
  const { baueAufgabe } = engine;
  const { rendereMathe } = mathe;
  const { holeAufgabenStatus, holeThemenFortschritt } = fortschritt;

  // ---- lokaler Speicher ----
  function liesJson(schluessel, ersatz) {
    try {
      const roh = localStorage.getItem(schluessel);
      return roh ? JSON.parse(roh) : ersatz;
    } catch (_f) { return ersatz; }
  }
  function schreibeJson(schluessel, wert) {
    try { localStorage.setItem(schluessel, JSON.stringify(wert)); } catch (_f) { /* z. B. privater Modus */ }
  }

  // ---- Geruest: Bedienleiste, Meldung, Aufgabenliste, Fussbereich ----
  halter.innerHTML = "";

  const leiste = document.createElement("div");
  leiste.className = "filterleiste";
  leiste.setAttribute("role", "group");
  leiste.setAttribute("aria-label", "Einstellungen der Tagesmischung");
  leiste.innerHTML = `
    <label>Fach
      <select data-tm="fach">${FAECHER.map(([wert, label]) => `<option value="${wert}">${label}</option>`).join("")}</select>
    </label>
    <label>Quelle
      <select data-tm="quelle">
        <option value="meine">Meine Themen</option>
        <option value="stufe">Stufe</option>
      </select>
    </label>
    <label data-tm-stufe>Stufe
      <select data-tm="stufe">${STUFEN.map(([wert, label]) => `<option value="${wert}">${label}</option>`).join("")}</select>
    </label>
    <label>Anzahl
      <select data-tm="anzahl"><option value="5">5</option><option value="10">10</option></select>
    </label>
    <button type="button" class="knopf klein" data-tm="ziehen">Mischung ziehen</button>`;

  const meldung = document.createElement("p");
  meldung.className = "einleitung";

  const liste = document.createElement("div");
  liste.className = "aufgaben-liste";

  const fussbereich = document.createElement("div");
  fussbereich.className = "knopfzeile";
  fussbereich.hidden = true;
  const neuKnopf = document.createElement("button");
  neuKnopf.type = "button";
  neuKnopf.className = "knopf zweitrangig klein";
  neuKnopf.textContent = "Neue Mischung";
  fussbereich.append(neuKnopf);

  halter.append(leiste, meldung, liste, fussbereich);

  const felder = {
    fach: leiste.querySelector('[data-tm="fach"]'),
    quelle: leiste.querySelector('[data-tm="quelle"]'),
    stufe: leiste.querySelector('[data-tm="stufe"]'),
    anzahl: leiste.querySelector('[data-tm="anzahl"]'),
    ziehen: leiste.querySelector('[data-tm="ziehen"]'),
    stufenLabel: leiste.querySelector("[data-tm-stufe]")
  };

  // ---- Auswahl merken und wiederherstellen ----
  function aktuelleAuswahl() {
    return {
      fach: felder.fach.value,
      quelle: felder.quelle.value,
      stufe: felder.stufe.value,
      anzahl: parseInt(felder.anzahl.value, 10) === 10 ? 10 : 5
    };
  }
  function zeigeStufenfeld() {
    felder.stufenLabel.hidden = felder.quelle.value !== "stufe";
  }
  (function stelleAuswahlWiederHer() {
    const alt = liesJson(AUSWAHL_SCHLUESSEL, null) || {};
    if (FAECHER.some(([wert]) => wert === alt.fach)) felder.fach.value = alt.fach;
    if (alt.quelle === "stufe" || alt.quelle === "meine") felder.quelle.value = alt.quelle;
    if (STUFEN.some(([wert]) => wert === alt.stufe)) felder.stufe.value = alt.stufe;
    if (alt.anzahl === 10) felder.anzahl.value = "10";
    zeigeStufenfeld();
  })();

  // ---- Daten laden (mit Zwischenspeicher, nur so viele Fetches wie noetig) ----
  let themenListe = null;
  const aufgabenSpeicher = new Map();
  async function ladeThemen() {
    if (themenListe) return themenListe;
    const antwort = await fetch(new URL("daten/themen.json", WURZEL));
    if (!antwort.ok) throw new Error("themen.json: " + antwort.status);
    themenListe = (await antwort.json()).themen || [];
    return themenListe;
  }
  async function ladeAufgaben(themaId) {
    if (!aufgabenSpeicher.has(themaId)) {
      let aufgaben = null;
      try {
        const antwort = await fetch(new URL("daten/aufgaben/" + themaId + ".json", WURZEL));
        if (antwort.ok) aufgaben = (await antwort.json()).aufgaben || null;
      } catch (_f) { aufgaben = null; }
      aufgabenSpeicher.set(themaId, aufgaben);
    }
    return aufgabenSpeicher.get(themaId);
  }

  // ---- Mischung anzeigen ----
  async function zeigeMischung(ergebnis, themen) {
    const themaVon = new Map(themen.map(t => [t.id, t]));
    liste.innerHTML = "";
    ergebnis.eintraege.forEach((eintrag, i) => {
      const thema = themaVon.get(eintrag.themaId);
      const quelle = document.createElement("p");
      quelle.className = "einleitung quellhinweis";
      if (thema && thema.pfad) {
        const ziel = new URL(thema.pfad + "uebungen.html", WURZEL).href;
        quelle.innerHTML = `Aus dem Thema: <a href="${ziel}">${escHtml(thema.titel)}</a>`;
      } else {
        quelle.textContent = "Aus dem Thema: " + eintrag.themaId;
      }
      const artikel = baueAufgabe(eintrag.aufgabe, i, eintrag.themaId);
      if (eintrag.wiederholung) {
        const abzeichen = document.createElement("span");
        abzeichen.className = "abzeichen";
        abzeichen.textContent = "Wiederholung";
        (artikel.querySelector(".aufgabe-kopf") || artikel).append(abzeichen);
      }
      liste.append(quelle, artikel);
    });
    await rendereMathe(liste);
  }

  // ---- Ziehen ----
  let salt = 0;       // „Neue Mischung" zieht mit Zusatz-Salt, „Mischung ziehen" wieder die Tagesmischung
  let ziehungNr = 0;  // schuetzt vor ueberholenden parallelen Ziehungen

  async function ziehe() {
    const nr = ++ziehungNr;
    const auswahl = aktuelleAuswahl();
    schreibeJson(AUSWAHL_SCHLUESSEL, auswahl);
    liste.setAttribute("aria-busy", "true");
    meldung.textContent = "Die Mischung wird zusammengestellt …";
    fussbereich.hidden = true;
    liste.innerHTML = "";
    try {
      const themen = await ladeThemen();
      if (nr !== ziehungNr) return;
      const zweig = aktuellerZweig();
      const meineIds = new Set(themen
        .filter(t => { const f = holeThemenFortschritt(t.id); return f.gesamt > 0 || f.geloest > 0; })
        .map(t => t.id));
      const kandidaten = filtereThemen(themen, auswahl, meineIds);
      if (!kandidaten.length) {
        meldung.textContent = auswahl.quelle === "meine"
          ? "Du hast in dieser Auswahl noch kein Thema begonnen — das ist überhaupt nicht schlimm! Stelle die Quelle oben einfach auf „Stufe“, dann mischt dir die Tagesmischung Aufgaben aus deiner Klassenstufe."
          : "Für diese Auswahl gibt es noch keine Themen — probiere ein anderes Fach oder eine andere Stufe.";
        return;
      }
      const heute = datumIso();
      const seedText = baueSeedText({
        datum: heute,
        zweig,
        fach: auswahl.fach,
        quelle: auswahl.quelle === "stufe" ? "stufe-" + auswahl.stufe : "meine",
        anzahl: auswahl.anzahl,
        salt
      });
      const wiedervorlage = liesJson(WIEDERVORLAGE_SCHLUESSEL, []);
      const ergebnis = await stelleMischungZusammen({
        themen: kandidaten,
        anzahl: auswahl.anzahl,
        zweig,
        saat: textSaat(seedText),
        ladeAufgaben,
        statusVon: holeAufgabenStatus,
        wiedervorlage: Array.isArray(wiedervorlage) ? wiedervorlage : [],
        heute
      });
      if (nr !== ziehungNr) return;
      if (!ergebnis.eintraege.length) {
        meldung.textContent = "Für diese Auswahl gibt es gerade keine passenden Aufgaben — ändere Fach, Stufe oder den Zweig-Filter in der Kopfzeile.";
        return;
      }
      await zeigeMischung(ergebnis, themen);
      if (nr !== ziehungNr) return;
      const wdhHinweis = ergebnis.wiederholungen
        ? ` Davon ${anzahlText(ergebnis.wiederholungen, "Wiederholung", "Wiederholungen")} aus deiner Wiedervorlage.`
        : "";
      meldung.textContent = `Deine Mischung für heute: ${anzahlText(ergebnis.eintraege.length, "Aufgabe", "Aufgaben")} aus ${anzahlText(ergebnis.themenAnzahl, "Thema", "Themen")}.${wdhHinweis} Viel Erfolg!`;
      fussbereich.hidden = false;
    } catch (_f) {
      if (nr === ziehungNr) meldung.textContent = "Die Tagesmischung konnte nicht geladen werden — bitte lade die Seite neu.";
    } finally {
      liste.removeAttribute("aria-busy");
    }
  }

  // ---- Ereignisse ----
  felder.quelle.addEventListener("change", zeigeStufenfeld);
  felder.ziehen.addEventListener("click", () => { salt = 0; ziehe(); });
  neuKnopf.addEventListener("click", () => { salt++; ziehe(); });
  document.addEventListener("zweig-geaendert", () => { ziehe(); });

  // Antworten in die Wiedervorlage einarbeiten: falsch → Stufe 1 (morgen), richtig → naechste Stufe bzw. graduiert.
  document.addEventListener("aufgabe-beantwortet", ereignis => {
    const detail = (ereignis && ereignis.detail) || {};
    if (!detail.id) return;
    const alt = liesJson(WIEDERVORLAGE_SCHLUESSEL, []);
    const neu = wendeAntwortAufWiedervorlage(alt, detail, datumIso());
    schreibeJson(WIEDERVORLAGE_SCHLUESSEL, neu);
  });

  // Beim Laden automatisch die Tagesmischung ziehen.
  await ziehe();
}

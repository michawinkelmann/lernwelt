// spiel.js - Lerntheke: Mathe- und Physikaufträge als ruhiges Managementspiel.
// Reine Logik steht oben und ist in Node testbar. DOM-Zugriff passiert nur in starte().

import { zeigeStufenwahl } from "../../assets/js/spiel/stufenwahl.js";

export const manifest = {
  id: "ls-lerntheke",
  titel: "Lerntheke",
  kurz: "Hilf bei Mathe- und Physikfragen: Aufträge annehmen, Station wählen, Mikroaufgaben lösen, Upgrades und Lernhelfer freischalten.",
  punkteLabel: "Vertrauen",
  punkteEinheit: "",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: true,
  steuerungHinweis: "Auftrag antippen, passende Station wählen, Aufgabe lösen. Komma und Punkt zählen beide."
};

export const SCHICHT_SEKUNDEN = 240;
export const ZEITBONUS_SEKUNDEN = 10;

export const STATIONEN = {
  rechnen: { titel: "Rechentisch", kurz: "Kopfrechnen, Prozent, Terme" },
  einheiten: { titel: "Einheitenregal", kurz: "Umrechnen und passende Einheiten" },
  formeln: { titel: "Formelwand", kurz: "Physikformeln einsetzen und umstellen" },
  tafel: { titel: "Tafel", kurz: "Fehler finden, Rechenwege ordnen" },
  experiment: { titel: "Experimentierecke", kurz: "Messwerte und Diagramme auswerten" }
};

export const STUFEN = [
  { klasse: "Klasse 5", kurz: "Grundrechnen, Größen, erste Physik", klasseNr: 5 },
  { klasse: "Klasse 6", kurz: "Brüche, Einheiten, einfache Diagramme", klasseNr: 6 },
  { klasse: "Klasse 7", kurz: "Prozent, Terme, Strom & Energie", klasseNr: 7 },
  { klasse: "Klasse 8", kurz: "Funktionen, Kraft, Geschwindigkeit", klasseNr: 8 },
  { klasse: "Klasse 9/10", kurz: "Formeln, Diagramme, Modelle", klasseNr: 10 }
];

export const AUFTRAEGE = [
  { id: "m5-ein-kg-g", ab: 5, station: "einheiten", fach: "Mathe", art: "zahl", typ: "Hausaufgabe retten", person: "Mia", thema: "Masse umrechnen", frage: "3,4 kg = ? g", loesung: 3400, einheit: "g", niveau: 1, erklaerung: "1 kg sind 1000 g, also 3,4 · 1000 = 3400 g." },
  { id: "m5-ein-cm-m", ab: 5, station: "einheiten", fach: "Mathe", art: "zahl", typ: "Merkzettel schreiben", person: "Tim", thema: "Längen", frage: "250 cm = ? m", loesung: 2.5, einheit: "m", niveau: 1, erklaerung: "100 cm sind 1 m, also 250 : 100 = 2,5 m." },
  { id: "m5-ein-min-s", ab: 5, station: "einheiten", fach: "Mathe", art: "zahl", typ: "Heftlücke füllen", person: "Leyla", thema: "Zeit", frage: "4 min = ? s", loesung: 240, einheit: "s", niveau: 1, erklaerung: "Eine Minute hat 60 Sekunden: 4 · 60 = 240." },
  { id: "m5-rech-halbe", ab: 5, station: "rechnen", fach: "Mathe", art: "zahl", typ: "Hausaufgabe prüfen", person: "Ben", thema: "Anteile", frage: "Die Hälfte von 86 ist ...", loesung: 43, einheit: "", niveau: 1, erklaerung: "86 : 2 = 43." },
  { id: "m5-phys-dichte-wasser", ab: 5, station: "experiment", fach: "Physik", art: "wahl", typ: "Experiment deuten", person: "Nora", thema: "Schwimmen und Sinken", frage: "Ein Holzklotz schwimmt auf Wasser. Welche Aussage passt?", optionen: ["Er ist insgesamt weniger dicht als Wasser.", "Er ist schwerelos.", "Wasser hat keine Masse."], loesung: "Er ist insgesamt weniger dicht als Wasser.", niveau: 1, erklaerung: "Schwimmen hängt von der Dichte ab, nicht davon, ob ein Körper Masse hat." },
  { id: "m5-tafel-rechenfehler", ab: 5, station: "tafel", fach: "Mathe", art: "wahl", typ: "Fehler finden", person: "Ali", thema: "Punkt vor Strich", frage: "Wo steckt der Fehler in 6 + 4 · 3 = 30?", optionen: ["Die Multiplikation muss zuerst gerechnet werden.", "6 + 4 ist immer 12.", "Die 3 muss zuerst verdoppelt werden."], loesung: "Die Multiplikation muss zuerst gerechnet werden.", niveau: 1, erklaerung: "Punktrechnung vor Strichrechnung: 6 + 12 = 18." },

  { id: "m6-bruch-viertel", ab: 6, station: "rechnen", fach: "Mathe", art: "zahl", typ: "Merkzettel schreiben", person: "Jule", thema: "Brüche", frage: "3/4 von 28 sind ...", loesung: 21, einheit: "", niveau: 2, erklaerung: "28 : 4 = 7 und 3 · 7 = 21." },
  { id: "m6-dezimal-komma", ab: 6, station: "tafel", fach: "Mathe", art: "wahl", typ: "Fehler erklären", person: "Oskar", thema: "Dezimalzahlen", frage: "Welche Zahl ist größer?", optionen: ["0,8", "0,75", "Beide sind gleich groß"], loesung: "0,8", niveau: 1, erklaerung: "0,8 = 0,80 und 0,80 > 0,75." },
  { id: "m6-ein-m2-cm2", ab: 6, station: "einheiten", fach: "Mathe", art: "zahl", typ: "Hausaufgabe retten", person: "Merve", thema: "Fläche", frage: "2 m² = ? cm²", loesung: 20000, einheit: "cm²", niveau: 2, erklaerung: "Bei Flächen wird der Umrechnungsfaktor quadriert: 1 m² = 10000 cm²." },
  { id: "p6-licht-spiegel", ab: 6, station: "experiment", fach: "Physik", art: "wahl", typ: "Skizze deuten", person: "Lennard", thema: "Optik", frage: "Beim Spiegel gilt ...", optionen: ["Einfallswinkel = Ausfallswinkel", "Licht bleibt immer stehen", "Der Ausfallswinkel ist immer 90°"], loesung: "Einfallswinkel = Ausfallswinkel", niveau: 1, erklaerung: "Das Reflexionsgesetz beschreibt die Richtung am ebenen Spiegel." },
  { id: "p6-diagramm-temp", ab: 6, station: "experiment", fach: "Physik", art: "zahl", typ: "Messwert ablesen", person: "Greta", thema: "Diagramm", frage: "Eine Temperatur steigt von 18 °C auf 27 °C. Änderung?", loesung: 9, einheit: "°C", niveau: 1, erklaerung: "27 - 18 = 9 °C." },

  { id: "m7-proz-20", ab: 7, station: "rechnen", fach: "Mathe", art: "zahl", typ: "Hausaufgabe retten", person: "Kian", thema: "Prozent", frage: "20 % von 85 € sind ...", loesung: 17, einheit: "€", niveau: 2, erklaerung: "10 % sind 8,50 €, also sind 20 % 17 €." },
  { id: "m7-proz-rabatt", ab: 7, station: "rechnen", fach: "Mathe", art: "zahl", typ: "Preiszettel prüfen", person: "Hanna", thema: "Rabatt", frage: "120 € mit 25 % Rabatt kosten ...", loesung: 90, einheit: "€", niveau: 2, erklaerung: "25 % von 120 € sind 30 €, also bleiben 90 €." },
  { id: "m7-term", ab: 7, station: "tafel", fach: "Mathe", art: "wahl", typ: "Rechenweg ordnen", person: "Luis", thema: "Terme", frage: "Welche Vereinfachung stimmt?", optionen: ["3x + 2x = 5x", "3x + 2x = 5x²", "3x + 2x = 6x"], loesung: "3x + 2x = 5x", niveau: 1, erklaerung: "Gleichartige Terme werden addiert: 3 + 2 = 5." },
  { id: "p7-strom-ohm", ab: 7, station: "formeln", fach: "Physik", art: "zahl", typ: "Formelkarte schreiben", person: "Yara", thema: "Ohmsches Gesetz", frage: "U = 12 V, I = 3 A. R = ? Ω", loesung: 4, einheit: "Ω", niveau: 2, erklaerung: "R = U / I = 12 V / 3 A = 4 Ω." },
  { id: "p7-energie-kette", ab: 7, station: "tafel", fach: "Physik", art: "wahl", typ: "Merkzettel ordnen", person: "Noah", thema: "Energie", frage: "Welche Umwandlung passt beim Dynamo?", optionen: ["Bewegungsenergie → elektrische Energie", "Lichtenergie → Höhenenergie", "Wärme → Masse"], loesung: "Bewegungsenergie → elektrische Energie", niveau: 2, erklaerung: "Der Dynamo wandelt die Drehbewegung in elektrische Energie um." },
  { id: "p7-leistung", ab: 7, station: "formeln", fach: "Physik", art: "zahl", typ: "Hausaufgabe retten", person: "Elif", thema: "Leistung", frage: "Eine Lampe hat 40 W und leuchtet 3 h. Energie in Wh?", loesung: 120, einheit: "Wh", niveau: 2, erklaerung: "E = P · t = 40 W · 3 h = 120 Wh." },

  { id: "m8-fkt-steigung", ab: 8, station: "tafel", fach: "Mathe", art: "zahl", typ: "Graph erklären", person: "Sam", thema: "Lineare Funktion", frage: "Gerade durch (0|2) und (3|8): Steigung m = ?", loesung: 2, einheit: "", niveau: 2, erklaerung: "m = (8 - 2) / (3 - 0) = 6 / 3 = 2." },
  { id: "m8-gleichung", ab: 8, station: "rechnen", fach: "Mathe", art: "zahl", typ: "Hausaufgabe retten", person: "Clara", thema: "Gleichungen", frage: "Löse 3x + 4 = 19. x = ?", loesung: 5, einheit: "", niveau: 2, erklaerung: "Erst -4: 3x = 15, dann durch 3 teilen: x = 5." },
  { id: "m8-ein-kmh-ms", ab: 8, station: "einheiten", fach: "Mathe/Physik", art: "zahl", typ: "Einheit retten", person: "Fynn", thema: "Geschwindigkeit", frage: "72 km/h = ? m/s", loesung: 20, einheit: "m/s", niveau: 2, erklaerung: "km/h durch 3,6 teilen: 72 : 3,6 = 20." },
  { id: "p8-v-st", ab: 8, station: "formeln", fach: "Physik", art: "zahl", typ: "Formel einsetzen", person: "Aylin", thema: "Geschwindigkeit", frage: "s = 150 m, t = 30 s. v = ? m/s", loesung: 5, einheit: "m/s", niveau: 1, erklaerung: "v = s / t = 150 / 30 = 5 m/s." },
  { id: "p8-kraft", ab: 8, station: "formeln", fach: "Physik", art: "zahl", typ: "Formelkarte schreiben", person: "Mats", thema: "Kraft", frage: "m = 4 kg, a = 3 m/s². F = ? N", loesung: 12, einheit: "N", niveau: 2, erklaerung: "F = m · a = 4 · 3 = 12 N." },
  { id: "p8-diagramm-v", ab: 8, station: "experiment", fach: "Physik", art: "zahl", typ: "Diagramm auswerten", person: "Sina", thema: "t-s-Diagramm", frage: "Ein Weg wächst von 0 m auf 60 m in 12 s. v = ? m/s", loesung: 5, einheit: "m/s", niveau: 2, erklaerung: "Steigung im s-t-Diagramm: 60 m / 12 s = 5 m/s." },

  { id: "m9-pyth", ab: 9, station: "rechnen", fach: "Mathe", art: "zahl", typ: "Hausaufgabe retten", person: "Amira", thema: "Pythagoras", frage: "Katheten 6 cm und 8 cm. Hypotenuse?", loesung: 10, einheit: "cm", niveau: 2, erklaerung: "c² = 6² + 8² = 100, also c = 10 cm." },
  { id: "m9-quadratisch", ab: 9, station: "tafel", fach: "Mathe", art: "wahl", typ: "Fehler finden", person: "Tom", thema: "Parabeln", frage: "Welche Aussage zu f(x)=x²-4 stimmt?", optionen: ["Die Nullstellen sind -2 und 2.", "Die Nullstelle ist nur 4.", "Der Graph ist eine Gerade."], loesung: "Die Nullstellen sind -2 und 2.", niveau: 2, erklaerung: "x² - 4 = 0 bedeutet x² = 4, also x = -2 oder x = 2." },
  { id: "p9-energie-lage", ab: 9, station: "formeln", fach: "Physik", art: "zahl", typ: "Formel einsetzen", person: "Nele", thema: "Lageenergie", frage: "m = 2 kg, g = 10 N/kg, h = 5 m. E = ? J", loesung: 100, einheit: "J", niveau: 2, erklaerung: "E = m · g · h = 2 · 10 · 5 = 100 J." },
  { id: "p9-halbleiter-led", ab: 9, station: "formeln", fach: "Physik", art: "zahl", typ: "Schaltung prüfen", person: "Ruben", thema: "LED", frage: "U = 6 V, U_LED = 2 V, I = 0,02 A. Vorwiderstand?", loesung: 200, einheit: "Ω", niveau: 3, erklaerung: "Am Widerstand liegen 4 V. R = U / I = 4 / 0,02 = 200 Ω." },
  { id: "p9-bremsweg", ab: 9, station: "rechnen", fach: "Physik", art: "zahl", typ: "Sicherheitscheck", person: "Janne", thema: "Bremsweg", frage: "Faustformel: Bremsweg bei 50 km/h = (v/10)². Ergebnis?", loesung: 25, einheit: "m", niveau: 2, erklaerung: "(50/10)² = 5² = 25 m." },

  { id: "m10-exp", ab: 10, station: "rechnen", fach: "Mathe", art: "zahl", typ: "Wachstum erklären", person: "Ilyas", thema: "Exponentiell", frage: "Start 80, Verdopplung in jedem Schritt. Wert nach 3 Schritten?", loesung: 640, einheit: "", niveau: 2, erklaerung: "80 · 2³ = 80 · 8 = 640." },
  { id: "m10-trig", ab: 10, station: "formeln", fach: "Mathe", art: "zahl", typ: "Formel einsetzen", person: "Pia", thema: "Trigonometrie", frage: "Rechtwinklig: Gegenkathete 6, Hypotenuse 10. sin(alpha) = ?", loesung: 0.6, einheit: "", toleranz: 0.001, niveau: 2, erklaerung: "sin(alpha) = Gegenkathete / Hypotenuse = 6 / 10 = 0,6." },
  { id: "p10-beschl", ab: 10, station: "formeln", fach: "Physik", art: "zahl", typ: "Formelkarte schreiben", person: "Rosa", thema: "Beschleunigung", frage: "v steigt von 0 auf 24 m/s in 6 s. a = ? m/s²", loesung: 4, einheit: "m/s²", niveau: 2, erklaerung: "a = Δv / Δt = 24 / 6 = 4 m/s²." },
  { id: "p10-radio", ab: 10, station: "tafel", fach: "Physik", art: "wahl", typ: "Merkzettel prüfen", person: "Leo", thema: "Strahlung", frage: "Welche Abschirmung passt am besten zu Alpha-Strahlung?", optionen: ["Papier oder Haut", "Dicke Bleiplatten", "Gar keine, Alpha geht durch alles"], loesung: "Papier oder Haut", niveau: 1, erklaerung: "Alpha-Teilchen sind stark ionisierend, aber wenig durchdringend." },
  { id: "p10-thermo", ab: 10, station: "tafel", fach: "Physik", art: "wahl", typ: "Fehler erklären", person: "Eda", thema: "Wärme", frage: "Warum kann ein Motor nicht 100 % der Wärme in Arbeit umwandeln?", optionen: ["Ein Teil muss als Abwärme abgegeben werden.", "Weil Energie verschwindet.", "Weil Wärme keine Energie ist."], loesung: "Ein Teil muss als Abwärme abgegeben werden.", niveau: 3, erklaerung: "Der 2. Hauptsatz erzwingt Abwärme; Energie verschwindet dabei nicht." }
];

export const UPGRADES = [
  { id: "poster", titel: "Einheitenposter", kosten: 70, text: "+5 Vertrauen bei Einheiten-Aufträgen." },
  { id: "theke", titel: "Zweite Theke", kosten: 110, text: "Ein Platz mehr in der Warteschlange." },
  { id: "ruhe", titel: "Ruhe-Ecke", kosten: 130, text: "Alle neuen Aufträge haben mehr Geduld." },
  { id: "drucker", titel: "Merkzettel-Drucker", kosten: 150, text: "+4 Vertrauen und +3 Fokus pro gelöstem Auftrag." },
  { id: "mila", titel: "Mila einstellen", kosten: 180, text: "Lernhelferin für Rechnen und Einheiten." },
  { id: "jonas", titel: "Jonas einstellen", kosten: 230, text: "Lernhelfer für Formeln und Experimente." },
  { id: "samira", titel: "Samira einstellen", kosten: 260, text: "Lernhelferin für Tafel- und Fehleraufträge." }
];

export const HELFER = {
  mila: { name: "Mila", stationen: ["rechnen", "einheiten"], interval: 27 },
  jonas: { name: "Jonas", stationen: ["formeln", "experiment"], interval: 34 },
  samira: { name: "Samira", stationen: ["tafel"], interval: 31 }
};

export function parseZahl(text) {
  const s = String(text).trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return null;
  return Number(s);
}

export function istAntwortRichtig(auftrag, eingabe) {
  if (!auftrag) return false;
  if (auftrag.art === "zahl") {
    const wert = parseZahl(eingabe);
    if (wert === null) return false;
    const tol = typeof auftrag.toleranz === "number" ? auftrag.toleranz : 1e-9;
    return Math.abs(wert - auftrag.loesung) <= tol;
  }
  return String(eingabe) === String(auftrag.loesung);
}

export function antwortAnzeige(auftrag) {
  if (!auftrag) return "";
  const wert = String(auftrag.loesung).replace(".", ",");
  return auftrag.art === "zahl" ? `${wert}${auftrag.einheit ? " " + auftrag.einheit : ""}` : auftrag.loesung;
}

export function aufgabenPool(stufe) {
  const klasse = stufe.klasseNr || 5;
  return AUFTRAEGE.filter(a => a.ab <= klasse);
}

export function waehleAuftrag(stufe, rng = Math.random, letzteIds = []) {
  const pool = aufgabenPool(stufe);
  const frisch = pool.filter(a => !letzteIds.includes(a.id));
  const wahl = frisch.length ? frisch : pool;
  return wahl[Math.floor(rng() * wahl.length)];
}

export function maxWarteschlange(upgrades = new Set()) {
  return 4 + (upgrades.has("theke") ? 1 : 0);
}

export function geduldFuer(auftrag, upgrades = new Set()) {
  const basis = 58 + (auftrag.niveau || 1) * 7;
  return basis + (upgrades.has("ruhe") ? 18 : 0);
}

export function belohnungFuer(auftrag, geduldAnteil, upgrades = new Set(), viaHelfer = false) {
  const niveau = auftrag.niveau || 1;
  let vertrauen = 22 + niveau * 6 + Math.round(12 * Math.max(0, Math.min(1, geduldAnteil)));
  let fokus = 15 + niveau * 4;
  if (upgrades.has("poster") && auftrag.station === "einheiten") vertrauen += 5;
  if (upgrades.has("drucker")) { vertrauen += 4; fokus += 3; }
  if (viaHelfer) { vertrauen = Math.round(vertrauen * 0.8); fokus = Math.round(fokus * 0.7); }
  return { vertrauen, fokus };
}

export function zeitbonusFuer(viaHelfer = false) {
  return viaHelfer ? 0 : ZEITBONUS_SEKUNDEN;
}

export function kannKaufen(upgrade, fokus, gekauft = new Set()) {
  return !!upgrade && !gekauft.has(upgrade.id) && fokus >= upgrade.kosten;
}

export function tickGeduld(auftraege, dt) {
  return auftraege.map(a => ({ ...a, geduld: Math.max(0, a.geduld - dt) }));
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
}

function formatSek(s) {
  const t = Math.max(0, Math.ceil(s));
  const m = Math.floor(t / 60);
  const r = String(t % 60).padStart(2, "0");
  return `${m}:${r}`;
}

function stationKlasse(id) {
  return "lt-st-" + id;
}

function hinweisFuer(auftrag) {
  const texte = {
    einheiten: "Noch nicht. Prüfe den Umrechnungsfaktor und achte auf die Einheit.",
    formeln: "Noch nicht. Schreib erst die passende Formel hin und setze dann die Werte ein.",
    rechnen: "Noch nicht. Rechne in kleinen Schritten und kontrolliere die Grundrechnung.",
    tafel: "Noch nicht. Vergleiche mit der passenden Regel und lies jede Antwort genau.",
    experiment: "Noch nicht. Schau noch einmal auf Achsen, Skalen und Einheiten."
  };
  return texte[auftrag?.station] || "Noch nicht. Versuch es noch einmal in Ruhe.";
}

export const TESTS = [
  { name: "Datensatz: mindestens 30 Aufträge, eindeutige IDs, Stationen bekannt", ok: () => {
    const ids = new Set(AUFTRAEGE.map(a => a.id));
    return AUFTRAEGE.length >= 30 && ids.size === AUFTRAEGE.length &&
      AUFTRAEGE.every(a => STATIONEN[a.station] && a.frage && a.loesung !== undefined && a.person && a.typ);
  }},
  { name: "Klassenstufen: jede Stufe hat Mathe- und Physikaufträge", ok: () =>
    STUFEN.every(s => {
      const p = aufgabenPool(s);
      return p.some(a => a.fach.includes("Mathe")) && p.some(a => a.fach.includes("Physik"));
    }) },
  { name: "Antwortprüfung: Zahlen mit Komma/Punkt und Wahlantworten", ok: () => {
    const zahl = AUFTRAEGE.find(a => a.art === "zahl" && a.id === "m8-ein-kmh-ms");
    const wahl = AUFTRAEGE.find(a => a.art === "wahl" && a.id === "p7-energie-kette");
    return istAntwortRichtig(zahl, "20") && istAntwortRichtig(zahl, "20,0") &&
      !istAntwortRichtig(zahl, "21") && istAntwortRichtig(wahl, wahl.loesung) &&
      !istAntwortRichtig(wahl, "Wärme → Masse");
  }},
  { name: "Belohnungen: Upgrades und Helfer wirken plausibel", ok: () => {
    const a = AUFTRAEGE.find(x => x.station === "einheiten");
    const normal = belohnungFuer(a, 1, new Set(), false);
    const upgraded = belohnungFuer(a, 1, new Set(["poster", "drucker"]), false);
    const helper = belohnungFuer(a, 1, new Set(["poster", "drucker"]), true);
    return upgraded.vertrauen > normal.vertrauen && upgraded.fokus > normal.fokus && helper.vertrauen < upgraded.vertrauen &&
      zeitbonusFuer(false) === ZEITBONUS_SEKUNDEN && zeitbonusFuer(true) === 0;
  }},
  { name: "Warteschlange und Geduld: Upgrade erweitert und Tick senkt Geduld", ok: () => {
    const a = { id: "x", geduld: 10 };
    return maxWarteschlange(new Set()) === 4 && maxWarteschlange(new Set(["theke"])) === 5 &&
      tickGeduld([a], 3)[0].geduld === 7 && tickGeduld([a], 30)[0].geduld === 0;
  }},
  { name: "Kaufregeln: Kosten und Doppelkäufe werden beachtet", ok: () => {
    const u = UPGRADES.find(x => x.id === "poster");
    return !kannKaufen(u, 50, new Set()) && kannKaufen(u, 70, new Set()) && !kannKaufen(u, 100, new Set(["poster"]));
  }}
];

export function starte(api) {
  let state = null;
  let naechsteInstanz = 1;
  let letzteIds = [];
  let renderTimer = 0;
  let fertig = false;

  function reset() {
    fertig = false;
    state = null;
    letzteIds = [];
    naechsteInstanz = 1;
    api.loopStopp();
    api.setzePunkte(0);
    api.setzeZeit(formatSek(SCHICHT_SEKUNDEN));
    zeigeStufenwahl(api.flaeche, {
      titel: "Wähle deine Lerntheken-Schicht:",
      hinweis: "Die Aufträge mischen Mathe und Physik. Höhere Klassen bekommen mehr Formeln, Diagramme und Modellfragen.",
      stufen: STUFEN,
      aufWahl: stufe => starteSchicht(stufe)
    });
  }

  function starteSchicht(stufe) {
    state = {
      stufe,
      rest: SCHICHT_SEKUNDEN,
      vertrauen: 0,
      fokus: 0,
      geholfen: 0,
      verpasst: 0,
      queue: [],
      aktivId: null,
      station: null,
      meldung: "Die erste Lerngruppe ist da. Such dir einen Auftrag aus.",
      upgrades: new Set(),
      helferTimer: { mila: 12, jonas: 16, samira: 18 },
      spawnIn: 0
    };
    for (let i = 0; i < 3; i++) spawnAuftrag();
    api.setzePunkte(0);
    api.setzeZeit(formatSek(state.rest));
    render();
    api.loop(tick);
  }

  function spawnAuftrag() {
    if (!state || state.queue.length >= maxWarteschlange(state.upgrades)) return false;
    const basis = waehleAuftrag(state.stufe, Math.random, letzteIds);
    if (!basis) return false;
    letzteIds = [basis.id, ...letzteIds].slice(0, 8);
    const maxGeduld = geduldFuer(basis, state.upgrades);
    state.queue.push({
      instanz: "a" + naechsteInstanz++,
      auftrag: basis,
      geduld: maxGeduld,
      maxGeduld
    });
    return true;
  }

  function aktiverAuftrag() {
    return state?.queue.find(a => a.instanz === state.aktivId) || null;
  }

  function waehleAuftragKarte(instanz) {
    state.aktivId = instanz;
    state.station = null;
    state.meldung = "Wähle jetzt die passende Station.";
    render();
  }

  function waehleStation(station) {
    const aktiv = aktiverAuftrag();
    if (!aktiv) {
      state.meldung = "Wähle zuerst einen Auftrag aus der Warteschlange.";
      render();
      return;
    }
    if (station !== aktiv.auftrag.station) {
      aktiv.geduld = Math.max(0, aktiv.geduld - 8);
      state.meldung = `Das hilft hier noch nicht. Versuch es mit einer anderen Station.`;
      render();
      return;
    }
    state.station = station;
    state.meldung = `${STATIONEN[station].titel} bereit: Löse die kurze Aufgabe.`;
    render();
    const eingabe = api.flaeche.querySelector("#lt-antwort");
    if (eingabe) eingabe.focus();
  }

  function pruefeAntwort(eingabe) {
    const aktiv = aktiverAuftrag();
    if (!aktiv) return;
    if (istAntwortRichtig(aktiv.auftrag, eingabe)) {
      schliesseAuftrag(aktiv, false);
    } else {
      aktiv.geduld = Math.max(0, aktiv.geduld - 12);
      state.meldung = hinweisFuer(aktiv.auftrag);
      render();
    }
  }

  function schliesseAuftrag(job, viaHelfer) {
    const anteil = job.maxGeduld > 0 ? job.geduld / job.maxGeduld : 0;
    const plus = belohnungFuer(job.auftrag, anteil, state.upgrades, viaHelfer);
    const zeitbonus = zeitbonusFuer(viaHelfer);
    state.vertrauen += plus.vertrauen;
    state.fokus += plus.fokus;
    state.rest += zeitbonus;
    state.geholfen++;
    state.queue = state.queue.filter(a => a.instanz !== job.instanz);
    if (state.aktivId === job.instanz) {
      state.aktivId = null;
      state.station = null;
    }
    api.setzePunkte(state.vertrauen);
    api.setzeZeit(formatSek(state.rest));
    state.meldung = viaHelfer
      ? `${helferNameFuer(job.auftrag.station)} hat ${job.auftrag.person} geholfen: +${plus.vertrauen} Vertrauen.`
      : `${job.auftrag.typ} erledigt: +${plus.vertrauen} Vertrauen, +${plus.fokus} Fokus, +${zeitbonus} s. Richtig: ${antwortAnzeige(job.auftrag)}. ${job.auftrag.erklaerung}`;
    if (state.queue.length < 2) spawnAuftrag();
    render();
  }

  function helferNameFuer(station) {
    const eintrag = Object.entries(HELFER).find(([id, h]) => state.upgrades.has(id) && h.stationen.includes(station));
    return eintrag ? eintrag[1].name : "Ein Lernhelfer";
  }

  function kaufe(id) {
    const upgrade = UPGRADES.find(u => u.id === id);
    if (!kannKaufen(upgrade, state.fokus, state.upgrades)) return;
    state.fokus -= upgrade.kosten;
    state.upgrades.add(id);
    if (HELFER[id]) state.helferTimer[id] = 3;
    state.meldung = `${upgrade.titel} freigeschaltet.`;
    render();
  }

  function autoHelfer(dt) {
    for (const [id, helfer] of Object.entries(HELFER)) {
      if (!state.upgrades.has(id)) continue;
      state.helferTimer[id] = Math.max(0, state.helferTimer[id] - dt);
      if (state.helferTimer[id] > 0) continue;
      const job = state.queue.find(a => a.instanz !== state.aktivId && helfer.stationen.includes(a.auftrag.station));
      if (job) schliesseAuftrag(job, true);
      state.helferTimer[id] = helfer.interval;
    }
  }

  function tick(dt) {
    if (!state || fertig) return;
    state.rest -= dt;
    api.setzeZeit(formatSek(state.rest));
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      spawnAuftrag();
      state.spawnIn = 9 + Math.random() * 5;
      renderTimer = 0;
    }
    state.queue = tickGeduld(state.queue, dt);
    const vorher = state.queue.length;
    const abgelaufen = state.queue.filter(a => a.geduld <= 0);
    if (abgelaufen.length) {
      state.verpasst += abgelaufen.length;
      if (abgelaufen.some(a => a.instanz === state.aktivId)) { state.aktivId = null; state.station = null; }
      state.queue = state.queue.filter(a => a.geduld > 0);
      state.meldung = `${abgelaufen.length} Auftrag${abgelaufen.length > 1 ? "e" : ""} ist weitergezogen.`;
      renderTimer = 0;
    }
    autoHelfer(dt);
    updateLiveWerte();
    renderTimer -= dt;
    if (renderTimer <= 0 || vorher !== state.queue.length) {
      updateGeduldBalken();
      renderTimer = 0.5;
    }
    if (state.rest <= 0) beendeSchicht();
  }

  function beendeSchicht() {
    if (fertig) return;
    fertig = true;
    api.loopStopp();
    const upgradeText = state.upgrades.size ? [...state.upgrades].map(id => UPGRADES.find(u => u.id === id)?.titel).filter(Boolean).join(", ") : "keine";
    api.vorbei(state.vertrauen, `
      <p>Geholfen: ${state.geholfen} · verpasst: ${state.verpasst} · Fokus übrig: ${state.fokus}</p>
      <p>Freigeschaltet: ${esc(upgradeText)}</p>`);
  }

  function updateLiveWerte() {
    const f = api.flaeche.querySelector("#lt-fokus");
    const g = api.flaeche.querySelector("#lt-geholfen");
    const v = api.flaeche.querySelector("#lt-verpasst");
    const q = api.flaeche.querySelector("#lt-queue-count");
    if (f) f.textContent = state.fokus;
    if (g) g.textContent = state.geholfen;
    if (v) v.textContent = state.verpasst;
    if (q) q.textContent = `${state.queue.length}/${maxWarteschlange(state.upgrades)}`;
  }

  function updateGeduldBalken() {
    state.queue.forEach(job => {
      const balken = api.flaeche.querySelector(`[data-geduld="${job.instanz}"]`);
      if (balken) balken.style.width = `${Math.max(0, Math.round(100 * job.geduld / job.maxGeduld))}%`;
    });
  }

  function render() {
    if (!state) return;
    const aktiv = aktiverAuftrag();
    api.flaeche.innerHTML = `
      <div class="lt-spiel">
        <div class="lt-hud">
          <span>Fokus: <b id="lt-fokus">${state.fokus}</b></span>
          <span>Geholfen: <b id="lt-geholfen">${state.geholfen}</b></span>
          <span>Verpasst: <b id="lt-verpasst">${state.verpasst}</b></span>
          <span>Warteschlange: <b id="lt-queue-count">${state.queue.length}/${maxWarteschlange(state.upgrades)}</b></span>
        </div>
        <div class="lt-layout">
          <section class="lt-panel lt-queue-panel" aria-label="Warteschlange">
            <h2>Warteschlange</h2>
            <div class="lt-queue">${state.queue.map(jobHtml).join("") || '<p class="lt-leer">Gerade fragt niemand. Atme einmal durch.</p>'}</div>
          </section>
          <section class="lt-panel lt-work-panel" aria-label="Arbeitsbereich">
            <h2>Lernhilfe bauen</h2>
            <div class="lt-stationen">${Object.entries(STATIONEN).map(([id, s]) => stationHtml(id, s, aktiv)).join("")}</div>
            <div class="lt-auftrag">${arbeitsHtml(aktiv)}</div>
            <p class="lt-meldung" role="status" aria-live="polite">${esc(state.meldung)}</p>
          </section>
          <section class="lt-panel lt-upgrade-panel" aria-label="Upgrades">
            <h2>Upgrades & Lernhelfer</h2>
            <div class="lt-upgrades">${UPGRADES.map(upgradeHtml).join("")}</div>
          </section>
        </div>
      </div>`;

    api.flaeche.querySelectorAll(".lt-job").forEach(btn =>
      btn.addEventListener("click", () => waehleAuftragKarte(btn.dataset.instanz)));
    api.flaeche.querySelectorAll(".lt-station").forEach(btn =>
      btn.addEventListener("click", () => waehleStation(btn.dataset.station)));
    api.flaeche.querySelectorAll(".lt-upgrade").forEach(btn =>
      btn.addEventListener("click", () => kaufe(btn.dataset.upgrade)));
    const form = api.flaeche.querySelector("#lt-form");
    if (form) form.addEventListener("submit", ev => {
      ev.preventDefault();
      pruefeAntwort(api.flaeche.querySelector("#lt-antwort")?.value || "");
    });
    api.flaeche.querySelectorAll(".lt-option").forEach(btn =>
      btn.addEventListener("click", () => pruefeAntwort(btn.dataset.wert)));
    updateGeduldBalken();
  }

  function jobHtml(job) {
    const a = job.auftrag;
    const aktiv = state.aktivId === job.instanz;
    return `<button type="button" class="lt-job ${aktiv ? "ist-aktiv" : ""} ${stationKlasse(a.station)}" data-instanz="${job.instanz}">
      <span class="lt-person">${esc(a.person)}</span>
      <strong>${esc(a.typ)}</strong>
      <span>${esc(a.thema)} · ${esc(a.fach)}</span>
      <span class="lt-geduld"><span data-geduld="${job.instanz}" style="width:${Math.round(100 * job.geduld / job.maxGeduld)}%"></span></span>
    </button>`;
  }

  function stationHtml(id, s, aktiv) {
    const passt = aktiv && aktiv.auftrag.station === id;
    const gewaehlt = state.station === id;
    return `<button type="button" class="lt-station ${stationKlasse(id)} ${passt ? "passt" : ""} ${gewaehlt ? "ist-gewaehlt" : ""}" data-station="${id}">
      <strong>${esc(s.titel)}</strong><span>${esc(s.kurz)}</span>
    </button>`;
  }

  function arbeitsHtml(job) {
    if (!job) return `<p class="lt-leer">Wähle links einen Auftrag. Danach entscheidest du, welche Station hilft.</p>`;
    const a = job.auftrag;
    if (state.station !== a.station) {
      return `<div class="lt-auftragkopf">
        <span class="abzeichen">${esc(a.fach)}</span>
        <h3>${esc(a.person)} braucht Hilfe: ${esc(a.thema)}</h3>
        <p>${esc(a.typ)}: Wähle die passende Station.</p>
      </div>`;
    }
    if (a.art === "wahl") {
      return `<div class="lt-aufgabenkarte">
        <span class="abzeichen">${esc(a.fach)}</span>
        <h3>${esc(a.frage)}</h3>
        <div class="lt-optionen">${a.optionen.map(o => `<button type="button" class="lt-option" data-wert="${esc(o)}">${esc(o)}</button>`).join("")}</div>
        <p>Wähle erst selbst eine Antwort aus. Die Erklärung kommt nach der Abgabe.</p>
      </div>`;
    }
    return `<form id="lt-form" class="lt-aufgabenkarte">
      <span class="abzeichen">${esc(a.fach)}</span>
      <label for="lt-antwort">${esc(a.frage)}</label>
      <div class="lt-eingabezeile">
        <input id="lt-antwort" inputmode="decimal" autocomplete="off" spellcheck="false">
        <span>${esc(a.einheit || "")}</span>
        <button type="submit" class="knopf klein">Hilfe abgeben</button>
      </div>
      <p>Komma und Punkt funktionieren beide. Die Erklärung kommt nach der Abgabe.</p>
    </form>`;
  }

  function upgradeHtml(u) {
    const gekauft = state.upgrades.has(u.id);
    const erlaubt = kannKaufen(u, state.fokus, state.upgrades);
    const helfer = HELFER[u.id];
    const timer = helfer && gekauft ? ` · bereit in ${Math.ceil(state.helferTimer[u.id] || 0)} s` : "";
    return `<button type="button" class="lt-upgrade ${gekauft ? "ist-gekauft" : ""}" data-upgrade="${u.id}" ${gekauft || !erlaubt ? "disabled" : ""}>
      <strong>${esc(u.titel)}</strong>
      <span>${gekauft ? "aktiv" + timer : `${u.kosten} Fokus`}</span>
      <small>${esc(u.text)}</small>
    </button>`;
  }

  api.neustartCb(reset);
  reset();
}

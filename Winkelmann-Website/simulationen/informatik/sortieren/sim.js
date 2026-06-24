// Sortier-Visualisierer — Bubble Sort im Schrittmodus.
// Jeder Schritt ist genau ein Vergleich (ggf. mit Tausch); die Engine speichert
// den Verlauf, sodass man schrittweise vor- und zurückgehen kann.
// Der „sortierte Bereich" am Ende der Liste wird farblich hervorgehoben.

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "informatik/sortieren",
  titel: "Sortieren: Bubble Sort",
  modus: "schrittweise",
  tMax: 1e6,
  raster: false,
  werkzeuge: false,
  parameter: [
    { id: "n",         label: "Anzahl Elemente",      einheit: "", min: 4, max: 30, schritt: 1, start: 12 },
    { id: "anordnung", label: "Startanordnung (Code)", einheit: "", min: 0, max: 99, schritt: 1, start: 7 }
  ],
  anzeigen: [
    { id: "vergleiche", label: "Vergleiche", einheit: "", stellen: 0 },
    { id: "tausche",    label: "Tausche",    einheit: "", stellen: 0 },
    { id: "durchlauf",  label: "Durchläufe", einheit: "", stellen: 0 }
  ],
  presets: [
    { name: "Zufällig",                      werte: { anordnung: 7 } },
    { name: "Absteigend (schlechtester Fall)", werte: { anordnung: 0 } },
    { name: "Bereits sortiert (bester Fall)",  werte: { anordnung: 1 } }
  ],
  vorhersage: {
    frage: "Du verdoppelst die Anzahl der Elemente (z. B. 10 → 20). Wie viele Vergleiche braucht Bubble Sort im schlechtesten Fall ungefähr?",
    optionen: ["Etwa doppelt so viele", "Etwa viermal so viele", "Genauso viele"],
    aufloesung: "Etwa viermal so viele: Im schlechtesten Fall braucht Bubble Sort n·(n−1)/2 Vergleiche — der Aufwand wächst quadratisch mit n. Bei n = 10 sind es 45, bei n = 20 schon 190 Vergleiche."
  },
  beobachtung: [
    "Starte mit „Bereits sortiert“. Wie viele Vergleiche braucht der Algorithmus, um das zu erkennen?",
    "Wähle „Absteigend“ mit n = 10. Prüfe: Die Zahl der Vergleiche ist 9 + 8 + … + 1 = 45.",
    "Beobachte den grünen Bereich: Warum steht nach jedem Durchlauf ein weiteres Element endgültig fest?",
    "Gehe mit „Zurück“ einige Schritte rückwärts: Kannst du vorhersagen, welcher Vergleich als Nächstes kommt?"
  ],
  modellgrenzen: "Bubble Sort mit Abbruch, sobald ein Durchlauf ohne Tausch bleibt. Startanordnung: Code 0 = absteigend, 1 = aufsteigend sortiert, jeder andere Code mischt reproduzierbar zufällig.",
  bilanz: {
    vergleiche:     { label: "Vergleiche",         einheit: "", stellen: 0 },
    tausche:        { label: "Tausche",            einheit: "", stellen: 0 },
    fehlstellungen: { label: "Fehlstellungen",     einheit: "", stellen: 0 }
  }
};

// Reproduzierbarer Zufall (gleiche Logik wie in der Aufgaben-Engine)
function mulberry32(saat) {
  return function () {
    saat |= 0; saat = (saat + 0x6D2B79F5) | 0;
    let t = Math.imul(saat ^ (saat >>> 15), 1 | saat);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function startliste(n, anordnung) {
  const liste = Array.from({ length: n }, (_, i) => i + 1);
  if (anordnung === 0) return liste.reverse();
  if (anordnung === 1) return liste;
  const rng = mulberry32(anordnung);
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  return liste;
}

export function init(p) {
  const n = Math.round(p.n);
  return {
    t: 0,
    liste: startliste(n, Math.round(p.anordnung)),
    j: 0,
    grenze: n - 1,
    getauscht: false,
    vergleiche: 0, tausche: 0, durchlauf: 0,
    aktiv: [],         // gerade verglichenes Paar
    ebenGetauscht: false,
    fertig: n <= 1
  };
}

// Ein Schritt = ein Vergleich (ggf. mit Tausch)
export function update(z) {
  if (z.fertig) return;
  const l = z.liste;
  z.vergleiche++;
  z.aktiv = [z.j, z.j + 1];
  z.ebenGetauscht = false;
  if (l[z.j] > l[z.j + 1]) {
    [l[z.j], l[z.j + 1]] = [l[z.j + 1], l[z.j]];
    z.tausche++;
    z.getauscht = true;
    z.ebenGetauscht = true;
  }
  z.j++;
  if (z.j >= z.grenze) {            // Durchlauf beendet
    z.durchlauf++;
    z.grenze--;
    if (!z.getauscht || z.grenze <= 0) {
      z.fertig = true;
      z.aktiv = [];
    }
    z.j = 0;
    z.getauscht = false;
  }
  z.t++;
}

export function messwerte(z) {
  return { vergleiche: z.vergleiche, tausche: z.tausche, durchlauf: z.durchlauf };
}

export function istFertig(z) { return z.fertig; }

export function bilanz(z) {
  let fehlstellungen = 0;
  for (let i = 0; i + 1 < z.liste.length; i++) {
    if (z.liste[i] > z.liste[i + 1]) fehlstellungen++;
  }
  return { vergleiche: z.vergleiche, tausche: z.tausche, fehlstellungen };
}

export function weltBereich(p) {
  const n = Math.round(p.n);
  return { xMin: 0, xMax: n, yMin: 0, yMax: n * 1.12 };
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const n = z.liste.length;
  const breite = 0.8;
  z.liste.forEach((wert, i) => {
    const istAktiv = z.aktiv.includes(i) && !z.fertig;
    const istSortiert = z.fertig || i > z.grenze;
    ctx.fillStyle = istSortiert ? stil.ok : stil.akzent;
    if (istAktiv) ctx.fillStyle = z.ebenGetauscht ? stil.fehler : stil.text;
    const x = welt.px(i + (1 - breite) / 2);
    const y = welt.py(wert);
    ctx.fillRect(x, y, welt.laenge(breite), welt.py(0) - y);
    if (n <= 16) {
      ctx.fillStyle = stil.beschriftung;
      ctx.font = stil.schrift;
      ctx.textAlign = "center";
      ctx.fillText(formatZahl(wert, 0), welt.px(i + 0.5), y - 4);
    }
  });
  // Statuszeile im Canvas (gut für den Beamer)
  ctx.fillStyle = stil.text;
  ctx.font = "bold " + stil.schrift;
  ctx.textAlign = "left";
  const meldung = z.fertig
    ? `Fertig sortiert: ${formatZahl(z.vergleiche, 0)} Vergleiche, ${formatZahl(z.tausche, 0)} Tausche`
    : `Durchlauf ${formatZahl(z.durchlauf + 1, 0)} — vergleiche Position ${formatZahl(z.aktiv[0] ?? 0, 0)} und ${formatZahl((z.aktiv[1] ?? 1), 0)}`;
  ctx.fillText(meldung, welt.px(0) + 4, welt.py(welt.bereich.yMax) + 16);
}

// ---------- Prüffälle ----------
// Referenzwerte unabhängig vorberechnet; Tauschzahl = Inversionszahl der Startliste.

export const pruefFaelle = [
  {
    name: "n = 10, absteigend (schlechtester Fall)",
    parameter: { n: 10, anordnung: 0 },
    toleranzProzent: 0.1,
    soll: { vergleiche: 45, tausche: 45, fehlstellungen: 0 }
  },
  {
    name: "n = 10, bereits sortiert (bester Fall)",
    parameter: { n: 10, anordnung: 1 },
    toleranzProzent: 0.1,
    soll: { vergleiche: 9, tausche: 0, fehlstellungen: 0 }
  },
  {
    name: "n = 10, Zufallsanordnung Code 7",
    parameter: { n: 10, anordnung: 7 },
    toleranzProzent: 0.1,
    soll: { vergleiche: 45, tausche: 23, fehlstellungen: 0 }
  }
];

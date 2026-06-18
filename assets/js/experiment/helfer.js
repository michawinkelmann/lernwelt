// helfer.js — gemeinsame Bausteine der interaktiven Experimente.
// Kernidee aller Experimente: realitätsnahe MESSPRAXIS — selbst ablesen,
// selbst protokollieren, selbst auswerten. Die kleine Messstreuung ist
// deterministisch geseedet, damit pruefFaelle/TESTS in Node laufen.

// ---------- deterministischer Zufall ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedAus(text) {
  let s = 17;
  for (const z of String(text)) s = (s * 31 + z.charCodeAt(0)) >>> 0;
  return s;
}
// reproduzierbare Streuung ±spanne/2 für einen Schlüssel (z. B. "geraet:einstellung")
export function streuung(schluessel, spanne) {
  return (mulberry32(seedAus(schluessel))() - 0.5) * spanne;
}

// ---------- Eingabe/Format ----------
export function parseDezimal(text) {
  const n = Number(String(text).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
export function komma(zahl, stellen = 2) {
  return Number(zahl).toFixed(stellen).replace(".", ",");
}
export function ablesungOk(eingabe, wahr, toleranz) {
  return Number.isFinite(eingabe) && Math.abs(eingabe - wahr) <= toleranz;
}
export const esc = s => String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));

// ---------- Statistik ----------
export function mittel(werte) {
  const v = werte.filter(Number.isFinite);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
}
// lineare Regression y = m·x + b (für Auswertungen wie T²–l oder U₀–f)
export function regression(punkte) {
  const n = punkte.length;
  if (n < 2) return { m: NaN, b: NaN };
  const sx = punkte.reduce((a, p) => a + p.x, 0), sy = punkte.reduce((a, p) => a + p.y, 0);
  const sxx = punkte.reduce((a, p) => a + p.x * p.x, 0), sxy = punkte.reduce((a, p) => a + p.x * p.y, 0);
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { m, b: (sy - m * sx) / n };
}

// ---------- Browser-Helfer (nur in starteExperiment-Kontexten nutzen) ----------
export function farbe(name, fallback = "#333") {
  const w = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return w || fallback;
}
export function reduzierteBewegung() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Phasen-Tabs (Aufbau/Durchführung/Auswertung …)
export function bauePhasen(container, phasen, beiWechsel) {
  const leiste = document.createElement("div");
  leiste.className = "exp-phasen";
  leiste.setAttribute("role", "tablist");
  leiste.setAttribute("aria-label", "Phasen des Experiments");
  leiste.innerHTML = phasen.map((p, i) =>
    `<button role="tab" data-phase="${p.id}" aria-selected="${i === 0}">${i + 1} · ${esc(p.label)}</button>`).join("");
  container.appendChild(leiste);
  const tabs = [...leiste.querySelectorAll("[role=tab]")];
  function wechsle(id) {
    tabs.forEach(t => t.setAttribute("aria-selected", String(t.dataset.phase === id)));
    beiWechsel(id);
  }
  tabs.forEach(t => t.addEventListener("click", () => wechsle(t.dataset.phase)));
  return wechsle;
}

// Messtabelle als CSV herunterladen (Dezimalkomma, Semikolon — Excel-DE-freundlich)
export function csvHerunterladen(dateiname, spalten, zeilen) {
  const inhalt = [spalten.join(";")]
    .concat(zeilen.map(z => z.map(w => typeof w === "number" ? komma(w, 3) : String(w)).join(";")))
    .join("\r\n");
  const blob = new Blob(["﻿" + inhalt], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = dateiname;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

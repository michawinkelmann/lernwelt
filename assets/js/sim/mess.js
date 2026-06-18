// mess.js — Messbarkeit als Kernfunktion: Messreihe, Live-Diagramme, Messtabelle,
// CSV-Export (deutsches Format) und zuschaltbare Messwerkzeuge (Lineal, Winkelmesser, Stoppuhr).

import { formatZahl, schoeneSchrittweite } from "./welt.js";

// ---------- Messreihe ----------

export class Messreihe {
  // spalten: [{id, label, einheit}], erste Spalte ist die x-Größe (meist t)
  constructor(spalten, abtastDt = 1 / 50) {
    this.spalten = spalten;
    this.abtastDt = abtastDt;
    this.leeren();
  }
  leeren() { this.zeilen = []; this.naechsteZeit = 0; }
  // nimmt nur ca. alle abtastDt Sekunden Modellzeit einen Messpunkt auf
  erfasse(werte) {
    if (!this.spalten.length) return;   // statisch ohne Anzeigen: nichts aufzeichnen
    const t = werte[this.spalten[0].id];
    if (t + 1e-9 < this.naechsteZeit) return;
    this.naechsteZeit = t + this.abtastDt;
    if (this.zeilen.length < 12000) this.zeilen.push(this.spalten.map(s => werte[s.id]));
  }
  alsCsv() {
    const kopf = this.spalten.map(s => s.label + (s.einheit ? " in " + s.einheit : "")).join(";");
    const koerper = this.zeilen.map(z => z.map(w => formatZahl(w, 4)).join(";")).join("\n");
    return "﻿" + kopf + "\n" + koerper; // BOM für Excel
  }
}

export function ladeCsvHerunter(messreihe, dateiname) {
  const blob = new Blob([messreihe.alsCsv()], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = dateiname;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

// ---------- Live-Diagramm ----------

export class Diagramm {
  constructor(canvas, einstellung) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.e = einstellung; // {xLabel, xEinheit, yLabel, yEinheit, farbe}
    this.punkte = [];
  }
  leeren() { this.punkte = []; this.zeichne({}); }
  sammle(x, y) { if (this.punkte.length < 12000) this.punkte.push([x, y]); }
  zeichne(stil) {
    const dpr = window.devicePixelRatio || 1;
    const b = this.canvas.clientWidth || 300, h = this.canvas.clientHeight || 170;
    if (this.canvas.width !== Math.round(b * dpr)) { this.canvas.width = Math.round(b * dpr); this.canvas.height = Math.round(h * dpr); }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, b, h);
    const rand = { l: 44, r: 8, o: 8, u: 26 };
    const p = this.punkte;
    let xMax = 1, yMin = 0, yMax = 1;
    if (p.length) {
      xMax = Math.max(1e-6, ...p.map(q => q[0]));
      yMin = Math.min(0, ...p.map(q => q[1]));
      yMax = Math.max(1e-6, ...p.map(q => q[1]));
    }
    if (yMax - yMin < 1e-9) yMax = yMin + 1;
    const px = x => rand.l + (x / xMax) * (b - rand.l - rand.r);
    const py = y => h - rand.u - ((y - yMin) / (yMax - yMin)) * (h - rand.o - rand.u);
    // Raster + Ticks
    ctx.strokeStyle = stil.raster || "rgba(127,127,127,.25)";
    ctx.fillStyle = stil.beschriftung || "#777";
    ctx.font = "11px sans-serif";
    ctx.lineWidth = 1;
    const sx = schoeneSchrittweite(xMax, 5), sy = schoeneSchrittweite(yMax - yMin, 4);
    ctx.beginPath();
    for (let x = 0; x <= xMax + 1e-9; x += sx) { ctx.moveTo(px(x), py(yMin)); ctx.lineTo(px(x), py(yMax)); }
    for (let y = Math.ceil(yMin / sy) * sy; y <= yMax + 1e-9; y += sy) { ctx.moveTo(px(0), py(y)); ctx.lineTo(px(xMax), py(y)); }
    ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let x = 0; x <= xMax + 1e-9; x += sx) ctx.fillText(formatZahl(x, sx < 1 ? 1 : 0), px(x), h - rand.u + 4);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let y = Math.ceil(yMin / sy) * sy; y <= yMax + 1e-9; y += sy) ctx.fillText(formatZahl(y, sy < 1 ? 1 : 0), rand.l - 4, py(y));
    // Achsentitel
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(`${this.e.yLabel} in ${this.e.yEinheit}`, 2, 2);
    ctx.textAlign = "right";
    ctx.fillText(`${this.e.xLabel} in ${this.e.xEinheit}`, b - 2, h - rand.u + 4);
    // Datenlinie
    if (p.length > 1) {
      ctx.strokeStyle = this.e.farbe || "#19599f";
      ctx.lineWidth = stil.linienstaerke || 2;
      ctx.beginPath();
      p.forEach(([x, y], i) => { i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y)); });
      ctx.stroke();
    }
  }
}

// ---------- Messwerkzeuge (Lineal, Winkelmesser, Stoppuhr) ----------
// Arbeiten auf dem Sim-Canvas; Umrechnung Pixel ↔ Welt über das Welt-Objekt.

export class Messwerkzeuge {
  constructor(canvas, welt, melde) {
    this.canvas = canvas;
    this.welt = welt;
    this.melde = melde;       // Statusausgabe (Funktion mit Text)
    this.modus = "aus";       // aus | lineal | winkel
    this.punkte = [];
    this.zwischenzeiten = [];
    canvas.addEventListener("pointerdown", e => this.klick(e));
  }
  setzeModus(modus) {
    this.modus = modus;
    this.punkte = [];
    if (modus === "lineal") this.melde("Lineal: zwei Punkte antippen.");
    else if (modus === "winkel") this.melde("Winkelmesser: Scheitel, dann zwei Schenkelpunkte antippen.");
    else this.melde("");
  }
  klick(e) {
    if (this.modus === "aus") return;
    const r = this.canvas.getBoundingClientRect();
    const x = this.welt.weltX(e.clientX - r.left);
    const y = this.welt.weltY(e.clientY - r.top);
    this.punkte.push([x, y]);
    if (this.modus === "lineal" && this.punkte.length === 2) {
      const [a, b] = this.punkte;
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      this.melde(`Abstand: ${formatZahl(d, 2)} m`);
    }
    if (this.modus === "lineal" && this.punkte.length > 2) this.punkte = [this.punkte[2]];
    if (this.modus === "winkel" && this.punkte.length === 3) {
      const [s, a, b] = this.punkte; // Scheitel zuerst
      const w1 = Math.atan2(a[1] - s[1], a[0] - s[0]);
      const w2 = Math.atan2(b[1] - s[1], b[0] - s[0]);
      let grad = Math.abs((w2 - w1) * 180 / Math.PI);
      if (grad > 180) grad = 360 - grad;
      this.melde(`Winkel: ${formatZahl(grad, 1)}°`);
    }
    if (this.modus === "winkel" && this.punkte.length > 3) this.punkte = [];
  }
  stoppuhr(t) {
    this.zwischenzeiten.push(t);
    this.melde("Zwischenzeiten: " + this.zwischenzeiten.map(z => formatZahl(z, 2) + " s").join(" · "));
  }
  leeren() { this.punkte = []; this.zwischenzeiten = []; this.melde(""); }
  // Overlay nach der Simulation zeichnen
  zeichne(stil) {
    if (this.modus === "aus" || this.punkte.length === 0) return;
    const { welt } = this;
    const ctx = welt.ctx;
    ctx.save();
    ctx.fillStyle = stil.akzent;
    ctx.strokeStyle = stil.akzent;
    ctx.lineWidth = 2;
    this.punkte.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(welt.px(x), welt.py(y), 5, 0, 2 * Math.PI);
      ctx.fill();
    });
    if (this.punkte.length >= 2) {
      ctx.beginPath();
      if (this.modus === "lineal") {
        ctx.moveTo(welt.px(this.punkte[0][0]), welt.py(this.punkte[0][1]));
        ctx.lineTo(welt.px(this.punkte[1][0]), welt.py(this.punkte[1][1]));
      } else {
        // Winkel: Scheitel → Schenkel
        ctx.moveTo(welt.px(this.punkte[1][0]), welt.py(this.punkte[1][1]));
        ctx.lineTo(welt.px(this.punkte[0][0]), welt.py(this.punkte[0][1]));
        if (this.punkte[2]) ctx.lineTo(welt.px(this.punkte[2][0]), welt.py(this.punkte[2][1]));
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

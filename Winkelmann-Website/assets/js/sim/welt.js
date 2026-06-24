// welt.js — Weltkoordinaten (SI-Einheiten) ↔ Canvas-Pixel, Raster und Zahlformatierung.
// Das Modell rechnet ausschließlich in Weltkoordinaten (m, s, …); erst hier wird
// auf den Bildschirm abgebildet. Maßstab ist in x und y identisch (keine Verzerrung).

// Deutsche Zahlformatierung: 3,5 statt 3.5
export function formatZahl(wert, stellen = 2) {
  if (!isFinite(wert)) return "–";
  return wert.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
}

export function formatGroesse(wert, einheit, stellen = 2) {
  return formatZahl(wert, stellen) + (einheit ? " " + einheit : "");
}

// „Schöne" Schrittweite für Achsen-Ticks: 1, 2 oder 5 mal Zehnerpotenz
export function schoeneSchrittweite(spanne, zielAnzahl = 8) {
  const roh = spanne / zielAnzahl;
  const zehner = Math.pow(10, Math.floor(Math.log10(roh)));
  for (const f of [1, 2, 5, 10]) {
    if (roh <= f * zehner) return f * zehner;
  }
  return 10 * zehner;
}

export class Welt {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.bereich = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
    this.rand = 36; // Pixel-Rand für Achsenbeschriftung
    this.passeCanvasAn();
  }

  // Canvas an Elementgröße und Gerätepixel anpassen (scharf auf Retina/Handys)
  passeCanvasAn() {
    const dpr = window.devicePixelRatio || 1;
    const breite = this.canvas.clientWidth || 600;
    const hoehe = this.canvas.clientHeight || 400;
    if (this.canvas.width !== Math.round(breite * dpr) || this.canvas.height !== Math.round(hoehe * dpr)) {
      this.canvas.width = Math.round(breite * dpr);
      this.canvas.height = Math.round(hoehe * dpr);
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.breite = breite;
    this.hoehe = hoehe;
    this.berechneMassstab();
  }

  setzeBereich(bereich) {
    this.bereich = { ...bereich };
    this.berechneMassstab();
  }

  berechneMassstab() {
    const b = this.bereich;
    const nutzbarB = Math.max(10, this.breite - 2 * this.rand);
    const nutzbarH = Math.max(10, this.hoehe - 2 * this.rand);
    // gleicher Maßstab in beiden Richtungen
    this.massstab = Math.min(nutzbarB / (b.xMax - b.xMin), nutzbarH / (b.yMax - b.yMin));
    this.x0 = this.rand;
    this.y0 = this.hoehe - this.rand;
  }

  // Welt → Pixel
  px(x) { return this.x0 + (x - this.bereich.xMin) * this.massstab; }
  py(y) { return this.y0 - (y - this.bereich.yMin) * this.massstab; }
  laenge(meter) { return meter * this.massstab; }
  // Pixel → Welt (für Messwerkzeuge)
  weltX(px) { return this.bereich.xMin + (px - this.x0) / this.massstab; }
  weltY(py) { return this.bereich.yMin + (this.y0 - py) / this.massstab; }

  leeren(farbe) {
    this.ctx.save();
    this.ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    this.ctx.fillStyle = farbe;
    this.ctx.fillRect(0, 0, this.breite, this.hoehe);
    this.ctx.restore();
  }

  // Karo-Raster in Weltkoordinaten plus beschriftete Achsen (x/y in m)
  zeichneRaster(stil) {
    const { ctx, bereich: b } = this;
    const schritt = schoeneSchrittweite(Math.max(b.xMax - b.xMin, b.yMax - b.yMin));
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = stil.raster;
    ctx.fillStyle = stil.beschriftung;
    ctx.font = stil.schrift || "12px sans-serif";
    ctx.beginPath();
    for (let x = Math.ceil(b.xMin / schritt) * schritt; x <= b.xMax + 1e-9; x += schritt) {
      ctx.moveTo(this.px(x), this.py(b.yMin));
      ctx.lineTo(this.px(x), this.py(b.yMax));
    }
    for (let y = Math.ceil(b.yMin / schritt) * schritt; y <= b.yMax + 1e-9; y += schritt) {
      ctx.moveTo(this.px(b.xMin), this.py(y));
      ctx.lineTo(this.px(b.xMax), this.py(y));
    }
    ctx.stroke();
    // Achsenbeschriftung
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let x = Math.ceil(b.xMin / schritt) * schritt; x <= b.xMax + 1e-9; x += schritt) {
      ctx.fillText(formatZahl(x, schritt < 1 ? 1 : 0), this.px(x), this.py(b.yMin) + 6);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = Math.ceil(b.yMin / schritt) * schritt; y <= b.yMax + 1e-9; y += schritt) {
      ctx.fillText(formatZahl(y, schritt < 1 ? 1 : 0), this.px(b.xMin) - 6, this.py(y));
    }
    ctx.textAlign = "left";
    ctx.fillText("m", this.px(b.xMax) - 14, this.py(b.yMin) + 6);
    ctx.restore();
  }
}

// konvergenz.js — Gesetz der großen Zahlen: Würfel/Glücksrad mit n Seiten wiederholt werfen,
// kumulierte relative Häufigkeiten als Balken zeigen, theoretischen Wert 1/n als Linie markieren.
// Mit wachsender Wurfzahl nähern sich die Balken sichtbar der Linie an. POE-freundlich.
// Reines Vanilla-JS/SVG, keine externen Bibliotheken. params = { seiten:6 }

// --- Reine Rechenlogik (ohne DOM, daher testbar) ---
// zaehle: zählt absolute Häufigkeiten der Augenzahlen 1..seiten aus einer Wurfliste.
export function zaehle(wuerfe, seiten) {
  const absolut = new Array(seiten).fill(0);
  for (const w of wuerfe) {
    if (w >= 1 && w <= seiten) absolut[w - 1]++;
  }
  return absolut;
}

// relativeHaeufigkeiten: rechnet absolute Häufigkeiten in relative um (Summe = 1, falls n > 0).
export function relativeHaeufigkeiten(absolut, gesamt) {
  if (!gesamt) return absolut.map(() => 0);
  return absolut.map((a) => a / gesamt);
}

export function mount(container, params) {
  const p = params || {};
  const seiten = Math.min(20, Math.max(2, Math.round(p.seiten || 6)));
  const theorie = 1 / seiten;

  // Zustand: kumulierte absolute Häufigkeiten + Gesamtzahl der Würfe.
  let absolut = new Array(seiten).fill(0);
  let gesamt = 0;

  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2);align-items:center";

  // Vorhersage-Hinweis (POE).
  const poe = document.createElement("p");
  poe.style.cssText = "margin:0;text-align:center;font-size:.95rem;color:var(--text-leise);max-width:30em";
  poe.innerHTML =
    `<strong>Vorhersage:</strong> Welche H&ouml;he werden die Balken auf lange Sicht haben? ` +
    `W&uuml;rfle erst wenige, dann viele Male und beobachte, wie sich die S&auml;ulen der Linie n&auml;hern.`;

  // Knopfzeile.
  const zeile = document.createElement("div");
  zeile.className = "knopfzeile";
  zeile.style.cssText = "justify-content:center";
  const knoepfe = [
    { text: "1× werfen", n: 1 },
    { text: "100×", n: 100 },
    { text: "1000×", n: 1000 }
  ];
  knoepfe.forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "knopf klein";
    b.textContent = k.text;
    b.setAttribute("aria-label", k.n + "-mal werfen");
    b.addEventListener("click", () => { wirf(k.n); });
    zeile.append(b);
  });
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "knopf klein zweitrangig";
  reset.textContent = "zurücksetzen";
  reset.setAttribute("aria-label", "Zähler zurücksetzen");
  reset.addEventListener("click", () => { absolut = new Array(seiten).fill(0); gesamt = 0; zeichne(); });
  zeile.append(reset);

  // Diagramm.
  const W = 360, H = 230, ML = 40, MR = 16, MT = 22, MB = 30;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:460px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";

  // Ausgabe (Gesamtzahl + Hinweis).
  const out = document.createElement("p");
  out.setAttribute("role", "status");
  out.style.cssText = "margin:0;text-align:center;font-size:1.02rem;min-height:1.3em";

  function wirf(n) {
    for (let i = 0; i < n; i++) {
      const augen = Math.floor(Math.random() * seiten) + 1; // 1..seiten
      absolut[augen - 1]++;
    }
    gesamt += n;
    zeichne();
  }

  function fmtProz(v) {
    return (Math.round(v * 1000) / 10).toLocaleString("de-DE");
  }

  function zeichne() {
    const rel = relativeHaeufigkeiten(absolut, gesamt);
    // y-Skala: 0 bis yMax (etwas über 1/n bzw. über dem größten Balken, mind. das Doppelte von 1/n).
    const groesster = rel.length ? Math.max(...rel) : 0;
    const yMax = Math.max(2 * theorie, groesster * 1.15, 0.05);
    const plotB = W - ML - MR, plotH = H - MT - MB;
    const sx = (i) => ML + (i + 0.5) * (plotB / seiten);
    const sy = (v) => (H - MB) - (v / yMax) * plotH;
    const bw = (plotB / seiten) * 0.66;

    let s = "";
    // Achsen.
    s += `<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="var(--text)" stroke-width="1.2"/>`;
    s += `<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="var(--text)" stroke-width="1.2"/>`;
    s += `<text x="${ML - 6}" y="${MT + 3}" text-anchor="end" font-size="10" fill="var(--text-leise)">rel. H.</text>`;
    // Balken + Beschriftung der Augenzahlen.
    for (let i = 0; i < seiten; i++) {
      const x = sx(i), h = (H - MB) - sy(rel[i]);
      s += `<rect x="${(x - bw / 2).toFixed(1)}" y="${sy(rel[i]).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" fill="var(--akzent)" rx="2"/>`;
      // Augenzahl nur beschriften, wenn nicht zu viele Seiten (sonst zu eng).
      if (seiten <= 12) {
        s += `<text x="${x.toFixed(1)}" y="${H - MB + 13}" text-anchor="middle" font-size="10" fill="var(--text-leise)">${i + 1}</text>`;
      }
    }
    // Theorielinie 1/n.
    const yl = sy(theorie);
    s += `<line x1="${ML}" y1="${yl.toFixed(1)}" x2="${W - MR}" y2="${yl.toFixed(1)}" stroke="var(--ok)" stroke-width="1.8" stroke-dasharray="6 4"/>`;
    s += `<text x="${W - MR}" y="${(yl - 4).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--ok)">1/${seiten} ≈ ${fmtProz(theorie)} %</text>`;
    svg.innerHTML = s;

    // Bild-Beschriftung für Screenreader.
    svg.setAttribute(
      "aria-label",
      `Balkendiagramm der relativen Häufigkeiten der Augenzahlen 1 bis ${seiten} nach ${gesamt} Würfen; ` +
      `gestrichelte Linie beim theoretischen Wert 1 durch ${seiten}.`
    );

    if (gesamt === 0) {
      out.innerHTML = `Noch keine W&uuml;rfe. Tippe auf einen Knopf und beobachte die Balken.`;
      return;
    }
    out.innerHTML =
      `Gesamt: <strong>${gesamt.toLocaleString("de-DE")}</strong> W&uuml;rfe. ` +
      `Je mehr W&uuml;rfe, desto n&auml;her liegen die relativen H&auml;ufigkeiten beim Wert ` +
      `<strong>1/${seiten} &asymp; ${fmtProz(theorie)} %</strong>.`;
  }

  wrap.append(poe, zeile, svg, out);
  container.append(wrap);
  zeichne();
}

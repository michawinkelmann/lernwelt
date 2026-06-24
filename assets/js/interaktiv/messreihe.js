// messreihe.js — editierbare Messreihe → Streudiagramm + Ausgleichsgerade + abgeleitete Größe.
// Kern der "Lernaufgabe" (Versuch → Auswertung): Messwerte eintragen, Punkte zeichnen,
// Ausgleichsgerade bestimmen, Steigung und eine daraus abgeleitete Größe (z. B. R aus U-I) ablesen.
// Reines Vanilla-JS/SVG, keine externen Bibliotheken. params:
//   { titel?, xLabel:"U", yLabel:"I", xEinheit:"V", yEinheit:"A", zeilen:5,
//     xVorgabe?:[1,2,3,4,5], modell:"proportional"|"linear",
//     groesse?:{ name:"R", einheit:"Ω", ausSteigung:"kehrwert"|"direkt" } }
export function mount(container, params) {
  const p = params || {};
  const xL = p.xLabel || "x", yL = p.yLabel || "y";
  const xE = p.xEinheit || "", yE = p.yEinheit || "";
  const modell = p.modell === "linear" ? "linear" : "proportional";
  const nZeilen = Math.max(2, p.zeilen || 5);
  const xVor = Array.isArray(p.xVorgabe) ? p.xVorgabe : [];
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";

  if (p.titel) {
    const h = document.createElement("p");
    h.style.cssText = "margin:0;text-align:center;font-weight:600";
    h.textContent = p.titel;
    wrap.append(h);
  }

  const tab = document.createElement("table");
  tab.style.cssText = "border-collapse:collapse;margin:0 auto;font-variant-numeric:tabular-nums";
  tab.innerHTML = `<thead><tr>
      <th style="text-align:left;padding:.2em .6em">${xL}${xE ? " / " + xE : ""}</th>
      <th style="text-align:left;padding:.2em .6em">${yL}${yE ? " / " + yE : ""}</th></tr></thead><tbody></tbody>`;
  const tbody = tab.querySelector("tbody");
  for (let i = 0; i < nZeilen; i++) {
    const tr = document.createElement("tr");
    const xv = xVor[i] != null ? String(xVor[i]).replace(".", ",") : "";
    tr.innerHTML =
      `<td style="padding:.15em .6em"><input type="text" inputmode="decimal" data-x="${i}" value="${xv}" ${xVor[i] != null ? "readonly" : ""} aria-label="${xL} Zeile ${i + 1}" style="width:6em"></td>` +
      `<td style="padding:.15em .6em"><input type="text" inputmode="decimal" data-y="${i}" aria-label="${yL} Zeile ${i + 1}" style="width:6em"></td>`;
    tbody.append(tr);
  }

  const W = 340, H = 240, ML = 48, MR = 14, MT = 14, MB = 32;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:430px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const out = document.createElement("p");
  out.setAttribute("role", "status");
  out.style.cssText = "margin:0;text-align:center;font-size:1.02rem;min-height:1.3em";
  const knopf = document.createElement("button");
  knopf.type = "button"; knopf.className = "knopf klein";
  knopf.textContent = "Punkte zeichnen & auswerten";

  function lies() {
    const pts = [];
    for (let i = 0; i < nZeilen; i++) {
      const xs = tbody.querySelector(`[data-x="${i}"]`).value.trim().replace(",", ".");
      const ys = tbody.querySelector(`[data-y="${i}"]`).value.trim().replace(",", ".");
      if (xs === "" || ys === "") continue;
      const x = parseFloat(xs), y = parseFloat(ys);
      if (isFinite(x) && isFinite(y)) pts.push([x, y]);
    }
    return pts;
  }
  function fit(pts) {
    const n = pts.length;
    if (n < 2) return null;
    if (modell === "proportional") {
      let sxy = 0, sxx = 0;
      pts.forEach(([x, y]) => { sxy += x * y; sxx += x * x; });
      return sxx === 0 ? null : { m: sxy / sxx, b: 0 };
    }
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxy += x * y; sxx += x * x; });
    const d = n * sxx - sx * sx;
    return d === 0 ? null : { m: (n * sxy - sx * sy) / d, b: (sy - ((n * sxy - sx * sy) / d) * sx) / n };
  }
  function fmt(v) {
    if (!isFinite(v)) return "—";
    const r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 1000) / 1000;
    return String(r).replace(".", ",");
  }
  function zeichne() {
    const pts = lies();
    const xmax = Math.max(1, ...pts.map(p => p[0]));
    const ymax = Math.max(1, ...pts.map(p => p[1]));
    const sx = x => ML + (x / xmax) * (W - ML - MR);
    const sy = y => (H - MB) - (y / ymax) * (H - MT - MB);
    let s =
      `<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="var(--text)" stroke-width="1.2"/>` +
      `<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="var(--text)" stroke-width="1.2"/>` +
      `<text x="${W - MR}" y="${H - MB - 5}" text-anchor="end" font-size="10" fill="var(--text-leise)">${xL}${xE ? " (" + xE + ")" : ""}</text>` +
      `<text x="${ML + 5}" y="${MT + 9}" font-size="10" fill="var(--text-leise)">${yL}${yE ? " (" + yE + ")" : ""}</text>`;
    const f = fit(pts);
    if (f) {
      const y0 = f.b, y1 = f.m * xmax + f.b;
      s += `<line x1="${sx(0)}" y1="${sy(Math.max(0, Math.min(ymax, y0)))}" x2="${sx(xmax)}" y2="${sy(Math.max(0, Math.min(ymax, y1)))}" stroke="var(--akzent)" stroke-width="2.2"/>`;
    }
    pts.forEach(([x, y]) => { s += `<circle cx="${sx(x)}" cy="${sy(y)}" r="3.6" fill="var(--akzent)"/>`; });
    svg.innerHTML = s;
    if (pts.length < 2) { out.textContent = "Trage mindestens zwei Messwerte ein."; return; }
    if (!f) { out.textContent = "Mit diesen Werten lässt sich keine Gerade bestimmen."; return; }
    let txt = `Steigung m = ${fmt(f.m)}${(yE && xE) ? " " + yE + "/" + xE : ""}`;
    if (p.groesse && p.groesse.name) {
      const g = p.groesse;
      const wert = g.ausSteigung === "kehrwert" ? (f.m ? 1 / f.m : NaN) : f.m;
      txt += ` → ${g.name} = ${fmt(wert)}${g.einheit ? " " + g.einheit : ""}`;
    }
    out.innerHTML = `<strong>${txt}</strong>`;
  }
  knopf.addEventListener("click", zeichne);
  wrap.append(tab, knopf, svg, out);
  container.append(wrap);
  zeichne();
}

// funktionsplotter.js — generischer Funktionsgraph mit Parameter-Reglern (Vanilla-JS, kein eval).
// params = { form, regler:[{sym:"a|b|c|d",label,min,max,step,init,einheit}], x:[min,max], y?:[min,max],
//            achsen:{x,y}, formel:"…", schrittX?, schrittY? }
// y-Achse wird automatisch passend skaliert (beim Laden, stabil), Achsen sind beschriftet,
// die Kurve wird sauber auf den Zeichenbereich beschnitten.
function yWert(form, p, x) {
  const a = p.a ?? 1, b = p.b ?? 1, c = p.c ?? 0;
  switch (form) {
    case "proportional":     return a * x;
    case "linear":           return a * x + b;
    case "quadratisch":      return a * x * x + b * x + c;
    case "scheitel":         return a * (x - b) * (x - b) + c;
    case "exponentiell":     return a * Math.pow(b, x);
    case "potenz":           return a * Math.pow(x, b);
    case "wurzel":           return x < 0 ? NaN : a * Math.sqrt(x);
    case "antiproportional": return x === 0 ? NaN : a / x;
    case "sinus":            return a * Math.sin(b * x * Math.PI / 180) + c;
    default:                 return a * x + b;
  }
}
function niceStep(spanne) {
  if (!(spanne > 0)) return 1;
  const roh = spanne / 8, pot = Math.pow(10, Math.floor(Math.log10(roh))), k = roh / pot;
  return (k < 1.5 ? 1 : k < 3 ? 2 : k < 7 ? 5 : 10) * pot;
}
function fmtNum(v) {
  if (v === 0 || Object.is(v, -0)) return "0";
  if (Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01)) return v.toLocaleString("de-DE", { maximumSignificantDigits: 3 });
  return (Math.round(v * 100) / 100).toLocaleString("de-DE");
}
export function mount(container, params) {
  const p = params || {};
  const form = p.form || "linear";
  const regler = Array.isArray(p.regler) && p.regler.length ? p.regler : [{ sym: "a", label: "a", min: -3, max: 3, step: 0.5, init: 1 }];
  const xr = p.x || [-5, 5];
  const achsen = p.achsen || { x: "x", y: "y" };
  const W = 340, H = 250, ML = 44, MR = 14, MT = 14, MB = 30;
  const werte = {}; regler.forEach(r => werte[r.sym] = r.init ?? 1);

  // --- y-Bereich automatisch & STABIL bestimmen (einmalig, deckt alle Reglerstellungen ab) ---
  function reichweite() {
    const blowup = form === "exponentiell" || form === "antiproportional" || form === "potenz";
    const stellen = regler.map(r => blowup ? [r.init ?? 1] : Array.from(new Set([r.min, r.init ?? 1, r.max])));
    // kartesisches Produkt der Eckwerte
    let combos = [{}];
    regler.forEach((r, i) => {
      const next = [];
      combos.forEach(c => stellen[i].forEach(v => next.push(Object.assign({}, c, { [r.sym]: v }))));
      combos = next;
    });
    let lo = Infinity, hi = -Infinity;
    combos.forEach(c => {
      for (let i = 0; i <= 80; i++) {
        const x = xr[0] + (xr[1] - xr[0]) * i / 80;
        if (form === "antiproportional" && Math.abs(x) < 0.3) continue;
        const y = yWert(form, c, x);
        if (isFinite(y) && Math.abs(y) < 1e7) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
      }
    });
    if (!isFinite(lo) || !isFinite(hi) || lo === hi) { lo = (lo || 0) - 1; hi = (hi || 0) + 1; }
    return [lo, hi];
  }
  let yr;
  if (Array.isArray(p.y) && p.yFest) { yr = p.y; }
  else {
    let [lo, hi] = reichweite();
    const pad = (hi - lo) * 0.08 || 1;
    const st = niceStep((hi - lo) + 2 * pad);
    const yLo = lo >= 0 ? 0 : Math.floor((lo - pad) / st) * st;   // einseitig positiv → exakt bei 0 beginnen
    const yHi = hi <= 0 ? 0 : Math.ceil((hi + pad) / st) * st;
    yr = [yLo, yHi];
    if (yr[0] === yr[1]) yr = [yr[0] - 1, yr[1] + 1];
  }

  const uid = "fp" + Math.random().toString(36).slice(2, 8);
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:430px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";

  const steuer = document.createElement("div");
  steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;justify-content:center";
  const formelZeile = document.createElement("p");
  formelZeile.style.cssText = "margin:0;text-align:center;font-size:1.05rem;min-height:1.4em";
  const werteZeile = document.createElement("p");
  werteZeile.setAttribute("role", "status");
  werteZeile.style.cssText = "margin:0;text-align:center;font-size:.95rem;color:var(--text-leise);min-height:1.3em;font-variant-numeric:tabular-nums";

  const sx = x => ML + (x - xr[0]) / (xr[1] - xr[0]) * (W - ML - MR);
  const sy = y => (H - MB) - (y - yr[0]) / (yr[1] - yr[0]) * (H - MT - MB);

  function zeichne() {
    const gx = p.schrittX || niceStep(xr[1] - xr[0]), gy = p.schrittY || niceStep(yr[1] - yr[0]);
    let s = `<defs><clipPath id="${uid}"><rect x="${ML}" y="${MT}" width="${W - ML - MR}" height="${H - MT - MB}"/></clipPath></defs>`;
    // Gitter + Achsenzahlen
    for (let x = Math.ceil(xr[0] / gx) * gx; x <= xr[1] + 1e-9; x += gx) {
      s += `<line x1="${sx(x)}" y1="${MT}" x2="${sx(x)}" y2="${H - MB}" stroke="var(--linie)" stroke-width="0.5" opacity="0.45"/>`;
      if (Math.abs(x) > 1e-9 || (xr[0] >= 0)) s += `<text x="${sx(x)}" y="${H - MB + 12}" text-anchor="middle" font-size="9" fill="var(--text-leise)">${fmtNum(x)}</text>`;
    }
    for (let y = Math.ceil(yr[0] / gy) * gy; y <= yr[1] + 1e-9; y += gy) {
      s += `<line x1="${ML}" y1="${sy(y)}" x2="${W - MR}" y2="${sy(y)}" stroke="var(--linie)" stroke-width="0.5" opacity="0.45"/>`;
      s += `<text x="${ML - 4}" y="${sy(y) + 3}" text-anchor="end" font-size="9" fill="var(--text-leise)">${fmtNum(y)}</text>`;
    }
    // Achsen
    const yA = (yr[0] <= 0 && yr[1] >= 0) ? sy(0) : (H - MB);
    const xA = (xr[0] <= 0 && xr[1] >= 0) ? sx(0) : ML;
    s += `<line x1="${ML}" y1="${yA}" x2="${W - MR}" y2="${yA}" stroke="var(--text)" stroke-width="1.2"/>`;
    s += `<line x1="${xA}" y1="${MT}" x2="${xA}" y2="${H - MB}" stroke="var(--text)" stroke-width="1.2"/>`;
    s += `<text x="${W - MR}" y="${yA - 5}" text-anchor="end" font-size="10" fill="var(--text-leise)">${achsen.x}</text>`;
    s += `<text x="${xA + 5}" y="${MT + 9}" font-size="10" fill="var(--text-leise)">${achsen.y}</text>`;
    // Kurve (auf Zeichenbereich beschnitten — keine Falsch-Waagerechte)
    let pts = [], n = 200;
    for (let i = 0; i <= n; i++) {
      const x = xr[0] + (xr[1] - xr[0]) * i / n, y = yWert(form, werte, x);
      pts.push(isFinite(y) ? `${sx(x).toFixed(1)},${sy(y).toFixed(1)}` : null);
    }
    let pfad = "", offen = false;
    pts.forEach(pt => { if (pt === null) offen = false; else { pfad += (offen ? " L" : " M") + pt; offen = true; } });
    s += `<path d="${pfad}" fill="none" stroke="var(--akzent)" stroke-width="2.4" clip-path="url(#${uid})"/>`;
    svg.innerHTML = s;
  }
  function aktualisiere() {
    if (p.formel) formelZeile.innerHTML = `<strong>${p.formel}</strong>`;
    werteZeile.innerHTML = regler.map(r =>
      `<span style="display:inline-block;margin:0 .5em">${r.label || r.sym} = ${fmtNum(werte[r.sym])}${r.einheit ? " " + r.einheit : ""}</span>`).join("");
    zeichne();
  }

  regler.forEach(r => {
    const lab = document.createElement("label");
    lab.style.cssText = "white-space:nowrap;display:inline-flex;align-items:center;gap:.3em";
    lab.append(document.createTextNode((r.label || r.sym) + ":"));
    const inp = document.createElement("input");
    inp.type = "range"; inp.min = r.min; inp.max = r.max; inp.step = r.step ?? 1; inp.value = r.init ?? 1;
    inp.style.verticalAlign = "middle"; inp.setAttribute("aria-label", r.label || r.sym);
    const out = document.createElement("strong");
    out.style.cssText = "display:inline-block;min-width:3ch;text-align:right;font-variant-numeric:tabular-nums";
    out.textContent = fmtNum(werte[r.sym]);
    inp.addEventListener("input", () => { werte[r.sym] = +inp.value; out.textContent = fmtNum(werte[r.sym]); aktualisiere(); });
    lab.append(inp, out);
    if (r.einheit) lab.append(document.createTextNode(r.einheit));
    steuer.append(lab);
  });

  wrap.append(svg, steuer, formelZeile, werteZeile);
  container.append(wrap);
  aktualisiere();
}

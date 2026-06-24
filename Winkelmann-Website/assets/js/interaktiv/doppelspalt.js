// doppelspalt.js — Interferenz am Doppel-/Mehrfachspalt.
// modus "geometrie":  zwei Spalte (Abstand g), Winkel θ → Gangunterschied Δs = g·sinθ
//                     und Maximabedingung Δs = k·λ (k. Ordnung).
// modus "intensitaet": Intensitätsverteilung I(θ) für N Spalte → Hauptmaxima bei
//                     g·sinθ = k·λ; mehr Spalte ⇒ schärfere Maxima; λ verschiebt die Maxima.
// params = { modus:"geometrie"|"intensitaet", g:2000, lambda:550, N:2 }   (g, λ in nm)
export function mount(container, params) {
  const p = params || {};
  const modus = p.modus || "geometrie";
  let g = p.g ?? 2000, lam = p.lambda ?? 550, N = p.N ?? 2, theta = 8;
  const W = 340, H = 230;
  const fmt = v => (Math.round(v * 10) / 10).toLocaleString("de-DE");
  const farbeLam = nm => { // grobe sichtbare Farbe aus Wellenlänge
    if (nm < 450) return "#5b6cff"; if (nm < 500) return "#22b3c7";
    if (nm < 565) return "#3ab54a"; if (nm < 600) return "#e0c020";
    if (nm < 640) return "#e8761a"; return "#e23b3b"; };
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:430px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.0rem;min-height:3em";

  function geometrie() {
    const xb = 70, yc = H / 2 - 10, dg = 36;             // Barriere x, Spaltmitte y, halber Spaltabstand (px)
    const S1y = yc - dg, S2y = yc + dg, rad = theta * Math.PI / 180, L = 250;
    let s = `<rect x="${xb-3}" y="20" width="6" height="${H-60}" fill="var(--text-leise)" opacity="0.5"/>`;
    // Spalte (Lücken)
    s += `<rect x="${xb-3}" y="${S1y-7}" width="6" height="14" fill="var(--flaeche)"/><rect x="${xb-3}" y="${S2y-7}" width="6" height="14" fill="var(--flaeche)"/>`;
    s += `<circle cx="${xb}" cy="${S1y}" r="3" fill="var(--text)"/><circle cx="${xb}" cy="${S2y}" r="3" fill="var(--text)"/>`;
    // zwei parallele Strahlen nach rechts-oben unter Winkel θ
    const dx = L * Math.cos(rad), dy = L * Math.sin(rad), col = farbeLam(lam);
    s += `<line x1="${xb}" y1="${S1y}" x2="${xb+dx}" y2="${S1y-dy}" stroke="${col}" stroke-width="2"/>`;
    s += `<line x1="${xb}" y1="${S2y}" x2="${xb+dx}" y2="${S2y-dy}" stroke="${col}" stroke-width="2"/>`;
    // Spaltabstand g (Klammer)
    s += `<line x1="${xb-14}" y1="${S1y}" x2="${xb-14}" y2="${S2y}" stroke="var(--text)" stroke-width="1"/>`;
    s += `<text x="${xb-18}" y="${yc+3}" text-anchor="end" font-size="11" fill="var(--text)">g</text>`;
    // Gangunterschied: Lot vom oberen Spalt auf den unteren Strahl (Δs = g·sinθ)
    const ux = Math.cos(rad), uy = -Math.sin(rad);       // Strahlrichtung
    const fx = xb + ((S1y - S2y) * (-uy)) * 0; // (vereinfachte Markierung am Spalt)
    const dsx = xb + (2*dg) * Math.sin(rad) * Math.cos(rad), dsy = S2y - (2*dg)*Math.sin(rad)*Math.sin(rad);
    s += `<line x1="${xb}" y1="${S2y}" x2="${dsx.toFixed(1)}" y2="${dsy.toFixed(1)}" stroke="var(--fehler)" stroke-width="2.5"/>`;
    s += `<text x="${(dsx+10).toFixed(1)}" y="${(dsy+4).toFixed(1)}" font-size="11" fill="var(--fehler)">Δs</text>`;
    svg.innerHTML = s;
    const ds = g * Math.sin(rad);                         // nm
    const k = ds / lam;
    const nahe = Math.abs(k - Math.round(k));
    const istMax = nahe < 0.06 && Math.round(k) >= 0;
    out.innerHTML = `Gangunterschied Δs = g·sinθ = ${g} · sin(${theta}°) = <strong>${fmt(ds)} nm</strong><br>` +
      `<span style="color:var(--text-leise);font-size:.93em">Δs / λ = ${fmt(k)} · λ` +
      (istMax ? ` → <strong style="color:var(--ok)">Maximum ${Math.round(k)}. Ordnung</strong> (Δs = k·λ)` : ` → kein ganzzahliges Vielfaches von λ`) + `</span>`;
  }

  function intensitaet() {
    const ML = 30, MR = 12, MT = 14, MB = 24, tmax = 42;
    const sx = t => ML + (t + tmax) / (2 * tmax) * (W - ML - MR);
    const sy = I => (H - MB) - I * (H - MT - MB);
    const I = t => { const d = Math.PI * g * Math.sin(t * Math.PI / 180) / lam; // halbe Phasendiff.
      const den = Math.sin(d); if (Math.abs(den) < 1e-6) return 1; return Math.pow(Math.sin(N * d) / (N * den), 2); };
    let s = `<line x1="${ML}" y1="${H-MB}" x2="${W-MR}" y2="${H-MB}" stroke="var(--text)" stroke-width="1"/>`;
    s += `<text x="${W-MR}" y="${H-MB+18}" text-anchor="end" font-size="10" fill="var(--text-leise)">θ (°)</text>`;
    for (let t = -tmax + 6; t <= tmax; t += 14) s += `<text x="${sx(t)}" y="${H-MB+14}" text-anchor="middle" font-size="9" fill="var(--text-leise)">${t}</text>`;
    s += `<text x="${ML-4}" y="${MT+4}" text-anchor="end" font-size="9" fill="var(--text-leise)">I</text>`;
    let pts = []; for (let i = 0; i <= 360; i++) { const t = -tmax + 2 * tmax * i / 360; pts.push(`${sx(t).toFixed(1)},${sy(I(t)).toFixed(1)}`); }
    s += `<polyline points="${pts.join(" ")}" fill="none" stroke="${farbeLam(lam)}" stroke-width="2"/>`;
    // Hauptmaxima g·sinθ=kλ markieren
    let ks = [];
    for (let k = -3; k <= 3; k++) { const sint = k * lam / g; if (Math.abs(sint) <= Math.sin(tmax*Math.PI/180)) { const t = Math.asin(sint)*180/Math.PI; ks.push(k); s += `<line x1="${sx(t).toFixed(1)}" y1="${sy(1)}" x2="${sx(t).toFixed(1)}" y2="${H-MB}" stroke="var(--ok)" stroke-width="0.7" stroke-dasharray="3 3"/>`; } }
    svg.innerHTML = s;
    out.innerHTML = `Hauptmaxima bei g·sinθ = k·λ (grün) — sichtbar: k = ${ks.join(", ")}<br>` +
      `<span style="color:var(--text-leise);font-size:.93em">${N} Spalte: je mehr Spalte, desto <strong>schärfer</strong> die Maxima. λ = ${lam} nm, g = ${g} nm.</span>`;
  }
  function zeichne() { modus === "intensitaet" ? intensitaet() : geometrie(); }

  function regler(label, min, max, step, val, einheit, set) {
    const l = document.createElement("label"); l.style.cssText = "white-space:nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = val; i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const o = document.createElement("strong"); o.style.cssText = "display:inline-block;min-width:3.4ch;text-align:right;font-variant-numeric:tabular-nums"; o.textContent = val + (einheit || "");
    i.addEventListener("input", () => { set(+i.value); o.textContent = i.value + (einheit || ""); zeichne(); });
    l.append(i, document.createTextNode(" "), o); return l;
  }
  if (modus === "intensitaet") {
    steuer.append(regler("Spalte N", 2, 8, 1, N, "", v => N = v), regler("λ", 400, 700, 10, lam, " nm", v => lam = v));
  } else {
    steuer.append(regler("Winkel θ", 0, 25, 1, theta, "°", v => theta = v), regler("λ", 400, 700, 10, lam, " nm", v => lam = v));
  }
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}

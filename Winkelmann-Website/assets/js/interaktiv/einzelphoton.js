// einzelphoton.js — Einzelne Photonen treffen zufällig auf den Schirm; erst viele Treffer
// ergeben das Interferenzmuster (Streifen). Trefferwahrscheinlichkeit ∝ |Amplitude|².
// params = { streifen:4 }
export function mount(container, params) {
  const p = params || {}, streifen = p.streifen || 4;
  const W = 340, H = 200, MX = 14;
  const dots = []; 
  const dichte = u => { const c = Math.cos(streifen * Math.PI * (u - 0.5)), e = (u - 0.5) * 3; return c * c * Math.exp(-(e * e)); }; // cos²·Hüllkurve, u∈[0,1]
  function ziehe() { for (let i = 0; i < 500; i++) { const u = Math.random(); if (Math.random() < dichte(u)) return u; } return Math.random(); }
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2);align-items:center";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:430px;height:auto;display:block;background:#0d1b2a;border:1px solid var(--linie);border-radius:var(--radius)";
  const knoepfe = document.createElement("div"); knoepfe.style.cssText = "display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:.98rem;min-height:2.6em";
  function zeichne() {
    let s = "";
    for (const d of dots) s += `<circle cx="${(MX + d.u * (W - 2 * MX)).toFixed(1)}" cy="${d.y.toFixed(1)}" r="1.6" fill="#ffe08a" opacity="0.85"/>`;
    svg.innerHTML = s;
    const n = dots.length;
    out.innerHTML = `<strong>${n}</strong> Photon${n === 1 ? "" : "en"} auf dem Schirm.<br><span style="color:var(--text-leise);font-size:.93em">${n < 40 ? "Noch zufällig verteilt — jedes Photon trifft einzeln." : "Das Streifenmuster wächst statistisch heran — Trefferwahrscheinlichkeit ∝ |Amplitude|²."}</span>`;
  }
  function add(k) { for (let i = 0; i < k; i++) dots.push({ u: ziehe(), y: 12 + Math.random() * (H - 24) }); zeichne(); }
  function knopf(t, fn) { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.style.cssText = "padding:.35em .8em;border:1px solid var(--linie);border-radius:var(--radius);background:var(--flaeche);cursor:pointer;font-size:.95rem"; b.addEventListener("click", fn); return b; }
  knoepfe.append(knopf("+10 Photonen", () => add(10)), knopf("+200 Photonen", () => add(200)), knopf("Reset", () => { dots.length = 0; zeichne(); }));
  wrap.append(svg, knoepfe, out); container.append(wrap); add(10);
}

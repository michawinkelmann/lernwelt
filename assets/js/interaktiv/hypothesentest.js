// hypothesentest.js — Binomialverteilung unter H0 mit Ablehnungsbereich; zeigt Signifikanz α.
// params = { n:20, p:0.5, modus:"links"|"rechts", kInit }
export function mount(container, params) {
  const p = params || {};
  let n = p.n ?? 20, pr = p.p ?? 0.5, kc = p.kInit ?? Math.round((p.n ?? 20) * (p.p ?? 0.5) * 0.4);
  const modus = p.modus === "rechts" ? "rechts" : "links";
  const W = 340, H = 175, ML = 8, MB = 20;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:440px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.3rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  function binom(n, k, p) { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c * Math.pow(p, k) * Math.pow(1 - p, n - k); }
  function regler(label, get, set, min, max, step) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = get(); i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = (+get()).toLocaleString("de-DE");
    i.addEventListener("input", () => { set(+i.value); s.textContent = (+i.value).toLocaleString("de-DE"); zeichne(); }); l._s = s;
    l.append(i, document.createTextNode(" "), s); return l;
  }
  let kRegler;
  function zeichne() {
    if (kc > n) kc = n;
    const probs = []; let pmax = 0;
    for (let k = 0; k <= n; k++) { const v = binom(n, k, pr); probs.push(v); if (v > pmax) pmax = v; }
    const bw = (W - ML - 6) / (n + 1);
    let s = `<line x1="${ML}" y1="${H-MB}" x2="${W-4}" y2="${H-MB}" stroke="var(--text)" stroke-width="1"/>`;
    let alpha = 0;
    probs.forEach((v, k) => {
      const h = pmax ? v / pmax * (H - MB - 10) : 0, x = ML + k * bw;
      const imBereich = modus === "links" ? k <= kc : k >= kc;
      if (imBereich) alpha += v;
      s += `<rect x="${x+1}" y="${H-MB-h}" width="${bw-2}" height="${h}" fill="${imBereich ? "var(--fehler,#c0392b)" : "var(--akzent)"}" rx="1.5"/>`;
      if (n <= 25) s += `<text x="${x+bw/2}" y="${H-6}" text-anchor="middle" font-size="8" fill="var(--text-leise)">${k}</text>`;
    });
    svg.innerHTML = s;
    if (kRegler) kRegler.querySelector("input").max = n;
    const f = x => (Math.round(x * 1000) / 1000).toLocaleString("de-DE");
    const ber = modus === "links" ? `X ≤ ${kc}` : `X ≥ ${kc}`;
    out.innerHTML = `Verteilung unter H₀ (n = ${n}, p = ${f(pr)})<br>Ablehnungsbereich: <strong>${ber}</strong><br>Signifikanz α = P(${ber}) = <strong>${f(alpha)}</strong> (Fehler 1. Art)`;
  }
  steuer.append(regler("n", () => n, v => n = v, 5, 40, 1), regler("p", () => pr, v => pr = v, 0.05, 0.95, 0.05));
  kRegler = regler("krit. Wert k", () => kc, v => kc = v, 0, n, 1); steuer.append(kRegler);
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}

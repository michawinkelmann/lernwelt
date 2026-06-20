// zahlenstrahl.js — Punkt auf dem Zahlenstrahl setzen und ablesen (Vorzeichen, Dezimalzahlen).
// params = { min:-10, max:10, schritt:1, init:0, einheit:"" }
export function mount(container, params) {
  const p = params || {};
  const min = p.min ?? -10, max = p.max ?? 10, schritt = p.schritt ?? 1, E = p.einheit || "";
  let v = p.init ?? 0;
  const W = 340, H = 70, M = 16;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:440px;height:auto;display:block;margin:0 auto";
  const inp = document.createElement("input"); inp.type = "range"; inp.min = min; inp.max = max; inp.step = schritt; inp.value = v;
  inp.style.cssText = "width:100%;max-width:440px;display:block;margin:0 auto"; inp.setAttribute("aria-label", "Zahl wählen");
  const out = document.createElement("p"); out.setAttribute("role", "status");
  out.style.cssText = "margin:0;text-align:center;font-size:1.1rem";
  const sx = x => M + (x - min) / (max - min) * (W - 2 * M);
  const fmt = x => (Math.round(x * 1000) / 1000).toLocaleString("de-DE");
  function zeichne() {
    let s = `<line x1="${M}" y1="40" x2="${W-M}" y2="40" stroke="var(--text)" stroke-width="1.5"/>`;
    const gx = (max - min) <= 20 ? Math.max(1, Math.round((max-min)/10)) : (max-min)/10;
    for (let x = min; x <= max + 1e-9; x += gx) {
      const big = Math.abs(x) < 1e-9;
      s += `<line x1="${sx(x)}" y1="${36}" x2="${sx(x)}" y2="${44}" stroke="var(--text)" stroke-width="${big?2:1}"/>`;
      s += `<text x="${sx(x)}" y="58" text-anchor="middle" font-size="10" fill="var(--text-leise)">${fmt(x)}</text>`;
    }
    s += `<circle cx="${sx(v)}" cy="40" r="6" fill="var(--akzent)"/>`;
    svg.innerHTML = s;
    out.innerHTML = `Gewählte Zahl: <strong>${fmt(v)}${E ? " " + E : ""}</strong>`;
  }
  inp.addEventListener("input", () => { v = +inp.value; zeichne(); });
  wrap.append(svg, inp, out); container.append(wrap); zeichne();
}

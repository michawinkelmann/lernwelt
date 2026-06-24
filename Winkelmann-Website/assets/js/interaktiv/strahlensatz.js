// strahlensatz.js — zentrische Streckung von Z aus: Streckfaktor k → Bild, Strahlensatz-Verhältnis & Flächenfaktor.
// params = { kInit:1.5, kMin:0.5, kMax:2.5 }
export function mount(container, params) {
  const p = params || {};
  let k = p.kInit ?? 1.5;
  const kMin = p.kMin ?? 0.5, kMax = p.kMax ?? 2.5;
  const Z = { x: 26, y: 120 };
  const tri = [[52, -48], [104, -20], [74, 42]];   // Originaldreieck relativ zu Z (px)
  const W = 280, Hh = 200;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${Hh}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:360px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const lab = document.createElement("label"); lab.style.textAlign = "center"; lab.append(document.createTextNode("Streckfaktor k: "));
  const inp = document.createElement("input"); inp.type = "range"; inp.min = kMin; inp.max = kMax; inp.step = 0.25; inp.value = k; inp.setAttribute("aria-label", "Streckfaktor");
  const kv = document.createElement("strong"); kv.textContent = k.toLocaleString("de-DE"); lab.append(inp, document.createTextNode(" "), kv);
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  function poly(pts) { return pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "); }
  function zeichne() {
    const orig = tri.map(([x, y]) => [Z.x + x, Z.y + y]);
    const bild = tri.map(([x, y]) => [Z.x + k * x, Z.y + k * y]);
    let s = "";
    bild.forEach((b, i) => { s += `<line x1="${Z.x}" y1="${Z.y}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="var(--text-leise)" stroke-width="1"/>`; });
    s += `<polygon points="${poly(orig)}" fill="none" stroke="var(--ok,#2a7)" stroke-width="2" stroke-dasharray="4 2"/>`;
    s += `<polygon points="${poly(bild)}" fill="color-mix(in srgb, var(--akzent) 12%, transparent)" stroke="var(--akzent)" stroke-width="2.4"/>`;
    s += `<circle cx="${Z.x}" cy="${Z.y}" r="3.5" fill="var(--text)"/><text x="${Z.x-2}" y="${Z.y+16}" font-size="11" fill="var(--text)">Z</text>`;
    svg.innerHTML = s;
    const af = Math.round(k * k * 100) / 100;
    out.innerHTML = `Streckfaktor k = <strong>${k.toLocaleString("de-DE")}</strong><br>Jede Strecke wird k-mal so lang: ZA´/ZA = ${k.toLocaleString("de-DE")} (Strahlensatz)<br>Die Fläche wird k²-mal so groß: <strong>${af.toLocaleString("de-DE")}</strong>`;
  }
  inp.addEventListener("input", () => { k = +inp.value; kv.textContent = k.toLocaleString("de-DE"); zeichne(); });
  wrap.append(svg, lab, out); container.append(wrap); zeichne();
}

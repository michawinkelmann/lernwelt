// datenbalken.js — kleinen Datensatz per Regler ändern → Mittelwert, Median, Spannweite live.
// params = { daten:[3,5,5,7,9], max:12, einheit:"" , labels:[] }
export function mount(container, params) {
  const p = params || {};
  let daten = (Array.isArray(p.daten) ? p.daten.slice() : [3, 5, 5, 7, 9]).map(Number);
  const max = p.max || Math.max(10, ...daten) , E = p.einheit || "";
  const W = 320, H = 150, MB = 18;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:440px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.3rem .9rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  function stats() {
    const s = daten.slice().sort((a, b) => a - b), n = s.length;
    const sum = s.reduce((a, b) => a + b, 0), mit = sum / n;
    const med = n % 2 ? s[(n-1)/2] : (s[n/2-1] + s[n/2]) / 2;
    return { mit, med, span: s[n-1] - s[0] };
  }
  function zeichne() {
    const bw = (W - 16) / daten.length, gap = 6;
    const st = stats(), my = (H - MB) - st.mit / max * (H - MB - 8);
    let s = "";
    daten.forEach((v, i) => {
      const h = v / max * (H - MB - 8), x = 8 + i * bw;
      s += `<rect x="${x+gap/2}" y="${H-MB-h}" width="${bw-gap}" height="${h}" fill="var(--akzent)" rx="2"/>`;
      s += `<text x="${x+bw/2}" y="${H-6}" text-anchor="middle" font-size="10" fill="var(--text-leise)">${v}</text>`;
    });
    s += `<line x1="0" y1="${my}" x2="${W}" y2="${my}" stroke="var(--fehler,#c33)" stroke-width="1.5" stroke-dasharray="5 3"/>`;
    s += `<text x="${W-3}" y="${my-3}" text-anchor="end" font-size="10" fill="var(--fehler,#c33)">Mittelwert</text>`;
    svg.innerHTML = s;
    const f = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");
    out.innerHTML = `Mittelwert <strong>${f(st.mit)}${E?" "+E:""}</strong><br>Median <strong>${f(st.med)}</strong><br>Spannweite <strong>${f(st.span)}</strong>`;
  }
  daten.forEach((v, i) => {
    const l = document.createElement("label"); l.style.cssText = "display:inline-flex;flex-direction:column;align-items:center;font-size:.8rem";
    l.append(document.createTextNode("Wert " + (i + 1)));
    const inp = document.createElement("input"); inp.type = "range"; inp.min = 0; inp.max = max; inp.step = 1; inp.value = v;
    inp.style.width = "70px"; inp.setAttribute("aria-label", "Wert " + (i + 1));
    inp.addEventListener("input", () => { daten[i] = +inp.value; zeichne(); });
    l.append(inp); steuer.append(l);
  });
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}

// bruchbalken.js — Bruch als Balken: Zähler/Nenner einstellen → Bruch, Dezimalzahl, Prozent.
// params = { nennerMax:12, zInit:1, nInit:2 }
export function mount(container, params) {
  const p = params || {};
  const nMax = p.nennerMax || 12;
  let z = p.zInit ?? 1, n = p.nInit ?? 2;
  const W = 320, H = 54;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:420px;height:auto;display:block;margin:0 auto";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.08rem";
  function regler(label, get, set, min, max) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap";
    l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = 1; i.value = get();
    i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = get();
    i.addEventListener("input", () => { set(+i.value); s.textContent = i.value; sync(); });
    l.append(i, document.createTextNode(" "), s); l._out = s; return l;
  }
  let lz, ln;
  function sync() {
    if (z > n) { z = n; lz._out.textContent = z; }
    lz.querySelector("input").max = n; if (+lz.querySelector("input").value > n) lz.querySelector("input").value = z;
    zeichne();
  }
  function zeichne() {
    const teil = W / n; let s = "";
    for (let i = 0; i < n; i++)
      s += `<rect x="${i*teil}" y="6" width="${teil}" height="${H-18}" fill="${i<z?"var(--akzent)":"var(--hauch)"}" stroke="var(--linie)" stroke-width="1"/>`;
    svg.innerHTML = s;
    const dez = z / n;
    out.innerHTML = `Bruch <strong>${z}/${n}</strong> = <strong>${(Math.round(dez*1000)/1000).toLocaleString("de-DE")}</strong> = <strong>${(Math.round(dez*1000)/10).toLocaleString("de-DE")} %</strong>`;
  }
  lz = regler("Zähler", () => z, v => z = v, 0, nMax);
  ln = regler("Nenner", () => n, v => { n = Math.max(1, v); }, 1, nMax);
  steuer.append(lz, ln);
  wrap.append(svg, steuer, out); container.append(wrap); sync();
}

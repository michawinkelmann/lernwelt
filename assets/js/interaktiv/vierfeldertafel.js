// vierfeldertafel.js — 2×2-Tafel: vier Felder per Regler → Randsummen + bedingte Wahrscheinlichkeit.
// params = { merkmalA:["A","nicht A"], merkmalB:["B","nicht B"], init:[[20,10],[15,55]], max:99 }
export function mount(container, params) {
  const p = params || {};
  const MA = p.merkmalA || ["A", "kein A"], MB = p.merkmalB || ["B", "kein B"];
  const max = p.max || 99;
  const init = p.init || [[20, 10], [15, 55]];
  let n = [[init[0][0], init[0][1]], [init[1][0], init[1][1]]];
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const tab = document.createElement("table");
  tab.style.cssText = "border-collapse:collapse;margin:0 auto;font-variant-numeric:tabular-nums;text-align:center";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.3rem 1rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1rem";
  function zelle(t, kopf) {
    return `<td style="border:1px solid var(--linie);padding:.35em .6em;${kopf ? "background:var(--hauch);font-weight:600" : ""}">${t}</td>`;
  }
  function zeichne() {
    const r0 = n[0][0] + n[0][1], r1 = n[1][0] + n[1][1];
    const c0 = n[0][0] + n[1][0], c1 = n[0][1] + n[1][1], ges = r0 + r1;
    tab.innerHTML =
      `<tr>${zelle("", 1)}${zelle(MB[0], 1)}${zelle(MB[1], 1)}${zelle("Summe", 1)}</tr>` +
      `<tr>${zelle(MA[0], 1)}${zelle("<strong>" + n[0][0] + "</strong>")}${zelle("<strong>" + n[0][1] + "</strong>")}${zelle(r0)}</tr>` +
      `<tr>${zelle(MA[1], 1)}${zelle("<strong>" + n[1][0] + "</strong>")}${zelle("<strong>" + n[1][1] + "</strong>")}${zelle(r1)}</tr>` +
      `<tr>${zelle("Summe", 1)}${zelle(c0)}${zelle(c1)}${zelle("<strong>" + ges + "</strong>")}</tr>`;
    const pB = ges ? c0 / ges : 0, pBgA = r0 ? n[0][0] / r0 : 0;
    const f = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");
    out.innerHTML = `Gesamt n = ${ges} <br> P(${MB[0]}) = ${f(pB)} <br> P(${MB[0]} | ${MA[0]}) = ${f(pBgA)}`;
  }
  [[0, 0, MA[0] + "∩" + MB[0]], [0, 1, MA[0] + "∩" + MB[1]], [1, 0, MA[1] + "∩" + MB[0]], [1, 1, MA[1] + "∩" + MB[1]]].forEach(([i, j, lab]) => {
    const l = document.createElement("label"); l.style.cssText = "white-space:nowrap;font-size:.85rem";
    l.append(document.createTextNode(lab + ": "));
    const inp = document.createElement("input"); inp.type = "range"; inp.min = 0; inp.max = max; inp.step = 1; inp.value = n[i][j]; inp.style.width = "70px"; inp.setAttribute("aria-label", lab);
    const s = document.createElement("strong"); s.textContent = n[i][j];
    inp.addEventListener("input", () => { n[i][j] = +inp.value; s.textContent = inp.value; zeichne(); });
    l.append(inp, document.createTextNode(" "), s); steuer.append(l);
  });
  wrap.append(tab, steuer, out); container.append(wrap); zeichne();
}

// koerper.js — Volumen (und Oberfläche) von Körpern mit Reglern.
// params = { form:"quader"|"wuerfel"|"zylinder"|"kugel"|"kegel"|"pyramide"|"prisma", einheit:"cm", ... maxima/init }
export function mount(container, params) {
  const p = params || {}, form = p.form || "quader", E = p.einheit || "cm";
  const vals = { l: p.linit || 5, b: p.binit || 4, h: p.hinit || 3, r: p.rinit || 3, a: p.ainit || 4 };
  const maxv = { l: p.lmax || 10, b: p.bmax || 8, h: p.hmax || 8, r: p.rmax || 6, a: p.amax || 8 };
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const fig = document.createElement("div"); fig.style.cssText = "text-align:center;font-size:2.4rem;line-height:1";
  const ICON = { quader: "📦", wuerfel: "🧊", zylinder: "🥫", kugel: "⚽", kegel: "🍦", pyramide: "🔺", prisma: "📐" };
  fig.textContent = ICON[form] || "📦";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.3rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.04rem";
  const pi = Math.PI, f = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");
  function rechne() {
    let V = 0, O = null, fo = "";
    const { l, b, h, r, a } = vals;
    if (form === "quader") { V = l*b*h; O = 2*(l*b+l*h+b*h); fo = `V = l·b·h = ${l}·${b}·${h} = ${f(V)}`; }
    else if (form === "wuerfel") { V = a**3; O = 6*a*a; fo = `V = a³ = ${a}³ = ${f(V)}`; }
    else if (form === "zylinder") { V = pi*r*r*h; O = 2*pi*r*r+2*pi*r*h; fo = `V = π·r²·h = π·${r}²·${h} = ${f(V)}`; }
    else if (form === "kugel") { V = 4/3*pi*r**3; O = 4*pi*r*r; fo = `V = 4/3·π·r³ = 4/3·π·${r}³ = ${f(V)}`; }
    else if (form === "kegel") { V = 1/3*pi*r*r*h; fo = `V = ⅓·π·r²·h = ⅓·π·${r}²·${h} = ${f(V)}`; }
    else if (form === "pyramide") { V = 1/3*a*a*h; fo = `V = ⅓·a²·h = ⅓·${a}²·${h} = ${f(V)}`; }
    else if (form === "prisma") { V = l*b*h; fo = `V = Grundfläche·Höhe = ${l}·${b}·${h} = ${f(V)}`; }
    out.innerHTML = `<strong>${fo} ${E}³</strong>` + (O != null ? ` <br> Oberfläche O = <strong>${f(O)} ${E}²</strong>` : "");
  }
  function regler(sym, label) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = 1; i.max = maxv[sym]; i.step = 1; i.value = vals[sym]; i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = vals[sym];
    i.addEventListener("input", () => { vals[sym] = +i.value; s.textContent = i.value; rechne(); });
    l.append(i, document.createTextNode(" "), s, document.createTextNode(" " + E)); return l;
  }
  const setup = { quader: [["l","Länge l"],["b","Breite b"],["h","Höhe h"]], wuerfel: [["a","Kante a"]],
    zylinder: [["r","Radius r"],["h","Höhe h"]], kugel: [["r","Radius r"]], kegel: [["r","Radius r"],["h","Höhe h"]],
    pyramide: [["a","Grundkante a"],["h","Höhe h"]], prisma: [["l","Länge l"],["b","Breite b"],["h","Höhe h"]] };
  (setup[form] || setup.quader).forEach(([s, lab]) => steuer.append(regler(s, lab)));
  wrap.append(fig, steuer, out); container.append(wrap); rechne();
}

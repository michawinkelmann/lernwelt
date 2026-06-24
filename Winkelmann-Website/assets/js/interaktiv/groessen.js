// groessen.js — Größen-Umrechner: Wert + Einheit eingeben → Umrechnung in alle Einheiten.
// params = { einheiten:[{name:"m",faktor:1}, ...], init:{wert:1,einheit:"m"}, titel:"Länge" }
export function mount(container, params) {
  const p = params || {};
  const EH = Array.isArray(p.einheiten) && p.einheiten.length ? p.einheiten
    : [{ name: "km", faktor: 1000 }, { name: "m", faktor: 1 }, { name: "cm", faktor: 0.01 }, { name: "mm", faktor: 0.001 }];
  let wert = p.init?.wert ?? 1, ein = p.init?.einheit ?? EH[0].name;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const zeile = document.createElement("p"); zeile.style.cssText = "margin:0;text-align:center";
  const inp = document.createElement("input"); inp.type = "number"; inp.value = wert; inp.step = "any";
  inp.style.cssText = "width:7em;padding:.3em;border:1px solid var(--linie);border-radius:var(--radius-klein);background:var(--flaeche);color:var(--text);font-size:1rem";
  inp.setAttribute("aria-label", "Wert");
  const sel = document.createElement("select");
  sel.style.cssText = "padding:.3em;border:1px solid var(--linie);border-radius:var(--radius-klein);background:var(--flaeche);color:var(--text);font-size:1rem";
  EH.forEach(e => { const o = document.createElement("option"); o.value = e.name; o.textContent = e.name; sel.append(o); });
  sel.value = ein;
  zeile.append(inp, document.createTextNode(" "), sel);
  const tab = document.createElement("div"); tab.setAttribute("role", "status");
  tab.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem .9rem;justify-content:center;font-size:1.02rem";
  function fmt(x) { if (!isFinite(x)) return "—"; const r = Math.round(x * 1e6) / 1e6; return r.toLocaleString("de-DE"); }
  function rechne() {
    const von = EH.find(e => e.name === sel.value); const basis = (+inp.value) * von.faktor;
    tab.innerHTML = EH.map(e => `<span><strong>${fmt(basis / e.faktor)}</strong> ${e.name}</span>`).join(" ");
  }
  inp.addEventListener("input", rechne); sel.addEventListener("change", rechne);
  wrap.append(zeile, tab); container.append(wrap); rechne();
}

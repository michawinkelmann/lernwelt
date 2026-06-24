// caesar.js — Caesar-Verschlüsselung: Schlüssel s einstellen, Klartext → Geheimtext live.
// params = { text:"HALLO WELT", shift:3 }
export function mount(container, params) {
  const p = params || {};
  let shift = p.shift ?? 3;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const z1 = document.createElement("p"); z1.style.cssText = "margin:0;text-align:center";
  z1.append(document.createTextNode("Klartext: "));
  const inp = document.createElement("input"); inp.type = "text"; inp.value = p.text || "HALLO WELT"; inp.maxLength = 40;
  inp.style.cssText = "width:14em;padding:.3em;border:1px solid var(--linie);border-radius:var(--radius-klein);background:var(--flaeche);color:var(--text);font-size:1rem;text-transform:uppercase";
  inp.setAttribute("aria-label", "Klartext"); z1.append(inp);
  const z2 = document.createElement("label"); z2.style.cssText = "display:block;text-align:center";
  z2.append(document.createTextNode("Schlüssel s: "));
  const sl = document.createElement("input"); sl.type = "range"; sl.min = 0; sl.max = 25; sl.step = 1; sl.value = shift; sl.style.verticalAlign = "middle"; sl.setAttribute("aria-label", "Schlüssel");
  const sv = document.createElement("strong"); sv.textContent = shift; z2.append(sl, document.createTextNode(" "), sv);
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.1rem";
  function enc(t, s) {
    return t.toUpperCase().replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 65 + s) % 26 + 65));
  }
  function zeichne() {
    out.innerHTML = `Geheimtext (s = ${shift}): <strong style="letter-spacing:.05em">${enc(inp.value, shift) || "—"}</strong><br>` +
      `<span style="font-size:.85rem;color:var(--text-leise)">Beispiel: A → ${enc("A", shift)} — jeder Buchstabe wird um ${shift} weitergeschoben (mod 26)</span>`;
  }
  inp.addEventListener("input", zeichne);
  sl.addEventListener("input", () => { shift = +sl.value; sv.textContent = shift; zeichne(); });
  wrap.append(z1, z2, out); container.append(wrap); zeichne();
}

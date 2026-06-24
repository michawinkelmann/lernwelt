// binaer.js — Dezimal ↔ Binär: Bits anklicken, Stellenwerte und Dezimalwert live.
// params = { bits:8, init:0 }
export function mount(container, params) {
  const p = params || {}, n = p.bits || 8;
  let bits = []; let v0 = p.init || 0;
  for (let i = n - 1; i >= 0; i--) bits.push((v0 >> i) & 1);
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2);align-items:center";
  const reihe = document.createElement("div"); reihe.style.cssText = "display:flex;gap:.3rem;flex-wrap:wrap;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.06rem";
  const knoepfe = [];
  for (let i = 0; i < n; i++) {
    const stelle = Math.pow(2, n - 1 - i);
    const cell = document.createElement("div"); cell.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:.15rem";
    const b = document.createElement("button"); b.type = "button";
    b.style.cssText = "width:2.1em;height:2.1em;font-size:1.1rem;border:1px solid var(--linie);border-radius:var(--radius-klein);cursor:pointer;background:var(--flaeche);color:var(--text)";
    b.setAttribute("aria-label", "Bit Stellenwert " + stelle);
    b.addEventListener("click", () => { bits[i] ^= 1; zeichne(); });
    const w = document.createElement("span"); w.textContent = stelle; w.style.cssText = "font-size:.7rem;color:var(--text-leise)";
    cell.append(b, w); reihe.append(cell); knoepfe.push(b);
  }
  function zeichne() {
    let dez = 0;
    bits.forEach((bit, i) => {
      const b = knoepfe[i]; b.textContent = bit;
      b.style.background = bit ? "var(--akzent)" : "var(--flaeche)";
      b.style.color = bit ? "#fff" : "var(--text)";
      if (bit) dez += Math.pow(2, n - 1 - i);
    });
    out.innerHTML = `Binär <strong>${bits.join("")}</strong> = <strong>${dez}</strong> (dezimal)`;
  }
  wrap.append(reihe, out); container.append(wrap); zeichne();
}

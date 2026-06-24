// anteil-faerben.js — Anteil eines Ganzen durch Anklicken von Feldern färben; sofortige Selbstkontrolle.
// Grundvorstellung "Anteil" (vom Hofe): Handlung → Symbol, mit ✓/✗-Rückmeldung ohne Notendruck.
// params = { teile:8, spalten:4, ziel?:{ z:3, n:8 } }  (ziel optional: Zielanteil zum Treffen)
export function mount(container, params) {
  const p = params || {};
  const teile = Math.max(2, p.teile || 8);
  const spalten = Math.max(1, p.spalten || (teile % 4 === 0 ? 4 : (teile % 5 === 0 ? 5 : teile)));
  const ziel = (p.ziel && p.ziel.n) ? p.ziel : null;
  const gefaerbt = new Array(teile).fill(false);
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2);align-items:center";
  if (ziel) {
    const z = document.createElement("p");
    z.style.cssText = "margin:0;font-weight:600;text-align:center";
    z.innerHTML = `Aufgabe: Färbe den Anteil <strong>${ziel.z}/${ziel.n}</strong> der Felder.`;
    wrap.append(z);
  }
  const gitter = document.createElement("div");
  gitter.style.cssText = `display:grid;grid-template-columns:repeat(${spalten},2.2rem);gap:5px`;
  const zellen = [];
  for (let i = 0; i < teile; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Feld " + (i + 1) + " färben");
    b.style.cssText = "width:2.2rem;height:2.2rem;border:1.5px solid var(--akzent);border-radius:6px;background:var(--flaeche);cursor:pointer";
    b.addEventListener("click", () => { gefaerbt[i] = !gefaerbt[i]; mal(); aktualisiere(); });
    gitter.append(b); zellen.push(b);
  }
  const out = document.createElement("p");
  out.setAttribute("role", "status");
  out.style.cssText = "margin:0;text-align:center;font-size:1.05rem;min-height:1.4em";
  function mal() {
    zellen.forEach((b, i) => {
      b.style.background = gefaerbt[i] ? "var(--akzent)" : "var(--flaeche)";
      b.setAttribute("aria-pressed", String(gefaerbt[i]));
    });
  }
  function kuerze(z, n) {
    const g = (a, b) => b ? g(b, a % b) : a;
    const d = g(z, n) || 1;
    return d > 1 ? ` = ${z / d}/${n / d}` : "";
  }
  function aktualisiere() {
    const k = gefaerbt.filter(Boolean).length;
    const dez = (Math.round(k / teile * 1000) / 1000).toLocaleString("de-DE");
    const proz = (Math.round(k / teile * 1000) / 10).toLocaleString("de-DE");
    let txt = `gefärbt: <strong>${k}/${teile}</strong>${kuerze(k, teile)} = ${dez} = ${proz} %`;
    if (ziel) {
      const passt = Math.abs(k / teile - ziel.z / ziel.n) < 1e-9;
      txt += ` &nbsp; ${passt ? '<span style="color:var(--ok)">✓ genau richtig!</span>' : '<span style="color:var(--text-leise)">✗ noch nicht – passe die Anzahl an</span>'}`;
    }
    out.innerHTML = txt;
  }
  wrap.append(gitter, out); container.append(wrap); mal(); aktualisiere();
}

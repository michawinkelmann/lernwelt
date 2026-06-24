// automat.js — endlicher Automat Schritt für Schritt: Wort eingeben, Übergänge verfolgen, akzeptiert/abgelehnt.
// params = { zustaende:["q0","q1"], start:"q0", akzept:["q1"], alphabet:["a","b"],
//            uebergaenge:[{von:"q0",zeichen:"a",nach:"q1"}, ...], beispiel:"ab" }
export function mount(container, params) {
  const p = params || {};
  const Z = p.zustaende || ["q0", "q1"], start = p.start || Z[0], AK = new Set(p.akzept || []);
  const U = p.uebergaenge || [];
  const W = 360, H = 130, R = 20, y = 56;
  const pos = {}; Z.forEach((z, i) => pos[z] = { x: 40 + i * ((W - 80) / Math.max(1, Z.length - 1)), y });
  let wort = (p.beispiel || ""), schritt = 0, akt = start, pfad = [start];
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:440px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("p"); steuer.style.cssText = "margin:0;text-align:center";
  steuer.append(document.createTextNode("Wort: "));
  const inp = document.createElement("input"); inp.type = "text"; inp.value = wort; inp.maxLength = 16;
  inp.style.cssText = "width:8em;padding:.25em;border:1px solid var(--linie);border-radius:var(--radius-klein);background:var(--flaeche);color:var(--text);font-size:1rem"; inp.setAttribute("aria-label", "Eingabewort");
  const bStep = document.createElement("button"); bStep.type = "button"; bStep.textContent = "Schritt ▶"; bStep.className = "knopf klein";
  const bReset = document.createElement("button"); bReset.type = "button"; bReset.textContent = "Reset"; bReset.className = "knopf zweitrangig klein";
  steuer.append(document.createTextNode(" "), inp, document.createTextNode(" "), bStep, document.createTextNode(" "), bReset);
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  function naechster(z, c) { const t = U.find(t => t.von === z && t.zeichen === c); return t ? t.nach : null; }
  function zeichne() {
    let s = "";
    U.forEach(t => {
      const a = pos[t.von], b = pos[t.nach];
      if (t.von === t.nach) {
        s += `<path d="M ${a.x-8} ${a.y-R} Q ${a.x} ${a.y-R-26} ${a.x+8} ${a.y-R}" fill="none" stroke="var(--text-leise)" stroke-width="1.3"/>`;
        s += `<text x="${a.x}" y="${a.y-R-22}" text-anchor="middle" font-size="11" fill="var(--text-leise)">${t.zeichen}</text>`;
      } else {
        const dir = b.x > a.x ? 1 : -1, x1 = a.x + dir * R, x2 = b.x - dir * R;
        const arc = (b.x > a.x) ? 0 : 22;
        s += `<path d="M ${x1} ${a.y+ (arc?6:0)} Q ${(x1+x2)/2} ${a.y+arc+ (arc?14:0)} ${x2} ${b.y+(arc?6:0)}" fill="none" stroke="var(--text-leise)" stroke-width="1.3"/>`;
        s += `<polygon points="${x2},${b.y+(arc?6:0)} ${x2-dir*7},${b.y-4+(arc?6:0)} ${x2-dir*7},${b.y+4+(arc?6:0)}" fill="var(--text-leise)"/>`;
        s += `<text x="${(x1+x2)/2}" y="${a.y+arc-4+(arc?14:0)}" text-anchor="middle" font-size="11" fill="var(--text-leise)">${t.zeichen}</text>`;
      }
    });
    Z.forEach(z => {
      const c = pos[z], istAkt = z === akt;
      s += `<circle cx="${c.x}" cy="${c.y}" r="${R}" fill="${istAkt ? "var(--akzent)" : "var(--hauch)"}" stroke="var(--text)" stroke-width="1.5"/>`;
      if (AK.has(z)) s += `<circle cx="${c.x}" cy="${c.y}" r="${R-4}" fill="none" stroke="var(--text)" stroke-width="1"/>`;
      s += `<text x="${c.x}" y="${c.y+4}" text-anchor="middle" font-size="11" fill="${istAkt ? "#fff" : "var(--text)"}">${z}</text>`;
    });
    s += `<text x="${pos[start].x}" y="${pos[start].y + R + 13}" text-anchor="middle" font-size="9" fill="var(--text-leise)">Start</text>`;
    svg.innerHTML = s;
    const gelesen = wort.slice(0, schritt), rest = wort.slice(schritt);
    out.innerHTML = `Zustand: <strong>${akt}</strong>, gelesen: „${gelesen}", Rest: „${rest}"` +
      (schritt >= wort.length && wort.length ? ` → <strong>${AK.has(akt) ? "akzeptiert ✓" : "abgelehnt ✗"}</strong>` : "");
  }
  function reset() { wort = inp.value; schritt = 0; akt = start; pfad = [start]; zeichne(); }
  bStep.addEventListener("click", () => {
    if (schritt < wort.length) { const c = wort[schritt]; const nx = naechster(akt, c); if (nx === null) { out.innerHTML = `Kein Übergang für „${c}" in ${akt} → <strong>abgelehnt ✗</strong>`; schritt = wort.length; return; } akt = nx; schritt++; zeichne(); }
  });
  bReset.addEventListener("click", reset);
  inp.addEventListener("input", reset);
  wrap.append(svg, steuer, out); container.append(wrap); reset();
}

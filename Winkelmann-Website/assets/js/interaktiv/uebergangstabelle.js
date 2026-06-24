// uebergangstabelle.js — endlicher Automat als Übergangstabelle; Wort Schritt für Schritt.
// Zeilen = Zustände (→ Start, * akzeptierend), Spalten = Eingabezeichen, Zellen = Folgezustand.
// params = { zustaende, start, akzept:[], alphabet:[], uebergaenge:[{von,zeichen,nach}], beispiel }
export function mount(container, params) {
  const p = params || {};
  const Z = p.zustaende || ["q0", "q1"], AL = p.alphabet || ["a", "b"], AK = new Set(p.akzept || []);
  const start = p.start || Z[0], wort = (p.beispiel || "").split("");
  const delta = {}; (p.uebergaenge || []).forEach(u => delta[u.von + "|" + u.zeichen] = u.nach);
  let pos = 0, cur = start;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2);align-items:center";
  const tabBox = document.createElement("div"); tabBox.style.cssText = "overflow-x:auto;max-width:100%";
  const wortBox = document.createElement("p"); wortBox.style.cssText = "margin:0;text-align:center;font-size:1.25rem;letter-spacing:.2em;font-variant-numeric:tabular-nums";
  const knoepfe = document.createElement("div"); knoepfe.style.cssText = "display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.0rem;min-height:2.4em";
  function tabelle() {
    const akt = pos < wort.length ? wort[pos] : null;
    let h = `<table style="border-collapse:collapse;font-size:1rem"><thead><tr><th style="padding:.3em .6em;border:1px solid var(--linie)">δ</th>`;
    AL.forEach(z => h += `<th style="padding:.3em .7em;border:1px solid var(--linie);${z === akt ? "background:var(--hauch)" : ""}">${z}</th>`);
    h += `</tr></thead><tbody>`;
    Z.forEach(zz => { const istCur = zz === cur;
      h += `<tr><th style="padding:.3em .6em;border:1px solid var(--linie);text-align:left;${istCur ? "background:var(--hauch);font-weight:bold" : ""}">${zz === start ? "→ " : ""}${zz}${AK.has(zz) ? " *" : ""}</th>`;
      AL.forEach(z => { const ziel = delta[zz + "|" + z] || "–"; const hot = istCur && z === akt;
        h += `<td style="padding:.3em .8em;border:1px solid var(--linie);text-align:center;${hot ? "background:var(--akzent);color:#fff;font-weight:bold" : ""}">${ziel}</td>`; });
      h += `</tr>`; });
    h += `</tbody></table>`; tabBox.innerHTML = h;
  }
  function zeigeWort() { wortBox.innerHTML = wort.map((c, i) => `<span style="${i === pos ? "color:var(--akzent);font-weight:bold;text-decoration:underline" : i < pos ? "color:var(--text-leise)" : ""}">${c}</span>`).join("") || "(leeres Wort)"; }
  function status() {
    if (pos < wort.length) out.innerHTML = `Zustand <strong>${cur}</strong>, lese „${wort[pos]}" → Folgezustand <strong>${delta[cur + "|" + wort[pos]] || "–"}</strong> (in der Tabelle markiert).`;
    else { const ok = AK.has(cur); out.innerHTML = `Wort zu Ende im Zustand <strong>${cur}</strong> → <strong style="color:${ok ? "var(--ok)" : "var(--fehler)"}">${ok ? "akzeptiert ✓" : "abgelehnt ✗"}</strong>`; }
  }
  function render() { tabelle(); zeigeWort(); status(); }
  function schritt() { if (pos < wort.length) { cur = delta[cur + "|" + wort[pos]] || cur; pos++; render(); } }
  function reset() { pos = 0; cur = start; render(); }
  function knopf(txt, fn) { const b = document.createElement("button"); b.type = "button"; b.textContent = txt;
    b.style.cssText = "padding:.35em .9em;border:1px solid var(--linie);border-radius:var(--radius);background:var(--flaeche);cursor:pointer;font-size:.95rem"; b.addEventListener("click", fn); return b; }
  knoepfe.append(knopf("Schritt ▶", schritt), knopf("Reset", reset));
  wrap.append(tabBox, wortBox, knoepfe, out); container.append(wrap); render();
}

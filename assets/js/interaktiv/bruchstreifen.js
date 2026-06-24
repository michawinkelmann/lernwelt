// bruchstreifen.js — Bruchstreifen-Tafel: gleich lange Streifen, in 1,2,3,…,nennerMax Teile geteilt.
// Zwei Dropdowns wählen je einen Bruch (Zähler/Nenner aus den vorhandenen Streifen); beide werden
// farbig hervorgehoben und verglichen. Ausgabe nennt < / > / = (Gleichheit wird erkannt) samt Dezimalwerten.
// Kein Drag & Drop (Projektregel): Auswahl nur über Dropdowns. Reines Vanilla-JS/SVG, keine externen Libs.
// params = { nennerMax:6 }

// --- Vergleichslogik, DOM-frei und damit gut testbar ---
// Vergleicht zwei Brüche a={z,n} und b={z,n} exakt über Kreuzmultiplikation (kein Rundungsfehler).
// Rückgabe: -1  (a < b), 0 (a = b), 1 (a > b).
export function vergleicheBrueche(a, b) {
  const links = a.z * b.n;
  const rechts = b.z * a.n;
  if (links < rechts) return -1;
  if (links > rechts) return 1;
  return 0;
}

// Kürzt einen Bruch auf seine Grundform; nur zur Anzeige (z. B. 2/4 = 1/2).
function kuerze(z, n) {
  const ggt = (a, b) => (b ? ggt(b, a % b) : a);
  const d = ggt(z, n) || 1;
  return { z: z / d, n: n / d };
}

// Dezimalwert deutsch formatiert (Komma), auf 3 Nachkommastellen.
function dezimal(z, n) {
  return (Math.round((z / n) * 1000) / 1000).toLocaleString("de-DE");
}

export function mount(container, params) {
  const p = params || {};
  const nennerMax = Math.max(2, Math.min(12, p.nennerMax || 6));
  // Auswahl je Dropdown: { n, z } — Startwerte mit erkennbarer Beziehung (1/3 vs 1/4).
  const auswahl = [
    { n: Math.min(3, nennerMax), z: 1 },
    { n: Math.min(4, nennerMax), z: 1 }
  ];

  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";

  // --- Streifen-Tafel als SVG ---
  const W = 320, hStreifen = 26, luecke = 7, beschrBreite = 40;
  const innen = W - beschrBreite;
  const H = nennerMax * (hStreifen + luecke) - luecke;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label",
    `Bruchstreifen-Tafel mit Streifen zu Nennern 1 bis ${nennerMax}; die zwei gewählten Brüche sind farbig hervorgehoben.`);
  svg.style.cssText = "width:100%;max-width:430px;height:auto;display:block;margin:0 auto";

  // Farben für die beiden gewählten Brüche (zusätzlich zu ✓/✗ nie nur Farbe – Text steht in der Ausgabe).
  const farbe = ["var(--akzent)", "var(--ok)"];

  // --- Steuerung: zwei Dropdowns ---
  const steuer = document.createElement("div");
  steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.5rem 1.4rem;justify-content:center;align-items:center";

  const selBoxen = [];
  function baueDropdown(index) {
    const label = document.createElement("label");
    label.style.whiteSpace = "nowrap";
    const punkt = document.createElement("span");
    punkt.setAttribute("aria-hidden", "true");
    punkt.textContent = "■ "; // gefülltes Quadrat als Farb-Legende
    punkt.style.color = farbe[index];
    const sel = document.createElement("select");
    sel.setAttribute("aria-label", "Bruch " + (index + 1) + " auswählen");
    sel.style.cssText = "padding:.3em;border:1px solid var(--linie);border-radius:var(--radius-klein);background:var(--flaeche);color:var(--text);font-size:1rem";
    // Optionen: alle Brüche z/n mit 1<=n<=nennerMax und 1<=z<=n
    for (let n = 1; n <= nennerMax; n++) {
      for (let z = 1; z <= n; z++) {
        const o = document.createElement("option");
        o.value = z + "/" + n;
        o.textContent = z + "/" + n;
        sel.append(o);
      }
    }
    sel.value = auswahl[index].z + "/" + auswahl[index].n;
    sel.addEventListener("change", () => {
      const [z, n] = sel.value.split("/").map(Number);
      auswahl[index] = { z, n };
      aktualisiere();
    });
    label.append(punkt, document.createTextNode("Bruch " + (index + 1) + ": "), sel);
    selBoxen.push(sel);
    return label;
  }
  steuer.append(baueDropdown(0), baueDropdown(1));

  // --- Ausgabe (Vergleich + Dezimalwerte) ---
  const out = document.createElement("p");
  out.setAttribute("role", "status");
  out.style.cssText = "margin:0;text-align:center;font-size:1.08rem;min-height:1.4em";

  function zeichne() {
    let s = "";
    for (let n = 1; n <= nennerMax; n++) {
      const y = (n - 1) * (hStreifen + luecke);
      const teil = innen / n;
      // Nenner-Beschriftung links
      s += `<text x="0" y="${y + hStreifen / 2 + 4}" font-size="11" fill="var(--text-leise)">1/${n}</text>`;
      for (let i = 0; i < n; i++) {
        // Ist dieses Teilstück Teil einer gewählten Markierung? (z. B. die ersten z Teile)
        let fuell = "var(--hauch)";
        for (let k = 0; k < 2; k++) {
          if (auswahl[k].n === n && i < auswahl[k].z) fuell = farbe[k];
        }
        s += `<rect x="${beschrBreite + i * teil}" y="${y}" width="${teil}" height="${hStreifen}" `
          + `fill="${fuell}" stroke="var(--linie)" stroke-width="1"/>`;
      }
    }
    svg.innerHTML = s;
  }

  function aktualisiere() {
    zeichne();
    const a = auswahl[0], b = auswahl[1];
    const cmp = vergleicheBrueche(a, b);
    const zeichen = cmp < 0 ? "<" : cmp > 0 ? ">" : "=";
    const dezA = dezimal(a.z, a.n), dezB = dezimal(b.z, b.n);
    let satz;
    if (cmp === 0) {
      // Gleichheit erkennen – auch bei verschiedenen Schreibweisen (z. B. 2/4 = 1/2).
      const ka = kuerze(a.z, a.n);
      const verschieden = a.z !== b.z || a.n !== b.n;
      const gleicherKern = (ka.z !== a.z || ka.n !== a.n);
      satz = `<span style="color:var(--ok)">✓ Gleich groß!</span> `
        + `<strong>${a.z}/${a.n} = ${b.z}/${b.n}</strong>`;
      if (verschieden && gleicherKern) {
        satz += ` &nbsp;(beide sind <strong>${ka.z}/${ka.n}</strong>)`;
      }
      satz += ` &nbsp;→ ${dezA} = ${dezB}`;
    } else {
      const groesser = cmp > 0 ? a : b;
      satz = `<span style="color:var(--ok)">✓ Gut verglichen!</span> `
        + `<strong>${a.z}/${a.n} ${zeichen} ${b.z}/${b.n}</strong>`
        + ` &nbsp;→ ${dezA} ${zeichen} ${dezB}`
        + ` &nbsp;<span style="color:var(--text-leise)">(${groesser.z}/${groesser.n} ist der größere Anteil)</span>`;
    }
    out.innerHTML = satz;
  }

  const hinweis = document.createElement("p");
  hinweis.style.cssText = "margin:0;text-align:center;font-size:.92rem;color:var(--text-leise)";
  hinweis.textContent = "Wähle zwei Brüche aus – die Streifen zeigen sofort, welcher länger ist.";

  wrap.append(hinweis, svg, steuer, out);
  container.append(wrap);
  aktualisiere();
}

// energiekette.js — interaktives Mini-Widget für den verstehen-Block (und die Erklärseite).
// Energieumwandlungsketten erkunden: Gerät wählen → Kette + genutzte Form + entwerteter Nebeneffekt.
// Reines Vanilla-JS, instanz-gescoped (keine globalen IDs), Theme über CSS-Variablen, ohne KaTeX.
// Einbindung: dieses Modul importieren und mount(containerElement) aufrufen (Lernbüro wie Erklärseite).

const GERAETE = [
  { name: "Taschenlampe",   kette: ["chemische Energie", "elektrische Energie", "Licht"], nutzen: 2, neben: "Wärme" },
  { name: "Wasserkocher",   kette: ["elektrische Energie", "thermische Energie"],         nutzen: 1, neben: "Schall (Blubbern)" },
  { name: "Ventilator",     kette: ["elektrische Energie", "Bewegungsenergie"],           nutzen: 1, neben: "Wärme & Schall" },
  { name: "Fahrrad-Dynamo", kette: ["Bewegungsenergie", "elektrische Energie", "Licht"],  nutzen: 2, neben: "Wärme" },
  { name: "Solarzelle",     kette: ["Strahlungsenergie", "elektrische Energie"],          nutzen: 1, neben: "Wärme" },
  { name: "Lautsprecher",   kette: ["elektrische Energie", "Schallenergie"],              nutzen: 1, neben: "Wärme" }
];

export function mount(container) {
  if (!container) return;
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-3)";

  // --- Auswahl ---
  const steuer = document.createElement("p");
  steuer.style.cssText = "margin:0";
  const label = document.createElement("label");
  label.style.cssText = "font-weight:600";
  label.append(document.createTextNode("Gerät: "));
  const sel = document.createElement("select");
  sel.style.cssText = "padding:.3em .5em;border:1px solid var(--linie);border-radius:var(--radius-klein);background:var(--flaeche);color:var(--text);font-size:1rem";
  GERAETE.forEach((g, i) => {
    const o = document.createElement("option");
    o.value = String(i); o.textContent = g.name; sel.append(o);
  });
  label.append(sel); steuer.append(label);

  // --- Diagramm + Texte ---
  const dia = document.createElement("div");
  dia.style.cssText = "display:flex;flex-wrap:wrap;align-items:stretch;gap:.4rem;justify-content:center";
  const neben = document.createElement("p");
  neben.style.cssText = "margin:0;text-align:center;color:var(--text-leise)";
  const cap = document.createElement("p");
  cap.setAttribute("role", "status");
  cap.style.cssText = "margin:0;font-size:.95rem";

  function box(text, istNutzen) {
    const b = document.createElement("span");
    b.style.cssText = "display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;" +
      "padding:.5em .7em;border-radius:var(--radius-klein);min-width:6.5em;background:var(--hauch);color:var(--text);" +
      "border:2px solid " + (istNutzen ? "var(--ok)" : "var(--linie)");
    const t = document.createElement("span"); t.textContent = text; b.append(t);
    if (istNutzen) {
      const tag = document.createElement("strong");
      tag.textContent = "✓ Nutzen";
      tag.style.cssText = "color:var(--ok);font-size:.78em;margin-top:.2em";
      b.append(tag);
    }
    return b;
  }
  function pfeil() {
    const a = document.createElement("span");
    a.setAttribute("aria-hidden", "true");
    a.textContent = "→";
    a.style.cssText = "display:flex;align-items:center;color:var(--akzent);font-weight:700;font-size:1.3rem";
    return a;
  }

  function render() {
    const g = GERAETE[+sel.value];
    dia.innerHTML = "";
    g.kette.forEach((stufe, i) => {
      if (i > 0) dia.append(pfeil());
      dia.append(box(stufe, i === g.nutzen));
    });
    neben.innerHTML = "↘ Ein Teil wird immer <strong>entwertet</strong> (Nebeneffekt): " + g.neben + ".";
    cap.textContent = "Beim " + g.name + " wird " + g.kette[0] + " in " + (g.kette.length - 1) +
      " Schritt(en) umgewandelt. Genutzt wird " + g.kette[g.nutzen] + "; ein Teil geht als " + g.neben + " verloren.";
  }
  sel.addEventListener("change", render);

  wrap.append(steuer, dia, neben, cap);
  container.append(wrap);
  render();
}

// ui.js — baut die komplette Simulations-Oberfläche aus dem Manifest, abhängig vom Modus:
// kontinuierlich (Start/Pause, Einzelschritt, Tempo, Stoppuhr), schrittweise (Weiter/Zurück,
// Schritte pro Sekunde) und statisch (nur Parameter). Überall identische Bedienlogik.

import { formatZahl, formatGroesse } from "./welt.js";

export function baueOberflaeche(manifest, halter) {
  const modus = manifest.modus;
  const mitWerkzeugen = manifest.werkzeuge !== false;
  const mitMessreihe = modus !== "statisch";

  const steuer = modus === "statisch" ? `
      <span class="sim-steuer-rechts">
        <button type="button" class="knopf zweitrangig klein" data-aktion="beamer" aria-pressed="false">Beamer</button>
        <button type="button" class="knopf zweitrangig klein" data-aktion="vollbild">Vollbild</button>
      </span>` : `
      <button type="button" class="knopf klein" data-aktion="start">${modus === "schrittweise" ? "Automatik" : "Start"}</button>
      ${modus === "schrittweise" ? `<button type="button" class="knopf zweitrangig klein" data-aktion="zurueck">← Zurück</button>` : ""}
      <button type="button" class="knopf zweitrangig klein" data-aktion="schritt">${modus === "schrittweise" ? "Weiter →" : "Einzelschritt"}</button>
      <button type="button" class="knopf zweitrangig klein" data-aktion="reset">Zurücksetzen</button>
      <label class="sim-tempo">${modus === "schrittweise" ? "Schritte/s" : "Tempo"}
        <select data-aktion="tempo">
          ${modus === "schrittweise"
            ? `<option value="1">1</option><option value="2" selected>2</option><option value="5">5</option><option value="10">10</option>`
            : `<option value="0.25">0,25×</option><option value="0.5">0,5×</option><option value="1" selected>1×</option>`}
        </select>
      </label>
      <span class="sim-steuer-rechts">
        ${mitMessreihe ? `<button type="button" class="knopf zweitrangig klein" data-aktion="csv">CSV</button>` : ""}
        <button type="button" class="knopf zweitrangig klein" data-aktion="beamer" aria-pressed="false">Beamer</button>
        <button type="button" class="knopf zweitrangig klein" data-aktion="vollbild">Vollbild</button>
      </span>`;

  halter.classList.add("sim");
  halter.innerHTML = `
    ${manifest.vorhersage ? `
    <section class="sim-poe merkkasten" aria-label="Vorhersage">
      <span class="merk-etikett">Vorhersage — bevor du startest</span>
      <p class="sim-poe-frage">${manifest.vorhersage.frage}</p>
      <div class="sim-poe-optionen" role="group" aria-label="Antwortmöglichkeiten">
        ${manifest.vorhersage.optionen.map((o, i) => `<button type="button" class="knopf zweitrangig klein" data-index="${i}">${o}</button>`).join("")}
      </div>
      <p class="sim-poe-status" role="status" hidden></p>
      <details class="sim-poe-aufloesung"><summary>Auflösung anzeigen (erst nach dem Experimentieren!)</summary><p>${manifest.vorhersage.aufloesung}</p></details>
    </section>` : ""}

    <div class="sim-buehne">
      <canvas class="sim-canvas" aria-label="Simulationsfläche: ${manifest.titel}"></canvas>
      <p class="sim-werkzeug-status" role="status" aria-live="polite"></p>
    </div>

    <div class="sim-steuer" role="group" aria-label="Simulationssteuerung">${steuer}</div>

    ${mitWerkzeugen ? `
    <div class="sim-werkzeuge" role="group" aria-label="Messwerkzeuge">
      <span class="sim-werkzeug-label">Messwerkzeuge:</span>
      <button type="button" class="knopf zweitrangig klein" data-werkzeug="lineal" aria-pressed="false">Lineal</button>
      <button type="button" class="knopf zweitrangig klein" data-werkzeug="winkel" aria-pressed="false">Winkelmesser</button>
      ${modus === "kontinuierlich" ? `<button type="button" class="knopf zweitrangig klein" data-aktion="stoppuhr">Zwischenzeit</button>` : ""}
    </div>` : ""}

    <div class="sim-unten">
      <section class="sim-parameter" aria-label="Parameter">
        <h2 class="sim-abschnitt-titel">Parameter</h2>
        ${manifest.parameter.map(steuerelementHtml).join("")}
        ${manifest.presets && manifest.presets.length ? `
        <div class="sim-presets" role="group" aria-label="Voreinstellungen">
          ${manifest.presets.map((v, i) => `<button type="button" class="knopf zweitrangig klein" data-preset="${i}">${v.name}</button>`).join("")}
        </div>` : ""}
        ${manifest.modellgrenzen ? `<p class="sim-modellgrenzen"><strong>Modell:</strong> ${manifest.modellgrenzen}</p>` : ""}
      </section>

      ${(manifest.anzeigen.length || (manifest.diagramme || []).length || mitMessreihe) ? `
      <section class="sim-messung" aria-label="Messwerte">
        <h2 class="sim-abschnitt-titel">Messwerte</h2>
        <dl class="sim-anzeigen">
          ${manifest.anzeigen.map(a => `
            <div class="sim-anzeige" data-anzeige="${a.id}">
              <dt>${a.label}</dt>
              <dd><b>–</b><span>${a.einheit || ""}</span></dd>
            </div>`).join("")}
        </dl>
        <dl class="sim-anzeigen sim-bilanz" hidden></dl>
        ${(manifest.diagramme || []).map((d, i) => `
          <figure class="sim-diagramm">
            <figcaption>${d.titel}</figcaption>
            <canvas data-diagramm="${i}" aria-label="Diagramm: ${d.titel}"></canvas>
          </figure>`).join("")}
        ${mitMessreihe ? `
        <details class="sim-tabelle">
          <summary>Messtabelle anzeigen</summary>
          <div class="sim-tabelle-inhalt" tabindex="0"></div>
        </details>` : ""}
      </section>` : ""}
    </div>

    ${manifest.beobachtung && manifest.beobachtung.length ? `
    <section class="merkkasten sim-beobachtung" aria-label="Beobachtungsaufträge">
      <span class="merk-etikett">Beobachtungsaufträge</span>
      <ol>${manifest.beobachtung.map(b => `<li>${b}</li>`).join("")}</ol>
    </section>` : ""}
  `;

  return {
    canvas: halter.querySelector(".sim-canvas"),
    werkzeugStatus: halter.querySelector(".sim-werkzeug-status"),
    startKnopf: halter.querySelector('[data-aktion="start"]'),
    tabelle: halter.querySelector(".sim-tabelle-inhalt"),
    bilanz: halter.querySelector(".sim-bilanz"),
    halter
  };
}

// Baut das passende Steuerelement: Toggle (an/aus), Auswahl (segmentierte Knöpfe) oder Schieberegler.
function steuerelementHtml(p) {
  if (p.typ === "toggle") {
    const an = !!p.start;
    return `<div class="sim-regler sim-toggle" data-parameter="${p.id}">
        <span class="sim-regler-kopf"><span>${p.label}</span></span>
        <button type="button" class="sim-schalter" role="switch" aria-checked="${an ? "true" : "false"}" data-toggle aria-label="${p.label}">
          <span class="sim-schalter-spur"><span class="sim-schalter-knauf"></span></span>
          <span class="sim-schalter-text">${an ? "an" : "aus"}</span>
        </button>
      </div>`;
  }
  if (p.typ === "auswahl") {
    return `<div class="sim-regler sim-auswahl" data-parameter="${p.id}">
        <span class="sim-regler-kopf"><span>${p.label}</span></span>
        <div class="sim-segment" role="group" aria-label="${p.label}">
          ${(p.optionen || []).map(o => `<button type="button" data-wert="${o.wert}" aria-pressed="${o.wert === p.start ? "true" : "false"}">${o.label}</button>`).join("")}
        </div>
      </div>`;
  }
  return `<label class="sim-regler" data-parameter="${p.id}">
      <span class="sim-regler-kopf"><span>${p.label}</span>
        <output>${formatGroesse(p.start, p.einheit, dezimalstellen(p.schritt))}</output></span>
      <input type="range" min="${p.min}" max="${p.max}" step="${p.schritt}" value="${p.start}" aria-label="${p.label}${p.einheit ? " in " + p.einheit : ""}">
    </label>`;
}

export function dezimalstellen(schritt) {
  const text = String(schritt);
  return text.includes(".") ? Math.min(3, text.split(".")[1].length) : 0;
}

// Live-Wert neben dem Slider aktualisieren
export function zeigeReglerWert(halter, manifest, werte) {
  manifest.parameter.forEach(p => {
    const regler = halter.querySelector(`[data-parameter="${p.id}"]`);
    if (!regler) return;
    if (p.typ === "toggle") {
      const b = regler.querySelector("[data-toggle]");
      const an = !!werte[p.id];
      b.setAttribute("aria-checked", an ? "true" : "false");
      const t = b.querySelector(".sim-schalter-text"); if (t) t.textContent = an ? "an" : "aus";
      return;
    }
    if (p.typ === "auswahl") {
      regler.querySelectorAll("[data-wert]").forEach(btn => btn.setAttribute("aria-pressed", String(+btn.dataset.wert === werte[p.id])));
      return;
    }
    const out = regler.querySelector("output"); if (out) out.textContent = formatGroesse(werte[p.id], p.einheit, dezimalstellen(p.schritt));
    const eingabe = regler.querySelector("input");
    if (eingabe && Math.abs(+eingabe.value - werte[p.id]) > 1e-9) eingabe.value = werte[p.id];
  });
}

// Digitalanzeigen aktualisieren (Werte bereits in Anzeigeeinheiten)
export function zeigeAnzeigen(halter, manifest, messwerte) {
  manifest.anzeigen.forEach(a => {
    const knoten = halter.querySelector(`[data-anzeige="${a.id}"] b`);
    if (knoten) knoten.textContent = formatZahl(messwerte[a.id], a.stellen ?? 2);
  });
}

// Endbilanz (z. B. Wurfweite) einblenden; Bilanzwerte kommen in SI und werden hier skaliert
export function zeigeBilanz(bilanzKnoten, manifest, werte) {
  if (!bilanzKnoten) return;
  if (!werte) { bilanzKnoten.hidden = true; bilanzKnoten.innerHTML = ""; return; }
  const def = manifest.bilanz || {};
  bilanzKnoten.innerHTML = Object.keys(def).map(id => `
    <div class="sim-anzeige ist-bilanz">
      <dt>${def[id].label}</dt>
      <dd><b>${formatZahl(werte[id] * (def[id].faktor ?? 1), def[id].stellen ?? 2)}</b><span>${def[id].einheit || ""}</span></dd>
    </div>`).join("");
  bilanzKnoten.hidden = false;
}

// Messtabelle (gekürzt) rendern
export function zeigeTabelle(ziel, messreihe) {
  const maxZeilen = 300;
  const zeilen = messreihe.zeilen.slice(0, maxZeilen);
  ziel.innerHTML = `
    <table>
      <thead><tr>${messreihe.spalten.map(s => `<th>${s.label}${s.einheit ? " in " + s.einheit : ""}</th>`).join("")}</tr></thead>
      <tbody>${zeilen.map(z => `<tr>${z.map(w => `<td>${formatZahl(w, 3)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
    ${messreihe.zeilen.length > maxZeilen ? `<p>Gekürzt auf ${maxZeilen} Zeilen — der CSV-Export enthält alle ${messreihe.zeilen.length} Messpunkte.</p>` : ""}`;
}

// POE-Vorhersage verdrahten
export function verdrahteVorhersage(halter) {
  const poe = halter.querySelector(".sim-poe");
  if (!poe) return;
  const status = poe.querySelector(".sim-poe-status");
  poe.querySelectorAll(".sim-poe-optionen button").forEach(knopf => {
    knopf.addEventListener("click", () => {
      poe.querySelectorAll(".sim-poe-optionen button").forEach(k => k.classList.remove("ist-gewaehlt"));
      knopf.classList.add("ist-gewaehlt");
      status.hidden = false;
      status.textContent = `Deine Vorhersage: „${knopf.textContent}“. Jetzt überprüfe sie in der Simulation!`;
    });
  });
}

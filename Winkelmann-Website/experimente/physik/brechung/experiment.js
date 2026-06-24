// experiment.js — Interaktives Experiment: Brechungsgesetz an der Halbscheibe (Klasse 7/8).
// Realitätsnahe Messpraxis statt fertiger Formel: Der Laser trifft die ebene Seite
// der Halbscheibe genau im Mittelpunkt der 360°-Winkelscheibe; den Brechungswinkel β
// liest man SELBST an der Skala ab und trägt ihn in die Messtabelle ein. Die
// sin-Quotienten entlarven das Brechungsgesetz, der Grenzwinkel der Totalreflexion
// (Modus „Material → Luft“) liefert einen zweiten, unabhängigen Weg zur Brechzahl n.
// Die kleine Ablese-Streuung kommt deterministisch aus helfer.streuung — die
// Modulebene ist DOM-frei, pruefFaelle und TESTS laufen in Node.
// Kontrollwerte (exakt nachgerechnet): β(α=30°, n=1,49) = 19,61°;
// β(α=60°, n=1,333) = 40,52°; β(α=45°, n=1,585) = 26,50°.

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel,
  bauePhasen, csvHerunterladen, farbe
} from "../../../assets/js/experiment/helfer.js";

// ---------- Materialien (die Brechzahl von Plexiglas ist das Messziel — n bleibt verdeckt!) ----------
export const MATERIALIEN = [
  { id: "plexi", name: "Plexiglas-Halbscheibe", kurz: "Plexiglas", n: 1.490, anzeigeN: false },
  { id: "wasser", name: "Wasser-Halbschale", kurz: "Wasser", n: 1.333, anzeigeN: true },   // Literaturwert als Kontrolle
  { id: "x", name: "Material X (unbekannt)", kurz: "Material X", n: 1.585, anzeigeN: false, geheim: true } // = Polycarbonat
];

export const ALPHA_MAX = 80;             // Schwenkbereich des Lasers in °
export const STREU_SPANNE = 0.8;         // Ablese-/Justage-Streuung: ±0,4°
export const EINTRAG_TOLERANZ = 0.7;     // akzeptierte Abweichung beim β-Ablesen in °
export const QUOTIENT_TOLERANZ = 0.03;   // Prüfung der sin α / sin β-Eingaben
export const GRENZWINKEL_TOLERANZ = 1.0; // akzeptierte Abweichung beim αg-Notieren in °
export const N_AUS_AG_TOLERANZ = 0.05;   // Prüfung der Eingabe n = 1 / sin αg
export const MIN_MESSUNGEN = 5;          // Winkel (α > 0) pro Material

// Vergleichstabelle für die Material-Identifikation (Auswertung)
export const N_TABELLE = [
  { name: "Wasser", n: 1.33 },
  { name: "Plexiglas", n: 1.49 },
  { name: "Polycarbonat", n: 1.59 },
  { name: "Diamant", n: 2.42 }
];
// welches Tabellenmaterial zu welcher Probe gehört (für das Feedback)
export const IDENT_ERWARTET = { plexi: "Plexiglas", wasser: "Wasser", x: "Polycarbonat" };

// ---------- Modell (rein, Node-testbar) ----------
const RAD = Math.PI / 180;

// Eintritt Luft → Material: sin α = n · sin β  ⇒  β = asin(sin α / n)
export function betaIdeal(n, alphaGrad) {
  return Math.asin(Math.sin(alphaGrad * RAD) / n) / RAD;
}
// „wahrer Zeigerwert“ an der Skala: ideal + reproduzierbare Streuung (±0,4°);
// bei α = 0 exakt 0 — der Strahl läuft ungebrochen auf dem Lot durch.
export function betaReal(material, alphaGrad) {
  if (alphaGrad === 0) return 0;
  return betaIdeal(material.n, alphaGrad) + streuung("b:" + material.id + ":" + alphaGrad, STREU_SPANNE);
}

// Grenzwinkel der Totalreflexion: sin αg = 1/n
export function grenzwinkel(n) { return Math.asin(1 / n) / RAD; }
export function istTotalreflexion(n, betaInnenGrad) {
  return n * Math.sin(betaInnenGrad * RAD) > 1;
}
// Austritt Material → Luft: sin α_aus = n · sin β_innen (sonst NaN = Totalreflexion)
export function austrittIdeal(n, betaInnenGrad) {
  const s = n * Math.sin(betaInnenGrad * RAD);
  return s > 1 ? NaN : Math.asin(s) / RAD;
}

// Auswertung: Quotient sin α / sin β je Messzeile (β = 0 → da ist nichts zu teilen)
export function quotientAusZeile(alphaGrad, betaGrad) {
  const sb = Math.sin(betaGrad * RAD);
  return sb > 0 ? Math.sin(alphaGrad * RAD) / sb : NaN;
}
export function nMittel(zeilen) {
  return mittel(zeilen.map(z => quotientAusZeile(z.alpha, z.beta)));
}
// zweiter Weg: Brechzahl aus dem Grenzwinkel, n = 1 / sin αg
export function nAusGrenzwinkel(agGrad) {
  const s = Math.sin(agGrad * RAD);
  return s > 0 ? 1 / s : NaN;
}
// nächstliegendes Material aus der Vergleichstabelle
export function materialAusN(n) {
  if (!Number.isFinite(n)) return null;
  let best = N_TABELLE[0];
  for (const e of N_TABELLE) if (Math.abs(e.n - n) < Math.abs(best.n - n)) best = e;
  return best;
}
export function bewertungN(nGemessen, nWahr) {
  const abw = Math.abs(nGemessen - nWahr);
  if (abw <= 0.03) return { stufe: "sehr gut", abw };
  if (abw <= 0.06) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}

// ---------- Prüffälle (analytisch bekannte Kontrollwerte) ----------
export const pruefFaelle = [
  { n: 1.490, alpha: 30, soll: { beta: 19.61 }, toleranz: 0.01 },
  { n: 1.333, alpha: 60, soll: { beta: 40.52 }, toleranz: 0.01 },
  { n: 1.585, alpha: 45, soll: { beta: 26.50 }, toleranz: 0.01 },
  { n: 1.490, soll: { grenzwinkel: 42.16 }, toleranz: 0.01 },
  { n: 1.333, soll: { grenzwinkel: 48.61 }, toleranz: 0.01 },
  { n: 1.585, soll: { grenzwinkel: 39.12 }, toleranz: 0.01 }
];

export const TESTS = [
  { name: "β-Kontrollwerte: 30°/1,49→19,61 · 60°/1,333→40,52 · 45°/1,585→26,50", ok: () =>
    Math.abs(betaIdeal(1.49, 30) - 19.61) < 0.01 && Math.abs(betaIdeal(1.333, 60) - 40.52) < 0.01 && Math.abs(betaIdeal(1.585, 45) - 26.50) < 0.01 },
  { name: "α = 0 → β = 0 (ideal und abgelesen): keine Brechung", ok: () =>
    MATERIALIEN.every(m => betaIdeal(m.n, 0) === 0 && betaReal(m, 0) === 0) },
  { name: "Quotienten-Pipeline aus perfekten Werten exakt n", ok: () =>
    MATERIALIEN.every(m => { const zeilen = [10, 20, 30, 40, 50, 60, 70].map(a => ({ alpha: a, beta: betaIdeal(m.n, a) })); return Math.abs(nMittel(zeilen) - m.n) < 1e-9; }) },
  { name: "Grenzwinkel: Plexi 42,2° · Wasser 48,6° · X 39,1°", ok: () =>
    Math.abs(grenzwinkel(1.49) - 42.2) < 0.05 && Math.abs(grenzwinkel(1.333) - 48.6) < 0.05 && Math.abs(grenzwinkel(1.585) - 39.1) < 0.05 },
  { name: "Totalreflexion genau für β_innen > αg (kein Austritt)", ok: () =>
    MATERIALIEN.every(m => { const ag = grenzwinkel(m.n); return istTotalreflexion(m.n, ag + 0.05) && !istTotalreflexion(m.n, ag - 0.05) && Number.isNaN(austrittIdeal(m.n, ag + 0.5)) && Number.isFinite(austrittIdeal(m.n, ag - 0.5)); }) },
  { name: "Ablese-Streuung höchstens ±0,4°", ok: () =>
    MATERIALIEN.every(m => { for (let a = 1; a <= ALPHA_MAX; a++) if (Math.abs(betaReal(m, a) - betaIdeal(m.n, a)) > 0.4 + 1e-12) return false; return true; }) },
  { name: "Streuung deterministisch (gleicher Winkel → gleicher Wert)", ok: () =>
    MATERIALIEN.every(m => [7, 30, 55, 80].every(a => betaReal(m, a) === betaReal(m, a))) },
  { name: "parseDezimal + Eintrag-Toleranz ±0,7°", ok: () =>
    parseDezimal("19,6") === 19.6 && parseDezimal("19.6") === 19.6 && Number.isNaN(parseDezimal("zwanzig")) &&
    ablesungOk(19.2, 19.61, EINTRAG_TOLERANZ) && !ablesungOk(18.8, 19.61, EINTRAG_TOLERANZ) && !ablesungOk(NaN, 19.61, EINTRAG_TOLERANZ) },
  { name: "Modus-2-Symmetrie (Strahlumkehr): asin(n·sin β) invertiert Modus 1", ok: () =>
    MATERIALIEN.every(m => [5, 15, 25, 35, 45, 55, 65, 75, 80].every(a => Math.abs(austrittIdeal(m.n, betaIdeal(m.n, a)) - a) < 1e-9)) },
  { name: "Zwei Wege, ein Ergebnis: 1/sin(αg(n)) = n", ok: () =>
    MATERIALIEN.every(m => Math.abs(nAusGrenzwinkel(grenzwinkel(m.n)) - m.n) < 1e-12) },
  { name: "Material-Identifikation über die n-Tabelle", ok: () =>
    materialAusN(1.34).name === "Wasser" && materialAusN(1.50).name === "Plexiglas" && materialAusN(1.58).name === "Polycarbonat" && materialAusN(2.3).name === "Diamant" && materialAusN(NaN) === null },
  { name: "Prüffälle konsistent", ok: () =>
    pruefFaelle.every(p => p.soll.beta !== undefined
      ? Math.abs(betaIdeal(p.n, p.alpha) - p.soll.beta) <= p.toleranz
      : Math.abs(grenzwinkel(p.n) - p.soll.grenzwinkel) <= p.toleranz) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    material: MATERIALIEN[0],
    modus: 1,                 // 1: Luft → Material, 2: Material → Luft
    alpha: 30,                // Sliderwert in ° (Modus 2: Winkel im Material)
    messungen: { plexi: [], wasser: [], x: [] }, // je Material: {alpha, beta, quotText, quotOk}
    agNotiert: {},            // materialId → notierter Grenzwinkel
    nAgOk: {},                // materialId → bestätigtes n aus dem Grenzwinkel
    ident: {},                // materialId → gewählter Tabellenname
    phase: "aufbau"
  };
  const mess = () => zustand.messungen[zustand.material.id];

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], id => {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
  });

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="380" height="436" aria-label="Draufsicht auf die runde Winkelscheibe mit Gradskala. In der unteren Hälfte liegt die durchsichtige Halbscheibe, ihre ebene Seite geht durch den Mittelpunkt. Das Lot ist gestrichelt eingezeichnet. Der Laserstrahl trifft den Mittelpunkt und knickt dort ab; ein schwacher Reflex ist angedeutet."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Zeichnung (Draufsicht auf die Winkelscheibe) ----------
  const CX = 190, CY = 200, R_SCHEIBE = 106, R_TICK = 128, R_RING = 148, R_LABEL = 160;
  // Punkt im Winkel grad (von oben = Lot, im Uhrzeigersinn) und Abstand r vom Mittelpunkt
  const punkt = (grad, r) => [CX + Math.sin(grad * RAD) * r, CY - Math.cos(grad * RAD) * r];

  function strahl(vonGrad, vonR, bisGrad, bisR, breite, alpha, cFarbe) {
    const [x1, y1] = punkt(vonGrad, vonR), [x2, y2] = punkt(bisGrad, bisR);
    ctx.save();
    ctx.globalAlpha = alpha; ctx.strokeStyle = cFarbe; ctx.lineWidth = breite;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFehler = farbe("--fehler", "#b33"),
          cFlaeche = farbe("--flaeche");
    const m = zustand.material;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scheibenteller + äußerer Ring
    ctx.beginPath(); ctx.arc(CX, CY, R_RING, 0, 7);
    ctx.fillStyle = cFlaeche; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = cText; ctx.stroke();

    // Gradskala: Striche im 1°-Abstand, länger bei 5° und 10°, Zahlen alle 10°
    for (let d = 0; d < 360; d++) {
      const lang = d % 10 === 0 ? 13 : d % 5 === 0 ? 9 : 5;
      const [x1, y1] = punkt(d, R_TICK), [x2, y2] = punkt(d, R_TICK + lang);
      ctx.strokeStyle = d % 10 === 0 ? cText : cLeise; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.font = "9px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let d = 0; d < 360; d += 10) {
      let v = d % 180; v = Math.min(v, 180 - v); // 0 am Lot, 90 an der ebenen Fläche
      const [x, y] = punkt(d, R_LABEL);
      ctx.fillStyle = v % 30 === 0 ? cText : cLeise;
      ctx.fillText(String(v), x, y);
    }

    // Halbscheibe (untere Hälfte), ebene Seite durch den Mittelpunkt
    ctx.beginPath(); ctx.arc(CX, CY, R_SCHEIBE, 0, Math.PI); ctx.closePath();
    ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = cAkzent; ctx.fill(); ctx.restore();
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX - R_SCHEIBE, CY); ctx.lineTo(CX + R_SCHEIBE, CY); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(m.kurz, CX, CY + 60);

    // Lot (gestrichelt, senkrecht zur ebenen Fläche)
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(CX, CY - R_TICK); ctx.lineTo(CX, CY + R_TICK); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Lot", CX + 14, CY - R_SCHEIBE - 9);

    // Mittelpunkt
    ctx.fillStyle = cText; ctx.beginPath(); ctx.arc(CX, CY, 2.5, 0, 7); ctx.fill();

    const a = zustand.alpha;
    let status = "";
    if (zustand.modus === 1) {
      // Laser oben links, Strahl auf den Mittelpunkt
      laser(-a, cText, cFlaeche);
      strahl(-a, R_RING, 0, 0, 2.5, 1, cAkzent);
      const b = betaReal(m, a);
      if (a === 0) {
        strahl(0, 0, 180, R_TICK + 13, 2.5, 1, cAkzent); // ungebrochen geradeaus
        status = "α = 0°: Der Strahl läuft auf dem Lot — er geht ungebrochen geradeaus.";
      } else {
        strahl(0, 0, 180 - b, R_TICK + 13, 2.5, 1, cAkzent); // gebrochener Strahl im Material
        strahl(0, 0, a, R_TICK + 5, 1.5, 0.25, cAkzent);     // schwacher Reflex (Teilreflexion)
        status = "Lies β dort ab, wo der Strahl unten die Skala kreuzt.";
      }
      if (a > 8) { ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; const [tx, ty] = punkt(-a / 2, 72); ctx.fillText("α = " + a + "°", tx, ty); }
    } else {
      // Laser unten links an der Bogenseite, Strahl radial auf den Mittelpunkt
      laser(180 + a, cText, cFlaeche);
      strahl(180 + a, R_RING, 0, 0, 2.5, 1, cAkzent);
      const aus = austrittIdeal(m.n, a);
      if (a === 0) {
        strahl(0, 0, 0, R_TICK + 13, 2.5, 1, cAkzent);
        status = "β = 0°: ungebrochen geradeaus — auch von innen.";
      } else if (Number.isFinite(aus)) {
        strahl(0, 0, aus, R_TICK + 13, 2.5, 1, cAkzent);      // gebrochener Austritt in die Luft
        strahl(0, 0, 180 - a, R_TICK + 5, 1.5, 0.25, cAkzent); // schwacher innerer Reflex
        status = aus >= 75 ? "Der austretende Strahl wird ganz flach — dicht am Grenzwinkel!" : "Der Strahl tritt aus — vom Lot weg gebrochen.";
      } else {
        strahl(0, 0, 180 - a, R_TICK + 13, 2.5, 1, cAkzent);  // total reflektierter Strahl
        status = "Totalreflexion! Kein Strahl tritt aus — die Fläche spiegelt vollständig.";
      }
      if (a > 8) { ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; const [tx, ty] = punkt(180 + a / 2, 72); ctx.fillText((zustand.modus === 2 ? "β = " : "") + a + "°", tx, ty); }
    }

    // Statuszeilen unter der Scheibe (nie nur Farbe: immer Text)
    ctx.textAlign = "center"; ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = cLeise;
    ctx.fillText(zustand.modus === 1 ? "Modus 1: Luft → " + m.kurz : "Modus 2: " + m.kurz + " → Luft", CX, 404);
    ctx.fillStyle = status.startsWith("Totalreflexion") ? cFehler : cText;
    ctx.fillText(status, CX, 424);
  }

  // kleiner schwenkbarer Laser außerhalb des Rings
  function laser(grad, cText, cFlaeche) {
    const [x, y] = punkt(grad, R_RING + 18);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(grad * RAD);
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-7, -14, 14, 28, 3); else ctx.rect(-7, -14, 14, 28);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf dem Tisch liegt eine <strong>Winkelscheibe</strong> mit voller 360°-Gradskala (ablesbar auf 1° genau). Genau in ihrer Mitte liegt eine <strong>Halbscheibe</strong> aus durchsichtigem Material — die ebene Seite verläuft durch den Mittelpunkt der Skala. Ein <strong>schwenkbarer Laser</strong> zielt immer exakt auf diesen Mittelpunkt.</p>
      <p class="exp-hinweis"><strong>Warum eine Halbscheibe?</strong> Der Strahl wird nur an der ebenen Fläche im Mittelpunkt gebrochen. Durch den Kreisbogen verlässt er die Scheibe <em>radial</em>, also senkrecht zur Bogenfläche — dort wird er <em>nicht erneut</em> gebrochen. Nur deshalb kannst du den Winkel β im Material sauber an der Skala ablesen.</p>
      <p><strong>Plan:</strong> Stelle nacheinander mindestens ${MIN_MESSUNGEN} Einfallswinkel α ein, lies den Brechungswinkel β jeweils selbst an der Skala ab und trage ihn ein. In der Auswertung bildest du die Quotienten sin α / sin β — und entdeckst das Brechungsgesetz. Mit dem Umschalter „Material → Luft“ findest du außerdem den Grenzwinkel der Totalreflexion.</p>
      <label for="exp-material"><strong>Material wählen:</strong></label>
      <select id="exp-material" class="exp-wahl">${MATERIALIEN.map((m, i) => `<option value="${i}">${esc(m.name)}${m.anzeigeN ? " — n = 1,33 (Literaturwert)" : ""}</option>`).join("")}</select>
      <p>Tipp: Die Wasser-Halbschale eignet sich zum Üben, denn ihren Literaturwert kannst du nachschlagen. Die Brechzahl von Plexiglas ist deine eigentliche Messaufgabe — und Material X bleibt geheim, bis du es enttarnt hast.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-material").value = String(MATERIALIEN.indexOf(zustand.material));
    panel.querySelector("#exp-material").addEventListener("change", ev => {
      zustand.material = MATERIALIEN[Number(ev.target.value)];
      zeichne();
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function kontextText() {
    if (zustand.modus === 1) {
      return zustand.alpha === 0 ? "Erkenntnis: Bei α = 0° wird nichts gebrochen — β = 0°. Trag das ruhig als Messzeile ein!" : "";
    }
    const aus = austrittIdeal(zustand.material.n, zustand.alpha);
    if (zustand.alpha > 0 && Number.isNaN(aus)) return "Totalreflexion — kein Strahl tritt aus!";
    if (Number.isFinite(aus) && aus >= 75) return "Fast geschafft: Der Strahl tritt nur noch ganz flach aus.";
    return "";
  }

  function panelMessen() {
    const m = zustand.material;
    const liste = mess();
    const nGueltig = liste.filter(z => z.alpha > 0).length;
    const notiert = zustand.agNotiert[m.id];
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <p>Auf der Scheibe: <strong>${esc(m.name)}</strong> (wechseln im Aufbau)</p>
      <div class="exp-knopfzeile" role="group" aria-label="Strahlrichtung wählen">
        <button class="knopf ${zustand.modus === 1 ? "" : "zweitrangig"}" id="exp-modus1" aria-pressed="${zustand.modus === 1}">Luft → Material</button>
        <button class="knopf ${zustand.modus === 2 ? "" : "zweitrangig"}" id="exp-modus2" aria-pressed="${zustand.modus === 2}">Material → Luft</button>
      </div>
      <div class="exp-regler">
        <label for="exp-alpha">${zustand.modus === 1 ? "Einfallswinkel α" : "Winkel im Material β"}: <strong id="exp-alpha-wert">${zustand.alpha}°</strong></label>
        <input type="range" id="exp-alpha" min="0" max="${ALPHA_MAX}" step="1" value="${zustand.alpha}" aria-describedby="exp-kontext">
      </div>
      <p id="exp-kontext" class="exp-meldung" aria-live="polite">${esc(kontextText())}</p>
      ${zustand.modus === 1 ? `
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies die Skala ab — Brechungswinkel β in °:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>Messtabelle — ${esc(m.kurz)}</h3>
      <table class="exp-tabelle"><thead><tr><th>α in °</th><th>β in °</th><th>sin α</th><th>sin β</th></tr></thead>
      <tbody>${liste.map(z => `<tr><td>${z.alpha}</td><td>${komma(z.beta, 1)}</td><td>${komma(Math.sin(z.alpha * RAD), 3)}</td><td>${komma(Math.sin(z.beta * RAD), 3)}</td></tr>`).join("") || '<tr><td colspan="4">noch leer</td></tr>'}</tbody></table>
      <p>${nGueltig} von mindestens ${MIN_MESSUNGEN} Winkeln mit α &gt; 0 — die sin-Spalten rechnet das System für dich nach.</p>
      <button class="knopf" id="exp-weiter2" ${nGueltig >= MIN_MESSUNGEN ? "" : "disabled"}>Zur Auswertung</button>` : `
      <p>Der Laser sitzt jetzt an der <strong>Bogenseite</strong>: Der Strahl läuft durch den Bogen ungebrochen bis zum Mittelpunkt und trifft die ebene Fläche <em>von innen</em>.</p>
      <p>Taste dich in 1°-Schritten heran: Bis zu welchem Winkel tritt noch ein Strahl in die Luft aus — und ab wann wird <strong>alles zurückgespiegelt</strong>? Dieser Kippwinkel ist der <strong>Grenzwinkel α<sub>g</sub></strong>.</p>
      <form id="exp-grenz" class="exp-ablesen">
        <label for="exp-ag">Notiere den Grenzwinkel α<sub>g</sub> in °:</label>
        <input id="exp-ag" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">Notieren</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      ${notiert !== undefined ? `<p>✓ Notiert für ${esc(m.kurz)}: α<sub>g</sub> ≈ <strong>${komma(notiert, 0)}°</strong></p>` : ""}
      <p>Anwendung: In einer <strong>Glasfaser</strong> hält genau diese Totalreflexion das Licht im Kabel — es wird an der Innenwand immer wieder vollständig zurückgespiegelt und kommt so kilometerweit.</p>
      <button class="knopf" id="exp-weiter2" ${nGueltig >= MIN_MESSUNGEN ? "" : "disabled"}>Zur Auswertung</button>`}`;

    panel.querySelector("#exp-modus1").addEventListener("click", () => { zustand.modus = 1; panelMessen(); zeichne(); });
    panel.querySelector("#exp-modus2").addEventListener("click", () => { zustand.modus = 2; panelMessen(); zeichne(); });
    panel.querySelector("#exp-alpha").addEventListener("input", ev => {
      zustand.alpha = Number(ev.target.value);
      panel.querySelector("#exp-alpha-wert").textContent = zustand.alpha + "°";
      panel.querySelector("#exp-kontext").textContent = kontextText();
      zeichne();
    });
    panel.querySelector("#exp-weiter2")?.addEventListener("click", () => wechslePhase("auswerten"));

    panel.querySelector("#exp-ablesen")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      if (liste.some(z => z.alpha === zustand.alpha)) {
        meldung.textContent = "Für α = " + zustand.alpha + "° hast du schon gemessen — stell einen anderen Winkel ein.";
        return;
      }
      if (!ablesungOk(eingabe, betaReal(m, zustand.alpha), EINTRAG_TOLERANZ)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Wo kreuzt der Strahl unten die Skala? (Auf 1° genau ablesen.)";
        return;
      }
      liste.push({ alpha: zustand.alpha, beta: eingabe, quotText: "", quotOk: null });
      liste.sort((a, b) => a.alpha - b.alpha);
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = "✓ Eingetragen.";
    });

    panel.querySelector("#exp-grenz")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const eingabe = parseDezimal(panel.querySelector("#exp-ag").value);
      if (!ablesungOk(eingabe, grenzwinkel(m.n), GRENZWINKEL_TOLERANZ)) {
        meldung.textContent = "✗ Da kippt es noch nicht (oder schon längst). Taste dich in 1°-Schritten an den Winkel heran, ab dem kein Strahl mehr austritt.";
        return;
      }
      zustand.agNotiert[m.id] = eingabe;
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = "✓ Grenzwinkel notiert — damit kannst du n in der Auswertung gegenprüfen.";
    });
  }

  function panelAuswerten() {
    const m = zustand.material;
    const liste = mess();
    const auswertbar = liste.filter(z => z.beta > 0);
    const alleOk = auswertbar.length > 0 && auswertbar.every(z => z.quotOk === true);
    const nQuell = nMittel(auswertbar);
    const ag = zustand.agNotiert[m.id];
    const nAg = zustand.nAgOk[m.id];

    panel.innerHTML = `
      <h2>Auswertung — ${esc(m.kurz)}</h2>
      <p>Bilde für jede Zeile den Quotienten <strong>sin α / sin β</strong> (Taschenrechner, 2 Stellen reichen) und trag ihn ein:</p>
      <table class="exp-tabelle"><thead><tr><th>α in °</th><th>β in °</th><th>sin α</th><th>sin β</th><th>sin α / sin β</th></tr></thead>
      <tbody>${liste.map((z, i) => `<tr><td>${z.alpha}</td><td>${komma(z.beta, 1)}</td><td>${komma(Math.sin(z.alpha * RAD), 3)}</td><td>${komma(Math.sin(z.beta * RAD), 3)}</td><td>${z.beta > 0
        ? `<input class="exp-eingabe" data-i="${i}" inputmode="decimal" autocomplete="off" value="${esc(z.quotText || "")}" aria-label="Quotient sin Alpha durch sin Beta für Alpha gleich ${z.alpha} Grad"> ${z.quotOk === true ? "✓" : z.quotOk === false ? "✗" : ""}`
        : "— (0 : 0 — hier wurde nichts gebrochen)"}</td></tr>`).join("") || '<tr><td colspan="5">noch keine Messwerte — geh zurück zur Durchführung</td></tr>'}</tbody></table>
      ${liste.length ? '<button class="knopf" id="exp-pruefen">Quotienten prüfen</button>' : ""}
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      ${alleOk ? `
      <p>Alle Quotienten sind (fast) gleich — <strong>sin α und sin β sind proportional</strong>. Das ist das Brechungsgesetz: <strong>sin α = n · sin β</strong>. Der Mittelwert deiner Quotienten ist die Brechzahl:</p>
      <p>Dein Ergebnis: <strong>n ≈ ${komma(nQuell, 2)}</strong>${m.anzeigeN ? ` (Literaturwert: 1,33 — Abweichung ${komma(bewertungN(nQuell, 1.333).abw, 2)}: <strong>${bewertungN(nQuell, 1.333).stufe}</strong>)` : ""}</p>
      <h3>Welches Material ist das?</h3>
      <table class="exp-tabelle"><thead><tr><th>Material</th><th>Brechzahl n</th></tr></thead>
      <tbody>${N_TABELLE.map(e => `<tr><td style="text-align:left">${e.name}</td><td>${komma(e.n, 2)}</td></tr>`).join("")}</tbody></table>
      <label for="exp-ident"><strong>Vergleiche dein n mit der Tabelle:</strong></label>
      <select id="exp-ident" class="exp-wahl"><option value="">— bitte wählen —</option>${N_TABELLE.map(e => `<option${zustand.ident[m.id] === e.name ? " selected" : ""}>${e.name}</option>`).join("")}</select>
      <p id="exp-ident-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>Kontrolle über den Grenzwinkel</h3>
      ${ag !== undefined ? `
      <p>Du hast α<sub>g</sub> ≈ ${komma(ag, 0)}° notiert. Zweiter, unabhängiger Weg zur Brechzahl: <strong>n = 1 / sin α<sub>g</sub></strong>. Rechne nach (Taschenrechner auf DEG!) und trag dein Ergebnis ein:</p>
      <form id="exp-nag" class="exp-ablesen">
        <label for="exp-nag-wert">n aus dem Grenzwinkel:</label>
        <input id="exp-nag-wert" inputmode="decimal" autocomplete="off" size="7" value="${nAg !== undefined ? esc(komma(nAg, 2)) : ""}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-nag-meldung" class="exp-meldung" aria-live="polite">${nAg !== undefined ? "✓ Zwei unabhängige Wege, ein Ergebnis: Quotienten-Mittel " + komma(nQuell, 2) + ", Grenzwinkel-Weg " + komma(nAg, 2) + "." : ""}</p>` : `
      <p>Dafür fehlt dir noch der Grenzwinkel: Schalte in der Durchführung auf <strong>Material → Luft</strong>, taste dich an die Totalreflexion heran und notiere α<sub>g</sub> — dann kannst du n hier unabhängig gegenprüfen.</p>`}
      <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV speichern</button>` : ""}
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum schwanken die Quotienten?</summary>
        <p><strong>Strahljustage:</strong> Trifft der Laser nicht exakt den Mittelpunkt, verlässt der Strahl den Bogen nicht radial — und wird beim Austritt ein zweites Mal gebrochen. Dann stimmt dein β nicht.</p>
        <p><strong>Dicker Strahl:</strong> Der Laserpunkt ist breiter als ein Skalenstrich. Lies immer an der Strahlmitte ab — und immer auf dieselbe Weise.</p>
        <p><strong>Winkelablesung:</strong> Auf der Skala liest du höchstens auf 1° genau ab, und schon ein schräger Blick verschiebt den Wert. Deshalb misst man <em>mehrere</em> Winkel und mittelt die Quotienten, statt einer einzigen Messung zu vertrauen.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;

    panel.querySelector("#exp-pruefen")?.addEventListener("click", () => {
      panel.querySelectorAll("[data-i]").forEach(inp => {
        const z = liste[Number(inp.dataset.i)];
        z.quotText = inp.value;
        const wert = parseDezimal(inp.value);
        z.quotOk = Number.isFinite(wert) && Math.abs(wert - quotientAusZeile(z.alpha, z.beta)) <= QUOTIENT_TOLERANZ;
      });
      panelAuswerten();
      const offen = liste.filter(z => z.beta > 0 && z.quotOk !== true).length;
      panel.querySelector("#exp-meldung").textContent = offen === 0
        ? "✓ Alle Quotienten passen!"
        : "✗ " + offen + " Quotient(en) passen noch nicht — Tipp: Taschenrechner auf Grad (DEG) stellen, dann sin α ÷ sin β.";
    });

    panel.querySelector("#exp-ident")?.addEventListener("change", ev => {
      const wahl = ev.target.value;
      zustand.ident[m.id] = wahl;
      const ziel = IDENT_ERWARTET[m.id];
      const meldung = panel.querySelector("#exp-ident-meldung");
      if (!wahl) { meldung.textContent = ""; return; }
      if (wahl === ziel) {
        meldung.textContent = m.geheim
          ? "✓ Enttarnt: Material X ist Polycarbonat (n ≈ 1,59) — daraus sind z. B. CDs und Brillengläser."
          : "✓ Richtig: Dein n passt zu " + ziel + ".";
      } else {
        meldung.textContent = "✗ Vergleiche noch einmal: Welcher Tabellenwert liegt am nächsten an deinem n?";
      }
    });

    panel.querySelector("#exp-nag")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-nag-meldung");
      const eingabe = parseDezimal(panel.querySelector("#exp-nag-wert").value);
      if (!Number.isFinite(eingabe) || Math.abs(eingabe - nAusGrenzwinkel(ag)) > N_AUS_AG_TOLERANZ) {
        meldung.textContent = "✗ Das passt noch nicht. Rechne 1 ÷ sin(" + komma(ag, 0) + "°) — Taschenrechner auf Grad (DEG) stellen.";
        return;
      }
      zustand.nAgOk[m.id] = eingabe;
      panelAuswerten();
      panel.querySelector("#exp-meldung").textContent = "✓ Beide Wege führen zum selben n — gute Messung!";
    });

    panel.querySelector("#exp-csv")?.addEventListener("click", () => {
      csvHerunterladen("brechung-" + m.id + ".csv",
        ["alpha in Grad", "beta in Grad", "sin(alpha)", "sin(beta)", "sin(alpha)/sin(beta)"],
        liste.map(z => { const q = quotientAusZeile(z.alpha, z.beta); return [z.alpha, z.beta, Math.sin(z.alpha * RAD), Math.sin(z.beta * RAD), Number.isFinite(q) ? q : ""]; }));
    });

    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = { plexi: [], wasser: [], x: [] };
      zustand.agNotiert = {}; zustand.nAgOk = {}; zustand.ident = {};
      zustand.alpha = 30; zustand.modus = 1;
      wechslePhase("aufbau");
    });
  }

  wechslePhase("aufbau");
}

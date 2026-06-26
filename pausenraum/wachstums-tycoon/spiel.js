// spiel.js — „Wachstums-Tycoon" (Idle/Clicker) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Lernhaken: eine Live-Wachstumskurve macht den Sprung von linearem (nur Klicken)
// zu exponentiellem Wachstum (Generatoren, die Wissen produzieren, das wieder neue
// Generatoren kauft) sichtbar.
//
// Die reine Spiellogik (Kosten, Produktion, Zahlformat, Wachstumsschritt) ist
// exportiert und in Node testbar — auf Modulebene wird weder document noch window
// angefasst, die DOM-Elemente entstehen erst in starte().

export const SPIEL_DAUER = 90;        // Sekunden je Runde
export const KLICK_BASIS = 1;         // Wissen pro Tipp ohne Upgrade
export const MULT_BASIS = 50;         // Kosten des ersten Lerntempo-Upgrades
export const MULT_FAKTOR = 4;         // Kostensteigerung je Upgrade
export const MULT_SCHRITT = 1;        // jeder Kauf: +1 Wissen pro Tipp

// ---------------------------------------------------------------------------
// Generator-Definitionen (Definitionsliste, rein)
//   id    — Schlüssel im Zustand
//   name  — Anzeigename
//   sym   — Symbol/Emoji für die Kachel
//   basis — Grundkosten des ersten Stücks (Wissen)
//   faktor— geometrische Kostensteigerung je Stück
//   rate  — produziertes Wissen pro Sekunde je Stück
// Bewusst gestaffelt: günstige Spickzettel als Einstieg, Schwarmwissen als
// teure, weit überlegene „Late-Game"-Quelle — so wird die Kurve exponentiell.
// ---------------------------------------------------------------------------
export const GENERATOREN = [
  { id: "spickzettel",  name: "Spickzettel",  sym: "📝", basis: 10,    faktor: 1.15, rate: 1 },
  { id: "lerngruppe",   name: "Lerngruppe",   sym: "👥", basis: 80,    faktor: 1.18, rate: 6 },
  { id: "bibliothek",   name: "Bibliothek",   sym: "📚", basis: 600,   faktor: 1.20, rate: 40 },
  { id: "kitutor",      name: "KI-Tutor",     sym: "🤖", basis: 5000,  faktor: 1.22, rate: 260 },
  { id: "schwarm",      name: "Schwarmwissen", sym: "🐝", basis: 42000, faktor: 1.24, rate: 1700 }
];

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar)
// ---------------------------------------------------------------------------

// Geometrische Kosten des NÄCHSTEN Stücks: basis · faktor^anzahl, ganzzahlig.
// Streng monoton steigend in anzahl (faktor > 1).
export function kosten(basis, faktor, anzahl) {
  return Math.ceil(basis * Math.pow(faktor, Math.max(0, anzahl)));
}

// Gesamtproduktion pro Sekunde aus dem Generator-Zustand.
//   generatoren — { [id]: anzahl }
//   defs        — Definitionsliste (Standard: GENERATOREN)
//   mult        — globaler Multiplikator (Standard 1)
// Summe über anzahl · rate · mult. 0, wenn nichts gekauft wurde.
export function produktionProSekunde(generatoren, defs = GENERATOREN, mult = 1) {
  let summe = 0;
  for (const d of defs) {
    const anzahl = (generatoren && generatoren[d.id]) || 0;
    summe += anzahl * d.rate;
  }
  return summe * mult;
}

// Kompakte Zahlanzeige: 999 → "999", 1234 → "1,23k", 1e6 → "1,00 Mio.", 1e9 → "1,00 Mrd.".
// Deutsches Dezimalkomma; unter 1000 ohne Nachkommastellen (ganzzahlig gerundet).
export function formatGross(n) {
  const neg = n < 0 ? "-" : "";
  const x = Math.abs(n);
  if (x < 1000) return neg + String(Math.round(x));
  const stufen = [
    { grenze: 1e12, teiler: 1e12, suffix: " Bio." },
    { grenze: 1e9,  teiler: 1e9,  suffix: " Mrd." },
    { grenze: 1e6,  teiler: 1e6,  suffix: " Mio." },
    { grenze: 1e3,  teiler: 1e3,  suffix: "k" }
  ];
  for (const s of stufen) {
    if (x >= s.grenze) {
      const wert = (x / s.teiler).toFixed(2).replace(".", ",");
      return neg + wert + s.suffix;
    }
  }
  return neg + String(Math.round(x));
}

// Reiner Zustands-Schritt: Wissen += Produktion · dt (Idle-Ertrag der Generatoren).
// Liefert einen NEUEN Zustand (Eingabe bleibt unverändert), inklusive aktualisierter
// Gesamtsumme. mult als globaler Multiplikator.
export function wachstumsSchritt(zustand, dt, defs = GENERATOREN, mult = 1) {
  const ertrag = produktionProSekunde(zustand.generatoren, defs, mult) * dt;
  return {
    ...zustand,
    wissen: zustand.wissen + ertrag,
    gesamt: (zustand.gesamt || 0) + ertrag
  };
}

// Kosten des Lerntempo-Upgrades bei gegebener Stufe (0 = erstes Upgrade).
export function multKosten(stufe) {
  return kosten(MULT_BASIS, MULT_FAKTOR, stufe);
}

// Stärkster Generator nach Gesamtproduktion (anzahl · rate). null, wenn keiner gekauft.
export function staerksterGenerator(generatoren, defs = GENERATOREN) {
  let best = null, bestProd = 0;
  for (const d of defs) {
    const anzahl = (generatoren && generatoren[d.id]) || 0;
    const prod = anzahl * d.rate;
    if (anzahl > 0 && prod >= bestProd) { bestProd = prod; best = d; }
  }
  return best;
}

export const manifest = {
  id: "sp-wachstums-tycoon",
  titel: "Wachstums-Tycoon",
  kurz: "Sammle Wissen, kaufe Generatoren, die automatisch produzieren — die Live-Kurve zeigt, wie aus linearem Klicken exponentielles Wachstum wird.",
  punkteLabel: "Wissen",
  punkteEinheit: "",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: true,
  formatPunkte: n => formatGross(n),
  steuerungHinweis: "Tippen/Klicken sammelt Wissen · Generatoren kaufen, die automatisch produzieren · in 90 Sekunden so viel wie möglich!"
};

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, DOM, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

export function starte(api) {
  // --- Zustand ---
  let wissen = 0;            // aktueller Wissensvorrat (ausgebbar)
  let gesamt = 0;            // jemals verdientes Wissen gesamt (= Punktestand am Ende)
  let multStufe = 0;         // gekaufte Lerntempo-Upgrades
  let proKlick = KLICK_BASIS;
  const generatoren = {};    // { id: anzahl }
  for (const d of GENERATOREN) generatoren[d.id] = 0;

  let rest = SPIEL_DAUER;    // verbleibende Sekunden
  let laeuft = false;
  let nurKlickWissen = 0;    // Vergleichswert: nur die Klick-Einnahmen (lineares Wachstum)

  // Kurvendaten: gesamtes Wissen und nur-Klick-Wissen je Sekunde der verstrichenen Zeit.
  let verlauf = [{ t: 0, wissen: 0, klick: 0 }];
  let letzteAufz = 0;        // verstrichene Zeit der letzten Aufzeichnung

  // Klick-Animation (Float-Texte „+n")
  let funken = [];

  // --- Hilfen ---
  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }

  // --- Aufbau der Oberfläche ---
  api.flaeche.innerHTML = "";
  const bereich = document.createElement("div");
  bereich.className = "wt-bereich";

  // Canvas für die Wachstumskurve
  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const LOGIK_B = 480, LOGIK_H = 220;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(LOGIK_B * faktor);
  canvas.height = Math.round(LOGIK_H * faktor);
  canvas.style.cssText = "display:block;width:100%;max-width:520px;height:auto;margin:0 auto;border-radius:0.6rem;";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Wachstumskurve: Wissen über die Zeit, mit blasser Vergleichslinie für lineares Klicken.");
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);
  bereich.appendChild(canvas);

  // Live-Rate-Anzeige
  const rateEl = document.createElement("p");
  rateEl.className = "wt-rate";
  rateEl.innerHTML = 'Wissen/Sekunde: <b id="wt-rate-wert">0</b>';
  bereich.appendChild(rateEl);
  const rateWert = rateEl.querySelector("#wt-rate-wert");

  // Großer Klick-Bereich
  const klickBtn = document.createElement("button");
  klickBtn.type = "button";
  klickBtn.className = "wt-klick";
  klickBtn.innerHTML = 'Wissen sammeln <small id="wt-klick-info">+1 pro Tipp</small>';
  bereich.appendChild(klickBtn);
  const klickInfo = klickBtn.querySelector("#wt-klick-info");

  // Generator-Kacheln + Multiplikator-Upgrade
  const laden = document.createElement("div");
  laden.className = "wt-laden";
  bereich.appendChild(laden);

  const genBtns = {};
  for (const d of GENERATOREN) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wt-gen";
    btn.dataset.gen = d.id;
    // HTML per Verkettung (keine verschachtelten Template-Literale)
    btn.innerHTML =
      '<span class="wt-gen-sym" aria-hidden="true">' + d.sym + '</span>' +
      '<span class="wt-gen-txt">' +
        '<span class="wt-gen-name">' + d.name + '</span><br>' +
        '<span class="wt-gen-info">Kosten <b class="wt-k">' + d.basis + '</b> · +' + formatGross(d.rate) + '/s</span>' +
      '</span>' +
      '<span class="wt-gen-anz">×<b class="wt-a">0</b></span>';
    laden.appendChild(btn);
    genBtns[d.id] = btn;
    btn.addEventListener("click", () => kaufeGenerator(d.id));
  }

  // Lerntempo-Upgrade (Multiplikator je Klick)
  const multBtn = document.createElement("button");
  multBtn.type = "button";
  multBtn.className = "wt-gen wt-mult";
  multBtn.innerHTML =
    '<span class="wt-gen-sym" aria-hidden="true">⚡</span>' +
    '<span class="wt-gen-txt">' +
      '<span class="wt-gen-name">Lerntempo</span><br>' +
      '<span class="wt-gen-info">Kosten <b class="wt-k">' + MULT_BASIS + '</b> · +1 pro Tipp</span>' +
    '</span>' +
    '<span class="wt-gen-anz">×<b class="wt-a">0</b></span>';
  laden.appendChild(multBtn);
  multBtn.addEventListener("click", kaufeMult);

  api.flaeche.appendChild(bereich);

  // --- Spiel-Aktionen ---
  function klicke() {
    if (!laeuft) return;
    wissen += proKlick;
    gesamt += proKlick;
    nurKlickWissen += proKlick;
    if (!api.reduzierteBewegung) {
      funken.push({ text: "+" + formatGross(proKlick), t: 0.7 });
      if (funken.length > 8) funken = funken.slice(-8);
    }
    api.setzePunkte(formatGross(gesamt));
    aktualisiereKnoepfe();
  }

  function kaufeGenerator(id) {
    if (!laeuft) return;
    const d = GENERATOREN.find(g => g.id === id);
    const preis = kosten(d.basis, d.faktor, generatoren[id]);
    if (wissen < preis) return;
    wissen -= preis;
    generatoren[id] += 1;
    aktualisiereKnoepfe();
  }

  function kaufeMult() {
    if (!laeuft) return;
    const preis = multKosten(multStufe);
    if (wissen < preis) return;
    wissen -= preis;
    multStufe += 1;
    proKlick = KLICK_BASIS + multStufe * MULT_SCHRITT;
    klickInfo.textContent = "+" + formatGross(proKlick) + " pro Tipp";
    aktualisiereKnoepfe();
  }

  // Knopf-Beschriftung + disabled-Zustand an den aktuellen Vorrat anpassen.
  function aktualisiereKnoepfe() {
    for (const d of GENERATOREN) {
      const btn = genBtns[d.id];
      const preis = kosten(d.basis, d.faktor, generatoren[d.id]);
      btn.querySelector(".wt-k").textContent = formatGross(preis);
      btn.querySelector(".wt-a").textContent = generatoren[d.id];
      const kaufbar = wissen >= preis;
      btn.disabled = !kaufbar || !laeuft;
      btn.classList.toggle("kaufbar", kaufbar && laeuft);
    }
    const mPreis = multKosten(multStufe);
    multBtn.querySelector(".wt-k").textContent = formatGross(mPreis);
    multBtn.querySelector(".wt-a").textContent = multStufe;
    const mKaufbar = wissen >= mPreis;
    multBtn.disabled = !mKaufbar || !laeuft;
    multBtn.classList.toggle("kaufbar", mKaufbar && laeuft);
  }

  // --- Game-Loop ---
  function aktualisiere(dt) {
    if (!laeuft) return;

    // Idle-Ertrag der Generatoren
    const rate = produktionProSekunde(generatoren, GENERATOREN, 1);
    const ertrag = rate * dt;
    wissen += ertrag;
    gesamt += ertrag;

    // Vergleichslinie „nur Klicken": wächst nur durch Klicks → linear (s. nurKlickWissen)

    api.setzePunkte(formatGross(gesamt));
    rateWert.textContent = formatGross(rate);

    // Countdown
    rest -= dt;
    api.setzeZeit(Math.max(0, Math.ceil(rest)) + " s");

    // Kurve einmal je 0,5 s verstrichener Zeit aufzeichnen
    const verstrichen = SPIEL_DAUER - rest;
    if (verstrichen - letzteAufz >= 0.5) {
      letzteAufz = verstrichen;
      verlauf.push({ t: verstrichen, wissen: gesamt, klick: nurKlickWissen });
      if (verlauf.length > 400) verlauf = verlauf.slice(-400);
    }

    for (const f of funken) f.t -= dt;
    funken = funken.filter(f => f.t > 0);

    aktualisiereKnoepfe();
    zeichne();

    if (rest <= 0) ende();
  }

  function ende() {
    laeuft = false;
    api.loopStopp();
    // letzten Punkt sichern
    verlauf.push({ t: SPIEL_DAUER, wissen: gesamt, klick: nurKlickWissen });
    aktualisiereKnoepfe();
    zeichne();
    const rate = produktionProSekunde(generatoren, GENERATOREN, 1);
    const best = staerksterGenerator(generatoren, GENERATOREN);
    const bestText = best
      ? best.name + " (×" + generatoren[best.id] + ")"
      : "noch keiner — nur geklickt";
    const info =
      "<p>Wissen/Sekunde am Ende: <b>" + formatGross(rate) + "</b> · stärkster Generator: <b>" + bestText + "</b></p>" +
      '<p class="wt-hinweis">Sieh dir die Kurve an: Sie ist nach oben gebogen — das ist <b>exponentielles Wachstum</b>. Die blasse Gerade „nur Klicken&ldquo; bleibt weit zurück.</p>';
    api.vorbei(Math.round(gesamt), info);
  }

  // --- Zeichnen der Wachstumskurve ---
  function zeichne() {
    const F = {
      bg: farbe("--flaeche", "#fffdf6"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      akzent: farbe("--akzent", "#19599f"),
      ok: farbe("--ok", "#2c7029")
    };
    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);

    const padL = 8, padR = 8, padT = 16, padB = 22;
    const innerB = LOGIK_B - padL - padR;
    const innerH = LOGIK_H - padT - padB;
    const x0 = padL, y0 = LOGIK_H - padB;

    // Skalen: x über volle Spieldauer, y über das bisherige Maximum (mind. 10)
    const maxWissen = Math.max(10, gesamt, verlauf.length ? verlauf[verlauf.length - 1].wissen : 0);
    const px = t => x0 + (t / SPIEL_DAUER) * innerB;
    const py = w => y0 - (w / maxWissen) * innerH;

    // Achsen
    ctx.strokeStyle = F.leise;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, padT); ctx.lineTo(x0, y0); ctx.lineTo(x0 + innerB, y0);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Achsenbeschriftung (knapp)
    ctx.fillStyle = F.leise;
    ctx.font = "600 11px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText("Wissen", x0 + 2, padT - 4);
    ctx.textAlign = "right";
    ctx.fillText("Zeit →", x0 + innerB, y0 + 16);
    ctx.textAlign = "left";
    ctx.fillText("0 s", x0, y0 + 16);
    ctx.textAlign = "center";
    ctx.fillText("90 s", x0 + innerB / 2, y0 + 16);
    ctx.fillText(formatGross(maxWissen), x0 + 26, py(maxWissen) + 9);

    // Vergleichslinie: lineares „nur Klicken" (blass)
    if (verlauf.length >= 2) {
      ctx.strokeStyle = F.leise;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < verlauf.length; i++) {
        const p = verlauf[i];
        const X = px(p.t), Y = py(p.klick);
        if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Echte Wachstumskurve (kräftig, gefüllt)
    if (verlauf.length >= 2) {
      ctx.beginPath();
      for (let i = 0; i < verlauf.length; i++) {
        const p = verlauf[i];
        const X = px(p.t), Y = py(p.wissen);
        if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      // Füllung unter der Kurve
      const letzte = verlauf[verlauf.length - 1];
      ctx.lineTo(px(letzte.t), y0);
      ctx.lineTo(px(verlauf[0].t), y0);
      ctx.closePath();
      ctx.fillStyle = F.akzent;
      ctx.globalAlpha = 0.14;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      for (let i = 0; i < verlauf.length; i++) {
        const p = verlauf[i];
        const X = px(p.t), Y = py(p.wissen);
        if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.strokeStyle = F.akzent;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = "round";
      ctx.stroke();

      // aktueller Punkt
      const X = px(letzte.t), Y = py(letzte.wissen);
      ctx.fillStyle = F.akzent;
      ctx.beginPath(); ctx.arc(X, Y, 3.5, 0, 2 * Math.PI); ctx.fill();
    }

    // Hinweistext bei genügend Krümmung
    const rate = produktionProSekunde(generatoren, GENERATOREN, 1);
    if (rate > 0) {
      ctx.fillStyle = F.ok;
      ctx.font = "700 12px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("📈 exponentielles Wachstum", x0 + innerB - 2, padT + 6);
    }

    // Legende
    ctx.textAlign = "left";
    ctx.font = "600 11px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillStyle = F.akzent;
    ctx.fillText("— dein Wissen", x0 + 4, padT + 6);
    ctx.fillStyle = F.leise;
    ctx.globalAlpha = 0.8;
    ctx.fillText("- - nur Klicken", x0 + 4, padT + 20);
    ctx.globalAlpha = 1;

    // Klick-Funken (Float-Texte am Klickknopf-Bereich, oben rechts der Kurve)
    let fi = 0;
    for (const f of funken) {
      ctx.globalAlpha = Math.max(0, f.t / 0.7);
      ctx.fillStyle = F.ok;
      ctx.font = "700 14px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, LOGIK_B - 60, padT + 40 + (1 - f.t / 0.7) * -18 + fi * 2);
      fi++;
    }
    ctx.globalAlpha = 1;
  }

  // --- Eingaben ---
  // Großer Knopf: Klick (Maus + Touch über Pointer-Event des Buttons selbst)
  klickBtn.addEventListener("click", klicke);
  // Tastatur: Leertaste = Klick (Knopf hat Fokus → Browser feuert click; zusätzlich
  // global über die Spielfläche, damit es auch ohne Knopf-Fokus klappt)
  api.tasten(ev => { if (ev.key === " " || ev.key === "Enter") { klicke(); } });
  // Touch-Tipp auf die Fläche zählt ebenfalls als Klick
  api.wisch(richtung => { if (richtung === "tipp") klicke(); });

  // --- Start/Reset ---
  function setzeAusgangslage() {
    wissen = 0; gesamt = 0; multStufe = 0; proKlick = KLICK_BASIS;
    for (const d of GENERATOREN) generatoren[d.id] = 0;
    rest = SPIEL_DAUER;
    nurKlickWissen = 0;
    verlauf = [{ t: 0, wissen: 0, klick: 0 }];
    letzteAufz = 0;
    funken = [];
    klickInfo.textContent = "+1 pro Tipp";
    rateWert.textContent = "0";
    api.setzePunkte("0");
    api.setzeZeit(SPIEL_DAUER + " s");
    aktualisiereKnoepfe();
    zeichne();
  }

  function starteRunde() {
    setzeAusgangslage();
    laeuft = true;
    aktualisiereKnoepfe();
    api.flaeche.focus();
    api.loop(aktualisiere);
  }

  api.neustartCb(starteRunde);

  setzeAusgangslage();
}

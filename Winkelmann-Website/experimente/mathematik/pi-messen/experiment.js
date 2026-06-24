// experiment.js — Interaktives Mathe-Experiment: Die Kreiszahl π vermessen (Klasse 6–9).
// Realitätsnahe Messpraxis statt fertiger Formel: sechs runde Alltagsgegenstände.
// Durchmesser mit Messschieber bzw. Lineal/Maßband messen, Umfang mit dem
// umgelegten Maßband (Reifen: Abrollmethode) — alles SELBST an der Skala
// ablesen und eintragen; das System rechnet danach u ÷ d vor. Ergebnis:
// Alle Quotienten drängeln sich um dieselbe Zahl — π steckt in jedem Kreis.
// Die Messstreuung ist deterministisch geseedet (helfer.streuung), dadurch
// laufen die TESTS DOM-frei in Node. Erstes Experiment des Mathematik-Bereichs.

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel, regression,
  farbe, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Objekte (d in cm, bewusst „krumm"; u_wahr = π·d exakt) ----------
export const OBJEKTE = [
  { id: "muenze",   name: "2-Euro-Münze",            kurz: "Münze",    d: 2.575, geraetD: "schieber", geraetU: "band" },
  { id: "teelicht", name: "Teelicht",                kurz: "Teelicht", d: 3.8,   geraetD: "schieber", geraetU: "band" },
  { id: "dose",     name: "Konservendose",           kurz: "Dose",     d: 7.55,  geraetD: "schieber", geraetU: "band" },
  { id: "cd",       name: "CD",                      kurz: "CD",       d: 12.0,  geraetD: "lineal",   geraetU: "band" },
  { id: "uhr",      name: "Wanduhr",                 kurz: "Wanduhr",  d: 25.4,  geraetD: "lineal",   geraetU: "band" },
  { id: "reifen",   name: "Fahrradreifen (28 Zoll)", kurz: "Reifen",   d: 62.2,  geraetD: "lineal",   geraetU: "abrollen" }
];
export const MINDEST_OBJEKTE = 5;

// ---------- Toleranzen für die Einträge (alles in cm) ----------
export const TOL_D_SCHIEBER = 0.05; // Anzeige nur übertragen (und mm in cm umrechnen)
export const TOL_D_LINEAL   = 0.15; // an der Lupe selbst ablesen
export const TOL_U          = 0.2;  // Maßband/Abrollstrecke selbst ablesen
export const TOL_ZAHL       = 0.03; // „berühmte Zahl" und Steigung

// ---------- Messlogik (rein, DOM-frei, Node-testbar) ----------
export function umfangWahr(o) { return Math.PI * o.d; }
export function tolD(o) { return o.geraetD === "schieber" ? TOL_D_SCHIEBER : TOL_D_LINEAL; }

// Messschieber: wahrer Wert + Gerätestreuung ±0,02 cm, Anzeige in 0,05-mm-Schritten.
// Lineal/Maßband: ±0,1 cm Streuung (Anlegen, Parallaxe).
export function messeDurchmesser(o) {
  if (o.geraetD === "schieber") {
    const roh = o.d + streuung("d:" + o.id, 0.04);
    return Math.round(roh * 200) / 200; // Raster 0,005 cm = 0,05 mm
  }
  return o.d + streuung("d:" + o.id, 0.2);
}
// Maßband einmal außen herum bzw. Abrollstrecke: ±0,075 cm Streuung
export function messeUmfang(o) { return umfangWahr(o) + streuung("u:" + o.id, 0.15); }

export function quotient(u, d) { return d > 0 ? u / d : NaN; }

// Regressionsgerade durch den Ursprung u = m·d (kleinste Quadrate ohne
// Achsenabschnitt): m = Σ(d·u) / Σ(d²) — denn ohne Durchmesser kein Umfang.
export function steigungUrsprung(punkte) {
  let sxx = 0, sxy = 0;
  for (const p of punkte) { sxx += p.x * p.x; sxy += p.x * p.y; }
  return sxx > 0 ? sxy / sxx : NaN;
}

// Antwort auf die Frage nach der berühmten Zahl: „pi"/„π" oder Zahl 3,14 ± 0,03
export function piAntwortOk(text) {
  const t = String(text).trim().toLowerCase();
  if (t === "π" || t === "pi" || t === "kreiszahl" || t === "kreiszahl pi" || t === "kreiszahl π") return true;
  return ablesungOk(parseDezimal(t), 3.14, TOL_ZAHL + 1e-9); // Epsilon: Randwerte wie 3,11 nicht an Float-Rundung scheitern lassen
}

// Wie stark verfälscht 1 mm Ablesefehler (bei u UND d zugleich) den Quotienten?
// Relativ: 0,1/u + 0,1/d — fällt streng monoton mit der Objektgröße.
export function relFehlerProMm(o) { return 0.1 / umfangWahr(o) + 0.1 / o.d; }

// größtes gemessenes Objekt = genauester Quotient (bei gleichem Ablesefehler)
export function genauestesObjekt(ids) {
  const dabei = OBJEKTE.filter(o => ids.includes(o.id));
  return dabei.reduce((best, o) => (best === null || o.d > best.d ? o : best), null);
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "u_wahr = π·d exakt für jedes Objekt", ok: () => OBJEKTE.every(o => Math.abs(umfangWahr(o) - Math.PI * o.d) < 1e-12) },
  { name: "Pipeline perfekter Messungen: u/d = π auf 1e-9, auch im Mittel", ok: () => { const qs = OBJEKTE.map(o => quotient(umfangWahr(o), o.d)); return qs.every(q => Math.abs(q - Math.PI) < 1e-9) && Math.abs(mittel(qs) - Math.PI) < 1e-9; } },
  { name: "Ursprungs-Regression perfekter Punkte: Steigung = π auf 1e-9", ok: () => Math.abs(steigungUrsprung(OBJEKTE.map(o => ({ x: o.d, y: umfangWahr(o) }))) - Math.PI) < 1e-9 },
  { name: "freie Regression (helfer.js) perfekter Punkte: m = π, b = 0", ok: () => { const { m, b } = regression(OBJEKTE.map(o => ({ x: o.d, y: umfangWahr(o) }))); return Math.abs(m - Math.PI) < 1e-9 && Math.abs(b) < 1e-9; } },
  { name: "Streugrenzen: Schieber ±0,0225 cm, Lineal ±0,1 cm, Umfang ±0,075 cm", ok: () => OBJEKTE.every(o => { const ad = Math.abs(messeDurchmesser(o) - o.d), au = Math.abs(messeUmfang(o) - umfangWahr(o)); return ad <= (o.geraetD === "schieber" ? 0.0225 : 0.1) + 1e-12 && au <= 0.075 + 1e-12; }) },
  { name: "Messschieber-Anzeige in 0,05-mm-Schritten", ok: () => OBJEKTE.filter(o => o.geraetD === "schieber").every(o => { const mm = messeDurchmesser(o) * 200; return Math.abs(mm - Math.round(mm)) < 1e-9; }) },
  { name: "Messwerte deterministisch (zweiter Aufruf identisch)", ok: () => OBJEKTE.every(o => messeDurchmesser(o) === messeDurchmesser(o) && messeUmfang(o) === messeUmfang(o)) },
  { name: "relativer 1-mm-Fehler fällt streng monoton mit d (Reifen gewinnt)", ok: () => { const r = OBJEKTE.map(relFehlerProMm); return r.every((w, i) => i === 0 || w < r[i - 1]) && genauestesObjekt(OBJEKTE.map(o => o.id)).id === "reifen"; } },
  { name: "Quotienten der gestreuten Messwerte: |u/d − π| ≤ 0,05", ok: () => OBJEKTE.every(o => Math.abs(quotient(messeUmfang(o), messeDurchmesser(o)) - Math.PI) <= 0.05) },
  { name: "parseDezimal + Eintrags-Toleranzen je Gerät", ok: () => { const d0 = messeDurchmesser(OBJEKTE[0]), dCd = messeDurchmesser(OBJEKTE[3]), u0 = messeUmfang(OBJEKTE[0]); return parseDezimal("2,57") === 2.57 && parseDezimal(" 2.57 ") === 2.57 && Number.isNaN(parseDezimal("zwei")) && ablesungOk(d0 + 0.04, d0, TOL_D_SCHIEBER) && !ablesungOk(d0 + 0.06, d0, TOL_D_SCHIEBER) && ablesungOk(dCd - 0.14, dCd, TOL_D_LINEAL) && !ablesungOk(dCd - 0.16, dCd, TOL_D_LINEAL) && ablesungOk(u0 + 0.19, u0, TOL_U) && !ablesungOk(u0 + 0.21, u0, TOL_U) && !ablesungOk(NaN, u0, TOL_U); } },
  { name: "π-Antwort: pi/π als Text oder Zahl 3,14 ± 0,03", ok: () => piAntwortOk("π") && piAntwortOk("Pi") && piAntwortOk(" 3,14 ") && piAntwortOk("3.1416") && piAntwortOk("3,11") && !piAntwortOk("3") && !piAntwortOk("3,2") && !piAntwortOk("22/7") && !piAntwortOk("") },
  { name: "Steigung der gestreuten Punkte nahe π, ±0,03-Prüfung greift", ok: () => { const m = steigungUrsprung(OBJEKTE.map(o => ({ x: messeDurchmesser(o), y: messeUmfang(o) }))); return Math.abs(m - Math.PI) < 0.02 && ablesungOk(m + 0.02, m, TOL_ZAHL) && !ablesungOk(m + 0.05, m, TOL_ZAHL); } }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    phase: "aufbau",
    gewaehlt: null,        // Objekt in Arbeit
    schritt: "",           // "durchmesser" | "umfang"
    dNotiert: NaN,         // eingetragener Durchmesser (cm)
    messungen: [],         // {id, name, d, u, q}
    meldung: "",
    piErkannt: false,      // Auswertung 1 gelöst
    steigungOk: false,     // Auswertung 2 gelöst
    steigungGezeigt: false,
    genauOk: false         // Auswertung 3 gelöst
  };
  const fertig = id => zustand.messungen.some(z => z.id === id);

  // Phasen-Tabs über den gemeinsamen Helfer
  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="360" height="640" aria-label="Messplatz: sechs runde Alltagsgegenstände von der 2-Euro-Münze bis zum Fahrradreifen. Je nach Schritt zeigt das Bild den Messschieber, das angelegte Lineal oder das umgelegte Maßband — mit einer Lupe auf die Skala an der Ablesestelle."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // Ablage-Plätze für die Objektwahl (2 Spalten × 3 Reihen)
  const SLOTS = OBJEKTE.map((o, i) => ({ x: 14 + (i % 2) * 172, y: 46 + Math.floor(i / 2) * 192, w: 160, h: 182 }));
  const LUPE_Y = 440;

  function rRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  // ---------- stilisierte Objekte (Draufsicht) ----------
  function maleObjekt(o, cx, cy, r, F) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7);
    ctx.fillStyle = F.cFlaeche; ctx.fill();
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = F.cLeise; ctx.lineWidth = 1.5;
    if (o.id === "muenze") {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, 7); ctx.stroke();
      ctx.fillStyle = F.cText; ctx.font = "bold " + Math.max(10, Math.round(r * 0.7)) + "px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.fillText("2", cx, cy + r * 0.26);
      ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";
    } else if (o.id === "teelicht") {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, 7); ctx.stroke();
      ctx.fillStyle = F.cText; ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, r * 0.06), 0, 7); ctx.fill(); // Docht
    } else if (o.id === "dose") {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy - r * 0.3, Math.max(3, r * 0.16), 0, 7); ctx.stroke(); // Öffnungslasche
    } else if (o.id === "cd") {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.38, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.12, 0, 7); ctx.stroke();
    } else if (o.id === "uhr") {
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8);
        ctx.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
        ctx.stroke();
      }
      ctx.strokeStyle = F.cText; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - r * 0.52);
      ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.38, cy + r * 0.12); ctx.stroke();
    } else if (o.id === "reifen") {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, 7); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.1, cy + Math.sin(a) * r * 0.1);
        ctx.lineTo(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55);
        ctx.stroke();
      }
    }
  }

  // ---------- Lupenfenster: vergrößerte Skala rund um die Ablesestelle ----------
  function zeichneLupe(yTop, wertCm, titel, F) {
    const x0 = 22, breite = 316, hoehe = 64, oben = yTop + 30;
    const mitte = Math.round(wertCm * 2) / 2;   // Fenster auf halbe cm gerastert
    const von = mitte - 1.5;                    // Ausschnitt: 3 cm
    const proCm = breite / 3;
    ctx.fillStyle = F.cText; ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText("Lupe: " + titel, x0, yTop + 10);
    ctx.font = "12px system-ui, sans-serif";
    rRect(x0, oben, breite, hoehe, 4);
    ctx.fillStyle = F.cHauch; ctx.fill();
    ctx.strokeStyle = F.cLeise; ctx.lineWidth = 1.5; ctx.stroke();
    const vonMm = Math.round(von * 10);
    for (let mm = vonMm; mm <= vonMm + 30; mm++) {
      const x = x0 + (mm / 10 - von) * proCm;
      if (x < x0 + 1 || x > x0 + breite - 1) continue;
      const cmStrich = mm % 10 === 0, halb = mm % 5 === 0;
      ctx.strokeStyle = cmStrich ? F.cText : F.cLeise;
      ctx.lineWidth = cmStrich ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x, oben); ctx.lineTo(x, oben + (cmStrich ? 26 : halb ? 18 : 11)); ctx.stroke();
      if (cmStrich) {
        ctx.fillStyle = F.cText; ctx.textAlign = "center"; ctx.font = "bold 13px system-ui, sans-serif";
        ctx.fillText(String(Math.round(mm / 10)), x, oben + 44);
        ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
      }
    }
    ctx.fillStyle = F.cLeise; ctx.fillText("cm", x0 + breite - 24, oben + 58);
    // Ablesemarke: Pfeil + gestrichelte Linie
    const xw = x0 + (wertCm - von) * proCm;
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(xw, oben); ctx.lineTo(xw, oben + hoehe); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = F.cAkzent;
    ctx.beginPath(); ctx.moveTo(xw, oben - 2); ctx.lineTo(xw - 7, oben - 13); ctx.lineTo(xw + 7, oben - 13); ctx.closePath(); ctx.fill();
  }

  // ---------- Szenen ----------
  function zeichneRegal(F) {
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Runde Objekte — anklicken:", 14, 28);
    ctx.font = "12px system-ui, sans-serif";
    OBJEKTE.forEach((o, i) => {
      const s = SLOTS[i], done = fertig(o.id);
      rRect(s.x, s.y, s.w, s.h, 10);
      ctx.fillStyle = F.cFlaeche; ctx.fill();
      ctx.strokeStyle = F.cLeise; ctx.lineWidth = done ? 1.5 : 2; ctx.stroke();
      maleObjekt(o, s.x + s.w / 2, s.y + 78, Math.min(54, 10 * Math.sqrt(o.d)), F);
      ctx.textAlign = "center"; ctx.fillStyle = done ? F.cLeise : F.cText;
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(o.kurz + (done ? " ✓" : ""), s.x + s.w / 2, s.y + s.h - 14);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    });
  }

  function zeichneSchieber(o, F) {
    const messMm = messeDurchmesser(o) * 10;
    const x0 = 30, proMm = 3.8, beamY = 150, beamH = 32;
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Messschieber — " + o.name, 14, 28);
    ctx.font = "12px system-ui, sans-serif";
    // vereinfachter Nonius: digitale Anzeige in 0,05-mm-Schritten
    ctx.fillStyle = F.cLeise; ctx.fillText("Anzeige (0,05-mm-Schritte):", 30, 64);
    rRect(30, 74, 150, 40, 6);
    ctx.fillStyle = F.cHauch; ctx.fill();
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = F.cText; ctx.font = "bold 19px ui-monospace, Consolas, monospace";
    ctx.textAlign = "right"; ctx.fillText(komma(messMm, 2) + " mm", 168, 101);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";
    // Schiene mit mm-Hauptskala
    rRect(x0 - 10, beamY, 322, beamH, 3);
    ctx.fillStyle = F.cFlaeche; ctx.fill();
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2; ctx.stroke();
    for (let mm = 0; mm <= 80; mm++) {
      const x = x0 + mm * proMm;
      const zehner = mm % 10 === 0;
      ctx.strokeStyle = zehner ? F.cText : F.cLeise; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, beamY); ctx.lineTo(x, beamY + (zehner ? 14 : mm % 5 === 0 ? 10 : 6)); ctx.stroke();
      if (zehner) {
        ctx.fillStyle = F.cText; ctx.textAlign = "center";
        ctx.fillText(String(mm), x, beamY + 27);
        ctx.textAlign = "start";
      }
    }
    ctx.fillStyle = F.cLeise; ctx.fillText("mm", x0 + 290, beamY - 8);
    // Backen + Objekt dazwischen
    const xm = x0 + messMm * proMm;
    const rPx = (xm - x0) / 2;
    const backenH = Math.min(2 * rPx + 26, 330);
    ctx.fillStyle = F.cText;
    ctx.fillRect(x0 - 8, beamY + beamH, 8, backenH);
    ctx.fillRect(xm, beamY + beamH, 8, backenH);
    maleObjekt(o, (x0 + xm) / 2, beamY + beamH + rPx + 10, rPx, F);
    // Ablesemarke der beweglichen Backe auf der Hauptskala
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(xm, beamY); ctx.lineTo(xm, beamY + beamH + 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = F.cAkzent;
    ctx.beginPath(); ctx.moveTo(xm, beamY - 2); ctx.lineTo(xm - 6, beamY - 12); ctx.lineTo(xm + 6, beamY - 12); ctx.closePath(); ctx.fill();
  }

  function zeichneLinealD(o, F) {
    const mess = messeDurchmesser(o);
    const cx = 180, cy = 215, rZiel = 120;
    const proCm = (2 * rZiel) / mess;
    const geraet = o.d > 15 ? "Maßband (gespannt)" : "Lineal";
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(geraet + " — " + o.name, 14, 28);
    ctx.font = "12px system-ui, sans-serif";
    maleObjekt(o, cx, cy, rZiel, F);
    const links = cx - rZiel, rechts = links + mess * proCm;
    // Lineal-/Bandstreifen quer über die breiteste Stelle
    rRect(links - 14, cy - 12, mess * proCm + 42, 24, 3);
    ctx.fillStyle = F.cHauch; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = F.cLeise; ctx.lineWidth = 1.5; ctx.stroke();
    // grobe cm-Striche (fein ablesen geht in der Lupe)
    const tickSchritt = proCm >= 6 ? 1 : 5;
    const labelSchritt = proCm >= 28 ? 2 : proCm >= 12 ? 5 : 10;
    for (let cm = 0; cm <= Math.ceil(mess); cm += tickSchritt) {
      const x = links + cm * proCm;
      if (x > rechts + 26) break;
      const beschriftet = cm % labelSchritt === 0;
      ctx.strokeStyle = beschriftet ? F.cText : F.cLeise; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, cy - 12); ctx.lineTo(x, cy - 12 + (beschriftet ? 10 : 6)); ctx.stroke();
      if (beschriftet) {
        ctx.fillStyle = F.cText; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(String(cm), x, cy + 8);
        ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";
      }
    }
    // Null-Marke links, Ablesestelle rechts
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(links, cy - 40); ctx.lineTo(links, cy + 40);
    ctx.moveTo(rechts, cy - 40); ctx.lineTo(rechts, cy + 40); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = F.cText; ctx.textAlign = "center";
    ctx.fillText("0", links, cy - 46);
    ctx.fillText("ablesen!", rechts, cy - 46);
    ctx.textAlign = "start";
    zeichneLupe(LUPE_Y, mess, "Skala am rechten Rand", F);
  }

  function zeichneBand(o, F) {
    const messU = messeUmfang(o);
    const cx = 180, cy = 215, r = 116;
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Maßband außen herum — " + o.name, 14, 28);
    ctx.font = "12px system-ui, sans-serif";
    maleObjekt(o, cx, cy, r, F);
    // Band als straff anliegender Ring + abstehendes Bandende
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 9; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.arc(cx, cy, r + 9, 0, 2 * Math.PI); ctx.stroke();
    const a = -Math.PI / 4;
    const ex = cx + Math.cos(a) * (r + 9), ey = cy + Math.sin(a) * (r + 9);
    ctx.beginPath(); ctx.moveTo(ex, ey);
    ctx.quadraticCurveTo(ex + 36, ey - 30, ex + 62, ey - 26); ctx.stroke();
    ctx.globalAlpha = 1;
    // Überlappstelle markieren
    ctx.fillStyle = F.cText;
    ctx.beginPath(); ctx.arc(ex, ey, 4, 0, 7); ctx.fill();
    ctx.textAlign = "center";
    ctx.fillText("Überlappstelle", ex - 20, ey - 50);
    ctx.textAlign = "start";
    zeichneLupe(LUPE_Y, messU, "Maßband an der Überlappstelle", F);
  }

  function zeichneAbrollen(o, F) {
    const messU = messeUmfang(o);
    const boden = 296, r = 34;
    const startX = 70, endX = startX + 2 * Math.PI * r; // maßstäblich: 1 Umdrehung
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Abrollmethode — " + o.name, 14, 28);
    ctx.font = "12px system-ui, sans-serif";
    // Boden
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, boden); ctx.lineTo(352, boden); ctx.stroke();
    // Startposition (blass) und Position nach genau einer Umdrehung
    ctx.setLineDash([5, 4]); ctx.strokeStyle = F.cLeise; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(startX, boden - r, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    maleObjekt(o, endX, boden - r, r, F);
    // Ventil-Marke berührt den Boden bei Start und Stopp
    ctx.fillStyle = F.cAkzent;
    ctx.beginPath(); ctx.arc(startX, boden - 5, 4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(endX, boden - 5, 4, 0, 7); ctx.fill();
    // Rollrichtung
    ctx.strokeStyle = F.cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(startX + 50, boden - r - 36); ctx.lineTo(endX - 50, boden - r - 36); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(endX - 50, boden - r - 36); ctx.lineTo(endX - 60, boden - r - 41);
    ctx.moveTo(endX - 50, boden - r - 36); ctx.lineTo(endX - 60, boden - r - 31); ctx.stroke();
    ctx.fillStyle = F.cLeise; ctx.textAlign = "center";
    ctx.fillText("genau 1 Umdrehung", (startX + endX) / 2, boden - r - 44);
    // Kreidemarken + Maßband am Boden
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(startX, boden + 2); ctx.lineTo(startX, boden + 20);
    ctx.moveTo(endX, boden + 2); ctx.lineTo(endX, boden + 20); ctx.stroke();
    rRect(startX, boden + 6, endX - startX, 12, 2);
    ctx.fillStyle = F.cHauch; ctx.fill();
    ctx.strokeStyle = F.cLeise; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = F.cText;
    ctx.fillText("Start", startX, boden + 34);
    ctx.fillText("Stopp", endX, boden + 34);
    ctx.textAlign = "start";
    zeichneLupe(LUPE_Y, messU, "Maßband an der Stopp-Marke", F);
  }

  function zeichne() {
    const F = {
      cText: farbe("--text"), cLeise: farbe("--text-leise", "#767676"),
      cAkzent: farbe("--akzent", "#1762a8"), cFlaeche: farbe("--flaeche", "#fff"),
      cHauch: farbe("--hauch", "#eee")
    };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "start";
    const o = zustand.gewaehlt;
    if (!o) { zeichneRegal(F); return; }
    if (zustand.schritt === "durchmesser") {
      if (o.geraetD === "schieber") zeichneSchieber(o, F); else zeichneLinealD(o, F);
    } else if (zustand.schritt === "umfang") {
      if (o.geraetU === "abrollen") zeichneAbrollen(o, F); else zeichneBand(o, F);
    }
  }

  // ---------- Interaktion ----------
  canvas.addEventListener("click", ev => {
    if (zustand.gewaehlt) return;
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) * canvas.width / r.width;
    const y = (ev.clientY - r.top) * canvas.height / r.height;
    const i = SLOTS.findIndex(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (i >= 0) waehleObjekt(OBJEKTE[i]);
  });

  function waehleObjekt(o) {
    if (zustand.phase !== "messen") wechslePhase("messen");
    if (fertig(o.id)) {
      zustand.meldung = o.name + " steht schon mit ✓ in der Tabelle — wähle ein anderes Objekt.";
      panelMessen(); return;
    }
    zustand.gewaehlt = o; zustand.schritt = "durchmesser";
    zustand.dNotiert = NaN; zustand.meldung = "";
    zeichne(); panelMessen();
  }

  function melde(text) {
    zustand.meldung = text;
    const el = panel.querySelector("#exp-meldung");
    if (el) el.textContent = text;
  }

  // ---------- Panels ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf dem Tisch liegen <strong>sechs runde Gegenstände</strong> — von der 2-Euro-Münze bis zum Fahrradreifen. Dazu drei Messwerkzeuge:</p>
      <ul>
        <li><strong>Messschieber</strong> — für kleine, feste Dinge: Die Backen fassen das Objekt, die Anzeige zeigt den Durchmesser in <strong>mm</strong>, sogar in 0,05-mm-Schritten.</li>
        <li><strong>Lineal bzw. gespanntes Maßband</strong> — für große Durchmesser, quer über die breiteste Stelle.</li>
        <li><strong>Maßband außen herum</strong> — für den Umfang. Beim Fahrradreifen geht es schlauer: <em>abrollen!</em></li>
      </ul>
      <p><strong>Dein Plan für jedes Objekt:</strong></p>
      <ol>
        <li><strong>Durchmesser d</strong> messen (einmal quer durch die Mitte),</li>
        <li><strong>Umfang u</strong> messen (einmal außen herum),</li>
        <li>das System rechnet dann <strong>u ÷ d</strong> für dich aus.</li>
      </ol>
      <p class="exp-hinweis"><strong>Schätz mal, bevor du startest:</strong> Wie oft passt der Durchmesser in den Umfang — etwa 2-mal, 3-mal oder 4-mal? Behalte deine Schätzung im Kopf und prüfe sie nachher an der Tabelle.</p>
      <p>Miss <strong>mindestens ${MINDEST_OBJEKTE} Objekte</strong> — je mehr (und je größer), desto deutlicher wird das Muster.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const o = zustand.gewaehlt;
    const n = zustand.messungen.length;
    let oben = "";
    if (!o) {
      oben = `
        <p>Wähle dein nächstes Objekt — klicke es im Bild an (oder hier):</p>
        <div class="exp-masseknoepfe" aria-label="Objekt wählen">
          ${OBJEKTE.map(x => `<button class="knopf zweitrangig" data-objekt="${x.id}" ${fertig(x.id) ? "disabled" : ""}>${esc(x.kurz)}${fertig(x.id) ? " ✓" : ""}</button>`).join("")}
        </div>`;
    } else if (zustand.schritt === "durchmesser") {
      const hinweis = o.geraetD === "schieber"
        ? `<p><strong>Schritt 1 — Durchmesser:</strong> ${esc(o.name)} steckt zwischen den Backen des Messschiebers (nur sachte schließen, nichts eindrücken!). Die <strong>Anzeige zeigt mm</strong>, die Tabelle will <strong>cm</strong>: 10 mm = 1 cm. Runden auf 1–2 Nachkommastellen ist völlig okay.</p>`
        : `<p><strong>Schritt 1 — Durchmesser:</strong> Das ${o.d > 15 ? "straff gespannte Maßband" : "Lineal"} liegt quer über der <strong>breitesten Stelle</strong>, die 0-Marke genau am linken Rand. Lies in der <strong>Lupe</strong> ab, wo der rechte Rand auf der Skala landet — auf Millimeter genau (dicke Striche = ganze cm).</p>`;
      oben = `${hinweis}
        <form id="exp-d" class="exp-ablesen">
          <label for="exp-wert-d">d =</label>
          <input id="exp-wert-d" inputmode="decimal" autocomplete="off" size="7"> cm
          <button class="knopf">Notieren</button>
        </form>`;
    } else if (zustand.schritt === "umfang") {
      const hinweis = o.geraetU === "abrollen"
        ? `<p>✓ d = <strong>${komma(zustand.dNotiert, 2)} cm</strong> notiert.</p>
           <p><strong>Schritt 2 — Umfang (Abrollmethode):</strong> Ein Maßband um den ganzen Reifen zu legen ist fummelig. Schlauer: Ventil nach unten, Kreidestrich („Start"), den Reifen <strong>genau eine Umdrehung</strong> geradeaus rollen — ohne zu rutschen! —, wieder Kreidestrich („Stopp"). Die Strecke dazwischen ist der Umfang. Lies sie in der Lupe ab.</p>`
        : `<p>✓ d = <strong>${komma(zustand.dNotiert, 2)} cm</strong> notiert.</p>
           <p><strong>Schritt 2 — Umfang:</strong> Das Maßband liegt <strong>straff und gerade</strong> einmal außen um dein Objekt. An der <strong>Überlappstelle</strong> trifft das Bandende wieder auf die Skala — genau dort liest du den Umfang ab. Die Lupe zeigt dir die Stelle, auf Millimeter genau.</p>`;
      oben = `${hinweis}
        <form id="exp-u" class="exp-ablesen">
          <label for="exp-wert-u">u =</label>
          <input id="exp-wert-u" inputmode="decimal" autocomplete="off" size="7"> cm
          <button class="knopf">Notieren</button>
        </form>`;
    }
    panel.innerHTML = `
      <h2>Durchführung</h2>
      ${oben}
      ${o ? '<p><button class="knopf zweitrangig" id="exp-abbruch">Objekt zurücklegen</button></p>' : ""}
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldung)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Objekt</th><th>d in cm</th><th>u in cm</th><th>u ÷ d</th></tr></thead>
        <tbody>${zustand.messungen.map(z => `<tr><td>${esc(z.name)}</td><td>${komma(z.d, 2)}</td><td>${komma(z.u, 2)}</td><td><strong>${komma(z.q, 3)}</strong></td></tr>`).join("") || '<tr><td colspan="4">noch leer</td></tr>'}</tbody>
      </table>
      <p>${n} von mindestens ${MINDEST_OBJEKTE} Objekten gemessen.${n >= MINDEST_OBJEKTE ? " Das reicht — mehr ist trotzdem besser!" : ""}</p>
      <button class="knopf" id="exp-weiter2" ${n >= MINDEST_OBJEKTE ? "" : "disabled"}>Zur Auswertung</button>`;

    panel.querySelectorAll("[data-objekt]").forEach(b =>
      b.addEventListener("click", () => waehleObjekt(OBJEKTE.find(x => x.id === b.dataset.objekt))));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-abbruch")?.addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.dNotiert = NaN; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-d")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-d").value);
      if (!ablesungOk(eingabe, messeDurchmesser(o), tolD(o))) {
        melde(o.geraetD === "schieber"
          ? "✗ Das passt noch nicht. Die Anzeige zeigt mm — für cm durch 10 teilen. Beispiel: 80,00 mm wären 8 cm."
          : "✗ Schau noch einmal in die Lupe: Bei welcher Zahl steht der rechte Rand? Dicke Striche sind ganze cm, kleine sind mm.");
        return;
      }
      zustand.dNotiert = eingabe; zustand.schritt = "umfang"; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-u")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-u").value);
      if (!ablesungOk(eingabe, messeUmfang(o), TOL_U)) {
        melde("✗ Schau noch einmal in die Lupe: Dicke Striche sind ganze cm, kleine sind mm. Du bist nah dran!");
        return;
      }
      const q = quotient(eingabe, zustand.dNotiert);
      zustand.messungen.push({ id: o.id, name: o.name, d: zustand.dNotiert, u: eingabe, q });
      zustand.meldung = `✓ ${o.name}: Das System rechnet vor: u ÷ d = ${komma(eingabe, 2)} ÷ ${komma(zustand.dNotiert, 2)} = ${komma(q, 3)}. Kommt dir die Zahl bekannt vor?`;
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.dNotiert = NaN;
      zeichne(); panelMessen();
    });
  }

  function panelAuswerten() {
    const zeilen = zustand.messungen;
    if (zeilen.length < MINDEST_OBJEKTE) {
      panel.innerHTML = `<h2>Auswertung</h2><p>Noch zu wenige Messwerte! Geh zu „2 · Durchführung" und miss zuerst mindestens ${MINDEST_OBJEKTE} Objekte.</p>`;
      return;
    }
    const qMittel = mittel(zeilen.map(z => z.q));
    const punkte = zeilen.map(z => ({ x: z.d, y: z.u }));
    const m = steigungUrsprung(punkte);
    const frei = regression(punkte);
    const gemessen = OBJEKTE.filter(x => fertig(x.id)); // aufsteigend nach d
    const kleinstes = gemessen[0], groesstes = gemessen[gemessen.length - 1];
    const abwProzent = Math.abs(qMittel - Math.PI) / Math.PI * 100;

    const teil1 = `
      <h3>1 · Ein Muster in der Tabelle</h3>
      <p>Deine Quotienten: ${zeilen.map(z => `<strong>${komma(z.q, 3)}</strong>`).join(" · ")}<br>
      Mittelwert: <strong>${komma(qMittel, 3)}</strong> — ob Münze oder Reifen, es kommt fast immer dasselbe heraus!</p>
      ${zustand.piErkannt ? `
        <p class="exp-hinweis">✓ Diese Zahl heißt <strong>π</strong> (sprich „Pi") — die <strong>Kreiszahl</strong>. Sie beginnt mit 3,14159… und ihre Nachkommastellen enden nie. Dein Mittelwert ${komma(qMittel, 3)} liegt nur ${komma(abwProzent, 1)} % daneben — stark gemessen!</p>` : `
        <form id="exp-pi" class="exp-ablesen">
          <label for="exp-wert-pi">Um welche berühmte Zahl drängeln sich deine Quotienten?</label>
          <input id="exp-wert-pi" autocomplete="off" size="7">
          <button class="knopf">Prüfen</button>
        </form>`}`;

    const teil2 = !zustand.piErkannt ? "" : `
      <h3>2 · Alle Punkte auf einer Geraden</h3>
      <p>Jedes Objekt wird ein Punkt: Durchmesser nach rechts, Umfang nach oben. Die gestrichelte Gerade ist die <strong>Regressionsgerade durch den Ursprung</strong> — die Gerade, die am besten zu allen Punkten passt. (Dass sie durch den Nullpunkt muss, ist klar: kein Durchmesser, kein Umfang.)</p>
      <canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Diagramm: Umfang u über Durchmesser d. Alle Messpunkte liegen auf einer Ursprungsgeraden; ein gestricheltes Steigungsdreieck zeigt Delta d und Delta u."></canvas>
      ${zustand.steigungOk ? `
        <p>✓ Steigung m ≈ <strong>${komma(m, 3)}</strong> — schon wieder π! Und lässt man die Gerade frei (nicht durch null gezwungen), liefert die Regression als Achsenabschnitt b ≈ ${komma(frei.b, 2)} cm: praktisch null. Die Gerade <em>will</em> durch den Ursprung.</p>
        <p class="exp-hinweis"><strong>Kernsatz:</strong> π ist keine Erfindung des Messens und kein Zufall deiner Objekte — <strong>in jedem Kreis steckt dieselbe Zahl:</strong> u = π · d. Bei der Münze genauso wie beim Riesenrad.</p>` : `
        <p>Bestimme die Steigung der Geraden: <strong>Steigung = Δu ÷ Δd</strong>. Nimm das gestrichelte Steigungsdreieck im Diagramm zu Hilfe.</p>
        <details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>
          <p><strong>Teilschritt 1 – Dreieck ablesen:</strong> Im Diagramm ist ein gestricheltes <strong>Steigungsdreieck</strong> eingezeichnet. Die waagerechte Seite ist Δd (eine Strecke nach rechts, in cm), die senkrechte Seite ist Δu (das Stück nach oben, in cm). Beide Werte stehen am Dreieck.</p>
          <p><strong>Teilschritt 2 – teilen:</strong> Rechne Steigung = Δu ÷ Δd. Beispiel mit erfundenen Zahlen: Wäre Δd = 20 cm und Δu = 65 cm, ergäbe das 65 ÷ 20 = 3,25. Setz deine echten Dreieckswerte ein; die Steigung ist die Zahl, die du schon aus Spalte „u ÷ d“ kennst.</p>
        </details>
        <form id="exp-m" class="exp-ablesen">
          <label for="exp-wert-m">Steigung =</label>
          <input id="exp-wert-m" inputmode="decimal" autocomplete="off" size="7">
          <button class="knopf">Prüfen</button>
          <button class="knopf zweitrangig" type="button" id="exp-m-zeigen">Steigung anzeigen</button>
        </form>
        ${zustand.steigungGezeigt ? `<p>Die Regression rechnet: m ≈ <strong>${komma(m, 3)}</strong>. Tippe den Wert oben ein.</p>` : ""}`}`;

    const teil3 = !zustand.steigungOk ? "" : `
      <h3>3 · Wo misst man π am genauesten?</h3>
      <p>Stell dir vor, du verliest dich überall um nur <strong>1 mm</strong> — beim Durchmesser und beim Umfang. Bei welchem deiner Objekte verfälscht das den Quotienten u ÷ d am wenigsten?</p>
      <label for="exp-genau">Am genauesten ist:</label>
      <select id="exp-genau" class="exp-wahl">
        <option value="">— wähle ein Objekt —</option>
        ${gemessen.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}
      </select>
      ${zustand.genauOk ? `
        <p class="exp-hinweis">✓ Richtig: <strong>${esc(groesstes.name)}</strong>! Derselbe Millimeter Ablesefehler verfälscht u ÷ d beim kleinsten Objekt (${esc(kleinstes.kurz)}) um bis zu ±${komma(relFehlerProMm(kleinstes) * 100, 1)} %, beim größten (${esc(groesstes.kurz)}) nur um ±${komma(relFehlerProMm(groesstes) * 100, 1)} %. Je größer der Kreis, desto weniger fällt derselbe Millimeter ins Gewicht${groesstes.id === "reifen" ? " — die Abrollstrecke des Reifens liefert deinen besten π-Wert!" : "."}</p>` : ""}`;

    const abschluss = !zustand.genauOk ? "" : `
      <p><strong>Experiment komplett!</strong> Du hast π nicht nachgeschlagen, sondern selbst vermessen: u ÷ d ≈ ${komma(qMittel, 2)}. Speichere deine Messwerte als CSV — und prüf das Ganze zu Hause mit echtem Maßband nach.</p>`;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      ${teil1}${teil2}${teil3}${abschluss}
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum nie haargenau π?</summary>
        <p><strong>Maßband anlegen:</strong> Liegt das Band schräg, locker oder nicht an der breitesten Stelle, wird u zu groß oder d zu klein — der Quotient wandert. Straff ziehen, gerade führen, lieber zweimal messen.</p>
        <p><strong>Weiche Objekte:</strong> Die Backen des Messschiebers drücken Dose oder Teelicht leicht ein — schon fehlen ein paar Zehntelmillimeter. Deshalb: nur sachte schließen.</p>
        <p><strong>Abrollen:</strong> Rutscht der Reifen beim Rollen oder ist er weich aufgepumpt, stimmt die Strecke nicht mehr genau mit dem Umfang überein.</p>
        <p><strong>22/7 — der Klassiker:</strong> Schon Archimedes grenzte π vor über 2000 Jahren geschickt ein; 22 ÷ 7 ≈ 3,1429 ist seitdem eine berühmte <em>Näherung</em> — gut, aber nicht π. Mit Messen allein kommt man nie auf alle Stellen: π = 3,14159265… hat unendlich viele.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV speichern</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;

    panel.querySelector("#exp-pi")?.addEventListener("submit", ev => {
      ev.preventDefault();
      if (piAntwortOk(panel.querySelector("#exp-wert-pi").value)) {
        zustand.piErkannt = true; panelAuswerten();
      } else {
        melde("✗ Noch nicht. Tipp: Schau auf den Mittelwert deiner Quotienten — die Zahl hat einen griechischen Namen. (Zahl oder Name eingeben.)");
      }
    });
    panel.querySelector("#exp-m")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-wert-m").value);
      if (ablesungOk(e, m, TOL_ZAHL)) {
        zustand.steigungOk = true; panelAuswerten();
      } else {
        melde("✗ Steigung = Δu ÷ Δd. Lies beide Werte am gestrichelten Dreieck ab und teile — auf ±0,03 genau, Komma oder Punkt.");
      }
    });
    panel.querySelector("#exp-m-zeigen")?.addEventListener("click", () => {
      zustand.steigungGezeigt = true; panelAuswerten();
    });
    const auswahl = panel.querySelector("#exp-genau");
    if (auswahl) {
      if (zustand.genauOk) { auswahl.value = groesstes.id; auswahl.disabled = true; }
      auswahl.addEventListener("change", ev => {
        if (!ev.target.value) return;
        if (ev.target.value === groesstes.id) {
          zustand.genauOk = true; panelAuswerten();
        } else {
          melde("✗ Überleg: 1 mm von 8 cm Umfang ist viel — 1 mm von fast 2 m Umfang fast nichts. Wo stört derselbe Millimeter am wenigsten?");
        }
      });
    }
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("pi-messen-messwerte.csv",
        ["Objekt", "d in cm", "u in cm", "u/d"],
        zeilen.map(z => [z.name, z.d, z.u, z.q]));
    });
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.dNotiert = NaN;
      zustand.messungen = []; zustand.meldung = "";
      zustand.piErkannt = false; zustand.steigungOk = false;
      zustand.steigungGezeigt = false; zustand.genauOk = false;
      zeichne(); wechslePhase("aufbau");
    });
    if (zustand.piErkannt) zeichneDiagramm(m);
  }

  // u-d-Diagramm: Messpunkte, Ursprungsgerade, Steigungsdreieck
  function zeichneDiagramm(m) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !zustand.messungen.length) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise", "#767676"), cAkzent = farbe("--akzent", "#1762a8");
    const W = dia.width, H = dia.height, L = 50, U = H - 40;
    const punkte = zustand.messungen.map(z => ({ x: z.d, y: z.u }));
    const dMax = Math.max(...punkte.map(p => p.x)) * 1.12;
    const uMax = Math.max(...punkte.map(p => p.y)) * 1.12;
    const X = d => L + d / dMax * (W - L - 16);
    const Y = u => U - u / uMax * (U - 18);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, 10); c.lineTo(L, U); c.lineTo(W - 8, U); c.stroke();
    c.fillStyle = cText;
    c.fillText("u in cm", 8, 20); c.fillText("d in cm", W - 56, U + 30);
    c.fillText("0", L - 14, U + 14);
    if (Number.isFinite(m)) {
      // Ursprungsgerade
      const dEnd = Math.min(dMax, uMax / m);
      c.strokeStyle = cLeise; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(dEnd), Y(m * dEnd)); c.stroke();
      // Steigungsdreieck an „runder" Stelle
      const dn = Math.max(...punkte.map(p => p.x)) >= 50 ? 50 : 25;
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(dn), Y(0)); c.lineTo(X(dn), Y(m * dn)); c.stroke();
      c.setLineDash([]);
      c.fillStyle = cLeise; c.textAlign = "center";
      c.fillText("Δd = " + dn + " cm", X(dn / 2), U - 6);
      const links = X(dn) + 100 > W - 6;
      c.textAlign = links ? "end" : "start";
      c.fillText("Δu = " + komma(m * dn, 1) + " cm", links ? X(dn) - 8 : X(dn) + 8, (Y(m * dn) + U) / 2);
      c.textAlign = "start";
    }
    for (const z of zustand.messungen) {
      c.fillStyle = cAkzent; c.beginPath(); c.arc(X(z.d), Y(z.u), 5, 0, 7); c.fill();
    }
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    else if (id === "messen") panelMessen();
    else panelAuswerten();
  }

  zeichne();
  wechslePhase("aufbau");
}

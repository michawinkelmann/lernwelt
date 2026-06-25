// experiment.js — Interaktives Mathe-Experiment: Das Kegelvolumen vermessen (Klasse 10).
// Realitätsnahe Messpraxis statt fertiger Formel: mehrere Körperpaare, jeweils ein
// Kegel und ein Zylinder mit GLEICHER Grundfläche und Höhe. Der Zylinder ist innen
// mit einer cm³-Skala versehen — sein Füllvolumen V_Zyl = π·r²·h ist ablesbar. Der
// Kegel wird mit Sand gefüllt und in ein Messglas gegossen; dort liest man das
// umgefüllte Volumen V_Kegel SELBST an der Skala ab. Es ist jedes Mal rund ein
// Drittel des Zylindervolumens — drei Kegelfüllungen füllen den Zylinder.
// Trägt man V_Kegel über V_Zyl auf, entsteht eine Ursprungsgerade mit Steigung ⅓.
// Entdeckung: V_Kegel = ⅓ · V_Zyl = ⅓ · π · r² · h.
// Die Mess-Streuung ist deterministisch geseedet (helfer.streuung), dadurch
// laufen die TESTS DOM-frei in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel, regression,
  farbe, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Körperpaare (r, h in cm) ----------
// Bewusst verschieden große Paare. V_Zyl = π·r²·h (auf den Zylindern ablesbar),
// V_Kegel = V_Zyl/3 ist der Zielwert im Messglas.
export const PAARE = [
  { id: "schmal",  name: "schmales Paar",  kurz: "schmal",  r: 2, h: 9 },
  { id: "mittel",  name: "mittleres Paar", kurz: "mittel",  r: 3, h: 7 },
  { id: "breit",   name: "breites Paar",   kurz: "breit",   r: 4, h: 6 },
  { id: "hoch",    name: "hohes Paar",     kurz: "hoch",    r: 3, h: 12 }
];
export const MINDEST_PAARE = 4;

// ---------- Toleranzen ----------
export const TOL_VOLUMEN = 6;     // Ablesung am Messglas (cm³) — Skala in 5er-Schritten
export const TOL_DRITTEL = 0.04;  // Steigung / Verhältnis V_Kegel : V_Zyl
export const TOL_VORHER  = 1.5;   // Anwendungsrechnung in Auswertung 3 (cm³)

// ---------- Geometrie (rein, DOM-frei, Node-testbar) ----------
export function grundflaeche(r) { return Math.PI * r * r; }            // cm²
export function zylinderVolumen(p) { return grundflaeche(p.r) * p.h; }  // cm³ = π·r²·h
export function kegelVolumenWahr(p) { return zylinderVolumen(p) / 3; }  // cm³ = ⅓·π·r²·h

// Ablesung am Messglas: wahres Kegelvolumen + Streuung ±2 cm³, dann auf den
// nächsten 1-cm³-Strich gerundet (so steht eine ganze Zahl am Messglas).
export function lieseKegelVolumen(p) {
  const roh = kegelVolumenWahr(p) + streuung("vk:" + p.id, 4);
  return Math.round(roh);
}
// Das auf dem Zylinder aufgedruckte (ablesbare) Füllvolumen — auf ganze cm³ gerundet.
export function lieseZylinderVolumen(p) { return Math.round(zylinderVolumen(p)); }

export function verhaeltnis(vk, vz) { return vz > 0 ? vk / vz : NaN; }

// Regressionsgerade durch den Ursprung y = m·x (kleinste Quadrate ohne
// Achsenabschnitt): m = Σ(x·y) / Σ(x²) — denn 0 Zylindervolumen → 0 Kegelvolumen.
export function steigungUrsprung(punkte) {
  let sxx = 0, sxy = 0;
  for (const p of punkte) { sxx += p.x * p.x; sxy += p.x * p.y; }
  return sxx > 0 ? sxy / sxx : NaN;
}

// Antwort auf die Frage „Welcher Bruchteil?": ⅓ als Bruch, Dezimalzahl oder „3 mal".
export function drittelOk(text) {
  const t = String(text).trim().toLowerCase().replace(/\s/g, "");
  if (t === "1/3" || t === "⅓" || t === "eindrittel" || t === "drittel") return true;
  return ablesungOk(parseDezimal(t), 1 / 3, TOL_DRITTEL + 1e-9);
}

// Vorhergesagtes Kegelvolumen über die Formel ⅓·π·r²·h (Selbstkontrolle in Auswertung 3).
export function vorhersageKegel(r, h) { return Math.PI * r * r * h / 3; }

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "V_Zyl = π·r²·h exakt für jedes Paar", ok: () => PAARE.every(p => Math.abs(zylinderVolumen(p) - Math.PI * p.r * p.r * p.h) < 1e-9) },
  { name: "V_Kegel = ⅓·V_Zyl exakt (Verhältnis genau 1/3)", ok: () => PAARE.every(p => Math.abs(kegelVolumenWahr(p) - zylinderVolumen(p) / 3) < 1e-9 && Math.abs(kegelVolumenWahr(p) / zylinderVolumen(p) - 1 / 3) < 1e-12) },
  // Unabhängige Nachrechnung: V_Kegel direkt aus ⅓·π·r²·h gebildet und gegen den
  // über V_Zyl/3 erhaltenen Wert geprüft — zwei getrennte Rechenwege, gleiches Ziel.
  { name: "unabhängig: ⅓·π·r²·h = V_Zyl/3 für jedes Paar", ok: () => PAARE.every(p => Math.abs(Math.PI * p.r * p.r * p.h / 3 - kegelVolumenWahr(p)) < 1e-9) },
  { name: "drei Kegelfüllungen ergeben genau das Zylindervolumen", ok: () => PAARE.every(p => Math.abs(3 * kegelVolumenWahr(p) - zylinderVolumen(p)) < 1e-9) },
  { name: "Ursprungs-Regression der perfekten Punkte (V_Zyl, V_Kegel): Steigung = ⅓", ok: () => Math.abs(steigungUrsprung(PAARE.map(p => ({ x: zylinderVolumen(p), y: kegelVolumenWahr(p) }))) - 1 / 3) < 1e-9 },
  { name: "freie Regression (helfer.js) der perfekten Punkte: m = ⅓, b = 0", ok: () => { const { m, b } = regression(PAARE.map(p => ({ x: zylinderVolumen(p), y: kegelVolumenWahr(p) }))); return Math.abs(m - 1 / 3) < 1e-9 && Math.abs(b) < 1e-6; } },
  { name: "abgelesenes Kegelvolumen ist ganzzahlig, Streuung ≤ 2 cm³", ok: () => PAARE.every(p => { const v = lieseKegelVolumen(p); return Number.isInteger(v) && Math.abs(v - kegelVolumenWahr(p)) <= 2 + 1e-9; }) },
  { name: "abgelesenes Verhältnis V_Kegel : V_Zyl liegt ≤ 0,04 neben ⅓", ok: () => PAARE.every(p => Math.abs(verhaeltnis(lieseKegelVolumen(p), lieseZylinderVolumen(p)) - 1 / 3) <= 0.04) },
  { name: "Messungen deterministisch (zweiter Aufruf identisch)", ok: () => PAARE.every(p => lieseKegelVolumen(p) === lieseKegelVolumen(p) && lieseZylinderVolumen(p) === lieseZylinderVolumen(p)) },
  { name: "Steigung der abgelesenen Punkte nahe ⅓, ±0,04-Prüfung greift", ok: () => { const m = steigungUrsprung(PAARE.map(p => ({ x: lieseZylinderVolumen(p), y: lieseKegelVolumen(p) }))); return Math.abs(m - 1 / 3) <= 0.03 && ablesungOk(m + 0.03, m, TOL_DRITTEL) && !ablesungOk(m + 0.07, m, TOL_DRITTEL); } },
  { name: "Vorhersage ⅓·π·r²·h stimmt mit V_Kegel überein", ok: () => PAARE.every(p => Math.abs(vorhersageKegel(p.r, p.h) - kegelVolumenWahr(p)) < 1e-9) },
  { name: "parseDezimal + Toleranzen (Volumen/Drittel)", ok: () => { const vk = lieseKegelVolumen(PAARE[0]); return parseDezimal("37,7") === 37.7 && parseDezimal(" 0.33 ") === 0.33 && Number.isNaN(parseDezimal("Sand")) && ablesungOk(vk + 5, vk, TOL_VOLUMEN) && !ablesungOk(vk + 7, vk, TOL_VOLUMEN) && drittelOk("1/3") && drittelOk("⅓") && drittelOk("0,33") && drittelOk("0,34") && !drittelOk("0,5") && !drittelOk("0,25") && !drittelOk(""); } }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    phase: "aufbau",
    gewaehlt: null,        // Paar in Arbeit
    schritt: "",           // "" | "gegossen" (Sand liegt im Messglas, ablesebereit)
    vzNotiert: NaN,        // abgelesenes Zylindervolumen (cm³)
    messungen: [],         // {id, name, r, h, vz, vk, verh}
    meldung: "",
    drittelOk: false,      // Auswertung 1 gelöst
    steigungOk: false,     // Auswertung 2 gelöst
    steigungGezeigt: false,
    formelOk: false        // Auswertung 3 gelöst
  };
  const fertig = id => zustand.messungen.some(z => z.id === id);

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML =
    '<div class="exp-links">' +
    '<canvas id="exp-canvas" width="380" height="430" aria-label="Messplatz: Körperpaare aus Kegel und Zylinder mit gleicher Grundfläche und Höhe. Beim Messen steht links der Zylinder mit cm³-Skala und Füllvolumen, rechts ein Messglas, in das eine Kegelfüllung Sand gegossen wurde; der Füllstand ist an der Skala ablesbar."></canvas>' +
    '</div>' +
    '<div class="exp-rechts" id="exp-panel"></div>';
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // Ablage-Plätze für die Paarwahl (2 Spalten × 2 Reihen)
  const SLOTS = PAARE.map((p, i) => ({ x: 12 + (i % 2) * 186, y: 44 + Math.floor(i / 2) * 192, w: 178, h: 182 }));

  function rRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  // einheitlicher Maßstab fürs Regal, damit „breit" wirklich breiter aussieht
  const RMAX = Math.max(...PAARE.map(p => p.r));
  const HMAX = Math.max(...PAARE.map(p => p.h));

  // ---------- Zylinder (Draufsicht von der Seite) ----------
  function maleZylinder(cx, bodenY, halbBreite, hoehe, F, fuellen) {
    const ell = halbBreite * 0.32;
    // Mantel
    rRect(cx - halbBreite, bodenY - hoehe, 2 * halbBreite, hoehe, 0);
    ctx.fillStyle = fuellen ? F.cHauch : F.cFlaeche; ctx.fill();
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2; ctx.stroke();
    // obere Ellipse
    ctx.beginPath(); ctx.ellipse(cx, bodenY - hoehe, halbBreite, ell, 0, 0, 7);
    ctx.fillStyle = F.cFlaeche; ctx.fill(); ctx.stroke();
    // Boden-Ellipse (vordere Hälfte)
    ctx.beginPath(); ctx.ellipse(cx, bodenY, halbBreite, ell, 0, 0, Math.PI);
    ctx.stroke();
  }

  // ---------- Kegel (Spitze oben) ----------
  function maleKegel(cx, bodenY, halbBreite, hoehe, F) {
    const ell = halbBreite * 0.32;
    ctx.beginPath();
    ctx.moveTo(cx - halbBreite, bodenY);
    ctx.lineTo(cx, bodenY - hoehe);
    ctx.lineTo(cx + halbBreite, bodenY);
    ctx.closePath();
    ctx.fillStyle = F.cHauch; ctx.fill();
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2; ctx.stroke();
    // Grund-Ellipse (vordere Hälfte sichtbar)
    ctx.beginPath(); ctx.ellipse(cx, bodenY, halbBreite, ell, 0, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, bodenY, halbBreite, ell, 0, Math.PI, 2 * Math.PI);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = F.cLeise; ctx.stroke(); ctx.setLineDash([]);
  }

  function zeichneRegal(F) {
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Körperpaare — anklicken:", 12, 28);
    ctx.font = "12px system-ui, sans-serif";
    PAARE.forEach((p, i) => {
      const slot = SLOTS[i], done = fertig(p.id);
      rRect(slot.x, slot.y, slot.w, slot.h, 10);
      ctx.fillStyle = F.cFlaeche; ctx.fill();
      ctx.strokeStyle = F.cLeise; ctx.lineWidth = done ? 1.5 : 2; ctx.stroke();
      // Maßstab je Kachel
      const maxPxH = slot.h - 78;
      const sH = maxPxH / HMAX;
      const sR = (slot.w / 2 - 22) / (2 * RMAX); // beide Körper nebeneinander
      const hb = p.r * sR, hoehe = p.h * sH;
      const boden = slot.y + slot.h - 44;
      const cxK = slot.x + slot.w * 0.30, cxZ = slot.x + slot.w * 0.70;
      maleKegel(cxK, boden, hb, hoehe, F);
      maleZylinder(cxZ, boden, hb, hoehe, F, false);
      ctx.fillStyle = F.cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Kegel", cxK, boden + 16);
      ctx.fillText("Zylinder", cxZ, boden + 16);
      ctx.fillStyle = done ? F.cLeise : F.cText; ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(p.kurz + " (r=" + p.r + ", h=" + p.h + ")" + (done ? " ✓" : ""), slot.x + slot.w / 2, slot.y + slot.h - 12);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    });
  }

  // ---------- Mess-Szene: Zylinder mit Skala + Messglas mit Sandfüllung ----------
  function zeichneMessen(p, F) {
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText(p.name + " — r = " + p.r + " cm, h = " + p.h + " cm", 12, 26);
    ctx.font = "12px system-ui, sans-serif";

    const vz = lieseZylinderVolumen(p);     // aufgedrucktes Zylindervolumen
    const vk = lieseKegelVolumen(p);         // im Messglas abzulesen
    const gegossen = zustand.schritt === "gegossen";

    // gemeinsamer cm³-Maßstab fürs Bild: Skala mindestens 50 cm³ über V_Zyl,
    // damit über der Füllmarke des Zylinders genug Platz für das Wertschild bleibt.
    const vSkalaMax = Math.ceil(vz / 50) * 50 + 50;
    const gefaessHoehe = 300, gefaessOben = 70, gefaessBoden = gefaessOben + gefaessHoehe;
    const pxProCm3 = gefaessHoehe / vSkalaMax;
    const fuellHoehe = v => v * pxProCm3;

    // --- linker Zylinder mit aufgedrucktem Füllstand + cm³-Skala ---
    const zx = 96, zHalb = 40;
    // Skala-Striche links am Zylinder (alle 50 cm³ beschriftet)
    ctx.strokeStyle = F.cLeise; ctx.fillStyle = F.cText; ctx.textAlign = "right";
    ctx.font = "10px system-ui, sans-serif";
    for (let v = 0; v <= vSkalaMax; v += 50) {
      const y = gefaessBoden - fuellHoehe(v);
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(zx - zHalb - 8, y); ctx.lineTo(zx - zHalb, y); ctx.stroke();
      ctx.fillText(String(v), zx - zHalb - 11, y + 3);
    }
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    // Zylindermantel — volle Skalenhöhe (gleich hoch wie das Messglas, oben offen)
    rRect(zx - zHalb, gefaessOben, 2 * zHalb, gefaessHoehe, 0);
    ctx.fillStyle = F.cFlaeche; ctx.fill(); ctx.strokeStyle = F.cText; ctx.lineWidth = 2; ctx.stroke();
    // Füllung (bis V_Zyl)
    const fz = fuellHoehe(vz);
    ctx.fillStyle = F.cAkzent; ctx.globalAlpha = 0.28;
    ctx.fillRect(zx - zHalb + 2, gefaessBoden - fz, 2 * zHalb - 4, fz - 1);
    ctx.globalAlpha = 1;
    // Füllstandslinie + Wert (Label sitzt in der Kopffreiheit über der Füllung)
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(zx - zHalb, gefaessBoden - fz); ctx.lineTo(zx + zHalb, gefaessBoden - fz); ctx.stroke();
    ctx.fillStyle = F.cAkzent; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("V_Zyl = " + vz + " cm³", zx, gefaessBoden - fz - 8);
    ctx.fillStyle = F.cText; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Zylinder", zx, gefaessBoden + 18);
    ctx.fillStyle = F.cLeise; ctx.font = "10px system-ui, sans-serif";
    ctx.fillText("(= π·r²·h)", zx, gefaessBoden + 32);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    // --- rechtes Messglas mit cm³-Skala ---
    const mx = 282, mHalb = 34;
    // Messglas-Mantel (immer voll hoch gezeichnet, oben offen)
    rRect(mx - mHalb, gefaessOben, 2 * mHalb, gefaessHoehe, 4);
    ctx.fillStyle = F.cFlaeche; ctx.fill(); ctx.strokeStyle = F.cText; ctx.lineWidth = 2; ctx.stroke();
    // Skala-Striche am Messglas (alle 5 cm³ klein, alle 50 beschriftet)
    ctx.strokeStyle = F.cLeise; ctx.fillStyle = F.cText;
    ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "left";
    for (let v = 0; v <= vSkalaMax; v += 5) {
      const y = gefaessBoden - fuellHoehe(v);
      const gross = v % 50 === 0;
      ctx.lineWidth = gross ? 1.4 : 1;
      ctx.beginPath(); ctx.moveTo(mx + mHalb, y); ctx.lineTo(mx + mHalb + (gross ? 9 : 5), y); ctx.stroke();
      if (gross) ctx.fillText(String(v), mx + mHalb + 12, y + 3);
    }
    ctx.font = "10px system-ui, sans-serif"; ctx.fillStyle = F.cLeise; ctx.textAlign = "left";
    ctx.fillText("cm³", mx + mHalb + 12, gefaessOben - 6);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    if (gegossen) {
      // Sandfüllung bis V_Kegel
      const fk = fuellHoehe(vk);
      ctx.fillStyle = F.cAkzent; ctx.globalAlpha = 0.45;
      ctx.fillRect(mx - mHalb + 2, gefaessBoden - fk, 2 * mHalb - 4, fk - 1);
      ctx.globalAlpha = 1;
      // Füllstandslinie (Ablesemarke)
      ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(mx - mHalb, gefaessBoden - fk); ctx.lineTo(mx + mHalb, gefaessBoden - fk); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = F.cAkzent; ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("ablesen!", mx, gefaessBoden - fk - 8);
      ctx.fillStyle = F.cText; ctx.font = "12px system-ui, sans-serif";
      ctx.fillText("Messglas", mx, gefaessBoden + 18);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    } else {
      // leeres Messglas + Kegel daneben (noch nicht gegossen)
      ctx.fillStyle = F.cText; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Messglas (leer)", mx, gefaessBoden + 18);
      // kleiner Kegel oben rechts als „Werkzeug"
      maleKegel(mx, gefaessOben - 16, 18, 30, F);
      ctx.fillStyle = F.cLeise; ctx.font = "10px system-ui, sans-serif";
      ctx.fillText("Kegel füllen", mx, gefaessOben - 50);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    }
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
    const p = zustand.gewaehlt;
    if (!p) { zeichneRegal(F); return; }
    zeichneMessen(p, F);
  }

  // ---------- Interaktion ----------
  canvas.addEventListener("click", ev => {
    if (zustand.gewaehlt) return;
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) * canvas.width / r.width;
    const y = (ev.clientY - r.top) * canvas.height / r.height;
    const i = SLOTS.findIndex(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (i >= 0) waehlePaar(PAARE[i]);
  });

  function waehlePaar(p) {
    if (zustand.phase !== "messen") wechslePhase("messen");
    if (fertig(p.id)) {
      zustand.meldung = "Das " + p.name + " steht schon mit ✓ in der Tabelle — wähle ein anderes Paar.";
      panelMessen(); return;
    }
    zustand.gewaehlt = p; zustand.schritt = ""; zustand.vzNotiert = NaN; zustand.meldung = "";
    zeichne(); panelMessen();
  }

  function melde(text) {
    zustand.meldung = text;
    const el = panel.querySelector("#exp-meldung");
    if (el) el.textContent = text;
  }

  // ---------- Panels ----------
  function panelAufbau() {
    panel.innerHTML =
      '<h2>Aufbau und Geräte</h2>' +
      '<p>Auf dem Tisch stehen <strong>vier Körperpaare</strong>. In jedem Paar haben <strong>Kegel und Zylinder dieselbe Grundfläche und dieselbe Höhe</strong> — nur die Form ist anders. Dazu Sand (oder Reis) und ein <strong>Messglas mit cm³-Skala</strong>. Auf jedem Zylinder ist sein Füllvolumen <strong>V_Zyl = π·r²·h</strong> aufgedruckt.</p>' +
      '<p><strong>Dein Plan für jedes Paar:</strong></p>' +
      '<ol>' +
      '<li><strong>V_Zyl</strong> am Zylinder ablesen (steht an der Füllmarke),</li>' +
      '<li>den <strong>Kegel randvoll mit Sand</strong> füllen und ins Messglas gießen,</li>' +
      '<li>das umgefüllte Volumen <strong>V_Kegel</strong> am Messglas ablesen.</li>' +
      '</ol>' +
      '<p class="exp-hinweis"><strong>Sag voraus, bevor du gießt:</strong> Wie oft musst du den Kegel ins Messglas leeren, bis dieselbe Höhe wie im Zylinder erreicht ist — zweimal, dreimal oder viermal? Welcher Bruchteil von V_Zyl ist also eine Kegelfüllung? Schreib deine Vermutung auf und prüfe sie an der Tabelle.</p>' +
      '<p>Miss alle <strong>' + MINDEST_PAARE + ' Paare</strong> — verschiedene Größen machen das Muster überzeugend.</p>' +
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>';
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const p = zustand.gewaehlt;
    const fertigZahl = zustand.messungen.length;
    let oben = "";
    if (!p) {
      oben =
        '<p>Wähle dein nächstes Körperpaar — klicke es im Bild an (oder hier):</p>' +
        '<div class="exp-masseknoepfe" aria-label="Paar wählen">' +
        PAARE.map(x => '<button class="knopf zweitrangig" data-paar="' + x.id + '" ' + (fertig(x.id) ? "disabled" : "") + '>' + esc(x.kurz) + (fertig(x.id) ? " ✓" : "") + '</button>').join("") +
        '</div>';
    } else if (zustand.schritt === "") {
      oben =
        '<p><strong>Schritt 1 — Zylindervolumen:</strong> Lies am <strong>linken Zylinder</strong> ab, bis zu welcher cm³-Marke er gefüllt ist. Das ist <strong>V_Zyl = π·r²·h</strong>. Die kleinen Striche stehen für je 5 cm³, die beschrifteten für 50 cm³.</p>' +
        '<form id="exp-vz" class="exp-ablesen">' +
        '<label for="exp-wert-vz">V_Zyl =</label>' +
        '<input id="exp-wert-vz" inputmode="decimal" autocomplete="off" size="6"> cm³' +
        '<button class="knopf">Notieren</button>' +
        '</form>';
    } else {
      oben =
        '<p>✓ V_Zyl = <strong>' + komma(zustand.vzNotiert, 0) + ' cm³</strong> notiert.</p>' +
        '<p><strong>Schritt 2 — Kegelvolumen:</strong> Eine <strong>Kegelfüllung Sand</strong> ist ins Messglas gerieselt. Lies am <strong>rechten Messglas</strong> ab, bei welcher cm³-Marke der Sand steht — auf Augenhöhe, an der gestrichelten Linie.</p>' +
        '<form id="exp-vk" class="exp-ablesen">' +
        '<label for="exp-wert-vk">V_Kegel =</label>' +
        '<input id="exp-wert-vk" inputmode="decimal" autocomplete="off" size="6"> cm³' +
        '<button class="knopf">Notieren</button>' +
        '</form>';
    }
    panel.innerHTML =
      '<h2>Durchführung</h2>' +
      oben +
      (p ? '<p><button class="knopf zweitrangig" id="exp-abbruch">Paar zurückstellen</button></p>' : "") +
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + esc(zustand.meldung) + '</p>' +
      '<h3>Messtabelle</h3>' +
      '<table class="exp-tabelle">' +
      '<thead><tr><th>Paar</th><th>V_Zyl in cm³</th><th>V_Kegel in cm³</th><th>V_Kegel ÷ V_Zyl</th></tr></thead>' +
      '<tbody>' + (zustand.messungen.map(z => '<tr><td>' + esc(z.kurz) + '</td><td>' + komma(z.vz, 0) + '</td><td>' + komma(z.vk, 0) + '</td><td><strong>' + komma(z.verh, 2) + '</strong></td></tr>').join("") || '<tr><td colspan="4">noch leer</td></tr>') + '</tbody>' +
      '</table>' +
      '<p>' + fertigZahl + ' von ' + MINDEST_PAARE + ' Paaren gemessen.' + (fertigZahl >= MINDEST_PAARE ? " Stark — alle vier sind drin!" : "") + '</p>' +
      '<button class="knopf" id="exp-weiter2" ' + (fertigZahl >= MINDEST_PAARE ? "" : "disabled") + '>Zur Auswertung</button>';

    panel.querySelectorAll("[data-paar]").forEach(b =>
      b.addEventListener("click", () => waehlePaar(PAARE.find(x => x.id === b.dataset.paar))));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-abbruch")?.addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.vzNotiert = NaN; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-vz")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-vz").value);
      if (!ablesungOk(eingabe, lieseZylinderVolumen(p), TOL_VOLUMEN)) {
        melde("✗ Schau noch einmal auf die Füllmarke des linken Zylinders. Die beschrifteten Striche sind 50er-Schritte, dazwischen je 5 cm³.");
        return;
      }
      zustand.vzNotiert = eingabe; zustand.schritt = "gegossen"; zustand.meldung = "Jetzt rieselt eine Kegelfüllung ins Messglas …";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-vk")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-vk").value);
      if (!ablesungOk(eingabe, lieseKegelVolumen(p), TOL_VOLUMEN)) {
        melde("✗ Lies am rechten Messglas an der gestrichelten Linie ab. Kleine Striche sind 5 cm³, beschriftete 50 cm³. Du bist nah dran!");
        return;
      }
      const verh = verhaeltnis(eingabe, zustand.vzNotiert);
      zustand.messungen.push({ id: p.id, name: p.name, kurz: p.kurz, r: p.r, h: p.h, vz: zustand.vzNotiert, vk: eingabe, verh });
      zustand.meldung = "✓ " + p.name + ": V_Kegel ÷ V_Zyl = " + komma(eingabe, 0) + " ÷ " + komma(zustand.vzNotiert, 0) + " ≈ " + komma(verh, 2) + ". Erkennst du den Bruchteil?";
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.vzNotiert = NaN;
      zeichne(); panelMessen();
    });
  }

  function panelAuswerten() {
    const zeilen = zustand.messungen;
    if (zeilen.length < MINDEST_PAARE) {
      panel.innerHTML = '<h2>Auswertung</h2><p>Noch zu wenige Paare! Geh zu „2 · Durchführung" und miss zuerst alle ' + MINDEST_PAARE + ' Körperpaare.</p>';
      return;
    }
    const verhMittel = mittel(zeilen.map(z => z.verh));
    const sortiert = zeilen.slice().sort((a, b) => a.vz - b.vz);
    const punkte = sortiert.map(z => ({ x: z.vz, y: z.vk }));
    const m = steigungUrsprung(punkte);
    const frei = regression(punkte);

    const teil1 =
      '<h3>1 · Ein Muster in der Tabelle</h3>' +
      '<p>Deine Verhältnisse V_Kegel ÷ V_Zyl: ' + zeilen.map(z => '<strong>' + komma(z.verh, 2) + '</strong>').join(" · ") + '<br>' +
      'Mittelwert: <strong>' + komma(verhMittel, 2) + '</strong> — egal ob schmal, breit oder hoch, es kommt fast immer dasselbe heraus!</p>' +
      (zustand.drittelOk ?
        '<p class="exp-hinweis">✓ Das ist <strong>ein Drittel</strong> (⅓ ≈ 0,33): Der Kegel fasst genau ein Drittel des Zylinders mit gleicher Grundfläche und Höhe — <strong>drei Kegelfüllungen</strong> füllen den Zylinder randvoll.</p>'
        :
        '<form id="exp-drittel" class="exp-ablesen">' +
        '<label for="exp-wert-drittel">Welcher Bruchteil von V_Zyl ist eine Kegelfüllung?</label>' +
        '<input id="exp-wert-drittel" autocomplete="off" size="7"> (Bruch oder Dezimalzahl)' +
        '<button class="knopf">Prüfen</button>' +
        '</form>');

    const teil2 = !zustand.drittelOk ? "" :
      '<h3>2 · Alle Punkte auf einer Geraden</h3>' +
      '<p>Trag jedes Paar als Punkt auf: nach rechts das <strong>Zylindervolumen</strong>, nach oben das <strong>Kegelvolumen</strong>. Die gestrichelte Gerade ist die <strong>Regressionsgerade durch den Ursprung</strong> — sie passt am besten zu allen Punkten. (Dass sie durch null läuft, ist klar: kein Zylindervolumen → kein Kegelvolumen.)</p>' +
      '<canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Diagramm: Kegelvolumen über Zylindervolumen. Alle vier Messpunkte liegen auf einer Ursprungsgeraden; ein gestricheltes Steigungsdreieck zeigt Delta V_Zyl und Delta V_Kegel."></canvas>' +
      (zustand.steigungOk ?
        '<p>✓ Steigung m ≈ <strong>' + komma(m, 2) + '</strong> — wieder ein Drittel! Lässt man die Gerade frei (nicht durch null gezwungen), liefert die Regression als Achsenabschnitt b ≈ ' + komma(frei.b, 1) + ' cm³: praktisch null. Die Gerade <em>will</em> durch den Ursprung.</p>' +
        '<p class="exp-hinweis"><strong>Kernsatz:</strong> Bei gleicher Grundfläche und Höhe gilt immer <strong>V_Kegel = ⅓ · V_Zyl = ⅓ · π · r² · h</strong> — unabhängig davon, wie schmal oder breit das Paar ist.</p>'
        :
        '<p>Bestimme die Steigung der Geraden: <strong>Steigung = ΔV_Kegel ÷ ΔV_Zyl</strong>. Nimm das gestrichelte Steigungsdreieck im Diagramm zu Hilfe.</p>' +
        '<details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>' +
        '<p><strong>Teilschritt 1 – Dreieck ablesen:</strong> Im Diagramm ist ein gestricheltes <strong>Steigungsdreieck</strong> eingezeichnet. Die waagerechte Seite ist ΔV_Zyl (eine Strecke nach rechts, in cm³), die senkrechte Seite ist ΔV_Kegel (das Stück nach oben, in cm³). Beide Werte stehen am Dreieck.</p>' +
        '<p><strong>Teilschritt 2 – teilen:</strong> Rechne Steigung = ΔV_Kegel ÷ ΔV_Zyl. Beispiel mit erfundenen Zahlen: Wäre ΔV_Zyl = 300 cm³ und ΔV_Kegel = 100 cm³, ergäbe das 100 ÷ 300 ≈ 0,33. Setz deine echten Dreieckswerte ein.</p>' +
        '</details>' +
        '<form id="exp-m" class="exp-ablesen">' +
        '<label for="exp-wert-m">Steigung =</label>' +
        '<input id="exp-wert-m" inputmode="decimal" autocomplete="off" size="6">' +
        '<button class="knopf">Prüfen</button>' +
        '<button class="knopf zweitrangig" type="button" id="exp-m-zeigen">Steigung anzeigen</button>' +
        '</form>' +
        (zustand.steigungGezeigt ? '<p>Die Regression rechnet: m ≈ <strong>' + komma(m, 3) + '</strong>. Tippe den Wert oben ein (ein Drittel ≈ 0,33).</p>' : ""));

    const beispiel = sortiert[sortiert.length - 1]; // das größte Paar als Anwendungsaufgabe
    const teil3 = !zustand.steigungOk ? "" :
      '<h3>3 · Die Formel anwenden</h3>' +
      '<p>Mit der Formel kannst du das Kegelvolumen <strong>ausrechnen, ohne zu gießen</strong>. Probier es an einem Kegel mit <strong>r = 5 cm</strong> und <strong>h = 6 cm</strong> (nimm π ≈ 3,14):</p>' +
      '<form id="exp-anw" class="exp-ablesen">' +
      '<label for="exp-wert-anw">V_Kegel = ⅓·π·r²·h ≈</label>' +
      '<input id="exp-wert-anw" inputmode="decimal" autocomplete="off" size="7"> cm³' +
      '<button class="knopf">Prüfen</button>' +
      '</form>' +
      (zustand.formelOk ?
        '<p class="exp-hinweis">✓ Richtig: ⅓ · 3,14 · 5² · 6 = ⅓ · 3,14 · 25 · 6 = ⅓ · 471 = <strong>157 cm³</strong> (mit π genauer ' + komma(vorhersageKegel(5, 6), 1) + ' cm³). Du hast die Formel selbst aus deinen Messwerten gewonnen.</p>'
        : "");

    const abschluss = !zustand.formelOk ? "" :
      '<p><strong>Experiment komplett!</strong> Du hast das Kegelvolumen nicht nachgeschlagen, sondern selbst vermessen: V_Kegel ≈ ⅓ · V_Zyl. Speichere deine Messwerte als CSV — und baue zu Hause aus Pappe ein eigenes Paar zum Nachgießen.</p>';

    panel.innerHTML =
      '<h2>Auswertung</h2>' +
      teil1 + teil2 + teil3 + abschluss +
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — warum nie haargenau ⅓?</summary>' +
      '<p><strong>Füllen des Kegels:</strong> Ist der Kegel nicht ganz randvoll oder rieselt Sand daneben, wird V_Kegel zu klein — das Verhältnis wandert unter ⅓. Sorgfältig abstreichen hilft.</p>' +
      '<p><strong>Ablesen am Messglas:</strong> Sand bildet keine glatte Oberfläche wie Wasser; lies an der mittleren Höhe ab. Schräge Augenhöhe (Parallaxe) verfälscht den Wert zusätzlich.</p>' +
      '<p><strong>Material:</strong> Sand setzt sich beim Klopfen, Wasser haftet an der Wand. Beides verschiebt die Ablesung um ein paar cm³.</p>' +
      '<p><strong>Trotzdem klar erkennbar:</strong> Über alle Paare hinweg liegt das Verhältnis dicht bei ⅓ — das Muster ist robust, egal wie groß das Paar ist.</p>' +
      '</details>' +
      '<div class="exp-knopfzeile">' +
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>' +
      '<button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV speichern</button>' +
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>' +
      '</div>';

    panel.querySelector("#exp-drittel")?.addEventListener("submit", ev => {
      ev.preventDefault();
      if (drittelOk(panel.querySelector("#exp-wert-drittel").value)) {
        zustand.drittelOk = true; panelAuswerten();
      } else {
        melde("✗ Noch nicht. Tipp: 0,33 ist ungefähr welcher einfache Bruch? Und wie oft passt das in 1 (= das ganze Zylindervolumen)? (Als 1/3, ⅓ oder 0,33.)");
      }
    });
    panel.querySelector("#exp-m")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-wert-m").value);
      if (ablesungOk(e, m, TOL_DRITTEL)) {
        zustand.steigungOk = true; panelAuswerten();
      } else {
        melde("✗ Steigung = ΔV_Kegel ÷ ΔV_Zyl. Lies beide Werte am gestrichelten Dreieck ab und teile — das Ergebnis liegt nahe 0,33 (= ⅓).");
      }
    });
    panel.querySelector("#exp-m-zeigen")?.addEventListener("click", () => {
      zustand.steigungGezeigt = true; panelAuswerten();
    });
    panel.querySelector("#exp-anw")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-wert-anw").value);
      // 157 (mit 3,14) bzw. 157,08 (mit π) — Toleranz fängt beide
      if (ablesungOk(e, 157, 2.5)) {
        zustand.formelOk = true; panelAuswerten();
      } else {
        melde("✗ Rechne Schritt für Schritt: r² = 25, dann · 3,14 = 78,5, dann · h = 6 ergibt 471, davon ein Drittel. (cm³)");
      }
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("kegel-volumen-messwerte.csv",
        ["Paar", "r in cm", "h in cm", "V_Zyl in cm3", "V_Kegel in cm3", "V_Kegel/V_Zyl"],
        sortiert.map(z => [z.name, z.r, z.h, z.vz, z.vk, z.verh]));
    });
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.vzNotiert = NaN;
      zustand.messungen = []; zustand.meldung = "";
      zustand.drittelOk = false; zustand.steigungOk = false;
      zustand.steigungGezeigt = false; zustand.formelOk = false;
      zeichne(); wechslePhase("aufbau");
    });
    if (zustand.drittelOk) zeichneDiagramm(m, punkte);
  }

  // Diagramm: Messpunkte (V_Zyl, V_Kegel), Ursprungsgerade, Steigungsdreieck
  function zeichneDiagramm(m, punkte) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !punkte.length) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise", "#767676"), cAkzent = farbe("--akzent", "#1762a8");
    const W = dia.width, H = dia.height, L = 58, U = H - 42;
    const xMax = Math.max(...punkte.map(p => p.x)) * 1.12;
    const yMax = Math.max(...punkte.map(p => p.y)) * 1.18;
    const X = x => L + x / xMax * (W - L - 16);
    const Y = y => U - y / yMax * (U - 18);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, 10); c.lineTo(L, U); c.lineTo(W - 8, U); c.stroke();
    c.fillStyle = cText; c.textAlign = "start";
    c.fillText("V_Kegel in cm³", 8, 20);
    c.fillText("V_Zyl in cm³", W - 96, U + 32);
    c.fillText("0", L - 16, U + 14);
    if (Number.isFinite(m)) {
      const xEnd = Math.min(xMax, yMax / m);
      c.strokeStyle = cLeise; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(xEnd), Y(m * xEnd)); c.stroke();
      // Steigungsdreieck über ΔV_Zyl = ein „runder" Anteil von xMax
      const dx = Math.round((xMax * 0.5) / 50) * 50 || 100;
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(dx), Y(0)); c.lineTo(X(dx), Y(m * dx)); c.stroke();
      c.setLineDash([]);
      c.fillStyle = cLeise; c.textAlign = "center";
      c.fillText("ΔV_Zyl = " + dx, X(dx / 2), U - 6);
      c.textAlign = "start";
      c.fillText("ΔV_Kegel ≈ " + komma(m * dx, 0), X(dx) + 8, (Y(m * dx) + U) / 2);
    }
    for (const p of punkte) {
      c.fillStyle = cAkzent; c.beginPath(); c.arc(X(p.x), Y(p.y), 5, 0, 7); c.fill();
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

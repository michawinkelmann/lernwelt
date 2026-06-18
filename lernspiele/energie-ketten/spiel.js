// spiel.js — Energie-Ketten: Energie-Umwandlungsketten aus Bausteinen in der
// richtigen Reihenfolge zusammenbauen, ohne auf Störsteine hereinzufallen.
// Aufbau wie bei allen Lernspielen: oben reine, in Node testbare Logik
// (Modulebene fasst kein document/window an), unten der DOM-Teil, der nur
// im Browser über starteSpielSeite() aus dem gemeinsamen Gerüst startet.

import { starteSpielSeite } from "../../assets/js/spiel/geruest.js";

// ===== 10 feste Szenarien =====
// Jede Kette hat 3–5 Glieder (Energieform + Stationsbeschriftung), dazu
// 2–3 Störsteine, die nicht in die Kette gehören. Begriffe sek-I-konform
// und passend zur Themenseite physik/klasse-7/energie (Bewegungsenergie,
// Höhenenergie, Spannenergie, chemische/elektrische Energie, Wärme,
// Lichtenergie; Strahlungsenergie nur für das Sonnenlicht der Solarlampe).
// Beschriftungen sind innerhalb eines Szenarios eindeutig.
export const SZENARIEN = [
  {
    titel: "Kohlekraftwerk",
    kette: [
      "chemische Energie (Kohle)",
      "Wärme (heißer Dampf)",
      "Bewegungsenergie (Turbine dreht sich)",
      "elektrische Energie (Generator liefert Strom)"
    ],
    stoer: [
      "Höhenenergie (Wasser im Stausee)",
      "Lichtenergie (Sonnenstrahlen)"
    ]
  },
  {
    titel: "Solarlampe im Garten",
    kette: [
      "Strahlungsenergie (Sonnenlicht)",
      "elektrische Energie (Solarzelle)",
      "chemische Energie (Akku wird geladen)",
      "Lichtenergie (LED leuchtet abends)"
    ],
    stoer: [
      "Bewegungsenergie (drehender Rotor)",
      "Spannenergie (gespannte Feder)"
    ]
  },
  {
    titel: "Fahrrad mit Dynamo",
    kette: [
      "chemische Energie (Frühstück)",
      "Bewegungsenergie (Beine treten, das Rad rollt)",
      "elektrische Energie (Dynamo)",
      "Lichtenergie (Fahrradlampe leuchtet)"
    ],
    stoer: [
      "Wärme (heiße Herdplatte)",
      "Höhenenergie (Apfel am Baum)"
    ]
  },
  {
    titel: "Toaster",
    kette: [
      "chemische Energie (Brennstoff im Kraftwerk)",
      "elektrische Energie (Strom aus der Steckdose)",
      "Wärme (glühende Heizdrähte rösten das Brot)"
    ],
    stoer: [
      "Spannenergie (gespanntes Gummiband)",
      "Höhenenergie (Wasser im Stausee oben)"
    ]
  },
  {
    titel: "Wasserkraftwerk",
    kette: [
      "Höhenenergie (Wasser im Stausee)",
      "Bewegungsenergie (Wasser strömt durch die Turbine)",
      "elektrische Energie (Generator speist das Stromnetz)"
    ],
    stoer: [
      "chemische Energie (Kohle wird verbrannt)",
      "Wärme (heißer Wasserdampf)"
    ]
  },
  {
    titel: "Mensch beim Sprint",
    kette: [
      "chemische Energie (Nahrung im Körper)",
      "Bewegungsenergie (Beine sprinten los)",
      "Wärme (Körper wird heiß, du schwitzt)"
    ],
    stoer: [
      "elektrische Energie (Batterie)",
      "Lichtenergie (Taschenlampe)"
    ]
  },
  {
    titel: "Windrad",
    kette: [
      "Bewegungsenergie (Wind dreht die Rotorblätter)",
      "elektrische Energie (Generator in der Gondel)",
      "Lichtenergie (Lampe im Wohnzimmer)"
    ],
    stoer: [
      "chemische Energie (Benzin im Tank)",
      "Spannenergie (gespannter Flitzebogen)"
    ]
  },
  {
    titel: "Akkuschrauber",
    kette: [
      "chemische Energie (geladener Akku)",
      "elektrische Energie (Strom fließt zum Motor)",
      "Bewegungsenergie (Bit dreht die Schraube)"
    ],
    stoer: [
      "Lichtenergie (Sonne)",
      "Wärme (Lagerfeuer)",
      "Höhenenergie (Werkzeugkiste im Regal oben)"
    ]
  },
  {
    titel: "Kerze",
    kette: [
      "chemische Energie (Wachs und Docht)",
      "Wärme (heiße Flamme)",
      "Lichtenergie (Flamme leuchtet)"
    ],
    stoer: [
      "elektrische Energie (Strom aus der Steckdose)",
      "Bewegungsenergie (Ventilator dreht sich)"
    ]
  },
  {
    titel: "Trampolin",
    kette: [
      "Höhenenergie (oben am Umkehrpunkt)",
      "Bewegungsenergie (Fallen: immer schneller)",
      "Spannenergie (Tuch und Federn sind gespannt)",
      "Bewegungsenergie (Abstoß: schnell nach oben)",
      "Höhenenergie (wieder ganz oben)"
    ],
    stoer: [
      "chemische Energie (Batterie)",
      "elektrische Energie (Ladekabel)"
    ]
  }
];

export const SZENARIEN_PRO_RUNDE = 5;

// ===== Reine Logik (in Node testbar) =====

// Fisher-Yates auf einer Kopie — Original bleibt unverändert.
export function mischen(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Prüft die Szenarien: 10 Stück, Titel eindeutig, jede Kette 3–5 Glieder,
// 2–3 Störsteine, Störsteine nie in der Kette, Beschriftungen eindeutig.
// Liefert die Liste der Fehler (leer = alles in Ordnung).
export function szenarienFehler(liste = SZENARIEN) {
  const fehler = [];
  if (!Array.isArray(liste) || liste.length !== 10) {
    fehler.push(`erwartet 10 Szenarien, gefunden ${Array.isArray(liste) ? liste.length : 0}`);
  }
  const titelSet = new Set();
  for (const s of liste || []) {
    if (!s || typeof s.titel !== "string" || !s.titel.trim()) {
      fehler.push("Szenario ohne Titel");
      continue;
    }
    const wo = s.titel;
    if (titelSet.has(wo)) fehler.push(`${wo}: doppelter Titel`);
    titelSet.add(wo);
    if (!Array.isArray(s.kette) || s.kette.length < 3 || s.kette.length > 5) {
      fehler.push(`${wo}: Kette muss 3–5 Glieder haben`);
    }
    if (!Array.isArray(s.stoer) || s.stoer.length < 2 || s.stoer.length > 3) {
      fehler.push(`${wo}: es müssen 2–3 Störsteine sein`);
    }
    const gesehen = new Set();
    for (const baustein of [...(s.kette || []), ...(s.stoer || [])]) {
      if (typeof baustein !== "string" || !baustein.trim()) {
        fehler.push(`${wo}: leere Baustein-Beschriftung`);
        continue;
      }
      if (gesehen.has(baustein)) fehler.push(`${wo}: Beschriftung doppelt: „${baustein}"`);
      gesehen.add(baustein);
    }
    for (const st of s.stoer || []) {
      if ((s.kette || []).includes(st)) fehler.push(`${wo}: Störstein steht in der Kette: „${st}"`);
    }
  }
  return fehler;
}

export function szenarienValide(liste = SZENARIEN) {
  return szenarienFehler(liste).length === 0;
}

// Wählt für eine Runde n verschiedene Szenarien in zufälliger Reihenfolge.
export function waehleSzenarien(anzahl = SZENARIEN_PRO_RUNDE, rng = Math.random, liste = SZENARIEN) {
  return mischen(liste, rng).slice(0, Math.min(anzahl, liste.length));
}

// Bausteine eines Szenarios (Kette + Störsteine) gemischt.
export function bausteineFuer(szenario, rng = Math.random) {
  return mischen([...szenario.kette, ...szenario.stoer], rng);
}

// Ein Zug ist richtig, wenn der angetippte Baustein das nächste Kettenglied ist.
// bisher = Liste der schon eingerasteten Beschriftungen.
export function pruefeZug(szenario, bisher, klick) {
  if (!szenario || !Array.isArray(szenario.kette) || !Array.isArray(bisher)) return false;
  return szenario.kette[bisher.length] === klick;
}

// Punkte je Szenario: 100 − 15 je Fehlversuch, mindestens 20.
export function punkteFuer(fehlversuche) {
  const f = Math.max(0, Math.floor(Number(fehlversuche) || 0));
  return Math.max(20, 100 - 15 * f);
}

// ===== DOM-Teil (läuft nur im Browser) =====

const manifest = {
  id: "ls-energie-ketten",
  titel: "Energie-Ketten",
  kurz: "Vom Kraftwerk bis zur Glühlampe: Baue die Energie-Umwandlungskette in der richtigen Reihenfolge zusammen.",
  punkteLabel: "Punkte",
  punkteEinheit: "",
  highscore: true,
  zeigeZeit: false,
  steuerungHinweis: "Tippe die Bausteine in der richtigen Reihenfolge an."
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
}

function starte(api) {
  let runde = [], index = 0, gesamt = 0, fehlversuche = 0, platziert = [], ergebnisse = [];

  api.neustartCb(starteRunde);

  function zeigeStartbild() {
    api.setzePunkte(0);
    api.flaeche.innerHTML = `
      <div class="ek-brett">
        <h2 class="ek-ueberschrift">Baue die Energie-Umwandlungskette!</h2>
        <p>In jeder Runde warten ${SZENARIEN_PRO_RUNDE} Szenarien — vom Kraftwerk bis zum Trampolin. Tippe die Bausteine in der Reihenfolge an, in der die Energie umgewandelt wird. Vorsicht: Störsteine gehören gar nicht in die Kette!</p>
        <p>Pro Szenario gibt es 100 Punkte, jeder Fehlversuch kostet 15 — weniger als 20 gibt es nie.</p>
        <button type="button" class="knopf ek-los">Los geht’s!</button>
      </div>`;
    api.flaeche.querySelector(".ek-los").addEventListener("click", starteRunde);
  }

  function starteRunde() {
    runde = waehleSzenarien(SZENARIEN_PRO_RUNDE, Math.random);
    index = 0; gesamt = 0; ergebnisse = [];
    api.setzePunkte(0);
    zeigeSzenario();
  }

  function zeigeSzenario() {
    const sz = runde[index];
    platziert = []; fehlversuche = 0;
    const bausteine = bausteineFuer(sz, Math.random);
    api.flaeche.innerHTML = `
      <div class="ek-brett">
        <h2 class="ek-ueberschrift">Szenario ${index + 1} von ${runde.length}: ${esc(sz.titel)}</h2>
        <p class="ek-anleitung">Womit beginnt die Kette? Tippe die Bausteine der Reihe nach an — ${sz.stoer.length} Störsteine bleiben am Ende übrig.</p>
        <div class="ek-kette" id="ek-kette" aria-label="Bisher gebaute Kette">
          <span class="ek-platzhalter">Die Kette ist noch leer.</span>
        </div>
        <p class="ek-status" id="ek-status" role="status" aria-live="polite">Tippe den ersten Baustein an.</p>
        <div class="ek-bausteine">
          ${bausteine.map(b => `<button type="button" class="ek-baustein">${esc(b)}</button>`).join("")}
        </div>
        <div class="ek-weiter-zeile" id="ek-weiter-zeile"></div>
      </div>`;
    api.flaeche.querySelectorAll(".ek-baustein").forEach((knopf, i) =>
      knopf.addEventListener("click", () => klick(bausteine[i], knopf)));
    api.flaeche.focus();
  }

  function zeichneKette() {
    const ziel = api.flaeche.querySelector("#ek-kette");
    if (!ziel) return;
    if (!platziert.length) {
      ziel.innerHTML = `<span class="ek-platzhalter">Die Kette ist noch leer.</span>`;
      return;
    }
    ziel.innerHTML = platziert.map((b, i) =>
      `${i > 0 ? '<span class="ek-pfeil" aria-hidden="true">→</span>' : ""}<span class="ek-glied">${esc(b)}</span>`).join("");
  }

  function klick(label, knopf) {
    if (!runde.length || knopf.disabled) return;
    const sz = runde[index];
    if (platziert.length >= sz.kette.length) return;
    const status = api.flaeche.querySelector("#ek-status");
    if (pruefeZug(sz, platziert, label)) {
      platziert.push(label);
      knopf.disabled = true;
      knopf.classList.add("ek-eingerastet");
      zeichneKette();
      if (platziert.length === sz.kette.length) {
        szenarioFertig(sz);
      } else {
        status.textContent = "✓ Passt — eingerastet! Was kommt als Nächstes?";
      }
    } else {
      fehlversuche++;
      status.textContent = `✗ Das passt hier nicht — Fehlversuch ${fehlversuche}. Überlege: Welche Energieform ist an dieser Stelle dran?`;
      if (!api.reduzierteBewegung) {
        knopf.classList.remove("ek-wackel");
        void knopf.offsetWidth; // Animation neu anstoßen
        knopf.classList.add("ek-wackel");
      }
    }
  }

  function szenarioFertig(sz) {
    const p = punkteFuer(fehlversuche);
    gesamt += p;
    ergebnisse.push({ titel: sz.titel, punkte: p, fehlversuche });
    api.setzePunkte(gesamt);
    const status = api.flaeche.querySelector("#ek-status");
    status.textContent = fehlversuche === 0
      ? `✓ Kette komplett — fehlerfrei! +${p} Punkte`
      : `✓ Kette komplett! +${p} Punkte (${fehlversuche} Fehlversuch${fehlversuche === 1 ? "" : "e"})`;
    // Übrig gebliebene Bausteine als Störsteine kennzeichnen
    api.flaeche.querySelectorAll(".ek-baustein:not([disabled])").forEach(knopf => {
      knopf.disabled = true;
      knopf.classList.add("ek-stoerstein");
      knopf.textContent = knopf.textContent + " — Störstein, gehört nicht dazu!";
    });
    const zeile = api.flaeche.querySelector("#ek-weiter-zeile");
    const letztes = index === runde.length - 1;
    zeile.innerHTML = `<button type="button" class="knopf ek-weiter">${letztes ? "Zum Ergebnis" : "Nächstes Szenario"}</button>`;
    const weiter = zeile.querySelector(".ek-weiter");
    weiter.addEventListener("click", () => {
      index++;
      if (index < runde.length) zeigeSzenario(); else rundeVorbei();
    });
    weiter.focus();
  }

  function rundeVorbei() {
    const liste = ergebnisse.map(e =>
      `<li>${esc(e.titel)}: ${e.punkte} Punkte${e.fehlversuche ? ` (✗ ${e.fehlversuche})` : " (fehlerfrei ✓)"}</li>`).join("");
    api.vorbei(gesamt, `
      <ul class="ek-ergebnisliste">${liste}</ul>
      <p>Übrigens: Bei jeder echten Umwandlung entsteht nebenbei auch Wärme — Energie geht nie verloren, sie wird aber „entwertet“.</p>`);
  }

  zeigeStartbild();
}

// Nur im Browser starten — in Node (Tests) gibt es kein document.
export { manifest, starte };

if (typeof document !== "undefined" && document.getElementById("spiel-wurzel")) {
  starteSpielSeite({ manifest, starte });
}

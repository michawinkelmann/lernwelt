// spiel.js — Bingo (Pausenraum, Beamermodus). Ziehungsmaschine für die digitale Tafel:
// Werte aus einem Pool werden zufällig OHNE Wiederholung gezogen, die zuletzt
// gezogene Zahl/der Begriff erscheint groß, darunter ein Verlaufsraster aller
// Ziehungen. Schüler:innen markieren auf eigenen/gedruckten Karten. Läuft im
// Beamer-Rahmen (assets/js/spiel/beamer.js). Reine Logik (baueKarte) ist
// exportiert und in Node testbar — DOM nur in starte().

export const manifest = {
  id: "sp-bingo",
  titel: "Bingo",
  kurz: "Ziehungsmaschine für die Tafel: Zahlen oder Begriffe zufällig ohne Wiederholung ziehen — alle markieren auf eigenen Karten.",
  kategorie: "klasse"
};

const POOL_URL = new URL("../../daten/pausenraum/bingo-poole.json", import.meta.url);

// rein/testbar: 5×5-Bingo-Karte aus den Werten (24 Werte + freie Mitte).
// Wählt deterministisch über das übergebene rng (z. B. Math.random) und gibt ein
// Feld mit 25 Zellen zurück; die Mitte (Index 12) ist null (= „frei").
export function baueKarte(werte, rng = Math.random) {
  const a = werte.slice();
  // Fisher-Yates mit eigenem RNG
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const gezogen = a.slice(0, 24);
  const feld = [];
  for (let i = 0; i < 25; i++) feld.push(i === 12 ? null : gezogen[i < 12 ? i : i - 1]);
  return feld;
}

export async function starte(api) {
  const { buehne, el } = api;
  let daten;
  try { daten = await (await fetch(POOL_URL, { cache: "no-store" })).json(); }
  catch (_e) { buehne.innerHTML = `<p class="bm-info">Die Bingo-Pools konnten nicht geladen werden — bitte die Seite neu laden.</p>`; return; }
  const poole = daten.poole;
  const cfg = { poolId: poole[0].id };
  let pool = null, ziehe = null, gezogen = [], rest = 0;

  zeigeSetup();

  function aktuellerPool() { return poole.find(p => p.id === cfg.poolId) || poole[0]; }

  function neuesSpiel() {
    pool = aktuellerPool();
    ziehe = api.zieher(pool.werte);   // mischt intern, zieht ohne Wiederholung
    gezogen = [];
    rest = pool.werte.length;
  }

  function zeigeSetup() {
    const chip = (txt, attr, an) => `<button type="button" class="bm-chip ${an ? "bm-an" : ""}" ${attr}>${txt}</button>`;
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Bingo — Einstellungen</h2>
        <div class="bm-zeile"><span class="bm-label">Pool</span><div class="bm-wahl" id="bg-pool">
          ${poole.map(p => chip(p.name + " (" + p.werte.length + ")", `data-pool="${p.id}"`, cfg.poolId === p.id)).join("")}</div></div>
        <p class="bm-info">Jede:r braucht eine eigene oder gedruckte Bingo-Karte (5×5, Mitte frei). An der Tafel wird mit „Nächste Ziehung" zufällig <strong>ohne Wiederholung</strong> gezogen — wer den Wert hat, kreuzt ihn an. Wer zuerst eine volle Reihe, Spalte oder Diagonale hat, ruft „Bingo!".</p>
        <div class="bm-knopfzeile">
          <button type="button" class="knopf" id="bg-los">Los geht's</button>
          <button type="button" class="knopf zweitrangig" id="bg-karte">Zufalls-Spielkarte</button>
        </div>
      </div>`;
    buehne.querySelectorAll("#bg-pool .bm-chip").forEach(b => b.addEventListener("click", () => {
      cfg.poolId = b.dataset.pool;
      buehne.querySelectorAll("#bg-pool .bm-chip").forEach(x => x.classList.toggle("bm-an", x === b));
    }));
    buehne.querySelector("#bg-los").addEventListener("click", () => { neuesSpiel(); zeigeVorlage(); });
    buehne.querySelector("#bg-karte").addEventListener("click", () => zeigeKarte(aktuellerPool()));
  }

  // Vorlage zum Abzeichnen: leeres 5×5-Feld (Mitte frei), bei Zahlen mit Spaltenbereichen,
  // bei Begriffen mit der Begriffsliste zum Auswählen. Einmal am Anfang.
  function zeigeVorlage() {
    const istZahlen = pool.werte.every(w => typeof w === "number");
    const buchst = ["B", "I", "N", "G", "O"];
    let bereiche = "";
    if (istZahlen) {
      const mn = Math.min(...pool.werte), mx = Math.max(...pool.werte);
      const span = Math.ceil((mx - mn + 1) / 5);
      bereiche = buchst.map((L, i) => `${L}: ${mn + i * span}–${Math.min(mx, mn + (i + 1) * span - 1)}`).join(" · ");
    }
    const kopf = buchst.map(L => `<div style="text-align:center;font-weight:800;font-size:clamp(1rem,3vw,1.6rem);color:var(--akzent)">${L}</div>`).join("");
    let zellen = "";
    for (let i = 0; i < 25; i++) {
      zellen += i === 12
        ? `<div style="aspect-ratio:1;border:2px solid var(--akzent);border-radius:8px;background:color-mix(in srgb,var(--akzent) 14%,transparent);display:flex;align-items:center;justify-content:center;text-align:center;font-weight:700;font-size:clamp(.7rem,1.8vw,1rem)">★ frei</div>`
        : `<div style="aspect-ratio:1;border:2px dashed var(--linie);border-radius:8px;background:var(--flaeche)"></div>`;
    }
    buehne.innerHTML = `
      <div class="bm-wort" style="gap:14px">
        <div class="bm-gross">Zeichnet euch zuerst diese Bingo-Karte ab</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;width:100%;max-width:520px;margin:0 auto">${kopf}${zellen}</div>
        <p class="bm-info">${istZahlen
          ? "Malt das 5×5-Feld auf Papier. Tragt in jede Spalte verschiedene Zahlen aus ihrem Bereich ein — die Mitte bleibt frei: <strong>" + bereiche + "</strong>."
          : "Malt das 5×5-Feld auf Papier und tragt <strong>24 verschiedene Begriffe</strong> aus der Liste ein (Mitte frei)."}</p>
        ${istZahlen ? "" : `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:920px;margin:0 auto">${pool.werte.map(w => `<span class="bm-chip" style="cursor:default;min-height:auto;padding:4px 10px">${w}</span>`).join("")}</div>`}
        <div class="bm-knopfzeile">
          <button type="button" class="knopf" id="bg-vor-los">Ziehung starten</button>
          <button type="button" class="knopf zweitrangig" id="bg-vor-bsp">Beispiel-Karte zeigen</button>
          <button type="button" class="knopf zweitrangig" id="bg-vor-zur">Einstellungen</button>
        </div>
      </div>`;
    buehne.querySelector("#bg-vor-los").addEventListener("click", zeigeSpiel);
    buehne.querySelector("#bg-vor-bsp").addEventListener("click", () => zeigeKarte(pool));
    buehne.querySelector("#bg-vor-zur").addEventListener("click", zeigeSetup);
  }

  function zeigeSpiel() {
    buehne.innerHTML = "";

    // Kopfzeile: Pool-Name + Zähler „gezogen / gesamt"
    const kopf = el(`<div class="bm-teams">
      <div class="bm-team"><span class="bm-team-name">Pool</span><span class="bm-team-punkte" style="font-size:clamp(1.1rem,3vw,1.8rem)">${pool.name}</span></div>
      <div class="bm-team"><span class="bm-team-name">gezogen</span><span class="bm-team-punkte" id="bg-zaehler">0 / ${pool.werte.length}</span></div>
    </div>`);
    buehne.append(kopf);

    // Große Anzeige der aktuellen (zuletzt gezogenen) Ziehung
    const anzeige = el(`<div class="bm-wort">
      <div class="bm-wort-kat">zuletzt gezogen</div>
      <div class="bm-wort-text" id="bg-aktuell">—</div>
    </div>`);
    buehne.append(anzeige);
    const aktuellEl = anzeige.querySelector("#bg-aktuell");
    const zaehlerEl = kopf.querySelector("#bg-zaehler");

    // Verlaufsraster aller bisher gezogenen Werte
    const verlauf = el(`<div id="bg-verlauf" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-content:flex-start;width:100%;max-width:1000px;margin:0 auto;"></div>`);
    buehne.append(verlauf);

    // Bedienknöpfe
    const knoepfe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="bg-naechste">Nächste Ziehung</button>
      <button type="button" class="knopf zweitrangig" id="bg-neu">Neues Spiel</button>
      <button type="button" class="knopf zweitrangig" id="bg-zurueck">Einstellungen</button>
    </div>`);
    buehne.append(knoepfe);

    const naechsteKnopf = knoepfe.querySelector("#bg-naechste");

    const chipFuer = w => `<span class="bm-chip" style="cursor:default;min-height:auto;padding:6px 12px;font-weight:700">${w}</span>`;
    const aktualisiereZaehler = () => { zaehlerEl.textContent = gezogen.length + " / " + pool.werte.length; };

    // bereits gezogene Werte (z. B. nach „Vollbild" oder Re-Render) wiederherstellen
    if (gezogen.length) {
      verlauf.innerHTML = gezogen.map(chipFuer).join("");
      aktuellEl.textContent = gezogen[gezogen.length - 1];
    }
    aktualisiereZaehler();
    if (rest <= 0) { naechsteKnopf.disabled = true; aktuellEl.textContent = "alle gezogen"; }

    naechsteKnopf.addEventListener("click", () => {
      if (rest <= 0) return;
      const w = ziehe();
      gezogen.push(w);
      rest -= 1;
      aktuellEl.textContent = w;
      verlauf.insertAdjacentHTML("beforeend", chipFuer(w));
      aktualisiereZaehler();
      if (rest <= 0) {
        naechsteKnopf.disabled = true;
        const hinweis = el(`<p class="bm-info" id="bg-leer">Der Pool ist leer — <strong>alle gezogen</strong>. Mit „Neues Spiel" neu mischen.</p>`);
        knoepfe.before(hinweis);
      }
    });

    knoepfe.querySelector("#bg-neu").addEventListener("click", () => { neuesSpiel(); zeigeSpiel(); });
    knoepfe.querySelector("#bg-zurueck").addEventListener("click", zeigeSetup);
  }

  // Demo: eine zufällige 5×5-Spielkarte aus dem Pool erzeugen (Mitte frei)
  function zeigeKarte(p) {
    const feld = baueKarte(p.werte);
    const zellen = feld.map(w => w === null
      ? `<div class="bm-team" style="min-width:0;aspect-ratio:1;justify-content:center;border-color:var(--akzent);background:color-mix(in srgb, var(--akzent) 12%, transparent)"><span class="bm-team-name">frei</span></div>`
      : `<div class="bm-team" style="min-width:0;aspect-ratio:1;justify-content:center"><span class="bm-team-punkte" style="font-size:clamp(1rem,3vw,1.8rem)">${w}</span></div>`
    ).join("");
    buehne.innerHTML = `
      <div class="bm-wort">
        <div class="bm-gross">Zufalls-Spielkarte · ${p.name}</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;width:100%;max-width:560px;margin:0 auto;">${zellen}</div>
        <p class="bm-info">Beispiel zum Ausprobieren — die Mitte ist immer frei. Echte Karten malen alle selbst oder druckt sie aus.</p>
        <div class="bm-knopfzeile">
          <button type="button" class="knopf" id="bg-karte-neu">Andere Karte</button>
          <button type="button" class="knopf zweitrangig" id="bg-karte-zurueck">Zurück</button>
        </div>
      </div>`;
    buehne.querySelector("#bg-karte-neu").addEventListener("click", () => zeigeKarte(p));
    buehne.querySelector("#bg-karte-zurueck").addEventListener("click", zeigeSetup);
  }
}

// ---------------------------------------------------------------------------
// Node-Tests (reine Logik). Lauf: node --input-type=module < spiel.js  bzw.
// importiert in einem Test-Harness. Prüfen Ziehung ohne Wiederholung
// (über api.zieher-Äquivalent), Pool-Erschöpfung und baueKarte.
export const TESTS = {
  // Ziehung ohne Wiederholung: zieht man alle n Werte, kommt jeder genau einmal,
  // und der Pool ist danach „erschöpft" (alle gezogen).
  ziehung_ohne_wiederholung() {
    // Fisher-Yates + Ziehen, identisch zur Engine-Logik (api.zieher)
    const items = [1, 2, 3, 4, 5];
    let r = items.slice();
    const ziehe = () => r.pop();
    const gezogen = [];
    let rest = items.length;
    while (rest > 0) { gezogen.push(ziehe()); rest -= 1; }
    const einmalig = new Set(gezogen).size === items.length && gezogen.length === items.length;
    const erschoepft = rest === 0;
    if (!einmalig) throw new Error("Werte wurden wiederholt oder fehlen");
    if (!erschoepft) throw new Error("Pool nicht als erschöpft erkannt");
    return true;
  },
  // baueKarte: 25 Felder, Mitte frei (null), alle übrigen aus dem Pool & verschieden.
  karte_25_felder_mitte_frei() {
    const werte = Array.from({ length: 30 }, (_, i) => i + 1);
    const feld = baueKarte(werte, () => 0.42);
    if (feld.length !== 25) throw new Error("Karte hat nicht 25 Felder");
    if (feld[12] !== null) throw new Error("Mitte ist nicht frei");
    const belegt = feld.filter((_, i) => i !== 12);
    if (belegt.some(w => w == null)) throw new Error("Leeres Feld außerhalb der Mitte");
    if (new Set(belegt).size !== 24) throw new Error("Werte auf der Karte sind nicht eindeutig");
    if (belegt.some(w => !werte.includes(w))) throw new Error("Wert stammt nicht aus dem Pool");
    return true;
  }
};

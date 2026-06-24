// einstellungen.js — Seite zum Sichern/Laden/Zurücksetzen des Lernfortschritts.
// Geräteübergreifend: Datei auf Gerät A sichern, auf Gerät B laden (Stände werden zusammengeführt).
import { exportiereFortschritt, importiereFortschritt, setzeFortschrittZurueck, holeFortschrittUebersicht } from "./fortschritt.js";

export function rendereEinstellungen() {
  const ziel = document.getElementById("einstellungen");
  if (!ziel) return;

  function uebersichtText() {
    const u = holeFortschrittUebersicht();
    if (u.leer) return "Auf diesem Gerät ist noch kein Fortschritt gespeichert.";
    const teile = [`${u.geloest} ${u.geloest === 1 ? "Aufgabe" : "Aufgaben"} gelöst`];
    if (u.versucht) teile.push(`${u.versucht} begonnen`);
    if (u.lektionen) teile.push(`${u.lektionen} ${u.lektionen === 1 ? "Lektion" : "Lektionen"} im Lernbüro`);
    if (u.regelheft) teile.push(`${u.regelheft} ${u.regelheft === 1 ? "Merksatz" : "Merksätze"} im Regelheft`);
    return "Gespeichert: " + teile.join(" · ") + ".";
  }

  ziel.innerHTML = `
    <section class="einstellung-block" aria-labelledby="ein-fortschritt">
      <h2 id="ein-fortschritt">Dein Fortschritt</h2>
      <p class="einstellung-uebersicht"></p>
      <div class="einstellung-knoepfe">
        <button type="button" class="knopf" data-aktion="export">⬇ Fortschritt sichern (Datei herunterladen)</button>
        <button type="button" class="knopf zweitrangig" data-aktion="import">⬆ Gesicherten Fortschritt laden …</button>
        <button type="button" class="knopf warnung" data-aktion="reset">Fortschritt zurücksetzen …</button>
        <input type="file" accept="application/json,.json" class="nur-screenreader" tabindex="-1" aria-hidden="true">
      </div>
      <p class="einstellung-meldung" role="status" aria-live="polite"></p>
    </section>

    <div class="merkkasten">
      <span class="merk-etikett">Über Geräte hinweg mitnehmen</span>
      <p>So nimmst du deinen Fortschritt z. B. von der Schule nach Hause mit:</p>
      <ol>
        <li>Auf dem ersten Gerät auf <strong>„Fortschritt sichern“</strong> tippen — du erhältst eine kleine Datei (<code>lernwelt-fortschritt-…json</code>).</li>
        <li>Die Datei auf das zweite Gerät bringen (z. B. per E-Mail, Cloud oder USB-Stick).</li>
        <li>Dort diese Einstellungen-Seite öffnen und <strong>„Gesicherten Fortschritt laden“</strong> wählen.</li>
      </ol>
      <p>Beide Stände werden <strong>zusammengeführt</strong> — bereits Gelöstes geht dabei nie verloren.</p>
    </div>

    <section class="einstellung-block" aria-labelledby="ein-darstellung">
      <h2 id="ein-darstellung">Darstellung</h2>
      <p>Den <strong>Dunkelmodus</strong> (☾ / ☀) und den <strong>Zweig-Filter</strong> (Alle / Gym / RS) stellst du oben rechts in der Kopfzeile ein. Auch diese Wahl wird lokal auf deinem Gerät gespeichert.</p>
    </section>`;

  const meldung = ziel.querySelector(".einstellung-meldung");
  const uebersicht = ziel.querySelector(".einstellung-uebersicht");
  const dateiwahl = ziel.querySelector('input[type="file"]');
  uebersicht.textContent = uebersichtText();

  ziel.querySelector('[data-aktion="export"]').addEventListener("click", () => {
    exportiereFortschritt();
    meldung.textContent = "Deine Fortschrittsdatei wurde heruntergeladen. Bewahre sie auf oder öffne sie auf einem anderen Gerät.";
  });
  ziel.querySelector('[data-aktion="import"]').addEventListener("click", () => dateiwahl.click());
  dateiwahl.addEventListener("change", () => {
    const datei = dateiwahl.files && dateiwahl.files[0];
    if (!datei) return;
    importiereFortschritt(datei)
      .then(anzahl => { meldung.textContent = `Import erfolgreich – ${anzahl} Einträge zusammengeführt.`; uebersicht.textContent = uebersichtText(); })
      .catch(() => { meldung.textContent = "Import fehlgeschlagen: Das war keine gültige Fortschrittsdatei."; })
      .finally(() => { dateiwahl.value = ""; });
  });
  ziel.querySelector('[data-aktion="reset"]').addEventListener("click", () => {
    const sicher = window.confirm("Wirklich den gesamten Fortschritt auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen.\n\nTipp: Sichere ihn vorher mit „Fortschritt sichern“.");
    if (!sicher) return;
    setzeFortschrittZurueck();
    uebersicht.textContent = uebersichtText();
    meldung.textContent = "Der Fortschritt auf diesem Gerät wurde zurückgesetzt.";
  });
}

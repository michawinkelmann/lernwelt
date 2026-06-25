// stufenwahl.js — gemeinsame Klassenstufen-Auswahl für die Trainingsraum-Trainer.
// Statt „Level 1/2/3" wählt man die eigene Klassenstufe; jeder Trainer liefert
// seine eigene Stufen→Konfiguration-Tabelle. Reiner DOM-Helfer (kein Modul-DOM):
// in starte() aufrufen, die Auswahl kommt per aufWahl(eintrag) zurück.
//
//   zeigeStufenwahl(ziel, {
//     titel:  "Wähle deine Klasse — 60 Sekunden Sprint:",
//     hinweis:"…",                       // optional, kleiner Zusatztext
//     stufen: [{ klasse:"Klasse 5", kurz:"Einmaleins, + und − bis 100", wert:{…} }, …],
//     aufWahl: eintrag => starteRunde(eintrag)
//   });
//
// Hinweis: kein HTML-Escaping — die Texte stammen ausschließlich aus den
// Trainer-Modulen selbst (keine Nutzereingaben), wie auch sonst in den Spielen.

export function zeigeStufenwahl(ziel, { titel, hinweis = "", stufen, aufWahl }) {
  if (!ziel || !Array.isArray(stufen) || !stufen.length) return;
  ziel.innerHTML = `
    <div class="stufenwahl">
      <p class="stufenwahl-titel">${titel}</p>
      ${hinweis ? `<p class="stufenwahl-hinweis">${hinweis}</p>` : ""}
      <div class="stufenwahl-knoepfe" role="group" aria-label="Klassenstufe wählen">
        ${stufen.map((s, i) => `
          <button type="button" class="knopf stufenwahl-knopf" data-i="${i}">
            <span class="stufenwahl-klasse">${s.klasse}</span>
            ${s.kurz ? `<span class="stufenwahl-kurz">${s.kurz}</span>` : ""}
          </button>`).join("")}
      </div>
    </div>`;
  ziel.querySelectorAll(".stufenwahl-knopf").forEach(b =>
    b.addEventListener("click", () => aufWahl(stufen[Number(b.dataset.i)])));
}

# SPIELE.md — Workflow „Pausenraum" (Lernspiele/Minigames)

Browser-Spiele liegen als Arbeitskopie in **`Spiele/`** (gitignored, gehört dem Betreiber).
Veröffentlicht wird eine 1:1-Kopie unter **`pausenraum/<kebab-name>/`** — bewusst nicht
„spiele/": Windows unterscheidet keine Groß-/Kleinschreibung, `Spiele` und `spiele`
würden verschmelzen und GitHub Pages bräche (CLAUDE.md Regel 4).

## Spiel aktualisieren

Betreiber ändert etwas in `Spiele/<Name>/` und sagt Claude Bescheid
(z. B. „Ich habe PyWinkelix aktualisiert"). Dann:

```
cd Spiele/werkzeuge
python3 sync-spiel.py PyWinkelix        # oder ohne Argument: alle Spiele
```

Das Skript kopiert den Spielordner vollständig (löscht das Ziel vorher), schließt
Dev-Dateien aus (node_modules, .git*, package*.json, test/, KONZEPT_*.md, tools/)
und prüft bei PyWinkelix, dass keine externen Ressourcen übrig bleiben.

**Danach Pflicht-Smoke-Test** (Playwright): Spiel-Startseite lädt ohne JS-Fehler,
und es gehen KEINE Requests an fremde Hosts raus (Request-Listener auf der Seite).
Bei neuen Spielen außerdem: localStorage-Schlüssel dürfen nicht mit `lernwelt-*`
oder anderen Spielen kollidieren.

## Sonderfall PyWinkelix

- Nutzt CodeMirror 5.65.16, qrcodejs 1.0.0 und die Schrift Atkinson Hyperlegible.
  Die Quelle verweist auf CDNs/Google Fonts — der Sync ersetzt das automatisch durch
  lokale Kopien aus `Spiele/werkzeuge/vendor-cache/` (einmalig via npm beschafft)
  und schreibt die Referenzen in der veröffentlichten index.html um. Quelle bleibt unberührt.
- Hat einen Service Worker (`sw.js`, Scope nur /pausenraum/pywinkelix/). **Bei jedem
  Update die Cache-Version in sw.js hochzählen** (z. B. "pywinkelix-v3" → "-v4"),
  sonst sehen Schüler die alte Version.

## Neues Spiel aufnehmen

1. Ordner in `Spiele/` ablegen; Eintrag im `SPIELE`-Dict von `sync-spiel.py` ergänzen
   (kebab-case-Zielname, Ausschlüsse, ggf. vendor-Behandlung analog PyWinkelix).
2. Prüfen: keine externen Requests (grep nach https:// in HTML/JS/CSS), localStorage-
   Schlüssel gepräfixt, läuft über http (nicht nur file://), Lizenztexte vorhanden.
3. `sync-spiel.py <Name>` ausführen.
4. Eintrag in `daten/spiele.json` (id `sp-…`, ordner, titel, kurz, fach|null,
   ab|null, dauer) — die Pausenraum-Seite rendert daraus.
5. Smoke-Test + 380-px-Check der Übersichtsseite, Änderungsliste ausgeben.

## Verweise auf der Website

Hauptnavigation „Pausenraum" (komponenten.js), Startseiten-Knopf, Übersichtsseite
`pausenraum/index.html` mit Karten aus `daten/spiele.json` (assets/js/pausenraum.js).
Spiele öffnen als eigenständige Seiten (kein iframe, eigener Look, Browser-Zurück).

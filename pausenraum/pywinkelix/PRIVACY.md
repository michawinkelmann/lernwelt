# Datenschutz / Privacy

PyWinkelix ist eine reine **Browser-Anwendung**. Alle Daten bleiben auf dem Gerät, auf dem das Spiel läuft.

## Was wird gespeichert?

Nur im `localStorage` des Browsers — also auf dem **einzelnen Gerät** der Schülerin / des Schülers, **nicht** auf irgendeinem Server:

| Schlüssel | Inhalt |
|-----------|--------|
| `pyforge_save` | Spielstand: XP, abgeschlossene Aufgaben, Achievements, Settings, Avatar-Name |
| `pyforge_lang` | Gewählte Oberflächensprache (de / en) |
| `pyforge_first_visit` | Datum des ersten Starts (für „Tipp des Tages"-Rotation) |
| `pyforge_note_<aufgabe>` | Persönliche Notizen pro Aufgabe |
| `pyforge_notes_index` | Liste der Aufgaben mit Notizen |
| `pyforge_user_snippets` | Eigene Code-Snippets |
| `pyforge_custom_challenges` | Eigene Aufgaben (nur im Lehrer-Modus) |
| `pyforge_teacher_notes` | Lehrer-Notizen (nur im Lehrer-Modus) |
| `pyforge_cutscenes_seen` | Welche Story-Cutscenes schon gespielt wurden |

**Avatar-Name** ist das einzige potenziell personenbezogene Datum — Schüler:innen können selbst wählen, ob sie einen Klarnamen, Spitznamen oder gar nichts eintragen.

## Was wird *nicht* gespeichert?

- ❌ Keine Cookies
- ❌ Kein Tracking (kein Google Analytics, kein Matomo, gar nichts)
- ❌ Keine Werbung
- ❌ Keine externen Server-Aufrufe für Spielstände
- ❌ Keine Mikrofon-, Kamera- oder Standortzugriffe

## Externe Ressourcen (CDN-Loads)

Beim ersten Laden werden folgende Dateien von Content-Delivery-Networks bezogen. **Sie übertragen lediglich die Information, dass diese Dateien angefordert wurden** (wie bei jeder geladenen Webseite):

| Ressource | Quelle |
|-----------|--------|
| **CodeMirror 5** (Code-Editor) | `cdnjs.cloudflare.com` |
| **Atkinson Hyperlegible** (Schriftart, optional) | `fonts.googleapis.com` / `fonts.gstatic.com` |
| **qrcodejs** (QR-Code-Generator) | `cdnjs.cloudflare.com` |

Diese sind **optional** — wenn das Schul-WLAN sie blockiert, fällt das Spiel auf eine einfache `<textarea>`, System-Fonts und ein URL-only-Sharing zurück. **Funktionalität bleibt erhalten.**

Nach dem ersten Laden cached der Service Worker (`sw.js`) die App-Dateien lokal, sodass auch **ohne Internet** weiter gespielt werden kann.

## Spielstand-Export / -Import

Schüler:innen können ihren Spielstand jederzeit als JSON-Datei **exportieren** (Einstellungen → „Exportieren") und auf einem anderen Gerät oder einer Schul-Cloud sichern. **Notizen sind im Export enthalten.**

## Lehrer-Klassenmodus

Im Lehrer-Modus können mehrere Schüler-Saves auf einmal importiert und verglichen werden. **Das passiert ausschließlich im Browser der Lehrkraft** — die Daten verlassen das Gerät nicht.

CSV-Export ist möglich, um Notenerfassung oder Berichtsformulare ohne manuelles Abtippen zu unterstützen.

## DSGVO-konform?

Für reine Browser-Nutzung **ohne Avatar-Klarname**: ja, vollständig.

Mit Klarnamen im Avatar: Die Lehrkraft sollte sicherstellen, dass die Schüler:innen wissen, dass dieser Name auf ihrem Gerät im Browser steht — und dass beim Save-Export der Name in der JSON-Datei steht.

## Kontakt bei Fragen

Bei datenschutzrechtlichen Fragen oder dem Wunsch nach einer detaillierteren Schul-DSGVO-Erklärung: bitte ein Issue im GitHub-Repository öffnen oder die Lehrkraft direkt kontaktieren.

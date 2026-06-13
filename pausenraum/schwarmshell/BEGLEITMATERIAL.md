# SchwarmShell — Begleitmaterial für Lehrkräfte

Kompakte Übersicht zu Lernzielen, didaktischen Anknüpfungspunkten und
Reflexionsfragen. Für Sek I (ab Klasse 7) konzipiert; einsetzbar im
Informatik-Wahlpflichtkurs oder als Selbstlern-Material.

## Voraussetzungen

- Browser (Chromium, Firefox, Safari) — offline-fähig, keine Installation.
- Optional: Sound (Web Audio API, deaktivierbar in den Einstellungen).
- Spielstand wird im Browser (`localStorage`) gespeichert. Schul-iPads mit
  „Browserdaten löschen"-Routine: Vor dem Schließen Savegame-Passphrase
  über den `Savegame`-Button exportieren.

## Lernziele nach Phasen

| Phase | Kernkonzepte | Bash-Befehle |
|------|--------------|--------------|
| 1 — Tutorial / IServ-Glitch | Pfade, relative vs. absolute Adressierung, Dateien lesen | `ls`, `cd`, `cat`, `pwd`, `unlock`, `talk` |
| 2 — Arena / Fragmente | Textsuche, Wildcards, Ordnerstrukturen bauen | `grep` (mit Regex), `find`, `mkdir`, `touch`, `rm`, `cp`, `mv` |
| 3 — Patchlord-Bossfight | Datei-Rechte (rwx-Modell), Ausführbarkeit, Output umleiten | `chmod` (+x / Oktett), `echo > / >>`, `bash`, Pipes (`|`) |
| 4 — Mentor-Hub | Prozessmodell, Signale, Befehls-Verlauf, Effizienz | `ps`, `top`, `kill`, `kill -9/-15`, `history`, `alias` |
| 5 — Real-Life / Arbeitsamt | Übertrag auf reale Berufsanwendungen, Audit-Logs | Kombi aus allen vorherigen Phasen |
| 6 — Scriptlab | Eigene Bash-Skripte schreiben (echo, Variablen, mehrere Befehle), chmod +x, Ausführung | `edit <file>` öffnet einen Editor; Pattern-basierte Quest-Trigger |

## Reflexionsfragen (für Plenum oder Lerntagebuch)

### Nach Phase 1
- Was ist der Unterschied zwischen `cd /school` und `cd school`? Wann wäre
  welcher Befehl sinnvoll?
- Was passiert, wenn du `cd ..` mehrfach hintereinander eingibst?

### Nach Phase 2
- Was bedeutet das Zeichen `*` in `find / -name "*.log"`?
- Stell dir vor, du suchst in einem Schul-Netzwerk-Log nach allen Zeilen, die
  mit „ERROR" beginnen. Welcher Befehl wäre passend? (Antwort: `grep "^ERROR" datei`)

### Nach Phase 3
- Erkläre in eigenen Worten, was `chmod 755` macht. Was wäre der Unterschied
  zu `chmod 700`?
- Warum ist es eine gute Idee, ein Skript nicht direkt am Original zu
  bearbeiten, sondern erst in die `~/workbench` zu kopieren?
- Was macht der Operator `|` (Pipe)? Welches Konzept der Unix-Philosophie steckt dahinter?

### Nach Phase 4
- Was ist ein Daemon? Recherchiert: welche Daemons laufen typischerweise
  auf einem Linux-Server (z.B. `sshd`, `cupsd`, `cron`)?
- Wann würdest du `kill -9` statt einfach `kill` benutzen — und warum ist
  das nicht immer die beste Wahl?
- Was ist der Vorteil von `alias`? Welchen eigenen Alias würdest du dir bauen?

### Nach Phase 5
- Welche der gelernten Bash-Werkzeuge würdest du in einem nicht-IT-Beruf
  einsetzen (z.B. Snackmaster, A-R-S, Ohlendorf-Technik)?
- Wo siehst du Grenzen der Bash gegenüber grafischen Tools?

### Nach Phase 6
- Warum schreibt man Bash-Skripte überhaupt — was wäre die Alternative
  und wann lohnt sie sich nicht?
- Was bedeuten Variablen wie `NAME="Welt"` und `echo "$NAME"` konkret —
  warum braucht man die Anführungszeichen bei Strings mit Leerzeichen?
- Was kann ein Skript gefährlich machen, das mehrere `rm` enthält? Wie
  würdest du dich davor schützen, versehentlich Wichtiges zu löschen?

## Brücke zu echter Linux-Bash

Das Spiel vereinfacht an einigen Stellen — diese Punkte sollten im
Unterricht ergänzt werden:

- **`grep`**: Nutzt nun echte Regex (Anker `^`, `$`, Zeichenklassen `[a-z]`,
  Quantoren `.*`). In echter Bash kommen Flags wie `-E` (ERE), `-r` (rekursiv)
  und `-v` (invertieren) dazu.
- **`chmod`**: Im Spiel beeinflusst die erste Oktett-Ziffer das Exec-Bit für
  den Owner. In echter Linux-Praxis sind alle drei Oktette wirksam (Owner,
  Group, Others); zusätzlich existieren `setuid`/`setgid`/`sticky`.
- **`kill`**: Akzeptiert `-9` und `-15` als Signal-Argument, behandelt sie
  aber identisch. In Realität: `-15` (SIGTERM) = höfliche Bitte zum
  Beenden, `-9` (SIGKILL) = kann nicht ignoriert werden, aber unterbricht
  evtl. laufende Schreiboperationen.
- **Prozesse**: Im Spiel simuliert (3–4 Einträge). Auf echten Systemen
  zeigt `ps -ef` oder `ps aux` hunderte Prozesse.
- **`alias`**: Im Spiel dauerhaft im Savegame, in echter Bash nur in der
  aktuellen Session — Persistenz erfordert Eintrag in `~/.bashrc`.

## Differenzierung

Die **Schwierigkeitsstufen** (Zahnrad-Icon unten rechts) erlauben Anpassung:

- **Story** — Clippy zeigt die komplette Schritt-Lösung sofort. Geeignet
  für Einstieg, schwächere Lerner oder als Tandem-Modus.
- **Klassisch** (Standard) — Clippy zeigt zuerst nur einen Konzept-Hinweis.
  „Lösung anzeigen" muss aktiv ausgewählt werden. Pädagogisch zu empfehlen.
- **Hardcore** — Clippy komplett deaktiviert. Spieler*innen müssen
  ausschließlich mit `help`, `man <cmd>` und `hint` arbeiten. Geeignet für
  Speedruns oder fortgeschrittene Lerner.

## Konzept-Karten

Beim ersten Auftreten von `chmod`, `ps`/`top`/`kill`, Pipes oder Redirects
erscheint eine kurze Erklär-Karte. Diese kann im Einstellungs-Panel
zurückgesetzt werden („Konzept-Karten wieder zeigen") — sinnvoll bei
neuen Schülerkohorten, die denselben Browser-Account erben.

## Replay

Über das Einstellungs-Panel kann der bisherige Spielmitschnitt (letzte
~400 Zeilen) als Text exportiert werden. Geeignet als Beleg für
Lerntagebücher oder zur gemeinsamen Fehleranalyse im Unterricht.

## Bekannte Vereinfachungen / didaktische Trade-offs

- Das Dateisystem ist eine in `data.js` hartcodierte Datenstruktur — bei
  Beschäftigung mit echten Linux-Systemen sollte erläutert werden, dass
  Dateien dort als Bytes auf einem Datenträger liegen.
- Permissions wirken vor allem unter `~/home/player/`; vertrauliche
  „Lehrerzimmer"-Dateien sind über ein Story-Lock geschützt, nicht über
  echte Unix-Permissions.
- Pipes sind auf max. 2 Verkettungen begrenzt — auf echten Systemen
  beliebig.

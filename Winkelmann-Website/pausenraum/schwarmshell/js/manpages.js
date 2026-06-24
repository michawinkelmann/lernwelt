// manpages.js — Befehls-Registry und man-Texte (reine Daten, aus commands.js ausgelagert)
//
// COMMAND_REGISTRY: Metadaten pro Befehl (Gruppe, Kurzbeschreibung, Usage, Beispiel).
// MANUALS: ausführliche, lernfreundliche man-Seiten. Neue Befehle brauchen hier
// einen Eintrag UND einen case in cmdImpl() (js/commands.js).
const COMMAND_REGISTRY = {
  "alias": { group: "Core", desc: "Alias setzen", usage: "alias ll=\"ls -l\"", example: "alias ll=\"ls -l\"" },
  "assemble": { group: "Mentor", desc: "(Mentor) Assembly-Aufgabe", usage: "assemble", example: "assemble" },
  "bash": { group: "Mentor", desc: "Mini-Shell/Script", usage: "bash", example: "bash" },
  "cat": { group: "Text", desc: "liest Datei", usage: "cat <file>", example: "cat readme.txt" },
  "cd": { group: "Files", desc: "wechselt Ordner", usage: "cd <path>", example: "cd /school" },
  "chmod": { group: "Files", desc: "Rechte ändern", usage: "chmod +x <file> | chmod <mode> <file>", example: "chmod +x ~/workbench/patchlord.sh" },
  "choose": { group: "Game", desc: "Auswahl im Dialog", usage: "choose <nr>", example: "choose 3" },
  "clear": { group: "Core", desc: "Terminal leeren", usage: "clear", example: "clear" },
  "connect": { group: "Sidequest", desc: "(Sidequest) SUPER-PC verbinden", usage: "connect superpc", example: "connect superpc" },
  "cp": { group: "Files", desc: "kopieren", usage: "cp <src> <dst>", example: "cp /boss/patchlord.sh ~/workbench/" },
  "echo": { group: "Text", desc: "Text ausgeben", usage: "echo \"<text>\" [> file] [>> file]", example: "echo \"hi\"" },
  "edit": { group: "Files", desc: "(Phase 6) eigenes Skript im Editor öffnen", usage: "edit <file>", example: "edit ~/scripts/hello.sh" },
  "exit": { group: "Sidequest", desc: "Ebene verlassen", usage: "exit", example: "exit" },
  "find": { group: "Text", desc: "findet Dateien", usage: "find <path> -name \"<pattern>\"", example: "find / -name \"*.log\"" },
  "grep": { group: "Text", desc: "sucht Textmuster", usage: "grep <pattern> <file>", example: "grep glitch iserv.log" },
  "help": { group: "Core", desc: "zeigt verfügbare Befehle (oder help - <questkey>)", usage: "help | help - <questkey>", example: "help - tutorial" },
  "hint": { group: "Core", desc: "gibt einen Tipp zur aktuellen Quest", usage: "hint", example: "hint" },
  "history": { group: "Core", desc: "Verlauf anzeigen", usage: "history", example: "history" },
  "inventory": { group: "Game", desc: "Inventar anzeigen", usage: "inventory", example: "inventory" },
  "kill": { group: "Mentor", desc: "Prozess beenden", usage: "kill <pid>", example: "kill 1337" },
  "logwipe": { group: "Sidequest", desc: "(Sidequest) Spuren löschen", usage: "logwipe", example: "logwipe" },
  "ls": { group: "Files", desc: "listet Inhalte", usage: "ls", example: "ls" },
  "man": { group: "Core", desc: "zeigt Doku zu einem Command (Beschreibung + Beispiel)", usage: "man <cmd>", example: "man grep" },
  "mentor_clear": { group: "Mentor", desc: "(Mentor) Mentor-Cache löschen", usage: "mentor_clear", example: "mentor_clear" },
  "mkdir": { group: "Files", desc: "Ordner erstellen", usage: "mkdir <name>", example: "mkdir ~/workbench/patches" },
  "mv": { group: "Files", desc: "verschieben", usage: "mv <src> <dst>", example: "mv a.txt b.txt" },
  "netmap": { group: "Sidequest", desc: "(Sidequest) Netzwerkübersicht", usage: "netmap", example: "netmap" },
  "ping": { group: "Sidequest", desc: "(Sidequest) Host prüfen", usage: "ping <host>", example: "ping gym-ost-core" },
  "ps": { group: "Mentor", desc: "Prozesse", usage: "ps", example: "ps" },
  "pwd": { group: "Files", desc: "zeigt aktuellen Pfad", usage: "pwd", example: "pwd" },
  "quests": { group: "Core", desc: "zeigt Ziele der aktuellen Phase", usage: "quests", example: "quests" },
  "reset": { group: "Core", desc: "hard reboot", usage: "reset", example: "reset" },
  "rm": { group: "Files", desc: "löschen", usage: "rm <path>", example: "rm old.txt" },
  "scp": { group: "Sidequest", desc: "(Sidequest) Datei kopieren", usage: "scp <remote_file> <local_path>", example: "scp blueprint.dat ~/workbench/" },
  "ssh": { group: "Sidequest", desc: "(Sidequest) einloggen", usage: "ssh <host>", example: "ssh igs-edu-lab" },
  "talk": { group: "Game", desc: "mit NPCs sprechen", usage: "talk <name>", example: "talk winkelmann" },
  "top": { group: "Mentor", desc: "Live-Übersicht", usage: "top", example: "top" },
  "touch": { group: "Files", desc: "Datei erstellen", usage: "touch <file>", example: "touch ~/workbench/patches/frag2.txt" },
  "unlock": { group: "Game", desc: "Code/Schlüssel verwenden", usage: "unlock <code>", example: "unlock CODE-123" },
};

// Ausführlichere "man"-Texte (Beschreibung + Namensherkunft)
// Hinweis: Nicht jedes Tool ist 1:1 wie in echter Bash implementiert – aber die Idee bleibt dieselbe.
const MANUALS = {
  man: `WAS ES MACHT
  man zeigt dir eine Kurzanleitung zu einem Befehl: wofür er da ist, wie die Syntax aussieht
  und ein Beispiel. In diesem Spiel sind die man-Seiten extra "lernfreundlich" geschrieben.

NAMENSGEBUNG
  "man" ist die Abkürzung von "manual" (Handbuch). Auf echten Linux-Systemen ist man
  der Klassiker, um Hilfe zu finden, ohne das Internet zu brauchen.
`,

  help: `WAS ES MACHT
  help listet die Befehle auf, die in deiner aktuellen Phase freigeschaltet sind.
  Mit "help - <questkey>" bekommst du außerdem kontextbezogene Tipps zu einer Quest.

NAMENSGEBUNG
  "help" ist einfach Englisch für "Hilfe". In vielen Programmen ist help der Standard-
  Befehl, um eine Kurzbeschreibung zu bekommen.
`,

  hint: `WAS ES MACHT
  hint gibt dir einen kleinen Schubs zur aktuellen Aufgabe: Was ist der nächste Schritt,
  ohne dir direkt die Lösung zu spoilern.

NAMENSGEBUNG
  "hint" heißt auf Englisch "Hinweis". In Games sind Hints oft die "Ich-häng-fest"-Taste.
`,

  ls: `WAS ES MACHT
  ls zeigt dir, was in einem Ordner liegt (Dateien und Unterordner).
  Mit "ls -l" siehst du eine längere Ansicht (wie in Linux), z.B. ob etwas ein Ordner ist.

NAMENSGEBUNG
  "ls" ist kurz für "list" (auflisten). Unix mag kurze Befehle: schnell zu tippen,
  auch wenn man müde ist oder gerade panisch im Lehrerzimmer steht.
`,

  cd: `WAS ES MACHT
  cd ändert deinen aktuellen Ordner. Danach beziehen sich relative Pfade auf diesen Ort.
  Beispiele: "cd .." geht einen Ordner hoch, "cd /" geht zur Wurzel.

NAMENSGEBUNG
  "cd" steht für "change directory" (Ordner wechseln). Directory ist das englische Wort
  für Verzeichnis/Ordner.
`,

  pwd: `WAS ES MACHT
  pwd zeigt dir, wo du gerade bist – als vollständigen Pfad.
  Wenn du dich verlaufen hast: pwd ist deine "Wo bin ich?!"-Lampe.

NAMENSGEBUNG
  "pwd" steht für "print working directory" – also: "zeige den Arbeitsordner".
  "print" heißt hier nicht drucken, sondern im Terminal ausgeben.
`,

  cat: `WAS ES MACHT
  cat gibt den Inhalt einer Datei im Terminal aus.
  In echter Bash kann cat auch Dateien "zusammenkleben" (mehrere Dateien hintereinander ausgeben).
  Hier nutzt du es vor allem zum Lesen von Texten und Logs.

NAMENSGEBUNG
  "cat" kommt von "concatenate" (aneinanderhängen). Dass es wie "Katze" klingt,
  ist ein Bonus und hat viele Memes produziert.
`,

  echo: `WAS ES MACHT
  echo schreibt Text ins Terminal. Mit ">" oder ">>" kannst du Text auch in Dateien schreiben:
    echo "hi" > file.txt     (überschreibt)
    echo "nochmal" >> file.txt (hängt an)

NAMENSGEBUNG
  "echo" ist ein Echo: du rufst etwas, und es kommt wieder zurück – nur eben als Ausgabe.
`,

  clear: `WAS ES MACHT
  clear "wischt" dein Terminal sauber, damit du wieder Übersicht hast.
  Deine Daten sind nicht weg – nur der Bildschirm wird geleert.

NAMENSGEBUNG
  "clear" heißt auf Englisch "klar/sauber machen". Genau das passiert.
`,

  grep: `WAS ES MACHT
  grep sucht in Text nach einem Muster (Pattern). Super für Logs.
  In diesem Spiel: grep <pattern> <file>.
  Pro-Tipp: grep -n zeigt Zeilennummern, grep -i ignoriert Groß/Kleinschreibung.

NAMENSGEBUNG
  "grep" stammt historisch aus einem alten Editor-Befehl (ed): "g/re/p" =
  "global" suchen, "regular expression" anwenden, "print" ausgeben.
  Nerdig, aber ikonisch.
`,

  find: `WAS ES MACHT
  find durchsucht Ordner nach Dateien, die zu einem Muster passen.
  Beispiel: find / -name "*.log" findet alle .log-Dateien ab der Wurzel.
  In echten Systemen kann find noch viel mehr (z.B. nach Datum, Größe, Owner...).

NAMENSGEBUNG
  "find" ist Englisch für "finden". Selten war ein Befehl so ehrlich.
`,

  mkdir: `WAS ES MACHT
  mkdir erstellt einen neuen Ordner.
  Denk an einen neuen "Container" für Dateien: mkdir patches legt z.B. einen Ordner "patches" an.

NAMENSGEBUNG
  "mkdir" ist die Abkürzung von "make directory" (Ordner machen).
`,

  touch: `WAS ES MACHT
  touch erstellt eine leere Datei, wenn sie noch nicht existiert.
  In echten Unix-Systemen aktualisiert touch außerdem den Zeitstempel einer Datei.
  (So nach dem Motto: "Ich hab die Datei kurz angefasst".)

NAMENSGEBUNG
  "touch" heißt "berühren". Du fasst die Datei an – und sie gilt als "aktuell".
`,

  rm: `WAS ES MACHT
  rm löscht Dateien (und je nach System auch Ordner).
  Vorsicht: In echter Bash gibt es keinen Papierkorb – rm ist eher "weg ist weg".
  Im Spiel ist rm sicherer, aber immer noch: denk kurz nach.

NAMENSGEBUNG
  "rm" steht für "remove" (entfernen).
`,

  cp: `WAS ES MACHT
  cp kopiert Dateien oder Ordner von A nach B.
  Beispiel: cp a.txt b.txt kopiert a.txt nach b.txt.

NAMENSGEBUNG
  "cp" ist kurz für "copy" (kopieren).
`,

  mv: `WAS ES MACHT
  mv verschiebt oder benennt um.
  Beispiel: mv alt.txt neu.txt ist ein Umbenennen.
  Beispiel: mv file.txt /school/ macht ein Verschieben.

NAMENSGEBUNG
  "mv" steht für "move" (bewegen/verschieben).
`,

  chmod: `WAS ES MACHT
  chmod ändert Dateirechte. In diesem Spiel ist das vor allem wichtig, um Scripts ausführbar zu machen:
    chmod +x script.sh
    ./script.sh
  In echter Bash gibt es außerdem Zahlenmodi (z.B. 755), das ist hier nur teilweise simuliert.

NAMENSGEBUNG
  "chmod" heißt "change mode". Der "Mode" ist die Rechte-Einstellung einer Datei.
`,

  history: `WAS ES MACHT
  history zeigt dir deine letzten Befehle.
  Praktisch, wenn du etwas wiederholen willst oder wissen möchtest, was du gerade getan hast.

NAMENSGEBUNG
  "history" bedeutet "Verlauf/Geschichte". Dein Terminal erzählt dir, was passiert ist.
`,

  alias: `WAS ES MACHT
  alias erstellt einen Kurznamen für einen längeren Befehl.
  Beispiel: alias ll="ls -l" und danach reicht "ll".
  (In echten Shells kann man damit sehr viel Komfort bauen.)

NAMENSGEBUNG
  "alias" ist ein "Spitzname". Du gibst einem Befehl einen zweiten Namen.
`,

  ps: `WAS ES MACHT
  ps listet laufende Prozesse auf (Programme, die gerade aktiv sind).
  Das ist wichtig, wenn du verstehen willst, was im Hintergrund arbeitet.

NAMENSGEBUNG
  "ps" ist historisch kurz für "process status" (Prozess-Status).
`,

  top: `WAS ES MACHT
  top zeigt eine Live-Übersicht über Prozesse – wer zieht gerade Leistung/Ressourcen.
  Stell dir das wie ein "Task-Manager" im Terminal vor.

NAMENSGEBUNG
  "top" wie "Top-Liste": oben stehen die Prozesse, die am meisten Ressourcen ziehen.
`,

  kill: `WAS ES MACHT
  kill beendet einen Prozess per ID (pid).
  In echten Systemen kann kill auch "Signale" schicken (z.B. freundlich beenden vs. hart stoppen).
  Hier geht’s vor allem ums Stoppen.

NAMENSGEBUNG
  "kill" heißt wörtlich "töten" – dramatisch, aber gemeint ist: Prozess beenden.
`,

  reset: `WAS ES MACHT
  reset startet das Spiel/Terminal neu (Hard Reboot). Wenn du komplett feststeckst,
  ist reset der Not-Aus. Achtung: Fortschritt kann dabei verloren gehen.

NAMENSGEBUNG
  "reset" heißt "zurücksetzen" – zurück auf Anfangszustand.
`,

  quests: `WAS ES MACHT
  quests zeigt dir deine aktuellen Ziele (Quests) – was in dieser Phase offen ist.

NAMENSGEBUNG
  "quest" kommt aus Rollenspielen und bedeutet "Aufgabe/Abenteuer".
`,

  inventory: `WAS ES MACHT
  inventory zeigt dir, was du eingesammelt hast (Items, Codes, Schlüssel).
  Wenn du denkst "wo war nochmal die Keycard?" → inventory.

NAMENSGEBUNG
  "inventory" ist das englische Wort für "Inventar".
`,

  unlock: `WAS ES MACHT
  unlock verwendet einen Code oder ein Item, um etwas freizuschalten (Tür, Gate, Zugang).
  Wenn ein Bereich "locked" ist, probier unlock <code>.

NAMENSGEBUNG
  "unlock" heißt "aufschließen/freischalten". Genau das macht es.
`,

  talk: `WAS ES MACHT
  talk startet Dialoge mit NPCs. Manche geben Hinweise, manche Quests, manche… schicken dich weg.
  Tipp: Oft klappt der Nachname als Shortcut (z.B. talk remmers).

NAMENSGEBUNG
  "talk" ist Englisch für "reden". Kurz, klar, RPG-Vibes.
`,

  bash: `WAS ES MACHT
  bash ist die Shell, die in vielen Linux-Systemen Standard ist.
  In diesem Spiel ist "bash" eher ein Lern-/Mentor-Tool: kleine Script- oder Shell-Momente.

NAMENSGEBUNG
  "bash" ist ein Wortspiel: "Bourne Again SHell" (eine Weiterentwicklung der Bourne-Shell).
`,

  assemble: `WAS ES MACHT
  assemble ist ein Spielbefehl: du setzt gefundene Fragmente zu etwas Größerem zusammen.
  Kein klassischer Bash-Befehl, aber passend für die Story.

NAMENSGEBUNG
  "assemble" heißt "zusammensetzen" (wie Lego – nur mit Daten).
`,

  mentor_clear: `WAS ES MACHT
  mentor_clear leert den "Mentor-Cache". Das ist Story/Gameplay: manchmal hängen Hinweise,
  und ein Cache-Reset kann helfen.

NAMENSGEBUNG
  "clear" = leeren. "mentor" = Mentor-System im Spiel.
`,

  // Sidequest-Tools
  ping: `WAS ES MACHT
  ping prüft, ob ein Host/Computer erreichbar ist.
  In echten Netzen schickt ping kleine Testpakete und misst die Antwortzeit.

NAMENSGEBUNG
  Wie ein Sonar "ping": du sendest ein Signal und hörst, ob etwas zurückkommt.
`,

  ssh: `WAS ES MACHT
  ssh verbindet dich mit einem entfernten Rechner (Remote Login) – sicher verschlüsselt.
  Im Spiel: Teil der Winkelmann-/Netzwerk-Sidequest.

NAMENSGEBUNG
  "ssh" steht für "Secure Shell" (sichere Shell).
`,

  scp: `WAS ES MACHT
  scp kopiert Dateien über eine SSH-Verbindung.
  Im Spiel: du holst Daten von einem Remote-System in deinen lokalen Pfad.

NAMENSGEBUNG
  "scp" bedeutet "secure copy" – kopieren, aber (über SSH) sicher.
`,

  netmap: `WAS ES MACHT
  netmap zeigt eine Übersicht über das "Netz" in der Sidequest. Denk: Karte statt Rätsel.

NAMENSGEBUNG
  "net" = network, "map" = Karte. Also: Netzwerk-Karte.
`,

  logwipe: `WAS ES MACHT
  logwipe löscht/verwässert Spuren in Logs (nur im Sidequest-Kontext!).
  In echten Systemen ist das hochsensibel – hier ist es Story, nicht Anleitung für Mist.

NAMENSGEBUNG
  "log" = Logdatei, "wipe" = wegwischen.
`,

  connect: `WAS ES MACHT
  connect baut eine Verbindung zum SUPER-PC in der Sidequest auf.
  Danach werden Netzwerk-Befehle freigeschaltet.

NAMENSGEBUNG
  "connect" heißt "verbinden". Simple.
`,

  choose: `WAS ES MACHT
  choose wählt eine Option in einem Dialog aus.
  Wenn dir jemand (z.B. Winkelmann) Optionen 1..3 gibt, nimmst du mit choose 2 die zweite.

NAMENSGEBUNG
  "choose" = auswählen.
`,

  exit: `WAS ES MACHT
  exit beendet eine spezielle Ebene/Ansicht (z.B. Sidequest-Modus) und bringt dich zurück.

NAMENSGEBUNG
  "exit" ist der klassische "raus hier"-Befehl: Programm verlassen.
`,
};

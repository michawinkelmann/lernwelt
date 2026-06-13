// Virtuelles Dateisystem (FS) — von SchwarmShell. Jeder Eintrag ist ein Pfad-Key
// mit {type:"dir", children:[...]} oder {type:"file", content:"..."}. Optional
// "locked:true" für Story-Lock-Dateien. Lehrkräfte können hier eigene Räume,
// NPCs und Aufträge ergänzen — siehe BEGLEITMATERIAL.md.
(function(){
const FS = {
    "/": { type:"dir", children:["home","school","server_gate","arena","patchbay","network","boss","mentor_hub","arbeitsamt","real_life"] },
    "/home": { type:"dir", children:["player"] },
    "/home/player": { type:"dir", children:["readme.txt","notizen.txt","backpack","workbench","sidequests","ipad_sync","lager"] },
    "/home/player/backpack": { type:"dir", children:["snack.txt"] },
    "/home/player/workbench": { type:"dir", children:["README_WORKBENCH.txt"] },
    "/home/player/sidequests": { type:"dir", children:["README_SIDEQUESTS.txt"] },
    "/home/player/sidequests/README_SIDEQUESTS.txt": { type:"file", content:
`Nebenquests (inoffiziell):
Diese Ordner sind nur dein privates Notiz-/Ablagefach.
Es gibt KEIN Quest-Log dafür. Nur NPCs geben dir Hinweise.

Tipp: Wenn dir jemand sagt „bring mir X“,
dann kopier/verschieb die Datei oft nach ~ und rede nochmal mit der Person.`
    },

    "/home/player/ipad_sync": { type:"dir", children:["zoe"] },
    "/home/player/ipad_sync/zoe": { type:"dir", children:["wichtig.txt","hinweis.txt"] },
    "/home/player/ipad_sync/zoe/wichtig.txt": { type:"file", content:
`(iPad-Sync)
Wenn du das lesen kannst, ist der Zugriff wieder da ✅

WICHTIG:
- Präsentation: 3 Folien
- HDMI-Adapter zurückbringen
- Nicht wieder alles auf „Nur Lesen“ stellen 😭
` },
    "/home/player/ipad_sync/zoe/hinweis.txt": { type:"file", content:
`Zoe meinte:
„Ich hab’s irgendwie geschafft, mir selbst die Rechte wegzunehmen…
Wenn du 'Permission denied' siehst: chmod 644 wichtig.txt (oder so?)“`
    },

    "/home/player/lager": { type:"dir", children:["lampenliste.txt","README.txt","kabel.tmp","kiste.tmp","defekt.tmp"] },
    "/home/player/lager/lampenliste.txt": { type:"file", content:
`Lampenliste (bitte NICHT löschen):
- Flur: 3x LED-Röhre
- PC-Raum: 1x Ersatz
- Bühne: 2x Spot
` },
    "/home/player/lager/README.txt": { type:"file", content:
`Hausmeister-Note:
„Wenn du im Lager aufräumst: .tmp kann weg.
Alles andere ist wichtig. (Vielleicht.)“`
    },
    "/home/player/lager/kabel.tmp": { type:"file", content:"(alte Kabel-Notiz – weg damit)\n" },
    "/home/player/lager/kiste.tmp": { type:"file", content:"(irgendein Quatsch)\n" },
    "/home/player/lager/defekt.tmp": { type:"file", content:"(defektliste alt)\n" },


    "/school": { type:"dir", children:["flur.txt","mensa","pcraum","digitallab","sekretariat","beratung","bibliothek","turnhalle","hof","klassenraume","keller","physik","medienraum","technikraum","lehrerzimmer","veranstaltungsraum","ganztag","sv_buero","musikraum","kunstraum","chemie","biologie"] },
    "/school/mensa": { type:"dir", children:["menu.txt","quest.txt","vending_hint.txt"] },
    "/school/pcraum": { type:"dir", children:["hint.txt","keycard.txt","glitchmap.txt","Schul-PC"] },
    "/school/pcraum/Schul-PC": { type:"dir", children:["boot.txt","iserv-glitch.txt"] },
    "/school/digitallab": { type:"dir", children:["digitallab.txt","craft_hint.txt"] },
    "/school/sekretariat": { type:"dir", children:["sekretariat.txt","ticket.txt"] },


    "/school/lehrerzimmer": { type:"dir", children:["lehrerzimmer.txt","hausordnung.txt","kaffeeplan.txt","lost_and_found.txt","ordner","schraenke","postfach"] },
    "/school/lehrerzimmer/ordner": { type:"dir", children:["konferenz","noten","vertretung","easter"] },
    "/school/lehrerzimmer/ordner/konferenz": { type:"dir", children:["protokoll_letzte_sitzung.txt","protokoll_geheim.txt"] },
    "/school/lehrerzimmer/ordner/noten": { type:"dir", children:["notenliste_7h1.csv","notenliste_8g2.csv","notenliste_master.csv"] },
    "/school/lehrerzimmer/ordner/vertretung": { type:"dir", children:["vertretungsplan_morgen.txt","vertretungsplan_intern.txt"] },
    "/school/lehrerzimmer/ordner/easter": { type:"dir", children:["postit_hack.txt","console_haiku.txt","wer_hat_den_tacker.txt"] },

    "/school/lehrerzimmer/schraenke": { type:"dir", children:["schrank_a","schrank_b","schrank_c"] },
    "/school/lehrerzimmer/schraenke/schrank_a": { type:"dir", children:["personalakten.txt","passwort_tresor.txt","kaffeemaschine_manual.txt"] },
    "/school/lehrerzimmer/schraenke/schrank_b": { type:"dir", children:["pruefung_komplett.txt","pruefung_loesung.txt","meme_fundus.txt"] },
    "/school/lehrerzimmer/schraenke/schrank_c": { type:"dir", children:["schluessel_liste.txt","usb_sticks.txt","easter_klammer.txt"] },

    "/school/lehrerzimmer/postfach": { type:"dir", children:["an_alle.txt","an_dich.txt",".unauffaellig.txt"] },

    "/school/lehrerzimmer/lehrerzimmer.txt": { type:"file", content:
`Lehrerzimmer:
Der Raum riecht nach Kaffee, Kopierpapier und *"Ich hab gleich Aufsicht"*.

Hier sitzen viele Lehrkräfte.
Wenn du \"talk\" benutzt, bekommst du ziemlich schnell zu hören, dass du hier nichts verloren hast.

Überall: Ordner, Schränke, Postfächer.
Ein Großteil ist vertraulich — und du hast keine Zugriffsberechtigung.
(= du wirst bei manchen Dateien nur \"Permission denied\" sehen.)

Aber:
Zwischen all dem Ernst sind kleine Easter Eggs versteckt.
Manche sind total harmlos, manche sind Lore, manche sind einfach… ein sehr schlechter Witz.

Tipp:
- ls / find hilft beim Stöbern.
- Wenn etwas \"Permission denied\" sagt: Das ist Absicht. Rechte sind ein Ding.
`},

    "/school/lehrerzimmer/hausordnung.txt": { type:"file", content:
`Hausordnung (Auszug):
1) Keine Lebensmittel auf Tastaturen.
2) Kein \"nur kurz\" am Kopierer. Es ist NIE nur kurz.
3) Vertrauliche Unterlagen bleiben vertraulich.
4) Wer den letzten Kaffee nimmt, macht neuen. (Unterschätzt diese Regel nicht.)

Randnotiz (kritzlig):
"Wenn du was suchst: grep in deinem Kopf, nicht in meinen Akten."`},

    "/school/lehrerzimmer/kaffeeplan.txt": { type:"file", content:
`Kaffeeplan (inoffiziell, aber heilig):
Mo: Frau Macke
Di: Frau Marx
Mi: Herr Neubert
Do: Frau Potinius
Fr: (\"Wer zuletzt meckert\")

Mini-Quest (nur fürs Ego):
Finde heraus, wer den Kaffee IMMER leer lässt.
Spoiler: Es ist immer jemand anderes. 😭`},

    "/school/lehrerzimmer/lost_and_found.txt": { type:"file", content:
`Fundkiste:
- 1x USB-Stick (beschriftet: \"final_final2\")
- 1x Tacker (mythisch)
- 3x Whiteboard-Marker (alle halb tot)
- 1x Zettel: \"chmod +x life.sh\" (wer war das??)
`},

    "/school/lehrerzimmer/ordner/konferenz/protokoll_letzte_sitzung.txt": { type:"file", content:
`Konferenz-Protokoll (harmloser Teil):
- TOP 1: Kopierer ist wieder kaputt.
- TOP 2: WLAN heißt nicht \"Schule123\".
- TOP 3: Jemand hat \"rm -rf /\" an die Tafel geschrieben. Bitte… nein.

Beschluss:
Mehr digitale Bildung, weniger Chaos.

Randkritzelei:
"Wenn Schüler*innen lernen, *warum* etwas nicht geht, lernen sie am meisten."`},

    "/school/lehrerzimmer/ordner/konferenz/protokoll_geheim.txt": { type:"file", content:
`(vertraulich) Konferenz-Protokoll — intern
Hier stehen Dinge, die du nicht lesen solltest.
Wenn du das siehst, ist das ein Bug… oder du bist Admin.
` , locked:true},

    "/school/lehrerzimmer/ordner/noten/notenliste_7h1.csv": { type:"file", content:
`name;note
Aylin;2
Finn;3
Lina;2
Yusuf;3
Hannah;1

Kommentar:
Noten sind wichtig, aber nicht alles.` , locked:true},

    "/school/lehrerzimmer/ordner/noten/notenliste_8g2.csv": { type:"file", content:
`name;note
Helena;2
Ben;3
Nora;1
Ilyas;3
Tessa;2
` , locked:true},

    "/school/lehrerzimmer/ordner/noten/notenliste_master.csv": { type:"file", content:
`(MASTER-LISTE)
Diese Datei ist so vertraulich, dass sie schon beim Ansehen Stress macht.
` , locked:true},

    "/school/lehrerzimmer/ordner/vertretung/vertretungsplan_morgen.txt": { type:"file", content:
`Vertretungsplan (öffentlich):
- 2. Stunde: Sport fällt aus (sorry)
- 4. Stunde: Raumwechsel 8G1 → Medienraum

(Die interne Version liegt… woanders.)`},

    "/school/lehrerzimmer/ordner/vertretung/vertretungsplan_intern.txt": { type:"file", content:
`(intern) Vertretungsplan
Enthält private Infos.
` , locked:true},

    "/school/lehrerzimmer/ordner/easter/postit_hack.txt": { type:"file", content:
`Easter Egg: Post-it Hack
Ein Post-it klebt am Monitor:

"Wenn du \"Permission denied\" siehst: Willkommen in der echten IT.
Zugriff ist nicht \"gemein\" — er schützt Dinge.

Pro-Tipp:
- In echt würdest du Rechte mit chmod/chown/sudo ändern.
- Hier im Spiel darfst du das nur in deinem ~.

(Und ja: jemand hat 'sudo make coffee' drunter gemalt.)"`},

    "/school/lehrerzimmer/ordner/easter/console_haiku.txt": { type:"file", content:
`console haiku:

cursor blinkt im schnee
ls zeigt nur stille ordner
kaffee wird zu prompt
`},

    "/school/lehrerzimmer/ordner/easter/wer_hat_den_tacker.txt": { type:"file", content:
`WANTED:
Der legendäre Tacker.

Letzte Sichtung: "Irgendwo zwischen Schrank B und der Realität".
Belohnung: 1x (ehrliches) "Danke".

PS:
Wenn du ihn findest: sag niemandem, dass du ihn gefunden hast.`},

    "/school/lehrerzimmer/schraenke/schrank_a/personalakten.txt": { type:"file", content:
`Personalakten (sehr vertraulich).
Nope.` , locked:true},

    "/school/lehrerzimmer/schraenke/schrank_a/passwort_tresor.txt": { type:"file", content:
`Passwort-Tresor (extrem vertraulich).
Du willst das nicht.
` , locked:true},

    "/school/lehrerzimmer/schraenke/schrank_a/kaffeemaschine_manual.txt": { type:"file", content:
`Manual: Kaffeemaschine 3000
1) Wasser rein.
2) Bohnen rein.
3) Taste drücken.

Fehlercode E:42:
"Filter nicht gefunden" → (wie im Terminal: erst finden, dann benutzen.)

Fun Fact:
Diese Anleitung ist das am häufigsten gelesene Dokument im Lehrerzimmer.`},

    "/school/lehrerzimmer/schraenke/schrank_b/pruefung_komplett.txt": { type:"file", content:
`(Prüfung) — vertraulich
Wenn du das lesen kannst, ist irgendwas sehr falsch.
` , locked:true},

    "/school/lehrerzimmer/schraenke/schrank_b/pruefung_loesung.txt": { type:"file", content:
`(Lösung) — super vertraulich
Nice try. 🙂
` , locked:true},

    "/school/lehrerzimmer/schraenke/schrank_b/meme_fundus.txt": { type:"file", content:
`Meme-Fundus (überraschend nicht vertraulich):
- "Wenn der Beamer wieder nicht geht" → *dramatic keyboard smash*
- "Noch eine Konferenz" → *windows shutdown sound*

Randnotiz:
"Wenn jemand fragt: Das ist pädagogisches Material."`},

    "/school/lehrerzimmer/schraenke/schrank_c/schluessel_liste.txt": { type:"file", content:
`Schlüsselliste (vertraulich):
Ein Haufen Nummern, ein Haufen Verantwortung.
` , locked:true},

    "/school/lehrerzimmer/schraenke/schrank_c/usb_sticks.txt": { type:"file", content:
`USB-Sticks (Fundus):
- \"Präsentation_final.pptx\"
- \"Präsentation_final_FINAL.pptx\"
- \"Präsentation_final_FINAL_neu.pptx\"

Lehrkräfte sind auch nur Menschen.`},

    "/school/lehrerzimmer/schraenke/schrank_c/easter_klammer.txt": { type:"file", content:
`Easter Egg: Die Büroklammer
Eine einsame Büroklammer liegt hier wie ein Relikt.

Sie flüstert:
"Wenn du nicht weiterkommst: zerleg das Problem.
Ein Schritt. Dann der nächste."

(Die Büroklammer ist überraschend weise.)`},

    "/school/lehrerzimmer/postfach/an_alle.txt": { type:"file", content:
`Rundmail (Ausdruck):
"Bitte tragt euch für die Pausenaufsicht ein."

Darunter: 17 Mal derselbe Seufzer, in verschiedenen Handschriften.`},

    "/school/lehrerzimmer/postfach/an_dich.txt": { type:"file", content:
`An dich (wer auch immer du bist):

Wenn du schon heimlich im Lehrerzimmer rumstöberst:
Mach es wenigstens ordentlich.

Tipp (für dein Spiel-Ich):
In manchen Ordnern sind Dinge versteckt, die NICHT vertraulich sind.
Find sie.

— jemand, der auch mal Schüler*in war`},

    "/school/lehrerzimmer/postfach/.unauffaellig.txt": { type:"file", content:
`(psst)
Wenn du das gefunden hast: nice.

Mini-Lore:
Der Game-Layer hat nicht nur Schüler-Accounts.
Es gibt auch "staff". Und die Rechte sind… sehr viel größer.

Du bist aber 'student'.
Das ist okay.
Skill > Rechte.
`},
    "/school/beratung": { type:"dir", children:["beratung.txt","motto.txt","casefile.txt"] },
    "/school/bibliothek": { type:"dir", children:["bibliothek.txt","index.txt","lore.txt","secret_shelf","abgabe"] },
    "/school/bibliothek/secret_shelf": { type:"dir", children:["spoiler.txt","sus_note.txt"] },
    "/school/turnhalle": { type:"dir", children:["turnhalle.txt","scoreboard.txt"] },
    "/school/hof": { type:"dir", children:["hof.txt","ping.txt"] },

    "/school/veranstaltungsraum": { type:"dir", children:["raum.txt","buehne.txt","events.txt","technik_kiste.txt"] },
    "/school/ganztag": { type:"dir", children:["ganztag.txt","zeiten.txt","angebote.txt","pinnwand.txt"] },
    "/school/sv_buero": { type:"dir", children:["sv_buero.txt","sv_info.txt","projektliste.txt","abstimmung.txt","rucksack","schrank"] },
    "/school/musikraum": { type:"dir", children:["musikraum.txt","instrumente.txt","setlist_krizelig.txt","notenstaender.txt"] },
    "/school/kunstraum": { type:"dir", children:["kunstraum.txt","materialliste.txt","ausstellung.txt","kritzelwand.txt","kacheln.txt","schrank"] },
    "/school/chemie": { type:"dir", children:["chemie.txt","protokolle","reaktionen.txt"] },
    "/school/biologie": { type:"dir", children:["biologie.txt","proben","mikroskop.txt","pflanzen_lore.txt"] },

    "/school/veranstaltungsraum/raum.txt": { type:"file", content:
`Veranstaltungsraum (aka: „Mensa, aber im Event‑Modus“):
Tagsüber wird hier gegessen. Abends wird der Raum zur Bühne.

Du siehst:
- eine Bühne,
- ordentlich Licht,
- Stühle, die plötzlich wie aus dem Nichts auftauchen,
- und Technik, die so tut, als wäre sie nie kaputt. (Sie ist kaputt.)

Lore:
Die Schule nutzt den Raum auch für Konzerte & Aktionen – und manchmal hilft die Oberstufe beim Drumherum, um Kassen für Abschluss‑Events aufzubessern.
`},

    "/school/veranstaltungsraum/buehne.txt": { type:"file", content:
`Bühne:
Hier gelten andere Regeln:
1) Mikro nicht in den Mund stecken.
2) Kabel sind Fallen.
3) Wenn jemand „Soundcheck“ sagt, hörst du 10 Minuten lang nur „Eins‑zwei‑drei“.

Mini‑Challenge:
Finde heraus, wo die Technik-Kiste steht:
find . -name "*kiste*"
`},

    "/school/veranstaltungsraum/events.txt": { type:"file", content:
`Events (Beispiele aus dem Schulleben):
- Konzerte mit vielen Schüler*innen‑Acts (Chor, Band, Solos, offene Bühne)
- Kunst zum Angucken (z.B. Arbeiten aus einer Gestaltungsklasse)
- Aktionen, bei denen Jahrgänge Snacks & Getränke verkaufen

Hinweis:
Eintritt ist oft frei – manchmal werden Spenden für gute Zwecke gesammelt.
`},

    "/school/veranstaltungsraum/technik_kiste.txt": { type:"file", content:
`TECHNIK-KISTE (bitte nicht anfassen):
- Kabel (100x) — alle sehen gleich aus
- Gaffa Tape — Rettung der Menschheit
- Adapter — der wahre Bossfight
- 1x „Warum ist das hier?“ (Antwort: weil.)

Wenn du was lernen willst:
grep -n "Adapter" /school/veranstaltungsraum/technik_kiste.txt
`},

    "/school/ganztag/ganztag.txt": { type:"file", content:
`Ganztag:
Unterricht vorbei, aber du willst/kannst noch bleiben? Dann ist Ganztag dein Level.

Typischer Ablauf:
1) Erst mal Mittagessen.
2) Dann freiwillige Angebote/AGs.

Die Angebote wechseln – aber die Idee bleibt:
Entspannen, Sport, Kreativ‑Kram, Technik‑Zeug, Leute treffen.
`},

    "/school/ganztag/zeiten.txt": { type:"file", content:
`Zeiten (orientierend):
- Montag bis Donnerstag: nachmittags (meist 14:00–15:30)

Pro‑Tipp:
Wenn du im Spiel „Zeitdruck“ fühlst: gibt’s hier nicht.
Du kannst in Ruhe erkunden.
`},

    "/school/ganztag/angebote.txt": { type:"file", content:
`Angebote (Beispiele — kann sich ändern):
- Sportliches (z.B. Aikido / Teamsport)
- Musik & Bühne
- Kreativ (Schreiben, Foto‑Storys, Basteln)
- Presse / Medien
- Chill‑Runden mit Gesprächen, wenn der Kopf voll ist

Bash‑Miniquest:
Zähle die Bulletpoints:
grep -c "^- " /school/ganztag/angebote.txt
`},

    "/school/ganztag/pinnwand.txt": { type:"file", content:
`Pinnwand:
„Neue AG? Schreib’s auf!“
„Suche Mitspieler*innen für Schach / Uno / alles.“
„Wer hat meinen Hoodie gesehen?“

Geheimtipp:
Manchmal steht hier ein Codewort.
Heute: CODEWORT=KAKAO

Teste:
grep "CODEWORT" /school/ganztag/pinnwand.txt
`},

    
    "/school/sv_buero/rucksack": { type:"dir", children:["fach_a","fach_b","wasserflasche.txt"] },
    "/school/sv_buero/rucksack/wasserflasche.txt": { type:"file", content:"(leer)\\n" },
    "/school/sv_buero/rucksack/fach_a": { type:"dir", children:["tasche_1","tasche_2"] },
    "/school/sv_buero/rucksack/fach_a/tasche_1": { type:"dir", children:["zettel.txt","stift.txt"] },
    "/school/sv_buero/rucksack/fach_a/tasche_1/zettel.txt": { type:"file", content:"„SV = Stress-Vermeidung. (theoretisch)“\\n" },
    "/school/sv_buero/rucksack/fach_a/tasche_1/stift.txt": { type:"file", content:"(ein sehr angenagter Textmarker)\\n" },
    "/school/sv_buero/rucksack/fach_a/tasche_2": { type:"dir", children:["innen","kaugummi.txt"] },
    "/school/sv_buero/rucksack/fach_a/tasche_2/kaugummi.txt": { type:"file", content:"(klebt)\\n" },
    "/school/sv_buero/rucksack/fach_a/tasche_2/innen": { type:"dir", children:["tasche_in_tasche","Heft_Mika.txt"] },
    "/school/sv_buero/rucksack/fach_a/tasche_2/innen/tasche_in_tasche": { type:"dir", children:["ganz_klein","muenzen.txt"] },
    "/school/sv_buero/rucksack/fach_a/tasche_2/innen/tasche_in_tasche/muenzen.txt": { type:"file", content:"0,37€\\n" },
    "/school/sv_buero/rucksack/fach_a/tasche_2/innen/tasche_in_tasche/ganz_klein": { type:"dir", children:["noch_kleiner","bon.txt"] },
    "/school/sv_buero/rucksack/fach_a/tasche_2/innen/tasche_in_tasche/ganz_klein/bon.txt": { type:"file", content:"Beleg: 1x Apfelschorle\\n" },
    "/school/sv_buero/rucksack/fach_a/tasche_2/innen/tasche_in_tasche/ganz_klein/noch_kleiner": { type:"dir", children:["fast_da.txt"] },
    "/school/sv_buero/rucksack/fach_a/tasche_2/innen/tasche_in_tasche/ganz_klein/noch_kleiner/fast_da.txt": { type:"file", content:"Wenn du das liest, bist du zu tief drin.\\n" },
    "/school/sv_buero/rucksack/fach_a/tasche_2/innen/Heft_Mika.txt": { type:"file", content:
`HEFT: Mika (SV)
Thema: „Wie überlebe ich Montags?“

Notizen:
- ToDo: Plakat aufhängen
- ToDo: Lehrkraft fragen (aber welche?)
- Wichtig: Heft NICHT verlieren. (too late)

Codewort: MIKA-HEFT-OK
` },

    "/school/sv_buero/schrank": { type:"dir", children:["fach_1","fach_2","fach_3"] },
    "/school/sv_buero/schrank/fach_1": { type:"dir", children:["plakate"] },
    "/school/sv_buero/schrank/fach_1/plakate": { type:"dir", children:["poster_sv.txt","poster_aktion.txt"] },
    "/school/sv_buero/schrank/fach_1/plakate/poster_sv.txt": { type:"file", content:"SV: Wir machen Dinge. Manchmal.\\n" },
    "/school/sv_buero/schrank/fach_1/plakate/poster_aktion.txt": { type:"file", content:"Aktion: „Saubere Schule“ (bitte keine Kabel anfassen)\\n" },
    "/school/sv_buero/schrank/fach_2": { type:"dir", children:["kiste"] },
    "/school/sv_buero/schrank/fach_2/kiste": { type:"dir", children:["alt.txt","liste.txt"] },
    "/school/sv_buero/schrank/fach_2/kiste/alt.txt": { type:"file", content:"(alter Kram)\\n" },
    "/school/sv_buero/schrank/fach_2/kiste/liste.txt": { type:"file", content:"Checkliste: 1) reden  2) handeln  3) wieder reden\\n" },
    "/school/sv_buero/schrank/fach_3": { type:"dir", children:["snacks.txt"] },
    "/school/sv_buero/schrank/fach_3/snacks.txt": { type:"file", content:"(leer – natürlich)\\n" },
"/school/sv_buero/sv_buero.txt": { type:"file", content:
`SV‑Büro:
Hier wird diskutiert, geplant, gelacht – und manchmal auch gestritten (aber fair).

Auf dem Tisch:
- Protokolle
- Plakate
- ein Zettel: „Wir wollen Dinge verbessern, nicht nur meckern.“
`},

    "/school/sv_buero/sv_info.txt": { type:"file", content:
`Schülervertretung (SV) — Kurzinfo:
- Es gibt sie an der Schule schon sehr lange (seit den 1980ern).
- Vertreter*innen treffen sich mehrmals im Jahr (oft in der Mensa).
- Die eigentliche Arbeit läuft in Projektgruppen: Aktionen, Ideen, Mitbestimmung.

Bash‑Tipp:
Wenn du Infos schnell brauchst:
grep -i "projekt" sv_info.txt
`},

    "/school/sv_buero/projektliste.txt": { type:"file", content:
`Projektliste (Beispiele):
- Nachhaltigkeit: Sammelaktionen (z.B. Elektroschrott)
- Schulhof‑Ideen: Sitzplätze, Spiele, Turniere
- Events: Basar, Motto‑Tage, Spendenaktionen

Mini‑Challenge:
Welche Zeile hat „Basar“?
grep -n "Basar" /school/sv_buero/projektliste.txt
`},

    "/school/sv_buero/abstimmung.txt": { type:"file", content:
`Abstimmung (Testlauf):
Frage: „Mehr Sitzplätze im Hof?“
Optionen: JA / JA, ABER MIT ÜBERDACHUNG / BITTE 2x JA

Hinweis:
Das ist nur Deko‑Lore — aber du kannst die Datei kopieren:
cp /school/sv_buero/abstimmung.txt ~/backpack/
`},

    "/school/musikraum/musikraum.txt": { type:"file", content:
`Musikraum:
Hier ist es nie richtig still. Selbst wenn niemand spielt, summt irgendwo ein Verstärker.

An der Wand hängt eine Liste, was es so gibt:
Singen, Gitarre, Schlagzeug, Klavier, Bläser, Bands…

Und ja: viele Auftritte landen später im großen Veranstaltungsraum.
`},

    "/school/musikraum/instrumente.txt": { type:"file", content:
`Instrumente (nicht vollständig, aber laut):
- Gitarren (ein paar sind verstimmt — Tradition)
- Keyboard
- Schlagzeug (bitte Ohren schützen)
- Bläserkoffer (sehen harmlos aus, sind aber schwer)

Bash‑Miniquest:
Finde das Wort „Keyboard“:
grep -n "Keyboard" /school/musikraum/instrumente.txt
`},

    "/school/musikraum/setlist_krizelig.txt": { type:"file", content:
`Setlist (krisselig, vielleicht von einer Probe):
1) Warm‑up
2) Ein Lied, das alle kennen
3) Ein Lied, das niemand kennt (aber die Band liebt)
4) Finale, bei dem alle klatschen müssen

Tipp:
Wenn du im Terminal Ordnung willst:
sort /school/musikraum/setlist_krizelig.txt
`},

    "/school/musikraum/notenstaender.txt": { type:"file", content:
`Notenständer:
Sie stehen IMMER im Weg.
Das ist ihr Job.

Wenn du eins verschiebst, tauchen zwei neue auf.
`},

    
    "/school/kunstraum/schrank": { type:"dir", children:["leinen","farben","._note.txt"] },
    "/school/kunstraum/schrank/._note.txt": { type:"file", content:"(Frau Frech: 'Nicht alles ist zum Anfassen. Aber vieles zum Finden.')\\n" },
    "/school/kunstraum/schrank/leinen": { type:"dir", children:["leinwand_1.txt","leinwand_2.txt",".skizze.txt"] },
    "/school/kunstraum/schrank/leinen/leinwand_1.txt": { type:"file", content:"(blank)\\n" },
    "/school/kunstraum/schrank/leinen/leinwand_2.txt": { type:"file", content:"(blank)\\n" },
    "/school/kunstraum/schrank/leinen/.skizze.txt": { type:"file", content:
`  .-.
 (o o)  geheim
  |=|
 __|__
//===\\
||   ||
||   ||   ASCII-Skizze (Frech)
`},
    "/school/kunstraum/schrank/farben": { type:"dir", children:["rot.txt","blau.txt","gelb.txt"] },
    "/school/kunstraum/schrank/farben/rot.txt": { type:"file", content:"(rot)\\n" },
    "/school/kunstraum/schrank/farben/blau.txt": { type:"file", content:"(blau)\\n" },
    "/school/kunstraum/schrank/farben/gelb.txt": { type:"file", content:"(gelb)\\n" },
"/school/kunstraum/kunstraum.txt": { type:"file", content:
`Kunstraum:
Überall Farbe, Papier, Ton, Kleber — und dieser Geruch von „Projekt kurz vor Abgabe“.

Manchmal werden Arbeiten bei Schulveranstaltungen ausgestellt.
Wenn du genau hinschaust, entdeckst du sogar Bash‑Memes in Collagen.
`},
    "/school/kunstraum/kacheln.txt": { type:"file", content:
`Kachel‑Notiz:
FUGENMIX: STEINGRAU-7
`},

    "/school/kunstraum/materialliste.txt": { type:"file", content:
`Materialliste:
- Papier
- Pinsel
- Farbe
- Ton
- Kleber
- Schere
- 1x Geduld

Mini‑Challenge:
Zähle die Materialien:
grep -c "^- " /school/kunstraum/materialliste.txt
`},

    "/school/kunstraum/ausstellung.txt": { type:"file", content:
`Ausstellung:
„Bitte nichts anfassen.“
„Doch, gucken darfst du.“
„Und wenn du was nicht verstehst: Das ist Kunst.“

Pro‑Tipp:
Kunst und Code haben was gemeinsam:
Manchmal sieht’s erst nach Chaos aus – und dann macht’s Klick.
`},

    "/school/kunstraum/kritzelwand.txt": { type:"file", content:
`Kritzelwand (legal!):
Hier dürfen alle.
Jemand hat geschrieben:

"grep ist meine Brille."
"find ist mein GPS."
"rm ist mein Drama."

(Alle nicken.)
`},

    
    "/school/chemie/protokolle": { type:"dir", children:["sicherheit.txt","versuch_1.txt","versuch_2.txt"] },
    "/school/chemie/protokolle/sicherheit.txt": { type:"file", content:
`Chemie-Sicherheit (Kurz):
- Schutzbrille auf.
- Keine Experimente ohne Aufsicht.
- Bei Unfällen: sofort melden.
- Wichtig: AUGENDUSCHE ist rechts neben dem Waschbecken.
- Handschuhe tragen, wenn's nötig ist.

Notiz (Krämer):
„Sicherheit ist keine Option – das ist Default.“`
    },
    "/school/chemie/protokolle/versuch_1.txt": { type:"file", content:"Versuch 1: Salz in Wasser (spoiler: löst sich)\\n" },
    "/school/chemie/protokolle/versuch_2.txt": { type:"file", content:"Versuch 2: Indikator-Farben (sieht cool aus)\\n" },
"/school/chemie/chemie.txt": { type:"file", content:
`Chemie:
Flaschen, Formeln, und ein Schrank mit dem Schild: „Nur mit Aufsicht“.

Hier lernst du:
- Warum „mischen“ nicht immer „cool“ ist
- Warum Schutzbrille kein Fashion‑Fail ist
- Und dass sauberes Arbeiten OP ist.

Bash‑Miniquest:
Suche nach dem Wort „Aufsicht“:
grep -n "Aufsicht" /school/chemie/chemie.txt
`},

    "/school/chemie/sicherheit.txt": { type:"file", content:
`Sicherheit:
1) Schutzbrille
2) Haare zusammen
3) Nicht essen, was nach Experiment aussieht
4) Wenn’s piept: Fragen, nicht rennen.

Easter:
chmod +x ist für Dateien.
Schutzbrille ist für dich.
`},

    "/school/chemie/reaktionen.txt": { type:"file", content:
`Reaktionen:
Manchmal passiert was sofort.
Manchmal dauert’s.
Und manchmal steht man da und denkt: "Warum ist es GRÜN?"

Das ist normal.
`},

    
    "/school/biologie/proben": { type:"dir", children:["probe_a.txt","probe_b.txt","probe_c.txt","probe_d.txt","probe_e.txt"] },
    "/school/biologie/proben/probe_a.txt": { type:"file", content:"Probe A: Blattzellen (unauffällig)\\n" },
    "/school/biologie/proben/probe_b.txt": { type:"file", content:"Probe B: Zwiebelhaut (klassisch)\\n" },
    "/school/biologie/proben/probe_c.txt": { type:"file", content:"Probe C: ???\nHinweis: DNA42\n" },
    "/school/biologie/proben/probe_d.txt": { type:"file", content:"Probe D: Bakterien (bitte nicht anfassen)\\n" },
    "/school/biologie/proben/probe_e.txt": { type:"file", content:"Probe E: Moos (sieht süß aus)\\n" },
"/school/biologie/biologie.txt": { type:"file", content:
`Biologie:
Mikroskope, Modelle, und irgendwo liegt immer ein Blatt, das „bestimmt fürs Protokoll“ ist.

Hier geht’s um:
- Leben in klein
- Körper in groß
- und warum Pflanzen hart im Nehmen sind.
`},

    "/school/biologie/mikroskop.txt": { type:"file", content:
`Mikroskop:
Wenn du einmal scharf gestellt hast, bist du offiziell Level‑Up.

Mini‑Challenge:
Finde das Wort „scharf“:
grep -i "scharf" /school/biologie/mikroskop.txt
`},

    "/school/biologie/pflanzen_lore.txt": { type:"file", content:
`Pflanzen‑Lore:
Pflanzen sind basically Solar‑Power‑Engineers.
Und sie beschweren sich nie. (Okay, außer wenn sie hängen.)

Wenn du willst, mach einen Vergleich:
diff /school/biologie/pflanzen_lore.txt /school/chemie/reaktionen.txt
`},

    "/server_gate": { type:"dir", children:["gate.txt"] },

    "/arena": { type:"dir", children:["welcome.txt","quests.txt","npc.txt"] },
    "/patchbay": { type:"dir", children:["patchbay.txt","frag_1.log","frag_3.pipe","assemble.txt"] },

    "/network": { type:"dir", children:["net.txt","logs","cache"] },
    "/network/logs": { type:"dir", children:["auth.log","update.log"] },
    "/network/cache": { type:"dir", children:["tmp.bin","readme_cache.txt"] },

    "/boss": { type:"dir", children:["README_BOSS.txt","patchlord.sh","patchlord.rules","loot.txt"] },

    "/home/player/readme.txt": { type:"file", content:
`SchwarmShell

Du steuerst alles mit Bash-Befehlen (Englisch).
Phase 1 (Tutorial):
- Orientierung, Terminal, erste Befehle
- Bewegen mit cd: 
  cd ordnername geht in einen Unterordner,
  cd .. geht eine Ebene zurück,
  cd / springt zum Startverzeichnis.
- Umschauen mit ls: zeigt dir, was im aktuellen Ordner liegt.
- Lesen mit cat datei.txt: zeigt den Inhalt einer Datei.
- Unterschied im Spiel:
  Ordner enthalten weitere Orte/Objekte (du kannst mit cd hinein),
  Dateien enthalten Infos, Hinweise oder Questtexte (du liest sie mit cat).

Phase 2 (Schule & Quests):
- Klassen, Lehrer, Hinweise
- Kombiniere Befehle, um weiterzukommen

Phase 3 (Server & Gate):
- Logs, Keycards, Zugriff
- Ein Fehler kann alles blockieren

Phase 4 (Mentor):
- Fortgeschrittene Systeme
- Verantwortung statt Button-Mashing

Hinweis:
Nicht jede Story steht auf dem Questboard.
Manche Dinge sind… verborgen.
Augen auf, Logs lesen, Fragen stellen.

Tipp:
help   → verfügbare Befehle
quests → aktuelle Ziele
talk <name> → NPCs

Viel Glück.
Wissen ist Macht.
`},

    "/home/player/notizen.txt": { type:"file", content:
`Notizen (aka Brain RAM):
- pwd: wo bin ich?
- ls: was liegt hier?
- cd: movement (wie WASD, nur nerdiger)
- cat: lesen
- grep: suchen (wie STRG+F, aber cooler)
- echo > / >>: schreiben / anhängen (z.B. Notizen)
- find: versteckte Sachen aufspüren
- chmod: Rechte (für ./script)

Wenn du dich verlaufen hast:
cd /   (Wurzel)  oder  cd ~   (Home)`},

    "/home/player/backpack/snack.txt": { type:"file", content:
`Loot: Müsliriegel
Buff: +1 Fokus
Nerf: Krümel überall (rip)`},

    "/home/player/workbench/README_WORKBENCH.txt": { type:"file", content:
`Workbench (Crafting-Spot):
Hier darfst du Dateien/Ordner erstellen und verändern.

Phase 2:
mkdir ~/workbench/patches
touch ~/workbench/patches/frag2.txt
cat ~/workbench/patches/frag2.txt

Phase 3:
cp /boss/patchlord.sh ~/workbench/patchlord.sh
echo "..."; chmod +x; ./patchlord.sh ...`},

    "/school/flur.txt": { type:"file", content:
`KGS Schwarmstedt — Flur.
Heute ist alles so perfekt gerendert, dass es schon wieder sus ist.

An der Wand hängt ein Pixel-Poster:
"Tutorial Route -> PC-Raum"

Wegweiser (halb richtig, halb Meme):
- Mensa:            cd /school/mensa
- Veranstaltungsraum: cd /school/veranstaltungsraum
- Ganztag:          cd /school/ganztag
- SV-Büro:          cd /school/sv_buero
- Musikraum:        cd /school/musikraum
- Kunstraum:        cd /school/kunstraum
- Chemie/Bio:       cd /school/chemie  |  cd /school/biologie

Neben der Mensa ist eine Tür mit Schild:
"LEHRERZIMMER — NUR PERSONAL".
Du kannst natürlich trotzdem reingucken:
cd /school/lehrerzimmer

Wenn du lost bist:
cd /school/pcraum
ls
cat keycard.txt`},

    "/school/mensa/menu.txt": { type:"file", content:
`Mensa-Menu (heute):
- Patchday-Pasta 🍝
- Speedrun-Salat 🥗
- No-Lag Kakao ☕ (angeblich)`},

    "/school/mensa/quest.txt": { type:"file", content:
`Quest-Karte (Mensa Edition):
Wenn du Phase 2 willst: cd /arena (Questboard).
Wenn du Phase 1 noch machst: erstmal keycard holen.

Snack-Automat sagt außerdem:
"grep ist dein Scanner. und echo >> ist dein Notizblock."`},

    "/school/mensa/vending_hint.txt": { type:"file", content:
`Snack-Automat (NPC):
"Wenn du in vielen Zeilen suchst: grep
Wenn du genauer suchen willst: grep -n (mit Zeilennummer)
Wenn du was verstecktes finden willst: find"

Automat ist 100% main character heute.`},

    "/school/pcraum/hint.txt": { type:"file", content:
`PC-Raum Hint (Tutorial):
- ls
- cd ..
- cat <datei>

Bonus-Lore:
- ls Schul-PC
- cat Schul-PC/iserv-glitch.txt

Phase 2/3:
- grep [-n] <pattern> <file>
- grep: grep <pattern> <file>   (z.B. grep SIGNAL frag_3.pipe)
- find <path> -name <pattern>`},

    "/school/pcraum/keycard.txt": { type:"file", content:
`KEYCARD: SCHWARM-ALPHA-7

Du hältst die Karte. Sie fühlt sich an wie ein Legendary Drop.
Bring sie zum /server_gate.

(ja, das ist cringe. aber es ist auch maximal effektiv.)`},

    "/school/pcraum/glitchmap.txt": { type:"file", content:
`GLITCHMAP:
- /server_gate  = Boss-Tür (Phase 1)
- /arena        = Hub (Phase 2)
- /patchbay     = Patch-Werkstatt (Phase 2)
- /boss         = Final Boss (Phase 3)
- /network      = Logs & versteckte Hinweise (Phase 3)

Gerücht:
Im DigitalLab hängt ein Mentor-NPC rum. talk semrau`},

    "/school/pcraum/Schul-PC/boot.txt": { type:"file", content:
`[BOOT/Schul-PC]
> iServ-Client startet... ok
> Sync-Thread: ERROR (checksum drift)
> Anzeige: „Glitch detected“

Ein alter Schul-PC wirkt, als wäre er halb im iServ‑Server „eingeloggt“.
Die Pixel flackern wie kaputte Texturen.
Vielleicht liegt hier der Ursprung vom iServ‑Glitch.`},

    "/school/pcraum/Schul-PC/iserv-glitch.txt": { type:"file", content:
`iSERV CORE DUMP (fragmentiert):
>>> line 42: PATCHBAY-ROUTER??? [OK]
>>> arena handshake: pending...
>>> "Fragmente" erkannt: 3 Slots (F1, F2, F3)
>>> BUGSIGNAL: "PATCHLORD" (phase 3?)  // keep eyes open

Die Datei wirkt wie ein halb kaputter Logauszug.
Du hast das Gefühl, der Glitch ist größer als der PC‑Raum.
Vielleicht steckt hier der Weg in Phase 2 und 3.`},

    "/school/digitallab/digitallab.txt": { type:"file", content:
`DigitalLab:
LEDs blinken wie ein RGB-Keyboard auf Energy-Drink.
Du spürst: hier passiert "Build Stuff".

Tipp:
cat craft_hint.txt`},

    "/school/digitallab/craft_hint.txt": { type:"file", content:
`FRAG2 Craft Hint:
Du musst selbst einen Ordner und eine Datei bauen:

mkdir ~/workbench/patches
touch ~/workbench/patches/frag2.txt
cat ~/workbench/patches/frag2.txt

Das ist wie Minecraft, nur mit Ordnern. 🧱`},

    "/school/sekretariat/sekretariat.txt": { type:"file", content:
`Sekretariat:
Druckergeräusche, Ordner, und diese Aura von:
"Wir machen hier keine Fax-Memes, wir sind das Fax."

Wenn du Hilfe willst: talk harries
(und ja, Ticket-Quest ist real.)`},


    "/school/sekretariat/zeugnis.txt": { type:"file", content:
`ZEUGNIS-DRUCK (Status):
❌ Offline — Systemfehler (Glitch)

Hinweis:
Wegen des Glitches können aktuell keine Zeugnisse gedruckt werden.
Wenn das System wieder stabil ist, kannst du dein Zeugnis im Sekretariat abholen:
talk harries  /  talk pietsch`},

    "/school/sekretariat/zeugnis_beta.txt": { type:"file", content:
`(Noch kein Zeugnis gedruckt.)`},

    "/school/sekretariat/zeugnis_final.txt": { type:"file", content:
`(Noch kein finales Zeugnis gedruckt.)`},

    "/school/sekretariat/ticket.txt": { type:"file", content:
`Ticket Quest (optional Loot):
Erstelle im Workbench eine Datei ticket.md und schreib rein:

echo "Subject: Reality Patch" > ~/workbench/ticket.md
echo "Body: Help, ich stecke legit in einem Game." >> ~/workbench/ticket.md

Dann: talk harries`},

    "/school/beratung/beratung.txt": { type:"file", content:
`Beratung / Safe Room:
Dieser Raum fühlt sich an wie ein Savepoint.
Kein Neon, kein HUD, nur: kurz Ruhe.

Wenn du willst:
talk jeske  (Soziales Lernen)
talk biringer  (Sozialarbeit)

Das Spiel ist funny — aber du musst nicht alles alleine carryen.`},

    "/school/beratung/motto.txt": { type:"file", content:
`Motto:
"Du musst nicht solo-queuen."`},

    "/school/beratung/casefile.txt": { type:"file", content:
`CASEFILE: Glitch-Symptome
- Sounds aus ausgeschalteten Geräten (???)
- UI-Elemente an Wänden
- Zeit fühlt sich wie Cutscene-Loop an

Reality-Patch hilft (Phase 2).
Patchlord besiegen hilft (Phase 3).`},

    
    "/school/bibliothek/abgabe": { type:"dir", children:["aufsatz_final(2).txt","aufsatz_final_neu.txt","literatur.txt","README.txt"] },
    "/school/bibliothek/abgabe/README.txt": { type:"file", content:
`Abgabe-Ordner (chaotisch):
Hier landen Dateien, bevor sie in die richtige Struktur kommen.
Wenn du Ordnung reinbringst, ist das basically Magie.`},
    "/school/bibliothek/abgabe/aufsatz_final(2).txt": { type:"file", content:"(Version 2) Thema: Schulhof-Mythen\\n" },
    "/school/bibliothek/abgabe/aufsatz_final_neu.txt": { type:"file", content:"(Neu) Thema: Schulhof-Mythen\\n" },
    "/school/bibliothek/abgabe/literatur.txt": { type:"file", content:"Quellen: 1) irgendwas 2) Wikipedia (bitte nicht)\\n" },
"/school/bibliothek/bibliothek.txt": { type:"file", content:
`Bibliothek:
Wie ein Wiki-Tab, der nie zugeht.
Lore incoming. cat lore.txt`},

    "/school/bibliothek/index.txt": { type:"file", content:
`INDEX:
- lore.txt
- secret_shelf/ (sus)
Tipp: find /school/bibliothek -name "*.txt"`},

    "/school/bibliothek/lore.txt": { type:"file", content:
`LORE (kurz):
Irgendwer wollte Schule gamifizieren: Quests, Badges, Level.
Eigentlich wholesome.

Dann kam ein Update.
Und das Update wurde… too much.
Kontrolle statt Motivation. Big yikes.

Reality-Patch = Exit.
Patchlord = das Update selbst, als Boss.`},

    "/school/bibliothek/secret_shelf/spoiler.txt": { type:"file", content:
`SPOILER:
Phase 3 ist ein Bossfight mit einem Script.
Du brauchst chmod +x und ./script.

Wenn du das liest, bist du offiziell "Lore Goblin".`},

    "/school/bibliothek/secret_shelf/sus_note.txt": { type:"file", content:
`Die Notiz ist komplett sus:
"PATCHLORD hides in /boss.
But first: find the rules."

Okay… danke, geheimnisvolle Person.`},

    "/school/turnhalle/turnhalle.txt": { type:"file", content:
`Turnhalle:
Hier zählt Timing.
Und ja: auch Nerds brauchen Bewegung. 😤`},

    "/school/turnhalle/scoreboard.txt": { type:"file", content:
`SCOREBOARD:
- Sprint: 8.2s
- Plank: 2:10
- Bash-Speedrun (ls/cd/cat): 00:12
- "Rizz%" (unbekannt): 100%

Wer hat das bitte eingetragen 💀`},

    "/school/hof/hof.txt": { type:"file", content:
`Schulhof:
Wind. Stimmen. Und irgendwo ein Ball, der IMMER in den Baum fliegt.

Heute: ein Popup über dem Baum:
"Ping the world."`},

    "/school/hof/ping.txt": { type:"file", content:
`Ping ist kein echter Befehl hier (Phase 4 maybe),
aber die Message ist:
Check die Logs, wenn was nicht läuft.

-> /network/logs`},




    "/server_gate/gate.txt": { type:"file", content:
`SERVER-GATE PROTOKOLL
1) Lies keycard.txt im PC-Raum
2) Dann tippe am Gate:
   unlock SCHWARM-ALPHA-7

Ja, es ist cringe.
Aber cringe ist manchmal der Preis für den Win.`},

    "/arena/welcome.txt": { type:"file", content:
`Willkommen in der SchwarmShell Arena (Hub).
Hier bekommst du Quests und NPCs.

Tipp:
cat quests.txt
talk ommen`},

    "/arena/quests.txt": { type:"file", content:
`Questboard (Phase 2):
- Fragment #1: grep FRAG1_TOKEN /patchbay/frag_1.log
- Fragment #2: mkdir+touch in ~/workbench (siehe README_WORKBENCH.txt)
- Fragment #3: grep SIGNAL /patchbay/frag_3.pipe
Dann: assemble`},

    "/arena/npc.txt": { type:"file", content:
`NPCs (IDs):
talk ommen
talk semrau
talk fischer
talk remmers
talk steinbeck
talk frech
talk woehler
talk kretzer
talk kraemer
talk religa
talk jeske
talk harries
talk pietsch
talk sauer
talk kleineborgmann
talk peper
talk grams
talk schulz
talk biringer`},

    "/patchbay/patchbay.txt": { type:"file", content:
`PATCHBAY:
Hier findest du Fragmente.

Frag1: grep FRAG1_TOKEN frag_1.log
Frag3: grep SIGNAL frag_3.pipe

Frag2 baust du selbst im Workbench:
mkdir ~/workbench/patches
touch ~/workbench/patches/frag2.txt
cat ~/workbench/patches/frag2.txt`},

    "/patchbay/frag_1.log": { type:"file", content:
`[00:00] Loading…
[00:01] Loading…
[00:02] Someone hid the token in plain sight.
[00:03] FRAG1_TOKEN=PIXEL-SPAWN-42
[00:04] If you found it, you used grep. Nice.`},

    "/patchbay/frag_3.pipe": { type:"file", content:
`NOISE
NOISE
SIGNAL: FRAG3=NEON-PIPE-7
NOISE
Hint: nutze grep direkt:
grep SIGNAL frag_3.pipe`},

    "/patchbay/assemble.txt": { type:"file", content:
`ASSEMBLE:
Wenn du alle 3 Fragmente hast: assemble`},

    "/network/net.txt": { type:"file", content:
`NETWORK:
Hier liegen Logs über den Gamification-Layer.

Tipp:
find /network -name "*.log"
grep -n "PATCHLORD" /network/logs/update.log`},

    "/network/logs/auth.log": { type:"file", content:
`[07:59] login ok
[08:00] WARNING: gamification layer detected
[08:01] user=student selected
[08:02] hint: look for PATCHLORD in update.log`},

    "/network/logs/update.log": { type:"file", content:
`[08:05] update: installing "Patchlord.exe" (why??)
[08:06] PATCHLORD: moved to /boss/patchlord.sh
[08:07] note: script is not executable (yet)
[08:08] note: bug on line 7 (lol)
[08:09] hint: rules in /boss/patchlord.rules`},

    "/network/cache/tmp.bin": { type:"file", content: "0101001010010101 (cursed)" },
    "/network/cache/readme_cache.txt": { type:"file", content:
`Cache:
Wenn du das liest, bist du wirklich deep in den Ordnern.
Respekt. Aber auch: geh schlafen. 😭`},

    "/boss/README_BOSS.txt": { type:"file", content:
`FINAL BOSS: Patchlord (Script)

Deine Mission:
1) find /boss -name "patchlord*"
2) grep -n "BUG" /boss/patchlord.sh
3) Kopiere das Script in deinen Workbench
4) Fix es mit echo >> (kein Editor nötig)
5) chmod +x
6) ./patchlord.sh <FRAG1> <FRAG2> <FRAG3>

Wenn du gewinnst:
Game-Layer wird permanent deaktiviert.
GG EZ (aber du hast es dir verdient).`},

    "/boss/patchlord.rules": { type:"file", content:
`PATCHLORD RULES (no cheating, pls):
- Script muss in ~/workbench liegen (du bist der Main Character)
- Script muss diese Zeile enthalten:
  echo "PATCH_APPLIED"
- Und es muss FRAG1/2/3 als Argumente checken.

Pro-Move:
grep -n BUG /boss/patchlord.sh`},

    "/boss/patchlord.sh": { type:"file", content:
`#!/bin/bash
echo "PATCHLORD ONLINE"
echo "Input check..."

# BUG: line 7 is missing the patch apply line.
# TODO: echo "PATCH_APPLIED"

if [ "$1" = "PIXEL-SPAWN-42" ] && [ "$2" = "CRAFTED-DIR-99" ] && [ "$3" = "NEON-PIPE-7" ]; then
  echo "WEAKNESS FOUND"
  echo "Patchlord: *dies in 8-bit sound*"
else
  echo "NOPE. Wrong tokens. Try again."
fi`},

    "/boss/loot.txt": { type:"file", content:
`LOOT TABLE:
- Badge: Reality Slayer
- Title: "Shell Sorcerer"
- +10 Selbstbewusstsein (Stackt!)`},

    "/mentor_hub": { type:"dir", children:["welcome.txt","quests.txt","students.txt","support","logs","arena2"] },
    "/mentor_hub/support": { type:"dir", children:["mentor_tip.txt"] },
    "/mentor_hub/logs": { type:"dir", children:["lag.log","student_noah.log","student_emma.log","student_leo.log"] },
    "/mentor_hub/arena2": { type:"dir", children:["score.txt","patchnotes.txt"] },

    "/mentor_hub/welcome.txt": { type:"file", content:
`MENTOR ARC — Phase 4

GG, Patchlord ist down. Aber jetzt kommt der Plot-Twist:
Die Schule hat den Game-Layer als Trainings-Simulation für alle aktiviert.

Du bist nicht mehr nur Spieler*in.
Du bist jetzt: Mentor.

Ziel:
Hilf 3 Schüler-NPCs (Noah, Emma, Leo), die im Terminal komplett am struggeln sind.

Start:
cat quests.txt
talk ommen
talk noah`},

    "/mentor_hub/quests.txt": { type:"file", content:
`Questboard (Phase 4 · Multiplayer/Mentor):

1) Lag-Fix für Noah:
   ps
   top
   kill <PID von rgbd>

2) History-Detective für Emma:
   history
   talk emma

3) QoL-Alias für Leo:
   alias ll="ls -l"
   ll
   talk leo

Wenn du alle 3 geholfen hast:
mentor_clear`},

    "/mentor_hub/students.txt": { type:"file", content:
`Squad (NPC Students):
- Noah (noah): "Mein Terminal laggt wie 2012 WLAN 😭"
- Emma (emma): "Ich hab was gemacht und jetzt ist alles kaputt??"
- Leo  (leo):  "Kann man das schneller machen? Ich will Speedrun-Vibes."

Talk:
talk noah
talk emma
talk leo`},

    "/mentor_hub/support/mentor_tip.txt": { type:"file", content:
`Mentor-Tipps:
- Sag nicht "Skill issue" (okay, manchmal schon, aber nett).
- Lass sie selbst tippen, du gibst nur Hinweise.
- Bash ist wie Gaming: erst Mechanics, dann Game Sense.`},


    // --- PHASE 5: Arbeitsamt & Real-Life ---
    "/arbeitsamt": { type:"dir", children:["start.txt","tickets.txt","jobangebot.txt"] },
    "/arbeitsamt/start.txt": { type:"file", content:
`ARBEITSAMT (Bürokratie DLC) — Phase 5

Wenn du hier bist, hast du das Finale durch.
Jetzt kommt der echte Endboss: Real Life.

Start:
talk beamter

Hinweis:
Alle Firmen-Quests sind unter /real_life/.
Du wirst Bash-Skills aus Phase 1–4 brauchen.
`},
    "/arbeitsamt/tickets.txt": { type:"file", content:
`Wartemarken-System:
001  „Job?"
002  „Noch mehr Formulare"
003  „...warum sind Drucker immer laut?"

Pro-Tipp:
Wenn du jemanden fragst, bekommst du meistens ... eine neue Aufgabe.
`},
    "/arbeitsamt/jobangebot.txt": { type:"file", content:
`(leer)
`},

    "/real_life": { type:"dir", children:["snackmaster","ars_recycling","ohlendorf_technik","berndt_moebel","cms","README.txt"] },
    "/real_life/README.txt": { type:"file", content:
`REAL LIFE (Schwarmstedt & Umgebung)

Hier ist nix mehr mit "Quest-Board in der Arena".
Hier sind Firmen. Und echte Probleme.

Ordner:
- snackmaster
- ars_recycling
- ohlendorf_technik
- berndt_moebel
- cms

Tipp:
Lies pro Firma: cat quest.txt  und sprich die Person dort an.
`},

    // SNACKMASTER
    "/real_life/snackmaster": { type:"dir", children:["quest.txt","haccp_audit.log","scanner_hint.txt"] },
    "/real_life/snackmaster/quest.txt": { type:"file", content:
`SNACKMASTER — Auftrag

Problem:
In der HACCP-Prüfung fehlt die richtige Allergene-Zeile.

Dein Move:
Finde im Audit-Log den Abschnitt, in dem die Allergene erwähnt werden.

Wenn du die richtige Zeile findest, steht da ein eindeutiger Marker.
Dann: talk jansen
`},
    "/real_life/snackmaster/scanner_hint.txt": { type:"file", content:
`Scanner sagt: "Ich weiß nur: irgendwo steht was zu Allergenen… aber ich hab vergessen, wo genau."`},
    "/real_life/snackmaster/haccp_audit.log": { type:"file", content:
`[08:01] Linie A: Temp OK
[08:02] Linie B: Temp OK
[08:03] Checkliste: Verpackung OK
[08:04] Checkliste: Handschuhe OK
[08:05] ALLERGENE: MILCH, GLUTEN, EI  (OK:JOB_SNACKMASTER)
[08:06] Notiz: "Bitte nicht wieder das falsche Etikett"
[08:07] Linie A: Temp OK
`},

    // A-R-S Recycling
    "/real_life/ars_recycling": { type:"dir", children:["quest.txt","docs","containerlist.txt","platzplan.txt"] },
    "/real_life/ars_recycling/docs": { type:"dir", children:["abholplan_2026.csv","hinweis.txt"] },
    "/real_life/ars_recycling/quest.txt": { type:"file", content:
`A‑R‑S Recycling — Auftrag

Problem:
Der Abholplan ist irgendwo in den Unterlagen, und Frau Wiebe braucht ihn in deiner Workbench.

Dein Move:
- Finde die Datei (der Name steht irgendwo hier im Ordner).
- Lege eine Kopie in ~/workbench/ars/ ab (Ordner ggf. anlegen).

Wenn der Plan in deiner Workbench liegt: talk wiebe
`},
    "/real_life/ars_recycling/containerlist.txt": { type:"file", content:
`Containerliste:
- Papier
- Bio
- Rest
- Metall

Wenn die Datei weg ist: alles Chaos.`},
    "/real_life/ars_recycling/platzplan.txt": { type:"file", content:
`Hofplan (Altbau):
Stellplätze A-D = Container
Stellplatz E = Materiallager

Randnotiz:
DACHCODE: RINNE-R3
`},
    "/real_life/ars_recycling/docs/hinweis.txt": { type:"file", content:
`Hinweis:
Wenn kopieren nicht klappt, fehlt oft nur ein Ordner in deiner Workbench.
(Workflows: erst Ordner anlegen, dann Datei ablegen.)`},
    "/real_life/ars_recycling/docs/abholplan_2026.csv": { type:"file", content:
`Woche,Route,Start
1,Schwarmstedt,06:00
2,Gilten,06:00
3,Essel,06:00
4,Bothmer,06:00
`},

    // Ohlendorf-Technik
    "/real_life/ohlendorf_technik": { type:"dir", children:["quest.txt","ticket_net.txt"] },
    "/real_life/ohlendorf_technik/quest.txt": { type:"file", content:
`Ohlendorf‑Technik — Auftrag

Problem:
Ein Support‑Ticket darf nicht einfach so gelesen werden – erst wenn die Rechte stimmen.

Dein Move:
- Hol dir das Ticket in deine Workbench.
- Stell sicher, dass du es dort lesen darfst.
- Lies den Token und bring ihn zu Neele.

Wenn du den Token hast: talk neele
`},
    "/real_life/ohlendorf_technik/ticket_net.txt": { type:"file", content:
`TICKET: VLAN-

Wenn du das lesen kannst, hast du die Rechte gefixt.
TOKEN: JOB_OHLENDORF_OK
`},

    // Arthur Berndt Möbelfabrik
    "/real_life/berndt_moebel": { type:"dir", children:["quest.txt","produktion.txt"] },
    "/real_life/berndt_moebel/quest.txt": { type:"file", content:
`Arthur Berndt — Auftrag

Problem:
Ein Prozess frisst CPU wie ein Staubsauger. Produktion ist laggy.

Dein Move:
Schau dir laufende Prozesse an und finde den Übeltäter. Wenn du ihn eindeutig identifiziert hast: beenden.

Wenn es wieder flüssig läuft: talk tom
`},
    "/real_life/berndt_moebel/produktion.txt": { type:"file", content:
`Produktion:
Wenn der Rechner hängt, hängt halt ... alles.

Kleiner Tipp:
Es gibt Commands, die dir laufende Prozesse zeigen.
Wenn du die PID vom richtigen Übeltäter hast, kannst du ihn gezielt stoppen.`},

    // CMS Handwerkerunternehmen
    "/real_life/cms": { type:"dir", children:["quest.txt","leitstand","elektro","fliesen","dach","sanitaer","maler"] },
    "/real_life/cms/quest.txt": { type:"file", content:
`CMS — Auftrag (Multi‑Trade, höherer Schwierigkeitsgrad)

Problem:
CMS braucht eine digitale Abnahme‑Mappe pro Fachbereich.
Der Arbeitsamt‑Beamte will sehen, dass du "echte" Dokumentation kannst.

Dein Move:
1) Lege in deiner Workbench die Struktur an:
   ~/workbench/cms/{elektro,fliesen,dach,sanitaer,maler,abnahme}
2) In JEDEM Fachbereich eine Datei erstellen und mit echo füllen:
   elektro/bericht.txt   → Zeile mit dem Sicherungs‑Label
   fliesen/bericht.txt   → Zeile mit dem Fugen‑Mix
   dach/bericht.txt      → Zeile mit dem Dachcode
   sanitaer/bericht.txt  → Zeile mit dem Rohr‑Check
   maler/bericht.txt     → Zeile mit dem Farbcode
3) In ~/workbench/cms/abnahme/uebersicht.txt ALLE Codes sammeln.

Wichtig:
Die Zeilen stehen NICHT hier, sondern in anderen Orten.
Du musst sie vorher finden (cat/grep/find).

Wenn alles fertig ist: talk holger
`},
    "/real_life/cms/leitstand": { type:"dir", children:["plan.txt"] },
    "/real_life/cms/leitstand/plan.txt": { type:"file", content:
`CMS Leitstand — Projektplan

Fachbereiche: Elektro · Fliesen · Dach · Sanitär · Maler

Hinweis:
Jeder Bereich hat eine Referenz‑Datei an einem anderen Ort.
Wenn du den Code hast, dokumentiere ihn sauber mit echo.
`},
    "/real_life/cms/elektro": { type:"dir", children:["auftrag.txt"] },
    "/real_life/cms/elektro/auftrag.txt": { type:"file", content:
`Elektro — Auftrag
Finde das Sicherungs‑Label im Technikraum.
Tipp: dort liegen Ersatzteile und ein Verteilerplan.
Ziel: Zeile in ~/workbench/cms/elektro/bericht.txt`},
    "/real_life/cms/fliesen": { type:"dir", children:["auftrag.txt"] },
    "/real_life/cms/fliesen/auftrag.txt": { type:"file", content:
`Fliesen — Auftrag
Der Fugen‑Mix steht im Kunstraum bei den Kachel‑Notizen.
Ziel: Zeile in ~/workbench/cms/fliesen/bericht.txt`},
    "/real_life/cms/dach": { type:"dir", children:["auftrag.txt"] },
    "/real_life/cms/dach/auftrag.txt": { type:"file", content:
`Dach — Auftrag
Der Dachcode ist irgendwo bei den Real‑Life‑Höfen abgelegt.
Ziel: Zeile in ~/workbench/cms/dach/bericht.txt`},
    "/real_life/cms/sanitaer": { type:"dir", children:["auftrag.txt"] },
    "/real_life/cms/sanitaer/auftrag.txt": { type:"file", content:
`Sanitär — Auftrag
Rohrdruck‑Check im Physik‑Materialschrank.
Ziel: Zeile in ~/workbench/cms/sanitaer/bericht.txt`},
    "/real_life/cms/maler": { type:"dir", children:["auftrag.txt"] },
    "/real_life/cms/maler/auftrag.txt": { type:"file", content:
`Maler — Auftrag
Der Farbcode liegt bei der Medienraum‑Ausleihe.
Ziel: Zeile in ~/workbench/cms/maler/bericht.txt`},

    "/mentor_hub/logs/lag.log": { type:"file", content:
`[tick 001] fps: 144
[tick 002] fps: 12  (big yikes)
[tick 003] suspect process: rgbd
[tick 004] suggestion: ps / top -> find PID -> kill`},

    "/mentor_hub/logs/student_noah.log": { type:"file", content:
`Noah: "Ich hab nix gemacht, swear!"
System: rgbd eats 99% CPU
Fix: kill it. Then Noah is un-lagged.`},

    "/mentor_hub/logs/student_emma.log": { type:"file", content:
`Emma: "Ich hab so viel getippt, jetzt blick ich nicht mehr durch."
Fix: history zeigen, dann gemeinsam den Fehler finden (Story-Trigger via talk emma).`},

    "/mentor_hub/logs/student_leo.log": { type:"file", content:
`Leo: "Ich will ein Shortcut. Like, ein Macro."
Fix: alias ll="ls -l"  (Quality of Life unlocked).`},

    "/mentor_hub/arena2/score.txt": { type:"file", content:
`MENTOR SCORE:
- geholfene Leute: 0/3
- Aura: stabil
- Cringe: kontrolliert`},

    "/mentor_hub/arena2/patchnotes.txt": { type:"file", content:
`Patchnotes v4:
+ Mentor Mode
+ ps/top/kill/history/alias
+ && und || (Combo-Logic)
+ Mehr NPC Banter

Known issue:
- zu viel Erfolg kann zu Ego-Boost führen. pls touch grass.`},
    "/school/klassenraume": { type:"dir", children:["7H1","7H2","8G1","8G2","8G3","9R1","9R2","10G1","10R1","10H1"] },
    "/school/klassenraume/7H1": { type:"dir", children:["tafel.txt","stundenplan.txt"] },

    "/school/klassenraume/7H1/tafel.txt": { type:"file", content:
`Klassenraum 7H1 (Hauptschule)

⚠️ GLITCH-INFO:
Manchmal springt links oben "XP +0" auf, obwohl niemand irgendwas gemacht hat.
Bitte nicht kommentieren, ruhig weiterarbeiten.

Heutiges Tafelbild:
- Bruchrechnen: Zähler/Nenner sauber kürzen
- Merksatz: "Erst Klammern, dann Party"
- Hausaufgabe S. 47 Nr. 2a–f
`},

    "/school/klassenraume/7H1/stundenplan.txt": { type:"file", content:
`Stundenplan-Schnipsel (7H1):
- 1. Stunde: Mathe (Brüche battlen, no mercy)
- 2. Stunde: Deutsch (Vorlesen any%, alle nicken professionell)
- 3. Stunde: Englisch ("present progressive" macht Faxen)
Hinweis: Wenn du mit Leuten redest: talk <id>
`},
    "/school/klassenraume/7H2": { type:"dir", children:["tafel.txt","stundenplan.txt"] },

    "/school/klassenraume/7H2/tafel.txt": { type:"file", content:
`Klassenraum 7H2 (Hauptschule)

⚠️ GLITCH-INFO:
Der rechte Rand zeigt manchmal kurz "Connection unstable".
Die Klasse nennt es "Tafel-Lag" und arbeitet einfach weiter.

Heutiges Tafelbild:
- Satzglieder bestimmen (Subjekt/Prädikat/Objekt)
- 5-Minuten-Wortschatzquiz nach der Pause
- Merkhilfe: "Wer tut was?" zuerst fragen
`},

    "/school/klassenraume/7H2/stundenplan.txt": { type:"file", content:
`Stundenplan-Schnipsel (7H2):
- 1. Stunde: NaWi (Experiment: Warum schäumt das so doll?!)
- 2. Stunde: Deutsch (Satzbau, aber mit maximal Drama)
- 3. Stunde: Informatik (Passwort nicht "1234", bitte danke)
Hinweis: Wenn du mit Leuten redest: talk <id>
`},
    "/school/klassenraume/8G1": { type:"dir", children:["tafel.txt","stundenplan.txt"] },

    "/school/klassenraume/8G1/tafel.txt": { type:"file", content:
`Klassenraum 8G1 (Gymnasium)

⚠️ GLITCH-INFO:
Bei längeren Formeln erscheinen sporadisch Pixel-Artefakte.
Die Tafel bleibt benutzbar; bitte nicht auf das Summen achten.

Heutiges Tafelbild:
- Englisch: if-clauses Typ I/II
- Vokabeltest am Freitag angekündigt
- Reminder: irregular verbs sind kein optionales DLC
`},

    "/school/klassenraume/8G1/stundenplan.txt": { type:"file", content:
`Stundenplan-Schnipsel (8G1):
- 1. Stunde: Englisch (Grammar grindset aktiviert)
- 2. Stunde: Mathe (lineare Funktionen, wir sliden durch)
- 3. Stunde: Sport (Cooper-Test, rip Ausdauer)
Hinweis: Wenn du mit Leuten redest: talk <id>
`},
    "/school/klassenraume/8G2": { type:"dir", children:["tafel.txt","stundenplan.txt"] },

    "/school/klassenraume/8G2/tafel.txt": { type:"file", content:
`Klassenraum 8G2 (Gymnasium)

⚠️ GLITCH-INFO:
Oben rechts blinkt unregelmäßig "Autosave…" ohne erkennbaren Grund.
Unterricht findet dennoch planmäßig statt.

Heutiges Tafelbild:
- Biologie: Zellorganellen und ihre Funktionen
- Skizze: Tierzelle vs. Pflanzenzelle
- Hausaufgabe: Lernkarteikarten vorbereiten
`},

    "/school/klassenraume/8G2/stundenplan.txt": { type:"file", content:
`Stundenplan-Schnipsel (8G2):
- 1. Stunde: Bio (Zelle auf entspannt sezieren, nur theoretisch)
- 2. Stunde: Kunst (Perspektive so: Auge kneift, Lineal weint)
- 3. Stunde: Englisch (Listening, bitte nicht wegpennen)
Hinweis: Wenn du mit Leuten redest: talk <id>
`},
    "/school/klassenraume/8G3": { type:"dir", children:["tafel.txt","stundenplan.txt"] },

    "/school/klassenraume/8G3/tafel.txt": { type:"file", content:
`Klassenraum 8G3 (Gymnasium)

⚠️ GLITCH-INFO:
Während Kartenarbeit poppt kurz "Map data loading" auf.
Didaktisch nicht relevant, aber auffällig.

Heutiges Tafelbild:
- Erdkunde: Klimazonen der Erde
- Atlasarbeit: Breiten- und Längengrade
- Kurzabfrage in Stunde 2 möglich
`},

    "/school/klassenraume/8G3/stundenplan.txt": { type:"file", content:
`Stundenplan-Schnipsel (8G3):
- 1. Stunde: Erdkunde (Klimazonen-Speedrun)
- 2. Stunde: Deutsch (Gedichtanalyse, alle so "hm deep")
- 3. Stunde: Informatik (Scratch-Projekt mit Bossmusik)
Hinweis: Wenn du mit Leuten redest: talk <id>
`},
    "/school/klassenraume/9R1": { type:"dir", children:["tafel.txt","stundenplan.txt"] },

    "/school/klassenraume/9R1/tafel.txt": { type:"file", content:
`Klassenraum 9R1 (Realschule)

⚠️ GLITCH-INFO:
Bei Textaufgaben erscheint manchmal "Hint available" für 0,2 Sekunden.
Bitte ignorieren und Rechenweg vollständig notieren.

Heutiges Tafelbild:
- Mathe: lineare Gleichungssysteme (Additionsverfahren)
- Tipp: Probe immer am Ende machen
- Hausaufgabe Nr. 5, 7 und 9
`},

    "/school/klassenraume/9R1/stundenplan.txt": { type:"file", content:
`Stundenplan-Schnipsel (9R1):
- 1. Stunde: Mathe (x und y klären heute Beef)
- 2. Stunde: WiPo (Diskussion eskaliert höflich)
- 3. Stunde: Bio (Genetik light, aber Gehirn glüht)
Hinweis: Wenn du mit Leuten redest: talk <id>
`},
    "/school/klassenraume/9R2": { type:"dir", children:["tafel.txt","stundenplan.txt"] },

    "/school/klassenraume/9R2/tafel.txt": { type:"file", content:
`Klassenraum 9R2 (Realschule)

⚠️ GLITCH-INFO:
Die Uhrzeit auf der Tafel springt gelegentlich drei Minuten zurück.
Unterrichtsablauf bleibt unverändert; Panik ist nicht vorgesehen.

Heutiges Tafelbild:
- Deutsch: Erörterung aufbauen (These/Argument/Beleg)
- Formulierungshilfen an der Seite
- Abgabe der Rohfassung bis Donnerstag
`},

    "/school/klassenraume/9R2/stundenplan.txt": { type:"file", content:
`Stundenplan-Schnipsel (9R2):
- 1. Stunde: Deutsch (Erörterung, aber in korrekt)
- 2. Stunde: Mathe (Prozentrechnung, Konto sagt aua)
- 3. Stunde: Erdkunde (Stadt-Land-Flow, urban vibes)
Hinweis: Wenn du mit Leuten redest: talk <id>
`},
    "/school/klassenraume/10G1": { type:"dir", children:["tafel.txt","stundenplan.txt"] },

    "/school/klassenraume/10G1/tafel.txt": { type:"file", content:
`Klassenraum 10G1 (Gymnasium)

⚠️ GLITCH-INFO:
Chemische Formeln werden vereinzelt doppelt gerendert (Ghost-Schrift).
Bitte nur die obere Zeile abschreiben.

Heutiges Tafelbild:
- Chemie: Reaktionsgleichungen ausgleichen
- Redox-Basics zur Wiederholung
- Sicherheit: Schutzbrille bleibt Pflicht
`},

    "/school/klassenraume/10G1/stundenplan.txt": { type:"file", content:
`Stundenplan-Schnipsel (10G1):
- 1. Stunde: Chemie (Redox reißt komplett rein)
- 2. Stunde: Geschichte (Industrialisierung, Lore ohne Ende)
- 3. Stunde: Mathe (Analysis teaser, alle nervös)
Hinweis: Wenn du mit Leuten redest: talk <id>
`},
    "/school/klassenraume/10R1": { type:"dir", children:["tafel.txt","stundenplan.txt"] },

    "/school/klassenraume/10R1/tafel.txt": { type:"file", content:
`Klassenraum 10R1 (Realschule)

⚠️ GLITCH-INFO:
Nach dem Gong erscheint kurz "Checkpoint erreicht".
Bitte davon nicht ablenken lassen.

Heutiges Tafelbild:
- Sporttheorie: Trainingsprinzipien (Belastung/Erholung)
- Pulsbereiche ausrechnen
- Praxis in Halle: Staffelvarianten
`},

    "/school/klassenraume/10R1/stundenplan.txt": { type:"file", content:
`Stundenplan-Schnipsel (10R1):
- 1. Stunde: Sporttheorie (Puls hoch, Motivation höher?)
- 2. Stunde: Mathe (Bewerbungsrechnung aka Realität klopft)
- 3. Stunde: Geschichte (Kalter Krieg, very frostig)
Hinweis: Wenn du mit Leuten redest: talk <id>
`},
    "/school/klassenraume/10H1": { type:"dir", children:["tafel.txt","stundenplan.txt"] },

    "/school/klassenraume/10H1/tafel.txt": { type:"file", content:
`Klassenraum 10H1 (Hauptschule)

⚠️ GLITCH-INFO:
Im unteren Bereich laufen sporadisch "Systemhinweise" durch.
Keine Funktionseinschränkung, Unterricht normal fortsetzen.

Heutiges Tafelbild:
- Biologie: Ökosystem Wald (Nahrungskette)
- Zeichnung: Produzent → Konsument → Destruent
- Kurztest nächste Woche angekündigt
`},

    "/school/klassenraume/10H1/stundenplan.txt": { type:"file", content:
`Stundenplan-Schnipsel (10H1):
- 1. Stunde: Bio (Wald-Öko, wer frisst wen?)
- 2. Stunde: Deutsch (Bewerbungsschreiben, erwachsen werden speedrun)
- 3. Stunde: Praxislernen (hands-on, no cap)
Hinweis: Wenn du mit Leuten redest: talk <id>
`},
    "/school/keller": { type:"dir", children:["winkelmann_lab"] },
    "/school/keller/winkelmann_lab": { type:"dir", children:["maschine.txt","notiz.txt","superpc.txt"] },

    "/school/keller/winkelmann_lab/maschine.txt": { type:"file", content:
`WINKELMANN-MASCHINE // PROTOTYP

Status: UNVOLLSTÄNDIG (⚡ unstable)

Zweck:
- Physik-Wissen 'reinpatchen' (Resonanz-Lernfeld)
- Schulnetzwerk abschirmen gegen fremde Netze

Fehlende Komponenten:
- Photon-Linsen-Kern
- Gyro-Spule (Resonanz)
- USV-Modul (Stabilität)
- Daten-Artefakte (Blueprint + Shield-Key)

Wenn du das liest und denkst: "Bro was" — ja. Same.
`},

    "/school/keller/winkelmann_lab/notiz.txt": { type:"file", content:
`In schiefer Handschrift:

„Lehrling gesucht.
Nicht für Muskeln. Für Gehirn. Und saubere Logs.“

Wenn du Dr. Winkelmann findest:
talk winkelmann

(Und nein, das ist kein Escape-Room. Oder doch?)
`},

    "/school/keller/winkelmann_lab/superpc.txt": { type:"file", content:
`WINKELMANN // SUPER-PC

Sticker: "PHYSICA POTESTAS EST"

Network-Tools (Sidequest):
- ping <host>
- ssh <host>
- scp <remote_file> <local_path>
- logwipe
- exit

Wichtig:
Wenn Logs rot sind: du warst nicht leise.
`},
    "/school/physik": { type:"dir", children:["materialschrank"] },
    "/school/physik/materialschrank": { type:"dir", children:["gyro_spule.part","rohrdruck.txt"] },

    "/school/physik/materialschrank/gyro_spule.part": { type:"file", content:
`GYRO-SPULE // Resonanz-Bauteil

Sieht aus wie 'ne Spule, aber irgendwie… zu präzise.
Beim Anfassen: minimales Kribbeln. Sus.
(Wenn du sie mitnimmst: Dr. Winkelmann freut sich.)
`},
    "/school/physik/materialschrank/rohrdruck.txt": { type:"file", content:
`Rohrdruck‑Check:
ROHRCHECK: DRUCK-1.6BAR
`},
    "/school/medienraum": { type:"dir", children:["beamer_kiste","kabelkiste","ausleihe"] },
    
    "/school/medienraum/kabelkiste": { type:"dir", children:["box_a","box_b","inventar.txt"] },
    "/school/medienraum/kabelkiste/inventar.txt": { type:"file", content:
`Inventar (Kabelkiste):
- HDMI-ADAPTER #A17  (bitte NICHT verlieren)
- HDMI-Kabel 2m
- HDMI-Kabel 5m
- USB-C -> HDMI
- VGA (warum existiert das noch?)
- Audio-Klinke
`},
    "/school/medienraum/kabelkiste/box_a": { type:"dir", children:["alt","neue_adapter"] },
    "/school/medienraum/kabelkiste/box_a/alt": { type:"dir", children:["kaputt.txt"] },
    "/school/medienraum/kabelkiste/box_a/alt/kaputt.txt": { type:"file", content:"(Adapter defekt – nicht ausgeben)\\n" },
    "/school/medienraum/kabelkiste/box_a/neue_adapter": { type:"dir", children:["liste.txt"] },
    "/school/medienraum/kabelkiste/box_a/neue_adapter/liste.txt": { type:"file", content:"Neu: USB-C -> HDMI (2x)\\n" },
    "/school/medienraum/kabelkiste/box_b": { type:"dir", children:["kabel","adapter"] },
    "/school/medienraum/kabelkiste/box_b/kabel": { type:"dir", children:["hdmi_2m.txt","usb.txt"] },
    "/school/medienraum/kabelkiste/box_b/kabel/hdmi_2m.txt": { type:"file", content:"(aufgerollt)\\n" },
    "/school/medienraum/kabelkiste/box_b/kabel/usb.txt": { type:"file", content:"(USB-A)\\n" },
    "/school/medienraum/kabelkiste/box_b/adapter": { type:"dir", children:["vga.txt","audio.txt","notiz.txt"] },
    "/school/medienraum/kabelkiste/box_b/adapter/vga.txt": { type:"file", content:"(VGA -> HDMI)\\n" },
    "/school/medienraum/kabelkiste/box_b/adapter/audio.txt": { type:"file", content:"(Klinke)\\n" },
    "/school/medienraum/kabelkiste/box_b/adapter/notiz.txt": { type:"file", content:"Wenn was fehlt: erst inventar.txt checken.\\n" },

    "/school/medienraum/ausleihe": { type:"dir", children:["ausleihe_regeln.txt","formular.txt","farbrolle.txt"] },
    "/school/medienraum/ausleihe/ausleihe_regeln.txt": { type:"file", content:"Regel #1: Namen lesbar.\nRegel #2: HDMI-Adapter #A17 bleibt im Haus.\n" },
    "/school/medienraum/ausleihe/formular.txt": { type:"file", content:"Name: ____  Gerät: ____  Datum: ____\\n" },
    "/school/medienraum/ausleihe/farbrolle.txt": { type:"file", content:
`Malerbedarf (für Projekte):
FARBCODE: SAND-NEBEL-12
`},
"/school/medienraum/beamer_kiste": { type:"dir", children:["photon_linse.part"] },

    "/school/medienraum/beamer_kiste/photon_linse.part": { type:"file", content:
`PHOTON-LINSEN-KERN

Eine Linse, die Licht bündelt wie Aim-Assist.
Auf dem Rand: ein kleines 'W'.
`},
    "/school/technikraum": { type:"dir", children:["ersatzteile"] },
    "/school/technikraum/ersatzteile": { type:"dir", children:["usv_modul.part","verteilerplan.txt"] },

    "/school/technikraum/ersatzteile/usv_modul.part": { type:"file", content:
`USV-MODUL (Mini)

Strom-Stabilisierung. Sieht langweilig aus,
aber für Winkelmann ist das safe ein Zauberitem.
`},
    "/school/technikraum/ersatzteile/verteilerplan.txt": { type:"file", content:
`Verteilerplan (Kurz):
SICHERUNGSLABEL: CMS-EL-2048
`},
    "/net": { type:"dir", children:["gym-ost-core","igs-edu-lab"] },
    "/net/gym-ost-core": { type:"dir", children:["home","var"] },
    "/net/gym-ost-core/home": { type:"dir", children:["guest"] },
    "/net/gym-ost-core/home/guest": { type:"dir", children:["blueprint.dat","hint.txt"] },

    "/net/gym-ost-core/home/guest/hint.txt": { type:"file", content:
`Wenn du das liest: du bist drin.
Nimm blueprint.dat, aber mach keinen Lärm.
`},

    "/net/gym-ost-core/home/guest/blueprint.dat": { type:"file", content:
`BLUEPRINT TOKEN: BP-EMITTER-Δ9
`},
    "/net/gym-ost-core/var": { type:"dir", children:["log"] },
    "/net/gym-ost-core/var/log": { type:"dir", children:["auth.log","sys.log"] },

    "/net/gym-ost-core/var/log/auth.log": { type:"file", content:
`[AUTH] login guest from 10.0.7.23 OK
[AUTH] read blueprint.dat
`},

    "/net/gym-ost-core/var/log/sys.log": { type:"file", content:
`[SYS] netwatch anomaly score=medium
`},
    "/net/igs-edu-lab": { type:"dir", children:["home","var"] },
    "/net/igs-edu-lab/home": { type:"dir", children:["student"] },
    "/net/igs-edu-lab/home/student": { type:"dir", children:["shield.key","memo.txt"] },

    "/net/igs-edu-lab/home/student/memo.txt": { type:"file", content:
`MEMO: Der Shield-Key ist nicht für euch.
Wenn du ihn nimmst: wisch Spuren.
`},

    "/net/igs-edu-lab/home/student/shield.key": { type:"file", content:
`SHIELD TOKEN: SHIELD-Σ13
`},
    "/net/igs-edu-lab/var": { type:"dir", children:["log"] },
    "/net/igs-edu-lab/var/log": { type:"dir", children:["auth.log","sys.log"] },

    "/net/igs-edu-lab/var/log/auth.log": { type:"file", content:
`[AUTH] login student from 10.0.7.23 OK
[AUTH] read shield.key
`},

    "/net/igs-edu-lab/var/log/sys.log": { type:"file", content:
`[SYS] netwatch anomaly score=high
`},
    "/superpc": { type:"dir", children:["readme.txt","net","tools"] },

    "/superpc/readme.txt": { type:"file", content:
`Winkelmann SUPER-PC

Du bist jetzt in einer getrennten Umgebung.
Für Netzwerkübersicht: netmap
Für Ziele: cd net
`},
    "/superpc/net": { type:"dir", children:["gym-ost-core","igs-edu-lab"] },
    "/superpc/net/gym-ost-core": { type:"dir", children:["about.txt"] },

    "/superpc/net/gym-ost-core/about.txt": { type:"file", content:
`HOST: gym-ost-core
Artefakt: blueprint.dat
Zugang: ssh gym-ost-core
`},
    "/superpc/net/igs-edu-lab": { type:"dir", children:["about.txt"] },

    "/superpc/net/igs-edu-lab/about.txt": { type:"file", content:
`HOST: igs-edu-lab
Artefakt: shield.key
Zugang: ssh igs-edu-lab
`},
    "/superpc/tools": { type:"dir", children:["notes.txt"] },

    "/superpc/tools/notes.txt": { type:"file", content:
`TOOLS — SUPERPC

Diese Tools stehen dir im Netzwerk zur Verfügung.
Sie funktionieren nur, wenn du über den SUPERPC arbeitest.

netmap
  Zeigt alle bekannten Netzwerk-Ziele.
  Gibt Hinweise zu Artefakten, Trace & Alarmstatus.
  Beispiel:
    netmap

ping <host>
  Prüft, ob ein Host erreichbar ist.
  Kann Trace leicht erhöhen.
  Beispiel:
    ping gym-ost-core

ssh <host>
  Verbindet dich mit einem Host (Remote-Shell).
  Ab hier arbeitest du im Netzwerk.
  Beispiel:
    ssh igs-edu-lab

ls
  Zeigt Dateien im aktuellen (Remote-)Verzeichnis.
  Beispiel:
    ls

cat <file>
  Liest den Inhalt einer Datei.
  Oft sind dort Hinweise versteckt.
  Beispiel:
    cat hint.txt

scp <file> <ziel>
  Kopiert eine Datei vom Host auf deinen PC.
  Wichtig: Nur Dateien in ~/workbench zählen!
  Beispiel:
    scp blueprint.dat ~/workbench/

logwipe
  Löscht deine Spuren im aktuellen Host.
  Setzt Trace & Logs zurück.
  Beispiel:
    logwipe

exit
  Verlässt die aktuelle Ebene.
  (ssh → superpc → keller)
`}
  };
  window.SCHWARM_FS = FS;
})();

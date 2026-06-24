// ═══════════════════════════════════════════════════════════
//  GAME META DATA
//  Achievements, level stories, learning objectives, solutions,
//  didactic notes, bonus challenges. The LEVELS array itself
//  is defined in pyforge-levels.js (loaded before this file).
// ═══════════════════════════════════════════════════════════


// ─── Achievements ───
function _allOf(prefix, count) {
  const ids = []; for (let i = 1; i <= count; i++) ids.push(`${prefix}.${i}`);
  return ids;
}
const ACHIEVEMENTS = [
  {id:"first_steps", icon:"\u{1f476}", name:"First Steps", desc:"Complete your first challenge", check: s => s.completed.length >= 1},
  {id:"hello_python", icon:"\u{1f44b}", name:"Hello Python", desc:"Complete all of Level 1", check: s => _allOf("1",4).every(c => s.completed.includes(c))},
  {id:"decision_maker", icon:"\u{1f9ed}", name:"Decision Maker", desc:"Complete all conditional challenges", check: s => _allOf("2",4).every(c => s.completed.includes(c))},
  {id:"loop_master", icon:"\u{1f504}", name:"Loop Master", desc:"Complete all Loop challenges", check: s => _allOf("3",4).every(c => s.completed.includes(c))},
  {id:"function_master", icon:"⚙️", name:"Function Master", desc:"Complete all Function challenges", check: s => _allOf("4",4).every(c => s.completed.includes(c))},
  {id:"list_master", icon:"\u{1f4cb}", name:"List Master", desc:"Complete all List challenges", check: s => _allOf("5",4).every(c => s.completed.includes(c))},
  {id:"dict_master", icon:"\u{1f4d6}", name:"Dictionary Sage", desc:"Complete all Dictionary challenges", check: s => _allOf("6",4).every(c => s.completed.includes(c))},
  {id:"string_master", icon:"\u{1f520}", name:"Word Smith", desc:"Complete all String challenges", check: s => ["7.1","7.2","7.3"].every(c => s.completed.includes(c))},
  {id:"oop_wizard", icon:"\u{1f9d9}", name:"OOP Wizard", desc:"Complete all OOP challenges", check: s => _allOf("8",4).every(c => s.completed.includes(c))},
  {id:"inheritance_pro", icon:"\u{1f3f0}", name:"Heir of Code", desc:"Complete all Inheritance challenges", check: s => ["9.1","9.2","9.3"].every(c => s.completed.includes(c))},
  {id:"grid_master", icon:"\u{1f5fa}️", name:"Grid Walker", desc:"Complete all 2D-Grid challenges", check: s => ["10.1","10.2","10.3"].every(c => s.completed.includes(c))},
  {id:"halfway", icon:"\u{1f3c3}", name:"Halfway There", desc:"Complete 6 levels", check: s => { const done = new Set(); s.completed.forEach(c => done.add(c.split('.')[0])); return done.size >= 6; }},
  {id:"python_pro", icon:"\u{1f3c6}", name:"Python Pro", desc:"Complete all challenges", check: s => { let total = 0; LEVELS.forEach(l => total += l.challenges.length); return s.completed.length >= total; }},
  {id:"hint_free", icon:"\u{1f4aa}", name:"No Hints Needed", desc:"Complete 5 challenges without using hints", check: s => (s.hintFreeCount || 0) >= 5},
  {id:"bug_squasher", icon:"\u{1f41b}", name:"Bug Squasher", desc:"Fix 10 errors and get them right", check: s => (s.errorFixCount || 0) >= 10},
  {id:"streak_3", icon:"\u{1f525}", name:"On a Roll", desc:"Code on 3 different days in a row", check: s => (s.streak?.longest || 0) >= 3},
  {id:"streak_7", icon:"\u{1f31f}", name:"Week of Code", desc:"Code 7 days in a row", check: s => (s.streak?.longest || 0) >= 7},
  {id:"runner", icon:"\u{1f3c3}", name:"Tinkerer", desc:"Run code 50 times", check: s => (s.runCount || 0) >= 50},
  {id:"thinker", icon:"\u{1f9d0}", name:"Reflective Mind", desc:"Reflect on 3 levels", check: s => Object.keys(s.reflections || {}).length >= 3},
  {id:"snip_user", icon:"\u{1f4cb}", name:"Snippet Surfer", desc:"Insert 5 code snippets", check: s => (s.snippetsUsed || 0) >= 5},
  {id:"snip_author", icon:"\u{2b50}", name:"Snippet Author", desc:"Save 3 of your own snippets", check: s => (s.savedSnippets || 0) >= 3},
  {id:"pomodoro_pro", icon:"\u{1f345}", name:"Pomodoro Pro", desc:"Finish one full Pomodoro cycle", check: s => (s.pomodoroCompleted || 0) >= 1},
  {id:"bonus_hunter", icon:"\u{1f48e}", name:"Bonus Hunter", desc:"Complete 10 bonus challenges", check: s => (s.completed || []).filter(c => c.includes("B")).length >= 10},
  {id:"konami", icon:"\u{1f3ae}", name:"Konami Code", desc:"Discover the hidden cheat", check: s => !!s.konamiUsed},
  {id:"note_taker", icon:"\u{1f4dd}", name:"Note Taker", desc:"Write personal notes on 3 challenges", check: s => (s.notedChallenges || 0) >= 3},
  {id:"daily_3",    icon:"\u{1f4c5}", name:"Daily Devotee", desc:"Complete 3 daily challenges", check: s => Object.values(s.dailyHistory || {}).filter(id => (s.completed || []).includes(id)).length >= 3},
  {id:"multi_file", icon:"\u{1f9f0}", name:"Multi-tasker", desc:"Open 3 sandbox files at once", check: s => (s.sandboxFiles?.files?.length || 0) >= 3},
  {id:"speedster",  icon:"\u{1f3c3}\u{200d}\u{2640}\u{fe0f}", name:"Speedster", desc:"Finish a 10-task speedrun", check: s => (s.speedrunBest || 0) >= 10},
  {id:"sprint_pro", icon:"\u{1f3c5}", name:"Sprint Pro",  desc:"Complete 3 speedruns",     check: s => (s.speedrunsCompleted || 0) >= 3},
  {id:"concept_5",  icon:"\u{1f9e0}", name:"Five Concepts", desc:"Use 5 different Python concepts in your code", check: s => Object.keys(s.concepts || {}).length >= 5},
  {id:"concept_10", icon:"\u{1f393}", name:"Concept Master", desc:"Use 10 different Python concepts in your code", check: s => Object.keys(s.concepts || {}).length >= 10},
  {id:"pythonia_legend", icon:"\u{1f3c5}", name:"Legend of Pythonia",
   desc:"Finish all challenges AND see every story cutscene",
   check: s => {
     let total = 0; LEVELS.forEach(l => total += l.challenges.length);
     if ((s.completed || []).length < total) return false;
     try {
       const seen = JSON.parse(localStorage.getItem("pyforge_cutscenes_seen") || "[]");
       const need = (typeof CUTSCENES !== "undefined") ? Object.keys(CUTSCENES).length : 0;
       return seen.length >= need;
     } catch (e) { return false; }
   }},
];

const ACHIEVEMENTS_DE = {
  "first_steps":     {name:"Erste Schritte",        desc:"Schlie\u00dfe deine erste Aufgabe ab"},
  "hello_python":    {name:"Hallo Python",          desc:"Schlie\u00dfe alle Aufgaben in Level 1 ab"},
  "decision_maker":  {name:"Entscheidungsmeister",  desc:"Schlie\u00dfe alle Bedingungs-Aufgaben ab"},
  "loop_master":     {name:"Schleifen-Meister",     desc:"Schlie\u00dfe alle Schleifen-Aufgaben ab"},
  "function_master": {name:"Funktions-Meisterin",   desc:"Schlie\u00dfe alle Funktions-Aufgaben ab"},
  "list_master":     {name:"Listen-Meister",        desc:"Schlie\u00dfe alle Listen-Aufgaben ab"},
  "dict_master":     {name:"Dictionary-Weisheit",   desc:"Schlie\u00dfe alle Dictionary-Aufgaben ab"},
  "string_master":   {name:"Wortschmiedin",         desc:"Schlie\u00dfe alle String-Aufgaben ab"},
  "oop_wizard":      {name:"OOP-Zauberer",          desc:"Schlie\u00dfe alle OOP-Aufgaben ab"},
  "inheritance_pro": {name:"Erbin des Codes",       desc:"Schlie\u00dfe alle Vererbungs-Aufgaben ab"},
  "grid_master":     {name:"Raster-Wanderin",       desc:"Schlie\u00dfe alle 2D-Raster-Aufgaben ab"},
  "halfway":         {name:"Halbzeit",              desc:"Schlie\u00dfe 6 Level ab"},
  "python_pro":      {name:"Python-Profi",          desc:"Schlie\u00dfe alle Aufgaben ab"},
  "hint_free":       {name:"Ohne Hilfe",            desc:"Schlie\u00dfe 5 Aufgaben ohne Hinweise ab"},
  "bug_squasher":    {name:"Fehlerj\u00e4ger",      desc:"Behebe 10 Fehler erfolgreich"},
  "streak_3":        {name:"In Schwung",            desc:"Code an 3 Tagen in Folge"},
  "streak_7":        {name:"Code-Woche",            desc:"Code an 7 Tagen in Folge"},
  "runner":          {name:"T\u00fcftlerin",             desc:"Code 50 Mal ausgef\u00fchrt"},
  "snip_user":       {name:"Snippet-Surfer",        desc:"5 Code-Snippets eingef\u00fcgt"},
  "snip_author":     {name:"Snippet-Autorin",       desc:"3 eigene Snippets gespeichert"},
  "pomodoro_pro":    {name:"Pomodoro-Profi",        desc:"Einen vollen Pomodoro-Zyklus geschafft"},
  "bonus_hunter":    {name:"Bonus-J\u00e4ger",           desc:"10 Bonus-Aufgaben gel\u00f6st"},
  "konami":          {name:"Konami-Code",           desc:"Den versteckten Cheat entdeckt"},
  "note_taker":      {name:"Notizenfreundin",       desc:"Zu 3 Aufgaben Notizen geschrieben"},
  "daily_3":         {name:"Tagespflege",           desc:"3 Tagesaufgaben gelöst"},
  "multi_file":      {name:"Multitalent",           desc:"3 Sandbox-Dateien gleichzeitig offen"},
  "speedster":       {name:"Sprinterin",            desc:"Einen 10er-Speedrun geschafft"},
  "sprint_pro":      {name:"Sprint-Profi",          desc:"3 Speedruns abgeschlossen"},
  "concept_5":       {name:"Fünf Konzepte",         desc:"5 verschiedene Python-Konzepte verwendet"},
  "concept_10":      {name:"Konzept-Meister",       desc:"10 verschiedene Python-Konzepte verwendet"},
  "pythonia_legend": {name:"Legende von Pythonia",  desc:"Alle Aufgaben gelöst UND jede Cutscene gesehen"},
  "thinker":         {name:"Nachdenkliche",         desc:"In 3 Leveln selbst eingesch\u00e4tzt"},
};

// \u2500\u2500\u2500 Level Stories (narrative micro-frames) \u2500\u2500\u2500
const LEVEL_STORIES = {
  1:  "Welcome to <b>Pythonia</b>, a kingdom under threat from rogue bugs. As an apprentice coder, you must master the basics before facing the Bug Lord.",
  2:  "The kingdom's gates won't open without proper decisions. Master <b>if/else</b> and the guards will let you pass.",
  3:  "The Endless Forest can only be crossed by those who don't get tired. Loops will help you walk every path without giving up.",
  4:  "The town blacksmith teaches reusable spells called <b>functions</b>. Forge them well \u2014 you'll need them in every battle ahead.",
  5:  "Your inventory is overflowing. Time to learn how <b>lists</b> keep your gear organized.",
  6:  "The Royal Library uses <b>dictionaries</b> to store knowledge. Learn the lookup spells to access ancient lore.",
  7:  "Hidden messages, encrypted scrolls, ancient codes \u2014 <b>strings</b> are the language of secrets in Pythonia.",
  8:  "To create your own creatures and items, you need to design <b>classes</b>. Welcome to the workshop of wizards.",
  9:  "Some heroes inherit power from their ancestors. <b>Inheritance</b> lets you build mighty new classes from existing ones.",
  10: "The dungeon awaits. Navigate <b>2D grids</b>, dodge traps, and find treasure on the way.",
  11: "Advanced magic \u2014 comprehensions, lambdas, exceptions \u2014 sharpen your toolkit for the final battle.",
  12: "The Bug Lord awaits. Combine everything you've learned \u2014 this is your moment, hero of Pythonia.",
};
const LEVEL_STORIES_DE = {
  1:  "Willkommen in <b>Pythonia</b>, einem K\u00f6nigreich, das von wilden Bugs bedroht wird. Als angehende Programmiererin musst du zuerst die Grundlagen lernen, bevor du dem Bug-Lord gegen\u00fcberstehst.",
  2:  "Die Tore des K\u00f6nigreichs \u00f6ffnen sich nur f\u00fcr kluge Entscheidungen. Beherrsche <b>if/else</b> und die Wachen lassen dich passieren.",
  3:  "Der Endlose Wald l\u00e4sst sich nur \u00fcberqueren, wenn man nicht m\u00fcde wird. Schleifen helfen dir, jeden Pfad zu gehen.",
  4:  "Der Stadt-Schmied lehrt wiederverwendbare Zauberspr\u00fcche \u2014 sogenannte <b>Funktionen</b>. Schmiede sie gut, du wirst sie in jedem Kampf brauchen.",
  5:  "Dein Inventar quillt \u00fcber. Zeit zu lernen, wie <b>Listen</b> deine Ausr\u00fcstung ordnen.",
  6:  "Die K\u00f6nigliche Bibliothek nutzt <b>Dictionaries</b> zum Speichern von Wissen. Lerne die Such-Zauber f\u00fcr altes Wissen.",
  7:  "Versteckte Botschaften, verschl\u00fcsselte Schriftrollen, alte Codes \u2014 <b>Strings</b> sind die Sprache der Geheimnisse in Pythonia.",
  8:  "Um eigene Kreaturen und Gegenst\u00e4nde zu erschaffen, brauchst du <b>Klassen</b>. Willkommen in der Werkstatt der Magier.",
  9:  "Manche Heldinnen erben Macht von ihren Vorfahren. <b>Vererbung</b> l\u00e4sst dich m\u00e4chtige neue Klassen aus bestehenden bauen.",
  10: "Der Dungeon erwartet dich. Navigiere durch <b>2D-Raster</b>, weiche Fallen aus und finde Sch\u00e4tze unterwegs.",
  11: "Fortgeschrittene Magie \u2014 Comprehensions, Lambdas, Exceptions \u2014 sch\u00e4rfe dein Werkzeug f\u00fcr den finalen Kampf.",
  12: "Der Bug-Lord wartet. Kombiniere alles, was du gelernt hast \u2014 das ist dein Moment, Heldin von Pythonia.",
};

// \u2500\u2500\u2500 Per-challenge learning objectives (Level 1-3 seed; more in next wave) \u2500\u2500\u2500
(function attachObjectives() {
  const OBJ = {
    "1.1": { en: ["Use print() to display text", "Understand strings are wrapped in quotes"],
             de: ["print() benutzen, um Text auszugeben", "Verstehen: Strings stehen in Anf\u00fchrungszeichen"] },
    "1.2": { en: ["Create variables with =", "Know int / float / string / bool"],
             de: ["Variablen mit = erstellen", "int / float / string / bool unterscheiden"] },
    "1.3": { en: ["Use math operators (+ - * / ** // %)", "Apply operator precedence"],
             de: ["Mathematische Operatoren nutzen (+ - * / ** // %)", "Punkt-vor-Strich anwenden"] },
    "1.4": { en: ["Use f-strings to embed variables", "Combine multiple print() calls"],
             de: ["f-Strings nutzen, um Variablen einzubetten", "Mehrere print()-Aufrufe kombinieren"] },
    "2.1": { en: ["Write an if/else statement", "Use comparison operators"],
             de: ["Eine if/else-Anweisung schreiben", "Vergleichsoperatoren verwenden"] },
    "2.2": { en: ["Chain conditions with elif", "Check from highest to lowest"],
             de: ["Bedingungen mit elif verketten", "Vom h\u00f6chsten zum niedrigsten Wert pr\u00fcfen"] },
    "2.3": { en: ["Combine conditions with and / or", "Use boolean logic"],
             de: ["Bedingungen mit and / or verkn\u00fcpfen", "Boolesche Logik anwenden"] },
    "2.4": { en: ["Nest conditions for game logic", "Use parentheses for grouping"],
             de: ["Bedingungen f\u00fcr Spiellogik verschachteln", "Klammern zur Gruppierung nutzen"] },
    "3.1": { en: ["Write a while loop", "Update the counter to avoid infinite loops"],
             de: ["Eine while-Schleife schreiben", "Z\u00e4hler aktualisieren (keine Endlosschleife!)"] },
    "3.2": { en: ["Use for + range()", "Loop a fixed number of times"],
             de: ["for + range() verwenden", "Eine feste Anzahl Wiederholungen durchlaufen"] },
    "3.3": { en: ["Iterate over a list with for", "Filter items with if inside the loop"],
             de: ["Eine Liste mit for durchlaufen", "Elemente mit if in der Schleife filtern"] },
    "3.4": { en: ["Use nested loops", "Indent two levels deep correctly"],
             de: ["Verschachtelte Schleifen verwenden", "Zwei Ebenen tief korrekt einr\u00fccken"] },
    "4.1": { en: ["Define a function with def", "Import modules with import"],
             de: ["Funktion mit def definieren", "Module mit import einbinden"] },
    "4.2": { en: ["Use default parameter values", "Pass arguments by position"],
             de: ["Standardwerte f\u00fcr Parameter nutzen", "Argumente nach Position \u00fcbergeben"] },
    "4.3": { en: ["Build helper functions", "Use string multiplication for visual output"],
             de: ["Hilfsfunktionen bauen", "Strings vervielfachen f\u00fcr visuelle Ausgaben"] },
    "4.4": { en: ["Decompose problems into functions", "Functions can call other functions"],
             de: ["Probleme in Funktionen zerlegen", "Funktionen k\u00f6nnen andere Funktionen aufrufen"] },
    "5.1": { en: ["Create and modify lists", "Use .append() and .remove()"],
             de: ["Listen erstellen und ver\u00e4ndern", ".append() und .remove() verwenden"] },
    "5.2": { en: ["Use min, max, sorted", "Inspect numerical data"],
             de: ["min, max, sorted verwenden", "Zahlen-Daten untersuchen"] },
    "5.3": { en: ["Lists of dicts model real entities", "Use enumerate for indexed loops"],
             de: ["Listen von Dicts modellieren echte Daten", "enumerate f\u00fcr nummerierte Schleifen"] },
    "5.4": { en: ["Slice lists with [a:b]", "Use negative indexing and step"],
             de: ["Listen mit [a:b] schneiden", "Negative Indizes und Schrittweite nutzen"] },
    "6.1": { en: ["Create dicts with key-value pairs", "Access values via d[key]"],
             de: ["Dicts mit Schl\u00fcssel-Wert-Paaren erstellen", "Werte \u00fcber d[key] zugreifen"] },
    "6.2": { en: ["Update / add dict entries", "Iterate with .items()"],
             de: ["Dict-Eintr\u00e4ge aktualisieren / hinzuf\u00fcgen", "Mit .items() durchlaufen"] },
    "6.3": { en: ["Navigate nested dicts", "Use multi-level access d[a][b]"],
             de: ["Verschachtelte Dicts navigieren", "Mehrstufigen Zugriff d[a][b] nutzen"] },
    "6.4": { en: ["Combine dicts in collections", "Loop and format structured data"],
             de: ["Dicts in Sammlungen kombinieren", "Strukturierte Daten durchlaufen und formatieren"] },
    "7.1": { en: ["Use .split() and .startswith()", "Process text input"],
             de: [".split() und .startswith() nutzen", "Texteingabe verarbeiten"] },
    "7.2": { en: ["Use ord() and chr() for character math", "Apply modular arithmetic"],
             de: ["ord() und chr() f\u00fcr Zeichen-Arithmetik nutzen", "Modulare Arithmetik anwenden"] },
    "7.3": { en: ["Count items with a dict", "Sort dict entries by value"],
             de: ["Eintr\u00e4ge mit einem Dict z\u00e4hlen", "Dict-Eintr\u00e4ge nach Wert sortieren"] },
    "8.1": { en: ["Define a class with __init__", "Create object instances"],
             de: ["Klasse mit __init__ definieren", "Objekt-Instanzen erstellen"] },
    "8.2": { en: ["Add methods that change state", "Methods can interact between objects"],
             de: ["Methoden hinzuf\u00fcgen, die State \u00e4ndern", "Methoden k\u00f6nnen zwischen Objekten interagieren"] },
    "8.3": { en: ["Use __str__ for nice display", "Track current vs max values"],
             de: ["__str__ f\u00fcr sch\u00f6ne Anzeige nutzen", "Aktuelle vs Maximalwerte verfolgen"] },
    "8.4": { en: ["Extend a class with subclass", "Override __str__ for variety"],
             de: ["Klasse mit Unterklasse erweitern", "__str__ f\u00fcr Vielfalt \u00fcberschreiben"] },
    "9.1": { en: ["Use super() in __init__", "Define class-specific methods"],
             de: ["super() in __init__ nutzen", "Klassen-spezifische Methoden definieren"] },
    "9.2": { en: ["Override parent methods", "Polymorphism: same call, different behavior"],
             de: ["Eltern-Methoden \u00fcberschreiben", "Polymorphie: gleicher Aufruf, anderes Verhalten"] },
    "9.3": { en: ["Use super() to extend behavior", "Track additional state in subclasses"],
             de: ["super() nutzen, um Verhalten zu erweitern", "Zus\u00e4tzlichen State in Unterklassen verfolgen"] },
    "10.1": { en: ["Build 2D grids with comprehensions", "Set values at grid[row][col]"],
             de: ["2D-Raster mit Comprehensions bauen", "Werte bei grid[row][col] setzen"] },
    "10.2": { en: ["Iterate over neighbors", "Boundary-check positions"],
             de: ["\u00dcber Nachbarn iterieren", "Positionen auf Grenzen pr\u00fcfen"] },
    "10.3": { en: ["Update positions in a grid", "Handle wall collisions"],
             de: ["Positionen in einem Raster aktualisieren", "Wand-Kollisionen behandeln"] },
    "11.1": { en: ["Write list comprehensions", "Filter with if inside comprehension"],
             de: ["List Comprehensions schreiben", "Mit if innerhalb der Comprehension filtern"] },
    "11.2": { en: ["Use try/except for safety", "Catch specific exception types"],
             de: ["try/except f\u00fcr Sicherheit nutzen", "Spezifische Ausnahmen abfangen"] },
    "11.3": { en: ["Use map, filter, sorted with lambda", "Compose data transformations"],
             de: ["map, filter, sorted mit lambda nutzen", "Datentransformationen kombinieren"] },
    "12.1": { en: ["Parse strings into numbers", "Branch on string commands"],
             de: ["Strings in Zahlen parsen", "Nach String-Befehlen verzweigen"] },
    "12.2": { en: ["Combine OOP + loops + random", "Build a turn-based game loop"],
             de: ["OOP + Schleifen + random kombinieren", "Rundenbasierten Spielloop bauen"] },
    "12.3": { en: ["Build multiple cooperating functions", "Sort dicts by a value with lambda"],
             de: ["Mehrere kooperierende Funktionen bauen", "Dicts mit lambda nach Wert sortieren"] },
  };
  for (const lvl of LEVELS) {
    for (const ch of lvl.challenges) {
      if (OBJ[ch.id]) {
        ch.objectives = OBJ[ch.id].en;
        ch.objectives_de = OBJ[ch.id].de;
      }
    }
  }
})();

const SOLUTIONS = {
"1.1": 'print("Hello, World!")',
"1.2": 'player_name = "Hero"\nplayer_hp = 100\nplayer_level = 1.5\n\nprint(player_name)\nprint(player_hp)\nprint(player_level)',
"1.3": 'base_attack = 25\nmultiplier = 3\nbonus = 10\n\ndamage = base_attack * multiplier + bonus\nprint(damage)',
"1.4": 'name = "Blade"\nplayer_class = "Warrior"\nhp = 120\nattack = 25\n\nprint("=== PLAYER CARD ===")\nprint(f"Name: {name}")\nprint(f"Class: {player_class}")\nprint(f"HP: {hp}")\nprint(f"Attack: {attack}")',
"2.1": 'hp = 50\n\nif hp > 0:\n    print("Alive")\nelse:\n    print("Game Over")',
"2.2": 'score = 75\n\nif score >= 90:\n    print("Legendary")\nelif score >= 70:\n    print("Epic")\nelif score >= 40:\n    print("Rare")\nelse:\n    print("Common")',
"2.3": 'gold = 80\nlevel = 3\n\nif gold >= 50 and level >= 5:\n    print("Purchase complete!")\nelse:\n    print("Cannot buy this item.")',
"2.4": 'player = "rock"\ncomputer = "scissors"\n\nif player == computer:\n    print("Draw!")\nelif (player == "rock" and computer == "scissors") or \\\n     (player == "scissors" and computer == "paper") or \\\n     (player == "paper" and computer == "rock"):\n    print("Player wins!")\nelse:\n    print("Computer wins!")',
"3.1": 'count = 10\nwhile count > 0:\n    print(count)\n    count -= 1\nprint("Liftoff!")',
"3.2": 'for i in range(1, 6):\n    print(f"Roll {i}: {i * 10} damage")',
"3.3": 'enemies = ["Goblin", "Dark Knight", "Slime", "Dark Mage", "Wolf", "Dark Dragon"]\n\nfor enemy in enemies:\n    if enemy.startswith("Dark"):\n        print(enemy)',
"3.4": 'for row in range(1, 6):\n    for col in range(1, 6):\n        print(row * col, end="  ")\n    print()',
"4.1": 'import random\n\ndef roll_dice(sides):\n    return random.randint(1, sides)\n\nprint(roll_dice(6))\nprint(roll_dice(6))\nprint(roll_dice(6))',
"4.2": 'def calculate_damage(base, multiplier=1.0, bonus=0):\n    return base * multiplier + bonus\n\nprint(calculate_damage(20))\nprint(calculate_damage(20, 1.5))\nprint(calculate_damage(20, 2.0, 10))',
"4.3": 'def display_health(name, current, maximum):\n    filled = int(20 * current / maximum)\n    bar = "#" * filled + "-" * (20 - filled)\n    print(f"{name}: [{bar}] {current}/{maximum} HP")\n\ndisplay_health("Hero", 50, 100)\ndisplay_health("Boss", 75, 150)',
"4.4": 'def calculate_damage(attack, defense):\n    return max(0, attack - defense)\n\ndef battle_round(atk_name, atk_power, def_name, def_armor, def_hp):\n    dmg = calculate_damage(atk_power, def_armor)\n    remaining = def_hp - dmg\n    print(f"{atk_name} attacks {def_name} for {dmg} damage!")\n    print(f"{def_name} HP: {remaining}/{def_hp}")\n    return remaining\n\nremaining = battle_round("Hero", 20, "Goblin", 8, 30)\nprint(f"Remaining: {remaining}")',
"5.1": 'inventory = ["sword", "shield", "potion"]\ninventory.append("bow")\ninventory.remove("shield")\nprint(inventory)\nprint(len(inventory))',
"5.2": 'damage_rolls = [45, 12, 78, 33, 91, 27, 56]\nprint(min(damage_rolls))\nprint(max(damage_rolls))\nprint(sorted(damage_rolls))',
"5.3": 'party = [\n    {"name": "Aria", "class": "Mage", "level": 5},\n    {"name": "Rex", "class": "Warrior", "level": 3},\n    {"name": "Luna", "class": "Rogue", "level": 7}\n]\n\nfor i, m in enumerate(party, 1):\n    print(f"{i}. {m[\'name\']} the {m[\'class\']} (Level {m[\'level\']})")',
"5.4": 'skills = ["Fire", "Ice", "Thunder", "Heal", "Shield", "Dash"]\nprint(skills[:3])\nprint(skills[-2:])\nprint(skills[::2])',
"6.1": 'player = {\n    "name": "Shadow",\n    "char_class": "Rogue",\n    "hp": 80,\n    "attack": 22,\n    "defense": 8\n}\n\nprint(f"Name: {player[\'name\']}")\nprint(f"Class: {player[\'char_class\']}")\nprint(f"HP: {player[\'hp\']}")\nprint(f"Attack: {player[\'attack\']}")\nprint(f"Defense: {player[\'defense\']}")',
"6.2": 'inventory = {"potion": 3, "arrow": 10, "bomb": 1}\ninventory["potion"] += 2\ninventory["arrow"] -= 5\ninventory["shield"] = 1\n\nfor item, count in inventory.items():\n    print(f"{item}: {count}")',
"6.3": 'game = {\n    "player": {\n        "name": "Hero",\n        "stats": {"hp": 100, "mp": 50, "attack": 20},\n        "equipment": {\n            "weapon": {"name": "Iron Sword", "damage": 15},\n            "armor": {"name": "Leather", "defense": 5}\n        }\n    }\n}\n\nprint(f"Player: {game[\'player\'][\'name\']}")\nprint(f"HP: {game[\'player\'][\'stats\'][\'hp\']}")\nprint(f"Weapon: {game[\'player\'][\'equipment\'][\'weapon\'][\'name\']}")\nprint(f"Weapon Damage: {game[\'player\'][\'equipment\'][\'weapon\'][\'damage\']}")',
"6.4": 'bestiary = {\n    "Goblin": {"type": "ground", "hp": 30, "danger": "low"},\n    "Dragon": {"type": "flying", "hp": 200, "danger": "extreme"},\n    "Slime": {"type": "ground", "hp": 15, "danger": "harmless"}\n}\n\nfor name, info in bestiary.items():\n    print(f"--- {name} ---")\n    print(f"Type: {info[\'type\']}")\n    print(f"HP: {info[\'hp\']}")\n    print(f"Danger: {info[\'danger\']}")',
"7.1": 'message = "/attack dragon"\n\nif message.startswith("/"):\n    parts = message.split()\n    command = parts[0][1:]\n    args = " ".join(parts[1:])\n    print(f"Command: {command}")\n    print(f"Args: {args}")\nelse:\n    print(f"Chat: {message}")',
"7.2": 'def encrypt(text, shift):\n    result = ""\n    for char in text:\n        if char.isupper():\n            result += chr((ord(char) - 65 + shift) % 26 + 65)\n        elif char.islower():\n            result += chr((ord(char) - 97 + shift) % 26 + 97)\n        else:\n            result += char\n    return result\n\nprint(encrypt("HELLO", 3))\nprint(encrypt("abc", 1))',
"7.3": 'text = "the dragon fought the knight and the knight won the battle"\nwords = text.lower().split()\ncounts = {}\nfor word in words:\n    if word in counts:\n        counts[word] += 1\n    else:\n        counts[word] = 1\n\nfor word, count in sorted(counts.items(), key=lambda x: x[1], reverse=True):\n    print(f"{word}: {count}")',
"8.1": 'class Player:\n    def __init__(self, name, hp):\n        self.name = name\n        self.hp = hp\n\n    def greet(self):\n        print(f"I am {self.name} with {self.hp} HP!")\n\nplayer = Player("Hero", 100)\nplayer.greet()',
"8.2": 'class Player:\n    def __init__(self, name, hp):\n        self.name = name\n        self.hp = hp\n\n    def take_damage(self, amount):\n        self.hp = max(0, self.hp - amount)\n        print(f"{self.name} takes {amount} damage!")\n\n    def attack(self, other):\n        print(f"{self.name} attacks {other.name}!")\n        other.take_damage(10)\n\nhero = Player("Hero", 50)\nenemy = Player("Goblin", 30)\nhero.attack(enemy)\nenemy.attack(hero)\nprint(f"{hero.name}: {hero.hp} HP")\nprint(f"{enemy.name}: {enemy.hp} HP")',
"8.3": 'class Player:\n    def __init__(self, name, char_class, hp):\n        self.name = name\n        self.char_class = char_class\n        self.max_hp = hp\n        self.hp = hp\n\n    def __str__(self):\n        return f"[{self.char_class}] {self.name} - HP: {self.hp}/{self.max_hp}"\n\nplayer = Player("Hero", "Warrior", 100)\nprint(player)',
"8.4": 'class Item:\n    def __init__(self, name, value):\n        self.name = name\n        self.value = value\n    def __str__(self):\n        return f"{self.name} (value: {self.value} gold)"\n\nclass Weapon(Item):\n    def __init__(self, name, value, damage):\n        super().__init__(name, value)\n        self.damage = damage\n    def __str__(self):\n        return f"{self.name} - {self.damage} damage (value: {self.value} gold)"\n\nclass Potion(Item):\n    def __init__(self, name, value, heal_amount):\n        super().__init__(name, value)\n        self.heal_amount = heal_amount\n    def __str__(self):\n        return f"{self.name} - heals {self.heal_amount} HP (value: {self.value} gold)"\n\nsword = Weapon("Iron Sword", 50, 15)\npotion = Potion("Health Potion", 20, 30)\nprint(sword)\nprint(potion)',
"9.1": 'class Character:\n    def __init__(self, name, hp, attack):\n        self.name = name\n        self.hp = hp\n        self.attack = attack\n\n    def info(self):\n        print(f"{self.name} - HP: {self.hp}, ATK: {self.attack}")\n\nclass Warrior(Character):\n    def __init__(self, name):\n        super().__init__(name, 120, 15)\n\n    def special_ability(self):\n        print(f"{self.name} uses Shield Bash!")\n\nclass Mage(Character):\n    def __init__(self, name):\n        super().__init__(name, 70, 25)\n\n    def special_ability(self):\n        print(f"{self.name} casts Fireball!")\n\nw = Warrior("Rex")\nm = Mage("Aria")\nw.info()\nw.special_ability()\nm.info()\nm.special_ability()',
"9.2": 'class Character:\n    def __init__(self, name, hp, attack):\n        self.name = name\n        self.hp = hp\n        self.attack = attack\n\n    def take_damage(self, amount):\n        self.hp = max(0, self.hp - amount)\n        print(f"{self.name} takes {amount} damage! HP: {self.hp}")\n\n    def attack_target(self, target):\n        target.take_damage(self.attack)\n\nclass Warrior(Character):\n    def __init__(self, name):\n        super().__init__(name, 120, 15)\n\n    def attack_target(self, target):\n        dmg = self.attack + 5\n        print(f"{self.name} swings sword!")\n        target.take_damage(dmg)\n\nclass Mage(Character):\n    def __init__(self, name):\n        super().__init__(name, 70, 25)\n\n    def attack_target(self, target):\n        dmg = self.attack * 2\n        print(f"{self.name} casts spell!")\n        target.take_damage(dmg)\n\nw = Warrior("Rex")\nm = Mage("Aria")\nw.attack_target(m)\nm.attack_target(w)\nprint(f"\\n{w.name}: {w.hp} HP | {m.name}: {m.hp} HP")',
"9.3": 'class Character:\n    def __init__(self, name, hp, attack):\n        self.name = name\n        self.hp = hp\n        self.attack = attack\n\n    def take_damage(self, amount):\n        self.hp = max(0, self.hp - amount)\n        print(f"{self.name} takes {amount} damage! HP: {self.hp}")\n\nclass BossEnemy(Character):\n    def __init__(self, name, hp, attack):\n        super().__init__(name, hp, attack)\n        self.phase = 1\n        self.rage = 0\n\n    def take_damage(self, amount):\n        super().take_damage(amount)\n        self.rage += 5\n        if self.rage >= 20:\n            print("BOSS ENRAGED!")\n            self.rage = 0\n\nboss = BossEnemy("Dark Lord", 200, 30)\nfor i in range(5):\n    boss.take_damage(10)',
"10.1": 'grid = [["." for _ in range(5)] for _ in range(5)]\ngrid[2][2] = "P"\n\nfor row in grid:\n    print(" ".join(row))',
"10.2": 'grid = [\n    [".", "T", ".", ".", "."],\n    [".", ".", ".", "T", "."],\n    ["T", ".", ".", ".", "."],\n    [".", ".", "T", ".", "T"],\n    [".", ".", ".", ".", "."]\n]\n\ndef count_adjacent_treasures(grid, row, col):\n    count = 0\n    for dr in [-1, 0, 1]:\n        for dc in [-1, 0, 1]:\n            if dr == 0 and dc == 0:\n                continue\n            nr, nc = row + dr, col + dc\n            if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]):\n                if grid[nr][nc] == "T":\n                    count += 1\n    return count\n\nprint(count_adjacent_treasures(grid, 1, 1))\nprint(count_adjacent_treasures(grid, 2, 1))',
"10.3": 'grid = [\n    ["#", "#", "#", "#", "#"],\n    ["#", ".", ".", ".", "#"],\n    ["#", ".", "#", ".", "#"],\n    ["#", ".", ".", ".", "#"],\n    ["#", "#", "#", "#", "#"]\n]\n\ndef print_grid(grid, pos):\n    for r in range(len(grid)):\n        row = ""\n        for c in range(len(grid[r])):\n            if (r, c) == pos:\n                row += "P "\n            else:\n                row += grid[r][c] + " "\n        print(row.strip())\n    print()\n\ndef move(grid, pos, direction):\n    dirs = {"up":(-1,0), "down":(1,0), "left":(0,-1), "right":(0,1)}\n    dr, dc = dirs[direction]\n    nr, nc = pos[0] + dr, pos[1] + dc\n    if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] != "#":\n        return (nr, nc)\n    else:\n        print("Blocked!")\n        return pos\n\npos = (1, 1)\nprint_grid(grid, pos)\npos = move(grid, pos, "right")\nprint_grid(grid, pos)\npos = move(grid, pos, "right")\nprint_grid(grid, pos)\npos = move(grid, pos, "down")\nprint_grid(grid, pos)',
"11.1": 'damage_rolls = [23, 67, 45, 89, 12, 56, 78, 34]\nnames = ["aria", "rex", "luna"]\n\nsquares = [x**2 for x in range(1, 11)]\nprint(squares)\n\nhigh_damage = [d for d in damage_rolls if d > 50]\nprint(high_damage)\n\nupper_names = [n.upper() for n in names]\nprint(upper_names)',
"11.2": 'def safe_divide(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        print("Warning: division by zero!")\n        return 0\n\ndef parse_int(text):\n    try:\n        return int(text)\n    except ValueError:\n        print("Warning: invalid integer!")\n        return None\n\nprint(safe_divide(10, 3))\nprint(safe_divide(10, 0))\nprint(parse_int("42"))\nprint(parse_int("abc"))',
"11.3": 'xp_values = [100, 250, 50, 400, 175]\nplayers = [\n    {"name": "Aria", "level": 8, "hp": 90},\n    {"name": "Rex", "level": 3, "hp": 120},\n    {"name": "Luna", "level": 6, "hp": 75},\n    {"name": "Kai", "level": 2, "hp": 110}\n]\n\ndoubled = list(map(lambda x: x * 2, xp_values))\nprint(doubled)\n\nhigh_level = list(filter(lambda p: p["level"] > 5, players))\nfor p in high_level:\n    print(f"{p[\"name\"]} (Level {p[\"level\"]})")\n\nsorted_players = sorted(players, key=lambda p: p["hp"], reverse=True)\nfor p in sorted_players:\n    print(f"{p[\"name\"]}: {p[\"hp\"]} HP")',
"12.1": 'def calculate(expression):\n    parts = expression.split()\n    a = float(parts[0])\n    op = parts[1]\n    b = float(parts[2])\n    if op == "+": return a + b\n    elif op == "-": return a - b\n    elif op == "*": return a * b\n    elif op == "/":\n        if b == 0: return "Error: division by zero"\n        return a / b\n    return "Unknown operator"\n\nprint(calculate("10 + 5"))\nprint(calculate("20 - 8"))\nprint(calculate("6 * 7"))\nprint(calculate("15 / 4"))',
"12.2": 'import random\n\nclass Fighter:\n    def __init__(self, name, hp, attack, defense):\n        self.name = name\n        self.hp = hp\n        self.attack = attack\n        self.defense = defense\n\n    def take_hit(self, damage):\n        actual = max(0, damage - self.defense)\n        self.hp = max(0, self.hp - actual)\n        return actual\n\nhero = Fighter("Hero", 100, 22, 8)\ndragon = Fighter("Dragon", 120, 20, 5)\n\nround_num = 1\nwhile hero.hp > 0 and dragon.hp > 0:\n    dmg = hero.take_hit(0)  # placeholder\n    h_dmg = random.randint(hero.attack - 5, hero.attack + 5)\n    actual = dragon.take_hit(h_dmg)\n    print(f"Round {round_num}: {hero.name} attacks {dragon.name} for {actual} damage! {dragon.name} HP: {dragon.hp}")\n    if dragon.hp <= 0:\n        break\n    d_dmg = random.randint(dragon.attack - 5, dragon.attack + 5)\n    actual = hero.take_hit(d_dmg)\n    print(f"Round {round_num}: {dragon.name} attacks {hero.name} for {actual} damage! {hero.name} HP: {hero.hp}")\n    round_num += 1\n\nwinner = hero.name if hero.hp > 0 else dragon.name\nwp = hero.hp if hero.hp > 0 else dragon.hp\nprint(f"\\n{winner} wins with {wp} HP remaining!")',
"12.3": 'scores = []\n\ndef add_score(table, name, score):\n    table.append({"name": name, "score": score})\n\ndef get_top(table, n):\n    return sorted(table, key=lambda x: x["score"], reverse=True)[:n]\n\ndef find_player(table, name):\n    for entry in table:\n        if entry["name"] == name:\n            return entry["score"]\n    return None\n\ndef display(table):\n    for i, entry in enumerate(table, 1):\n        print(f"  {i}. {entry[\"name\"]}: {entry[\"score\"]}")\n\nadd_score(scores, "Aria", 9500)\nadd_score(scores, "Rex", 7200)\nadd_score(scores, "Luna", 8800)\nadd_score(scores, "Kai", 6500)\nadd_score(scores, "Zoe", 9100)\n\nprint("=== TOP 3 ===")\ntop3 = get_top(scores, 3)\ndisplay(top3)\n\nprint(f"\\nAria\'s score: {find_player(scores, \'Aria\')}")',
};

// ─── Didactic data per level ───
const DIDACTICS = {
  1: {
    notes: "This level introduces the absolute basics. Students often struggle with: syntax (missing quotes, wrong parentheses), understanding that = is assignment not equality, and forgetting to call print(). Let students experiment freely \u2014 even \u201cwrong\u201d outputs teach them something.",
    errors: "<b>Forgetting quotes:</b> <code>print(Hello)</code> \u2192 NameError. Remind: text needs quotes.<br><b>Using = instead of ==:</b> Not relevant yet, but some may try comparisons early.<br><b>Type confusion:</b> <code>\"100\" + 1</code> fails \u2014 strings and ints don\u2019t mix.<br><b>f-string syntax:</b> Forgetting the <code>f</code> prefix, or using wrong braces.",
    differentiation: "<b>Faster students:</b> Ask them to add ASCII art to their player card, or calculate more complex formulas.<br><b>Struggling students:</b> Let them copy the example first, then modify one thing at a time. Typing code matters more than inventing it at this stage."
  },
  2: {
    notes: "Decision logic is where real programming starts. Key insight: computers can only compare, not \u201cunderstand\u201d. Emphasize that indentation matters in Python \u2014 it defines code blocks. The rock-paper-scissors challenge is intentionally complex to show why structured thinking matters.",
    errors: "<b>Indentation errors:</b> Mixing tabs and spaces, or forgetting to indent after <code>if:</code><br><b>Using = instead of ==:</b> The #1 beginner error in conditionals.<br><b>Forgetting colons:</b> <code>if x > 0</code> without the trailing <code>:</code><br><b>Logic order:</b> In elif chains, checking from lowest to highest gives wrong results.",
    differentiation: "<b>Faster students:</b> Add more game logic \u2014 a full damage type system (fire > ice > nature > fire).<br><b>Struggling students:</b> Draw flowcharts first, then translate to code. Visual thinking helps."
  },
  3: {
    notes: "Loops are often the first \u201caha moment\u201d for students \u2014 the computer does repetitive work. Watch for infinite loops (missing counter update). The nested loop challenge is deliberately harder; it\u2019s okay if students need more time here.",
    errors: "<b>Infinite loops:</b> Forgetting <code>count -= 1</code> in while loops. Teach Ctrl+C (or the browser will hang).<br><b>Off-by-one errors:</b> <code>range(5)</code> gives 0-4, not 1-5.<br><b>Modifying list during iteration:</b> Not yet, but comes up later.<br><b>Indentation in nested loops:</b> Which code belongs to which loop?",
    differentiation: "<b>Faster students:</b> Challenge them to create a pattern with nested loops (triangle, diamond).<br><b>Struggling students:</b> Use Python Tutor (pythontutor.com) to visualize each loop step."
  },
  4: {
    notes: "Functions are about abstraction and reusability. The key mental shift: writing code that will be used later, not just right now. Emphasize the difference between <code>return</code> (gives data back) and <code>print</code> (shows on screen). Many beginners confuse the two.",
    errors: "<b>return vs print:</b> Using <code>print()</code> inside function instead of <code>return</code>, then wondering why the result is <code>None</code>.<br><b>Forgetting to call:</b> Defining a function but never calling it.<br><b>Scope confusion:</b> Variables inside functions are local.<br><b>Missing return:</b> Function returns <code>None</code> by default.",
    differentiation: "<b>Faster students:</b> Ask them to build a mini-library of game utility functions.<br><b>Struggling students:</b> Compare functions to recipes: inputs (ingredients), process (steps), output (dish)."
  },
  5: {
    notes: "Lists are the first data structure. Key concepts: indexing starts at 0, lists are mutable, and methods modify in-place. The enumerate() pattern is important but often confusing at first. Let students print intermediate results to build intuition.",
    errors: "<b>Index 0:</b> First item is <code>lst[0]</code>, not <code>lst[1]</code>.<br><b>IndexError:</b> Accessing beyond list length.<br><b>sort() vs sorted():</b> <code>sort()</code> modifies in-place and returns None. <code>sorted()</code> returns a new list.<br><b>Mutable gotcha:</b> <code>a = b = []</code> creates one list, not two.",
    differentiation: "<b>Faster students:</b> Implement a stack (append/pop) or queue for game events.<br><b>Struggling students:</b> Visualize lists as numbered boxes. Draw them on paper."
  },
  6: {
    notes: "Dictionaries model real-world data. The key insight: you look things up by name, not position. Nested dicts are powerful but can be confusing \u2014 use step-by-step access. This level pairs well with JSON if students are curious about web data.",
    errors: "<b>KeyError:</b> Accessing a key that doesn\u2019t exist. Teach <code>.get(key, default)</code>.<br><b>Quote nesting:</b> <code>print(f\"{d['key']}\")</code> \u2014 mixing quote types is tricky.<br><b>Mutable default arguments:</b> Advanced, but watch for it.<br><b>Forgetting .items():</b> Looping a dict gives only keys by default.",
    differentiation: "<b>Faster students:</b> Build a full game item database with search functionality.<br><b>Struggling students:</b> Start with simple key-value pairs before introducing nesting."
  },
  7: {
    notes: "String processing is a practical skill used everywhere. The Caesar cipher is both fun and teaches ord()/chr() and modular arithmetic. The word counter introduces the counting pattern that\u2019s fundamental to many algorithms.",
    errors: "<b>Immutability:</b> Strings can\u2019t be changed in-place. <code>s[0] = \"X\"</code> fails.<br><b>Split behavior:</b> <code>\"a,,b\".split(\",\")</code> gives <code>[\"a\",\"\",\"b\"]</code>.<br><b>Modular arithmetic:</b> The <code>% 26</code> wrap-around in Caesar cipher is tricky.<br><b>Encoding:</b> <code>ord(\"A\")</code> is 65, <code>ord(\"a\")</code> is 97.",
    differentiation: "<b>Faster students:</b> Implement ROT13 or a Vigen\u00e8re cipher.<br><b>Struggling students:</b> Work through the Caesar cipher by hand with pen and paper first."
  },
  8: {
    notes: "OOP is the biggest conceptual leap. The metaphor of classes as blueprints and objects as instances works well. <code>self</code> is consistently confusing \u2014 explain it as \u201cthe specific object we\u2019re working with right now.\u201d Start with familiar examples (a Player in a game).",
    errors: "<b>Forgetting self:</b> Missing <code>self</code> parameter or <code>self.</code> prefix.<br><b>__init__ typo:</b> Wrong underscores or spelling.<br><b>Calling without ():</b> <code>player.greet</code> vs <code>player.greet()</code>.<br><b>Class vs instance:</b> Modifying the class vs modifying the object.",
    differentiation: "<b>Faster students:</b> Design a full game entity system with items, spells, status effects.<br><b>Struggling students:</b> Build the simplest possible class first (just name attribute), then add one feature at a time."
  },
  9: {
    notes: "Inheritance extends OOP thinking. Key idea: \u201cA Warrior IS-A Character with extra abilities.\u201d super() is the tricky part \u2014 it calls the parent\u2019s version. Method overriding lets subclasses customize behavior. Don\u2019t over-abstract at this level.",
    errors: "<b>super() syntax:</b> Forgetting parentheses or arguments.<br><b>Method resolution:</b> Which version gets called? The most specific one.<br><b>Over-inheritance:</b> Not everything needs to be a subclass.<br><b>Constructor chaining:</b> Forgetting super().__init__() means parent setup is skipped.",
    differentiation: "<b>Faster students:</b> Add a third subclass (Ranger?) with a unique mechanic.<br><b>Struggling students:</b> Trace through the code step by step, showing which method runs where."
  },
  10: {
    notes: "2D grids bring visual, spatial thinking into programming. This connects well to game development intuition. The coordinate system (row, col) can be confusing \u2014 row increases downward. Collision detection is a real game dev skill being practiced here.",
    errors: "<b>Row/column confusion:</b> grid[row][col], not grid[x][y]. Y-axis is inverted.<br><b>Boundary checks:</b> Forgetting to check if position is within grid bounds.<br><b>Reference vs copy:</b> <code>grid = [[\".\"] * 5] * 5</code> creates 5 references to the same row!<br><b>Separate collision checks:</b> Check horizontal and vertical separately.",
    differentiation: "<b>Faster students:</b> Implement a simple flood-fill algorithm or pathfinding.<br><b>Struggling students:</b> Draw the grid on graph paper and manually trace the coordinate math."
  },
  11: {
    notes: "These are power tools that make Python code more elegant. List comprehensions can be overwhelming \u2014 teach them as a natural evolution of the for-loop pattern. Error handling is essential for real-world code. Lambda is syntactic sugar, not a new concept.",
    errors: "<b>Comprehension readability:</b> Overly complex one-liners are worse than explicit loops.<br><b>Bare except:</b> <code>except:</code> catches everything, which hides bugs. Be specific.<br><b>Lambda scope:</b> Lambdas capture variables by reference, which can cause surprises in loops.<br><b>Map returns iterator:</b> Need <code>list()</code> to see results.",
    differentiation: "<b>Faster students:</b> Explore generator expressions and the itertools module.<br><b>Struggling students:</b> Write the explicit for-loop version first, then convert to a comprehension side by side."
  },
  12: {
    notes: "The final challenges combine everything. There is no single \u201cright\u201d solution \u2014 evaluate based on: Does it work? Is it readable? Did they use appropriate constructs? The RPG combat challenge especially allows creative solutions. Celebrate completions!",
    errors: "<b>Scope creep:</b> Students may try to build too much. Encourage minimal working version first.<br><b>Missing edge cases:</b> Division by zero, empty inputs, negative values.<br><b>Code organization:</b> Functions should be defined before they are called.<br><b>Testing:</b> Encourage students to test with different inputs.",
    differentiation: "<b>Faster students:</b> Extend the RPG with inventory, shops, or multiple enemies. Or start learning Pygame!<br><b>Struggling students:</b> Focus on the calculator challenge first \u2014 it\u2019s the most structured. Let them refer back to earlier solutions."
  }
};

const DIDACTICS_DE = {
  1: {
    notes: "Dieses Level f\u00fchrt in die absoluten Grundlagen ein. Sch\u00fcler haben oft Schwierigkeiten mit: Syntax (fehlende Anf\u00fchrungszeichen, falsche Klammern), dem Verst\u00e4ndnis dass = eine Zuweisung und kein Gleichheitszeichen ist, und dem Vergessen von print() aufzurufen. Lass Sch\u00fcler frei experimentieren \u2014 selbst \u201efalsche\u201c Ausgaben lehren etwas.",
    errors: "<b>Anf\u00fchrungszeichen vergessen:</b> <code>print(Hello)</code> \u2192 NameError. Erinnerung: Text braucht Anf\u00fchrungszeichen.<br><b>= statt == verwenden:</b> Noch nicht relevant, aber manche versuchen fr\u00fch Vergleiche.<br><b>Typ-Verwirrung:</b> <code>\"100\" + 1</code> schl\u00e4gt fehl \u2014 Strings und Ints lassen sich nicht mischen.<br><b>f-String-Syntax:</b> Das <code>f</code>-Pr\u00e4fix vergessen oder falsche Klammern verwenden.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> Bitte sie, ASCII-Art zur Spielerkarte hinzuzuf\u00fcgen oder komplexere Formeln zu berechnen.<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Lass sie zuerst das Beispiel abschreiben, dann \u00e4ndere eine Sache nach der anderen. Code tippen ist in dieser Phase wichtiger als ihn zu erfinden."
  },
  2: {
    notes: "Entscheidungslogik ist der Punkt, an dem echtes Programmieren beginnt. Wichtige Erkenntnis: Computer k\u00f6nnen nur vergleichen, nicht \u201everstehen\u201c. Betone, dass Einr\u00fcckung in Python wichtig ist \u2014 sie definiert Codebl\u00f6cke. Die Schere-Stein-Papier-Aufgabe ist absichtlich komplex, um zu zeigen warum strukturiertes Denken wichtig ist.",
    errors: "<b>Einr\u00fcckungsfehler:</b> Tabs und Leerzeichen mischen oder Einr\u00fcckung nach <code>if:</code> vergessen.<br><b>= statt == verwenden:</b> Der h\u00e4ufigste Anf\u00e4ngerfehler bei Bedingungen.<br><b>Doppelpunkt vergessen:</b> <code>if x > 0</code> ohne den abschlie\u00dfenden <code>:</code><br><b>Logik-Reihenfolge:</b> Bei elif-Ketten gibt die Pr\u00fcfung von niedrig nach hoch falsche Ergebnisse.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> F\u00fcge mehr Spiellogik hinzu \u2014 ein vollst\u00e4ndiges Schadenstyp-System (Feuer > Eis > Natur > Feuer).<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Zeichne zuerst Flussdiagramme, dann \u00fcbersetze sie in Code. Visuelles Denken hilft."
  },
  3: {
    notes: "Schleifen sind oft der erste \u201eAha-Moment\u201c f\u00fcr Sch\u00fcler \u2014 der Computer erledigt wiederholende Arbeit. Achte auf Endlosschleifen (fehlende Z\u00e4hler-Aktualisierung). Die verschachtelte Schleifen-Aufgabe ist absichtlich schwieriger; es ist in Ordnung wenn Sch\u00fcler hier mehr Zeit brauchen.",
    errors: "<b>Endlosschleifen:</b> <code>count -= 1</code> in while-Schleifen vergessen. Lehre Ctrl+C (sonst h\u00e4ngt der Browser).<br><b>Um-eins-daneben-Fehler:</b> <code>range(5)</code> gibt 0-4, nicht 1-5.<br><b>Liste w\u00e4hrend Iteration \u00e4ndern:</b> Noch nicht relevant, kommt aber sp\u00e4ter.<br><b>Einr\u00fcckung bei verschachtelten Schleifen:</b> Welcher Code geh\u00f6rt zu welcher Schleife?",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> Fordere sie heraus, ein Muster mit verschachtelten Schleifen zu erstellen (Dreieck, Raute).<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Verwende Python Tutor (pythontutor.com) um jeden Schleifenschritt zu visualisieren."
  },
  4: {
    notes: "Bei Funktionen geht es um Abstraktion und Wiederverwendbarkeit. Der entscheidende Denkwandel: Code schreiben, der sp\u00e4ter verwendet wird, nicht nur jetzt. Betone den Unterschied zwischen <code>return</code> (gibt Daten zur\u00fcck) und <code>print</code> (zeigt auf dem Bildschirm). Viele Anf\u00e4nger verwechseln beides.",
    errors: "<b>return vs print:</b> <code>print()</code> innerhalb der Funktion statt <code>return</code> verwenden, dann sich wundern warum das Ergebnis <code>None</code> ist.<br><b>Aufruf vergessen:</b> Eine Funktion definieren aber nie aufrufen.<br><b>Scope-Verwirrung:</b> Variablen innerhalb von Funktionen sind lokal.<br><b>Fehlendes return:</b> Funktion gibt standardm\u00e4\u00dfig <code>None</code> zur\u00fcck.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> Bitte sie, eine Mini-Bibliothek von Spiel-Hilfsfunktionen zu bauen.<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Vergleiche Funktionen mit Rezepten: Eingaben (Zutaten), Verarbeitung (Schritte), Ausgabe (Gericht)."
  },
  5: {
    notes: "Listen sind die erste Datenstruktur. Wichtige Konzepte: Indizierung beginnt bei 0, Listen sind ver\u00e4nderbar, und Methoden \u00e4ndern direkt. Das enumerate()-Muster ist wichtig aber oft zun\u00e4chst verwirrend. Lass Sch\u00fcler Zwischenergebnisse ausgeben um Intuition aufzubauen.",
    errors: "<b>Index 0:</b> Erstes Element ist <code>lst[0]</code>, nicht <code>lst[1]</code>.<br><b>IndexError:</b> Zugriff \u00fcber die Listenl\u00e4nge hinaus.<br><b>sort() vs sorted():</b> <code>sort()</code> \u00e4ndert direkt und gibt None zur\u00fcck. <code>sorted()</code> gibt eine neue Liste zur\u00fcck.<br><b>Mutable-Falle:</b> <code>a = b = []</code> erstellt eine Liste, nicht zwei.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> Implementiere einen Stack (append/pop) oder eine Queue f\u00fcr Spiel-Events.<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Visualisiere Listen als nummerierte K\u00e4stchen. Zeichne sie auf Papier."
  },
  6: {
    notes: "Dictionaries modellieren reale Daten. Die wichtige Erkenntnis: Man sucht Dinge per Name, nicht per Position. Verschachtelte Dicts sind m\u00e4chtig aber k\u00f6nnen verwirrend sein \u2014 verwende schrittweisen Zugriff. Dieses Level passt gut zu JSON wenn Sch\u00fcler sich f\u00fcr Web-Daten interessieren.",
    errors: "<b>KeyError:</b> Zugriff auf einen Schl\u00fcssel der nicht existiert. Lehre <code>.get(key, default)</code>.<br><b>Anf\u00fchrungszeichen-Verschachtelung:</b> <code>print(f\"{d['key']}\")</code> \u2014 das Mischen von Anf\u00fchrungszeichen-Typen ist knifflig.<br><b>Ver\u00e4nderbare Standard-Argumente:</b> Fortgeschritten, aber achte darauf.<br><b>.items() vergessen:</b> Das Durchlaufen eines Dict gibt standardm\u00e4\u00dfig nur Schl\u00fcssel zur\u00fcck.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> Baue eine vollst\u00e4ndige Spiel-Gegenstandsdatenbank mit Suchfunktion.<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Beginne mit einfachen Schl\u00fcssel-Wert-Paaren bevor du Verschachtelung einf\u00fchrst."
  },
  7: {
    notes: "String-Verarbeitung ist eine praktische F\u00e4higkeit, die \u00fcberall verwendet wird. Die Caesar-Verschl\u00fcsselung macht Spa\u00df und lehrt ord()/chr() und modulare Arithmetik. Der Wortz\u00e4hler f\u00fchrt das Z\u00e4hlmuster ein, das f\u00fcr viele Algorithmen grundlegend ist.",
    errors: "<b>Unver\u00e4nderlichkeit:</b> Strings k\u00f6nnen nicht direkt ge\u00e4ndert werden. <code>s[0] = \"X\"</code> schl\u00e4gt fehl.<br><b>Split-Verhalten:</b> <code>\"a,,b\".split(\",\")</code> gibt <code>[\"a\",\"\",\"b\"]</code>.<br><b>Modulare Arithmetik:</b> Der <code>% 26</code>-Umbruch bei der Caesar-Verschl\u00fcsselung ist knifflig.<br><b>Kodierung:</b> <code>ord(\"A\")</code> ist 65, <code>ord(\"a\")</code> ist 97.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> Implementiere ROT13 oder eine Vigen\u00e8re-Verschl\u00fcsselung.<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Arbeite die Caesar-Verschl\u00fcsselung zuerst von Hand mit Stift und Papier durch."
  },
  8: {
    notes: "OOP ist der gr\u00f6\u00dfte konzeptionelle Sprung. Die Metapher von Klassen als Baupl\u00e4ne und Objekten als Instanzen funktioniert gut. <code>self</code> ist durchgehend verwirrend \u2014 erkl\u00e4re es als \u201edas spezifische Objekt, mit dem wir gerade arbeiten.\u201c Beginne mit vertrauten Beispielen (ein Spieler in einem Spiel).",
    errors: "<b>self vergessen:</b> Fehlender <code>self</code>-Parameter oder <code>self.</code>-Pr\u00e4fix.<br><b>__init__-Tippfehler:</b> Falsche Unterstriche oder Schreibweise.<br><b>Aufruf ohne ():</b> <code>player.greet</code> vs <code>player.greet()</code>.<br><b>Klasse vs Instanz:</b> Die Klasse \u00e4ndern vs das Objekt \u00e4ndern.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> Entwirf ein vollst\u00e4ndiges Spiel-Entity-System mit Gegenst\u00e4nden, Zaubern, Statuseffekten.<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Baue zuerst die einfachstm\u00f6gliche Klasse (nur name-Attribut), dann f\u00fcge eine Funktion nach der anderen hinzu."
  },
  9: {
    notes: "Vererbung erweitert das OOP-Denken. Kernidee: \u201eEin Warrior IST-EIN Character mit zus\u00e4tzlichen F\u00e4higkeiten.\u201c super() ist der knifflige Teil \u2014 es ruft die Version der Elternklasse auf. Methoden-\u00dcberschreibung l\u00e4sst Unterklassen Verhalten anpassen. Nicht \u00fcber-abstrahieren auf diesem Level.",
    errors: "<b>super()-Syntax:</b> Klammern oder Argumente vergessen.<br><b>Methodenaufl\u00f6sung:</b> Welche Version wird aufgerufen? Die spezifischste.<br><b>\u00dcber-Vererbung:</b> Nicht alles muss eine Unterklasse sein.<br><b>Konstruktor-Verkettung:</b> super().__init__() vergessen bedeutet, dass die Eltern-Einrichtung \u00fcbersprungen wird.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> F\u00fcge eine dritte Unterklasse (Ranger?) mit einer einzigartigen Mechanik hinzu.<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Gehe den Code Schritt f\u00fcr Schritt durch und zeige welche Methode wo ausgef\u00fchrt wird."
  },
  10: {
    notes: "2D-Raster bringen visuelles, r\u00e4umliches Denken in die Programmierung. Dies passt gut zur Spielentwicklungs-Intuition. Das Koordinatensystem (Zeile, Spalte) kann verwirrend sein \u2014 Zeilen nehmen nach unten zu. Kollisionserkennung ist eine echte Spielentwicklungs-F\u00e4higkeit, die hier ge\u00fcbt wird.",
    errors: "<b>Zeile/Spalte-Verwirrung:</b> grid[row][col], nicht grid[x][y]. Die Y-Achse ist invertiert.<br><b>Grenzpr\u00fcfungen:</b> Vergessen zu pr\u00fcfen ob die Position innerhalb der Rastergrenzen liegt.<br><b>Referenz vs Kopie:</b> <code>grid = [[\".\"] * 5] * 5</code> erstellt 5 Referenzen auf dieselbe Zeile!<br><b>Separate Kollisionspr\u00fcfungen:</b> Pr\u00fcfe horizontal und vertikal getrennt.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> Implementiere einen einfachen Flood-Fill-Algorithmus oder Pfadfindung.<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Zeichne das Raster auf Karopapier und verfolge die Koordinaten-Mathematik von Hand."
  },
  11: {
    notes: "Dies sind Power-Tools, die Python-Code eleganter machen. List Comprehensions k\u00f6nnen \u00fcberw\u00e4ltigend sein \u2014 lehre sie als nat\u00fcrliche Weiterentwicklung des for-Schleifen-Musters. Fehlerbehandlung ist essentiell f\u00fcr produktiven Code. Lambda ist syntaktischer Zucker, kein neues Konzept.",
    errors: "<b>Comprehension-Lesbarkeit:</b> \u00dcberm\u00e4\u00dfig komplexe Einzeiler sind schlechter als explizite Schleifen.<br><b>Blankes except:</b> <code>except:</code> f\u00e4ngt alles, was Fehler versteckt. Sei spezifisch.<br><b>Lambda-Scope:</b> Lambdas erfassen Variablen per Referenz, was in Schleifen \u00dcberraschungen verursachen kann.<br><b>Map gibt Iterator zur\u00fcck:</b> <code>list()</code> n\u00f6tig um Ergebnisse zu sehen.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> Erkunde Generator-Ausdr\u00fccke und das itertools-Modul.<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Schreibe zuerst die explizite for-Schleifen-Version, dann konvertiere sie Seite an Seite zu einer Comprehension."
  },
  12: {
    notes: "Die Abschluss-Aufgaben kombinieren alles. Es gibt keine einzig \u201erichtige\u201c L\u00f6sung \u2014 bewerte nach: Funktioniert es? Ist es lesbar? Wurden passende Konstrukte verwendet? Die RPG-Kampf-Aufgabe erlaubt besonders kreative L\u00f6sungen. Feiere Abschl\u00fcsse!",
    errors: "<b>Scope Creep:</b> Sch\u00fcler versuchen m\u00f6glicherweise zu viel zu bauen. Ermutige zuerst eine minimale funktionierende Version.<br><b>Fehlende Sonderf\u00e4lle:</b> Division durch Null, leere Eingaben, negative Werte.<br><b>Code-Organisation:</b> Funktionen sollten definiert werden bevor sie aufgerufen werden.<br><b>Testen:</b> Ermutige Sch\u00fcler mit verschiedenen Eingaben zu testen.",
    differentiation: "<b>Schnellere Sch\u00fcler:</b> Erweitere das RPG mit Inventar, L\u00e4den oder mehreren Gegnern. Oder beginne Pygame zu lernen!<br><b>Sch\u00fcler mit Schwierigkeiten:</b> Konzentriere dich zuerst auf die Rechner-Aufgabe \u2014 sie ist am strukturiertesten. Lass sie auf fr\u00fchere L\u00f6sungen zur\u00fcckgreifen."
  }
};

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
//  BONUS CHALLENGES \u2014 alternative task types (Parsons / Bug-Hunt / Output-Quiz)
//  Injected as the second challenge of each seeded level so the
//  last challenge stays the "Boss" of the level.
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
const BONUS_CHALLENGES = {
  1: {
    id: "1.B1", title: "Greeting Puzzle", xp: 10, type: "parsons",
    instructions: `<p>\u{1f9e9} <b>Parsons-Puzzle:</b> Setze die Zeilen in die richtige Reihenfolge \u2014 durch Klicken (Bank \u2194 L\u00f6sung) oder per Drag &amp; Drop.</p>
<p>Ziel: Eine kleine Begr\u00fc\u00dfung ausgeben, die einen Namen und ein Level enth\u00e4lt.</p>`,
    instructions_de: `<p>\u{1f9e9} <b>Parsons-Puzzle:</b> Setze die Zeilen in die richtige Reihenfolge \u2014 durch Klicken (Bank \u2194 L\u00f6sung) oder per Drag &amp; Drop.</p>
<p>Ziel: Eine kleine Begr\u00fc\u00dfung ausgeben, die einen Namen und ein Level enth\u00e4lt.</p>`,
    parsons: {
      lines: [
        'name = "Aria"',
        'level = 7',
        'print(f"Hi {name}, Level {level}!")',
      ],
      distractors: [
        'print(name + level)',
      ],
    },
    hints: ["First create the variables, then print them", "Use an f-string with curly braces { }"],
    hints_de: ["Erst die Variablen erstellen, dann ausgeben", "f-String mit geschweiften Klammern { } verwenden"],
    title_de: "Begr\u00fc\u00dfungs-Puzzle",
    objectives: ["Recognize variables vs f-strings", "Spot a distractor that won't run"],
    objectives_de: ["Variablen und f-Strings erkennen", "Eine 'Stolperfalle' aussortieren"],
  },
  2: {
    id: "2.B1", title: "Predict the output", xp: 10, type: "output_quiz",
    instructions: `<p>\u2753 <b>Output-Quiz:</b> Lies den Code unten. Was wird ausgegeben?</p>`,
    instructions_de: `<p>\u2753 <b>Output-Quiz:</b> Lies den Code unten. Was wird ausgegeben?</p>`,
    quiz: {
      code: `x = 10\nif x > 5:\n    print("big")\nelif x > 0:\n    print("medium")\nelse:\n    print("zero")`,
      options: ["big", "medium", "zero", "Error"],
      correct: 0,
    },
    hints: ["Which condition matches FIRST?", "Once a branch fires, no other elif/else runs"],
    hints_de: ["Welche Bedingung trifft ZUERST zu?", "Sobald ein Zweig ausl\u00f6st, l\u00e4uft kein weiteres elif/else"],
    title_de: "Output vorhersagen",
    objectives: ["Trace if/elif/else execution"],
    objectives_de: ["if/elif/else-Ausf\u00fchrung gedanklich nachvollziehen"],
  },
  3: {
    id: "3.B1", title: "Fix the loop", xp: 15, type: "bug_hunt",
    instructions: `<p>\u{1f41b} <b>Bug-Jagd:</b> Der Code unten sollte die Zahlen <b>1 bis 5</b> ausgeben (jede in einer eigenen Zeile). Aber er hat einen Bug \u2014 repariere ihn!</p>`,
    instructions_de: `<p>\u{1f41b} <b>Bug-Jagd:</b> Der Code unten sollte die Zahlen <b>1 bis 5</b> ausgeben (jede in einer eigenen Zeile). Aber er hat einen Bug \u2014 repariere ihn!</p>`,
    buggyCode: `count = 1\nwhile count < 5:\n    print(count)\n`,
    hints: ["Endlosschleife? Erh\u00f6he count im Loop", "Soll bis 5 inklusive laufen (<= statt <)", "Add: count += 1"],
    hints_de: ["Endlosschleife? Erh\u00f6he count in der Schleife", "Soll bis 5 inklusive laufen (<= statt <)", "Hinzuf\u00fcgen: count += 1"],
    title_de: "Repariere die Schleife",
    objectives: ["Recognize infinite loops", "Use <= vs <"],
    objectives_de: ["Endlosschleifen erkennen", "<= vs < unterscheiden"],
    check(output) {
      const lines = output.trim().split('\n').map(s => s.trim());
      if (lines.length !== 5) return { pass: false, msg: `Erwartet: 5 Zeilen (1 bis 5), bekommen: ${lines.length}` };
      for (let i = 0; i < 5; i++) {
        if (lines[i] !== String(i + 1)) return { pass: false, msg: `Zeile ${i + 1} sollte "${i + 1}" sein, war "${lines[i]}"` };
      }
      return { pass: true, msg: "Bug gefixt!" };
    },
  },
  4: {
    id: "4.B1", title: "Function Puzzle", xp: 15, type: "parsons",
    instructions: `<p>\u{1f9e9} <b>Parsons-Puzzle:</b> Baue eine Funktion <code>square(x)</code>, die das Quadrat einer Zahl zur\u00fcckgibt und gib das Quadrat von 5 aus.</p>`,
    instructions_de: `<p>\u{1f9e9} <b>Parsons-Puzzle:</b> Baue eine Funktion <code>square(x)</code>, die das Quadrat einer Zahl zur\u00fcckgibt und gib das Quadrat von 5 aus.</p>`,
    parsons: {
      lines: [
        "def square(x):",
        "    return x * x",
        "print(square(5))",
      ],
      distractors: [
        "    print(x * x)",
        "square(5)",
      ],
    },
    hints: ["def NAME(parameter):", "Return \u2014 don't print \u2014 inside the function", "Then call the function"],
    hints_de: ["def NAME(parameter):", "Return (nicht print) innerhalb der Funktion", "Dann Funktion aufrufen"],
    title_de: "Funktions-Puzzle",
    objectives: ["Distinguish return from print", "Read code that defines vs uses a function"],
    objectives_de: ["return und print unterscheiden", "Code lesen: Funktion definieren vs verwenden"],
  },
  5: {
    id: "5.B1", title: "List Output Quiz", xp: 10, type: "output_quiz",
    instructions: `<p>\u2753 <b>Output-Quiz:</b> Was steht am Ende in <code>lst</code>?</p>`,
    instructions_de: `<p>\u2753 <b>Output-Quiz:</b> Was steht am Ende in <code>lst</code>?</p>`,
    quiz: {
      code: `lst = [1, 2, 3]\nlst.append(4)\nlst.remove(2)\nprint(lst)`,
      options: ["[1, 2, 3, 4]", "[1, 3, 4]", "[1, 4, 3]", "[1, 2, 3]"],
      correct: 1,
    },
    hints: ["append adds to the end", "remove deletes by VALUE, not index"],
    hints_de: ["append f\u00fcgt hinten an", "remove l\u00f6scht nach WERT, nicht nach Index"],
    title_de: "Listen-Quiz",
    objectives: ["Know list method effects", "Distinguish remove(value) from del list[index]"],
    objectives_de: ["Wirkung von Listen-Methoden kennen", "remove(value) vs del list[index] unterscheiden"],
  },
};

// \u2550\u2550\u2550 Wave 3: more bonus challenges (level 3 turtle + level 6\u201312) \u2550\u2550\u2550
BONUS_CHALLENGES[3] = [BONUS_CHALLENGES[3], {
  id: "3.B2", title: "Turtle: draw a square", xp: 20, type: "code",
  title_de: "Turtle: zeichne ein Quadrat",
  instructions: `<p>\u{1f422} <b>Turtle-Grafik:</b> Schreibe ein Programm, das ein <b>Quadrat</b> zeichnet \u2014 mit einer for-Schleife (kein viermal copy-paste!).</p>
<pre><code>import turtle
t = turtle.Turtle()

# Zeichne ein Quadrat mit Seitenl\u00e4nge 100
# Nutze eine for-Schleife!</code></pre>`,
  instructions_de: `<p>\u{1f422} <b>Turtle-Grafik:</b> Schreibe ein Programm, das ein <b>Quadrat</b> zeichnet \u2014 mit einer for-Schleife (kein viermal copy-paste!).</p>
<pre><code>import turtle
t = turtle.Turtle()

# Zeichne ein Quadrat mit Seitenl\u00e4nge 100
# Nutze eine for-Schleife!</code></pre>`,
  starter: `import turtle\nt = turtle.Turtle()\n\n# Zeichne ein Quadrat mit Seitenl\u00e4nge 100\n`,
  starter_de: `import turtle\nt = turtle.Turtle()\n\n# Zeichne ein Quadrat mit Seitenl\u00e4nge 100\n`,
  hints: ["for _ in range(4): drinnen t.forward(100) und t.right(90)", "Achte auf die Einr\u00fcckung", "Du brauchst genau 4 Seiten \u2014 also range(4)"],
  hints_de: ["for _ in range(4): drinnen t.forward(100) und t.right(90)", "Achte auf die Einr\u00fcckung", "Du brauchst genau 4 Seiten \u2014 also range(4)"],
  objectives: ["Use turtle for visual programming", "Apply for-loops to repeat actions"],
  objectives_de: ["Turtle f\u00fcr visuelle Programmierung nutzen", "for-Schleifen anwenden, um Aktionen zu wiederholen"],
  check(output, code) {
    if (!/import\s+turtle/.test(code)) return { pass: false, msg: "Du musst zuerst turtle importieren!" };
    if (!/\.forward\s*\(/.test(code)) return { pass: false, msg: "Nutze t.forward(...) um vorw\u00e4rts zu gehen" };
    if (!/\.(left|right)\s*\(/.test(code)) return { pass: false, msg: "Nutze t.right(...) oder t.left(...) zum Drehen" };
    if (!/\bfor\b/.test(code)) return { pass: false, msg: "Benutze eine for-Schleife \u2014 kein viermal copy-paste!" };
    if (!/range\s*\(\s*4\s*\)/.test(code)) return { pass: false, msg: "Ein Quadrat hat 4 Seiten \u2014 nutze range(4)" };
    return { pass: true, msg: "Tolles Quadrat! Probier mal range(6) mit 60\u00b0 f\u00fcr ein Sechseck." };
  },
}];

BONUS_CHALLENGES[6] = {
  id: "6.B1", title: "Dict access quiz", xp: 12, type: "output_quiz",
  title_de: "Dict-Zugriff Quiz",
  instructions: `<p>\u2753 <b>Output-Quiz:</b> Was wird ausgegeben?</p>`,
  instructions_de: `<p>\u2753 <b>Output-Quiz:</b> Was wird ausgegeben?</p>`,
  quiz: {
    code: `player = {"name": "Aria", "hp": 80}\nplayer["hp"] += 20\nprint(player["hp"])`,
    options: ["80", "100", "20", "KeyError"],
    correct: 1,
  },
  hints: ["+= addiert zum aktuellen Wert"],
  hints_de: ["+= addiert zum aktuellen Wert"],
  objectives: ["Update dict values in place"],
  objectives_de: ["Dict-Werte direkt aktualisieren"],
};

BONUS_CHALLENGES[7] = {
  id: "7.B1", title: "Caesar puzzle", xp: 18, type: "parsons",
  title_de: "Caesar-Puzzle",
  instructions: `<p>\u{1f9e9} <b>Parsons:</b> Setze die Zeilen so zusammen, dass ein Caesar-Verschl\u00fcssler f\u00fcr GROSSBUCHSTABEN entsteht.</p>`,
  instructions_de: `<p>\u{1f9e9} <b>Parsons:</b> Setze die Zeilen so zusammen, dass ein Caesar-Verschl\u00fcssler f\u00fcr GROSSBUCHSTABEN entsteht.</p>`,
  parsons: {
    lines: [
      "def encrypt(text, shift):",
      "    result = \"\"",
      "    for char in text:",
      "        result += chr((ord(char) - 65 + shift) % 26 + 65)",
      "    return result",
      "print(encrypt(\"HELLO\", 3))",
    ],
    distractors: [
      "    result += chr(ord(char) + shift)",
      "return result",
    ],
  },
  hints: ["ord('A') ist 65", "% 26 sorgt f\u00fcr Wrap-around", "Funktion zuerst definieren, dann aufrufen"],
  hints_de: ["ord('A') ist 65", "% 26 sorgt f\u00fcr Wrap-around", "Funktion zuerst definieren, dann aufrufen"],
  objectives: ["Apply modular arithmetic", "Build a function step by step"],
  objectives_de: ["Modulare Arithmetik anwenden", "Eine Funktion Schritt f\u00fcr Schritt bauen"],
};

BONUS_CHALLENGES[8] = {
  id: "8.B1", title: "Fix the class", xp: 15, type: "bug_hunt",
  title_de: "Repariere die Klasse",
  instructions: `<p>\u{1f41b} <b>Bug-Jagd:</b> Diese Klasse soll einen Helden mit Namen erstellen und begr\u00fc\u00dfen. Sie hat <b>zwei</b> Bugs \u2014 finde sie!</p>
<p>Erwartete Ausgabe:</p>
<pre><code>I am Hero!</code></pre>`,
  instructions_de: `<p>\u{1f41b} <b>Bug-Jagd:</b> Diese Klasse soll einen Helden mit Namen erstellen und begr\u00fc\u00dfen. Sie hat <b>zwei</b> Bugs \u2014 finde sie!</p>
<p>Erwartete Ausgabe:</p>
<pre><code>I am Hero!</code></pre>`,
  buggyCode: `class Hero:
    def __init__(name):
        self.name = name

    def greet():
        print(f"I am {self.name}!")

h = Hero("Hero")
h.greet()`,
  hints: ["Methoden brauchen self als ERSTEN Parameter", "Beide Methoden brauchen das"],
  hints_de: ["Methoden brauchen self als ERSTEN Parameter", "Beide Methoden brauchen das"],
  objectives: ["Recognize missing self parameter", "Debug class definitions"],
  objectives_de: ["Fehlendes self erkennen", "Klassen-Definitionen debuggen"],
  check(output) {
    if (output.trim() === "I am Hero!") return { pass: true, msg: "Bugs gefixt \u2014 beide self erg\u00e4nzt!" };
    return { pass: false, msg: 'Erwartet: "I am Hero!"' };
  },
};

BONUS_CHALLENGES[9] = {
  id: "9.B1", title: "Super quiz", xp: 12, type: "output_quiz",
  title_de: "Super-Quiz",
  instructions: `<p>\u2753 <b>Output-Quiz:</b> Was wird ausgegeben (jeweils in einer Zeile)?</p>`,
  instructions_de: `<p>\u2753 <b>Output-Quiz:</b> Was wird ausgegeben (jeweils in einer Zeile)?</p>`,
  quiz: {
    code: `class A:
    def hello(self):
        print("A")

class B(A):
    def hello(self):
        super().hello()
        print("B")

B().hello()`,
    options: ["nur A", "nur B", "A, dann B", "B, dann A"],
    options_de: ["nur A", "nur B", "A, dann B", "B, dann A"],
    correct: 2,
  },
  hints: ["super().hello() ruft die Eltern-Methode auf \u2014 VOR dem print('B')"],
  hints_de: ["super().hello() ruft die Eltern-Methode auf \u2014 VOR dem print('B')"],
  objectives: ["Trace method resolution with super()"],
  objectives_de: ["Methodenaufruf mit super() nachvollziehen"],
};

BONUS_CHALLENGES[10] = {
  id: "10.B1", title: "Build a 3x3 grid", xp: 15, type: "parsons",
  title_de: "Baue ein 3x3-Raster",
  instructions: `<p>\u{1f9e9} <b>Parsons:</b> Sortiere die Zeilen so, dass ein 3x3-Raster aus Punkten ausgegeben wird:</p>
<pre><code>. . .
. . .
. . .</code></pre>`,
  instructions_de: `<p>\u{1f9e9} <b>Parsons:</b> Sortiere die Zeilen so, dass ein 3x3-Raster aus Punkten ausgegeben wird:</p>
<pre><code>. . .
. . .
. . .</code></pre>`,
  parsons: {
    lines: [
      "grid = [[\".\" for _ in range(3)] for _ in range(3)]",
      "for row in grid:",
      "    print(\" \".join(row))",
    ],
    distractors: [
      "grid = [[\".\"] * 3] * 3",
      "print(grid)",
    ],
  },
  hints: ["Comprehension zum Bauen, dann durchlaufen und joinen", "[[...]] * 3 erstellt REFERENZEN \u2014 Vorsicht!"],
  hints_de: ["Comprehension zum Bauen, dann durchlaufen und joinen", "[[...]] * 3 erstellt REFERENZEN \u2014 Vorsicht!"],
  objectives: ["Build 2D lists safely", "Print row by row with .join()"],
  objectives_de: ["2D-Listen sicher bauen", "Zeile f\u00fcr Zeile mit .join() ausgeben"],
};

BONUS_CHALLENGES[11] = {
  id: "11.B1", title: "Comprehension quiz", xp: 12, type: "output_quiz",
  title_de: "Comprehension-Quiz",
  instructions: `<p>\u2753 <b>Output-Quiz:</b> Was wird ausgegeben?</p>`,
  instructions_de: `<p>\u2753 <b>Output-Quiz:</b> Was wird ausgegeben?</p>`,
  quiz: {
    code: `nums = [1, 2, 3, 4, 5]\nresult = [x * 2 for x in nums if x % 2 == 0]\nprint(result)`,
    options: ["[2, 4, 6, 8, 10]", "[4, 8]", "[2, 4]", "[1, 3, 5]"],
    correct: 1,
  },
  hints: ["Filter zuerst (x % 2 == 0 \u2192 gerade Zahlen), dann mal 2"],
  hints_de: ["Filter zuerst (x % 2 == 0 \u2192 gerade Zahlen), dann mal 2"],
  objectives: ["Read list comprehensions with filter + transform"],
  objectives_de: ["List Comprehensions mit Filter + Transformation lesen"],
};

BONUS_CHALLENGES[12] = {
  id: "12.B1", title: "Edge case hunter", xp: 18, type: "bug_hunt",
  title_de: "Sonderfall-J\u00e4ger",
  instructions: `<p>\u{1f41b} <b>Bug-Jagd:</b> Der Rechner soll auch <b>Division durch 0</b> abfangen. Repariere ihn so, dass <code>calculate("10 / 0")</code> nicht abst\u00fcrzt, sondern <code>Error</code> ausgibt.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>5.0
Error</code></pre>`,
  instructions_de: `<p>\u{1f41b} <b>Bug-Jagd:</b> Der Rechner soll auch <b>Division durch 0</b> abfangen. Repariere ihn so, dass <code>calculate("10 / 0")</code> nicht abst\u00fcrzt, sondern <code>Error</code> ausgibt.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>5.0
Error</code></pre>`,
  buggyCode: `def calculate(expr):
    a, op, b = expr.split()
    a, b = float(a), float(b)
    if op == "/":
        return a / b
    return None

print(calculate("10 / 2"))
print(calculate("10 / 0"))`,
  hints: ["Pr\u00fcfe ob b == 0 BEVOR du teilst", 'Bei b == 0: return "Error"', "Nutze ein if vor der Division"],
  hints_de: ["Pr\u00fcfe ob b == 0 BEVOR du teilst", 'Bei b == 0: return "Error"', "Nutze ein if vor der Division"],
  objectives: ["Guard against division by zero", "Add edge-case handling"],
  objectives_de: ["Vor Division durch 0 sch\u00fctzen", "Sonderf\u00e4lle behandeln"],
  check(output) {
    const lines = output.trim().split('\n').map(s => s.trim());
    if (lines.length !== 2) return { pass: false, msg: "Erwartet: 2 Zeilen Ausgabe." };
    if (lines[0] !== "5.0") return { pass: false, msg: 'Erste Zeile sollte "5.0" sein.' };
    if (lines[1] !== "Error") return { pass: false, msg: 'Zweite Zeile sollte "Error" sein.' };
    return { pass: true, msg: "Perfekt \u2014 Division durch Null abgefangen!" };
  },
};

(function injectBonusChallenges() {
  for (const [lvlId, entry] of Object.entries(BONUS_CHALLENGES)) {
    const level = LEVELS.find(l => l.id === parseInt(lvlId, 10));
    if (!level) continue;
    const items = Array.isArray(entry) ? entry : [entry];
    items.forEach((bonus, idx) => {
      if (level.challenges.some(c => c.id === bonus.id)) return;
      if (!bonus.check) bonus.check = () => ({ pass: true, msg: "ok" });
      // First bonus at idx 1, additional bonuses interleaved further inside (still not last)
      const insertAt = Math.min(level.challenges.length - 1, 1 + idx);
      level.challenges.splice(insertAt, 0, bonus);
    });
  }
})();

// Solutions for bug-hunt bonuses (parsons / quiz have no canonical Python solution).
SOLUTIONS["1.B1"]  = `name = "Aria"\nlevel = 7\nprint(f"Hi {name}, Level {level}!")`;
SOLUTIONS["2.B1"]  = "# Quiz: correct answer is 'big' (x = 10 \u2192 first if matches).";
SOLUTIONS["3.B1"]  = `count = 1\nwhile count <= 5:\n    print(count)\n    count += 1`;
SOLUTIONS["3.B2"]  = `import turtle\nt = turtle.Turtle()\n\nfor _ in range(4):\n    t.forward(100)\n    t.right(90)`;
SOLUTIONS["4.B1"]  = `def square(x):\n    return x * x\n\nprint(square(5))`;
SOLUTIONS["5.B1"]  = "# Quiz: correct answer is [1, 3, 4]\n# append(4) -> [1,2,3,4]; remove(2) -> [1,3,4]";
SOLUTIONS["6.B1"]  = "# Quiz: correct answer is 100 (80 + 20).";
SOLUTIONS["7.B1"]  = `def encrypt(text, shift):\n    result = ""\n    for char in text:\n        result += chr((ord(char) - 65 + shift) % 26 + 65)\n    return result\nprint(encrypt("HELLO", 3))`;
SOLUTIONS["8.B1"]  = `class Hero:\n    def __init__(self, name):\n        self.name = name\n\n    def greet(self):\n        print(f"I am {self.name}!")\n\nh = Hero("Hero")\nh.greet()`;
SOLUTIONS["9.B1"]  = "# Quiz: super().hello() prints 'A', then print('B') runs. Answer: 'A, dann B'.";
SOLUTIONS["10.B1"] = `grid = [["." for _ in range(3)] for _ in range(3)]\nfor row in grid:\n    print(" ".join(row))`;
SOLUTIONS["11.B1"] = "# Quiz: only 2 and 4 are even -> [4, 8].";
SOLUTIONS["12.B1"] = `def calculate(expr):\n    a, op, b = expr.split()\n    a, b = float(a), float(b)\n    if op == "/":\n        if b == 0:\n            return "Error"\n        return a / b\n    return None\n\nprint(calculate("10 / 2"))\nprint(calculate("10 / 0"))`;

// ═══════════════════════════════════════════════════════════
//  WAVE 7: MORE BONUS CHALLENGES
//  A second bonus per level to broaden the variety of task
//  types and reinforce typical Python "gotchas". Injected
//  AFTER the wave-5 bonus, so the level's last challenge stays
//  the Boss.
// ═══════════════════════════════════════════════════════════
const BONUS_WAVE7 = {
  1: {
    id: "1.B2", title: "Strings & numbers quiz", title_de: "Strings & Zahlen Quiz",
    xp: 12, type: "output_quiz",
    instructions:    `<p>❓ <b>Output-Quiz:</b> Was wird ausgegeben?</p>`,
    instructions_de: `<p>❓ <b>Output-Quiz:</b> Was wird ausgegeben?</p>`,
    quiz: {
      code: `name = "Aria"\nage = 14\nprint(name + " ist " + str(age))`,
      options: ["Aria + ist + 14", "Aria ist 14", "Aria ist age", "TypeError"],
      correct: 1,
    },
    hints: ["str(...) wandelt eine Zahl in einen String um", "+ zwischen Strings hängt sie aneinander"],
    hints_de: ["str(...) wandelt eine Zahl in einen String um", "+ zwischen Strings hängt sie aneinander"],
    objectives: ["Know why str() is needed when mixing types"],
    objectives_de: ["Wissen wofür str() beim Mischen von Typen nötig ist"],
  },
  2: {
    id: "2.B2", title: "Nested if puzzle", title_de: "Verschachteltes-if Puzzle",
    xp: 15, type: "parsons",
    instructions:    `<p>\u{1f9e9} <b>Parsons:</b> Sortiere die Zeilen so, dass für x=3, y=-1 das Quadrant-System „Q4" ausgibt.</p>
<p>Quadranten: x>0,y>0=Q1 · x>0,y<0=Q4 · sonst „other".</p>`,
    instructions_de: `<p>\u{1f9e9} <b>Parsons:</b> Sortiere die Zeilen so, dass für x=3, y=-1 das Quadrant-System „Q4" ausgibt.</p>
<p>Quadranten: x>0,y>0=Q1 · x>0,y<0=Q4 · sonst „other".</p>`,
    parsons: {
      lines: [
        "x, y = 3, -1",
        "if x > 0:",
        "    if y > 0:",
        "        print(\"Q1\")",
        "    else:",
        "        print(\"Q4\")",
        "else:",
        "    print(\"other\")",
      ],
      distractors: [
        "if x > 0 and y > 0:",
        "elif y > 0:",
      ],
    },
    hints: ["Erst Variablen, dann äußeres if, dann inneres if/else", "Der äußere else-Zweig fängt alle x<=0-Fälle"],
    hints_de: ["Erst Variablen, dann äußeres if, dann inneres if/else", "Der äußere else-Zweig fängt alle x<=0-Fälle"],
    objectives: ["Nest if-statements correctly", "Track indentation across levels"],
    objectives_de: ["if-Anweisungen korrekt verschachteln", "Einrückung über Ebenen sauber halten"],
  },
  4: {
    id: "4.B2", title: "return vs print", title_de: "return vs print",
    xp: 15, type: "bug_hunt",
    instructions:    `<p>\u{1f41b} <b>Bug-Jagd:</b> Diese Funktion soll den verdoppelten Wert zurückgeben — und der Aufrufer soll ihn ausgeben. Aktuell läuft etwas schief: <code>result</code> ist <code>None</code>.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>10</code></pre>`,
    instructions_de: `<p>\u{1f41b} <b>Bug-Jagd:</b> Diese Funktion soll den verdoppelten Wert zurückgeben — und der Aufrufer soll ihn ausgeben. Aktuell läuft etwas schief: <code>result</code> ist <code>None</code>.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>10</code></pre>`,
    buggyCode: `def double(x):\n    print(x * 2)\n\nresult = double(5)\nprint(result)`,
    hints: ["Eine Funktion mit print() gibt None zurück", "Tausche print(x * 2) gegen return x * 2", "Lass den Aufrufer das print machen"],
    hints_de: ["Eine Funktion mit print() gibt None zurück", "Tausche print(x * 2) gegen return x * 2", "Lass den Aufrufer das print machen"],
    objectives: ["Distinguish return from print", "Read function outputs vs. side-effects"],
    objectives_de: ["return und print sicher unterscheiden", "Rückgabewerte vs. Seiteneffekte lesen"],
    check(output) {
      const lines = output.trim().split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.length === 1 && lines[0] === "10") return { pass: true, msg: "Bug gefixt!" };
      if (lines.length === 2 && lines[0] === "10" && lines[1] === "None") return { pass: false, msg: "Du druckst noch in der Funktion. Nutze return statt print." };
      return { pass: false, msg: 'Erwartet: nur "10" in der Ausgabe.' };
    },
  },
  5: {
    id: "5.B2", title: "Slicing quiz", title_de: "Slicing-Quiz",
    xp: 12, type: "output_quiz",
    instructions:    `<p>❓ <b>Output-Quiz:</b> Was wird ausgegeben?</p>`,
    instructions_de: `<p>❓ <b>Output-Quiz:</b> Was wird ausgegeben?</p>`,
    quiz: {
      code: `lst = [10, 20, 30, 40, 50]\nprint(lst[1:4])`,
      options: ["[10, 20, 30, 40]", "[20, 30, 40, 50]", "[20, 30, 40]", "[10, 20, 30]"],
      correct: 2,
    },
    hints: ["lst[a:b] geht von Index a bis vor Index b — b ist NICHT enthalten."],
    hints_de: ["lst[a:b] geht von Index a bis vor Index b — b ist NICHT enthalten."],
    objectives: ["Read list slices [a:b] correctly"],
    objectives_de: ["List-Slicing [a:b] korrekt lesen"],
  },
  6: {
    id: "6.B2", title: "Word counter Parsons", title_de: "Wortzähler-Puzzle",
    xp: 18, type: "parsons",
    instructions:    `<p>\u{1f9e9} <b>Parsons:</b> Setze die Zeilen so zusammen, dass jedes Wort gezählt wird. Erwartet: <code>{'apple': 2, 'banana': 1}</code></p>`,
    instructions_de: `<p>\u{1f9e9} <b>Parsons:</b> Setze die Zeilen so zusammen, dass jedes Wort gezählt wird. Erwartet: <code>{'apple': 2, 'banana': 1}</code></p>`,
    parsons: {
      lines: [
        "counts = {}",
        "for word in [\"apple\", \"banana\", \"apple\"]:",
        "    counts[word] = counts.get(word, 0) + 1",
        "print(counts)",
      ],
      distractors: [
        "counts[word] += 1",
        "for word, count in counts.items():",
      ],
    },
    hints: [".get(key, default) gibt default zurück wenn key fehlt", "Du brauchst nur EINE Schleife"],
    hints_de: [".get(key, default) gibt default zurück wenn key fehlt", "Du brauchst nur EINE Schleife"],
    objectives: ["Build the classic counting pattern", "Use .get(key, default) to avoid KeyError"],
    objectives_de: ["Das klassische Zähl-Muster bauen", ".get(key, default) gegen KeyError nutzen"],
  },
  8: {
    id: "8.B2", title: "self.attr hunt", title_de: "self.attr-Jagd",
    xp: 18, type: "bug_hunt",
    instructions:    `<p>\u{1f41b} <b>Bug-Jagd:</b> Der Trank soll die HP des Spielers wiederherstellen — aber irgendwie ändert sich nichts. Repariere den Code.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>50
80</code></pre>`,
    instructions_de: `<p>\u{1f41b} <b>Bug-Jagd:</b> Der Trank soll die HP des Spielers wiederherstellen — aber irgendwie ändert sich nichts. Repariere den Code.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>50
80</code></pre>`,
    buggyCode: `class Player:
    def __init__(self, hp):
        self.hp = hp

    def heal(self, amount):
        hp = hp + amount

p = Player(50)
print(p.hp)
p.heal(30)
print(p.hp)`,
    hints: ["Methoden müssen self.hp lesen UND schreiben, nicht eine lokale hp", "self.hp = self.hp + amount"],
    hints_de: ["Methoden müssen self.hp lesen UND schreiben, nicht eine lokale hp", "self.hp = self.hp + amount"],
    objectives: ["Mutate instance attributes via self.", "Spot local vs. attribute confusions"],
    objectives_de: ["Instanz-Attribute über self. ändern", "Lokale vs. Attribut-Variablen unterscheiden"],
    check(output) {
      const lines = output.trim().split('\n').map(s => s.trim());
      if (lines.length === 2 && lines[0] === "50" && lines[1] === "80") return { pass: true, msg: "Geheilt!" };
      return { pass: false, msg: 'Erwartet: "50" gefolgt von "80".' };
    },
  },
  10: {
    id: "10.B2", title: "Mutation gotcha", title_de: "Mutation-Falle",
    xp: 15, type: "output_quiz",
    instructions:    `<p>❓ <b>Output-Quiz:</b> Was wird ausgegeben? Klassische 2D-Falle.</p>`,
    instructions_de: `<p>❓ <b>Output-Quiz:</b> Was wird ausgegeben? Klassische 2D-Falle.</p>`,
    quiz: {
      code: `grid = [[0] * 3] * 3\ngrid[0][0] = 1\nprint(grid)`,
      options: [
        "[[1, 0, 0], [0, 0, 0], [0, 0, 0]]",
        "[[1, 0, 0], [1, 0, 0], [1, 0, 0]]",
        "[[1, 1, 1], [0, 0, 0], [0, 0, 0]]",
        "TypeError",
      ],
      correct: 1,
    },
    hints: ["[X] * 3 erstellt drei Referenzen auf DASSELBE Objekt", "Ändert man eines, ändern sich alle"],
    hints_de: ["[X] * 3 erstellt drei Referenzen auf DASSELBE Objekt", "Ändert man eines, ändern sich alle"],
    objectives: ["Recognize the [X] * n reference gotcha", "Prefer comprehensions for 2D grids"],
    objectives_de: ["Die [X] * n-Referenz-Falle erkennen", "2D-Raster lieber per Comprehension bauen"],
  },
};

(function injectWave7Bonus() {
  for (const [lvlId, b] of Object.entries(BONUS_WAVE7)) {
    const level = LEVELS.find(l => l.id === parseInt(lvlId, 10));
    if (!level) continue;
    if (level.challenges.some(c => c.id === b.id)) continue;
    if (!b.check) b.check = () => ({ pass: true, msg: "ok" });
    // Insert at index 2 (after first standard task and the first wave-5 bonus)
    const insertAt = Math.min(level.challenges.length - 1, 2);
    level.challenges.splice(insertAt, 0, b);
  }
})();

// Solutions for the bug-hunt wave-7 bonuses
SOLUTIONS["1.B2"]  = "# Quiz: 'Aria ist 14' (str() macht die int 14 zu einem String, dann werden alle drei verbunden).";
SOLUTIONS["2.B2"]  = `x, y = 3, -1\nif x > 0:\n    if y > 0:\n        print("Q1")\n    else:\n        print("Q4")\nelse:\n    print("other")`;
SOLUTIONS["4.B2"]  = `def double(x):\n    return x * 2\n\nresult = double(5)\nprint(result)`;
SOLUTIONS["5.B2"]  = "# Quiz: [20, 30, 40] (Index 1 inklusive, Index 4 exklusive).";
SOLUTIONS["6.B2"]  = `counts = {}\nfor word in ["apple", "banana", "apple"]:\n    counts[word] = counts.get(word, 0) + 1\nprint(counts)`;
SOLUTIONS["8.B2"]  = `class Player:\n    def __init__(self, hp):\n        self.hp = hp\n\n    def heal(self, amount):\n        self.hp = self.hp + amount\n\np = Player(50)\nprint(p.hp)\np.heal(30)\nprint(p.hp)`;
SOLUTIONS["10.B2"] = "# Quiz: alle drei Zeilen werden 1 — weil [[0]*3]*3 dreimal dieselbe Zeile speichert.";

// ═══════════════════════════════════════════════════════════
//  WAVE 8: BONUS for previously-thin levels (7, 9, 11, 12)
// ═══════════════════════════════════════════════════════════
const BONUS_WAVE8 = {
  7: {
    id: "7.B2", title: "Case-sensitive search", title_de: "Groß-/Kleinschreibung",
    xp: 14, type: "bug_hunt",
    instructions:    `<p>\u{1f41b} <b>Bug-Jagd:</b> Der Code soll <code>"Found!"</code> ausgeben, wenn das Wort „hello" (egal in welcher Schreibweise) im Satz vorkommt. Aktuell findet er nichts. Repariere ihn.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>Found!</code></pre>`,
    instructions_de: `<p>\u{1f41b} <b>Bug-Jagd:</b> Der Code soll <code>"Found!"</code> ausgeben, wenn das Wort „hello" (egal in welcher Schreibweise) im Satz vorkommt. Aktuell findet er nichts. Repariere ihn.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>Found!</code></pre>`,
    buggyCode: `sentence = "Hello World"\nif "hello" in sentence:\n    print("Found!")\nelse:\n    print("Not found")`,
    hints: ["Strings sind case-sensitive: 'Hello' ≠ 'hello'", "Mit .lower() machst du alles klein bevor du suchst", "if 'hello' in sentence.lower():"],
    hints_de: ["Strings sind case-sensitive: 'Hello' ≠ 'hello'", "Mit .lower() machst du alles klein bevor du suchst", "if 'hello' in sentence.lower():"],
    objectives: ["Normalize strings with .lower() / .upper()", "Use 'in' for substring checks"],
    objectives_de: ["Strings mit .lower() / .upper() vereinheitlichen", "'in' für Teilstring-Suche nutzen"],
    check(output) {
      if (output.trim() === "Found!") return { pass: true, msg: "Gefunden!" };
      return { pass: false, msg: 'Erwartet: genau "Found!"' };
    },
  },
  9: {
    id: "9.B2", title: "super().__init__() missing", title_de: "super().__init__() fehlt",
    xp: 18, type: "bug_hunt",
    instructions:    `<p>\u{1f41b} <b>Bug-Jagd:</b> Ein Hund ERBT von Pet, aber der Konstruktor leitet den Namen nicht weiter. Beim Zugriff auf <code>d.name</code> kracht's. Repariere die Unterklasse.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>Rex
Labrador</code></pre>`,
    instructions_de: `<p>\u{1f41b} <b>Bug-Jagd:</b> Ein Hund ERBT von Pet, aber der Konstruktor leitet den Namen nicht weiter. Beim Zugriff auf <code>d.name</code> kracht's. Repariere die Unterklasse.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>Rex
Labrador</code></pre>`,
    buggyCode: `class Pet:\n    def __init__(self, name):\n        self.name = name\n\nclass Dog(Pet):\n    def __init__(self, name, breed):\n        self.breed = breed\n\nd = Dog("Rex", "Labrador")\nprint(d.name)\nprint(d.breed)`,
    hints: ["Im Unterklassen-__init__ wird der Eltern-__init__ NICHT automatisch aufgerufen", "Nutze super().__init__(name) als erste Zeile", "Erst Eltern initialisieren, dann eigene Attribute setzen"],
    hints_de: ["Im Unterklassen-__init__ wird der Eltern-__init__ NICHT automatisch aufgerufen", "Nutze super().__init__(name) als erste Zeile", "Erst Eltern initialisieren, dann eigene Attribute setzen"],
    objectives: ["Use super().__init__ to chain constructors", "Know that inheritance doesn't auto-init"],
    objectives_de: ["super().__init__ für Konstruktor-Kette nutzen", "Wissen: Vererbung ruft Eltern-__init__ nicht auto auf"],
    check(output) {
      const lines = output.trim().split('\n').map(s => s.trim());
      if (lines.length === 2 && lines[0] === "Rex" && lines[1] === "Labrador") return { pass: true, msg: "Vererbung repariert!" };
      return { pass: false, msg: 'Erwartet: "Rex" gefolgt von "Labrador".' };
    },
  },
  11: {
    id: "11.B2", title: "filter + lambda Puzzle", title_de: "filter + lambda Puzzle",
    xp: 16, type: "parsons",
    instructions:    `<p>\u{1f9e9} <b>Parsons:</b> Filtere mit <code>lambda</code> die Zahlen größer 4 aus der Liste. Erwartete Ausgabe: <code>[7, 9, 5]</code>.</p>`,
    instructions_de: `<p>\u{1f9e9} <b>Parsons:</b> Filtere mit <code>lambda</code> die Zahlen größer 4 aus der Liste. Erwartete Ausgabe: <code>[7, 9, 5]</code>.</p>`,
    parsons: {
      lines: [
        "nums = [3, 7, 2, 9, 5]",
        "big = list(filter(lambda x: x > 4, nums))",
        "print(big)",
      ],
      distractors: [
        "big = filter(nums, lambda x: x > 4)",
        "big = list(filter(x > 4, nums))",
      ],
    },
    hints: ["filter(funktion, iterable) — nicht andersrum", "lambda x: x > 4 ist eine kurze Funktion", "filter gibt einen Iterator zurück — list() wandelt um"],
    hints_de: ["filter(funktion, iterable) — nicht andersrum", "lambda x: x > 4 ist eine kurze Funktion", "filter gibt einen Iterator zurück — list() wandelt um"],
    objectives: ["Use filter() with a lambda", "Convert iterators with list()"],
    objectives_de: ["filter() mit lambda nutzen", "Iteratoren mit list() konvertieren"],
  },
  12: {
    id: "12.B2", title: "Highscore display", title_de: "Highscore-Anzeige",
    xp: 18, type: "parsons",
    instructions:    `<p>\u{1f9e9} <b>Parsons:</b> Zeige die Top 3 Spieler:innen sortiert nach Punktzahl, formatiert als Tabelle.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>1. Aria: 9500
2. Zoe: 9100
3. Luna: 8800</code></pre>`,
    instructions_de: `<p>\u{1f9e9} <b>Parsons:</b> Zeige die Top 3 Spieler:innen sortiert nach Punktzahl, formatiert als Tabelle.</p>
<p>Erwartete Ausgabe:</p>
<pre><code>1. Aria: 9500
2. Zoe: 9100
3. Luna: 8800</code></pre>`,
    parsons: {
      lines: [
        'scores = [{"n": "Aria", "s": 9500}, {"n": "Zoe", "s": 9100}, {"n": "Luna", "s": 8800}]',
        'top = sorted(scores, key=lambda x: x["s"], reverse=True)[:3]',
        "for i, p in enumerate(top, 1):",
        "    print(f'{i}. {p[\"n\"]}: {p[\"s\"]}')",
      ],
      distractors: [
        "top = sorted(scores)[:3]",
        "for p in scores:",
      ],
    },
    hints: ["sorted(..., key=lambda x: x['s'], reverse=True) sortiert nach Score absteigend", "[:3] nimmt die ersten 3", "enumerate(top, 1) gibt (Index, Eintrag) mit Start-Index 1"],
    hints_de: ["sorted(..., key=lambda x: x['s'], reverse=True) sortiert nach Score absteigend", "[:3] nimmt die ersten 3", "enumerate(top, 1) gibt (Index, Eintrag) mit Start-Index 1"],
    objectives: ["Sort dicts by a key with lambda", "Use enumerate to add an index in output"],
    objectives_de: ["Dicts mit lambda nach Wert sortieren", "Mit enumerate Index zur Ausgabe hinzufügen"],
  },
};

(function injectWave8Bonus() {
  for (const [lvlId, b] of Object.entries(BONUS_WAVE8)) {
    const level = LEVELS.find(l => l.id === parseInt(lvlId, 10));
    if (!level) continue;
    if (level.challenges.some(c => c.id === b.id)) continue;
    if (!b.check) b.check = () => ({ pass: true, msg: "ok" });
    const insertAt = Math.min(level.challenges.length - 1, 2);
    level.challenges.splice(insertAt, 0, b);
  }
})();

SOLUTIONS["7.B2"]  = `sentence = "Hello World"\nif "hello" in sentence.lower():\n    print("Found!")\nelse:\n    print("Not found")`;
SOLUTIONS["9.B2"]  = `class Pet:\n    def __init__(self, name):\n        self.name = name\n\nclass Dog(Pet):\n    def __init__(self, name, breed):\n        super().__init__(name)\n        self.breed = breed\n\nd = Dog("Rex", "Labrador")\nprint(d.name)\nprint(d.breed)`;
SOLUTIONS["11.B2"] = `nums = [3, 7, 2, 9, 5]\nbig = list(filter(lambda x: x > 4, nums))\nprint(big)`;
SOLUTIONS["12.B2"] = `scores = [{"n": "Aria", "s": 9500}, {"n": "Zoe", "s": 9100}, {"n": "Luna", "s": 8800}]\ntop = sorted(scores, key=lambda x: x["s"], reverse=True)[:3]\nfor i, p in enumerate(top, 1):\n    print(f'{i}. {p["n"]}: {p["s"]}')`;

// ═══════════════════════════════════════════════════════════
//  STORY CUTSCENES  —  Pythonia narrative beats (wave 16)
//  Triggered AFTER finishing the entire level. Each cutscene
//  has 2-3 scenes the player clicks through.
// ═══════════════════════════════════════════════════════════
const CUTSCENES = {
  3: {
    title_en: "The Forest's End",
    title_de: "Am Ende des Waldes",
    scenes: [
      {
        art:    "\u{1f332}\u{1f332}\u{1f333}\u{1f333}\u{1f332}\u{1f332}\u{1f333}\n  \u{1f9cd}\u{200d}\u{2640}\u{fe0f}  ➜  ✨\n\u{1f333}\u{1f332}\u{1f333}\u{1f333}\u{1f332}\u{1f333}\u{1f332}",
        text_en: "You loop through tree after tree until — finally — light. The Endless Forest opens onto a sunlit meadow.",
        text_de: "Du läufst Schleife für Schleife durch Bäume, bis — endlich — Licht. Der Endlose Wald öffnet sich auf eine sonnige Wiese.",
      },
      {
        art:    "✉\u{fe0f}  \u{1f4dc}\n«Hilf uns. — Die Stadtwache»",
        text_en: "A weathered letter is pinned to the last tree.\n\"Help us. — The Town Watch.\"",
        text_de: "Ein verwitterter Brief hängt am letzten Baum.\n„Hilf uns. — Die Stadtwache.\"",
      },
    ],
  },
  6: {
    title_en: "Echoes in the Library",
    title_de: "Echos in der Bibliothek",
    scenes: [
      {
        art:    "\u{1f4da}\u{1f4da}\u{1f4da}\u{1f4da}\u{1f4da}\n\u{1f4da} \u{1fab6} \u{1f4d6} \u{1fab6} \u{1f4da}\n\u{1f4da}\u{1f4da}\u{1f4da}\u{1f4da}\u{1f4da}",
        text_en: "Dust dances in shafts of light. The librarian hands you a dict — with keys you've never seen before.",
        text_de: "Staub tanzt in Lichtstrahlen. Die Bibliothekarin reicht dir ein Dictionary — mit Schlüsseln, die du nie zuvor gesehen hast.",
      },
      {
        art:    "\u{1f5fa}\u{fe0f}\n  ✖  ← here be Bugs",
        text_en: "Inside, a brittle map. A black ✕ marked deep in the dungeon.\n\"Here be Bugs.\"",
        text_de: "Innen eine brüchige Karte. Ein schwarzes ✕ tief im Dungeon markiert.\n„Hier wohnen Bugs.\"",
      },
    ],
  },
  9: {
    title_en: "Inherited Strength",
    title_de: "Geerbte Stärke",
    scenes: [
      {
        art:    "\u{1f464}\n  │\n\u{1f475}  «Du bist deiner Vorfahrin sehr ähnlich…»",
        text_en: "In a glade you meet a ghost — your coder ancestor.\n\"Take this,\" she says, \"the methods we passed down.\"",
        text_de: "In einer Lichtung triffst du einen Geist — deine Vor-Programmiererin.\n„Nimm das\", sagt sie, „die Methoden, die wir vererbt haben.\"",
      },
      {
        art:    "\u{1f5e1}\u{fe0f} ✨\n    │\n    ➜  super().attack()",
        text_en: "She hands you a blade. On its hilt, etched: super().attack().",
        text_de: "Sie reicht dir eine Klinge. Im Griff eingraviert: super().attack().",
      },
    ],
  },
  11: {
    title_en: "The Bug Lord Stirs",
    title_de: "Der Bug-Lord erwacht",
    scenes: [
      {
        art:    "\u{1f329}\u{fe0f}\u{1f329}\u{fe0f}\u{1f329}\u{fe0f}\n   \u{1f441}\u{fe0f}\u{1f441}\u{fe0f}\n     \u{1f480}\n\u{1f329}\u{fe0f}\u{1f329}\u{fe0f}\u{1f329}\u{fe0f}",
        text_en: "The sky tears open. Comprehensions, lambdas, try/except — your toolkit hums with new weight.",
        text_de: "Der Himmel reißt auf. Comprehensions, Lambdas, try/except — dein Werkzeug summt mit neuer Macht.",
      },
      {
        art:    "\u{1f41b}\u{1f451}\u{1f41b}\nTraceback (most recent call):\n  File \"pythonia\", line 999\n    Hero must face the Lord",
        text_en: "A traceback writes itself across the sky.\nNo debugger can avoid this fight.",
        text_de: "Ein Traceback schreibt sich quer über den Himmel.\nKein Debugger kann diesem Kampf ausweichen.",
      },
    ],
  },
  12: {
    title_en: "End Credits",
    title_de: "Abspann",
    scenes: [
      {
        art:    "\u{1f451}\n\u{1f3c6}\n✨ \u{1f98b} ✨\nPythonia is free.",
        text_en: "The Bug Lord's body crumbles into a clean stack trace, then into silence.\nPythonia is free.",
        text_de: "Der Körper des Bug-Lords zerfällt zu einem sauberen Stack-Trace, dann zu Stille.\nPythonia ist frei.",
      },
      {
        art:    "\u{1f4d6}\n«Du hast Python gemeistert.\nJetzt ist die Welt dein Editor.»",
        text_en: "You sit by the campfire and open a notebook.\nThe next chapter you write yourself.",
        text_de: "Du sitzt am Lagerfeuer und öffnest ein Notebook.\nDas nächste Kapitel schreibst du selbst.",
      },
      {
        art:    "Made with \u{1f40d} + ❤\u{fe0f}\nDr. Winkelmann · PyWinkelix",
        text_en: "Thanks for playing.\n— Dr. Winkelmann",
        text_de: "Danke fürs Spielen.\n— Dr. Winkelmann",
      },
    ],
  },
};

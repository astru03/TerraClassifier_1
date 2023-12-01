// Hier müssen die Daten hingeschickt werden, verarbeitet und zurückgesendet. das ist die API.
// Dabei muss es den openEO-Spezifikationen folgen (z.b. Prozessgraph)

// Hier werden nur die Satellitenbilder herausgesucht und zu datacubs gemacht

    // Hier muss die API die URL erhalten und in dieser URL müssen koordinaten des Rechteckes und des Zeitraumes stehen
    // Zeitraum darf nicht größer sein als 2 Wochen!!!!
    // Mit diesen werten wird dann die STAC API angezogen und die Satelitenbilder herangezogen
    // Wenn ein Zeitraum ausgewählt wurde (z.b. 2 Wochen) wofür es mehrere Satelitenbilder für den Bereich gibt, muss eine Auswahlmöglichkeit vorhanden sein
    // sodass der user auswählen kann welche bilder von welchem Zeitraum er verwenden möchte.
    // Die satelitenbilder müssen verarbeitet werden. Mit openEOcubes oder GDALcubes


// Über res werden die geholten satelitenbilder wieder an das frontend zurückgesendet und dort angezeigt.
// WICHTIG: Die Satelitenbilder müssen weiterhin beibehalten werden!! WIE??????

// Trainigsdaten zeichnen
    // Mit der Funktion kann der user trainigsdaten zeichnen. 
    // User muss zunächst ein AOT (Areo of Trainig) indem er ein rechteck zeichnet.
    // Für das Rechteck werden die Satellitenbilder herangezogen. immer die aktuellsten.
    // nur innerhalb der koordinaten von den Satellitenbildern darf der user trainigsdaten zeichnen.
    // Wenn außerhalb, muss eine Fehlermeldung erscheiben oder zuvor ein hinweis, dass Trainigsdaten 
    // außerhalb der korrdinaten von den Satellitenbildern nicht mitberücksichtigt werden.
    // Trainigsdaten können abgespeichert werden als JSON und Geopackage
// WICHTIG: Trainigsdaten müssen weiterhin beibehalten werden!! WIE??????

// Algorithmus auswahlen

// Alle informationen (Satelitenbilder, Trainigsgebiete Algorithmus) müssen an das R backend gesendet werden?
// Dort findet das modelltrainig statt? ODER SOLL DAS ganze R skript auch in diesem backend laufen?

// Wenn das modell trainiert wurde muss dies abspeichebar sein

// Klassifikation
// mit dem trainirten Modell und den Satellitenbildern aus dem ersten Teil muss die klassifikation erfolgen


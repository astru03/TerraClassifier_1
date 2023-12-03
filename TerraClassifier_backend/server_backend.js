const express = require('express');
const app = express();
const port = process.env.PORT || 8080


const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Middleware für CORS aktivieren
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000'); // Hier können die erlaubten Origin-Domains spezifiziert werden
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.post('/satellite', (req, res) => {
    const receivedDatum = req.body.Datum;
    const receivedNEC = req.body.NEC;
    const receivedSWC = req.body.SWC;
    // Beispiel: Wenn die Koordinaten im Terminal ausgegeben werden sollen
    console.log(receivedDatum);
    console.log(receivedNEC);
    console.log(receivedSWC);
    //URL des AWS für Sentinel-2 Daten aufrufen

    const apiUrl = 'https://earth-search.aws.element84.com/v1'; // STAC server URL

    async function queryStacEndpoint() {
      console.log('kommt')
      try {
        const response = await fetch(`${apiUrl}/collections`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Hier könnten weitere Header für Authentifizierung oder andere Anforderungen hinzugefügt werden
          },
        });
    
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
    
        const data = await response.json();
        // Verarbeite die Daten, die von der API zurückgegeben wurden
        console.log('Erhaltene Daten:', data);
      } catch (error) {
        console.error('Es gab ein Problem beim Abrufen der Daten:', error);
      }
    }
    
    // Aufruf der Funktion zur Abfrage des STAC-Endpunkts
    queryStacEndpoint();

    
    //Wie ein Objekt wieder zurückgegeben werden kann
    let modifiedData = {valueDate: receivedDatum, valueNEC: receivedNEC, valueSWC: receivedSWC, message: 'Erfolg'}
    console.log(modifiedData);

    if (modifiedData != null ) {
      res.json(modifiedData)
    } else {
      res.status(400).json({ error: 'Ungültige Anfrage' });
    }
    
  });





//Listener
app.listen(port, () => {
    console.log(`Backend Service listening at http://localhost:${port}`)
  });


// Hier müssen die Daten hingeschickt werden, verarbeitet und zurückgesendet. das ist die API.
// Dabei muss es den openEO-Spezifikationen folgen (z.b. Prozessgraph)

// Hier werden nur die Satellitenbilder herausgesucht und zu datacubs gemacht

    // Hier muss die API die URL erhalten und in dieser URL müssen koordinaten des Rechteckes und des Zeitraumes stehen
    // Zeitraum darf nicht größer sein als 2 Wochen!!!!
    // Mit diesen werten wird dann die STAC API angezogen und die Satelitenbilder herangezogen
    // Wenn ein Zeitraum ausgewählt wurde (z.b. 2 Wochen) wofür es mehrere Satelitenbilder für den Bereich gibt, muss eine Auswahlmöglichkeit vorhanden sein
    // sodass der user auswählen kann welche bilder von welchem Zeitraum er verwenden möchte.
    // Die satelitenbilder müssen verarbeitet werden. Mit openEOcubes oder GDALcubes???


// Über res werden die geholten satelitenbilder wieder an das frontend zurückgesendet und dort angezeigt.
// WICHTIG: Die Satelitenbilder müssen weiterhin beibehalten werden!! WIE?????? oder gleichzeitig an das R backend schicken

// Trainigsdaten zeichnen
    // Mit der Funktion kann der user trainigsdaten zeichnen. 
    // User muss zunächst ein AOT (Areo of Trainig) indem er ein rechteck zeichnet.
    // Für das Rechteck werden die Satellitenbilder herangezogen. immer die aktuellsten.
    // nur innerhalb der koordinaten von den Satellitenbildern darf der user trainigsdaten zeichnen.
    // Wenn außerhalb, muss eine Fehlermeldung erscheiben oder zuvor ein hinweis, dass Trainigsdaten 
    // außerhalb der korrdinaten von den Satellitenbildern nicht mitberücksichtigt werden.
    // Trainigsdaten können abgespeichert werden als JSON und Geopackage
// WICHTIG: Trainigsdaten müssen weiterhin beibehalten werden!! WIE?????? oder gleichzeitig an das R backend schicken

// Algorithmus auswahlen

// Alle informationen (Satelitenbilder, Trainigsgebiete Algorithmus) müssen an das R backend gesendet werden?
// Dort findet das modelltrainig statt? ODER SOLL DAS ganze R skript auch in diesem backend laufen?

// Wenn das modell trainiert wurde muss dies abspeichebar sein

// Klassifikation
// mit dem trainirten Modell und den Satellitenbildern aus dem ersten Teil muss die klassifikation erfolgen


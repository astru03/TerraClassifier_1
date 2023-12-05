const express = require('express');
const app = express();
const port = process.env.PORT || 8080
const fetch = require('node-fetch');


const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Middleware für CORS aktivieren
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000'); // Hier können die erlaubten Origin-Domains spezifiziert werden
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});


app.post('/satellite', (req, res) => {
  //check if Datum and Coordinates not null
  if(req.body.Datum == '' || req.body.NEC == '' || req.body.SWC == ''){
  //res.sendFile(reqpath + "/public/error_empty_input.html")
  console.log('Fehler Felder nicht gefüllt')
  return;
  }
  //let receivedDatum = req.body.Datum;
  //let receivedNEC = req.body.NEC;
  //let receivedSWC = req.body.SWC;
  // Beispiel: Wenn die Koordinaten im Terminal ausgegeben werden sollen
  //console.log(receivedDatum);
  //console.log(receivedNEC);
  //console.log(receivedSWC);
  // Wenn gewünscht könnte hier aus den Infos ein Objekt gemacht werden
  // let AOIInfor = {
    // AOIInfos.nec = req.body.NEC
    // AOIInfos.swc = req.body.SWC
    // AOIInfo.datum = req.body.Datum
  // }
  //------------------------------------------------------------------------------------------
//-----------------TEST ANFANG------------------
const api_url = 'https://earth-search.aws.element84.com/v1';
const collection = 'sentinel-2-l2a'; // Sentinel-2, Level 2A, Cloud Optimized GeoTiffs (COGs)
const point = {
  type: 'Point',
  coordinates: [4.89, 52.37], // Amsterdam coordinates
};
const searchBody = {
  collections: [collection],
  intersects: point,
  limit: 10,
  datetime: '2023-11-27T00:00:00Z/2023-12-03T23:59:59Z',
};
fetch(`${api_url}/search`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(searchBody),
})
  .then((response) => response.json())
  .then((data) => {
    console.log(data.context);
    const items = data.features;
    console.log(items.length);
    for (var index = 0; index < items.length; index ++) {
      let itemID = items[index].id
      console.log(itemID);
    }
    let assets = items[index].assets;
    console.log(assets);
    //console.log(items);
        /*
    items.forEach((item) => {
      console.log(item);
      console.log(item.properties.datetime);
      console.log(item.geometry);
      console.log(item.properties);
    });*/
    /*
    if (items.length > 0) {
      const firstItem = items[0];
      console.log(firstItem.properties.datetime);
      console.log(firstItem.geometry);
      console.log(firstItem.properties);
    } */
    
    
    /*
    console.log(Object.keys(assets));

    for (const key in assets) {
      if (Object.hasOwnProperty.call(assets, key)) {
        const asset = assets[key];
        console.log(`${key}: ${asset.title}`);
      }
    }
    console.log(assets["thumbnail"].href); */

  })
  .catch((error) => console.error('Error:', error));
//-----------------TEST ENDE------------------


  /*
  //-----------------TEST ANFANG------------------
  const polygonCoordinates = [
    [7.645221826577512, 51.969251756766084],
    [7.645221826577512, 51.95923063662394],
    [7.671077429750937, 51.95923063662394],
    [7.671077429750937, 51.969251756766084],
    [7.645221826577512, 51.969251756766084],
  ];
  // Konvertiere die Koordinaten in das erforderliche Format für die STAC API
  const polygonGeoJSON = {
    "type": "Polygon",
    "coordinates": [polygonCoordinates],
  };
  console.log(polygonGeoJSON);
  // Definiere den Zeitraum
  const startDate = '2023-11-27T00:00:00Z';
  const endDate = '2023-12-02T23:59:59Z';
  // Baue die Anfrage-URL für die STAC API zusammen
  const apiUrl = `https://earth-search.aws.element84.com/v1/search?datetime=${startDate}/${endDate}&intersects=${encodeURIComponent(JSON.stringify(polygonGeoJSON))}&collections=sentinel-s2-l2a-cogs`;
  console.log(apiUrl);
  // Sende die Anfrage an die STAC API
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Hier erhältst du die Daten der Sentinel-2-Bilder, die du auf der Karte anzeigen kannst
      // data enthält die Informationen zu den gefundenen Bildern
      // Beispiel: Iteriere durch die Ergebnisse
      data.features.forEach(image => {
        const imageId = image.id;
        const imageUrl = image.assets['thumbnail'].href; // Annehmen, dass 'thumbnail' das Bild ist, das du anzeigen möchtest
        const imageBounds = image.geometry.coordinates[0].map(coord => [coord[1], coord[0]]); // Leaflet erwartet Koordinaten in [lat, lng]
        console.log(imageId)
        console.log(imageUrl)
        console.log(imageBounds)
        // Erstelle ein ImageOverlay für jedes Bild
        const imageOverlay = L.imageOverlay(imageUrl, imageBounds);
        // Füge das Overlay der Karte hinzu
        imageOverlay.addTo(map);
      });
    })
    .catch(error => {
      // Behandlung von Fehlern bei der Anfrage
      console.error('Fehler beim Abrufen der Daten:', error);
    });
  //-----------------TEST ENDE------------------
*/


  /*
  // URL der STAC-API
  //let apiUrl = 'https://earth-search.aws.element84.com/v1';
  // Beispielhafte Suchkriterien für Sentinel-2-Daten (kann je nach Bedarf angepasst werden)
  let searchCriteria = {
    collections: ['sentinel-s2-l2a-cogs'], // Sentinel-2 Level-2A Daten
    datetime: '2023-11-27T00:00:00Z/2023-12-03T23:59:59Z', // Zeitraum
    intersects: {
      type: 'Polygon',
      coordinates: [[[7.645221826577512, 51.969251756766084], [7.645221826577512, 51.95923063662394], [7.671077429750937, 51.95923063662394], [7.671077429750937, 51.969251756766084],[7.645221826577512, 51.969251756766084]]] // Koordinaten des Rechtecks oder der Fläche
    }
  };
  // Aufruf der Funktion zur Abfrage des STAC-Endpunkts
  //fetchFromSTAC(apiUrl, searchCriteria); 
  */


  //------------------------------- WIE ein Objekt wieder zurück an das Frontend gegeben werden kann ------------------
  //Wie ein Objekt wieder zurückgegeben werden kann
  //let modifiedData = {valueDate: receivedDatum, valueNEC: receivedNEC, valueSWC: receivedSWC, message: 'Erfolg'}
  //console.log(modifiedData)
  //if (modifiedData != null ) {
  //  res.json(modifiedData)
  //} else {
  //  res.status(400).json({ error: 'Ungültige Anfrage' });
  //}
  //------------------------------------------------------------------------------------------------------
});



/**
 * Functionality addNewStationToDB
 * @param {*} receivedDatum
 * @param {*} receivedNEC 
 * @param {*} receivedSWC 
 */  
async function fetchFromSTAC(apiUrl, searchCriteria) 
{
  /*
  fetch(apiUrl)
  .then(response => {
    // Überprüfe, ob die Anfrage erfolgreich war (Statuscode 200)
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json(); // Konvertiere die Antwort in JSON
  })
  .then(data => {
    // Handle die erhaltenen Daten hier
    console.log('Collections:', data.collections); // Gib die Sammlungen in der Konsole aus
    // Hier kannst du mit den erhaltenen Daten arbeiten und sie anzeigen lassen
  })
  .catch(error => {
    console.error('There was a problem fetching the collections:', error);
  }); */
  
  //URL des AWS für Sentinel-2 Daten aufrufen
  try {
    //let apiUrl = 'https://earth-search.aws.element84.com/v1'; // STAC server URL  //https://earth-search.aws.element84.com/search?bbox=&
    console.log(apiUrl)
    let response = await fetch(`${apiUrl}/search`, {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchCriteria)
    });
    
    if (!response.ok) {
      throw new Error('NetworkError');
    }
    
    let data = await response.json();
    console.log('Erhaltene Daten:', data);
    } catch (error) {
      console.error('Es gab ein Problem beim Abrufen der Daten:', error);
    } 
}





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


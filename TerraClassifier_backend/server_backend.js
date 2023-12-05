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
  //check if Date and Coordinates not null
  if(req.body.Date == '' || req.body.NEC == '' || req.body.SWC == ''){
    //res.sendFile(reqpath + "/public/error_empty_input.html")
    console.log('Fehler Felder nicht gefüllt')
  return;
  }
  let receivedDate = req.body.Date;
  let receivedNEC = req.body.NEC;
  let receivedSWC = req.body.SWC;
  // Beispiel: Wenn die Koordinaten im Terminal ausgegeben werden sollen
  console.log(receivedDate);
  console.log(receivedNEC);
  console.log(receivedSWC);
  // Wenn gewünscht könnte hier aus den Infos ein Objekt gemacht werden
  // let AOIInfor = {
    // AOIInfos.nec = req.body.NEC
    // AOIInfos.swc = req.body.SWC
    // AOIInfo.date = req.body.Date
  // }

//Aus den NEC und SWC muss ein polygonCoordinates gemacht werden. Das muss noch dynamisch funktionieren
  let [NELng, NELat] = receivedNEC;
  let [SWLng, SWLat] = receivedSWC;
  let receivedNWC = [SWLng, NELat];
  let receivedSEC = [NELng, SWLat];
//Das Datum muss an den searchbody übergeben werden. Das muss noch dynamisch funktionieren



  const api_url = 'https://earth-search.aws.element84.com/v1';
  const collection = 'sentinel-2-l2a'; // Sentinel-2, Level 2A, Cloud Optimized GeoTiffs (COGs)
  /* let polygonCoordinates = [
    [7.63,51.97], //Nordosten
    [7.63,51.96], //Südosten
    [7.65,51.96], //Südwesten
    [7.65,51.97], //Nordwesten
    [7.63,51.97], //Nordosten
  ]; */
  let polygonCoordinates = [
    [receivedNEC[0], receivedNEC[1]], //Nordosten
    [receivedSEC[0], receivedSEC[1]], //Südosten
    [receivedSWC[0], receivedSWC[1]], //Südwesten
    [receivedNWC[0], receivedNWC[1]], //Nordwesten
    [receivedNEC[0], receivedNEC[1]], //Nordosten
  ];
  console.log(polygonCoordinates);
  let polygonGeoJSON = {
    "type": "Polygon",
    "coordinates": [polygonCoordinates],
  };
  const searchBody = {
    collections: [collection],
    intersects: polygonGeoJSON,
    limit: 10,
    datetime: '2023-12-01T00:00:00Z/2023-12-03T23:59:59Z',
  };



  //Könnnte man noch auslagern als eigene funktion fetchFromSTAC() um error handling zu verbessern? siehe ab Zeile 162
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
      console.log(items.length); //Wieviele wurden gefunden nach den kriterien
      let objSatellitenImages = {};
      for (var index = 0; index < items.length; index ++) {
        //let itemID = items[index].id  //So kommt man an die items.id
        //console.log(itemID);
        //let assets = items[index].assets; //So kommt man an die items.assets
        //console.log(assets);
        //let assetsThumbnail = items[index].assets.thumbnail; //So kommt man an die items.assets-thumbnails (Hier können auch andere Bänder herangezogen werden)
        //console.log(assetsThumbnail);
        //let assetsHref = items[index].assets.thumbnail.href; //So kommt man an die entsprechende imageUrl
        //console.log(assetsHref);
        //let imagebound = items[index].geometry.coordinates  //So kommt man an die imagebound Koordinaten, die für die anzeige in leaflet wichtig sind.
        //console.log(imagebound);
        
        objSatellitenImages['item_' + index] = {
          id: items[index].id, 
          url: items[index].assets.thumbnail.href,
          imageBounds: items[index].geometry.coordinates}
      }
      console.log(objSatellitenImages);
      
      //Objekt wird zurückgegeben an das Frontend
      if (objSatellitenImages != null ) {
        res.json(objSatellitenImages)
      } else {
        res.status(400).json({ error: 'Ungültige Anfrage' });
      }

    })
    .catch((error) => console.error('Error:', error));
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


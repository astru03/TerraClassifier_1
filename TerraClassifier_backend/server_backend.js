const express = require('express');
const app = express();
const port = process.env.PORT || 8080
const fetch = require('node-fetch');


const fs = require('fs');
const multer = require('multer')
const { GeoPackageAPI } = require('@ngageoint/geopackage');
const JSZIP = require('jszip');
const cors = require('cors');


const corsOptions = {
  origin: 'http://localhost:3000', // Erlaubt Anfragen von Ihrem Frontend
  optionsSuccessStatus: 200 // Für ältere Browser, die nicht standardmäßig 204 senden
};

app.use(cors(corsOptions));

app.get('/status', (req, res) => {
  res.send({status: 'ready'});
})

const uploadPath = 'upload/';

// Überprüfen, ob der Ordner existiert. Wenn nicht, erstellen Sie ihn
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}





const bodyParser = require('body-parser');
app.use(bodyParser.json());

/**
 * https://github.com/expressjs/multer
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'upload/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname) // Beibehalten des ursprünglichen Dateinamens
  }
})

const upload = multer({ storage: storage })


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

//Aus den NEC und SWC muss ein polygonCoordinates gemacht werden. Das muss noch dynamisch funktionieren
  let SplitReceivedNEC = receivedNEC.split(",") //Aufspalten am Komma um auch die Koordinaten für NWC und SEC zu erhalten
  let SplitReceivedSWC = receivedSWC.split(",") //Die sind nötig um weiter unten das Rechteckt aufzubauen
  let stringNEC = [SplitReceivedNEC[0], SplitReceivedNEC[1].trim()] 
  let stringNWC = [SplitReceivedSWC[0], SplitReceivedNEC[1].trim()];
  let stringSWC = [SplitReceivedSWC[0], SplitReceivedSWC[1].trim()]
  let stringSEC = [SplitReceivedNEC[0], SplitReceivedSWC[1].trim()];
  let NEC = stringNEC.map(parseFloat);  //um aus Array von Strings ein Array aus Gleitkommazahlen zu machen
  let NWC = stringNWC.map(parseFloat);
  let SWC = stringSWC.map(parseFloat);
  let SEC = stringSEC.map(parseFloat);

//Das Datum muss an den searchbody übergeben werden. Das muss noch dynamisch funktionieren
  const api_url = 'https://earth-search.aws.element84.com/v1';
  const collection = 'sentinel-2-l2a'; // Sentinel-2, Level 2A, Cloud Optimized GeoTiffs (COGs)
 
  let polygonCoordinates = [
    NEC, //Nordosten
    SEC, //Südosten
    SWC, //Südwesten
    NWC, //Nordwesten
    NEC, //Nordosten
  ];
  console.log(polygonCoordinates);
  let polygonGeoJSON = {
    "type": "Polygon",
    "coordinates": [polygonCoordinates],
  };

  //Datum formatieren
  let dateParts = receivedDate.split('.') //Aufspalten des Datums
  let newDate = new Date(dateParts[2],dateParts[1] - 1, dateParts[0]); //Vorsicht Monate starten bei 0. Also Janua = 0 deswegen -1 bei Monat
  let year = newDate.getFullYear();
  let month = String(newDate.getMonth() + 1).padStart(2, '0'); // Führende Nullen für Monat hinzufügen
  let day = String(newDate.getDate()).padStart(2, '0'); // Führende Nullen für Tag hinzufügen
  let NewStartDate = `${year}-${month}-${day}`;


  let startDate = new Date(NewStartDate); //Hier kommt ein komisches format raus z.b. 2023-12-03T00:00:00.000Z
  startDate.setDate(startDate.getDate() + 14); // zu dem format wird 14 Tage zum Startdatum hinzufügen
  let endDate = startDate.toISOString().split('T')[0]; // Formatieren damit nur noch das Format YYYY-MM-DD vorliegt
  let startTime = 'T00:00:00Z';
  let endTime = 'T23:59:59Z';
  let date = NewStartDate + startTime + '/' + endDate + endTime;
  //console.log(date);

  let searchBody = { 
    collections: [collection],
    intersects: polygonGeoJSON,
    limit: 10,
    datetime: date,
  };

  console.log(searchBody);

  //Fetch der API um die Bilder zu holen
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
      
      let objSatellitenImages = {}; //in diesem Objekt werden die id, die url und die imageBounds der resulate gespeichert

      
      
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
          //url: items[index].assets.visual.href,
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

//post
app.post('/geojson-save', (req, res) => {
  const data_geojson = req.body;
  fs.writeFile('data_geojson.json', JSON.stringify(data_geojson), (err) => {
    if (err) {
      res.status(500).send({ message: 'Fehler beim Speichern der GeoJSON-Daten' });
    } else {
      res.send({ message: 'Daten erfolgreich gespeichert' });
    }
  });
});

app.post('/area_of_Training', (req, res) =>{
  const area_geojson = req.body;
  fs.writeFile('area_of_Training.json', JSON.stringify(area_geojson), (err) => {
    if(err){
      res.status(500).send({message: 'Fehler'})
    }else{
      res.send({message: 'Area of Training erfolgreich gespeichert und steht zum abruf bereit!'})
    }
  })
})



//löschen alles, nicht einzeln!

app.post('/delete', (req, res) => {
  //Trainingsdaten zurücksetzen
  const deleteAll = req.body.deleteAll;
  fs.writeFile('data_geojson.json', JSON.stringify({"type": "FeatureCollection", "features": []}), err => {
    if(err){
      console.error(err)
      return res.status(500).send({message: 'Fehler beim Zurücksetzen der area_of_Training.json'})
    }
    //Alles löschen
    if(deleteAll){
      fs.writeFile('area_of_Training.json', JSON.stringify({"type": "FeatureCollection", "features": []}), err => {
        if(err){
          console.error(err)
          return res.status(500).send({message: 'Fehler beim Löschen der Daten'})
        }
        res.send({message: 'Alle Daten erfolgreich gelöscht und zurückgesetzt!'})
      })
    }
  })
})

app.get('/get-geojson', (req, res) => {
  if(fs.existsSync('data_geojson.json')){
    fs.readFile('data_geojson.json', (err, data) => {
      if (err) {
          res.status(500).send({ message: 'Fehler beim Laden der GeoJSON-Daten' });
      } else {
          res.send(data);
      }
  });
  }else{
    res.json({type: "FeatureCollection", features: []})
  }
  
});

app.get('/get_area_of_Training', (req,res) => {
  if(fs.existsSync('area_of_Training.json')){
    fs.readFile('area_of_Training.json', (err, data)=>{
      if(err){
        res.status(500).send({message: 'Fehler beim Laden der Area of Training'})
      }else{
        res.send(data)
      }
    })
  }else{
    res.send({type: "FeatureCollection", features: []})
  }
  
})


/**
 * https://www.npmjs.com/package/@ngageoint/geopackage
 * https://github.com/ngageoint/geopackage-js
 */
app.post('/upload', upload.single('file'), async(req, res) => {
  try {
    const file = req.file.path;
    const geoPackage = await GeoPackageAPI.open(file);
    const feature = geoPackage.getFeatureTables();

    const layers = {};

    for (const table of feature) {
      // Abfrage aller Features als GeoJSON
      const geojsonFeatures = geoPackage.queryForGeoJSONFeaturesInTable(table);

      layers[table] = {
        type: 'FeatureCollection',
        features: geojsonFeatures
      };
    }

    res.json({ message: 'Geopackage erfolgreich hochgeladen', data: layers });
  } catch (error) {
    console.error('Fehler beim Verarbeiten der GeoPackage-Datei:', error);
    res.status(500).send({ message: 'Fehler beim Verarbeiten der GeoPackage-Datei: ' + error.message });
  }
});

//https://github.com/Stuk/jszip

app.get('/download', async (req, res) => {
  try{
    if(fs.existsSync('data_geojson.json')){
      const geojsonData = JSON.parse(fs.readFileSync('data_geojson.json', 'utf-8'))

    //ZIP-Erstellen

    const zip = new JSZIP();
    zip.file('data_geojson', JSON.stringify(geojsonData))

    //ZIP-Datei generieren
    const Zip_data = await zip.generateAsync({ type: 'nodebuffer' });
    res.set('Content-Type', 'application/zip')
    res.set('Content-Disposition', 'attachment; filename="data.zip"')
    res.send(Zip_data)
    }else{
      console.error('Es wurden noch keine Polygone eingezeichnet', error)
    }

  }
  catch{
    res.status(500).send({message: 'Fehler beim herunterladen der ZIP-Datei'})
  }
})









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


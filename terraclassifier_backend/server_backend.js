const express = require('express');
const app = express();
const port = process.env.PORT || 8080
const fetch = require('node-fetch');


const fs = require('fs');
const multer = require('multer')
const { GeoPackageAPI } = require('@ngageoint/geopackage');
const JSZIP = require('jszip');
const cors = require('cors');
var R = require('r-script');

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
const { json } = require('express');
const { error } = require('console');
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
  //check if Date, Coordinates and Cloud-cover is not null
  if(req.body.Date == '' || req.body.NEC == '' || req.body.SWC == '' || req.body.CCI == ''){
    console.log('Fehler Felder nicht gefüllt')
  return;
  }
  let receivedDate = req.body.Date;
  let receivedNEC = req.body.NEC;
  let receivedSWC = req.body.SWC;
  let receivedCCI = req.body.CCI;

// A polygonCoordinates must be made from the northeast coordinates and the southwest coordinates.
  let SplitReceivedNEC = receivedNEC.split(",") // Split at the comma to also get the coordinates for NWC and SEC
  let SplitReceivedSWC = receivedSWC.split(",") // These are necessary to build the rectangle polygon
  let stringNEC = [SplitReceivedNEC[0], SplitReceivedNEC[1].trim()] 
  let stringNWC = [SplitReceivedSWC[0], SplitReceivedNEC[1].trim()];
  let stringSWC = [SplitReceivedSWC[0], SplitReceivedSWC[1].trim()]
  let stringSEC = [SplitReceivedNEC[0], SplitReceivedSWC[1].trim()];
  // to turn array of strings into array of floating point numbers
  let NEC = stringNEC.map(parseFloat);
  let NWC = stringNWC.map(parseFloat);
  let SWC = stringSWC.map(parseFloat);
  let SEC = stringSEC.map(parseFloat);

  // Koordinaten von AOI und AOT in liste pushen. ?????????????
  
  // STAC API from AWS S3
  const api_url = 'https://earth-search.aws.element84.com/v1';
  const collection = 'sentinel-2-l2a'; // Sentinel-2, Level 2A, Cloud Optimized GeoTiffs (COGs)
 
  let polygonCoordinates = [
    NEC, // Northeast
    SEC, // southeast
    SWC, // southwest
    NWC, // Northwest
    NEC, // Northeast
  ];
  // create a polgongeojson
  let polygonGeoJSON = {
    "type": "Polygon",
    "coordinates": [polygonCoordinates],
  };

  // Format date
  let dateParts = receivedDate.split('.') // Splitting the old date format
  let newDate = new Date(dateParts[2],dateParts[1] - 1, dateParts[0]); // Be careful months start at 0. So Janua = 0 therefore -1 for month
  let year = newDate.getFullYear();
  let month = String(newDate.getMonth() + 1).padStart(2, '0'); // Add leading zeros for month
  let day = String(newDate.getDate()).padStart(2, '0'); // Add leading zeros for tag
  let NewStartDate = `${year}-${month}-${day}`;

  let startDate = new Date(NewStartDate); // The format “2023-12-03T00:00:00.000Z” comes out here
  startDate.setDate(startDate.getDate() + 14); // to the selected date will add 14 days to the start date
  let endDate = startDate.toISOString().split('T')[0]; // Format so that only the format YYYY-MM-DD is available
  let startTime = 'T00:00:00Z';
  let endTime = 'T23:59:59Z';
  let date = NewStartDate + startTime + '/' + endDate + endTime;

  // searchbody for obtaining the geotiffs
  let searchBody = { 
    collections: [collection],
    intersects: polygonGeoJSON,
    limit: 10,
    datetime: date,
    query: {"eo:cloud_cover": {
      lte: receivedCCI
    }}
  };
  console.log(searchBody);
  // Fetch the STAC API to get the geotiff of the satellite images
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
      console.log(items.length); // How many satellite images were found according to the specified search criteria
      
      let objSatellitenImages = {}; // The id, the url and the imageBounds of the results are stored in this object

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
          //url: items[index].assets.thumbnail.href, // To get the URL for the thumbnails
          url: items[index].assets.visual.href, //To get the URL for the geotiffs
          imageBounds: items[index].geometry.coordinates}
      }
      
      // Object "objSatellitenImages" is returned to the frontend
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
      //res.send({ message: 'Daten erfolgreich gespeichert' });
      res.send(data_geojson)
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
  fs.writeFile('data_geojson.json', JSON.stringify({"type": "FeatureCollection", "features": []}), err => {
    if(err){
      console.error(err)
      return res.status(500).send({message: 'Fehler beim Zurücksetzen der area_of_Training.json'})
    }
  //Area of Training  
  fs.writeFile('area_of_Training.json', JSON.stringify({"type": "FeatureCollection", "features": []}), err => {
        if(err){
          console.error(err)
          return res.status(500).send({message: 'Fehler beim Löschen der Daten'})
        }
        res.send({message: 'Alle Daten erfolgreich gelöscht und zurückgesetzt!'})
      })
    fs.unlink('send_data.json', err => {
      if(err){
        if(err.code === 'ENOENT'){
          console.log('Datei exestiert nicht!')
        }else{
          console.error('Fehler beim löschen!', err)
          return res.status(500).send({message: 'Fehler beim löschen!'})
        }
      }
      res.send({message: 'Löschen war erflogreich!'})
    })  
    
  })
})


  app.get('/get-geojson', (req, res) => {
  const file = 'data_geojson.json'
  if(fs.existsSync(file)){
    fs.readFile(file,'utf-8', (err, data) => {
      if(err){
        res.status(500).send({message: 'Fehler beim lesen'})
      }else{
        res.send(JSON.parse(data))
      }
    })
  } 
  else{
    res.send({type: "FeatureCollection", features: []})
  }
})


app.post('/send-data', (req, res)=> {
  const send_data = req.body
  fs.writeFile('send_data.json', JSON.stringify(send_data), err => {
    if(err){
      res.status(500).send({message:'Fehler'})
    }else{
      res.send(send_data)
    }
  })
})

app.get('/get-backend-data', (req, res) =>{
  const file_all  = 'send_data.json'
  fs.readFile(file_all, 'utf-8', (err, data) =>{
    if(err){
      res.status(500).send({message: 'Fehler beim senden'})
    }else{
      res.send(JSON.parse(data))
    }
  })
})
 

/**
 * app.get('/get-geojson', (req, res)=>{
  res.send({type: "FeatureCollection", features: []})
})
 */


  
  

  


app.get('/get_area_of_Training', (req,res) => {
  
    res.send({type: "FeatureCollection", features: []})  
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



app.post('/reset-data', (req, res) => {
  const featureCollection_reset = { "type": "FeatureCollection", "features": []}

  fs.writeFileSync('data_geojson.json', JSON.stringify(featureCollection_reset), err => {
    if(err){
      console.error(err)
      return res.status(500).send({message: 'Fehler beim zurücksetzen'})
    }
  })

  fs.writeFileSync('area_of_Training.json', JSON.stringify(featureCollection_reset), err => {
    if(err){
      console.error(err)
      return res.status(500).send({message: 'Fehler beim zurücksetzen'})
    }
  })
})


//Listener
app.listen(port, () => {
    console.log(`Backend Service listening at http://localhost:${port}`)
  });

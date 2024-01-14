const express = require('express');
const app = express()
const port = process.env.PORT || 3000
const fetch = require('node-fetch');
const path = require('path');


const fs = require('fs');
const multer = require('multer')
const { GeoPackageAPI } = require('@ngageoint/geopackage');
//const JSZIP = require('jszip');
const { OpenEO} = require('@openeo/js-client');


//Folders
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/node_modules'));


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



//Gets
app.get("/", (req, res) => { res.sendFile(__dirname + "/public/startseite.html"); });
app.get("/klassifikation", (req, res) => { res.sendFile(__dirname + "/public/klassifikation.html"); });
app.get("/beispiel", (req, res) => { res.sendFile(__dirname + "/public/beispiel.html"); });
app.get("/dokumentation", (req, res) => { res.sendFile(__dirname + "/public/dokumentation.html"); });
app.get("/impressum", (req, res) => { res.sendFile(__dirname + "/public/impressum.html"); });


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



async function processGraph_erstellen(data_all){
  try{
    /**
     *  const northEast = data_all.AOI._northEast
    const southWest = data_all.AOI._southWest


    const url = 'http://54.185.59.127:8000/'
    const connection = await OpenEO.connect(url)
    await connection.authenticateBasic("k_galb01", "password");
    const processes = await connection.listProcesses();
    const file_types = await connection.listFileTypes()
    // assign the graph-building helper object to "builder" for easy access to all openEO processes
    //Stringsfy benutzen für die JSON und so als String die Daten übergeben, wie übergeben?
    var builder = await connection.buildProcess();
    //console.log(b)
    //console.log(data.AOI)
    // Schritt 2: Erstellung eines Prozessgraphen
    //console.log(JSON.stringify(data))
    //var data = JSON.stringify(data)
    //console.log(data.trainigsdata)
    //console.log(data.StartDate)
    console.log("west", southWest.lng, "south", southWest.lat, "east", northEast.lng, "north", northEast.lat)
    console.log(data_all.StartDate, data_all.Enddate)
    
    var datacube = builder.load_collection(
       "sentinel-s2-l2a-cogs",
       {west: southWest.lat, south: southWest.lng, east: northEast.lat, north: northEast.lng},
        32618,
        //[data_all.StartDate, data_all.Enddate],
        ["2023-07-01", "2023-11-01"]
        //["B02", "B03", "B04"]

    )
    console.log(datacube)

    
 
  var filteredBands = builder.filter_bands({
      data: datacube,
      bands: ["B02", "B03", "B04"]
   });
   

   var temporal = builder.filter_temporal(filteredBands, ["2023-07-01", "2023-08-01"])
   //console.log(temporal)
   
   var mean = function(data){
     return this.mean(data)
   }
   
    var cube = builder.reduce_dimension(temporal, mean, "t");



   
   var result = builder.save_result(cube, "GTiff");
   //var result_1 = await connection.computeResult(result)
   await connection.downloadResult(result, "result.tif");    //downloadResults: 'get /jobs/{job_id}/results)
   console.log('Fertig')

   return "result.tif"
     */

   const northEast = data_all.AOI._northEast
  const southWest = data_all.AOI._southWest

const connection = await OpenEO.connect("http://54.185.59.127:8000/");


// Basic login
await connection.authenticateBasic("k_galb01", "password");

// Erstellen des Prozess-Builders
var builder = await connection.buildProcess();
var co = await connection.listProcesses()
console.log(co)



  
 


 let processGraph = {
  load_collection: {
      process_id: "load_collection",
      arguments: {
          //id: "sentinel-s2-l2a-cogs",
          id: "sentinel-s2-l2a",
          spatial_extent: {
              west: southWest.lng,
              south: southWest.lat,
              east: northEast.lng,
              north: northEast.lat
          },
          temporal_extent: ["2022-05-01", "2022-06-01"],
          bands: ["B04", "B08"]
      }
  },
  ndvi: {
      process_id: "ndvi",
       arguments: {
           data: { from_node: "load_collection" },
          nir: "B08",
          red: "B04"
      }
  },
  save_result: {
      process_id: "save_result",
      arguments: {
          //data: { from_node: "ndvi" },
          data: { from_node: "ndvi"},
          format: "GTiff"
      },
      result: true
  }
};



/**
 * let processGraph = {
  load_collection: {
    process_id: "load_collection",
    arguments: {
      id: "sentinel-s2-l2a-cogs",
      spatial_extent: {
        west: southWest.lng,
        south: southWest.lat,
        east: northEast.lng,
        north: northEast.lat
      },
      temporal_extent: ["2022-05-01", "2022-06-01"],
      bands: ["B02", "B03", "B04"]
    }
  },
  filter_bands: {
    process_id: "filter_bands",
    arguments: {
      data: { from_node: "load_collection" },
      bands: ["B02", "B03", "B04"]
    }
  },
  save_result: {
    process_id: "save_result",
    arguments: {
      data: { from_node: "filter_bands" },
      format: "GTiff"
    },
    result: true
  }
};
 */



 // Erstellen eines Prozessgraphen
 
 
 

console.log(processGraph)
try {
  const startTime = Date.now();

  
   const tiffPath = "./result.tif"; 
   console.log('Starte Download der Ergebnisse...');
   await connection.downloadResult(processGraph, tiffPath);
   console.log('Download abgeschlossen:', tiffPath);

   // Überprüfen Sie, ob die Datei existiert
   if (!fs.existsSync(tiffPath)) {
     throw new Error('TIFF-Datei wurde nicht gefunden: ' + tiffPath);
   }

   const endTime = Date.now();
  console.log("Time taken:", endTime - startTime, "ms");

   return tiffPath;
  

  
  //return "./result.tif"
} catch (error) {
  console.error("Error during execution:", error);
}

/**
 * // Laden der Datenkollektion
builder = builder.load_collection(
    'sentinel-s2-l2a-cogs',
    {
        west: -66.27866,
        south: -9.34489,
        east: -66.26212,
        north: -9.33131
    },
    ["2021-05-01", "2022-06-30"],
    ['B08', 'B04']
);

// NDVI Berechnung hinzufügen
builder = builder.ndvi("B08", "B04");

// Speichern des Ergebnisses als GeoTIFF
const result = builder.save_result('GTiff');

try {
    const startTime = Date.now();

    // Ausführen und Herunterladen des Ergebnisses
    const response = await result.execute();
    await response.downloadResults(result, "./amazonia_2022_ndvi.tif");

    const endTime = Date.now();
    console.log("Time taken:", endTime - startTime, "ms");
} catch (error) {
    console.error("Error during execution:", error);
}

console.log("End of processes");
 */

   

  /**
   * let processGraph = {
    "load_stac": {
      "process_id": "load_stac",
      "arguments": {
        "url": url,
        "spatial_extent": {
          "west": 6.5,
          "south": 51.0,
          "east": 8.0,
          "north": 52.5
        },
        "temporal_extent": [data.StartDate, data.Enddate],
        "bands": ["B02", "B03", "B04", "B08"],  // Beispielsweise Sentinel-2 Bänder
        "properties": {
          "trainingsdaten": data.trainigsdata
        }
      }
    },
    // Weitere Prozesse...
  };
   */
  
  }catch(err){
    console.error('Fehler beim verarbeiten', err)
  }
}


  app.post('/processgraph', (req, res) => {
  const processgraph_data = 'send_data.json';
  fs.readFile(processgraph_data, 'utf-8', async (err, data) => {
    if (err) {
      return res.status(500).send({ message: 'Fehler beim Lesen' });
    }
    const processgraph_data_parsed = JSON.parse(data);
    try {
      const tiffPath = await processGraph_erstellen(processgraph_data_parsed);
      if (!tiffPath || typeof tiffPath !== 'string') {
        throw new Error('tiffPath ist ungültig oder undefiniert');
      }
      const absoluteTiffPath = path.join(__dirname, tiffPath);
      if (!fs.existsSync(absoluteTiffPath)) {
        throw new Error('TIFF-Datei existiert nicht im angegebenen Pfad');
      }
      res.sendFile(absoluteTiffPath);
    } catch (error) {
      console.error('Fehler bei der Verarbeitung', error);
      res.status(500).send({ message: 'Fehler bei der Verarbeitung' });
    }
  });
});
 




 
   


//löschen alles, nicht einzeln!

app.post('/delete', (req, res) => {
  //Trainingsdaten zurücksetzen
  
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



/**
 * app.get('/download', async (req, res) => {
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
 */







//Listener
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})
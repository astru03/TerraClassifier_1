const express = require('express');
const app = express()
const port = process.env.PORT || 3000
const fetch = require('node-fetch');
const proj4 = require('proj4')
const path = require('path');


const fs = require('fs');
const multer = require('multer')
const { GeoPackageAPI } = require('@ngageoint/geopackage');
//const JSZIP = require('jszip');
const { OpenEO } = require('@openeo/js-client');
const stream = require('stream');

//Folders
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/node_modules'));

app.get('/status', (req, res) => {
  res.send({ status: 'ready' });
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
  if (req.body.Date == '' || req.body.NEC == '' || req.body.SWC == '' || req.body.CCI == '') {
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
  let newDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]); // Be careful months start at 0. So Janua = 0 therefore -1 for month
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
    query: {
      "eo:cloud_cover": {
        lte: receivedCCI
      }
    }
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

      for (var index = 0; index < items.length; index++) {
        objSatellitenImages['item_' + index] = {
          id: items[index].id,
          //url: items[index].assets.thumbnail.href, // To get the URL for the thumbnails
          url: items[index].assets.visual.href, //To get the URL for the geotiffs
          imageBounds: items[index].geometry.coordinates
        }
      }

      // Object "objSatellitenImages" is returned to the frontend
      if (objSatellitenImages != null) {
        res.json(objSatellitenImages)
      } else {
        res.status(400).json({ error: 'Ungültige Anfrage' });
      }
    })
    .catch((error) => console.error('Error:', error));
});


app.post('/demo_builder', async (req, res) => {
  /*
  let connection = await OpenEO.connect("http://54.185.59.127:8000/");
  await connection.authenticateBasic("k_galb01", "password");
  var builder = await connection.buildProcess();
  var datacube = builder.load_collection(
    "sentinel-s2-l2a-cogs",
    {west:840180.2, south:6788889.4, east:852976.1, north:6799716.7},
    3857,
    ["2022-01-01", "2022-12-31"]
  ); 
  let datacube_filtered = builder.filter_bands(datacube, ["B02", "B03", "B04"]);
  var mean = function(data) {
      return this.mean(data);
  };
  let datacube_reduced = builder.reduce_dimension(datacube_filtered, mean, dimension = "t");
  let result = builder.save_result(datacube_reduced,'GTiff');
  let response = await connection.computeResult(result);
  console.log(response.data);
  // Setze die richtigen Header für den Dateityp
  //res.setHeader('Content-Type', 'image/tiff');
  //res.setHeader('Access-Control-Expose-Headers', 'Location, OpenEO-Identifier, OpenEO-Costs');

  response.data.pipe(res); // Send the Tiff as response
  console.log("Send Done");

  //var ret = await doSomething();
  //console.log(ret);
  //res.status(200).send(ret);
  //res.send({message: 'Funktion ausgeführt'});
  */
});

/**
 * Function processGraph_erstellen
 * @param {*} data_all
 */
async function processGraph_erstellen(data_all) {
  try {
    const northEast = data_all.AOI._northEast
    const southWest = data_all.AOI._southWest
    const wgs84 = 'EPSG:4326'
    const mercator = 'EPSG:3857'
    const proj_mercator_northEast = proj4(wgs84, mercator, [northEast.lng, northEast.lat])
    const proj_mercator_southWest = proj4(wgs84, mercator, [southWest.lng, southWest.lat])
    console.log(northEast)
    console.log(southWest)
    const west = proj_mercator_southWest[0]
    const east = proj_mercator_northEast[0]
    const south = proj_mercator_southWest[1]
    const north = proj_mercator_northEast[1]
    const connection = await OpenEO.connect("http://54.185.59.127:8000");
    // Basic login
    await connection.authenticateBasic("user", "password");
    // Erstellen des Prozess-Builders
    var builder = await connection.buildProcess();
    let load1 = builder.load_collection(
      "sentinel-s2-l2a-cogs",
      {
        "west": west,
        "east": east,
        "south": south,
        "north": north,
        "crs": 3857
      },
      ["2022-01-01", "2022-12-31"],
      ["B02", "B04", "B08"]
    );
    let filter2 = builder.filter_bands(load1, ["B04", "B08"]);
    let ndvi = builder.ndvi(filter2, "B04", "B08")
    var reducer = function (data) { return this.mean(data) }
    datacube = builder.reduce_dimension(ndvi, reducer, "t")
    cube = builder.save_result(datacube, "GTiff")
    console.log("Bitte warten!")
    try {
      let datacube_tif = await connection.computeResult(cube)
      console.log(datacube_tif.data)
      if (datacube_tif.data instanceof stream.Readable) {
        console.log('datacube_tif.data ist ein lesbarer Stream.');
        //https://www.tabnine.com/code/javascript/functions/fs/WriteStream/path
        const filePath = path.join(__dirname, 'test_js_1.tif');
        const writeStream = fs.createWriteStream(filePath);
        datacube_tif.data.pipe(writeStream);
        datacube_tif.data.on('end', () => {
          console.log('Stream zu Ende gelesen und Datei gespeichert.');
        });
      } else {
        console.error('datacube_tif.data ist kein lesbarer Stream.');
      }

      //B02, B08, ndwi
      //B11, B08  ndbi
      //ndsi B02, B11

      console.log("jetzt")
    } catch {
    }
  } catch (err) {
    console.error('Fehler beim verarbeiten', err)
  }
}

/**
 * 
 * @param {*} data_all 
 * 
 * 
 * 
async function processGraph_erstellen(data_all){
  try{
  const northEast = data_all.AOI._northEast
  const southWest = data_all.AOI._southWest

  const wgs84 = 'EPSG:4326'
  const mercator = 'EPSG:3857'

  const proj_mercator_northEast = proj4(wgs84, mercator, [northEast.lng, northEast.lat])
  const proj_mercator_southWest = proj4(wgs84, mercator, [southWest.lng, southWest.lat])




  console.log(northEast) 
  console.log(southWest)

  const west = proj_mercator_southWest[0]
  const east = proj_mercator_northEast[0]
  const south = proj_mercator_southWest[1]
  const north = proj_mercator_northEast[1]
  const connection = await OpenEO.connect("http://54.185.59.127:8000");
  // Basic login
  await connection.authenticateBasic("user", "password");
  // Erstellen des Prozess-Builders
  var builder = await connection.buildProcess();
  let load1 = builder.load_collection(
    "sentinel-s2-l2a-cogs",
     {
        "west" : west,
          "east": east,
          "south": south,
          "north": north,
          "crs" : 3857
    },
    ["2022-01-01", "2022-12-31"], 
    ["B02","B04", "B08"]
  );

  let filter2 = builder.filter_bands(load1, ["B04", "B08"]);
  let ndvi = builder.ndvi(filter2, "B04", "B08")

  var reducer = function(data){return this.mean(data)}
  datacube = builder.reduce_dimension(ndvi, reducer, "t")
  cube = builder.save_result(datacube, "GTiff")
  console.log("Bitte warten!")

  try{
    let datacube_tif = await connection.computeResult(cube)
    console.log(datacube_tif.data)

    if (datacube_tif.data instanceof stream.Readable) {
      console.log('datacube_tif.data ist ein lesbarer Stream.');

      //https://www.tabnine.com/code/javascript/functions/fs/WriteStream/path
      const filePath = path.join(__dirname, 'test_js_1.tif');
      const writeStream = fs.createWriteStream(filePath);

      datacube_tif.data.pipe(writeStream);

      datacube_tif.data.on('end', () => {
        console.log('Stream zu Ende gelesen und Datei gespeichert.');
      });

    } else {
      console.error('datacube_tif.data ist kein lesbarer Stream.');
    }

    //B02, B08, ndwi
    //B11, B08  ndbi
    //ndsi B02, B11

    console.log("jetzt")
  }catch{

  }

  }catch(err){
    console.error('Fehler beim verarbeiten', err)
  }
}

*/


app.post('/processgraph', (req, res) => {
  const processgraph_data = 'send_data.json';
  fs.readFile(processgraph_data, 'utf-8', async (err, data) => {
    if (err) {
      return res.status(500).send({ message: 'Fehler beim Lesen' });
    }
    const processgraph_data_parsed = JSON.parse(data);
    try {
      await processGraph_erstellen(processgraph_data_parsed);
      res.send({ message: "Geschafft!" })
    } catch (error) {
      console.error('Fehler bei der Verarbeitung', error);
      res.status(500).send({ message: 'Fehler bei der Verarbeitung' });
    }
  });
});

app.get('/download-tiff', (req, res) => {
  const filePath = path.join(__dirname, 'test_js_1.tif')
  res.download(filePath, 'test_js_1.tif', (err) => {
    if (err) {
      res.status(500).send('Fehler beim Herunterladen der Datei');
    }
  });
});

app.get('/show-tiff', (req, res) => {
  const filePath = path.join(__dirname, 'test_js_1.tif')
  res.sendFile(filePath)

})

//löschen alles, nicht einzeln!

app.post('/delete', (req, res) => {
  //Trainingsdaten zurücksetzen
  fs.unlink('send_data.json', err => {
    if (err) {
      if (err.code === 'ENOENT') {
        console.log('Datei exestiert nicht!')
      } else {
        console.error('Fehler beim löschen!', err)
        return res.status(500).send({ message: 'Fehler beim löschen!' })
      }
    }
    res.send({ message: 'Löschen war erflogreich!' })
  })

})

app.post('/send-data', (req, res) => {
  const send_data = req.body
  fs.writeFile('send_data.json', JSON.stringify(send_data), err => {
    if (err) {
      res.status(500).send({ message: 'Fehler' })
    } else {
      res.send(send_data)
    }
  })
})

app.get('/get-backend-data', (req, res) => {
  const file_all = 'send_data.json'
  fs.readFile(file_all, 'utf-8', (err, data) => {
    if (err) {
      res.status(500).send({ message: 'Fehler beim senden' })
    } else {
      res.send(JSON.parse(data))
    }
  })
})

/**
 * https://www.npmjs.com/package/@ngageoint/geopackage
 * https://github.com/ngageoint/geopackage-js
 */
app.post('/upload', upload.single('file'), async (req, res) => {
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
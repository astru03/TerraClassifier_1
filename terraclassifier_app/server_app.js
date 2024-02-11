const express = require('express');
const app = express();
const port = process.env.PORT || 3000
const fetch = require('node-fetch');
const proj4 = require('proj4');
const path = require('path');
const GeoTIFF = require('geotiff');
const {createCanvas} = require('canvas');
const im = require('imagemagick');
const fs = require('fs');
const multer = require('multer');
const { GeoPackageAPI } = require('@ngageoint/geopackage');
const { OpenEO } = require('@openeo/js-client');
const stream = require('stream');

//Folders
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/node_modules'));

app.get('/status', (req, res) => {
  res.send({ status: 'ready' });
})

const uploadPath = 'upload/';

// Check whether the folder exists.
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
    cb(null, file.originalname) // Retain the original file name
  }
})

const upload = multer({ storage: storage });

//Gets
app.get("/", (req, res) => { res.sendFile(__dirname + "/public/startseite.html"); });
app.get("/klassifikation", (req, res) => { res.sendFile(__dirname + "/public/klassifikation.html"); });
app.get("/beispiel", (req, res) => { res.sendFile(__dirname + "/public/beispiel.html"); });
app.get("/dokumentation", (req, res) => { res.sendFile(__dirname + "/public/dokumentation.html"); });
app.get("/impressum", (req, res) => { res.sendFile(__dirname + "/public/impressum.html"); });


app.post('/satellite', (req, res) => {
  //check if Date, Coordinates and Cloud-cover is not null
  if (req.body.Date == '' || req.body.NEC == '' || req.body.SWC == '' || req.body.CCI == '') {
    console.log('Fehler Felder nicht gefüllt');
    return;
  }
  let receivedDate = req.body.Date;
  let receivedNEC = req.body.NEC;
  let receivedSWC = req.body.SWC;
  let receivedCCI = req.body.CCI;

  // A polygonCoordinates must be made from the northeast coordinates and the southwest coordinates.
  let SplitReceivedNEC = receivedNEC.split(",") // Split at the comma to also get the coordinates for NWC and SEC
  let SplitReceivedSWC = receivedSWC.split(",") // These are necessary to build the rectangle polygon
  let stringNEC = [SplitReceivedNEC[0], SplitReceivedNEC[1].trim()];
  let stringNWC = [SplitReceivedSWC[0], SplitReceivedNEC[1].trim()];
  let stringSWC = [SplitReceivedSWC[0], SplitReceivedSWC[1].trim()];
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
  let dateParts = receivedDate.split('.'); // Splitting the old date format
  let newDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]); // Be careful months start at 0. So Janua = 0 therefore -1 for month
  let year = newDate.getFullYear();
  let month = String(newDate.getMonth() + 1).padStart(2, '0'); // Add leading zeros for month
  let day = String(newDate.getDate()).padStart(2, '0'); // Add leading zeros for tag
  let NewStartDate = `${year}-${month}-${day}`;

  let startDate = new Date(NewStartDate); // The format “2023-12-03T00:00:00.000Z” comes out here
  startDate.setMonth(startDate.getMonth() + 1); // the selected date will add 1 month to the start date
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
          url: items[index].assets.visual.href, //To get the URL for the geotiffs
          imageBounds: items[index].geometry.coordinates
        }
      }

      // Object "objSatellitenImages" is returned to the frontend
      if (objSatellitenImages != null) {
        res.json(objSatellitenImages);
      } else {
        res.status(400).json({ error: 'Ungültige Anfrage' });
      }
    })
    .catch((error) => console.error('Error:', error));
});



/**
 * Function processGraph_erstellen
 * @param {*} data_all
 */
async function processGraph_erstellen(data_all, train_data_path) {
  return new Promise(async (resolve, reject) => {

  try {
    const trainigs_data = await fs.promises.readFile(train_data_path, 'utf-8')
    console.log(trainigs_data);

    let startdate = data_all.StartDate;
    let enddate = data_all.Enddate;
    
    let resolution = Number(data_all.resolution);
    const alg = data_all.algorithm;
    console.log(typeof(alg));
    const northEast = data_all.AOI._northEast;
    const southWest = data_all.AOI._southWest;
    const wgs84 = 'EPSG:4326'
    const mercator = 'EPSG:3857'
    const proj_mercator_northEast = proj4(wgs84, mercator, [northEast.lng, northEast.lat]);
    const proj_mercator_southWest = proj4(wgs84, mercator, [southWest.lng, southWest.lat]);
    console.log(northEast);
    console.log(southWest);
    const west = proj_mercator_southWest[0];
    const east = proj_mercator_northEast[0];
    const south = proj_mercator_southWest[1];
    const north = proj_mercator_northEast[1];

    const northEast_AOT = data_all.AOT._northEast;
    const southWest_AOT = data_all.AOT._southWest;

    const proj_mercator_northEast_AOT = proj4(wgs84, mercator, [northEast_AOT.lng, northEast_AOT.lat]);
    const proj_mercator_southWest_AOT = proj4(wgs84, mercator, [southWest_AOT.lng, southWest_AOT.lat]);

    const west_AOT = proj_mercator_southWest_AOT[0];
    const east_AOT = proj_mercator_northEast_AOT[0];
    const south_AOT = proj_mercator_southWest_AOT[1];
    const north_AOT = proj_mercator_northEast_AOT[1];

    console.log(northEast_AOT, southWest_AOT);

    const connection = await OpenEO.connect('http://54.185.59.127:8080');
    //const connection = await OpenEO.connect("http://openeocubes_custom:8080");
    await connection.authenticateBasic('user', 'password');
    var builder = await connection.buildProcess();
    let aoi = builder.load_collection(
      'sentinel-s2-l2a-cogs',
      {
        'west': west,
        'east': east,
        'south': south,
        'north': north,
        'crs': 3857
      },
      [startdate,enddate]
    );
    
    let aot = builder.load_collection(
      'sentinel-s2-l2a-cogs',
      {
        'west': west_AOT,
        'east': east_AOT,
        'south': south_AOT,
        'north': north_AOT,
        'crs': 3857
      },
      [startdate,enddate]
    );

    let filter_aoi = builder.filter_bands(aoi, ['B02', 'B03', 'B04']);
    let filter_aot = builder.filter_bands(aot, ['B02', 'B03', 'B04']);
    console.log('filter');
    
    if(alg === 'MD'){
      var traininngsmodel_cube = builder.train_model_knn(filter_aot, trainigs_data);
      console.log('es wurde der MD ausgewählt');
    }
    if(alg === 'RF'){
      var traininngsmodel_cube = builder.train_model_rf(filter_aot, trainigs_data);
      console.log('es wurde der RF ausgewählt');
    }
    if(alg === 'GBM'){
      var traininngsmodel_cube = builder.train_model_gbm(filter_aot, trainigs_data);
      console.log('es wurde der GBM ausgewählt');
    }
    if(alg === 'SVM'){
      var traininngsmodel_cube = builder.train_model_svm(filter_aot, trainigs_data);
      console.log('es wurde der SVM ausgewählt');
    }
    console.log('train');
    let classify_cube_data =  builder.classify_cube(filter_aoi, traininngsmodel_cube);
    console.log('classify');
    var reducer = function (data) { return this.median(data) }
    datacube = builder.reduce_dimension(classify_cube_data, reducer,'t');
    resolutioncube = builder.resample_spatial(datacube, resolution);
    trainRDS = builder.save_result(traininngsmodel_cube, 'RDS');
    cube = builder.save_result(resolutioncube, 'GTiff');
    console.log('Bitte warten!');
    try {
      let datacube_tif = await connection.computeResult(cube);
      let rds = await connection.computeResult(trainRDS);
      console.log(datacube_tif.data);
      if (datacube_tif.data instanceof stream.Readable) {
        console.log('datacube_tif.data ist ein lesbarer Stream.');
        //https://www.tabnine.com/code/javascript/functions/fs/WriteStream/path
        const filePath = path.join(__dirname, 'test_js_1.tif');
        const fileRDS = path.join(__dirname, 'train.rds')
        const writeStream = fs.createWriteStream(filePath);
        const rds_write = fs.createWriteStream(fileRDS);
        datacube_tif.data.pipe(writeStream);
        rds.data.pipe(rds_write);
        datacube_tif.data.on('end', async() => {
          console.log('Stream zu Ende gelesen und Datei gespeichert.');
          await color_tif_download()
          resolve()
        });
      } else {
        console.error('datacube_tif.data ist kein lesbarer Stream.');
      }
      console.log('jetzt');
    } catch (err) {
      reject(err);
    }
  } catch (err) {
    console.error('Fehler beim verarbeiten', err);
    reject(err);
  }

  })
}

//https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createImageData?retiredLocale=de
async function color_tif_download(){
  return new Promise(async (resolve, reject) => {
    try{
    const filePath = path.join(__dirname, 'test_js_1.tif');
    const tiff = await GeoTIFF.fromFile(filePath);
    const image = await tiff.getImage();
    const raster = await image.readRasters();
    const width = image.getWidth();
    const height = image.getHeight();
    let classData = raster[0];
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

    let uniqueClasses = new Set(classData);
    let classIDColor = {}
    let index = 0
    uniqueClasses.forEach(classID => {
      let hue = (index * 360 / uniqueClasses.size) % 360
      let [r,g,b] = hslToRgb(hue / 360, 1, 0.5)
      classIDColor[classID] = {r,g,b}
      index++
    })

    for (let i = 0; i < classData.length; i++){
      let classID = classData[i];
      let {r,g,b} = classIDColor[classID];
      let index = i * 4
      imageData.data[index] = r
      imageData.data[index + 1] = g
      imageData.data[index + 2] = b
      imageData.data[index + 3] = 255
    }

    ctx.putImageData(imageData, 0, 0);
    
    const outPNG = path.join(__dirname, 'image.png');
    const buffer = canvas.toBuffer('image/png');
    await fs.promises.writeFile(outPNG, buffer);

    let outTif = path.join(__dirname, 'color_tif.tif');
    im.convert([outPNG, outTif], function(err){
      if(err) throw err
      console.log('Die Tif mit Farbwerten wurde erfolgreich erstellt!');
      resolve();
    })
    }catch(error){
      console.error('Fehler bei der Erstellung der Color_tif!', error);
      reject(error);
    }
  })
}

/**
 * HSL To RGB
 * https://gist.github.com/mjackson/5311256
 * 
 * 
 */
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s == 0) {
      r = g = b = l; 
  } else {
      const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
      }

      let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      let p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
  }

  // Konvertierung zu Werten im Bereich [0, 255] für RGB
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}





app.post('/processgraph', (req, res) => {
  const processgraph_data = 'send_data.json';
  fs.readFile(processgraph_data, 'utf-8', async (err, data) => {
    if (err) {
      return res.status(500).send({ message: 'Fehler beim Lesen' });
    }
    const data_all = JSON.parse(data);
    if(data_all.trainigsdata && data_all.trainigsdata.features){
      const train_data_path = 'train_data_all.geojson'
      const geo_train_data = {
        type:"FeatureCollection",
        features: data_all.trainigsdata.features
      }

      fs.writeFile(train_data_path, JSON.stringify(geo_train_data), async (err) => {
        if(err){
          res.status(500).send({message: 'Fehler beim konverteiren zu einem String'});
        }
        try{
          await processGraph_erstellen(data_all, train_data_path);
          res.send({message:'Erfolgreich durchgeführt'});
        }catch (error) {
          res.status(500).send({message:'Fehler'});
        }
      })
    } else {
      console.error('Traingsdaten nicht im Path gefunden');
      return res.status(500).send({message: 'Trainingsdaten konnten nicht unter dem Path gefunden werden'});
    }
  });
});

app.get('/download-tiff', (req, res) => {
  const filePath = path.join(__dirname, 'color_tif.tif');
  res.download(filePath, 'color_tif.tif', (err) => {
    if (err) {
      res.status(500).send('Fehler beim Herunterladen der Datei');
    }
  });
});

app.get('/show-tiff', (req, res) => {
  const filePath = path.join(__dirname, 'test_js_1.tif');
  res.sendFile(filePath);
})

app.get('/download-rds', (req, res) => {
  const filePath = path.join(__dirname, 'train.rds')
  res.download(filePath)

})



app.post('/delete', (req, res) => {
  //Reset training data
  fs.unlink('send_data.json', err => {
    if (err) {
      if (err.code === 'ENOENT') {
        console.log('Datei exestiert nicht!');
      } else {
        console.error('Fehler beim löschen!', err);
        return res.status(500).send({ message: 'Fehler beim löschen!' });
      }
    }
    res.send({ message: 'Löschen war erflogreich!' });
  })

})

app.post('/send-data', (req, res) => {
  const send_data = req.body
  fs.writeFile('send_data.json', JSON.stringify(send_data), err => {
    if (err) {
      res.status(500).send({ message: 'Fehler' });
    } else {
      res.send(send_data);
    }
  })
})

app.get('/get-backend-data', (req, res) => {
  const file_all = 'send_data.json'
  fs.readFile(file_all, 'utf-8', (err, data) => {
    if (err) {
      res.status(500).send({ message: 'Fehler beim senden' });
    } else {
      res.send(JSON.parse(data));
    }
  })
})

/**
 * https://www.npmjs.com/package/@ngageoint/geopackage
 * https://github.com/ngageoint/geopackage-js
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter?retiredLocale=de
 * https://github.com/ngageoint/geopackage-js/blob/master/README.md
 * 
 * values classID: https://stackoverflow.com/questions/47214800/every-function-with-object-values-not-working
 */
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file.path;
    const geoPackage = await GeoPackageAPI.open(file);
    const featureTables = geoPackage.getFeatureTables();
    const layers = {};
    var classID_counts = {}

    for (const table of featureTables) {
      const featureDao = geoPackage.getFeatureDao(table);
      const geojsonFeatures = geoPackage.queryForGeoJSONFeaturesInTable(table); 

      const filteredFeatures = geojsonFeatures.filter(feature => {
        const polygon_multipolygon = feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon' || feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString';
        
        return polygon_multipolygon
      });

      layers[table] = {
        type: 'FeatureCollection',
        features: filteredFeatures
      };
    }
    
    res.json({ message: 'Geopackage erfolgreich hochgeladen', data: layers });
  } catch (error) {
    console.error('Fehler beim verarbeiten der GeoPackage Datei:', error);
    res.status(500).send({ message: 'Fehler beim verarbeiten der GeoPackage Datei: ' + error.message });
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
})
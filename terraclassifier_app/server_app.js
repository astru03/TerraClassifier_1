const express = require('express');
const app = express()
const port = process.env.PORT || 3000
const fetch = require('node-fetch');
const proj4 = require('proj4')
const path = require('path');
const GeoTIFF = require('geotiff');
const {createCanvas} = require('canvas')
const im = require('imagemagick');



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
//const { error, table } = require('console');
//const { stdout } = require('process');
//const { setTimeout } = require('timers/promises');
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


//app.post('/demo_builder', async (req, res) => {
//});

/**
 * Function processGraph_erstellen
 * @param {*} data_all
 */
async function processGraph_erstellen(data_all, train_data_path) {
  return new Promise(async (resolve, reject) => {

  
  try {
    const trainigs_data = await fs.promises.readFile(train_data_path, "utf-8")
    console.log(trainigs_data)



    

    let resolution = Number(data_all.resolution)
    const alg = data_all.algorithm
    console.log(typeof(alg))
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

    const northEast_AOT = data_all.AOT._northEast
    const southWest_AOT = data_all.AOT._southWest

    const proj_mercator_northEast_AOT = proj4(wgs84, mercator, [northEast_AOT.lng, northEast_AOT.lat])
    const proj_mercator_southWest_AOT = proj4(wgs84, mercator, [southWest_AOT.lng, southWest_AOT.lat])

    const west_AOT = proj_mercator_southWest_AOT[0]
    const east_AOT = proj_mercator_northEast_AOT[0]
    const south_AOT = proj_mercator_southWest_AOT[1]
    const north_AOT = proj_mercator_northEast_AOT[1]


    console.log(northEast_AOT, southWest_AOT)

    const connection = await OpenEO.connect("http://54.185.59.127:8080");
    //const connection = await OpenEO.connect("http://openeocubes_custom:8080");
    // Basic login
    await connection.authenticateBasic("user", "password");
    // Erstellen des Prozess-Builders
    var builder = await connection.buildProcess();
    let aoi = builder.load_collection(
      "sentinel-s2-l2a-cogs",
      {
        "west": west,
        "east": east,
        "south": south,
        "north": north,
        "crs": 3857
      },
      ["2022-07-01", "2022-08-01"]
      
    );
    
    let aot = builder.load_collection(
      "sentinel-s2-l2a-cogs",
      {
        "west": west_AOT,
        "east": east_AOT,
        "south": south_AOT,
        "north": north_AOT,
        "crs": 3857
      },
      ["2022-07-01", "2022-08-01"]
    );






    let filter_aoi = builder.filter_bands(aoi, ["B02", "B03", "B04"]);
    let filter_aot = builder.filter_bands(aot, ["B02", "B03", "B04"]);
    console.log("filter")
    

    if(alg === 'MD'){
      var traininngsmodel_cube = builder.train_model_knn(filter_aot, trainigs_data)
      console.log('es wurde der MD ausgewählt')
    }
    if(alg === 'RF'){
      var traininngsmodel_cube = builder.train_model_rf(filter_aot, trainigs_data)
      console.log('es wurde der RF ausgewählt')

    }
    if(alg === 'GBM'){
      var traininngsmodel_cube = builder.train_model_gbm(filter_aot, trainigs_data)
      console.log('es wurde der GBM ausgewählt')

    }
    if(alg === 'SVM'){
      var traininngsmodel_cube = builder.train_model_svm(filter_aot, trainigs_data)
      console.log('es wurde der SVM ausgewählt')

    }
    console.log("train")
    let classify_cube_data =  builder.classify_cube(filter_aoi, traininngsmodel_cube)
    console.log("classify")
    var reducer = function (data) { return this.mean(data) }
    datacube = builder.reduce_dimension(classify_cube_data, reducer, "t")
    resolutioncube = builder.resample_spatial(datacube, resolution)
    cube = builder.save_result(resolutioncube, "GTiff")
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
          resolve()
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
    reject(err)
  }

  })



}



/**
 * try {
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
  }
 */


/**
 *   const color = [
     [255, 255, 255], // Weiß
     [0, 128, 0],     // Grün
     [0, 0, 255],     // Blau
     [255, 255, 0],   // Gelb
     [255, 165, 0],   // Orange
     [255, 0, 255],   // Magenta
  ];
 
function getColor(classID){
  return color[classID] || color[0]
} 


 async function color_geotiff() {
    try {
      const filePath = path.join(__dirname, 'test_js_1.tif');
      const tiff = await GeoTIFF.fromFile(filePath);
      const image = await tiff.getImage();
      const width = image.getWidth();
      const height = image.getHeight();
      const numBands = image.getSamplesPerPixel();
      const raster = await image.readRasters()
      //console.log(`Breite: ${width}, Höhe: ${height}, Bänder: ${numBands}, raster ${raster}`);

      const classData = raster[0]
      const minValue = Math.min(...classData)
      const maxValue = Math.max(...classData)

      let colorRaster = colorMapping(classData, minValue, maxValue)
      return [colorRaster, height, width]



    } catch (error) {
      console.log("Fehler beim Lesen der TIFF-Datei:", error);
    }
  }


  function colorMapping(data, minValue, maxValue){
    const numClass = color.length
    const range = maxValue - minValue
    const step = range / numClass

    const coloredData = new Uint8ClampedArray(data.length * 4); // RGBA
    for (let i = 0; i < data.length; i++) {
      const classID = Math.min(numClass - 1, Math.floor((data[i] - minValue) / step))
      const [r, g, b] = getColor(classID);
      coloredData[i * 4] = r;
      coloredData[i * 4 + 1] = g;
      coloredData[i * 4 + 2] = b;
      coloredData[i * 4 + 3] = 255; // Alpha
  }
  return coloredData;
  }

  

  function createImage(width, height, colorData){
    return new Promise((resolve , reject) => {
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    const imageData = ctx.createImageData(width, height)
    imageData.data.set(colorData)

    ctx.putImageData(imageData, 0, 0)

    const out = fs.createWriteStream('image.png')
    const stream = canvas.createPNGStream()
    stream.pipe(out)
    out.on('finish', () =>  {

     console.log('PNG-Datei wurde erstellt')
     resolve(canvas)
    
    })
    out.on('error', reject)
    })
    

  }
   
 */


  function valueToColor(value, minValue, maxValue){
  const normalized = (value - minValue) / (maxValue - minValue);
  const r = Math.round(normalized * 255);
  const g = 0;
  const b = Math.round((1 - normalized) * 255);
  return [r, g, b];
}

function colorMapping(data, minValue, maxValue) {
  const coloredData = new Uint8ClampedArray(data.length * 4); // RGBA
  for (let i = 0; i < data.length; i++) {
    const [r, g, b] = valueToColor(data[i], minValue, maxValue);
    coloredData[i * 4] = r;
    coloredData[i * 4 + 1] = g;
    coloredData[i * 4 + 2] = b;
    coloredData[i * 4 + 3] = 255; // Alpha
  }
  return coloredData;
}

// Korrigierte color_geotiff Funktion
async function color_geotiff() {
  try {
    const filePath = path.join(__dirname, 'test_js_1.tif');
    const tiff = await GeoTIFF.fromFile(filePath);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const raster = await image.readRasters();
    const classData = raster[0];
    const minValue = Math.min(...classData);
    const maxValue = Math.max(...classData);
    let colorRaster = colorMapping(classData, minValue, maxValue);
    console.log(minValue, maxValue, "color_geotiff")
    return [colorRaster, height, width, minValue, maxValue];
  } catch (error) {
    console.log("Fehler beim Lesen der TIFF-Datei:", error);
  }
}




/**
 * 
 * function createLegend(minValue, maxValue){
  const width = 200
  const height = 50
  const canavs_legend = createCanvas(width, height)
  var ctx = canavs_legend.getContext('2d')
  console.log(minValue, maxValue, "createLegend")

  for (let i = 0; i <= width; i++) {
    const value = minValue + (i / width) * (maxValue - minValue);
    const [r, g, b] = valueToColor(value, minValue, maxValue);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(i, 0, 1, height / 2);
  }
  // Beschriftungen hinzufügen
  ctx.fillStyle = 'black';
  ctx.fillText(minValue.toString(), 0, height);
  ctx.fillText(maxValue.toString(), height - ctx.measureText(maxValue.toString()).width, height);

  return canavs_legend;

}
 * 
 * 
 * async function addLegend(){
  const [colorData, height, width, minValue, maxValue] = await color_geotiff();
  console.log(minValue, maxValue, "addLegend")
  console.log(colorData)
  
   // Ersetzen Sie dies durch Ihre tatsächlichen Min-/Max-Werte
  const legendCanvas = createLegend(minValue, maxValue);
  console.log(legendCanvas)
  console.log(height, width)



  // Speichern oder senden Sie das kombinierte Bild
  const legendPath = path.join(__dirname, 'legend.png')
  const out = fs.createWriteStream(legendPath);
  const stream = legendCanvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () => {
    console.log('PNG-Datei mit Legende wurde erstellt');
  });
  out.on('error', (err) => {
    console.error('Fehler beim Erstellen der PNG-Datei mit Legende:', err);
  });

}
 */



function createImage(width, height, colorData){
  return new Promise((resolve , reject) => {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      const imageData = ctx.createImageData(width, height);
      imageData.data.set(colorData);

      ctx.putImageData(imageData, 0, 0);

      const out = fs.createWriteStream('image.png');
      const stream = canvas.createPNGStream();
      stream.pipe(out);
      out.on('finish', () => {
          console.log('PNG-Datei wurde erstellt');
          resolve(canvas);
      });
      out.on('error', (err) => {
          console.error('Fehler beim Erstellen der PNG-Datei:', err);
          reject(err);
      });
  });
}



/**
 *  function valueToColor(value, minValue, maxValue){
  const normalized = (value - minValue) / (maxValue - minValue);
  const r = Math.round(normalized * 255);
  const g = 0;
  const b = Math.round((1 - normalized) * 255);
  return [r, g, b];
}

function colorMapping(data, minValue, maxValue) {
  const coloredData = new Uint8ClampedArray(data.length * 4); // RGBA
  for (let i = 0; i < data.length; i++) {
    const [r, g, b] = valueToColor(data[i], minValue, maxValue);
    coloredData[i * 4] = r;
    coloredData[i * 4 + 1] = g;
    coloredData[i * 4 + 2] = b;
    coloredData[i * 4 + 3] = 255; // Alpha
  }
  return coloredData;
}

// Korrigierte color_geotiff Funktion
async function color_geotiff() {
  try {
    const filePath = path.join(__dirname, 'test_js_1.tif');
    const tiff = await GeoTIFF.fromFile(filePath);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const raster = await image.readRasters();
    const classData = raster[0];
    const minValue = Math.min(...classData);
    const maxValue = Math.max(...classData);
    let colorRaster = colorMapping(classData, minValue, maxValue);
    console.log(minValue, maxValue, "color_geotiff")
    return [colorRaster, height, width, minValue, maxValue];
  } catch (error) {
    console.log("Fehler beim Lesen der TIFF-Datei:", error);
  }
}


function createLegend(minValue, maxValue){
  const width = 200
  const height = 50
  const canavs_legend = createCanvas(width, height)
  var ctx = canavs_legend.getContext('2d')
  console.log(minValue, maxValue, "createLegend")

  for (let i = 0; i <= width; i++) {
    const value = minValue + (i / width) * (maxValue - minValue);
    const [r, g, b] = valueToColor(value, minValue, maxValue);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(i, 0, 1, height / 2);
  }
  // Beschriftungen hinzufügen
  ctx.fillStyle = 'black';
  ctx.fillText(minValue.toString(), 0, height);
  ctx.fillText(maxValue.toString(), height - ctx.measureText(maxValue.toString()).width, height);

  return canavs_legend;

}

async function addLegend(){
  const [colorData, height, width, minValue, maxValue] = await color_geotiff();
  console.log(minValue, maxValue, "addLegend")
  console.log(colorData)
  
   // Ersetzen Sie dies durch Ihre tatsächlichen Min-/Max-Werte
  const legendCanvas = createLegend(minValue, maxValue);
  console.log(legendCanvas)
  console.log(height, width)



  // Speichern oder senden Sie das kombinierte Bild
  const legendPath = path.join(__dirname, 'legend.png')
  const out = fs.createWriteStream(legendPath);
  const stream = legendCanvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () => {
    console.log('PNG-Datei mit Legende wurde erstellt');
  });
  out.on('error', (err) => {
    console.error('Fehler beim Erstellen der PNG-Datei mit Legende:', err);
  });

}


function createImage(width, height, colorData){
  return new Promise((resolve , reject) => {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      const imageData = ctx.createImageData(width, height);
      imageData.data.set(colorData);

      ctx.putImageData(imageData, 0, 0);

      const out = fs.createWriteStream('image.png');
      const stream = canvas.createPNGStream();
      stream.pipe(out);
      out.on('finish', () => {
          console.log('PNG-Datei wurde erstellt');
          resolve(canvas);
      });
      out.on('error', (err) => {
          console.error('Fehler beim Erstellen der PNG-Datei:', err);
          reject(err);
      });
  });
}
 */


  
   





  /**
   * function generateRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return [r, g, b];
  }

  async function color_geotiff() {
    try {
      const filePath = path.join(__dirname, 'test_js_1.tif');
      const tiff = await GeoTIFF.fromFile(filePath);
      const image = await tiff.getImage();
      const width = image.getWidth();
      const height = image.getHeight();
      const numBands = image.getSamplesPerPixel();
      const raster = await image.readRasters()
      console.log(`Breite: ${width}, Höhe: ${height}, Bänder: ${numBands}, raster ${raster}`);

      const classData = raster[0]
      let uniqueClassID = new Set()

      for(let value of classData){
        uniqueClassID.add(Math.round(value))
      }
      console.log(Array.from(uniqueClassID))

      let colorraster = coloradd(classData, uniqueClassID)


      return [colorraster, height, width]


    } catch (error) {
      console.log("Fehler beim Lesen der TIFF-Datei:", error);
    }
  }

  function coloradd(classData, uniqueClassID){
    const colorMap = {}
   uniqueClassID.forEach(id => {
    colorMap[id] = generateRandomColor()
   })
   const coloredData = new Uint8ClampedArray(classData.length * 4); // RGBA
  for (let i = 0; i < classData.length; i++) {
    const [r, g, b] = colorMap[classData[i]] || [255, 255, 255]; // Schwarz als Standardfarbe
    coloredData[i * 4] = r;
    coloredData[i * 4 + 1] = g;
    coloredData[i * 4 + 2] = b;
    coloredData[i * 4 + 3] = 255; // Alpha
  }
  return coloredData
  }

  function createImage(width, height, colorData){
    return new Promise((resolve , reject) => {
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    const imageData = ctx.createImageData(width, height)
    imageData.data.set(colorData)

    ctx.putImageData(imageData, 0, 0)

    const out = fs.createWriteStream('image.png')
    const stream = canvas.createPNGStream()
    stream.pipe(out)
    out.on('finish', () =>  {

     console.log('PNG-Datei wurde erstellt')
     resolve(canvas)
    
    })
    out.on('error', reject)
    })
    

  }
   */

  


 




app.post('/processgraph', (req, res) => {
  const processgraph_data = 'send_data.json';
  fs.readFile(processgraph_data, 'utf-8', async (err, data) => {
    if (err) {
      return res.status(500).send({ message: 'Fehler beim Lesen' });
    }
    const data_all = JSON.parse(data);
    if(data_all.trainigsdata && data_all.trainigsdata.features){
      const train_data_path = "train_data_all.geojson"
      const geo_train_data = {
        type:"FeatureCollection",
        features: data_all.trainigsdata.features
      }

      fs.writeFile(train_data_path, JSON.stringify(geo_train_data), async (err) => {
        if(err){
          res.status(500).send({message: "Fehler beim konverteiren zu einem String"})
        }
        try{
          await processGraph_erstellen(data_all, train_data_path)
          res.send({message:"Erfolgreich durchgeführt"})
        }catch{
          console.error("Fehler", error)
          res.status(500).send({message:"Fehler"})
        }
      })
    } else {
      console.error('Traingsdaten nicht im Path gefunden')
      return res.status(500).send({message: "Trainingsdaten konnten nicht unter dem Path gefunden werden"})
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

app.get('/color-tiff', async (req, res) => {

  try{  

    const [colorData, height, width, minValue, maxValue] = await color_geotiff()
    const t = await createImage(width, height, colorData)
    //await addLegend()
    const pngPath = path.join(__dirname, 'image.png')

    
    console.log('Das Bild kann heruntergeladen werden')
      res.download(pngPath, 'image.png', (err) => {
        if(err) {
          console.error('Fehler', err)
          res.status(500).send({message: "Fehler"})
        }
      })
    
    
   
    
  
    

  }catch (error){
    console.error('Fehler:', error);
    res.status(500).send('Ein unerwarteter Fehler ist aufgetreten');
  }
    
  
 
})

/**
 * app.get('/color-tiff', async (req, res) => {

  try{  

    const [colorData, height, width] = await color_geotiff()
    const canvas = await createImage(width, height, colorData)
    const pngPath = path.join(__dirname, 'image.png')
    const pngBuffer = canvas.toBuffer()
    
    canvas.createPNGStream().pipe(fs.createWriteStream(pngPath))
    .on('finish', () => {
      //console.log('PNG-Datei wurde erstellt');
      res.download(pngPath, 'image.png', (err) => {
        if (err) {
          console.error('Fehler beim Herunterladen der PNG-Datei:', err);
          res.status(500).send('Fehler beim Herunterladen der PNG-Datei');
        }
      });
    })
    .on('error', (err) => {
      console.error('Fehler beim Erstellen der PNG-Datei:', err);
      res.status(500).send('Fehler beim Erstellen der PNG-Datei');
    });
    
  
    

  }catch (error){
    console.error('Fehler:', error);
    res.status(500).send('Ein unerwarteter Fehler ist aufgetreten');
  }
    
  
 
})
 */

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
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter?retiredLocale=de
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
        const polygon_multipolygon = feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon';
        
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

/**
 * app.post('/upload', upload.single('file'), async (req, res) => {
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
        const polygon_multipolygon = feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon';
        const classID_data = feature.properties && 'ClassID' in feature.properties;
        if(classID_data){
          classID_counts[feature.properties.ClassID] = (classID_counts[feature.properties.ClassID] || 0) + 1
        }
        return polygon_multipolygon && classID_data;
      });

      layers[table] = {
        type: 'FeatureCollection',
        features: filteredFeatures
      };
    }
    const all_classID = Object.values(classID_counts).every(count => count >=3)
    if(!all_classID){
      throw new Error('Jede ClassID muss mindestens dreimal vorkommen, um darauf das Model zu trainiern!')
    }

    res.json({ message: 'Geopackage erfolgreich hochgeladen', data: layers });
  } catch (error) {
    console.error('Fehler beim verarbeiten der GeoPackage Datei:', error);
    res.status(500).send({ message: 'Fehler beim verarbeiten der GeoPackage Datei: ' + error.message });
  }
});
 */

/**
 * 

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file.path;
    const geoPackage = await GeoPackageAPI.open(file);
    const feature = geoPackage.getFeatureTables();
    const layers = {};

    for (const table of feature) {
      // Abfrage aller Features als GeoJSON
      const allFeatures = geoPackage.queryForGeoJSONFeaturesInTable(table);

      const polygonFeatur = allFeatures.filter(feature => feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')

      layers[table] = {
        type: 'FeatureCollection',
        features: polygonFeatur
      };
    }

    res.json({ message: 'Geopackage erfolgreich hochgeladen', data: layers });
  } catch (error) {
    console.error('Fehler beim verarbeiten der GeoPackage Datei. Bitte überpürfen ob die Datei Valide ist:', error);
    res.status(500).send({ message: 'Fehler beim verarbeiten der GeoPackage Datei. Bitte überpürfen ob die Datei Valide ist:' + error.message });
  }
});
 */


//Listener
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})
// create a variable for the map
var map = L.map('map').setView([51.975, 7.61], 12);

// global variables for saving the training data (polygons)
var allDrawnFeatures = {
  "type": "FeatureCollection",
  "features": []
};

// global variables for saving the rectangles
var allRectangle = {
  "type": "FeatureCollection", 
  "features": []
};

var satalite_layer;

// add the base map
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// layer on which the User can draw a shape
var drawnFeatures = new L.FeatureGroup();
map.addLayer(drawnFeatures);

// adding a Leaflet.Draw toolbar
   var drawControl = new L.Control.Draw( {
    edit: {featureGroup: drawnFeatures, 
      remove: true},
    // only rectangle draw function is needed
    draw: {
        polyline: false,
        rectangle: true,
        polygon: false,
        circle: false,
        circlemarker: false,
        marker: false
    }
}) 

map.addControl(drawControl);

/**
 * function to style the rectangles
 * @param {*} layer
 *  @param {*} layerType 
 */
function setStyle(layer, layerType) {
  if(layerType === 'rectangle') {
    layer.setStyle({
      color : 'black', 
      weight : 3, 
      fillOpacity : 0,
    })
  }
}

// global variables
let rectangleCoordinates = null;
let previousRectangle = null;
let AOICOORD;
let classID;
let objectName;
let ObjektNameCounter = 0;
let ObjektIDCounter = 0;
let numberOfPolygons = 0;
let datum;
let sentinelBooelan;
let drawPolygone
let AOTCOORD;
let drawDataChoiceBoolean;
let algorithem;
//let hyperparameter;
let resolutionBooelan = false;
let downloadModel = false;
let algoBoolean = false;
let aoiBoolean = false;
let modelBoolean = false;
var classBoolean = false;
var demoBoolean = false;

function object_id() {
  return new Promise((resolve) => {
    $('#popup_EnterObjektID').modal('show');
    $('#saveObjektID').off().on('click', function() {
      var classID = document.getElementById('objectIdInput').value;
      $('#popup_EnterObjektID').modal('hide');
      resolve(classID);
    });
  });
}

function object_name() {
  return new Promise((resolve) => {
    $('#popup_ObjectName').modal('show');
    $('#saveObjektName').off().on('click', function() {
      var objectName = document.getElementById('objectNameInput').value;
      $('#popup_ObjectName').modal('hide');
      resolve(objectName);
    });
  });
}

// event-handler for drawing
map.on("draw:created", function(event) {
  var layer = event.layer;
  var type = event.layerType;
  var newFeature = layer.toGeoJSON();
  setStyle(layer, event.layerType);

  if (type === 'rectangle') {
    if (previousRectangle !== null) { // if a rectangle has already been drawn, the old one will be deleted
      drawnFeatures.removeLayer(previousRectangle);
    }
    // rectangleCoordinates = layer.getBounds().toBBoxString(); // only important if a string is required for the coordinates
    rectangleCoordinates = layer.getBounds();
    checkConditionButton5(); // Check Condition to activate easybutton 5 (modeltraining)
    
    // only when everything is resolutionBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates --> Then save AOI in AOICOORD for the JSON that is sent to R
    if (resolutionBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates) {
      AOICOORD = rectangleCoordinates;
    // only when everything is resolutionBooelan === true && drawDataChoiceBoolean === true && rectangleCoordinates --> Then save AOI in AOTCOORD for the JSON that is sent to R
    
    // for drawing in training data yourself
    } else if (resolutionBooelan === true && drawDataChoiceBoolean === true && rectangleCoordinates) {
      AOTCOORD = rectangleCoordinates;
    }

    console.log('Koordinaten: ', newFeature);
    drawnFeatures.addLayer(layer);
    previousRectangle = layer;
  }else if(type === 'polygon'){
    numberOfPolygons++;
    if (rectangleCoordinates && rectangleCoordinates.contains(layer.getBounds())) {
      object_id().then(classID => {
        newFeature.properties = { ClassID: classID };
        return object_name();
      }).then(objectName => {
        newFeature.properties.Label = objectName;
        console.log(newFeature);
        polygonToGeoJSON(newFeature);
        drawnFeatures.addLayer(layer);
        addPopup(layer);
        checkConditionButton3();
      });
    } else {
      $('#popup_NotInAOT').modal('show');
    }
  }
})

function remove_satalite_layer(){
  if(satalite_layer){
    map.removeLayer(satalite_layer)
    satalite_layer = null
  }
}

// event-handler for editing rectangle
map.on("draw:edited", function(event) {
  var layers = event.layers;
  layers.eachLayer(function (layer) {
    if (layer instanceof L.Rectangle) {
      //rectangleCoordinates = layer.getBounds().toBBoxString(); // only important if a string is required for the coordinates
      rectangleCoordinates = layer.getBounds();
    }
  });
})

// deleting the training data
map.on(L.Draw.Event.DELETED, function(event) {
  var deleteAll = confirm('Möchten sie wirklich die Trainingsdaten und Area of Training löschen?')
  if(deleteAll) {
    delete_data()
    drawPolygone = true //vorher false
    localStorage.setItem('drawPolygone', 'false');
    update_drawing()
    location.reload()
  }
})

// show the scale bar on the lower left corner
L.control.scale({imperial: true, metric: true}).addTo(map);

//----------------------------------------------------------------------------------------------
// functions for the actions of the menu

/**
 * function to obtain the Sentinel-2 satellite images
 * @param {*} coordinates
 */
function satelliteImages(coordinates) {
  let NorthEastCoordinates = coordinates.getNorthEast().lng + ', ' + coordinates.getNorthEast().lat;
  let SouthwestCoordinates = coordinates.getSouthWest().lng + ', ' + coordinates.getSouthWest().lat;
  document.getElementById('northeastCoordinates').value = NorthEastCoordinates;
  document.getElementById('southwestCoordinates').value = SouthwestCoordinates;
  $('#popup_sat').modal('show');

  // date selection
  $(document).ready(function () {
    var selectedDate = null; // variable to store the selected date
    $('#fromDate').datepicker({
      autoclose: true,
      format: 'dd/mm/yyyy',
      todayHighlight: true,
      endDate: '+0d' // set the end date limit to today
    }).on('changeDate', function (selected) {
      selectedDate = selected.date;
    });

    $('#saveChangesBtn').on('click', function () {
      let cloudCoverInput = document.getElementById('cloudCoverInput').value; // taking cloud cover into account
      if (cloudCoverInput === '') {
        cloudCoverInput = null;
      } else if (cloudCoverInput > 100 || cloudCoverInput < 0) {
        cloudCoverInput = 'overHundred';
      }

      let selectedDateNull = document.getElementById('fromDate').value; // taking the date into account
      if (selectedDateNull === '') {
        selectedDate = null;
      } else {
        selectedDate = document.getElementById('fromDate').value;
      }
      if (selectedDate !== null && cloudCoverInput !== null && cloudCoverInput !== 'overHundred') {
        let dateParts = selectedDate.split('/');
        let day = parseInt(dateParts[0], 10); // day of the selected date
        let month = parseInt(dateParts[1], 10); // month of the selected date
        let year = parseInt(dateParts[2], 10); // year of the selected date
        datum = day + "." + month + "." + year
        let cloudCoverInput = document.getElementById('cloudCoverInput').value;
        // the function passes the values ​​to the backend, which fetches the satellite images from AWS and returns the ImageURL and the imageBound
        getSatelliteImages(datum, NorthEastCoordinates, SouthwestCoordinates, cloudCoverInput);
      } else if (selectedDate === null) {
        $('#popup_sat').modal('hide');
        $('#popup_NoDate').modal('show');
      } else if (cloudCoverInput === null) {
        $('#popup_sat').modal('hide');
        $('#popup_NoCloudCover').modal('show');
      } else if (cloudCoverInput === 'overHundred') {
        $('#popup_sat').modal('hide');
        $('#popup_CloudCoverNotOver100').modal('show');
      }
    });
  });
}

/**
 * function sends the information to the backend that the sentinel-2 images fetches
 * @param {*} datum
 * @param {*} NorthEastCoordinates
 * @param {*} SouthwestCoordinates
 * @param {*} cloudCoverInput
 */
async function getSatelliteImages(datum, NorthEastCoordinates, SouthwestCoordinates, cloudCoverInput) {
  let URLlist = [];  // the URL list is always emptied when the satellite images are to be fetched again
  try {
    const response = await fetch('/satellite', {  // calling satellite
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Date: datum,
        NEC: NorthEastCoordinates,
        SWC: SouthwestCoordinates,
        CCI: cloudCoverInput
      })
    })
    // if response is not returned properly, returns errors
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    // interpret the response.
    const data = await response.json();
    if (Object.keys(data).length >= 1) { // if more than objects were found, then the id and the url are written into one object URLlist
      for (var index = 0; index < Object.keys(data).length; index++) {
        var key = 'item_' + index;
        if (data.hasOwnProperty(key)) {
          var item = data[key];
          let URLListItem = {
            ID: item.id,
            URL: item.url,
            IB: item.imageBounds
          };
          URLlist.push(URLListItem)
        }
      }
    }
    // the selected ID from the selection list where the satellite images can be selected
    let selectionContent = $('#objectSelect');
    selectionContent.empty(); // empty the contents of the modal body

    if (URLlist.length === 0) {
      $('#popup_select_sat').modal('hide');
      $('#popup_NoData').modal('show');
    } else {
      // creates the selection list in the pop-up window where the satellite images can be selected
      URLlist.forEach(function (item) {
        selectionContent.append($('<option>', {
          text: item.ID
        }));
      });
      $('#popup_select_sat').modal('show'); // open the pop-up window with the satellite image selection list

      // when a satellite image has been selected and confirmed with the “ok” button
      $('#confirmSelectionBtn').on('click', function () {
        $('#loadingSpinner').show();
        reset_AOI()  // when button confirmSelectionBtn is pressed, the previously drawn rectangle is removed from the leaflet map
        let selectedID = $('#objectSelect').val();
        // show the geotiff in the leaflet map
        for (var i = 0; i < URLlist.length; i++) {
          if (selectedID === URLlist[i].ID) {
            let geoTiffURL = URLlist[i].URL;
            // load GeoTIFF from STAC API with georaster_layer_for_leaflet
            parseGeoraster(geoTiffURL).then(georaster => {
              console.log("georaster:", georaster);
              /*
                  GeoRasterLayer is an extension of GridLayer,
                  which means can use GridLayer options like opacity.
                  Just make sure to include the georaster option!
                  http://leafletjs.com/reference-1.2.0.html#gridlayer
              */
              var layer = new GeoRasterLayer({
                useWebWorkers: true,
                attribution: "earth-search.aws.element84.com",
                georaster: georaster,
                resolution: 128,
                keepBuffer: 8
              });
              layer.addTo(map);
              satalite_layer = layer
              setTimeout(function () {
                $('#loadingSpinner').hide();
                checkConditionButton2();
              }, 10000);
            });
          }
        }
        sentinelBooelan = true;

        $('#popup_select_sat').modal('hide'); // close the selection list popup after confirmation
      });
    }
  } catch (error) {
    console.error('Es gab einen Fehler:', error);
    $('#loadingSpinner').hide();
  }
  $('#popup_sat').modal('hide');
}

if (drawPolygone === null) {
  localStorage.setItem('drawPolygone', 'false');
  drawPolygone = false;
}
console.log(localStorage.getItem('drawPolygone'))

/**
 * Function initial_drawing
 */
function initial_drawing() {
  var value = localStorage.getItem('drawPolygone')
  console.log(value)

  if (value === null) {
    drawPolygone = false
    localStorage.setItem('drawPolygone', 'false')
    console.log('Erster Besuch der Seite', drawPolygone)
  } else {
    drawPolygone = value === 'true'
    console.log('Aktualisiert', drawPolygone)
  }
  update_drawing()
}
 
/**
 * Function update_drawing
 */
function update_drawing() {
  map.removeControl(drawControl)
  drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnFeatures, remove: true },
    draw: {
      polyline: false,
      rectangle: true,
      polygon: drawPolygone,
      circle: false,
      circlemarker: false,
      marker: false
    }
  })
  map.addControl(drawControl)
  console.log(drawPolygone)
}

$(document).ready(function () {
  $('#uploadFileChoice').click(function () {

    if (rectangleCoordinates) {
      resolutionBooelan = true;
      $('#popup_TrainingDataChoice').modal('hide')
      document.getElementById('fileInput').click()
      //checkConditionButton3(); // check Condition to activate easybutton 3 (algorithm)
      // only when everything is resolutionBooelan === true && rectangleCoordinates --> Then save AOI in AOTCOORD for the JSON that is sent to R
      // if the training data should be uploaded
      if (resolutionBooelan === true && rectangleCoordinates) {
        AOTCOORD = rectangleCoordinates;
      }
    } else {
      console.log("Es wurde kein Rechteck gezeichnet!");
      $('#popup_TrainingDataChoice').modal('hide')
      $('#popup_NoRectangleForAOT').modal('show')
    }
  })
  $('#drawDataChoice').click(function () {
    resolutionBooelan = true;
    $('#popup_TrainingDataChoice').modal('hide')
    // Note if you want to draw the training data yourself
    $('#popup_NoteDrawTrainigsData').modal('show')
    reset_AOI()
    drawPolygone = true
    localStorage.setItem('drawPolygone', 'true')
    update_drawing()
    // set d to true so that the coordinates are preserved when drawing the rectangle for the AOT (for drawing in training data yourself)
    drawDataChoiceBoolean = true;
  })
})


var fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', handleFileUpload);

/**
 * Function sentinel2 from easyButton1
 */
function sentinel2() {
  if (rectangleCoordinates) {
    satelliteImages(rectangleCoordinates)
  } else {
    showPopupNoRectangle();
  }
}

/**
 * Function trainingData from easyButton2
 */
function trainingData() {
  $('#popup_TrainingDataChoice').modal('show');
}

/**
 * Function algorithm from easyButton3
 */
function algorithm() {
  $('#popup_algo').modal('show');
  $('#confirmSelectionAlg').on('click', function () {
    var algorithmMD = document.getElementById('algorithm1').checked;
    var algorithmRF = document.getElementById('algorithm2').checked;
    var algorithmGBM = document.getElementById('algorithm3').checked
    var algorithmSVM = document.getElementById('algorithm4').checked

    var selected_alg = [algorithmMD, algorithmRF, algorithmGBM, algorithmSVM].filter(Boolean).length
    if (selected_alg !== 1) {  // if neither or both algorithms are selected
      $('#popup_algo').modal('hide');
      $('#popup_NoAlgorithm').modal('show');
      return
    } 
    
    if(algorithmMD){
      algorithem = 'MD'
    }else if(algorithmRF){
      algorithem = 'RF'
    }else if(algorithmGBM){
      algorithem = 'GBM'
    }else if(algorithmSVM){
      algorithem = 'SVM'
    }
      
    $('#popup_algo').modal('hide');
    algoBoolean = true;
    checkConditionButton4() // check Condition to activate easybutton 4 (areaOfIntrest)
    
  })
}

/**
 * Function areaOfIntrest from easyButton4
 */
function areaOfIntrest() {
  if (previousRectangle) {
    drawnFeatures.removeLayer(previousRectangle)
    previousRectangle = null
    rectangleCoordinates = null
    drawnFeatures.clearLayers()
  }
  drawPolygone = false
  localStorage.setItem('drawPolygone', 'false')
  update_drawing()
  aoiBoolean = true
}

/**
 * Function resolutionData from easyButton5
 */
async function resolutionData() {
  $('#popup_EnterResolution').modal('show');

  $('#saveResolution').on('click', async function () {
    let resolutionInput = document.getElementById('objectResolutionInput').value;
    if (resolutionBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates) {
      modelBoolean = true;
      $('#loadingSpinner').show();
      setTimeout(function() {
        $('#loadingSpinner').hide(); //Time, to wait until the application has finished loading
        checkConditionButton6(); // Check Condition to activate easybutton 6 (classification)
      }, 3000);
    } else {
      console.log("Es müssen zuerst Trainigsdaten erstellt, ein Algorithmus ausgewählt und ein AOI gezeichnet werden");
    }
    //End date
    let dateParts = datum.split('.') // Splitting the old date format
    let newDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]); // Be careful months start at 0. So Janua = 0 therefore -1 for month
    let year = newDate.getFullYear();
    let month = String(newDate.getMonth() + 1).padStart(2, '0'); // Add leading zeros for month
    let day = String(newDate.getDate()).padStart(2, '0'); // Add leading zeros for tag
    let NewStartDate = `${year}-${month}-${day}`;

    let startDate = new Date(NewStartDate); // The format “2023-12-03T00:00:00.000Z” comes out here
    //startDate.setDate(startDate.getDate() + 30); // to the selected date will add 30 days to the start date
    startDate.setMonth(startDate.getMonth() + 1); // the selected date will add 1 month to the start date
    let endDate = startDate.toISOString().split('T')[0]; // Format so that only the format YYYY-MM-DD is available

    try {
      let DATAJSON = {
        "AOI": AOICOORD,
        "AOT": AOTCOORD,
        "StartDate": NewStartDate,
        "Enddate": endDate,
        "algorithm": algorithem,
        //"hyperparameter": hyperparameter,
        "trainigsdata": allDrawnFeatures,
        "resolution": resolutionInput
      };
      console.log(DATAJSON);
      send_backend_json(DATAJSON)
    }
    catch (error) {  // Stellen Sie sicher, dass 'error' hier definiert ist
      console.error('Fehler bei der Verarbeitung der Trainingsdaten:', error);
    }
    $('#popup_EnterResolution').modal('hide');
  })
}

/**
 * Function classification
 * 
 */
function classification() {
  $('#loadingSpinner').show();
  fetch('/processgraph', {
    method: 'POST'
  })
    .then(response => {
      if (response.ok) {
        downloadTiff()
        showTiff()
        classBoolean = true;
        if (demoBoolean === false) {
            checkConditionButton7()
        }
      } else {
        $('#loadingSpinner').hide();
        $('#popup_NoteCloudCoverCalculation').modal('show');
      }
    })
    .catch(error => {
      console.error('Fehler:', error);
    });
    
}

/**
 * Function downloadModeltraining
 * 
 */
function downloadModeltraining() {
  downloadRDS();
  downloadModel = true;
  checkConditionButton8();
}


/**
 * Function downloadTiff
 */
function downloadTiff() {
  var user_confirm = confirm('Möchten sie die Klassifikation herunterladen?');
  if (user_confirm) {
    setTimeout(() => {
      fetch('/download-tiff')
        .then(response => {
          response.blob().then(blob => {
            let url = window.URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'color_tif.tif';
            document.body.appendChild(a);
            a.click();
            a.remove(); 
          });
        })
    }, 2000)
  } else {
    console.log("Download wurde verweigert!")
  }
}


function downloadRDS(){
  
  fetch('/download-rds')
    .then(response => {
      response.blob().then(blob => {
        let url = window.URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'train.RDS';
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
    })
}

/**
 * Function showTiff
 */
function showTiff() {
  setTimeout(async () => {
    const response = await fetch('/show-tiff');
    const arrayBuffer = await response.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const raster = await image.readRasters();

    parseGeoraster(arrayBuffer).then(georaster => {
      let uniqueClasses = new Set(allDrawnFeatures.features.map(feature => feature.properties.ClassID));
      let classColor = {};
      let classLabel = new Map();

      allDrawnFeatures.features.forEach(feature => {
        const classID = feature.properties.ClassID;
        const label = feature.properties.Label || feature.properties.Name || 'Unbekannt';
        if(classID && !classLabel.has(classID)){
          classLabel.set(classID, label);
        }
      })

      uniqueClasses.forEach(classID => {
        classColor[classID] = valueToColor(classID, uniqueClasses.size);
      })

      const layer = new GeoRasterLayer({
        georaster: georaster,
        pixelValuesToColorFn: function(pixelValues) {
          const value = pixelValues[0]; 
          if (value === georaster.noDataValue){
            return `rgba(0,0,0,0)`
          }else{
            return classColor[value] || `rgba(0,0,0,0)`
          }
        },
        resolution: 256
      });

      layer.addTo(map);
      map.fitBounds(layer.getBounds());
      legend(classLabel);
    });

    $('#loadingSpinner').hide();
  }, 2000);
}

function valueToColor(classID, totalClasses) {
  let hue = (classID * 360 / totalClasses) % 360
  let [r,g,b] = hslToRgb(hue/ 360, 1, 0.5)
  return `rgb(${r}, ${g}, ${b})`
}



//https://stackoverflow.com/questions/37701211/custom-legend-image-as-legend-in-leaflet-map
function legend(classLabel){
  if(window.myLegend){
    map.removeControl(window.myLegend);
  }
  const legend = L.control({position: 'topleft'});
  legend.onAdd = function(map){
    const div = L.DomUtil.create('div', 'info legend');
    let labels = ['<strong>Klassen</strong>'];

    classLabel.forEach((label, classID) => {
      const color = valueToColor(classID, classLabel.size);
      labels.push(`<div class="legend-entry"><i style="background:${color};"></i><span class="label">${label}</span></div>`)

  })
  
  div.innerHTML = labels.join('<br>')
  return div
}
window.myLegend = legend
legend.addTo(map);
}


function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
      r = g = b = l; 
  } else {
      const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
      };

      let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      let p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * function showTiff() {
  setTimeout(async () => {
    const response = await fetch('/show-tiff');
    const arrayBuffer = await response.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const raster = await image.readRasters();

    parseGeoraster(arrayBuffer).then(georaster => {
      let uniqueClasses = new Set(allDrawnFeatures.features.map(feature => feature.properties.ClassID))
      let classColor = {}
      let classLabel = new Map()

      allDrawnFeatures.features.forEach(feature => {
        const classID = feature.properties.ClassID
        const label = feature.properties.Label || feature.properties.Name || 'Unbekannt'
        if(classID && !classLabel.has(classID)){
          classLabel.set(classID, label)
        }
      })

      uniqueClasses.forEach(classID => {
        classColor[classID] = valueToColor(classID, uniqueClasses.size)
      })

      const layer = new GeoRasterLayer({
        georaster: georaster,
        pixelValuesToColorFn: function(pixelValues) {
          const value = pixelValues[0]; // Angenommen, Sie haben nur ein Band
          if (value === georaster.noDataValue){
            return `rgba(0,0,0,0)`
          }else{
            return classColor[value] || `rgba(0,0,0,0)`
          }
        },
        resolution: 256
      });

      layer.addTo(map);
      map.fitBounds(layer.getBounds());
      legend(classLabel)
    });

    $('#loadingSpinner').hide();
  }, 2000);
}

function valueToColor(classID, totalClasses) {
  let hue = (classID * 360 / totalClasses) % 360
  return `hsl(${hue}, 100%, 50%)`
}



//https://stackoverflow.com/questions/37701211/custom-legend-image-as-legend-in-leaflet-map
function legend(classLabel){
  if(window.myLegend){
    map.removeControl(window.myLegend)
  }
  const legend = L.control({position: 'topleft'})
  legend.onAdd = function(map){
    const div = L.DomUtil.create('div', 'info legend')
    let labels = ['<strong>Klassen</strong>']

    classLabel.forEach((label, classID) => {
      const color = valueToColor(classID, classLabel.size)
      labels.push(`<div class="legend-entry"><i style="background:${color};"></i><span class="label">${label}</span></div>`)

  })
  
  div.innerHTML = labels.join('<br>')
  return div
}
window.myLegend = legend
legend.addTo(map)
}
 */



/**
 * Function to close Popup-windows
 * @param {*} ID_Popup
 */
function closePopup(ID_Popup) {
  if (ID_Popup == 'popup_sat') {
    $('#popup_sat').modal('hide');
  } else if (ID_Popup == 'popup_algo') {
    $('#popup_algo').modal('hide');
  } else if (ID_Popup == 'popup_NoRectangle') {
    $('#popup_NoRectangle').modal('hide');
  } else if (ID_Popup == 'popup_NoDate') {
    $('#popup_NoDate').modal('hide');
    $('#popup_sat').modal('show');
  } else if (ID_Popup == 'popup_NoCloudCover') {
    $('#popup_NoCloudCover').modal('hide');
    $('#popup_sat').modal('show');
  } else if (ID_Popup == 'popup_NoData') {
    $('#popup_NoData').modal('hide');
    $('#popup_sat').modal('show');
  } else if (ID_Popup == 'popup_CloudCoverNotOver100') {
    $('#popup_CloudCoverNotOver100').modal('hide');
    $('#popup_sat').modal('show');
  } else if (ID_Popup == 'popup_NoRectangleForAOT') {
    $('#popup_NoRectangleForAOT').modal('hide');
  } else if (ID_Popup == 'popup_NoAlgorithm') {
    $('#popup_NoAlgorithm').modal('hide');
    $('#popup_algo').modal('show');
  /* } else if (ID_Popup == 'popup_EnterHyperparameterMinimumDistance') {
    $('#popup_EnterHyperparameterMinimumDistance').modal('hide');
    $('#popup_algo').modal('show');
  } else if (ID_Popup == 'popup_NotBetween10And50') {
    $('#popup_NotBetween10And50').modal('hide');
    $('#popup_EnterHyperparameterMinimumDistance').modal('show');
  } else if (ID_Popup == 'popup_EnterHyperparameterRandomForest') {
    $('#popup_EnterHyperparameterRandomForest').modal('hide');
    $('#popup_algo').modal('show');
  } else if (ID_Popup == 'popup_NotBetween10And500') {
    $('#popup_NotBetween10And500').modal('hide');
    $('#popup_EnterHyperparameterRandomForest').modal('show'); */
  } else if (ID_Popup == 'popup_NoteDrawTrainigsData') {
    $('#popup_NoteDrawTrainigsData').modal('hide');
  } else if (ID_Popup == 'popup_TrainingDataChoice') {
    $('#popup_TrainingDataChoice').modal('hide');
  } else if (ID_Popup == 'popup_EnterObjektID') {
    $('#popup_EnterObjektID').modal('hide');
  } else if (ID_Popup == 'popup_ObjectName') {
    $('#popup_ObjectName').modal('hide');
  } else if (ID_Popup == 'popup_NoteCloudCoverCalculation') {
    $('#popup_NoteCloudCoverCalculation').modal('hide');
    location.reload();
  } else if (ID_Popup == 'popup_EnterResolution') {
    $('#popup_EnterResolution').modal('hide');
  } else if (ID_Popup == 'popup_NotInAOT') {
    $('#popup_NotInAOT').modal('hide');
  } else if (ID_Popup == 'popup_select_sat') {
    $('#popup_select_sat').modal('hide');
    URLlist = []; //The URLlist is emptied when the popup window is closed using cancel ("Abbrechen")
    $('#popup_sat').modal('show');
  }
}


/**
 * Function demoButton
 * 
 */
function demoButton() {
  document.getElementById('exampleButton').style.display = 'none';
  demoBoolean = true;
  $('#loadingSpinner').show();
  const DEMO_AOICOORD = { _northEast: { lat: 51.973566, lng: 7.606487 }, _southWest: { lat: 51.957585, lng: 7.572333 } }
  //const DEMO_AOICOORD = { _northEast: { lat: 51.954582, lng: 7.607768 }, _southWest: { lat: 51.943571, lng: 7.585886 } }
  //const DEMO_AOTCOORD = { _northEast: { lat: 51.90462174078735, lng: 7.668225785886583 }, _southWest: { lat: 51.87908396304335, lng: 7.617230713510279 } }
  const DEMO_AOTCOORD = { _northEast: { lat: 51.572593, lng: 7.608034 }, _southWest: { lat: 51.428018, lng: 7.267525 } }
  const DEMO_NewStartDate = "2022-07-01"
  const DEMO_endDate = "2022-08-01"
  const DEMO_algorithem = "RF"
  const DEMO_allDrawnFeatures = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "fid": 1,
          "Label": "Wald",
          "ClassID": 1
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                7.4530336,
                51.5693962
              ],
              [
                7.4520832,
                51.5625256
              ],
              [
                7.4611466,
                51.5589562
              ],
              [
                7.4601393,
                51.5680142
              ],
              [
                7.4601393,
                51.5680142
              ],
              [
                7.4530336,
                51.5693962
              ]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 2, "Label": "Wald", "ClassID": 1 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4679837, 51.5681169],
              [7.4695571, 51.5604323],
              [7.4726976, 51.5674407],
              [7.4679837, 51.5681169]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 3, "Label": "Wasser", "ClassID": 2 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4017649, 51.5172864],
              [7.398151, 51.5160622],
              [7.4004202, 51.5150412],
              [7.4004202, 51.5150412],
              [7.4017649, 51.5172864]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 4, "Label": "Wasser", "ClassID": 2 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4053792, 51.5159967],
              [7.4037997, 51.5148277],
              [7.4063285, 51.5145205],
              [7.4053792, 51.5159967]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 5, "Label": "Wasser", "ClassID": 2 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.5132972, 51.4907468],
              [7.5100753, 51.4908972],
              [7.5125273, 51.4895211],
              [7.5132972, 51.4907468]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 6, "Label": "Wasser", "ClassID": 2 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4374581, 51.5466891],
              [7.4359762, 51.5470929],
              [7.4359097, 51.5464772],
              [7.4374581, 51.5466891]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 7, "Label": "Acker_unbepflanzt", "ClassID": 3 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4354302, 51.5713077],
              [7.4344649, 51.5700516],
              [7.4367654, 51.5688118],
              [7.4390753, 51.5704956],
              [7.4354302, 51.5713077]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 8, "Label": "Acker_unbepflanzt", "ClassID": 3 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.432693, 51.5763123],
              [7.4330359, 51.5739944],
              [7.434945, 51.5752221],
              [7.432693, 51.5763123]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 9, "Label": "Acker_unbepflanzt", "ClassID": 3 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4927671, 51.5863071],
              [7.4891893, 51.585742],
              [7.4900111, 51.584769],
              [7.4927671, 51.5863071]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 10, "Label": "Acker_unbepflanzt", "ClassID": 3 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4994103, 51.5830316],
              [7.4972712, 51.582731],
              [7.4978828, 51.5801431],
              [7.4994103, 51.5830316]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 11, "Label": "Acker_unbepflanzt", "ClassID": 3 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4678282, 51.5962098],
              [7.4655024, 51.5955784],
              [7.4658367, 51.5941209],
              [7.4678282, 51.5962098]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 12, "Label": "Acker_unbepflanzt", "ClassID": 3 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.5218285, 51.5990267],
              [7.5175716, 51.5977162],
              [7.522586, 51.5973149],
              [7.5218285, 51.5990267]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 13, "Label": "Acker_bepflanzt", "ClassID": 4 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.5026221, 51.590723],
              [7.5001694, 51.5906097],
              [7.5025768, 51.5880994],
              [7.5026221, 51.590723]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 14, "Label": "Acker_bepflanzt", "ClassID": 4 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4963715, 51.59537],
              [7.4939669, 51.5951205],
              [7.4937775, 51.5942165],
              [7.4962349, 51.5941933],
              [7.4963715, 51.59537]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 15, "Label": "Acker_bepflanzt", "ClassID": 4 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.500507, 51.595013],
              [7.4989247, 51.5951021],
              [7.5006844, 51.5936218],
              [7.500507, 51.595013]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 16, "Label": "Acker_bepflanzt", "ClassID": 4 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4886654, 51.5618754],
              [7.4870339, 51.5618339],
              [7.4875108, 51.560672],
              [7.4890008, 51.5606843],
              [7.4886654, 51.5618754]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 17, "Label": "Acker_bepflanzt", "ClassID": 4 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.3977967, 51.6031643],
              [7.3947658, 51.6032595],
              [7.3951069, 51.6010509],
              [7.3985349, 51.6021361],
              [7.3977967, 51.6031643]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 18, "Label": "Wald", "ClassID": 1 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4320495, 51.5806754],
              [7.4325856, 51.577841],
              [7.4368883, 51.5802481],
              [7.4320495, 51.5806754]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 19, "Label": "Wald", "ClassID": 1 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.4740649, 51.6015576],
              [7.4741803, 51.5981164],
              [7.4776246, 51.5974507],
              [7.4789019, 51.6012379],
              [7.4740649, 51.6015576]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 20, "Label": "Wald", "ClassID": 1 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.5070392, 51.5928012],
              [7.5058455, 51.5904089],
              [7.5101971, 51.5914752],
              [7.5070392, 51.5928012]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 21, "Label": "Industrie", "ClassID": 5 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.5030709, 51.5333503],
              [7.4986384, 51.5322554],
              [7.5037182, 51.5296426],
              [7.5095895, 51.5322857],
              [7.5030709, 51.5333503]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 22, "Label": "Industrie", "ClassID": 5 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.490506, 51.5443508],
              [7.4908871, 51.5434267],
              [7.4966871, 51.5456051],
              [7.490506, 51.5443508]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": { "fid": 23, "Label": "Industrie", "ClassID": 5 },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.5031099, 51.5428456],
              [7.5003095, 51.541389],
              [7.5038645, 51.5405464],
              [7.5031099, 51.5428456]
            ]
          ]
        }
      },
  {
    "type": "Feature",
    "properties": { "fid": 24, "Label": "Industrie", "ClassID": 5 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.4195672, 51.5669283], 
          [7.4197256, 51.5636243], 
          [7.4214393, 51.5635108], 
          [7.4212138, 51.5668548], 
          [7.4195672, 51.5669283] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 25, "Label": "Industrie", "ClassID": 5 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.4232029, 51.5651192], 
          [7.4230758, 51.563724], 
          [7.4270871, 51.5637232], 
          [7.4272634, 51.5649688], 
          [7.4232029, 51.5651192] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 26, "Label": "Industrie", "ClassID": 5 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.4202743, 51.5617054], 
          [7.4203841, 51.5604364], 
          [7.4302136, 51.5607732], 
          [7.4300608, 51.562028], 
          [7.4202743, 51.5617054] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 27, "Label": "Industrie", "ClassID": 5 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.4210687, 51.5596532], 
          [7.423738, 51.5578858], 
          [7.431667, 51.5573909], 
          [7.43099, 51.5598683], 
          [7.4210687, 51.5596532] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 28, "Label": "Stadt", "ClassID": 6 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.4659959, 51.51742], 
          [7.4587163, 51.5151114], 
          [7.4684726, 51.5127801], 
          [7.4726333, 51.5166869], 
          [7.4659959, 51.51742] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 29, "Label": "Stadt", "ClassID": 6 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.4514753, 51.5258907], 
          [7.4513032, 51.5219265], 
          [7.4570234, 51.5250348], 
          [7.4514753, 51.5258907] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 30, "Label": "Stadt", "ClassID": 6 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.4552937, 51.5049567], 
          [7.4577325, 51.5027482], 
          [7.4641284, 51.5052366], 
          [7.4552937, 51.5049567] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 31, "Label": "Stadt", "ClassID": 6 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.41105, 51.5031087], 
          [7.4127888, 51.5009463], 
          [7.41547, 51.5044254], 
          [7.41105, 51.5031087] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 32, "Label": "Stadt", "ClassID": 6 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.4532486, 51.5459421], 
          [7.4474693, 51.5432154], 
          [7.4620725, 51.5415771], 
          [7.4532486, 51.5459421] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 33, "Label": "Stadt", "ClassID": 6 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.4124832, 51.5387033], 
          [7.4085513, 51.535863], 
          [7.4114663, 51.5339352], 
          [7.4124832, 51.5387033] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 34, "Label": "Stadt", "ClassID": 6 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.4855333, 51.4439552], 
          [7.4843231, 51.4435297], 
          [7.48504, 51.4430061], 
          [7.4855333, 51.4439552] 
        ]
      ]
    }
  },
  {
    "type": "Feature",
    "properties": { "fid": 35, "Label": "Stadt", "ClassID": 6 },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [ 
          [7.5323599, 51.4330954], 
          [7.5317611, 51.4323434], 
          [7.5335823, 51.4321203], 
          [7.5323599, 51.4330954] 
            ]
          ]
        }
      }
    ]
  }
  const DEMO_resolutionInput = "30"

  allDrawnFeatures = DEMO_allDrawnFeatures
  let DEMODATAJSON = {
    "AOI": DEMO_AOICOORD,
    "AOT": DEMO_AOTCOORD,
    "StartDate": DEMO_NewStartDate,
    "Enddate": DEMO_endDate,
    "algorithm": DEMO_algorithem,
    "trainigsdata": allDrawnFeatures,
    "resolution": DEMO_resolutionInput
  };
  console.log(DEMODATAJSON);
  send_backend_json(DEMODATAJSON);
  setTimeout(() => {
    classification();

  }, 10000)
}


/**
 * Function to showPopupNoRectangle
 */
function showPopupNoRectangle() {
  $('#popup_NoRectangle').modal('show');
}

/**
 * Function to reset_AOI
 */
function reset_AOI() {
  if (previousRectangle) {
    drawnFeatures.removeLayer(previousRectangle);
    delete_data();
    previousRectangle = null;
    rectangleCoordinates = null;
  }
}

function reload (){
  location.reload();
}

// create easyButtons for the menu-functions
// Button Sentinel-2 Data -----------------------------
var button1 = L.easyButton('<img src="../images/sentinal_icon.png" style="width: 20px; height: 20px;">', sentinel2, 'Sentinal-2');

// Button Trainigsdata -----------------------------
var button2 = L.easyButton('<img src="../images/trainigsdaten_icon.png" style="width: 20px; height: 20px;">', trainingData, 'Training data');
button2.disable(); // by default the button is disabled
/**
 * Function checkConditionButton2
 * only active when variable resolutionBooelan = true
 */
function checkConditionButton2() {
  if (sentinelBooelan === true) {
    //button1.disable();
    button2.enable();
  } else {
    button2.disable();
  }
}

// Button algorithem -----------------------------
var button3 = L.easyButton('<img src="../images/algorithmus_icon.png" style="width: 20px; height: 20px;">', algorithm, 'Algorithm');
button3.disable(); // by default the button is disabled
/**
 * Function checkConditionButton3
 * only active when variable resolutionBooelan = true
 */
function checkConditionButton3() {
  if (resolutionBooelan === true) {
    //button2.disable();
    button3.enable();
  } else {
    button3.disable();
  }
}

// Button area of intrest -----------------------------
var button4 = L.easyButton('<img src="../images/aoi_icon.png" style="width: 20px; height: 20px;">', function () {
  areaOfIntrest()
  remove_satalite_layer()
}, 'AOI');
button4.disable(); // by default the button is disabled
/**
 * Function checkConditionButton4
 * only active when variable resolutionBooelan = true and algoBoolean = true
 */
function checkConditionButton4() {
  if (resolutionBooelan === true && algoBoolean === true) {
    //button3.disable();
    button4.enable();
  } else {
    button4.disable();
  }
}

// Button resolution -----------------------------
var button5 = L.easyButton('<img src="../images/resolution_icon.png" style="width: 20px; height: 20px;">', resolutionData
  , 'Resolution');
button5.disable(); // by default the button is disabled
/**
 * Function checkConditionButton5
 * only active when variable resolutionBooelan = truen, algoBoolean = true and aoiBoolean = true and a rectangle has been drawn
 */
function checkConditionButton5() {
  if (resolutionBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates) {
    //button4.disable();
    button5.enable();
  } else {
    button5.disable();
  }
}

// Button classification -----------------------------
var button6 = L.easyButton('<img src="../images/klassifikation_icon.png" style="width: 20px; height: 20px;">', classification, 'Classification');
button6.disable(); // by default the button is disabled
/**
 * Function checkConditionButton6
 * only active when variable resolutionBooelan = truen, algoBoolean = true, aoiBoolean = true and modelBoolean = true and a rectangle has been drawn
 */
function checkConditionButton6() {
  if (resolutionBooelan === true && algoBoolean === true && aoiBoolean === true && modelBoolean === true && rectangleCoordinates) {
    //button5.disable();
    button6.enable();
  } else {
    button6.disable();
  }
}
// Button download modeltraining -----------------------------
var button7 = L.easyButton('<img src="../images/modeltraining_icon.png" style="width: 20px; height: 20px;">', downloadModeltraining, 'Download Model');
button7.disable(); // by default the button is disabled
/**
 * Function checkConditionButton7
 * only active when variable resolutionBooelan = truen, algoBoolean = true, aoiBoolean = true and modelBoolean = true and a rectangle has been drawn
 */
function checkConditionButton7() {
  if (resolutionBooelan === true && algoBoolean === true && aoiBoolean === true && modelBoolean === true && classBoolean === true && rectangleCoordinates) {
    //button5.disable();
    button7.enable();
  } else {
    button7.disable();
  }
}

// Button reload -----------------------------
var button8 = L.easyButton('<img src="../images/reload.png" style="width: 20px; height: 20px;">', reload, 'Reload');
button8.disable(); // by default the button is disabled
/**
 * Function checkConditionButton8
 * only active when variable resolutionBooelan = truen, algoBoolean = true, aoiBoolean = true and modelBoolean = true and a rectangle has been drawn
 */
function checkConditionButton8() {
  if (downloadModel === true && resolutionBooelan === true && algoBoolean === true && aoiBoolean === true && modelBoolean === true && classBoolean === true && rectangleCoordinates) {
    //button5.disable();
    button8.enable();
  } else {
    button8.disable();
  }
}

// create the main toggle menu
var toggleMenuButton = L.easyButton({
  position: 'topright',
  states: [{
    stateName: 'closed',
    icon: '<img src="../images/menu_icon.png" style="width: 20px; height: 20px;">',
    title: 'Öffne Menü',
    onClick: function (btn, map) {
      btn.state('open');
      button1.addTo(map).setPosition('topright');
      button2.addTo(map).setPosition('topright');
      button3.addTo(map).setPosition('topright');
      button4.addTo(map).setPosition('topright');
      button5.addTo(map).setPosition('topright');
      button6.addTo(map).setPosition('topright');
      button7.addTo(map).setPosition('topright');
      button8.addTo(map).setPosition('topright');
    }
  }, {
    stateName: 'open',
    icon: '<img src="../images/menu_icon.png" style="width: 20px; height: 20px;">',
    title: 'Schließe Menü',
    onClick: function (btn, map) {
      btn.state('closed');
      button1.remove();
      button2.remove();
      button3.remove();
      button4.remove();
      button5.remove();
      button6.remove();
      button7.remove();
      button8.remove()
    }
  }]
});

// add toggle menu to leaflet-map
toggleMenuButton.addTo(map);

/**
 * **********************************************************************************
 */
 var duplicate_key = {};

/**
 * Function create_key
 * Generates a unique key for a given feature. 
 * The function receives a feature object and converts it into a JSON string based on the geometry and the property and joins them together. 
 * This combination serves as a unique key and is used later to prevent duplicate polygons.
 * @param {*} feature 
 * @returns {String} A unique key for the given feature
 */
function create_key(feature){
  return JSON.stringify(feature.geometry) + JSON.stringify(feature.properties)
}

/**
 * Function addFeature
 * Adds a feature to the collection if it does not already exist
 * Uses 'create_key' to avoid duplicates
 * @param {*} feature 
 */
function addFeature(feature) {
  var key = create_key(feature)
  if (!duplicate_key[key]) {
    var featureCopy = JSON.parse(JSON.stringify(feature));
    allDrawnFeatures.features.push(featureCopy);
    duplicate_key[key] = true;
  }
}


/**
 * Function polygonToGeoJSON
 * This function adds a polygon as a GeoJSON object
 * @param {*} newFeatureThe GeoJSON object that is to be added
 */
function polygonToGeoJSON(newFeature) {
  addFeature(newFeature);
}

/**
 * Function merge_choice
 * @param {*} onConfirm
 * @param {*} onCancel
 */
function merge_choice(onConfirm, onCancel) {
  var userChoice = confirm('Möchten Sie die hochgeladene GeoJSON-Datei mit den vorhandenen Daten zusammenführen?');
  if (userChoice) {
    onConfirm();
    checkConditionButton3();
  } else {
    onCancel();
  }
}

/**
 * Function isUploadinRectangle
 * @param {*} feature
 * @param {*} rectangleCoordinates
 */
function isUploadinRectangle(feature, rectangleCoordinates) {
  const bounds = L.geoJSON(feature).getBounds();
  return rectangleCoordinates.contains(bounds)
}

/**
 * Function handleFileUpload
 * This asynchronous function enables the upload of GeoJSON or geopackage files. In addition, the polygons contained are then displayed on the map
 * https://stackoverflow.com/questions/61486834/check-every-values-in-array-of-object
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
 * @returns 
 */
async function handleFileUpload() {
  console.log('file_upload');

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  if (!file) {
      alert('Datei auswählen!');
      return;
  }

  
  const fileType = file.name.split('.').pop().toLowerCase();

  if (fileType === 'json' || fileType === 'geojson') {
    const reader = new FileReader();
    reader.onload = async function(event) {
      console.log('GeoJSON Datei wurde erfolgreich geladen');
      try{
        const data_geojson = JSON.parse(event.target.result);

      
      for(const feature of data_geojson.features){
          if(!feature.properties || Object.keys(feature.properties).length === 0){
            alert('Die Daten müssen gelabelt sein!');
            delete_data();
            return
          }
      }

      const filteredGeometry = data_geojson.features.filter(feature => 
        rectangleCoordinates && isUploadinRectangle(feature, rectangleCoordinates) &&
        feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon' 
      );
      let classID_counts = {};
      let classID_miss = false;
      let class_ID_set = new Set()
      filteredGeometry.forEach(feature => {
          if ('ClassID' in feature.properties) {
          const classID = feature.properties.ClassID;
          classID_counts[classID] = (classID_counts[classID] || 0) + 1;
          if(classID_counts[classID] >= 3){
            class_ID_set.add(classID);
          }
        } else {
          classID_miss = true;
      }
    });
    if (classID_miss) {
      alert('Einige der Daten haben keine ClassID!');
      delete_data();
      return;
    }
    const all_classID = Object.values(classID_counts).every(count => count >= 3);
    const classID_three = class_ID_set.size >= 3
      if (!all_classID || !classID_three) {
          alert('Jede ClassID muss mindestens dreimal vorkommen und es muss mindestens drei unterschiedliche ClassID geben, damit wir ein Modelltraining durchführen können!');
          delete_data();
          return;
          }





  merge_choice(
         () => {
          console.log("Nun bei der anzeige");

          addToMap({ type: 'FeatureCollection', features: filteredGeometry });
          console.log('GeoJSON Daten zur Karte hinzugefügt');

          drawPolygone = true;
          localStorage.setItem('drawPolygone', 'true');
          update_drawing();
        }, 
        () => {
          L.geoJSON({ type: 'FeatureCollection', features: filteredGeometry }).addTo(map)
          console.log('GeoJSON', { type: 'FeatureCollection', features: filteredGeometry })
        }
        
      )
      }catch{
        alert('Bitte überprüfen sie, ob die GeoJSON Valide ist!');
        delete_data();
      }
    };
    reader.readAsText(file);
  }

 
  else if (fileType === 'gpkg') {
    console.log('GeoPackage Datei auswählen');
    const formData = new FormData();
    formData.append('file', file);

    fetch('/upload' , {
      method : 'POST' , 
      body : formData ,

    })
    .then(response => response.json())
    .then(data => {
      console.log(data);
      const layers = data.data; 
      for(layer in layers){
        const geojson_data = layers[layer]
        if(geojson_data.type === 'FeatureCollection'){

          for(const feature of geojson_data.features){
            if(!feature.properties || Object.keys(feature.properties).length === 0){
              alert("Die Daten müssen gelabelt sein!");
              return
            }
          }

          const filteredGeometry = geojson_data.features.filter(feature => 
            rectangleCoordinates && isUploadinRectangle(feature, rectangleCoordinates) 
          );
          let classID_counts = {};
          let classID_miss = false;
          let class_ID_set = new Set();
          filteredGeometry.forEach(feature => {
              if ('ClassID' in feature.properties) {
              const classID = feature.properties.ClassID;
              classID_counts[classID] = (classID_counts[classID] || 0) + 1;
              if(classID_counts[classID] >= 3){
                class_ID_set.add(classID);
              }
          } else {
              classID_miss = true;
          }
        });
        if (classID_miss) {
          alert('Einige der Daten haben keine ClassID!');
          delete_data();
          return;
        }
        const all_classID = Object.values(classID_counts).every(count => count >= 3);
        const classID_three = class_ID_set.size >= 3;
        if (!all_classID || !classID_three) {
            alert('Jede ClassID muss mindestens dreimal vorkommen und es muss mindestens drei unterschiedliche ClassID geben, damit wir ein Modelltraining durchführen können!');
            delete_data();
            return;
          }

          
          addToMap({ type: 'FeatureCollection', features: filteredGeometry });
          checkConditionButton3();
        }else{
          console.error('Kein gültiges Format!');
        }
      }
      
    })
    .catch(error => {
      console.error('Fehler', error);
      delete_data();
    })

    
    
} else {
      alert('Nicht unterstütztes Dateiformat. Bitte laden Sie eine GeoJSON- oder GeoPackage-Datei hoch.');
  }
  fileInput.value = '';
}





/**
 * Function addToMap
 * Adds the data to the leaflet map
 * @param {*} data GeoJSON-data to be added to the map
 */
function addToMap(data) {
  if (data.type === 'FeatureCollection') {
    L.geoJSON(data, {
      onEachFeature: function (feature, layer) {
        addFeature(feature);
        drawnFeatures.addLayer(layer);
      }
    }).addTo(map);
  } else if (typeof data === 'object') {
    for (const layerName in data) {
      const layerData = data[layerName];
      L.geoJSON(layerData, {
        onEachFeature: function (feature, layer) {
        }
      }).addTo(map);
    }
  } else {
    console.error('Ungültige Datenstruktur für die Kartenanzeige');
  }
}

/**
 * Function node_polygon
 * Processes GeoJSON data. Differentiates between Feature and FeatureCollection, but sends each feature individually
 * @param {*} geojsonData 
 * @returns 
 */
function node_polygon(geojsonData) {
  // If a single feature is passed, add it to allDrawnFeatures
  if (geojsonData.type === 'Feature') {
    addFeature(geojsonData);
  }
  //If a FeatureCollection is passed, add each feature individually
  else if (geojsonData.type === 'FeatureCollection') {
    geojsonData.features.forEach(addFeature)
  }
}

/**
 * Function node_rectangle
 * @param {*} area_of_Training 
 */
function node_rectangle(area_of_Training) {
  console.log('allRectangle vor dem Push:', allRectangle);
  console.log('area_of_Training:', area_of_Training);
  allRectangle.features.push(area_of_Training)
  rectangleCoordinates = L.geoJSON(area_of_Training).getBounds();
}

/**
 * Function status_server
 * @param {*}
 */
async function status_server() {
  return fetch('/status')
    .then(response => {
      if (!response.ok) {
        console.log('Server-Fehler')
      }
      return response.json()
    })
    .then(data => data.status === 'ready')
    .catch(error => { console.error('Status konnte nicht abgerufen werden', error); return false })
}

/**
 * Function check_map
 * @param {*}
 */
async function check_map() {
  if (await status_server()) {
  } else {
    console.log('Server ist noch nicht bereit!')
    location.reload()
  }
}

/**
 * Function delete_data
 * @param {*}
 */
function delete_data() {
  fetch('/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deleteAll: true })
  })
    .then(response => response.json())
    .then(data => {
      console.log(data)
    })
    .catch(error => console.error('Fehler beim löschen', error))
  allDrawnFeatures = { "type": "FeatrueCollection", "features": [] };
  allRectangle = { "type": "Featurecollection", "features": [] };
  drawnFeatures.clearLayers()
  rectangleCoordinates = null
}

/**
 * Function addPopup
 * @param {*} layer 
 */
function addPopup(layer) {
  var popupContent = '<button onclick="download_data()">Download</button>'
  layer.bindPopup(popupContent);
}

/**
 * Function send_backend_json
 * @param {*} DATAJSON 
 */
function send_backend_json(DATAJSON) {
  fetch('/send-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(DATAJSON)

  })
    .then(response => response.json())
    .then(data => { console.log(data) })
    .catch(error => { console.error(error) })
}

document.addEventListener('DOMContentLoaded', function () {
  initial_drawing()
  check_map()
  delete_data()
});

window.addEventListener('beforeunload', function (e) {
  localStorage.setItem('drawPolygone', 'false');
});
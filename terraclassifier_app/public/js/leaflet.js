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
      weight : 2, 
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
let hyperparameter;
let trainigBooelan = false;
let algoBoolean = false;
let aoiBoolean = false;
let modelBoolean = false;

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
    
    // only when everything is trainigBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates --> Then save AOI in AOICOORD for the JSON that is sent to R
    if (trainigBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates) {
      AOICOORD = rectangleCoordinates;
    // only when everything is trainigBooelan === true && drawDataChoiceBoolean === true && rectangleCoordinates --> Then save AOI in AOTCOORD for the JSON that is sent to R
    
    // for drawing in training data yourself
    } else if (trainigBooelan === true && drawDataChoiceBoolean === true && rectangleCoordinates) {
      AOTCOORD = rectangleCoordinates;
    }

    console.log('Koordinaten: ', newFeature);
    drawnFeatures.addLayer(layer);
    previousRectangle = layer;
  }else if(type === 'polygon'){
    numberOfPolygons++;
    if (rectangleCoordinates && rectangleCoordinates.contains(layer.getBounds())) {
      object_id().then(classID => {
        newFeature.properties = { classID: classID };
        return object_name();
      }).then(objectName => {
        newFeature.properties.name = objectName;
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
      trainigBooelan = true;
      $('#popup_TrainingDataChoice').modal('hide')
      document.getElementById('fileInput').click()
      checkConditionButton3(); // check Condition to activate easybutton 3 (algorithm)
      // only when everything is trainigBooelan === true && rectangleCoordinates --> Then save AOI in AOTCOORD for the JSON that is sent to R
      // if the training data should be uploaded
      if (trainigBooelan === true && rectangleCoordinates) {
        AOTCOORD = rectangleCoordinates;
      }
    } else {
      console.log("Es wurde kein Rechteck gezeichnet!");
      $('#popup_TrainingDataChoice').modal('hide')
      $('#popup_NoRectangleForAOT').modal('show')
    }
  })
  $('#drawDataChoice').click(function () {
    trainigBooelan = true;
    $('#popup_TrainingDataChoice').modal('hide')
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
    if ((algorithmMD && algorithmRF) || (!algorithmMD && !algorithmRF)) {  // if neither or both algorithms are selected
      $('#popup_algo').modal('hide');
      $('#popup_NoAlgorithm').modal('show');
    } else {
      if (algorithmMD) {
        algorithem = 'MD';
        $('#popup_algo').modal('hide');
        $('#popup_EnterHyperparameterMinimumDistance').modal('show');

        $('#saveTuneLength').on('click', function () {
          var MinimumDistanceTuneLengthInput = document.getElementById('MinimumDistanceTuneLengthInput').value;
          if (MinimumDistanceTuneLengthInput === '') {
            $('#popup_EnterHyperparameterMinimumDistance').modal('hide');
            $('#popup_NotBetween10And50').modal('show');
          } else if (MinimumDistanceTuneLengthInput > 50 || MinimumDistanceTuneLengthInput < 10) {
            $('#popup_EnterHyperparameterMinimumDistance').modal('hide');
            $('#popup_NotBetween10And50').modal('show');
          } else if (MinimumDistanceTuneLengthInput < 50 || MinimumDistanceTuneLengthInput > 10) {
            hyperparameter = MinimumDistanceTuneLengthInput;
            algoBoolean = true;
            checkConditionButton4() // check Condition to activate easybutton 4 (areaOfIntrest)
            $('#popup_EnterHyperparameterMinimumDistance').modal('hide');
            console.log("hyperparameter: " + hyperparameter);
          }
          
        })
      } else {
        algorithem = 'RF';
        $('#popup_algo').modal('hide');
        $('#popup_EnterHyperparameterRandomForest').modal('show');

        $('#saveNTree').on('click', function () {
          var RandomForestNTreeInput = document.getElementById('RandomForestNTreeInput').value;
          if (RandomForestNTreeInput === '') {
            $('#popup_EnterHyperparameterRandomForest').modal('hide');
            $('#popup_NotBetween10And500').modal('show');
          } else if (RandomForestNTreeInput > 500 || RandomForestNTreeInput < 10) {
            $('#popup_EnterHyperparameterRandomForest').modal('hide');
            $('#popup_NotBetween10And500').modal('show');
          } else if (RandomForestNTreeInput < 500 || RandomForestNTreeInput > 10) {
            hyperparameter = RandomForestNTreeInput;
            algoBoolean = true;
            checkConditionButton4() // check Condition to activate easybutton 4 (areaOfIntrest)
            $('#popup_EnterHyperparameterRandomForest').modal('hide');
            console.log("hyperparameter: " + hyperparameter);
          }
        })
      }
      //algoBoolean = true;
      //checkConditionButton4() // check Condition to activate easybutton 4 (areaOfIntrest)
      //$('#popup_algo').modal('hide');
    }
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
 * Function modelTraining from easyButton5
 */
async function modelTraining() {
  $('#popup_EnterResolution').modal('show');

  $('#saveResolution').on('click', async function () {
    let resolutionInput = document.getElementById('objectResolutionInput').value;
    if (trainigBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates) {
      modelBoolean = true;
      checkConditionButton6(); // Check Condition to activate easybutton 6 (classification)
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
    startDate.setDate(startDate.getDate() + 14); // to the selected date will add 14 days to the start date
    let endDate = startDate.toISOString().split('T')[0]; // Format so that only the format YYYY-MM-DD is available

    try {
      let DATAJSON = {
        "AOI": AOICOORD,
        "AOT": AOTCOORD,
        "StartDate": NewStartDate,
        "Enddate": endDate,
        "algorithm": algorithem,
        "hyperparameter": hyperparameter,
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
 */
function classification() {
  fetch('/processgraph', {
    method: 'POST'
  })
    .then(response => {
      if (response.ok) {
        downloadTiff()
        showTiff()
      } else {
        console.log("Fehler bei der Verarbeitung der Datei!")
      }
    })
    .catch(error => {
      console.error('Fehler:', error);
    });
}

/**
 * Function downloadTiff
 */
function downloadTiff() {
  var user_confirm = confirm("Möchten sie die Klassifikation herunterladen?")
  if (user_confirm) {
    setTimeout(() => {
      fetch('/download-tiff')
        .then(response => {
          response.blob().then(blob => {
            // creating a link element for the download
            let url = window.URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'test_js_1.tif';
            document.body.appendChild(a);
            a.click();
            a.remove(); // removing the element after the download
          });
        })
    }, 5000)
  } else {
    console.log("Download wurde verweigert!")
  }
}

/**
 * Function showTiff
 */
function showTiff() {
  setTimeout(() => {
    fetch('/show-tiff')
      .then(response => {
        response.blob()
          .then(blob => {
            let url = window.URL.createObjectURL(blob)
            parseGeoraster(url).then(georaster => {
              var layer = new GeoRasterLayer({
                georaster: georaster,
                useWebWorkers: true,
                resolution: 128,
                keepBuffer: 8
              })
              layer.addTo(map)
            })
          })
          .catch(error => {
            console.error('Fehler beim anzeigen der Tif!')
          })
      })
  }, 10000)
}

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
  } else if (ID_Popup == 'popup_EnterHyperparameterMinimumDistance') {
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
    $('#popup_EnterHyperparameterRandomForest').modal('show');
  } else if (ID_Popup == 'popup_TrainingDataChoice') {
    $('#popup_TrainingDataChoice').modal('hide');
  } else if (ID_Popup == 'popup_EnterObjektID') {
    $('#popup_EnterObjektID').modal('hide');
  } else if (ID_Popup == 'popup_ObjectName') {
    $('#popup_ObjectName').modal('hide');
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
  /*
  fetch('/demo_builder', {
    method: 'POST',
    body: JSON.stringify({}) 
  })
  .then(response => {
    // Überprüfen Sie den Status der Antwort
    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }
    return response.blob();
  })
  .then(blob => {
    // Verarbeite den Blob, z.B. zeige ein Bild an
    const imageUrl = URL.createObjectURL(blob);
    console.log(imageUrl);
    const imageElement = document.createElement('img');
    imageElement.src = imageUrl;
    document.body.appendChild(imageElement);
  })*/
  document.getElementById('exampleButton').style.display = 'none';
  const DEMO_AOICOORD = { northEast: { lat: 51.966, lng: 7.6175 }, southWest: { lat: 51.939, lng: 7.5714 } }
  const DEMO_AOTCOORD = { northEast: { lat: 51.90462174078735, lng: 7.668225785886583 }, southWest: { lat: 51.87908396304335, lng: 7.617230713510279 } }
  const DEMO_NewStartDate = "2023-07-01"
  const DEMO_endDate = "2023-07-15"
  const DEMO_algorithem = "MD"
  const DEMO_allDrawnFeatures = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "classID": "1",
          "name": "Wasser"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.655696, 51.886889],
              [7.658743, 51.886968],
              [7.658915, 51.885908],
              [7.656468, 51.885935],
              [7.655696, 51.886889]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "2",
          "name": "Wasser"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.660804, 51.888531],
              [7.657971, 51.888505],
              [7.655824, 51.888214],
              [7.656511, 51.887737],
              [7.659216, 51.887949],
              [7.660804, 51.888531]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "3",
          "name": "Wasser"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.633589, 51.891366],
              [7.631958, 51.890969],
              [7.630499, 51.890942],
              [7.63243, 51.890492],
              [7.634491, 51.890465],
              [7.633589, 51.891366]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "4",
          "name": "Acker"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.633203, 51.889883],
              [7.630502, 51.890202],
              [7.630459, 51.889619],
              [7.631789, 51.889222],
              [7.633549, 51.889089],
              [7.634579, 51.88954],
              [7.633203, 51.889883]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "5",
          "name": "Acker"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.624149, 51.888718],
              [7.624192, 51.887314],
              [7.626338, 51.887314],
              [7.626896, 51.888692],
              [7.624149, 51.888718]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "6",
          "name": "Acker"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.650891, 51.881273],
              [7.649644, 51.880771],
              [7.650717, 51.879764],
              [7.651919, 51.880321],
              [7.650891, 51.881273]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "7",
          "name": "Gebäude"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.64694, 51.897091],
              [7.648743, 51.896826],
              [7.650975, 51.896455],
              [7.654237, 51.897038],
              [7.653894, 51.899051],
              [7.650074, 51.898521],
              [7.64694, 51.897091]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "8",
          "name": "Gebäude"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.631659, 51.903501],
              [7.62917, 51.902676],
              [7.629428, 51.901193],
              [7.632518, 51.901802],
              [7.631659, 51.903501]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "9",
          "name": "Gebäude"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.629084, 51.89412],
              [7.624234, 51.893749],
              [7.624749, 51.89171],
              [7.629471, 51.891974],
              [7.629084, 51.89412]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "10",
          "name": "Pflanzen"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.656041, 51.884],
              [7.655097, 51.881218],
              [7.663639, 51.880608],
              [7.663811, 51.88347],
              [7.656041, 51.884]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "11",
          "name": "Pflanzen"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.6296, 51.884132],
              [7.626638, 51.884291],
              [7.623719, 51.883443],
              [7.624534, 51.881986],
              [7.630115, 51.882596],
              [7.6296, 51.884132]
            ]
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "classID": "12",
          "name": "Pflanzen"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [7.665184, 51.892743],
              [7.667674, 51.893061],
              [7.66746, 51.89571],
              [7.662867, 51.894862],
              [7.665184, 51.892743]
            ]
          ]
        }
      }
    ]
  }
  const DEMO_resolutionInput = "30"

  let DEMODATAJSON = {
    "AOI": DEMO_AOICOORD,
    "AOT": DEMO_AOTCOORD,
    "StartDate": DEMO_NewStartDate,
    "Enddate": DEMO_endDate,
    "algorithm": DEMO_algorithem,
    "trainigsdata": DEMO_allDrawnFeatures,
    "resolution": DEMO_resolutionInput
  };
  console.log(DEMODATAJSON);
  //HIER PROZESSAUFRUF
  send_backend_json(DEMODATAJSON)
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
    drawnFeatures.removeLayer(previousRectangle)
    delete_data()
    previousRectangle = null
    rectangleCoordinates = null
  }
}

// create easyButtons for the menu-functions
// Button Sentinel-2 Data -----------------------------
var button1 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/sentinal_icon.png" style="width: 20px; height: 20px;">', sentinel2, 'Sentinal-2');

// Button Trainigsdata -----------------------------
var button2 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/trainigsdaten_icon.png" style="width: 20px; height: 20px;">', trainingData, 'Trainigsdaten');
button2.disable(); // by default the button is disabled
/**
 * Function checkConditionButton2
 * only active when variable trainigBooelan = true
 */
function checkConditionButton2() {
  if (sentinelBooelan === true) {
    button2.enable();
  } else {
    button2.disable();
  }
}

// Button algorithem -----------------------------
var button3 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/algorithmus_icon.png" style="width: 20px; height: 20px;">', algorithm, 'Algorithmus');
button3.disable(); // by default the button is disabled
/**
 * Function checkConditionButton3
 * only active when variable trainigBooelan = true
 */
function checkConditionButton3() {
  if (trainigBooelan === true) {
    button3.enable();
  } else {
    button3.disable();
  }
}

// Button area of intrest -----------------------------
var button4 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/aoi_icon.png" style="width: 20px; height: 20px;">', function () {
  areaOfIntrest()
  remove_satalite_layer()
}, 'AOI');
button4.disable(); // by default the button is disabled
/**
 * Function checkConditionButton4
 * only active when variable trainigBooelan = true and algoBoolean = true
 */
function checkConditionButton4() {
  if (trainigBooelan === true && algoBoolean === true) {
    button4.enable();
  } else {
    button4.disable();
  }
}

// Button modeltrainig -----------------------------
var button5 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/modeltraining_icon.png" style="width: 20px; height: 20px;">', modelTraining
  , 'Modeltraining');
button5.disable(); // by default the button is disabled
/**
 * Function checkConditionButton4
 * only active when variable trainigBooelan = truen, algoBoolean = true and aoiBoolean = true and a rectangle has been drawn
 */
function checkConditionButton5() {
  if (trainigBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates) {
    button5.enable();
  } else {
    button5.disable();
  }
}

// Button classification -----------------------------
var button6 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/klassifikation_icon.png" style="width: 20px; height: 20px;">', classification, 'Klassifikation');
button6.disable(); // by default the button is disabled
/**
 * Function checkConditionButton4
 * only active when variable trainigBooelan = truen, algoBoolean = true, aoiBoolean = true and modelBoolean = true and a rectangle has been drawn
 */
function checkConditionButton6() {
  if (trainigBooelan === true && algoBoolean === true && aoiBoolean === true && modelBoolean === true && rectangleCoordinates) {
    button6.enable();
  } else {
    button6.disable();
  }
}


// create the main toggle menu
var toggleMenuButton = L.easyButton({
  position: 'topright',
  states: [{
    stateName: 'closed',
    icon: '<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/menu_icon.png" style="width: 20px; height: 20px;">',
    title: 'Öffne Menü',
    onClick: function (btn, map) {
      btn.state('open');
      button1.addTo(map).setPosition('topright');
      button2.addTo(map).setPosition('topright');
      button3.addTo(map).setPosition('topright');
      button4.addTo(map).setPosition('topright');
      button5.addTo(map).setPosition('topright');
      button6.addTo(map).setPosition('topright');
    }
  }, {
    stateName: 'open',
    icon: '<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/menu_icon.png" style="width: 20px; height: 20px;">',
    title: 'Schließe Menü',
    onClick: function (btn, map) {
      btn.state('closed');
      button1.remove();
      button2.remove();
      button3.remove();
      button4.remove();
      button5.remove();
      button6.remove()
    }
  }]
});

// add toggle menu to leaflet-map
toggleMenuButton.addTo(map);

/**
 * **********************************************************************************
 */
 var duplicate_key = {}

/**
 * Function create_key
 * Generiert einen eindeutigen Schlüssel für ein gegebenes Feature. 
 * Die Funktion bekommt ein feature-Objekt und wandelt dieses, aufgrund der Geometrie und der Eigenschaft, in ein JSON-String um und fügt sie zusammen. 
 * Diese Kombination dient als eindeutiger Schlüssel und wird später eingesetzt, um doppelte Polygone zu verhindern. 
 * @param {*} feature 
 * @returns {String} Einen einzigartigen Schlüssel für das gegebene Feature
 */
function create_key(feature){
  return JSON.stringify(feature.geometry) + JSON.stringify(feature.properties)
}

/**
 * Function addFeature
 * Fügt ein Feature zu Sammlung hinzu, wenn es noch nicht vorhanden ist 
 * Verwendet 'create_key', um Duplikate zu vermeiden
 * @param {*} feature 
 */
function addFeature(feature) {
  var key = create_key(feature)
  if (!duplicate_key[key]) {
    // Kopie des Features erstellen. Damit die features classID und Name nicht doppelt erscheinen
    var featureCopy = JSON.parse(JSON.stringify(feature));
    allDrawnFeatures.features.push(featureCopy);
    //allDrawnFeatures.features.push(feature);
    duplicate_key[key] = true;
  }
}


/**
 * Function polygonToGeoJSON
 * Diese Funktion, fügt ein Polygon als GeoJSON-Objekt hinzu
 * @param {*} newFeature Das GeoJSON-Objekt, was hinzugeügt werden soll
 */
function polygonToGeoJSON(newFeature) {
  addFeature(newFeature)
}

/**
 * Function merge_choice
 * @param {*} onConfirm
 * @param {*} onCancel
 */
function merge_choice(onConfirm, onCancel) {
  var userChoice = confirm("Möchten Sie die hochgeladene GeoJSON-Datei mit den vorhandenen Daten zusammenführen?");
  if (userChoice) {
    onConfirm();
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
 * Diese asynchrone Funktion ermöglicht das hochladen von GeoJSON oder Geopackage-Datein. Zudem werden dann die enthaltenen Polygone auf der Karte abgebildet
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
  // Datentyp filtern 
  const fileType = file.name.split('.').pop().toLowerCase();

  if (fileType === 'json' || fileType === 'geojson') {
    const reader = new FileReader();
    reader.onload = async function (event) {
      console.log('GeoJSON Datei wurde erfolgreich geladen');
      const data_geojson = JSON.parse(event.target.result);
      if (rectangleCoordinates) {
        const filteredFeatures = data_geojson.features.filter(feature =>
          isUploadinRectangle(feature, rectangleCoordinates)
        );
        data_geojson.features = filteredFeatures;
      } else {
        console.log('Bitte Rechteck einzeichnen, um die Trainingsdaten hochzuladen!')
      }
      merge_choice(
        //Wenn man auf Ok drückt
        () => {
          addToMap(data_geojson) // GeoJSON zur Leaflet-Karte hinzufügen
          console.log('GeoJSON Daten zur Karte hinzugefügt');
          // Aktualisiere drawPolygone und die Zeichenkontrollen
          drawPolygone = true;
          localStorage.setItem('drawPolygone', 'true');
          update_drawing();
        },
        //Wenn man abbricht
        () => {
          L.geoJSON(data_geojson).addTo(map)
          console.log('GeoJSON', data_geojson)
        }
      )
    };
    reader.readAsText(file);
  }
  else if (fileType === 'gpkg') {
    console.log('GeoPackage Datei auswählen');
    const formData = new FormData()
    formData.append('file', file)

    fetch('/upload', {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        console.log(data)
        const layers = data.data
        for (layer in layers) {
          const geojson_data = layers[layer]
          if (geojson_data.type === 'FeatureCollection') {
            let filter = geojson_data.features
            if (rectangleCoordinates) {
              filter = geojson_data.features.filter(feature =>
                isUploadinRectangle(feature, rectangleCoordinates)
              )
            }
            geojson_data.features = filter
            addToMap(geojson_data)
          } else {
            console.error('Kein gültiges Format!')
          }
        }
      })
      .catch(error => {
        console.error('Fehler', error)
      })
  } else {
    alert('Nicht unterstütztes Dateiformat. Bitte laden Sie eine GeoJSON- oder GeoPackage-Datei hoch.');
  }
}

/**
 * Function addToMap
 * Fügt die Daten zur leaflet-Karte hinzu
 * @param {*} data GeoJSON-data die zur Karte hinzugefügt werden soll
 */
function addToMap(data) {
  if (data.type === 'FeatureCollection') {
    // Einzelnes GeoJSON-Objekt
    L.geoJSON(data, {
      onEachFeature: function (feature, layer) {
        addFeature(feature);
        drawnFeatures.addLayer(layer);
      }
    }).addTo(map);
  } else if (typeof data === 'object') {
    // Sammlung von GeoJSON-Objekten
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
 * Verarbeitet GeoJSON-Daten. Es wird differenziert zwischen Feature und FeatureCollection, aber sendet jedes Feature einzeln
 * @param {*} geojsonData 
 * @returns 
 */
function node_polygon(geojsonData) {
  // Wenn ein einzelnes Feature übergeben wird, füge es zu allDrawnFeatures hinzu
  if (geojsonData.type === 'Feature') {
    addFeature(geojsonData);
  }
  // Wenn eine FeatureCollection übergeben wird, füge jedes Feature einzeln hinzu
  else if (geojsonData.type === 'FeatureCollection') {
    geojsonData.features.forEach(addFeature)
  }
}

/**
 * Function node_rectangle
 * @param {*} area_of_Training 
 */
function node_rectangle(area_of_Training) {
  console.log("allRectangle vor dem Push:", allRectangle);
  console.log("area_of_Training:", area_of_Training);
  allRectangle.features.push(area_of_Training)
  //area_of_Training_save(area_of_Training)
  // Setzen der rectangle_Boundes auf die Grenzen des neuen Rechtecks
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

//Funktion muss behalten werden, nur geändert
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
  //behalten
  allDrawnFeatures = { "type": "FeatrueCollection", "features": [] };
  //behalten
  allRectangle = { "type": "Featurecollection", "features": [] };
  drawnFeatures.clearLayers()
  rectangleCoordinates = null
}

//Download data_geojson.json als ZIP-Datei 
/**
 * Function addPopup
 * @param {*} layer 
 */
function addPopup(layer) {
  var popupContent = '<button onclick="download_data()">Download</button>'
  layer.bindPopup(popupContent);
}

/**
 * function download_data(){
  window.open('http://localhost:8081/download', '_blank')
}
 */

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



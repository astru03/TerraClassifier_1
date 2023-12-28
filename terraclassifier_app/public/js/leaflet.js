
// create a variable for the map
var map = L.map('map').setView([51.975, 7.61], 12);

// add the base map
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Add Leaflet.draw-Plugin
// Layer on which the User can draw a shape
var drawnFeatures = new L.FeatureGroup();
map.addLayer(drawnFeatures);


// Adding a Leaflet.Draw Toolbar
   var drawControl = new L.Control.Draw( {
    edit: {featureGroup: drawnFeatures, 
      remove: true},
    // Only rectangle draw function is needed
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
 * Function to style the rectangles
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

var rectangleCoordinates = null;  // Variable definition
var previousRectangle = null; // Variable definition
let AOICOORD;
let classID;
let objectName;
// Event-Handler for drawing polygons
map.on("draw:created", function(event) {
  var layer = event.layer;
  var type = event.layerType;
  var newFeature = event.layer.toGeoJSON();
  setStyle(layer, event.layerType)

  if (type === 'rectangle') {
    if (previousRectangle !== null) { // If a rectangle has already been drawn, the old one will be deleted
      drawnFeatures.removeLayer(previousRectangle);
    }
    // rectangleCoordinates = layer.getBounds().toBBoxString(); // only important if a string is required for the coordinates
    rectangleCoordinates = layer.getBounds();
    checkConditionButton5(); // Check Condition to activate easybutton 5 (modeltraining)
    //console.log(rectangleCoordinates)
    
    // Only when everything is trainigBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates --> Then save AOI in AOICOORD for the JSON that is sent to R
    if (trainigBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates) {
      AOICOORD = rectangleCoordinates;
    // Only when everything is trainigBooelan === true && drawDataChoiceBoolean === true && rectangleCoordinates --> Then save AOI in AOTCOORD for the JSON that is sent to R
    // for drawing in training data yourself
    } else if (trainigBooelan === true && drawDataChoiceBoolean === true && rectangleCoordinates) {
      AOTCOORD = rectangleCoordinates;
    }

    console.log('Koordinaten: ', newFeature);
    node_rectangle(newFeature)
    drawnFeatures.addLayer(layer);
    previousRectangle = layer;
  } else if(type === 'polygon') {
    if(rectangleCoordinates && rectangleCoordinates.contains(layer.getBounds())){
      $('#popup_EnterObjektID').modal('show');
      $('#saveObjektID').on('click', function() { 
        classID = document.getElementById('objectIdInput').value;
        console.log(classID);
        $('#popup_EnterObjektID').modal('hide');
        $('#popup_ObjectName').modal('show');
        $('#saveObjektName').on('click', function() {
          objectName = document.getElementById('objectNameInput').value;
          console.log(objectName);
          $('#popup_ObjectName').modal('hide');

            // Add the data to the feature
            newFeature.properties = {
            classID: classID,
            name: objectName
            };
            
            console.log(newFeature);
            polygonToGeoJSON(newFeature);
            node_polygon(newFeature);
            drawnFeatures.addLayer(layer);
            addPopup(layer)
            checkConditionButton3(); // Check Condition to activate easybutton 3 (algorithm)
        })
        
      })
      //var classID = prompt('Bitte für das Polygon die passende ObjektID eingeben!')
      //console.log(classID);
      //var name = prompt('Bitte für das Polygon den passenden Namen eingeben!')
      //classID = parseInt(classID);
        //if(isNaN(classID)){
        //alert('ObjektID muss eine Ganzzahl sein!')
        //classID=undefined;
    //}
      
    } else {
      $('#popup_NotInAOT').modal('show');
    }
  }
})


// Event-Handler for editing rectangle
map.on("draw:edited", function(event) {
  var layers = event.layers;
  layers.eachLayer(function (layer) {
    if (layer instanceof L.Rectangle) {
      //rectangleCoordinates = layer.getBounds().toBBoxString(); // only important if a string is required for the coordinates
      rectangleCoordinates = layer.getBounds();
    }
  });
})

// Deleting the training data
map.on(L.Draw.Event.DELETED, function(event) {
  var deleteAll = confirm('Möchten sie wirklich die Trainingsdaten und Area of Training löschen?')
  if(deleteAll) {
    delete_data()
    drawPolygone = false
    localStorage.setItem('drawPolygone', 'false');
    update_drawing()
    location.reload()
  }
})

// show the scale bar on the lower left corner
L.control.scale({imperial: true, metric: true}).addTo(map);

//----------------------------------------------------------------------------------------------
// Functions for the actions of the menu


// globale Variablen speichern, Polygone
var allDrawnFeatures = {
  "type": "FeatureCollection",
  "features": []
};


/**
 * Function to obtain the Sentinel-2 satellite images
 * @param {*} coordinates
 */
var datum;

function satelliteImages(coordinates) {
  let NorthEastCoordinates = coordinates.getNorthEast().lng + ', ' + coordinates.getNorthEast().lat;
  let SouthwestCoordinates = coordinates.getSouthWest().lng + ', ' + coordinates.getSouthWest().lat;
  document.getElementById('northeastCoordinates').value = NorthEastCoordinates;
  document.getElementById('southwestCoordinates').value = SouthwestCoordinates;
  $('#popup_sat').modal('show');
  
  // Date selection
  $(document).ready(function() {
    var selectedDate = null; // Variable to store the selected date
    $('#fromDate').datepicker({
        autoclose: true,
        format: 'dd/mm/yyyy',
        todayHighlight: true,
        endDate: '+0d' // Set the end date limit to today
    }).on('changeDate', function(selected) {
        selectedDate = selected.date;
    });

    $('#saveChangesBtn').on('click', function() {
      let cloudCoverInput = document.getElementById('cloudCoverInput').value; // Taking cloud cover into account
      if (cloudCoverInput === ''){
        cloudCoverInput = null;
      } else if (cloudCoverInput > 100 || cloudCoverInput < 0) {
        cloudCoverInput = 'overHundred';
      }
      
      let selectedDateNull = document.getElementById('fromDate').value; // Taking the date into account
      if (selectedDateNull === '' ){
        selectedDate = null;
      } else {
        selectedDate = document.getElementById('fromDate').value;
      }
      if(selectedDate !== null && cloudCoverInput !== null && cloudCoverInput !== 'overHundred') {
          let dateParts = selectedDate.split('/');
          let day = parseInt(dateParts[0], 10); // Day of the selected date
          let month = parseInt(dateParts[1], 10); // Month of the selected date
          let year = parseInt(dateParts[2], 10); // Year of the selected date
          datum = day +"."+ month + "." + year
          let cloudCoverInput = document.getElementById('cloudCoverInput').value;
          // The function passes the values ​​to the backend, which fetches the satellite images from AWS and returns the ImageURL and the imageBound
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
 * Function sends the information to the backend that the sentinel-2 images fetches
 * @param {*} datum
 * @param {*} NorthEastCoordinates
 * @param {*} SouthwestCoordinates
 * @param {*} cloudCoverInput
 */
let sentinelBooelan;
async function getSatelliteImages(datum, NorthEastCoordinates, SouthwestCoordinates, cloudCoverInput) {
  let URLlist = [];  // The URL list is always emptied when the satellite images are to be fetched again
  try {
    const response = await fetch('http://localhost:8080/satellite', {  // Calling the backend
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Date: datum,
          NEC: NorthEastCoordinates,
          SWC: SouthwestCoordinates,
          CCI: cloudCoverInput})
      }) 
      // If response is not returned properly, returns errors
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Interpret the microservice's response in the frontend. Return value of the backend
      const data = await response.json();
      if (Object.keys(data).length >= 1 ) { // If more than objects were found, then the id and the url are written into one object URLlist
        for (var index = 0; index < Object.keys(data).length; index ++) {
          var key = 'item_' + index;
          if(data.hasOwnProperty(key)) {
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
      // The selected ID from the selection list where the satellite images can be selected
      let selectionContent = $('#objectSelect');
      selectionContent.empty(); // Empty the contents of the modal body

      if (URLlist.length === 0) {
        $('#popup_select_sat').modal('hide');
        $('#popup_NoData').modal('show');
      } else {
        // Creates the selection list in the pop-up window where the satellite images can be selected
        URLlist.forEach(function (item) {
          selectionContent.append($('<option>', {
            text: item.ID
          }));
        });
        $('#popup_select_sat').modal('show'); // Open the pop-up window with the satellite image selection list

        // when a satellite image has been selected and confirmed with the “ok” button
        $('#confirmSelectionBtn').on('click', function() {
          reset_AOI()  // When Button confirmSelectionBtn is pressed, the previously drawn rectangle is removed from the leaflet map
          let selectedID = $('#objectSelect').val();
          // Show the geotiff in the leaflet map
          for (var i = 0; i < URLlist.length; i++){
            if (selectedID === URLlist[i].ID) {
              let geoTiffURL = URLlist[i].URL;

              // Load GeoTIFF from STAC API with georaster_layer_for_leaflet
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
              }); 

              // Old call to load the thumbnails (satellite images with very low resolution and as jpg) into the leaflet map
              //let leafletImageBounds = URLlist[i].IB.map(coordinates => {return coordinates.map(coord => [coord[1], coord[0]])});
              //console.log(leafletImageBounds);
              //let imageOverlay = L.imageOverlay(URLlist[i].URL, leafletImageBounds);
              //imageOverlay.addTo(map);
            }
          }
          sentinelBooelan = true;
          checkConditionButton2();
          $('#popup_select_sat').modal('hide'); // Close the selection list popup after confirmation
        });         
      }
  } catch (error) {
    console.error('Es gab einen Fehler:', error);
  }
  $('#popup_sat').modal('hide');
}


var drawPolygone
//console.log(drawPolygone)

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
  
  if(value === null){
    drawPolygone = false
    localStorage.setItem('drawPolygone', 'false')
    console.log('Erster Besuch der Seite', drawPolygone)
  }else{
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
      edit: { featureGroup: drawnFeatures, remove: true}, 
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

let AOTCOORD;
let drawDataChoiceBoolean;
$(document).ready(function(){
  $('#uploadFileChoice').click(function(){
    
    if(rectangleCoordinates) {
      trainigBooelan = true;
      $('#popup_TrainingDataChoice').modal('hide')
      document.getElementById('fileInput').click()
      checkConditionButton3(); // Check Condition to activate easybutton 3 (algorithm)
      // Only when everything is trainigBooelan === true && rectangleCoordinates --> Then save AOI in AOTCOORD for the JSON that is sent to R
      // If the training data should be uploaded
      if (trainigBooelan === true && rectangleCoordinates) {
        AOTCOORD = rectangleCoordinates;
      }
    } else {
      console.log("Es wurde kein Rechteck gezeichnet!");
      $('#popup_TrainingDataChoice').modal('hide')
      $('#popup_NoRectangleForAOT').modal('show')
    }
  })
  $('#drawDataChoice').click(function(){
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
  if(rectangleCoordinates) {
    satelliteImages(rectangleCoordinates)
  } else {
    showPopupNoRectangle();
  }
}

function trainingData() {
  $('#popup_TrainingDataChoice').modal('show');
  //fileInput.click()
  //document.getElementById('fileInput').click();
  //document.getElementById('fileInput').addEventListener('change', handleFileUpload);
  //fileInput.click()
}

/**
 * Function algorithm from easyButton3
 */
let algorithem;
function algorithm() {
    $('#popup_algo').modal('show');
    $('#confirmSelectionAlg').on('click', function() {
      var algorithmMD = document.getElementById('algorithm1').checked;
      var algorithmRF = document.getElementById('algorithm2').checked;
      if ((algorithmMD && algorithmRF) || (!algorithmMD && !algorithmRF)) {  // If neither or both algorithms are selected
        $('#popup_NoAlgorithm').modal('show');
      } else {
        if (algorithmMD) {
          algorithem = 'MD';
        } else {
          algorithem = 'RF';
        }
        algoBoolean = true;
        checkConditionButton4() // Check Condition to activate easybutton 4 (areaOfIntrest)
        $('#popup_algo').modal('hide');
    }})
}

/**
 * Function areaOfIntrest from easyButton4
 */
function areaOfIntrest() {
  reset_AOI()
  drawPolygone = false
  localStorage.setItem('drawPolygone', 'false') 
  update_drawing()
  aoiBoolean = true
}

/**
 * Function modelTraining from easyButton5
 */
function modelTraining() {
  if(trainigBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates) {
    modelBoolean = true;
    checkConditionButton6(); // Check Condition to activate easybutton 6 (classification)
  } else {
    console.log("Es müssen zuerst Trainigsdaten erstellt, ein Algorithmus ausgewählt und ein AOI gezeichnet werden");
  }
  //End date
  let dateParts = datum.split('.') // Splitting the old date format
  let newDate = new Date(dateParts[2],dateParts[1] - 1, dateParts[0]); // Be careful months start at 0. So Janua = 0 therefore -1 for month
  let year = newDate.getFullYear();
  let month = String(newDate.getMonth() + 1).padStart(2, '0'); // Add leading zeros for month
  let day = String(newDate.getDate()).padStart(2, '0'); // Add leading zeros for tag
  let NewStartDate = `${year}-${month}-${day}`;

  let startDate = new Date(NewStartDate); // The format “2023-12-03T00:00:00.000Z” comes out here
  startDate.setDate(startDate.getDate() + 14); // to the selected date will add 14 days to the start date
  let endDate = startDate.toISOString().split('T')[0]; // Format so that only the format YYYY-MM-DD is available
  
  let DATAJSON = {
    "AOI": AOICOORD,
    "AOT": AOTCOORD,
    "StartDate": NewStartDate,
    "Enddate": endDate,
    "algorithm": algorithem,
    "trainigsdata": allDrawnFeatures
  };
  console.log(DATAJSON);
}

/**
 * Function classification from easyButton6
 */
function classification() {
  alert('Option 6 wurde geklickt!');
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
  }  else if (ID_Popup == 'popup_NoRectangleForAOT') {
    $('#popup_NoRectangleForAOT').modal('hide');
  } else if (ID_Popup == 'popup_NoAlgorithm') {
    $('#popup_NoAlgorithm').modal('hide');
  } else if (ID_Popup == 'popup_TrainingDataChoice') {
    $('#popup_TrainingDataChoice').modal('hide');
  } else if (ID_Popup == 'popup_EnterObjektID') {
    $('#popup_EnterObjektID').modal('hide');
  }  else if (ID_Popup == 'popup_ObjectName') {
    $('#popup_ObjectName').modal('hide');
  } else if (ID_Popup == 'popup_NotInAOT') {
    $('#popup_NotInAOT').modal('hide');
  } else if (ID_Popup == 'popup_select_sat') {
    $('#popup_select_sat').modal('hide');
    URLlist = []; //The URLlist is emptied when the popup window is closed using cancel ("Abbrechen")
    $('#popup_sat').modal('show');
  }
}

/**
 * Function to showPopupNoRectangle
 */
function showPopupNoRectangle() {
  $('#popup_NoRectangle').modal('show');
}

//function firstSelectRectangle() {
//  var popup = document.getElementById('popup_NoRectangle');
//  popup.style.display = 'none';
//}

/**
 * Function to reset_AOI
 */
function reset_AOI(){
  if(previousRectangle) {
    drawnFeatures.removeLayer(previousRectangle)
    delete_data()
    previousRectangle = null
    rectangleCoordinates = null
  }
}

// Create EasyButtons for the menu-functions
let trainigBooelan = false;
let algoBoolean = false;
let aoiBoolean = false;
let modelBoolean = false;

// Button Sentinel-2 Data -----------------------------
var button1 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/sentinal_icon.png" style="width: 20px; height: 20px;">', sentinel2, 'Sentinal-2');

// Button Trainigsdata -----------------------------
var button2 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/trainigsdaten_icon.png" style="width: 20px; height: 20px;">', trainingData, 'Trainigsdaten');
button2.disable(); // By default the button is disabled
/**
 * Function checkConditionButton2
 * Only active when variable trainigBooelan = true
 */
function checkConditionButton2() {
  if(sentinelBooelan === true) {
    button2.enable();
  } else {
    button2.disable();
  }
}
//function(){
//$('#popup_TrainingDataChoice').modal('show');
//}, 'Trainigsdaten');

// Button algorithem -----------------------------
var button3 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/algorithmus_icon.png" style="width: 20px; height: 20px;">', algorithm, 'Algorithmus');
button3.disable(); // By default the button is disabled
/**
 * Function checkConditionButton3
 * Only active when variable trainigBooelan = true
 */
function checkConditionButton3() {
  if(trainigBooelan === true) {
    button3.enable();
  } else {
    button3.disable();
  }
}

// Button area of intrest -----------------------------
var button4 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/aoi_icon.png" style="width: 20px; height: 20px;">', areaOfIntrest, 'AOI');
button4.disable(); // By default the button is disabled
/**
 * Function checkConditionButton4
 * Only active when variable trainigBooelan = true and algoBoolean = true
 */
function checkConditionButton4() {
  if(trainigBooelan === true && algoBoolean === true) {
    button4.enable();
  } else {
    button4.disable();
  }
}

// Button modeltrainig -----------------------------
var button5 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/modeltraining_icon.png" style="width: 20px; height: 20px;">', modelTraining, 'Modeltraining');
button5.disable(); // By default the button is disabled
/**
 * Function checkConditionButton4
 * Only active when variable trainigBooelan = truen, algoBoolean = true and aoiBoolean = true and a rectangle has been drawn
 */
function checkConditionButton5() {
  if(trainigBooelan === true && algoBoolean === true && aoiBoolean === true && rectangleCoordinates) {
    button5.enable();
  } else {
    button5.disable();
  }
}

// Button classification -----------------------------
var button6 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier_1/main/TerraClassifier_app/public/images/klassifikation_icon.png" style="width: 20px; height: 20px;">', classification, 'Klassifikation');
button6.disable(); // By default the button is disabled
/**
 * Function checkConditionButton4
 * Only active when variable trainigBooelan = truen, algoBoolean = true, aoiBoolean = true and modelBoolean = true and a rectangle has been drawn
 */
function checkConditionButton6() {
  if(trainigBooelan === true && algoBoolean === true && aoiBoolean === true && modelBoolean === true && rectangleCoordinates) {
    button6.enable();
  } else {
    button6.disable();
  }
}


// Create the main toggle menu
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




var allRectangle = {
  "type": "FeatureCollection", 
  "features": []
};



//
var duplicate_key = {}

/**
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
 * Fügt ein Feature zu Sammlung hinzu, wenn es noch nicht vorhanden ist 
 * Verwendet 'create_key', um Duplikate zu vermeiden
 * @param {*} feature 
 */
function addFeature(feature){
  var key = create_key(feature)
  if(!duplicate_key[key]){
    allDrawnFeatures.features.push(feature);
    duplicate_key[key] = true;
  }
}


/**
 * Diese Funktion, fügt ein Polygon als GeoJSON-Objekt hinzu
 * @param {*} newFeature Das GeoJSON-Objekt, was hinzugeügt werden soll
 */
function polygonToGeoJSON(newFeature) {
  addFeature(newFeature)
}

function merge_choice(onConfirm, onCancel) {
  var userChoice = confirm("Möchten Sie die hochgeladene GeoJSON-Datei mit den vorhandenen Daten zusammenführen?");
  if (userChoice) {
    onConfirm();
  } else {
    onCancel();
  }
}



function isUploadinRectangle(feature, rectangleCoordinates){
  const bounds = L.geoJSON(feature).getBounds();
  return rectangleCoordinates.contains(bounds)
}



/**
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
    reader.onload = async function(event) {
      console.log('GeoJSON Datei wurde erfolgreich geladen');
      const data_geojson = JSON.parse(event.target.result);
      
      if (rectangleCoordinates) {
        const filteredFeatures = data_geojson.features.filter(feature => 
          isUploadinRectangle(feature, rectangleCoordinates)
        );
        data_geojson.features = filteredFeatures;
      }else{
        console.log('Bitte Rechteck einzeichnen, um die Trainingsdaten hochzuladen!')
      }


      merge_choice(
        //Wenn man auf Ok drückt
         () => {
          addToMap(data_geojson) // GeoJSON zur Leaflet-Karte hinzufügen
          node_polygon(data_geojson)
          console.log('GeoJSON Daten zur Karte hinzugefügt');
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

    fetch('http://localhost:8080/upload' , {
      method : 'POST' , 
      body : formData ,

    })
    .then(response => response.json())
    .then(data => {
      console.log(data)
      const layers = data.data 
      for(layer in layers){
        const geojson_data = layers[layer]
        if(geojson_data.type === 'FeatureCollection'){
          let filter = geojson_data.features
          if(rectangleCoordinates){
            filter = geojson_data.features.filter(feature => 
              isUploadinRectangle(feature, rectangleCoordinates)
          )
          }
          geojson_data.features = filter
          node_polygon(geojson_data)
          addToMap(geojson_data)
        }else{
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
 * Fügt die Daten zur leaflet-Karte hinzu
 * @param {*} data GeoJSON-data die zur Karte hinzugefügt werden soll
 */
function addToMap(data) {
  if (data.type === 'FeatureCollection') {
      // Einzelnes GeoJSON-Objekt
      L.geoJSON(data, {
          onEachFeature: function(feature, layer) {
              addFeature(feature);
              drawnFeatures.addLayer(layer);
          }
      }).addTo(map);
  } else if (typeof data === 'object') {
      // Sammlung von GeoJSON-Objekten
      for (const layerName in data) {
          const layerData = data[layerName];
          L.geoJSON(layerData, {
              onEachFeature: function(feature, layer) {
              }
          }).addTo(map);
      }
  } else {
      console.error('Ungültige Datenstruktur für die Kartenanzeige');
  }
}


/**
 * Verarbeitet GeoJSON-Daten. Es wird differenziert zwischen Feature und FeatureCollection, aber sendet jedes Feature einzeln
 * @param {*} geojsonData 
 * @returns 
 */
function node_polygon(geojsonData) {
  // Wenn geojsonData null oder undefiniert ist, sende allDrawnFeatures
  if (!geojsonData || geojsonData.type === 'rectangle') {
    send_feature(allDrawnFeatures);
    return;
  }

  // Wenn ein einzelnes Feature übergeben wird, füge es zu allDrawnFeatures hinzu
  if (geojsonData.type === 'Feature') {
    addFeature(geojsonData);
  }
  // Wenn eine FeatureCollection übergeben wird, füge jedes Feature einzeln hinzu
  else if (geojsonData.type === 'FeatureCollection') {
    
    geojsonData.features.forEach(addFeature)
  }
  send_feature(allDrawnFeatures);

}

function node_rectangle(area_of_Training){
  console.log("allRectangle vor dem Push:", allRectangle);
  console.log("area_of_Training:", area_of_Training);
  allRectangle.features.push(area_of_Training)
  area_of_Training_save(area_of_Training)

  // Setzen der rectangle_Boundes auf die Grenzen des neuen Rechtecks
  rectangleCoordinates = L.geoJSON(area_of_Training).getBounds();
}

/**
 * Diese Funktion verwenden wir, um unsere Daten zu dem Server zu senden
 * Verwendet 'fetch' für http-POST-Anfragen 
 * @param {*} features Die Datei, welche zu dem Server gesendet werden soll
 */
function send_feature(features) {
  fetch('http://localhost:8080/geojson-save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(features)
  })
  .then(response => response.json())
  .then(data => {console.log("Serverantwort:", JSON.stringify(allDrawnFeatures)) 
    update_drawing()
})
  .catch(error => console.error('Fehler beim Senden der Daten:', error))
}
console.log(allDrawnFeatures);

function area_of_Training_save(features){
  fetch('http://localhost:8080/area_of_Training', {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
    }, 
    body : JSON.stringify(features)
    
  })
  .then(response => response.json())
  .then(data => console.log('Serverantwort', data))
  .catch(error => console.error('Fehler beim Senden des Area of Training', error))
}


function load_area_of_Training() {
  fetch('http://localhost:8080/get_area_of_Training')
    .then(response => response.json())
    .then(data => {
      console.log(data);
    })
    .catch(error => console.error('Fehler beim Laden der Area of Training Daten:', error));
}


/**
 * Diese Funktion lädt unsere GeoJSON-Daten vom Server und fügt sie der Karte hinzu
 */
function load_data() {
  fetch('http://localhost:8080/get-geojson')
      .then(response => response.json())
      .then(data => {
          console.log('Geladene allDrawnFeatures vom Server:', JSON.stringify(allDrawnFeatures));  
      })
      .catch(error => console.error('Fehler beim Laden der GeoJSON-Daten:', error));
}

async function status_server(){
  
    return fetch('http://localhost:8080/status')
      .then(response => {
        if(!response.ok){
          console.log('Server-Fehler')
        }
        return response.json()})
        .then(data => data.status === 'ready')
        .catch(error => {console.error('Status konnte nicht abgerufen werden', error);return false})
       
}

async function check_map()
{
  if(await status_server()){
    load_data()
    load_area_of_Training()
  }else{
    console.log('Server ist noch nicht bereit!')
    location.reload()

  }
}





/**
 * Diese Funktion löscht die Trainingsdaten vom Server
 */
function delete_data(deleteAll){
  fetch('http://localhost:8080/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({deleteAll: true}) 
  })
  .then(response => response.json())
  .then(data => {
    allDrawnFeatures = {"type": "FeatrueCollection", "features": []};
    allRectangle = {"type": "Featurecollection", "features": []};
    drawnFeatures.clearLayers()
    rectangleCoordinates = null
  })
  .catch(error => console.error('Fehler beim löschen', error))
}

//Download data_geojson.json als ZIP-Datei 
function addPopup(layer){
  var popupContent = '<button onclick="download_data()">Download</button>'
  layer.bindPopup(popupContent);
}

function download_data(){
  window.open('http://localhost:8080/download', '_blank')

}



function reset_Server(){
  fetch('http://localhost:8080/reset-data', {
    method: 'POST'
  })
  .then(data => {
    console.log('data', data)
  })
  .catch(error => {
    console.error('Fehler', error)
  })
}



document.addEventListener('DOMContentLoaded', function(){
  //initial_drawing()
  reset_Server
  initial_drawing()
  check_map()
});

window.addEventListener('beforeunload', function (e) {
  localStorage.setItem('drawPolygone', 'false');

  
});



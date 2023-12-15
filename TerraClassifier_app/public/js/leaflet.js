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
    edit: {featureGroup: drawnFeatures},
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

var rectangleCoordinates = null;
var previousRectangle = null;
// Event-Handler for drawing polygons
map.on("draw:created", function(event){
  var layer = event.layer;
  var type = event.layerType;
  if (type == 'rectangle') {
    if (previousRectangle !== null) { // If a rectangle has already been drawn, the old one will be deleted. There can only ever be one that passes on the coordinates
      drawnFeatures.removeLayer(previousRectangle);
    }
    //rectangleCoordinates = layer.getBounds().toBBoxString();
    rectangleCoordinates = layer.getBounds();
    console.log(rectangleCoordinates)
  }
    drawnFeatures.addLayer(layer);
    previousRectangle = layer;
})


// Event-Handler for editing rectangle
map.on("draw:edited", function(event){
  var layers = event.layers;
  layers.eachLayer(function (layer) {
    if (layer instanceof L.Rectangle) {
      //rectangleCoordinates = layer.getBounds().toBBoxString();
      rectangleCoordinates = layer.getBounds();
    }
  });
});

// Event-Handler for deleting rectangle
map.on("draw:deleted", function(event){
  var layers = event.layers;
  layers.eachLayer(function (layer) {
    if (layer instanceof L.Rectangle) {
      rectangleCoordinates = null;
    }
  });
});

// show the scale bar on the lower left corner
L.control.scale({imperial: true, metric: true}).addTo(map);

//-----------------------------------------------------------------------------------
/**
 * Functionality satelliteImages
 * The coordinates of the rectangle are displayed in the pop-up window
 * A date for "Zeitraum von:" can be entered
 * The degree of cloud cover can be entered
 * @param {*} coordinates
 */
function satelliteImages(coordinates) {
  let NorthEastCoordinates = coordinates.getNorthEast().lng + ', ' + coordinates.getNorthEast().lat;
  let SouthwestCoordinates = coordinates.getSouthWest().lng + ', ' + coordinates.getSouthWest().lat;
  document.getElementById('northeastCoordinates').value = NorthEastCoordinates;
  document.getElementById('southwestCoordinates').value = SouthwestCoordinates;
  $('#popup_sat').modal('show');

  // Date selection
  $(document).ready(function(){
    var selectedDate = null; // Variable to store the selected date
    $('#fromDate').datepicker({
        autoclose: true,
        format: 'dd/mm/yyyy',
        todayHighlight: true,
        endDate: '+0d' // Set the end date limit to today
    }).on('changeDate', function(selected){
        selectedDate = selected.date;
    });

    // Value for the cloud cover
    //let cloudCoverInput = document.getElementById('cloudCoverInput').value;
    //if (cloudCoverInput === '' ){
    //  cloudCoverInput = null;
    //}

    // When the "ok" button is clicked, the coordinates, date and cloud cover are passed to the getSatelliteImages function
    $('#saveChangesBtn').on('click', function() {
        let cloudCoverInput = document.getElementById('cloudCoverInput').value;
        if (cloudCoverInput === ''){
          cloudCoverInput = null;
        } else if (cloudCoverInput > 100 || cloudCoverInput < 0) {
          cloudCoverInput = 'overHundred';
        }
        let selectedDateNull = document.getElementById('fromDate').value;
        console.log(selectedDateNull);
        if (selectedDateNull === '' ){
          selectedDate = null;
        }
        if(selectedDate !== null && cloudCoverInput !== null && cloudCoverInput !== 'overHundred') {
            var day = selectedDate.getDate(); // Day of the selected date
            var month = selectedDate.getMonth() + 1; // Month of the selected date (Months start at 0)
            var year = selectedDate.getFullYear(); // Year of the selected date
            let datum = day +"."+ month + "." + year
            let cloudCoverInput = document.getElementById('cloudCoverInput').value;
            // The function passes the values ​​to the backend, which fetches the satellite images from AWS and returns the ImageURL and the imageBound
            getSatelliteImages(datum, NorthEastCoordinates, SouthwestCoordinates, cloudCoverInput);
          } else if (selectedDate === null) {
            console.log('Please select a date.');
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
 * Functionality getSatelliteImages
 * @param {*} datum
 * @param {*} NorthEastCoordinates
 * @param {*} SouthwestCoordinates
 * @param {*} cloudCoverInput
 */
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
        for (var index = 0; index < Object.keys(data).length; index ++){
          var key = 'item_' + index;
          if(data.hasOwnProperty(key)){
            var item = data[key];
            //console.log('ID', item.id);
            //console.log('URL', item.url);
            //console.log('ImageBound', item.imageBounds);
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
      // Creates the selection list in the pop-up window where the satellite images can be selected
      URLlist.forEach(function (item) {
        selectionContent.append($('<option>', {
          text: item.ID
        }));
      });

      $('#popup_select_sat').modal('show'); // Open the pop-up window with the satellite image selection list

      // when a satellite image has been selected and confirmed with the “ok” button
      $('#confirmSelectionBtn').on('click', function() {
        let selectedID = $('#objectSelect').val();
        console.log(selectedID)
        // Show the geotiff in the leaflet map
        for (var i = 0; i < URLlist.length; i++){
          if (selectedID === URLlist[i].ID) {
            let imageBound = URLlist[i].IB
            let minY = imageBound[0][1][1];
            //console.log(minY);
            let minX = imageBound[0][0][0];
            //console.log(minX);
            let maxY = imageBound[0][3][1];
            //console.log(maxY);
            let maxX = imageBound[0][2][0];
            //console.log(maxX);
            let geoTiffURL = URLlist[i].URL;
            console.log(geoTiffURL)
            let imageBounds = [[minY, minX], [maxY, maxX]];
            console.log(imageBounds);

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
        $('#popup_select_sat').modal('hide'); // Close the selection list popup after confirmation
      }); 

  } catch (error) {
    console.error('Es gab einen Fehler:', error);
  }
  $('#popup_sat').modal('hide');
}




/**
 * Functionality trainingData
 */
function trainingData() {
    alert('Option 2 wurde geklickt!');
}

/**
 * Functionality algorithm
 * Function that opens the pop-up window for selecting the algorithm
 * The selection is saved in variables (MinimumDistanc or RandomForest)
 * If no selection is made or both selections are selected, an error pop-up window will open
 */
function algorithm() {
    $('#popup_algo').modal('show');
    $('#confirmSelectionAlg').on('click', function() {
      var algorithmMD = document.getElementById('algorithm1').checked;
      var algorithmRF = document.getElementById('algorithm2').checked;
      if ((algorithmMD && algorithmRF) || (!algorithmMD && !algorithmRF)) {  //If no selection is made or both selections are selected
        $('#popup_NoAlgorithm').modal('show');
      } else {
        if (algorithmMD) {
          let MinimumDistanc = 'Minimum Distanz';
          console.log(MinimumDistanc);
        } else {
          let RandomForest = 'Random Forest';
          console.log(RandomForest);
        }
      $('#popup_algo').modal('hide');
    }})
}


/**
 * Functionality modelTraining
 */
function modelTraining() {
  alert('Option 4 wurde geklickt!');
}
/**
 * Functionality classification
 */
function classification() {
  alert('Option 5 wurde geklickt!');
}

/**
 * Functionality closePopup
 * Function so that the pop-up windows can be closed using the Cancel ("Abbrechen") button
 * @param {*} ID_Popup
 */
function closePopup(ID_Popup) {
    console.log(ID_Popup);
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
    } else if (ID_Popup == 'popup_CloudCoverNotOver100') {
      $('#popup_CloudCoverNotOver100').modal('hide');
      $('#popup_sat').modal('show');
    } else if (ID_Popup == 'popup_NoAlgorithm') {
      $('#popup_NoAlgorithm').modal('hide');
    } else if (ID_Popup == 'popup_select_sat') {
      $('#popup_select_sat').modal('hide');
      URLlist = []; //The URLlist is emptied when the popup window is closed using cancel ("Abbrechen")
      $('#popup_sat').modal('show');
    }
}

/**
 * Functionality showPopupNoRectangle
 * Opens the popup with the message that no rectangle has been selected.
 */
function showPopupNoRectangle() {
  $('#popup_NoRectangle').modal('show');
}

/**
 * Functionality firstSelectRectangle
 */
/*
function firstSelectRectangle() {
  var popup = document.getElementById('popup_NoRectangle');
  popup.style.display = 'none';
}*/

// Create EasyButtons for the toggle menu
var button1 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/sentinal_icon.png" style="width: 20px; height: 20px;">', function() {
  if(rectangleCoordinates) {
    satelliteImages(rectangleCoordinates) //If coordinates exist, then execute the function
  } else {
    console.log("Es wurde kein Rechteck gezeichnet!");
    showPopupNoRectangle();
  }
}, 'Sentinal-2');
var button2 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/trainigsdaten_icon.png" style="width: 20px; height: 20px;">', trainingData, 'Trainigsdaten');
var button3 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/algorithmus_icon.png" style="width: 20px; height: 20px;">', algorithm, 'Algorithmus');
var button4 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/modeltraining_icon.png" style="width: 20px; height: 20px;">', modelTraining, 'Modeltraining');
var button5 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/klassifikation_icon.png" style="width: 20px; height: 20px;">', classification, 'Klassifikation');
    
// Create the toggle menu buttons
var toggleMenuButton = L.easyButton({
  position: 'topright',
  states: [{
    stateName: 'closed',
    icon: '<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/menu_icon.png" style="width: 20px; height: 20px;">',
    title: 'Öffne Menü',
    onClick: function (btn, map) {
      btn.state('open');
      button1.addTo(map).setPosition('topright');
      button2.addTo(map).setPosition('topright');
      button3.addTo(map).setPosition('topright');
      button4.addTo(map).setPosition('topright');
      button5.addTo(map).setPosition('topright');
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
      button4.remove()
      button5.remove()
    }
  }]
});

// Add the toggle menu to the leaflet-map
toggleMenuButton.addTo(map);


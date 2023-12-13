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

/**
 * *********************************************************
 */

// Adding a Leaflet.Draw Toolbar
var drawControl = new L.Control.Draw( {
    edit: {featureGroup: drawnFeatures, 
      remove: true},
    // Only rectangle draw function is needed
    draw: {
        polyline: false,
        rectangle: true,
        polygon: true,
        circle: false,
        circlemarker: false,
        marker: false
    }
}) 

map.addControl(drawControl);


function setStyle(layer, layerType){
  if(layerType === 'rectangle'){
    layer.setStyle({
      color : 'black', 
      weight : 2, 
      fillOpacity : 0,
    })
  }
}

var rectangleCoordinates = null;
var previousRectangle = null;
// Event-Handler for drawing polygons
map.on("draw:created", function(event){
  var layer = event.layer;
  var type = event.layerType;
  var newFeature = event.layer.toGeoJSON();
  setStyle(layer, event.layerType)


  if (type === 'rectangle') {
    if (previousRectangle !== null) { //Wenn schon ein rechteck gezeichnet wurde, dann wird das alte gelöscht. Es darf immer nur eines geben, was die Koordinaten wweitergibt
      drawnFeatures.removeLayer(previousRectangle);
    }
    //rectangleCoordinates = layer.getBounds().toBBoxString();
    rectangleCoordinates = layer.getBounds();
    console.log(rectangleCoordinates)
    console.log('Koordinaten: ', newFeature);
    node_rectangle(newFeature)
  
    drawnFeatures.addLayer(layer);
    previousRectangle = layer;
  }else if(type === 'polygon'){
    if(rectangleCoordinates && rectangleCoordinates.contains(layer.getBounds())){
      var classID = prompt('Bitte für das Polygon die passende ObjektID eingeben!')
      var name = prompt('Bitte für das Polygon den passenden Namen eingeben!')
      classID = parseInt(classID);
        if(isNaN(classID)){
        alert('ObjektID muss eine Ganzzahl sein!')
        classID=undefined;
    }

        // Hinzufügen der Daten zum Feature
      newFeature.properties = {
      classID: classID,
      name: name
    };

      polygonToGeoJSON(newFeature);
      node_polygon(newFeature);
      drawnFeatures.addLayer(layer);
      addPopup(layer)

    }else{
      alert('Polygone müssen sich innerhalb')
    }
    
  }
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
})

//Löschen von den Trainingsdaten
map.on(L.Draw.Event.DELETED, function(event){
  var deleteAll = confirm('Möchten sie das Area of Training und die Trainingsdaten löschen')
  delete_data(deleteAll);
  if(deleteAll){
    allDrawnFeatures = {"type": "FeatrueCollection", "features": []};
    allRectangle = {"type": "Featurecollection", "features": []};
  }else{
    // Nur Trainingsdaten
    allDrawnFeatures = { "type": "FeatureCollection", "features": [] };
  }

  drawnFeatures.clearLayers()
  
  location.reload()
})

// show the scale bar on the lower left corner
L.control.scale({imperial: true, metric: true}).addTo(map);

//-----------------------------------------------------------------------------------
// Funktionen für die Aktionen des Menüs

let URLlist = []; //Die leere URL liste, aus der der user nachher das Satellitenbild auswahlen kann, was er klassifiezieren möchte
function satelliteImages(coordinates) {
  let NorthEastCoordinates = coordinates.getNorthEast().lng + ', ' + coordinates.getNorthEast().lat;
  //console.log(NorthEastCoordinates);
  let SouthwestCoordinates = coordinates.getSouthWest().lng + ', ' + coordinates.getSouthWest().lat;
  //console.log(SouthwestCoordinates);
  document.getElementById('northeastCoordinates').value = NorthEastCoordinates;
  document.getElementById('southwestCoordinates').value = SouthwestCoordinates;
  $('#popup_sat').modal('show');
  
  //Datum auswahl
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

    $('#saveChangesBtn').on('click', function() {
        if(selectedDate !== null) {
            var day = selectedDate.getDate(); // Tag auswählen
            var month = selectedDate.getMonth() + 1; // Monat auswählen (Monate beginnen bei 0)
            var year = selectedDate.getFullYear(); // Jahr auswählen

            let datum = day +"."+ month + "." + year
            getSatelliteImages(datum, NorthEastCoordinates, SouthwestCoordinates); // Über die Funktion werden die Werte weitergeleitet an das Backend, was ide Images holt und die ImageURL und die imageBound zurückgibt
          
          } else {
            console.log('Please select a date.');
        }
    });
  });
}


async function getSatelliteImages(datum, NorthEastCoordinates, SouthwestCoordinates) {
  URLlist = []; //Wenn ein neues Datum gewählt wurde dann muss die liste wieder geleert werden, damit die nicht immer wieder neu befüllt wird
  try {
    const response = await fetch('http://localhost:8080/satellite', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Date: datum,
          NEC: NorthEastCoordinates,
          SWC: SouthwestCoordinates})
      }) 

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Interpretiere die Antwort des Microservices im Frontend. Rückgabewert des Backends
      const data = await response.json();
      //console.log(data)

      if (Object.keys(data).length >= 2 ) { //Wenn mehr als 2 Objekte gefunden wurden, dann werden die id und die url in ein Objekt geschrieben URLlist
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

      let selectionContent = $('#objectSelect');
      selectionContent.empty(); // Leere den Inhalt des Modal-Bodies
      // Erstellt die Auswahlliste im zweiten Popup
      URLlist.forEach(function (item) {
        selectionContent.append($('<option>', {
          text: item.ID
        }));
      });

      $('#popup_select_sat').modal('show'); // Öffne das Auswahllisten-Popup

      $('#confirmSelectionBtn').on('click', function() {
        let selectedID = $('#objectSelect').val();
        console.log(selectedID)
        //zum anzeigen des images
        for (var i = 0; i < URLlist.length; i++){
          if (selectedID === URLlist[i].ID) {
            console.log(URLlist[i].URL)
            console.log(URLlist[i].IB)
            let leafletImageBounds = URLlist[i].IB.map(coordinates => {return coordinates.map(coord => [coord[1], coord[0]])});
            let imageOverlay = L.imageOverlay(URLlist[i].URL, leafletImageBounds);
            imageOverlay.addTo(map);
          }
        }
        $('#popup_select_sat').modal('hide'); // Schließe das Auswahllisten-Popup nach Bestätigung
      }); 

  } catch (error) {
    console.error('Es gab einen Fehler:', error);
  }
  $('#popup_sat').modal('hide');
}





function trainingData() {
  document.getElementById('fileInput').click();
  document.getElementById('fileInput').addEventListener('change', handleFileUpload);
}

function algorithm() {
    $('#popup_algo').modal('show');
    $('#confirmSelectionAlg').on('click', function() {
      var algorithmMD = document.getElementById('algorithm1').checked;
      var algorithmRF = document.getElementById('algorithm2').checked;
      if ((algorithmMD && algorithmRF) || (!algorithmMD && !algorithmRF)) {  //Wenn kein oder beide Algorithmen ausgewählt wurden
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



function modelTraining() {
  alert('Option 4 wurde geklickt!');
}
function classification() {
  alert('Option 5 wurde geklickt!');
}

function closePopup(ID_Popup) {
    console.log(ID_Popup);
    if (ID_Popup == 'popup_sat') {
      $('#popup_sat').modal('hide');
    } else if (ID_Popup == 'popup_algo') {
      $('#popup_algo').modal('hide');
    } else if (ID_Popup == 'popup_NoRectangle') {
      $('#popup_NoRectangle').modal('hide');
    } else if (ID_Popup == 'popup_NoAlgorithm') {
      $('#popup_NoAlgorithm').modal('hide');
    } else if (ID_Popup == 'popup_select_sat') {
      $('#popup_select_sat').modal('hide');
      URLlist = []; //Hiermit wird die liste geleert wenn im Popup-fenster für die selektion auf abbrechen gedrückt wird
      $('#popup_sat').modal('show');
    }
}

function showPopupNoRectangle() {
  $('#popup_NoRectangle').modal('show');
}
function firstSelectRectangle() {
  var popup = document.getElementById('popup_NoRectangle');
  popup.style.display = 'none';
}

// Erstelle EasyButtons für die Aktionen des Menüs
var button1 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/sentinal_icon.png" style="width: 20px; height: 20px;">', function() {
  if(rectangleCoordinates) {
    satelliteImages(rectangleCoordinates)
  } else {
    console.log("Es wurde kein Rechteck gezeichnet!");
    showPopupNoRectangle();
  }
}, 'Sentinal-2');
  
var button2 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/trainigsdaten_icon.png" style="width: 20px; height: 20px;">', trainingData, 'Trainigsdaten');
var button3 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/algorithmus_icon.png" style="width: 20px; height: 20px;">', algorithm, 'Algorithmus');
var button4 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/modeltraining_icon.png" style="width: 20px; height: 20px;">', modelTraining, 'Modeltraining');
var button5 = L.easyButton('<img src="https://raw.githubusercontent.com/astru03/TerraClassifier/main/public/images/klassifikation_icon.png" style="width: 20px; height: 20px;">', classification, 'Klassifikation');
    
// Erstelle den Haupt-Button (Burgermenü-Button)
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

// Füge den Haupt-Button zur Karte hinzu
toggleMenuButton.addTo(map);



/**
 * **********************************************************************************
 */


// globale Variablen speichern, Polygone
var allDrawnFeatures = {
  "type": "FeatureCollection",
  "features": []
};

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
 * Diese asynchrone Funktion ermöglicht das hcohladen von GeoJSON oder Geopackage-Datein. Zudem werden dann die enthaltenen Polygone auf der Karte abgebildet
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
          addToMap(geojson_data)
          node_polygon(geojson_data)
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
  .then(data => console.log("Serverantwort:", data))
  .catch(error => console.error('Fehler beim Senden der Daten:', error));
}

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
      var r = L.geoJSON(data, {
         onEachFeature: function(feature, layer){
           setStyle(layer, 'rectangle')
         }

      })
      .addTo(map); 
      rectangleCoordinates = r.getBounds()
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
          if (data && data.type === "FeatureCollection") {
              
              data.features.forEach(feature => {
                 addFeature(feature)
              });
              L.geoJSON(allDrawnFeatures, {
                onEachFeature: function(feature, layer) {
                  drawnFeatures.addLayer(layer)
                  addPopup(layer)
                }
              }).addTo(map)
              console.log('Geladene allDrawnFeatures vom Server:', JSON.stringify(allDrawnFeatures));

          } else {
              console.error('Geladene Daten haben nicht die Struktur einer FeatureCollection');
          }
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



// Event-Listener - wird beim Laden der Seite aufgerufen. Ruft dabei die Funktion load_data, um unsere Trainingsdaten direkt auf der Karten sich anzeigen zu lassen
document.addEventListener('DOMContentLoaded', check_map);

/**
 * Diese Funktion löscht die Trainingsdaten vom Server
 */
function delete_data(deleteAll){
  fetch('http://localhost:8080/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({deleteAll: deleteAll}) 
  })
  .then(response => response.json())
  .then(data => console.log('Serverantwort: ', data))
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

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
map.addControl(new L.Control.Draw( {
    edit: {featureGroup: drawnFeatures},
    // Only rectangle and point draw function is needed
    draw: {
        polyline: false,
        rectangle: true,
        polygon: false,
        circle: false,
        circlemarker: false,
        marker: false
    }
})) 

var rectangleCoordinates = null;
// Event-Handler for drawing polygons
map.on("draw:created", function(event){
  var type = event.layerType,
  layer = event.layer;

  if (type == 'rectangle') {
    //rectangleCoordinates = layer.getBounds().toBBoxString();
    rectangleCoordinates = layer.getBounds();
    //console.log(rectangleCoordinates); 
  }
    drawnFeatures.addLayer(layer);
})

// Event-Handler for editing rectangle
map.on("draw:edited", function(event){
  var layers = event.layers;
  layers.eachLayer(function (layer) {
    if (layer instanceof L.Rectangle) {
      //rectangleCoordinates = layer.getBounds().toBBoxString();
      rectangleCoordinates = layer.getBounds();
      //console.log('Edited Rectangle Coordinates:', rectangleCoordinates);
    }
  });
})

// show the scale bar on the lower left corner
L.control.scale({imperial: true, metric: true}).addTo(map);


// Funktionen für die Aktionen des Menüs
//Wenn dies die erste Funktion wird, über die Sentinal-2 Daten erhalten werden können, müssen folgende vorbeidnungen beachtet/erfüllt/hier im code abgefangen werden
//1. Funktion darf nur ausgeführt werden, wenn auch ein AOI über das Rechteck ausgewählt wurde.
//2. Funktion darf nicht ausgeführt werden, wenn ein AOI über ein Polygon ausgewählt wurde. (Wenn möglich)
//3. Funktion darf nicht ausgeführt werden, wenn kein AOI gewählt wurde
function satelliteImages(coordinates) {
  
  let NorthEastCoordinates = 'Lat: ' + coordinates.getNorthEast().lat + ' ; Lng: ' + coordinates.getNorthEast().lng;
  //console.log(NorthEastCoordinates);
  let SouthwestCoordinates = 'Lat: ' + coordinates.getSouthWest().lat + ' ; Lng: ' + coordinates.getSouthWest().lng;
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
            getSatelliteImages(datum, NorthEastCoordinates, SouthwestCoordinates);
            // You can perform actions with the selected date here
        } else {
            console.log('Please select a date.');
        }
    });
  });
  
}


async function getSatelliteImages(datum, NorthEastCoordinates, SouthwestCoordinates) {
  try {
    const response = await fetch('http://localhost:8080/satellite', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Datum: datum,
          NEC: NorthEastCoordinates,
          SWC: SouthwestCoordinates})
      }) 

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Interpretiere die Antwort des Microservices im Frontend. Rückgabewert des Backends
      const data = await response.json();
      console.log('Datum', data.valueDate);
      console.log('NEC', data.valueNEC);
      console.log('SWL', data.valueSWC);
      console.log('Message', data.message);

  } catch (error) {
    console.error('Es gab einen Fehler:', error);
  }

  $('#popup_sat').modal('hide'); 

}

function trainingData() {
    alert('Option 2 wurde geklickt!');
}

function algorithm() {
    var popup = document.getElementById('popup_algo');
    popup.style.display = 'block';
}

function useSelectedAlgorithm() {
  var algorithmNN = document.getElementById('algorithmNearestNeighbor').checked;
  var algorithmRF = document.getElementById('algorithmRandomForrest').checked;
  console.log('Nearest neighbor Algorithmus ausgewählt:', algorithmNN);
  console.log('Random forest Algorithmus ausgewählt:', algorithmRF);
  var popup = document.getElementById('popup_algo');
  popup.style.display = 'none';
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
      var popup = document.getElementById('popup_algo');
      popup.style.display = 'none';
    } else if (ID_Popup == 'popup_NoRectangle') {
      $('#popup_NoRectangle').modal('hide');
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


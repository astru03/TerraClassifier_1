# TerraClassifier_1

Welcome to Terra Classifier - your portal for supervised classification of remote sensing data!
Terra Classifier is a web application designed to revolutionize the classification of satellite data.

## Who we are: The team behind Terra Classifier: 
Our dedicated team of six qualified geoinformatics students are passionate about driving innovation.
We understand the importance of accurate environmental information and are proud to present you with Terra Classifier, a platform dedicated to this.

## Why Terra Classifier?
Speed and efficiency: Classify satellite images and training data directly in your web browser.
Ease of use: Our platform is intuitive and easy to use.

## Installing and launching the web application from this GitHub repository with Docker:
It is highly recommended to deploy the service on an AWS EC2 machine that is in us-west-2 region (Oregon) as that is the data centre where the Earth Observation(EO) datasets found in AWS STAC search are stored.
You must enable port 3000 and 8080 of the EC2 instance for provisioning and communication with the service.

1. Clone the following [GitHub repository](https://github.com/astru03/TerraClassifier_1) to an IDE (for example VS Code) or to your AWS EC2 instance.
2. Navigate to the TerraClassifier folder to the directory where the docker-compose.yml is located. On the AWS EC2 instance, this can be done with the following command: 
```bash
cd TerraClassifier_1
```
3. Assuming that Docker is installed and running on your system, execute the following command:
```bash
docker-compose up --build -d
```
4. An image of the application is created and the image of "openeocubes_custom" published on Dockerhub is used at the same time. Both images are started together in a container.
5. Once the container has been successfully downloaded and started, the application can be accessed in the browser.
If the application has been started locally, it can be accessed at the following URL: http://localhost:3000
If the application has been started via an AWS EC2 instance, it can be accessed at the following URL: http://IP-of-your-EC2-Instance:3000

Please use the Chrome or Edge browser to start the application.

## Installing and starting the DockerHub web application:
You can get a hosted Docker image of the platform on DockerHub https://hub.docker.com/r/astru/terraclassifier
It is highly recommended to deploy the service on an AWS EC2 machine that is in us-west-2 region (Oregon) as that is the data centre where the Earth Observation(EO) datasets found in AWS STAC search are stored.
You must enable port 3000 and 8080 of the EC2 instance for provisioning and communication with the service.
First, the image must be pulled from Dockerhub with the command:
```bash
docker pull astru/terraclassifier:latest
```
After pulling the image can be started with the command:
```bash
docker-compose up -d
```

## Funktionsweise der Webanwendung:
### Home
Nach dem Start der Webanwendung erscheint die Startseite unter dem Reiter "Home".

### Modeltrainig und Klassifikation
Unter dem Reiter "Modeltrainig und Klassifikation" befindet sich der Hauptteil der Webanwendung zur Durchführung einer überwachten Klassifikation.

Über eine Leafletkarte und mit Hilfe der Funktion zum zeichnen eines Rechteckes, kann der User im ersten Schritt einen Bereich auswählen, für den Satellitenbilder geladen werden sollen. 
Im nächsten Schritt kann der User rechts das toggle-menu öffnen und dort die Funktion "Sentinel-2" auswählen. Es öffnet sich das Popupfenster "Satelliten". 
Hat der User zuvor kein Rechteck gezeichnet und betätigt die Funktion, erscheint ein Hinweisfenster, dass zuerst ein Rechteck auf der Karte eingezeichnet sein muss. 
Im Popupfenster "Satelliten" werden die Nordost- und Südwest-Koordinaten des eingezeichneten Rechtecks dargestellt. Weiterhin kann der User über ein Kalender-widget einen Zeitraum auswählen, über dem der User Sentinel-2 Bilder beziehen möchte. Dabei wird vom ausgewählten Datum immer eine Zeitspanne von einem Monat nach dem ausgewählten Datum berücksichtigt. Dies soll ein übermäßiges einladen von Satellitenbildern und damit einbüßen der Performance verhindern.
Mit "Abbrechen" kann der User das Popupfenster wieder verlassen und ggf. ein neues Rechteck einzeichnen.
Mit "OK" gelangt der User in ein nächstes Popupfenster, dass ein Auswahlfenster bereitstellt. 
Hier kann der User über die ID der Satellitenbilder, eines der Satellitenbilder auswählen. Nachdem der User die Auswahl mit "Ok" bestätigt hat, wird das Satellitenbild in der Leafletkarte angezeigt.

Über die Funktion "Trainigsdaten" im toggle-menu, kann der User Trainigsdaten über den Button „Datai-Upload“ hochladen oder mit dem Button „Zeichnen sie selber Trainigsdaten“ mit Hilfe der Leafletfunktion „Polygon-zeichnen“ selber einzeichnen. 
Für beide Funktionen muss zuerst eine Area Of Training (AOT) mit der Leafletfunktion „Rechteck-zeichnen“ erstellt werden. 
Wird der Button „Datei-Upload“ betätigt, wird der User über ein Popup-Fenster darüber Informiert, dass er zunächst ein AOT einzeichnen muss um mit der Funktion des Hochladens, weiter fahren zu können.
Wird der Button „Zeichnen sie selber Trainingsdaten“ betätigt, wird der User zunächst über ein Popup-Fenster darüber Informiert was er beim selber zeichnen zu beachten hat.
Der User wird darüber informaiert, dass er mindestens neun Trainingsgebiete einzeichnen muss. Dabei muss mindestens von jeder ClassID und Objektname drei vorliegen und es müssen mindestens drei verschiedene Kategorie erstellt werden. Ein Beispiel wird im Popup-fenster ebenfalls dargestellt.
Wird das Hinweis-popup mit „ok“ bestätigt, kann der User nun als erstes mithilfe der „Rechteck-Zeichnen“ Funktion ein AOT einzeichnen und anschließend mit der „Polygon-zeichen“ Funktion Trainingsdaten einzeichnen.
Die hochgeladenen oder im Browser selber erstellten Trainingsdaten müssen alle in dem definierten AOT liegen, Ansonsten erscheint eine Fehlermeldung.
Der User hat die Möglichkeit Daten im Format geojson oder gpkg hochzuladen. 
Wichtiger Hinweis: Das Format und die Struktur der Daten wird validiert. Die Felder „ClassID“ und „Label“ sind zwingend erforderlich. Weiterhin ist es notwendig, dass eine ClassID mindestens dreimal vorkommen muss und es muss mindestens drei unterschiedliche ClassID geben.
Sie Finden im Repository Beispieldateien für ein geojson und ein gpkg.
Mit dem Trainingspolygone_Dortmund_valid.geojson können Trainigsgebiete im Bereich von Dortmund eingeladen werden.
Mit dem Trainingspolygone_Paderborn_valid.gpkg können Trainigsgebiete im Bereich von Paderborn eingeladen werden.

Über die Funktion "Algorithmus" kann der User einen von vier Algorithmen über die Checkboxfunktion auswählen. Mit "Abbrechen" kann der User das Popupfenster wieder verlassen. Mit "Ok" wird die Auswahl gespeichert. Dabei kann der User immer nur ein Algorithmus wählen. Wird kein Algorithmus über die Checkbox gewählt oder mehrere Algorithmen gleichzeitig, so wird eine Fehlermeldung ausgegeben.


Über die Funktion „AOI“ kann der User ein Area of Intrest einzeichnen. Dieses Gebiet ist das was schließlich klassifiziert wird. Dabei gilt, je größer das Gebiet desto länger braucht die Berechnung. 

Über die Funktion „Auflösung“ kann der User bestimmen in welcher Auflösung die Klassifikation ausgegeben werden kann. Dabei gilt, je kleiner die Auflösung desto lönger braucht die Berechnung. Es gilt zu beachten, dass eine Auflösung von 30x30, 60x60 und 100x100 bitte nur für kleine „AOI’s“ verwendet wird, weil ansonsten die Klassifikation zu lange dauert. 
Für größere Bereiche wurde extra eine Auflösung von 200x200 und 500x500 hinzugefügt.

Über die Funktion „Klassifikation wird nun die überwachte Klassifikation angestoßen. Es erscheint ein Ladezeichen, dass anzeigt dass die Berechnung durchgeführt wird. Nach erfolgreicher Beendigung, wird für das AOI die überwachte Klassifikation in der Karte angezeigt. 

über die Funktion "Download Model" hat der User nun die Möglichkeit das trainierte Model für die durchgeführte Klassifikation als rds herunter zuladen.

Über die letzte Funktion „reload“ kann der User die Webseite neu laden lassen und somit eine neue klassifikation durchführen.

### Beispiel
Der Reiter "Beispiel" liefert ein "one-Click" Demonstration einer überwachten Klassifikation.
Nachdem der Button „Start Demo“ ausgeführt wird, wird eine überwachte Klassifikation durchgeführt anhand von fest vorgegebenen Informationen. Diese beinhalten:
Das Area of Intest, Area of Training, Trainigsdaten, Start und Endzeitpunkt, Algorithmus, und Auflösung.


### Dokumentation
Im Reiter "Dokumentation" findet der User eine ausführliche Dokumentation zu den Funktionen, die unter „Modeltraining und Klassifikation“ zu finden sind.

### Impressum
Im Reiter "Impressum" befinden sich die Kontaktdaten.

Lizensierung:
Als Lizenz wird die GNU Affero General Public License version 3 verwendet.
https://opensource.org/license/agpl-v3/


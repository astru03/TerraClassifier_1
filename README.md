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
1. Clone the following [GitHub repository](https://github.com/astru03/TerraClassifier_1) to an IDE (for example VS Code) or to your AWS EC2 instance.
2. Assuming that Docker is installed and running on your system, execute the following command:
```bash
docker-compose up --build -d
```
3. An image of the application is created and the image of "openeocubes_custom" published on Dockerhub is used at the same time. Both images are started together in a container.
4. Once the container has been successfully downloaded and started, the application can be accessed in the browser.
If the application was started locally under the URL: http://localhost:3000
If the application was started via an AWS EC2 instance under the URL: http://IP-of-your-EC2-Instance:3000

Please use the Chrome or Edge browser to start the application.

## Installing and starting the DockerHub web application:
You can get a hosted Docker image of the platform on DockerHub https://hub.docker.com/r/astru/terraclassifier

You can expose port 3000 of the EC2 instance to deploy and communicate with the service.
```bash
docker run -p 3000:3000  astru/terraclassifier
```
For light tasks and processes you can host the service on pc and therefore you don't need AWS IPv4 Address
```bash
docker run -p 3000:3000  astru/terraclassifier
```

## Funktionsweise der Webanwendung:
### Home
Nach dem Start der Webanwendung erscheint die Startseite unter dem Reiter "Home".
### Modeltrainig und Klassifikation
Unter dem Reiter "Modeltrainig und Klassifikation" befindet sich der Hauptteil der Webanwendung zur Durchführung einer überwachten Klassifikation.
Über eine Leafletkarte und mit Hilfe der Funktion zum zeichnen eines Rechteckes, kann der User im ersten Schritt einen Bereich auswählen, für den Satellitenbilder geladen werden sollen. 
Im nächsten Schritt kann der User rechts das toggle-menu öffnen und dort die Funktion "Sentinel-2" auswählen. Es öffnet sich das Popupfenster "Satelliten". 
Hat der User zuvor kein Rechteck gezeichnet und betätigt die Funktion, erscheint ein Hinweisfenster, dass zuerst ein Rechteck auf der Karte eingezeichnet sein muss. Im Popupfenster "Satelliten" werden die Nordost- und Südwest-Koordinaten des eingezeichneten Rechtecks dargestellt. Weiterhin kann der User über ein Kalenderwidget einen Zeitraum auswählen, über den er Sentinel-2 Bilder beziehen möchte. Dabei wird vom ausgewählten Datum immer eine Zeitspanne von 14 Tage nach dem ausgewählten Datum berücksichtigt. Dies soll ein übermäßiges einladen von Satellitenbildern und damit einbüßen der Performance verhindern.
Mit "Abbrechen" kann der User das Popupfenster wieder verlassen und ggf. ein neues Rechteck einzeichnen.
Mit "OK" gelangt der User in ein nächstes Popupfenster, dass ein Auswahlfenster bereitstellt. 
Hier kann der User über die ID der Satellitenbilder, eines der Satellitenbilder auswählen. Nachdem der User die Auswahl mit "Ok" bestätigt hat, wird das Satellitenbild in der Leafletkarte angezeigt.

Über die Funktion "Trainigsdaten" im toggle-menu, kann der User Trainigsdaten hochladen oder mit Hilfe der Leafletfunktion Polygon-zeichnen selber einzeichnen und abspeichern. Dafür muss zuvor eine Area Of Training (AOT) mit der Leafletfunktion Rechteck-zeichnen erstellt werden. Die hochgeladenen oder im Browser erstellten Trainingsdaten müssen dabei alle in dem definierten AOT liegen. Beim Erstellen von Trainingsdaten muss für jedes Polygon eine Objekt-ID sowie ein Objektname vergeben werden.

Über die Funktion "Algorithmus" kann der User einen von zwei Algorithmen über die Checkboxfunktion auswählen. Mit "Abbrechen" kann der User das Popupfenster wieder verlassen. Mit "Ok" wird die Auswahl gespeichert. Dabei kann der User immer nur ein Algorithmus wählen. Wird kein Algorithmus über die Checkbox gewählt oder beide Algorithmen gleichzeitig, so wird eine Fehlermeldung ausgegeben.

über die Funktion "Modeltrainig" -->

Über die Funktion "Klassifikation" -->

### Beispiel
Der Reiter "Beispiel" liefert ein "one-Click" Beispiel einer überwachten Klassifikation.
### Dokumentation
Im Reiter "Dokumentation" findet der User eine ausführliche Dokumentation zur Webanwendung.
### Impressum
Im Reiter "Impressum" befinden sich die Kontaktdaten.

Lizensierung:
Als Lizenz wird die GNU Affero General Public License version 3 verwendet.
https://opensource.org/license/agpl-v3/

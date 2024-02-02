# TerraClassifier_1

Willkommen bei Terra Classifier - Ihr Portal für überwachte Klassifikation von Fernerkundungsdaten!
Terra Classifier ist eine Webapplikation, welche das Klassifizieren von Satellitendaten revolutionieren soll.

## Wer wir sind: Das Team hinter Terra Classifier: 
Unser engagiertes Team von sechs qualifizierten Studierenden aus dem Bereich Geoinformatik arbeitet leidenschaftlich daran, Innovationen voranzutreiben.
Wir verstehen die Bedeutung präziser Umweltinformationen und sind stolz darauf, Ihnen mit dem Terra Classifier eine dafür geeignete Plattform zu präsentieren.

## Warum Terra Classifier?
Schnelligkeit und Effizienz: Klassifizieren Sie Satellitenbilder und Trainingsdaten direkt in Ihrem Webbrowser.
Benutzerfreundlichkeit: Unsere Plattform ist intuitiv und einfach zu bedienen.

## Installation und Start der Webanwendung von diesem GitHub-Repository mit Docker:
1. Klonen Sie das folgende [GitHub-Repository](https://github.com/astru03/TerraClassifier_1) in eine IDE (zum Beispiel VS Code) oder auf Ihre AWS EC2 Instanz.
2. Unter der Annahme, dass Docker auf Ihrem System installiert und läuft führen Sie den folgenden Befehl aus:
```bash
docker-compose up --build -d
```
3. Von der Anwendung wird ein Image erstellt und im gleichen Zuge das Auf Dockerhub veröffentlichte Image von "openeocubes_custom" herangezogen. Beide Images werden zusammen in einem Container gestartet.
4. Nach erfolgreichem Download und start der Container ist die Anwendung im Browser unter der URL http://IP-Ihrer-EC2-Instanz:3000 abrufbar.
Bitte für den Start die Browser Chrome oder Edge verwenden.

## Installation und Start der Webanwendung von DockerHub:


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

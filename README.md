# TerraClassifier_1

Willkommen bei Terra Classifier - Ihr Portal für überwachte Klassifikation von Fernerkundungsdaten!
Terra Classifier ist eine Webapplikation, welche das Klassifizieren von Satellitendaten revolutionieren soll.

Wer wir sind: Das Team hinter Terra Classifier: 
Unser engagiertes Team von sechs qualifizierten Studierenden aus dem Bereich Geoinformatik arbeitet leidenschaftlich daran, Innovationen voranzutreiben.
Wir verstehen die Bedeutung präziser Umweltinformationen und sind stolz darauf, Ihnen mit dem Terra Classifier eine dafür geeignete Plattform zu präsentieren.

Warum Terra Classifier:
Schnelligkeit und Effizienz: Klassifizieren Sie Satellitenbilder und Trainingsdaten direkt in Ihrem Webbrowser.
Benutzerfreundlichkeit: Unsere Plattform ist intuitiv und einfach zu bedienen.


Start des Pre-releas Webanwendung über Docker:
Um das Pre-releas der Webanwendung zu starten, muss das Repository mir VSCode oder einer anderen IDE ihrer Wahl geclont werden.
Im Terminal muss dann zunächst mit dem Befehl "npm install" alle relevanten dependencies installiert werden. Anschließend ist die Webanwendung mit dem Befehlt "docker-compose up --build", nachdem die Images für das Frntend und Backend sowie der zugehörige Container gebaut wurden, lauffähig und kann über localhost:3000 erreicht werden.
Bitte für den Start Chrome oder Edge verwenden.


Funktionsweise der Webanwendung:
Nach dem Start der Webanwendung erscheint die Startseite und dem Reiter "Home".
Unter dem Reiter "Modeltrainig und Klassifikation" befindet sich der Hauptteil der Webanwendung zur durchführung einer überwachten Klassifikation.
Über eine Leafletkarte und mithilfe der Funktion zum zeichnen eines Rechteckes, kann der User im ersten Schritt ein AOI (Area of Intrest) erstellen. Dabei kann der User immer nur eins erstellen. Wenn ein weiteres Rechteck gezeichnet wird, wird das vorherige wieder entfernt. Somit wird sichergestellt, dass immer nur ein Bereich zur überwachten Klassifikation bereitsteht. 
Im nächsten Schritt kann der User rechts das Burger-meneu öffnen und dort die Funktion "Sentinel-2" auswahlen. Es öffnet sich ein Popupfenster "Satelliten". 
Hat der User kein Rechteck ausgewählt und betätigt die Funktion, erscheint ein Hinweisfenster, dass zuerst ein Rechteck auf der Karte eingezeichnet  und damit ein AOI definiert sein muss.In diesem Popup-fenster werden die Nordost- und Südwest-Koordinaten des eingezeichneten Rechtecks dargestellt. Weiterhin kann der User über ein Datepicker ein Zeitraum auswahlen über den er Sentinel-2 Bilder beziehen möchte. Dabei wird vom ausgewählten Datum immer eine Zeitspanne von 14 Tage berücksichtigt. Dies soll ein übermäßiges einladen von zuvielen Bildern und damit einbüßen in der Performance verhindern.
Mit "Abgrechen" kann der User das Popup-fenster wieder verlassen und ggf. ein neues Rechteck (AOI) einzeichnen.
Mit "OK" gelangt der user in ein nächstes Popup-fenster, dass in einem Auswahlfenster die ID der für den gewählten AOI und dem Zeitraum die verfügbaren Satellitenbilder anzeigt. Nachdem der User eins ausgewählt hat und die Auswahl mit "Ok" bestätigt, wird das Satellitenbild in der leafletkarte angezeigt.

Über die Funktion "Trainigsdaten" im Bürger-menue, kann der User Trainigsdaten hochladen oder selber einzeichnen und abspeichern.

Über die Funktion "Algorithmus" kann der user einen von zwei Algorithmen über die Checkboxfunktion auswahlen. Mit "Abbrechen" kann der User das Popup-fenster wieder verlassen. Mit "ok" wird die Auswahl gespeichert. Dabei kann der User immer nur ein Algorthmus wählen. Wird kein Algorithmus über die Checkbox gewählt oder beide Algorithmen gleichzeitig, so wird eine Fehlerrmeldung ausgegeben.

über die Funktion "Modeltrainig" -->

Über die Funktion "Klassifikation" -->

Der Reiter "Beispiel" soll zukünftig ein "one-Click" beispiel einer überwachten Klassifikation liefern.
Im Reiter "Dokumentation" findet der User später eine ausführliche Dokumentation zur Webanwendung.
Im Reiter "Impressum" befindet sich die Kontaktdaten.
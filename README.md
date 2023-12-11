# TerraClassifier_1

Willkommen bei Terra Classifier - Ihr Portal für überwachte Klassifikation von Fernerkundungsdaten!
Terra Classifier ist eine Webapplikation, welche das Klassifizieren von Satellitendaten revolutionieren soll.

Wer wir sind: Das Team hinter Terra Classifier: 
Unser engagiertes Team von sechs qualifizierten Studierenden aus dem Bereich Geoinformatik arbeitet leidenschaftlich daran, Innovationen voranzutreiben.
Wir verstehen die Bedeutung präziser Umweltinformationen und sind stolz darauf, Ihnen mit dem Terra Classifier eine dafür geeignete Plattform zu präsentieren.

Warum Terra Classifier:
Schnelligkeit und Effizienz: Klassifizieren Sie Satellitenbilder und Trainingsdaten direkt in Ihrem Webbrowser.
Benutzerfreundlichkeit: Unsere Plattform ist intuitiv und einfach zu bedienen.

Start des Pre-Release der Webanwendung über Docker:
Um das Pre-Release der Webanwendung zu starten, muss das Repository mir VSCode oder einer anderen IDE ihrer Wahl geklont werden.
Im Terminal muss dann zunächst mit dem Befehl "npm install" alle relevanten Abhängigkeiten installiert werden. Anschließend ist die Webanwendung mit dem Befehlt "docker-compose up --build", nachdem die Images für das Frontend und Backend sowie der zugehörige Container gebaut wurden, lauffähig und kann über localhost:3000 erreicht werden.
Bitte für den Start die Browser Chrome oder Edge verwenden.

Funktionsweise der Webanwendung:
Nach dem Start der Webanwendung erscheint die Startseite unter dem Reiter "Home".
Unter dem Reiter "Modeltrainig und Klassifikation" befindet sich der Hauptteil der Webanwendung zur Durchführung einer überwachten Klassifikation.
Über eine Leafletkarte und mithilfe der Funktion zum zeichnen eines Rechteckes, kann der User im ersten Schritt ein AOI (Area of Intrest) erstellen. Dabei kann der User immer nur ein AOI erstellen. Wenn ein weiteres Rechteck gezeichnet wird, wird das vorherige wieder entfernt. Somit wird sichergestellt, dass immer nur ein Bereich AOI zur überwachten Klassifikation bereitsteht. 
Im nächsten Schritt kann der User rechts das toggle-menu öffnen und dort die Funktion "Sentinel-2" auswählen. Es öffnet sich das Popupfenster "Satelliten". 
Hat der User zuvor kein Rechteck gezeichnet und betätigt die Funktion, erscheint ein Hinweisfenster, dass zuerst ein Rechteck auf der Karte eingezeichnet und damit ein AOI definiert sein muss. Im Popupfenster "Satelliten" werden die Nordost- und Südwest-Koordinaten des eingezeichneten Rechtecks dargestellt. Weiterhin kann der User über ein Datepicker ein Zeitraum Auswahlen über den er Sentinel-2 Bilder beziehen möchte. Dabei wird vom ausgewählten Datum immer eine Zeitspanne von 14 Tage nach dem ausgewählten Datum berücksichtigt. Dies soll ein übermäßiges einladen von Satellitenbildern und damit einbüßen in der Performance verhindern.
Mit "Abbrechen" kann der User das Popupfenster wieder verlassen und ggf. ein neues Rechteck (AOI) einzeichnen.
Mit "OK" gelangt der User in ein nächstes Popupfenster, dass ein Auswahlfenster bereitstellt. 
Hier kann der User über die ID der Satellitenbilder, eines der Satellitenbilder für das gewählte AOI und dem gewählten Zeitraum auswählen. Nachdem der User eins ausgewählt hat und die Auswahl mit "Ok" bestätigt, wird das Satellitenbild in der leafletkarte angezeigt.

Über die Funktion "Trainigsdaten" im toggle-menu, kann der User Trainigsdaten hochladen oder selber einzeichnen und abspeichern.

Über die Funktion "Algorithmus" kann der User einen von zwei Algorithmen über die Checkboxfunktion auswählen. Mit "Abbrechen" kann der User das Popupfenster wieder verlassen. Mit "Ok" wird die Auswahl gespeichert. Dabei kann der User immer nur ein Algorithmus wählen. Wird kein Algorithmus über die Checkbox gewählt oder beide Algorithmen gleichzeitig, so wird eine Fehlermeldung ausgegeben.

über die Funktion "Modeltrainig" -->

Über die Funktion "Klassifikation" -->

Der Reiter "Beispiel" soll zukünftig ein "one-Click" Beispiel einer überwachten Klassifikation liefern.
Im Reiter "Dokumentation" findet der User später eine ausführliche Dokumentation zur Webanwendung.
Im Reiter "Impressum" befinden sich die Kontaktdaten.


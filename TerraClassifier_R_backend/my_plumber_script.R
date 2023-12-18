# Beispiel Plumber-R-Skript

# Installiere zuerst das Paket, wenn es nicht bereits installiert ist
# install.packages("plumber")

library(plumber)

#* @post /process_json
#* @param data:json
function(req) {
  data <- req$postBody
  # Verarbeite die Daten hier, führe deine R-Berechnungen durch, und gib eine Antwort zurück
  # Beispiel: Gib die empfangenen Daten zurück
  return(list(status = "Success", received_data = data))
}

# Starte den Plumber-Server
plumber::plumb("my_plumber_script.R")$run(port = 8000, host = "0.0.0.0")

# Beispiel Dockerfile für Plumber mit R
# FROM rocker/r-ver:latest
FROM rstudio/plumber

# Installiere benötigte Pakete
RUN R -e "install.packages('plumber')"

WORKDIR /app

# Kopiere dein Plumber-R-Skript in das Image
COPY my_plumber_script.R /app/my_plumber_script.R

# Definierte Port
EXPOSE 8000

# Entrypoint
ENTRYPOINT ["R", "-e", "plumberScript <- plumber::plumb('my_plumber_script.R'); plumberScript$run(host = '0.0.0.0', port= 8000)"]

CMD ["/my_plumber_script.R"]

# CMD ["R", "-e", "plumber::plumb('my_plumber_script.R')$run(host='0.0.0.0', port=8000)"]
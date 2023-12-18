# Beispiel Dockerfile für Plumber mit R
FROM rocker/r-ver:latest

RUN R -e "install.packages('plumber')"

WORKDIR /app

COPY my_plumber_script.R /app/my_plumber_script.R
# Kopiere weitere Dateien bei Bedarf

EXPOSE 8000

CMD ["R", "-e", "plumber::plumb('my_plumber_script.R')$run(host='0.0.0.0', port=8000)"]
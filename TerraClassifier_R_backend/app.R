# @title: Machine Learning in R - Rasterdata from Münster and Dortmund (Germany)
# @author: Andreas Struffert-Froböse, Dominik Zubel, Jonas Starke, Kieran Galbraith, Lena Lac-Nhien Long, Philip Dyckhof # nolint
# @date: 2023-01-06
# @version: 0.9.3
# @description: This script is part of the project "Terra Classifier" of the course "Geosoftware 2" at the University of Münster. # nolint
# @encoding: UTF-8
# @language: en

# Delete all variables in the workspace, this shouldn't be necessary in the finished product
rm(list = ls())

# Set working directory, this shouldn't be necessary in the finished product
setwd("C:/Users/kgalb/Documents/Workspace/R/DataCubes")
list.files()

# load libraries
# set vector with library names
librarys <- c("raster", "terra", "mapview", "leaflet", "sf", "caret", "openeo", "gdalcubes", "rstac", "rgdal")

# function that loads all libraries
load_librarys <- function(librarys) {
  for (library in librarys) {
    # Prüfen, ob die Library installiert ist
    if (!require(library, character.only = TRUE)) {
      # Wenn nicht, installieren und laden
      install.packages(library)
      library(library, character.only = TRUE)
    }
  }
}

# call function
load_librarys(librarys)

# connect to openEOcubes on AWS
connect_and_login <- function(url, user, password) {
  con <- connect(url)
  login(user = user, password = password)
}

# call function
con <- connect_and_login("http://54.185.59.127:8000/", "k_galb01", "password")

# set necessary parameters, variables and other stuff
# this part will be more dynamic in the future
aoi <- c(394861, 420134, 5746419, 5767397) # bbox for area of interest
aot <- c(368285, 418831, 5687228, 5729184) # bbox for area of training
temp1 <- "2021-06-01"
temp2 <- as.Date(temp1) + 14
temp2 <- as.character(temp2) # convert the date back to a simple string
temp <- c(temp1, temp2)
algo <- "knn"
geojson_file <- "Trainingspolygone_Dortmund.geojson"
my_res <- 100

# load openeo processes
p <- processes()

# Function to fetch data for a given area of interest through openEOcubes
fetch_aoi_data <- function(aoi, temp) {
  aoi_collection <- p$load_collection(id = "sentinel-s2-l2a-cogs",
                                      spatial_extent = list(west = aoi[1],
                                                            south = aoi[3],
                                                            east = aoi[2],
                                                            north = aoi[4]),
                                      crs = 25832,
                                      temporal_extent = temp)
  
  aoi_bands <- p$filter_bands(data = aoi_collection,
                              bands = c("B02", "B03", "B04", "B08"))
  return(aoi_bands)
}

# Function to download data for a given area of interest through openEOcubes
download_aoi_data <- function(data){
  temp_file <- tempfile(fileext = ".tif")
  
  formats <- list_file_formats()
  result <- p$save_result(data = data, format = formats$output$GTiff)
  
  compute_result(graph = result, output_file = temp_file)
  s2_aoi <- raster::stack(temp_file)
  return(s2_aoi)
}

# Function to fetch data for a given area of training through openEOcubes
fetch_aot_data <- function(aot, temp) {
  aot_collection <- p$load_collection(id = "sentinel-s2-l2a-cogs",
                                      spatial_extent = list(west = aot[1],
                                                            south = aot[3],
                                                            east = aot[2],
                                                            north = aot[4]),
                                      crs = 25832,
                                      temporal_extent = temp)
  
  aot_bands <- p$filter_bands(data = aot_collection,
                              bands = c("B02", "B03", "B04", "B08"))
  return(aot_bands)
}

# Function to download data for a given area of training through openEOcubes
download_aot_data <- function(data){
  temp_file <- tempfile(fileext = ".tif")
  
  formats <- list_file_formats()
  result <- p$save_result(data = data, format = formats$output$GTiff)
  
  compute_result(graph = result, output_file = temp_file)
  s2_aot <- raster::stack(temp_file)
  return(s2_aot)
}

# Function to read training data from geopackage or GeoJSON and combine it with raster data
prepare_training_data <- function(geojson_file, aot_data) {
  # execute function to download area of training data
  s2_aot <- download_aot_data(aot_data)
  
  # load geojson file with trainingdata
  trainingsdata <- st_read(geojson_file)
  
  # combine trainingdata with area of interest raster data
  extraction <- extract(s2_aot, trainingsdata, df = TRUE)
  trainingsdata$PolyID <- seq_len(nrow(trainingsdata))
  extraction <- merge(extraction, trainingsdata, by.x = "ID", by.y = "PolyID")
  
  # prepare the trainingdata for the modeltraining
  predictors <- names(s2_aot)
  train_ids <- createDataPartition(extraction$ID, p = 0.1, list = FALSE)
  train_dat <- extraction[train_ids, ]
  train_dat <- train_dat[complete.cases(train_dat[, predictors]), ]
  
  return(train_dat)
}

# Function to train the model
train_model <- function(aoi_data, train_dat, algo) {
  predictors <- names(c(aoi_data[["B02"]], aoi_data[["B03"]], aoi_data[["B04"]], aoi_data[["B08"]]))
  
  if (algo == "knn") {
    model <- train(train_dat[, predictors],
                   train_dat$Label,
                   method = "knn",
                   tuneLength = 10)
  } else {
    model <- train(train_dat[, predictors],
                   train_dat$Label,
                   method = "rf",
                   importance = TRUE,
                   ntree = 500)
  }
  
  return(model)
}

# Function to predict using the trained model
predict_model <- function(aoi_data, model) {
  s2_aoi <- download_aoi_data(aoi_data)
  prediction <- predict(s2_aoi, model)
  return(prediction)
}

# Function to save the prediction for the area of interest
prediction_pdf <- function(prediction){
  # visualize the prediction, this step is optional
  cols <- c("forestgreen", "lightgreen", "beige", "darkblue", "yellow",
            "red", "green", "darkgreen", "darkred", "blue")
  spplot(deratify(prediction), col.regions = cols)

  # save prediction map as PDF, this step is optional
  pdf("/prediction_muenster-knn.pdf")
  spplot(deratify(prediction), maxpixels = ncell(prediction) * 0.4,
         col.regions = cols)
  dev.off()
}

# Function to save the prediction for the area of interest
prediction_png <- function(prediction){
  # visualize the prediction, this step is optional
  cols <- c("forestgreen", "lightgreen", "beige", "darkblue", "yellow",
            "red", "green", "darkgreen", "darkred", "blue")
  spplot(deratify(prediction), col.regions = cols)

  # save prediction map as PNG, this step is optional
  png("/prediction_muenster-knn.png")
  spplot(deratify(prediction), maxpixels = ncell(prediction) * 0.4,
         col.regions = cols)
  dev.off()
}

# Function to save the prediction for the area of interest
prediction_tif <- function(prediction){
  library(raster)
  raster::writeRaster(deratify(prediction),
              filename="/prediction_muenster-knn.tif",
              format="GTiff", overwrite=TRUE)
}

# Fetch AOI data
aoi_data <- fetch_aoi_data(aoi, temp)

# Fetch AOT data
aot_data <- fetch_aot_data(aot, temp)

# Prepare training data
train_dat <- prepare_training_data(geojson_file, aot_data)

# Train the model
model <- train_model(aoi_data, train_dat, algo)

# Predict using the trained model
prediction <- predict_model(aoi_data, model)

# save prediction as pdf
prediction_pdf(prediction)
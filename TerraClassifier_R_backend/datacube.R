# @title: Machine Learning in R - Rasterdata from Münster and Dortmund (Germany)
# @author: Andreas Struffert-Froböse, Dominik Zubel, Jonas Starke, Kieran Galbraith, Lena Lac-Nhien Long, Philip Dyckhof # nolint
# @date: 2023-11-22
# @version: 0.9
# @description: This script is part of the project "Terra Classifier" of the course "Geosoftware 2" at the University of Münster. # nolint
# @encoding: UTF-8
# @language: en

# Delete all variables in the workspace
rm(list = ls())

# Set working directory
setwd("C:/Users/kgalb/Documents/Workspace/R/DataCubes")
list.files()

# load libraries
library(raster)
library(terra)
library(mapview)
library(leaflet)
library(sf)
library(caret)
library(openeo)
library(gdalcubes)
library(rstac)
library(rgdal)

# set necessary parameters, variables and other stuff #
aoi <- c(394861, 420134, 5746419, 5767397) # bbox for area of interest
aot <- c(368285, 418831, 5687228, 5729184) # bbox for area of training
temp1 <- "2021-06-01"
temp2 <- "2021-06-30"
temp <- c(temp1, temp2)

# connect to openEOcubes on AWS
con <- connect("http://54.185.59.127:8000/")
login(user = "k_galb01",
      password = "password")

# load openeo processes
p <- processes()

# fetch data for AoI through openEOcubes
aoi_collection <- p$load_collection(id = "sentinel-s2-l2a-cogs",
                                    spatial_extent = list(west = aoi[1],
                                                          south = aoi[3],
                                                          east = aoi[2],
                                                          north = aoi[4]),
                                    crs = 25832,
                                    temporal_extent = temp)

# filter the AoI data cube for the desired bands
aoi_bands <- p$filter_bands(data = aoi_collection,
                            bands = c("B02", "B03", "B04", "B08"))


# initialize temporary file for the download of the data
temp_file <- tempfile(fileext = ".tif")

# initialize variable to save AoI the data
formats <- list_file_formats()
result <- p$save_result(data = aoi_bands, format = formats$output$GTiff)

# save the AoI data and load it into the environment
compute_result(graph = result, output_file = temp_file)
s2_aoi <- raster::stack(temp_file)


# repeat the process for the AoT #
# fetch data for AoT through openEOcubes
aot_collection <- p$load_collection(id = "sentinel-s2-l2a-cogs",
                                    spatial_extent = list(west = aot[1],
                                                          south = aot[3],
                                                          east = aot[2],
                                                          north = aot[4]),
                                    crs = 25832,
                                    temporal_extent = temp)

# filter the AoT data cube for the desired bands
aot_bands <- p$filter_bands(data = aot_collection,
                            bands = c("B02", "B03", "B04", "B08"))


# initialize temporary file for the download of the data
temp_file_2 <- tempfile(fileext = ".tif")

# initialize variable to save the data
result <- p$save_result(data = aot_bands, format = formats$output$GTiff)

# save the AoT data and load it into the environment
compute_result(graph = result, output_file = temp_file_2)
s2_aot <- raster::stack(temp_file_2)

# write Raster to a file, this step is optional
writeRaster(s2_aoi, "s2_aoi.grd", overwrite = TRUE)
writeRaster(s2_aot, "s2_aot.grd", overwrite = TRUE)

# read training data from geopackage (or GeoJSON)
trainingsdata <- st_read("Trainingspolygone_Dortmund.gpkg")

# combine the raster data with the trainingsdata
extraction <- extract(s2_aot, trainingsdata, df = TRUE)
trainingsdata$PolyID <- seq_len(nrow(trainingsdata))
extraction <- merge(extraction, trainingsdata, by.x = "ID", by.y = "PolyID")

# prepare the model
predictors <- names(s2_aoi)

train_ids <- createDataPartition(extraction$ID, p = 0.1, list = FALSE)
train_dat <- extraction[train_ids, ]
train_dat <- train_dat[complete.cases(train_dat[, predictors]), ]

# train the model with knn (k-nearest neighbor)
model <- train(train_dat[, predictors],
               train_dat$Label,
               method = "knn",
               tuneLength = 10)

# save the created data and the model, this step is optional
saveRDS(extraction, "trainingsdata.rds")
write.csv(extraction, "trainingsdata.csv")
saveRDS(model, file = "RFModel_dortmund.RDS")

# predict the model
prediction <- predict(s2_aoi, model)

# save the prediction, this step is optional
writeRaster(prediction, "prediction_muenster.grd", overwrite = TRUE)

# visualize the prediction, this step is optional
cols <- c("forestgreen", "lightgreen", "beige", "darkblue", "yellow",
          "red", "green", "darkgreen", "darkred", "blue")
spplot(deratify(prediction), col.regions = cols)

# save prediction map as PDF, this step is optional
pdf("C:/Users/kgalb/Documents/Workspace/R/DataCubes/prediction_muenster-knn.pdf") # nolint
spplot(deratify(prediction), maxpixels = ncell(prediction) * 0.4,
       col.regions = cols)
dev.off()

# tests #

# test with Lat/Long coords
s2_collection <- p$load_collection(id = "sentinel-s2-l2a-cogs",
                                   spatial_extent = list(west = 7.466846,
                                                         south = 51.858571,
                                                         east = 7.835575,
                                                         north = 52.047204),
                                   crs = 4326,
                                   temporal_extent = c("2021-06-01", "2021-06-30"))# nolint

# stac test
# p$load_stac takes URL, spatial_extent, temporal_extent, bands and properties
s2_stac = p$load_stac("https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a", # nolint
                      spatial_extent = list(west = 7.47,
                                            south = 52.05,
                                            east = 7.84,
                                            north = 51.86),
                      temporal_extent = c("2021-06-01", "2021-06-30"),
                      bands = c("B02", "B03", "B04", "B08"))
# @title: Machine Learning in R - Rasterdata from Münster and Dortmund (Germany)
# @author: Andreas Struffert-Froböse, Dominik Zubel, Jonas Starke, Kieran Galbraith, Lena Lac-Nhien Long, Philip Dyckhof # nolint
# @date: 2023-11-22
# @version: 0.5
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

# enables gdalcube to use 8 cores from CPU simultaneously
gdalcubes_options(parallel = 4)

# date range for datacube, should be more dynamic in final version
date <- "2021-06-01/2021-06-30"

# bounding box for datacube, should be more dynamic in final version
bbox <- c(7.466846, 51.858571, 7.835575, 52.047204)

# set extent of Datacube for proper cropping

extent_to_crop <- list(left = 394861, right = 420134,
                       bottom = 5746419, top = 5767397,
                       t0 = "2021", t1 = "2021")


# fetch data from AWS through rstac
s <- stac("https://earth-search.aws.element84.com/v0") # API endpoint

items <- s |>
  stac_search(collections = "sentinel-s2-l2a-cogs",
              bbox = bbox,
              datetime = date,
              limit = 500) |>
  post_request() |>
  items_fetch(progress = FALSE)

# create image collection from found items
assets <- c("B01", "B02", "B03", "B04", "B05",
            "B06", "B07", "B08", "B8A",
            "B09", "B11", "SCL") # names for Sentinel-2 bands

s2_collection <- stac_image_collection(items$features, asset_names = assets, property_filter = function(x) {x[["eo:cloud_cover"]] < 10}) # nolint

# create geometry for datacube from image collection
s2_geom <- cube_view(srs = "EPSG:25832", dx = 100, dy = 100, dt = "P1Y",
                     aggregation = "mean", resampling = "bilinear",
                     extent = s2_collection)

# create datacube from image collection, geometry and mask
clear_mask <- image_mask("SCL", values = c(3, 8, 9))

s2_cube <- raster_cube(s2_collection, s2_geom, mask = clear_mask) |>
  select_bands(c("B02", "B03", "B04", "B08")) |>
  apply_pixel("(B08-B04)/(B08+B04)", "NDVI", keep_bands = TRUE)

# crop datacube to given extent of area of interest
s2_cube_cropped <- crop(s2_cube, extent = extent_to_crop, snap = "near")

# plot the datacube, this step is optional
plot(s2_cube_cropped, rgb = 3:1, zlim = c(0, 2500))

# convert datacube to temporary Rasterdata, this step may take a while
s2_raster <- raster::brick(
  write_tif(
    select_bands(
      s2_cube,
      c("B02", "B03", "B04", "B08", "NDVI")
    )
  )
)

# crop Data to AoI and AoT
# münster
s2_aoi <- raster::crop(s2_raster, c(394861, 420134, 5746419, 5767397))
# dortmund
s2_aot <- raster::crop(s2_raster, c(368285, 418831, 5687228, 5729184))

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

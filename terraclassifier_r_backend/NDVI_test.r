# test R script for usage of run_udf process from openeo

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

# connect to openEOcubes on AWS
con <- connect("http://54.185.59.127:8000/")
login(user = "k_galb01",
      password = "password")

# set necessary parameters, variables and other stuff
# this part will be more dynamic in the future
aoi <- c(394861, 420134, 5746419, 5767397) # bbox for area of interest
temp1 <- "2021-06-01"
temp2 <- as.Date(temp1) + 14
temp2 <- as.character(temp2) # convert the date back to a simple string
temp <- c(temp1, temp2)
algo <- "knn"

# load openeo processes
p <- processes()

get_ndvi <- function(data) {

  # filter the AoI data cube for the desired bands
  bands <- p$filter_bands(data = data,
                          bands = c("B04", "B08"))

  aggregation = p$aggregate_temporal_period(data = bands,
                                            period = "month", reducer = "median")

  combined <- ("B08"-"B04")/("B08"+"B04")

  return(combined)
}

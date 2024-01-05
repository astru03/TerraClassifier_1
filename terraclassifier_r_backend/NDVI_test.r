# test R script for usage of run_udf process from openeo

get_ndvi <- function() {
  # filter the AoI data cube for the desired bands
  combined <- ("B08" - "B04") / ("B08" + "B04")
  return(combined)
}
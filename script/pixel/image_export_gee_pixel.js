/****************  LOAD IMAGE COLLECTIONS  ****************/
var imageCollection  = ee.ImageCollection('projects/unicef-ccri/assets/river_flood_r100'),
    imageCollection2 = ee.ImageCollection('projects/unicef-ccri/assets/coastal_flood_r100'),
    imageCollection3 = ee.ImageCollection('projects/unicef-ccri/assets/storm_giri_rp100');

/****************  LOAD INDIVIDUAL IMAGES  ****************/
var asi_image = ee.Image('projects/unicef-ccri/assets/ASI_return_level_100yr');
var sds_img   = ee.Image('projects/unicef-ccri/assets/sand_dust_storm_annual');
var pf_image  = ee.Image('projects/unicef-ccri/assets/Pf_average_2013_2022');
var pv_image  = ee.Image('projects/unicef-ccri/assets/Pv_average_2013_2022');

/****************  BASIC MASKS  ****************/
var filteredASI = asi_image.updateMask(asi_image.lte(100));
var filtered_pf = pf_image.updateMask(pf_image.gte(0));
var filtered_pv = pv_image.updateMask(pv_image.gte(0));
var filtered_sds = sds_img.updateMask(sds_img.gte(0));

/****************  LIST OF RASTERS  ****************/
var imageList = [
  ee.Image('projects/unicef-ccri/assets/ERA5_100yr_RP'),   // reference
  filteredASI,
  ee.Image('projects/unicef-ccri/assets/FIRMS_count_90th_percentile'),
  ee.Image('projects/unicef-ccri/assets/FIRMS_FRP_90th_percentile'),
  ee.Image('projects/unicef-ccri/assets/heatwave_frequency_return_level_100yr'),
  ee.Image('projects/unicef-ccri/assets/heatwave_duration_return_level_100yr'),
  ee.Image('projects/unicef-ccri/assets/heatwave_severity_return_level_100yr'),
  ee.Image('projects/unicef-ccri/assets/high_temp_degree_days_return_level_100yr'),
  ee.Image('projects/unicef-ccri/assets/pm25_p90_1998_2023'),
  filtered_sds,
  filtered_pf,
  filtered_pv,
  ee.Image('projects/unicef-ccri/assets/spei12_period_mean_2014_2024'),
  ee.Image('projects/unicef-ccri/assets/spi12_period_mean_2014_2024')
];

/****************  REFERENCE PROJECTION  ****************/
var referenceImage = ee.Image('projects/unicef-ccri/assets/ERA5_100yr_RP');
var targetScale = referenceImage.projection().nominalScale();
var targetProj  = referenceImage.projection();      // keeps the −pixelHeight

/****************  LAND/SEA MASK  ****************/
var countryBoundaries = ee.FeatureCollection('projects/unicef-ccri/assets/georepo_adm0');

// ---- LAND / SEA MASK  --------------------------------------------
var landSeaMask = ee.Image.constant(0)          // start: all ocean (0)
  .rename('landsea_mask')
  .reproject(targetProj)                        // put it on ERA-5 grid *first*
  .paint(countryBoundaries, 1);                 // paint land pixels = 1
// ------------------------------------------------------------------

/****************  RESAMPLING FUNCTION  ****************/
var resampleImage = function (img) {
  var projected = img.setDefaultProjection(targetProj);
  return projected
    .reduceResolution({
      reducer: ee.Reducer.max(),
      bestEffort: true
    })
    .reproject(targetProj);
};

/****************  RESAMPLE THE THREE MOSAICS  ****************/
var imageCollectionResampled  = resampleImage(imageCollection.mosaic());
var imageCollection2Resampled = resampleImage(imageCollection2.mosaic());
var imageCollection3Resampled = resampleImage(imageCollection3.mosaic());

/****************  RESAMPLE EACH RASTER IN THE LIST  ****************/
var imageListResampled = imageList.map(resampleImage);

/****************  GLOBAL EXPORT FOOTPRINT  ****************/
var globalGeometry = ee.Geometry.Polygon(
  [[[-180,  90],
    [-180, -90],
    [ 180, -90],
    [ 180,  90],
    [-180,  90]]], null, false);

/****************  EXPORT FUNCTION  ****************/
var exportToDrive = function (image, description, folderName) {
  Export.image.toDrive({
    image      : image,
    description: description,
    folder     : folderName,
    region     : globalGeometry,
    scale      : targetScale,
    fileFormat : 'GeoTIFF',
    maxPixels  : 1e9
    // no 'crs' → EE keeps the image's own projection (north-up)
  });
};

/****************  EXPORTS  ****************/
var out_folder = 'ccri_pixel';

exportToDrive(imageCollectionResampled,  'river_flood_100yr_jrc_2024',     out_folder);
exportToDrive(imageCollection2Resampled, 'coastal_flood_100yr_jrc_2024',   out_folder);
exportToDrive(imageCollection3Resampled, 'tropical_storm_100yr_giri_2024', out_folder);
exportToDrive(landSeaMask,               'landSeaMask',                    out_folder);

var imageNames = [
  'agricultural_drought_fao_1984-2023',
  'fire_frequency_nasa_2001-2023',
  'fire_FRP_nasa_2001-2024',
  'heatwave_frequency_ecmwf_2014-2024',
  'heatwave_duration_ecmwf_2014-2024',
  'heatwave_severity_ecmwf_2014-2024',
  'extreme_heat_ecmwf_2014-2024',
  'air_pollution_pm25_1998-2023',
  'sand_dust_storm_unccd_2024',
  'vectorborne_malariapf_2012-2022',
  'vectorborne_malariapv_2012-2022',
  'drought_spei_copernicus_1940-2024',
  'drought_spi_copernicus_1940-2024'
];

imageListResampled.forEach(function (image, idx) {
  exportToDrive(image, imageNames[idx], out_folder);
});

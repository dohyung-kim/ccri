// Load image collections
var imageCollection = ee.ImageCollection("projects/unicef-ccri/assets/river_flood_r100"),
    imageCollection2 = ee.ImageCollection("projects/unicef-ccri/assets/coastal_flood_r100"),
    imageCollection3 = ee.ImageCollection("projects/unicef-ccri/assets/storm_giri_rp100");


var asi_image = ee.Image("projects/unicef-ccri/assets/ASI_cropland_avg_2014_2023");
var sds_img = ee.Image("projects/unicef-ccri/assets/sand_dust_storm_annual");
var pf_image = ee.Image("projects/unicef-ccri/assets/Pf_average_2013_2022");
var pv_image = ee.Image("projects/unicef-ccri/assets/Pv_average_2013_2022");
// Mask values greater than 100
var filteredASI = asi_image.updateMask(asi_image.lte(100));
var filtered_pf = pf_image.updateMask(pf_image.gte(0));
var filtered_pv = pv_image.updateMask(pv_image.gte(0));
var filtered_sds = sds_img.updateMask(sds_img.gte(0));
// Load individual images into a list
var imageList = [
  ee.Image("projects/unicef-ccri/assets/ERA5_100yr_RP"),  // Reference for scale & projection
  filteredASI,
  ee.Image("projects/unicef-ccri/assets/FIRMS_MODIS_Mean_Annual_Count_2001_2023"),
  ee.Image("projects/unicef-ccri/assets/FIRMS_MODIS_Mean_Annual_FRP_2001_2023"),
  ee.Image("projects/unicef-ccri/assets/heatwave_frequency_2014_2023_avg"),
  ee.Image("projects/unicef-ccri/assets/heatwave_duration_2014_2023_avg"),
  ee.Image("projects/unicef-ccri/assets/heatwave_severity_2014_2023_avg"),
  ee.Image("projects/unicef-ccri/assets/extreme_heat_days_2014_2023_avg"),
  ee.Image("projects/unicef-ccri/assets/pm25_2013_2022_avg"),
  filtered_sds,
  filtered_pf,
  filtered_pv,
  //ee.Image("projects/unicef-ccri/assets/JBA_FLSW_resampled"),
  ee.Image("projects/unicef-ccri/assets/sma_copernicus_avg_2015_2024"),
  ee.Image("projects/unicef-ccri/assets/spi_copernicus_avg_2015_2024")
];


// Get the scale and projection from the ERA5 100-year RP layer
//var referenceImage = ee.Image("projects/unicef-ccri/assets/ERA5_100yr_RP");
var targetScale = referenceImage.projection().nominalScale();
var targetCRS = referenceImage.projection();

// Load country boundaries
var countryBoundaries = ee.FeatureCollection('projects/unicef-ccri/assets/admin0_wfp');

// Reproject country boundaries first
var countryBoundariesReprojected = countryBoundaries.map(function(feature) {
  return feature.transform(targetCRS);
});

// Convert vector to raster (1 for land, 0 for sea)
var landSeaMask = ee.Image(1)
  .clip(countryBoundariesReprojected)  // Clip using reprojected boundaries
  .unmask(0)  // Set sea pixels to 0
  .reproject({
    crs: targetCRS,
    scale: targetScale
  })
  .rename('landsea_mask');
  
// Function to resample images using `max` reducer at the reference scale
var resampleImage = function(img) {
  var projectedImage = img.setDefaultProjection(targetCRS, null, targetScale);
  
  return projectedImage.reduceResolution({
    reducer: ee.Reducer.max(),
    bestEffort: true
  }).reproject({
    crs: targetCRS,
    scale: targetScale
  });
};

// Resample image collections (mosaicked)
var imageCollectionResampled = imageCollection.mosaic()
  .setDefaultProjection(targetCRS, null, targetScale)
  .reduceResolution({
    reducer: ee.Reducer.max(),
    bestEffort: true
  }).reproject({
    crs: targetCRS,
    scale: targetScale
  });

var imageCollection2Resampled = imageCollection2.mosaic()
  .setDefaultProjection(targetCRS, null, targetScale)
  .reduceResolution({
    reducer: ee.Reducer.max(),
    bestEffort: true
  }).reproject({
    crs: targetCRS,
    scale: targetScale
  });
  
var imageCollection3Resampled = imageCollection3.mosaic()
  .setDefaultProjection(targetCRS, null, targetScale)
  .reduceResolution({
    reducer: ee.Reducer.max(),
    bestEffort: true
  }).reproject({
    crs: targetCRS,
    scale: targetScale
  });


// Resample all images in `imageList`
var imageListResampled = imageList.map(resampleImage);

// Define a global geometry (covering the entire globe)
var globalGeometry = ee.Geometry.Polygon(
    [[[-180, 90],
      [-180, -90],
      [180, -90],
      [180, 90]]], null, false);

// Function to export images to Google Drive
var exportToDrive = function(image, description, folderName) {
  Export.image.toDrive({
    image: image,
    description: description,
    folder: folderName,
    scale: targetScale,
    region: globalGeometry,
    fileFormat: 'GeoTIFF',
    maxPixels: 1e9
  });
};

var out_folder = 'ccri_pixel'
// Export resampled image collections
exportToDrive(imageCollectionResampled, 'river_flood_100yr_jrc_2024', out_folder);
exportToDrive(imageCollection2Resampled, 'coastal_flood_100yr_jrc_2024', out_folder);
exportToDrive(imageCollection3Resampled, 'tropical_storm_100yr_giri_2024', out_folder);
exportToDrive(landSeaMask, 'landSeaMask', out_folder);

// Export all images in `imageListResampled`
var imageNames = [
  //'ERA5_100yr_RP_resampled',
  'agricultural_drought_fao_1984-2023',
  'fire_frequency_nasa_2001-2023',
  'fire_FRP_nasa_2001-2024',
  'heatwave_frequency_ecmwf_2014-2024',
  'heatwave_duration_ecmwf_2014-2024',
  'heatwave_severity_ecmwf_2014-2024',
  'extreme_heat_ecmwf_2014-2024',
  'air_pollution_pm25_2012-2022',
  'sand_dust_storm_unccd_2024',
  'vectorborne_malariapf_2012-2022',
  'vectorborne_malariapv_2012-2022',
  //'JBA_FLSW_resampled',
  'drought_sma_copernicus_2014-2024',
  'drought_spi_copernicus_2014-2024'
];

imageListResampled.forEach(function(image, index) {
  exportToDrive(image, imageNames[index], out_folder);
});

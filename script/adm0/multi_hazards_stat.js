//original childpop
var org_childpop = ee.ImageCollection("projects/unicef-ccri/assets/childpop_constrained")
// Image to be replaced (by system:index)
var imageToReplaceId = 'tha_T_Under_18_2024_CN_100m_R2024A_v1';
// Load the new image and set the system:index property explicitly
var newImage = ee.Image('projects/unicef-ccri/assets/tha_T_Under_18_2024_CN_100m_R2024A_v1')
                .set('system:index', imageToReplaceId);
// Filter out the old image
var filteredCollection = org_childpop.filter(ee.Filter.neq('system:index', imageToReplaceId));
// Merge the new image back
var childpop = filteredCollection.merge(ee.ImageCollection([newImage]));
var pop_target_res = childpop.first().projection().nominalScale();
print(pop_target_res);
childpop = childpop.mosaic();
var totalpop = ee.Image("projects/unicef-ccri/assets/worldpop_1km");
var totalpop_res = totalpop.projection().nominalScale();
var countryBoundaries = ee.FeatureCollection('projects/unicef-ccri/assets/adm0_simple');

var referenceImage = ee.Image("projects/unicef-ccri/assets/heatwave_frequency_2014_2023_avg");
// List of hazard data with thresholds and names
var hazards = [
  {id: "projects/unicef-ccri/assets/river_flood_r100", threshold: 0.01, name: "river_flood_100yr_jrc_2024"},
  {id: "projects/unicef-ccri/assets/coastal_flood_r100", threshold: 0, name: "coastal_flood_100yr_jrc_2024"},
  {id: "projects/unicef-ccri/assets/JBA_FLSW_resampled", threshold: 0, name: "pluvial_flood_100yr_jbl_2024"},
  {id: "projects/unicef-ccri/assets/storm_giri_rp100", threshold: 17.5, name: "tropical_storm_100yr_giri_2024"},
  {id: "projects/unicef-ccri/assets/ASI_cropland_avg_2014_2023", threshold: 10, name: "agricultural_drought_fao_1984-2023"},
  {id: "projects/unicef-ccri/assets/sma_copernicus_avg_2015_2024", threshold: -0.1, name: "drought_sma_copernicus_1984-2023"},
  {id: "projects/unicef-ccri/assets/spi_copernicus_avg_2015_2024", threshold: -0.1, name: "drought_spi_copernicus_1984-2023"},
  {id: "projects/unicef-ccri/assets/heatwave_frequency_2014_2023_avg", threshold: 'Mean', name: "heatwave_frequency_ecmwf_2014-2024"}, //6.03
  {id: "projects/unicef-ccri/assets/heatwave_duration_2014_2023_avg", threshold: 'Mean', name: "heatwave_duration_ecmwf_2014-2024"}, //35.99
  {id: "projects/unicef-ccri/assets/heatwave_severity_2014_2023_avg", threshold: 'Mean', name: "heatwave_severity_ecmwf_2014-2024"}, //21.19
  {id: "projects/unicef-ccri/assets/extreme_heat_days_2014_2023_avg", threshold: 35, name: "extreme_heat_ecmwf_2014-2024"},
  {id: "projects/unicef-ccri/assets/FIRMS_MODIS_Mean_Annual_FRP_2001_2023", threshold: 'Mean', name: "fire_FRP_nasa_2001-2024"},
  {id: "projects/unicef-ccri/assets/FIRMS_MODIS_Mean_Annual_Count_2001_2023", threshold: 'Mean', name: "fire_frequency_nasa_2001-2023"},
  {id: "projects/unicef-ccri/assets/sand_dust_storm_annual", threshold: 0, name: "sand_dust_storm_unccd_2024"},
  {id: "projects/unicef-ccri/assets/pm25_2013_2022_avg", threshold: 5, name: "air_pollution_pm25_2012-2022"},
  {id: "projects/unicef-ccri/assets/Pv_average_2013_2022", threshold: 0.001, name: "vectorborne_malariapv_2012-2022"},
  {id: "projects/unicef-ccri/assets/Pf_average_2013_2022", threshold: 0.001, name: "vectorborne_malariapf_2012-2022"}
];

var targetScale = referenceImage.projection().nominalScale();
var targetCRS = referenceImage.projection();
// Load country boundaries

// Reproject country boundaries first
var countryBoundariesReprojected = countryBoundaries.map(function(feature) {
  return feature.transform(targetCRS);
});
// Function to summarize population exposure
function summarizePopulation(hazard, adm_level) {
  var hazard_layer;

  // Check if the hazard is an ImageCollection or an ee.Image and process accordingly
  if (hazard.name === "river_flood_100yr_jrc_2024" ||
      hazard.name === "coastal_flood_100yr_jrc_2024" ||
      hazard.name === "tropical_storm_100yr_giri_2024") {
    // If it's one of the ImageCollection hazards, use .mosaic()
    hazard_layer = ee.ImageCollection(hazard.id).mosaic();
  } else {
    // Otherwise, treat it as a single ee.Image
    hazard_layer = ee.Image(hazard.id);
  }

  // Global geometry for any reduce region calculations
  var global_geometry = ee.Geometry.Polygon(
    [[[-180, 90],
      [-180, -90],
      [180, -90],
      [180, 90]]], null, false);
      
  // Get the scale and projection from the ERA5 100-year RP layer
  
  // var targetScale = referenceImage.projection().nominalScale();
  // var targetCRS = referenceImage.projection();
  // // Load country boundaries
  
  // // Reproject country boundaries first
  // var countryBoundariesReprojected = countryBoundaries.map(function(feature) {
  //   return feature.transform(targetCRS);
  // });
  
  // Convert vector to raster (1 for land, 0 for sea)
  var landSeaMask = ee.Image(1)
    .clip(countryBoundariesReprojected)  // Clip using reprojected boundaries
    .unmask(0)  // Set sea pixels to 0
    .reproject({
      crs: targetCRS,
      scale: targetScale
    })
    .rename('landsea_mask');    
    
  // Determine the threshold (TH)
  var TH = hazard.threshold;
  if (TH === 'Mean') {
    // Apply the land/sea mask to the hazard layer so only land pixels are used
    var hazard_layer_masked = hazard_layer.updateMask(landSeaMask);
    
    // Compute the mean only on land
    TH = hazard_layer_masked.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: global_geometry,
      scale: hazard_layer.projection().nominalScale(),
      bestEffort: true
    }).values().get(0);
    
    // Ensure TH is a number
    TH = ee.Number(TH);
    
    print('Mean TH on land:', TH);
  }

  var exposed_population;
  // Check if threshold (TH) is positive or negative and apply masking accordingly
  // Check if the hazard is agricultural_drought_fao_1984-2023
  if (hazard.name === "agricultural_drought_fao_1984-2023") {
    // Apply mask where hazard_layer is less than or equal to 100
    hazard_layer = hazard_layer.updateMask(hazard_layer.lte(100));  // Use 'lte' for <= 100
    exposed_population = childpop.updateMask(hazard_layer.gt(TH));  // Exposed population where hazard <= 100
  } else {
    // For other hazards, check if threshold is negative or positive
    if (TH < 0) {
      exposed_population = childpop.updateMask(hazard_layer.lt(TH));  // Exposed population when hazard < 0
    } else {
      exposed_population = childpop.updateMask(hazard_layer.gt(TH));  // Exposed population when hazard > 0
    }
  }

  return exposed_population.rename(hazard.name);
}

var populationMasks = hazards.map(function(hazard) {
  var img = summarizePopulation(hazard);
  Map.addLayer(img, {}, hazard.name);
  return img;
});

// === Stack the exposure images and count number of overlapping hazards ===
var stacked = ee.ImageCollection(populationMasks).toBands();
var hazardCount = stacked.reduce(ee.Reducer.count()).rename('hazard_count');

// === Add combined count layer to the map ===
var magma10 = [
  '#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60',
  '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'
];
Map.addLayer(hazardCount, {
  min: 1,
  max: 10,
  palette: magma10
}, 'Hazard Count (magma10)');

// === Mask population where at least 1 hazard occurs and add hazard count as band ===
var exposedPop = childpop.updateMask(hazardCount.gte(1));
var popWithHazardCount = exposedPop.addBands(hazardCount);


// === Export child population exposed to exactly N hazards (1 to 17) ===
ee.List.sequence(1, hazards.length).getInfo().forEach(function(n) {
  var maskN = childpop.updateMask(hazardCount.eq(n)).rename('child_pop_exposed_' + n + '_hazards');
  var summary = maskN.reduceRegions({
    collection: countryBoundariesReprojected.map(function(f) {
      return f.setMulti(f.toDictionary(['ISO3', 'name', 'ucode']));
    }),
    reducer: ee.Reducer.sum(),
    scale: pop_target_res,
    crs: 'EPSG:4326'
  });

  Export.table.toDrive({
    collection: summary,
    description: 'child_pop_exposed_' + n + '_hazards',
    fileFormat: 'CSV',
    selectors: ['ISO3', 'name', 'ucode', 'sum'],
    folder: 'CCRI_results_misc'
  });
});

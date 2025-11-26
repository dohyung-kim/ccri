# SDMX README
### This file describes the information for SDMX formatting and CCRI combined file.

`ccri_combined_file.ipynb` combines the Pillar 1 (P1) and Pillar 2 (P2) CCRI exposure layers into a single csv file for further visualization.

The hazard layers are already defined with specific names. 

P1 Hazards:
* River Flood: rfl
* Coastal Flood: cfl
* Tropical Storm: ts
* Agricultural Drought: agdr
* Drought SPEI: metdr_spei
* Drought SPI: metdr_spi
* Heatwave Frequency: hw_fre
* Heatwave Severity: hw_sev
* Heatwave Duration: hw_dur
* Extreme Heat: ext
* Fire Frequency: fr_fre
* Fire FRP: fr_int
* Sand Dust Storm: sds
* Vectorborne Malaria PV: mal_pv
* Vectorborne Malaria PF: mal_pf
* Air Pollution: pm25

P2 Hazards:
* P2 Immunization DTP1: hea_dtp1
* P2 Immunication DTP3: hea_dtp3
* P2 Birth Attendant Y15Y19: hea_skat
* P2 Electricity Access: hea_elec
* P2 Nutrition Stunting Modeled: nut_stu
* P2 Food Poverty: nut_fpov
* P2 WASH Drinking Water: wash_wat
* P2 WASH Drinking Sanitation: wash_san
* P2 Basic Hygiene: wash_hyg
* P2 LSCED: edu_lsos
* P2 ED CR L2: edu_lscr
* P2 Learning Poverty: edu_lpov
* P2 Pt Labor: pro_lab
* P2_Child_Marriage: pro_mar
* P2 Child Poverty: prov_md
* P2 Social Protection: prov_u5sp
* P2 Under 5 Mortality: sur_u5mor

`script/sdm_formatting/sdmx_formatting.ipynb` processes the hazard layers into the final SDMX format for the database.
The headings are determined by the broader team, they are as follows:
* DATAFLOW = UNICEF_DRAFT:DRAFT_HAZARD_EXPOSURE(1.0)
* REF_AREA = Unique ucode for the AOI
* INDICATOR = Refers to the hazard exposure (i.e. Total River Flood exposure is HAZ_RFL_EXP_TOT)
* SEX = Refers to the sex of the exposed population. _T is all sexes, M is male, F is female.
* AGE = Refers to the age of the exposed population. _T refers to all population, Y0T17 refers to under 18.
* GEO_LEVEL = Refers to the AOI level for which the hazard layer. COUNTRY for country-level, REGION for all other levels.
* MEASURE = The measurement type referring to OBS_VALUE. This is one of EXPOSURE_ABSOLUTE, EXPOSURE_RELATIVE, Max, Median, Min, Mean.
* ISO3_PARENT = Parent ISO3 code to the AOI
* ADMIN_LEVEL = Administrative level of the AOI
* TIME_PERIOD = Time period that measure is relevant for (2024/2025)
* OBS_VALUE = Observational value for the hazard exposure.
* UNICEF_RO = UNICEF Regional Office corresponding to the AOI
* WB_INCOME = World Bank income corresponding to the ISO3
* UNIT_MEASURE = Measurement unit of NUMBER or PCNT for exposure. "NUMBER" if MEASURE is one of EXPOSURE_ABSOLUTE, Mean, Median, Max, Min. "PCNT" if MEASURE is EXPOSURE_RELATIVE

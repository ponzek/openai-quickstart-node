// Catalog of the course datasets. Each entry points to a CSV served from /public/data.
export const SAMPLE_DATASETS = {
  jwst: {
    name: "JWST Exoplanet Observations Summary",
    source: "NASA Exoplanet Archive - JWST observations table",
    file: "/data/jwst_observations_summary.csv",
    icon: "🪐",
    defaultX: "PL_NAME",
    defaultY: "OBSERVATION_DUR",
  },
  co2: {
    name: "NOAA Mauna Loa Annual Mean CO2",
    source: "NOAA Global Monitoring Laboratory (co2_annmean_mlo)",
    file: "/data/noaa_co2_annmean_mlo.csv",
    icon: "📈",
    defaultX: "year",
    defaultY: "mean",
  },
  earthquakes: {
    name: "USGS Significant Earthquakes 1965-2016",
    source: "USGS / ISC-GEM earthquake database",
    file: "/data/usgs_earthquakes.csv",
    icon: "🌋",
    defaultX: "Date",
    defaultY: "Magnitude",
  },
};

export const DEFAULT_DATASET_KEY = "jwst";

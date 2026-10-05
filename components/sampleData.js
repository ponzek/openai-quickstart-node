// Catalog of the course datasets. Each entry points to the original CSV filenames
// copied into /public/data so they are included in local runs and Vercel deploys.
export const SAMPLE_DATASETS = {
  jwst: {
    name: "table_observations_summary.csv",
    source: "NASA Exoplanet Archive - JWST observations table",
    file: "/data/table_observations_summary.csv",
    icon: "🪐",
    defaultX: "PL_NAME",
    defaultY: "OBSERVATION_DUR",
  },
  co2: {
    name: "co2_annmean_mlo.csv",
    source: "NOAA Global Monitoring Laboratory (co2_annmean_mlo)",
    file: "/data/co2_annmean_mlo.csv",
    icon: "📈",
    defaultX: "year",
    defaultY: "mean",
  },
  earthquakes: {
    name: "USGP database.csv",
    source: "USGS / ISC-GEM earthquake database",
    file: "/data/USGP%20database.csv",
    icon: "🌋",
    defaultX: "Date",
    defaultY: "Magnitude",
  },
};

export const DEFAULT_DATASET_KEY = "jwst";

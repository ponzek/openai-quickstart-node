# DataPulse AI

Scientific data visualization and AI analysis studio for Kean University CPS 5745.

## What It Does

- Loads three bundled course datasets: JWST exoplanet observations, NOAA Mauna Loa annual CO2, and USGS significant earthquakes.
- Supports custom CSV or JSON uploads.
- Builds interactive bar, line, area, and doughnut charts.
- Lets users choose X and Y axes from the active dataset.
- Shows summary statistics and a raw data preview table.
- Provides an AI analysis chat for trends, outliers, hypotheses, and chart recommendations.
- Falls back to local deterministic analysis if the OpenAI API key is missing or unavailable, so the demo still works.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js, usually:

```text
http://localhost:3000
```

If that port is already taken, Next.js may use another port such as:

```text
http://localhost:3001
```

## OpenAI Setup

Create a `.env` file in this folder:

```text
OPENAI_API_KEY=your_api_key_here
```

The app can run without the key, but live AI responses require it.

## Build Check

```bash
npm run build
```


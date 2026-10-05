import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PALETTE = [
  "#38bdf8", // Sky blue
  "#818cf8", // Indigo
  "#c084fc", // Purple
  "#f472b6", // Pink
  "#fb7185", // Rose
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#60a5fa", // Blue
  "#a78bfa", // Violet
  "#4ade80", // Green
];

const MAX_POINTS = 100;
const MAX_GROUPS = 40;

// Large datasets are grouped and averaged so the chart stays readable and fast.
function prepareSeries(data, xAxis, yAxis) {
  if (data.length <= MAX_POINTS) {
    return {
      labels: data.map((row) => String(row[xAxis] ?? "")),
      values: data.map((row) => {
        const v = parseFloat(row[yAxis]);
        return isNaN(v) ? 0 : v;
      }),
      note: null,
    };
  }

  const isDate = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(data[0][xAxis]));
  const groups = new Map();
  for (const row of data) {
    const v = parseFloat(row[yAxis]);
    if (isNaN(v)) continue;
    const raw = String(row[xAxis] ?? "");
    const key = isDate ? raw.slice(-4) : raw;
    const g = groups.get(key) || { sum: 0, n: 0 };
    g.sum += v;
    g.n += 1;
    groups.set(key, g);
  }

  let entries = [...groups].map(([k, g]) => ({ k, v: g.sum / g.n, n: g.n }));
  if (isDate) {
    entries.sort((a, b) => a.k.localeCompare(b.k));
  } else {
    entries.sort((a, b) => b.n - a.n);
    entries = entries.slice(0, MAX_GROUPS);
  }

  return {
    labels: entries.map((e) => e.k),
    values: entries.map((e) => parseFloat(e.v.toFixed(3))),
    note: `average ${yAxis} per ${isDate ? "year" : xAxis}, ${data.length.toLocaleString()} rows`,
  };
}

export default function DataChart({ chartType, data, xAxis, yAxis }) {
  if (!data || data.length === 0 || !xAxis || !yAxis) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
        Select X and Y axes to display the visualization.
      </div>
    );
  }

  const { labels, values: rawValues, note } = prepareSeries(data, xAxis, yAxis);

  const chartData = {
    labels,
    datasets: [
      {
        label: yAxis,
        data: rawValues,
        backgroundColor:
          chartType === "doughnut"
            ? labels.map((_, i) => PALETTE[i % PALETTE.length])
            : "rgba(56, 189, 248, 0.75)",
        borderColor:
          chartType === "doughnut"
            ? "#0f172a"
            : "#38bdf8",
        borderWidth: 2,
        borderRadius: chartType === "bar" ? 6 : 0,
        fill: chartType === "area",
        tension: 0.35,
        pointBackgroundColor: "#38bdf8",
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#e2e8f0",
          font: { family: "'Inter', sans-serif", size: 12, weight: "500" },
        },
      },
      title: {
        display: true,
        text: note ? `${yAxis} by ${xAxis} (${note})` : `${yAxis} by ${xAxis}`,
        color: "#f8fafc",
        font: { family: "'Inter', sans-serif", size: 15, weight: "600" },
        padding: { bottom: 16 },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#38bdf8",
        bodyColor: "#f8fafc",
        borderColor: "#334155",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales:
      chartType === "doughnut"
        ? {}
        : {
            x: {
              grid: { color: "rgba(148, 163, 184, 0.1)" },
              ticks: { color: "#94a3b8", maxRotation: 45, minRotation: 0 },
            },
            y: {
              grid: { color: "rgba(148, 163, 184, 0.1)" },
              ticks: { color: "#94a3b8" },
            },
          },
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "360px" }}>
      {chartType === "bar" && <Bar data={chartData} options={options} />}
      {chartType === "line" && <Line data={chartData} options={options} />}
      {chartType === "area" && <Line data={chartData} options={options} />}
      {chartType === "doughnut" && <Doughnut data={chartData} options={options} />}
    </div>
  );
}

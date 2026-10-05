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

export default function DataChart({ chartType, data, xAxis, yAxis }) {
  if (!data || data.length === 0 || !xAxis || !yAxis) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
        Select X and Y axes to display the visualization.
      </div>
    );
  }

  const labels = data.map((row) => String(row[xAxis] ?? ""));
  const rawValues = data.map((row) => {
    const v = parseFloat(row[yAxis]);
    return isNaN(v) ? 0 : v;
  });

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
        text: `${yAxis} by ${xAxis}`,
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

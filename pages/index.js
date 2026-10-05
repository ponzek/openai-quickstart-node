import Head from "next/head";
import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Papa from "papaparse";
import styles from "./index.module.css";
import { SAMPLE_DATASETS, DEFAULT_DATASET_KEY } from "../components/sampleData";

// Dynamically import Chart to prevent SSR hydration errors with Canvas
const DataChart = dynamic(() => import("../components/DataChart"), {
  ssr: false,
  loading: () => (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
      Initializing scientific telemetry & visualizer...
    </div>
  ),
});

const TABLE_ROW_LIMIT = 100;

export default function Home() {
  const [currentDatasetKey, setCurrentDatasetKey] = useState(DEFAULT_DATASET_KEY);
  const [datasetName, setDatasetName] = useState("Loading dataset...");
  const [datasetSource, setDatasetSource] = useState("");
  const [data, setData] = useState([]);
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [chartType, setChartType] = useState("bar"); // bar, line, area, doughnut

  // AI Chat state
  const [inputPrompt, setInputPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome to **CosmoPulse AI**.\n\nThree course datasets are available: the **JWST exoplanet observations summary**, **NOAA Mauna Loa annual CO2**, and the **USGS significant earthquakes 1965-2016** database. Pick one above or upload your own CSV/JSON, then ask me about trends, outliers, or correlations.",
    },
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatScrollRef = useRef(null);

  // Derive column information
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return columns.filter((col) => {
      const val = data.find((row) => row[col] !== null && row[col] !== undefined)?.[col];
      return typeof val === "number" || (!isNaN(parseFloat(val)) && isFinite(val));
    });
  }, [data, columns]);

  const categoricalColumns = useMemo(() => {
    return columns.filter((col) => !numericColumns.includes(col));
  }, [columns, numericColumns]);

  // Compute summary stats for the active Y axis
  const stats = useMemo(() => {
    if (!data || data.length === 0 || !yAxis) return { count: 0, sum: 0, mean: 0, max: 0, min: 0 };
    const values = data
      .map((row) => parseFloat(row[yAxis]))
      .filter((val) => !isNaN(val));

    if (values.length === 0) return { count: data.length, sum: 0, mean: 0, max: 0, min: 0 };
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = (sum / values.length).toFixed(2);
    const max = Math.max(...values);
    const min = Math.min(...values);

    return {
      count: data.length,
      sum: sum.toLocaleString(),
      mean: parseFloat(mean).toLocaleString(),
      max: max.toLocaleString(),
      min: min.toLocaleString(),
    };
  }, [data, yAxis]);

  // Auto-scroll chat window when new message arrives
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAiLoading]);

  // Load one of the bundled CSV datasets from /public/data
  const handleSelectSample = (key, announce = true) => {
    const sample = SAMPLE_DATASETS[key];
    if (!sample) return;
    setCurrentDatasetKey(key);
    setDatasetName(`Loading ${sample.name}...`);
    Papa.parse(sample.file, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      comments: "#",
      complete: (results) => {
        const rows = results.data;
        setDatasetName(sample.name);
        setDatasetSource(sample.source);
        setData(rows);
        setXAxis(sample.defaultX);
        setYAxis(sample.defaultY);
        if (announce) {
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Loaded **${sample.name}**: ${rows.length.toLocaleString()} rows, ${Object.keys(rows[0] || {}).length} columns.\n*Source: ${sample.source}*`,
            },
          ]);
        }
      },
      error: (err) => alert("Failed to load dataset: " + err.message),
    });
  };

  // Auto-load the default dataset when the page opens
  useEffect(() => {
    handleSelectSample(DEFAULT_DATASET_KEY, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for custom file upload (CSV or JSON)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const isCsv = fileName.endsWith(".csv");
    const isJson = fileName.endsWith(".json");

    if (!isCsv && !isJson) {
      alert("Please upload a valid .csv or .json scientific data file.");
      return;
    }

    const reader = new FileReader();

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        comments: "#",
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            applyUploadedData(fileName, results.data);
          } else {
            alert("No observational data found in the CSV file.");
          }
        },
        error: (err) => alert("Failed to parse CSV: " + err.message),
      });
    } else {
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          const dataArray = Array.isArray(parsed) ? parsed : parsed.data || [];
          if (dataArray.length > 0) {
            applyUploadedData(fileName, dataArray);
          } else {
            alert("JSON must contain an array of data records.");
          }
        } catch (err) {
          alert("Invalid scientific JSON file: " + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const applyUploadedData = (name, rows) => {
    setCurrentDatasetKey("custom");
    setDatasetName(name);
    setDatasetSource("User Uploaded File");
    setData(rows);

    const cols = Object.keys(rows[0] || {});
    const numCols = cols.filter((col) => {
      const v = rows[0][col];
      return typeof v === "number" || (!isNaN(parseFloat(v)) && isFinite(v));
    });

    const defaultXCol = cols.find((c) => !numCols.includes(c)) || cols[0];
    const defaultYCol = numCols[0] || cols[1] || cols[0];

    setXAxis(defaultXCol);
    setYAxis(defaultYCol);

    setChatMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `📡 Ingested dataset **${name}** containing **${rows.length} observation points** across **${cols.length} variables**!\n\nParameters: \`${cols.join(", ")}\`.\nTelemetry visualizer & AI inference engine updated.`,
      },
    ]);
  };

  // Handler to export/download active dataset as a CSV file
  const downloadCsv = () => {
    if (!data || data.length === 0) return;
    const csvString = Papa.unparse(data);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${datasetName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger AI inquiry
  const sendAiQuestion = async (userPromptText) => {
    const question = userPromptText || inputPrompt;
    if (!question.trim() || isAiLoading) return;

    const newHistory = [...chatMessages, { role: "user", content: question }];
    setChatMessages(newHistory);
    setInputPrompt("");
    setIsAiLoading(true);

    const datasetSummary = {
      name: datasetName,
      rowCount: data.length,
      columns,
      numericColumns,
      categoricalColumns,
      activeX: xAxis,
      activeY: yAxis,
      stats: {
        activeMetric: yAxis,
        ...stats,
      },
      sampleRows: data.slice(0, 6),
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          datasetSummary,
          history: chatMessages.slice(-6),
        }),
      });

      const resData = await response.json();
      if (resData.success) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: resData.reply },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Error from AI: ${resData.error || "Failed to generate insights."}`,
          },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Scientific API network error: ${err.message}`,
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>CosmoPulse AI | Scientific Data Studio by Karina Ponze</title>
        <meta
          name="description"
          content="AI-powered Scientific Data Visualization and Statistical Telemetry Studio by Karina Ponze"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* NAVBAR */}
      <header className={styles.navbar}>
        <div className={styles.navBrand}>
          <div className={styles.navLogo}>🪐</div>
          <div>
            <h1 className={styles.navTitle}>CosmoPulse AI</h1>
            <div className={styles.navAuthor}>
              Scientific Data Visualization • <span>Karina Ponze</span> | Kean CPS 5745
            </div>
          </div>
        </div>
        <div className={styles.navBadge}>
          <span className={styles.statusDot}></span>
          <span>OpenAI gpt-4o-mini Live</span>
        </div>
      </header>

      {/* MAIN VIEW */}
      <main className={styles.main}>
        {/* HERO TITLE */}
        <section className={styles.hero}>
          <h2 className={styles.heroTitle}>
            Scientific <span className={styles.heroGradient}>Data Telemetry</span> & AI Studio
          </h2>
          <p className={styles.heroSubtitle}>
            Explore astrophysics, CRISPR genomics, hydrothermal ecosystems, and subatomic physics.
            Upload custom empirical datasets (CSV/JSON), plot dynamic charts, and collaborate with AI for scientific discovery.
          </p>
        </section>

        {/* DATASETS & UPLOAD CONTROL CARD */}
        <section className={styles.controlCard}>
          <div className={styles.controlHeader}>
            <div className={styles.sectionLabel}>
              <span>🔬</span> Active Dataset:{" "}
              <strong style={{ color: "#fff", marginLeft: 6 }}>{datasetName}</strong>
              {datasetSource && (
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "#38bdf8",
                    background: "rgba(56, 189, 248, 0.12)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    marginLeft: "10px",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                  }}
                >
                  ✓ {datasetSource}
                </span>
              )}
            </div>

            {/* Custom file upload & download */}
            <div className={styles.uploadRow}>
              <button
                type="button"
                className={styles.downloadBtn}
                onClick={downloadCsv}
                title="Download this real scientific dataset as a CSV file to your computer"
              >
                <span>📥 Download CSV</span>
              </button>
              <label className={styles.uploadBtn}>
                <span>⬆️ Upload CSV / JSON</span>
                <input
                  type="file"
                  accept=".csv,.json"
                  className={styles.fileInput}
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {/* Quick sample chips */}
          <div className={styles.sampleChips}>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>
              Course Datasets:
            </span>
            {Object.entries(SAMPLE_DATASETS).map(([key, item]) => (
              <button
                key={key}
                className={`${styles.sampleChip} ${
                  currentDatasetKey === key ? styles.sampleChipActive : ""
                }`}
                onClick={() => handleSelectSample(key)}
              >
                {item.icon} {item.name}
              </button>
            ))}
          </div>
        </section>

        {/* SUMMARY KPI CARDS */}
        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Observations (Rows)</span>
            <span className={styles.statValue}>{stats.count}</span>
            <span className={styles.statSub}>Data points</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Variables (Cols)</span>
            <span className={styles.statValue}>{columns.length}</span>
            <span className={styles.statSub}>Parameters tracked</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Mean Value ({yAxis})</span>
            <span className={styles.statValue}>{stats.mean}</span>
            <span className={styles.statSub}>Empirical average</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Peak Recorded ({yAxis})</span>
            <span className={styles.statValue}>{stats.max}</span>
            <span className={styles.statSub}>Min threshold: {stats.min}</span>
          </div>
        </section>

        {/* TWO COLUMN WORKSPACE: CHART & AI ASSISTANT */}
        <section className={styles.workspaceGrid}>
          {/* LEFT: INTERACTIVE CHART ENGINE */}
          <div className={styles.chartCard}>
            <div className={styles.chartToolbar}>
              {/* Chart type switcher */}
              <div className={styles.chartTabs}>
                {["bar", "line", "area", "doughnut"].map((type) => (
                  <button
                    key={type}
                    className={`${styles.chartTab} ${
                      chartType === type ? styles.chartTabActive : ""
                    }`}
                    onClick={() => setChartType(type)}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Axis selectors */}
              <div className={styles.axisSelects}>
                <div className={styles.selectGroup}>
                  <label htmlFor="xAxisSelect">X-Axis:</label>
                  <select
                    id="xAxisSelect"
                    className={styles.selectInput}
                    value={xAxis}
                    onChange={(e) => setXAxis(e.target.value)}
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.selectGroup}>
                  <label htmlFor="yAxisSelect">Y-Axis:</label>
                  <select
                    id="yAxisSelect"
                    className={styles.selectInput}
                    value={yAxis}
                    onChange={(e) => setYAxis(e.target.value)}
                  >
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Render dynamic chart */}
            <DataChart
              chartType={chartType}
              data={data}
              xAxis={xAxis}
              yAxis={yAxis}
            />
          </div>

          {/* RIGHT: AI SCIENTIFIC ANALYST CONVERSATION */}
          <div className={styles.aiCard}>
            <div className={styles.aiHeader}>
              <h3 className={styles.aiTitle}>
                <span>🤖</span> Scientific AI Co-Pilot
              </h3>
              <span className={styles.aiModelBadge}>OpenAI GPT-4o-mini</span>
            </div>

            {/* Quick action insight buttons */}
            <div className={styles.quickPrompts}>
              <button
                className={styles.quickPromptBtn}
                onClick={() =>
                  sendAiQuestion(
                    "Evaluate the scientific patterns, correlations, and physical implications of this dataset."
                  )
                }
              >
                🔭 Scientific Synthesis
              </button>
              <button
                className={styles.quickPromptBtn}
                onClick={() =>
                  sendAiQuestion(
                    "Analyze which observations stand out as potential anomalies, extreme outliers, or candidates for further laboratory investigation."
                  )
                }
              >
                🧬 Detect Anomalies
              </button>
              <button
                className={styles.quickPromptBtn}
                onClick={() =>
                  sendAiQuestion(
                    "Propose 3 testable scientific hypotheses or next experimental steps suggested by these results."
                  )
                }
              >
                🔬 Formulate Hypotheses
              </button>
              <button
                className={styles.quickPromptBtn}
                onClick={() =>
                  sendAiQuestion(
                    "Recommend the best visual telemetry representation and axis scaling for this empirical data."
                  )
                }
              >
                📊 Telemetry Strategy
              </button>
            </div>

            {/* Chat conversation area */}
            <div className={styles.chatHistory} ref={chatScrollRef}>
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`${styles.chatBubble} ${
                    msg.role === "user"
                      ? styles.userBubble
                      : styles.assistantBubble
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {isAiLoading && (
                <div
                  className={`${styles.chatBubble} ${styles.assistantBubble}`}
                  style={{ fontStyle: "italic", color: "#94a3b8" }}
                >
                  Computing empirical correlations and AI synthesis... ⏳
                </div>
              )}
            </div>

            {/* User prompt form */}
            <form
              className={styles.chatInputForm}
              onSubmit={(e) => {
                e.preventDefault();
                sendAiQuestion();
              }}
            >
              <input
                type="text"
                className={styles.chatInput}
                placeholder="Ask scientific questions about this dataset..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
              />
              <button
                type="submit"
                className={styles.chatSendBtn}
                disabled={isAiLoading || !inputPrompt.trim()}
              >
                Analyze
              </button>
            </form>
          </div>
        </section>

        {/* RAW DATA TABLE PREVIEW */}
        <section className={styles.tableCard}>
          <div className={styles.controlHeader}>
            <div className={styles.sectionLabel}>
              <span>📋</span> Scientific Telemetry Table ({data.length.toLocaleString()} observations)
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              {data.length > TABLE_ROW_LIMIT
                ? `Showing first ${TABLE_ROW_LIMIT} of ${data.length.toLocaleString()} rows`
                : "Full parameter breakdown"}
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, TABLE_ROW_LIMIT).map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ color: "#64748b" }}>{idx + 1}</td>
                    {columns.map((col) => (
                      <td key={col}>{String(row[col] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div>
          <strong>CosmoPulse AI</strong> • Designed and Engineered by{" "}
          <strong>Karina Ponze</strong>
        </div>
        <div>Kean University | CPS 5745 — Advanced Programming & AI Integration</div>
      </footer>
    </div>
  );
}

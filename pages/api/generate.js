import OpenAI from "openai";

const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
const openai = hasApiKey
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

function toNumber(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function localDatasetInsight(message, datasetSummary = {}) {
  const stats = datasetSummary.stats || {};
  const rows = datasetSummary.sampleRows || [];
  const metric = stats.activeMetric || datasetSummary.activeY || "the selected metric";
  const numericColumns = datasetSummary.numericColumns || [];
  const columns = datasetSummary.columns || [];

  const values = rows
    .map((row) => toNumber(row[metric]))
    .filter((value) => value !== null);

  const sampleTrend =
    values.length >= 2
      ? values[values.length - 1] > values[0]
        ? "The visible sample trends upward across the first records."
        : values[values.length - 1] < values[0]
        ? "The visible sample trends downward across the first records."
        : "The visible sample stays roughly flat across the first records."
      : "The selected metric needs more numeric sample values before a trend can be estimated.";

  return `**Local analysis mode**\n\nThe OpenAI API is not configured or did not respond, so I generated a deterministic summary from the dataset metadata already loaded in the app.\n\n**Dataset:** ${datasetSummary.name || "Current dataset"}\n\n**Shape:** ${Number(datasetSummary.rowCount || 0).toLocaleString()} rows and ${columns.length} columns.\n\n**Selected view:** ${datasetSummary.activeY || metric} by ${datasetSummary.activeX || "the selected x-axis"}.\n\n**Key statistics for ${metric}:** mean ${stats.mean ?? "n/a"}, minimum ${stats.min ?? "n/a"}, maximum ${stats.max ?? "n/a"}.\n\n**Quick read:** ${sampleTrend}\n\n**Useful next questions:** compare ${numericColumns.slice(0, 3).join(", ") || "the numeric fields"}, switch chart types, and look for outliers near the minimum and maximum values.\n\n**Your question:** ${message || "No specific question provided."}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { message, datasetSummary, history } = req.body;

    if (!message && (!history || history.length === 0)) {
      return res.status(400).json({ error: "Message or history is required." });
    }

    if (!hasApiKey) {
      return res.status(200).json({
        success: true,
        reply: localDatasetInsight(message, datasetSummary),
        fallback: true,
      });
    }

    // Build the system prompt with dataset context if available
    let systemPrompt = `You are DataPulse AI, an intelligent data science and visualization assistant created for Karina Ponze's Data Visualization application (Kean University CPS 5745).
Your role is to help users understand their uploaded data, identify significant trends, calculate key metrics, suggest optimal charts, and explain statistical findings in clean, accessible English.`;

    if (datasetSummary) {
      systemPrompt += `\n\n--- CURRENT DATASET CONTEXT ---
Filename / Name: ${datasetSummary.name || "Custom Dataset"}
Total Rows: ${datasetSummary.rowCount || 0}
Total Columns: ${(datasetSummary.columns || []).join(", ")}
Numeric Columns: ${(datasetSummary.numericColumns || []).join(", ") || "None"}
Categorical Columns: ${(datasetSummary.categoricalColumns || []).join(", ") || "None"}
Summary Statistics: ${JSON.stringify(datasetSummary.stats || {})}
Sample Data (first few records):
${JSON.stringify(datasetSummary.sampleRows || [], null, 2)}
-------------------------------
When answering questions about the data, reference actual column names, values, and trends from this dataset context. Format answers using markdown with bold highlights, bullet points, and clear sections.`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
    ];

    if (Array.isArray(history)) {
      // Append past user and assistant messages (excluding system)
      for (const h of history) {
        if (h.role === "user" || h.role === "assistant") {
          messages.push({ role: h.role, content: h.content });
        }
      }
    }

    if (message) {
      messages.push({ role: "user", content: message });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = completion.choices[0]?.message?.content || "No response generated.";
    return res.status(200).json({ success: true, reply });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return res.status(200).json({
      success: true,
      reply: localDatasetInsight(req.body?.message, req.body?.datasetSummary),
      fallback: true,
    });
  }
}

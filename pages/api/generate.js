import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    return res.status(500).json({
      error: error.message || "An error occurred while contacting OpenAI API.",
    });
  }
}

const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

// Initialize OpenAI client with backend env var
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Proxy endpoint for GPT completions
router.post("/openai", async (req, res) => {
  try {
    const { messages, config } = req.body;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: config?.temperature ?? 1,
      top_p: config?.top_p ?? 1,
      max_tokens: config?.max_tokens ?? 512,
    });

    res.json({ reply: completion.choices[0].message });
  } catch (err) {
    console.error("OpenAI request failed:", err);
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

module.exports = router;

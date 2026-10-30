/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5174);
const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

app.use(express.json());

// Lazy-initialization of Gemini client to prevent startup crashes if key is missing.
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Check if Gemini is configured (for the UI indicator)
app.get("/api/ai/status", (req, res) => {
  const isConfigured = !!process.env.GEMINI_API_KEY;
  res.json({ configured: isConfigured });
});

// AI Business Assistant Proxy
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history, company, currency, contextData } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required." });
      return;
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (keyErr: any) {
      // Return a friendly educational message instead of crashing
      res.status(200).json({
        sender: "AI",
        message: `⚠️ **AI Business Assistant is currently offline**\n\nThe **GEMINI_API_KEY** is missing from the environment. To activate this intelligent feature:\n\n1. Click **Settings** (gear icon) in the top right.\n2. Open **Secrets**.\n3. Add a secret with Name \`GEMINI_API_KEY\` and your Google Gemini API Key as the value.\n4. Close and re-test! \n\n*Note: To help you test in the meantime, here is a quick simulated assessment of **${company.name}**: Our current inventory looks stable, but we should focus on boosting high-margin items like our specialty offerings!*`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Format company metrics for the prompt
    const { products, metrics, forecasts, promotions, lowStockCount } = contextData || {};
    const currencySymbol = currency === "USD" ? "$" : "Rp";

    const systemInstruction = `You are AIBISPRO AI, a senior elite virtual business consultant specialized in food and beverage, restaurants, cafes, and cloud kitchens.
You are currently advising the management of "${company.name}" (Type: ${company.type}, Branches: ${company.branches}, Location: ${company.location}).
Your objective is to provide high-fidelity, actionable, and mathematically accurate financial and strategic consulting.

Current active currency for reports: ${currency} (Symbol: ${currencySymbol}).
All financial metrics and product prices provided in the context are initially in Indonesian Rupiah (IDR).
If the current currency is USD, you MUST convert all figures using the exchange rate: 1 USD = Rp 16,000 (e.g. Rp 32,000 becomes $2.00, or Rp 16,000,000 becomes $1,000) and respond strictly in USD format!
If the current currency is IDR, format all numbers elegantly (e.g., Rp 1.000.000, Rp 150.000.000).

CONTEXT FOR ${company.name}:
- Description: ${company.description}
- Low Stock Items Count: ${lowStockCount || 0}
- Active Promotions: ${JSON.stringify(promotions || [])}
- Product Catalog & Recent Sales volume: ${JSON.stringify(products || [])}
- Latest Financial History (Revenue, Expenses, COGS, Profit): ${JSON.stringify(metrics?.slice(-7) || [])}
- Revenue Forecast: ${JSON.stringify(forecasts || {})}

YOUR RESPONSE STYLE:
1. Always start with a concise summary/assessment related to their question.
2. Structure your recommendations with clear bullet points.
3. Be professional, direct, and elite. Do not sound generic or robotic.
4. When requested, provide a markdown table of forecasts, risk alerts, or product comparisons.
5. If the user asks about revenue, profit margins, inventory, forecasting, or promotion strategies, base your answers strictly on the provided financial and product metrics context. Make sure any math matches the context!
6. Keep formatting neat and use bold key terms. Do not reference internal technical structures (like company_id or DB column names).`;

    // Map history to Gemini API format
    // In @google/genai, ai.models.generateContent accepts contents structure.
    const contents: any[] = [];
    
    if (history && Array.isArray(history)) {
      history.forEach((chat: any) => {
        contents.push({
          role: chat.sender === "USER" ? "user" : "model",
          parts: [{ text: chat.message }]
        });
      });
    }

    // Append current user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    const aiMessage = response.text || "I was unable to generate a response. Please try again.";

    res.json({
      sender: "AI",
      message: aiMessage,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const { company, currency, contextData } = req.body || {};
    const { products, metrics, lowStockCount } = contextData || {};
    const currencySymbol = currency === "USD" ? "$" : "Rp";
    
    // Create a robust fallback analysis based on actual data when Gemini is down / experiencing high demand (503)
    let fallbackMsg = `⚠️ **AI Business Consultant is currently experiencing high demand**\n\n*Our core AI consulting nodes are temporarily operating at peak capacity. However, AIBISPRO's local diagnostic engine has compiled a direct financial and product analysis for **${company?.name || "your company"}**:*\n\n`;
    
    if (lowStockCount > 0) {
      fallbackMsg += `### 🚨 Inventory Alerts\n- **Critical Stock Warning**: You currently have **${lowStockCount}** item(s) running below their safe reorder threshold. We recommend initiating a restock replenishment order via the **Inventory Logistics** panel immediately to secure your supply chain and prevent potential sales disruption.\n\n`;
    } else {
      fallbackMsg += `### 📦 Inventory Status\n- **Optimal Stock Level**: All key product catalog inventory counts are currently above their safe reorder points. No immediate restock actions are required.\n\n`;
    }

    if (products && Array.isArray(products) && products.length > 0) {
      const sortedBySales = [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
      const topProduct = sortedBySales[0];
      const worstProduct = sortedBySales[sortedBySales.length - 1];
      fallbackMsg += `### 📈 Product Performance Insights\n`;
      fallbackMsg += `- **Bestselling Product**: **${topProduct.name}** leads your catalogue with **${topProduct.salesCount || 0}** units sold. To maximize revenue, consider launching complementary bundling campaigns containing this item.\n`;
      if (worstProduct && worstProduct !== topProduct) {
        fallbackMsg += `- **Slower-moving Product**: **${worstProduct.name}** is lagging with **${worstProduct.salesCount || 0}** units sold. We suggest reviewing price placement or hosting a buy-one-get-one promotion to clear stock.\n`;
      }
      fallbackMsg += `\n`;
    }

    if (metrics && Array.isArray(metrics) && metrics.length > 0) {
      const recentMetric = metrics[metrics.length - 1];
      const profitMarginPercent = recentMetric.revenue ? ((recentMetric.profit / recentMetric.revenue) * 100).toFixed(1) : "0.0";
      fallbackMsg += `### 💼 Financial Diagnostics\n`;
      fallbackMsg += `- **Latest Revenue Performance**: ${currencySymbol}${recentMetric.revenue?.toLocaleString() || "0"}\n`;
      fallbackMsg += `- **Gross Profit Margin**: **${profitMarginPercent}%** (Profit: ${currencySymbol}${recentMetric.profit?.toLocaleString() || "0"})\n`;
      fallbackMsg += `- **Operating Cash Flow**: ${currencySymbol}${recentMetric.cashFlow?.toLocaleString() || "0"}\n`;
      fallbackMsg += `\n`;
    }

    fallbackMsg += `### 💡 Strategic Consulting\n- **Expense Management**: Maintain overhead expenses below 45% of total revenue to preserve robust net profit margins.\n- **Pricing Strategy**: Ensure that COGS (Cost of Goods Sold) does not exceed 40% of standard product prices for premium cafe and restaurant offerings.`;

    res.json({
      sender: "AI",
      message: fallbackMsg,
      timestamp: new Date().toISOString()
    });
  }
});

// API for saving/loading custom company data changes
// In-memory global state to act as our live DB. We synchronize with client-side localStorage as backup.
let clientDBState: any = null;

app.post("/api/data/sync", (req, res) => {
  clientDBState = req.body;
  res.json({ status: "success" });
});

app.get("/api/data/sync", (req, res) => {
  res.json(clientDBState || { status: "empty" });
});


// Serve static/compiled React frontend
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with static file assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`AIBISPRO BI Platform Server running on http://${HOST}:${PORT}`);
  });
}

startServer();

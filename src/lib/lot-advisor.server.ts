import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { daysUntil, statusFor, availableFor, stockValueFor } from "@/lib/inventory";

const INSTRUCTIONS = `Você é um assistente do estoque de sementes da Inova Agro (Zênite Sementes).
Responda em português do Brasil, de forma curta e prática, para quem cuida do estoque.
Use APENAS os lotes fornecidos. Identifique os lotes mais relevantes para a dúvida (cite cultivar e número do lote),
explique o risco de vencimento de cada um (dias até a validade, valor e quantidade disponível em jogo) e sugira uma ação.
Não invente lotes nem dados. Formato: lista curta com "Lotes relevantes", depois "Risco" e "O que fazer".`;

export async function askLotAdvisor(question: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Assistente não configurado.");
  const today = new Date();
  const { loadLots } = await import("@/lib/lots.server");
  const { lots: seeds } = await loadLots();
  const lots = seeds.map((s) => {
    const days = daysUntil(s.expiry, today);
    return {
      lote: s.lot, cultivar: s.cultivar, cultura: s.crop, safra: s.harvest, classe: s.seedClass,
      validade: s.expiry, diasAteVencer: days, situacao: statusFor(days), estado: s.lotState,
      disponivel: `${availableFor(s)} ${s.unit}`, reservado: s.reserved, germinacao: s.germination,
      valorDoLoteBRL: Math.round(stockValueFor(s)), local: s.location,
    };
  });
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [{
      role: "user",
      content: `Hoje é ${today.toISOString().slice(0, 10)}.\nLotes:\n${JSON.stringify(lots)}\n\nDúvida: ${question}`,
    }],
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto",
        store: false, include: ["reasoning.encrypted_content"],
      },
    },
  });
  return await result.text;
}

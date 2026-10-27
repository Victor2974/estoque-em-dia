import { createServerFn } from "@tanstack/react-start";

export const askAdvisor = createServerFn({ method: "POST" })
  .validator((input: { question: string }) => {
    const q = String(input?.question ?? "").trim();
    if (q.length < 3 || q.length > 1000) throw new Error("Descreva a dúvida (3 a 1000 caracteres).");
    return { question: q };
  })
  .handler(async ({ data }) => {
    const { askLotAdvisor } = await import("@/lib/lot-advisor.server");
    try {
      return { answer: await askLotAdvisor(data.question), error: null as string | null };
    } catch (e) {
      console.error(e);
      const status = (e as { statusCode?: number })?.statusCode;
      const msg = status === 429 ? "Muitas perguntas seguidas. Tente de novo em instantes."
        : status === 402 ? "Os créditos de IA acabaram. Adicione créditos para continuar."
        : "Não foi possível consultar o assistente agora.";
      return { answer: "", error: msg };
    }
  });

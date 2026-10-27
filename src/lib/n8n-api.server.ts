// Utilitários das rotas /api/n8n/* — autenticação, respostas JSON e aviso ao n8n.
//
//   N8N_API_KEY      segredo que o n8n manda no header  Authorization: Bearer <chave>
//                    (ou  x-api-key: <chave>). Sem ela a API fica desligada (503).
//   N8N_WEBHOOK_URL  (opcional) webhook do n8n avisado a cada alteração feita pela API.
import { timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { daysUntil, statusFor, availableFor, stockValueFor, type SeedLot } from "@/lib/inventory";
import { rowToLot, type LotRow } from "@/lib/lots.mapper";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-api-key, content-type",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...CORS,
    },
  });

export const preflight = () => new Response(null, { status: 204, headers: CORS });

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Devolve uma Response de erro se a chamada não estiver autorizada; senão null. */
export function checkAuth(request: Request): Response | null {
  const expected = process.env["N8N_API_KEY"]?.trim();
  if (!expected)
    return json({ erro: "API do n8n desativada: defina N8N_API_KEY no servidor." }, 503);
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : (request.headers.get("x-api-key") ?? "").trim();
  if (!token || !same(token, expected)) return json({ erro: "Não autorizado." }, 401);
  return null;
}

/** Lote no formato da API: colunas do banco + campos calculados. */
export function toApi(row: LotRow, today = new Date()) {
  const lot: SeedLot = rowToLot(row);
  const dias = daysUntil(lot.expiry, today);
  return {
    ...row,
    dias_ate_vencer: dias,
    situacao: statusFor(dias),
    disponivel: availableFor(lot),
    valor_lote: stockValueFor(lot),
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Corpo da requisição precisa ser JSON válido.");
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Converte erros de validação/Supabase numa resposta clara para o n8n. */
export function handleError(e: unknown): Response {
  if (e instanceof HttpError) return json({ erro: e.message, detalhes: e.details }, e.status);
  if (e instanceof ZodError) {
    return json(
      {
        erro: "Dados inválidos.",
        detalhes: e.issues.map((i) => ({ campo: i.path.join("."), problema: i.message })),
      },
      422,
    );
  }
  const pg = e as { code?: string; message?: string };
  if (pg?.code === "P0002") return json({ erro: pg.message }, 404);
  if (pg?.code === "23505") return json({ erro: "Já existe um lote com esse código." }, 409);
  if (pg?.code === "23514" || pg?.code === "P0001") return json({ erro: pg.message }, 422);
  if (pg?.message?.includes("não configurado")) return json({ erro: pg.message }, 503);
  console.error("[api n8n]", e);
  return json({ erro: "Erro interno." }, 500);
}

/** Avisa o n8n (se N8N_WEBHOOK_URL existir). Nunca derruba a requisição. */
export async function notifyN8n(evento: string, dados: unknown): Promise<void> {
  const url = process.env["N8N_WEBHOOK_URL"]?.trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ evento, em: new Date().toISOString(), dados }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (e) {
    console.warn("[n8n webhook] falhou:", e);
  }
}

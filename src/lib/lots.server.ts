// Acesso ao Supabase — só roda no servidor (as chaves nunca vão para o navegador).
//
// Variáveis de ambiente:
//   SUPABASE_URL               https://<projeto>.supabase.co
//   SUPABASE_ANON_KEY          chave anon/publishable (leitura do catálogo)
//   SUPABASE_SERVICE_ROLE_KEY  chave service_role/secret (escrita pela API do n8n)
//
// Sem SUPABASE_URL o site continua funcionando com os lotes de exemplo de inventory.ts.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seeds, type SeedLot } from "@/lib/inventory";
import { rowToLot, type LotRow } from "@/lib/lots.mapper";

const TABLE = "lotes_sementes";

const env = (name: string) => {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
};

const supabaseUrl = () => env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && (env("SUPABASE_ANON_KEY") ?? env("SUPABASE_SERVICE_ROLE_KEY")));
}

let readClient: SupabaseClient | undefined;
let adminClient: SupabaseClient | undefined;

function makeClient(key: string): SupabaseClient {
  return createClient(supabaseUrl()!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente de leitura (anon, respeita o RLS). */
function reader(): SupabaseClient {
  if (!readClient) {
    const key =
      env("SUPABASE_ANON_KEY") ??
      env("VITE_SUPABASE_PUBLISHABLE_KEY") ??
      env("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl() || !key)
      throw new Error("Supabase não configurado (SUPABASE_URL / SUPABASE_ANON_KEY).");
    readClient = makeClient(key);
  }
  return readClient;
}

/** Cliente com service_role — usado só pelas rotas da API (escrita). */
export function admin(): SupabaseClient {
  if (!adminClient) {
    const key = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl() || !key)
      throw new Error("Supabase não configurado para escrita (SUPABASE_SERVICE_ROLE_KEY).");
    adminClient = makeClient(key);
  }
  return adminClient;
}

export type LotSource = "supabase" | "exemplo";

/**
 * Lotes para o site e para o assistente de IA.
 * Se o Supabase não estiver configurado ou falhar, devolve os lotes de exemplo
 * para a vitrine nunca ficar vazia.
 */
export async function loadLots(): Promise<{ lots: SeedLot[]; source: LotSource }> {
  const { lotesCadastrados } = await import("@/lib/cadastro.server");
  if (!isSupabaseConfigured()) return { lots: [...seeds, ...lotesCadastrados()], source: "exemplo" };
  try {
    const { data, error } = await reader()
      .from(TABLE)
      .select("*")
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("validade", { ascending: true });
    if (error) throw error;
    return { lots: (data as LotRow[]).map(rowToLot), source: "supabase" };
  } catch (e) {
    console.error("[supabase] falha ao ler lotes, usando dados de exemplo:", e);
    return { lots: [...seeds, ...lotesCadastrados()], source: "exemplo" };
  }
}

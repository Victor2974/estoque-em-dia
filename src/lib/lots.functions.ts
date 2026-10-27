import { createServerFn } from "@tanstack/react-start";

/** Lotes do estoque, lidos no servidor (Supabase ou dados de exemplo). */
export const getLots = createServerFn({ method: "GET" }).handler(async () => {
  const { loadLots } = await import("@/lib/lots.server");
  return loadLots();
});

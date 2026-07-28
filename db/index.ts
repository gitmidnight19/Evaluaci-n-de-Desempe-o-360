import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

const runtime = globalThis as typeof globalThis & { __tat360D1?: D1Database };

export function setD1(db: D1Database | undefined) {
  runtime.__tat360D1 = db;
}

export function getD1() {
  if (!runtime.__tat360D1) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB`."
    );
  }

  return runtime.__tat360D1;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

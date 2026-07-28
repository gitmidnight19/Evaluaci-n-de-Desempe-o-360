import { getD1 } from "@/db";

const profileKeys = ["name", "id", "zone", "route", "period", "date", "boss", "tenure"] as const;
const feedbackKeys = ["start", "stop", "continue", "strengths", "gaps", "action"] as const;
const scoreKeys = ["auto", "jefe", "pares", "clientes"] as const;

type StringRecord = Record<string, string>;

async function ensureEvaluationStorage() {
  const db = getD1();
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY NOT NULL,
        employee_name TEXT NOT NULL DEFAULT '',
        employee_id TEXT NOT NULL DEFAULT '',
        period TEXT NOT NULL DEFAULT '',
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS evaluations_employee_id_idx ON evaluations (employee_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS evaluations_period_idx ON evaluations (period)",
    ),
  ]);
}

function cleanText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") throw new Error(`${field} debe ser texto.`);
  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw new Error(`${field} supera el límite permitido.`);
  return cleaned;
}

function cleanRecord(
  value: unknown,
  keys: readonly string[],
  field: string,
  maxLength: number,
): StringRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} no tiene un formato válido.`);
  }

  return Object.fromEntries(
    keys.map((key) => [key, cleanText((value as Record<string, unknown>)[key] ?? "", `${field}.${key}`, maxLength)]),
  );
}

function cleanEvaluation(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("La evaluación no tiene un formato válido.");
  }

  const input = value as Record<string, unknown>;
  const profile = cleanRecord(input.profile, profileKeys, "profile", 200);
  const feedback = cleanRecord(input.feedback, feedbackKeys, "feedback", 10_000);

  if (!Array.isArray(input.kpis) || input.kpis.length !== 7) {
    throw new Error("La evaluación debe contener los 7 KPIs.");
  }
  const kpis = input.kpis.map((row, index) => {
    const cleaned = cleanRecord(row, ["actual", "target"], `kpis.${index}`, 50);
    for (const [key, raw] of Object.entries(cleaned)) {
      if (raw !== "" && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
        throw new Error(`kpis.${index}.${key} debe ser un número positivo.`);
      }
    }
    return cleaned;
  });

  if (!Array.isArray(input.scores) || input.scores.length !== 14) {
    throw new Error("La evaluación debe contener los 14 comportamientos.");
  }
  const scores = input.scores.map((row, index) => {
    const cleaned = cleanRecord(row, scoreKeys, `scores.${index}`, 1);
    for (const [key, raw] of Object.entries(cleaned)) {
      if (raw !== "" && !["1", "2", "3", "4", "5"].includes(raw)) {
        throw new Error(`scores.${index}.${key} debe estar entre 1 y 5.`);
      }
    }
    return cleaned;
  });

  return { profile, kpis, scores, feedback };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "No fue posible guardar la evaluación.";
  const unavailable =
    message.includes("no such table") ||
    message.includes("binding `DB` is unavailable");

  return Response.json(
    { error: unavailable ? "El almacenamiento de evaluaciones aún no está disponible." : message },
    { status: unavailable ? 503 : 400 },
  );
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return Response.json({ error: "Falta el identificador de la evaluación." }, { status: 400 });

  try {
    await ensureEvaluationStorage();
    const row = await getD1()
      .prepare("SELECT id, payload, created_at, updated_at FROM evaluations WHERE id = ?1")
      .bind(id)
      .first<{ id: string; payload: string; created_at: string; updated_at: string }>();

    if (!row) return Response.json({ error: "Evaluación no encontrada." }, { status: 404 });
    return Response.json({
      evaluation: {
        id: row.id,
        ...JSON.parse(row.payload),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: unknown; evaluation?: unknown };
    const id =
      typeof body.id === "string" && /^[a-zA-Z0-9-]{10,64}$/.test(body.id)
        ? body.id
        : crypto.randomUUID();
    const evaluation = cleanEvaluation(body.evaluation);
    const payload = JSON.stringify(evaluation);

    await ensureEvaluationStorage();
    await getD1()
      .prepare(`
        INSERT INTO evaluations (id, employee_name, employee_id, period, payload)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(id) DO UPDATE SET
          employee_name = excluded.employee_name,
          employee_id = excluded.employee_id,
          period = excluded.period,
          payload = excluded.payload,
          updated_at = CURRENT_TIMESTAMP
      `)
      .bind(id, evaluation.profile.name, evaluation.profile.id, evaluation.profile.period, payload)
      .run();

    const saved = await getD1()
      .prepare("SELECT created_at, updated_at FROM evaluations WHERE id = ?1")
      .bind(id)
      .first<{ created_at: string; updated_at: string }>();

    return Response.json(
      { id, createdAt: saved?.created_at, updatedAt: saved?.updated_at },
      { status: body.id ? 200 : 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

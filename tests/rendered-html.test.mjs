import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const worker = await loadWorker();

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    testEnv(),
    testContext(),
  );
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

function testEnv(db) {
  return {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      DB: db,
    };
}

function testContext() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}

test("renderiza la aplicación TAT 360", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>TAT 360 \| Evaluación de Desempeño<\/title>/i);
  assert.match(html, /TAT 360/i);
  assert.match(html, /Asesor Comercial TAT/i);
  assert.match(html, /Evaluación de desempeño 360/i);
  assert.match(html, /Tablero ejecutivo/i);
  assert.match(html, /KPIs de resultados/i);
  assert.match(html, /Feedback y plan/i);
  assert.match(html, /Guardar evaluación/i);
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /Your site is taking shape/i);
});

test("guarda una evaluación mediante la API", async () => {
  const rows = new Map();
  const db = {
    prepare(sql) {
      let bindings = [];
      return {
        bind(...values) {
          bindings = values;
          return this;
        },
        async run() {
          if (sql.includes("INSERT INTO evaluations")) {
            rows.set(bindings[0], {
              id: bindings[0],
              created_at: "2026-07-28 18:00:00",
              updated_at: "2026-07-28 18:00:00",
            });
          }
          return { success: true };
        },
        async first() {
          return rows.get(bindings[0]) ?? null;
        },
      };
    },
  };
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/evaluations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        evaluation: {
          profile: { name: "Ana", id: "10", zone: "", route: "", period: "2026-1", date: "", boss: "", tenure: "" },
          kpis: Array.from({ length: 7 }, () => ({ actual: "", target: "" })),
          scores: Array.from({ length: 14 }, () => ({ auto: "", jefe: "", pares: "", clientes: "" })),
          feedback: { start: "", stop: "", continue: "", strengths: "", gaps: "", action: "" },
        },
      }),
    }),
    testEnv(db),
    testContext(),
  );

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.match(payload.id, /^[0-9a-f-]{36}$/i);
  assert.equal(rows.size, 1);
});

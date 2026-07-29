import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createEvaluationPdf } from "../lib/evaluation-pdf.ts";
import { createPdfFixture } from "./pdf-fixture.mjs";

test("genera un informe PDF completo y paginado", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const filename = String(url).replace(/^\//, "");
    return new Response(await readFile(new URL(`../public/${filename}`, import.meta.url)));
  };

  try {
    const doc = await createEvaluationPdf(createPdfFixture());
    const bytes = Buffer.from(doc.output("arraybuffer"));
    assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
    assert.equal(doc.getNumberOfPages(), 4);
    assert.ok(bytes.length > 100_000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

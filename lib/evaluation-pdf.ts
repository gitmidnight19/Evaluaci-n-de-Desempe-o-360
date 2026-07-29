import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type PdfOutput = {
  generatedAt: string;
  evaluationId: string | null;
  profile: {
    name: string;
    id: string;
    zone: string;
    route: string;
    period: string;
    date: string;
    boss: string;
    tenure: string;
  };
  summary: {
    complete: boolean;
    completeness: number;
    score100: number | null;
    score5: number | null;
    category: string;
    completedKpis: number;
    completedBehaviors: number;
  };
  blocks: Record<string, { points: number; maximum: number }>;
  kpis: Array<{
    code: string;
    name: string;
    weight: number;
    actual: string | null;
    target: string | null;
    compliance: number | null;
    rating: number | null;
  }>;
  behaviors: Array<{
    block: string;
    code: string;
    name: string;
    sources: { auto: string; jefe: string; pares: string; clientes: string };
    weightedScore: number | null;
  }>;
  feedback: Record<string, string>;
};

const brand = {
  burgundy: [73, 19, 29] as [number, number, number],
  red: [198, 40, 40] as [number, number, number],
  ink: [31, 42, 55] as [number, number, number],
  muted: [100, 116, 135] as [number, number, number],
  line: [218, 226, 235] as [number, number, number],
  pale: [249, 242, 243] as [number, number, number],
};

async function fontAsBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No fue posible cargar la tipografía del informe: ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function configureFonts(doc: jsPDF) {
  const [regular, bold] = await Promise.all([
    fontAsBase64("/Poppins-Regular.ttf"),
    fontAsBase64("/Poppins-Bold.ttf"),
  ]);
  doc.addFileToVFS("Poppins-Regular.ttf", regular);
  doc.addFileToVFS("Poppins-Bold.ttf", bold);
  doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
  doc.addFont("Poppins-Bold.ttf", "Poppins", "bold");
}

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...brand.burgundy);
  doc.rect(0, 0, 210, 23, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("Poppins", "bold");
  doc.setFontSize(14);
  doc.text("TAT 360", 14, 10);
  doc.setFontSize(9);
  doc.text(title, 14, 16);
  doc.setFont("Poppins", "normal");
  doc.setTextColor(238, 207, 212);
  doc.text(subtitle, 196, 16, { align: "right" });
}

function addSectionPage(doc: jsPDF, title: string, subtitle: string) {
  if (doc.getNumberOfPages() > 0) doc.addPage();
  drawHeader(doc, title, subtitle);
}

function drawSummaryCard(
  doc: jsPDF,
  x: number,
  label: string,
  value: string,
  note: string,
) {
  doc.setFillColor(250, 251, 252);
  doc.setDrawColor(...brand.line);
  doc.roundedRect(x, 91, 42, 30, 2.5, 2.5, "FD");
  doc.setTextColor(...brand.muted);
  doc.setFont("Poppins", "normal");
  doc.setFontSize(7);
  doc.text(label.toUpperCase(), x + 4, 98);
  doc.setTextColor(...brand.burgundy);
  doc.setFont("Poppins", "bold");
  doc.setFontSize(15);
  doc.text(value, x + 4, 108);
  doc.setTextColor(...brand.muted);
  doc.setFont("Poppins", "normal");
  doc.setFontSize(6.5);
  doc.text(note, x + 4, 116);
}

function tableOptions(doc: jsPDF, title: string, subtitle: string) {
  return {
    margin: { top: 30, right: 14, bottom: 17, left: 14 },
    tableWidth: 165,
    styles: {
      font: "Poppins",
      fontSize: 8,
      textColor: brand.ink,
      cellPadding: 2.4,
      lineColor: brand.line,
      lineWidth: 0.15,
      overflow: "linebreak" as const,
    },
    headStyles: {
      fillColor: brand.burgundy,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
    },
    alternateRowStyles: { fillColor: [249, 250, 252] as [number, number, number] },
    didDrawPage: () => drawHeader(doc, title, subtitle),
  };
}

export async function createEvaluationPdf(output: PdfOutput) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await configureFonts(doc);

  drawHeader(doc, "Informe de evaluación de desempeño 360°", "Resumen ejecutivo");

  doc.setTextColor(...brand.ink);
  doc.setFont("Poppins", "bold");
  doc.setFontSize(22);
  doc.text(output.profile.name || "Colaborador sin identificar", 14, 38);
  doc.setTextColor(...brand.muted);
  doc.setFont("Poppins", "normal");
  doc.setFontSize(10);
  doc.text(
    `${output.profile.period || "Periodo sin definir"}  |  ${output.profile.route || "Ruta sin definir"}`,
    14,
    45,
  );

  autoTable(doc, {
    startY: 53,
    margin: { left: 14, right: 14 },
    tableWidth: 165,
    theme: "plain",
    body: [
      ["Documento / ID", output.profile.id || "—", "Portafolio", output.profile.zone || "—"],
      ["Jefe inmediato", output.profile.boss || "—", "Antigüedad", output.profile.tenure || "—"],
      ["Fecha", output.profile.date || "—", "ID evaluación", output.evaluationId || "Pendiente de guardado"],
    ],
    styles: { font: "Poppins", fontSize: 8, cellPadding: 2.5, textColor: brand.ink },
    columnStyles: {
      0: { fontStyle: "bold", textColor: brand.muted, cellWidth: 28 },
      1: { cellWidth: 54 },
      2: { fontStyle: "bold", textColor: brand.muted, cellWidth: 28 },
      3: { cellWidth: 55 },
    },
  });

  drawSummaryCard(doc, 14, "Resultado final", output.summary.score100 === null ? "Pendiente" : `${output.summary.score100}/100`, output.summary.category);
  drawSummaryCard(doc, 59, "Escala", output.summary.score5 === null ? "—" : `${output.summary.score5}/5`, "Calificación equivalente");
  drawSummaryCard(doc, 104, "Completitud", `${output.summary.completeness}%`, `${output.summary.completedKpis}/7 KPI`);
  drawSummaryCard(doc, 149, "Conductas", `${output.summary.completedBehaviors}/14`, output.summary.complete ? "Evaluación completa" : "En diligenciamiento");

  doc.setFont("Poppins", "bold");
  doc.setTextColor(...brand.burgundy);
  doc.setFontSize(12);
  doc.text("Resultado por bloque", 14, 137);

  const blockLabels: Record<string, string> = {
    kpis: "KPIs de resultados",
    competencies: "Competencias",
    attitudes: "Aspectos actitudinales",
    values: "Valores corporativos",
  };
  autoTable(doc, {
    startY: 142,
    margin: { left: 14, right: 14 },
    head: [["Bloque", "Puntaje", "Máximo", "Cumplimiento"]],
    body: Object.entries(output.blocks).map(([key, value]) => [
      blockLabels[key] || key,
      value.points.toFixed(2),
      value.maximum.toFixed(0),
      `${((value.points / value.maximum) * 100).toFixed(1)}%`,
    ]),
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 30, halign: "right" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
    },
    ...tableOptions(doc, "Informe de evaluación de desempeño 360°", "Resumen ejecutivo"),
  });

  doc.setFillColor(...brand.pale);
  doc.setDrawColor(235, 205, 210);
  doc.roundedRect(14, 191, 182, 27, 2.5, 2.5, "FD");
  doc.setTextColor(...brand.burgundy);
  doc.setFont("Poppins", "bold");
  doc.setFontSize(9);
  doc.text("Lectura del resultado", 19, 199);
  doc.setTextColor(...brand.ink);
  doc.setFont("Poppins", "normal");
  doc.setFontSize(8);
  const resultText = output.summary.complete
    ? `La evaluación finaliza con ${output.summary.score100}/100 (${output.summary.score5}/5), categoría ${output.summary.category}.`
    : `La evaluación se encuentra al ${output.summary.completeness}% y aún no emite una calificación definitiva.`;
  doc.text(doc.splitTextToSize(resultText, 170), 19, 207);

  addSectionPage(doc, "KPIs de resultados", "Detalle cuantitativo - peso 30%");
  autoTable(doc, {
    startY: 30,
    head: [["Código", "Indicador", "Peso", "Resultado", "Meta", "Cumpl.", "Nota"]],
    body: output.kpis.map((item) => [
      item.code,
      item.name,
      `${Math.round(item.weight * 100)}%`,
      item.actual ?? "—",
      item.target ?? "—",
      item.compliance === null ? "—" : `${(item.compliance * 100).toFixed(1)}%`,
      item.rating ?? "—",
    ]),
    columnStyles: {
      0: { cellWidth: 16, fontStyle: "bold" },
      1: { cellWidth: 65 },
      2: { cellWidth: 13, halign: "center" },
      3: { cellWidth: 19, halign: "right" },
      4: { cellWidth: 19, halign: "right" },
      5: { cellWidth: 19, halign: "right" },
      6: { cellWidth: 14, halign: "center", fontStyle: "bold" },
    },
    ...tableOptions(doc, "KPIs de resultados", "Detalle cuantitativo - peso 30%"),
  });

  addSectionPage(doc, "Evaluación de comportamientos 360°", "Fuentes ponderadas: A 10 | J 40 | P 20 | C 30");
  autoTable(doc, {
    ...tableOptions(doc, "Evaluación de comportamientos 360°", "Fuentes ponderadas: A 10 | J 40 | P 20 | C 30"),
    startY: 30,
    head: [["Bloque", "Código", "Comportamiento", "Auto", "Jefe", "Pares", "Clientes", "Prom."]],
    body: output.behaviors.map((item) => [
      item.block,
      item.code,
      item.name,
      item.sources.auto || "—",
      item.sources.jefe || "—",
      item.sources.pares || "—",
      item.sources.clientes || "—",
      item.weightedScore ?? "—",
    ]),
    styles: { ...tableOptions(doc, "", "").styles, fontSize: 7.2 },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 18, fontStyle: "bold" },
      2: { cellWidth: 52 },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 12, halign: "center" },
      6: { cellWidth: 17, halign: "center" },
      7: { cellWidth: 15, halign: "center", fontStyle: "bold" },
    },
  });

  addSectionPage(doc, "Feedback y plan de desarrollo", "Acuerdos para seguimiento");
  const feedbackLabels: Record<string, string> = {
    start: "Empezar a hacer",
    stop: "Dejar de hacer",
    continue: "Continuar haciendo",
    strengths: "Fortalezas prioritarias",
    gaps: "Brechas prioritarias",
    action: "Acción, responsable, fecha e indicador de éxito",
  };
  autoTable(doc, {
    startY: 30,
    head: [["Dimensión", "Registro"]],
    body: Object.entries(feedbackLabels).map(([key, label]) => [
      label,
      output.feedback[key]?.trim() || "Sin información registrada.",
    ]),
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold", textColor: brand.burgundy },
      1: { cellWidth: 115 },
    },
    ...tableOptions(doc, "Feedback y plan de desarrollo", "Acuerdos para seguimiento"),
  });

  const pageCount = doc.getNumberOfPages();
  const generated = new Date(output.generatedAt).toLocaleString("es-CO");
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...brand.line);
    doc.line(14, 283, 196, 283);
    doc.setTextColor(...brand.muted);
    doc.setFont("Poppins", "normal");
    doc.setFontSize(7);
    doc.text(`Generado: ${generated}`, 14, 288);
    doc.text(`Página ${page} de ${pageCount}`, 196, 288, { align: "right" });
  }

  return doc;
}

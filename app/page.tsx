"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createEvaluationPdf } from "@/lib/evaluation-pdf";

type View = "resumen" | "ficha" | "kpis" | "evaluacion" | "feedback";
type ScoreRow = { auto: string; jefe: string; pares: string; clientes: string };
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const sourceWeights = { auto: 0.1, jefe: 0.4, pares: 0.2, clientes: 0.3 };

const kpiDefinitions = [
  { code: "KPI-01", name: "Presupuesto de ventas", description: "Venta neta frente al presupuesto de la ruta.", weight: 0.08 },
  { code: "KPI-02", name: "Cobertura efectiva de ruta", description: "Visitas efectivas frente a las programadas.", weight: 0.05 },
  { code: "KPI-03", name: "Apertura de nuevos clientes", description: "Nuevos códigos activados con compra válida.", weight: 0.04 },
  { code: "KPI-04", name: "Distribución de marcas foco", description: "Presencia de marcas foco en tiendas objetivo.", weight: 0.04 },
  { code: "KPI-05", name: "Distribución de portafolio", description: "Presencia de referencias prioritarias del ciclo.", weight: 0.03 },
  { code: "KPI-06", name: "Ejecución impecable en PDV", description: "Exhibición, POP, rotación FEFO y vencimientos.", weight: 0.04 },
  { code: "KPI-07", name: "Control de activos", description: "Custodia, ubicación y estado de activos asignados.", weight: 0.02 },
];

const behaviorDefinitions = [
  { block: "Competencias", code: "CO-01", name: "Disciplina y rutina de visita", behavior: "Prepara la ruta, inicia puntualmente y ejecuta con consistencia todos los pasos de la visita.", weight: 0.06 },
  { block: "Competencias", code: "CO-02", name: "Técnica de negociación", behavior: "Argumenta con datos, protege la rentabilidad y cierra acuerdos claros y viables.", weight: 0.06 },
  { block: "Competencias", code: "CO-03", name: "Manejo de objeciones", behavior: "Escucha, indaga la causa real y responde con alternativas pertinentes.", weight: 0.06 },
  { block: "Competencias", code: "CO-04", name: "Visibilidad y exhibición", behavior: "Negocia espacios, maximiza frentes y mantiene la exhibición alineada al planograma.", weight: 0.06 },
  { block: "Competencias", code: "CO-05", name: "Gestión del tiempo y servicio", behavior: "Prioriza tiendas, reduce tiempos improductivos y responde oportunamente.", weight: 0.06 },
  { block: "Actitudinal", code: "AL-01", name: "Adaptabilidad en calle", behavior: "Ajusta su operación ante clima, terreno, movilidad y cambios de ruta.", weight: 0.06 },
  { block: "Actitudinal", code: "AL-02", name: "Resiliencia y presión", behavior: "Mantiene autocontrol y calidad de decisión ante metas y contingencias.", weight: 0.06 },
  { block: "Actitudinal", code: "AL-03", name: "Registro oportuno", behavior: "Registra pedidos, visitas y novedades en el momento definido.", weight: 0.06 },
  { block: "Actitudinal", code: "AL-04", name: "Calidad de la información", behavior: "Reporta datos veraces y usa geolocalización y dispositivos según política.", weight: 0.06 },
  { block: "Actitudinal", code: "AL-05", name: "Adopción tecnológica", behavior: "Incorpora actualizaciones y usa la información para decidir.", weight: 0.06 },
  { block: "Valores", code: "VA-01", name: "Trabajo en equipo", behavior: "Coordina con logística, supervisores y compañeros; cumple acuerdos.", weight: 0.025 },
  { block: "Valores", code: "VA-02", name: "Honestidad", behavior: "Maneja créditos, recaudos y bonificaciones con transparencia.", weight: 0.025 },
  { block: "Valores", code: "VA-03", name: "Respeto", behavior: "Trata con dignidad al tendero, la comunidad y sus compañeros.", weight: 0.025 },
  { block: "Valores", code: "VA-04", name: "Pasión por el servicio", behavior: "Se responsabiliza por la solución y protege la promesa comercial.", weight: 0.025 },
];

const emptyScores = (): ScoreRow[] =>
  behaviorDefinitions.map(() => ({ auto: "", jefe: "", pares: "", clientes: "" }));

const navItems: { id: View; label: string; short: string }[] = [
  { id: "resumen", label: "Tablero ejecutivo", short: "01" },
  { id: "ficha", label: "Ficha del evaluado", short: "02" },
  { id: "kpis", label: "KPIs de resultados", short: "03" },
  { id: "evaluacion", label: "Evaluación 360°", short: "04" },
  { id: "feedback", label: "Feedback y plan", short: "05" },
];

const portfolioOptions = [
  "Geográfico Aire",
  "Geográfico Tierra",
  "Minimercado",
  "Consumo Local",
];

function kpiRating(actual: string, target: string) {
  const a = Number(actual);
  const t = Number(target);
  if (!actual || !target || t <= 0) return 0;
  const ratio = a / t;
  if (ratio < 0.7) return 1;
  if (ratio < 0.85) return 2;
  if (ratio < 1) return 3;
  if (ratio < 1.1) return 4;
  return 5;
}

function kpiStatus(rating: number) {
  if (rating === 1) return "Crítico";
  if (rating === 2) return "En desarrollo";
  if (rating === 3) return "Cerca de la meta";
  if (rating === 4) return "Meta alcanzada";
  if (rating === 5) return "Sobrecumple";
  return "Pendiente";
}

function behaviorStatus(rating: number) {
  if (rating === 1) return "Crítico";
  if (rating === 2) return "En desarrollo";
  if (rating === 3) return "Esperado";
  if (rating === 4) return "Destacado";
  if (rating === 5) return "Sobresaliente";
  return "Pendiente";
}

function weightedScore(row: ScoreRow) {
  const entries = (Object.keys(sourceWeights) as (keyof ScoreRow)[])
    .filter((key) => row[key] !== "")
    .map((key) => ({ score: Number(row[key]), weight: sourceWeights[key] }));
  if (!entries.length) return 0;
  const weight = entries.reduce((sum, item) => sum + item.weight, 0);
  return entries.reduce((sum, item) => sum + item.score * item.weight, 0) / weight;
}

function category(score: number) {
  if (score >= 90) return "Sobresaliente";
  if (score >= 80) return "Destacado";
  if (score >= 60) return "Esperado";
  if (score >= 40) return "Bajo";
  return "Crítico";
}

export default function Home() {
  const [view, setView] = useState<View>("resumen");
  const [profile, setProfile] = useState({
    name: "", id: "", zone: "", route: "", period: "", date: "", boss: "", tenure: "",
  });
  const [kpis, setKpis] = useState(() => kpiDefinitions.map(() => ({ actual: "", target: "" })));
  const [scores, setScores] = useState<ScoreRow[]>(emptyScores);
  const [feedback, setFeedback] = useState({ start: "", stop: "", continue: "", strengths: "", gaps: "", action: "" });
  const [hydrated, setHydrated] = useState(false);
  const [evaluationId, setEvaluationId] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const dataVersion = useRef(0);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("tat360-evaluation");
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.profile) setProfile(data.profile);
          if (data.kpis) setKpis(data.kpis);
          if (data.scores) setScores(data.scores);
          if (data.feedback) setFeedback(data.feedback);
          if (typeof data.evaluationId === "string") setEvaluationId(data.evaluationId);
          if (typeof data.savedAt === "string") {
            setSavedAt(data.savedAt);
            setSaveState("saved");
          }
        } catch {
          // Ignore malformed device-local data.
        }
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  const markDirty = () => {
    dataVersion.current += 1;
    setSaveState("dirty");
    setSaveMessage("");
  };

  const results = useMemo(() => {
    const kpiRatings = kpis.map((row) => kpiRating(row.actual, row.target));
    const behaviorScores = scores.map(weightedScore);
    const kpiPoints = kpiRatings.reduce((sum, rating, index) => sum + (rating / 5) * kpiDefinitions[index].weight * 100, 0);
    const competencePoints = behaviorScores.slice(0, 5).reduce((sum, score, index) => sum + (score / 5) * behaviorDefinitions[index].weight * 100, 0);
    const attitudePoints = behaviorScores.slice(5, 10).reduce((sum, score, index) => sum + (score / 5) * behaviorDefinitions[index + 5].weight * 100, 0);
    const valuePoints = behaviorScores.slice(10).reduce((sum, score, index) => sum + (score / 5) * behaviorDefinitions[index + 10].weight * 100, 0);
    const kpiDone = kpiRatings.filter(Boolean).length;
    const behaviorDone = behaviorScores.filter(Boolean).length;
    const completeness = Math.round(((kpiDone + behaviorDone) / 21) * 100);
    const complete = kpiDone === 7 && behaviorDone === 14;
    const total = kpiPoints + competencePoints + attitudePoints + valuePoints;
    return { kpiRatings, behaviorScores, kpiPoints, competencePoints, attitudePoints, valuePoints, kpiDone, behaviorDone, completeness, complete, total };
  }, [kpis, scores]);

  const kpiAverage = results.kpiDone
    ? results.kpiRatings.reduce((sum, rating) => sum + rating, 0) / results.kpiDone
    : 0;

  const localOutput = useMemo(() => ({
    formatVersion: 1,
    evaluationId: evaluationId || null,
    generatedAt: new Date().toISOString(),
    profile,
    summary: {
      complete: results.complete,
      completeness: results.completeness,
      score100: results.complete ? Number(results.total.toFixed(2)) : null,
      score5: results.complete ? Number((results.total / 20).toFixed(2)) : null,
      category: results.complete ? category(results.total) : "Pendiente",
      completedKpis: results.kpiDone,
      completedBehaviors: results.behaviorDone,
    },
    blocks: {
      kpis: { points: Number(results.kpiPoints.toFixed(2)), maximum: 30 },
      competencies: { points: Number(results.competencePoints.toFixed(2)), maximum: 30 },
      attitudes: { points: Number(results.attitudePoints.toFixed(2)), maximum: 30 },
      values: { points: Number(results.valuePoints.toFixed(2)), maximum: 10 },
    },
    kpis: kpiDefinitions.map((definition, index) => ({
      code: definition.code,
      name: definition.name,
      weight: definition.weight,
      actual: kpis[index].actual || null,
      target: kpis[index].target || null,
      compliance:
        kpis[index].actual !== "" && Number(kpis[index].target) > 0
          ? Number((Number(kpis[index].actual) / Number(kpis[index].target)).toFixed(4))
          : null,
      rating: results.kpiRatings[index] || null,
    })),
    behaviors: behaviorDefinitions.map((definition, index) => ({
      block: definition.block,
      code: definition.code,
      name: definition.name,
      weight: definition.weight,
      sources: scores[index],
      weightedScore: results.behaviorScores[index]
        ? Number(results.behaviorScores[index].toFixed(2))
        : null,
    })),
    feedback,
  }), [evaluationId, feedback, kpis, profile, results, scores]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      "tat360-evaluation",
      JSON.stringify({ profile, kpis, scores, feedback, evaluationId, savedAt }),
    );
    window.localStorage.setItem("tat360-evaluation-output", JSON.stringify(localOutput));
  }, [hydrated, profile, kpis, scores, feedback, evaluationId, savedAt, localOutput]);

  const updateKpi = (index: number, field: "actual" | "target", value: string) => {
    markDirty();
    setKpis((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const adjustKpi = (index: number, field: "actual" | "target", amount: number) => {
    const currentValue = Number(kpis[index][field]) || 0;
    const nextValue = Math.max(0, Number((currentValue + amount).toFixed(2)));
    updateKpi(index, field, String(nextValue));
  };

  const updateScore = (index: number, source: keyof ScoreRow, value: string) => {
    markDirty();
    setScores((current) => current.map((row, i) => i === index ? { ...row, [source]: value } : row));
  };

  const setScore = (index: number, source: keyof ScoreRow, value: string) => {
    if (value === "") {
      updateScore(index, source, "");
      return;
    }
    const nextValue = Math.min(5, Math.max(1, Math.round(Number(value))));
    if (Number.isFinite(nextValue)) updateScore(index, source, String(nextValue));
  };

  const adjustScore = (index: number, source: keyof ScoreRow, amount: number) => {
    const currentValue = Number(scores[index][source]) || 0;
    const nextValue = currentValue === 0 ? 1 : Math.min(5, Math.max(1, currentValue + amount));
    updateScore(index, source, String(nextValue));
  };

  const saveEvaluation = async () => {
    if (saveState === "saving") return false;
    const versionBeingSaved = dataVersion.current;
    setSaveState("saving");
    setSaveMessage("");

    try {
      const response = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: evaluationId || undefined,
          evaluation: { profile, kpis, scores, feedback },
        }),
      });
      const result = (await response.json()) as { id?: string; updatedAt?: string; error?: string };
      if (!response.ok || !result.id) {
        throw new Error(result.error || "No fue posible guardar la evaluación.");
      }

      setEvaluationId(result.id);
      setSavedAt(result.updatedAt || new Date().toISOString());
      if (dataVersion.current === versionBeingSaved) {
        setSaveState("saved");
        setSaveMessage("Evaluación guardada correctamente.");
      } else {
        setSaveState("dirty");
        setSaveMessage("Se guardó una versión; hay cambios nuevos pendientes.");
      }
      return true;
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "No fue posible guardar la evaluación.");
      return false;
    }
  };

  const downloadPdfOutput = async () => {
    const safeName = (profile.name || profile.id || "evaluacion")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const pdf = await createEvaluationPdf(localOutput);
    pdf.save(
      `informe-tat360-${safeName || "evaluacion"}.pdf`,
    );
  };

  const reset = () => {
    if (!window.confirm("¿Desea borrar todos los datos de esta evaluación?")) return;
    setProfile({ name: "", id: "", zone: "", route: "", period: "", date: "", boss: "", tenure: "" });
    setKpis(kpiDefinitions.map(() => ({ actual: "", target: "" })));
    setScores(emptyScores());
    setFeedback({ start: "", stop: "", continue: "", strengths: "", gaps: "", action: "" });
    setEvaluationId("");
    setSavedAt("");
    setSaveState("dirty");
    setSaveMessage("");
    dataVersion.current += 1;
    setView("resumen");
  };

  const goNext = () => {
    const index = navItems.findIndex((item) => item.id === view);
    if (index < navItems.length - 1) setView(navItems[index + 1].id);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          {/* El recurso local se carga directamente para evitar el optimizador de imágenes de vinext. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="brand-logo"
            src="/reddemarcassinfondo.png"
            alt="Red de marcas — ¡Lo hacemos posible!"
            width={500}
            height={500}
          />
        </div>

        <div className={`cycle-card ${results.completeness === 100 ? "complete" : ""}`}>
          <div className="cycle-card-head">
            <span><i />Ciclo activo</span>
            <strong>{results.completeness}%</strong>
          </div>
          <p>{profile.period || "Periodo sin definir"}</p>
          <div className="progress-track" role="progressbar" aria-label="Progreso del ciclo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={results.completeness}>
            <span style={{ width: `${results.completeness}%` }} />
          </div>
          <div className="cycle-card-footer">
            <span>{results.completeness === 100 ? "Ciclo completado" : `${results.kpiDone + results.behaviorDone} de 21 registros`}</span>
            <small>{results.completeness === 100 ? "Finalizado" : `${21 - results.kpiDone - results.behaviorDone} pendientes`}</small>
          </div>
        </div>

        <span className="nav-label">Navegación</span>
        <nav aria-label="Secciones de la evaluación">
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
              <span>{item.short}</span>{item.label}
            </button>
          ))}
        </nav>

      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Evaluación de desempeño 360°</span>
            <h1>Asesor Comercial TAT</h1>
          </div>
          <div className="top-actions">
            <button className="button ghost" onClick={reset}>Nueva evaluación</button>
            <button className="button primary" onClick={saveEvaluation} disabled={saveState === "saving"}>
              {saveState === "saving" ? "Guardando…" : "Guardar evaluación"}
            </button>
            <button className="button ghost" onClick={downloadPdfOutput}>Descargar PDF</button>
            <button className="button primary" onClick={() => window.print()}>Imprimir informe</button>
          </div>
        </header>

        {saveMessage && (
          <div className={`save-notice ${saveState}`} role={saveState === "error" ? "alert" : "status"}>
            {saveMessage}
          </div>
        )}

        {view === "resumen" && (
          <div className="page-content">
            <section className="hero">
              <div>
                <span className="pill">Canal tradicional · Consumo masivo</span>
                <h2>{profile.name ? `Desempeño de ${profile.name}` : "Una lectura integral del desempeño en calle"}</h2>
                <p>Resultados comerciales, ejecución TAT, adaptación operativa y valores corporativos en una sola vista.</p>
              </div>
              <div className={`score-orb ${results.complete ? "" : "pending"}`}>
                <span>{results.complete ? results.total.toFixed(1) : "—"}</span>
                <small>{results.complete ? category(results.total) : "Resultado pendiente"}</small>
              </div>
            </section>

            <div className="stat-grid">
              <article className="stat-card">
                <span>Calificación final</span>
                <strong>{results.complete ? `${(results.total / 20).toFixed(2)} / 5` : "Pendiente"}</strong>
                <small>Se activa al completar los 21 criterios.</small>
              </article>
              <article className="stat-card">
                <span>KPIs registrados</span>
                <strong>{results.kpiDone} <em>/ 7</em></strong>
                <small>Solo los valida el jefe inmediato.</small>
              </article>
              <article className="stat-card">
                <span>Conductas evaluadas</span>
                <strong>{results.behaviorDone} <em>/ 14</em></strong>
                <small>Al menos una fuente por comportamiento.</small>
              </article>
              <article className="stat-card accent">
                <span>Completitud</span>
                <strong>{results.completeness}%</strong>
                <small>{results.complete ? "Evaluación lista para feedback." : "Continúe diligenciando los bloques."}</small>
              </article>
            </div>

            <section className="panel">
              <div className="panel-heading">
                <div><span className="eyebrow">Aporte ponderado</span><h3>Resultado por bloque</h3></div>
                <span className="legend">Puntaje sobre 100</span>
              </div>
              <div className="block-results">
                {[
                  ["KPIs de resultados", results.kpiPoints, 30, "blue"],
                  ["Competencias", results.competencePoints, 30, "teal"],
                  ["Longitudinal / actitudinal", results.attitudePoints, 30, "gold"],
                  ["Valores corporativos", results.valuePoints, 10, "green"],
                ].map(([label, value, max, color]) => (
                  <div className="result-row" key={String(label)}>
                    <div><strong>{label}</strong><span>{Number(value).toFixed(1)} de {max}</span></div>
                    <div className="result-track"><span className={String(color)} style={{ width: `${Math.min(100, (Number(value) / Number(max)) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="quick-start">
              <div>
                <span className="eyebrow">Siguiente paso recomendado</span>
                <h3>{!profile.name ? "Complete la ficha del evaluado" : results.kpiDone < 7 ? "Registre los resultados comerciales" : results.behaviorDone < 14 ? "Complete las fuentes 360°" : "Prepare la conversación de feedback"}</h3>
              </div>
              <button className="button dark" onClick={() => setView(!profile.name ? "ficha" : results.kpiDone < 7 ? "kpis" : results.behaviorDone < 14 ? "evaluacion" : "feedback")}>Continuar →</button>
            </section>
          </div>
        )}

        {view === "ficha" && (
          <div className="page-content">
            <PageTitle number="02" title="Ficha del evaluado" subtitle="Identifique el periodo, la ruta y las personas responsables del proceso." />
            <section className="panel form-panel">
              <div className="form-grid">
                {[
                  ["name", "Nombre del colaborador", "Ej. Juan Pérez"],
                  ["id", "Documento / ID", "Identificador interno"],
                  ["zone", "Portafolio", "Seleccione un portafolio"],
                  ["route", "Ruta comercial", "Ej. RT-042"],
                  ["period", "Periodo evaluado", "Ej. Enero–Junio 2026"],
                  ["date", "Fecha de evaluación", "dd/mm/aaaa"],
                  ["boss", "Jefe inmediato", "Nombre del supervisor"],
                  ["tenure", "Antigüedad", "Ej. 2 años"],
                ].map(([key, label, placeholder]) => (
                  <label key={key}>
                    {label}
                    {key === "zone" ? (
                      <select
                        value={profile.zone}
                        onChange={(e) => {
                          markDirty();
                          setProfile({ ...profile, zone: e.target.value });
                        }}
                      >
                        <option value="">{placeholder}</option>
                        {portfolioOptions.map((option) => (
                          <option value={option} key={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={profile[key as keyof typeof profile]}
                        placeholder={placeholder}
                        onChange={(e) => {
                          markDirty();
                          setProfile({ ...profile, [key]: e.target.value });
                        }}
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>
            <InfoBanner title="Criterio de aplicación">Defina metas y evaluadores antes de iniciar. La selección recomendada es: 1 jefe, mínimo 2 pares y entre 3 y 5 tenderos representativos.</InfoBanner>
            <FooterActions onSaveAndNext={async () => { if (await saveEvaluation()) goNext(); }} saveState={saveState} />
          </div>
        )}

        {view === "kpis" && (
          <div className="page-content">
            <PageTitle number="03" title="KPIs de resultados" subtitle="Registre resultado y meta con base en fuentes oficiales del sistema comercial." />
            <section className="kpi-overview">
              <div className="kpi-overview-score">
                <span className="eyebrow">Aporte a la evaluación</span>
                <div><strong>{results.kpiPoints.toFixed(1)}</strong><span>/ 30 puntos</span></div>
                <div className="kpi-progress" aria-label={`${results.kpiDone} de 7 indicadores completos`}>
                  <i style={{ width: `${(results.kpiDone / 7) * 100}%` }} />
                </div>
                <small>{results.kpiDone === 7 ? "Bloque completo" : `${7 - results.kpiDone} indicadores pendientes`}</small>
              </div>
              <div className="kpi-overview-stat">
                <span>Indicadores completos</span>
                <strong>{results.kpiDone}<small>/7</small></strong>
              </div>
              <div className={`kpi-overview-stat kpi-average average-${Math.round(kpiAverage)}`}>
                <span>Promedio de nota</span>
                <strong>{kpiAverage ? kpiAverage.toFixed(1) : "—"}<small>/5</small></strong>
                <em>{kpiStatus(Math.round(kpiAverage))}</em>
              </div>
              <div className="kpi-weight">
                <strong>30%</strong>
                <span>Peso en la evaluación final</span>
              </div>
            </section>
            <section className="panel table-panel">
              <div className="kpi-table-heading">
                <div>
                  <span className="eyebrow">Resultados comerciales</span>
                  <h3>Indicadores del periodo</h3>
                </div>
                <span>La nota se calcula automáticamente</span>
              </div>
              <div className="data-table kpi-table">
                <div className="table-head"><span>Indicador</span><span>Peso</span><span>Resultado</span><span>Meta</span><span>Cumplimiento</span><span>Nota</span></div>
                {kpiDefinitions.map((item, index) => {
                  const ratio = Number(kpis[index].target) > 0 ? Number(kpis[index].actual) / Number(kpis[index].target) : 0;
                  const rating = results.kpiRatings[index];
                  const status = kpiStatus(rating);
                  return (
                    <div className={`table-row rating-tone-${rating}`} key={item.code}>
                      <div><b>{item.code}</b><strong>{item.name}</strong><small>{item.description}</small></div>
                      <span>{Math.round(item.weight * 100)}%</span>
                      <div className="number-stepper actual">
                        <button type="button" aria-label={`Disminuir resultado de ${item.name}`} onClick={() => adjustKpi(index, "actual", -1)}>−</button>
                        <input
                          aria-label={`${item.name} resultado`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={kpis[index].actual}
                          onFocus={(event) => event.currentTarget.select()}
                          onWheel={(event) => event.currentTarget.blur()}
                          onChange={(e) => updateKpi(index, "actual", e.target.value)}
                        />
                        <button type="button" aria-label={`Aumentar resultado de ${item.name}`} onClick={() => adjustKpi(index, "actual", 1)}>+</button>
                      </div>
                      <div className="number-stepper target">
                        <button type="button" aria-label={`Disminuir meta de ${item.name}`} onClick={() => adjustKpi(index, "target", -1)}>−</button>
                        <input
                          aria-label={`${item.name} meta`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={kpis[index].target}
                          onFocus={(event) => event.currentTarget.select()}
                          onWheel={(event) => event.currentTarget.blur()}
                          onChange={(e) => updateKpi(index, "target", e.target.value)}
                        />
                        <button type="button" aria-label={`Aumentar meta de ${item.name}`} onClick={() => adjustKpi(index, "target", 1)}>+</button>
                      </div>
                      <span className={`metric metric-${rating}`} aria-label={ratio ? `${(ratio * 100).toFixed(1)} por ciento, ${status}` : status}>
                        <strong>{ratio ? `${(ratio * 100).toFixed(1)}%` : "—"}</strong>
                        <i className="metric-track">
                          <i style={{ width: `${Math.min((ratio / 1.1) * 100, 100)}%` }} />
                          <em className="metric-target" />
                        </i>
                        <small className="metric-status">{status}</small>
                      </span>
                      <span className={`rating rating-${rating || 0}`} aria-label={`Nota ${rating || "pendiente"}`}>{rating || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </section>
            <div className="rating-scale" aria-label="Escala automática de calificación">
              <div><strong>Escala automática</strong><span>Basada en el porcentaje de cumplimiento</span></div>
              {[
                ["1", "< 70%"],
                ["2", "70–84,9%"],
                ["3", "85–99,9%"],
                ["4", "100–109,9%"],
                ["5", "≥ 110%"],
              ].map(([rating, range]) => (
                <span className="rating-scale-item" key={rating}>
                  <i className={`rating rating-${rating}`}>{rating}</i>
                  <small>{range}</small>
                </span>
              ))}
            </div>
            <FooterActions onSaveAndNext={async () => { if (await saveEvaluation()) goNext(); }} saveState={saveState} />
          </div>
        )}

        {view === "evaluacion" && (
          <div className="page-content">
            <PageTitle number="04" title="Evaluación de comportamientos 360°" subtitle="Califique de 1 a 5 únicamente conductas observadas durante el periodo." />
            <div className="source-strip">
              <span><i className="source auto">A</i>Auto 10%</span><span><i className="source boss">J</i>Jefe 40%</span>
              <span><i className="source peer">P</i>Pares 20%</span><span><i className="source client">C</i>Clientes 30%</span>
            </div>
            {["Competencias", "Actitudinal", "Valores"].map((block) => (
              <section className="panel table-panel behavior-section" key={block}>
                <div className="panel-heading compact">
                  <div><span className="eyebrow">{block === "Competencias" ? "Bloque 2 · 30%" : block === "Actitudinal" ? "Bloque 3 · 30%" : "Bloque 4 · 10%"}</span><h3>{block === "Actitudinal" ? "Aspectos longitudinales y actitudinales" : block}</h3></div>
                </div>
                <div className="data-table behavior-table">
                  <div className="table-head"><span>Comportamiento</span><span>Auto</span><span>Jefe</span><span>Pares</span><span>Clientes</span><span>Prom.</span></div>
                  {behaviorDefinitions.map((item, index) => {
                    if (item.block !== block) return null;
                    const behaviorScore = results.behaviorScores[index];
                    const behaviorTone = behaviorScore ? Math.round(behaviorScore) : 0;
                    const status = behaviorStatus(behaviorTone);
                    return (
                    <div className={`table-row behavior-tone-${behaviorTone}`} key={item.code}>
                      <div><b>{item.code}</b><strong>{item.name}</strong><small>{item.behavior}</small></div>
                      {(["auto", "jefe", "pares", "clientes"] as (keyof ScoreRow)[]).map((source) => {
                        const score = scores[index][source];
                        return (
                          <div className={`score-stepper score-${score || 0}`} key={source}>
                            <button
                              type="button"
                              aria-label={`Disminuir nota de ${item.name}, ${source}`}
                              disabled={!score || Number(score) <= 1}
                              onClick={() => adjustScore(index, source, -1)}
                            >−</button>
                            <input
                              aria-label={`${item.name} ${source}`}
                              type="number"
                              inputMode="numeric"
                              min="1"
                              max="5"
                              step="1"
                              placeholder="—"
                              value={score}
                              onFocus={(event) => event.currentTarget.select()}
                              onWheel={(event) => event.currentTarget.blur()}
                              onChange={(event) => setScore(index, source, event.target.value)}
                            />
                            <button
                              type="button"
                              aria-label={`Aumentar nota de ${item.name}, ${source}`}
                              disabled={Number(score) >= 5}
                              onClick={() => adjustScore(index, source, 1)}
                            >+</button>
                          </div>
                        );
                      })}
                      <div className={`weighted-result result-${behaviorTone}`} aria-label={`Promedio ${behaviorScore ? behaviorScore.toFixed(2) : "pendiente"}, ${status}`}>
                        <strong>{behaviorScore ? behaviorScore.toFixed(2) : "—"}</strong>
                        <i><i style={{ width: `${(behaviorScore / 5) * 100}%` }} /></i>
                        <small>{status}</small>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </section>
            ))}
            <InfoBanner title="Regla de evidencia">Las notas 1 y 5 deben acompañarse de un ejemplo verificable durante la conversación de retroalimentación.</InfoBanner>
            <FooterActions onSaveAndNext={async () => { if (await saveEvaluation()) goNext(); }} saveState={saveState} />
          </div>
        )}

        {view === "feedback" && (
          <div className="page-content">
            <PageTitle number="05" title="Feedback y plan de desarrollo" subtitle="Convierta los resultados en acuerdos concretos, medibles y con seguimiento." />
            <div className="feedback-grid">
              {[
                ["start", "Empezar a hacer", "¿Qué conducta nueva elevaría los resultados o la experiencia del tendero?", "start"],
                ["stop", "Dejar de hacer", "¿Qué conducta limita la productividad o genera reprocesos?", "stop"],
                ["continue", "Continuar haciendo", "¿Qué genera valor, confianza y resultados sostenibles?", "continue"],
              ].map(([key, title, prompt, color]) => (
                <label className={`feedback-card ${color}`} key={key}>
                  <span>{title}</span><small>{prompt}</small>
                  <textarea value={feedback[key as keyof typeof feedback]} onChange={(e) => {
                    markDirty();
                    setFeedback({ ...feedback, [key]: e.target.value });
                  }} placeholder="Registre un ejemplo concreto..." />
                </label>
              ))}
            </div>
            <section className="panel form-panel">
              <div className="panel-heading compact"><div><span className="eyebrow">Síntesis gerencial</span><h3>Plan de desarrollo</h3></div></div>
              <div className="form-grid">
                <label>Fortalezas prioritarias<textarea value={feedback.strengths} onChange={(e) => {
                  markDirty();
                  setFeedback({ ...feedback, strengths: e.target.value });
                }} /></label>
                <label>Brechas prioritarias<textarea value={feedback.gaps} onChange={(e) => {
                  markDirty();
                  setFeedback({ ...feedback, gaps: e.target.value });
                }} /></label>
                <label className="full">Acción, responsable, fecha e indicador de éxito<textarea value={feedback.action} onChange={(e) => {
                  markDirty();
                  setFeedback({ ...feedback, action: e.target.value });
                }} /></label>
              </div>
            </section>
            <section className={`completion-card ${results.complete ? "complete" : "pending"}`}>
              <div className="completion-card-heading">
                <div>
                  <span className="eyebrow">Estado del proceso</span>
                  <h3>{results.complete ? "Evaluación lista para cierre" : `Evaluación al ${results.completeness}%`}</h3>
                  <p>{results.complete ? "Resumen consolidado de la evaluación de desempeño 360°." : "Complete los criterios faltantes antes de emitir la calificación definitiva."}</p>
                </div>
                <span className="completion-status">{results.complete ? "Lista para cierre" : "En proceso"}</span>
              </div>
              <div className="completion-summary">
                <div className="completion-main-score">
                  <span>Resultado final</span>
                  <strong>{results.total.toFixed(1)}<small>/100</small></strong>
                  <em>{results.complete ? category(results.total) : "Resultado parcial"}</em>
                </div>
                <div>
                  <span>KPIs de resultados</span>
                  <strong>{results.kpiPoints.toFixed(1)}<small>/30</small></strong>
                </div>
                <div>
                  <span>Comportamientos 360°</span>
                  <strong>{(results.competencePoints + results.attitudePoints + results.valuePoints).toFixed(1)}<small>/70</small></strong>
                </div>
                <div>
                  <span>Completitud</span>
                  <strong>{results.completeness}<small>%</small></strong>
                </div>
              </div>
              <div className="completion-card-footer">
                <div>
                  <span><i style={{ width: `${results.completeness}%` }} /></span>
                  <small>{results.kpiDone + results.behaviorDone} de 21 criterios diligenciados</small>
                </div>
                <button className="button completion-download" onClick={downloadPdfOutput}>Descargar informe PDF</button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function PageTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return <div className="page-title"><span>{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}

function InfoBanner({ title, children }: { title: string; children: React.ReactNode }) {
  return <aside className="info-banner"><strong>{title}</strong><p>{children}</p></aside>;
}

function FooterActions({
  onSaveAndNext,
  saveState,
}: {
  onSaveAndNext: () => Promise<void>;
  saveState: SaveState;
}) {
  return (
    <div className="footer-actions">
      <span>El borrador se conserva en este dispositivo hasta guardarlo.</span>
      <button className="button primary" onClick={onSaveAndNext} disabled={saveState === "saving"}>
        {saveState === "saving" ? "Guardando…" : "Guardar y continuar →"}
      </button>
    </div>
  );
}

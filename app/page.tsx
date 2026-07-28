"use client";

import { useEffect, useMemo, useState } from "react";

type View = "resumen" | "ficha" | "kpis" | "evaluacion" | "feedback";
type ScoreRow = { auto: string; jefe: string; pares: string; clientes: string };

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
        } catch {
          // Ignore malformed device-local data.
        }
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem("tat360-evaluation", JSON.stringify({ profile, kpis, scores, feedback }));
    }
  }, [hydrated, profile, kpis, scores, feedback]);

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

  const updateKpi = (index: number, field: "actual" | "target", value: string) => {
    setKpis((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const updateScore = (index: number, source: keyof ScoreRow, value: string) => {
    setScores((current) => current.map((row, i) => i === index ? { ...row, [source]: value } : row));
  };

  const reset = () => {
    if (!window.confirm("¿Desea borrar todos los datos de esta evaluación?")) return;
    setProfile({ name: "", id: "", zone: "", route: "", period: "", date: "", boss: "", tenure: "" });
    setKpis(kpiDefinitions.map(() => ({ actual: "", target: "" })));
    setScores(emptyScores());
    setFeedback({ start: "", stop: "", continue: "", strengths: "", gaps: "", action: "" });
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
          <div className="brand-mark">T</div>
          <div>
            <strong>TAT 360</strong>
            <span>Gestión del desempeño</span>
          </div>
        </div>

        <div className="cycle-card">
          <span className="eyebrow">Ciclo activo</span>
          <strong>{profile.period || "Periodo sin definir"}</strong>
          <div className="progress-track"><span style={{ width: `${results.completeness}%` }} /></div>
          <small>{results.completeness}% completado</small>
        </div>

        <nav aria-label="Secciones de la evaluación">
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
              <span>{item.short}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="status-dot" />
          Guardado automático en este dispositivo
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Evaluación de desempeño 360°</span>
            <h1>Asesor Comercial TAT</h1>
          </div>
          <div className="top-actions">
            <button className="button ghost" onClick={reset}>Nueva evaluación</button>
            <button className="button primary" onClick={() => window.print()}>Imprimir informe</button>
          </div>
        </header>

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
                  ["zone", "Zona / territorio", "Ej. Bogotá Sur"],
                  ["route", "Ruta comercial", "Ej. RT-042"],
                  ["period", "Periodo evaluado", "Ej. Enero–Junio 2026"],
                  ["date", "Fecha de evaluación", "dd/mm/aaaa"],
                  ["boss", "Jefe inmediato", "Nombre del supervisor"],
                  ["tenure", "Antigüedad", "Ej. 2 años"],
                ].map(([key, label, placeholder]) => (
                  <label key={key}>{label}<input value={profile[key as keyof typeof profile]} placeholder={placeholder} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} /></label>
                ))}
              </div>
            </section>
            <InfoBanner title="Criterio de aplicación">Defina metas y evaluadores antes de iniciar. La selección recomendada es: 1 jefe, mínimo 2 pares y entre 3 y 5 tenderos representativos.</InfoBanner>
            <FooterActions onNext={goNext} />
          </div>
        )}

        {view === "kpis" && (
          <div className="page-content">
            <PageTitle number="03" title="KPIs de resultados" subtitle="Registre resultado y meta con base en fuentes oficiales del sistema comercial." />
            <div className="weight-banner"><strong>30%</strong><span>Peso de resultados cuantitativos en la evaluación final</span><em>{results.kpiDone}/7 completos</em></div>
            <section className="panel table-panel">
              <div className="data-table kpi-table">
                <div className="table-head"><span>Indicador</span><span>Peso</span><span>Resultado</span><span>Meta</span><span>Cumplimiento</span><span>Nota</span></div>
                {kpiDefinitions.map((item, index) => {
                  const ratio = Number(kpis[index].target) > 0 ? Number(kpis[index].actual) / Number(kpis[index].target) : 0;
                  return (
                    <div className="table-row" key={item.code}>
                      <div><b>{item.code}</b><strong>{item.name}</strong><small>{item.description}</small></div>
                      <span>{Math.round(item.weight * 100)}%</span>
                      <input aria-label={`${item.name} resultado`} type="number" min="0" value={kpis[index].actual} onChange={(e) => updateKpi(index, "actual", e.target.value)} />
                      <input aria-label={`${item.name} meta`} type="number" min="0" value={kpis[index].target} onChange={(e) => updateKpi(index, "target", e.target.value)} />
                      <span className="metric">{ratio ? `${(ratio * 100).toFixed(1)}%` : "—"}</span>
                      <span className={`rating rating-${results.kpiRatings[index] || 0}`}>{results.kpiRatings[index] || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </section>
            <InfoBanner title="Escala automática">Menos de 70% = 1 · 70–84,9% = 2 · 85–99,9% = 3 · 100–109,9% = 4 · 110% o más = 5.</InfoBanner>
            <FooterActions onNext={goNext} />
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
                  {behaviorDefinitions.map((item, index) => item.block === block && (
                    <div className="table-row" key={item.code}>
                      <div><b>{item.code}</b><strong>{item.name}</strong><small>{item.behavior}</small></div>
                      {(["auto", "jefe", "pares", "clientes"] as (keyof ScoreRow)[]).map((source) => (
                        <select key={source} aria-label={`${item.name} ${source}`} value={scores[index][source]} onChange={(e) => updateScore(index, source, e.target.value)}>
                          <option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option value={n} key={n}>{n}</option>)}
                        </select>
                      ))}
                      <span className="weighted-result">{results.behaviorScores[index] ? results.behaviorScores[index].toFixed(2) : "—"}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <InfoBanner title="Regla de evidencia">Las notas 1 y 5 deben acompañarse de un ejemplo verificable durante la conversación de retroalimentación.</InfoBanner>
            <FooterActions onNext={goNext} />
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
                  <textarea value={feedback[key as keyof typeof feedback]} onChange={(e) => setFeedback({ ...feedback, [key]: e.target.value })} placeholder="Registre un ejemplo concreto..." />
                </label>
              ))}
            </div>
            <section className="panel form-panel">
              <div className="panel-heading compact"><div><span className="eyebrow">Síntesis gerencial</span><h3>Plan de desarrollo</h3></div></div>
              <div className="form-grid">
                <label>Fortalezas prioritarias<textarea value={feedback.strengths} onChange={(e) => setFeedback({ ...feedback, strengths: e.target.value })} /></label>
                <label>Brechas prioritarias<textarea value={feedback.gaps} onChange={(e) => setFeedback({ ...feedback, gaps: e.target.value })} /></label>
                <label className="full">Acción, responsable, fecha e indicador de éxito<textarea value={feedback.action} onChange={(e) => setFeedback({ ...feedback, action: e.target.value })} /></label>
              </div>
            </section>
            <section className="completion-card">
              <div>
                <span className="eyebrow">Estado del proceso</span>
                <h3>{results.complete ? "Evaluación lista para cierre" : `Evaluación al ${results.completeness}%`}</h3>
                <p>{results.complete ? `Resultado final: ${results.total.toFixed(1)}/100 · ${category(results.total)}` : "Complete los criterios faltantes antes de emitir la calificación definitiva."}</p>
              </div>
              <button className="button dark" onClick={() => window.print()}>Generar informe imprimible</button>
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

function FooterActions({ onNext }: { onNext: () => void }) {
  return <div className="footer-actions"><span>Los cambios se guardan automáticamente.</span><button className="button primary" onClick={onNext}>Guardar y continuar →</button></div>;
}

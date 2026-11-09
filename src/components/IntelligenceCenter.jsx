import { memo, useMemo } from "react";
import { calculateExecutiveAnalysis } from "../utils/executiveAnalysis";

function IntelligenceCenter({ dashboard }) {
  const analysis = useMemo(
    () => calculateExecutiveAnalysis(
      dashboard.beneficiariosFiltrados || [],
      dashboard.historicoTemporal || dashboard.historicoCarteira || []
    ),
    [dashboard.beneficiariosFiltrados, dashboard.historicoTemporal, dashboard.historicoCarteira]
  );

  if (dashboard.carregando || dashboard.erro || dashboard.periodoInvalido || !analysis) return null;

  return (
    <section className="intelligence-center" aria-label="Centro de inteligência executiva">
      <div className="intelligence-center-header">
        <div>
          <span>IA & insights estratégicos</span>
          <h2>Centro de Inteligência</h2>
          <p>Interpretação dos movimentos, riscos e oportunidades da carteira.</p>
        </div>
      </div>

      <article className="intelligence-summary-card">
        <span>Leitura executiva</span>
        <p>{analysis.summary}</p>
      </article>

      <div className="intelligence-discoveries-grid intelligence-discoveries-grid-consolidated">
        {analysis.discoveries.map((item) => (
          <article className={`intelligence-discovery ${item.tone}`} key={item.title}>
            <i>{item.icon}</i><div><span>{item.title}</span><p>{item.text}</p></div>
          </article>
        ))}
      </div>

      <div className="intelligence-main-grid">
        <article className="intelligence-panel recommendations-panel">
          <div className="intelligence-panel-title"><span>Ações sugeridas</span><h3>Recomendações prioritárias</h3></div>
          <div className="intelligence-recommendations">
            {analysis.recommendations.map((item) => (
              <div className={`intelligence-recommendation priority-${item.priority.toLowerCase()}`} key={item.title}>
                <span>{item.priority}</span><div><strong>{item.title}</strong><p>{item.text}</p></div>
              </div>
            ))}
          </div>
        </article>

        <article className="intelligence-panel trends-panel">
          <div className="intelligence-panel-title"><span>Direção dos indicadores</span><h3>Tendências</h3></div>
          <div className="intelligence-trends">
            {analysis.trends.map((item) => (
              <div key={item.label}><span>{item.label}</span><strong className={item.direction}>{item.direction === "up" ? "↗" : item.direction === "down" ? "↘" : "—"} {item.value}</strong></div>
            ))}
          </div>
        </article>
      </div>

      {analysis.timeline.length > 0 && (
        <article className="intelligence-panel timeline-panel">
          <div className="intelligence-panel-title"><span>Principais movimentos</span><h3>Timeline Estratégica</h3></div>
          <div className="intelligence-timeline">
            {analysis.timeline.map((item) => (
              <div key={`${item.period}-${item.title}`} className={item.positive ? "positive" : "negative"}>
                <time>{item.period}</time><i /><section><strong>{item.title}</strong><p>{item.text}</p></section>
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}

export default memo(IntelligenceCenter);

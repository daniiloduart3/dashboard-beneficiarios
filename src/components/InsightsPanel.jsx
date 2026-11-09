import { getAnalysisContext } from "../utils/analysisContext";

export default function InsightsPanel({ dashboard }) {
  const { carregando, erro, periodoInvalido, insightsExecutivos } = dashboard;
  if (carregando || erro || periodoInvalido || !insightsExecutivos) return null;

  const context = getAnalysisContext(dashboard);
  const { estadoLider, cidadeLider, empresaLider, faixaLider, tipoLider, resumo } = insightsExecutivos;
  const localLeader = context.level === "brasil" ? estadoLider : context.level === "estado" ? cidadeLider : null;
  const localLabel = context.level === "brasil" ? "Estado líder" : context.level === "estado" ? "Município líder" : "Município analisado";
  const localName = context.level === "municipio" ? context.city : localLeader?.nome;
  const localDetail = context.level === "municipio"
    ? `${dashboard.totalBeneficiarios?.toLocaleString("pt-BR") || "0"} vidas na seleção`
    : localLeader
      ? `${localLeader.quantidade.toLocaleString("pt-BR")} vidas${Number.isFinite(localLeader.percentual) ? ` · ${localLeader.percentual.toFixed(1)}%` : ""}`
      : "Sem dados";

  return (
    <section className="insights-executivos">
      <div className="insights-cabecalho"><div><span className="insights-etiqueta">Leitura automática</span><h2>Insights da seleção</h2><p>Principais destaques calculados para {context.scopeLabel} com os filtros aplicados.</p></div><div className="insights-icone" aria-hidden="true">📈</div></div>
      <div className="insights-grid">
        <article className="insight-card"><span>{localLabel}</span><strong>{localName || "—"}</strong><p>{localDetail}</p></article>
        {context.level === "brasil" && <article className="insight-card"><span>Cidade líder</span><strong>{cidadeLider?.nome || "—"}</strong><p>{cidadeLider ? `${cidadeLider.quantidade.toLocaleString("pt-BR")} vidas` : "Sem dados"}</p></article>}
        <article className="insight-card"><span>Empresa líder</span><strong title={empresaLider?.nome || ""}>{empresaLider?.nome || "—"}</strong><p>{empresaLider ? `${empresaLider.quantidade.toLocaleString("pt-BR")} vidas` : "Sem dados"}</p></article>
        <article className="insight-card"><span>Faixa predominante</span><strong>{faixaLider?.faixa || "—"}</strong><p>{faixaLider ? `${faixaLider.quantidade.toLocaleString("pt-BR")} vidas · ${faixaLider.percentual.toFixed(1)}%` : "Sem dados"}</p></article>
        <article className="insight-card"><span>Tipo predominante</span><strong>{tipoLider?.nome || "—"}</strong><p>{tipoLider ? `${tipoLider.quantidade.toLocaleString("pt-BR")} vidas · ${tipoLider.percentual.toFixed(1)}%` : "Sem dados"}</p></article>
      </div>
      <div className="insights-resumo"><span aria-hidden="true">✨</span><p>{resumo}</p></div>
    </section>
  );
}

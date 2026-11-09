import { memo, useMemo } from "react";
import { getAnalysisContext } from "../utils/analysisContext";

const formatInt = (value) => Number(value || 0).toLocaleString("pt-BR");
const formatSignedInt = (value) => {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? "+" : ""}${formatInt(Math.round(numeric))}`;
};
const formatPct = (value) => Number.isFinite(Number(value))
  ? `${Number(value) >= 0 ? "+" : ""}${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  : "—";

const CONSOLIDATION_SHARE = 0.1;
const CONSOLIDATION_STREAK = 3;

function Metric({ label, value, detail, tone = "neutral" }) {
  return (
    <article className={`intelligence-kpi tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function findConsolidatedStart(data) {
  const completeMonths = data.filter((item) => !item.parcial);
  if (!completeMonths.length) return 0;

  const peak = Math.max(...completeMonths.map((item) => Number(item.vidasAtivas || 0)), 0);
  const threshold = Math.max(1, Math.ceil(peak * CONSOLIDATION_SHARE));

  for (let index = 0; index <= completeMonths.length - CONSOLIDATION_STREAK; index += 1) {
    const sustained = completeMonths
      .slice(index, index + CONSOLIDATION_STREAK)
      .every((item) => Number(item.vidasAtivas || 0) >= threshold);

    if (sustained) {
      const target = completeMonths[index];
      const originalIndex = data.findIndex((item) => item === target);
      return originalIndex >= 0 ? originalIndex : 0;
    }
  }

  return 0;
}

function GrowthIntelligence({ dashboard }) {
  const { historicoCarteira = [], resumoHistorico = {} } = dashboard;
  const context = useMemo(() => getAnalysisContext(dashboard), [dashboard]);

  const analysis = useMemo(() => {
    const fullData = Array.isArray(historicoCarteira) ? historicoCarteira : [];
    const consolidatedStartIndex = findConsolidatedStart(fullData);
    const consolidatedData = fullData.slice(consolidatedStartIndex);

    // O mês corrente é parcial e não entra na média. A primeira competência
    // consolidada estabelece a base; somente os meses seguintes são comparáveis.
    const comparableData = consolidatedData
      .filter((item, index) => index > 0 && !item.parcial && Number.isFinite(Number(item.saldo)));

    const validGrowth = comparableData.filter((item) => Number.isFinite(Number(item.crescimento)));
    const positiveMonths = comparableData.filter((item) => Number(item.saldo || 0) > 0).length;
    const negativeMonths = comparableData.filter((item) => Number(item.saldo || 0) < 0).length;
    const stableMonths = Math.max(0, comparableData.length - positiveMonths - negativeMonths);
    const averageBalance = comparableData.length
      ? comparableData.reduce((sum, item) => sum + Number(item.saldo || 0), 0) / comparableData.length
      : 0;

    const bestBalance = [...comparableData].sort((a, b) => Number(b.saldo || 0) - Number(a.saldo || 0))[0] || null;
    const worstBalance = [...comparableData].sort((a, b) => Number(a.saldo || 0) - Number(b.saldo || 0))[0] || null;
    const bestGrowth = [...validGrowth].sort((a, b) => Number(b.crescimento) - Number(a.crescimento))[0] || null;
    const highestInclusions = [...consolidatedData]
      .filter((item) => !item.parcial)
      .sort((a, b) => Number(b.inclusoes || 0) - Number(a.inclusoes || 0))[0] || null;

    const recentComparable = comparableData.slice(-2);
    const previous = recentComparable.at(-2) || null;
    const last = recentComparable.at(-1) || null;
    const lastBalance = Number(last?.saldo || 0);
    const previousBalance = Number(previous?.saldo || 0);

    let trend = "Estável";
    if (last && previous && lastBalance > previousBalance) trend = "Em aceleração";
    if (last && previous && lastBalance < previousBalance) trend = "Em desaceleração";
    if (last && lastBalance < 0) trend = "Em retração";

    const consistency = comparableData.length ? (positiveMonths / comparableData.length) * 100 : 0;
    const consolidatedNet = comparableData.reduce((sum, item) => sum + Number(item.saldo || 0), 0);
    const status = consolidatedNet > 0 && consistency >= 70
      ? "Crescimento consistente"
      : consolidatedNet > 0
        ? "Crescimento moderado"
        : "Carteira em atenção";

    return {
      fullData,
      consolidatedData,
      comparableData,
      positiveMonths,
      negativeMonths,
      stableMonths,
      averageBalance,
      bestBalance,
      worstBalance,
      bestGrowth,
      highestInclusions,
      last,
      previous,
      trend,
      consistency,
      consolidatedNet,
      status,
      start: consolidatedData[0] || null,
      end: comparableData.at(-1) || consolidatedData.at(-1) || null,
    };
  }, [historicoCarteira]);

  const scopeText = context.level === "brasil"
    ? "Brasil"
    : context.level === "estado"
      ? `estado de ${context.state}`
      : `município de ${context.city}`;

  const recommendations = useMemo(() => {
    const items = [];
    if (analysis.trend === "Em desaceleração" || analysis.trend === "Em retração") {
      items.push({ level: "Alta", title: "Recuperar o ritmo de crescimento", text: `Investigue os meses e os segmentos que mais contribuíram para a redução do saldo no ${scopeText}.` });
    } else {
      items.push({ level: "Alta", title: "Preservar o ritmo atual", text: `Mantenha o acompanhamento mensal dos canais e empresas que sustentam o saldo positivo no ${scopeText}.` });
    }
    if (analysis.negativeMonths > 0) {
      items.push({ level: "Média", title: "Reduzir oscilações negativas", text: `${analysis.negativeMonths} mês(es) comparável(is) apresentaram saldo negativo na série consolidada.` });
    } else {
      items.push({ level: "Média", title: "Replicar os melhores desempenhos", text: `${analysis.bestBalance?.competenciaCompleta || "O melhor mês"} registrou o maior saldo líquido da seleção.` });
    }
    items.push({ level: "Baixa", title: "Planejar com base no saldo mensal", text: `O saldo líquido médio foi de ${formatSignedInt(analysis.averageBalance)} vidas por mês na série consolidada.` });
    return items.slice(0, 3);
  }, [analysis, scopeText]);

  const periodLabel = analysis.start && analysis.end
    ? `${analysis.start.competenciaCompleta} a ${analysis.end.competenciaCompleta}`
    : "sem período comparável disponível";

  return (
    <section className="module-intelligence growth-intelligence">
      <div className="intelligence-kpis-grid">
        <Metric
          label="Inclusões históricas"
          value={formatInt(resumoHistorico.inclusoes)}
          detail={`${resumoHistorico.mesesAnalisados || 0} competências exibidas`}
          tone="info"
        />
        <Metric
          label="Crescimento acumulado"
          value={formatPct(resumoHistorico.crescimentoAcumulado)}
          detail={`recorte atual: ${scopeText}`}
          tone={Number(resumoHistorico.crescimentoAcumulado || 0) >= 0 ? "success" : "danger"}
        />
        <Metric
          label="Saldo líquido"
          value={formatSignedInt(resumoHistorico.saldoLiquido)}
          detail="diferença entre o primeiro e o último fechamento exibidos"
          tone={Number(resumoHistorico.saldoLiquido || 0) >= 0 ? "success" : "danger"}
        />
        <Metric
          label="Consistência do crescimento"
          value={`${analysis.consistency.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`}
          detail={`${analysis.positiveMonths} de ${analysis.comparableData.length} meses comparáveis com saldo positivo`}
          tone={analysis.consistency >= 70 ? "success" : analysis.consistency >= 50 ? "warning" : "danger"}
        />
      </div>

      <div className="intelligence-insights-grid">
        <article className="intelligence-card intelligence-summary">
          <span>Leitura de crescimento · {scopeText}</span>
          <h3>{analysis.status}</h3>
          <p>
            A carteira apresenta <strong>{analysis.trend.toLowerCase()}</strong> no último mês completo comparável.
            O saldo líquido médio foi de <strong>{formatSignedInt(analysis.averageBalance)} vidas por mês</strong>, com
            crescimento positivo em <strong>{analysis.positiveMonths} de {analysis.comparableData.length} meses comparáveis</strong>.
            {analysis.bestBalance ? <> O melhor saldo ocorreu em <strong>{analysis.bestBalance.competenciaCompleta}</strong>.</> : null}
          </p>
          <div className="growth-methodology" role="note" aria-label="Metodologia do cálculo de crescimento">
            <strong>Como o cálculo é feito</strong>
            <p>
              A análise começa na primeira competência em que a carteira alcança pelo menos 10% do maior fechamento do recorte e mantém esse nível por três meses consecutivos. O saldo mensal é a diferença entre dois fechamentos consecutivos; a primeira competência serve apenas como base e o mês atual parcial não entra na média.
            </p>
            <small>
              Período consolidado: {periodLabel}. A análise respeita Estado, Cidade, Faixa etária, Empresa e Tipo de cadastro, recalculando o ponto de partida e todos os indicadores para o recorte selecionado. Os filtros de Inclusão inicial e Inclusão final não são aplicados nesta aba, pois a evolução utiliza todo o histórico disponível do grupo analisado.
            </small>
          </div>
        </article>

        <article className="intelligence-card">
          <span>Destaques da evolução · {scopeText}</span>
          <h3>Principais movimentos</h3>
          <div className="highlight-list">
            <div><b>Maior saldo líquido</b><strong>{analysis.bestBalance ? formatSignedInt(analysis.bestBalance.saldo) : "—"}</strong><small>{analysis.bestBalance?.competenciaCompleta || "Sem dados"}</small></div>
            <div><b>Maior volume de inclusões</b><strong>{analysis.highestInclusions ? formatInt(analysis.highestInclusions.inclusoes) : "—"}</strong><small>{analysis.highestInclusions?.competenciaCompleta || "Sem dados"}</small></div>
            <div><b>Melhor crescimento mensal</b><strong>{analysis.bestGrowth ? formatPct(analysis.bestGrowth.crescimento) : "—"}</strong><small>{analysis.bestGrowth?.competenciaCompleta || "Sem base comparável"}</small></div>
            <div><b>Competência de atenção</b><strong>{analysis.worstBalance ? formatSignedInt(analysis.worstBalance.saldo) : "—"}</strong><small>{analysis.worstBalance?.competenciaCompleta || "Sem dados"}</small></div>
          </div>
        </article>
      </div>

      <article className="intelligence-card recommendation-card">
        <span>Ações sugeridas · {scopeText}</span>
        <h3>Prioridades para sustentar o crescimento</h3>
        <div className="recommendation-list">
          {recommendations.map((item) => (
            <div key={item.title}>
              <em>{item.level}</em>
              <section><strong>{item.title}</strong><p>{item.text}</p></section>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export default memo(GrowthIntelligence);

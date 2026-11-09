import { memo, useMemo } from "react";
import { getAnalysisContext } from "../utils/analysisContext";
import EChart from "./EChart";
import NumeroAnimado from "./NumeroAnimado";
import { calculateExecutiveAnalysis } from "../utils/executiveAnalysis";
import { identificarFaixaEtaria, identificarTipoCadastro } from "../utils/dashboard";

const formatNumber = (value) => Number(value || 0).toLocaleString("pt-BR");
const formatPct = (value) => `${Math.abs(Number(value || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function getDate(row, keys) {
  for (const key of keys) {
    const raw = row?.[key];
    if (!raw) continue;
    const text = String(raw).trim();
    const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    const iso = new Date(text);
    if (!Number.isNaN(iso.getTime())) return iso;
  }
  return null;
}

function getLast30Cancellations({
  rows = [],
  endDate,
  estadoSelecionado = "Todos",
  cidadeSelecionada = "Todas",
  faixaEtariaSelecionada = "Todas",
  empresaSelecionada = "Todas",
  tipoCadastroSelecionado = "Todos",
}) {
  const filtered = rows.filter((row) => {
    const estado = row?.["Estado de correspondência"] || row?.["Estado de Correspondência"] || row?.Estado || row?.UF;
    const cidade = row?.["Cidade de correspondência"] || row?.["Cidade de Correspondência"] || row?.Cidade;
    const empresa = row?.Empresa;
    const faixa = identificarFaixaEtaria(row?.Idade);
    const tipo = identificarTipoCadastro(empresa);

    return (estadoSelecionado === "Todos" || estado === estadoSelecionado)
      && (cidadeSelecionada === "Todas" || cidade === cidadeSelecionada)
      && (faixaEtariaSelecionada === "Todas" || faixa === faixaEtariaSelecionada)
      && (empresaSelecionada === "Todas" || empresa === empresaSelecionada)
      && (tipoCadastroSelecionado === "Todos" || tipo === tipoCadastroSelecionado);
  });

  const cancellations = filtered
    .map((row) => getDate(row, ["Data de cancelamento", "Data de Cancelamento"]))
    .filter(Boolean);

  if (!cancellations.length) return 0;

  const reference = endDate
    ? new Date(endDate)
    : new Date(Math.max(...cancellations.map((date) => date.getTime())));

  reference.setHours(23, 59, 59, 999);
  const start = new Date(reference);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  return cancellations.filter((date) => date >= start && date <= reference).length;
}

function buildPerformanceOptions(history = [], dark = false) {
  const points = history.slice(-12);
  const labels = points.map((item) => item.competencia);
  const axis = dark ? "#94a3b8" : "#64748b";
  const grid = dark ? "rgba(148,163,184,.14)" : "#e7edf5";
  const common = {
    animationDuration: 450,
    grid: { left: 48, right: 22, top: 26, bottom: 42 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: labels, axisTick: { show: false }, axisLabel: { color: axis } },
    yAxis: { type: "value", axisLabel: { color: axis }, splitLine: { lineStyle: { color: grid } } },
  };
  return {
    portfolio: {
      ...common,
      series: [{ name: "Beneficiários", type: "line", smooth: true, symbolSize: 6, data: points.map((item) => item.vidasAtivas), lineStyle: { width: 3 }, areaStyle: { opacity: .08 } }],
    },
    movements: {
      ...common,
      legend: { top: 0, textStyle: { color: axis } },
      series: [
        { name: "Inclusões", type: "bar", data: points.map((item) => item.inclusoes), barMaxWidth: 24 },
        { name: "Cancelamentos", type: "bar", data: points.map((item) => item.cancelamentos), barMaxWidth: 24 },
      ],
    },
    balance: {
      ...common,
      series: [{
        name: "Saldo líquido",
        type: "bar",
        data: points.map((item) => {
          const saldo = Number(item.saldo || 0);
          return {
            value: saldo,
            itemStyle: {
              color: saldo < 0 ? "#ef4444" : "#4f74df",
              opacity: .9,
              borderRadius: saldo < 0 ? [0, 0, 4, 4] : [4, 4, 0, 0],
            },
          };
        }),
        barMaxWidth: 32,
      }],
    },
  };
}

function ExecutiveOverviewV2({ dashboard }) {
  const {
    carregando,
    erro,
    periodoInvalido,
    totalBeneficiarios,
    totalCidades,
    beneficiariosFiltrados,
    todosBeneficiarios = [],
    inclusoesUltimos30Dias,
    comparativoInclusoes,
    historicoCarteira,
    historicoTemporal,
    temaEscuro,
    dataFinalConvertida,
    estadoSelecionado,
    cidadeSelecionada,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
  } = dashboard;

  const context = getAnalysisContext(dashboard);

  const serieHistorica = historicoTemporal || historicoCarteira || [];

  const analysis = useMemo(
    () => calculateExecutiveAnalysis(beneficiariosFiltrados || [], serieHistorica),
    [beneficiariosFiltrados, serieHistorica]
  );

  const totalEstados = useMemo(() => new Set((beneficiariosFiltrados || []).map((item) => item["Estado de correspondência"]).filter(Boolean)).size, [beneficiariosFiltrados]);
  const cancelamentos30 = useMemo(() => getLast30Cancellations({
    rows: todosBeneficiarios,
    endDate: dataFinalConvertida,
    estadoSelecionado,
    cidadeSelecionada,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
  }), [
    todosBeneficiarios,
    dataFinalConvertida,
    estadoSelecionado,
    cidadeSelecionada,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
  ]);
  const charts = useMemo(() => buildPerformanceOptions(serieHistorica, temaEscuro), [serieHistorica, temaEscuro]);

  if (carregando || erro || periodoInvalido || !analysis) return null;

  const risks = analysis.discoveries.filter((item) => item.tone === "negative" || item.tone === "warning").slice(0, 3);
  const opportunities = [
    context.level === "brasil" && analysis.metrics.states < 27 && { title: "Ampliar cobertura", text: `${27 - analysis.metrics.states} UFs ainda não aparecem na seleção atual.` },
    context.level === "estado" && totalCidades > 0 && { title: "Aprofundar presença municipal", text: `${totalCidades} municípios aparecem na seleção de ${context.state}.` },
    context.level === "municipio" && { title: "Consolidar o município", text: `Acompanhar crescimento e retenção em ${context.city} com os filtros atuais.` },
    analysis.metrics.top5Share < 50 && { title: "Diversificação favorável", text: "A concentração empresarial permanece em nível administrável." },
    analysis.dimensions.find((item) => item.key === "growth")?.score >= 70 && { title: "Sustentar crescimento", text: "O desempenho histórico cria espaço para expansão com controle de retenção." },
  ].filter(Boolean).slice(0, 3);

  return (
    <>
      <section className="cards-container executive-kpi-cards exec-v2-kpis-restored" aria-label="Indicadores executivos">
        <article className="card">
          <div className="card-icone" aria-hidden="true">👥</div>
          <div className="card-conteudo">
            <h2>Beneficiários ativos</h2>
            <strong><NumeroAnimado valor={totalBeneficiarios} /></strong>
            <span className="card-legenda">Vidas ativas na seleção</span>
          </div>
        </article>

        <article className="card">
          <div className="card-icone" aria-hidden="true">📅</div>
          <div className="card-conteudo">
            <h2>Inclusões nos últimos 30 dias</h2>
            <strong><NumeroAnimado valor={inclusoesUltimos30Dias} /></strong>
            <div className={`comparativo-inclusoes comparativo-${comparativoInclusoes?.tendencia || "estavel"}`}>
              <span aria-hidden="true">{comparativoInclusoes?.tendencia === "alta" ? "▲" : comparativoInclusoes?.tendencia === "baixa" ? "▼" : "●"}</span>
              <span>{comparativoInclusoes?.texto || "Sem comparação com o período anterior"}</span>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-icone" aria-hidden="true">🚪</div>
          <div className="card-conteudo">
            <h2>Cancelamentos nos últimos 30 dias</h2>
            <strong><NumeroAnimado valor={cancelamentos30} /></strong>
            <span className="card-legenda">Janela encerrada na data final selecionada</span>
          </div>
        </article>

        <article className="card">
          <div className="card-icone" aria-hidden="true">🌎</div>
          <div className="card-conteudo">
            <h2>{context.level === "brasil" ? "Presença territorial" : context.level === "estado" ? "Cobertura municipal" : "Recorte territorial"}</h2>
            <strong>{context.level === "brasil" ? <NumeroAnimado valor={totalEstados} sufixo=" UFs" /> : context.level === "estado" ? <NumeroAnimado valor={totalCidades} sufixo=" municípios" /> : context.city}</strong>
            <span className="card-legenda">{context.level === "brasil" ? `${formatNumber(totalCidades)} municípios` : context.level === "estado" ? `no estado de ${context.state}` : `${formatNumber(totalBeneficiarios)} vidas na seleção`}</span>
          </div>
        </article>
      </section>

      <section className="exec-v2-section exec-v2-summary">
        <header><span>Resumo executivo</span><h2>O que aconteceu na seleção?</h2></header>
        <p>{analysis.summary} A leitura considera exclusivamente os filtros aplicados e prioriza crescimento, retenção, concentração e cobertura.</p>
      </section>

      <section className="exec-v2-section">
        <header><span>Desempenho da carteira</span><h2>Como evoluímos?</h2><p>Histórico completo do recorte selecionado; os filtros de período de inclusão não alteram estas séries.</p></header>
        <div className="exec-v2-chart-grid">
          <article><h3>Evolução dos beneficiários</h3><EChart option={charts.portfolio} className="exec-v2-chart" /></article>
          <article><h3>Inclusões × cancelamentos</h3><EChart option={charts.movements} className="exec-v2-chart" /></article>
          <article><h3>Saldo líquido mensal</h3><EChart option={charts.balance} className="exec-v2-chart" /></article>
        </div>
      </section>

      <section className="exec-v2-section">
        <header><span>Qualidade da carteira</span><h2>A carteira está saudável?</h2></header>
        <div className="exec-v2-quality-grid">
          <article className={`exec-v2-score ${analysis.scoreStatus.className}`}><span>Executive Score</span><strong>{analysis.executiveScore}<small>/100</small></strong><b>{analysis.scoreStatus.label}</b></article>
          <article className="exec-v2-dimensions">
            {analysis.dimensions.filter((item) => ["growth", "coverage", "companies", "demography", "cancellations"].includes(item.key)).map((item) => (
              <div key={item.key}><span>{item.name}</span><div><i style={{ width: `${item.score}%` }} /></div><strong>{item.score}</strong></div>
            ))}
          </article>
        </div>
      </section>

      <section className="exec-v2-section">
        <header><span>Foco de gestão</span><h2>Onde devemos agir?</h2></header>
        <div className="exec-v2-focus-grid">
          <article className="exec-v2-focus risks"><h3>Riscos</h3>{risks.length ? risks.map((item) => <div key={item.title}><strong>{item.title}</strong><p>{item.text}</p></div>) : <div><strong>Sem risco crítico</strong><p>Os indicadores não apontam deterioração relevante na seleção atual.</p></div>}</article>
          <article className="exec-v2-focus opportunities"><h3>Oportunidades</h3>{opportunities.map((item) => <div key={item.title}><strong>{item.title}</strong><p>{item.text}</p></div>)}</article>
        </div>
      </section>

      <section className="exec-v2-section exec-v2-actions">
        <header><span>Ações recomendadas</span><h2>Próximos passos</h2></header>
        <div>{analysis.recommendations.map((item, index) => <article key={item.title}><b>{index + 1}</b><div><span>{item.priority} prioridade</span><strong>{item.title}</strong><p>{item.text}</p></div></article>)}</div>
      </section>
    </>
  );
}

export default memo(ExecutiveOverviewV2);

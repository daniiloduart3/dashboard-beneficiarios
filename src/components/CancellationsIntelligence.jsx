import { memo, useMemo } from "react";
import { getAnalysisContext, getLocationValue } from "../utils/analysisContext";
import { empresaValidaParaAnalise } from "../utils/dashboard";

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value).trim();
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCancellationDate(item) {
  return parseDate(item?.["Data de cancelamento"] ?? item?.["Data de Cancelamento"]);
}
function getReason(item) {
  return String(item?.["Motivo do cancelamento"] ?? item?.["Motivo de cancelamento"] ?? "Não informado").trim() || "Não informado";
}
function getCompany(item) { return String(item?.Empresa ?? "Não informado").trim() || "Não informado"; }
function getAgeBand(item) {
  const age = Number(String(item?.Idade ?? "").replace(",", "."));
  if (!Number.isFinite(age)) return "Não informada";
  if (age <= 17) return "0–17 anos";
  if (age <= 29) return "18–29 anos";
  if (age <= 39) return "30–39 anos";
  if (age <= 49) return "40–49 anos";
  if (age <= 59) return "50–59 anos";
  return "60 anos ou mais";
}
function topBy(records, getter) {
  const counts = new Map();
  records.forEach((item) => { const key = getter(item); counts.set(key, (counts.get(key) || 0) + 1); });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || ["—", 0];
}
function pct(value) { return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function Metric({ label, value, detail, tone = "neutral" }) {
  return <article className={`intelligence-kpi tone-${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function CancellationsIntelligence({ dashboard }) {
  const {
    todosBeneficiariosFiltradosHistorico = [],
    historicoTemporal,
    historicoCarteira = [],
    resumoTemporal,
    resumoHistorico = {},
  } = dashboard;
  const serieHistorica = historicoTemporal || historicoCarteira;
  const resumoSerie = resumoTemporal || resumoHistorico;
  const context = getAnalysisContext(dashboard);
  const analysis = useMemo(() => {
    const cancelled = todosBeneficiariosFiltradosHistorico.filter((item) => getCancellationDate(item));
    const last = serieHistorica.at(-1) || { cancelamentos: 0, inclusoes: 0 };
    const previous = serieHistorica.at(-2) || { cancelamentos: 0, inclusoes: 0 };
    const variation = previous.cancelamentos > 0 ? ((last.cancelamentos - previous.cancelamentos) / previous.cancelamentos) * 100 : last.cancelamentos > 0 ? 100 : 0;
    const [topReason, topReasonCount] = topBy(cancelled, getReason);
    const cancelamentosEmpresariais = cancelled.filter((item) =>
      empresaValidaParaAnalise(getCompany(item))
    );
    const [topCompany, topCompanyCount] = topBy(cancelamentosEmpresariais, getCompany);
    const [topLocation, topLocationCount] = topBy(cancelled, (item) => getLocationValue(item, context));
    const [topAge, topAgeCount] = topBy(cancelled, getAgeBand);
    const churn = Number(resumoSerie.churnMedio || 0);
    const retention = Math.max(0, 100 - churn);
    const risk = churn >= 4 || variation >= 25 ? "Crítico" : churn >= 2 || variation > 5 ? "Atenção" : "Controlado";
    return { cancelled, last, previous, variation, topReason, topReasonCount, topCompany, topCompanyCount, topLocation, topLocationCount, topAge, topAgeCount, churn, retention, risk };
  }, [todosBeneficiariosFiltradosHistorico, serieHistorica, resumoSerie, context.level, context.city]);

  const total = Number(resumoHistorico.cancelamentos || analysis.cancelled.length || 0);
  const recommendations = [
    { level: "Alta", title: "Atuar sobre a principal origem de evasão", text: `${analysis.topReason} responde por ${analysis.topReasonCount.toLocaleString("pt-BR")} cancelamentos na seleção.` },
    { level: "Média", title: "Priorizar acompanhamento empresarial", text: `${analysis.topCompany} concentra o maior volume de saídas (${analysis.topCompanyCount.toLocaleString("pt-BR")}).` },
    { level: "Baixa", title: "Monitorar o perfil mais exposto", text: `${analysis.topAge} é a faixa etária com mais cancelamentos no recorte atual.` },
  ];

  return <section className="module-intelligence cancellations-intelligence">
    <div className="intelligence-kpis-grid">
      <Metric label="Cancelamentos históricos" value={total.toLocaleString("pt-BR")} detail="na seleção atual" tone="danger" />
      <Metric label="Taxa média de cancelamento" value={`${pct(analysis.churn)}%`} detail="média mensal sobre a carteira" tone={analysis.churn >= 2 ? "warning" : "success"} />
      <Metric label="Saldo líquido" value={`${Number(resumoHistorico.saldoLiquido || 0) >= 0 ? "+" : ""}${Number(resumoHistorico.saldoLiquido || 0).toLocaleString("pt-BR")}`} detail="inclusões menos cancelamentos" tone={Number(resumoHistorico.saldoLiquido || 0) >= 0 ? "success" : "danger"} />
      <Metric label="Índice de retenção" value={`${pct(analysis.retention)}%`} detail={`situação: ${analysis.risk}`} tone={analysis.risk === "Controlado" ? "success" : analysis.risk === "Atenção" ? "warning" : "danger"} />
    </div>

    <div className="intelligence-insights-grid">
      <article className="intelligence-card intelligence-summary">
        <span>Leitura de retenção</span><h3>Resumo dos cancelamentos</h3>
        <p>{analysis.last.cancelamentos > analysis.previous.cancelamentos ? "Os cancelamentos aceleraram" : analysis.last.cancelamentos < analysis.previous.cancelamentos ? "Os cancelamentos recuaram" : "Os cancelamentos permaneceram estáveis"} no último mês disponível. O principal motivo é <strong>{analysis.topReason}</strong>, com maior concentração em <strong>{analysis.topCompany}</strong> e {context.level === "brasil" ? "no estado" : context.level === "estado" ? "no município" : "no recorte municipal"} <strong>{analysis.topLocation}</strong>.</p>
      </article>
      <article className="intelligence-card"><span>Destaques da evasão</span><h3>Onde estão as perdas</h3><div className="highlight-list">
        <div><b>Motivo líder</b><strong>{analysis.topReason}</strong><small>{analysis.topReasonCount.toLocaleString("pt-BR")} registros</small></div>
        <div><b>Empresa mais impactada</b><strong>{analysis.topCompany}</strong><small>{analysis.topCompanyCount.toLocaleString("pt-BR")} saídas</small></div>
        <div><b>{context.level === "brasil" ? "Estado com mais perdas" : context.level === "estado" ? "Município com mais perdas" : "Município analisado"}</b><strong>{analysis.topLocation}</strong><small>{analysis.topLocationCount.toLocaleString("pt-BR")} cancelamentos</small></div>
        <div><b>Faixa etária mais exposta</b><strong>{analysis.topAge}</strong><small>{analysis.topAgeCount.toLocaleString("pt-BR")} cancelamentos</small></div>
      </div></article>
    </div>

    <article className="intelligence-card recommendation-card"><span>Ações sugeridas</span><h3>Prioridades de retenção</h3><div className="recommendation-list">{recommendations.map((item) => <div key={item.title}><em>{item.level}</em><section><strong>{item.title}</strong><p>{item.text}</p></section></div>)}</div></article>
  </section>;
}
export default memo(CancellationsIntelligence);

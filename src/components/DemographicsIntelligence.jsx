import { memo, useMemo } from "react";
import { getAnalysisContext, getLocationValue } from "../utils/analysisContext";

function getAge(item) {
  const age = Number(String(item?.Idade ?? "").replace(",", "."));
  return Number.isFinite(age) && age >= 0 && age <= 120 ? age : null;
}
function getSex(item) {
  const value = String(item?.Sexo ?? item?.["Sexo do beneficiário"] ?? item?.Gênero ?? item?.Genero ?? "Não informado").trim().toLocaleUpperCase("pt-BR");
  if (value.startsWith("F")) return "Feminino";
  if (value.startsWith("M")) return "Masculino";
  return "Não informado";
}
function getBand(age) {
  if (age === null) return "Não informada";
  if (age <= 17) return "0–17 anos";
  if (age <= 29) return "18–29 anos";
  if (age <= 39) return "30–39 anos";
  if (age <= 49) return "40–49 anos";
  if (age <= 59) return "50–59 anos";
  return "60 anos ou mais";
}
function pct(value) { return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function Metric({ label, value, detail, tone = "neutral" }) { return <article className={`intelligence-kpi tone-${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }

function DemographicsIntelligence({ dashboard }) {
  const { beneficiariosFiltrados = [] } = dashboard;
  const context = getAnalysisContext(dashboard);
  const analysis = useMemo(() => {
    const ages = beneficiariosFiltrados.map(getAge).filter((age) => age !== null);
    const averageAge = ages.length ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;
    const bands = new Map(); const sexes = new Map(); const locations = new Map();
    beneficiariosFiltrados.forEach((item) => {
      const age = getAge(item); const band = getBand(age); const sex = getSex(item); const location = getLocationValue(item, context);
      bands.set(band, (bands.get(band) || 0) + 1); sexes.set(sex, (sexes.get(sex) || 0) + 1);
      if (!locations.has(location)) locations.set(location, []); if (age !== null) locations.get(location).push(age);
    });
    const sortedBands = [...bands.entries()].filter(([name]) => name !== "Não informada").sort((a, b) => b[1] - a[1]);
    const leaderBand = sortedBands[0] || ["—", 0];
    const total = beneficiariosFiltrados.length || 1;
    const femaleShare = ((sexes.get("Feminino") || 0) / total) * 100;
    const maleShare = ((sexes.get("Masculino") || 0) / total) * 100;
    const dominantShare = (leaderBand[1] / total) * 100;
    const diversity = Math.max(0, Math.min(100, 100 - Math.max(0, dominantShare - 20) * 1.25));
    const locationAges = [...locations.entries()].map(([location, values]) => ({ location, mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0, count: values.length })).filter((item) => item.count >= 3).sort((a, b) => a.mean - b.mean);
    const youngest = locationAges[0] || { location: context.scopeLabel, mean: averageAge };
    const oldest = locationAges.at(-1) || { location: context.scopeLabel, mean: averageAge };
    const balanceGap = Math.abs(femaleShare - maleShare);
    const profile = averageAge < 30 ? "Jovem" : averageAge < 45 ? "Adulto" : averageAge < 60 ? "Maduro" : "Sênior";
    return { averageAge, leaderBand, femaleShare, maleShare, diversity, youngest, oldest, balanceGap, profile, dominantShare };
  }, [beneficiariosFiltrados, context.level, context.city]);

  return <section className="module-intelligence demographics-intelligence">
    <div className="intelligence-kpis-grid">
      <Metric label="Idade média" value={`${pct(analysis.averageAge)} anos`} detail={`perfil ${analysis.profile.toLocaleLowerCase("pt-BR")}`} />
      <Metric label="Faixa predominante" value={analysis.leaderBand[0]} detail={`${pct(analysis.dominantShare)}% da carteira`} tone="info" />
      <Metric label="Distribuição por sexo" value={`${pct(analysis.femaleShare)}% F`} detail={`${pct(analysis.maleShare)}% masculino`} tone={analysis.balanceGap <= 10 ? "success" : "warning"} />
      <Metric label="Diversidade etária" value={`${Math.round(analysis.diversity)}/100`} detail={analysis.diversity >= 75 ? "distribuição equilibrada" : "concentração relevante"} tone={analysis.diversity >= 75 ? "success" : "warning"} />
    </div>

    <div className="intelligence-insights-grid">
      <article className="intelligence-card intelligence-summary"><span>Leitura demográfica</span><h3>Perfil da carteira</h3><p>A seleção apresenta perfil predominantemente <strong>{analysis.profile.toLocaleLowerCase("pt-BR")}</strong>, com maior concentração em <strong>{analysis.leaderBand[0]}</strong>. A diferença entre as participações feminina e masculina é de <strong>{pct(analysis.balanceGap)} pontos percentuais</strong>, indicando {analysis.balanceGap <= 10 ? "bom equilíbrio" : "assimetria relevante"} entre os sexos.</p></article>
      <article className="intelligence-card"><span>Destaques demográficos</span><h3>Características da população</h3><div className="highlight-list">
        <div><b>{context.level === "brasil" ? "Estado mais jovem" : context.level === "estado" ? "Município mais jovem" : "Idade média municipal"}</b><strong>{analysis.youngest.location}</strong><small>idade média de {pct(analysis.youngest.mean)} anos</small></div>
        <div><b>{context.level === "brasil" ? "Estado com maior idade média" : context.level === "estado" ? "Município com maior idade média" : "Perfil do município"}</b><strong>{analysis.oldest.location}</strong><small>idade média de {pct(analysis.oldest.mean)} anos</small></div>
        <div><b>Maior grupo etário</b><strong>{analysis.leaderBand[0]}</strong><small>{analysis.leaderBand[1].toLocaleString("pt-BR")} beneficiários</small></div>
        <div><b>Equilíbrio entre sexos</b><strong>{analysis.balanceGap <= 10 ? "Equilibrado" : "Em atenção"}</strong><small>diferença de {pct(analysis.balanceGap)} p.p.</small></div>
      </div></article>
    </div>

    <article className="intelligence-card recommendation-card"><span>Ações sugeridas</span><h3>Prioridades demográficas</h3><div className="recommendation-list">
      <div><em>Alta</em><section><strong>Monitorar a faixa predominante</strong><p>Acompanhar a evolução de {analysis.leaderBand[0]} para evitar concentração crescente no perfil da carteira.</p></section></div>
      <div><em>Média</em><section><strong>Planejar rede conforme o envelhecimento</strong><p>Usar a idade média de {pct(analysis.averageAge)} anos para orientar oferta assistencial e capacidade no recorte selecionado.</p></section></div>
      <div><em>Baixa</em><section><strong>Preservar o equilíbrio demográfico</strong><p>{analysis.balanceGap <= 10 ? "Manter o equilíbrio atual entre os sexos e a diversidade etária." : "Avaliar ações para reduzir a assimetria observada entre os sexos."}</p></section></div>
    </div></article>
  </section>;
}
export default memo(DemographicsIntelligence);

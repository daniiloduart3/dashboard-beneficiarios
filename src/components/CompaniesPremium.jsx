import { memo, useMemo, useState } from "react";
import { empresaValidaParaAnalise } from "../utils/dashboard";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value).trim();
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getSex(item) {
  return String(item.Sexo ?? item["Sexo do beneficiário"] ?? item.Gênero ?? item.Genero ?? "Não informado").trim();
}

function getCompany(item) {
  return String(item.Empresa ?? "Não informado").trim() || "Não informado";
}

function getState(item) {
  return String(item["Estado de correspondência"] ?? "Não informado").trim() || "Não informado";
}

function getCity(item) {
  return String(item["Cidade de correspondência"] ?? "Não informado").trim() || "Não informado";
}

function getAge(item) {
  const age = Number(String(item.Idade ?? "").replace(",", "."));
  return Number.isFinite(age) && age >= 0 && age <= 120 ? age : null;
}

function categoryFor(index, score, growth) {
  if (index === 0 && score >= 80) return "Premium";
  if (index <= 2 && score >= 70) return "Estratégica";
  if (growth >= 12) return "Em crescimento";
  if (growth < -3 || score < 50) return "Em atenção";
  return "Relevante";
}

function statusForGrowth(growth) {
  if (growth > 3) return "Crescimento";
  if (growth < -3) return "Queda";
  return "Estável";
}

function MiniTrend({ values }) {
  const width = 240;
  const height = 70;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 8 - ((value - min) / range) * (height - 16);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="empresa-mini-tendencia" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução mensal da empresa">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.split(" ").map((point, index) => {
        const [cx, cy] = point.split(",");
        return <circle key={index} cx={cx} cy={cy} r="3" fill="currentColor" />;
      })}
    </svg>
  );
}

function Metric({ label, value, detail }) {
  return <div className="empresa-metrica"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

function CompaniesPremium({ dashboard }) {
  const { beneficiariosFiltrados = [], totalBeneficiarios = 0 } = dashboard;
  const [selectedName, setSelectedName] = useState("");
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [search, setSearch] = useState("");

  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, reverseIndex) => {
      const offset = 5 - reverseIndex;
      return new Date(now.getFullYear(), now.getMonth() - offset, 1);
    });
    const grouped = new Map();

    beneficiariosFiltrados.forEach((item) => {
      const name = getCompany(item);
      if (!empresaValidaParaAnalise(name)) return;
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(item);
    });

    const totalBeneficiariosEmpresariais = Array.from(grouped.values())
      .reduce((sum, records) => sum + records.length, 0);

    const companies = Array.from(grouped.entries()).map(([name, records]) => {
      const states = new Set(records.map(getState).filter((v) => v !== "Não informado"));
      const cities = new Set(records.map(getCity).filter((v) => v !== "Não informado"));
      const ages = records.map(getAge).filter((v) => v !== null);
      const sexCounts = records.reduce((acc, item) => {
        const sex = getSex(item).toLocaleUpperCase("pt-BR");
        const key = sex.startsWith("F") ? "Feminino" : sex.startsWith("M") ? "Masculino" : "Não informado";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const monthly = months.map((month) => records.filter((item) => {
        const date = parseDate(item["Data de Inclusão"]);
        return date && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
      }).length);
      const recent = monthly.slice(-3).reduce((a, b) => a + b, 0);
      const previous = monthly.slice(0, 3).reduce((a, b) => a + b, 0);
      const growth = previous > 0 ? ((recent - previous) / previous) * 100 : recent > 0 ? 100 : 0;
      const share = totalBeneficiariosEmpresariais > 0 ? (records.length / totalBeneficiariosEmpresariais) * 100 : 0;
      const mean = monthly.reduce((a, b) => a + b, 0) / monthly.length;
      const variance = monthly.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / monthly.length;
      const volatility = mean > 0 ? Math.sqrt(variance) / mean : 0;
      const stabilityScore = clamp(100 - volatility * 45);
      const territorialScore = clamp(states.size * 12 + cities.size * 2.5, 20, 100);
      const growthScore = clamp(55 + growth * 1.4, 10, 100);
      const concentrationPenalty = share > 30 ? (share - 30) * 1.6 : 0;
      const score = Math.round(clamp(records.length ? 0.35 * growthScore + 0.3 * stabilityScore + 0.35 * territorialScore - concentrationPenalty : 0));
      return {
        name, records, lives: records.length, share, states: states.size, cities: cities.size,
        averageAge: ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0,
        femaleShare: records.length ? ((sexCounts.Feminino || 0) / records.length) * 100 : 0,
        maleShare: records.length ? ((sexCounts.Masculino || 0) / records.length) * 100 : 0,
        monthly, growth, score, stabilityScore,
        stability: stabilityScore >= 75 ? "Estável" : stabilityScore >= 50 ? "Oscilando" : "Instável",
        trend: statusForGrowth(growth),
      };
    }).sort((a, b) => b.lives - a.lives).map((company, index) => ({ ...company, rank: index + 1, category: categoryFor(index, company.score, company.growth) }));

    const top5Share = companies.slice(0, 5).reduce((sum, item) => sum + item.share, 0);
    const averageGrowth = companies.length ? companies.reduce((sum, item) => sum + item.growth, 0) / companies.length : 0;
    const enterpriseScore = companies.length ? Math.round(companies.reduce((sum, item) => sum + item.score * item.lives, 0) / Math.max(totalBeneficiariosEmpresariais, 1)) : 0;
    return { companies, months, top5Share, averageGrowth, enterpriseScore };
  }, [beneficiariosFiltrados, totalBeneficiarios]);

  const filtered = data.companies.filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const selected = data.companies.find((item) => item.name === selectedName) || data.companies[0];
  const a = data.companies.find((item) => item.name === compareA) || data.companies[0];
  const b = data.companies.find((item) => item.name === compareB) || data.companies[1] || data.companies[0];
  const leader = data.companies[0];
  const concentration = data.top5Share >= 65 ? "Alta" : data.top5Share >= 45 ? "Média" : "Baixa";
  const bestGrowth = [...data.companies].sort((x, y) => y.growth - x.growth)[0];
  const attention = data.companies.filter((item) => item.category === "Em atenção").slice(0, 3);

  if (!data.companies.length) return <section className="empresas-premium-vazio">Nenhuma empresa encontrada na seleção atual.</section>;

  return (
    <section className="empresas-premium">
      <div className="empresas-kpis">
        <Metric label="Empresas ativas" value={data.companies.length.toLocaleString("pt-BR")} detail="na seleção atual" />
        <Metric label="Empresa líder" value={leader?.name || "—"} detail={`${leader?.share.toFixed(1) || "0,0"}% da carteira`} />
        <Metric label="Concentração Top 5" value={`${data.top5Share.toFixed(1)}%`} detail={`${concentration} dependência`} />
        <Metric label="Crescimento médio" value={`${data.averageGrowth >= 0 ? "+" : ""}${data.averageGrowth.toFixed(1)}%`} detail="últimos 3 meses vs. anteriores" />
        <Metric label="Score empresarial" value={`${data.enterpriseScore}/100`} detail="qualidade ponderada da carteira" />
      </div>

      <div className="empresas-premium-layout">
        <article className="empresas-card empresas-ranking-card">
          <div className="empresas-card-cabecalho"><div><span>Ranking premium</span><h3>Empresas estratégicas</h3></div><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar empresa..." /></div>
          <div className="empresas-tabela-scroll"><table className="empresas-ranking"><thead><tr><th>#</th><th>Empresa</th><th>Vidas</th><th>Participação</th><th>Crescimento</th><th>Score</th><th>Classificação</th><th>Estabilidade</th></tr></thead><tbody>
            {filtered.map((item) => <tr key={item.name} className={selected?.name === item.name ? "selecionada" : ""} onClick={() => setSelectedName(item.name)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelectedName(item.name); }}><td><strong>{item.rank}</strong></td><td><button type="button" onClick={() => setSelectedName(item.name)}>{item.name}</button></td><td>{item.lives.toLocaleString("pt-BR")}</td><td><div className="empresa-share"><span style={{ width: `${Math.min(item.share * 2.5, 100)}%` }} /></div><small>{item.share.toFixed(1)}%</small></td><td className={item.growth >= 0 ? "positivo" : "negativo"}>{item.growth >= 0 ? "▲" : "▼"} {Math.abs(item.growth).toFixed(1)}%</td><td><b>{item.score}</b></td><td><span className={`empresa-selo categoria-${item.category.toLowerCase().replaceAll(" ", "-")}`}>{item.category}</span></td><td><span className={`empresa-estabilidade estabilidade-${item.stability.toLowerCase()}`}>{item.stability}</span></td></tr>)}
          </tbody></table></div>
        </article>

        <aside className="empresas-card empresa-perfil-card">
          <div className="empresas-card-cabecalho"><div><span>Perfil executivo</span><h3>{selected?.name}</h3></div><span className="empresa-score-destaque">{selected?.score}</span></div>
          <div className="empresa-perfil-resumo"><strong>{selected?.lives.toLocaleString("pt-BR")}</strong><span>beneficiários • {selected?.share.toFixed(1)}% da carteira</span></div>
          <MiniTrend values={selected?.monthly || []} />
          <div className="empresa-meses">{data.months.map((month, i) => <span key={month.toISOString()}>{MESES[month.getMonth()]}<b>{selected?.monthly[i] || 0}</b></span>)}</div>
          <div className="empresa-perfil-grid"><Metric label="Tendência" value={selected?.trend} /><Metric label="Estados" value={selected?.states} /><Metric label="Municípios" value={selected?.cities} /><Metric label="Idade média" value={`${selected?.averageAge.toFixed(1)} anos`} /><Metric label="Mulheres" value={`${selected?.femaleShare.toFixed(1)}%`} /><Metric label="Homens" value={`${selected?.maleShare.toFixed(1)}%`} /></div>
        </aside>
      </div>

      <div className="empresas-secundario-grid">
        <article className="empresas-card empresa-benchmark-card"><div className="empresas-card-cabecalho"><div><span>Benchmark</span><h3>Comparação entre empresas</h3></div></div><div className="empresa-comparadores"><select value={a?.name || ""} onChange={(e) => setCompareA(e.target.value)}>{data.companies.map((item) => <option key={item.name}>{item.name}</option>)}</select><span>versus</span><select value={b?.name || ""} onChange={(e) => setCompareB(e.target.value)}>{data.companies.map((item) => <option key={item.name}>{item.name}</option>)}</select></div><table className="empresa-benchmark"><thead><tr><th>Indicador</th><th>{a?.name}</th><th>{b?.name}</th></tr></thead><tbody>{[["Beneficiários", a?.lives.toLocaleString("pt-BR"), b?.lives.toLocaleString("pt-BR")],["Participação", `${a?.share.toFixed(1)}%`, `${b?.share.toFixed(1)}%`],["Crescimento", `${a?.growth.toFixed(1)}%`, `${b?.growth.toFixed(1)}%`],["Municípios", a?.cities, b?.cities],["Estados", a?.states, b?.states],["Idade média", `${a?.averageAge.toFixed(1)} anos`, `${b?.averageAge.toFixed(1)} anos`],["Score", a?.score, b?.score]].map(([label, va, vb]) => <tr key={label}><td>{label}</td><td>{va}</td><td>{vb}</td></tr>)}</tbody></table></article>

        <article className="empresas-card empresa-dependencia-card"><div className="empresas-card-cabecalho"><div><span>Dependência comercial</span><h3>Concentração da carteira</h3></div><span className={`empresa-risco risco-${concentration.toLowerCase()}`}>{concentration}</span></div><div className="dependencia-lista">{data.companies.slice(0, 5).map((item) => <div key={item.name}><div><span>{item.name}</span><b>{item.share.toFixed(1)}%</b></div><div className="dependencia-barra"><span style={{ width: `${Math.min(item.share * 2.5, 100)}%` }} /></div></div>)}</div><p>As cinco maiores empresas representam <strong>{data.top5Share.toFixed(1)}%</strong> dos beneficiários selecionados.</p></article>

        <article className="empresas-card empresa-insights-card"><div className="empresas-card-cabecalho"><div><span>Leitura comercial</span><h3>Insights prioritários</h3></div></div><div className="empresa-insights"><div><b>Maior crescimento</b><strong>{bestGrowth?.name}</strong><span>+{bestGrowth?.growth.toFixed(1)}% no comparativo recente</span></div><div><b>Maior alcance territorial</b><strong>{[...data.companies].sort((x, y) => y.cities - x.cities)[0]?.name}</strong><span>{[...data.companies].sort((x, y) => y.cities - x.cities)[0]?.cities} municípios atendidos</span></div><div><b>Atenção comercial</b><strong>{attention.length ? attention.map((item) => item.name).join(", ") : "Nenhuma empresa crítica"}</strong><span>{attention.length ? "Score, estabilidade ou tendência abaixo do esperado" : "Carteira empresarial sem alertas críticos"}</span></div></div></article>
      </div>
    </section>
  );
}

export default memo(CompaniesPremium);

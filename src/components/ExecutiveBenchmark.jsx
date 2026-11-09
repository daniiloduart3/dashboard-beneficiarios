import { memo, useMemo } from "react";
import EChart from "./EChart";
import { calculateExecutiveAnalysis } from "../utils/executiveAnalysis";

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function normalizeGender(item) {
  const raw = String(item["Sexo"] ?? item["Gênero"] ?? item["Genero"] ?? item["Sexo do beneficiário"] ?? "")
    .trim().toLocaleUpperCase("pt-BR");
  if (raw === "M" || raw.startsWith("MASC")) return "Masculino";
  if (raw === "F" || raw.startsWith("FEM")) return "Feminino";
  return "Não informado";
}

function getStatus(score) {
  if (score >= 85) return { label: "Excelente", className: "excelente", signal: "verde" };
  if (score >= 70) return { label: "Boa", className: "boa", signal: "verde" };
  if (score >= 50) return { label: "Atenção", className: "atencao", signal: "amarelo" };
  return { label: "Crítica", className: "critica", signal: "vermelho" };
}

function pct(part, total) {
  return total > 0 ? (part / total) * 100 : 0;
}

function ExecutiveBenchmark({ dashboard }) {
  const { carregando, erro, periodoInvalido, beneficiariosFiltrados, historicoTemporal, historicoCarteira } = dashboard;
  const serieHistorica = historicoTemporal || historicoCarteira || [];

  const benchmark = useMemo(() => calculateExecutiveAnalysis(beneficiariosFiltrados || [], serieHistorica), [beneficiariosFiltrados, serieHistorica]);

  const radarOption = useMemo(() => benchmark ? ({
    animationDuration: 500,
    tooltip: { trigger: "item" },
    radar: {
      radius: "67%",
      splitNumber: 4,
      indicator: benchmark.dimensions.map((item) => ({ name: item.name, max: 100 })),
      axisName: { color: "#64748b", fontSize: 12, fontWeight: 700 },
      splitArea: { areaStyle: { color: ["rgba(248,250,252,.35)", "rgba(241,245,249,.65)"] } },
      splitLine: { lineStyle: { color: "#dbe4ef" } },
      axisLine: { lineStyle: { color: "#dbe4ef" } },
    },
    series: [{
      type: "radar",
      symbolSize: 5,
      data: [{ value: benchmark.dimensions.map((item) => item.score), name: "Executive Score" }],
      areaStyle: { opacity: 0.22 },
      lineStyle: { width: 2.5 },
    }],
  }) : {}, [benchmark]);

  const evolutionOption = useMemo(() => benchmark ? ({
    animationDuration: 500,
    grid: { left: 36, right: 18, top: 22, bottom: 32 },
    tooltip: { trigger: "axis", valueFormatter: (value) => `${value} pontos` },
    xAxis: { type: "category", data: benchmark.evolution.map((item) => item.label), axisTick: { show: false }, axisLabel: { color: "#64748b" } },
    yAxis: { type: "value", min: 0, max: 100, interval: 25, axisLabel: { color: "#64748b" }, splitLine: { lineStyle: { color: "#e8eef5" } } },
    series: [{ type: "line", smooth: true, symbolSize: 7, data: benchmark.evolution.map((item) => item.score), areaStyle: { opacity: 0.1 }, lineStyle: { width: 3 } }],
  }) : {}, [benchmark]);

  if (carregando || erro || periodoInvalido || !benchmark) return null;

  return (
    <section className="executive-benchmark" aria-label="Benchmark executivo da carteira">
      <div className="executive-benchmark-header">
        <div>
          <span className="executive-benchmark-label">Executive scorecard</span>
          <h2>Benchmark Executivo</h2>
          <p>Avaliação consolidada da carteira em seis dimensões estratégicas.</p>
        </div>
        <div className={`executive-score ${benchmark.scoreStatus.className}`}>
          <span>Executive Score</span>
          <strong>{benchmark.executiveScore}<small>/100</small></strong>
          <b>{benchmark.scoreStatus.label}</b>
        </div>
      </div>

      <div className="executive-benchmark-main-grid">
        <article className="executive-benchmark-card radar-card">
          <div className="benchmark-card-title"><div><span>Visão multidimensional</span><h3>Radar Executivo</h3></div></div>
          <EChart option={radarOption} className="executive-radar-chart" />
        </article>

        <article className="executive-benchmark-card scorecard-card">
          <div className="benchmark-card-title"><div><span>Comparativo interno</span><h3>Score por dimensão</h3></div></div>
          <div className="benchmark-table">
            {benchmark.dimensions.map((item) => (
              <div className="benchmark-row" key={item.key}>
                <div><strong>{item.name}</strong><small>{item.detail}</small></div>
                <span className={`benchmark-status ${item.status.className}`}>{item.status.label}</span>
                <b>{item.score}</b>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="executive-benchmark-secondary-grid">
        <article className="executive-benchmark-card traffic-card">
          <div className="benchmark-card-title"><div><span>Leitura rápida</span><h3>Semáforo Executivo</h3></div></div>
          <div className="executive-traffic-grid">
            {benchmark.dimensions.map((item) => (
              <div key={item.key}><i className={item.status.signal} /><span>{item.name}</span><strong>{item.score}</strong></div>
            ))}
          </div>
        </article>


      </div>

      {benchmark.evolution.length > 1 && (
        <article className="executive-benchmark-card evolution-card">
          <div className="benchmark-card-title"><div><span>Acompanhamento temporal</span><h3>Evolução do Executive Score</h3></div><strong>{benchmark.executiveScore} pontos</strong></div>
          <EChart option={evolutionOption} className="executive-score-evolution-chart" />
        </article>
      )}
    </section>
  );
}

export default memo(ExecutiveBenchmark);

import { memo, useMemo } from "react";

import EChart from "../components/EChart";
import PageHeader from "../components/PageHeader";
import { analisarRetencao, PRAZOS_RETENCAO } from "../utils/regrasNegocio";

const COR_ENTRADAS = "#2a78d6";
const COR_PERDAS = "#eb6834";
const COR_ALERTA = "#e34948";

const formatarPct = (valor, casas = 1) =>
  valor === null || valor === undefined
    ? "—"
    : `${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const formatarInteiro = (valor) => Number(valor || 0).toLocaleString("pt-BR");

function cores(temaEscuro) {
  return {
    texto: temaEscuro ? "#cbd5e1" : "#475569",
    grade: temaEscuro ? "#334155" : "#e2e8f0",
    tooltip: temaEscuro ? "#0f172a" : "#ffffff",
    borda: temaEscuro ? "#334155" : "#cbd5e1",
    textoTooltip: temaEscuro ? "#e2e8f0" : "#0f172a",
  };
}

function Metrica({ rotulo, valor, detalhe, tom = "neutral" }) {
  return (
    <article className={`intelligence-kpi tone-${tom}`}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
      <small>{detalhe}</small>
    </article>
  );
}

function GraficoChurn({ analise, temaEscuro }) {
  const option = useMemo(() => {
    const c = cores(temaEscuro);
    const dados = analise.movimento;
    return {
      grid: { top: 40, right: 24, bottom: 40, left: 52 },
      tooltip: {
        trigger: "axis",
        backgroundColor: c.tooltip,
        borderColor: c.borda,
        textStyle: { color: c.textoTooltip },
        formatter: (parametros) => {
          const m = dados[parametros?.[0]?.dataIndex] || {};
          return [
            `<strong>${m.mes}</strong>${m.alerta ? ` <span style="color:${COR_ALERTA}">▲ alerta</span>` : ""}`,
            `Churn: <strong>${formatarPct(m.churn, 2)}</strong>`,
            `Mediana 12m: ${formatarPct(m.churnMediano12m, 2)}`,
            `Perdas: ${formatarInteiro(m.perdas)} de ${formatarInteiro(m.ativosInicio)} vidas`,
            m.alerta ? `Perdas acima do normal: <strong>${formatarInteiro(m.perdasExcedentes)}</strong>` : "",
          ].filter(Boolean).join("<br/>");
        },
      },
      xAxis: {
        type: "category",
        data: dados.map((m) => m.mes),
        axisLabel: { color: c.texto },
        axisLine: { lineStyle: { color: c.grade } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: c.texto, formatter: (v) => `${v}%` },
        splitLine: { lineStyle: { color: c.grade } },
      },
      series: [
        {
          name: "Churn mensal",
          type: "line",
          smooth: false,
          symbolSize: 7,
          lineStyle: { width: 2, color: COR_PERDAS },
          itemStyle: { color: COR_PERDAS },
          data: dados.map((m) => ({
            value: m.churn === null ? null : Number(m.churn.toFixed(2)),
            itemStyle: m.alerta ? { color: COR_ALERTA, borderColor: "#fff", borderWidth: 2 } : undefined,
            symbolSize: m.alerta ? 11 : 7,
            label: m.alerta
              ? { show: true, position: "top", color: c.texto, formatter: () => formatarPct(m.churn) }
              : undefined,
          })),
        },
      ],
    };
  }, [analise, temaEscuro]);

  return (
    <article className="grafico-container">
      <h2>Churn mensal e alertas</h2>
      <p className="grafico-subtitulo">
        Perdas do mês ÷ vidas ativas no início do mês. Pontos em vermelho: churn acima de 2x a mediana dos 12 meses anteriores.
      </p>
      <div className="grafico"><EChart option={option} /></div>
    </article>
  );
}

function GraficoCoortes({ analise, temaEscuro }) {
  const option = useMemo(() => {
    const c = cores(temaEscuro);
    const safras = analise.coortes;
    const pontos = [];
    safras.forEach((s, linha) => {
      s.retencao.forEach((valor, coluna) => {
        if (valor !== null) pontos.push([coluna, linha, Number(valor.toFixed(1))]);
      });
    });
    return {
      grid: { top: 16, right: 16, bottom: 70, left: 110 },
      tooltip: {
        trigger: "item",
        backgroundColor: c.tooltip,
        borderColor: c.borda,
        textStyle: { color: c.textoTooltip },
        formatter: (p) => {
          const s = safras[p.value[1]];
          return `<strong>Safra ${s.safra}</strong> (${formatarInteiro(s.vidas)} vidas)<br/>` +
            `Após ${PRAZOS_RETENCAO[p.value[0]]} ${PRAZOS_RETENCAO[p.value[0]] === 1 ? "mês" : "meses"}: <strong>${formatarPct(p.value[2])}</strong> ainda na carteira`;
        },
      },
      xAxis: {
        type: "category",
        data: PRAZOS_RETENCAO.map((p) => (p === 1 ? "1 mês" : `${p} meses`)),
        axisLabel: { color: c.texto },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: safras.map((s) => s.safra),
        axisLabel: { color: c.texto },
      },
      visualMap: {
        min: 30,
        max: 100,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 6,
        itemWidth: 12,
        itemHeight: 160,
        text: ["100%", "30%"],
        textStyle: { color: c.texto },
        inRange: { color: ["#e8f1fb", "#9cc3ee", "#4f95e2", "#2a78d6", "#174a8b"] },
      },
      series: [
        {
          type: "heatmap",
          data: pontos,
          label: { show: true, fontSize: 10, formatter: (p) => Math.round(p.value[2]) },
          itemStyle: { borderColor: temaEscuro ? "#1a1a19" : "#ffffff", borderWidth: 2 },
          emphasis: { itemStyle: { borderColor: c.textoTooltip } },
        },
      ],
    };
  }, [analise, temaEscuro]);

  return (
    <article className="grafico-container">
      <h2>Retenção por safra de entrada</h2>
      <p className="grafico-subtitulo">% das vidas de cada mês de entrada que continuavam na carteira após N meses</p>
      <div className="grafico" style={{ minHeight: Math.max(320, analise.coortes.length * 24 + 100) }}>
        <EChart option={option} />
      </div>
    </article>
  );
}

function GraficoPermanencia({ analise, temaEscuro }) {
  const option = useMemo(() => {
    const c = cores(temaEscuro);
    const dados = [...analise.permanenciaPorSegmento].sort((a, b) => a.mediana - b.mediana);
    return {
      grid: { top: 16, right: 70, bottom: 30, left: 96 },
      tooltip: {
        trigger: "item",
        backgroundColor: c.tooltip,
        borderColor: c.borda,
        textStyle: { color: c.textoTooltip },
        formatter: (p) => {
          const d = dados[p.dataIndex];
          return `<strong>${d.nome}</strong><br/>Mediana: ${d.mediana.toFixed(1).replace(".", ",")} meses<br/>` +
            `${formatarInteiro(d.perdas)} perdas · ${formatarPct(d.saiAntes3m)} saem antes de 3 meses`;
        },
      },
      xAxis: {
        type: "value",
        axisLabel: { color: c.texto, formatter: (v) => `${v} m` },
        splitLine: { lineStyle: { color: c.grade } },
      },
      yAxis: { type: "category", data: dados.map((d) => d.nome), axisLabel: { color: c.texto } },
      series: [
        {
          type: "bar",
          barWidth: "55%",
          itemStyle: { color: COR_ENTRADAS, borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: "right",
            color: c.texto,
            formatter: (p) => `${Number(p.value).toFixed(1).replace(".", ",")} meses`,
          },
          data: dados.map((d) => Number(d.mediana.toFixed(1))),
        },
      ],
    };
  }, [analise, temaEscuro]);

  return (
    <article className="grafico-container">
      <h2>Permanência até o cancelamento</h2>
      <p className="grafico-subtitulo">Mediana de meses na carteira entre quem cancelou, por segmento do plano</p>
      <div className="grafico"><EChart option={option} /></div>
    </article>
  );
}

function PainelQualidade({ analise }) {
  const { qualidade, movimento } = analise;
  const piorMes = [...movimento].sort((a, b) => b.entradasDescartadas - a.entradasDescartadas)[0];
  const linhas = [
    ["Em digitação (ainda não ativos)", qualidade.emDigitacao],
    ["Erro cadastral (gerado indevidamente/duplicado)", qualidade.erroCadastral],
    ["Cancelamento antes da inclusão", qualidade.datasInconsistentes],
    ["Sem cidade/UF registrada", qualidade.semUf],
  ];

  return (
    <div className="intelligence-insights-grid">
      <article className="intelligence-card intelligence-summary">
        <span>Qualidade dos dados</span>
        <h3>Nem todo registro é um cliente</h3>
        <p>
          <strong>{formatarPct((100 * qualidade.foraDaBase) / Math.max(qualidade.total, 1))}</strong> dos registros
          da seleção ficam fora das análises de churn e retenção.
          {piorMes && piorMes.entradasDescartadas > 500 && (
            <> Em <strong>{piorMes.mes}</strong>, {formatarInteiro(piorMes.entradasBrutas)} inclusões foram
            registradas, mas só <strong>{formatarInteiro(piorMes.entradas)}</strong> eram válidas. Sem esse
            tratamento, o painel mostraria um crescimento que não aconteceu.</>
          )}
        </p>
      </article>
      <article className="intelligence-card">
        <span>Registros tratados</span>
        <h3>O que foi separado</h3>
        <table className="tabela-resumo">
          <thead>
            <tr><th>Verificação</th><th>Registros</th><th>%</th></tr>
          </thead>
          <tbody>
            {linhas.map(([rotulo, valor]) => (
              <tr key={rotulo}>
                <td>{rotulo}</td>
                <td>{formatarInteiro(valor)}</td>
                <td>{formatarPct((100 * valor) / Math.max(qualidade.total, 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}

function RetentionPage({ dashboard }) {
  const { todosBeneficiariosFiltradosCrescimento = [], temaEscuro } = dashboard;

  const analise = useMemo(
    () => analisarRetencao(todosBeneficiariosFiltradosCrescimento),
    [todosBeneficiariosFiltradosCrescimento]
  );
  const { resumo } = analise;
  const principalMotivo = analise.perdasPorGrupo[0];

  return (
    <div className="pagina-dashboard">
      <PageHeader
        eyebrow="Retenção"
        title="Quem fica e quem sai da carteira?"
        description="Churn mensal, retenção por safra e tempo de permanência, calculados sobre a base válida (sem registros em digitação, erros cadastrais e migrações). Não usa o filtro de período."
      />

      <section className="module-intelligence">
        <div className="intelligence-kpis-grid">
          <Metrica
            rotulo="Churn do último mês"
            valor={formatarPct(resumo.churnUltimoMes)}
            detalhe={`média de ${formatarPct(resumo.churnMedio12m)} nos últimos 12 meses`}
            tom={resumo.churnUltimoMes > 2 * (resumo.churnMedio12m || 0) ? "danger" : "warning"}
          />
          <Metrica
            rotulo="Retenção em 6 meses"
            valor={formatarPct(resumo.retencao6m)}
            detalhe="das vidas seguem na carteira"
            tom="info"
          />
          <Metrica
            rotulo="Retenção em 12 meses"
            valor={formatarPct(resumo.retencao12m)}
            detalhe="das vidas seguem após 1 ano"
            tom="info"
          />
          <Metrica
            rotulo="Perdas acima do normal"
            valor={formatarInteiro(resumo.perdasExcedentes)}
            detalhe={resumo.mesesEmAlerta.length ? `meses em alerta: ${resumo.mesesEmAlerta.join(", ")}` : "nenhum mês em alerta"}
            tom={resumo.mesesEmAlerta.length ? "danger" : "success"}
          />
        </div>
      </section>

      <GraficoChurn analise={analise} temaEscuro={temaEscuro} />

      <div className="graficos-historicos-grid">
        <GraficoCoortes analise={analise} temaEscuro={temaEscuro} />
        <GraficoPermanencia analise={analise} temaEscuro={temaEscuro} />
      </div>

      {principalMotivo && (
        <article className="intelligence-card intelligence-summary" style={{ marginBottom: 22 }}>
          <span>Motivos padronizados</span>
          <h3>Principal grupo de perda: {principalMotivo.nome}</h3>
          <p>
            {formatarPct((100 * principalMotivo.perdas) / analise.perdasPorGrupo.reduce((s, g) => s + g.perdas, 0))} das
            perdas, com permanência mediana de {principalMotivo.mediana.toFixed(1).replace(".", ",")} meses. Os textos de motivo do
            sistema foram agrupados em categorias de negócio para esta leitura.
          </p>
        </article>
      )}

      <PainelQualidade analise={analise} />
    </div>
  );
}

export default memo(RetentionPage);

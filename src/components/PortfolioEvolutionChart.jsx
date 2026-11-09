import { useMemo } from "react";

import EChart from "./EChart";

export default function PortfolioEvolutionChart({ dashboard }) {
  const { evolucaoHistoricaCarteira, temaEscuro } = dashboard;

  const option = useMemo(() => {
    const corTexto = temaEscuro ? "#cbd5e1" : "#475569";
    const corGrade = temaEscuro ? "#334155" : "#e2e8f0";
    const corTooltip = temaEscuro ? "#0f172a" : "#ffffff";
    const totalPontos = evolucaoHistoricaCarteira.length;
    const inicioZoom = totalPontos > 36 ? ((totalPontos - 36) / totalPontos) * 100 : 0;

    return {
      animationDuration: 700,
      animationEasing: "cubicOut",
      color: ["#2563eb", "#16a34a", "#dc2626"],
      grid: { top: 72, right: 70, bottom: 78, left: 76 },
      legend: {
        top: 8,
        left: "center",
        textStyle: { color: corTexto },
        data: ["Vidas ativas", "Inclusões", "Cancelamentos"],
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: corTooltip,
        borderColor: corGrade,
        textStyle: { color: temaEscuro ? "#e2e8f0" : "#0f172a" },
        formatter: (parametros) => {
          const indice = parametros?.[0]?.dataIndex ?? 0;
          const item = evolucaoHistoricaCarteira[indice];
          if (!item) return "";

          const formatar = (valor) => Number(valor || 0).toLocaleString("pt-BR");
          const sinalSaldo = item.saldo > 0 ? "+" : "";

          return [
            `<strong>Fechamento em ${item.dataReferencia}</strong>`,
            `Vidas ativas: <strong>${formatar(item.vidasAtivas)}</strong>`,
            `Inclusões no mês: ${formatar(item.inclusoes)}`,
            `Cancelamentos no mês: ${formatar(item.cancelamentos)}`,
            `Saldo líquido: ${sinalSaldo}${formatar(item.saldo)}`,
          ].join("<br/>");
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: true,
        data: evolucaoHistoricaCarteira.map((item) => item.competencia),
        axisLine: { lineStyle: { color: corGrade } },
        axisTick: { show: false },
        axisLabel: { color: corTexto, fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          name: "Vidas ativas",
          nameTextStyle: { color: corTexto },
          minInterval: 1,
          axisLabel: {
            color: corTexto,
            formatter: (valor) => Number(valor).toLocaleString("pt-BR"),
          },
          splitLine: { lineStyle: { color: corGrade, type: "dashed" } },
        },
        {
          type: "value",
          name: "Movimentações",
          nameTextStyle: { color: corTexto },
          minInterval: 1,
          axisLabel: {
            color: corTexto,
            formatter: (valor) => Number(valor).toLocaleString("pt-BR"),
          },
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        {
          type: "inside",
          start: inicioZoom,
          end: 100,
        },
        {
          type: "slider",
          start: inicioZoom,
          end: 100,
          height: 20,
          bottom: 18,
          borderColor: corGrade,
          textStyle: { color: corTexto },
        },
      ],
      series: [
        {
          name: "Vidas ativas",
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          showSymbol: evolucaoHistoricaCarteira.length <= 24,
          data: evolucaoHistoricaCarteira.map((item) => item.vidasAtivas),
          lineStyle: { width: 3 },
          areaStyle: { opacity: 0.1 },
          z: 5,
        },
        {
          name: "Inclusões",
          type: "bar",
          yAxisIndex: 1,
          barMaxWidth: 18,
          data: evolucaoHistoricaCarteira.map((item) => item.inclusoes),
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        },
        {
          name: "Cancelamentos",
          type: "bar",
          yAxisIndex: 1,
          barMaxWidth: 18,
          data: evolucaoHistoricaCarteira.map((item) => item.cancelamentos),
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [evolucaoHistoricaCarteira, temaEscuro]);

  if (evolucaoHistoricaCarteira.length === 0) return null;

  return (
    <section className="evolucao-carteira-secao">
      <article className="grafico-container grafico-container-evolucao-carteira">
        <div className="evolucao-carteira-cabecalho">
          <div>
            <h2>Evolução histórica da carteira</h2>
            <p className="grafico-subtitulo">
              Vidas ativas no último dia de cada mês, com inclusões e cancelamentos mensais
            </p>
          </div>
          <span className="evolucao-carteira-selo">Fechamento mensal</span>
        </div>

        <div className="grafico grafico-evolucao-carteira">
          <EChart option={option} />
        </div>
      </article>
    </section>
  );
}

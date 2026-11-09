import { useMemo } from "react";

import EChart from "./EChart";

export default function HistoricalPortfolioChart({ dashboard }) {
  const { historicoTemporal, historicoCarteira, temaEscuro } = dashboard;
  const serieHistorica = historicoTemporal || historicoCarteira || [];

  const option = useMemo(() => {
    const corTexto = temaEscuro ? "#cbd5e1" : "#475569";
    const corGrade = temaEscuro ? "#334155" : "#e2e8f0";
    const corTooltip = temaEscuro ? "#0f172a" : "#ffffff";
    const dados = Array.isArray(serieHistorica)
      ? serieHistorica
      : [];

    return {
      animationDuration: 650,
      animationEasing: "cubicOut",
      grid: {
        top: 38,
        right: 24,
        bottom: dados.length > 14 ? 72 : 44,
        left: 66,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: corTooltip,
        borderColor: temaEscuro ? "#334155" : "#cbd5e1",
        textStyle: {
          color: temaEscuro ? "#e2e8f0" : "#0f172a",
        },
        formatter: (parametros) => {
          const item = parametros?.[0];
          const ponto = item?.data || {};
          const formatarInteiro = (valor) =>
            Number(valor || 0).toLocaleString("pt-BR");
          const formatarSaldo = (valor) => {
            const numero = Number(valor || 0);
            return `${numero > 0 ? "+" : ""}${numero.toLocaleString("pt-BR")}`;
          };
          const formatarCrescimento = (valor) => {
            if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) {
              return "—";
            }

            const numero = Number(valor);
            return `${numero > 0 ? "+" : ""}${numero.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}%`;
          };

          return [
            `<strong>${ponto.competenciaCompleta || item?.axisValue || ""}</strong>`,
            `<span>Vidas ativas:</span> <strong>${formatarInteiro(ponto.vidasAtivas)}</strong>`,
            `<span>Inclusões:</span> <strong>${formatarInteiro(ponto.inclusoes)}</strong>`,
            `<span>Cancelamentos:</span> <strong>${formatarInteiro(ponto.cancelamentos)}</strong>`,
            `<span>Saldo líquido:</span> <strong>${formatarSaldo(ponto.saldo)}</strong>`,
            `<span>Crescimento:</span> <strong>${formatarCrescimento(ponto.crescimento)}</strong>`,
          ].join("<br/>");
        },
      },
      dataZoom:
        dados.length > 14
          ? [
              {
                type: "inside",
                start: Math.max(0, 100 - (14 / dados.length) * 100),
                end: 100,
              },
              {
                type: "slider",
                height: 18,
                bottom: 18,
                start: Math.max(0, 100 - (14 / dados.length) * 100),
                end: 100,
                borderColor: "transparent",
                backgroundColor: temaEscuro ? "#1e293b" : "#f1f5f9",
                fillerColor: temaEscuro
                  ? "rgba(59, 130, 246, 0.24)"
                  : "rgba(37, 99, 235, 0.16)",
                handleStyle: {
                  color: temaEscuro ? "#60a5fa" : "#2563eb",
                },
                textStyle: { color: corTexto },
              },
            ]
          : [],
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: dados.map((item) => item.competencia),
        axisLine: {
          lineStyle: { color: corGrade },
        },
        axisTick: { show: false },
        axisLabel: {
          color: corTexto,
          fontSize: 11,
          hideOverlap: true,
        },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: corTexto,
          formatter: (valor) => Number(valor).toLocaleString("pt-BR"),
        },
        splitLine: {
          lineStyle: {
            color: corGrade,
            type: "dashed",
          },
        },
      },
      series: [
        {
          name: "Vidas ativas",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          showSymbol: dados.length <= 18,
          data: dados.map((item) => ({
            value: item.vidasAtivas,
            ...item,
            symbol: item.parcial ? "diamond" : "circle",
            symbolSize: item.parcial ? 11 : 7,
          })),
          lineStyle: {
            width: 3,
            color: "#2563eb",
          },
          itemStyle: {
            color: "#2563eb",
            borderColor: temaEscuro ? "#101c2d" : "#ffffff",
            borderWidth: 2,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: temaEscuro
                    ? "rgba(37, 99, 235, 0.34)"
                    : "rgba(37, 99, 235, 0.24)",
                },
                {
                  offset: 1,
                  color: "rgba(37, 99, 235, 0.02)",
                },
              ],
            },
          },
          emphasis: {
            focus: "series",
            scale: 1.25,
          },
        },
      ],
    };
  }, [serieHistorica, temaEscuro]);

  return (
    <section className="grafico-container grafico-historico-carteira-container">
      <h2>Evolução histórica da carteira</h2>
      <p className="grafico-subtitulo">
        Fechamentos mensais do recorte selecionado; os filtros de período de inclusão não alteram esta série
      </p>

      <div className="grafico grafico-historico-carteira">
        <EChart option={option} />
      </div>
    </section>
  );
}

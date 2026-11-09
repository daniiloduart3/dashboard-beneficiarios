import { useMemo } from "react";

import EChart from "./EChart";

export default function MonthlyMovementChart({ dashboard }) {
  const { historicoTemporal, historicoCarteira, temaEscuro } = dashboard;
  const serieHistorica = historicoTemporal || historicoCarteira || [];

  const option = useMemo(() => {
    const dados = Array.isArray(serieHistorica) ? serieHistorica : [];
    const corTexto = temaEscuro ? "#cbd5e1" : "#475569";
    const corGrade = temaEscuro ? "#334155" : "#e2e8f0";
    const corTooltip = temaEscuro ? "#0f172a" : "#ffffff";

    const formatarInteiro = (valor) =>
      Number(valor || 0).toLocaleString("pt-BR");

    const formatarSaldo = (valor) => {
      const numero = Number(valor || 0);
      return `${numero > 0 ? "+" : ""}${numero.toLocaleString("pt-BR")}`;
    };

    const formatarCrescimento = (valor) => {
      if (
        valor === null ||
        valor === undefined ||
        !Number.isFinite(Number(valor))
      ) {
        return "—";
      }

      const numero = Number(valor);
      return `${numero > 0 ? "+" : ""}${numero.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}%`;
    };

    return {
      animationDuration: 650,
      animationEasing: "cubicOut",
      legend: {
        top: 4,
        left: "center",
        itemWidth: 14,
        itemHeight: 9,
        textStyle: { color: corTexto },
        data: ["Inclusões", "Cancelamentos", "Saldo líquido"],
      },
      grid: {
        top: 58,
        right: 66,
        bottom: dados.length > 14 ? 72 : 44,
        left: 64,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: corTooltip,
        borderColor: temaEscuro ? "#334155" : "#cbd5e1",
        textStyle: {
          color: temaEscuro ? "#e2e8f0" : "#0f172a",
        },
        formatter: (parametros) => {
          const ponto = parametros?.[0]?.data || {};

          return [
            `<strong>${ponto.competenciaCompleta || parametros?.[0]?.axisValue || ""}</strong>`,
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
      yAxis: [
        {
          type: "value",
          name: "Movimentos",
          minInterval: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          nameTextStyle: { color: corTexto, fontSize: 10 },
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
        {
          type: "value",
          name: "Saldo",
          minInterval: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          nameTextStyle: { color: corTexto, fontSize: 10 },
          axisLabel: {
            color: corTexto,
            formatter: (valor) => Number(valor).toLocaleString("pt-BR"),
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Inclusões",
          type: "bar",
          barMaxWidth: 24,
          data: dados.map((item) => ({
            value: item.inclusoes,
            ...item,
          })),
          itemStyle: {
            color: "#2563eb",
            borderRadius: [5, 5, 0, 0],
          },
          emphasis: { focus: "series" },
        },
        {
          name: "Cancelamentos",
          type: "bar",
          barMaxWidth: 24,
          data: dados.map((item) => ({
            value: item.cancelamentos,
            ...item,
          })),
          itemStyle: {
            color: "#ef4444",
            borderRadius: [5, 5, 0, 0],
          },
          emphasis: { focus: "series" },
        },
        {
          name: "Saldo líquido",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          showSymbol: dados.length <= 18,
          data: dados.map((item) => ({
            value: item.saldo,
            ...item,
            symbol: item.parcial ? "diamond" : "circle",
            symbolSize: item.parcial ? 10 : 7,
          })),
          lineStyle: {
            width: 3,
            color: "#16a34a",
          },
          itemStyle: {
            color: "#16a34a",
            borderColor: temaEscuro ? "#101c2d" : "#ffffff",
            borderWidth: 2,
          },
          emphasis: {
            focus: "series",
            scale: 1.2,
          },
          z: 4,
        },
      ],
    };
  }, [serieHistorica, temaEscuro]);

  return (
    <section className="grafico-container grafico-movimentacao-mensal-container">
      <h2>Movimentação mensal da carteira</h2>
      <p className="grafico-subtitulo">
        Inclusões, cancelamentos e saldo líquido por competência
      </p>

      <div className="grafico grafico-movimentacao-mensal">
        <EChart option={option} />
      </div>
    </section>
  );
}

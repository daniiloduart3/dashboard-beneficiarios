import { useMemo } from "react";

import EChart from "./EChart";

const QUANTIDADE_VISIVEL = 8;

function quebrarRotulo(texto, limite = 27) {
  const palavras = String(texto || "").trim().split(/\s+/).filter(Boolean);
  const linhas = [];
  let linhaAtual = "";

  palavras.forEach((palavra) => {
    const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;

    if (tentativa.length <= limite || !linhaAtual) {
      linhaAtual = tentativa;
      return;
    }

    linhas.push(linhaAtual);
    linhaAtual = palavra;
  });

  if (linhaAtual) linhas.push(linhaAtual);

  return linhas.join("\n");
}

export default function CancellationReasonsChart({ dashboard }) {
  const { motivosCancelamento, temaEscuro } = dashboard;

  const option = useMemo(() => {
    const dados = Array.isArray(motivosCancelamento)
      ? motivosCancelamento.filter((item) => Number(item?.quantidade || 0) > 0)
      : [];

    const corTexto = temaEscuro ? "#cbd5e1" : "#475569";
    const corGrade = temaEscuro ? "#334155" : "#e2e8f0";
    const corTooltip = temaEscuro ? "#0f172a" : "#ffffff";
    const ultimoIndiceVisivel = Math.min(
      QUANTIDADE_VISIVEL - 1,
      Math.max(dados.length - 1, 0)
    );

    return {
      animationDuration: 650,
      grid: {
        top: 12,
        right: dados.length > QUANTIDADE_VISIVEL ? 58 : 34,
        bottom: 24,
        left: 224,
        containLabel: false,
      },
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: corTooltip,
        borderColor: temaEscuro ? "#334155" : "#cbd5e1",
        textStyle: { color: temaEscuro ? "#e2e8f0" : "#0f172a" },
        formatter: ({ data, dataIndex }) => [
          `<strong>${data?.motivo || ""}</strong>`,
          `${Number(data?.quantidade || 0).toLocaleString("pt-BR")} cancelamentos`,
          `${Number(data?.percentual || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}% do total`,
          `${Number(dataIndex || 0) + 1}º motivo mais frequente`,
        ].join("<br/>"),
      },
      dataZoom: dados.length > QUANTIDADE_VISIVEL
        ? [
            {
              type: "slider",
              yAxisIndex: 0,
              orient: "vertical",
              right: 5,
              top: 14,
              bottom: 25,
              width: 12,
              startValue: 0,
              endValue: ultimoIndiceVisivel,
              zoomLock: true,
              brushSelect: false,
              showDetail: false,
              showDataShadow: false,
              borderColor: temaEscuro ? "#475569" : "#cbd5e1",
              backgroundColor: temaEscuro ? "#1e293b" : "#f1f5f9",
              fillerColor: temaEscuro
                ? "rgba(96, 165, 250, 0.28)"
                : "rgba(37, 99, 235, 0.18)",
              handleSize: "145%",
              handleStyle: {
                color: temaEscuro ? "#93c5fd" : "#2563eb",
                borderColor: temaEscuro ? "#bfdbfe" : "#1d4ed8",
              },
              moveHandleSize: 5,
              moveHandleStyle: {
                color: temaEscuro ? "#93c5fd" : "#2563eb",
              },
              emphasis: {
                handleStyle: {
                  color: temaEscuro ? "#bfdbfe" : "#1d4ed8",
                },
              },
            },
            {
              type: "inside",
              yAxisIndex: 0,
              startValue: 0,
              endValue: ultimoIndiceVisivel,
              zoomLock: true,
              moveOnMouseWheel: true,
              zoomOnMouseWheel: false,
              moveOnMouseMove: false,
            },
          ]
        : [],
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: corTexto,
          formatter: (valor) => Number(valor).toLocaleString("pt-BR"),
        },
        splitLine: { lineStyle: { color: corGrade, type: "dashed" } },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: dados.map((item) => item.motivo),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: corTexto,
          fontSize: 10.5,
          lineHeight: 14,
          width: 210,
          overflow: "break",
          align: "right",
          margin: 12,
          formatter: (valor) => quebrarRotulo(valor),
        },
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 22,
          data: dados.map((item, indice) => ({
            value: item.quantidade,
            ...item,
            itemStyle: {
              color: indice === 0 ? "#dc2626" : "#ef4444",
              borderRadius: [0, 6, 6, 0],
            },
          })),
          label: {
            show: true,
            position: "right",
            distance: 5,
            color: corTexto,
            fontSize: 10,
            formatter: ({ value }) => Number(value).toLocaleString("pt-BR"),
          },
        },
      ],
    };
  }, [motivosCancelamento, temaEscuro]);

  return (
    <section className="grafico-container grafico-motivos-cancelamento-container">
      <h2>Motivos de cancelamento</h2>
      <p className="grafico-subtitulo">
        Todos os motivos da seleção histórica — use a barra lateral ou a roda do mouse
      </p>

      <div className="grafico grafico-motivos-cancelamento">
        <EChart option={option} />
      </div>
    </section>
  );
}

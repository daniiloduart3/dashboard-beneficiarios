import { useMemo } from "react";

import EChart from "./EChart";

export default function CityChart({ dashboard }) {
  const {
    beneficiariosPorCidade,
    cidadeSelecionada,
    selecionarCidadeTabela,
    temaEscuro,
  } = dashboard;

  const cidadesExibidas = useMemo(
    () => beneficiariosPorCidade,
    [beneficiariosPorCidade]
  );

  const option = useMemo(() => {
    const possuiFiltro = cidadeSelecionada !== "Todas";
    const corTexto = temaEscuro ? "#cbd5e1" : "#475569";
    const corGrade = temaEscuro ? "#334155" : "#e2e8f0";
    const corTooltip = temaEscuro ? "#0f172a" : "#ffffff";

    return {
      animationDuration: 650,
      animationEasing: "cubicOut",
      grid: {
        top: 12,
        right: 58,
        bottom: 28,
        left: 112,
        containLabel: false,
      },
      dataZoom: [
        {
          type: "slider",
          yAxisIndex: 0,
          right: 10,
          top: 10,
          bottom: 20,
          width: 14,
          startValue: 0,
          endValue: Math.min(14, Math.max(cidadesExibidas.length - 1, 0)),
          zoomLock: true,
          showDetail: false,
          showDataShadow: false,
          brushSelect: false,
          borderColor: temaEscuro ? "#334155" : "#dbeafe",
          backgroundColor: temaEscuro ? "#0f172a" : "#eff6ff",
          fillerColor: temaEscuro
            ? "rgba(59, 130, 246, 0.28)"
            : "rgba(59, 130, 246, 0.2)",
          handleStyle: {
            color: "#3b82f6",
            borderColor: "#2563eb",
          },
          moveHandleStyle: {
            color: "#60a5fa",
          },
        },
        {
          type: "inside",
          yAxisIndex: 0,
          zoomOnMouseWheel: false,
          moveOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: corTooltip,
        borderColor: temaEscuro ? "#334155" : "#cbd5e1",
        textStyle: {
          color: temaEscuro ? "#e2e8f0" : "#0f172a",
        },
        formatter: (parametros) => {
          const item = parametros?.[0];
          const quantidade = Number(item?.value || 0).toLocaleString("pt-BR");
          return `<strong>${item?.name || ""}</strong><br/>${quantidade} beneficiários`;
        },
      },
      xAxis: {
        type: "value",
        minInterval: 1,
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
      yAxis: {
        type: "category",
        inverse: true,
        data: cidadesExibidas.map((item) => item.cidade),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: corTexto,
          fontSize: 10,
          width: 98,
          overflow: "truncate",
        },
      },
      series: [
        {
          name: "Beneficiários",
          type: "bar",
          barMaxWidth: 18,
          data: cidadesExibidas.map((item) => {
            const selecionada = cidadeSelecionada === item.cidade;

            return {
              value: item.quantidade,
              itemStyle: {
                color: selecionada ? "#1d4ed8" : "#3b82f6",
                opacity: possuiFiltro && !selecionada ? 0.3 : 1,
                borderRadius: [0, 6, 6, 0],
              },
            };
          }),
          emphasis: {
            focus: "series",
            itemStyle: { opacity: 1 },
          },
        },
      ],
    };
  }, [cidadesExibidas, cidadeSelecionada, temaEscuro]);

  const eventos = useMemo(
    () => ({
      click: (parametros) => {
        if (!parametros?.name) return;
        selecionarCidadeTabela(parametros.name);
      },
    }),
    [selecionarCidadeTabela]
  );

  return (
    <article className="grafico-container grafico-cidades-container">
      <h2>Beneficiários por cidade</h2>

      <p className="grafico-subtitulo">
        Todas as cidades da seleção atual
        <span className="grafico-dica">Role para navegar e clique para filtrar</span>
      </p>

      <div className="grafico grafico-cidades">
        <EChart option={option} onEvents={eventos} />
      </div>
    </article>
  );
}

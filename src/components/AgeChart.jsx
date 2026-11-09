import { useMemo } from "react";
import EChart from "./EChart";

export default function AgeChart({ dashboard }) {
  const {
    beneficiariosPorFaixaEtaria,
    faixaEtariaSelecionada,
    selecionarFaixaGrafico,
    temaEscuro,
  } = dashboard;

  const option = useMemo(() => {
    const possuiFiltro = faixaEtariaSelecionada !== "Todas";
    const corTexto = temaEscuro ? "#cbd5e1" : "#475569";
    const corGrade = temaEscuro ? "#334155" : "#e2e8f0";
    const corTooltip = temaEscuro ? "#0f172a" : "#ffffff";

    const faixasComDados = beneficiariosPorFaixaEtaria.filter(
      (item) => Number(item.quantidade || 0) > 0
    );

    return {
      animationDuration: 650,
      animationEasing: "cubicOut",
      grid: {
        top: 42,
        right: 20,
        bottom: 72,
        left: 62,
        containLabel: false,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
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
        type: "category",
        data: faixasComDados.map((item) => item.faixa),
        axisLine: {
          lineStyle: { color: corGrade },
        },
        axisTick: { show: false },
        axisLabel: {
          color: corTexto,
          rotate: 25,
          margin: 16,
          fontSize: 11,
        },
      },
      yAxis: {
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
      series: [
        {
          name: "Beneficiários",
          type: "bar",
          barMaxWidth: 70,
          data: faixasComDados.map((item) => {
            const selecionado = faixaEtariaSelecionada === item.faixa;

            return {
              value: item.quantidade,
              itemStyle: {
                color: selecionado ? "#1d4ed8" : "#3b82f6",
                opacity: possuiFiltro && !selecionado ? 0.35 : 1,
                borderRadius: [6, 6, 0, 0],
              },
            };
          }),
          label: {
            show: true,
            position: "top",
            distance: 8,
            color: corTexto,
            fontSize: 11,
            fontWeight: 700,
            formatter: (parametros) =>
              Number(parametros?.value || 0).toLocaleString("pt-BR"),
          },
          emphasis: {
            focus: "series",
            itemStyle: {
              opacity: 1,
            },
          },
        },
      ],
    };
  }, [
    beneficiariosPorFaixaEtaria,
    faixaEtariaSelecionada,
    temaEscuro,
  ]);

  const eventos = useMemo(
    () => ({
      click: (parametros) => {
        if (!parametros?.name) return;

        selecionarFaixaGrafico({ faixa: parametros.name });
      },
    }),
    [selecionarFaixaGrafico]
  );

  return (
    <article className="grafico-container">
      <h2>Beneficiários por faixa etária</h2>

      <p className="grafico-subtitulo">
        Distribuição dos beneficiários por idade
        <span className="grafico-dica">Clique em uma barra para filtrar</span>
      </p>

      <div className="grafico">
        <EChart option={option} onEvents={eventos} />
      </div>
    </article>
  );
}

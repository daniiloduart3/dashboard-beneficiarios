import { useMemo } from "react";

import { CORES_TIPO_CADASTRO } from "../constants/dashboard";
import EChart from "./EChart";

export function MonthlyEvolutionChart({ dashboard }) {
  const { inclusoesPorMesTemporal, inclusoesPorMes, temaEscuro } = dashboard;
  const serieMensal = inclusoesPorMesTemporal || inclusoesPorMes || [];

  const option = useMemo(() => {
    const corTexto = temaEscuro ? "#cbd5e1" : "#475569";
    const corGrade = temaEscuro ? "#334155" : "#e2e8f0";
    const corTooltip = temaEscuro ? "#0f172a" : "#ffffff";

    return {
      animationDuration: 650,
      animationEasing: "cubicOut",
      grid: {
        top: 48,
        right: 28,
        bottom: 42,
        left: 68,
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
          const quantidade = Number(item?.value || 0).toLocaleString("pt-BR");

          return `<strong>${item?.axisValue || ""}</strong><br/>${quantidade} inclusões`;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: serieMensal.map((item) => item.competencia),
        axisLine: {
          lineStyle: { color: corGrade },
        },
        axisTick: { show: false },
        axisLabel: {
          color: corTexto,
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
          name: "Inclusões",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          showSymbol: serieMensal.length <= 12,
          data: serieMensal.map((item) => item.quantidade),
          lineStyle: {
            width: 3,
            color: "#3b82f6",
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
                    ? "rgba(59, 130, 246, 0.38)"
                    : "rgba(59, 130, 246, 0.30)",
                },
                {
                  offset: 1,
                  color: "rgba(59, 130, 246, 0.02)",
                },
              ],
            },
          },
          label: {
            show: true,
            position: "top",
            distance: 10,
            color: corTexto,
            fontSize: 11,
            fontWeight: 700,
            formatter: (parametros) =>
              Number(parametros?.value || 0).toLocaleString("pt-BR"),
          },
          emphasis: {
            focus: "series",
            scale: 1.3,
          },
        },
      ],
    };
  }, [serieMensal, temaEscuro]);

  return (
    <article className="grafico-container">
      <h2>Evolução mensal das inclusões</h2>

      <p className="grafico-subtitulo">
        Novos beneficiários nos últimos 12 meses do recorte; os filtros de período não alteram a série
      </p>

      <div className="grafico grafico-evolucao">
        <EChart option={option} />
      </div>
    </article>
  );
}

export function RegistrationTypeChart({ dashboard }) {
  const {
    beneficiariosPorTipoCadastro,
    tipoCadastroSelecionado,
    selecionarTipoCadastro,
    totalBeneficiarios,
    temaEscuro,
  } = dashboard;

  const option = useMemo(() => {
    const possuiFiltro = tipoCadastroSelecionado !== "Todos";
    const corTexto = temaEscuro ? "#cbd5e1" : "#475569";
    const corTooltip = temaEscuro ? "#0f172a" : "#ffffff";

    return {
      animationDuration: 650,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        backgroundColor: corTooltip,
        borderColor: temaEscuro ? "#334155" : "#cbd5e1",
        textStyle: {
          color: temaEscuro ? "#e2e8f0" : "#0f172a",
        },
        formatter: (parametros) => {
          const quantidade = Number(parametros?.value || 0).toLocaleString(
            "pt-BR"
          );
          const percentual = Number(parametros?.data?.percentual || 0).toFixed(1);

          return `<strong>${parametros?.name || ""}</strong><br/>${quantidade} vidas (${percentual}%)`;
        },
      },
      legend: {
        bottom: 0,
        left: "center",
        textStyle: {
          color: corTexto,
          fontSize: 11,
        },
        itemWidth: 12,
        itemHeight: 12,
      },
      series: [
        {
          name: "Tipo de cadastro",
          type: "pie",
          radius: ["42%", "64%"],
          center: ["50%", "43%"],
          avoidLabelOverlap: true,
          minAngle: 3,
          padAngle: 2,
          itemStyle: {
            borderRadius: 7,
            borderColor: temaEscuro ? "#101c2d" : "#ffffff",
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          emphasis: {
            scale: true,
            scaleSize: 6,
            label: {
              show: false,
            },
          },
          data: beneficiariosPorTipoCadastro.map((item) => {
            const selecionado = tipoCadastroSelecionado === item.tipo;

            return {
              name: item.tipo,
              value: item.quantidade,
              percentual: item.percentual,
              itemStyle: {
                color: CORES_TIPO_CADASTRO[item.tipo],
                opacity: possuiFiltro && !selecionado ? 0.28 : 1,
              },
            };
          }),
        },
      ],
      graphic: [
        {
          type: "group",
          left: "center",
          top: "35%",
          children: [
            {
              type: "text",
              style: {
                text: totalBeneficiarios.toLocaleString("pt-BR"),
                textAlign: "center",
                fill: temaEscuro ? "#f8fafc" : "#0f172a",
                fontSize: 20,
                fontWeight: 800,
              },
            },
            {
              type: "text",
              top: 28,
              style: {
                text: "vidas selecionadas",
                textAlign: "center",
                fill: corTexto,
                fontSize: 10,
              },
            },
          ],
        },
      ],
    };
  }, [
    beneficiariosPorTipoCadastro,
    tipoCadastroSelecionado,
    totalBeneficiarios,
    temaEscuro,
  ]);

  const eventos = useMemo(
    () => ({
      click: (parametros) => {
        if (!parametros?.name) return;

        selecionarTipoCadastro({ tipo: parametros.name });
      },
    }),
    [selecionarTipoCadastro]
  );

  return (
    <article className="grafico-container">
      <h2>Tipo de cadastro</h2>

      <p className="grafico-subtitulo">
        Distribuição entre pessoa física e jurídica
        <span className="grafico-dica">Clique em uma fatia para filtrar</span>
      </p>

      <div className="grafico grafico-tipo-cadastro">
        <EChart option={option} onEvents={eventos} />
      </div>
    </article>
  );
}

export default function SecondaryCharts({ dashboard }) {
  return (
    <section className="analises-secundarias-grid">
      <MonthlyEvolutionChart dashboard={dashboard} />
      <RegistrationTypeChart dashboard={dashboard} />
    </section>
  );
}

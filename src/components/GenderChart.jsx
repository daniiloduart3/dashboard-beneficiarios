import { useMemo } from "react";
import EChart from "./EChart";

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("pt-BR");
}

function identificarSexo(beneficiario) {
  const valor =
    beneficiario?.["Sexo"] ??
    beneficiario?.["Gênero"] ??
    beneficiario?.["Genero"] ??
    beneficiario?.["Sexo do beneficiário"] ??
    beneficiario?.["Sexo do Beneficiário"] ??
    "";

  const normalizado = normalizarTexto(valor);
  if (["M", "MASC", "MASCULINO"].includes(normalizado)) return "Masculino";
  if (["F", "FEM", "FEMININO"].includes(normalizado)) return "Feminino";
  return "Não informado";
}

export default function GenderChart({ dashboard }) {
  const { beneficiariosFiltrados, temaEscuro } = dashboard;

  const distribuicao = useMemo(() => {
    const contagem = { Masculino: 0, Feminino: 0, "Não informado": 0 };

    beneficiariosFiltrados.forEach((beneficiario) => {
      contagem[identificarSexo(beneficiario)] += 1;
    });

    const total = beneficiariosFiltrados.length;
    return Object.entries(contagem)
      .map(([sexo, quantidade]) => ({
        sexo,
        quantidade,
        percentual: total > 0 ? (quantidade / total) * 100 : 0,
      }))
      .filter((item) => item.quantidade > 0);
  }, [beneficiariosFiltrados]);

  const total = beneficiariosFiltrados.length;
  const masculino = distribuicao.find((item) => item.sexo === "Masculino") || { quantidade: 0, percentual: 0 };
  const feminino = distribuicao.find((item) => item.sexo === "Feminino") || { quantidade: 0, percentual: 0 };
  const naoInformado = distribuicao.find((item) => item.sexo === "Não informado") || { quantidade: 0, percentual: 0 };
  const predominante = [...distribuicao].sort((a, b) => b.quantidade - a.quantidade)[0];

  const option = useMemo(() => {
    const corTexto = temaEscuro ? "#cbd5e1" : "#475569";
    const corTooltip = temaEscuro ? "#0f172a" : "#ffffff";

    return {
      animationDuration: 650,
      tooltip: {
        trigger: "item",
        backgroundColor: corTooltip,
        borderColor: temaEscuro ? "#334155" : "#cbd5e1",
        textStyle: { color: temaEscuro ? "#e2e8f0" : "#0f172a" },
        formatter: (parametros) =>
          `<strong>${parametros.name}</strong><br/>${Number(parametros.value || 0).toLocaleString("pt-BR")} beneficiários<br/>${Number(parametros.percent || 0).toFixed(1)}% da seleção`,
      },
      legend: {
        bottom: 4,
        left: "center",
        textStyle: { color: corTexto, fontSize: 11 },
        itemWidth: 11,
        itemHeight: 11,
      },
      series: [
        {
          name: "Sexo",
          type: "pie",
          radius: ["54%", "76%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: temaEscuro ? "#0f172a" : "#ffffff",
            borderWidth: 3,
            borderRadius: 5,
          },
          label: {
            show: true,
            color: corTexto,
            fontSize: 11,
            fontWeight: 700,
            formatter: ({ name, percent }) => `${name}\n${percent.toFixed(1)}%`,
          },
          labelLine: { length: 12, length2: 8 },
          data: distribuicao.map((item) => ({ name: item.sexo, value: item.quantidade })),
        },
      ],
      graphic: total > 0 ? [
        {
          type: "text",
          left: "center",
          top: "35%",
          style: {
            text: total.toLocaleString("pt-BR"),
            fill: temaEscuro ? "#f8fafc" : "#0f172a",
            fontSize: 22,
            fontWeight: 800,
            textAlign: "center",
          },
        },
        {
          type: "text",
          left: "center",
          top: "43%",
          style: {
            text: "beneficiários",
            fill: corTexto,
            fontSize: 11,
            textAlign: "center",
          },
        },
      ] : [],
    };
  }, [distribuicao, temaEscuro, total]);

  return (
    <article className="grafico-container grafico-sexo-container">
      <div className="grafico-sexo-cabecalho">
        <div>
          <h2>Beneficiários por sexo</h2>
          <p className="grafico-subtitulo">Composição da carteira ativa por masculino e feminino</p>
        </div>
        {predominante && (
          <span className="grafico-sexo-destaque">
            <small>Maior participação</small>
            <strong>{predominante.sexo}</strong>
            <b>{predominante.percentual.toFixed(1)}%</b>
          </span>
        )}
      </div>

      <div className="demografia-sexo-kpis">
        <span><small>Masculino</small><strong>{masculino.quantidade.toLocaleString("pt-BR")}</strong><b>{masculino.percentual.toFixed(1)}%</b></span>
        <span><small>Feminino</small><strong>{feminino.quantidade.toLocaleString("pt-BR")}</strong><b>{feminino.percentual.toFixed(1)}%</b></span>
        {naoInformado.quantidade > 0 && (
          <span><small>Não informado</small><strong>{naoInformado.quantidade.toLocaleString("pt-BR")}</strong><b>{naoInformado.percentual.toFixed(1)}%</b></span>
        )}
      </div>

      <div className="grafico grafico-sexo">
        <EChart option={option} />
      </div>
    </article>
  );
}

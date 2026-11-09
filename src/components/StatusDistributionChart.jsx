import { useMemo } from "react";

import EChart from "./EChart";

function formatarSituacao(situacao) {
  const nomes = {
    ATIVO: "Ativo",
    CANCELADO: "Cancelado",
    MIGRADO: "Migrado",
    FALECIDO: "Falecido",
    "DIGITAÇÃO": "Digitação",
    DIGITACAO: "Digitação",
    "NÃO INFORMADO": "Não informado",
  };

  return nomes[situacao] || situacao;
}

const CORES_SITUACAO = {
  Ativo: "#4f70db",
  Cancelado: "#525672",
  Digitação: "#b9d532",
  Migrado: "#fb923c",
  Falecido: "#1597b8",
  "Não informado": "#94a3b8",
};

const ORDEM_SITUACOES = [
  "Ativo",
  "Cancelado",
  "Digitação",
  "Migrado",
  "Falecido",
  "Não informado",
];

export default function StatusDistributionChart({ dashboard }) {
  const { distribuicaoSituacoes, temaEscuro } = dashboard;

  const { option, resumo, total } = useMemo(() => {
    const consolidados = new Map();

    (Array.isArray(distribuicaoSituacoes) ? distribuicaoSituacoes : []).forEach(
      (item) => {
        const nome = formatarSituacao(item.situacao);
        consolidados.set(
          nome,
          (consolidados.get(nome) || 0) + Number(item.quantidade || 0)
        );
      }
    );

    const dadosOrdenados = ORDEM_SITUACOES
      .filter((nome) => consolidados.has(nome))
      .map((nome) => ({
        name: nome,
        value: consolidados.get(nome),
        itemStyle: { color: CORES_SITUACAO[nome] },
      }));

    Array.from(consolidados.entries()).forEach(([name, value]) => {
      if (!ORDEM_SITUACOES.includes(name)) {
        dadosOrdenados.push({
          name,
          value,
          itemStyle: { color: CORES_SITUACAO[name] || "#94a3b8" },
        });
      }
    });

    const totalCalculado = dadosOrdenados.reduce(
      (soma, item) => soma + item.value,
      0
    );
    const corTexto = temaEscuro ? "#cbd5e1" : "#475569";
    const corTooltip = temaEscuro ? "#0f172a" : "#ffffff";

    const resumoCalculado = dadosOrdenados.map((item) => ({
      ...item,
      percentual:
        totalCalculado > 0 ? (item.value / totalCalculado) * 100 : 0,
      cor: item.itemStyle.color,
    }));

    return {
      total: totalCalculado,
      resumo: resumoCalculado,
      option: {
        animationDuration: 650,
        tooltip: {
          trigger: "item",
          backgroundColor: corTooltip,
          borderColor: temaEscuro ? "#334155" : "#cbd5e1",
          textStyle: { color: temaEscuro ? "#e2e8f0" : "#0f172a" },
          formatter: ({ name, value, percent }) => [
            `<strong>${name}</strong>`,
            `${Number(value || 0).toLocaleString("pt-BR")} registros`,
            `${Number(percent || 0).toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}% do total histórico`,
          ].join("<br/>")
        },
        series: [
          {
            name: "Situação",
            type: "pie",
            radius: ["51%", "76%"],
            center: ["50%", "50%"],
            avoidLabelOverlap: true,
            itemStyle: {
              borderColor: temaEscuro ? "#101c2d" : "#ffffff",
              borderWidth: 3,
            },
            label: { show: false },
            emphasis: {
              scale: true,
              scaleSize: 5,
              label: {
                show: true,
                fontSize: 12,
                fontWeight: 700,
                color: corTexto,
                formatter: "{b}\n{d}%",
              },
            },
            data: dadosOrdenados,
          },
        ],
      },
    };
  }, [distribuicaoSituacoes, temaEscuro]);

  return (
    <section className="grafico-container grafico-situacoes-container">
      <h2>Situação dos registros</h2>
      <p className="grafico-subtitulo">
        Distribuição da base histórica conforme os filtros aplicados
      </p>

      <div className="situacoes-painel-executivo">
        <div className="grafico grafico-situacoes">
          <EChart option={option} />
        </div>

        <div className="situacoes-resumo" aria-label="Resumo das situações">
          <div className="situacoes-total">
            <strong>{total.toLocaleString("pt-BR")}</strong>
            <span>Registros históricos</span>
          </div>

          <div className="situacoes-lista">
            {resumo.map((item) => (
              <div className="situacoes-item" key={item.name}>
                <span
                  className="situacoes-cor"
                  style={{ backgroundColor: item.cor }}
                  aria-hidden="true"
                />
                <span className="situacoes-nome">{item.name}</span>
                <span className="situacoes-metricas">
                  <strong className="situacoes-valor">
                    {item.value.toLocaleString("pt-BR")}
                  </strong>
                  <span className="situacoes-percentual">
                    {item.percentual.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

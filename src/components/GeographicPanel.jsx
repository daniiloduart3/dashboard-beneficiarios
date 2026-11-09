import { useMemo } from "react";

import BrazilMap from "./BrazilMap";

export default function GeographicPanel({ dashboard, modo = "completo" }) {
  const {
    temaEscuro,
    beneficiarios,
    beneficiariosFiltrados,
    dataInicial,
    dataFinal,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
    selecionarLocalGrafico,
    estadoSelecionado,
    cidadeSelecionada,
    setEstadoSelecionado,
    setCidadeSelecionada,
    setBuscaCidade,
  } = dashboard;

  const dadosMapa = useMemo(() => {
    const contagem = beneficiariosFiltrados.reduce((acc, beneficiario) => {
      const estado = beneficiario["Estado de correspondência"] || "";
      if (!estado) return acc;
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(contagem).map(([local, quantidade]) => ({
      local,
      quantidade,
    }));
  }, [beneficiariosFiltrados]);

  function voltarAoBrasil() {
    setEstadoSelecionado("Todos");
    setCidadeSelecionada("Todas");
    setBuscaCidade("");
  }

  const exibirMapa = modo !== "analises";
  const exibirAnalises = modo !== "mapa";

  return (
    <article className={`grafico-container painel-geografico-principal ${!exibirMapa ? "painel-geografico-analises" : ""}`}>
      {exibirMapa && (<>
      <div className="grafico-navegacao-geografica" aria-label="Navegação geográfica">
        <button
          type="button"
          className={estadoSelecionado === "Todos" ? "ativo" : ""}
          onClick={voltarAoBrasil}
        >
          Brasil
        </button>

        {estadoSelecionado !== "Todos" && (
          <>
            <span aria-hidden="true">›</span>
            <strong>{estadoSelecionado}</strong>
            <button
              type="button"
              className="grafico-voltar-brasil"
              onClick={voltarAoBrasil}
            >
              ← Voltar ao Brasil
            </button>
          </>
        )}
      </div>

      <div className="grafico-cabecalho-com-acoes">
        <div>
          <h2>{estadoSelecionado === "Todos" ? "Beneficiários por estado" : "Beneficiários por município"}</h2>
          <p className="grafico-subtitulo">
            {estadoSelecionado === "Todos"
              ? "Distribuição geográfica da seleção"
              : `Distribuição municipal em ${estadoSelecionado}`}
            <span className="grafico-dica">
              {estadoSelecionado === "Todos"
                ? "Clique em um estado para detalhar os municípios"
                : "Clique em um município para consultar seus indicadores"}
            </span>
          </p>
        </div>
      </div>
      </>)}

      <BrazilMap
        dados={dadosMapa}
        temaEscuro={temaEscuro}
        selecionarEstado={selecionarLocalGrafico}
        beneficiarios={beneficiarios}
        beneficiariosFiltrados={beneficiariosFiltrados}
        dataInicial={dataInicial}
        dataFinal={dataFinal}
        faixaEtariaSelecionada={faixaEtariaSelecionada}
        empresaSelecionada={empresaSelecionada}
        tipoCadastroSelecionado={tipoCadastroSelecionado}
        estadoSelecionado={estadoSelecionado}
        cidadeSelecionada={cidadeSelecionada}
        exibirMapa={exibirMapa}
        exibirAnalises={exibirAnalises}
        exibirResumoExecutivo={modo !== "analises"}
      />
    </article>
  );
}

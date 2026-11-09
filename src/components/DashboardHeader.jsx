import { useEffect, useState } from "react";

const DATA_EXTRACAO_PADRAO = "2026-07-20";

function calcularStatusAtualizacao(dataIso) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const dataBase = new Date(ano, mes - 1, dia);
  const hoje = new Date();

  dataBase.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);

  const diferencaMs = hoje.getTime() - dataBase.getTime();
  const dias = Math.max(0, Math.floor(diferencaMs / 86400000));

  if (dias <= 7) {
    return { dias, nivel: "verde" };
  }

  if (dias <= 10) {
    return { dias, nivel: "amarelo" };
  }

  return { dias, nivel: "vermelho" };
}

function formatarDataBase(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function DashboardHeader({ dashboard }) {
  const [dataExtracaoBase, setDataExtracaoBase] = useState(
    DATA_EXTRACAO_PADRAO
  );

  useEffect(() => {
    let ativo = true;

    async function carregarConfiguracao() {
      try {
        const resposta = await fetch("/dashboard-config.json", {
          cache: "no-store",
        });

        if (!resposta.ok) return;

        const configuracao = await resposta.json();
        const dataExtracao = String(configuracao?.dataExtracao || "");

        if (ativo && /^\d{4}-\d{2}-\d{2}$/.test(dataExtracao)) {
          setDataExtracaoBase(dataExtracao);
        }
      } catch {
        // Mantém a data padrão quando o arquivo ainda não foi gerado.
      }
    }

    carregarConfiguracao();

    return () => {
      ativo = false;
    };
  }, []);

  const {
    temaEscuro,
    setTemaEscuro,
    exportandoImagem,
    totalBeneficiarios,
    totalEmpresas,
    periodoInvalido,
    exportarDadosFiltrados,
    exportarDashboardComoPng,
    exportarDashboardComoPdf,
  } = dashboard;

  const exportacaoDesabilitada =
    totalBeneficiarios === 0 || periodoInvalido || exportandoImagem;

  const statusAtualizacao = calcularStatusAtualizacao(dataExtracaoBase);
  const textoDias =
    statusAtualizacao.dias === 0
      ? "Atualizada hoje"
      : `Atualizada há ${statusAtualizacao.dias} ${
          statusAtualizacao.dias === 1 ? "dia" : "dias"
        }`;

  return (
    <header className="cabecalho-dashboard">
      <div className="cabecalho-conteudo">
        <span className="cabecalho-etiqueta">Painel executivo de vidas ativas</span>
        <h1>Dashboard de Beneficiários · Vértice Saúde</h1>

        <div className="cabecalho-atualizacao" aria-label="Informações da base de dados">
          <span className={`cabecalho-status cabecalho-status-${statusAtualizacao.nivel}`}>
            <span className="cabecalho-status-ponto" aria-hidden="true" />
            {textoDias}
          </span>

          <span className="cabecalho-atualizacao-divisor" aria-hidden="true" />

          <span className="cabecalho-data-base">
            <span aria-hidden="true">🗓️</span>
            Extração da base: {formatarDataBase(dataExtracaoBase)}
          </span>
        </div>
      </div>

      <div className="cabecalho-resumo">
        <button
          type="button"
          className="botao-tema"
          onClick={() => setTemaEscuro((temaAtual) => !temaAtual)}
          aria-pressed={temaEscuro}
          title={temaEscuro ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          <span aria-hidden="true">{temaEscuro ? "☀️" : "🌙"}</span>
          {temaEscuro ? "Modo claro" : "Modo escuro"}
        </button>

        <div className="grupo-exportacao">
          <button type="button" className="botao-exportar" onClick={exportarDadosFiltrados} disabled={exportacaoDesabilitada} title="Exportar os registros filtrados em CSV">
            <span aria-hidden="true">📄</span> CSV
          </button>
          <button type="button" className="botao-exportar" onClick={exportarDashboardComoPng} disabled={exportacaoDesabilitada} title="Salvar o dashboard como imagem">
            <span aria-hidden="true">📷</span> PNG
          </button>
          <button type="button" className="botao-exportar" onClick={exportarDashboardComoPdf} disabled={exportacaoDesabilitada} title="Salvar o dashboard como PDF">
            <span aria-hidden="true">📑</span> {exportandoImagem ? "Gerando..." : "PDF"}
          </button>
        </div>

        <span>{totalBeneficiarios.toLocaleString("pt-BR")} vidas</span>
        <span>{totalEmpresas.toLocaleString("pt-BR")} empresas</span>
      </div>
    </header>
  );
}

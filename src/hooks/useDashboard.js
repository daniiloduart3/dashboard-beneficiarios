import { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";

import { CORES_TIPO_CADASTRO, FAIXAS_ETARIAS } from "../constants/dashboard";
import {
  converterData,
  converterDataInput,
  formatarDataInput,
  identificarFaixaEtaria,
  identificarTipoCadastro,
  empresaValidaParaAnalise,
  normalizarNomeArquivo,
  protegerValorCsv,
} from "../utils/dashboard";


const CACHE_DATAS = new Map();
const CHAVE_FILTROS_SESSAO = "vertice-bi-filtros";

function lerFiltrosSessao() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_FILTROS_SESSAO) || "{}");
  } catch {
    return {};
  }
}

const FILTROS_INICIAIS = lerFiltrosSessao();


function converterDataCacheada(valor) {
  const chave = String(valor ?? "").trim();

  if (!chave) return null;
  if (CACHE_DATAS.has(chave)) return CACHE_DATAS.get(chave);

  const data = converterData(chave);
  CACHE_DATAS.set(chave, data);
  return data;
}

const CACHE_METADADOS = new WeakMap();

function obterMetadados(beneficiario) {
  const existente = CACHE_METADADOS.get(beneficiario);
  if (existente) return existente;

  const metadados = {
    estado: beneficiario["Estado de correspondência"],
    cidade: beneficiario["Cidade de correspondência"],
    empresa: beneficiario["Empresa"],
    faixaEtaria: identificarFaixaEtaria(beneficiario["Idade"]),
    tipoCadastro: identificarTipoCadastro(beneficiario["Empresa"]),
    dataInclusao: converterDataCacheada(beneficiario["Data de Inclusão"]),
    dataCancelamento: converterDataCacheada(
      beneficiario["Data de cancelamento"] || beneficiario["Data de Cancelamento"]
    ),
  };

  CACHE_METADADOS.set(beneficiario, metadados);
  return metadados;
}

function normalizarSituacao(beneficiario) {
  return String(beneficiario["Situação"] ?? "")
    .trim()
    .toLocaleUpperCase("pt-BR");
}

function estaAtivoNaDataAtual(beneficiario, dataReferencia) {
  const situacao = normalizarSituacao(beneficiario);
  const dataInclusao = converterDataCacheada(beneficiario["Data de Inclusão"]);

  return (
    (!situacao || situacao === "ATIVO") &&
    Boolean(dataInclusao) &&
    dataInclusao <= dataReferencia
  );
}

export default function useDashboard() {

  const [temaEscuro, setTemaEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem("tema-dashboard");

    if (temaSalvo === "escuro") return true;
    if (temaSalvo === "claro") return false;

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  const [beneficiarios, setBeneficiarios] = useState([]);
  const [todosBeneficiarios, setTodosBeneficiarios] = useState([]);
  const [exportandoImagem, setExportandoImagem] = useState(false);

  const [estadoSelecionado, setEstadoSelecionado] =
    useState(() => FILTROS_INICIAIS.estadoSelecionado || "Todos");

  const [cidadeSelecionada, setCidadeSelecionada] =
    useState(() => FILTROS_INICIAIS.cidadeSelecionada || "Todas");

  const [faixaEtariaSelecionada, setFaixaEtariaSelecionada] =
    useState(() => FILTROS_INICIAIS.faixaEtariaSelecionada || "Todas");

  const [empresaSelecionada, setEmpresaSelecionada] =
    useState(() => FILTROS_INICIAIS.empresaSelecionada || "Todas");

  const [
    tipoCadastroSelecionado,
    setTipoCadastroSelecionado,
  ] = useState(() => FILTROS_INICIAIS.tipoCadastroSelecionado || "Todos");

  const [dataInicial, setDataInicial] = useState(() => FILTROS_INICIAIS.dataInicial || "");
  const [dataFinal, setDataFinal] = useState(() => FILTROS_INICIAIS.dataFinal || "");

  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [buscaCidade, setBuscaCidade] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE_FILTROS_SESSAO, JSON.stringify({
        estadoSelecionado,
        cidadeSelecionada,
        faixaEtariaSelecionada,
        empresaSelecionada,
        tipoCadastroSelecionado,
        dataInicial,
        dataFinal,
      }));
    } catch {
      // O dashboard continua funcional quando o armazenamento está indisponível.
    }
  }, [
    estadoSelecionado,
    cidadeSelecionada,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
    dataInicial,
    dataFinal,
  ]);

  useEffect(() => {
    document.documentElement.dataset.tema = temaEscuro
      ? "escuro"
      : "claro";

    document.body.classList.toggle("tema-escuro", temaEscuro);
    localStorage.setItem(
      "tema-dashboard",
      temaEscuro ? "escuro" : "claro"
    );
  }, [temaEscuro]);

  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        setErro("");

        const resposta = await fetch(
          "/beneficiarios-publico.csv"
        );

        if (!resposta.ok) {
          throw new Error(
            "Não foi possível localizar o arquivo CSV."
          );
        }

        const arquivo = await resposta.arrayBuffer();
        const texto = new TextDecoder("utf-8").decode(arquivo);
        const textoSemBom = texto.replace(/^\uFEFF/, "");

        const linhas = textoSemBom
          .split(/\r?\n/)
          .filter((linha) => linha.trim() !== "");

        if (linhas.length === 0) {
          throw new Error("O arquivo CSV está vazio.");
        }

        const cabecalho = linhas[0]
          .split(";")
          .map((coluna) => coluna.trim());

        const dados = linhas.slice(1).map((linha) => {
          const valores = linha.split(";");

          return cabecalho.reduce(
            (registro, coluna, indice) => {
              registro[coluna] =
                valores[indice]?.trim() || "";

              return registro;
            },
            {}
          );
        });

        setTodosBeneficiarios(dados);

        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999);

        // A mesma regra de carteira atual é reutilizada em todo o dashboard.
        // Situação é a fonte de verdade para a posição atual; inclusões futuras
        // não são antecipadas.
        const beneficiariosAtivos = dados.filter((beneficiario) =>
          estaAtivoNaDataAtual(beneficiario, hoje)
        );

        setBeneficiarios(beneficiariosAtivos);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Ocorreu um erro ao carregar os dados."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  const dataInicialConvertida = useMemo(
    () => converterDataInput(dataInicial),
    [dataInicial]
  );

  const dataFinalConvertida = useMemo(
    () => converterDataInput(dataFinal),
    [dataFinal]
  );

  const periodoInvalido = Boolean(
    dataInicialConvertida &&
      dataFinalConvertida &&
      dataInicialConvertida > dataFinalConvertida
  );

  const estadosDisponiveis = useMemo(() => {
    return [
      ...new Set(
        beneficiarios
          .map((beneficiario) =>
            beneficiario[
              "Estado de correspondência"
            ]?.trim()
          )
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [beneficiarios]);

  const cidadesDisponiveis = useMemo(() => {
    const baseParaCidades =
      estadoSelecionado === "Todos"
        ? beneficiarios
        : beneficiarios.filter(
            (beneficiario) =>
              beneficiario[
                "Estado de correspondência"
              ] === estadoSelecionado
          );

    return [
      ...new Set(
        baseParaCidades
          .map((beneficiario) =>
            beneficiario[
              "Cidade de correspondência"
            ]?.trim()
          )
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [beneficiarios, estadoSelecionado]);

  const empresasDisponiveis = useMemo(() => {
    return [
      ...new Set(
        beneficiarios
          .map((beneficiario) =>
            beneficiario["Empresa"]?.trim()
          )
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [beneficiarios]);

  const beneficiariosFiltrados = useMemo(() => {
    if (periodoInvalido) {
      return [];
    }

    return beneficiarios.filter((beneficiario) => {
      const {
        estado,
        cidade,
        empresa,
        faixaEtaria,
        tipoCadastro,
        dataInclusao,
      } = obterMetadados(beneficiario);

      const atendeEstado =
        estadoSelecionado === "Todos" ||
        estado === estadoSelecionado;

      const atendeCidade =
        cidadeSelecionada === "Todas" ||
        cidade === cidadeSelecionada;

      const atendeFaixaEtaria =
        faixaEtariaSelecionada === "Todas" ||
        faixaEtaria === faixaEtariaSelecionada;

      const atendeEmpresa =
        empresaSelecionada === "Todas" ||
        empresa === empresaSelecionada;

      const atendeTipoCadastro =
        tipoCadastroSelecionado === "Todos" ||
        tipoCadastro === tipoCadastroSelecionado;

      const atendeDataInicial =
        !dataInicialConvertida ||
        (dataInclusao &&
          dataInclusao >= dataInicialConvertida);

      const atendeDataFinal =
        !dataFinalConvertida ||
        (dataInclusao &&
          dataInclusao <= dataFinalConvertida);

      return (
        atendeEstado &&
        atendeCidade &&
        atendeFaixaEtaria &&
        atendeEmpresa &&
        atendeTipoCadastro &&
        atendeDataInicial &&
        atendeDataFinal
      );
    });
  }, [
    beneficiarios,
    estadoSelecionado,
    cidadeSelecionada,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
    dataInicialConvertida,
    dataFinalConvertida,
    periodoInvalido,
  ]);

  const todosBeneficiariosFiltradosHistorico = useMemo(() => {
    if (periodoInvalido) {
      return [];
    }

    return todosBeneficiarios.filter((beneficiario) => {
      const {
        estado,
        cidade,
        empresa,
        faixaEtaria,
        tipoCadastro,
        dataInclusao,
      } = obterMetadados(beneficiario);

      return (
        (estadoSelecionado === "Todos" || estado === estadoSelecionado) &&
        (cidadeSelecionada === "Todas" || cidade === cidadeSelecionada) &&
        (faixaEtariaSelecionada === "Todas" || faixaEtaria === faixaEtariaSelecionada) &&
        (empresaSelecionada === "Todas" || empresa === empresaSelecionada) &&
        (tipoCadastroSelecionado === "Todos" || tipoCadastro === tipoCadastroSelecionado) &&
        (!dataInicialConvertida || (dataInclusao && dataInclusao >= dataInicialConvertida)) &&
        (!dataFinalConvertida || (dataInclusao && dataInclusao <= dataFinalConvertida))
      );
    });
  }, [
    todosBeneficiarios,
    estadoSelecionado,
    cidadeSelecionada,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
    dataInicialConvertida,
    dataFinalConvertida,
    periodoInvalido,
  ]);

  const todosBeneficiariosFiltradosCrescimento = useMemo(() => {
    return todosBeneficiarios.filter((beneficiario) => {
      const {
        estado,
        cidade,
        empresa,
        faixaEtaria,
        tipoCadastro,
      } = obterMetadados(beneficiario);

      return (
        (estadoSelecionado === "Todos" || estado === estadoSelecionado) &&
        (cidadeSelecionada === "Todas" || cidade === cidadeSelecionada) &&
        (faixaEtariaSelecionada === "Todas" || faixaEtaria === faixaEtariaSelecionada) &&
        (empresaSelecionada === "Todas" || empresa === empresaSelecionada) &&
        (tipoCadastroSelecionado === "Todos" || tipoCadastro === tipoCadastroSelecionado)
      );
    });
  }, [
    todosBeneficiarios,
    estadoSelecionado,
    cidadeSelecionada,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
  ]);

  const totalBeneficiariosCrescimento = todosBeneficiariosFiltradosCrescimento.length;

  const totalBeneficiarios = beneficiariosFiltrados.length;

  const totalCidades = useMemo(() => {
    return new Set(
      beneficiariosFiltrados
        .map(
          (beneficiario) =>
            beneficiario["Cidade de correspondência"]
        )
        .filter(Boolean)
    ).size;
  }, [beneficiariosFiltrados]);

  const totalEmpresas = useMemo(() => {
    return new Set(
      beneficiariosFiltrados
        .map((beneficiario) => beneficiario["Empresa"])
        .filter(empresaValidaParaAnalise)
        .map((empresa) => String(empresa).trim())
    ).size;
  }, [beneficiariosFiltrados]);

  const dataUltimaAtualizacao = useMemo(() => {
    const datasValidas = beneficiarios
      .map((beneficiario) =>
        converterDataCacheada(beneficiario["Data de Inclusão"])
      )
      .filter(Boolean);

    if (datasValidas.length === 0) {
      return "Não informada";
    }

    const dataMaisRecente = new Date(
      datasValidas.reduce(
        (maior, data) => Math.max(maior, data.getTime()),
        Number.NEGATIVE_INFINITY
      )
    );

    return dataMaisRecente.toLocaleDateString("pt-BR");
  }, [beneficiarios]);

  const historicoCarteira = useMemo(() => {
    if (todosBeneficiariosFiltradosHistorico.length === 0) {
      return [];
    }

    const eventos = [];
    const inclusoesPorMes = new Map();
    const cancelamentosPorMes = new Map();
    let menorData = null;

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const chaveMes = (data) =>
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    const somarNoMes = (mapa, data) => {
      if (data > hoje) {
        return;
      }

      const chave = chaveMes(data);
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    };

    todosBeneficiariosFiltradosHistorico.forEach((beneficiario) => {
      const situacao = String(beneficiario["Situação"] ?? "")
        .trim()
        .toLocaleUpperCase("pt-BR");

      // Registros ainda em digitação não compõem a carteira ativa.
      if (situacao === "DIGITAÇÃO" || situacao === "DIGITACAO") {
        return;
      }

      const dataInclusao = converterDataCacheada(
        beneficiario["Data de Inclusão"]
      );

      if (!dataInclusao) {
        return;
      }

      const inclusao = new Date(dataInclusao);
      inclusao.setHours(0, 0, 0, 0);

      eventos.push({
        data: inclusao.getTime(),
        variacao: 1,
      });
      somarNoMes(inclusoesPorMes, inclusao);

      if (!menorData || inclusao < menorData) {
        menorData = inclusao;
      }

      const dataCancelamento = converterDataCacheada(
        beneficiario["Data de cancelamento"] ||
          beneficiario["Data de Cancelamento"]
      );

      // Uma data anterior à inclusão é inconsistente e não deve reduzir
      // artificialmente a carteira histórica.
      if (dataCancelamento && dataCancelamento >= inclusao) {
        const cancelamento = new Date(dataCancelamento);
        cancelamento.setHours(0, 0, 0, 0);

        eventos.push({
          data: cancelamento.getTime(),
          variacao: -1,
        });
        somarNoMes(cancelamentosPorMes, cancelamento);
      }
    });

    if (eventos.length === 0 || !menorData) {
      return [];
    }

    eventos.sort((a, b) => a.data - b.data);

    const primeiroFechamento = new Date(
      menorData.getFullYear(),
      menorData.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const fechamentoMesAnterior = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      0,
      23,
      59,
      59,
      999
    );

    const referencias = [];

    for (
      let fechamento = new Date(primeiroFechamento);
      fechamento <= fechamentoMesAnterior;
      fechamento = new Date(
        fechamento.getFullYear(),
        fechamento.getMonth() + 2,
        0,
        23,
        59,
        59,
        999
      )
    ) {
      referencias.push({
        data: new Date(fechamento),
        competencia: new Intl.DateTimeFormat("pt-BR", {
          month: "short",
          year: "numeric",
        }).format(fechamento),
        parcial: false,
      });
    }

    // O mês corrente é exibido como posição atual, sem antecipar inclusões futuras.
    referencias.push({
      data: new Date(hoje),
      competencia: "Atual",
      parcial: true,
    });

    const totalAtivosHoje = todosBeneficiariosFiltradosHistorico.filter(
      (beneficiario) => estaAtivoNaDataAtual(beneficiario, hoje)
    ).length;

    const historico = [];
    let indiceEvento = 0;
    let vidasAtivas = 0;
    let vidasAnteriores = 0;

    referencias.forEach((referencia, indice) => {
      const limite = referencia.data.getTime();

      while (
        indiceEvento < eventos.length &&
        eventos[indiceEvento].data <= limite
      ) {
        vidasAtivas += eventos[indiceEvento].variacao;
        indiceEvento += 1;
      }

      const vidasExibidas = referencia.parcial
        ? totalAtivosHoje
        : Math.max(0, vidasAtivas);
      const chave = chaveMes(referencia.data);
      const inclusoes = inclusoesPorMes.get(chave) || 0;
      const cancelamentos = cancelamentosPorMes.get(chave) || 0;
      const saldo = indice === 0
        ? inclusoes - cancelamentos
        : vidasExibidas - vidasAnteriores;
      const crescimento =
        indice > 0 && vidasAnteriores > 0
          ? (saldo / vidasAnteriores) * 100
          : null;

      historico.push({
        data: new Date(referencia.data),
        competencia: referencia.competencia,
        competenciaCompleta: referencia.parcial
          ? `Atual até ${referencia.data.toLocaleDateString("pt-BR")}`
          : new Intl.DateTimeFormat("pt-BR", {
              month: "long",
              year: "numeric",
            }).format(referencia.data),
        vidasAtivas: vidasExibidas,
        inclusoes,
        cancelamentos,
        saldo,
        crescimento,
        parcial: referencia.parcial,
      });

      vidasAnteriores = vidasExibidas;
    });

    return historico;
  }, [todosBeneficiariosFiltradosHistorico]);

  const historicoCrescimento = useMemo(() => {
    if (todosBeneficiariosFiltradosCrescimento.length === 0) {
      return [];
    }

    const eventos = [];
    const inclusoesPorMes = new Map();
    const cancelamentosPorMes = new Map();
    let menorData = null;

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const chaveMes = (data) =>
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    const somarNoMes = (mapa, data) => {
      if (data > hoje) {
        return;
      }

      const chave = chaveMes(data);
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    };

    todosBeneficiariosFiltradosCrescimento.forEach((beneficiario) => {
      const situacao = String(beneficiario["Situação"] ?? "")
        .trim()
        .toLocaleUpperCase("pt-BR");

      // Registros ainda em digitação não compõem a carteira ativa.
      if (situacao === "DIGITAÇÃO" || situacao === "DIGITACAO") {
        return;
      }

      const dataInclusao = converterDataCacheada(
        beneficiario["Data de Inclusão"]
      );

      if (!dataInclusao) {
        return;
      }

      const inclusao = new Date(dataInclusao);
      inclusao.setHours(0, 0, 0, 0);

      eventos.push({
        data: inclusao.getTime(),
        variacao: 1,
      });
      somarNoMes(inclusoesPorMes, inclusao);

      if (!menorData || inclusao < menorData) {
        menorData = inclusao;
      }

      const dataCancelamento = converterDataCacheada(
        beneficiario["Data de cancelamento"] ||
          beneficiario["Data de Cancelamento"]
      );

      // Uma data anterior à inclusão é inconsistente e não deve reduzir
      // artificialmente a carteira histórica.
      if (dataCancelamento && dataCancelamento >= inclusao) {
        const cancelamento = new Date(dataCancelamento);
        cancelamento.setHours(0, 0, 0, 0);

        eventos.push({
          data: cancelamento.getTime(),
          variacao: -1,
        });
        somarNoMes(cancelamentosPorMes, cancelamento);
      }
    });

    if (eventos.length === 0 || !menorData) {
      return [];
    }

    eventos.sort((a, b) => a.data - b.data);

    const primeiroFechamento = new Date(
      menorData.getFullYear(),
      menorData.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const fechamentoMesAnterior = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      0,
      23,
      59,
      59,
      999
    );

    const referencias = [];

    for (
      let fechamento = new Date(primeiroFechamento);
      fechamento <= fechamentoMesAnterior;
      fechamento = new Date(
        fechamento.getFullYear(),
        fechamento.getMonth() + 2,
        0,
        23,
        59,
        59,
        999
      )
    ) {
      referencias.push({
        data: new Date(fechamento),
        competencia: new Intl.DateTimeFormat("pt-BR", {
          month: "short",
          year: "numeric",
        }).format(fechamento),
        parcial: false,
      });
    }

    // O mês corrente é exibido como posição atual, sem antecipar inclusões futuras.
    referencias.push({
      data: new Date(hoje),
      competencia: "Atual",
      parcial: true,
    });

    const totalAtivosHoje = todosBeneficiariosFiltradosCrescimento.filter(
      (beneficiario) => estaAtivoNaDataAtual(beneficiario, hoje)
    ).length;

    const historico = [];
    let indiceEvento = 0;
    let vidasAtivas = 0;
    let vidasAnteriores = 0;

    referencias.forEach((referencia, indice) => {
      const limite = referencia.data.getTime();

      while (
        indiceEvento < eventos.length &&
        eventos[indiceEvento].data <= limite
      ) {
        vidasAtivas += eventos[indiceEvento].variacao;
        indiceEvento += 1;
      }

      const vidasExibidas = referencia.parcial
        ? totalAtivosHoje
        : Math.max(0, vidasAtivas);
      const chave = chaveMes(referencia.data);
      const inclusoes = inclusoesPorMes.get(chave) || 0;
      const cancelamentos = cancelamentosPorMes.get(chave) || 0;
      const saldo = indice === 0
        ? inclusoes - cancelamentos
        : vidasExibidas - vidasAnteriores;
      const crescimento =
        indice > 0 && vidasAnteriores > 0
          ? (saldo / vidasAnteriores) * 100
          : null;

      historico.push({
        data: new Date(referencia.data),
        competencia: referencia.competencia,
        competenciaCompleta: referencia.parcial
          ? `Atual até ${referencia.data.toLocaleDateString("pt-BR")}`
          : new Intl.DateTimeFormat("pt-BR", {
              month: "long",
              year: "numeric",
            }).format(referencia.data),
        vidasAtivas: vidasExibidas,
        inclusoes,
        cancelamentos,
        saldo,
        crescimento,
        parcial: referencia.parcial,
      });

      vidasAnteriores = vidasExibidas;
    });

    return historico;
  }, [todosBeneficiariosFiltradosCrescimento]);

  const resumoHistorico = useMemo(() => {
    if (historicoCarteira.length === 0) {
      return {
        inclusoes: 0,
        cancelamentos: 0,
        saldoLiquido: 0,
        crescimentoAcumulado: null,
        churnMedio: null,
        mesesAnalisados: 0,
      };
    }

    const inclusoes = historicoCarteira.reduce(
      (total, item) => total + item.inclusoes,
      0
    );
    const cancelamentos = historicoCarteira.reduce(
      (total, item) => total + item.cancelamentos,
      0
    );
    const primeiro = historicoCarteira[0];
    const ultimo = historicoCarteira[historicoCarteira.length - 1];
    const saldoLiquido = ultimo.vidasAtivas - primeiro.vidasAtivas;
    const crescimentoAcumulado =
      primeiro.vidasAtivas > 0
        ? (saldoLiquido / primeiro.vidasAtivas) * 100
        : null;

    const taxasChurn = historicoCarteira
      .map((item, indice) => {
        if (indice === 0) return null;

        const carteiraAnterior = historicoCarteira[indice - 1].vidasAtivas;
        return carteiraAnterior > 0
          ? (item.cancelamentos / carteiraAnterior) * 100
          : null;
      })
      .filter((valor) => Number.isFinite(valor));

    const churnMedio = taxasChurn.length
      ? taxasChurn.reduce((total, valor) => total + valor, 0) /
        taxasChurn.length
      : null;

    return {
      inclusoes,
      cancelamentos,
      saldoLiquido,
      crescimentoAcumulado,
      churnMedio,
      mesesAnalisados: historicoCarteira.length,
    };
  }, [historicoCarteira]);

  const resumoCrescimento = useMemo(() => {
    if (historicoCrescimento.length === 0) {
      return {
        inclusoes: 0,
        cancelamentos: 0,
        saldoLiquido: 0,
        crescimentoAcumulado: null,
        churnMedio: null,
        mesesAnalisados: 0,
      };
    }

    const inclusoes = historicoCrescimento.reduce(
      (total, item) => total + item.inclusoes,
      0
    );
    const cancelamentos = historicoCrescimento.reduce(
      (total, item) => total + item.cancelamentos,
      0
    );
    const primeiro = historicoCrescimento[0];
    const ultimo = historicoCrescimento[historicoCrescimento.length - 1];
    const saldoLiquido = ultimo.vidasAtivas - primeiro.vidasAtivas;
    const crescimentoAcumulado =
      primeiro.vidasAtivas > 0
        ? (saldoLiquido / primeiro.vidasAtivas) * 100
        : null;

    const taxasChurn = historicoCrescimento
      .map((item, indice) => {
        if (indice === 0) return null;

        const carteiraAnterior = historicoCrescimento[indice - 1].vidasAtivas;
        return carteiraAnterior > 0
          ? (item.cancelamentos / carteiraAnterior) * 100
          : null;
      })
      .filter((valor) => Number.isFinite(valor));

    const churnMedio = taxasChurn.length
      ? taxasChurn.reduce((total, valor) => total + valor, 0) /
        taxasChurn.length
      : null;

    return {
      inclusoes,
      cancelamentos,
      saldoLiquido,
      crescimentoAcumulado,
      churnMedio,
      mesesAnalisados: historicoCrescimento.length,
    };
  }, [historicoCrescimento]);

  const inclusoesPorMesTemporal = useMemo(
    () =>
      historicoCrescimento.slice(-12).map((item) => ({
        competencia: item.competencia,
        quantidade: item.inclusoes,
      })),
    [historicoCrescimento]
  );


  const motivosCancelamento = useMemo(() => {
    const contagem = new Map();

    todosBeneficiariosFiltradosHistorico.forEach((beneficiario) => {
      const dataCancelamento = converterDataCacheada(
        beneficiario["Data de cancelamento"] ||
          beneficiario["Data de Cancelamento"]
      );

      if (!dataCancelamento) {
        return;
      }

      const motivoBruto = String(
        beneficiario["Motivo do cancelamento"] ||
          beneficiario["Motivo de cancelamento"] ||
          ""
      ).trim();
      const motivo = motivoBruto || "Não informado";

      contagem.set(motivo, (contagem.get(motivo) || 0) + 1);
    });

    const total = Array.from(contagem.values()).reduce(
      (soma, quantidade) => soma + quantidade,
      0
    );

    return Array.from(contagem.entries())
      .map(([motivo, quantidade]) => ({
        motivo,
        quantidade,
        percentual: total > 0 ? (quantidade / total) * 100 : 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [todosBeneficiariosFiltradosHistorico]);

  const distribuicaoSituacoes = useMemo(() => {
    const contagem = new Map();

    todosBeneficiariosFiltradosHistorico.forEach((beneficiario) => {
      const situacaoNormalizada = normalizarSituacao(beneficiario);
      const situacao = situacaoNormalizada || "NÃO INFORMADO";

      contagem.set(situacao, (contagem.get(situacao) || 0) + 1);
    });

    const ordem = [
      "ATIVO",
      "DIGITAÇÃO",
      "DIGITACAO",
      "CANCELADO",
      "MIGRADO",
      "FALECIDO",
      "NÃO INFORMADO",
    ];

    return Array.from(contagem.entries())
      .map(([situacao, quantidade]) => ({ situacao, quantidade }))
      .sort((a, b) => {
        const indiceA = ordem.indexOf(a.situacao);
        const indiceB = ordem.indexOf(b.situacao);
        const ordemA = indiceA === -1 ? ordem.length : indiceA;
        const ordemB = indiceB === -1 ? ordem.length : indiceB;

        return ordemA - ordemB || b.quantidade - a.quantidade;
      });
  }, [todosBeneficiariosFiltradosHistorico]);

  const idadeMedia = useMemo(() => {
    const idadesValidas = beneficiariosFiltrados
      .map((beneficiario) =>
        Number(beneficiario["Idade"])
      )
      .filter(
        (idade) =>
          Number.isFinite(idade) &&
          idade >= 0 &&
          idade <= 120
      );

    if (idadesValidas.length === 0) {
      return 0;
    }

    const soma = idadesValidas.reduce(
      (acumulador, idade) => acumulador + idade,
      0
    );

    return soma / idadesValidas.length;
  }, [beneficiariosFiltrados]);

  const comparativoInclusoes = useMemo(() => {
    const datasValidas = beneficiariosFiltrados
      .map((beneficiario) =>
        converterDataCacheada(beneficiario["Data de Inclusão"])
      )
      .filter(Boolean);

    if (datasValidas.length === 0) {
      return {
        periodoAtual: 0,
        periodoAnterior: 0,
        percentual: 0,
        tendencia: "estavel",
        texto: "Sem inclusões no período",
      };
    }

    const dataMaisRecente = new Date(
      datasValidas.reduce(
        (maior, data) => Math.max(maior, data.getTime()),
        Number.NEGATIVE_INFINITY
      )
    );

    const inicioPeriodoAtual = new Date(dataMaisRecente);

    inicioPeriodoAtual.setDate(
      inicioPeriodoAtual.getDate() - 29
    );

    inicioPeriodoAtual.setHours(0, 0, 0, 0);

    const fimPeriodoAnterior = new Date(
      inicioPeriodoAtual
    );

    fimPeriodoAnterior.setDate(
      fimPeriodoAnterior.getDate() - 1
    );

    fimPeriodoAnterior.setHours(23, 59, 59, 999);

    const inicioPeriodoAnterior = new Date(
      fimPeriodoAnterior
    );

    inicioPeriodoAnterior.setDate(
      inicioPeriodoAnterior.getDate() - 29
    );

    inicioPeriodoAnterior.setHours(0, 0, 0, 0);

    const periodoAtual = datasValidas.filter(
      (data) =>
        data >= inicioPeriodoAtual &&
        data <= dataMaisRecente
    ).length;

    const periodoAnterior = datasValidas.filter(
      (data) =>
        data >= inicioPeriodoAnterior &&
        data <= fimPeriodoAnterior
    ).length;

    if (periodoAnterior === 0 && periodoAtual > 0) {
      return {
        periodoAtual,
        periodoAnterior,
        percentual: null,
        tendencia: "alta",
        texto: "Novas inclusões no período",
      };
    }

    if (periodoAnterior === 0 && periodoAtual === 0) {
      return {
        periodoAtual,
        periodoAnterior,
        percentual: 0,
        tendencia: "estavel",
        texto: "Sem inclusões nos dois períodos",
      };
    }

    const percentual =
      ((periodoAtual - periodoAnterior) /
        periodoAnterior) *
      100;

    if (percentual > 0) {
      return {
        periodoAtual,
        periodoAnterior,
        percentual,
        tendencia: "alta",
        texto: `${percentual.toFixed(
          1
        )}% acima do período anterior`,
      };
    }

    if (percentual < 0) {
      return {
        periodoAtual,
        periodoAnterior,
        percentual,
        tendencia: "baixa",
        texto: `${Math.abs(percentual).toFixed(
          1
        )}% abaixo do período anterior`,
      };
    }

    return {
      periodoAtual,
      periodoAnterior,
      percentual: 0,
      tendencia: "estavel",
      texto: "Mesmo resultado do período anterior",
    };
  }, [beneficiariosFiltrados]);

  const inclusoesUltimos30Dias =
    comparativoInclusoes.periodoAtual;

  const dadosGraficoGeografico = useMemo(() => {
    const usarCidades = estadoSelecionado !== "Todos";

    const campo = usarCidades
      ? "Cidade de correspondência"
      : "Estado de correspondência";

    const contagem = beneficiariosFiltrados.reduce(
      (acumulador, beneficiario) => {
        const local =
          beneficiario[campo] || "Não informado";

        acumulador[local] =
          (acumulador[local] || 0) + 1;

        return acumulador;
      },
      {}
    );

    const dadosOrdenados = Object.entries(contagem)
      .map(([local, quantidade]) => ({
        local,
        quantidade,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);

    /*
     * Todos os estados serão exibidos.
     * Para cidades, permanecem somente as dez maiores.
     */
    return usarCidades
      ? dadosOrdenados.slice(0, 10)
      : dadosOrdenados;
  }, [beneficiariosFiltrados, estadoSelecionado]);

  const alturaGraficoGeografico = useMemo(() => {
    if (estadoSelecionado !== "Todos") {
      return 300;
    }

    /*
     * Reserva aproximadamente 32 pixels para cada estado.
     * A altura mínima é de 300 pixels.
     */
    return Math.max(
      300,
      dadosGraficoGeografico.length * 32
    );
  }, [
    dadosGraficoGeografico.length,
    estadoSelecionado,
  ]);

  const beneficiariosPorFaixaEtaria = useMemo(() => {
    const contagem = FAIXAS_ETARIAS.reduce(
      (acumulador, faixa) => {
        acumulador[faixa] = 0;
        return acumulador;
      },
      {}
    );

    beneficiariosFiltrados.forEach((beneficiario) => {
      const faixa = identificarFaixaEtaria(
        beneficiario["Idade"]
      );

      contagem[faixa] += 1;
    });

    return FAIXAS_ETARIAS.map((faixa) => ({
      faixa,
      quantidade: contagem[faixa],
    }));
  }, [beneficiariosFiltrados]);

  const baseSemFiltroTipoCadastro = useMemo(() => {
    if (periodoInvalido) {
      return [];
    }

    return beneficiarios.filter((beneficiario) => {
      const estado =
        beneficiario["Estado de correspondência"];

      const cidade =
        beneficiario["Cidade de correspondência"];

      const empresa = beneficiario["Empresa"];

      const faixaEtaria = identificarFaixaEtaria(
        beneficiario["Idade"]
      );

      const dataInclusao = converterDataCacheada(
        beneficiario["Data de Inclusão"]
      );

      const atendeEstado =
        estadoSelecionado === "Todos" ||
        estado === estadoSelecionado;

      const atendeCidade =
        cidadeSelecionada === "Todas" ||
        cidade === cidadeSelecionada;

      const atendeFaixaEtaria =
        faixaEtariaSelecionada === "Todas" ||
        faixaEtaria === faixaEtariaSelecionada;

      const atendeEmpresa =
        empresaSelecionada === "Todas" ||
        empresa === empresaSelecionada;

      const atendeDataInicial =
        !dataInicialConvertida ||
        (dataInclusao &&
          dataInclusao >= dataInicialConvertida);

      const atendeDataFinal =
        !dataFinalConvertida ||
        (dataInclusao &&
          dataInclusao <= dataFinalConvertida);

      return (
        atendeEstado &&
        atendeCidade &&
        atendeFaixaEtaria &&
        atendeEmpresa &&
        atendeDataInicial &&
        atendeDataFinal
      );
    });
  }, [
    beneficiarios,
    estadoSelecionado,
    cidadeSelecionada,
    faixaEtariaSelecionada,
    empresaSelecionada,
    dataInicialConvertida,
    dataFinalConvertida,
    periodoInvalido,
  ]);

  const beneficiariosPorTipoCadastro = useMemo(() => {
    const contagem = {
      "Pessoa Física": 0,
      "Pessoa Jurídica": 0,
      "Não informado": 0,
    };

    baseSemFiltroTipoCadastro.forEach((beneficiario) => {
      const tipo = identificarTipoCadastro(
        beneficiario["Empresa"]
      );

      contagem[tipo] += 1;
    });

    const totalBase = baseSemFiltroTipoCadastro.length;

    return Object.entries(contagem)
      .map(([tipo, quantidade]) => ({
        tipo,
        quantidade,
        percentual:
          totalBase > 0
            ? (quantidade / totalBase) * 100
            : 0,
      }))
      .filter((item) => item.quantidade > 0);
  }, [baseSemFiltroTipoCadastro]);

  const inclusoesPorMes = useMemo(() => {
    const contagem = {};

    beneficiariosFiltrados.forEach((beneficiario) => {
      const data = converterDataCacheada(
        beneficiario["Data de Inclusão"]
      );

      if (!data) return;

      const ano = data.getFullYear();
      const mes = data.getMonth();

      const chave = `${ano}-${String(mes + 1).padStart(
        2,
        "0"
      )}`;

      if (!contagem[chave]) {
        contagem[chave] = {
          ordem: ano * 12 + mes,

          competencia: new Intl.DateTimeFormat(
            "pt-BR",
            {
              month: "short",
              year: "2-digit",
            }
          ).format(data),

          quantidade: 0,
        };
      }

      contagem[chave].quantidade += 1;
    });

    return Object.values(contagem)
      .sort((a, b) => a.ordem - b.ordem)
      .slice(-12);
  }, [beneficiariosFiltrados]);

  const beneficiariosPorEmpresa = useMemo(() => {
    const contagem = beneficiariosFiltrados.reduce(
      (acumulador, beneficiario) => {
        const empresa = String(beneficiario["Empresa"] ?? "").trim();

        // Registros de Pessoa Física não participam dos rankings,
        // KPIs e insights empresariais.
        if (!empresaValidaParaAnalise(empresa)) {
          return acumulador;
        }

        acumulador[empresa] =
          (acumulador[empresa] || 0) + 1;

        return acumulador;
      },
      {}
    );

    return Object.entries(contagem)
      .map(([empresa, quantidade]) => ({
        empresa,
        quantidade,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [beneficiariosFiltrados]);

  const beneficiariosPorCidade = useMemo(() => {
    const contagem = beneficiariosFiltrados.reduce(
      (acumulador, beneficiario) => {
        const cidade =
          beneficiario["Cidade de correspondência"] ||
          "Não informado";

        acumulador[cidade] =
          (acumulador[cidade] || 0) + 1;

        return acumulador;
      },
      {}
    );

    return Object.entries(contagem)
      .map(([cidade, quantidade]) => ({
        cidade,
        quantidade,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [beneficiariosFiltrados]);

  const insightsExecutivos = useMemo(() => {
    if (beneficiariosFiltrados.length === 0) {
      return null;
    }

    const contagemEstados = {};
    const contagemTipos = {
      "Pessoa Física": 0,
      "Pessoa Jurídica": 0,
      "Não informado": 0,
    };

    beneficiariosFiltrados.forEach((beneficiario) => {
      const estado =
        beneficiario["Estado de correspondência"] ||
        "Não informado";

      const tipo = identificarTipoCadastro(
        beneficiario["Empresa"]
      );

      contagemEstados[estado] =
        (contagemEstados[estado] || 0) + 1;

      contagemTipos[tipo] += 1;
    });

    const estadoLider = Object.entries(contagemEstados)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)[0];

    const cidadeLider = beneficiariosPorCidade[0]
      ? {
          nome: beneficiariosPorCidade[0].cidade,
          quantidade: beneficiariosPorCidade[0].quantidade,
        }
      : null;

    const empresaLider = beneficiariosPorEmpresa[0]
      ? {
          nome: beneficiariosPorEmpresa[0].empresa,
          quantidade: beneficiariosPorEmpresa[0].quantidade,
        }
      : null;

    const faixaLider = [...beneficiariosPorFaixaEtaria]
      .filter((item) => item.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade)[0];

    const tipoLider = Object.entries(contagemTipos)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)[0];

    const calcularPercentual = (quantidade) =>
      totalBeneficiarios > 0
        ? (quantidade / totalBeneficiarios) * 100
        : 0;

    const estadoPercentual = estadoLider
      ? calcularPercentual(estadoLider.quantidade)
      : 0;

    const faixaPercentual = faixaLider
      ? calcularPercentual(faixaLider.quantidade)
      : 0;

    const tipoPercentual = tipoLider
      ? calcularPercentual(tipoLider.quantidade)
      : 0;

    const partesResumo = [];

    if (estadoLider) {
      partesResumo.push(
        `${estadoLider.nome} concentra ${estadoPercentual.toFixed(
          1
        )}% das vidas selecionadas.`
      );
    }

    if (faixaLider) {
      partesResumo.push(
        `A faixa predominante é ${faixaLider.faixa}, com ${faixaPercentual.toFixed(
          1
        )}% da seleção.`
      );
    }

    if (tipoLider) {
      partesResumo.push(
        `${tipoLider.nome} representa ${tipoPercentual.toFixed(
          1
        )}% dos cadastros.`
      );
    }

    return {
      estadoLider: estadoLider
        ? {
            ...estadoLider,
            percentual: estadoPercentual,
          }
        : null,
      cidadeLider,
      empresaLider,
      faixaLider: faixaLider
        ? {
            ...faixaLider,
            percentual: faixaPercentual,
          }
        : null,
      tipoLider: tipoLider
        ? {
            ...tipoLider,
            percentual: tipoPercentual,
          }
        : null,
      resumo: partesResumo.join(" "),
    };
  }, [
    beneficiariosFiltrados,
    beneficiariosPorCidade,
    beneficiariosPorEmpresa,
    beneficiariosPorFaixaEtaria,
    totalBeneficiarios,
  ]);

  const baseEstadoSemFiltroCidade = useMemo(() => {
    if (
      estadoSelecionado === "Todos" ||
      periodoInvalido
    ) {
      return [];
    }

    return beneficiarios.filter((beneficiario) => {
      const estado =
        beneficiario["Estado de correspondência"];

      const empresa = beneficiario["Empresa"];

      const faixaEtaria = identificarFaixaEtaria(
        beneficiario["Idade"]
      );

      const tipoCadastro = identificarTipoCadastro(
        beneficiario["Empresa"]
      );

      const dataInclusao = converterDataCacheada(
        beneficiario["Data de Inclusão"]
      );

      const atendeEstado =
        estado === estadoSelecionado;

      const atendeFaixaEtaria =
        faixaEtariaSelecionada === "Todas" ||
        faixaEtaria === faixaEtariaSelecionada;

      const atendeEmpresa =
        empresaSelecionada === "Todas" ||
        empresa === empresaSelecionada;

      const atendeTipo =
        tipoCadastroSelecionado === "Todos" ||
        tipoCadastro === tipoCadastroSelecionado;

      const atendeDataInicial =
        !dataInicialConvertida ||
        (dataInclusao &&
          dataInclusao >= dataInicialConvertida);

      const atendeDataFinal =
        !dataFinalConvertida ||
        (dataInclusao &&
          dataInclusao <= dataFinalConvertida);

      return (
        atendeEstado &&
        atendeFaixaEtaria &&
        atendeEmpresa &&
        atendeTipo &&
        atendeDataInicial &&
        atendeDataFinal
      );
    });
  }, [
    beneficiarios,
    estadoSelecionado,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
    dataInicialConvertida,
    dataFinalConvertida,
    periodoInvalido,
  ]);

  const rankingCidadesEstado = useMemo(() => {
    const contagem = baseEstadoSemFiltroCidade.reduce(
      (acumulador, beneficiario) => {
        const cidade =
          beneficiario["Cidade de correspondência"] ||
          "Não informado";

        acumulador[cidade] =
          (acumulador[cidade] || 0) + 1;

        return acumulador;
      },
      {}
    );

    return Object.entries(contagem)
      .map(([cidade, quantidade]) => ({
        cidade,
        quantidade,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [baseEstadoSemFiltroCidade]);

  const resumoCidadeSelecionada = useMemo(() => {
    if (
      cidadeSelecionada === "Todas" ||
      estadoSelecionado === "Todos"
    ) {
      return null;
    }

    const totalEstado = baseEstadoSemFiltroCidade.length;

    const participacao =
      totalEstado > 0
        ? (totalBeneficiarios / totalEstado) * 100
        : 0;

    const indicePosicao = rankingCidadesEstado.findIndex(
      (item) => item.cidade === cidadeSelecionada
    );

    const posicao =
      indicePosicao >= 0 ? indicePosicao + 1 : null;

    const empresasCidade = new Set(
      beneficiariosFiltrados
        .map((beneficiario) => beneficiario["Empresa"])
        .filter(empresaValidaParaAnalise)
        .map((empresa) => String(empresa).trim())
    ).size;

    return {
      participacao,
      posicao,
      empresasCidade,
      totalEstado,
    };
  }, [
    cidadeSelecionada,
    estadoSelecionado,
    baseEstadoSemFiltroCidade,
    rankingCidadesEstado,
    beneficiariosFiltrados,
    todosBeneficiariosFiltradosHistorico,
    todosBeneficiariosFiltradosCrescimento,
    totalBeneficiariosCrescimento,
    totalBeneficiarios,
  ]);

  const empresasPesquisadas = useMemo(() => {
    const busca = buscaEmpresa
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!busca) {
      return beneficiariosPorEmpresa;
    }

    return beneficiariosPorEmpresa.filter((item) =>
      item.empresa
        .toLocaleLowerCase("pt-BR")
        .includes(busca)
    );
  }, [beneficiariosPorEmpresa, buscaEmpresa]);

  const cidadesPesquisadas = useMemo(() => {
    const busca = buscaCidade
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!busca) {
      return beneficiariosPorCidade;
    }

    return beneficiariosPorCidade.filter((item) =>
      item.cidade
        .toLocaleLowerCase("pt-BR")
        .includes(busca)
    );
  }, [beneficiariosPorCidade, buscaCidade]);

  const alterarEstado = useCallback((evento) => {
    setEstadoSelecionado(evento.target.value);
    setCidadeSelecionada("Todas");
    setBuscaCidade("");
  }, []);

  const limparFiltros = useCallback(() => {
    setEstadoSelecionado("Todos");
    setCidadeSelecionada("Todas");
    setFaixaEtariaSelecionada("Todas");
    setEmpresaSelecionada("Todas");
    setTipoCadastroSelecionado("Todos");
    setDataInicial("");
    setDataFinal("");
    setBuscaEmpresa("");
    setBuscaCidade("");
  }, []);

  const removerFiltro = useCallback((tipo) => {
    if (tipo === "estado") {
      setEstadoSelecionado("Todos");
      setCidadeSelecionada("Todas");
      setBuscaCidade("");
    }

    if (tipo === "cidade") {
      setCidadeSelecionada("Todas");
      setBuscaCidade("");
    }

    if (tipo === "faixa") {
      setFaixaEtariaSelecionada("Todas");
    }

    if (tipo === "empresa") {
      setEmpresaSelecionada("Todas");
      setBuscaEmpresa("");
    }

    if (tipo === "tipoCadastro") {
      setTipoCadastroSelecionado("Todos");
    }

    if (tipo === "dataInicial") {
      setDataInicial("");
    }

    if (tipo === "dataFinal") {
      setDataFinal("");
    }
  }, []);

  function selecionarLocalGrafico(dados) {
    const local = dados?.local;

    if (!local || local === "Não informado") {
      return;
    }

    if (estadoSelecionado === "Todos") {
      setEstadoSelecionado(local);
      setCidadeSelecionada("Todas");
      setBuscaCidade("");
      return;
    }

    setCidadeSelecionada((cidadeAtual) =>
      cidadeAtual === local ? "Todas" : local
    );

    setBuscaCidade("");
  }

  function selecionarFaixaGrafico(dados) {
    const faixa = dados?.faixa;

    if (!faixa) {
      return;
    }

    setFaixaEtariaSelecionada((faixaAtual) =>
      faixaAtual === faixa ? "Todas" : faixa
    );
  }

  function selecionarTipoCadastro(dados) {
    const tipo = dados?.tipo;

    if (!tipo) {
      return;
    }

    setTipoCadastroSelecionado((tipoAtual) =>
      tipoAtual === tipo ? "Todos" : tipo
    );
  }

  function localizarEstadoDaCidade(nomeCidade) {
    if (
      estadoSelecionado !== "Todos" &&
      beneficiarios.some(
        (beneficiario) =>
          beneficiario["Cidade de correspondência"] ===
            nomeCidade &&
          beneficiario["Estado de correspondência"] ===
            estadoSelecionado
      )
    ) {
      return estadoSelecionado;
    }

    const contagemPorEstado = beneficiarios.reduce(
      (acumulador, beneficiario) => {
        const cidade =
          beneficiario["Cidade de correspondência"];

        const estado =
          beneficiario["Estado de correspondência"];

        if (cidade !== nomeCidade || !estado) {
          return acumulador;
        }

        acumulador[estado] =
          (acumulador[estado] || 0) + 1;

        return acumulador;
      },
      {}
    );

    const estadoMaisRepresentativo = Object.entries(
      contagemPorEstado
    ).sort((a, b) => b[1] - a[1])[0];

    return estadoMaisRepresentativo?.[0] || "";
  }

  function selecionarEmpresaTabela(nomeEmpresa) {
    if (!nomeEmpresa) return;

    setEmpresaSelecionada((empresaAtual) =>
      empresaAtual === nomeEmpresa
        ? "Todas"
        : nomeEmpresa
    );

    setBuscaEmpresa("");
  }

  function selecionarCidadeTabela(nomeCidade) {
    if (!nomeCidade || nomeCidade === "Não informado") {
      return;
    }

    if (cidadeSelecionada === nomeCidade) {
      setCidadeSelecionada("Todas");
      setBuscaCidade("");
      return;
    }

    const estadoDaCidade =
      localizarEstadoDaCidade(nomeCidade);

    if (estadoDaCidade) {
      setEstadoSelecionado(estadoDaCidade);
    }

    setCidadeSelecionada(nomeCidade);
    setBuscaCidade("");
  }

  function exportarDadosFiltrados() {
    if (
      beneficiariosFiltrados.length === 0 ||
      periodoInvalido
    ) {
      return;
    }

    const colunasExportadas = [
  "Código do usuário",
  "Data de Inclusão",
  "Empresa",
  "Idade",
  "Sexo",
  "Cidade de correspondência",
  "Estado de correspondência",
  "Data de cancelamento",
  "Motivo do cancelamento",
  "Situação",
  "Descrição do plano",
];

    const cabecalho = [
      ...colunasExportadas,
      "Tipo de cadastro",
    ]
      .map(protegerValorCsv)
      .join(";");

    const linhas = todosBeneficiariosFiltradosHistorico.map(
      (beneficiario) => {
        const valores = colunasExportadas.map(
          (coluna) => beneficiario[coluna]
        );

        valores.push(
          identificarTipoCadastro(
            beneficiario["Empresa"]
          )
        );

        return valores.map(protegerValorCsv).join(";");
      }
    );

    const conteudo = [cabecalho, ...linhas].join("\r\n");

    const arquivo = new Blob(
      [`\uFEFF${conteudo}`],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    const partesNome = [
      "beneficiarios",

      estadoSelecionado !== "Todos"
        ? estadoSelecionado
        : null,

      cidadeSelecionada !== "Todas"
        ? cidadeSelecionada
        : null,

      faixaEtariaSelecionada !== "Todas"
        ? faixaEtariaSelecionada
        : null,

      empresaSelecionada !== "Todas"
        ? empresaSelecionada
        : null,

      tipoCadastroSelecionado !== "Todos"
        ? tipoCadastroSelecionado
        : null,

      dataInicial
        ? `desde-${formatarDataInput(dataInicial)}`
        : null,

      dataFinal
        ? `ate-${formatarDataInput(dataFinal)}`
        : null,
    ]
      .filter(Boolean)
      .map(normalizarNomeArquivo)
      .filter(Boolean);

    link.href = url;
    link.download = `${partesNome.join("_")}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function montarNomeArquivoExportacao(extensao) {
    const partesNome = [
      "dashboard-beneficiarios",

      estadoSelecionado !== "Todos"
        ? estadoSelecionado
        : null,

      cidadeSelecionada !== "Todas"
        ? cidadeSelecionada
        : null,

      empresaSelecionada !== "Todas"
        ? empresaSelecionada
        : null,

      tipoCadastroSelecionado !== "Todos"
        ? tipoCadastroSelecionado
        : null,
    ]
      .filter(Boolean)
      .map(normalizarNomeArquivo)
      .filter(Boolean);

    return `${partesNome.join("_")}.${extensao}`;
  }

  async function capturarDashboard() {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    /*
     * O relatório é desenhado diretamente em um canvas compacto.
     * Dessa forma, a exportação não precisa clonar o dashboard inteiro,
     * evitando travamentos causados por páginas muito altas e gráficos SVG.
     */
    const largura = 1600;
    const altura = 1180;
    const escala = 1;
    const canvas = document.createElement("canvas");

    canvas.width = largura * escala;
    canvas.height = altura * escala;

    const contexto = canvas.getContext("2d");

    if (!contexto) {
      throw new Error("Não foi possível criar o relatório visual.");
    }

    contexto.scale(escala, escala);
    contexto.fillStyle = "#f8fafc";
    contexto.fillRect(0, 0, largura, altura);

    function arredondarRetangulo(x, y, w, h, raio = 16) {
      const r = Math.min(raio, w / 2, h / 2);

      contexto.beginPath();
      contexto.moveTo(x + r, y);
      contexto.arcTo(x + w, y, x + w, y + h, r);
      contexto.arcTo(x + w, y + h, x, y + h, r);
      contexto.arcTo(x, y + h, x, y, r);
      contexto.arcTo(x, y, x + w, y, r);
      contexto.closePath();
    }

    function desenharCard(x, y, w, h) {
      contexto.save();
      contexto.shadowColor = "rgba(15, 23, 42, 0.08)";
      contexto.shadowBlur = 18;
      contexto.shadowOffsetY = 6;
      contexto.fillStyle = "#ffffff";
      arredondarRetangulo(x, y, w, h, 18);
      contexto.fill();
      contexto.restore();

      contexto.strokeStyle = "#dbeafe";
      contexto.lineWidth = 1;
      arredondarRetangulo(x, y, w, h, 18);
      contexto.stroke();
    }

    function limitarTexto(texto, maximo = 34) {
      const valor = String(texto ?? "—");
      return valor.length > maximo
        ? `${valor.slice(0, maximo - 1)}…`
        : valor;
    }

    function quebrarTexto(texto, larguraMaxima) {
      const palavras = String(texto ?? "").split(/\s+/);
      const linhas = [];
      let linha = "";

      palavras.forEach((palavra) => {
        const teste = linha ? `${linha} ${palavra}` : palavra;

        if (contexto.measureText(teste).width <= larguraMaxima) {
          linha = teste;
        } else {
          if (linha) linhas.push(linha);
          linha = palavra;
        }
      });

      if (linha) linhas.push(linha);
      return linhas;
    }

    function desenharTituloSecao(titulo, subtitulo, x, y) {
      contexto.fillStyle = "#0f172a";
      contexto.font = "700 24px Arial";
      contexto.fillText(titulo, x, y);

      contexto.fillStyle = "#64748b";
      contexto.font = "400 13px Arial";
      contexto.fillText(subtitulo, x, y + 24);
    }

    function desenharBarras(dados, x, y, w, h, chaveRotulo) {
      const itens = dados.slice(0, 7);
      const maximo = Math.max(...itens.map((item) => item.quantidade), 1);
      const alturaLinha = h / Math.max(itens.length, 1);
      const larguraRotulo = 150;
      const larguraBarra = w - larguraRotulo - 70;

      itens.forEach((item, indice) => {
        const linhaY = y + indice * alturaLinha;
        const rotulo = limitarTexto(item[chaveRotulo], 21);
        const barra = (item.quantidade / maximo) * larguraBarra;

        contexto.fillStyle = "#475569";
        contexto.font = "600 12px Arial";
        contexto.fillText(rotulo, x, linhaY + 16);

        contexto.fillStyle = "#e2e8f0";
        arredondarRetangulo(
          x + larguraRotulo,
          linhaY + 4,
          larguraBarra,
          15,
          8
        );
        contexto.fill();

        contexto.fillStyle = "#3b82f6";
        arredondarRetangulo(
          x + larguraRotulo,
          linhaY + 4,
          Math.max(barra, 3),
          15,
          8
        );
        contexto.fill();

        contexto.fillStyle = "#334155";
        contexto.font = "700 11px Arial";
        contexto.textAlign = "right";
        contexto.fillText(
          item.quantidade.toLocaleString("pt-BR"),
          x + w,
          linhaY + 16
        );
        contexto.textAlign = "left";
      });
    }

    /* Cabeçalho */
    contexto.fillStyle = "#0f2b66";
    arredondarRetangulo(30, 28, 1540, 150, 24);
    contexto.fill();

    contexto.fillStyle = "#93c5fd";
    contexto.font = "700 12px Arial";
    contexto.fillText("PAINEL EXECUTIVO DE VIDAS ATIVAS", 65, 68);

    contexto.fillStyle = "#ffffff";
    contexto.font = "800 34px Arial";
    contexto.fillText("Dashboard de Beneficiários · Vértice Saúde", 65, 112);

    contexto.fillStyle = "#dbeafe";
    contexto.font = "400 14px Arial";
    contexto.fillText(
      `Base atualizada em ${dataUltimaAtualizacao} · Relatório gerado em ${new Date().toLocaleString("pt-BR")}`,
      65,
      145
    );

    const filtrosResumo = filtrosAtivos.length
      ? filtrosAtivos.map((filtro) => filtro.rotulo).join(" · ")
      : "Painel geral — nenhum filtro aplicado";

    contexto.fillStyle = "#334155";
    contexto.font = "600 13px Arial";
    const linhasFiltro = quebrarTexto(filtrosResumo, 1460);
    linhasFiltro.slice(0, 2).forEach((linha, indice) => {
      contexto.fillText(linha, 55, 207 + indice * 18);
    });

    /* KPIs */
    const kpis = [
      ["Total de beneficiários", totalBeneficiarios.toLocaleString("pt-BR")],
      ["Cidades", totalCidades.toLocaleString("pt-BR")],
      ["Idade média", `${idadeMedia.toFixed(1)} anos`],
      ["Inclusões em 30 dias", inclusoesUltimos30Dias.toLocaleString("pt-BR")],
    ];

    kpis.forEach(([rotulo, valor], indice) => {
      const x = 30 + indice * 390;
      desenharCard(x, 240, 370, 125);

      contexto.fillStyle = "#64748b";
      contexto.font = "700 12px Arial";
      contexto.fillText(rotulo.toUpperCase(), x + 22, 275);

      contexto.fillStyle = "#0f172a";
      contexto.font = "800 31px Arial";
      contexto.fillText(valor, x + 22, 326);
    });

    /* Insights */
    desenharCard(30, 390, 1540, 190);
    desenharTituloSecao(
      "Insights da seleção",
      "Principais destaques calculados a partir dos filtros aplicados",
      55,
      430
    );

    const insights = [
      ["Estado líder", insightsExecutivos?.estadoLider?.nome || "—"],
      ["Cidade líder", insightsExecutivos?.cidadeLider?.nome || "—"],
      ["Empresa líder", insightsExecutivos?.empresaLider?.nome || "—"],
      ["Faixa predominante", insightsExecutivos?.faixaLider?.faixa || "—"],
      ["Tipo predominante", insightsExecutivos?.tipoLider?.nome || "—"],
    ];

    insights.forEach(([rotulo, valor], indice) => {
      const x = 55 + indice * 300;
      contexto.fillStyle = "#64748b";
      contexto.font = "700 10px Arial";
      contexto.fillText(rotulo.toUpperCase(), x, 485);

      contexto.fillStyle = "#172554";
      contexto.font = "800 17px Arial";
      contexto.fillText(limitarTexto(valor, 25), x, 514);
    });

    contexto.fillStyle = "#eff6ff";
    arredondarRetangulo(55, 535, 1490, 30, 10);
    contexto.fill();
    contexto.fillStyle = "#1e3a8a";
    contexto.font = "600 12px Arial";
    contexto.fillText(
      limitarTexto(insightsExecutivos?.resumo || "Sem dados para gerar insights.", 180),
      70,
      555
    );

    /* Gráficos compactos */
    desenharCard(30, 605, 750, 360);
    desenharTituloSecao(
      tituloGraficoGeografico,
      "Sete maiores resultados da seleção",
      55,
      645
    );
    desenharBarras(
      dadosGraficoGeografico,
      55,
      690,
      690,
      235,
      "local"
    );

    desenharCard(800, 605, 770, 360);
    desenharTituloSecao(
      "Distribuição por faixa etária",
      "Participação das faixas na seleção atual",
      825,
      645
    );
    desenharBarras(
      beneficiariosPorFaixaEtaria.filter(
        (item) => item.quantidade > 0
      ),
      825,
      690,
      710,
      235,
      "faixa"
    );

    /* Rodapé e rankings */
    desenharCard(30, 990, 1540, 145);
    contexto.fillStyle = "#0f172a";
    contexto.font = "700 18px Arial";
    contexto.fillText("Resumo de rankings", 55, 1025);

    const empresasTop = beneficiariosPorEmpresa.slice(0, 3);
    const cidadesTop = beneficiariosPorCidade.slice(0, 3);

    contexto.fillStyle = "#64748b";
    contexto.font = "700 11px Arial";
    contexto.fillText("TOP EMPRESAS", 55, 1054);
    contexto.fillText("TOP CIDADES", 810, 1054);

    empresasTop.forEach((item, indice) => {
      contexto.fillStyle = "#334155";
      contexto.font = "600 12px Arial";
      contexto.fillText(
        `${indice + 1}. ${limitarTexto(item.empresa, 48)} — ${item.quantidade.toLocaleString("pt-BR")}`,
        55,
        1080 + indice * 19
      );
    });

    cidadesTop.forEach((item, indice) => {
      contexto.fillStyle = "#334155";
      contexto.font = "600 12px Arial";
      contexto.fillText(
        `${indice + 1}. ${limitarTexto(item.cidade, 42)} — ${item.quantidade.toLocaleString("pt-BR")}`,
        810,
        1080 + indice * 19
      );
    });

    return canvas;
  }

  async function exportarDashboardComoPng() {
    if (exportandoImagem || periodoInvalido) return;

    try {
      setExportandoImagem(true);

      const canvas = await capturarDashboard();
      const link = document.createElement("a");

      link.href = canvas.toDataURL("image/png", 1);
      link.download = montarNomeArquivoExportacao("png");

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
      window.alert(
        "Não foi possível gerar a imagem do dashboard."
      );
    } finally {
      setExportandoImagem(false);
    }
  }

  async function exportarDashboardComoPdf() {
    if (exportandoImagem || periodoInvalido) return;

    try {
      setExportandoImagem(true);

      const canvas = await capturarDashboard();
      const imagem = canvas.toDataURL("image/png", 1);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const larguraPagina = pdf.internal.pageSize.getWidth();
      const alturaPagina = pdf.internal.pageSize.getHeight();
      const margem = 8;
      const larguraUtil = larguraPagina - margem * 2;
      const alturaUtil = alturaPagina - margem * 2;
      const alturaImagem =
        (canvas.height * larguraUtil) / canvas.width;

      let deslocamento = 0;
      let pagina = 0;

      while (deslocamento < alturaImagem) {
        if (pagina > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          imagem,
          "PNG",
          margem,
          margem - deslocamento,
          larguraUtil,
          alturaImagem,
          undefined,
          "FAST"
        );

        deslocamento += alturaUtil;
        pagina += 1;
      }

      pdf.save(montarNomeArquivoExportacao("pdf"));
    } catch (error) {
      console.error(error);
      window.alert(
        "Não foi possível gerar o PDF do dashboard."
      );
    } finally {
      setExportandoImagem(false);
    }
  }

  const tituloGraficoGeografico =
    estadoSelecionado === "Todos"
      ? "Beneficiários por estado"
      : "Beneficiários por cidade";

  const subtituloGraficoGeografico =
    estadoSelecionado === "Todos"
      ? "Estados com beneficiários na seleção"
      : `Dez cidades com maior número de beneficiários em ${estadoSelecionado}`;

  const filtrosAtivos = [
    estadoSelecionado !== "Todos" && {
      tipo: "estado",
      rotulo: `Estado: ${estadoSelecionado}`,
    },

    cidadeSelecionada !== "Todas" && {
      tipo: "cidade",
      rotulo: `Cidade: ${cidadeSelecionada}`,
    },

    faixaEtariaSelecionada !== "Todas" && {
      tipo: "faixa",
      rotulo: `Faixa etária: ${faixaEtariaSelecionada}`,
    },

    empresaSelecionada !== "Todas" && {
      tipo: "empresa",
      rotulo: `Empresa: ${empresaSelecionada}`,
    },

    tipoCadastroSelecionado !== "Todos" && {
      tipo: "tipoCadastro",
      rotulo: `Tipo: ${tipoCadastroSelecionado}`,
    },

    dataInicial && {
      tipo: "dataInicial",
      rotulo: `Desde: ${formatarDataInput(dataInicial)}`,
    },

    dataFinal && {
      tipo: "dataFinal",
      rotulo: `Até: ${formatarDataInput(dataFinal)}`,
    },
  ].filter(Boolean);


  return {
    temaEscuro,
    setTemaEscuro,
    beneficiarios,
    setBeneficiarios,
    todosBeneficiarios,
    setTodosBeneficiarios,
    exportandoImagem,
    setExportandoImagem,
    estadoSelecionado,
    setEstadoSelecionado,
    cidadeSelecionada,
    setCidadeSelecionada,
    faixaEtariaSelecionada,
    setFaixaEtariaSelecionada,
    empresaSelecionada,
    setEmpresaSelecionada,
    tipoCadastroSelecionado,
    setTipoCadastroSelecionado,
    dataInicial,
    setDataInicial,
    dataFinal,
    setDataFinal,
    buscaEmpresa,
    setBuscaEmpresa,
    buscaCidade,
    setBuscaCidade,
    carregando,
    setCarregando,
    erro,
    setErro,
    dataInicialConvertida,
    dataFinalConvertida,
    periodoInvalido,
    estadosDisponiveis,
    cidadesDisponiveis,
    empresasDisponiveis,
    beneficiariosFiltrados,
    todosBeneficiariosFiltradosHistorico,
    todosBeneficiariosFiltradosCrescimento,
    totalBeneficiariosCrescimento,
    totalBeneficiarios,
    totalCidades,
    totalEmpresas,
    dataUltimaAtualizacao,
    historicoCarteira,
    resumoHistorico,
    historicoCrescimento,
    resumoCrescimento,
    historicoTemporal: historicoCrescimento,
    resumoTemporal: resumoCrescimento,
    inclusoesPorMesTemporal,
    motivosCancelamento,
    distribuicaoSituacoes,
    idadeMedia,
    comparativoInclusoes,
    inclusoesUltimos30Dias,
    dadosGraficoGeografico,
    alturaGraficoGeografico,
    beneficiariosPorFaixaEtaria,
    baseSemFiltroTipoCadastro,
    beneficiariosPorTipoCadastro,
    inclusoesPorMes,
    beneficiariosPorEmpresa,
    beneficiariosPorCidade,
    insightsExecutivos,
    baseEstadoSemFiltroCidade,
    rankingCidadesEstado,
    resumoCidadeSelecionada,
    empresasPesquisadas,
    cidadesPesquisadas,
    alterarEstado,
    limparFiltros,
    removerFiltro,
    selecionarLocalGrafico,
    selecionarFaixaGrafico,
    selecionarTipoCadastro,
    localizarEstadoDaCidade,
    selecionarEmpresaTabela,
    selecionarCidadeTabela,
    exportarDadosFiltrados,
    exportarDashboardComoPng,
    exportarDashboardComoPdf,
    montarNomeArquivoExportacao,
    tituloGraficoGeografico,
    subtituloGraficoGeografico,
    filtrosAtivos,
  };
}

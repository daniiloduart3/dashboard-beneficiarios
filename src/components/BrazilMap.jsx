import { useEffect, useMemo, useState } from "react";
import { echarts } from "../utils/echarts";
import { empresaValidaParaAnalise } from "../utils/dashboard";
import { POPULACAO_MUNICIPIOS_IBGE_2025 } from "../data/populacaoMunicipiosIBGE2025";

import EChart from "./EChart";

const URL_MAPA_IBGE =
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=UF";


const REGIAO_POR_UF = {
  AC: "Norte", AP: "Norte", AM: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste", PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

const REGIOES = ["Todas", "Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
const FOCO_POR_REGIAO = {
  Norte: { center: [-60.5, -4.5], zoom: 1.45 },
  Nordeste: { center: [-39.5, -8.5], zoom: 1.72 },
  "Centro-Oeste": { center: [-54.5, -15.2], zoom: 1.75 },
  Sudeste: { center: [-44.5, -20.2], zoom: 2.15 },
  Sul: { center: [-51.2, -28.1], zoom: 2.45 },
};

const FOCO_POR_UF = {
  AC: [-70.0, -9.0], AL: [-36.6, -9.6], AP: [-51.8, 1.1], AM: [-64.5, -4.2],
  BA: [-41.7, -12.7], CE: [-39.5, -5.2], DF: [-47.9, -15.8], ES: [-40.5, -19.6],
  GO: [-49.5, -16.0], MA: [-45.2, -5.0], MT: [-56.0, -12.8], MS: [-54.5, -20.5],
  MG: [-44.5, -18.8], PA: [-52.5, -3.7], PB: [-36.7, -7.1], PR: [-51.4, -24.7],
  PE: [-37.9, -8.4], PI: [-42.8, -7.5], RJ: [-43.2, -22.1], RN: [-36.6, -5.8],
  RS: [-53.2, -30.0], RO: [-63.2, -10.8], RR: [-61.4, 2.0], SC: [-50.0, -27.2],
  SP: [-48.5, -22.2], SE: [-37.4, -10.6], TO: [-48.3, -10.2],
};

function converterData(dataTexto) {
  if (!dataTexto) return null;
  const partes = String(dataTexto).split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes.map(Number);
  const data = new Date(ano, mes - 1, dia);
  if (
    Number.isNaN(data.getTime()) ||
    data.getDate() !== dia ||
    data.getMonth() !== mes - 1 ||
    data.getFullYear() !== ano
  ) return null;
  data.setHours(0, 0, 0, 0);
  return data;
}

function identificarFaixaEtaria(idadeTexto) {
  const idade = Number(idadeTexto);
  if (idadeTexto === "" || !Number.isFinite(idade) || idade < 0 || idade > 120) return "Não informado";
  if (idade <= 17) return "0 a 17";
  if (idade <= 29) return "18 a 29";
  if (idade <= 39) return "30 a 39";
  if (idade <= 49) return "40 a 49";
  if (idade <= 59) return "50 a 59";
  return "60 ou mais";
}

function identificarTipoCadastro(empresaTexto) {
  const empresa = String(empresaTexto ?? "").trim();
  if (!empresa) return "Não informado";
  return empresa.toLocaleUpperCase("pt-BR") === "PF" ? "Pessoa Física" : "Pessoa Jurídica";
}

const CODIGO_PARA_UF = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL",
  28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR",
  42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF",
};


const CODIGO_UF_IBGE = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17,
  MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29,
  MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43,
  MS: 50, MT: 51, GO: 52, DF: 53,
};

function normalizarLocal(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("pt-BR");
}

function obterPopulacaoMunicipal(uf, cidade) {
  const chave = `${normalizarLocal(uf)}|${normalizarLocal(cidade)}`;
  return POPULACAO_MUNICIPIOS_IBGE_2025[chave] ?? null;
}

function formatarPopulacaoCompacta(populacao) {
  if (!Number.isFinite(populacao) || populacao <= 0) return "população não localizada";
  if (populacao >= 1_000_000) {
    const valor = populacao / 1_000_000;
    return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi hab.`;
  }
  if (populacao >= 1_000) {
    return `${Math.round(populacao / 1_000).toLocaleString("pt-BR")} mil hab.`;
  }
  return `${populacao.toLocaleString("pt-BR")} hab.`;
}

function formatarPenetracao(valor) {
  if (!Number.isFinite(valor)) return "—";
  const casas = valor < 0.01 ? 4 : valor < 0.1 ? 3 : 2;
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

function obterSexoBeneficiario(beneficiario) {
  const valor = beneficiario?.["Sexo"] ?? beneficiario?.["Gênero"] ?? beneficiario?.["Genero"] ?? beneficiario?.["Sexo do beneficiário"] ?? beneficiario?.["Sexo do Beneficiário"] ?? "";
  const normalizado = normalizarLocal(valor);
  if (["M", "MASCULINO", "MASC"].includes(normalizado)) return "Masculino";
  if (["F", "FEMININO", "FEM"].includes(normalizado)) return "Feminino";
  return "Não informado";
}

function prepararGeoJsonMunicipios(geoJson, nomesPorCodigo) {
  return {
    ...geoJson,
    features: (geoJson.features || []).map((feature) => {
      const propriedades = feature.properties || {};
      const codigo = String(
        propriedades.codarea ?? propriedades.CD_MUN ?? propriedades.codigo ?? propriedades.id ?? ""
      );
      const nome = nomesPorCodigo[codigo] || propriedades.name || codigo;

      return {
        ...feature,
        properties: {
          ...propriedades,
          name: nome,
          codigoMunicipio: codigo,
        },
      };
    }),
  };
}

function prepararGeoJson(geoJson) {
  return {
    ...geoJson,
    features: (geoJson.features || []).map((feature) => {
      const propriedades = feature.properties || {};
      const codigo = String(
        propriedades.codarea ?? propriedades.CD_UF ?? propriedades.codigo ?? ""
      ).slice(0, 2);
      const sigla = CODIGO_PARA_UF[Number(codigo)];

      return {
        ...feature,
        properties: {
          ...propriedades,
          name: sigla || propriedades.name || codigo,
        },
      };
    }),
  };
}

export default function BrazilMap({
  dados,
  temaEscuro,
  selecionarEstado,
  beneficiarios = [],
  beneficiariosFiltrados = [],
  dataInicial = "",
  dataFinal = "",
  faixaEtariaSelecionada = "Todas",
  empresaSelecionada = "Todas",
  tipoCadastroSelecionado = "Todos",
  estadoSelecionado = "Todos",
  cidadeSelecionada = "Todas",
  exibirMapa = true,
  exibirAnalises = true,
  exibirResumoExecutivo = true,
}) {
  const [mapaCarregado, setMapaCarregado] = useState(false);
  const [erroMapa, setErroMapa] = useState("");
  const [buscaEstado, setBuscaEstado] = useState("");
  const [regiaoSelecionada, setRegiaoSelecionada] = useState("Todas");
  const [modoMapa, setModoMapa] = useState("carteira");
  const [mapaMunicipalCarregado, setMapaMunicipalCarregado] = useState(false);
  const [erroMapaMunicipal, setErroMapaMunicipal] = useState("");
  const [cidadeEmConsulta, setCidadeEmConsulta] = useState("");

  useEffect(() => {
    setCidadeEmConsulta("");
  }, [estadoSelecionado, exibirMapa]);

  useEffect(() => {
    if (!exibirMapa) return undefined;

    let ativo = true;
    const controlador = new AbortController();

    async function carregarMapa() {
      try {
        setErroMapa("");

        if (echarts.getMap("brasil-ufs")) {
          if (ativo) setMapaCarregado(true);
          return;
        }

        const resposta = await fetch(URL_MAPA_IBGE, {
          signal: controlador.signal,
        });

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar a malha geográfica.");
        }

        const geoJsonOriginal = await resposta.json();
        echarts.registerMap("brasil-ufs", prepararGeoJson(geoJsonOriginal));

        if (ativo) setMapaCarregado(true);
      } catch (erro) {
        if (erro?.name === "AbortError") return;

        if (ativo) {
          setErroMapa(
            "O mapa não pôde ser carregado. Verifique a conexão e use a visualização em barras."
          );
        }
      }
    }

    carregarMapa();

    return () => {
      ativo = false;
      controlador.abort();
    };
  }, [exibirMapa]);

  useEffect(() => {
    if (!exibirMapa) return undefined;

    if (estadoSelecionado === "Todos") {
      setMapaMunicipalCarregado(false);
      setErroMapaMunicipal("");
      return undefined;
    }

    const codigoUf = CODIGO_UF_IBGE[estadoSelecionado];
    if (!codigoUf) {
      setErroMapaMunicipal("Não foi possível identificar o estado selecionado.");
      return undefined;
    }

    const nomeMapa = `municipios-${estadoSelecionado}`;
    if (echarts.getMap(nomeMapa)) {
      setMapaMunicipalCarregado(true);
      setErroMapaMunicipal("");
      return undefined;
    }

    let ativo = true;
    const controlador = new AbortController();

    async function carregarMapaMunicipal() {
      try {
        setMapaMunicipalCarregado(false);
        setErroMapaMunicipal("");

        const urlMalha = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${codigoUf}?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio`;
        const urlMunicipios = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${codigoUf}/municipios`;

        const [respostaMalha, respostaMunicipios] = await Promise.all([
          fetch(urlMalha, { signal: controlador.signal }),
          fetch(urlMunicipios, { signal: controlador.signal }),
        ]);

        if (!respostaMalha.ok || !respostaMunicipios.ok) {
          throw new Error("Não foi possível carregar os municípios.");
        }

        const [geoJson, municipios] = await Promise.all([
          respostaMalha.json(),
          respostaMunicipios.json(),
        ]);

        const nomesPorCodigo = Object.fromEntries(
          municipios.map((municipio) => [String(municipio.id), municipio.nome])
        );

        echarts.registerMap(
          nomeMapa,
          prepararGeoJsonMunicipios(geoJson, nomesPorCodigo)
        );

        if (ativo) setMapaMunicipalCarregado(true);
      } catch (erro) {
        if (erro?.name === "AbortError") return;
        if (ativo) {
          setErroMapaMunicipal(
            "O detalhamento municipal não pôde ser carregado. Tente novamente em instantes."
          );
        }
      }
    }

    carregarMapaMunicipal();

    return () => {
      ativo = false;
      controlador.abort();
    };
  }, [estadoSelecionado, exibirMapa]);

  const dadosMunicipiosMapa = useMemo(() => {
    if (estadoSelecionado === "Todos") return [];

    const contagem = beneficiariosFiltrados.reduce((acc, beneficiario) => {
      const cidade = String(beneficiario["Cidade de correspondência"] || "").trim();
      if (!cidade) return acc;
      const chave = normalizarLocal(cidade);
      if (!acc[chave]) acc[chave] = { local: cidade, quantidade: 0 };
      acc[chave].quantidade += 1;
      return acc;
    }, {});

    return Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade);
  }, [beneficiariosFiltrados, estadoSelecionado]);

  const resumoCidadeEmConsulta = useMemo(() => {
    if (!cidadeEmConsulta || estadoSelecionado === "Todos") return null;
    const chaveCidade = normalizarLocal(cidadeEmConsulta);
    const registros = beneficiariosFiltrados.filter((beneficiario) =>
      normalizarLocal(beneficiario["Cidade de correspondência"]) === chaveCidade
    );
    const totalEstado = dadosMunicipiosMapa.reduce((soma, item) => soma + Number(item.quantidade || 0), 0);
    const empresas = new Map();
    const sexos = new Map();
    let somaIdades = 0;
    let idadesValidas = 0;

    registros.forEach((beneficiario) => {
      const empresa = String(beneficiario["Empresa"] || "").trim();
      if (empresaValidaParaAnalise(empresa)) {
        empresas.set(empresa, (empresas.get(empresa) || 0) + 1);
      }
      const sexo = obterSexoBeneficiario(beneficiario);
      sexos.set(sexo, (sexos.get(sexo) || 0) + 1);
      const idade = Number(beneficiario["Idade"]);
      if (Number.isFinite(idade) && idade >= 0 && idade <= 120) {
        somaIdades += idade;
        idadesValidas += 1;
      }
    });

    return {
      cidade: cidadeEmConsulta,
      total: registros.length,
      participacao: totalEstado > 0 ? (registros.length / totalEstado) * 100 : 0,
      empresas: empresas.size,
      idadeMedia: idadesValidas > 0 ? somaIdades / idadesValidas : null,
      sexos: [...sexos.entries()].map(([nome, quantidade]) => ({ nome, quantidade })).sort((a, b) => b.quantidade - a.quantidade),
    };
  }, [cidadeEmConsulta, estadoSelecionado, beneficiariosFiltrados, dadosMunicipiosMapa]);

  const inclusoesPorEstadoMapa = useMemo(() => {
    const datasValidas = beneficiarios
      .map((item) => converterData(item["Data de Inclusão"]))
      .filter(Boolean);
    const dataMaisRecente = datasValidas.length
      ? new Date(datasValidas.reduce(
          (maior, data) => Math.max(maior, data.getTime()),
          Number.NEGATIVE_INFINITY
        ))
      : null;
    const inicio = dataInicial ? new Date(`${dataInicial}T00:00:00`) : dataMaisRecente ? new Date(dataMaisRecente) : null;
    const fim = dataFinal ? new Date(`${dataFinal}T23:59:59`) : dataMaisRecente;
    if (inicio && !dataInicial) {
      inicio.setDate(inicio.getDate() - 29);
      inicio.setHours(0, 0, 0, 0);
    }

    const contagem = {};
    beneficiarios.forEach((beneficiario) => {
      const data = converterData(beneficiario["Data de Inclusão"]);
      const faixa = identificarFaixaEtaria(beneficiario["Idade"]);
      const empresa = beneficiario["Empresa"];
      const tipo = identificarTipoCadastro(empresa);
      const uf = beneficiario["Estado de correspondência"];
      if (!data || !inicio || !fim || !REGIAO_POR_UF[uf]) return;
      if (data < inicio || data > fim) return;
      if (faixaEtariaSelecionada !== "Todas" && faixa !== faixaEtariaSelecionada) return;
      if (empresaSelecionada !== "Todas" && empresa !== empresaSelecionada) return;
      if (tipoCadastroSelecionado !== "Todos" && tipo !== tipoCadastroSelecionado) return;
      contagem[uf] = (contagem[uf] || 0) + 1;
    });
    return contagem;
  }, [beneficiarios, dataInicial, dataFinal, faixaEtariaSelecionada, empresaSelecionada, tipoCadastroSelecionado]);

  const variacaoPorEstadoMapa = useMemo(() => {
    const datasValidas = beneficiarios
      .map((item) => converterData(item["Data de Inclusão"]))
      .filter(Boolean);
    const dataMaisRecente = datasValidas.length
      ? new Date(datasValidas.reduce(
          (maior, data) => Math.max(maior, data.getTime()),
          Number.NEGATIVE_INFINITY
        ))
      : null;
    const fimAtual = dataFinal ? new Date(`${dataFinal}T23:59:59`) : dataMaisRecente;
    const inicioAtual = dataInicial ? new Date(`${dataInicial}T00:00:00`) : fimAtual ? new Date(fimAtual) : null;
    if (inicioAtual && !dataInicial) {
      inicioAtual.setDate(inicioAtual.getDate() - 29);
      inicioAtual.setHours(0, 0, 0, 0);
    }
    const duracao = inicioAtual && fimAtual
      ? Math.max(1, Math.round((fimAtual - inicioAtual) / 86400000) + 1)
      : 30;
    const fimAnterior = inicioAtual ? new Date(inicioAtual) : null;
    if (fimAnterior) {
      fimAnterior.setDate(fimAnterior.getDate() - 1);
      fimAnterior.setHours(23, 59, 59, 999);
    }
    const inicioAnterior = fimAnterior ? new Date(fimAnterior) : null;
    if (inicioAnterior) {
      inicioAnterior.setDate(inicioAnterior.getDate() - duracao + 1);
      inicioAnterior.setHours(0, 0, 0, 0);
    }

    const atual = {};
    const anterior = {};
    beneficiarios.forEach((beneficiario) => {
      const data = converterData(beneficiario["Data de Inclusão"]);
      const faixa = identificarFaixaEtaria(beneficiario["Idade"]);
      const empresa = beneficiario["Empresa"];
      const tipo = identificarTipoCadastro(empresa);
      const uf = beneficiario["Estado de correspondência"];
      if (!data || !REGIAO_POR_UF[uf]) return;
      if (faixaEtariaSelecionada !== "Todas" && faixa !== faixaEtariaSelecionada) return;
      if (empresaSelecionada !== "Todas" && empresa !== empresaSelecionada) return;
      if (tipoCadastroSelecionado !== "Todos" && tipo !== tipoCadastroSelecionado) return;
      if (inicioAtual && fimAtual && data >= inicioAtual && data <= fimAtual) {
        atual[uf] = (atual[uf] || 0) + 1;
      } else if (inicioAnterior && fimAnterior && data >= inicioAnterior && data <= fimAnterior) {
        anterior[uf] = (anterior[uf] || 0) + 1;
      }
    });

    const resultado = {};
    Object.keys(REGIAO_POR_UF).forEach((uf) => {
      const valorAtual = atual[uf] || 0;
      const valorAnterior = anterior[uf] || 0;
      const diferenca = valorAtual - valorAnterior;
      const percentual = valorAnterior > 0
        ? (diferenca / valorAnterior) * 100
        : valorAtual > 0 ? null : 0;
      resultado[uf] = { atual: valorAtual, anterior: valorAnterior, diferenca, percentual };
    });
    return resultado;
  }, [beneficiarios, dataInicial, dataFinal, faixaEtariaSelecionada, empresaSelecionada, tipoCadastroSelecionado]);

  const estadosCarteiraOrdenados = useMemo(
    () => [...dados].sort((a, b) => b.quantidade - a.quantidade),
    [dados]
  );

  const totalCarteiraNacional = useMemo(
    () => dados.reduce((total, item) => total + (Number(item.quantidade) || 0), 0),
    [dados]
  );

  const dadosMapa = useMemo(() => dados.map((item) => {
    const carteira = Number(item.quantidade) || 0;
    const inclusoes = inclusoesPorEstadoMapa[item.local] || 0;
    const variacao = variacaoPorEstadoMapa[item.local] || { atual: 0, anterior: 0, diferenca: 0, percentual: 0 };
    const quantidade = modoMapa === "inclusoes"
      ? inclusoes
      : modoMapa === "participacao"
        ? (totalCarteiraNacional > 0 ? (carteira / totalCarteiraNacional) * 100 : 0)
        : modoMapa === "variacao"
          ? variacao.diferenca
          : carteira;
    return { ...item, quantidade, carteira, inclusoes, variacao };
  }), [dados, inclusoesPorEstadoMapa, variacaoPorEstadoMapa, modoMapa, totalCarteiraNacional]);

  const maiorQuantidade = useMemo(
    () => Math.max(...dadosMapa.map((item) => Math.abs(Number(item.quantidade) || 0)), 1),
    [dadosMapa]
  );

  const estadosOrdenados = useMemo(
    () => [...dadosMapa].sort((a, b) => b.quantidade - a.quantidade),
    [dadosMapa]
  );

  const totalNacional = useMemo(
    () => dadosMapa.reduce((total, item) => total + (Number(item.quantidade) || 0), 0),
    [dadosMapa]
  );

  const estadosFiltrados = useMemo(() => {
    const termo = buscaEstado.trim().toLocaleLowerCase("pt-BR");

    return estadosOrdenados.filter((item) => {
      const atendeBusca =
        !termo ||
        String(item.local).toLocaleLowerCase("pt-BR").includes(termo);

      const atendeRegiao =
        regiaoSelecionada === "Todas" ||
        REGIAO_POR_UF[item.local] === regiaoSelecionada;

      return atendeBusca && atendeRegiao;
    });
  }, [buscaEstado, estadosOrdenados, regiaoSelecionada]);

  const filtroVisualAtivo = Boolean(
    buscaEstado.trim() || regiaoSelecionada !== "Todas"
  );

  const ufsVisiveisNoMapa = useMemo(
    () => new Set(estadosFiltrados.map((item) => item.local)),
    [estadosFiltrados]
  );

  const resumoRegioes = useMemo(() => {
    return REGIOES.filter((regiao) => regiao !== "Todas").map((regiao) => {
      const estadosDaRegiao = estadosCarteiraOrdenados.filter(
        (item) => REGIAO_POR_UF[item.local] === regiao
      );
      const total = estadosDaRegiao.reduce(
        (soma, item) => soma + (Number(item.quantidade) || 0),
        0
      );
      const participacao = totalCarteiraNacional > 0 ? (total / totalCarteiraNacional) * 100 : 0;

      return {
        regiao,
        total,
        participacao,
        lider: estadosDaRegiao[0] || null,
        quantidadeEstados: estadosDaRegiao.length,
      };
    });
  }, [estadosCarteiraOrdenados, totalCarteiraNacional]);

  const analiseCrescimento = useMemo(() => {
    const datasValidas = beneficiarios
      .map((item) => converterData(item["Data de Inclusão"]))
      .filter(Boolean);

    const dataMaisRecente = datasValidas.length
      ? new Date(datasValidas.reduce(
          (maior, data) => Math.max(maior, data.getTime()),
          Number.NEGATIVE_INFINITY
        ))
      : null;

    const inicioInformado = dataInicial ? new Date(`${dataInicial}T00:00:00`) : null;
    const fimInformado = dataFinal ? new Date(`${dataFinal}T23:59:59`) : null;
    const fimPeriodo = fimInformado || dataMaisRecente;
    const inicioPeriodo = inicioInformado || (fimPeriodo ? new Date(fimPeriodo) : null);

    if (inicioPeriodo && !inicioInformado) {
      inicioPeriodo.setDate(inicioPeriodo.getDate() - 29);
      inicioPeriodo.setHours(0, 0, 0, 0);
    }

    const atendeFiltrosNaoTemporais = (beneficiario) => {
      const faixa = identificarFaixaEtaria(beneficiario["Idade"]);
      const empresa = beneficiario["Empresa"];
      const tipo = identificarTipoCadastro(empresa);
      const uf = beneficiario["Estado de correspondência"];
      const cidade = beneficiario["Cidade de correspondência"];

      return (
        (estadoSelecionado === "Todos" || uf === estadoSelecionado) &&
        (cidadeSelecionada === "Todas" || cidade === cidadeSelecionada) &&
        (faixaEtariaSelecionada === "Todas" || faixa === faixaEtariaSelecionada) &&
        (empresaSelecionada === "Todas" || empresa === empresaSelecionada) &&
        (tipoCadastroSelecionado === "Todos" || tipo === tipoCadastroSelecionado)
      );
    };

    const carteiraBase = beneficiarios.filter(atendeFiltrosNaoTemporais);
    const inclusoesPeriodo = carteiraBase.filter((beneficiario) => {
      const data = converterData(beneficiario["Data de Inclusão"]);
      if (!data || !inicioPeriodo || !fimPeriodo) return false;
      return data >= inicioPeriodo && data <= fimPeriodo;
    });

    const contarPorRegiao = (base) => {
      const contagem = {};
      base.forEach((beneficiario) => {
        const uf = beneficiario["Estado de correspondência"];
        const regiao = REGIAO_POR_UF[uf];
        if (!regiao) return;
        contagem[regiao] = (contagem[regiao] || 0) + 1;
      });
      return contagem;
    };

    const contarPorEstado = (base) => {
      const contagem = {};
      base.forEach((beneficiario) => {
        const uf = beneficiario["Estado de correspondência"];
        if (!REGIAO_POR_UF[uf]) return;
        contagem[uf] = (contagem[uf] || 0) + 1;
      });
      return contagem;
    };

    const carteiraPorRegiao = contarPorRegiao(carteiraBase);
    const inclusoesPorRegiao = contarPorRegiao(inclusoesPeriodo);
    const inclusoesPorEstado = contarPorEstado(inclusoesPeriodo);
    const totalInclusoes = inclusoesPeriodo.length;

    const regioes = REGIOES.filter((regiao) => regiao !== "Todas").map((regiao) => ({
      regiao,
      inclusoes: inclusoesPorRegiao[regiao] || 0,
      carteira: carteiraPorRegiao[regiao] || 0,
      taxa: carteiraPorRegiao[regiao] > 0
        ? ((inclusoesPorRegiao[regiao] || 0) / carteiraPorRegiao[regiao]) * 100
        : 0,
    }));

    const maiorCrescimento = [...regioes].sort((a, b) => b.inclusoes - a.inclusoes)[0];
    const maiorTaxa = [...regioes].sort((a, b) => b.taxa - a.taxa)[0];
    const estadoDestaqueEntrada = Object.entries(inclusoesPorEstado).sort((a, b) => b[1] - a[1])[0];
    const estadoDestaque = estadoDestaqueEntrada
      ? { uf: estadoDestaqueEntrada[0], inclusoes: estadoDestaqueEntrada[1] }
      : null;

    const periodoTexto = inicioPeriodo && fimPeriodo
      ? `${inicioPeriodo.toLocaleDateString("pt-BR")} a ${fimPeriodo.toLocaleDateString("pt-BR")}`
      : "período sem datas válidas";

    const duracaoDias = inicioPeriodo && fimPeriodo
      ? Math.max(1, Math.round((fimPeriodo - inicioPeriodo) / 86400000) + 1)
      : 30;
    const fimPeriodoAnterior = inicioPeriodo ? new Date(inicioPeriodo) : null;
    if (fimPeriodoAnterior) {
      fimPeriodoAnterior.setDate(fimPeriodoAnterior.getDate() - 1);
      fimPeriodoAnterior.setHours(23, 59, 59, 999);
    }
    const inicioPeriodoAnterior = fimPeriodoAnterior ? new Date(fimPeriodoAnterior) : null;
    if (inicioPeriodoAnterior) {
      inicioPeriodoAnterior.setDate(inicioPeriodoAnterior.getDate() - duracaoDias + 1);
      inicioPeriodoAnterior.setHours(0, 0, 0, 0);
    }
    const inclusoesPeriodoAnterior = carteiraBase.filter((beneficiario) => {
      const data = converterData(beneficiario["Data de Inclusão"]);
      if (!data || !inicioPeriodoAnterior || !fimPeriodoAnterior) return false;
      return data >= inicioPeriodoAnterior && data <= fimPeriodoAnterior;
    });
    const totalAnterior = inclusoesPeriodoAnterior.length;
    const variacaoPercentual = totalAnterior > 0
      ? ((totalInclusoes - totalAnterior) / totalAnterior) * 100
      : totalInclusoes > 0 ? null : 0;
    const rankingEstados = Object.entries(inclusoesPorEstado)
      .map(([uf, inclusoes]) => ({ uf, inclusoes, regiao: REGIAO_POR_UF[uf] }))
      .sort((a, b) => b.inclusoes - a.inclusoes)
      .slice(0, 5);
    const concentracaoTop4 = totalInclusoes > 0
      ? (rankingEstados.slice(0, 4).reduce((soma, item) => soma + item.inclusoes, 0) / totalInclusoes) * 100
      : 0;

    return {
      maiorCrescimento,
      maiorTaxa,
      estadoDestaque,
      totalInclusoes,
      totalAnterior,
      variacaoPercentual,
      rankingEstados,
      concentracaoTop4,
      periodoTexto,
      periodoAnteriorTexto: inicioPeriodoAnterior && fimPeriodoAnterior
        ? `${inicioPeriodoAnterior.toLocaleDateString("pt-BR")} a ${fimPeriodoAnterior.toLocaleDateString("pt-BR")}`
        : "—",
      usandoFiltroData: Boolean(dataInicial || dataFinal),
    };
  }, [
    beneficiarios,
    dataInicial,
    dataFinal,
    estadoSelecionado,
    cidadeSelecionada,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
  ]);

  const analiseHierarquica = useMemo(() => {
    const nivel = cidadeSelecionada !== "Todas"
      ? "municipio"
      : estadoSelecionado !== "Todos"
        ? "estado"
        : "brasil";

    if (nivel === "brasil") {
      const porTotal = [...resumoRegioes].sort((a, b) => b.total - a.total);
      const maior = porTotal[0];
      const menor = porTotal[porTotal.length - 1];
      const crescimento = analiseCrescimento.maiorCrescimento;
      const acelerada = analiseCrescimento.maiorTaxa;
      const destaque = analiseCrescimento.estadoDestaque;

      return {
        nivel,
        titulo: "Indicadores regionais",
        aria: "Indicadores executivos regionais",
        insights: [
          {
            rotulo: "Região líder da carteira",
            valor: maior?.regiao || "—",
            detalhe: maior ? `${maior.total.toLocaleString("pt-BR")} vidas · ${maior.participacao.toFixed(1)}% da carteira` : "Sem dados disponíveis",
            icone: "🏆",
          },
          {
            rotulo: "Estado com mais inclusões",
            valor: destaque?.uf || "—",
            detalhe: destaque
              ? `${destaque.inclusoes.toLocaleString("pt-BR")} inclusões · ${REGIAO_POR_UF[destaque.uf]}`
              : "Sem inclusões no período",
            icone: "⭐",
          },
          {
            rotulo: "Melhor expansão proporcional",
            valor: acelerada?.regiao || "—",
            detalhe: `${(acelerada?.taxa || 0).toFixed(1)}% sobre a carteira regional`,
            icone: "🚀",
          },
          {
            rotulo: "Oportunidade regional",
            valor: menor?.regiao || "—",
            detalhe: menor ? `${menor.total.toLocaleString("pt-BR")} vidas · ${menor.participacao.toFixed(1)}% da carteira` : "Sem dados disponíveis",
            icone: "◎",
          },
        ],
        menorLocal: menor?.regiao || "a região com menor presença",
        referencia: acelerada?.regiao || "a região líder",
        unidadePlural: "estados",
        recomendacao3: "Desenvolver a região de menor participação",
        recomendacao4: "Replicar o desempenho regional",
      };
    }

    const datasValidas = beneficiarios
      .map((item) => converterData(item["Data de Inclusão"]))
      .filter(Boolean);
    const dataMaisRecente = datasValidas.length
      ? new Date(Math.max(...datasValidas.map((data) => data.getTime())))
      : null;
    const inicio = dataInicial ? new Date(`${dataInicial}T00:00:00`) : (dataMaisRecente ? new Date(dataMaisRecente) : null);
    const fim = dataFinal ? new Date(`${dataFinal}T23:59:59`) : dataMaisRecente;
    if (inicio && !dataInicial) {
      inicio.setDate(inicio.getDate() - 29);
      inicio.setHours(0, 0, 0, 0);
    }

    const atendeFiltros = (item, incluirCidade = true) => {
      const faixa = identificarFaixaEtaria(item["Idade"]);
      const empresa = item["Empresa"];
      const tipo = identificarTipoCadastro(empresa);
      const uf = item["Estado de correspondência"];
      const cidade = item["Cidade de correspondência"];
      return (
        uf === estadoSelecionado &&
        (!incluirCidade || cidadeSelecionada === "Todas" || cidade === cidadeSelecionada) &&
        (faixaEtariaSelecionada === "Todas" || faixa === faixaEtariaSelecionada) &&
        (empresaSelecionada === "Todas" || empresa === empresaSelecionada) &&
        (tipoCadastroSelecionado === "Todos" || tipo === tipoCadastroSelecionado)
      );
    };

    const baseEstado = beneficiarios.filter((item) => atendeFiltros(item, false));
    const inclusoesEstado = baseEstado.filter((item) => {
      const data = converterData(item["Data de Inclusão"]);
      return data && inicio && fim && data >= inicio && data <= fim;
    });

    if (nivel === "estado") {
      const agregar = (base) => {
        const mapa = {};
        base.forEach((item) => {
          const cidade = String(item["Cidade de correspondência"] || "Não informado").trim();
          mapa[cidade] = (mapa[cidade] || 0) + 1;
        });
        return mapa;
      };
      const carteira = agregar(baseEstado);
      const inclusoes = agregar(inclusoesEstado);
      const municipios = Object.keys(carteira).map((cidade) => {
        const carteiraMunicipal = carteira[cidade] || 0;
        const inclusoesMunicipais = inclusoes[cidade] || 0;
        const populacao = obterPopulacaoMunicipal(estadoSelecionado, cidade);
        return {
          cidade,
          carteira: carteiraMunicipal,
          inclusoes: inclusoesMunicipais,
          taxa: carteiraMunicipal > 0 ? (inclusoesMunicipais / carteiraMunicipal) * 100 : 0,
          populacao,
          penetracao: populacao > 0 ? (carteiraMunicipal / populacao) * 100 : null,
        };
      });
      const porCarteira = [...municipios].sort((a, b) => b.carteira - a.carteira);
      const porInclusoes = [...municipios].sort((a, b) => b.inclusoes - a.inclusoes);
      const lider = porCarteira[0];
      const destaque = porInclusoes[0];
      const totalEstado = baseEstado.length;

      // Evita que municípios com apenas 1 ou 2 vidas liderem a expansão proporcional.
      // O piso é dinâmico: no mínimo 5 vidas e, quando a carteira estadual permitir,
      // pelo menos 25% da carteira média por município.
      const municipiosComCarteira = municipios.filter((item) => item.carteira > 0);
      const mediaCarteiraMunicipal = municipiosComCarteira.length
        ? totalEstado / municipiosComCarteira.length
        : 0;
      const pisoCarteiraExpansao = Math.max(5, Math.ceil(mediaCarteiraMunicipal * 0.25));
      const elegiveisExpansao = municipiosComCarteira.filter(
        (item) => item.carteira >= pisoCarteiraExpansao && item.inclusoes > 0
      );
      const baseRankingExpansao = elegiveisExpansao.length
        ? elegiveisExpansao
        : municipiosComCarteira.filter((item) => item.inclusoes > 0);
      const acelerado = [...baseRankingExpansao].sort((a, b) => {
        if (b.taxa !== a.taxa) return b.taxa - a.taxa;
        if (b.inclusoes !== a.inclusoes) return b.inclusoes - a.inclusoes;
        return b.carteira - a.carteira;
      })[0];

      // Oportunidade municipal baseada em potencial de mercado.
      // Fonte populacional: IBGE 2025 (base local, sem chamadas externas no dashboard).
      // Para evitar sinalizações pouco representativas, só entram municípios com:
      // - população de pelo menos 30 mil habitantes;
      // - pelo menos 2 inclusões no período;
      // - população localizada na base IBGE.
      // Score: 50% potencial populacional + 30% baixa penetração da operadora + 20% tração recente.
      const candidatosOportunidade = municipiosComCarteira.filter(
        (item) => Number.isFinite(item.populacao) && item.populacao >= 30000 && item.inclusoes >= 2
      );

      const oportunidadePontuada = (() => {
        if (!candidatosOportunidade.length) return [];

        const logsPopulacao = candidatosOportunidade.map((item) => Math.log10(item.populacao));
        const penetracoes = candidatosOportunidade.map((item) => item.penetracao ?? 0);
        const logsInclusoes = candidatosOportunidade.map((item) => Math.log1p(item.inclusoes));

        const minPop = Math.min(...logsPopulacao);
        const maxPop = Math.max(...logsPopulacao);
        const minPenetracao = Math.min(...penetracoes);
        const maxPenetracao = Math.max(...penetracoes);
        const minInclusoes = Math.min(...logsInclusoes);
        const maxInclusoes = Math.max(...logsInclusoes);

        const normalizar = (valor, minimo, maximo) => (
          maximo === minimo ? 1 : (valor - minimo) / (maximo - minimo)
        );

        return candidatosOportunidade.map((item) => {
          const scorePopulacao = normalizar(Math.log10(item.populacao), minPop, maxPop);
          const scoreBaixaPenetracao = 1 - normalizar(item.penetracao ?? 0, minPenetracao, maxPenetracao);
          const scoreTracao = normalizar(Math.log1p(item.inclusoes), minInclusoes, maxInclusoes);

          return {
            ...item,
            scorePopulacao,
            scoreBaixaPenetracao,
            scoreTracao,
            scoreOportunidade:
              scorePopulacao * 0.5 + scoreBaixaPenetracao * 0.3 + scoreTracao * 0.2,
          };
        });
      })();

      const oportunidade = [...oportunidadePontuada].sort((a, b) => {
        if (b.scoreOportunidade !== a.scoreOportunidade) {
          return b.scoreOportunidade - a.scoreOportunidade;
        }
        if (b.populacao !== a.populacao) return b.populacao - a.populacao;
        if (b.inclusoes !== a.inclusoes) return b.inclusoes - a.inclusoes;
        return (a.penetracao ?? Infinity) - (b.penetracao ?? Infinity);
      })[0];

      return {
        nivel,
        titulo: "Indicadores municipais",
        aria: `Indicadores municipais de ${estadoSelecionado}`,
        insights: [
          { rotulo: "Município líder da carteira", valor: lider?.cidade || "—", detalhe: lider ? `${lider.carteira.toLocaleString("pt-BR")} vidas · ${totalEstado ? ((lider.carteira / totalEstado) * 100).toFixed(1) : "0,0"}% da carteira estadual` : "Sem dados disponíveis", icone: "🏆" },
          { rotulo: "Município com mais inclusões", valor: destaque?.cidade || "—", detalhe: destaque ? `${destaque.inclusoes.toLocaleString("pt-BR")} inclusões em ${estadoSelecionado}` : "Sem inclusões no período", icone: "⭐" },
          { rotulo: "Melhor expansão proporcional", valor: acelerado?.cidade || "—", detalhe: acelerado ? `${acelerado.taxa.toFixed(1)}% · ${acelerado.inclusoes.toLocaleString("pt-BR")} inclusões · base ${acelerado.carteira.toLocaleString("pt-BR")} vidas` : "Sem municípios elegíveis no período", icone: "🚀" },
          { rotulo: "Oportunidade municipal", valor: oportunidade?.cidade || "—", detalhe: oportunidade ? `${formatarPopulacaoCompacta(oportunidade.populacao)} · ${oportunidade.carteira.toLocaleString("pt-BR")} vidas · ${formatarPenetracao(oportunidade.penetracao)} penetração · ${oportunidade.inclusoes.toLocaleString("pt-BR")} inclusões` : "Sem município elegível · mín. 30 mil hab. e 2 inclusões", icone: "◎" },
        ],
        menorLocal: oportunidade?.cidade || "um município com potencial populacional e baixa penetração",
        referencia: acelerado?.cidade || "o município líder",
        unidadePlural: "municípios",
        recomendacao3: "Priorizar municípios com maior potencial populacional, baixa penetração e tração recente",
        recomendacao4: "Replicar o desempenho municipal em bases representativas",
      };
    }

    const baseMunicipio = baseEstado.filter((item) => item["Cidade de correspondência"] === cidadeSelecionada);
    const inclusoesMunicipio = inclusoesEstado.filter((item) => item["Cidade de correspondência"] === cidadeSelecionada);
    const participacao = baseEstado.length > 0 ? (baseMunicipio.length / baseEstado.length) * 100 : 0;
    const taxa = baseMunicipio.length > 0 ? (inclusoesMunicipio.length / baseMunicipio.length) * 100 : 0;
    const mediaMunicipios = (() => {
      const cidades = new Set(baseEstado.map((item) => item["Cidade de correspondência"]).filter(Boolean));
      return cidades.size ? baseEstado.length / cidades.size : 0;
    })();
    const potencial = baseMunicipio.length >= mediaMunicipios ? "Consolidado" : "Em desenvolvimento";

    return {
      nivel,
      titulo: "Indicadores do município",
      aria: `Indicadores do município de ${cidadeSelecionada}`,
      insights: [
        { rotulo: "Participação na carteira estadual", valor: `${participacao.toFixed(1)}%`, detalhe: `${baseMunicipio.length.toLocaleString("pt-BR")} vidas em ${cidadeSelecionada}`, icone: "🏆" },
        { rotulo: "Inclusões no período", valor: inclusoesMunicipio.length.toLocaleString("pt-BR"), detalhe: `Entradas analisadas em ${analiseCrescimento.periodoTexto}`, icone: "⭐" },
        { rotulo: "Expansão proporcional", valor: `${taxa.toFixed(1)}%`, detalhe: "Inclusões sobre a carteira municipal", icone: "🚀" },
        { rotulo: "Potencial de expansão", valor: potencial, detalhe: baseMunicipio.length >= mediaMunicipios ? "Presença acima da média municipal do estado" : "Presença abaixo da média municipal do estado", icone: "◎" },
      ],
      menorLocal: cidadeSelecionada,
      referencia: cidadeSelecionada,
      unidadePlural: "municípios",
      recomendacao3: "Fortalecer a presença municipal",
      recomendacao4: "Sustentar o desempenho local",
    };
  }, [
    cidadeSelecionada,
    estadoSelecionado,
    resumoRegioes,
    analiseCrescimento,
    beneficiarios,
    dataInicial,
    dataFinal,
    faixaEtariaSelecionada,
    empresaSelecionada,
    tipoCadastroSelecionado,
  ]);

  const insightsRegioes = analiseHierarquica.insights;
  const narrativaRegional = useMemo(() => {
    const [primeiro, segundo, terceiro, quarto] = analiseHierarquica.insights || [];
    if (!primeiro) return "Não há dados suficientes para gerar a leitura geográfica da seleção.";

    if (analiseHierarquica.nivel === "brasil") {
      return `${primeiro.valor} lidera a carteira nacional. ${segundo?.valor || "—"} concentra o maior volume de inclusões, enquanto ${terceiro?.valor || "—"} apresenta a melhor expansão proporcional. ${quarto?.valor || "—"} permanece como oportunidade regional.`;
    }

    if (analiseHierarquica.nivel === "estado") {
      return `${primeiro.valor} lidera a carteira de ${estadoSelecionado}. ${segundo?.valor || "—"} possui o maior volume de inclusões e ${terceiro?.valor || "—"} apresenta a melhor expansão proporcional. ${quarto?.valor || "—"} representa a principal oportunidade municipal do estado.`;
    }

    return `${cidadeSelecionada} representa ${primeiro.valor} da carteira estadual. Foram identificadas ${segundo?.valor || "0"} inclusões no período, com expansão proporcional de ${terceiro?.valor || "0,0%"}. O município está classificado como ${String(quarto?.valor || "em análise").toLocaleLowerCase("pt-BR")}.`;
  }, [analiseHierarquica, estadoSelecionado, cidadeSelecionada]);

  const centralInsights = useMemo(() => {
    const atual = analiseCrescimento.totalInclusoes;
    const anterior = analiseCrescimento.totalAnterior;
    const variacao = analiseCrescimento.variacaoPercentual;
    const crescimento = analiseCrescimento.maiorCrescimento;
    const acelerada = analiseCrescimento.maiorTaxa;
    const destaque = analiseCrescimento.estadoDestaque;

    const tendencia = variacao === null
      ? "alta"
      : variacao > 5
        ? "alta"
        : variacao < -5
          ? "baixa"
          : "estavel";

    const comparativoTexto = variacao === null
      ? "Primeiro volume relevante identificado"
      : `${Math.abs(variacao).toFixed(1)}% ${variacao >= 0 ? "acima" : "abaixo"} do período anterior`;

    const alertas = [
      {
        status: tendencia,
        titulo: tendencia === "alta" ? "Crescimento acima do período anterior" : tendencia === "baixa" ? "Atenção à desaceleração" : "Crescimento estável",
        texto: comparativoTexto,
      },
      {
        status: analiseCrescimento.concentracaoTop4 >= 60 ? "atencao" : "estavel",
        titulo: "Concentração das inclusões",
        texto: `${analiseCrescimento.concentracaoTop4.toFixed(1)}% das inclusões estão nos quatro estados líderes`,
      },
      {
        status: "informacao",
        titulo: crescimento ? `${crescimento.regiao} lidera em volume` : "Sem liderança definida",
        texto: crescimento ? `${crescimento.inclusoes.toLocaleString("pt-BR")} novas vidas no período` : "Não houve inclusões válidas",
      },
      {
        status: "informacao",
        titulo: acelerada ? `${acelerada.regiao} lidera proporcionalmente` : "Sem taxa calculada",
        texto: acelerada ? `${acelerada.taxa.toFixed(1)}% da carteira regional incluída no período` : "Base insuficiente",
      },
    ];

    return {
      atual,
      anterior,
      variacao,
      comparativoTexto,
      tendencia,
      alertas,
      destaque,
    };
  }, [analiseCrescimento]);


  const saudeCarteira = useMemo(() => {
    const totalVidas = totalCarteiraNacional;
    const totalEstados = estadosCarteiraOrdenados.filter((item) => Number(item.quantidade) > 0).length;
    const municipios = new Set(
      beneficiariosFiltrados
        .map((item) => item["Cidade de correspondência"])
        .filter(Boolean)
    ).size;
    const empresas = new Set(
      beneficiariosFiltrados
        .map((item) => item["Empresa"])
        .filter(empresaValidaParaAnalise)
        .map((empresa) => String(empresa).trim())
    ).size;



    const estadosConcentracao = [...estadosCarteiraOrdenados]
      .filter((item) => Number(item.quantidade) > 0)
      .sort((a, b) => b.quantidade - a.quantidade);
    let acumulado = 0;
    let estadosPara80 = 0;
    for (const item of estadosConcentracao) {
      if (totalVidas <= 0 || acumulado / totalVidas >= 0.8) break;
      acumulado += Number(item.quantidade) || 0;
      estadosPara80 += 1;
    }
    const concentracao = totalVidas > 0 ? (acumulado / totalVidas) * 100 : 0;

    const variacao = analiseCrescimento.variacaoPercentual;
    const status = variacao === null || variacao > 5
      ? { classe: "positiva", icone: "●", texto: "Carteira em expansão" }
      : variacao < -5
        ? { classe: "atencao", icone: "●", texto: "Carteira em desaceleração" }
        : { classe: "estavel", icone: "●", texto: "Carteira estável" };

    const lider = [...resumoRegioes].sort((a, b) => b.total - a.total)[0];
    const datasConvertidas = beneficiarios.map((item) =>
      converterData(item["Data de Inclusão"])
    );
    const datasValidas = datasConvertidas.filter(Boolean);
    const dataMaisRecente = datasValidas.length
      ? new Date(datasValidas.reduce(
          (maior, data) => Math.max(maior, data.getTime()),
          Number.NEGATIVE_INFINITY
        ))
      : null;
    const dataMaisAntiga = datasValidas.length
      ? new Date(datasValidas.reduce(
          (menor, data) => Math.min(menor, data.getTime()),
          Number.POSITIVE_INFINITY
        ))
      : null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const idadeBaseDias = dataMaisRecente
      ? Math.max(0, Math.floor((hoje - dataMaisRecente) / 86400000))
      : null;
    const registrosComDataInvalida = datasConvertidas.filter((data) => !data).length;
    const totalRegistros = beneficiarios.length;
    const percentualIntegridade = totalRegistros > 0
      ? ((totalRegistros - registrosComDataInvalida) / totalRegistros) * 100
      : 0;

    let statusBase = {
      classe: "atualizada",
      icone: "●",
      titulo: "Base no ciclo semanal",
      texto: idadeBaseDias === 0 ? "atualizada hoje" : `há ${idadeBaseDias} dia${idadeBaseDias === 1 ? "" : "s"}`,
    };

    if (idadeBaseDias === null) {
      statusBase = {
        classe: "sem-data",
        icone: "●",
        titulo: "Data não identificada",
        texto: "verifique a coluna de inclusão",
      };
    } else if (idadeBaseDias > 10) {
      statusBase = {
        classe: "defasada",
        icone: "●",
        titulo: "Base desatualizada",
        texto: `há ${idadeBaseDias} dias`,
      };
    } else if (idadeBaseDias > 7) {
      statusBase = {
        classe: "atencao",
        icone: "●",
        titulo: "Atualização pendente",
        texto: `há ${idadeBaseDias} dias`,
      };
    }

    return {
      totalVidas,
      totalEstados,
      municipios,
      empresas,
      estadosPara80,
      concentracao,
      status,
      lider,
      atualizacao: dataMaisRecente ? dataMaisRecente.toLocaleDateString("pt-BR") : "Não informada",
      primeiraData: dataMaisAntiga ? dataMaisAntiga.toLocaleDateString("pt-BR") : "Não informada",
      idadeBaseDias,
      statusBase,
      totalRegistros,
      registrosValidos: totalRegistros - registrosComDataInvalida,
      registrosComDataInvalida,
      percentualIntegridade,
    };
  }, [
    totalCarteiraNacional,
    estadosCarteiraOrdenados,
    beneficiariosFiltrados,
    beneficiarios,
    analiseCrescimento,
    resumoRegioes,
  ]);

  const leituraEstrategica = useMemo(() => {
    const variacao = analiseCrescimento.variacaoPercentual;
    const atual = analiseCrescimento.totalInclusoes;
    const anterior = analiseCrescimento.totalAnterior;
    const concentracao = analiseCrescimento.concentracaoTop4;
    const liderVolume = analiseCrescimento.maiorCrescimento;
    const liderTaxa = analiseCrescimento.maiorTaxa;
    const destaque = analiseCrescimento.estadoDestaque;

    let diagnostico = "Ritmo estável";
    let classe = "estavel";
    let selo = "Estabilidade";
    let leituraVariacao = "Volume semelhante ao período anterior";

    if (variacao === null) {
      diagnostico = "Novo volume no período";
      classe = "positiva";
      selo = "Nova base";
      leituraVariacao = "Não há período anterior comparável";
    } else if (variacao > 5) {
      diagnostico = "Ritmo de inclusões em alta";
      classe = "positiva";
      selo = "Expansão";
      leituraVariacao = `${variacao.toFixed(1)}% acima do período anterior`;
    } else if (variacao < -5) {
      diagnostico = "Ritmo de inclusões em queda";
      classe = "atencao";
      selo = "Atenção";
      leituraVariacao = `${Math.abs(variacao).toFixed(1)}% abaixo do período anterior`;
    }

    const comparacaoCurta = variacao === null
      ? `${atual.toLocaleString("pt-BR")} inclusões no período`
      : `${atual.toLocaleString("pt-BR")} atuais vs. ${anterior.toLocaleString("pt-BR")} anteriores`;

    let alertaTitulo = "Distribuição equilibrada";
    let alertaTexto = "As novas vidas estão distribuídas sem concentração crítica entre os estados líderes.";
    let alertaClasse = "informacao";

    if (concentracao >= 80) {
      alertaTitulo = "Crescimento altamente concentrado";
      alertaTexto = `${concentracao.toFixed(1)}% das inclusões estão nos quatro locais líderes.`;
      alertaClasse = "atencao";
    } else if (concentracao >= 65) {
      alertaTitulo = "Crescimento concentrado";
      alertaTexto = `${concentracao.toFixed(1)}% das inclusões estão nos quatro locais líderes.`;
      alertaClasse = "moderada";
    }

    let recomendacaoTitulo = "Manter acompanhamento";
    let recomendacao = "Acompanhar a evolução regional e revisar o indicador no próximo fechamento.";

    if (variacao !== null && variacao < -5) {
      recomendacaoTitulo = "Investigar a desaceleração";
      recomendacao = destaque
        ? `Validar a queda fora de ${destaque.uf} e priorizar os estados que mais perderam ritmo frente ao período anterior.`
        : "Identificar os estados responsáveis pela retração e revisar os fatores comerciais e cadastrais do período.";
    } else if (concentracao >= 70) {
      recomendacaoTitulo = "Diversificar novas inclusões";
      recomendacao = liderVolume
        ? `Preservar o desempenho de ${liderVolume.regiao}, mas estimular entradas nas regiões com menor participação para reduzir dependência.`
        : "Estimular entradas fora dos quatro estados líderes para reduzir a dependência do crescimento concentrado.";
    } else if (liderTaxa) {
      recomendacaoTitulo = `Replicar o avanço de ${liderTaxa.regiao}`;
      recomendacao = `Avaliar os fatores que sustentam a expansão proporcional de ${liderTaxa.regiao} (${liderTaxa.taxa.toFixed(1)}%) e replicar as ações com melhor resultado.`;
    }

    const resumo = `${diagnostico}: ${comparacaoCurta}. ${liderVolume ? `${liderVolume.regiao} lidera o volume` : "Sem liderança regional definida"}${destaque ? ` e ${destaque.uf} é o estado destaque` : ""}.`;

    return {
      diagnostico,
      classe,
      selo,
      leituraVariacao,
      comparacaoCurta,
      recomendacaoTitulo,
      recomendacao,
      resumo,
      concentracao,
      alertaTitulo,
      alertaTexto,
      alertaClasse,
      liderVolume,
      liderTaxa,
      destaque,
      atual,
      anterior,
      variacao,
    };
  }, [analiseCrescimento]);

  const resumoFiltro = useMemo(() => {
    const totalFiltrado = estadosFiltrados.reduce(
      (total, item) => total + (Number(item.quantidade) || 0),
      0
    );
    const lider = estadosFiltrados[0] || null;
    const participacao =
      totalNacional > 0 ? (totalFiltrado / totalNacional) * 100 : 0;
    const media =
      estadosFiltrados.length > 0
        ? totalFiltrado / estadosFiltrados.length
        : 0;

    return {
      totalFiltrado,
      lider,
      participacao,
      media,
    };
  }, [estadosFiltrados, totalNacional]);

  const focoMapa = useMemo(() => {
    const termo = buscaEstado.trim().toUpperCase();

    if (estadosFiltrados.length === 1) {
      const uf = estadosFiltrados[0].local;
      return {
        center: FOCO_POR_UF[uf],
        zoom: 2.9,
        descricao: `UF ${uf}`,
      };
    }

    if (regiaoSelecionada !== "Todas" && FOCO_POR_REGIAO[regiaoSelecionada]) {
      return {
        ...FOCO_POR_REGIAO[regiaoSelecionada],
        descricao: regiaoSelecionada,
      };
    }

    if (termo && estadosFiltrados.length > 1) {
      return { center: undefined, zoom: 1.08, descricao: `${estadosFiltrados.length} UFs` };
    }

    return { center: undefined, zoom: 1, descricao: "Brasil" };
  }, [buscaEstado, estadosFiltrados, regiaoSelecionada]);

  const optionMunicipal = useMemo(() => {
    if (estadoSelecionado === "Todos" || !mapaMunicipalCarregado) return null;

    const nomeMapa = `municipios-${estadoSelecionado}`;
    const totalMunicipal = dadosMunicipiosMapa.reduce(
      (total, item) => total + (Number(item.quantidade) || 0),
      0
    );
    const maiorMunicipio = Math.max(
      1,
      ...dadosMunicipiosMapa.map((item) => Number(item.quantidade) || 0)
    );
    const porNome = new Map(
      dadosMunicipiosMapa.map((item) => [normalizarLocal(item.local), item])
    );
    const mapaRegistrado = echarts.getMap(nomeMapa);
    const nomesMapa = (mapaRegistrado?.geoJSON?.features || mapaRegistrado?.geoJson?.features || []).map(
      (feature) => feature?.properties?.name
    );
    const data = nomesMapa.map((nome) => {
      const item = porNome.get(normalizarLocal(nome));
      return {
        name: nome,
        value: Number(item?.quantidade || 0),
        quantidadeReal: Number(item?.quantidade || 0),
      };
    });

    return {
      animationDuration: 650,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: temaEscuro ? "#0f172a" : "#ffffff",
        borderColor: temaEscuro ? "#334155" : "#cbd5e1",
        textStyle: { color: temaEscuro ? "#e2e8f0" : "#0f172a" },
        formatter: (parametros) => {
          const quantidade = Number(parametros.data?.quantidadeReal || 0);
          const participacao = totalMunicipal > 0
            ? (quantidade / totalMunicipal) * 100
            : 0;
          return [
            `<strong>${parametros.name}</strong>`,
            `${quantidade.toLocaleString("pt-BR")} beneficiários`,
            quantidade > 0 ? `${participacao.toFixed(1)}% do estado` : "Sem beneficiários na seleção",
          ].join("<br/>");
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: maiorMunicipio,
        inRange: {
          color: temaEscuro
            ? ["#1e3a5f", "#2563eb", "#60a5fa"]
            : ["#dbeafe", "#60a5fa", "#1d4ed8"],
        },
        outOfRange: { color: temaEscuro ? "#243247" : "#e2e8f0" },
      },
      series: [
        {
          name: "Beneficiários por município",
          type: "map",
          map: nomeMapa,
          roam: true,
          scaleLimit: { min: 0.8, max: 8 },
          data,
          label: {
            show: dadosMunicipiosMapa.length <= 25,
            color: temaEscuro ? "#e2e8f0" : "#334155",
            fontSize: 9,
            fontWeight: 700,
            formatter: (parametros) =>
              Number(parametros.data?.quantidadeReal || 0) > 0
                ? parametros.name
                : "",
          },
          itemStyle: {
            areaColor: temaEscuro ? "#243247" : "#e2e8f0",
            borderColor: temaEscuro ? "#0f172a" : "#ffffff",
            borderWidth: 0.8,
          },
          emphasis: {
            label: { show: true, color: "#ffffff", fontWeight: 800 },
            itemStyle: {
              areaColor: "#0f766e",
              borderColor: "#ffffff",
              borderWidth: 1.3,
            },
          },
        },
      ],
    };
  }, [
    estadoSelecionado,
    mapaMunicipalCarregado,
    dadosMunicipiosMapa,
    temaEscuro,
  ]);

  const option = useMemo(() => {
    const corTexto = temaEscuro ? "#e2e8f0" : "#334155";
    const corBorda = temaEscuro ? "#0f172a" : "#ffffff";
    const corSemDados = temaEscuro ? "#243247" : "#e2e8f0";
    const corForaDoFiltro = temaEscuro ? "#182334" : "#eef2f7";

    return {
      animationDuration: 700,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: temaEscuro ? "#0f172a" : "#ffffff",
        borderColor: temaEscuro ? "#334155" : "#cbd5e1",
        textStyle: { color: temaEscuro ? "#e2e8f0" : "#0f172a" },
        formatter: (parametros) => {
          const quantidade = Number(
            parametros.data?.quantidadeReal ?? parametros.value ?? 0
          );
          const dentroDoFiltro = parametros.data?.dentroDoFiltro !== false;
          const participacao = totalNacional > 0 ? (quantidade / totalNacional) * 100 : 0;
          const variacao = parametros.data?.variacao;
          const valorPrincipal = modoMapa === "participacao"
            ? `${quantidade.toFixed(1)}% da carteira`
            : modoMapa === "variacao"
              ? `${quantidade > 0 ? "+" : ""}${quantidade.toLocaleString("pt-BR")} inclusões`
              : `${quantidade.toLocaleString("pt-BR")} ${modoMapa === "inclusoes" ? "inclusões" : "beneficiários"}`;

          return [
            `<strong>${parametros.name}</strong>`,
            valorPrincipal,
            modoMapa === "variacao" && variacao ? `Atual: ${variacao.atual.toLocaleString("pt-BR")} · Anterior: ${variacao.anterior.toLocaleString("pt-BR")}` : "",
            modoMapa === "variacao" && variacao ? (variacao.percentual === null ? "Novo volume no período" : `${variacao.percentual >= 0 ? "+" : ""}${variacao.percentual.toFixed(1)}%`) : "",
            modoMapa !== "participacao" && modoMapa !== "variacao" && quantidade > 0 ? `${participacao.toFixed(1)}% do total exibido` : "",
            REGIAO_POR_UF[parametros.name] || "Região não identificada",
            filtroVisualAtivo && !dentroDoFiltro ? "Fora do filtro atual" : "",
          ].filter(Boolean).join("<br/>");
        },
      },
      visualMap: {
        show: false,
        min: modoMapa === "variacao" ? -maiorQuantidade : 0,
        max: maiorQuantidade,
        inRange: {
          color: modoMapa === "variacao"
            ? (temaEscuro ? ["#ef4444", "#334155", "#22c55e"] : ["#dc2626", "#f1f5f9", "#16a34a"])
            : (temaEscuro
              ? ["#1e3a5f", "#2563eb", "#60a5fa"]
              : ["#dbeafe", "#60a5fa", "#1d4ed8"]),
        },
        outOfRange: { color: [corSemDados] },
      },
      series: [
        {
          name: "Beneficiários",
          type: "map",
          map: "brasil-ufs",
          roam: false,
          selectedMode: false,
          layoutCenter: focoMapa.center ? undefined : ["50%", "52%"],
          layoutSize: focoMapa.center ? undefined : "98%",
          center: focoMapa.center,
          zoom: focoMapa.zoom,
          data: dadosMapa.map((item) => {
            const dentroDoFiltro =
              !filtroVisualAtivo || ufsVisiveisNoMapa.has(item.local);

            return {
              name: item.local,
              value: dentroDoFiltro ? item.quantidade : null,
              quantidadeReal: item.quantidade,
              variacao: item.variacao,
              carteira: item.carteira,
              dentroDoFiltro,
              itemStyle: dentroDoFiltro
                ? undefined
                : {
                    areaColor: corForaDoFiltro,
                    opacity: temaEscuro ? 0.42 : 0.72,
                  },
              label: dentroDoFiltro
                ? undefined
                : {
                    color: temaEscuro ? "#64748b" : "#94a3b8",
                    opacity: 0.7,
                  },
            };
          }),
          label: {
            show: true,
            color: corTexto,
            fontSize: 10,
            fontWeight: 700,
          },
          itemStyle: {
            areaColor: corSemDados,
            borderColor: corBorda,
            borderWidth: 1.15,
          },
          emphasis: {
            label: { show: true, color: "#ffffff", fontWeight: 800 },
            itemStyle: {
              areaColor: "#0f766e",
              borderColor: "#ffffff",
              borderWidth: 1.6,
              shadowBlur: 12,
              shadowColor: "rgba(15, 118, 110, 0.3)",
            },
          },
        },
      ],
    };
  }, [
    dadosMapa,
    filtroVisualAtivo,
    maiorQuantidade,
    temaEscuro,
    totalNacional,
    ufsVisiveisNoMapa,
    focoMapa,
    modoMapa,
  ]);

  const eventos = useMemo(
    () => ({
      click: (parametros) => {
        const quantidade = Number(
          parametros?.data?.quantidadeReal ?? parametros?.value ?? 0
        );
        const dentroDoFiltro = parametros?.data?.dentroDoFiltro !== false;

        const carteira = Number(parametros?.data?.carteira || 0);
        if (!parametros?.name || quantidade <= 0) return;

        if (estadoSelecionado !== "Todos") {
          setCidadeEmConsulta((cidadeAtual) =>
            normalizarLocal(cidadeAtual) === normalizarLocal(parametros.name) ? "" : parametros.name
          );
          return;
        }

        if ((modoMapa === "variacao" ? carteira <= 0 : quantidade <= 0) || !dentroDoFiltro) return;
        selecionarEstado({ local: parametros.name });
      },
    }),
    [selecionarEstado, modoMapa, estadoSelecionado]
  );

  if (exibirMapa && erroMapa) {
    return (
      <div className="mapa-brasil-estado mapa-brasil-erro" role="alert">
        <span aria-hidden="true">⚠️</span>
        <p>{erroMapa}</p>
      </div>
    );
  }

  if (exibirMapa && !mapaCarregado) {
    return (
      <div className="mapa-brasil-estado" aria-live="polite">
        <span className="mapa-brasil-spinner" aria-hidden="true" />
        <p>Carregando mapa do Brasil...</p>
      </div>
    );
  }

  if (exibirMapa && estadoSelecionado !== "Todos" && erroMapaMunicipal) {
    return (
      <div className="mapa-brasil-estado mapa-brasil-erro" role="alert">
        <span aria-hidden="true">⚠️</span>
        <p>{erroMapaMunicipal}</p>
      </div>
    );
  }

  if (exibirMapa && estadoSelecionado !== "Todos" && !mapaMunicipalCarregado) {
    return (
      <div className="mapa-brasil-estado" aria-live="polite">
        <span className="mapa-brasil-spinner" aria-hidden="true" />
        <p>Carregando municípios de {estadoSelecionado}...</p>
      </div>
    );
  }

  return (
    <div className="mapa-brasil-bloco">

      {exibirAnalises && exibirResumoExecutivo && (<>
      <section className="saude-carteira saude-carteira-enxuta" aria-label="Resumo estratégico da carteira">
        <div className="saude-carteira-status">
          <span className={`saude-status-indicador ${saudeCarteira.status.classe}`}>{saudeCarteira.status.icone}</span>
          <div>
            <small>Saúde da carteira</small>
            <strong>{saudeCarteira.status.texto}</strong>
          </div>
        </div>

        <div className="saude-carteira-kpi">
          <small>Carteira atual</small>
          <strong>{saudeCarteira.totalVidas.toLocaleString("pt-BR")}</strong>
          <span>vidas ativas</span>
        </div>

        <div className="saude-carteira-kpi">
          <small>Inclusões do período</small>
          <strong>+{analiseCrescimento.totalInclusoes.toLocaleString("pt-BR")}</strong>
          <span className={centralInsights.tendencia === "baixa" ? "tendencia-baixa" : "tendencia-alta"}>
            {analiseCrescimento.variacaoPercentual === null
              ? "novo volume"
              : `${analiseCrescimento.variacaoPercentual >= 0 ? "▲" : "▼"} ${Math.abs(analiseCrescimento.variacaoPercentual).toFixed(1)}% vs. anterior`}
          </span>
        </div>

        <div className="saude-carteira-kpi">
          <small>Presença territorial</small>
          <strong>{saudeCarteira.totalEstados.toLocaleString("pt-BR")} UFs</strong>
          <span>{saudeCarteira.municipios.toLocaleString("pt-BR")} municípios</span>
        </div>
      </section>

      </>)}

      {exibirMapa && (
      <div className="mapa-brasil-layout">
        <div className="mapa-brasil-principal">
        {estadoSelecionado === "Todos" && (<>
        <div className="mapa-modos" aria-label="Métrica exibida no mapa">
          <span>Analisar por</span>
          <div>
            <button type="button" className={modoMapa === "carteira" ? "ativo" : ""} onClick={() => setModoMapa("carteira")}>Carteira</button>
            <button type="button" className={modoMapa === "inclusoes" ? "ativo" : ""} onClick={() => setModoMapa("inclusoes")}>Inclusões</button>
            <button type="button" className={modoMapa === "participacao" ? "ativo" : ""} onClick={() => setModoMapa("participacao")}>Participação</button>
            <button type="button" className={modoMapa === "variacao" ? "ativo" : ""} onClick={() => setModoMapa("variacao")}>Variação</button>
          </div>
        </div>
        <div className="mapa-brasil-legenda" aria-label="Escala do mapa">
          <span>{modoMapa === "variacao" ? "Maior queda" : modoMapa === "inclusoes" ? "Menos inclusões" : modoMapa === "participacao" ? "Menor participação" : "Menos vidas"}</span>
          <strong aria-hidden="true" className={modoMapa === "variacao" ? "variacao" : ""} />
          <span>{modoMapa === "variacao" ? "Maior alta" : modoMapa === "inclusoes" ? "Mais inclusões" : modoMapa === "participacao" ? "Maior participação" : "Mais vidas"}</span>
        </div>
        </>)}

        <div className="grafico mapa-brasil-container">
          <EChart
            option={estadoSelecionado === "Todos" ? option : optionMunicipal}
            onEvents={eventos}
            className="mapa-brasil-echart"
          />
        </div>
      </div>

      {estadoSelecionado !== "Todos" && (
        <aside className="mapa-ranking mapa-ranking-municipios" aria-label={`Ranking de municípios de ${estadoSelecionado}`}>
          <div className="mapa-ranking-cabecalho">
            <span>Detalhamento estadual</span>
            <strong>Municípios de {estadoSelecionado}</strong>
            <small>
              {dadosMunicipiosMapa.length} municípios com beneficiários · {dadosMunicipiosMapa
                .reduce((total, item) => total + item.quantidade, 0)
                .toLocaleString("pt-BR")} vidas
            </small>
          </div>

          {resumoCidadeEmConsulta ? (
            <section className="mapa-cidade-consulta" aria-live="polite">
              <div className="mapa-cidade-consulta-cabecalho">
                <div><span>Município selecionado</span><strong>{resumoCidadeEmConsulta.cidade}</strong></div>
                <button type="button" onClick={() => setCidadeEmConsulta("")} aria-label="Fechar detalhes do município">×</button>
              </div>
              <div className="mapa-cidade-kpis">
                <span><strong>{resumoCidadeEmConsulta.total.toLocaleString("pt-BR")}</strong><small>beneficiários</small></span>
                <span><strong>{resumoCidadeEmConsulta.participacao.toFixed(1)}%</strong><small>do estado</small></span>
                <span><strong>{resumoCidadeEmConsulta.empresas.toLocaleString("pt-BR")}</strong><small>empresas</small></span>
                <span><strong>{resumoCidadeEmConsulta.idadeMedia === null ? "—" : resumoCidadeEmConsulta.idadeMedia.toFixed(1)}</strong><small>idade média</small></span>
              </div>
              {resumoCidadeEmConsulta.sexos.length > 0 && (
                <div className="mapa-cidade-sexo">
                  <small>Distribuição por sexo</small>
                  {resumoCidadeEmConsulta.sexos.map((item) => {
                    const percentual = resumoCidadeEmConsulta.total > 0 ? (item.quantidade / resumoCidadeEmConsulta.total) * 100 : 0;
                    return <span key={item.nome}><b>{item.nome}</b><i><em style={{ width: `${percentual}%` }} /></i><strong>{percentual.toFixed(1)}%</strong></span>;
                  })}
                </div>
              )}
            </section>
          ) : (
            <div className="mapa-ranking-resultado"><span>Clique em uma cidade para consultar seus indicadores</span></div>
          )}

          <div className="mapa-ranking-lista">
            {dadosMunicipiosMapa.map((item, indice) => {
              const maior = dadosMunicipiosMapa[0]?.quantidade || 1;
              const percentual = (item.quantidade / maior) * 100;
              const total = dadosMunicipiosMapa.reduce(
                (soma, cidade) => soma + cidade.quantidade,
                0
              );
              const participacao = total > 0 ? (item.quantidade / total) * 100 : 0;

              return (
                <button
                  key={item.local}
                  type="button"
                  onClick={() => setCidadeEmConsulta((cidadeAtual) => normalizarLocal(cidadeAtual) === normalizarLocal(item.local) ? "" : item.local)}
                  className={normalizarLocal(cidadeEmConsulta) === normalizarLocal(item.local) ? "ativo" : ""}
                  title={`Consultar indicadores de ${item.local}`}
                >
                  <span className="mapa-ranking-posicao">{indice + 1}º</span>
                  <span className="mapa-ranking-dados">
                    <span className="mapa-ranking-linha">
                      <strong>{item.local}</strong>
                      <b>{item.quantidade.toLocaleString("pt-BR")}</b>
                    </span>
                    <span className="mapa-ranking-barra">
                      <i style={{ width: `${percentual}%` }} />
                    </span>
                    <small>{participacao.toFixed(1)}% do estado</small>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      <aside className={`mapa-ranking ${estadoSelecionado !== "Todos" ? "mapa-ranking-oculto" : ""}`} aria-label="Ranking de estados">
        <div className="mapa-ranking-cabecalho">
          <span>Ranking nacional</span>
          <strong>{modoMapa === "variacao" ? "Ranking de variação" : modoMapa === "inclusoes" ? "Ranking de inclusões" : modoMapa === "participacao" ? "Ranking de participação" : "Ranking de estados"}</strong>
          <small>
            {estadosOrdenados.length} estados · {modoMapa === "variacao" ? "comparação com período anterior" : modoMapa === "participacao" ? "100% da carteira" : `${totalNacional.toLocaleString("pt-BR")} ${modoMapa === "inclusoes" ? "inclusões" : "vidas"}`}
          </small>
        </div>

        <div className="mapa-ranking-controles">
          <label className="mapa-ranking-busca">
            <span className="sr-only">Pesquisar estado</span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={buscaEstado}
              onChange={(evento) => setBuscaEstado(evento.target.value)}
              placeholder="Pesquisar UF"
              autoComplete="off"
            />
            {buscaEstado && (
              <button
                type="button"
                onClick={() => setBuscaEstado("")}
                aria-label="Limpar pesquisa de estado"
                title="Limpar pesquisa"
              >
                ×
              </button>
            )}
          </label>

          <label className="mapa-ranking-regiao">
            <span className="sr-only">Filtrar ranking por região</span>
            <select
              value={regiaoSelecionada}
              onChange={(evento) => setRegiaoSelecionada(evento.target.value)}
            >
              {REGIOES.map((regiao) => (
                <option key={regiao} value={regiao}>
                  {regiao === "Todas" ? "Todas as regiões" : regiao}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mapa-ranking-resultado">
          <span>
            {estadosFiltrados.length} {estadosFiltrados.length === 1 ? "estado" : "estados"}
          </span>
          {(buscaEstado || regiaoSelecionada !== "Todas") && (
            <button
              type="button"
              onClick={() => {
                setBuscaEstado("");
                setRegiaoSelecionada("Todas");
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {filtroVisualAtivo && (
          <>
            <div className="mapa-ranking-filtro-ativo mapa-ranking-foco" aria-live="polite">
              <span aria-hidden="true">⌖</span>
              <div>
                <strong>Foco automático: {focoMapa.descricao}</strong>
                <p>
                  O mapa aproxima e destaca {estadosFiltrados.length === 1 ? "a UF selecionada" : "os estados do filtro atual"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBuscaEstado("");
                  setRegiaoSelecionada("Todas");
                }}
              >
                Ver Brasil
              </button>
            </div>

            <div className="mapa-resumo-filtro" aria-label="Resumo executivo do filtro geográfico">
              <div>
                <span>Vidas no filtro</span>
                <strong>{resumoFiltro.totalFiltrado.toLocaleString("pt-BR")}</strong>
              </div>
              <div>
                <span>Participação</span>
                <strong>{resumoFiltro.participacao.toFixed(1)}%</strong>
              </div>
              <div>
                <span>UF líder</span>
                <strong>{resumoFiltro.lider?.local || "—"}</strong>
              </div>
              <div>
                <span>Média por UF</span>
                <strong>{Math.round(resumoFiltro.media).toLocaleString("pt-BR")}</strong>
              </div>
            </div>
          </>
        )}

        <div className="mapa-ranking-lista">
          {estadosFiltrados.map((item) => {
            const posicao = estadosOrdenados.findIndex(
              (estado) => estado.local === item.local
            ) + 1;
            const percentualBarra =
              maiorQuantidade > 0 ? (Math.abs(item.quantidade) / maiorQuantidade) * 100 : 0;
            const participacaoNacional =
              modoMapa === "variacao"
                ? item.variacao?.percentual
                : totalNacional > 0 ? (item.quantidade / totalNacional) * 100 : 0;

            return (
              <button
                key={item.local}
                type="button"
                onClick={() => selecionarEstado({ local: item.local })}
                title={`Filtrar por ${item.local}`}
              >
                <span className="mapa-ranking-posicao">{posicao}º</span>

                <span className="mapa-ranking-dados">
                  <span className="mapa-ranking-linha">
                    <strong>{item.local}</strong>
                    <em>{modoMapa === "variacao" ? (participacaoNacional === null ? "novo" : `${participacaoNacional >= 0 ? "+" : ""}${participacaoNacional.toFixed(1)}%`) : `${participacaoNacional.toFixed(1)}%`}</em>
                  </span>
                  <small>
                    {modoMapa === "variacao" ? `${item.quantidade > 0 ? "+" : ""}${item.quantidade.toLocaleString("pt-BR")} · atual ${item.variacao.atual.toLocaleString("pt-BR")} / anterior ${item.variacao.anterior.toLocaleString("pt-BR")}` : modoMapa === "participacao" ? `${item.quantidade.toFixed(1)}% da carteira` : `${item.quantidade.toLocaleString("pt-BR")} ${modoMapa === "inclusoes" ? "inclusões" : "vidas"}`} · {REGIAO_POR_UF[item.local]}
                  </small>
                  <span className="mapa-ranking-barra" aria-hidden="true">
                    <i className={modoMapa === "variacao" ? (item.quantidade > 0 ? "alta" : item.quantidade < 0 ? "baixa" : "estavel") : ""} style={{ width: `${percentualBarra}%` }} />
                  </span>
                </span>
              </button>
            );
          })}

          {estadosFiltrados.length === 0 && (
            <div className="mapa-ranking-vazio">
              <span aria-hidden="true">⌕</span>
              <strong>Nenhum estado encontrado</strong>
              <p>Revise a UF ou o filtro de região.</p>
            </div>
          )}
        </div>
        </aside>
      </div>
      )}

      {exibirAnalises && (
      <section className="mapa-regioes-resumo" aria-label="Comparativo entre regiões">
        <div className="mapa-regioes-cabecalho">
          <div>
            <span>Visão regional</span>
            <strong>Comparativo de vidas por região</strong>
          </div>
          <small>{exibirMapa ? "Clique em uma região para focar o mapa e o ranking" : "Clique em uma região para destacar a leitura regional"}</small>
        </div>

        <div className="mapa-regioes-grid">
          {resumoRegioes.map((item) => {
            const ativa = regiaoSelecionada === item.regiao;

            return (
              <button
                key={item.regiao}
                type="button"
                className={ativa ? "ativo" : ""}
                onClick={() => {
                  setBuscaEstado("");
                  setRegiaoSelecionada(ativa ? "Todas" : item.regiao);
                }}
                aria-pressed={ativa}
              >
                <span className="mapa-regiao-topo">
                  <strong>{item.regiao}</strong>
                  <em>{item.participacao.toFixed(1)}%</em>
                </span>
                <span className="mapa-regiao-total">
                  {item.total.toLocaleString("pt-BR")} vidas
                </span>
                <span className="mapa-regiao-meta">
                  {item.quantidadeEstados} UFs · Líder {item.lider?.local || "—"}
                </span>
                <span className="mapa-regiao-barra" aria-hidden="true">
                  <i style={{ width: `${Math.min(item.participacao, 100)}%` }} />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mapa-regioes-insights" aria-label={analiseHierarquica.aria}>
          <div className="mapa-regioes-insights-cabecalho">
            <div>
              <span>Leitura executiva</span>
              <strong>{analiseHierarquica.titulo}</strong>
            </div>
            <small>Inclusões analisadas em {analiseCrescimento.periodoTexto}</small>
          </div>

          <div className="mapa-regioes-insights-grid">
            {insightsRegioes.map((insight) => (
              <article key={insight.rotulo} className="mapa-regiao-insight-card">
                <span className="mapa-regiao-insight-icone" aria-hidden="true">
                  {insight.icone}
                </span>
                <span className="mapa-regiao-insight-rotulo">{insight.rotulo}</span>
                <strong>{insight.valor}</strong>
                <p>{insight.detalhe}</p>
              </article>
            ))}
          </div>

          <section className="central-insights central-recomendacoes" aria-label="Central de recomendações">
            <div className="central-insights-cabecalho">
              <div>
                <span>Central de recomendações</span>
                <strong>Próximas ações sugeridas</strong>
              </div>
              <small>Orientações geradas a partir da seleção atual</small>
            </div>

            <div className="central-alertas-grid central-recomendacoes-grid">
              <article className={`central-alerta ${centralInsights.tendencia === "baixa" ? "baixa" : "alta"}`}>
                <span aria-hidden="true">1</span>
                <div>
                  <strong>{centralInsights.tendencia === "baixa" ? "Investigar a desaceleração" : "Sustentar o ritmo de expansão"}</strong>
                  <p>{centralInsights.tendencia === "baixa" ? "Identifique os locais que mais perderam ritmo frente ao período anterior." : "Priorize os locais que sustentaram o avanço da carteira."}</p>
                </div>
              </article>
              <article className={`central-alerta ${analiseCrescimento.concentracaoTop4 >= 60 ? "atencao" : "informacao"}`}>
                <span aria-hidden="true">2</span>
                <div>
                  <strong>{analiseCrescimento.concentracaoTop4 >= 60 ? "Reduzir concentração das entradas" : "Preservar a distribuição regional"}</strong>
                  <p>{analiseCrescimento.concentracaoTop4.toFixed(1)}% das inclusões estão nos quatro locais líderes.</p>
                </div>
              </article>
              <article className="central-alerta informacao">
                <span aria-hidden="true">3</span>
                <div>
                  <strong>{analiseHierarquica.recomendacao3}</strong>
                  <p>Direcione prospecção e ações comerciais para {analiseHierarquica.menorLocal}.</p>
                </div>
              </article>
              <article className="central-alerta informacao">
                <span aria-hidden="true">4</span>
                <div>
                  <strong>{analiseHierarquica.recomendacao4}</strong>
                  <p>Use {analiseHierarquica.referencia} como referência para identificar práticas de expansão replicáveis.</p>
                </div>
              </article>
            </div>
          </section>
        </div>
      </section>
      )}
    </div>
  );
}

// Regras de negócio compartilhadas pelo dashboard.
// Mesmas definições usadas nas análises em SQL e Python (pasta analises/).

function converterData(texto) {
  const partes = String(texto ?? "").trim().split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes.map(Number);
  const data = new Date(ano, mes - 1, dia);
  if (Number.isNaN(data.getTime()) || data.getDate() !== dia) return null;
  return data;
}

/* ------------------------------------------------------------------ */
/* Data de referência                                                  */
/* ------------------------------------------------------------------ */

// Todos os indicadores "atuais" usam a data de extração da base, e não a
// data de hoje: assim os números não mudam sozinhos com o passar do tempo.
export const DATA_REFERENCIA_PADRAO = "2026-08-31";

function criarData(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

let dataReferencia = criarData(DATA_REFERENCIA_PADRAO);

export function obterDataReferencia() {
  return new Date(dataReferencia.getTime());
}

export function obterDataReferenciaIso() {
  const d = dataReferencia;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function definirDataReferencia(iso) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) {
    dataReferencia = criarData(iso);
  }
}

export async function carregarDataReferencia() {
  try {
    const resposta = await fetch("/dashboard-config.json", { cache: "no-store" });
    if (!resposta.ok) return obterDataReferencia();
    const configuracao = await resposta.json();
    definirDataReferencia(configuracao?.dataExtracao);
  } catch {
    // Mantém a data padrão quando o arquivo de configuração não existe.
  }
  return obterDataReferencia();
}

/* ------------------------------------------------------------------ */
/* Faixas etárias da ANS                                               */
/* ------------------------------------------------------------------ */

export const FAIXAS_ANS = [
  "0 a 18",
  "19 a 23",
  "24 a 28",
  "29 a 33",
  "34 a 38",
  "39 a 43",
  "44 a 48",
  "49 a 53",
  "54 a 58",
  "59 ou mais",
];

const LIMITES_ANS = [18, 23, 28, 33, 38, 43, 48, 53, 58];

export function faixaEtariaANS(idadeTexto) {
  const idade = Number(String(idadeTexto ?? "").replace(",", "."));

  if (idadeTexto === "" || idadeTexto === null || idadeTexto === undefined ||
      !Number.isFinite(idade) || idade < 0 || idade > 120) {
    return "Não informado";
  }

  const indice = LIMITES_ANS.findIndex((limite) => idade <= limite);
  return FAIXAS_ANS[indice === -1 ? FAIXAS_ANS.length - 1 : indice];
}

/* ------------------------------------------------------------------ */
/* Motivos de cancelamento padronizados                                */
/* ------------------------------------------------------------------ */

// O sistema de origem corta o motivo em 20 caracteres e grava o mesmo
// motivo de formas diferentes. Este de-para (igual a analises/dados/
// mapa_motivos.csv) traduz para uma descrição legível e um grupo de negócio.
const MAPA_MOTIVOS = {
  "INADIMPLENCIA": ["Inadimplência", "Financeiro"],
  "DIFICULDADE FINANCEI": ["Dificuldade financeira", "Financeiro"],
  "CANCELAMENTO  DIFICU": ["Dificuldade financeira", "Financeiro"],
  "CANCELAMENTO DA COBR": ["Cancelamento da cobrança", "Financeiro"],
  "ROMPIMENTO DO CONTRA": ["Rompimento do contrato", "Rescisão do contrato"],
  "A PEDIDO DA EMPRESA": ["A pedido da empresa contratante", "Rescisão do contrato"],
  "DESLIGAMENTO DA EMPR": ["Desligamento da empresa (demissão)", "Rescisão do contrato"],
  "DAP - DEMITIDOS E AP": ["Demitidos e aposentados", "Rescisão do contrato"],
  "CNPJ BAIXADO NA RECE": ["CNPJ baixado na Receita", "Rescisão do contrato"],
  "NUMERO DE VIDAS REDU": ["Redução do número de vidas", "Rescisão do contrato"],
  "FINALIZAÇÃO DA MANUT": ["Fim do período de manutenção", "Rescisão do contrato"],
  "CANCELAMENTO INSATIS": ["Insatisfação", "Insatisfação"],
  "INSATISFACAO  - CANA": ["Insatisfação", "Insatisfação"],
  "CANCELAMENTO INDISPO": ["Indisponibilidade de rede/serviço", "Insatisfação"],
  "CANCELAMENTO NAO UTI": ["Não utilização do plano", "Não utilização"],
  "DESISTENCIA DENTRO D": ["Desistência no prazo", "Desistência"],
  "DESISTÊNCIA-NÃO ACEI": ["Desistência (não aceite)", "Desistência"],
  "PORTABILIDADE": ["Portabilidade para outra operadora", "Portabilidade"],
  "MUDANÇA DE ENDEREÇO": ["Mudança de endereço", "Mudança de região"],
  "MUDANCA PARA REGIAO": ["Mudança para região sem cobertura", "Mudança de região"],
  "MUDOU PARA OUTRO PAÍ": ["Mudança para outro país", "Mudança de região"],
  "CANCELAMENTO FALECIM": ["Falecimento", "Falecimento"],
  "CANCELAMENTO  ¿ FALE": ["Falecimento", "Falecimento"],
  "FALECIDO": ["Falecimento", "Falecimento"],
  "MIGRADO": ["Migração de contrato", "Migração"],
  "MIGRACAO DE CONTRATO": ["Migração de contrato", "Migração"],
  "MIGRAÇÃO PF PARA PJ": ["Migração de PF para PJ", "Migração"],
  "MUDANÇA DE PLANO PJ": ["Mudança de plano", "Migração"],
  "ALTERAÇAO DO PLANO D": ["Alteração de plano", "Migração"],
  "GERACAO INDEVIDA": ["Cadastro gerado indevidamente", "Erro cadastral"],
  "CADASTRO DUPLICADO": ["Cadastro duplicado", "Erro cadastral"],
  "ALTERACAO DE DATA DE": ["Alteração de data", "Erro cadastral"],
  "INEGEBILIDADE": ["Inelegibilidade", "Elegibilidade"],
  "COMPLETOU MAIORIDADE": ["Perda de elegibilidade (maioridade)", "Elegibilidade"],
  "OUTROS MOTIVOS": ["Outros motivos", "Outros"]
};

export function padronizarMotivo(motivoBruto) {
  const chave = String(motivoBruto ?? "").trim();
  if (!chave) return { descricao: "Sem motivo informado", grupo: "Sem motivo" };
  const [descricao, grupo] = MAPA_MOTIVOS[chave] || [chave, "Não mapeado"];
  return { descricao, grupo };
}

/* ------------------------------------------------------------------ */
/* Classificação dos registros                                         */
/* ------------------------------------------------------------------ */

export function extrairSegmento(plano) {
  const encontrado = String(plano ?? "").match(/^VERTICE \S+ (\S+)/);
  const segmento = encontrado ? encontrado[1] : "OUTROS";
  const nomes = { ADESAO: "Adesão", PME: "PME", EMPRESARIAL: "Empresarial", INDIVIDUAL: "Individual" };
  return nomes[segmento] || "Outros";
}

// Base válida: exclui o que não representa um cliente real na carteira.
// Perda: cancelamento real. Migração (troca de contrato) é contada à parte.
export function classificarRegistro(beneficiario) {
  const situacao = String(beneficiario["Situação"] ?? "").trim().toLocaleUpperCase("pt-BR");
  const inclusao = converterData(beneficiario["Data de Inclusão"]);
  const cancelamento = converterData(beneficiario["Data de cancelamento"] || beneficiario["Data de Cancelamento"]);
  const { grupo } = padronizarMotivo(beneficiario["Motivo do cancelamento"]);

  const emDigitacao = situacao === "DIGITAÇÃO" || situacao === "DIGITACAO";
  const datasInconsistentes = Boolean(inclusao && cancelamento && cancelamento < inclusao);
  const erroCadastral = grupo === "Erro cadastral";
  const baseValida = Boolean(inclusao) && !emDigitacao && !datasInconsistentes && !erroCadastral;
  const migracao = situacao === "MIGRADO" || grupo === "Migração";

  return {
    inclusao,
    cancelamento,
    grupo,
    emDigitacao,
    datasInconsistentes,
    erroCadastral,
    baseValida,
    migracao,
    perda: baseValida && Boolean(cancelamento) && !migracao,
  };
}

/* ------------------------------------------------------------------ */
/* Análise de retenção                                                 */
/* ------------------------------------------------------------------ */

const NOMES_MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const indiceMes = (data) => data.getFullYear() * 12 + data.getMonth();
const rotuloMes = (indice) => `${NOMES_MESES[indice % 12]}/${String(Math.floor(indice / 12)).slice(2)}`;
const somarMeses = (data, meses) => {
  const resultado = new Date(data.getFullYear(), data.getMonth() + meses, data.getDate());
  // Ajuste de fim de mês (ex.: 31/01 + 1 mês = 28/02 ou 29/02)
  if (resultado.getDate() !== data.getDate()) resultado.setDate(0);
  return resultado;
};
const mediana = (valores) => {
  if (!valores.length) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
};

export const PRAZOS_RETENCAO = [1, 3, 6, 12, 18];

export function analisarRetencao(registros, opcoes = {}) {
  const referencia = opcoes.dataReferencia || obterDataReferencia();
  const mesInicial = opcoes.mesInicial ?? indiceMes(new Date(2024, 0, 1));
  const mesInicialCoortes = opcoes.mesInicialCoortes ?? indiceMes(new Date(2024, 6, 1));
  const tamanhoMinimoSafra = opcoes.tamanhoMinimoSafra ?? 300;
  const mesFinal = indiceMes(referencia);
  const totalMeses = mesFinal - mesInicial + 1;

  const entradasAntes = new Array(totalMeses + 1).fill(0);
  const saidasAntes = new Array(totalMeses + 1).fill(0);
  const entradas = new Array(totalMeses).fill(0);
  const perdas = new Array(totalMeses).fill(0);
  const migracoes = new Array(totalMeses).fill(0);
  const brutasPorMes = new Array(totalMeses).fill(0);
  const descartadasPorMes = new Array(totalMeses).fill(0);

  const safras = new Map();
  const permanenciaPorSegmento = new Map();
  const perdasPorGrupo = new Map();

  const qualidade = {
    total: 0,
    emDigitacao: 0,
    erroCadastral: 0,
    datasInconsistentes: 0,
    semUf: 0,
    foraDaBase: 0,
  };

  // posição de um mês no vetor, "presa" aos limites (meses anteriores contam no início)
  const posicao = (mes) => Math.min(Math.max(mes - mesInicial, 0), totalMeses);

  registros.forEach((beneficiario) => {
    const r = classificarRegistro(beneficiario);
    qualidade.total += 1;
    if (r.emDigitacao) qualidade.emDigitacao += 1;
    if (r.erroCadastral) qualidade.erroCadastral += 1;
    if (r.datasInconsistentes) qualidade.datasInconsistentes += 1;
    const uf = String(beneficiario["Estado de correspondência"] ?? "").trim();
    if (!uf || uf === "SEM ESTADO REGISTRADO") qualidade.semUf += 1;

    if (!r.inclusao || r.inclusao > referencia) return;
    const mesInclusao = indiceMes(r.inclusao);
    if (mesInclusao >= mesInicial) {
      brutasPorMes[mesInclusao - mesInicial] += 1;
      if (!r.baseValida) descartadasPorMes[mesInclusao - mesInicial] += 1;
    }

    if (!r.baseValida) {
      qualidade.foraDaBase += 1;
      return;
    }

    // Estoque: quem entrou antes do início do mês m e não saiu antes dele
    entradasAntes[posicao(mesInclusao + 1)] += 1;
    if (mesInclusao >= mesInicial) entradas[mesInclusao - mesInicial] += 1;

    if (r.cancelamento && r.cancelamento <= referencia) {
      const mesSaida = indiceMes(r.cancelamento);
      saidasAntes[posicao(mesSaida + 1)] += 1;
      if (mesSaida >= mesInicial) {
        if (r.perda) perdas[mesSaida - mesInicial] += 1;
        else migracoes[mesSaida - mesInicial] += 1;
      }
    }

    if (r.perda) {
      const meses = (r.cancelamento - r.inclusao) / (86400000 * 30.4375);
      const segmento = extrairSegmento(beneficiario["Descrição do plano"]);
      if (!permanenciaPorSegmento.has(segmento)) permanenciaPorSegmento.set(segmento, []);
      permanenciaPorSegmento.get(segmento).push(meses);
      if (!perdasPorGrupo.has(r.grupo)) perdasPorGrupo.set(r.grupo, []);
      perdasPorGrupo.get(r.grupo).push(meses);
    }

    // Coortes: migrados ficam fora do cálculo de retenção
    if (!r.migracao && mesInclusao >= mesInicialCoortes) {
      if (!safras.has(mesInclusao)) {
        safras.set(mesInclusao, { vidas: 0, elegiveis: PRAZOS_RETENCAO.map(() => 0), retidas: PRAZOS_RETENCAO.map(() => 0) });
      }
      const safra = safras.get(mesInclusao);
      safra.vidas += 1;
      PRAZOS_RETENCAO.forEach((prazo, i) => {
        const marco = somarMeses(r.inclusao, prazo);
        if (marco > referencia) return;
        safra.elegiveis[i] += 1;
        if (!r.cancelamento || r.cancelamento >= marco) safra.retidas[i] += 1;
      });
    }
  });

  // Acumula para obter o estoque no 1º dia de cada mês
  for (let i = 1; i <= totalMeses; i += 1) {
    entradasAntes[i] += entradasAntes[i - 1];
    saidasAntes[i] += saidasAntes[i - 1];
  }

  const movimento = Array.from({ length: totalMeses }, (_, i) => {
    const ativosInicio = entradasAntes[i] - saidasAntes[i];
    return {
      mes: rotuloMes(mesInicial + i),
      ativosInicio,
      entradas: entradas[i],
      perdas: perdas[i],
      migracoes: migracoes[i],
      saldo: entradas[i] - perdas[i] - migracoes[i],
      churn: ativosInicio > 0 ? (100 * perdas[i]) / ativosInicio : null,
      entradasBrutas: brutasPorMes[i],
      entradasDescartadas: descartadasPorMes[i],
    };
  });

  // Alerta: churn acima de 2x a mediana dos 12 meses anteriores
  movimento.forEach((mes, i) => {
    const anteriores = movimento.slice(Math.max(0, i - 12), i).map((m) => m.churn).filter((v) => v !== null);
    const base = anteriores.length >= 6 ? mediana(anteriores) : null;
    mes.churnMediano12m = base;
    mes.alerta = base !== null && mes.churn !== null && mes.churn > 2 * base;
    mes.perdasExcedentes = mes.alerta ? Math.round(mes.perdas - (mes.ativosInicio * base) / 100) : 0;
  });

  const coortes = [...safras.entries()]
    .sort((a, b) => a[0] - b[0])
    .filter(([, s]) => s.vidas >= tamanhoMinimoSafra && s.elegiveis[0] > 0)
    .map(([mes, s]) => ({
      safra: rotuloMes(mes),
      vidas: s.vidas,
      retencao: PRAZOS_RETENCAO.map((_, i) => (s.elegiveis[i] > 0 ? (100 * s.retidas[i]) / s.elegiveis[i] : null)),
    }));

  const curvaRetencao = PRAZOS_RETENCAO.map((prazo, i) => {
    let elegiveis = 0;
    let retidas = 0;
    safras.forEach((s) => { elegiveis += s.elegiveis[i]; retidas += s.retidas[i]; });
    return { prazo, retencao: elegiveis > 0 ? (100 * retidas) / elegiveis : null };
  });

  const resumirPermanencia = (mapa) => [...mapa.entries()]
    .map(([nome, meses]) => ({
      nome,
      perdas: meses.length,
      mediana: mediana(meses),
      saiAntes3m: (100 * meses.filter((m) => m < 3).length) / meses.length,
    }))
    .sort((a, b) => b.perdas - a.perdas);

  const ultimos12 = movimento.slice(-12).filter((m) => m.churn !== null);

  return {
    movimento,
    coortes,
    curvaRetencao,
    permanenciaPorSegmento: resumirPermanencia(permanenciaPorSegmento),
    perdasPorGrupo: resumirPermanencia(perdasPorGrupo),
    qualidade,
    resumo: {
      churnUltimoMes: movimento.at(-1)?.churn ?? null,
      churnMedio12m: ultimos12.length ? ultimos12.reduce((s, m) => s + m.churn, 0) / ultimos12.length : null,
      retencao6m: curvaRetencao.find((c) => c.prazo === 6)?.retencao ?? null,
      retencao12m: curvaRetencao.find((c) => c.prazo === 12)?.retencao ?? null,
      mesesEmAlerta: movimento.filter((m) => m.alerta).map((m) => m.mes),
      perdasExcedentes: movimento.reduce((s, m) => s + m.perdasExcedentes, 0),
    },
  };
}

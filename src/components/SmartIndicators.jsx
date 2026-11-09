import { memo, useMemo } from "react";
import { getAnalysisContext, getLocationValue } from "../utils/analysisContext";
import { empresaValidaParaAnalise } from "../utils/dashboard";

function clamp(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function normalizarSexo(beneficiario) {
  const bruto = String(
    beneficiario["Sexo"] ??
      beneficiario["Gênero"] ??
      beneficiario["Genero"] ??
      beneficiario["Sexo do beneficiário"] ??
      beneficiario["Sexo do Beneficiário"] ??
      ""
  )
    .trim()
    .toLocaleUpperCase("pt-BR");

  if (bruto === "M" || bruto.startsWith("MASC")) return "Masculino";
  if (bruto === "F" || bruto.startsWith("FEM")) return "Feminino";
  return "Não informado";
}

function classificarPontuacao(pontos) {
  if (pontos >= 85) return { texto: "Excelente", classe: "excelente" };
  if (pontos >= 70) return { texto: "Boa", classe: "boa" };
  if (pontos >= 50) return { texto: "Atenção", classe: "atencao" };
  return { texto: "Crítica", classe: "critica" };
}

function formatarVariacao(valor) {
  if (valor === null || !Number.isFinite(valor)) return "Sem comparação";
  return `${valor >= 0 ? "+" : "−"}${Math.abs(valor).toFixed(1)}%`;
}

function SmartIndicators({ dashboard }) {
  const {
    carregando,
    erro,
    periodoInvalido,
    beneficiariosFiltrados,
    historicoCarteira,
    historicoTemporal,
  } = dashboard;
  const context = getAnalysisContext(dashboard);

  const diagnostico = useMemo(() => {
    const base = beneficiariosFiltrados || [];
    const total = base.length;
    if (!total) return null;

    const locais = new Map();
    const cidades = new Set();
    const empresas = new Map();
    const sexos = new Map();

    base.forEach((beneficiario) => {
      const estado = String(beneficiario["Estado de correspondência"] || "Não informado").trim();
      const cidade = String(beneficiario["Cidade de correspondência"] || "").trim();
      const local = getLocationValue(beneficiario, context);
      const empresa = String(beneficiario["Empresa"] || "Não informado").trim();
      const sexo = normalizarSexo(beneficiario);

      locais.set(local, (locais.get(local) || 0) + 1);
      if (empresaValidaParaAnalise(empresa)) {
        empresas.set(empresa, (empresas.get(empresa) || 0) + 1);
      }
      sexos.set(sexo, (sexos.get(sexo) || 0) + 1);
      if (cidade) cidades.add(`${estado}::${cidade}`);
    });

    const ordenar = (mapa) => [...mapa.entries()].sort((a, b) => b[1] - a[1]);
    const rankingLocais = ordenar(locais);
    const rankingEmpresas = ordenar(empresas);
    const rankingSexos = ordenar(sexos).filter(([nome]) => nome !== "Não informado");

    const participacaoLocalLider = ((rankingLocais[0]?.[1] || 0) / total) * 100;
    const totalEmpresarial = rankingEmpresas.reduce((soma, [, quantidade]) => soma + quantidade, 0);
    const participacaoEmpresaLider = totalEmpresarial > 0
      ? ((rankingEmpresas[0]?.[1] || 0) / totalEmpresarial) * 100
      : 0;
    const participacaoTop5Empresas = totalEmpresarial > 0
      ? (rankingEmpresas.slice(0, 5).reduce((soma, [, quantidade]) => soma + quantidade, 0) / totalEmpresarial) * 100
      : 0;

    const sexosInformados = rankingSexos.reduce((soma, [, quantidade]) => soma + quantidade, 0);
    const participacaoSexoLider = sexosInformados
      ? ((rankingSexos[0]?.[1] || 0) / sexosInformados) * 100
      : 50;
    const desequilibrioSexo = Math.abs(participacaoSexoLider - 50);

    const historico = historicoTemporal || historicoCarteira || [];
    const ultimo = historico.at(-1)?.vidasAtivas;
    const referencia = historico.length >= 4
      ? historico.at(-4)?.vidasAtivas
      : historico.at(0)?.vidasAtivas;
    const variacao =
      Number.isFinite(ultimo) && Number.isFinite(referencia) && referencia > 0
        ? ((ultimo - referencia) / referencia) * 100
        : null;

    const crescimentoScore = variacao === null
      ? 65
      : clamp(55 + variacao * 3, 20, 100);
    const regionalScore = context.level === "municipio" ? 100 : clamp(105 - participacaoLocalLider, 20, 100);
    const empresarialScore = clamp(105 - participacaoTop5Empresas, 15, 100);
    const demograficoScore = clamp(100 - desequilibrioSexo * 2.4, 35, 100);
    const coberturaScore = clamp(
      context.level === "brasil"
        ? 35 + Math.min(locais.size, 10) * 4 + Math.min(cidades.size, 35) * 1.1
        : context.level === "estado"
          ? 40 + Math.min(locais.size, 35) * 1.7
          : 100,
      25,
      100
    );

    const indicadores = [
      {
        titulo: context.level === "brasil" ? "Diversificação estadual" : context.level === "estado" ? "Diversificação municipal" : "Representatividade local",
        icone: "◎",
        pontos: regionalScore,
        detalhe: context.level === "municipio" ? `${context.city} representa 100% do recorte geográfico` : `${rankingLocais[0]?.[0] || "—"} concentra ${participacaoLocalLider.toFixed(1)}% das vidas`,
      },
      {
        titulo: "Concentração empresarial",
        icone: "▦",
        pontos: empresarialScore,
        detalhe: `Top 5 empresas representam ${participacaoTop5Empresas.toFixed(1)}% da seleção`,
      },
      {
        titulo: "Equilíbrio demográfico",
        icone: "◐",
        pontos: demograficoScore,
        detalhe: rankingSexos.length
          ? `${rankingSexos[0][0]} representa ${participacaoSexoLider.toFixed(1)}% dos sexos informados`
          : "Sexo não informado na base atual",
      },
      {
        titulo: "Cobertura geográfica",
        icone: "⌖",
        pontos: coberturaScore,
        detalhe: context.level === "brasil" ? `${locais.size} UFs e ${cidades.size} municípios na seleção` : context.level === "estado" ? `${locais.size} municípios em ${context.state}` : `${context.city} é o município selecionado`,
      },
    ].map((item) => ({ ...item, status: classificarPontuacao(item.pontos) }));

    const indiceGeral = Math.round(
      regionalScore * 0.3 +
        empresarialScore * 0.3 +
        demograficoScore * 0.2 +
        coberturaScore * 0.2
    );

    return {
      indicadores,
      indiceGeral,
      statusGeral: classificarPontuacao(indiceGeral),
    };
  }, [beneficiariosFiltrados, historicoTemporal, historicoCarteira, context.level, context.state, context.city]);

  if (carregando || erro || periodoInvalido || !diagnostico) return null;

  return (
    <section className="indicadores-inteligentes" aria-label="Diagnóstico inteligente da carteira">
      <div className="indicadores-inteligentes-cabecalho">
        <div>
          <span className="indicadores-inteligentes-etiqueta">Qualidade estrutural</span>
          <h2>Qualidade da carteira</h2>
          <p>Diagnóstico de diversificação, concentração, demografia e cobertura.</p>
        </div>
        <div className={`indice-geral ${diagnostico.statusGeral.classe}`}>
          <span>Índice geral</span>
          <strong>{diagnostico.indiceGeral}<small>/100</small></strong>
          <b>{diagnostico.statusGeral.texto}</b>
        </div>
      </div>

      <div className="indicadores-inteligentes-grid">
        {diagnostico.indicadores.map((indicador) => (
          <article className={`indicador-inteligente-card ${indicador.status.classe}`} key={indicador.titulo}>
            <div className="indicador-inteligente-topo">
              <span className="indicador-inteligente-icone" aria-hidden="true">{indicador.icone}</span>
              <span className={`indicador-inteligente-status ${indicador.status.classe}`}>{indicador.status.texto}</span>
            </div>
            <h3>{indicador.titulo}</h3>
            <p>{indicador.detalhe}</p>
            <div className="indicador-inteligente-barra" aria-label={`${Math.round(indicador.pontos)} de 100`}>
              <span style={{ width: `${Math.round(indicador.pontos)}%` }} />
            </div>
            <small>{Math.round(indicador.pontos)} pontos</small>
          </article>
        ))}
      </div>

    </section>
  );
}

export default memo(SmartIndicators);

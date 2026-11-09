import { useMemo } from "react";
import NumeroAnimado from "./NumeroAnimado";

export default function ExecutiveKpiCards({ dashboard }) {
  const {
    carregando,
    erro,
    totalBeneficiarios,
    totalCidades,
    beneficiariosFiltrados,
    inclusoesUltimos30Dias,
    comparativoInclusoes,
    resumoHistorico,
  } = dashboard;

  const totalEstados = useMemo(() => {
    return new Set(
      (beneficiariosFiltrados || [])
        .map(
          (beneficiario) =>
            beneficiario["Estado de correspondência"] ||
            beneficiario["Estado de Correspondência"] ||
            beneficiario.Estado ||
            beneficiario.UF
        )
        .map((estado) => String(estado || "").trim())
        .filter(Boolean)
    ).size;
  }, [beneficiariosFiltrados]);

  const inclusoesHistoricas = resumoHistorico?.inclusoes || 0;
  const tendenciaInclusoes = comparativoInclusoes?.tendencia || "estavel";
  const textoComparativo =
    comparativoInclusoes?.texto || "Sem comparação com o período anterior";

  return (
    <section className="cards-container executive-kpi-cards" aria-label="Indicadores executivos da carteira">
      <article className="card">
        <div className="card-icone" aria-hidden="true">👥</div>
        <div className="card-conteudo">
          <h2>Beneficiários ativos</h2>
          {carregando && <p>Carregando...</p>}
          {!carregando && !erro && (
            <strong><NumeroAnimado valor={totalBeneficiarios} /></strong>
          )}
          <span className="card-legenda">Vidas ativas na seleção</span>
        </div>
      </article>

      <article className="card">
        <div className="card-icone" aria-hidden="true">📅</div>
        <div className="card-conteudo">
          <h2>Inclusões nos últimos 30 dias</h2>
          {!carregando && !erro && (
            <strong><NumeroAnimado valor={inclusoesUltimos30Dias} /></strong>
          )}
          <div className={`comparativo-inclusoes comparativo-${tendenciaInclusoes}`}>
            <span aria-hidden="true">
              {tendenciaInclusoes === "alta" && "▲"}
              {tendenciaInclusoes === "baixa" && "▼"}
              {tendenciaInclusoes === "estavel" && "●"}
            </span>
            <span>{textoComparativo}</span>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="card-icone" aria-hidden="true">🌎</div>
        <div className="card-conteudo">
          <h2>Presença territorial</h2>
          {!carregando && !erro && (
            <strong><NumeroAnimado valor={totalEstados} sufixo=" UFs" /></strong>
          )}
          <span className="card-legenda">
            {Number(totalCidades || 0).toLocaleString("pt-BR")} municípios
          </span>
        </div>
      </article>

      <article className="card">
        <div className="card-icone" aria-hidden="true">📈</div>
        <div className="card-conteudo">
          <h2>Inclusões históricas</h2>
          {!carregando && !erro && (
            <strong><NumeroAnimado valor={inclusoesHistoricas} /></strong>
          )}
          <span className="card-legenda">Acumulado desde o início da base</span>
        </div>
      </article>
    </section>
  );
}

const formatarInteiro = (valor) =>
  Math.abs(valor).toLocaleString("pt-BR");

const formatarPercentual = (valor) =>
  Number.isFinite(valor)
    ? `${valor >= 0 ? "+" : ""}${valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}%`
    : "—";

export default function HistoricalSummaryCards({ dashboard }) {
  const { resumoHistorico } = dashboard;

  const cards = [
    {
      titulo: "Inclusões históricas",
      valor: formatarInteiro(resumoHistorico.inclusoes),
      detalhe: "Entradas no período analisado",
      icone: "↗",
      classe: "inclusoes",
    },
    {
      titulo: "Cancelamentos históricos",
      valor: formatarInteiro(resumoHistorico.cancelamentos),
      detalhe: "Saídas com data registrada",
      icone: "↘",
      classe: "cancelamentos",
    },
    {
      titulo: "Saldo da carteira",
      valor: `${resumoHistorico.saldoLiquido >= 0 ? "+" : "−"}${formatarInteiro(
        resumoHistorico.saldoLiquido
      )}`,
      detalhe: `${formatarPercentual(
        resumoHistorico.crescimentoAcumulado
      )} desde o primeiro fechamento`,
      icone: resumoHistorico.saldoLiquido >= 0 ? "▲" : "▼",
      classe:
        resumoHistorico.saldoLiquido >= 0 ? "saldo-positivo" : "saldo-negativo",
    },
    {
      titulo: "Churn médio mensal",
      valor: Number.isFinite(resumoHistorico.churnMedio)
        ? `${resumoHistorico.churnMedio.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}%`
        : "—",
      detalhe: `Média de ${resumoHistorico.mesesAnalisados} competências`,
      icone: "%",
      classe: "churn",
    },
  ];

  return (
    <section className="resumo-historico" aria-labelledby="resumo-historico-titulo">
      <div className="resumo-historico-cabecalho">
        <div>
          <span className="resumo-historico-selo">VISÃO HISTÓRICA</span>
          <h2 id="resumo-historico-titulo">Resumo da evolução</h2>
        </div>
        <p>Indicadores calculados conforme os filtros aplicados.</p>
      </div>

      <div className="resumo-historico-grid">
        {cards.map((card) => (
          <article
            className={`resumo-historico-card ${card.classe}`}
            key={card.titulo}
          >
            <span className="resumo-historico-icone" aria-hidden="true">
              {card.icone}
            </span>
            <div>
              <span className="resumo-historico-titulo-card">{card.titulo}</span>
              <strong>{card.valor}</strong>
              <small>{card.detalhe}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

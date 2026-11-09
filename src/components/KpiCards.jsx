import NumeroAnimado from "./NumeroAnimado";

export default function KpiCards({ dashboard }) {
  const { carregando, erro, totalBeneficiarios, totalCidades, idadeMedia, inclusoesUltimos30Dias, comparativoInclusoes } = dashboard;
  return (
    <section className="cards-container">
      <article className="card"><div className="card-icone" aria-hidden="true">👥</div><div className="card-conteudo"><h2>Total de beneficiários</h2>{carregando && <p>Carregando...</p>}{!carregando && !erro && <strong><NumeroAnimado valor={totalBeneficiarios} /></strong>}<span className="card-legenda">Vidas ativas na seleção</span></div></article>
      <article className="card"><div className="card-icone" aria-hidden="true">🏙️</div><div className="card-conteudo"><h2>Cidades com beneficiários</h2>{!carregando && !erro && <strong><NumeroAnimado valor={totalCidades} /></strong>}<span className="card-legenda">Municípios distintos</span></div></article>
      <article className="card"><div className="card-icone" aria-hidden="true">🎂</div><div className="card-conteudo"><h2>Idade média</h2>{!carregando && !erro && <strong><NumeroAnimado valor={idadeMedia} casasDecimais={1} sufixo=" anos" /></strong>}<span className="card-legenda">Média da população selecionada</span></div></article>
      <article className="card"><div className="card-icone" aria-hidden="true">📅</div><div className="card-conteudo"><h2>Inclusões nos últimos 30 dias</h2>{!carregando && !erro && <strong><NumeroAnimado valor={inclusoesUltimos30Dias} /></strong>}<div className={`comparativo-inclusoes comparativo-${comparativoInclusoes.tendencia}`}><span aria-hidden="true">{comparativoInclusoes.tendencia === "alta" && "▲"}{comparativoInclusoes.tendencia === "baixa" && "▼"}{comparativoInclusoes.tendencia === "estavel" && "●"}</span><span>{comparativoInclusoes.texto}</span></div></div></article>
    </section>
  );
}

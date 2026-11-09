export default function LoadingScreen({ temaEscuro }) {
  return (
    <main className={`tela-carregamento ${temaEscuro ? "tema-escuro" : ""}`}>
      <section
        className="carregamento-card"
        role="status"
        aria-live="polite"
        aria-label="Carregando o dashboard de beneficiários"
      >
        <div className="carregamento-marca" aria-hidden="true"><span>S</span></div>
        <span className="carregamento-etiqueta">Painel executivo de vidas ativas</span>
        <h1>Preparando seu dashboard</h1>
        <p>Estamos carregando e organizando os dados dos beneficiários.</p>
        <div className="carregamento-barra" aria-hidden="true"><span /></div>
        <div className="carregamento-status">
          <span className="carregamento-spinner" aria-hidden="true" />
          <strong>Carregando base de beneficiários...</strong>
        </div>
      </section>
    </main>
  );
}

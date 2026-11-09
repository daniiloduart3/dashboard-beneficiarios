import { lazy, Suspense, useCallback, useEffect, useState, useTransition } from "react";

import BackToTop from "./BackToTop";
import DashboardFilters from "./DashboardFilters";
import DashboardFooter from "./DashboardFooter";
import DashboardHeader from "./DashboardHeader";
import DashboardNavigation from "./DashboardNavigation";
import LoadingScreen from "./LoadingScreen";

const PAGINAS = {
  executivo: lazy(() => import("../pages/ExecutivePage")),
  crescimento: lazy(() => import("../pages/GrowthPage")),
  cancelamentos: lazy(() => import("../pages/CancellationsPage")),
  empresas: lazy(() => import("../pages/CompaniesPage")),
  geografia: lazy(() => import("../pages/GeographyPage")),
  demografia: lazy(() => import("../pages/DemographicsPage")),
};

function obterPaginaInicial() {
  try {
    const paginaSalva = sessionStorage.getItem("vertice-bi-pagina-ativa");
    return PAGINAS[paginaSalva] ? paginaSalva : "executivo";
  } catch {
    return "executivo";
  }
}

function PaginaCarregando() {
  return (
    <section className="pagina-dashboard-carregando" role="status" aria-live="polite">
      <div className="skeleton-modulo">
        <span className="skeleton-linha skeleton-linha-titulo" />
        <span className="skeleton-linha skeleton-linha-subtitulo" />
        <div className="skeleton-cards">
          <span /><span /><span /><span />
        </div>
      </div>
      <span className="sr-only">Carregando módulo...</span>
    </section>
  );
}

export default function DashboardView({ dashboard }) {
  const [paginaAtiva, setPaginaAtiva] = useState(obterPaginaInicial);
  const [menuRecolhido, setMenuRecolhido] = useState(false);
  const [navegando, iniciarTransicao] = useTransition();
  const {
    carregando,
    temaEscuro,
    erro,
    periodoInvalido,
    totalBeneficiarios,
    totalBeneficiariosCrescimento = 0,
  } = dashboard;
  const PaginaAtiva = PAGINAS[paginaAtiva] || PAGINAS.executivo;
  const paginaIgnoraPeriodo = paginaAtiva === "crescimento";
  const totalPaginaAtiva = paginaIgnoraPeriodo
    ? totalBeneficiariosCrescimento
    : totalBeneficiarios;
  const periodoBloqueiaPagina = !paginaIgnoraPeriodo && periodoInvalido;

  useEffect(() => {
    try {
      sessionStorage.setItem("vertice-bi-pagina-ativa", paginaAtiva);
    } catch {
      // O dashboard continua funcional mesmo sem armazenamento de sessão.
    }
  }, [paginaAtiva]);

  const selecionarPagina = useCallback((pagina) => {
    if (pagina === paginaAtiva) return;
    iniciarTransicao(() => setPaginaAtiva(pagina));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [paginaAtiva]);

  if (carregando) return <LoadingScreen temaEscuro={temaEscuro} />;

  return (
    <main className={`dashboard dashboard-modular ${menuRecolhido ? "menu-recolhido" : ""} ${temaEscuro ? "tema-escuro" : ""}`}>
      <DashboardNavigation
        paginaAtiva={paginaAtiva}
        onSelecionarPagina={selecionarPagina}
        menuRecolhido={menuRecolhido}
        setMenuRecolhido={setMenuRecolhido}
      />

      <div className={`dashboard-modular-conteudo ${navegando ? "navegando" : ""}`}>
        <DashboardHeader dashboard={dashboard} />
        <DashboardFilters dashboard={dashboard} />

        {erro && (
          <section className="mensagem-erro estado-feedback" role="alert">
            <span className="estado-feedback-icone" aria-hidden="true">!</span>
            <div><strong>Não foi possível carregar o dashboard.</strong><span>{erro}</span></div>
          </section>
        )}

        {!erro && !periodoBloqueiaPagina && totalPaginaAtiva === 0 && (
          <section className="mensagem-vazia estado-feedback" role="status">
            <span className="estado-feedback-icone" aria-hidden="true">⌕</span>
            <div><strong>Nenhum resultado encontrado.</strong><span>Remova um ou mais filtros para ampliar a análise.</span></div>
            <button type="button" onClick={dashboard.limparFiltros}>Limpar filtros</button>
          </section>
        )}

        {!erro && !periodoBloqueiaPagina && totalPaginaAtiva > 0 && (
          <Suspense fallback={<PaginaCarregando />}>
            <PaginaAtiva dashboard={dashboard} />
          </Suspense>
        )}

        <DashboardFooter dashboard={dashboard} paginaAtiva={paginaAtiva} />
      </div>
      <BackToTop />
    </main>
  );
}

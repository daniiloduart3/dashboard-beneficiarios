import { memo, useCallback } from "react";

const ITENS = [
  { id: "executivo", icone: "◫", titulo: "Executivo", descricao: "Visão geral da carteira" },
  { id: "geografia", icone: "◎", titulo: "Geografia", descricao: "Estados e municípios" },
  { id: "crescimento", icone: "↗", titulo: "Crescimento", descricao: "Evolução e movimentações" },
  { id: "cancelamentos", icone: "↘", titulo: "Cancelamentos", descricao: "Perdas e motivos" },
  { id: "retencao", icone: "⟲", titulo: "Retenção", descricao: "Churn, safras e permanência" },
  { id: "demografia", icone: "◉", titulo: "Demografia", descricao: "Perfil dos beneficiários" },
  { id: "empresas", icone: "▦", titulo: "Empresas", descricao: "Concentração da carteira" },
];

function DashboardNavigation({ paginaAtiva, onSelecionarPagina, menuRecolhido, setMenuRecolhido }) {
  const alternarMenu = useCallback(
    () => setMenuRecolhido((valor) => !valor),
    [setMenuRecolhido]
  );

  return (
    <aside className="navegacao-dashboard" aria-label="Módulos do dashboard">
      <div className="navegacao-dashboard-topo">
        <div className="navegacao-dashboard-marca">
          <span className="navegacao-dashboard-simbolo">S</span>
          <div>
            <strong>Vértice BI</strong>
            <small>Beneficiários</small>
          </div>
        </div>
        <button
          type="button"
          className="navegacao-dashboard-alternar"
          onClick={alternarMenu}
          aria-label={menuRecolhido ? "Expandir menu" : "Recolher menu"}
          title={menuRecolhido ? "Expandir menu" : "Recolher menu"}
        >
          {menuRecolhido ? "›" : "‹"}
        </button>
      </div>

      <nav className="navegacao-dashboard-lista">
        {ITENS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={paginaAtiva === item.id ? "ativo" : ""}
            onClick={() => onSelecionarPagina(item.id)}
            aria-current={paginaAtiva === item.id ? "page" : undefined}
            title={menuRecolhido ? item.titulo : undefined}
          >
            <span className="navegacao-dashboard-icone" aria-hidden="true">{item.icone}</span>
            <span>
              <strong>{item.titulo}</strong>
              <small>{item.descricao}</small>
            </span>
          </button>
        ))}
      </nav>

      <div className="navegacao-dashboard-rodape">
        <span>Arquitetura modular</span>
        <small>Carregamento sob demanda</small>
      </div>
    </aside>
  );
}

export default memo(DashboardNavigation);

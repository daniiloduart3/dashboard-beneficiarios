import { memo } from "react";

function DashboardFooter({ dashboard, paginaAtiva }) {
  const { dataUltimaAtualizacao, totalBeneficiarios, filtrosAtivos } = dashboard;

  return (
    <footer className="dashboard-footer" aria-label="Informações do dashboard">
      <div>
        <strong>Vértice BI</strong>
        <span>Fonte: base fictícia gerada para demonstração</span>
      </div>
      <div className="dashboard-footer-meta">
        <span>Última inclusão: <strong>{dataUltimaAtualizacao}</strong></span>
        <span>Registros exibidos: <strong>{totalBeneficiarios.toLocaleString("pt-BR")}</strong></span>
        <span>Filtros ativos: <strong>{filtrosAtivos.length}</strong></span>
        <span>Módulo: <strong>{paginaAtiva}</strong></span>
        <span>Versão: <strong>5.0</strong></span>
      </div>
    </footer>
  );
}

export default memo(DashboardFooter);

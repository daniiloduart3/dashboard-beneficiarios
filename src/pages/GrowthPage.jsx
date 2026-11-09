import { memo, useMemo } from "react";
import PageHeader from "../components/PageHeader";
import HistoricalPortfolioChart from "../components/HistoricalPortfolioChart";
import MonthlyMovementChart from "../components/MonthlyMovementChart";
import { MonthlyEvolutionChart } from "../components/SecondaryCharts";
import GrowthIntelligence from "../components/GrowthIntelligence";

function GrowthPage({ dashboard }) {
  const growthDashboard = useMemo(
    () => ({
      ...dashboard,
      historicoCarteira: dashboard.historicoCrescimento || [],
      resumoHistorico: dashboard.resumoCrescimento || {},
      todosBeneficiariosFiltradosHistorico:
        dashboard.todosBeneficiariosFiltradosCrescimento || [],
    }),
    [dashboard]
  );

  return (
    <div className="pagina-dashboard">
      <PageHeader
        eyebrow="Crescimento"
        title="Como a carteira está evoluindo?"
        description="Inclusões, cancelamentos, saldo e consistência ao longo do tempo. Séries históricas não são recortadas pelos filtros de período."
      />
      <GrowthIntelligence dashboard={growthDashboard} />
      <div className="graficos-historicos-grid">
        <HistoricalPortfolioChart dashboard={growthDashboard} />
        <MonthlyMovementChart dashboard={growthDashboard} />
      </div>
      <MonthlyEvolutionChart dashboard={growthDashboard} />
    </div>
  );
}

export default memo(GrowthPage);

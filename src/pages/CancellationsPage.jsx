import { memo } from "react";
import PageHeader from "../components/PageHeader";
import CancellationReasonsChart from "../components/CancellationReasonsChart";
import StatusDistributionChart from "../components/StatusDistributionChart";
import MonthlyMovementChart from "../components/MonthlyMovementChart";
import CancellationsIntelligence from "../components/CancellationsIntelligence";

function CancellationsPage({ dashboard }) {
  return (
    <div className="pagina-dashboard">
      <PageHeader
        eyebrow="Cancelamentos"
        title="Onde estão as perdas da carteira?"
        description="Motivos, volume e participação das saídas na base histórica."
      />
      <CancellationsIntelligence dashboard={dashboard} />
      <div className="graficos-cancelamento-grid">
        <CancellationReasonsChart dashboard={dashboard} />
        <StatusDistributionChart dashboard={dashboard} />
      </div>
      <MonthlyMovementChart dashboard={dashboard} />
    </div>
  );
}

export default memo(CancellationsPage);

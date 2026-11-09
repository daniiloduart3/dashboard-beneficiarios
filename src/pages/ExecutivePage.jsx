import { memo } from "react";
import PageHeader from "../components/PageHeader";
import ExecutiveOverviewV2 from "../components/ExecutiveOverviewV2";

function ExecutivePage({ dashboard }) {
  return (
    <div className="pagina-dashboard pagina-executiva pagina-executiva-v2">
      <PageHeader
        eyebrow="Visão executiva 2.0"
        title="Como está a carteira hoje?"
        description="Leitura objetiva, dinâmica e orientada à decisão."
      />
      <ExecutiveOverviewV2 dashboard={dashboard} />
    </div>
  );
}

export default memo(ExecutivePage);

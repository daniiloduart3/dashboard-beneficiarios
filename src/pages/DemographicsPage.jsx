import { memo } from "react";
import PageHeader from "../components/PageHeader";
import AgeChart from "../components/AgeChart";
import GenderChart from "../components/GenderChart";
import DemographicsIntelligence from "../components/DemographicsIntelligence";

function DemographicsPage({ dashboard }) {
  return (
    <div className="pagina-dashboard">
      <PageHeader
        eyebrow="Demografia"
        title="Qual é o perfil da carteira?"
        description="Distribuição dos beneficiários ativos por faixa etária e sexo."
      />
      <DemographicsIntelligence dashboard={dashboard} />
      <div className="pagina-demografia-grid">
        <AgeChart dashboard={dashboard} />
        <GenderChart dashboard={dashboard} />
      </div>
    </div>
  );
}

export default memo(DemographicsPage);

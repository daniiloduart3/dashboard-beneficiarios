import { memo } from "react";
import PageHeader from "../components/PageHeader";
import CompaniesPremium from "../components/CompaniesPremium";

function CompaniesPage({ dashboard }) {
  return (
    <div className="pagina-dashboard pagina-empresas-premium">
      <PageHeader
        eyebrow="Empresas Premium"
        title="Quais empresas impulsionam a carteira?"
        description="Ranking, perfil executivo, benchmark e dependência comercial em uma visão integrada."
      />
      <CompaniesPremium dashboard={dashboard} />
    </div>
  );
}

export default memo(CompaniesPage);

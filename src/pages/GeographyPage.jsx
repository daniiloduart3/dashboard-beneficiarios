import { memo } from "react";
import PageHeader from "../components/PageHeader";
import GeographicPanel from "../components/GeographicPanel";

function GeographyPage({ dashboard }) {
  const nivel = dashboard.cidadeSelecionada !== "Todas" ? "municipio" : dashboard.estadoSelecionado !== "Todos" ? "estado" : "brasil";
  const description = nivel === "brasil"
    ? "Mapa interativo, detalhamento estadual e inteligência regional em uma única visão."
    : nivel === "estado"
      ? `Mapa municipal e análises dos municípios de ${dashboard.estadoSelecionado}.`
      : `Indicadores e leitura geográfica de ${dashboard.cidadeSelecionada}.`;

  return (
    <div className="pagina-dashboard pagina-geografia">
      <PageHeader
        eyebrow="Geografia"
        title="Onde estão os beneficiários?"
        description={description}
      />
      <GeographicPanel dashboard={dashboard} modo="completo" />
    </div>
  );
}

export default memo(GeographyPage);

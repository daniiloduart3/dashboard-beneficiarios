import AgeChart from "./AgeChart";
import GeographicPanel from "./GeographicPanel";
import {
  MonthlyEvolutionChart,
  RegistrationTypeChart,
} from "./SecondaryCharts";
import SummaryTables from "./SummaryTables";

export default function ChartsSection({ dashboard }) {
  return (
    <section className="analises-dashboard-grid">
      <GeographicPanel dashboard={dashboard} />

      <div className="analises-dashboard-coluna">
        <AgeChart dashboard={dashboard} />
        <div className="analises-dashboard-secundarias">
          <MonthlyEvolutionChart dashboard={dashboard} />
          <RegistrationTypeChart dashboard={dashboard} />
        </div>

        <SummaryTables dashboard={dashboard} />
      </div>
    </section>
  );
}

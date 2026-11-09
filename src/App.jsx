import "./App.css";

import DashboardView from "./components/DashboardView";
import useDashboard from "./hooks/useDashboard";

export default function App() {
  const dashboard = useDashboard();

  return <DashboardView dashboard={dashboard} />;
}

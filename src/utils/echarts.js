import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  MapChart,
  PieChart,
  RadarChart,
} from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

// Registro centralizado e modular: evita carregar o pacote completo do ECharts
// em cada gráfico e reduz o bundle inicial da aplicação.
echarts.use([
  BarChart,
  LineChart,
  MapChart,
  PieChart,
  RadarChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export { echarts };

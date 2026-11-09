import { memo, useEffect, useMemo, useRef } from "react";
import { echarts } from "../utils/echarts";

function prepararOpcaoInterativa(option = {}) {
  const series = Array.isArray(option.series)
    ? option.series.map((serie) => ({
        ...serie,
        emphasis: {
          focus: "series",
          scale: true,
          ...(serie.emphasis || {}),
        },
        blur: {
          itemStyle: { opacity: 0.32 },
          lineStyle: { opacity: 0.32 },
          areaStyle: { opacity: 0.08 },
          ...(serie.blur || {}),
        },
      }))
    : option.series;

  const possuiEixo = Boolean(option.xAxis || option.yAxis);
  const tooltipOriginal = option.tooltip || {};

  return {
    ...option,
    tooltip: {
      show: true,
      trigger: possuiEixo ? "axis" : "item",
      renderMode: "html",
      appendToBody: true,
      confine: false,
      enterable: false,
      transitionDuration: 0.12,
      hideDelay: 80,
      axisPointer: possuiEixo
        ? {
            type: "shadow",
            snap: true,
            animation: false,
            ...(tooltipOriginal.axisPointer || {}),
          }
        : tooltipOriginal.axisPointer,
      ...tooltipOriginal,
    },
    series,
  };
}

function EChart({ option, onEvents = {}, className = "" }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const resizeFrameRef = useRef(null);
  const interactiveOption = useMemo(() => prepararOpcaoInterativa(option), [option]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const chart = echarts.init(container, null, {
      renderer: "canvas",
      // Mantém o canvas estável durante tooltip e destaque no hover.
      useDirtyRect: false,
    });

    chartRef.current = chart;

    const zr = chart.getZr();
    const atualizarCursor = (event) => {
      const alvo = event?.target;
      container.style.cursor = alvo ? "pointer" : "default";
    };
    const restaurarCursor = () => {
      container.style.cursor = "default";
    };

    zr.on("mousemove", atualizarCursor);
    zr.on("globalout", restaurarCursor);

    const redimensionar = () => {
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);

      resizeFrameRef.current = requestAnimationFrame(() => {
        if (!chart.isDisposed()) chart.resize({ animation: { duration: 0 } });
        resizeFrameRef.current = null;
      });
    };

    const resizeObserver = new ResizeObserver(redimensionar);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      zr.off("mousemove", atualizarCursor);
      zr.off("globalout", restaurarCursor);
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
      if (!chart.isDisposed()) chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chart.isDisposed()) return;

    chart.setOption(interactiveOption, {
      notMerge: true,
      lazyUpdate: false,
      silent: false,
    });
  }, [interactiveOption]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chart.isDisposed()) return undefined;

    const eventosRegistrados = [];
    Object.entries(onEvents).forEach(([nomeEvento, manipulador]) => {
      if (typeof manipulador !== "function") return;
      chart.on(nomeEvento, manipulador);
      eventosRegistrados.push([nomeEvento, manipulador]);
    });

    return () => {
      if (chart.isDisposed()) return;
      eventosRegistrados.forEach(([nomeEvento, manipulador]) => chart.off(nomeEvento, manipulador));
    };
  }, [onEvents]);

  return (
    <div
      ref={containerRef}
      className={`echart echart-interativo ${className}`.trim()}
      role="img"
      aria-label="Visualização de dados interativa"
    />
  );
}

export default memo(EChart);

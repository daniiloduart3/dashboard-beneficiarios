export function getAnalysisContext(dashboard = {}) {
  const state = dashboard.estadoSelecionado || "Todos";
  const city = dashboard.cidadeSelecionada || "Todas";

  if (city !== "Todas") {
    return {
      level: "municipio",
      state,
      city,
      scopeLabel: city,
      locationLabel: "Município",
      locationLabelLower: "município",
      comparisonLabel: "Recorte municipal",
      nextLevelLabel: null,
    };
  }

  if (state !== "Todos") {
    return {
      level: "estado",
      state,
      city: null,
      scopeLabel: state,
      locationLabel: "Município",
      locationLabelLower: "município",
      comparisonLabel: `Municípios de ${state}`,
      nextLevelLabel: "Município",
    };
  }

  return {
    level: "brasil",
    state: null,
    city: null,
    scopeLabel: "Brasil",
    locationLabel: "Estado",
    locationLabelLower: "estado",
    comparisonLabel: "Estados do Brasil",
    nextLevelLabel: "Estado",
  };
}

export function getLocationValue(item, context) {
  if (context.level === "brasil") {
    return String(item?.["Estado de correspondência"] ?? "Não informado").trim() || "Não informado";
  }

  if (context.level === "estado") {
    return String(item?.["Cidade de correspondência"] ?? "Não informado").trim() || "Não informado";
  }

  return context.city || "Município selecionado";
}

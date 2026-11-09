const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const pct = (part, total) => total > 0 ? (part / total) * 100 : 0;
const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(Math.round(Number(value) || 0));
const formatPct = (value) => `${Math.abs(Number(value) || 0).toFixed(1).replace('.', ',')}%`;

function normalizeGender(item) {
  const raw = String(item['Sexo'] ?? item['Gênero'] ?? item['Genero'] ?? item['Sexo do beneficiário'] ?? '').trim().toLocaleUpperCase('pt-BR');
  if (raw === 'M' || raw.startsWith('MASC')) return 'Masculino';
  if (raw === 'F' || raw.startsWith('FEM')) return 'Feminino';
  return 'Não informado';
}

export function getExecutiveStatus(score) {
  if (score >= 85) return { label: 'Excelente', className: 'excelente', signal: 'verde' };
  if (score >= 70) return { label: 'Boa', className: 'boa', signal: 'verde' };
  if (score >= 50) return { label: 'Atenção', className: 'atencao', signal: 'amarelo' };
  return { label: 'Crítica', className: 'critica', signal: 'vermelho' };
}

export function calculateExecutiveAnalysis(rows = [], rawHistory = []) {
  if (!rows.length) return null;
  const history = rawHistory.filter((item) => Number.isFinite(Number(item?.vidasAtivas)));
  const states = new Map(), companies = new Map(), genders = new Map(), cities = new Set();
  rows.forEach((row) => {
    const state = String(row['Estado de correspondência'] || 'Não informado').trim();
    const city = String(row['Cidade de correspondência'] || '').trim();
    const company = String(row['Empresa'] || '').trim();
    const companyNormalized = company.toLocaleUpperCase('pt-BR');
    const isCompany = company && companyNormalized !== 'NÃO INFORMADO' && companyNormalized !== 'NAO INFORMADO' && companyNormalized !== 'PF';
    const gender = normalizeGender(row);
    states.set(state, (states.get(state) || 0) + 1);
    if (isCompany) companies.set(company, (companies.get(company) || 0) + 1);
    genders.set(gender, (genders.get(gender) || 0) + 1);
    if (city) cities.add(`${state}::${city}`);
  });

  const rank = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]);
  const stateRank = rank(states), companyRank = rank(companies);
  const genderRank = rank(genders).filter(([name]) => name !== 'Não informado');
  const total = rows.length;
  const stateLeaderShare = pct(stateRank[0]?.[1] || 0, total);
  const companyTotal = companyRank.reduce((sum, [, value]) => sum + value, 0);
  const topCompanyShare = pct(companyRank[0]?.[1] || 0, companyTotal);
  const top5Share = pct(companyRank.slice(0, 5).reduce((sum, [, value]) => sum + value, 0), companyTotal);
  const genderTotal = genderRank.reduce((sum, [, value]) => sum + value, 0);
  const genderLeaderShare = genderTotal ? pct(genderRank[0]?.[1] || 0, genderTotal) : 50;

  const first = Number(history[0]?.vidasAtivas) || total;
  const last = Number(history.at(-1)?.vidasAtivas) || total;
  const growth = first > 0 ? ((last - first) / first) * 100 : 0;
  const last3 = history.slice(-3), previous3 = history.slice(-6, -3);
  const avg = (items, key) => items.length ? items.reduce((sum, item) => sum + (Number(item?.[key]) || 0), 0) / items.length : 0;
  const recentInclusions = avg(last3, 'inclusoes'), previousInclusions = avg(previous3, 'inclusoes');
  const inclusionTrend = previousInclusions > 0 ? ((recentInclusions - previousInclusions) / previousInclusions) * 100 : growth;
  const recentCancellations = avg(last3, 'cancelamentos'), previousCancellations = avg(previous3, 'cancelamentos');
  const cancellationTrend = previousCancellations > 0 ? ((recentCancellations - previousCancellations) / previousCancellations) * 100 : 0;

  const dimensions = [
    { key: 'growth', name: 'Crescimento', score: clamp(62 + growth * 2.1), detail: `${growth >= 0 ? '+' : '-'}${formatPct(growth)} no histórico analisado` },
    { key: 'coverage', name: 'Cobertura', score: clamp(30 + Math.min(states.size, 27) * 1.8 + Math.min(cities.size, 60) * 0.55), detail: `${states.size} UFs e ${cities.size} municípios` },
    { key: 'diversification', name: 'Diversificação', score: clamp(108 - stateLeaderShare), detail: `${stateRank[0]?.[0] || '—'} concentra ${formatPct(stateLeaderShare)}` },
    { key: 'companies', name: 'Empresas', score: clamp(108 - top5Share), detail: `Top 5 concentram ${formatPct(top5Share)}` },
    { key: 'demography', name: 'Demografia', score: clamp(100 - Math.abs(genderLeaderShare - 50) * 2.5, 35), detail: genderRank.length ? `${genderRank[0][0]}: ${formatPct(genderLeaderShare)}` : 'Sexo não informado' },
    { key: 'cancellations', name: 'Cancelamentos', score: clamp(78 - Math.max(cancellationTrend, 0) * .8 + Math.max(-cancellationTrend, 0) * .35, 35), detail: cancellationTrend > 8 ? 'Pressão crescente' : cancellationTrend < -8 ? 'Em redução' : 'Relativamente estáveis' },
  ].map((item) => ({ ...item, score: Math.round(item.score), status: getExecutiveStatus(item.score) }));
  const executiveScore = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);

  const evolutionHistory = history.slice(-12);

  // A série temporal usa apenas métricas que existem de fato em cada competência.
  // Dimensões estruturais (cobertura, empresas, diversificação e demografia)
  // permanecem como fotografia atual, pois a base não contém snapshots mensais
  // completos dessas características.
  const structuralKeys = new Set(['coverage', 'diversification', 'companies', 'demography']);
  const structuralScores = dimensions
    .filter((item) => structuralKeys.has(item.key))
    .map((item) => item.score);
  const structuralTotal = structuralScores.reduce((sum, value) => sum + value, 0);

  const evolution = evolutionHistory.map((item, index, array) => {
    const currentLives = Number(item?.vidasAtivas) || 0;
    const previousLives = Number(array[index - 1]?.vidasAtivas) || 0;
    const saldo = Number(item?.saldo);
    const inferredSaldo = Number.isFinite(saldo)
      ? saldo
      : previousLives > 0 ? currentLives - previousLives : 0;
    const monthlyGrowth = previousLives > 0
      ? (inferredSaldo / previousLives) * 100
      : 0;

    const inclusions = Number(item?.inclusoes) || 0;
    const cancellations = Number(item?.cancelamentos) || 0;
    const movementTotal = inclusions + cancellations;
    const cancellationShare = movementTotal > 0
      ? (cancellations / movementTotal) * 100
      : 50;

    const previousWindow = array.slice(Math.max(0, index - 3), index);
    const previousInclusionAverage = avg(previousWindow, 'inclusoes');
    const inclusionMomentum = previousInclusionAverage > 0
      ? ((inclusions - previousInclusionAverage) / previousInclusionAverage) * 100
      : 0;

    // Crescimento mensal recebe peso da variação líquida e do ritmo de inclusões.
    const growthScore = clamp(
      68 + monthlyGrowth * 7 + clamp(inclusionMomentum, -60, 60) * 0.12,
      40,
      94
    );

    // Quanto maior a participação dos cancelamentos no movimento do mês,
    // menor a nota de retenção.
    const cancellationScore = clamp(
      92 - cancellationShare * 0.65,
      40,
      94
    );

    return {
      label: item.competencia || item.competenciaCompleta || item.mesAno || item.periodo || item.mes || `${index + 1}`,
      score: Math.round(clamp((structuralTotal + growthScore + cancellationScore) / 6, 0, 100)),
    };
  });

  // O ponto mais recente representa exatamente o score consolidado exibido no card.
  if (evolution.length) evolution[evolution.length - 1].score = executiveScore;

  const summary = `A carteira ${growth > 3 ? 'mantém crescimento consistente' : growth >= 0 ? 'avança em ritmo moderado' : 'apresenta retração'}. O principal ponto de atenção é ${cancellationTrend > 10 ? 'a pressão crescente dos cancelamentos' : top5Share >= 50 ? 'a concentração nas maiores empresas' : inclusionTrend < -8 ? 'a desaceleração das inclusões' : 'a sustentação do ritmo atual'}.`;
  const discoveries = [
    { tone: growth >= 0 ? 'positive' : 'negative', icon: growth >= 0 ? '↗' : '↘', title: growth >= 0 ? 'Trajetória da carteira' : 'Retração da carteira', text: `${growth >= 0 ? '+' : '-'}${formatPct(growth)} no histórico analisado.` },
    { tone: cancellationTrend > 10 ? 'negative' : cancellationTrend < -10 ? 'positive' : 'neutral', icon: cancellationTrend > 10 ? '!' : cancellationTrend < -10 ? '↓' : '—', title: 'Cancelamentos', text: cancellationTrend === 0 ? 'Sem base comparável suficiente.' : `${cancellationTrend > 0 ? '+' : '-'}${formatPct(cancellationTrend)} frente ao período anterior.` },
    { tone: top5Share >= 60 ? 'negative' : top5Share >= 40 ? 'warning' : 'positive', icon: '▦', title: 'Dependência empresarial', text: `As cinco maiores empresas concentram ${formatPct(top5Share)} das vidas.` },
  ];
  const recommendations = [
    top5Share >= 50 && { priority: 'Alta', title: 'Diversificar a carteira empresarial', text: 'Priorizar novas empresas e reduzir a dependência dos maiores contratos.' },
    cancellationTrend > 10 && { priority: 'Alta', title: 'Atuar sobre a evasão', text: 'Investigar os principais motivos e empresas associados ao aumento dos cancelamentos.' },
    inclusionTrend < -8 && { priority: 'Média', title: 'Recuperar o ritmo de inclusões', text: 'Reforçar ações comerciais nos segmentos e territórios com maior potencial.' },
    { priority: 'Baixa', title: 'Preservar os fatores positivos', text: 'Manter acompanhamento mensal das dimensões com melhor desempenho.' },
  ].filter(Boolean).slice(0, 3);
  const trends = [
    { label: 'Beneficiários', value: growth > 1 ? 'Crescendo' : growth < -1 ? 'Em queda' : 'Estáveis', direction: growth > 1 ? 'up' : growth < -1 ? 'down' : 'stable' },
    { label: 'Inclusões', value: inclusionTrend > 8 ? 'Em aceleração' : inclusionTrend < -8 ? 'Desacelerando' : 'Estáveis', direction: inclusionTrend > 8 ? 'up' : inclusionTrend < -8 ? 'down' : 'stable' },
    { label: 'Cancelamentos', value: cancellationTrend > 8 ? 'Em alta' : cancellationTrend < -8 ? 'Em redução' : 'Estáveis', direction: cancellationTrend > 8 ? 'down' : cancellationTrend < -8 ? 'up' : 'stable' },
    { label: 'Empresas', value: top5Share >= 60 ? 'Maior dependência' : 'Diversificação controlada', direction: top5Share >= 60 ? 'down' : 'stable' },
  ];
  const timeline = history.slice(-4).map((item, index) => ({
    period: item.mesAno || item.periodo || item.mes || `Período ${index + 1}`,
    title: (Number(item.saldo) || 0) >= 0 ? `Saldo positivo de ${formatNumber(item.saldo)} vidas` : `Redução de ${formatNumber(Math.abs(item.saldo))} vidas`,
    text: `${formatNumber(item.inclusoes)} inclusões e ${formatNumber(item.cancelamentos)} cancelamentos.`,
    positive: (Number(item.saldo) || 0) >= 0,
  }));

  return { dimensions, executiveScore, scoreStatus: getExecutiveStatus(executiveScore), evolution, summary, discoveries, recommendations, trends, timeline, metrics: { total, states: states.size, cities: cities.size, topCompanyShare, top5Share } };
}

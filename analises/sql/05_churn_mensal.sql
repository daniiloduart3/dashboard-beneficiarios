-- =====================================================================
-- 05 · Movimentação e churn mensal
--
-- Definições
--   ativos_inicio : vidas da base válida ativas no 1º dia do mês
--   entradas      : inclusões no mês
--   perdas        : cancelamentos reais no mês (sem migrações)
--   migracoes     : saídas técnicas por troca de contrato
--   churn_pct     : perdas / ativos_inicio
-- =====================================================================

DROP VIEW IF EXISTS carteira.vw_movimento_mensal CASCADE;
CREATE VIEW carteira.vw_movimento_mensal AS
WITH meses AS (
    SELECT generate_series(
               DATE '2023-01-01',
               (SELECT DATE_TRUNC('month', data_referencia)::DATE FROM carteira.parametros),
               INTERVAL '1 month'
           )::DATE AS mes
)
SELECT
    m.mes,
    (SELECT COUNT(*) FROM carteira.vw_base_analitica b
      WHERE b.data_inclusao < m.mes
        AND (b.data_cancelamento IS NULL OR b.data_cancelamento >= m.mes))       AS ativos_inicio,
    (SELECT COUNT(*) FROM carteira.vw_base_analitica b
      WHERE DATE_TRUNC('month', b.data_inclusao) = m.mes)                         AS entradas,
    (SELECT COUNT(*) FROM carteira.vw_base_analitica b
      WHERE b.perda AND DATE_TRUNC('month', b.data_cancelamento) = m.mes)         AS perdas,
    (SELECT COUNT(*) FROM carteira.vw_base_analitica b
      WHERE b.migracao AND DATE_TRUNC('month', b.data_cancelamento) = m.mes)      AS migracoes
FROM meses m;

SELECT
    TO_CHAR(mes, 'YYYY-MM')                                      AS mes,
    ativos_inicio,
    entradas,
    perdas,
    migracoes,
    entradas - perdas - migracoes                                AS saldo_liquido,
    ROUND(100.0 * perdas / NULLIF(ativos_inicio, 0), 2)          AS churn_pct,
    -- média móvel de 3 meses para suavizar a leitura
    ROUND(AVG(100.0 * perdas / NULLIF(ativos_inicio, 0))
          OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS churn_mm3_pct
FROM carteira.vw_movimento_mensal
ORDER BY mes;

-- Churn mensal por tipo de cadastro (PF × PJ) nos últimos 12 meses
WITH p AS (SELECT data_referencia AS ref FROM carteira.parametros),
meses AS (
    SELECT generate_series(DATE_TRUNC('month', (SELECT ref FROM p) - INTERVAL '11 months'),
                           DATE_TRUNC('month', (SELECT ref FROM p)),
                           INTERVAL '1 month')::DATE AS mes
),
tipos AS (SELECT UNNEST(ARRAY['PF', 'PJ']) AS tipo_cadastro)
SELECT
    t.tipo_cadastro,
    ROUND(100.0 * SUM(per.qtd) / NULLIF(SUM(atv.qtd), 0), 2) AS churn_medio_mensal_pct
FROM meses m
CROSS JOIN tipos t
CROSS JOIN LATERAL (
    SELECT COUNT(*) AS qtd FROM carteira.vw_base_analitica b
    WHERE b.tipo_cadastro = t.tipo_cadastro
      AND b.data_inclusao < m.mes
      AND (b.data_cancelamento IS NULL OR b.data_cancelamento >= m.mes)
) atv
CROSS JOIN LATERAL (
    SELECT COUNT(*) AS qtd FROM carteira.vw_base_analitica b
    WHERE b.tipo_cadastro = t.tipo_cadastro
      AND b.perda AND DATE_TRUNC('month', b.data_cancelamento) = m.mes
) per
GROUP BY t.tipo_cadastro;

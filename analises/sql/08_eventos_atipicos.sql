-- =====================================================================
-- 08 · Eventos atípicos
--
-- 8.1 · Crescimento "falso": entradas brutas × entradas válidas.
--       Lotes de cadastros gerados indevidamente (e cancelados logo depois)
--       inflam a entrada do mês. Sem tratamento, parecem crescimento.
--
-- 8.2 · Alerta de churn: mês em que a taxa de perdas passa de 2x a
--       mediana dos 12 meses anteriores. Usa taxa (%), não quantidade,
--       para não confundir crescimento da carteira com anomalia.
-- =====================================================================

-- 8.1 · Entradas brutas × válidas por mês
SELECT
    TO_CHAR(DATE_TRUNC('month', data_inclusao), 'YYYY-MM')                  AS mes,
    COUNT(*)                                                                AS entradas_brutas,
    COUNT(*) FILTER (WHERE base_valida)                                     AS entradas_validas,
    COUNT(*) FILTER (WHERE erro_cadastral)                                  AS erros_cadastrais,
    ROUND(100.0 * COUNT(*) FILTER (WHERE NOT base_valida) / COUNT(*), 1)    AS pct_descartado
FROM carteira.beneficiarios
WHERE data_inclusao >= DATE '2024-01-01'
GROUP BY 1
HAVING COUNT(*) FILTER (WHERE NOT base_valida) > 500
ORDER BY 1;

-- 8.2 · Alertas de churn
WITH mov AS (
    SELECT mes, ativos_inicio, perdas,
           100.0 * perdas / NULLIF(ativos_inicio, 0) AS churn_pct
    FROM carteira.vw_movimento_mensal
),
com_base AS (
    SELECT
        m.*,
        (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x.churn_pct)
           FROM mov x
          WHERE x.mes BETWEEN m.mes - INTERVAL '12 months' AND m.mes - INTERVAL '1 month') AS churn_mediano_12m
    FROM mov m
)
SELECT
    TO_CHAR(mes, 'YYYY-MM')              AS mes,
    ativos_inicio,
    perdas,
    ROUND(churn_pct, 2)                  AS churn_pct,
    ROUND(churn_mediano_12m::NUMERIC, 2) AS churn_mediano_12m,
    ROUND((churn_pct / NULLIF(churn_mediano_12m, 0))::NUMERIC, 1) AS vezes_acima_do_normal,
    -- perdas acima do "normal" = perdas que teriam acontecido com o churn mediano
    perdas - ROUND(ativos_inicio * churn_mediano_12m / 100)        AS perdas_excedentes
FROM com_base
WHERE churn_pct > 2 * churn_mediano_12m
  AND mes >= DATE '2024-01-01'
ORDER BY mes;

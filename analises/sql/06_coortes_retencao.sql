-- =====================================================================
-- 06 · Retenção por safra (coorte de entrada)
--
-- Para cada mês de entrada, qual % das vidas continuava na carteira
-- depois de 1, 3, 6, 12 e 18 meses?
--   · Só entram vidas da base válida e sem migração
--   · A célula fica NULL quando a safra ainda não completou aquele prazo
-- =====================================================================

DROP VIEW IF EXISTS carteira.vw_coortes CASCADE;
CREATE VIEW carteira.vw_coortes AS
WITH p AS (SELECT data_referencia AS ref FROM carteira.parametros),
vidas AS (
    SELECT
        DATE_TRUNC('month', data_inclusao)::DATE AS safra,
        data_inclusao,
        data_cancelamento
    FROM carteira.vw_base_analitica
    WHERE NOT migracao
      AND data_inclusao >= DATE '2024-01-01'
),
prazos AS (SELECT UNNEST(ARRAY[1, 3, 6, 12, 18]) AS meses)
SELECT
    v.safra,
    pr.meses,
    COUNT(*)                                                                                  AS vidas_safra,
    COUNT(*) FILTER (WHERE v.data_inclusao + pr.meses * INTERVAL '1 month' <= p.ref)          AS vidas_elegiveis,
    COUNT(*) FILTER (WHERE v.data_inclusao + pr.meses * INTERVAL '1 month' <= p.ref
                       AND (v.data_cancelamento IS NULL
                            OR v.data_cancelamento >= v.data_inclusao + pr.meses * INTERVAL '1 month')) AS vidas_retidas
FROM vidas v
CROSS JOIN prazos pr
CROSS JOIN p
GROUP BY v.safra, pr.meses;

-- Matriz de retenção (formato "heatmap"): uma linha por safra
SELECT
    TO_CHAR(safra, 'YYYY-MM') AS safra,
    MAX(vidas_safra) AS tamanho_safra,
    ROUND(100.0 * MAX(vidas_retidas) FILTER (WHERE meses = 1)  / NULLIF(MAX(vidas_elegiveis) FILTER (WHERE meses = 1), 0), 1)  AS ret_m1,
    ROUND(100.0 * MAX(vidas_retidas) FILTER (WHERE meses = 3)  / NULLIF(MAX(vidas_elegiveis) FILTER (WHERE meses = 3), 0), 1)  AS ret_m3,
    ROUND(100.0 * MAX(vidas_retidas) FILTER (WHERE meses = 6)  / NULLIF(MAX(vidas_elegiveis) FILTER (WHERE meses = 6), 0), 1)  AS ret_m6,
    ROUND(100.0 * MAX(vidas_retidas) FILTER (WHERE meses = 12) / NULLIF(MAX(vidas_elegiveis) FILTER (WHERE meses = 12), 0), 1) AS ret_m12,
    ROUND(100.0 * MAX(vidas_retidas) FILTER (WHERE meses = 18) / NULLIF(MAX(vidas_elegiveis) FILTER (WHERE meses = 18), 0), 1) AS ret_m18
FROM carteira.vw_coortes
GROUP BY safra
HAVING MAX(vidas_elegiveis) FILTER (WHERE meses = 1) > 0
ORDER BY safra;

-- Retenção média ponderada por prazo (todas as safras que completaram o prazo)
SELECT
    meses AS prazo_meses,
    SUM(vidas_elegiveis)                                              AS vidas_observadas,
    ROUND(100.0 * SUM(vidas_retidas) / NULLIF(SUM(vidas_elegiveis), 0), 1) AS retencao_pct
FROM carteira.vw_coortes
GROUP BY meses
ORDER BY meses;

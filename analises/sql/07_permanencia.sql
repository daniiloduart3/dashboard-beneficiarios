-- =====================================================================
-- 07 · Tempo de permanência até o cancelamento
-- Considera só as perdas (cancelamentos reais) e mede, em meses,
-- quanto tempo a vida ficou na carteira.
-- =====================================================================

DROP VIEW IF EXISTS carteira.vw_permanencia CASCADE;
CREATE VIEW carteira.vw_permanencia AS
SELECT
    b.*,
    ROUND((b.data_cancelamento - b.data_inclusao) / 30.4375, 1) AS meses_permanencia
FROM carteira.vw_base_analitica b
WHERE b.perda;

-- 7.1 · Por tipo de cadastro
SELECT
    tipo_cadastro,
    COUNT(*)                                                                  AS perdas,
    ROUND(AVG(meses_permanencia), 1)                                          AS media_meses,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meses_permanencia)            AS mediana_meses,
    ROUND(100.0 * COUNT(*) FILTER (WHERE meses_permanencia < 3) / COUNT(*), 1) AS pct_sai_antes_3m
FROM carteira.vw_permanencia
GROUP BY tipo_cadastro;

-- 7.2 · Por segmento do plano
SELECT
    segmento,
    COUNT(*)                                                       AS perdas,
    ROUND(AVG(meses_permanencia), 1)                               AS media_meses,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meses_permanencia) AS mediana_meses
FROM carteira.vw_permanencia
GROUP BY segmento
ORDER BY perdas DESC;

-- 7.3 · Por grupo de motivo: quem sai cedo e por quê
SELECT
    motivo_grupo,
    COUNT(*)                                                         AS perdas,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)               AS pct_perdas,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY meses_permanencia)   AS mediana_meses,
    ROUND(100.0 * COUNT(*) FILTER (WHERE meses_permanencia < 3) / COUNT(*), 1) AS pct_sai_antes_3m
FROM carteira.vw_permanencia
GROUP BY motivo_grupo
ORDER BY perdas DESC;

-- 7.4 · Distribuição em faixas de permanência
SELECT
    CASE
        WHEN meses_permanencia < 3  THEN '1. Até 3 meses'
        WHEN meses_permanencia < 6  THEN '2. 3 a 6 meses'
        WHEN meses_permanencia < 12 THEN '3. 6 a 12 meses'
        WHEN meses_permanencia < 24 THEN '4. 1 a 2 anos'
        ELSE                             '5. Mais de 2 anos'
    END                                                AS faixa_permanencia,
    COUNT(*)                                           AS perdas,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM carteira.vw_permanencia
GROUP BY 1
ORDER BY 1;

-- =====================================================================
-- 09 · Concentração da carteira PJ
-- Quanto da carteira depende de poucas empresas? (risco de concentração)
-- =====================================================================

-- 9.1 · Top 15 empresas, com participação acumulada (curva de Pareto)
WITH ativos_pj AS (
    SELECT b.empresa, COUNT(*) AS vidas
    FROM carteira.beneficiarios b, carteira.parametros p
    WHERE b.situacao = 'ATIVO' AND b.data_inclusao <= p.data_referencia AND b.tipo_cadastro = 'PJ'
    GROUP BY b.empresa
)
SELECT
    RANK() OVER (ORDER BY vidas DESC)                                    AS ranking,
    empresa,
    vidas,
    ROUND(100.0 * vidas / SUM(vidas) OVER (), 2)                         AS pct_pj,
    ROUND(100.0 * SUM(vidas) OVER (ORDER BY vidas DESC, empresa)
                / SUM(vidas) OVER (), 1)                                 AS pct_acumulado
FROM ativos_pj
ORDER BY vidas DESC
LIMIT 15;

-- 9.2 · Faixas de porte das empresas
WITH ativos_pj AS (
    SELECT b.empresa, COUNT(*) AS vidas
    FROM carteira.beneficiarios b, carteira.parametros p
    WHERE b.situacao = 'ATIVO' AND b.data_inclusao <= p.data_referencia AND b.tipo_cadastro = 'PJ'
    GROUP BY b.empresa
)
SELECT
    CASE
        WHEN vidas = 1     THEN '1. 1 vida'
        WHEN vidas <= 29   THEN '2. 2 a 29 vidas (PME)'
        WHEN vidas <= 99   THEN '3. 30 a 99 vidas'
        WHEN vidas <= 999  THEN '4. 100 a 999 vidas'
        ELSE                    '5. 1.000+ vidas'
    END                                                    AS porte,
    COUNT(*)                                               AS empresas,
    SUM(vidas)                                             AS vidas,
    ROUND(100.0 * SUM(vidas) / SUM(SUM(vidas)) OVER (), 1) AS pct_vidas
FROM ativos_pj
GROUP BY 1
ORDER BY 1;

-- 9.3 · Índice de concentração HHI (0 a 10.000; acima de 1.500 = concentrado)
WITH ativos_pj AS (
    SELECT b.empresa, COUNT(*) AS vidas
    FROM carteira.beneficiarios b, carteira.parametros p
    WHERE b.situacao = 'ATIVO' AND b.data_inclusao <= p.data_referencia AND b.tipo_cadastro = 'PJ'
    GROUP BY b.empresa
)
SELECT ROUND(SUM(POWER(100.0 * vidas / (SELECT SUM(vidas) FROM ativos_pj), 2))) AS hhi
FROM ativos_pj;

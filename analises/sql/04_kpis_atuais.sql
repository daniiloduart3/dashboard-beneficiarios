-- =====================================================================
-- 04 · KPIs da carteira na data de referência
-- =====================================================================

-- 4.1 · Painel principal
WITH p AS (SELECT data_referencia AS ref FROM carteira.parametros),
ativos AS (
    SELECT b.*
    FROM carteira.beneficiarios b, p
    WHERE b.situacao = 'ATIVO' AND b.data_inclusao <= p.ref
),
ultimos_12m AS (
    SELECT
        COUNT(*) FILTER (WHERE b.data_inclusao > p.ref - INTERVAL '12 months' AND b.base_valida)                         AS entradas_12m,
        COUNT(*) FILTER (WHERE b.perda    AND b.data_cancelamento > p.ref - INTERVAL '12 months')                        AS perdas_12m,
        COUNT(*) FILTER (WHERE b.migracao AND b.base_valida AND b.data_cancelamento > p.ref - INTERVAL '12 months')       AS migracoes_12m
    FROM carteira.beneficiarios b, p
),
ativos_ha_12m AS (
    SELECT COUNT(*) AS qtd
    FROM carteira.vw_base_analitica b, p
    WHERE b.data_inclusao <= p.ref - INTERVAL '12 months'
      AND (b.data_cancelamento IS NULL OR b.data_cancelamento > p.ref - INTERVAL '12 months')
)
SELECT
    (SELECT ref FROM p)                                                        AS data_referencia,
    COUNT(*)                                                                   AS vidas_ativas,
    COUNT(*) FILTER (WHERE tipo_cadastro = 'PF')                               AS vidas_pf,
    COUNT(*) FILTER (WHERE tipo_cadastro = 'PJ')                               AS vidas_pj,
    ROUND(AVG(idade), 1)                                                       AS idade_media,
    ROUND(100.0 * COUNT(*) FILTER (WHERE faixa_ans = '59 ou mais') / COUNT(*), 1) AS pct_59_mais,
    ROUND(100.0 * COUNT(*) FILTER (WHERE sexo = 'FEMININO') / COUNT(*), 1)     AS pct_feminino,
    COUNT(DISTINCT empresa) FILTER (WHERE tipo_cadastro = 'PJ')                AS empresas_ativas,
    (SELECT entradas_12m FROM ultimos_12m)                                     AS entradas_12m,
    (SELECT perdas_12m   FROM ultimos_12m)                                     AS perdas_12m,
    (SELECT migracoes_12m FROM ultimos_12m)                                    AS migracoes_12m,
    ROUND(100.0 * (COUNT(*) - (SELECT qtd FROM ativos_ha_12m)) / NULLIF((SELECT qtd FROM ativos_ha_12m), 0), 1) AS crescimento_12m_pct
FROM ativos;

-- 4.2 · Pirâmide etária ANS por sexo (vidas ativas)
SELECT
    faixa_ans,
    COUNT(*) FILTER (WHERE sexo = 'FEMININO')  AS feminino,
    COUNT(*) FILTER (WHERE sexo = 'MASCULINO') AS masculino,
    COUNT(*)                                   AS total,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct_carteira
FROM carteira.beneficiarios b, carteira.parametros p
WHERE b.situacao = 'ATIVO' AND b.data_inclusao <= p.data_referencia
GROUP BY faixa_ans
ORDER BY faixa_ans;

-- 4.3 · Vidas ativas por UF com participação acumulada
SELECT
    COALESCE(uf, 'Sem UF')                                        AS uf,
    COUNT(*)                                                      AS vidas,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)            AS pct,
    ROUND(100.0 * SUM(COUNT(*)) OVER (ORDER BY COUNT(*) DESC)
                / SUM(COUNT(*)) OVER (), 1)                       AS pct_acumulado
FROM carteira.beneficiarios b, carteira.parametros p
WHERE b.situacao = 'ATIVO' AND b.data_inclusao <= p.data_referencia
GROUP BY COALESCE(uf, 'Sem UF')
ORDER BY vidas DESC;

-- 4.4 · Mix de produtos (segmento × acomodação)
SELECT
    segmento,
    acomodacao,
    COUNT(*)                                            AS vidas,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)  AS pct
FROM carteira.beneficiarios b, carteira.parametros p
WHERE b.situacao = 'ATIVO' AND b.data_inclusao <= p.data_referencia
GROUP BY segmento, acomodacao
ORDER BY vidas DESC;

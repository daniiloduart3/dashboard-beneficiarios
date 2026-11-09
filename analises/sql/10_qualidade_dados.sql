-- =====================================================================
-- 10 · Qualidade dos dados
-- Antes de confiar nos indicadores, quanto da base tem problema?
-- =====================================================================

-- 10.1 · Resumo dos problemas encontrados
SELECT 'Total de registros'                          AS verificacao, COUNT(*) AS registros,
       100.0 AS pct
FROM carteira.beneficiarios
UNION ALL
SELECT 'Sem cidade/UF registrada', COUNT(*) FILTER (WHERE uf IS NULL),
       ROUND(100.0 * COUNT(*) FILTER (WHERE uf IS NULL) / COUNT(*), 2)
FROM carteira.beneficiarios
UNION ALL
SELECT 'Em digitação (ainda não ativos)', COUNT(*) FILTER (WHERE em_digitacao),
       ROUND(100.0 * COUNT(*) FILTER (WHERE em_digitacao) / COUNT(*), 2)
FROM carteira.beneficiarios
UNION ALL
SELECT 'Cancelamento antes da inclusão', COUNT(*) FILTER (WHERE datas_inconsistentes),
       ROUND(100.0 * COUNT(*) FILTER (WHERE datas_inconsistentes) / COUNT(*), 2)
FROM carteira.beneficiarios
UNION ALL
SELECT 'Erro cadastral (gerado indevidamente/duplicado)', COUNT(*) FILTER (WHERE erro_cadastral),
       ROUND(100.0 * COUNT(*) FILTER (WHERE erro_cadastral) / COUNT(*), 2)
FROM carteira.beneficiarios
UNION ALL
SELECT 'Cancelado sem motivo informado', COUNT(*) FILTER (WHERE situacao = 'CANCELADO' AND motivo_original IS NULL),
       ROUND(100.0 * COUNT(*) FILTER (WHERE situacao = 'CANCELADO' AND motivo_original IS NULL) / COUNT(*), 2)
FROM carteira.beneficiarios
UNION ALL
SELECT 'Ativo com motivo de cancelamento', COUNT(*) FILTER (WHERE situacao = 'ATIVO' AND motivo_original IS NOT NULL),
       ROUND(100.0 * COUNT(*) FILTER (WHERE situacao = 'ATIVO' AND motivo_original IS NOT NULL) / COUNT(*), 2)
FROM carteira.beneficiarios
UNION ALL
SELECT 'Fora da base válida (excluídos das análises)', COUNT(*) FILTER (WHERE NOT base_valida),
       ROUND(100.0 * COUNT(*) FILTER (WHERE NOT base_valida) / COUNT(*), 2)
FROM carteira.beneficiarios;

-- 10.2 · Motivos sem de-para (devem ser adicionados em mapa_motivos)
SELECT motivo_original, COUNT(*) AS registros
FROM carteira.beneficiarios
WHERE motivo_grupo = 'Não mapeado'
GROUP BY motivo_original
ORDER BY registros DESC;

-- 10.3 · Antes × depois da padronização dos motivos
SELECT
    COUNT(DISTINCT motivo_original) AS motivos_originais,
    COUNT(DISTINCT motivo)          AS motivos_padronizados,
    COUNT(DISTINCT motivo_grupo)    AS grupos_de_motivo
FROM carteira.beneficiarios
WHERE motivo_original IS NOT NULL;

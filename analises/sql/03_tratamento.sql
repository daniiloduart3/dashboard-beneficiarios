-- =====================================================================
-- 03 · Tratamento e enriquecimento
-- Gera a tabela analítica carteira.beneficiarios a partir da staging:
--   · converte datas e idade para os tipos corretos
--   · classifica PF/PJ, faixa etária ANS, segmento e acomodação do plano
--   · padroniza o motivo de cancelamento (de-para)
--   · marca quais registros entram nas análises e por quê
-- =====================================================================

-- Faixas etárias da ANS (10 faixas usadas para precificação e reajuste)
CREATE OR REPLACE FUNCTION carteira.faixa_ans(idade INT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN idade IS NULL OR idade < 0 THEN 'Não informado'
        WHEN idade <= 18 THEN '00 a 18'
        WHEN idade <= 23 THEN '19 a 23'
        WHEN idade <= 28 THEN '24 a 28'
        WHEN idade <= 33 THEN '29 a 33'
        WHEN idade <= 38 THEN '34 a 38'
        WHEN idade <= 43 THEN '39 a 43'
        WHEN idade <= 48 THEN '44 a 48'
        WHEN idade <= 53 THEN '49 a 53'
        WHEN idade <= 58 THEN '54 a 58'
        ELSE '59 ou mais'
    END
$$;

DROP TABLE IF EXISTS carteira.beneficiarios;

CREATE TABLE carteira.beneficiarios AS
WITH base AS (
    SELECT
        s.codigo_usuario,
        TO_DATE(s.data_inclusao, 'DD/MM/YYYY')                         AS data_inclusao,
        TO_DATE(NULLIF(s.data_cancelamento, ''), 'DD/MM/YYYY')         AS data_cancelamento,
        NULLIF(TRIM(s.empresa), '')                                    AS empresa,
        NULLIF(s.idade, '')::INT                                       AS idade,
        s.sexo,
        s.situacao,
        NULLIF(TRIM(s.motivo_cancelamento), '')                        AS motivo_original,
        NULLIF(s.cidade, 'SEM CIDADE REGISTRADA')                      AS cidade,
        NULLIF(s.uf, 'SEM ESTADO REGISTRADO')                          AS uf,
        s.plano
    FROM carteira.stg_beneficiarios s
)
SELECT
    b.*,
    CASE WHEN b.empresa IS NULL OR b.empresa = 'PF' THEN 'PF' ELSE 'PJ' END   AS tipo_cadastro,
    carteira.faixa_ans(b.idade)                                                AS faixa_ans,
    COALESCE(SUBSTRING(b.plano FROM '^VERTICE \S+ (\S+)'), 'OUTROS')            AS segmento,
    CASE WHEN b.plano LIKE '%APARTAMENTO%' THEN 'Apartamento' ELSE 'Enfermaria' END AS acomodacao,
    b.plano LIKE '%COPARTICIPACAO%'                                            AS coparticipacao,
    COALESCE(m.motivo_descricao, CASE WHEN b.motivo_original IS NULL THEN 'Sem motivo' ELSE 'Não mapeado' END) AS motivo,
    COALESCE(m.motivo_grupo,     CASE WHEN b.motivo_original IS NULL THEN 'Sem motivo' ELSE 'Não mapeado' END) AS motivo_grupo,

    -- Flags de qualidade: registros que NÃO representam um cliente real na carteira
    (b.situacao = 'DIGITAÇÃO')                                  AS em_digitacao,
    (b.data_cancelamento < b.data_inclusao)                     AS datas_inconsistentes,
    (COALESCE(m.motivo_grupo, '') = 'Erro cadastral')           AS erro_cadastral,

    -- Migração = saída técnica (o cliente muda de contrato, não deixa a operadora)
    (b.situacao = 'MIGRADO' OR COALESCE(m.motivo_grupo, '') = 'Migração') AS migracao
FROM base b
LEFT JOIN carteira.mapa_motivos m ON m.motivo_original = b.motivo_original;

-- Base válida para análises de carteira, churn e retenção
ALTER TABLE carteira.beneficiarios ADD COLUMN base_valida BOOLEAN;
UPDATE carteira.beneficiarios
SET base_valida = NOT (em_digitacao OR COALESCE(datas_inconsistentes, FALSE) OR erro_cadastral);

-- Perda = cancelamento real (exclui migração), dentro da base válida
ALTER TABLE carteira.beneficiarios ADD COLUMN perda BOOLEAN;
UPDATE carteira.beneficiarios
SET perda = base_valida AND data_cancelamento IS NOT NULL AND NOT migracao;

CREATE INDEX ON carteira.beneficiarios (data_inclusao);
CREATE INDEX ON carteira.beneficiarios (data_cancelamento);
CREATE INDEX ON carteira.beneficiarios (empresa);
ANALYZE carteira.beneficiarios;

-- Visão de uso diário: só o que entra nas análises
CREATE OR REPLACE VIEW carteira.vw_base_analitica AS
SELECT * FROM carteira.beneficiarios WHERE base_valida;

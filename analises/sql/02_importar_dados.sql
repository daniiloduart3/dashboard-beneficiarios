-- =====================================================================
-- 02 · Importação dos CSVs
--
-- OPÇÃO A · psql (terminal), rodando a partir da raiz do repositório:
--   psql -d SEU_BANCO -f analises/sql/02_importar_dados.sql
--
-- OPÇÃO B · pgAdmin: clique com o botão direito na tabela
--   carteira.stg_beneficiarios → Import/Export Data… e use:
--     Arquivo: public/beneficiarios-publico.csv
--     Formato: csv · Encoding: UTF8 · Header: ligado · Delimitador: ;
--   Repita para carteira.mapa_motivos com analises/dados/mapa_motivos.csv
--   Depois rode só o bloco de conferência no fim deste arquivo.
-- =====================================================================

\copy carteira.stg_beneficiarios FROM 'public/beneficiarios-publico.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';', ENCODING 'UTF8')

\copy carteira.mapa_motivos FROM 'analises/dados/mapa_motivos.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';', ENCODING 'UTF8')

-- Conferência: a base fictícia tem 190.652 linhas e 35 motivos mapeados.
SELECT 'beneficiarios' AS tabela, COUNT(*) AS linhas FROM carteira.stg_beneficiarios
UNION ALL
SELECT 'mapa_motivos', COUNT(*) FROM carteira.mapa_motivos;

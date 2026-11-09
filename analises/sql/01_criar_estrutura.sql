-- =====================================================================
-- 01 · Estrutura do banco
-- Cria o schema, a tabela "crua" (staging), a tabela de motivos e os
-- parâmetros da análise. Rode uma vez, antes da importação.
-- =====================================================================

DROP SCHEMA IF EXISTS carteira CASCADE;
CREATE SCHEMA carteira;

-- Staging: recebe o CSV exatamente como ele vem (tudo texto).
-- O tratamento de tipos fica no script 03, para nenhuma linha ser
-- rejeitada na importação por causa de um valor mal formatado.
CREATE TABLE carteira.stg_beneficiarios (
    codigo_usuario      TEXT,
    data_inclusao       TEXT,
    empresa             TEXT,
    idade               TEXT,
    sexo                TEXT,
    situacao            TEXT,
    data_cancelamento   TEXT,
    motivo_cancelamento TEXT,
    cidade              TEXT,
    uf                  TEXT,
    plano               TEXT
);

-- De-para dos motivos de cancelamento (o sistema de origem corta o texto
-- em 20 caracteres e grava o mesmo motivo de formas diferentes).
CREATE TABLE carteira.mapa_motivos (
    motivo_original  TEXT PRIMARY KEY,
    motivo_descricao TEXT NOT NULL,
    motivo_grupo     TEXT NOT NULL
);

-- Data de referência = data de extração da base.
-- Todos os indicadores "atuais" usam esta data, e não a data de hoje.
CREATE TABLE carteira.parametros (
    data_referencia DATE NOT NULL
);
INSERT INTO carteira.parametros VALUES ('2026-08-31');

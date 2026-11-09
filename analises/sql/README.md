# Análises em SQL (PostgreSQL)

Mesma base do dashboard, analisada direto no banco. Os scripts estão numerados e devem ser rodados em ordem.

| Script | O que faz |
|---|---|
| `01_criar_estrutura.sql` | Cria o schema `carteira`, a tabela de staging, o de-para de motivos e a data de referência |
| `02_importar_dados.sql` | Importa os CSVs (via `\copy` no psql ou pelo pgAdmin) |
| `03_tratamento.sql` | Converte tipos, cria faixas etárias ANS, segmento do plano, motivos padronizados e flags de qualidade |
| `04_kpis_atuais.sql` | Vidas ativas, PF × PJ, pirâmide etária ANS, UF com Pareto, mix de produtos |
| `05_churn_mensal.sql` | Entradas, perdas, migrações, saldo e churn mensal (com média móvel) |
| `06_coortes_retencao.sql` | Retenção por safra de entrada (1, 3, 6, 12 e 18 meses) |
| `07_permanencia.sql` | Tempo até o cancelamento por tipo, segmento e motivo |
| `08_eventos_atipicos.sql` | Crescimento "falso" por erro cadastral e alertas de churn |
| `09_empresas_concentracao.sql` | Ranking de empresas, curva de Pareto, porte e índice HHI |
| `10_qualidade_dados.sql` | Diagnóstico de qualidade da base |

## Como rodar

**psql**, a partir da raiz do repositório:

```bash
createdb carteira
for f in analises/sql/*.sql; do psql -d carteira -f "$f"; done
```

**pgAdmin**: crie um banco, abra o Query Tool e rode cada arquivo em ordem. No passo 02, use **Import/Export Data** (instruções no próprio arquivo).

## Definições usadas

- **Data de referência**: 31/08/2026, a data de extração da base. Nada é calculado com a data de hoje.
- **Base válida**: exclui registros em digitação, com cancelamento antes da inclusão e erros cadastrais (gerados indevidamente/duplicados).
- **Perda**: cancelamento real. **Migração** (troca de contrato) é contada à parte e não entra no churn.
- **Churn mensal**: perdas do mês ÷ vidas ativas no 1º dia do mês.
- **Faixas etárias**: as 10 faixas da ANS (0–18, 19–23 … 59+).

## Técnicas usadas

CTEs, window functions (`SUM OVER`, `RANK`, média móvel), `FILTER`, `generate_series`, `LATERAL`, `PERCENTILE_CONT`, views, função SQL e de-para via tabela auxiliar.

Todos os scripts foram testados no PostgreSQL 16.

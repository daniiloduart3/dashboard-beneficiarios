# Versão em Power BI

Roteiro para montar o mesmo painel no Power BI Desktop, com as mesmas regras do SQL, do notebook e do dashboard web. O arquivo `.pbix` não está no repositório: monte-o seguindo os passos abaixo e salve em `analises/powerbi/dashboard-beneficiarios.pbix`.

| Arquivo | Conteúdo |
|---|---|
| `01_power_query.pq` | Consultas M: `dMotivos`, `fBeneficiarios` (tratamento completo) e `dPrazos` |
| `02_modelo_e_medidas.dax` | Tabela calendário, relacionamentos e todas as medidas DAX |

## Passo a passo

1. **Parâmetro.** Em *Transformar dados → Gerenciar parâmetros*, crie `PastaProjeto` (Texto) com o caminho da pasta do repositório, terminando em `\`.
2. **Consultas.** Crie três consultas nulas e cole o código de `01_power_query.pq`, na ordem: `dMotivos`, `fBeneficiarios`, `dPrazos`. Clique em *Fechar e aplicar*.
3. **Calendário.** *Modelagem → Nova tabela* → cole `dCalendario`. Renomeie `[Date]` para `[Data]`, marque como tabela de datas e classifique `Mes` por `AnoMes`.
4. **Relacionamentos.** `dCalendario[Data]` → `fBeneficiarios[DataInclusao]` (ativo) e `dCalendario[Data]` → `fBeneficiarios[DataCancelamento]` (inativo). `dPrazos` fica solta.
5. **Medidas.** Crie a tabela `_Medidas` (*Inserir dados → tabela vazia*) e cole as medidas de `02_modelo_e_medidas.dax`.
6. **Confira os números.** Com a base fictícia, `Vidas Ativas` = **87.081**, churn de ago/26 = **16,1%** e retenção média em 12 meses ≈ **68,6%**. Os valores são os mesmos do SQL e do notebook.

## Layout sugerido (5 páginas)

| Página | Visuais |
|---|---|
| **Visão executiva** | Cartões: Vidas Ativas, % PJ, Idade Média, % 59 ou mais · Colunas: Entradas × Perdas por mês · Mapa ou barras por UF |
| **Churn e alertas** | Linha: Churn % e Churn % MM3 por mês · Tabela: mês, Churn %, Churn Mediana 12m, Alerta Churn, Perdas Excedentes |
| **Retenção** | Matriz: `Safra` × `dPrazos[Rotulo]` com `Retencao %` e formatação condicional em escala de azul (heatmap) · Barras: Permanência Mediana por Segmento |
| **Perfil e empresas** | Barras horizontais por `FaixaANS` (pirâmide por sexo) · Tabela: Empresa, Vidas Ativas, % da Carteira PJ, Ranking (filtro Top 15) |
| **Qualidade dos dados** | Colunas: Entradas Brutas × Entradas por mês · Cartão: % Fora da Base Válida · Tabela de motivos originais → padronizados |

Segmentações em todas as páginas: UF, Tipo de cadastro, Segmento e Faixa ANS.

## Dicas de apresentação

- Use no máximo 2 ou 3 cores e mantenha o mesmo significado em todas as páginas (azul = entradas/carteira, laranja = perdas).
- Não use gráfico com dois eixos Y: churn (%) e quantidade de perdas vão em visuais separados.
- Coloque um texto curto de conclusão no topo de cada página, por exemplo: "A alta de jul–ago/26 vem de insatisfação".
- Publique no Power BI Service com *Publicar na Web* (só porque os dados são fictícios) e coloque o link no README principal.

> Observação: o DAX e o M foram escritos para reproduzir os resultados do SQL, mas não foram executados no Power BI durante a criação. Se alguma medida der erro, a lógica de referência está em `analises/sql`.

# Análise em Python

`analise_carteira.ipynb`: análise exploratória e de retenção da carteira, com conclusões e recomendações. O GitHub mostra o notebook já executado, com tabelas e gráficos.

**Conteúdo:** qualidade dos dados · tratamento (faixas ANS, de-para de motivos) · retrato da carteira · churn mensal com alerta automático · retenção por safra (heatmap) · permanência · investigação da alta de cancelamentos de jul–ago/26 · concentração PJ · conclusões.

## Como rodar

```bash
cd analises/python
pip install -r requirements.txt
jupyter notebook analise_carteira.ipynb
```

O notebook lê `public/beneficiarios-publico.csv` e `analises/dados/mapa_motivos.csv` por caminho relativo. Rode a partir desta pasta.

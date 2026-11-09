# Dashboard de Beneficiários · Operadora de Saúde

Dashboard interativo para acompanhar a carteira de vidas de uma operadora de planos de saúde: tamanho da carteira, crescimento, cancelamentos, perfil demográfico, distribuição geográfica e concentração por empresa.

> ⚠️ **Todos os dados deste repositório são fictícios.** A operadora "Vértice Saúde", as empresas, os planos e os beneficiários foram gerados para demonstração. Nenhum dado real de pessoas ou empresas é exibido.

🔗 **Demo:** _cole aqui o link do Netlify_

![Prévia do dashboard](docs/preview.png)

## O problema

Em operadoras de saúde, a informação sobre a carteira costuma ficar espalhada em relatórios e planilhas extraídos do sistema. Para responder perguntas simples, como "quantas vidas ativas temos hoje?", "onde estamos crescendo?" ou "por que estamos perdendo beneficiários?", alguém precisava montar uma análise manual a cada vez.

Este projeto transforma a base de beneficiários em um painel único, com filtros, que responde essas perguntas na hora.

## Módulos

| Módulo | O que mostra |
|---|---|
| **Executivo** | KPIs da carteira, evolução histórica, score executivo e principais insights |
| **Geografia** | Mapa do Brasil por estado e município, ranking de cidades e penetração sobre a população (IBGE) |
| **Crescimento** | Inclusões e cancelamentos por mês, saldo líquido e tendência |
| **Cancelamentos** | Motivos de cancelamento, evolução das perdas e concentração |
| **Demografia** | Faixa etária, sexo e perfil da carteira |
| **Empresas** | Concentração por empresa, comparação entre contratos e Pessoa Física × Jurídica |

Filtros: estado, cidade, faixa etária, empresa, tipo de cadastro (PF/PJ) e período. Exportação para CSV, imagem e PDF. Tema claro e escuro.

## Tecnologias

- **React 19** + **Vite**
- **ECharts** e **Recharts** para os gráficos
- **react-simple-maps** + malhas do IBGE para o mapa
- **jsPDF**, **html2canvas** e **html-to-image** para exportação
- Deploy no **Netlify**

## Sobre os dados

O arquivo `public/beneficiarios-publico.csv` contém cerca de 190 mil registros sintéticos com a mesma estrutura de uma base real de beneficiários:

`Código do usuário; Data de Inclusão; Empresa; Idade; Sexo; Situação; Data de cancelamento; Motivo do cancelamento; Cidade de correspondência; Estado de correspondência; Descrição do plano`

Os registros foram gerados combinando atributos sorteados de forma independente, com ruído nas datas e idades. Assim o dashboard mantém padrões realistas de comportamento sem que nenhuma linha corresponda a uma pessoa real. Nomes de empresas e planos são inventados.

Os dados populacionais por município são públicos (estimativas do IBGE).

## Como rodar localmente

```bash
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

## Autor

**Daniilo Duarte**: economista, migrando para a área de dados com foco em análise e estratégia.
[LinkedIn](https://www.linkedin.com/in/SEU-PERFIL) · [GitHub](https://github.com/daniiloduart3)

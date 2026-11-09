// =====================================================================
// Power Query (linguagem M)
// Em Power BI: Página Inicial → Transformar dados → Nova fonte → Consulta nula
// → Editor Avançado → cole cada consulta abaixo e renomeie como indicado.
//
// Antes, crie o parâmetro "PastaProjeto" (Gerenciar parâmetros → Novo, tipo Texto)
// com o caminho da pasta do repositório, terminando em barra. Exemplo:
//   C:\Users\voce\Documents\dashboard-beneficiarios\
// =====================================================================


// ---------------------------------------------------------------------
// Consulta: dMotivos
// ---------------------------------------------------------------------
let
    Fonte = Csv.Document(
        File.Contents(PastaProjeto & "analises\dados\mapa_motivos.csv"),
        [Delimiter = ";", Encoding = 65001, QuoteStyle = QuoteStyle.None]
    ),
    Cabecalho = Table.PromoteHeaders(Fonte, [PromoteAllScalars = true]),
    Tipos = Table.TransformColumnTypes(Cabecalho, {
        {"motivo_original", type text}, {"motivo_descricao", type text}, {"motivo_grupo", type text}
    })
in
    Tipos


// ---------------------------------------------------------------------
// Consulta: fBeneficiarios
// ---------------------------------------------------------------------
let
    DataReferencia = #date(2026, 8, 31),

    Fonte = Csv.Document(
        File.Contents(PastaProjeto & "public\beneficiarios-publico.csv"),
        [Delimiter = ";", Encoding = 65001, QuoteStyle = QuoteStyle.None]
    ),
    Cabecalho = Table.PromoteHeaders(Fonte, [PromoteAllScalars = true]),
    Renomeado = Table.RenameColumns(Cabecalho, {
        {"Código do usuário", "Codigo"}, {"Data de Inclusão", "DataInclusao"},
        {"Empresa", "Empresa"}, {"Idade", "Idade"}, {"Sexo", "Sexo"},
        {"Situação", "Situacao"}, {"Data de cancelamento", "DataCancelamento"},
        {"Motivo do cancelamento", "MotivoOriginal"}, {"Cidade de correspondência", "Cidade"},
        {"Estado de correspondência", "UF"}, {"Descrição do plano", "Plano"}
    }),
    Vazios = Table.ReplaceValue(Renomeado, "", null, Replacer.ReplaceValue,
        {"Empresa", "DataCancelamento", "MotivoOriginal", "Idade"}),
    SemRegistro = Table.ReplaceValue(
        Table.ReplaceValue(Vazios, "SEM CIDADE REGISTRADA", null, Replacer.ReplaceValue, {"Cidade"}),
        "SEM ESTADO REGISTRADO", null, Replacer.ReplaceValue, {"UF"}),
    Tipos = Table.TransformColumnTypes(SemRegistro, {
        {"DataInclusao", type date}, {"DataCancelamento", type date}, {"Idade", Int64.Type}
    }, "pt-BR"),

    TipoCadastro = Table.AddColumn(Tipos, "TipoCadastro",
        each if [Empresa] = null or [Empresa] = "PF" then "PF" else "PJ", type text),

    FaixaANS = Table.AddColumn(TipoCadastro, "FaixaANS", each
        let i = [Idade] in
        if i = null then "Não informado"
        else if i <= 18 then "00 a 18" else if i <= 23 then "19 a 23"
        else if i <= 28 then "24 a 28" else if i <= 33 then "29 a 33"
        else if i <= 38 then "34 a 38" else if i <= 43 then "39 a 43"
        else if i <= 48 then "44 a 48" else if i <= 53 then "49 a 53"
        else if i <= 58 then "54 a 58" else "59 ou mais", type text),

    Segmento = Table.AddColumn(FaixaANS, "Segmento", each
        let partes = Text.Split([Plano], " ") in
        if List.Count(partes) >= 3 and partes{0} = "VERTICE" then Text.Proper(partes{2}) else "Outros", type text),

    Acomodacao = Table.AddColumn(Segmento, "Acomodacao",
        each if Text.Contains([Plano], "APARTAMENTO") then "Apartamento" else "Enfermaria", type text),

    ComMotivo = Table.NestedJoin(Acomodacao, {"MotivoOriginal"}, dMotivos, {"motivo_original"}, "M", JoinKind.LeftOuter),
    Expandido = Table.ExpandTableColumn(ComMotivo, "M", {"motivo_descricao", "motivo_grupo"}, {"Motivo", "MotivoGrupo"}),
    MotivoFinal = Table.ReplaceValue(
        Table.ReplaceValue(Expandido, null, "Sem motivo", Replacer.ReplaceValue, {"Motivo"}),
        null, "Sem motivo", Replacer.ReplaceValue, {"MotivoGrupo"}),

    // Regras de qualidade (as mesmas do SQL e do notebook)
    Flags = Table.AddColumn(MotivoFinal, "BaseValida", each
        not ([Situacao] = "DIGITAÇÃO"
             or ([DataCancelamento] <> null and [DataCancelamento] < [DataInclusao])
             or [MotivoGrupo] = "Erro cadastral"), type logical),
    Migracao = Table.AddColumn(Flags, "Migracao",
        each [Situacao] = "MIGRADO" or [MotivoGrupo] = "Migração", type logical),
    Perda = Table.AddColumn(Migracao, "Perda",
        each [BaseValida] and [DataCancelamento] <> null and not [Migracao], type logical),

    Safra = Table.AddColumn(Perda, "Safra", each Date.StartOfMonth([DataInclusao]), type date),
    Permanencia = Table.AddColumn(Safra, "MesesPermanencia", each
        if [Perda] then Duration.Days([DataCancelamento] - [DataInclusao]) / 30.4375 else null, type number)
in
    Permanencia


// ---------------------------------------------------------------------
// Consulta: dPrazos  (tabela desconectada para a matriz de coortes)
// ---------------------------------------------------------------------
let
    Fonte = #table(type table [Meses = Int64.Type, Rotulo = text], {
        {1, "1 mês"}, {3, "3 meses"}, {6, "6 meses"}, {12, "12 meses"}, {18, "18 meses"}
    })
in
    Fonte

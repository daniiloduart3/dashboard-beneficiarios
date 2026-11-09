import { FAIXAS_ETARIAS } from "../constants/dashboard";

export default function DashboardFilters({ dashboard }) {
  const {
    estadoSelecionado, cidadeSelecionada, faixaEtariaSelecionada,
    empresaSelecionada, tipoCadastroSelecionado, dataInicial, dataFinal,
    estadosDisponiveis, cidadesDisponiveis, empresasDisponiveis,
    periodoInvalido, filtrosAtivos, totalBeneficiarios, dataUltimaAtualizacao,
    alterarEstado, limparFiltros, removerFiltro,
    setCidadeSelecionada, setFaixaEtariaSelecionada, setEmpresaSelecionada,
    setTipoCadastroSelecionado, setDataInicial, setDataFinal,
    setBuscaCidade, setBuscaEmpresa,
  } = dashboard;

  return (
    <section className="painel-filtros-premium" aria-label="Filtros do dashboard">
      <div className="painel-filtros-cabecalho">
        <div>
          <span className="painel-filtros-eyebrow">Refine a análise</span>
          <h2>Filtros da carteira</h2>
          <p>Combine critérios geográficos, demográficos e de período.</p>
        </div>
        <div className="painel-filtros-resumo">
          <strong>{totalBeneficiarios.toLocaleString("pt-BR")}</strong>
          <span>vidas encontradas</span>
        </div>
      </div>

      <div className="filtros-container filtros-container-premium">
        <div className="campo-filtro"><label htmlFor="filtro-estado">Estado</label><select id="filtro-estado" value={estadoSelecionado} onChange={alterarEstado}><option value="Todos">Todos os estados</option>{estadosDisponiveis.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select></div>
        <div className="campo-filtro"><label htmlFor="filtro-cidade">Cidade</label><select id="filtro-cidade" value={cidadeSelecionada} onChange={(evento) => { setCidadeSelecionada(evento.target.value); setBuscaCidade(""); }}><option value="Todas">Todas as cidades</option>{cidadesDisponiveis.map((cidade) => <option key={cidade} value={cidade}>{cidade}</option>)}</select></div>
        <div className="campo-filtro"><label htmlFor="filtro-faixa-etaria">Faixa etária</label><select id="filtro-faixa-etaria" value={faixaEtariaSelecionada} onChange={(evento) => setFaixaEtariaSelecionada(evento.target.value)}><option value="Todas">Todas as faixas</option>{FAIXAS_ETARIAS.map((faixa) => <option key={faixa} value={faixa}>{faixa}</option>)}</select></div>
        <div className="campo-filtro"><label htmlFor="filtro-empresa">Empresa</label><select id="filtro-empresa" value={empresaSelecionada} onChange={(evento) => { setEmpresaSelecionada(evento.target.value); setBuscaEmpresa(""); }}><option value="Todas">Todas as empresas</option>{empresasDisponiveis.map((empresa) => <option key={empresa} value={empresa}>{empresa}</option>)}</select></div>
        <div className="campo-filtro"><label htmlFor="filtro-tipo-cadastro">Tipo de cadastro</label><select id="filtro-tipo-cadastro" value={tipoCadastroSelecionado} onChange={(evento) => setTipoCadastroSelecionado(evento.target.value)}><option value="Todos">Todos os tipos</option><option value="Pessoa Física">Pessoa Física</option><option value="Pessoa Jurídica">Pessoa Jurídica</option><option value="Não informado">Não informado</option></select></div>
        <div className="campo-filtro campo-filtro-data"><label htmlFor="filtro-data-inicial">Inclusão inicial</label><input id="filtro-data-inicial" type="date" value={dataInicial} onChange={(evento) => setDataInicial(evento.target.value)} /></div>
        <div className="campo-filtro campo-filtro-data"><label htmlFor="filtro-data-final">Inclusão final</label><input id="filtro-data-final" type="date" value={dataFinal} onChange={(evento) => setDataFinal(evento.target.value)} /></div>
        <button type="button" className="botao-limpar-filtros" onClick={limparFiltros} disabled={filtrosAtivos.length === 0}>Limpar filtros</button>
      </div>

      <div className="painel-filtros-rodape">
        <span>Última inclusão na carteira: <strong>{dataUltimaAtualizacao}</strong></span>
        <span>{filtrosAtivos.length === 0 ? "Nenhum filtro adicional aplicado" : `${filtrosAtivos.length} filtro${filtrosAtivos.length > 1 ? "s" : ""} ativo${filtrosAtivos.length > 1 ? "s" : ""}`}</span>
      </div>

      {periodoInvalido && <div className="aviso-periodo"><strong>Período inválido.</strong><span>A data inicial deve ser anterior ou igual à data final.</span></div>}

      {filtrosAtivos.length > 0 && (
        <div className="filtros-ativos">
          <div className="filtros-ativos-titulo"><span>Filtros aplicados</span><button type="button" onClick={limparFiltros}>Remover todos</button></div>
          <div className="filtros-ativos-lista">{filtrosAtivos.map((filtro) => <button key={filtro.tipo} type="button" className="filtro-ativo" onClick={() => removerFiltro(filtro.tipo)} title="Remover este filtro"><span>{filtro.rotulo}</span><strong aria-hidden="true">×</strong></button>)}</div>
        </div>
      )}
    </section>
  );
}

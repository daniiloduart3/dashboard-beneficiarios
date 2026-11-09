export default function SummaryTables({ dashboard, showCity = true, showCompany = true }) {
  const {
    beneficiariosPorEmpresa,
    beneficiariosPorCidade,
    totalBeneficiarios,
    buscaEmpresa,
    setBuscaEmpresa,
    buscaCidade,
    setBuscaCidade,
    empresasPesquisadas,
    cidadesPesquisadas,
    empresaSelecionada,
    cidadeSelecionada,
    selecionarEmpresaTabela,
    selecionarCidadeTabela,
  } = dashboard;

  return (
          <section className={`tabelas-resumo-grid ${showCity && showCompany ? "" : "tabelas-resumo-grid-unica"}`.trim()}>
            {showCity && <article className="tabela-resumo-container">
              <div className="titulo-tabela-resumo">
                <div>
                  <h2>Beneficiários por cidade</h2>

                  <p>
                    {beneficiariosPorCidade.length.toLocaleString(
                      "pt-BR"
                    )}{" "}
                    cidades na seleção
                  </p>
                </div>

                <strong>
                  {totalBeneficiarios.toLocaleString(
                    "pt-BR"
                  )}{" "}
                  vidas
                </strong>
              </div>

              <div className="pesquisa-tabela">
                <input
                  type="search"
                  placeholder="Pesquisar cidade..."
                  value={buscaCidade}
                  onChange={(evento) =>
                    setBuscaCidade(evento.target.value)
                  }
                />
              </div>

              <div className="tabela-resumo-scroll">
                <table className="tabela-resumo">
                  <thead>
                    <tr>
                      <th>Cidade</th>
                      <th>Beneficiários</th>
                      <th>Participação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cidadesPesquisadas.length > 0 ? (
                      cidadesPesquisadas.map((item) => {
                        const percentual =
                          totalBeneficiarios > 0
                            ? (item.quantidade /
                                totalBeneficiarios) *
                              100
                            : 0;

                        const cidadeEstaSelecionada =
                          cidadeSelecionada === item.cidade;

                        return (
                          <tr
                            key={item.cidade}
                            className={
                              cidadeEstaSelecionada
                                ? "linha-tabela-selecionada"
                                : "linha-tabela-clicavel"
                            }
                            onClick={() =>
                              selecionarCidadeTabela(
                                item.cidade
                              )
                            }
                            title={
                              item.cidade ===
                              "Não informado"
                                ? "Cidade não informada"
                                : `Filtrar por ${item.cidade}`
                            }
                            tabIndex={
                              item.cidade ===
                              "Não informado"
                                ? -1
                                : 0
                            }
                            aria-selected={
                              cidadeEstaSelecionada
                            }
                            onKeyDown={(evento) => {
                              if (
                                evento.key === "Enter" ||
                                evento.key === " "
                              ) {
                                evento.preventDefault();

                                selecionarCidadeTabela(
                                  item.cidade
                                );
                              }
                            }}
                          >
                            <td title={item.cidade}>
                              {item.cidade}
                            </td>

                            <td>
                              {item.quantidade.toLocaleString(
                                "pt-BR"
                              )}
                            </td>

                            <td className="celula-participacao">
                              <div className="participacao-valor">
                                {percentual.toFixed(1)}%
                              </div>

                              <div
                                className="barra-participacao"
                                title={`${percentual.toFixed(
                                  1
                                )}% dos beneficiários`}
                              >
                                <span
                                  style={{
                                    width: `${Math.min(
                                      percentual,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3">
                          Nenhuma cidade encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>}

            {showCompany && <article className="tabela-resumo-container">
              <div className="titulo-tabela-resumo">
                <div>
                  <h2>Beneficiários por empresa</h2>

                  <p>
                    {beneficiariosPorEmpresa.length.toLocaleString(
                      "pt-BR"
                    )}{" "}
                    empresas na seleção
                  </p>
                </div>

                <strong>
                  {totalBeneficiarios.toLocaleString(
                    "pt-BR"
                  )}{" "}
                  vidas
                </strong>
              </div>

              <div className="pesquisa-tabela">
                <input
                  type="search"
                  placeholder="Pesquisar empresa..."
                  value={buscaEmpresa}
                  onChange={(evento) =>
                    setBuscaEmpresa(evento.target.value)
                  }
                />
              </div>

              <div className="tabela-resumo-scroll">
                <table className="tabela-resumo">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Beneficiários</th>
                      <th>Participação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {empresasPesquisadas.length > 0 ? (
                      empresasPesquisadas.map((item) => {
                        const percentual =
                          totalBeneficiarios > 0
                            ? (item.quantidade /
                                totalBeneficiarios) *
                              100
                            : 0;

                        const empresaEstaSelecionada =
                          empresaSelecionada === item.empresa;

                        return (
                          <tr
                            key={item.empresa}
                            className={
                              empresaEstaSelecionada
                                ? "linha-tabela-selecionada"
                                : "linha-tabela-clicavel"
                            }
                            onClick={() =>
                              selecionarEmpresaTabela(
                                item.empresa
                              )
                            }
                            title={`Filtrar por ${item.empresa}`}
                            tabIndex={0}
                            aria-selected={
                              empresaEstaSelecionada
                            }
                            onKeyDown={(evento) => {
                              if (
                                evento.key === "Enter" ||
                                evento.key === " "
                              ) {
                                evento.preventDefault();

                                selecionarEmpresaTabela(
                                  item.empresa
                                );
                              }
                            }}
                          >
                            <td title={item.empresa}>
                              {item.empresa}
                            </td>

                            <td>
                              {item.quantidade.toLocaleString(
                                "pt-BR"
                              )}
                            </td>

                            <td className="celula-participacao">
                              <div className="participacao-valor">
                                {percentual.toFixed(1)}%
                              </div>

                              <div
                                className="barra-participacao"
                                title={`${percentual.toFixed(
                                  1
                                )}% dos beneficiários`}
                              >
                                <span
                                  style={{
                                    width: `${Math.min(
                                      percentual,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3">
                          Nenhuma empresa encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>}
          </section>
  );
}

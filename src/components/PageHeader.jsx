import { memo } from "react";

function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="pagina-dashboard-cabecalho">
      <div className="pagina-dashboard-cabecalho-titulo">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <p>{description}</p>
    </header>
  );
}

export default memo(PageHeader);

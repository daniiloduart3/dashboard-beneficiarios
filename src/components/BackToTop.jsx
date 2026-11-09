import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const atualizar = () => setVisivel(window.scrollY > 520);
    atualizar();
    window.addEventListener("scroll", atualizar, { passive: true });
    return () => window.removeEventListener("scroll", atualizar);
  }, []);

  if (!visivel) return null;

  return (
    <button
      type="button"
      className="voltar-ao-topo"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
    >
      ↑
    </button>
  );
}

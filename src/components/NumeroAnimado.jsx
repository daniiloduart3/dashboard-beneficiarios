import { useEffect, useState } from "react";

export default function NumeroAnimado({ valor, casasDecimais = 0, sufixo = "" }) {
  const [valorExibido, setValorExibido] = useState(0);

  useEffect(() => {
    const valorFinal = Number(valor) || 0;
    const reduzirMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduzirMovimento) {
      setValorExibido(valorFinal);
      return undefined;
    }

    const duracao = 650;
    const inicio = performance.now();
    const valorInicial = valorExibido;
    const diferenca = valorFinal - valorInicial;
    let quadroAnimacao;

    function atualizar(tempoAtual) {
      const progresso = Math.min(
        (tempoAtual - inicio) / duracao,
        1
      );

      const progressoSuavizado =
        1 - Math.pow(1 - progresso, 3);

      setValorExibido(
        valorInicial + diferenca * progressoSuavizado
      );

      if (progresso < 1) {
        quadroAnimacao = requestAnimationFrame(atualizar);
      }
    }

    quadroAnimacao = requestAnimationFrame(atualizar);

    return () => cancelAnimationFrame(quadroAnimacao);
  }, [valor]);

  return (
    <span className="numero-animado">
      {valorExibido.toLocaleString("pt-BR", {
        minimumFractionDigits: casasDecimais,
        maximumFractionDigits: casasDecimais,
      })}
      {sufixo}
    </span>
  );
}


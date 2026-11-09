export function identificarFaixaEtaria(idadeTexto) {
  const idade = Number(idadeTexto);

  if (
    idadeTexto === "" ||
    !Number.isFinite(idade) ||
    idade < 0 ||
    idade > 120
  ) {
    return "Não informado";
  }

  if (idade <= 17) return "0 a 17";
  if (idade <= 29) return "18 a 29";
  if (idade <= 39) return "30 a 39";
  if (idade <= 49) return "40 a 49";
  if (idade <= 59) return "50 a 59";

  return "60 ou mais";
}

export function empresaValidaParaAnalise(empresaTexto) {
  const empresa = String(empresaTexto ?? "").trim();
  const normalizada = empresa.toLocaleUpperCase("pt-BR");

  return Boolean(
    empresa &&
    normalizada !== "NÃO INFORMADO" &&
    normalizada !== "NAO INFORMADO" &&
    normalizada !== "PF"
  );
}

export function identificarTipoCadastro(empresaTexto) {
  const empresa = String(empresaTexto ?? "").trim();

  if (!empresa || empresa.toLocaleUpperCase("pt-BR") === "NÃO INFORMADO" || empresa.toLocaleUpperCase("pt-BR") === "NAO INFORMADO") {
    return "Pessoa Física";
  }

  if (empresa.toLocaleUpperCase("pt-BR") === "PF") {
    return "Pessoa Física";
  }

  return "Pessoa Jurídica";
}

export function converterData(dataTexto) {
  if (!dataTexto) return null;

  const partes = dataTexto.split("/");

  if (partes.length !== 3) return null;

  const [dia, mes, ano] = partes.map(Number);
  const data = new Date(ano, mes - 1, dia);

  if (
    Number.isNaN(data.getTime()) ||
    data.getDate() !== dia ||
    data.getMonth() !== mes - 1 ||
    data.getFullYear() !== ano
  ) {
    return null;
  }

  data.setHours(0, 0, 0, 0);

  return data;
}

export function converterDataInput(dataTexto) {
  if (!dataTexto) return null;

  const partes = dataTexto.split("-");

  if (partes.length !== 3) return null;

  const [ano, mes, dia] = partes.map(Number);
  const data = new Date(ano, mes - 1, dia);

  if (
    Number.isNaN(data.getTime()) ||
    data.getDate() !== dia ||
    data.getMonth() !== mes - 1 ||
    data.getFullYear() !== ano
  ) {
    return null;
  }

  data.setHours(0, 0, 0, 0);

  return data;
}

export function formatarDataInput(dataTexto) {
  const data = converterDataInput(dataTexto);

  if (!data) return "";

  return data.toLocaleDateString("pt-BR");
}

export function normalizarNomeArquivo(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function protegerValorCsv(valor) {
  let texto = String(valor ?? "");

  if (/^[=+\-@]/.test(texto)) {
    texto = `'${texto}`;
  }

  if (
    texto.includes(";") ||
    texto.includes('"') ||
    texto.includes("\n") ||
    texto.includes("\r")
  ) {
    return `"${texto.replace(/"/g, '""')}"`;
  }

  return texto;
}


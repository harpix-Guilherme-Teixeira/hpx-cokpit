/** Chave legível a partir de um nome: sem acento, sem símbolo, sem espaço.
 *  Roda no navegador e no servidor, e tem que dar o mesmo resultado nos dois,
 *  senão a sugestão de card aponta para uma coluna que o servidor gravou com
 *  outra chave. */
export function aoSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

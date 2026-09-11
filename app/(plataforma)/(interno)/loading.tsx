/** Esqueleto que aparece NO CLIQUE, enquanto o servidor monta a página.
 *
 *  Sem ele o clique parecia travado: a tela antiga ficava parada até a nova
 *  chegar inteira, e meio segundo sem resposta lê-se como "não pegou". */
export default function Carregando() {
  return (
    <div
      className="mx-auto w-full max-w-7xl animate-pulse"
      aria-busy="true"
      aria-label="Carregando"
    >
      <div className="bg-grey-300/50 mb-2 h-7 w-56 rounded-lg" />
      <div className="bg-grey-300/40 mb-8 h-4 w-96 max-w-full rounded" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="border-grey-300/60 h-28 rounded-xl border bg-white" />
        ))}
      </div>
      <div className="border-grey-300/60 mt-6 h-64 rounded-xl border bg-white" />
    </div>
  );
}

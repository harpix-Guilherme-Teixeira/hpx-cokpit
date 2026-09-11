/** O editor ocupa a tela inteira, então o esqueleto também: três colunas no
 *  mesmo lugar onde elas vão aparecer, para a troca não dar salto. */
export default function CarregandoEditor() {
  return (
    <div className="bg-grey-200 fixed inset-0 z-40 flex animate-pulse flex-col" aria-busy="true">
      <div className="border-grey-300/60 bg-background h-14 shrink-0 border-b" />
      <div className="flex min-h-0 flex-1">
        <div className="border-grey-300/60 bg-background hidden w-64 border-r lg:block" />
        <div className="flex-1 p-4">
          <div className="border-grey-300/60 mx-auto h-full rounded-xl border bg-white" />
        </div>
        <div className="border-grey-300/60 bg-background hidden w-80 border-l lg:block" />
      </div>
    </div>
  );
}

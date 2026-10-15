import { Button } from "@/components/ui";

export function Paginacion({ pagina, total, porPagina, onCambio }: { pagina: number; total: number; porPagina: number; onCambio: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (total <= porPagina) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
      <span>
        Página {pagina + 1} de {paginas} · {total} registros
      </span>
      <div className="flex gap-2">
        <Button variant="outline" className="px-3 py-1.5" disabled={pagina === 0} onClick={() => onCambio(pagina - 1)}>
          Anterior
        </Button>
        <Button variant="outline" className="px-3 py-1.5" disabled={pagina + 1 >= paginas} onClick={() => onCambio(pagina + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}

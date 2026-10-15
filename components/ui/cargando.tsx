import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto mientras llegan los datos de una tabla o lista.
export function TablaCargando() {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando">
      <Skeleton className="h-10 w-full" />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

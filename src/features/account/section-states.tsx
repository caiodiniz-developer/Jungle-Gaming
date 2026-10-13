import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// título de uma seção da conta
export function SectionTitle({ children, description }: { children: React.ReactNode; description?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-[17px] leading-4 font-bold">{children}</h1>
      {description && <p className="text-sm leading-5 text-sand">{description}</p>}
    </div>
  );
}

// estado de carregamento
export function SectionLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-[70px]" />
      ))}
    </div>
  );
}

// estado de erro, com nova tentativa
export function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4">
      <p className="text-sm leading-6 text-sand">{message}</p>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </div>
  );
}

/** Estado vazio das seções da conta, com o caminho de volta ao mercado. */
export function SectionEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 text-sm leading-6 text-sand">
      <p>{children}</p>
      <Button asChild>
        <Link to="/" hash="catalogo">
          Explorar o mercado
        </Link>
      </Button>
    </div>
  );
}

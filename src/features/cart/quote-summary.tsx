import type { Quote } from "@/api/contracts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEth, formatEthLabel, isZeroEth } from "@/lib/eth";
import type { ApiError } from "@/lib/http";
import { cn } from "@/lib/utils";

type QuoteSummaryProps = {
  quote: Quote | undefined;
  error: ApiError | null;
  onRetry: () => void;
  /** Há alteração em andamento: os valores em tela serão substituídos. */
  updating?: boolean;
  className?: string;
};

/**
 * Valores da cotação (subtotal, desconto, taxa de rede e total), exatamente
 * como a API devolveu. Compartilhado entre carrinho e pagamento.
 */
export function QuoteSummary({ quote, error, onRetry, updating = false, className }: QuoteSummaryProps) {
  if (!quote) {
    if (error) {
      return (
        <div role="alert" className={cn("flex flex-col items-start gap-3", className)}>
          <p className="text-sm leading-5 text-sand">
            Não foi possível calcular os valores. {error.message}
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      );
    }
    return (
      <div role="status" aria-label="Calculando valores" className={cn("flex flex-col gap-4", className)}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-5" />
        ))}
      </div>
    );
  }

  return (
    <dl
      aria-busy={updating}
      className={cn("flex flex-col gap-3 text-[15px] transition-opacity", updating && "opacity-60", className)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <dt>Subtotal</dt>
        <dd data-testid="quote-subtotal" className="text-lg leading-6">
          {formatEthLabel(quote.subtotal)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt>
          {quote.coupon ? `${quote.coupon.description} (${quote.coupon.percent}%)` : "Desconto do lançamento"}
        </dt>
        <dd data-testid="quote-discount" className="leading-6 whitespace-nowrap">
          <span aria-hidden="true">(-) </span>
          <span className="sr-only">menos </span>
          {isZeroEth(quote.discount) ? "00.00" : formatEthLabel(quote.discount)}
        </dd>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <dt>Taxa de rede</dt>
          <dd data-testid="quote-fee" className="text-lg leading-6">
            {formatEth(quote.networkFee)} ETH
          </dd>
        </div>
        <p className="text-right text-xs leading-4 text-highlight">Taxa estimada</p>
      </div>
      <div className="flex items-baseline justify-between gap-4 pt-2">
        <dt className="text-base font-bold">Total</dt>
        <dd data-testid="quote-total" className="text-lg leading-6 font-bold text-highlight">
          {formatEthLabel(quote.total)}
        </dd>
      </div>
    </dl>
  );
}

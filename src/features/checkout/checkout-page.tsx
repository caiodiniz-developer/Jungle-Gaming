import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallets } from "@/features/account/use-account";
import { useSession } from "@/features/auth/session";
import { useCart } from "@/features/cart/use-cart";
import { CheckoutForm, type CheckoutFormProps } from "@/features/checkout/checkout-form";
import { useIsDesktop } from "@/lib/use-media-query";

/**
 * Com o carrinho vazio não há o que pagar — exceto se o formulário já estava em
 * uso: um pedido enviado pode ser confirmado (e esvaziar o carrinho) antes de a
 * resposta chegar, e a nova tentativa precisa continuar ao alcance.
 */
function CheckoutGate(props: CheckoutFormProps) {
  const [started, setStarted] = useState(!props.cartIsEmpty);
  if (!props.cartIsEmpty && !started) setStarted(true);

  if (!started) {
    return (
      <div className="flex flex-col items-start gap-4 py-10">
        <h2 className="text-lg font-bold">Seu carrinho está vazio</h2>
        <p className="max-w-xl text-sm leading-6 text-sand">
          Adicione NFTs ao carrinho para seguir ao pagamento.
        </p>
        <Button asChild>
          <Link to="/" hash="catalogo">
            Explorar o mercado
          </Link>
        </Button>
      </div>
    );
  }
  return <CheckoutForm {...props} />;
}

function CheckoutSkeleton() {
  return (
    <div role="status" aria-label="Carregando pagamento" className="flex flex-col gap-8 lg:flex-row">
      <div className="grid flex-1 gap-x-6 gap-y-3 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-[69px]" />
        ))}
      </div>
      <Skeleton className="h-[420px] lg:w-[405px]" />
    </div>
  );
}

/** Página de pagamento: espera sessão, carteiras e carrinho antes de montar o formulário. */
export function CheckoutPage() {
  const isDesktop = useIsDesktop();
  const { user } = useSession();
  const wallets = useWallets();
  const cart = useCart();

  const header = isDesktop ? (
    <Breadcrumb current="Pagamento" />
  ) : (
    <MobilePageHeader title="Pagamento com carteira" backTo="/carrinho" backLabel="Voltar ao carrinho" />
  );

  let content: React.ReactNode;
  if (wallets.isError || cart.isError) {
    content = (
      <div role="alert" className="flex flex-col items-start gap-4">
        <h2 className="text-lg font-bold">Não foi possível carregar o pagamento</h2>
        <p className="text-sm leading-6 text-sand">{(wallets.error ?? cart.error)?.message}</p>
        <Button
          onClick={() => {
            void wallets.refetch();
            void cart.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  } else if (!user || wallets.isPending || cart.isPending) {
    content = <CheckoutSkeleton />;
  } else {
    content = (
      // a chave recria o formulário ao trocar de conta
      <CheckoutGate key={user.id} user={user} wallets={wallets.data} cartIsEmpty={cart.data.lines.length === 0} />
    );
  }

  return (
    <div className="container-page flex flex-col gap-6 pt-8 pb-[190px] lg:pb-24">
      {header}
      {content}
    </div>
  );
}

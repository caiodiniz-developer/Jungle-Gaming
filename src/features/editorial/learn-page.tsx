import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Blog } from "@/features/catalog/home-sections";

// página Aprenda
export function LearnPage() {
  return (
    <div className="flex flex-col gap-12 pt-8 pb-16 lg:gap-16 lg:pb-24">
      <div className="container-page flex flex-col gap-3">
        <h1 className="text-2xl font-bold lg:text-[28px]">Aprenda</h1>
        <p className="max-w-2xl text-sm leading-6 text-sand">
          Guias para começar a colecionar: propriedade digital, raridade, procedência e segurança da
          carteira.
        </p>
      </div>
      <Blog />
      <div className="container-page flex flex-col items-start gap-3">
        <h2 className="text-lg font-bold">Ainda com dúvidas?</h2>
        <Button asChild>
          <Link to="/ajuda">Abrir a central de ajuda</Link>
        </Button>
      </div>
    </div>
  );
}

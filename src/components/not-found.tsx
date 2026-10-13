import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type NotFoundProps = {
  title?: string;
  description?: string;
};

export function NotFound({
  title = "Página não encontrada",
  description = "O endereço acessado não existe ou foi movido.",
}: NotFoundProps) {
  return (
    <section className="container-page flex min-h-[50vh] flex-col items-start justify-center gap-4 py-16">
      <p className="text-sm font-medium tracking-[1.4px] text-highlight">ERRO 404</p>
      <h1 className="text-[28px] font-bold">{title}</h1>
      <p className="max-w-xl text-sm leading-6 text-sand">{description}</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  );
}

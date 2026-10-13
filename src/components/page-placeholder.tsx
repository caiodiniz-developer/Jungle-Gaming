type PagePlaceholderProps = {
  title: string;
  description: string;
};

/** Conteúdo provisório das rotas enquanto as telas são implementadas. */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="container-page flex min-h-[50vh] flex-col justify-center gap-3 py-16">
      <h1 className="text-[28px] font-bold">{title}</h1>
      <p className="max-w-xl text-sm leading-6 text-sand">{description}</p>
    </section>
  );
}

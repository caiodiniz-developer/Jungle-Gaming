import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import facebookIcon from "@/assets/icons/social-facebook.svg";
import instagramIcon from "@/assets/icons/social-instagram.svg";
import linkedinIcon from "@/assets/icons/social-linkedin.svg";
import twitterIcon from "@/assets/icons/social-twitter.svg";
import youtubeIcon from "@/assets/icons/social-youtube.svg";

const HIGHLIGHTS = [
  {
    initial: "W",
    title: "Segurança da carteira",
    text: "Proteja sua carteira e colecione arte digital verificada com confiança.",
  },
  {
    initial: "C",
    title: "Criadores em destaque",
    text: "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
  },
  {
    initial: "D",
    title: "Alertas de lançamentos",
    text: "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
  },
];

const SOCIAL = [
  { name: "Facebook", icon: facebookIcon, href: "https://www.facebook.com/" },
  { name: "Instagram", icon: instagramIcon, href: "https://www.instagram.com/" },
  { name: "Twitter", icon: twitterIcon, href: "https://twitter.com/" },
  { name: "LinkedIn", icon: linkedinIcon, href: "https://www.linkedin.com/" },
  { name: "YouTube", icon: youtubeIcon, href: "https://www.youtube.com/" },
];

const PROFILE_ITEMS = [
  { label: "Meu perfil", to: "/conta/perfil" },
  { label: "Minha coleção", to: "/conta/arquivos" },
  { label: "Atividade", to: "/conta/atividade" },
  { label: "Estúdio do criador", to: "/criadores" },
  { label: "Lista de interesse", to: "/conta/favoritos" },
] as const;

const HELP_ITEMS = [
  { label: "Central de ajuda", hash: undefined },
  { label: "Como comprar NFTs", hash: "como-comprar" },
  { label: "Carteira e segurança", hash: "carteira-e-seguranca" },
  { label: "Política do mercado", hash: "politica-do-mercado" },
  { label: "Denunciar item", hash: "denunciar-item" },
];

/** Cada coleção abre o catálogo já filtrado por ela. */
const COLLECTION_ITEMS = [
  { label: "Arte digital", id: "arte-digital" },
  { label: "Fotografia", id: "fotografia" },
  { label: "Música", id: "musica" },
  { label: "Arte 3D", id: "arte-3d" },
  { label: "Utilidade", id: "utilidade" },
];

const footerLink = "hover:text-highlight";

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg leading-5 font-bold">{children}</h2>;
}

function Newsletter() {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // a newsletter não faz parte da entrega: informa em vez de simular uma inscrição
    toast.info("Inscrição indisponível nesta demonstração.");
  }

  return (
    <div className="flex flex-col gap-3 lg:w-[357px] lg:px-4">
      <h2 className="text-lg leading-4 font-bold">Antecipe-se ao próximo lançamento</h2>
      <form
        onSubmit={handleSubmit}
        className="mt-1 flex h-10 overflow-hidden rounded-md bg-surface-dark shadow-glow focus-within:outline-2 focus-within:outline-ring"
      >
        <label htmlFor="newsletter-email" className="sr-only">
          E-mail para receber novidades
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          className="min-w-0 flex-1 bg-transparent pl-3 text-sm text-foreground outline-none placeholder:text-subtle"
        />
        <button
          type="submit"
          className="w-[85px] shrink-0 bg-primary text-lg leading-4 font-bold text-ink transition-colors hover:bg-highlight"
        >
          Enviar
        </button>
      </form>
      <p className="text-[13px] leading-[22px] text-sand">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="container-page pb-6">
      <section
        aria-label="Destaques da Kurio"
        className="flex flex-col gap-8 bg-surface p-8 lg:flex-row lg:gap-0"
      >
        <ul className="grid flex-1 gap-8 sm:grid-cols-3 sm:gap-0">
          {HIGHLIGHTS.map((item) => (
            <li
              key={item.initial}
              className="flex flex-col gap-3 sm:border-r sm:border-primary sm:px-4 sm:last:border-r-0 lg:last:border-r"
            >
              <span
                aria-hidden="true"
                className="flex size-[74px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-ink"
              >
                {item.initial}
              </span>
              <h3 className="text-[17px] leading-4 font-bold">{item.title}</h3>
              <p className="max-w-[204px] text-sm leading-[22px] text-sand">{item.text}</p>
            </li>
          ))}
        </ul>
        <Newsletter />
      </section>

      <div className="flex flex-col gap-4 bg-surface-dark p-8 text-sm leading-[22px] md:min-h-[88px] md:flex-row md:items-center md:gap-8">
        <p className="flex-1 font-bold tracking-[1.4px]">KURIO</p>
        <p className="flex-1">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <p className="flex-1">
          <a href="mailto:contato@email.com" className="hover:text-highlight">
            contato@email.com
          </a>
        </p>
        <p className="md:w-[228px]">
          <a href="tel:+551140028922" className="hover:text-highlight">
            +55 11 4002 8922
          </a>
        </p>
      </div>

      <nav
        aria-label="Rodapé"
        className="grid gap-x-8 gap-y-10 bg-surface p-8 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_228px]"
      >
        <div className="flex flex-col gap-2">
          <ColumnTitle>Meu perfil</ColumnTitle>
          <ul className="text-sm leading-[30px]">
            {PROFILE_ITEMS.map((item) => (
              <li key={item.label}>
                <Link to={item.to} className={footerLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <ColumnTitle>Central de ajuda</ColumnTitle>
          <ul className="text-sm leading-[30px]">
            {HELP_ITEMS.map((item) => (
              <li key={item.label}>
                <Link to="/ajuda" hash={item.hash} className={footerLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <ColumnTitle>Coleções</ColumnTitle>
          <ul className="text-sm leading-[30px]">
            {COLLECTION_ITEMS.map((item) => (
              <li key={item.id}>
                <Link to="/" search={{ colecoes: item.id }} hash="catalogo" className={footerLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <ColumnTitle>Redes sociais</ColumnTitle>
            <ul className="flex gap-2.5">
              {SOCIAL.map((social) => (
                <li key={social.name}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${social.name} (abre em nova aba)`}
                    className="block transition-opacity hover:opacity-80"
                  >
                    <img src={social.icon} alt="" width={30} height={30} loading="lazy" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <ColumnTitle>Carteiras compatíveis</ColumnTitle>
            <p className="flex h-[26px] w-fit items-center justify-center rounded-md border border-border-soft bg-surface-dark px-2 text-[9px] font-bold tracking-[0.1px] whitespace-pre text-highlight">
              {"METAMASK  •  WALLETCONNECT  •  COINBASE"}
            </p>
          </div>
        </div>
      </nav>

      <p className="px-4 pt-3 text-center text-sm leading-6 md:pt-1.5 md:leading-[30px]">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  );
}

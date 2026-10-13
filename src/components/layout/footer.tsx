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
  { name: "Facebook", icon: facebookIcon },
  { name: "Instagram", icon: instagramIcon },
  { name: "Twitter", icon: twitterIcon },
  { name: "LinkedIn", icon: linkedinIcon },
  { name: "YouTube", icon: youtubeIcon },
];

const HELP_ITEMS = [
  "Central de ajuda",
  "Como comprar NFTs",
  "Carteira e segurança",
  "Política do mercado",
  "Denunciar item",
];

const COLLECTION_ITEMS = ["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"];

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg leading-5 font-bold">{children}</h2>;
}

/** Itens de páginas fora do escopo: mantêm o layout, mas não são links. */
function StaticList({ items }: { items: string[] }) {
  return (
    <ul className="text-sm leading-[30px]">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
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
            <li>
              <Link to="/conta/perfil" className="hover:text-highlight">
                Meu perfil
              </Link>
            </li>
            <li>Minha coleção</li>
            <li>Atividade</li>
            <li>Estúdio do criador</li>
            <li>Lista de interesse</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <ColumnTitle>Central de ajuda</ColumnTitle>
          <StaticList items={HELP_ITEMS} />
        </div>

        <div className="flex flex-col gap-2">
          <ColumnTitle>Coleções</ColumnTitle>
          <StaticList items={COLLECTION_ITEMS} />
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <ColumnTitle>Redes sociais</ColumnTitle>
            <ul className="flex gap-2.5">
              {SOCIAL.map((social) => (
                <li key={social.name}>
                  <img src={social.icon} alt={social.name} width={30} height={30} loading="lazy" />
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

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { Artwork } from "@/api/contracts";
import arrowRightIcon from "@/assets/icons/arrow-right.svg";
import heroMaskMobile from "@/assets/icons/hero-mask-mobile.svg";
import promoMask from "@/assets/icons/promo-mask.svg";
import { Icon } from "@/components/icon";
import { NftImage } from "@/components/nft-image";
import { cn } from "@/lib/utils";

const HERO_SLIDES: { nftId: string; name: string; artwork: Artwork }[] = [
  { nftId: "nft-0042", name: "Emerald Ape #042", artwork: "emerald-ape" },
  { nftId: "nft-0009", name: "Sage Nomad #009", artwork: "sage-nomad" },
  { nftId: "nft-0207", name: "Golden Beat #207", artwork: "golden-beat" },
];

function SlideDots({
  active,
  onSelect,
  className,
}: {
  active: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Destaques" className={cn("flex items-center gap-2", className)}>
      {HERO_SLIDES.map((slide, index) => (
        <button
          key={slide.nftId}
          type="button"
          aria-label={`Mostrar destaque ${index + 1}: ${slide.name}`}
          aria-pressed={index === active}
          onClick={() => onSelect(index)}
          // a área de toque é maior que o ponto visível
          className="flex size-6 items-center justify-center"
        >
          <span
            className={cn(
              "size-2 rounded-full bg-primary transition-opacity",
              index === active ? "opacity-100 ring-2 ring-primary/40" : "opacity-50",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function Hero() {
  const [active, setActive] = useState(0);
  const slide = HERO_SLIDES[active] ?? HERO_SLIDES[0]!;

  return (
    <section aria-labelledby="hero-title" className="container-page">
      {/* desktop */}
      <div className="hidden h-[450px] items-center justify-between pl-10 lg:flex">
        <div className="flex w-[600px] flex-col items-end gap-11">
          <div className="flex w-full flex-col items-start gap-8">
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-4 font-medium tracking-[1.4px]">Bem-vindo à Kurio</p>
              <h1 id="hero-title" className="mt-1 text-[43px] leading-[70px] font-bold">
                SEJA DONO DO FUTURO
                <br />
                DA ARTE DIGITAL
              </h1>
              <p className="max-w-[557px] text-sm leading-6 text-sand">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
                digital rara, apoie artistas e tenha uma parte da cultura da internet.
              </p>
            </div>
            <Link
              to="/"
              hash="catalogo"
              className="flex h-10 w-[140px] items-center justify-center rounded-md bg-primary text-base leading-5 font-bold text-ink transition-colors hover:bg-highlight"
            >
              EXPLORAR
            </Link>
          </div>
          <SlideDots active={active} onSelect={setActive} />
        </div>
        <Link
          to="/nft/$nftId"
          params={{ nftId: slide.nftId }}
          aria-label={`Ver ${slide.name}`}
          className="shrink-0 rounded-3xl"
        >
          <NftImage artwork={slide.artwork} alt={slide.name} size={450} priority className="rounded-3xl" />
        </Link>
      </div>

      {/* mobile */}
      <div className="relative flex min-h-[190px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-surface p-4 lg:hidden">
        <img
          src={heroMaskMobile}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-10"
        />
        <div className="relative flex w-full items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <p className="text-xs leading-4 font-medium">Bem-vindo à Kurio</p>
            <p className="text-lg leading-[29px] font-bold" aria-hidden="true">
              SEJA DONO DA
              <br />
              CULTURA DIGITAL
            </p>
            <p className="text-xs leading-[18px] text-sand">
              Descubra NFTs selecionados de criadores do mundo todo.
            </p>
            <Link
              to="/"
              hash="catalogo"
              className="flex items-center gap-2 text-xs leading-[14px] font-bold text-highlight"
            >
              EXPLORAR
              <Icon src={arrowRightIcon} className="size-3 -rotate-90" />
            </Link>
          </div>
          <Link
            to="/nft/$nftId"
            params={{ nftId: slide.nftId }}
            aria-label={`Ver ${slide.name}`}
            className="relative shrink-0"
          >
            <NftImage artwork={slide.artwork} alt={slide.name} size={138} priority className="rounded-2xl" />
            <NftImage
              artwork={(HERO_SLIDES[(active + 1) % HERO_SLIDES.length] ?? slide).artwork}
              alt=""
              size={58}
              className="absolute top-[88px] left-3.5 rounded-2xl"
            />
          </Link>
        </div>
        <SlideDots active={active} onSelect={setActive} className="relative" />
      </div>
    </section>
  );
}

export function FeaturedBanner() {
  return (
    <aside
      aria-label="NFT em destaque"
      className="relative flex flex-col gap-4 overflow-hidden bg-linear-to-b from-primary/10 to-primary/[0.03] pt-6 pb-1"
    >
      <p className="px-5 text-2xl leading-8 font-bold text-highlight">NFT EM DESTAQUE</p>
      <p className="px-5 text-center text-[22px] leading-4 font-bold">OFERTA LIMITADA</p>
      <Link to="/nft/$nftId" params={{ nftId: "nft-0009" }} aria-label="Ver Sage Nomad #009">
        <NftImage
          artwork="sage-nomad"
          alt="Sage Nomad #009"
          size={310}
          className="aspect-[310/368] w-full rounded-[22px]"
        />
      </Link>
    </aside>
  );
}

const PROMOS: {
  title: [string, string];
  text: string;
  artwork: Artwork;
  search: { aba?: "novos"; colecoes?: string };
}[] = [
  {
    title: ["Lançamentos gênesis", "de edição limitada"],
    text: "Colecione edições escassas diretamente dos criadores antes da revelação pública.",
    artwork: "emerald-ape",
    search: { aba: "novos" },
  },
  {
    title: ["Arte digital selecionada", "e muito mais"],
    text: "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.",
    artwork: "ivory-baron",
    search: { colecoes: "arte-digital" },
  },
];

export function Promos() {
  return (
    <section aria-label="Promoções" className="container-page grid gap-7 lg:grid-cols-2">
      {PROMOS.map((promo) => (
        <article
          key={promo.artwork}
          className="relative flex min-h-[200px] items-stretch overflow-hidden rounded-lg bg-surface lg:h-[250px]"
        >
          <NftImage
            artwork={promo.artwork}
            alt=""
            size={290}
            sizes="(min-width: 1024px) 290px, 40vw"
            className="aspect-auto h-full w-[40%] shrink-0 rounded-[18px] lg:w-[290px]"
          />
          <img
            src={promoMask}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden size-full opacity-[0.06] lg:block"
          />
          <div className="relative flex flex-1 flex-col items-end justify-center gap-3 p-4 text-right lg:pr-[30px] lg:pl-0">
            <h2 className="text-base leading-6 font-bold lg:text-lg">
              {promo.title[0]}
              <br />
              {promo.title[1]}
            </h2>
            <p className="max-w-[263px] text-sm leading-6 text-sand">{promo.text}</p>
            <Link
              to="/"
              search={promo.search}
              hash="catalogo"
              className="flex h-10 w-[140px] items-center justify-center gap-2 rounded-md bg-primary text-sm leading-5 font-medium text-ink transition-colors hover:bg-highlight"
            >
              Explorar
              <Icon src={arrowRightIcon} className="size-3.5 -rotate-90" />
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

const POSTS: { date: string; read: string; title: string; text: string; artwork: Artwork }[] = [
  {
    date: "12 de setembro",
    read: "Leitura de 6 min",
    title: "Como funciona a propriedade de NFTs",
    text: "Aprenda a colecionar, negociar e verificar ativos digitais.",
    artwork: "ivory-baron",
  },
  {
    date: "13 de setembro",
    read: "Leitura de 2 min",
    title: "10 artistas digitais para acompanhar",
    text: "Conheça criadores que moldam a cultura digital.",
    artwork: "emerald-ape",
  },
  {
    date: "15 de setembro",
    read: "Leitura de 3 min",
    title: "Raridade, atributos e procedência",
    text: "Entenda raridade, procedência, direitos autorais e utilidade.",
    artwork: "sage-nomad",
  },
  {
    date: "15 de setembro",
    read: "Leitura de 2 min",
    title: "Como proteger sua carteira",
    text: "Proteja sua carteira, seus ativos e sua identidade.",
    artwork: "golden-beat",
  },
];

/** Os artigos são editoriais (fora do escopo): o card mostra o resumo, sem link para leitura. */
export function Blog() {
  return (
    <section aria-labelledby="blog-title" className="container-page flex flex-col items-center gap-10">
      <div className="flex flex-col gap-3 text-center">
        <h2 id="blog-title" className="text-2xl font-bold lg:text-[28px]">
          Diário da Cunhagem
        </h2>
        <p className="text-sm text-sand">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </div>
      <ul className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title} className="flex flex-col overflow-hidden rounded-lg bg-surface">
            <NftImage
              artwork={post.artwork}
              alt=""
              size={268}
              sizes="(min-width: 1024px) 268px, (min-width: 640px) 45vw, 92vw"
              className="aspect-[268/195] w-full"
            />
            <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
              <p className="text-xs leading-4 font-medium text-sand">
                {post.date} <span aria-hidden="true">&nbsp;|&nbsp;</span> {post.read}
              </p>
              <h3 className="text-base font-bold">{post.title}</h3>
              <p className="text-xs leading-4 font-medium text-sand">{post.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

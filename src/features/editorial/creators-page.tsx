import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Promos } from "@/features/catalog/home-sections";
import { useNftList } from "@/features/catalog/use-nfts";
import { RelatedCarousel } from "@/features/nft/related-carousel";

// página Criadores
export function CreatorsPage() {
  const { data } = useNftList({ tab: "em-alta", pageSize: 10 });

  return (
    <div className="flex flex-col gap-12 pt-8 pb-16 lg:gap-16 lg:pb-24">
      <div className="container-page flex flex-col items-start gap-3">
        <h1 className="text-2xl font-bold lg:text-[28px]">Criadores</h1>
        <p className="max-w-2xl text-sm leading-6 text-sand">
          Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede. Cada obra
          paga direitos autorais ao criador nas vendas secundárias.
        </p>
        <Button asChild>
          <Link to="/" hash="catalogo">
            Explorar o mercado
          </Link>
        </Button>
      </div>
      <Promos />
      <div className="container-page">
        <RelatedCarousel title="Obras em alta dos criadores" nfts={data?.items ?? []} />
      </div>
    </div>
  );
}

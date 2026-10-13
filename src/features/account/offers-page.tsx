import { SectionEmpty, SectionTitle } from "@/features/account/section-states";

/** Ofertas: a negociação entre colecionadores não existe nesta entrega, e a tela diz isso. */
export function OffersPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle description="Propostas enviadas e recebidas por NFTs.">Ofertas</SectionTitle>
      <SectionEmpty>
        Você não tem ofertas. Nesta versão da Kurio os NFTs são vendidos a preço fixo, direto pelo
        mercado.
      </SectionEmpty>
    </div>
  );
}

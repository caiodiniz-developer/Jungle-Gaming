import { Link } from "@tanstack/react-router";

// tópicos da central de ajuda
const TOPICS = [
  {
    id: "como-comprar",
    title: "Como comprar NFTs",
    text: [
      "Escolha um NFT no mercado, selecione a edição e a quantidade e adicione ao carrinho. No carrinho você pode aplicar um código promocional e conferir subtotal, desconto, taxa de rede e total.",
      "Para finalizar, entre na sua conta, escolha a carteira de recebimento, conecte-a e confirme a compra. O recibo aparece assim que a transação é confirmada na rede.",
    ],
  },
  {
    id: "carteira-e-seguranca",
    title: "Carteira e segurança",
    text: [
      "Cadastre uma carteira principal e, se quiser, uma secundária na área da conta. A Kurio trabalha com MetaMask, WalletConnect e Coinbase Wallet.",
      "A Kurio nunca pede sua frase de recuperação nem sua chave privada. Confira sempre o endereço e a rede antes de confirmar uma compra.",
    ],
  },
  {
    id: "politica-do-mercado",
    title: "Política do mercado",
    text: [
      "Os preços são definidos em ETH e podem mudar até a confirmação da compra. Se o preço ou a disponibilidade mudar durante o pagamento, você vê o novo valor e decide se confirma.",
      "Cada edição tem um limite por pedido. Itens esgotados continuam visíveis, mas não podem ser comprados.",
    ],
  },
  {
    id: "denunciar-item",
    title: "Denunciar item",
    text: [
      "Encontrou uma obra copiada, enganosa ou ofensiva? Escreva para contato@email.com informando o nome e o ID do token do NFT. A equipe analisa cada denúncia.",
    ],
  },
];

// página Central de ajuda
export function HelpPage() {
  return (
    <div className="container-page flex flex-col gap-10 pt-8 pb-16 lg:pb-24">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold lg:text-[28px]">Central de ajuda</h1>
        <p className="max-w-2xl text-sm leading-6 text-sand">
          Respostas rápidas sobre compra, carteiras e regras do mercado.
        </p>
        <nav aria-label="Tópicos de ajuda">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {TOPICS.map((topic) => (
              <li key={topic.id}>
                <Link to="/ajuda" hash={topic.id} className="text-highlight hover:underline">
                  {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {TOPICS.map((topic) => (
        <section
          key={topic.id}
          id={topic.id}
          aria-labelledby={`${topic.id}-titulo`}
          className="flex scroll-mt-6 flex-col gap-3"
        >
          <h2 id={`${topic.id}-titulo`} className="text-lg font-bold">
            {topic.title}
          </h2>
          <div className="hairline" />
          {topic.text.map((paragraph) => (
            <p key={paragraph} className="max-w-3xl text-sm leading-6 text-sand">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

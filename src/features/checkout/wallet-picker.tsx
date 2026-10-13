import { Link } from "@tanstack/react-router";
import type { Wallet } from "@/api/contracts";
import { NETWORK_LABELS } from "@/api/contracts";
import dotsIcon from "@/assets/icons/dots-vertical.svg";
import { Icon } from "@/components/icon";
import { RadioCard } from "@/components/radio-card";
import { shortenHash } from "@/lib/eth";
import { cn } from "@/lib/utils";

type WalletPickerProps = {
  wallets: Wallet[];
  selectedId: string;
  onSelect: (wallet: Wallet) => void;
  error?: string;
};

/** Sem carteira cadastrada não há como receber os NFTs: leva ao cadastro. */
function NoWallets() {
  return (
    <p role="status" className="text-sm leading-6 text-sand">
      Você ainda não cadastrou uma carteira.{" "}
      <Link to="/conta/carteiras" className="font-bold text-highlight underline underline-offset-2">
        Cadastrar carteira
      </Link>{" "}
      para concluir a compra.
    </p>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs leading-4 text-coral">
      <span className="sr-only">Erro: </span>
      {message}
    </p>
  );
}

/**
 * Mobile: "Carteira conectada", com um cartão por carteira cadastrada (como no
 * layout). O menu de três pontos do layout leva à tela de carteiras.
 */
export function WalletCards({ wallets, selectedId, onSelect, error }: WalletPickerProps) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-4 flex w-full items-center justify-between gap-4 text-base leading-4 font-bold">
        Carteira conectada
        <Link to="/conta/carteiras" className="text-[15px] text-highlight hover:underline">
          Trocar carteira
        </Link>
      </legend>
      {wallets.length === 0 ? (
        <NoWallets />
      ) : (
        wallets.map((wallet) => (
          <div key={wallet.id} className="relative">
            <RadioCard
              name="walletId"
              value={wallet.id}
              checked={wallet.id === selectedId}
              onChange={() => onSelect(wallet)}
              className="min-h-[93px] items-start rounded-[14px] border-transparent bg-surface py-4 pr-12 pl-5 shadow-glow-lg"
            >
              <span className="flex min-w-0 flex-col text-sm leading-[22px] text-sand">
                <span className="text-base leading-5 font-bold text-foreground">{wallet.alias}</span>
                <span className="truncate">{wallet.secondaryAddress || shortenHash(wallet.address)}</span>
                <span>
                  Rede {wallet.kind === "primary" ? "principal " : ""}
                  {NETWORK_LABELS[wallet.network]}
                </span>
              </span>
            </RadioCard>
            <Link
              to="/conta/carteiras"
              aria-label={`Gerenciar a carteira ${wallet.alias}`}
              className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center text-primary"
            >
              <Icon src={dotsIcon} className="size-5" />
            </Link>
          </div>
        ))
      )}
      <FieldError message={error} />
    </fieldset>
  );
}

/**
 * Desktop: "Usar outra carteira?" do layout. Marcado, o pedido usa a carteira
 * secundária cadastrada; desmarcado, a principal. É uma caixa de seleção (liga
 * e desliga) com a aparência de círculo do layout.
 */
export function OtherWalletToggle({ wallets, selectedId, onSelect, error }: WalletPickerProps) {
  if (wallets.length === 0) return <NoWallets />;

  const primary = wallets.find((wallet) => wallet.kind === "primary") ?? wallets[0];
  const other = wallets.find((wallet) => wallet.id !== primary?.id);
  const usingOther = other !== undefined && selectedId === other.id;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className={cn(
          "relative flex w-fit items-center gap-2 text-[15px] leading-4",
          other ? "cursor-pointer" : "cursor-not-allowed opacity-60",
        )}
      >
        <input
          type="checkbox"
          checked={usingOther}
          disabled={!other}
          onChange={(event) => {
            const next = event.target.checked ? other : primary;
            if (next) onSelect(next);
          }}
          className="peer absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden="true"
          className="flex size-[15px] items-center justify-center rounded-full border border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
        >
          {usingOther && <span className="size-[7px] rounded-full bg-primary" />}
        </span>
        Usar outra carteira?
      </label>
      {!other && (
        <p className="text-xs leading-4 text-sand">
          Só há uma carteira cadastrada.{" "}
          <Link to="/conta/carteiras" className="text-highlight underline underline-offset-2">
            Adicionar carteira secundária
          </Link>
        </p>
      )}
      <FieldError message={error} />
    </div>
  );
}

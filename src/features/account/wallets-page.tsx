import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { Wallet, WalletKind } from "@/api/contracts";
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS } from "@/api/contracts";
import { walletSchema, type WalletValues } from "@/api/schemas";
import { FormMessage, SelectField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaveWallet, useWallets } from "@/features/account/use-account";
import { applyApiError } from "@/lib/form-errors";

// opções do select de rede
const NETWORK_OPTIONS = Object.entries(NETWORK_LABELS).map(([value, label]) => ({ value, label }));
// opções do select de tipo de carteira
const PROVIDER_OPTIONS = Object.entries(WALLET_PROVIDER_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// campos que podem receber erro da API
const FIELDS = [
  "displayName",
  "alias",
  "network",
  "profileName",
  "address",
  "secondaryAddress",
  "provider",
  "referralCode",
  "email",
  "ensName",
  "kind",
] as const;

/** Valores do formulário: os selects começam vazios ("Selecione…") até o usuário escolher. */
type WalletFormValues = Omit<WalletValues, "network" | "provider"> & {
  network: WalletValues["network"] | "";
  provider: WalletValues["provider"] | "";
};

// valores iniciais do formulário
function toFormValues(kind: WalletKind, source?: Wallet | null): WalletFormValues {
  return {
    kind,
    displayName: source?.displayName ?? "",
    alias: source?.alias ?? "",
    network: source?.network ?? "",
    profileName: source?.profileName ?? "",
    address: source?.address ?? "",
    secondaryAddress: source?.secondaryAddress ?? "",
    provider: source?.provider ?? "",
    referralCode: source?.referralCode ?? "",
    email: source?.email ?? "",
    ensName: source?.ensName ?? "",
  };
}

type WalletFormProps = {
  kind: WalletKind;
  /** Carteira existente (edição) ou null (cadastro). */
  wallet: Wallet | null;
  /** Valores iniciais quando o usuário pede "igual à carteira principal". */
  template?: Wallet | null;
  onSaved?: () => void;
};

// formulário de uma carteira
function WalletForm({ kind, wallet, template, onSaved }: WalletFormProps) {
  const save = useSaveWallet();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<WalletFormValues, unknown, WalletValues>({
    // o schema recebe os selects ainda vazios e os rejeita com a mensagem "Selecione…"
    resolver: zodResolver(walletSchema) as unknown as Resolver<WalletFormValues, unknown, WalletValues>,
    defaultValues: toFormValues(kind, wallet ?? template),
  });
  const { errors } = form.formState;
  const label = kind === "primary" ? "principal" : "secundária";

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    save.mutate(
      { id: wallet?.id ?? null, input: values },
      {
        onSuccess: (saved) => {
          form.reset(toFormValues(kind, saved));
          toast.success(wallet ? `Carteira ${label} atualizada.` : `Carteira ${label} cadastrada.`);
          onSaved?.();
        },
        onError: (error) => setFormError(applyApiError(error, form.setError, FIELDS)),
      },
    );
  });

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={`Carteira ${label}`}
      className="flex flex-col gap-6"
    >
      <FormMessage message={formError ?? errors.kind?.message ?? null} />
      <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
        <TextField
          label="Nome de exibição"
          required
          error={errors.displayName?.message}
          {...form.register("displayName")}
        />
        <TextField
          label="Apelido da carteira"
          required
          error={errors.alias?.message}
          {...form.register("alias")}
        />
        <SelectField
          label="Rede"
          required
          placeholder="Selecione uma rede"
          options={NETWORK_OPTIONS}
          error={errors.network?.message}
          {...form.register("network")}
        />
        <TextField
          label="Nome do perfil"
          required
          error={errors.profileName?.message}
          {...form.register("profileName")}
        />
        <TextField
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.address?.message}
          {...form.register("address")}
        />
        <TextField
          label="ENS ou carteira secundária"
          placeholder="ENS ou carteira secundária (opcional)"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.secondaryAddress?.message}
          {...form.register("secondaryAddress")}
        />
        <SelectField
          label="Tipo de carteira"
          required
          placeholder="Selecione uma carteira"
          options={PROVIDER_OPTIONS}
          error={errors.provider?.message}
          {...form.register("provider")}
        />
        <TextField
          label="Código de indicação"
          required
          autoCapitalize="characters"
          error={errors.referralCode?.message}
          {...form.register("referralCode")}
        />
        <TextField
          label="E-mail"
          required
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register("email")}
        />
        <Controller
          control={form.control}
          name="ensName"
          render={({ field }) => (
            <TextField
              label="Nome ENS"
              required
              leading={
                <span
                  aria-hidden="true"
                  className="flex h-10 w-[78px] shrink-0 items-center rounded-sm border border-border px-2.5 text-[15px]"
                >
                  .eth
                </span>
              }
              placeholder="seunome"
              autoCapitalize="none"
              spellCheck={false}
              error={errors.ensName?.message}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value.replace(/\.eth$/i, "")}
              onChange={(event) => {
                const ensLabel = event.target.value.trim().replace(/\.eth$/i, "");
                field.onChange(ensLabel ? `${ensLabel}.eth` : "");
              }}
            />
          )}
        />
      </div>
      <Button type="submit" disabled={save.isPending} className="w-fit min-w-[131px] rounded-sm px-4">
        {save.isPending ? "Salvando…" : "Salvar carteira"}
      </Button>
    </form>
  );
}

// página Carteiras (principal e secundária)
export function WalletsPage() {
  const { data: wallets, isPending, isError, error, refetch } = useWallets();
  const [addingPrimary, setAddingPrimary] = useState(false);
  const [addingSecondary, setAddingSecondary] = useState(false);
  const [sameAsPrimary, setSameAsPrimary] = useState(false);

  if (isPending) {
    return (
      <div role="status" aria-label="Carregando carteiras" className="flex flex-col gap-6">
        <Skeleton className="h-4 w-48" />
        <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} className="h-[69px]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4">
        <h1 className="text-[17px] font-bold">Não foi possível carregar suas carteiras</h1>
        <p className="text-sm leading-6 text-sand">{error.message}</p>
        <Button onClick={() => void refetch()}>Tentar novamente</Button>
      </div>
    );
  }

  const primary = wallets.find((wallet) => wallet.kind === "primary") ?? null;
  const secondary = wallets.find((wallet) => wallet.kind === "secondary") ?? null;
  const showPrimaryForm = primary !== null || addingPrimary;
  const showSecondaryForm = secondary !== null || addingSecondary;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="carteira-principal" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <h1 id="carteira-principal" className="text-[17px] leading-4 font-bold">
              Carteira principal
            </h1>
            {!showPrimaryForm && (
              <button
                type="button"
                onClick={() => setAddingPrimary(true)}
                className="text-base leading-4 font-medium text-highlight hover:underline"
              >
                Adicionar
              </button>
            )}
          </div>
          <p className="text-sm leading-[15px] text-sand">
            Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
          </p>
        </div>
        {showPrimaryForm ? (
          <WalletForm key={primary?.id ?? "nova-principal"} kind="primary" wallet={primary} />
        ) : (
          <p className="text-sm text-sand">Você ainda não adicionou uma carteira principal.</p>
        )}
      </section>

      <section aria-labelledby="carteira-secundaria" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <h2 id="carteira-secundaria" className="text-[17px] leading-4 font-bold">
              Carteira secundária
            </h2>
            {!showSecondaryForm && (
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm leading-4">
                  <input
                    type="checkbox"
                    checked={sameAsPrimary}
                    disabled={!primary}
                    onChange={(event) => setSameAsPrimary(event.target.checked)}
                    className="size-4 accent-primary"
                  />
                  Igual à carteira principal
                </label>
                <button
                  type="button"
                  onClick={() => setAddingSecondary(true)}
                  className="text-base leading-4 font-medium text-highlight hover:underline"
                >
                  Adicionar
                </button>
              </div>
            )}
          </div>
          {!showSecondaryForm && (
            <p className="text-sm leading-[15px] text-sand">
              Você ainda não adicionou uma carteira secundária.
            </p>
          )}
        </div>
        {showSecondaryForm && (
          <WalletForm
            key={secondary?.id ?? `nova-secundaria-${sameAsPrimary}`}
            kind="secondary"
            wallet={secondary}
            // parte dos dados da principal; o endereço precisa ser outro (a API recusa repetido)
            template={sameAsPrimary ? primary : null}
          />
        )}
      </section>
    </div>
  );
}

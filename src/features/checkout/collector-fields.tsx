import { Controller } from "react-hook-form";
import type { Wallet } from "@/api/contracts";
import { EnsField, SelectField, TextField } from "@/components/form-fields";
import type { CheckoutForm } from "@/features/checkout/checkout-schema";
import { NETWORK_OPTIONS, PROVIDER_OPTIONS } from "@/lib/options";

type CollectorFieldsProps = {
  form: CheckoutForm;
  /**
   * Carteira de recebimento escolhida. Quando informada (desktop), o endereço
   * e o tipo de carteira aparecem na grade, como no layout; no mobile a
   * carteira é escolhida nos cartões e estes campos não são exibidos.
   */
  wallet?: Wallet;
};

/** Campos "Perfil do colecionador" do pagamento, na ordem do layout. */
export function CollectorFields({ form, wallet }: CollectorFieldsProps) {
  const { errors } = form.formState;
  const provider = form.watch("provider");

  return (
    <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
      <TextField
        label="Nome de exibição"
        required
        autoComplete="name"
        error={errors.collector?.displayName?.message}
        {...form.register("collector.displayName")}
      />
      <TextField
        label="Nome de usuário"
        required
        autoComplete="username"
        error={errors.collector?.username?.message}
        {...form.register("collector.username")}
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
        error={errors.collector?.profileName?.message}
        {...form.register("collector.profileName")}
      />

      {wallet && (
        <>
          {/* o endereço vem da carteira cadastrada: aparece para conferência, sem edição */}
          <TextField
            label="Endereço da carteira"
            required
            readOnly
            value={wallet.address}
            placeholder="Endereço 0x da carteira"
            className="truncate text-sand"
          />
          <TextField
            label="ENS ou carteira secundária"
            // no layout este campo não tem rótulo; a linha vazia mantém o alinhamento
            hideLabel
            fieldClassName="md:pt-[29px]"
            readOnly
            value={wallet.secondaryAddress}
            placeholder="ENS ou carteira secundária (opcional)"
            className="truncate text-sand"
          />
          <SelectField
            label="Tipo de carteira"
            required
            placeholder="Selecione uma carteira"
            options={PROVIDER_OPTIONS}
            error={errors.provider?.message}
            value={provider}
            onChange={(event) =>
              form.setValue("provider", event.target.value as typeof provider, { shouldValidate: true })
            }
          />
        </>
      )}

      <TextField
        label="Código de indicação"
        required
        autoCapitalize="characters"
        error={errors.collector?.referralCode?.message}
        {...form.register("collector.referralCode")}
      />
      <TextField
        label="E-mail"
        required
        type="email"
        autoComplete="email"
        error={errors.collector?.email?.message}
        {...form.register("collector.email")}
      />
      <Controller
        control={form.control}
        name="collector.ensName"
        render={({ field }) => (
          <EnsField
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            inputRef={field.ref}
            error={errors.collector?.ensName?.message}
          />
        )}
      />
    </div>
  );
}

/** "Observação do colecionador (opcional)". */
export function CollectorNote({ form }: { form: CheckoutForm }) {
  const error = form.formState.errors.collector?.note?.message;
  return (
    <div className="flex flex-col">
      <label htmlFor="observacao" className="flex min-h-[29px] items-center text-[15px] leading-none">
        Observação do colecionador (opcional)
      </label>
      <textarea
        id="observacao"
        maxLength={280}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "observacao-erro" : undefined}
        className="h-[152px] w-full resize-none rounded-sm border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-invalid:border-destructive md:max-w-[350px]"
        {...form.register("collector.note")}
      />
      {error && (
        <p id="observacao-erro" role="alert" className="mt-1.5 text-xs leading-4 text-coral">
          <span className="sr-only">Erro: </span>
          {error}
        </p>
      )}
    </div>
  );
}

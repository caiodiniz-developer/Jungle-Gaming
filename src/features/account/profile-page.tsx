import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { User } from "@/api/contracts";
import {
  AVATAR_MAX_BYTES,
  changePasswordFormSchema,
  type ChangePasswordFormValues,
  profileSchema,
  type ProfileValues,
} from "@/api/schemas";
import imageIcon from "@/assets/icons/image.svg";
import { EnsField, FormMessage, PasswordField, TextField } from "@/components/form-fields";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChangePassword,
  useRemoveAvatar,
  useUpdateAvatar,
  useUpdateProfile,
} from "@/features/account/use-account";
import { useSession } from "@/features/auth/session";
import { applyApiError } from "@/lib/form-errors";

const AVATAR_SIZE = 256;

/** Reduz a imagem para 256×256 (corte central) antes do envio: cabe com folga no limite da API. */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível processar a imagem.");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.85);
}

function AvatarField({ user }: { user: User }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateAvatar();
  const remove = useRemoveAvatar();
  const busy = update.isPending || remove.isPending;

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setError(null);

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Envie uma imagem PNG, JPEG ou WebP.");
      return;
    }
    try {
      const dataUrl = await toAvatarDataUrl(file);
      if (dataUrl.length > (AVATAR_MAX_BYTES * 4) / 3) {
        setError("A imagem deve ter no máximo 200 KB.");
        return;
      }
      update.mutate(
        { dataUrl },
        {
          onSuccess: () => toast.success("Avatar atualizado."),
          onError: (apiError) => setError(apiError.fields.dataUrl ?? apiError.message),
        },
      );
    } catch {
      setError("Não foi possível ler esta imagem. Tente outro arquivo.");
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex min-h-[29px] items-center text-[15px] leading-none">Avatar</p>
      <div className="flex items-center gap-6">
        <span className="flex size-[50px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-raised text-primary">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`Avatar de ${user.displayName}`} className="size-full object-cover" />
          ) : (
            <Icon src={imageIcon} className="size-5" label="Sem avatar" />
          )}
        </span>
        <div className="flex items-center gap-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void handleFile(event)}
            aria-label="Arquivo do avatar"
            aria-describedby={error ? errorId : undefined}
            className="sr-only"
            tabIndex={-1}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-[98px] rounded-sm"
          >
            {update.isPending ? "Enviando…" : "Alterar"}
          </Button>
          <button
            type="button"
            disabled={busy || !user.avatarUrl}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => toast.success("Avatar removido."),
                onError: (apiError) => setError(apiError.message),
              })
            }
            className="text-sm leading-4 text-foreground transition-colors hover:text-highlight disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remover
          </button>
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs leading-4 text-coral">
          <span className="sr-only">Erro: </span>
          {error}
        </p>
      )}
    </div>
  );
}

const PROFILE_FIELDS = ["displayName", "username", "email", "ensName", "walletAlias"] as const;

const profileValues = (user: User): ProfileValues => ({
  displayName: user.displayName,
  username: user.username,
  email: user.email,
  ensName: user.ensName,
  walletAlias: user.walletAlias,
});

/**
 * Dados do perfil e troca de senha com um único "Salvar", como no layout.
 * São duas operações da API: os dados são enviados se mudaram, e a senha, se
 * algum dos três campos foi preenchido. Cada uma tem seus próprios erros.
 */
function ProfileForms({ user }: { user: User }) {
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);

  const profile = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileValues(user),
  });
  const password = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const profileErrors = profile.formState.errors;
  const passwordErrors = password.formState.errors;

  const saveProfile = profile.handleSubmit((values) =>
    updateProfile.mutate(values, {
      onSuccess: (saved) => {
        // os valores confirmados pela API viram o novo ponto de partida do formulário
        profile.reset(profileValues(saved));
        toast.success("Perfil atualizado.");
      },
      onError: (error) => setFormError(applyApiError(error, profile.setError, PROFILE_FIELDS)),
    }),
  );

  const savePassword = password.handleSubmit(({ currentPassword, newPassword }) =>
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          password.reset();
          toast.success("Senha alterada.");
        },
        onError: (error) =>
          setFormError(applyApiError(error, password.setError, ["currentPassword", "newPassword"])),
      },
    ),
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const wantsPassword = Object.values(password.getValues()).some((value) => value !== "");
    // sem senha preenchida, "Salvar" valida e envia os dados do perfil
    if (profile.formState.isDirty || !wantsPassword) void saveProfile();
    if (wantsPassword) void savePassword();
  }

  const saving = updateProfile.isPending || changePassword.isPending;

  return (
    <form onSubmit={submit} noValidate aria-labelledby="perfil-titulo" className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 id="perfil-titulo" className="text-base leading-4 font-bold">
          Perfil do colecionador
        </h1>
        <FormMessage message={formError} />
        <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
          <TextField
            label="Nome de exibição"
            required
            autoComplete="name"
            error={profileErrors.displayName?.message}
            {...profile.register("displayName")}
          />
          <TextField
            label="Nome de usuário"
            required
            autoComplete="username"
            error={profileErrors.username?.message}
            {...profile.register("username")}
          />
          <TextField
            label="E-mail"
            required
            type="email"
            autoComplete="email"
            error={profileErrors.email?.message}
            {...profile.register("email")}
          />
          <Controller
            control={profile.control}
            name="ensName"
            render={({ field }) => (
              <EnsField
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                error={profileErrors.ensName?.message}
              />
            )}
          />
          <TextField
            label="Apelido da carteira"
            required
            error={profileErrors.walletAlias?.message}
            {...profile.register("walletAlias")}
          />
          <AvatarField user={user} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 text-base leading-4 font-medium">Alterar senha</legend>
        <div className="flex flex-col gap-4 md:max-w-[calc(50%-14px)]">
          <PasswordField
            label="Senha atual"
            autoComplete="current-password"
            error={passwordErrors.currentPassword?.message}
            {...password.register("currentPassword")}
          />
          <PasswordField
            label="Nova senha"
            autoComplete="new-password"
            error={passwordErrors.newPassword?.message}
            {...password.register("newPassword")}
          />
          <PasswordField
            label="Confirmar nova senha"
            autoComplete="new-password"
            error={passwordErrors.confirmPassword?.message}
            {...password.register("confirmPassword")}
          />
        </div>
      </fieldset>

      <Button type="submit" disabled={saving} className="w-[131px] rounded-sm">
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}

/** Página "Perfil do colecionador". */
export function ProfilePage() {
  const { user } = useSession();

  if (!user) {
    return (
      <div role="status" aria-label="Carregando perfil" className="flex flex-col gap-6">
        <Skeleton className="h-4 w-56" />
        <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-[69px]" />
          ))}
        </div>
        <Skeleton className="h-10 w-[131px]" />
      </div>
    );
  }

  // a chave recria os formulários ao trocar de conta
  return <ProfileForms key={user.id} user={user} />;
}

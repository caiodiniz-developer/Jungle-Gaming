import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  loginSchema,
  type LoginValues,
  registerFormSchema,
  type RegisterFormValues,
} from "@/api/schemas";
import facebookIcon from "@/assets/icons/facebook.svg";
import google1 from "@/assets/icons/google-1.svg";
import google2 from "@/assets/icons/google-2.svg";
import google3 from "@/assets/icons/google-3.svg";
import google4 from "@/assets/icons/google-4.svg";
import google5 from "@/assets/icons/google-5.svg";
import google6 from "@/assets/icons/google-6.svg";
import google7 from "@/assets/icons/google-7.svg";
import { FormMessage, PasswordField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { useLogin, useRegister } from "@/features/auth/session";
import { applyApiError } from "@/lib/form-errors";

/** Campos do layout de autenticação: mais altos e arredondados no mobile. */
const authInput = "h-[50px] rounded-[10px] px-4 lg:h-10 lg:rounded-[5px]";
const submitButton = "h-[60px] w-full rounded-[10px] text-base lg:h-[45px] lg:rounded-[5px]";

/** O logo do Google vem do Figma em sete partes posicionadas por porcentagem. */
function GoogleLogo() {
  const part = "absolute block max-w-none";
  return (
    <span aria-hidden="true" className="relative block size-5 shrink-0 overflow-hidden">
      <img src={google2} alt="" className={part} style={{ inset: "57.68% 17.83% 0 7.11%" }} />
      <img src={google3} alt="" className={part} style={{ inset: "71.33% 17.83% 0 50%" }} />
      <img src={google1} alt="" className={part} style={{ inset: "24.69% 75.25% 24.69% 0" }} />
      <img src={google4} alt="" className={part} style={{ inset: "38.28% 0 11.97% 47.07%" }} />
      <img src={google5} alt="" className={part} style={{ inset: "38.28% 0 11.97% 50%" }} />
      <img src={google6} alt="" className={part} style={{ inset: "0 17.01% 57.68% 7.11%" }} />
      <img src={google7} alt="" className={part} style={{ inset: "0 17.01% 70.51% 50%" }} />
    </span>
  );
}

/**
 * Login social não faz parte da entrega (não há provedor real): os botões
 * informam isso em vez de simular uma autenticação.
 */
function SocialButtons() {
  const unavailable = (provider: string) =>
    toast.info(`Entrar com ${provider} não está disponível nesta demonstração.`, {
      description: "Use e-mail e senha.",
    });

  const button =
    "flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] leading-4 font-medium text-sand transition-colors hover:border-primary";

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-3 text-[13px] leading-4 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        Ou continue com
      </p>
      <div className="flex flex-col gap-4 lg:gap-3 lg:px-20">
        <button type="button" className={button} onClick={() => unavailable("Google")}>
          <GoogleLogo />
          Continuar com Google
        </button>
        <button type="button" className={button} onClick={() => unavailable("Facebook")}>
          <img src={facebookIcon} alt="" width={20} height={20} />
          Continuar com Facebook
        </button>
      </div>
    </div>
  );
}

type AuthFormProps = {
  /** Chamado após autenticar, para voltar ao fluxo em que o usuário estava. */
  onSuccess: () => void;
  submitLabel: string;
};

export function LoginForm({ onSuccess, submitLabel }: AuthFormProps) {
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onSuccess,
      onError: (error) => setFormError(applyApiError(error, form.setError, ["email", "password"])),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} noValidate className="flex flex-col gap-6 lg:px-20">
        <div className="flex flex-col gap-3">
          <FormMessage message={formError} />
          <TextField
            label="E-mail"
            hideLabel
            type="email"
            autoComplete="email"
            placeholder="contato@email.com"
            className={authInput}
            error={errors.email?.message}
            {...form.register("email")}
          />
          <PasswordField
            label="Senha"
            hideLabel
            autoComplete="current-password"
            placeholder="Senha"
            className={authInput}
            error={errors.password?.message}
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() =>
              toast.info("A recuperação de senha não está disponível nesta demonstração.")
            }
            className="self-end text-sm leading-4 text-highlight hover:underline"
          >
            Esqueceu a senha?
          </button>
        </div>
        <Button type="submit" disabled={login.isPending} className={submitButton}>
          {login.isPending ? "Entrando…" : submitLabel}
        </Button>
      </form>
      <SocialButtons />
    </div>
  );
}

export function RegisterForm({ onSuccess, submitLabel }: AuthFormProps) {
  const register = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit(({ username, email, password }) => {
    setFormError(null);
    register.mutate(
      { username, email, password },
      {
        onSuccess,
        // conflito de cadastro (e-mail ou usuário já existentes) volta apontando o campo
        onError: (error) =>
          setFormError(applyApiError(error, form.setError, ["username", "email", "password"])),
      },
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} noValidate className="flex flex-col gap-6 lg:px-20">
        <div className="flex flex-col gap-3">
          <FormMessage message={formError} />
          <TextField
            label="Nome de usuário"
            hideLabel
            autoComplete="username"
            placeholder="Nome de usuário"
            className={authInput}
            error={errors.username?.message}
            {...form.register("username")}
          />
          <TextField
            label="E-mail"
            hideLabel
            type="email"
            autoComplete="email"
            placeholder="Digite seu e-mail"
            className={authInput}
            error={errors.email?.message}
            {...form.register("email")}
          />
          <PasswordField
            label="Senha"
            hideLabel
            autoComplete="new-password"
            placeholder="Senha"
            className={authInput}
            error={errors.password?.message}
            {...form.register("password")}
          />
          <PasswordField
            label="Confirmar senha"
            hideLabel
            autoComplete="new-password"
            placeholder="Confirmar senha"
            className={authInput}
            error={errors.confirmPassword?.message}
            {...form.register("confirmPassword")}
          />
        </div>
        <Button type="submit" disabled={register.isPending} className={submitButton}>
          {register.isPending ? "Criando…" : submitLabel}
        </Button>
      </form>
      <SocialButtons />
    </div>
  );
}

export function AuthSwitchLink({ mode, redirect }: { mode: "login" | "register"; redirect?: string }) {
  return (
    <p className="text-center text-[15px] text-sand">
      {mode === "login" ? "Novo na Kurio? " : "Já tem uma conta? "}
      <Link
        to={mode === "login" ? "/cadastro" : "/entrar"}
        search={{ redirect }}
        replace
        className="text-highlight hover:underline"
      >
        {mode === "login" ? "Crie uma conta" : "Entre"}
      </Link>
    </p>
  );
}

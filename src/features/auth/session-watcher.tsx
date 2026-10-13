import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { isProtectedPath } from "@/features/auth/guards";
import { endSession } from "@/features/auth/session";
import { setSessionExpiredHandler } from "@/lib/http";
import { getSessionToken } from "@/lib/session-storage";

/**
 * Reage a um 401 em qualquer chamada autenticada (sessão expirada durante a
 * navegação ou o checkout): encerra a sessão local, limpa os dados privados e,
 * se a tela exige conta, leva ao login guardando o endereço atual para retomada.
 */
export function SessionWatcher() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    setSessionExpiredHandler(() => {
      // várias chamadas podem falhar juntas: só a primeira encerra a sessão
      if (getSessionToken() === null) return;
      endSession(queryClient);
      toast.warning("Sua sessão expirou.", {
        id: "sessao-expirada",
        description: "Entre novamente para continuar de onde parou.",
      });

      const { pathname, href } = router.state.location;
      if (isProtectedPath(pathname)) {
        void router.navigate({ to: "/entrar", search: { redirect: href }, replace: true });
      }
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient, router]);

  return null;
}

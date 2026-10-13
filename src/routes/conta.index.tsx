import { createFileRoute, redirect } from "@tanstack/react-router";

// rota /conta/
export const Route = createFileRoute("/conta/")({
  beforeLoad: () => {
    throw redirect({ to: "/conta/perfil", replace: true });
  },
});

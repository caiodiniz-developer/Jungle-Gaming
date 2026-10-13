import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/features/account/profile-page";

// rota /conta/perfil
export const Route = createFileRoute("/conta/perfil")({
  component: ProfilePage,
});

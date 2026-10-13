import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AccountLayout } from "@/features/account/account-layout";
import { requireSession } from "@/features/auth/guards";

export const Route = createFileRoute("/conta")({
  // toda a área da conta exige sessão
  beforeLoad: requireSession,
  component: AccountRoute,
});

function AccountRoute() {
  return (
    <AccountLayout>
      <Outlet />
    </AccountLayout>
  );
}

import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/conta")({
  component: AccountLayout,
});

function AccountLayout() {
  return <Outlet />;
}

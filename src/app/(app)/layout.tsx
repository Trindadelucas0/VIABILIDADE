import { AppShell } from "../../components/shell";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

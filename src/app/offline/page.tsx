import Link from "next/link";
import { Button } from "../../components/ui";

export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Sem conexão</h1>
      <p className="text-muted">Sem conexão. Os dados precisam de internet.</p>
      <Link href="/" className="no-underline">
        <Button className="w-full">Tentar de novo</Button>
      </Link>
    </main>
  );
}

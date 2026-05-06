import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container max-w-md py-16 text-center space-y-4">
      <p className="text-6xl" aria-hidden>🥐</p>
      <h1 className="text-2xl font-bold">Fant ikke siden</h1>
      <p className="text-muted-foreground">
        Boller er ferskvare. Det samme gjelder visst lenker.
      </p>
      <Link href="/">
        <Button>Tilbake til kartet</Button>
      </Link>
    </div>
  );
}

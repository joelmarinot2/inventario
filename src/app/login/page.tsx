"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: e2 } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (e2) {
        setError("Correo o contraseña incorrectos. Intenta de nuevo.");
        setPending(false);
        return;
      }
      // Navegación completa: así el servidor ve la sesión recién guardada.
      window.location.assign("/");
    } catch {
      setError("No hay internet o el servidor no responde. Intenta de nuevo.");
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold">Inventario y ventas</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Entra con tu correo y tu contraseña.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-xl border-2 bg-card p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-4 py-3 text-lg font-semibold text-destructive"
            >
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-base text-muted-foreground">
          ¿No puedes entrar? Pídele ayuda al administrador.
        </p>
      </div>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type EstadoLogin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial: EstadoLogin = { error: null };

function BotonEntrar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}

export default function LoginPage() {
  const [estado, formAction] = useActionState(login, estadoInicial);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold">Inventario y ventas</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Entra con tu correo y tu contraseña.
          </p>
        </div>

        <form action={formAction} className="space-y-5 rounded-xl border-2 bg-card p-6 shadow-sm">
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

          {estado.error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-4 py-3 text-lg font-semibold text-destructive"
            >
              {estado.error}
            </p>
          )}

          <BotonEntrar />
        </form>

        <p className="mt-6 text-center text-base text-muted-foreground">
          ¿No puedes entrar? Pídele ayuda al administrador.
        </p>
      </div>
    </main>
  );
}

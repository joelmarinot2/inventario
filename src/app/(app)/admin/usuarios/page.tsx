"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Perfil, Rol } from "@/lib/tipos";
import { crearUsuario, type EstadoUsuario } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const estadoInicial: EstadoUsuario = { error: null, ok: null };

export default function UsuariosPage() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [estado, formAction] = useActionState(crearUsuario, estadoInicial);

  const cargar = () => {
    const supabase = createClient();
    supabase
      .from("perfiles")
      .select("*")
      .order("creado_en")
      .then(({ data }) => setPerfiles((data ?? []) as Perfil[]));
  };

  useEffect(() => {
    cargar();
  }, [estado.ok]);

  const cambiarRol = async (id: string, rol: Rol) => {
    const supabase = createClient();
    await supabase.from("perfiles").update({ rol }).eq("id", id);
    cargar();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Usuarios</h1>

      <section className="space-y-4 rounded-xl border-2 bg-card p-5">
        <h2 className="text-xl font-bold">Crear usuario</h2>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" autoCapitalize="none" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="text" required />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <div className="flex gap-3">
              <label className="flex flex-1 items-center gap-2 rounded-lg border-2 p-3">
                <input type="radio" name="rol" value="vendedor" defaultChecked className="h-6 w-6" />
                <span className="text-lg font-semibold">Vendedor</span>
              </label>
              <label className="flex flex-1 items-center gap-2 rounded-lg border-2 p-3">
                <input type="radio" name="rol" value="admin" className="h-6 w-6" />
                <span className="text-lg font-semibold">Administrador</span>
              </label>
            </div>
          </div>

          {estado.error && (
            <p role="alert" className="text-lg font-semibold text-destructive">
              {estado.error}
            </p>
          )}
          {estado.ok && (
            <p className="text-lg font-semibold text-ok">{estado.ok}</p>
          )}

          <Button type="submit" size="lg" className="w-full">
            Crear usuario
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Usuarios actuales</h2>
        <ul className="space-y-3">
          {perfiles.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border-2 bg-card p-4"
            >
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">
                  {p.nombre || "(sin nombre)"}
                </p>
                <p className="text-base text-muted-foreground">
                  {p.rol === "admin" ? "Administrador" : "Vendedor"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  cambiarRol(p.id, p.rol === "admin" ? "vendedor" : "admin")
                }
              >
                {p.rol === "admin" ? "Hacer vendedor" : "Hacer administrador"}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

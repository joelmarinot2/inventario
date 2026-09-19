"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Producto, TipoProducto } from "@/lib/tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FotoProducto } from "@/components/foto-producto";

function numOrNull(s: string): number | null {
  const n = parseInt(s.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function FormularioProducto({ producto }: { producto?: Producto }) {
  const router = useRouter();
  const editando = !!producto;

  const [tipo, setTipo] = useState<TipoProducto>(producto?.tipo ?? "empacado");
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [gramaje, setGramaje] = useState(String(producto?.gramaje_g ?? ""));
  const [paqCaja, setPaqCaja] = useState(
    String(producto?.paquetes_por_caja ?? ""),
  );
  const [precioPaquete, setPrecioPaquete] = useState(
    String(producto?.precio_paquete ?? ""),
  );
  const [gramosCaja, setGramosCaja] = useState(
    String(producto?.gramos_por_caja ?? ""),
  );
  const [precioKilo, setPrecioKilo] = useState(
    String(producto?.precio_kilo ?? ""),
  );
  const [precioCaja, setPrecioCaja] = useState(
    String(producto?.precio_caja ?? ""),
  );
  const [precioCosto, setPrecioCosto] = useState(
    String(producto?.precio_costo ?? ""),
  );
  const [stockMinimo, setStockMinimo] = useState(
    String(producto?.stock_minimo ?? "0"),
  );
  const [stockInicial, setStockInicial] = useState("0");
  const [activo, setActivo] = useState(producto?.activo ?? true);
  const [fotoUrl, setFotoUrl] = useState<string | null>(
    producto?.foto_url ?? null,
  );
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subirFoto = async (file: File) => {
    setSubiendoFoto(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const ruta = `${crypto.randomUUID()}.${ext}`;
      const { error: e } = await supabase.storage
        .from("fotos-productos")
        .upload(ruta, file, { upsert: true });
      if (e) throw e;
      const { data } = supabase.storage
        .from("fotos-productos")
        .getPublicUrl(ruta);
      setFotoUrl(data.publicUrl);
    } catch {
      setError("No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      setError("Escribe el nombre del producto.");
      return;
    }
    setGuardando(true);
    setError(null);

    const comun = {
      nombre: nombre.trim(),
      tipo,
      precio_caja: numOrNull(precioCaja),
      precio_costo: numOrNull(precioCosto),
      stock_minimo: numOrNull(stockMinimo) ?? 0,
      foto_url: fotoUrl,
      activo,
    };
    const porTipo =
      tipo === "empacado"
        ? {
            gramaje_g: numOrNull(gramaje),
            paquetes_por_caja: numOrNull(paqCaja),
            precio_paquete: numOrNull(precioPaquete),
            gramos_por_caja: null,
            precio_kilo: null,
          }
        : {
            gramaje_g: null,
            paquetes_por_caja: null,
            precio_paquete: null,
            gramos_por_caja: numOrNull(gramosCaja),
            precio_kilo: numOrNull(precioKilo),
          };

    try {
      const supabase = createClient();
      if (editando) {
        const { error: e } = await supabase
          .from("productos")
          .update({ ...comun, ...porTipo })
          .eq("id", producto!.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("productos").insert({
          ...comun,
          ...porTipo,
          stock_base: numOrNull(stockInicial) ?? 0,
        });
        if (e) throw e;
      }
      router.push("/admin/productos");
      router.refresh();
    } catch (err) {
      setError(
        "No se pudo guardar. Revisa que los datos del tipo estén completos.",
      );
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  const unidadBase = tipo === "empacado" ? "paquetes" : "gramos";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <FotoProducto
          url={fotoUrl}
          nombre={nombre || "Producto"}
          tipo={tipo}
          className="h-24 w-24 shrink-0"
        />
        <label className="cursor-pointer text-lg font-semibold text-primary underline">
          {subiendoFoto ? "Subiendo…" : "Cambiar foto"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) subirFoto(f);
            }}
          />
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="flex gap-3">
          {(["empacado", "granel"] as TipoProducto[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={editando}
              onClick={() => setTipo(t)}
              className={`min-h-16 flex-1 rounded-xl border-2 text-lg font-bold disabled:opacity-60 ${
                tipo === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background"
              }`}
            >
              {t === "empacado" ? "Empacado" : "A granel"}
            </button>
          ))}
        </div>
        {editando && (
          <p className="text-base text-muted-foreground">
            El tipo no se puede cambiar después de crear el producto.
          </p>
        )}
      </div>

      {tipo === "empacado" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Gramaje del paquete (g)" value={gramaje} onChange={setGramaje} />
          <Campo label="Paquetes por caja" value={paqCaja} onChange={setPaqCaja} />
          <Campo label="Precio por paquete ($)" value={precioPaquete} onChange={setPrecioPaquete} />
          <Campo label="Precio por caja ($, opcional)" value={precioCaja} onChange={setPrecioCaja} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Peso del bulto/caja (g)" value={gramosCaja} onChange={setGramosCaja} />
          <Campo label="Precio por kilo ($)" value={precioKilo} onChange={setPrecioKilo} />
          <Campo label="Precio por bulto ($, opcional)" value={precioCaja} onChange={setPrecioCaja} />
        </div>
      )}

      <Campo
        label="Valor de la empresa (costo, $, opcional)"
        value={precioCosto}
        onChange={setPrecioCosto}
      />

      <Campo
        label={`Avisar cuando queden menos de (${unidadBase})`}
        value={stockMinimo}
        onChange={setStockMinimo}
      />

      {!editando && (
        <Campo
          label={`Inventario inicial (${unidadBase})`}
          value={stockInicial}
          onChange={setStockInicial}
        />
      )}

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="h-7 w-7"
        />
        <span className="text-lg font-semibold">Activo (se puede vender)</span>
      </label>

      {error && (
        <p role="alert" className="text-lg font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={() => router.push("/admin/productos")}
        >
          Cancelar
        </Button>
        <Button
          size="lg"
          className="flex-1"
          onClick={guardar}
          disabled={guardando || subiendoFoto}
        >
          {guardando ? "Guardando…" : "Guardar producto"}
        </Button>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

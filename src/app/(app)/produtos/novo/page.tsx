"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconBack } from "../../../../components/icons";
import { MoneyField } from "../../../../components/money-field";
import { Button, Field, PageIntro, useToast } from "../../../../components/ui";
import { api, ApiError } from "../../../../lib/api";
import { notifySaved } from "../../../../lib/notify";
import type { Catalog, ProductDetail, Supplier } from "../../../../lib/types";

const LAST_SUPPLIER_KEY = "viabilidade_last_supplier";

type WizardStep = "foto" | "nome" | "preco" | "stand" | "segmento" | "fornecedor";

const STEPS: WizardStep[] = ["foto", "nome", "preco", "stand", "segmento", "fornecedor"];

const STEP_LABEL: Record<WizardStep, string> = {
  foto: "Foto",
  nome: "Nome",
  preco: "Preço na feira",
  stand: "Stand",
  segmento: "Segmento",
  fornecedor: "Fornecedor",
};

type LastSupplier = {
  supplierId: string;
  supplierNumber: string;
  supplierName: string;
  supplierPhone: string;
  supplierNotes: string;
};

function readLastSupplier(): LastSupplier | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LAST_SUPPLIER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastSupplier;
  } catch {
    return null;
  }
}

function writeLastSupplier(data: LastSupplier) {
  sessionStorage.setItem(LAST_SUPPLIER_KEY, JSON.stringify(data));
}

export default function NewProductPage() {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<WizardStep>("foto");
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [name, setName] = useState("");
  const [fairPrice, setFairPrice] = useState("");
  const [stand, setStand] = useState("");
  const [segment, setSegment] = useState("");
  const [segments, setSegments] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierNumber, setSupplierNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierNotes, setSupplierNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [savedBanner, setSavedBanner] = useState<{ id: string; name: string } | null>(null);
  const [hasLastSupplier, setHasLastSupplier] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const stepNumber = stepIndex + 1;

  useEffect(() => {
    api<Supplier[]>("/api/suppliers")
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
    api<Catalog>("/api/products")
      .then((catalog) => setSegments(catalog.segments))
      .catch(() => setSegments([]));
    const last = readLastSupplier();
    if (last) {
      setHasLastSupplier(true);
      setSupplierId(last.supplierId);
      setSupplierNumber(last.supplierNumber);
      setSupplierName(last.supplierName);
      setSupplierPhone(last.supplierPhone);
      setSupplierNotes(last.supplierNotes);
    }
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step, cameraOn]);

  function goBack() {
    if (step === "foto") return;
    setStep(STEPS[stepIndex - 1]!);
  }

  function goNext() {
    if (step === "fornecedor") return;
    setStep(STEPS[stepIndex + 1]!);
  }

  async function startCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraOn(false);
      setCameraError("A câmera não foi autorizada. Você pode continuar sem foto.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (preview) URL.revokeObjectURL(preview);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraOn(false);
    }, "image/jpeg", 0.9);
  }

  function chooseFile(file: File | null) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setCameraError("A imagem passa de 8 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setCameraError("");
  }

  function skipPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPhoto(null);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    setStep("nome");
  }

  function chooseSupplier(id: string) {
    setSupplierId(id);
    const supplier = suppliers.find((item) => item.id === id);
    if (!supplier) return;
    setSupplierNumber(supplier.number ?? "");
    setSupplierName(supplier.name);
    setSupplierPhone(supplier.phone ?? "");
    setSupplierNotes(supplier.notes ?? "");
  }

  function resetProductFields() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPhoto(null);
    setCameraOn(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setName("");
    setFairPrice("");
    setStand("");
    setSegment("");
    setError("");
    setFields({});
  }

  async function save() {
    setSaving(true);
    setError("");
    setFields({});
    try {
      const product = await api<ProductDetail>("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          fair_price_usd: fairPrice,
          stand,
          segment,
          currency: "USD",
          brazil_price_brl: "",
          supplier_id: supplierId || null,
          supplier: {
            number: supplierNumber,
            name: supplierName,
            phone: supplierPhone,
            notes: supplierNotes,
          },
        }),
      });
      if (photo) {
        try {
          const form = new FormData();
          form.append("file", photo, "foto.jpg");
          await api(`/api/products/${product.id}/images`, { method: "POST", body: form });
        } catch (caught) {
          toast(caught instanceof ApiError ? `Produto salvo. ${caught.message}` : "Produto salvo. A foto não foi enviada.");
        }
      }
      writeLastSupplier({
        supplierId,
        supplierNumber,
        supplierName,
        supplierPhone,
        supplierNotes,
      });
      await notifySaved("pending", product.name);
      toast("Produto salvo.");
      setSavedBanner({ id: product.id, name: product.name || "Sem nome" });
      resetProductFields();
      setStep("foto");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else {
        setError("Sem conexão. Os dados precisam de internet.");
      }
    } finally {
      setSaving(false);
    }
  }

  function onFieldKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      goNext();
    }
  }

  return (
    <div className="mx-auto grid max-w-xl gap-5">
      {step === "foto" ? (
        <Link href="/produtos" className="inline-flex min-h-11 items-center gap-2 font-semibold no-underline">
          <IconBack />
          Produtos
        </Link>
      ) : (
        <button type="button" className="inline-flex min-h-11 items-center gap-2 font-semibold" onClick={goBack}>
          <IconBack />
          {STEP_LABEL[STEPS[stepIndex - 1]!]}
        </button>
      )}
      <PageIntro title="Novo produto" subtitle={`Passo ${stepNumber} de 6 · ${STEP_LABEL[step]}`} />
      <nav className="flex flex-wrap gap-2" aria-label="Progresso">
        {STEPS.map((item, index) => (
          <span
            key={item}
            className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${
              item === step ? "bg-accent text-white" : index < stepIndex ? "bg-accent-soft text-accent" : "border border-line bg-surface text-muted"
            }`}
          >
            {STEP_LABEL[item]}
          </span>
        ))}
      </nav>
      {savedBanner && step === "foto" ? (
        <p className="section-card text-sm">
          <span className="font-semibold text-ok">Salvo</span> · {savedBanner.name} ·{" "}
          <Link href={`/produtos/${savedBanner.id}`} className="font-semibold">
            Abrir prontuário
          </Link>
        </p>
      ) : null}
      {step === "foto" ? (
        <div className="grid gap-4">
          <div className="grid min-h-48 place-items-center overflow-hidden rounded-xl border border-line bg-surface">
            {preview ? (
              <img src={preview} alt="Prévia da foto do produto" className="max-h-72 w-full object-contain" />
            ) : cameraOn ? (
              <video ref={videoRef} autoPlay playsInline muted className="max-h-72 w-full object-contain" />
            ) : (
              <p className="px-4 text-center text-muted">Área da câmera</p>
            )}
          </div>
          {cameraError ? <p className="text-sm text-danger">{cameraError}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void startCamera()}>Tirar foto</Button>
            {cameraOn ? <Button variant="secondary" onClick={capture}>Usar esta foto</Button> : null}
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-line bg-surface px-4 font-semibold">
              Escolher arquivo
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>
          <div className="grid gap-3">
            {preview ? (
              <Button className="w-full" onClick={goNext}>
                Próximo
              </Button>
            ) : null}
            <Button className="w-full" variant="secondary" onClick={skipPhoto}>
              Pular
            </Button>
          </div>
        </div>
      ) : null}
      {step === "nome" ? (
        <div className="grid gap-4">
          <Field label="Nome" hint="Entra na análise." error={fields.name}>
            {(id) => (
              <input
                id={id}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={onFieldKeyDown}
                autoComplete="off"
                autoFocus
              />
            )}
          </Field>
          <Button className="w-full" onClick={goNext}>
            Próximo
          </Button>
        </div>
      ) : null}
      {step === "preco" ? (
        <div className="grid gap-4">
          <Field label="Preço na feira (USD)" hint="Entra na análise." error={fields.fair_price_usd}>
            {(id) => (
              <MoneyField
                id={id}
                currency="USD"
                value={fairPrice}
                onChange={setFairPrice}
                onKeyDown={onFieldKeyDown}
                autoFocus
              />
            )}
          </Field>
          <Button className="w-full" onClick={goNext}>
            Próximo
          </Button>
        </div>
      ) : null}
      {step === "stand" ? (
        <div className="grid gap-4">
          <Field label="Stand" hint="Opcional.">
            {(id) => (
              <input id={id} value={stand} onChange={(event) => setStand(event.target.value)} onKeyDown={onFieldKeyDown} autoFocus />
            )}
          </Field>
          <Button className="w-full" onClick={goNext}>
            Próximo
          </Button>
        </div>
      ) : null}
      {step === "segmento" ? (
        <div className="grid gap-4">
          <Field label="Segmento" hint="Opcional.">
            {(id) => (
              <input
                id={id}
                list="segmentos"
                value={segment}
                onChange={(event) => setSegment(event.target.value)}
                onKeyDown={onFieldKeyDown}
                autoFocus
              />
            )}
          </Field>
          <datalist id="segmentos">
            {segments.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <Button className="w-full" onClick={goNext}>
            Próximo
          </Button>
        </div>
      ) : null}
      {step === "fornecedor" ? (
        <div className="grid gap-4">
          {hasLastSupplier ? <p className="text-sm text-muted">Mesmo fornecedor da última ficha.</p> : null}
          <Field label="Usar existente">
            {(id) => (
              <select id={id} value={supplierId} onChange={(event) => chooseSupplier(event.target.value)}>
                <option value="">Novo fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Número">
            {(id) => <input id={id} value={supplierNumber} onChange={(event) => setSupplierNumber(event.target.value)} />}
          </Field>
          <Field label="Nome" hint="Entra na análise." error={fields["supplier.name"]}>
            {(id) => <input id={id} value={supplierName} onChange={(event) => setSupplierName(event.target.value)} autoFocus />}
          </Field>
          <Field label="Telefone">
            {(id) => (
              <input id={id} inputMode="tel" autoComplete="tel" value={supplierPhone} onChange={(event) => setSupplierPhone(event.target.value)} />
            )}
          </Field>
          <Field label="Obs">
            {(id) => <textarea id={id} rows={3} value={supplierNotes} onChange={(event) => setSupplierNotes(event.target.value)} />}
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button className="w-full" disabled={saving} onClick={() => void save()}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

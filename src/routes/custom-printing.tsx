import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitCustomRequest } from "@/lib/orders.functions";

export const Route = createFileRoute("/custom-printing")({
  head: () => ({
    meta: [
      { title: "Custom 3D Printing Requests — MakeMyThings.in" },
      {
        name: "description",
        content:
          "Upload an STL or a reference photo and get a quote for a fully custom 3D printed product. We can model it for you too.",
      },
      { property: "og:title", content: "Custom 3D Printing — MakeMyThings.in" },
      {
        property: "og:description",
        content: "Don't have a 3D model? We can turn your idea into reality.",
      },
    ],
  }),
  component: CustomPrinting,
});

const STEPS = [
  ["Share your idea", "Describe it, upload an STL or send a reference photo."],
  ["We quote it", "Our team reviews feasibility, material and finish, then sends a price."],
  ["We print it", "Approve the quote and we print, finish and ship it to your door."],
];

function CustomPrinting() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
    size: "Medium (10–15 cm)",
    quantity: 1,
    material: "PLA+",
    notes: "",
  });
  const [modelFile, setModelFile] = useState<string>("");
  const [referenceFile, setReferenceFile] = useState<string>("");

  const submit = useMutation({
    mutationFn: () =>
      submitCustomRequest({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          ...(form.phone ? { phone: form.phone.trim() } : {}),
          description: form.description.trim(),
          size: form.size,
          quantity: Number(form.quantity),
          material: form.material,
          ...(form.notes ? { notes: form.notes.trim() } : {}),
          ...(modelFile ? { model_file_url: modelFile } : {}),
          ...(referenceFile ? { reference_image_url: referenceFile } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Request received — we'll reply with a quote within 24 hours.");
      setForm({
        name: "",
        email: "",
        phone: "",
        description: "",
        size: "Medium (10–15 cm)",
        quantity: 1,
        material: "PLA+",
        notes: "",
      });
      setModelFile("");
      setReferenceFile("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const valid =
    form.name.trim().length > 1 &&
    /.+@.+\..+/.test(form.email) &&
    form.description.trim().length >= 10;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Custom 3D printing
        </span>
        <h1 className="mt-5 font-display text-3xl font-extrabold sm:text-4xl">
          Turn your idea into something you can hold
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Don't have a 3D model? We can help turn your idea into reality — send a description or a
          reference image and our designers will model it for you.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {STEPS.map(([title, text], index) => (
          <div key={title} className="rounded-2xl border border-border bg-gradient-surface p-5">
            <span className="font-display text-sm font-bold text-primary">0{index + 1}</span>
            <h2 className="mt-2 text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <form
        className="mt-12 grid gap-5 rounded-3xl border border-border bg-surface p-6 sm:p-8 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit.mutate();
        }}
      >
        <Field label="Your name">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={100}
            required
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            maxLength={160}
            required
          />
        </Field>
        <Field label="Phone (optional)">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            maxLength={20}
          />
        </Field>
        <Field label="Preferred material">
          <Select value={form.material} onValueChange={(v) => setForm({ ...form, material: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["PLA+", "PETG", "Resin finish", "Silk PLA", "Translucent PLA", "Not sure"].map(
                (material) => (
                  <SelectItem key={material} value={material}>
                    {material}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </Field>

        <div className="md:col-span-2">
          <Field label="Describe what you want printed">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={2000}
              rows={5}
              placeholder="e.g. A 15cm statue of my dog, sitting, matte black, with a name plate reading 'Bruno'."
              required
            />
          </Field>
        </div>

        <Field label="Approximate size">
          <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "Small (up to 10 cm)",
                "Medium (10–15 cm)",
                "Large (15–25 cm)",
                "Extra large (25 cm+)",
              ].map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Quantity">
          <Input
            type="number"
            min={1}
            max={500}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
          />
        </Field>

        <Field label="Upload 3D model (STL / OBJ / 3MF)">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input bg-background px-4 py-3 text-xs text-muted-foreground">
            <Upload className="h-4 w-4 text-primary" />
            {modelFile || "Choose a file"}
            <input
              type="file"
              accept=".stl,.obj,.3mf,.step"
              className="hidden"
              onChange={(e) => setModelFile(e.target.files?.[0]?.name ?? "")}
            />
          </label>
        </Field>
        <Field label="Upload reference image">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input bg-background px-4 py-3 text-xs text-muted-foreground">
            <Upload className="h-4 w-4 text-primary" />
            {referenceFile || "Choose an image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setReferenceFile(e.target.files?.[0]?.name ?? "")}
            />
          </label>
        </Field>

        <div className="md:col-span-2">
          <Field label="Additional notes (optional)">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={1000}
              rows={3}
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Button
            type="submit"
            size="lg"
            className="rounded-full"
            disabled={!valid || submit.isPending}
          >
            {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit request
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            File uploads are recorded with your request; our team will email you a secure upload link
            for large models.
          </p>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

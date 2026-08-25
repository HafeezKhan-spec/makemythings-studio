import { Download, ExternalLink, Mail, Phone, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CUSTOM_REQUEST_STATUSES, formatDate, inr, orderStatusLabel } from "@/lib/format";

export type AdminCustomRequestRow = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  description: string;
  status: string;
  quoted_price?: number | null;
  quote_message?: string;
  quote_sent_at?: string | null;
  quote_seen_by_user?: boolean;
  model_file_url?: string;
  reference_image_url?: string;
  size?: string;
  quantity?: number;
  material?: string;
  notes?: string;
  created_at?: string | null;
  is_new?: boolean;
};

export function CustomRequestCard({
  request,
  onStatusChange,
  onSendQuote,
  onAcknowledge,
  busy,
}: {
  request: AdminCustomRequestRow;
  onStatusChange: (status: string) => void;
  onSendQuote: (quoted_price: number, quote_message: string) => void;
  onAcknowledge: () => void;
  busy?: boolean;
}) {
  const isNew = Boolean(request.is_new);
  const [quotePrice, setQuotePrice] = useState(
    request.quoted_price ? String(request.quoted_price) : "",
  );
  const [quoteMessage, setQuoteMessage] = useState(request.quote_message ?? "");

  const quoteSent = Boolean(request.quote_sent_at);

  return (
    <article
      className={`rounded-xl border p-4 text-sm ${
        isNew ? "border-orange-500/50 bg-orange-500/5" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isNew ? (
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                NEW
              </span>
            ) : null}
            <h3 className="font-semibold">{request.name}</h3>
            <span className="text-xs text-muted-foreground">
              {formatDate(request.created_at ?? undefined)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <a href={`mailto:${request.email}`} className="inline-flex items-center gap-1 hover:text-primary">
              <Mail className="h-3.5 w-3.5" />
              {request.email}
            </a>
            {request.phone ? (
              <a href={`tel:${request.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                <Phone className="h-3.5 w-3.5" />
                {request.phone}
              </a>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={request.status} disabled={busy} onValueChange={onStatusChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_REQUEST_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{orderStatusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isNew ? (
            <Button size="sm" variant="secondary" disabled={busy} onClick={onAcknowledge}>
              Mark reviewed
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Size" value={request.size || "—"} />
        <Meta label="Quantity" value={String(request.quantity ?? 1)} />
        <Meta label="Material" value={request.material || "—"} />
        <Meta label="Status" value={orderStatusLabel(request.status)} />
      </dl>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          What they want printed
        </p>
        <p className="mt-1.5 rounded-lg border border-border bg-background/60 p-3 text-sm leading-relaxed whitespace-pre-wrap">
          {request.description}
        </p>
      </div>

      {request.notes ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Additional notes
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">{request.notes}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-4">
        {request.reference_image_url ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Reference image
            </p>
            <a
              href={request.reference_image_url}
              target="_blank"
              rel="noreferrer"
              className="group block overflow-hidden rounded-xl border border-border"
            >
              <img
                src={request.reference_image_url}
                alt="Customer reference"
                className="max-h-56 w-full max-w-xs object-cover transition-opacity group-hover:opacity-90"
              />
            </a>
            <a
              href={request.reference_image_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary"
            >
              <ExternalLink className="h-3 w-3" />
              Open full image
            </a>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No reference image uploaded.</p>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Files
          </p>
          {request.model_file_url ? (
            <a
              href={request.model_file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:border-primary/40 hover:text-primary"
            >
              <Download className="h-4 w-4" />
              Download 3D model (STL)
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">No STL model uploaded.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm font-semibold">Send quote to customer</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The customer will see this in a popup when they sign in or visit the site (same email).
          They also receive an email.
        </p>

        {quoteSent ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Last sent {formatDate(request.quote_sent_at ?? undefined)}
            {request.quote_seen_by_user ? " · Customer has seen it" : " · Not yet seen by customer"}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr]">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Quote amount (₹)</label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 1499"
              value={quotePrice}
              disabled={busy}
              onChange={(e) => setQuotePrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Message to customer</label>
            <Textarea
              rows={4}
              maxLength={2000}
              placeholder="e.g. We can print this in silk PLA. Lead time 5–7 days. Reply to approve."
              value={quoteMessage}
              disabled={busy}
              onChange={(e) => setQuoteMessage(e.target.value)}
            />
          </div>
        </div>

        <Button
          type="button"
          className="mt-4 rounded-full"
          disabled={busy || !quoteMessage.trim() || Number(quotePrice) <= 0}
          onClick={() => onSendQuote(Number(quotePrice), quoteMessage.trim())}
        >
          <Send className="mr-2 h-4 w-4" />
          Send quote
        </Button>

        {request.quoted_price && request.quote_message ? (
          <div className="mt-4 rounded-lg border border-border bg-background/50 p-3 text-xs">
            <p className="font-semibold">Current quote: {inr(Number(request.quoted_price))}</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{request.quote_message}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

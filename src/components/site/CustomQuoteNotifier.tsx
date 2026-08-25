import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  acknowledgeCustomRequestQuote,
  listGuestCustomRequestQuotes,
  listMyCustomRequestQuotes,
} from "@/lib/custom-request.functions";
import { inr, orderStatusLabel } from "@/lib/format";

const GUEST_QUOTE_EMAIL_KEY = "mmt-quote-email";

export function storeGuestQuoteEmail(email: string) {
  try {
    sessionStorage.setItem(GUEST_QUOTE_EMAIL_KEY, email.toLowerCase().trim());
  } catch {
    /* ignore */
  }
}

type QuoteRow = {
  id: string;
  description: string;
  quoted_price: number;
  quote_message: string;
  size?: string;
  quantity?: number;
  material?: string;
};

export function CustomQuoteNotifier() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) storeGuestQuoteEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (user) return;
    try {
      const stored = sessionStorage.getItem(GUEST_QUOTE_EMAIL_KEY);
      if (stored) setGuestEmail(stored);
    } catch {
      /* ignore */
    }
  }, [user]);

  const loggedInQuery = useQuery({
    queryKey: ["my-custom-quotes"],
    queryFn: () => listMyCustomRequestQuotes(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const guestQuery = useQuery({
    queryKey: ["guest-custom-quotes", guestEmail],
    queryFn: () => listGuestCustomRequestQuotes({ data: { email: guestEmail! } }),
    enabled: !user && Boolean(guestEmail),
    staleTime: 60_000,
  });

  const quotes = (user ? loggedInQuery.data : guestQuery.data) as QuoteRow[] | undefined;
  const active = quotes?.[index];

  useEffect(() => {
    if (quotes && quotes.length > 0) {
      setOpen(true);
      setIndex(0);
    }
  }, [quotes?.length, quotes?.[0]?.id]);

  const acknowledge = useMutation({
    mutationFn: async (id: string) =>
      acknowledgeCustomRequestQuote({
        data: {
          id,
          ...(guestEmail && !user ? { email: guestEmail } : {}),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-custom-quotes"] });
      qc.invalidateQueries({ queryKey: ["guest-custom-quotes"] });
      qc.invalidateQueries({ queryKey: ["my-custom-requests"] });
    },
  });

  function closeAndAcknowledge() {
    if (!quotes?.length) {
      setOpen(false);
      return;
    }
    const ids = quotes.map((q) => q.id);
    void Promise.all(ids.map((id) => acknowledge.mutateAsync(id))).then(() => {
      setOpen(false);
      toast.success("Quote saved — check My Account anytime.");
    });
  }

  if (!active) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeAndAcknowledge();
        else setOpen(next);
      }}
    >
      <DialogContent className="max-w-lg border-primary/30 bg-gradient-surface">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Custom print quote</span>
          </div>
          <DialogTitle className="font-display text-xl">Your quote is ready</DialogTitle>
          <DialogDescription>
            We reviewed your custom printing request and sent you a price.
            {quotes && quotes.length > 1
              ? ` Showing ${index + 1} of ${quotes.length}.`
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Your request
            </p>
            <p className="mt-1 whitespace-pre-wrap">{active.description}</p>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Size</dt>
                <dd className="font-medium">{active.size || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Qty</dt>
                <dd className="font-medium">{active.quantity ?? 1}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Material</dt>
                <dd className="font-medium">{active.material || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Quoted price
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold text-primary">
              {inr(active.quoted_price)}
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Message from our team
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{active.quote_message}</p>
          </div>

          <p className="text-xs text-muted-foreground">
            Status: {orderStatusLabel("quote_sent")}. Reply via{" "}
            <Link to="/contact" className="text-primary hover:underline">Contact</Link> or email us to
            approve and proceed.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {quotes && index < quotes.length - 1 ? (
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              onClick={() => setIndex((i) => i + 1)}
            >
              Next quote
            </Button>
          ) : null}
          <Button type="button" className="rounded-full" onClick={() => closeAndAcknowledge()}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { clearPersistedCart, loadPersistedCart, syncPersistedCart } from "@/lib/cart.functions";
import type { CartLine } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

function storageKey(userId?: string | null) {
  return userId ? `mmt-cart-v1:user:${userId}` : "mmt-cart-v1:guest";
}

function readLocalCart(key: string): CartLine[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as CartLine[];
  } catch {
    return [];
  }
}

/** Legacy key mixed guest + all accounts on the same browser. */
function clearLegacyCartStorage() {
  try {
    window.localStorage.removeItem("mmt-cart-v1");
  } catch {
    /* ignore */
  }
}

function writeLocalCart(key: string, lines: CartLine[]) {
  window.localStorage.setItem(key, JSON.stringify(lines));
}

function mergeCartLines(guest: CartLine[], remote: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const line of remote) {
    map.set(line.productId, { ...line });
  }
  for (const line of guest) {
    const existing = map.get(line.productId);
    if (existing) {
      map.set(line.productId, {
        ...existing,
        quantity: Math.min(20, existing.quantity + line.quantity),
      });
    } else {
      map.set(line.productId, { ...line });
    }
  }
  return Array.from(map.values());
}

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  getQuantity: (productId: string) => number;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userId = user?.id;
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  // Load cart when auth state is known — merge guest cart into account on first login
  useEffect(() => {
    if (prevUserIdRef.current === userId) return;

    const previousUserId = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    let cancelled = false;

    (async () => {
      clearLegacyCartStorage();

      if (userId) {
        const mergeGuestCart = previousUserId == null;
        const guestLines = mergeGuestCart ? readLocalCart(storageKey(null)) : [];
        try {
          const remote = await loadPersistedCart();
          if (cancelled) return;
          const merged = mergeGuestCart ? mergeCartLines(guestLines, remote) : remote;
          setLines(merged);
          writeLocalCart(storageKey(userId), merged);
          if (mergeGuestCart && merged.length) {
            syncPersistedCart({
              data: {
                lines: merged.map((l) => ({ productId: l.productId, quantity: l.quantity })),
              },
            }).catch(() => undefined);
          }
        } catch {
          if (cancelled) return;
          const fallback = mergeGuestCart ? mergeCartLines(guestLines, readLocalCart(storageKey(userId))) : readLocalCart(storageKey(userId));
          setLines(fallback);
        }
      } else {
        // Logged out: show guest cart only (do not keep another user's items)
        if (previousUserId !== undefined) {
          setLines(readLocalCart(storageKey(null)));
        } else {
          setLines(readLocalCart(storageKey(null)));
        }
      }
      if (!hydrated) setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeLocalCart(storageKey(userId), lines);
  }, [lines, hydrated, userId]);

  const scheduleSync = useCallback(
    (nextLines: CartLine[]) => {
      if (!userId) return;
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        syncPersistedCart({
          data: {
            lines: nextLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          },
        }).catch(() => {
          /* sync best-effort */
        });
      }, 400);
    },
    [userId],
  );

  const add = useCallback(
    (line: Omit<CartLine, "quantity">, quantity = 1) => {
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === line.productId);
        const next = existing
          ? prev.map((l) =>
              l.productId === line.productId
                ? { ...l, quantity: Math.min(20, l.quantity + quantity) }
                : l,
            )
          : [...prev, { ...line, quantity: Math.min(20, quantity) }];
        scheduleSync(next);
        return next;
      });
    },
    [scheduleSync],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      setLines((prev) => {
        const next =
          quantity <= 0
            ? prev.filter((l) => l.productId !== productId)
            : prev.map((l) =>
                l.productId === productId ? { ...l, quantity: Math.min(20, quantity) } : l,
              );
        scheduleSync(next);
        return next;
      });
    },
    [scheduleSync],
  );

  const remove = useCallback(
    (productId: string) => {
      setLines((prev) => {
        const next = prev.filter((l) => l.productId !== productId);
        scheduleSync(next);
        return next;
      });
    },
    [scheduleSync],
  );

  const clear = useCallback(() => {
    setLines([]);
    writeLocalCart(storageKey(userId), []);
    if (userId) clearPersistedCart().catch(() => {});
  }, [userId]);

  const getQuantity = useCallback(
    (productId: string) => lines.find((l) => l.productId === productId)?.quantity ?? 0,
    [lines],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      hydrated,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      getQuantity,
    }),
    [lines, hydrated, add, setQuantity, remove, clear, getQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

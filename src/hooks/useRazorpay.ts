import { useEffect, useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

export function useRazorpay() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRazorpayScript()
      .then(() => setReady(true))
      .catch((err: Error) => setError(err.message));
  }, []);

  return { ready, error };
}

export async function openRazorpayCheckout(options: Record<string, unknown>) {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable");
  return new window.Razorpay(options);
}

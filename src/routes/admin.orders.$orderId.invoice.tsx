import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Printer } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { InvoiceDocument } from "@/components/admin/InvoiceDocument";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { adminGetOrder, getMyAccess } from "@/lib/admin.functions";
import { downloadElementAsPdf, printDocument } from "@/lib/print-pdf";

type FulfillmentSearch = { print?: string; download?: string };

export const Route = createFileRoute("/admin/orders/$orderId/invoice")({
  validateSearch: (search: Record<string, unknown>): FulfillmentSearch => ({
    print: typeof search.print === "string" ? search.print : undefined,
    download: typeof search.download === "string" ? search.download : undefined,
  }),
  head: () => ({
    meta: [{ title: "Invoice — MakeMyThing.in Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { orderId } = Route.useParams();
  const search = Route.useSearch();
  const { user, loading } = useAuth();
  const access = useQuery({
    queryKey: ["admin-access", user?.id],
    enabled: Boolean(user),
    queryFn: () => getMyAccess(),
  });
  const isAdmin = Boolean(user?.is_admin || access.data?.isAdmin);
  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", orderId],
    enabled: isAdmin,
    queryFn: () => adminGetOrder({ data: { id: orderId } }),
  });

  useEffect(() => {
    if (!order) return;

    if (search.print === "1") {
      const timer = window.setTimeout(() => printDocument(), 600);
      return () => window.clearTimeout(timer);
    }

    if (search.download === "1") {
      const timer = window.setTimeout(() => {
        downloadElementAsPdf("invoice-document", `${order.order_number}-invoice.pdf`, "a4").catch(
          (e: Error) => toast.error(e.message),
        );
      }, 800);
      return () => window.clearTimeout(timer);
    }
  }, [search.print, search.download, order]);

  if (loading || (user && !user.is_admin && access.isLoading) || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin || !order) {
    return <div className="p-8 text-center text-sm">Admin access required.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="no-print mx-auto mb-4 flex max-w-md flex-wrap justify-center gap-2">
        <Button onClick={() => printDocument()} className="rounded-full">
          <Printer className="mr-2 h-4 w-4" /> Print Invoice (A4)
        </Button>
        <Button
          variant="secondary"
          className="rounded-full"
          onClick={() =>
            downloadElementAsPdf("invoice-document", `${order.order_number}-invoice.pdf`, "a4").catch(
              (e: Error) => toast.error(e.message),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
      </div>
      <InvoiceDocument order={order} />
    </div>
  );
}

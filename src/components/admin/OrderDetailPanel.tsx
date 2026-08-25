import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminPanel } from "@/components/admin/AdminShell";
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
import {
  adminAcknowledgeOrder,
  adminGetOrder,
  adminUpdateOrder,
} from "@/lib/admin.functions";
import { formatDate, inr, orderStatusLabel, paymentStatusLabel } from "@/lib/format";

const FULFILLMENT_STATUSES = [
  "paid",
  "processing",
  "printing",
  "quality_check",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export function OrderDetailPanel({
  orderId,
  onBack,
}: {
  orderId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => adminGetOrder({ data: { id: orderId } }),
  });

  const [shipping, setShipping] = useState({
    courier_partner: "",
    awb_number: "",
    package_weight: "",
    package_count: 1,
    shipping_method: "Standard",
    shipping_notes: "",
  });

  useEffect(() => {
    if (order) {
      setShipping({
        courier_partner: order.courier_partner,
        awb_number: order.awb_number,
        package_weight: order.package_weight,
        package_count: order.package_count,
        shipping_method: order.shipping_method || "Standard",
        shipping_notes: order.shipping_notes,
      });
      if (order.is_new && order.payment_status === "paid") {
        void adminAcknowledgeOrder({ data: { id: orderId } }).then(() => {
          qc.invalidateQueries({ queryKey: ["admin-order-notifications"] });
          qc.invalidateQueries({ queryKey: ["admin-orders"] });
          qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
        });
      }
    }
  }, [order, orderId, qc]);

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => adminUpdateOrder({ data: payload as never }),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin-order", orderId] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-order-notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !order) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const addr = order.shipping_address;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to orders
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-extrabold">{order.order_number}</h2>
        {order.is_new ? (
          <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
            New
          </span>
        ) : null}
        <span className="rounded-full border border-border px-3 py-1 text-xs">
          {orderStatusLabel(order.status)}
        </span>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">
          {paymentStatusLabel(order.payment_status)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="rounded-full"
          onClick={() => window.open(`/admin/orders/${orderId}/label?print=1`, "_blank")}
        >
          <Printer className="mr-2 h-4 w-4" /> Print Shipping Label
        </Button>
        <Button
          variant="secondary"
          className="rounded-full"
          onClick={() => window.open(`/admin/orders/${orderId}/label?download=1`, "_blank")}
        >
          <Download className="mr-2 h-4 w-4" /> Download Label PDF
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => window.open(`/admin/orders/${orderId}/invoice?print=1`, "_blank")}
        >
          <Printer className="mr-2 h-4 w-4" /> Print Invoice
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => window.open(`/admin/orders/${orderId}/invoice?download=1`, "_blank")}
        >
          <Download className="mr-2 h-4 w-4" /> Download Invoice PDF
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Customer">
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{order.customer_name}</p>
            <p className="text-muted-foreground">{order.customer_email}</p>
            <p className="text-muted-foreground">{order.customer_phone}</p>
            <p className="mt-3 text-xs font-bold uppercase text-muted-foreground">Delivery address</p>
            <p>
              {addr.full_name} · {addr.phone}
              <br />
              {[addr.house, addr.street, addr.area].filter(Boolean).join(", ")}
              <br />
              {addr.city}, {addr.state} {addr.pincode}
              <br />
              {addr.country}
            </p>
          </div>
        </AdminPanel>

        <AdminPanel title="Payment">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Type:</span>{" "}
              {order.payment_type.toUpperCase()}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              {orderStatusLabel(order.payment_status)}
            </p>
            {order.payment_reference ? (
              <p>
                <span className="text-muted-foreground">Razorpay Payment ID:</span>{" "}
                {order.payment_reference}
              </p>
            ) : null}
            {order.razorpay_order_id ? (
              <p>
                <span className="text-muted-foreground">Razorpay Order:</span>{" "}
                {order.razorpay_order_id}
              </p>
            ) : null}
            <p className="pt-2 font-display text-lg font-extrabold">{inr(order.total)}</p>
            <p className="text-xs text-muted-foreground">Placed {formatDate(order.created_at)}</p>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Products">
        <div className="space-y-2">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm"
            >
              {item.product_image ? (
                <img src={item.product_image} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : null}
              <div className="flex-1">
                <p className="font-medium">{item.product_name}</p>
                {item.sku ? <p className="text-xs text-muted-foreground">SKU: {item.sku}</p> : null}
              </div>
              <span className="text-muted-foreground">×{item.quantity}</span>
              <span className="font-semibold">{inr(item.line_total)}</span>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Fulfillment & shipping">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Order status">
            {order.payment_status === "paid" ? (
              <Select
                value={order.status}
                onValueChange={(v) => save.mutate({ id: orderId, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FULFILLMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {orderStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                Payment is {paymentStatusLabel(order.payment_status)}. Fulfillment status can be
                updated after payment is completed.
              </p>
            )}
          </Field>
          <Field label="Courier partner">
            <Input
              value={shipping.courier_partner}
              onChange={(e) => setShipping({ ...shipping, courier_partner: e.target.value })}
              placeholder="e.g. Delhivery, Blue Dart"
            />
          </Field>
          <Field label="AWB / Tracking number">
            <Input
              value={shipping.awb_number}
              onChange={(e) => setShipping({ ...shipping, awb_number: e.target.value })}
              placeholder="Enter real AWB when available"
            />
          </Field>
          <Field label="Package weight">
            <Input
              value={shipping.package_weight}
              onChange={(e) => setShipping({ ...shipping, package_weight: e.target.value })}
              placeholder="e.g. 0.5 kg"
            />
          </Field>
          <Field label="Package count">
            <Input
              type="number"
              min={1}
              value={shipping.package_count}
              onChange={(e) =>
                setShipping({ ...shipping, package_count: Number(e.target.value) || 1 })
              }
            />
          </Field>
          <Field label="Shipping method">
            <Input
              value={shipping.shipping_method}
              onChange={(e) => setShipping({ ...shipping, shipping_method: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Shipping notes">
              <Textarea
                value={shipping.shipping_notes}
                onChange={(e) => setShipping({ ...shipping, shipping_notes: e.target.value })}
                rows={2}
              />
            </Field>
          </div>
        </div>
        <Button
          className="mt-4 rounded-full"
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              id: orderId,
              courier_partner: shipping.courier_partner,
              awb_number: shipping.awb_number,
              package_weight: shipping.package_weight,
              package_count: shipping.package_count,
              shipping_method: shipping.shipping_method,
              shipping_notes: shipping.shipping_notes,
            })
          }
        >
          Save shipping details
        </Button>
      </AdminPanel>
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

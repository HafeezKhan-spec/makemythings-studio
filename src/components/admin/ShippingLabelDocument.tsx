import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { useEffect, useRef } from "react";

import type { AdminOrderDetail } from "@/lib/order-fulfillment";
import { getBarcodeInfo, paymentTypeLabel } from "@/lib/order-fulfillment";
import { formatDate, orderStatusLabel } from "@/lib/format";

type Props = {
  order: AdminOrderDetail;
  id?: string;
};

export function ShippingLabelDocument({ order, id = "shipping-label-document" }: Props) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const barcode = getBarcodeInfo(order);
  const paymentLabel = paymentTypeLabel(order.payment_type);
  const primaryItem = order.items[0];
  const itemSummary =
    order.items.length === 1
      ? primaryItem?.product_name
      : `${primaryItem?.product_name} +${order.items.length - 1} more`;

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcode.value, {
          format: "CODE128",
          width: 2,
          height: 72,
          displayValue: true,
          fontSize: 14,
          margin: 4,
          background: "#ffffff",
        });
      } catch {
        // Barcode generation can fail for invalid values; label still prints without it.
      }
    }
    if (qrRef.current) {
      void QRCode.toCanvas(qrRef.current, `https://MakeMyThing.in/order/${order.id}`, {
        width: 88,
        margin: 1,
      });
    }
  }, [barcode.value, order.id]);

  const addr = order.shipping_address;

  return (
    <div id={id} className="shipping-label-root mx-auto bg-white text-black">
      <style>{`
        @page { size: 4in 6in; margin: 0.08in; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .shipping-label-root {
            width: 3.84in !important;
            min-height: 5.84in !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid;
          }
          .no-print { display: none !important; }
        }
        .shipping-label-root {
          width: 384px;
          min-height: 576px;
          padding: 10px;
          border: 2px solid #111;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          line-height: 1.25;
          box-sizing: border-box;
        }
      `}</style>

      <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500 text-sm font-black text-white">
              M
            </div>
            <div>
              <p className="text-sm font-black tracking-tight">MakeMyThing.in</p>
              <p className="text-[10px] font-semibold">{order.store.business_name}</p>
            </div>
          </div>
          <p className="mt-1 text-[9px]">{order.store.business_phone}</p>
          <p className="text-[9px]">{order.store.business_email}</p>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded px-2 py-1 text-[11px] font-black tracking-wide ${
              paymentLabel === "COD" ? "bg-yellow-300 text-black" : "bg-green-600 text-white"
            }`}
          >
            {paymentLabel}
          </span>
          <p className="mt-1 text-[9px] font-bold uppercase">{orderStatusLabel(order.status)}</p>
        </div>
      </div>

      <div className="mt-2 border border-black p-2">
        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600">From</p>
        <p className="text-[10px] font-semibold">{order.store.business_name}</p>
        <p className="text-[9px]">{order.store.business_address}</p>
      </div>

      <div className="mt-2 border-2 border-black bg-gray-50 p-2">
        <p className="text-[10px] font-black uppercase tracking-wider">Ship To</p>
        <p className="mt-1 text-lg font-black leading-tight">{addr.full_name}</p>
        <p className="text-sm font-bold">{addr.phone}</p>
        <p className="mt-1 text-[11px] font-semibold leading-snug">
          {addr.house}
          {addr.street ? `, ${addr.street}` : ""}
          {addr.area ? `, ${addr.area}` : ""}
        </p>
        {addr.landmark ? <p className="text-[10px]">Landmark: {addr.landmark}</p> : null}
        <p className="text-[11px] font-semibold">
          {addr.city}, {addr.state}
        </p>
        <p className="text-[11px]">{addr.country}</p>
        <p className="mt-1 text-2xl font-black tracking-wider">{addr.pincode}</p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[9px]">
        <div>
          <p>
            <span className="font-bold">Order:</span> {order.order_number}
          </p>
          <p>
            <span className="font-bold">Date:</span> {formatDate(order.created_at)}
          </p>
          <p>
            <span className="font-bold">Item:</span> {itemSummary}
          </p>
          {primaryItem?.sku ? (
            <p>
              <span className="font-bold">SKU:</span> {primaryItem.sku}
            </p>
          ) : null}
          <p>
            <span className="font-bold">Qty:</span>{" "}
            {order.items.reduce((s, i) => s + i.quantity, 0)}
          </p>
        </div>
        <div>
          <p>
            <span className="font-bold">Pkgs:</span> {order.package_count}
          </p>
          <p>
            <span className="font-bold">Method:</span> {order.shipping_method || "Standard"}
          </p>
          {order.courier_partner ? (
            <p>
              <span className="font-bold">Courier:</span> {order.courier_partner}
            </p>
          ) : null}
          {order.awb_number ? (
            <p>
              <span className="font-bold">AWB:</span> {order.awb_number}
            </p>
          ) : null}
          {order.package_weight ? (
            <p>
              <span className="font-bold">Wt:</span> {order.package_weight}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[8px] font-bold uppercase text-gray-600">{barcode.caption}</p>
          <svg ref={barcodeRef} className="w-full max-w-[260px]" />
        </div>
        <div className="shrink-0 text-center">
          <canvas ref={qrRef} className="h-[88px] w-[88px]" />
          <p className="text-[7px] text-gray-500">Scan for order</p>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <span className="rounded border border-black px-2 py-0.5 text-[9px] font-bold uppercase">
          Handle With Care
        </span>
        <span className="rounded border border-black px-2 py-0.5 text-[9px] font-bold uppercase">
          3D Printed
        </span>
      </div>
    </div>
  );
}

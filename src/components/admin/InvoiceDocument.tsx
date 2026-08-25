import type { AdminOrderDetail } from "@/lib/order-fulfillment";
import { paymentTypeLabel } from "@/lib/order-fulfillment";
import { formatDate, inr, orderStatusLabel } from "@/lib/format";

type Props = {
  order: AdminOrderDetail;
  id?: string;
};

export function InvoiceDocument({ order, id = "invoice-document" }: Props) {
  const addr = order.shipping_address;
  const grandTotal = order.total;

  return (
    <div id={id} className="invoice-root mx-auto bg-white text-black">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .invoice-root {
            width: auto !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
        .invoice-root {
          width: 794px;
          max-width: 100%;
          padding: 32px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          line-height: 1.45;
          box-sizing: border-box;
        }
        .invoice-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .invoice-table th, .invoice-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .invoice-table th { background: #f5f5f5; font-size: 11px; text-transform: uppercase; }
      `}</style>

      <div className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-lg font-black text-white">
              M
            </div>
            <div>
              <h1 className="text-xl font-black">MakeMyThing.in</h1>
              <p className="text-sm font-semibold">{order.store.business_name}</p>
            </div>
          </div>
          <p className="mt-2 text-sm">{order.store.business_address}</p>
          <p className="text-sm">{order.store.business_email}</p>
          <p className="text-sm">{order.store.business_phone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase tracking-wide">Tax Invoice</h2>
          <p className="mt-2">
            <span className="font-bold">Invoice No:</span> {order.invoice_number}
          </p>
          <p>
            <span className="font-bold">Order ID:</span> {order.order_number}
          </p>
          <p>
            <span className="font-bold">Date:</span> {formatDate(order.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-bold uppercase text-gray-500">Bill To / Ship To</p>
          <p className="mt-1 font-bold">{order.customer_name}</p>
          <p>{order.customer_email}</p>
          <p>{order.customer_phone}</p>
          <p className="mt-2">
            {addr.house}
            {addr.street ? `, ${addr.street}` : ""}
            {addr.area ? `, ${addr.area}` : ""}
            <br />
            {addr.city}, {addr.state} {addr.pincode}
            <br />
            {addr.country}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-gray-500">Payment</p>
          <p className="mt-1">
            <span className="font-bold">Method:</span> {paymentTypeLabel(order.payment_type)} / Razorpay
          </p>
          <p>
            <span className="font-bold">Status:</span> {orderStatusLabel(order.payment_status)}
          </p>
          {order.payment_reference ? (
            <p>
              <span className="font-bold">Payment ID:</span> {order.payment_reference}
            </p>
          ) : null}
          {order.razorpay_order_id ? (
            <p>
              <span className="font-bold">Razorpay Order:</span> {order.razorpay_order_id}
            </p>
          ) : null}
        </div>
      </div>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.product_name}</td>
              <td>{item.sku ?? "—"}</td>
              <td>{item.quantity}</td>
              <td>{inr(item.unit_price)}</td>
              <td>{inr(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{inr(order.subtotal)}</span>
          </div>
          {order.discount > 0 ? (
            <div className="flex justify-between text-green-700">
              <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
              <span>− {inr(order.discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{order.delivery_charge > 0 ? inr(order.delivery_charge) : "Free"}</span>
          </div>
          {order.gst_percent > 0 ? (
            <div className="flex justify-between">
              <span>GST ({order.gst_percent}%)</span>
              <span>{inr(order.gst_amount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t-2 border-black pt-2 text-base font-black">
            <span>Grand Total</span>
            <span>{inr(grandTotal)}</span>
          </div>
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-gray-500">
        This is a computer-generated invoice from MakeMyThing.in. Thank you for your purchase.
      </p>
    </div>
  );
}

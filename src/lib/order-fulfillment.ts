export type AdminOrderDetail = {
  id: string;
  order_number: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: {
    full_name: string;
    phone: string;
    house: string;
    street?: string;
    area?: string;
    landmark?: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  items: {
    id: string;
    product_id: string | null;
    product_name: string;
    product_image: string | null;
    sku: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
  }[];
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  delivery_charge: number;
  gst_percent: number;
  gst_amount: number;
  total: number;
  payment_status: string;
  payment_type: string;
  payment_provider: string | null;
  payment_reference: string | null;
  razorpay_order_id: string | null;
  status: string;
  courier_partner: string;
  awb_number: string;
  package_weight: string;
  package_count: number;
  shipping_method: string;
  shipping_notes: string;
  admin_acknowledged: boolean;
  is_new: boolean;
  created_at: string | null;
  notes: string;
  store: {
    business_name: string;
    business_email: string;
    business_phone: string;
    business_address: string;
  };
};

export function getBarcodeInfo(order: { awb_number?: string; order_number: string }) {
  const awb = order.awb_number?.trim();
  if (awb) {
    return { value: awb, caption: "AWB / Tracking No.", isCourier: true as const };
  }
  return {
    value: order.order_number,
    caption: "Order ID (internal — not courier AWB)",
    isCourier: false as const,
  };
}

export function paymentTypeLabel(type: string): string {
  return type === "cod" ? "COD" : "PREPAID";
}

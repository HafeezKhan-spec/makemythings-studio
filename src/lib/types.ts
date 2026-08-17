export type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price: number;
  original_price: number | null;
  category_id: string | null;
  images: string[];
  stock: number;
  material: string | null;
  colors: string[];
  size: string | null;
  production_time: string | null;
  tags: string[];
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_trending: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  created_at: string;
  category?: { name: string; slug: string } | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

export type Banner = {
  id: string;
  heading: string;
  description: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_link: string | null;
};

export type StoreSettings = {
  business_name: string;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
  currency: string;
  india_delivery_charge: number;
  free_delivery_threshold: number | null;
  express_delivery_charge: number;
  international_shipping_enabled: boolean;
  gst_percent: number;
};

export type OrderSummary = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  delivery_charge: number;
  total: number;
  payment_status: string;
  status: string;
  estimated_delivery: string | null;
  created_at: string;
  items: {
    id: string;
    product_name: string;
    product_image: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
  }[];
};

export type ShippingAddress = {
  full_name: string;
  phone: string;
  house: string;
  street?: string;
  area?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  originalPrice: number | null;
  quantity: number;
};

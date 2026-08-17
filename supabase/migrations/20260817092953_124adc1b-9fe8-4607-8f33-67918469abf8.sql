-- ===== helpers =====
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- ===== roles =====
CREATE TYPE public.app_role AS ENUM ('admin','customer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== catalog =====
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active categories" ON public.categories FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(10,2),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  stock INTEGER NOT NULL DEFAULT 0,
  material TEXT,
  colors TEXT[] NOT NULL DEFAULT '{}',
  size TEXT,
  production_time TEXT,
  specifications JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_trending BOOLEAN NOT NULL DEFAULT false,
  is_best_seller BOOLEAN NOT NULL DEFAULT false,
  is_new_arrival BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active products" ON public.products FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX products_category_idx ON public.products(category_id);

-- ===== banners =====
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heading TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_link TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active banners" ON public.banners FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage banners" ON public.banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== store settings =====
CREATE TABLE public.store_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'MakeMyThings.in',
  business_email TEXT,
  business_phone TEXT,
  business_address TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  whatsapp_number TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  india_delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 80,
  free_delivery_threshold NUMERIC(10,2),
  express_delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 199,
  international_shipping_enabled BOOLEAN NOT NULL DEFAULT false,
  gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins update settings" ON public.store_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== coupons =====
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(10,2),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.validate_coupon(_code TEXT, _subtotal NUMERIC)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.coupons; d NUMERIC;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(trim(_code)) AND is_active LIMIT 1;
  IF c.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'message', 'Invalid coupon code'); END IF;
  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN RETURN jsonb_build_object('valid', false, 'message', 'This coupon is not active yet'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN jsonb_build_object('valid', false, 'message', 'This coupon has expired'); END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN RETURN jsonb_build_object('valid', false, 'message', 'This coupon has reached its usage limit'); END IF;
  IF _subtotal < c.min_order_value THEN RETURN jsonb_build_object('valid', false, 'message', 'Minimum order value of ' || c.min_order_value || ' required'); END IF;
  IF c.discount_type = 'percentage' THEN d := round(_subtotal * c.discount_value / 100, 2);
  ELSE d := c.discount_value; END IF;
  IF c.max_discount IS NOT NULL AND d > c.max_discount THEN d := c.max_discount; END IF;
  IF d > _subtotal THEN d := _subtotal; END IF;
  RETURN jsonb_build_object('valid', true, 'code', c.code, 'discount', d, 'description', c.description);
END; $$;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, NUMERIC) TO anon, authenticated;

-- ===== addresses =====
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  house TEXT NOT NULL,
  street TEXT,
  area TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  pincode TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== orders =====
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('MMT' || to_char(now(),'YYMMDD') || lpad((floor(random()*100000))::text, 5, '0')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code TEXT,
  delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_provider TEXT,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  estimated_delivery DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders read" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(10,2) NOT NULL
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order items read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- ===== custom requests =====
CREATE TABLE public.custom_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  description TEXT NOT NULL,
  model_file_url TEXT,
  reference_image_url TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  material TEXT,
  notes TEXT,
  quoted_price NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.custom_requests TO authenticated;
GRANT ALL ON public.custom_requests TO service_role;
ALTER TABLE public.custom_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own requests read" ON public.custom_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage requests" ON public.custom_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER custom_requests_updated BEFORE UPDATE ON public.custom_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== reviews =====
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  image_url TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read approved reviews" ON public.reviews FOR SELECT TO anon, authenticated
  USING (is_approved OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "customers add reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own review update" ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own review delete" ON public.reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ===== wishlists =====
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist" ON public.wishlists FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== seed =====
INSERT INTO public.store_settings (id, business_email, business_phone, business_address, whatsapp_number, free_delivery_threshold)
VALUES (1, 'hello@makemythings.in', '+91 98765 43210', 'Bengaluru, Karnataka, India', '919876543210', 1499);

INSERT INTO public.categories (name, slug, description, image_url, sort_order) VALUES
('Anime & Collectibles','anime-collectibles','Detailed figures of your favourite characters','/images/cat-anime.jpg',1),
('Home Décor','home-decor','Sculptural pieces that lift any room','/images/cat-decor.jpg',2),
('Desk Accessories','desk-accessories','Organise your workspace in style','/images/cat-desk.jpg',3),
('Keychains','keychains','Personalised everyday carry','/images/cat-keychain.jpg',4),
('Miniatures','miniatures','Tabletop and display miniatures','/images/cat-mini.jpg',5),
('Customized Products','customized','Made exactly to your idea','/images/cat-custom.jpg',6),
('Tech Accessories','tech-accessories','Stands, mounts and cable tidies','/images/cat-tech.jpg',7),
('Gifts','gifts','Thoughtful printed gifting','/images/cat-gifts.jpg',8);

INSERT INTO public.products (name, slug, short_description, description, price, original_price, category_id, images, stock, material, colors, size, production_time, tags, rating, review_count, is_featured, is_trending, is_best_seller, is_new_arrival)
VALUES
('Anime Character Statue','anime-character-statue','Hand-finished 20cm collector statue','A highly detailed 20cm anime character statue printed in resin-grade PLA+ and hand-finished with a matte topcoat. Ships with a weighted display base.',1999,2499,(SELECT id FROM public.categories WHERE slug='anime-collectibles'),ARRAY['/images/p-anime-statue.jpg'],12,'PLA+ / Resin finish',ARRAY['Matte White','Full Colour'],'20 cm tall','4-6 days',ARRAY['anime','statue','collectible'],4.8,42,true,true,true,false),
('Mini Dragon Figurine','mini-dragon-figurine','Articulated dragon that actually moves','A print-in-place articulated dragon with a fully flexible spine. Satisfying fidget and a striking shelf piece.',799,999,(SELECT id FROM public.categories WHERE slug='miniatures'),ARRAY['/images/p-dragon.jpg'],40,'PLA',ARRAY['Emerald','Silk Copper','Galaxy Black'],'18 cm long','2-3 days',ARRAY['dragon','articulated','fidget'],4.9,88,true,true,true,false),
('Custom Name Keychain','custom-name-keychain','Your name, your colours','A personalised keychain printed with any name or short text, in your choice of two-tone colours. Includes a steel keyring.',299,499,(SELECT id FROM public.categories WHERE slug='keychains'),ARRAY['/images/p-keychain.jpg'],200,'PETG',ARRAY['Black/Gold','White/Blue','Red/White'],'6 cm','1-2 days',ARRAY['keychain','custom','gift'],4.7,131,true,false,true,false),
('Modular Desk Organizer','desk-organizer','Stackable trays for a tidy desk','A modular desk organiser with pen wells, a card slot and a stackable tray system so you can grow it as you go.',1299,1599,(SELECT id FROM public.categories WHERE slug='desk-accessories'),ARRAY['/images/p-organizer.jpg'],25,'PLA Matte',ARRAY['Graphite','Bone White','Sage'],'22 x 12 x 9 cm','3-4 days',ARRAY['desk','organizer','office'],4.6,37,true,false,false,true),
('Adjustable Phone Stand','phone-stand','Folds flat, holds firm','A foldable phone stand with a soft-touch lip and adjustable viewing angles. Works with cases on.',499,NULL,(SELECT id FROM public.categories WHERE slug='tech-accessories'),ARRAY['/images/p-phone-stand.jpg'],80,'PETG',ARRAY['Black','White','Teal'],'10 x 8 cm folded','1-2 days',ARRAY['phone','stand','tech'],4.5,64,false,true,true,false),
('Custom Lithophane Lamp','custom-lithophane','Your photo, glowing in 3D','Send us a photo and we turn it into a lithophane lamp — invisible until lit, then astonishing. Includes warm LED base.',1499,1999,(SELECT id FROM public.categories WHERE slug='customized'),ARRAY['/images/p-lithophane.jpg'],18,'Translucent PLA',ARRAY['Natural'],'14 x 10 cm panel','4-5 days',ARRAY['lithophane','photo','gift','custom'],5.0,29,true,true,false,true),
('Geometric Planter','geometric-planter','Faceted planter with drip tray','A low-poly faceted planter with a hidden drainage tray. Perfect for succulents and small indoor plants.',699,899,(SELECT id FROM public.categories WHERE slug='home-decor'),ARRAY['/images/p-planter.jpg'],55,'PLA (plant safe liner)',ARRAY['Terracotta','Charcoal','Ivory'],'12 cm diameter','2-3 days',ARRAY['planter','decor','plants'],4.6,51,false,false,true,false),
('Gaming Controller Stand','controller-stand','Dual-controller display stand','A weighted dual-controller stand with a cable channel and headset hook. Keeps the setup showroom clean.',899,1199,(SELECT id FROM public.categories WHERE slug='tech-accessories'),ARRAY['/images/p-controller-stand.jpg'],30,'PLA+',ARRAY['Matte Black','Arctic White'],'24 x 12 cm','2-3 days',ARRAY['gaming','stand','setup'],4.7,45,false,true,false,true),
('Personalized Photo Frame','photo-frame','Names, dates and a printed pattern','A custom photo frame printed with names, a date or a short message around a textured border. Fits 4x6 prints.',599,799,(SELECT id FROM public.categories WHERE slug='gifts'),ARRAY['/images/p-photo-frame.jpg'],45,'PLA Silk',ARRAY['Gold Silk','Rose','Matte Black'],'Fits 4x6 in','2-3 days',ARRAY['frame','gift','custom'],4.4,22,false,false,false,true),
('Miniature Car Model','miniature-car-model','1:24 scale detailed classic','A 1:24 scale classic car model with separate wheels, rolling axles and a fine-layer body finish.',1299,NULL,(SELECT id FROM public.categories WHERE slug='miniatures'),ARRAY['/images/p-car.jpg'],20,'Resin finish PLA+',ARRAY['Racing Red','Midnight Blue'],'19 cm long','3-5 days',ARRAY['car','model','collectible'],4.8,33,true,false,true,false);

INSERT INTO public.banners (heading, description, image_url, cta_label, cta_link, sort_order) VALUES
('Flat 20% off collectibles','Anime statues and articulated figures, freshly printed and hand-finished.','/images/p-anime-statue.jpg','Shop collectibles','/shop?category=anime-collectibles',1),
('Turn your photo into light','Custom lithophane lamps made from any picture you send us.','/images/p-lithophane.jpg','Create yours','/custom-printing',2);

INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_value, max_discount, expires_at, usage_limit) VALUES
('MAKE10','10% off your order','percentage',10,499,500, now() + interval '90 days', 500),
('FLAT200','₹200 off orders above ₹1499','fixed',200,1499,NULL, now() + interval '60 days', 200);
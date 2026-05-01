-- PASAR DIGITAL SUPABASE SCHEMA

-- 1. PROFILES TABLE (Extends Auth Users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'buyer' CHECK (role IN ('buyer', 'vendor', 'admin')),
  bio TEXT,
  balance DECIMAL(12,2) DEFAULT 0.00,
  -- Vendor Registration Fields
  real_name TEXT,
  ktp_number TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_holder TEXT,
  store_name TEXT,
  registration_status TEXT DEFAULT 'none' CHECK (registration_status IN ('none', 'pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  thumbnail_url TEXT,
  download_url TEXT, -- Secure URL or storage path
  is_active BOOLEAN DEFAULT true,
  sales_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES profiles(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method TEXT,
  order_id_external TEXT UNIQUE, -- Pakasir Order ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. LICENSES TABLE
CREATE TABLE IF NOT EXISTS licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  license_key TEXT NOT NULL,
  is_redeemed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TICKETS TABLE (Support System)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. AUTO-PROFILE TRIGGER
-- This function creates a profile automatically whenever a new user signs up in Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, username)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 
    new.raw_user_meta_data->>'avatar_url',
    'buyer', -- Default role, can be updated later
    COALESCE(new.email, 'user_' || substr(new.id::text, 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC FUNCTIONS FOR PAYMENTS
CREATE OR REPLACE FUNCTION increment_balance(user_id UUID, amount DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET balance = balance + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- MIGRATION: ADD VENDOR COLUMNS IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='real_name') THEN
        ALTER TABLE profiles ADD COLUMN real_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='ktp_number') THEN
        ALTER TABLE profiles ADD COLUMN ktp_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bank_name') THEN
        ALTER TABLE profiles ADD COLUMN bank_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bank_account') THEN
        ALTER TABLE profiles ADD COLUMN bank_account TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bank_holder') THEN
        ALTER TABLE profiles ADD COLUMN bank_holder TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='store_name') THEN
        ALTER TABLE profiles ADD COLUMN store_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='registration_status') THEN
        ALTER TABLE profiles ADD COLUMN registration_status TEXT DEFAULT 'none' CHECK (registration_status IN ('none', 'pending', 'approved', 'rejected'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='rejection_reason') THEN
        ALTER TABLE profiles ADD COLUMN rejection_reason TEXT;
    END IF;
    
    -- FORCE ADMIN FOR INITIAL USER (if username matches owner email or first user)
    UPDATE profiles SET role = 'admin', registration_status = 'approved' WHERE id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
    UPDATE profiles SET role = 'admin', registration_status = 'approved' WHERE username = 'veogemini617@gmail.com';
END $$;

CREATE OR REPLACE FUNCTION increment_sales(prod_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET sales_count = sales_count + 1
  WHERE id = prod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ENABLE REALTIME
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    END IF;
END $$;

-- POLICIES (Use DO block to prevent "already exists" errors)
DO $$
BEGIN
    -- CLEANUP OLD POLICIES
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
    DROP POLICY IF EXISTS "Users can insert own profile." ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
    DROP POLICY IF EXISTS "Admins can do everything on profiles." ON profiles;

    -- NEW CLEAR POLICIES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Profile Read Access') THEN
        CREATE POLICY "Profile Read Access" ON profiles FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Profile Insert Access') THEN
        CREATE POLICY "Profile Insert Access" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Profile Update Access') THEN
        CREATE POLICY "Profile Update Access" ON profiles FOR UPDATE USING (auth.uid() = id OR (auth.jwt() ->> 'email' = 'veogemini617@gmail.com'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Full Access') THEN
        CREATE POLICY "Admin Full Access" ON profiles FOR ALL USING (auth.jwt() ->> 'email' = 'veogemini617@gmail.com');
    END IF;

    -- RESTORE PRODUCT POLICIES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Products Read Access') THEN
        CREATE POLICY "Products Read Access" ON products FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors Manage Products') THEN
        CREATE POLICY "Vendors Manage Products" ON products FOR ALL USING (vendor_id = auth.uid() OR (auth.jwt() ->> 'email' = 'veogemini617@gmail.com'));
    END IF;
    
    -- RESTORE ORDER POLICIES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Orders Read Access') THEN
        CREATE POLICY "Orders Read Access" ON orders FOR SELECT USING (buyer_id = auth.uid() OR (auth.jwt() ->> 'email' = 'veogemini617@gmail.com'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Orders Insert Access') THEN
        CREATE POLICY "Orders Insert Access" ON orders FOR INSERT WITH CHECK (buyer_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors Read Orders') THEN
        CREATE POLICY "Vendors Read Orders" ON orders FOR SELECT USING (
          EXISTS (SELECT 1 FROM products WHERE products.id = orders.product_id AND products.vendor_id = auth.uid())
        );
    END IF;
END
$$;


-- 9. WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  bank_info JSONB, -- { "bank": "BCA", "account_number": "...", "account_holder": "..." }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY, -- e.g., 'payment_gateway', 'site_config'
  config JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. STORAGE BUCKETS (Automated creation)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'products' OR bucket_id = 'avatars');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated Upload') THEN
        CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' OR bucket_id = 'avatars');
    END IF;
END $$;

-- INITIAL CONFIG
INSERT INTO system_settings (id, config) 
VALUES 
('site_config', '{"site_name": "Pasar Digital", "platform_fee": 10}'),
('pakasir_config', '{"project": "", "api_key": "", "is_sandbox": true}'),
('midtrans_config', '{"client_key": "", "server_key": "", "is_sandbox": true}')
ON CONFLICT (id) DO NOTHING;

-- ENABLE RLS
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- POLICIES
DO $$
BEGIN
    -- Admin can do anything
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage anything.') THEN
        CREATE POLICY "Admins can manage anything." ON system_settings FOR ALL USING (
          (auth.jwt() ->> 'email' = 'veogemini617@gmail.com')
        );
    END IF;

    -- Public can read site config
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can read system settings.') THEN
        CREATE POLICY "Everyone can read system settings." ON system_settings FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all withdrawals.') THEN
        CREATE POLICY "Admins can manage all withdrawals." ON withdrawals FOR ALL USING (
          (auth.jwt() ->> 'email' = 'veogemini617@gmail.com')
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors can see their own withdrawals.') THEN
        CREATE POLICY "Vendors can see their own withdrawals." ON withdrawals FOR SELECT USING (auth.uid() = vendor_id);
    END IF;
END
$$;

-- 12. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT, -- Lucide icon name
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- POLICIES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can read categories') THEN
        CREATE POLICY "Everyone can read categories" ON categories FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage categories') THEN
        CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (
          (auth.jwt() ->> 'email' = 'veogemini617@gmail.com')
        );
    END IF;
END $$;

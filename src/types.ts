export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'buyer' | 'vendor' | 'admin';
  bio: string | null;
  balance: number;
  real_name?: string | null;
  ktp_number?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  store_name?: string | null;
  registration_status?: 'none' | 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  address?: string | null;
  whatsapp?: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  vendor_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  thumbnail_url: string;
  download_url: string;
  is_active: boolean;
  sales_count: number;
  metadata?: any;
  avg_rating?: number;
  review_count?: number;
  created_at: string;
  vendor?: Profile;
};

export type Order = {
  id: string;
  buyer_id: string;
  product_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: string;
  order_id_external: string;
  created_at: string;
  product?: Product;
};

export type License = {
  id: string;
  order_id: string;
  license_key: string;
  is_redeemed: boolean;
  created_at: string;
};

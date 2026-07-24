export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  sku: string;
  stockQuantity: number;
  categoryId: string;
  category?: string;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
  variants?: { name: string; options: string[] }[];
  customFields?: { name: string; value: string }[];
  taxName?: string;
  taxPercentage?: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface StoreConfig {
  storeName: string;
  logo?: string;
  phoneNumber: string;
  currency: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  email?: string;
  description?: string;
  copyrightText?: string;
  welcomeMessage?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
    email?: string;
  };
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

export interface Store {
  id: string | number;
  name: string;
  slug: string;
  email?: string;
  logo?: string;
  description?: string;
  theme?: string;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export interface CustomerAddress {
  id: string;
  type: 'billing' | 'shipping';
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  is_default: boolean;
}

export interface BaseThemeProps {
  config: StoreConfig;
  categories: Category[];
  products: Product[];
  store?: Store;
  isLoggedIn?: boolean;
  customer?: Customer | null;
  customer_address?: CustomerAddress[];
  showResetModal?: boolean;
  resetToken?: string;
  payment_status?: string;
  order_number?: string;
  action?: string | null;
}

export interface ThemeComponent {
  (props: BaseThemeProps): JSX.Element;
}
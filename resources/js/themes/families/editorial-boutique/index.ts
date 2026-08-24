import { registerFamily } from '@/themes/registry';
import { Header } from './Header';
import { Hero } from './Hero';
import { Categories } from './Categories';
import { ProductsByCategory } from './ProductsByCategory';
import { Footer } from './Footer';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { Profile } from './pages/Profile';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { Wishlist } from './pages/Wishlist';
import { Search } from './pages/Search';

registerFamily({
  key: 'editorial-boutique',
  name: 'بوتيك تحريري',
  sections: {
    header: Header,
    hero: Hero,
    categories: Categories,
    products_by_category: ProductsByCategory,
    footer: Footer,
  },
  pages: {
    product_detail: ProductDetail,
    cart: Cart,
    checkout: Checkout,
    order_success: OrderSuccess,
    profile: Profile,
    orders: Orders,
    order_detail: OrderDetail,
    wishlist: Wishlist,
    search: Search,
  },
});

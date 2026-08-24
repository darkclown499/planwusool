import { registerFamily } from '@/themes/registry';
import { Header } from './Header';
import { Hero } from './Hero';
import { Categories } from './Categories';
import { ProductsByCategory } from './ProductsByCategory';
import { Footer } from './Footer';

registerFamily({
  key: 'modern-minimal',
  name: 'مودرن مينيمال',
  sections: {
    header: Header,
    hero: Hero,
    categories: Categories,
    products_by_category: ProductsByCategory,
    footer: Footer,
  },
});

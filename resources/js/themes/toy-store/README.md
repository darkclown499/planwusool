# Toy Store Theme

A vibrant, child-friendly e-commerce theme designed specifically for toy stores built with React and TypeScript.

## Features

- **Child-Friendly Design** - Bright, colorful interface with playful elements
- **Complete E-commerce System** - Full shopping cart, checkout, and order management
- **Multi-step Checkout** - Customer info, order review, payment methods
- **Payment Gateways** - COD, Bank Transfer, Stripe, PayPal support
- **User Authentication** - Login, register, profile management
- **Order Management** - Order history, tracking, invoice generation
- **Mobile-first Design** - Responsive layout optimized for all devices
- **Advanced Cart** - Quantity controls, tax calculations, coupons
- **Product Catalog** - Categories, search, detailed product views
- **Shipping System** - Multiple shipping options with cost calculation

## Design Theme

### Color Palette
- **Primary**: Red (#DC2626) - Energetic and attention-grabbing
- **Secondary**: Orange (#FB923C) - Warm and playful
- **Accent**: Yellow (#FBBF24) - Bright and cheerful
- **Background**: Orange-50 (#FFF7ED) - Soft and welcoming
- **Text**: Gray-800 (#1F2937) - Clear and readable

### Typography
- **Headers**: Bold, large fonts for impact
- **Body**: Clean, readable fonts for content
- **Buttons**: Rounded corners with bold text

### Components

#### Core Components
- `ToyStore` - Main theme component
- `Header` - Colorful header with search, cart, user menu
- `HeroSection` - Vibrant welcome section with store branding
- `CategoryTabs` - Rounded category navigation tabs
- `ProductGrid` - Playful product cards with rounded corners
- `Footer` - Informative footer with links

#### Product Cards
- **Rounded Design** - Soft, child-friendly rounded corners
- **Bright Colors** - Eye-catching color scheme
- **Clear Pricing** - Bold price display with discount badges
- **Stock Indicators** - Clear availability status
- **Interactive Elements** - Hover effects and animations

#### Shopping & Checkout
- `CartDrawer` - Slide-out cart with colorful design
- `Checkout` - Complete 3-step checkout system
- Product detail modal with image gallery

#### Authentication & Account
- `AuthModal` - Login/Guest choice modal
- `LoginModal` - Login, register, forgot password
- `ProfileModal` - User profile management

#### Order Management
- `MyOrdersModal` - Order history with status
- `OrderDetailsModal` - Detailed order view with invoice

## Usage

```tsx
import { ToyStore } from './themes/toy-store';

const storeConfig = {
  storeName: "Happy Toys Store",
  phoneNumber: "+1234567890",
  currency: "$",
  logo: "/logo.png"
};

<ToyStore
  config={storeConfig}
  categories={categories}
  products={products}
/>
```

## Configuration

### Store Config
- `storeName` - Display name of the toy store
- `logo` - Optional logo URL
- `phoneNumber` - Contact number
- `currency` - Currency symbol ($, €, ₹, etc.)

### Product Structure
```tsx
interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  sku: string;
  stockQuantity: number;
  categoryId: string;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
}
```

## Key Features

### Responsive Design
- **Mobile-first approach** - Optimized for mobile shopping
- **Touch-friendly controls** - Large buttons and easy navigation
- **Responsive grid** - Adapts to all screen sizes
- **Mobile cart drawer** - Smooth slide-out cart

### Child-Friendly Interface
- **Bright colors** - Engaging red, orange, and yellow palette
- **Rounded corners** - Soft, safe-feeling design elements
- **Large buttons** - Easy to tap and interact with
- **Clear typography** - Easy to read product names and prices

### Shopping Experience
- **Visual product cards** - Large images with clear pricing
- **Quick add to cart** - One-click shopping
- **Stock indicators** - Clear availability status
- **Discount badges** - Prominent sale indicators

## Scalability

The theme is designed to be easily customizable:
- Add new product categories
- Customize color schemes
- Add new payment gateways
- Integrate with backend APIs
- Support multiple currencies and languages

## Demo

Visit `/toy-store-demo` to see the theme in action with sample toy products and categories.

## Target Audience

Perfect for:
- Toy stores and retailers
- Children's product stores
- Educational toy shops
- Game and puzzle stores
- Baby and toddler product stores
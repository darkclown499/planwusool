# Gadgets Store Theme

A modern, feature-rich e-commerce theme for gadgets and electronics stores built with React and TypeScript.

## Features

- **Complete E-commerce System** - Full shopping cart, checkout, and order management
- **Multi-step Checkout** - Customer info, order review, payment methods
- **Payment Gateways** - COD, Bank Transfer, Stripe, PayPal support
- **User Authentication** - Login, register, profile management
- **Order Management** - Order history, tracking, invoice generation
- **Mobile-first Design** - Responsive layout optimized for all devices
- **Advanced Cart** - Quantity controls, tax calculations, coupons
- **Product Catalog** - Categories, search, detailed product views
- **Shipping System** - Multiple shipping options with cost calculation

## Components

### Core Components
- `GadgetsStore` - Main theme component
- `Header` - Store header with search, cart, user menu
- `CategoryTabs` - Category navigation with smooth scrolling
- `ProductCard` - Product display with SKU, pricing, add to cart
- `ProductList` - Product grid container
- `Footer` - Store footer with links

### Authentication
- `AuthModal` - Login/Guest choice modal
- `LoginModal` - Login, register, forgot password
- `ProfileModal` - User profile management

### Shopping & Checkout
- `Checkout` - Complete 3-step checkout system
- Cart drawer with quantity controls
- Product detail modal with image gallery

### Order Management
- `MyOrdersModal` - Order history with status
- `OrderDetailsModal` - Detailed order view with invoice

## Usage

```tsx
import { GadgetsStore } from './themes/gadgets-store';

const storeConfig = {
  storeName: "TechHub Electronics",
  phoneNumber: "+1234567890",
  currency: "$",
  logo: "/logo.png"
};

<GadgetsStore
  config={storeConfig}
  categories={categories}
  products={products}
/>
```

## Configuration

### Store Config
- `storeName` - Display name of the store
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
  taxName?: string;
  taxPercentage?: number;
  description?: string;
  variants?: { name: string; options: string[] }[];
  customFields?: { name: string; value: string }[];
}
```

## Key Features

### Checkout System
- 3-step process: Information → Review → Payment
- Form validation with real-time feedback
- Multiple payment methods with inline forms
- Coupon system with discount calculation
- Dynamic shipping options based on location
- Tax calculations per item

### Mobile Optimization
- Bottom sheet modals on mobile
- Touch-friendly controls
- Responsive design patterns
- Optimized for mobile commerce

### Payment Methods
- Cash on Delivery
- Bank Transfer with receipt upload
- Credit/Debit Cards (Stripe)
- PayPal integration
- Extensible for 40+ payment gateways

### Order Management
- Order history with status tracking
- Detailed invoice generation
- Order status updates
- Customer profile management

## Scalability

The theme is designed to be easily extensible:
- Add new payment gateways
- Customize checkout steps
- Add new product fields
- Integrate with backend APIs
- Support multiple currencies and languages

## Demo

Visit `/gadgets-demo` to see the theme in action with sample gadgets and electronics products.
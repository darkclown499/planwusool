# Theme Architecture

This document explains the refactored theme architecture that separates business logic from UI components using React contexts.

## Architecture Overview

The theme system is now built with separation of concerns in mind:

- **Contexts**: Manage business logic and state
- **Components**: Handle UI rendering only
- **Themes**: Compose contexts and components together
- **Factory**: Manage theme registration and loading

## Context Structure

### Core Contexts

1. **StoreContext** - Store configuration and settings
2. **AuthContext** - User authentication and profile management
3. **CartContext** - Shopping cart operations and state
4. **ProductContext** - Product catalog and search functionality
5. **OrderContext** - Order history and order-related operations
6. **UIContext** - UI state management (modals, overlays)

### ThemeProvider

The `ThemeProvider` wraps all contexts together and provides them to theme components:

```tsx
<ThemeProvider {...props}>
  <YourThemeComponent />
</ThemeProvider>
```

## Creating a New Theme

### 1. Create Theme Directory

```
themes/your-theme/
├── YourTheme.tsx           # Main theme component
├── components/             # Theme-specific components
│   ├── Header.tsx
│   ├── ProductCard.tsx
│   └── index.ts
├── index.ts               # Theme exports
└── README.md             # Theme documentation
```

### 2. Implement Theme Component

```tsx
// themes/your-theme/YourTheme.tsx
import React from 'react';
import { ThemeProvider } from '../../contexts/ThemeProvider';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
// ... other hooks

const YourThemeContent: React.FC = () => {
  const { config, store } = useStore();
  const { isLoggedIn, userProfile } = useAuth();
  const { cartItems, addToCart } = useCart();
  // ... use other contexts

  return (
    <div>
      {/* Your theme UI */}
    </div>
  );
};

export const YourTheme: React.FC<BaseThemeProps> = (props) => {
  return (
    <ThemeProvider {...props}>
      <YourThemeContent />
    </ThemeProvider>
  );
};
```

### 3. Register Theme

```tsx
// utils/themeFactory.ts
import { YourTheme } from '../themes/your-theme';

const themes: Record<string, ThemeComponent> = {
  gadgets: GadgetsStore,
  yourtheme: YourTheme, // Add your theme here
};
```

### 4. Create Page Component

```tsx
// pages/store/your-theme.tsx
import React from 'react';
import { Head } from '@inertiajs/react';
import { YourTheme } from '../../themes/your-theme';
import { BaseThemeProps } from '../../types/theme';

const YourThemePage: React.FC<BaseThemeProps> = (props) => {
  return (
    <>
      <Head title="Your Theme Store" />
      <YourTheme {...props} />
    </>
  );
};

export default YourThemePage;
```

## Available Contexts and Hooks

### StoreContext
```tsx
const { config, store } = useStore();
```
- `config`: Store configuration (name, logo, currency, etc.)
- `store`: Store data (id, slug, theme, etc.)

### AuthContext
```tsx
const { 
  isLoggedIn, 
  customer, 
  userProfile,
  showLoginModal,
  setShowLoginModal,
  logout 
} = useAuth();
```

### CartContext
```tsx
const { 
  cartItems, 
  cartLoading,
  addToCart, 
  removeFromCart, 
  updateQuantity,
  loadCart 
} = useCart();
```

### ProductContext
```tsx
const { 
  products, 
  categories,
  filteredProducts,
  selectedProduct,
  handleSearch,
  handleProductClick 
} = useProduct();
```

### OrderContext
```tsx
const { 
  userOrders, 
  loadingOrders,
  showOrdersModal,
  loadUserOrders 
} = useOrder();
```

### UIContext
```tsx
const { 
  showCart, 
  showCheckout,
  setShowCart,
  handleCartClick 
} = useUI();
```

## Benefits

1. **Reusable Logic**: Business logic is separated and can be reused across themes
2. **Easy Theme Creation**: New themes only need to focus on UI/UX
3. **Maintainable**: Changes to business logic don't affect theme UI
4. **Testable**: Contexts can be tested independently
5. **Scalable**: Easy to add new features without breaking existing themes

## Migration Guide

To migrate an existing theme:

1. Wrap your theme with `ThemeProvider`
2. Replace direct state management with context hooks
3. Extract reusable components
4. Update imports and exports

## Example: Gadgets Theme

The gadgets theme has been refactored as an example:

- **Original**: `GadgetsStoreTemp.tsx` (1200+ lines with mixed logic)
- **Refactored**: `GadgetsStore.tsx` (clean UI with context hooks)

The refactored version is much cleaner and easier to maintain while preserving all functionality.
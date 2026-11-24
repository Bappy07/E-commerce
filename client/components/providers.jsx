'use client';

import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/use-auth';
import { CartProvider } from '@/hooks/use-cart';
import { WishlistProvider } from '@/hooks/use-wishlist';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

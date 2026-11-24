'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './use-auth';
import { cartService } from '@/services';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], count: 0, subtotal: 0 });

  const refresh = async () => {
    if (!user) return setCart({ items: [], count: 0, subtotal: 0 });
    try { setCart(await cartService.get()); } catch { setCart({ items: [], count: 0, subtotal: 0 }); }
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const add = async (body) => { const result = await cartService.add(body); await refresh(); return result; };
  const remove = async (id) => { await cartService.remove(id); await refresh(); };
  const update = async (id, quantity) => { await cartService.update(id, quantity); await refresh(); };

  const value = useMemo(() => ({ cart, refresh, add, remove, update }), [cart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);

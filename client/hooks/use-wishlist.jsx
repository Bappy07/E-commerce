'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './use-auth';
import { account } from '@/services';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const refresh = async () => {
    if (!user) return setItems([]);
    try { setItems(await account.wishlist()); } catch { setItems([]); }
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const toggle = async (productId) => {
    const result = await account.toggleWishlist(productId);
    await refresh();
    return result;
  };

  const value = useMemo(() => ({ items, refresh, toggle, has: (id) => items.some((item) => String(item.id || item._id) === String(id)) }), [items]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);

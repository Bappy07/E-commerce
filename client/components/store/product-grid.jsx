import { ProductCard } from './product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';

const columnClasses = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' };

export function ProductGrid({ products = [], loading = false, columns = 4 }) {
  const gridClass = `grid grid-cols-2 gap-4 lg:grid-cols-4 ${columnClasses[columns] || columnClasses[4]}`;
  if (loading) return (
    <div className={gridClass}>
      {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-[3/4] w-full rounded-xl" />)}
    </div>
  );
  if (!products.length) return <EmptyState title="No products found" description="Try adjusting your filters or search terms." />;
  return (
    <div className={gridClass}>
      {products.map((product, index) => <ProductCard key={product.id || product._id || index} product={product} priority={index < 4} />)}
    </div>
  );
}

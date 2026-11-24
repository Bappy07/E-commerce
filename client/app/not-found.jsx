import { EmptyState } from '@/components/store/empty-state';

export default function NotFound() {
  return <div className="container-marketly py-20"><EmptyState title="Page not found" description="The page you are looking for does not exist." href="/" action="Back to home" /></div>;
}

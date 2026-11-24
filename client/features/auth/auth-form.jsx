'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const schema = z.object({
  name: z.string().min(2, 'Enter your name').optional(),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

export function AuthForm({ mode = 'login' }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === 'register';
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      if (isRegister) await authService.register({ name: values.name, email: values.email, password: values.password });
      else await authService.login({ email: values.email, password: values.password });
      const session = await refresh();
      const role = session?.user?.role;
      toast.success(isRegister ? 'Welcome to MARKETLY' : 'Welcome back');
      router.push(role === 'admin' ? '/dashboard/admin' : role === 'seller' ? '/dashboard/seller' : '/dashboard/buyer');
      router.refresh();
    } catch (error) {
      toast.error(error.message || 'Unable to continue');
    }
  };

  return (
    <div className="mx-auto w-full max-w-md py-14">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm text-muted">{isRegister ? 'Join the marketplace in under a minute.' : 'Sign in to continue shopping and managing your orders.'}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-2xl border border-border bg-card p-6">
        {isRegister && (
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="name">Full name</label>
            <Input id="name" placeholder="Your name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="email">Email</label>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="password">Password</label>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" autoComplete={isRegister ? 'new-password' : 'current-password'} className="pr-10" {...register('password')} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 text-muted hover:text-foreground" aria-label="Toggle password visibility">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">{isSubmitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}</Button>
        <p className="text-center text-sm text-muted">
          {isRegister ? 'Already have an account?' : 'New to MARKETLY?'}{' '}
          <Link href={isRegister ? '/login' : '/register'} className="font-medium text-accent hover:underline">{isRegister ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </form>
      <p className="mt-4 text-center text-xs text-muted">New accounts are buyers. Sellers are approved by an administrator.</p>
    </div>
  );
}

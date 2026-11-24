'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Phone } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try { await api.post('/catalog/contact', form); toast.success('Message sent. We will reply shortly.'); setForm({ name: '', email: '', subject: '', message: '' }); }
    catch (error) { toast.error(error.message); }
    finally { setSending(false); }
  };

  return (
    <div className="container-marketly py-14">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Get in touch</h1>
      <p className="mt-2 text-sm text-muted">Questions about an order, a store or a partnership? We are here to help.</p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium">Name</label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Email</label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium">Subject</label><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Message</label><Textarea required minLength={10} className="min-h-40" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <Button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send message'}</Button>
        </form>
        <aside className="grid h-fit gap-4">
          {[{ icon: Mail, title: 'Email', text: 'hello@marketly.example' }, { icon: Phone, title: 'Phone', text: '+880 1700 000 000' }, { icon: MessageSquare, title: 'Response time', text: 'Within 1–2 business days' }].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-xl border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-accent" />
              <div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-sm text-muted">{text}</p></div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

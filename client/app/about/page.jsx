import Image from 'next/image';
import { BadgeCheck, HeartHandshake, Leaf } from 'lucide-react';

export const metadata = { title: 'About' };

const values = [
  { icon: BadgeCheck, title: 'Verified sellers', text: 'Every store is reviewed by our team before it opens. You can shop with confidence.' },
  { icon: Leaf, title: 'Considered selection', text: 'We favour durable, useful objects over disposable trends.' },
  { icon: HeartHandshake, title: 'Fair by design', text: 'Sellers keep the majority of every sale, with a transparent marketplace commission.' },
];

export default function AboutPage() {
  return (
    <div>
      <section className="border-b border-border bg-card">
        <div className="container-marketly grid items-center gap-12 py-20 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">Our story</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-5xl">A marketplace with a point of view.</h1>
            <p className="mt-6 text-sm leading-7 text-muted">MARKETLY began with a simple idea: online shopping should feel curated, human and trustworthy. We bring independent sellers together in one calm, well-designed place — so discovery feels intentional rather than overwhelming.</p>
          </div>
          <div className="relative h-80 overflow-hidden rounded-2xl bg-secondary">
            <Image src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85" alt="The MARKETLY team" fill sizes="600px" className="object-cover" />
          </div>
        </div>
      </section>
      <section className="container-marketly py-16">
        <h2 className="text-2xl font-semibold">What we believe</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {values.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6">
              <Icon className="h-5 w-5 text-accent" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

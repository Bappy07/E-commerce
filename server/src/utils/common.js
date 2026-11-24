import crypto from 'node:crypto';

export const slugify = (text = '') => String(text)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90);

export const uniqueSlug = async (base, Model) => {
  const root = slugify(base) || 'item';
  let slug = root;
  let suffix = 2;
  while (await Model.exists({ slug })) slug = `${root}-${suffix++}`;
  return slug;
};

export const orderNumber = () => `MKT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

export const escapeText = (value = '') => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]*>/g, '')
  .trim();

export const objectId = (id) => String(id || '');

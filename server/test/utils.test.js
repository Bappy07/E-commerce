import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, orderNumber, escapeText } from '../src/utils/common.js';
import { round2, pagination } from '../src/utils/api.js';
import { commissionFor } from '../src/services/marketplace.js';
import { productSchema, addressSchema, cartItemSchema } from '../src/validators.js';

test('slugify creates clean URLs', () => {
  assert.equal(slugify('  Studio Wireless Headphones! '), 'studio-wireless-headphones');
  assert.equal(slugify('Café & Co.'), 'caf-co');
});

test('order numbers are unique', () => {
  assert.notEqual(orderNumber(), orderNumber());
  assert.match(orderNumber(), /^MKT-/);
});

test('escapeText removes markup', () => {
  assert.equal(escapeText('<script>alert(1)</script>Hello <b>world</b>'), 'Hello world');
});

test('rounding and pagination stay predictable', () => {
  assert.equal(round2(10.005), 10.01);
  assert.deepEqual(pagination({ page: '-4', limit: '999' }), { page: 1, limit: 48, skip: 0 });
  assert.deepEqual(pagination({ page: '3', limit: '10' }), { page: 3, limit: 10, skip: 20 });
});

test('commission is calculated on the server', () => {
  assert.equal(commissionFor(1000, 10), 100);
  assert.equal(commissionFor(999, 7.5), 74.93);
});

test('product validation enforces images and positive price', () => {
  const valid = productSchema.parse({ title: 'Test product', categoryId: 'abc', price: 100, stock: 2, images: [{ url: 'https://example.com/a.jpg' }] });
  assert.equal(valid.variants.length, 0);
  assert.throws(() => productSchema.parse({ title: 'Bad', categoryId: 'abc', price: 0, images: [] }));
});

test('address and cart validation', () => {
  const address = addressSchema.parse({ name: 'Rahim', phone: '01711112222', line1: '12 Green Road', city: 'Dhaka' });
  assert.equal(address.country, 'Bangladesh');
  assert.throws(() => cartItemSchema.parse({ productId: 'abc', quantity: 99 }));
});

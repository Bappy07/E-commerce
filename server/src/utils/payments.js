import crypto from 'node:crypto';
import { round2 } from './api.js';

// These are the only payment gateways the backend understands.
// "mock" is a fully simulated provider for portfolio/demo use — it never moves real money.
export const PAYMENT_GATEWAYS = ['mock', 'cod', 'sslcommerz'];
export const PAYMENT_MODES = ['simulated', 'offline', 'live'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded'];
export const MOCK_METHODS = ['card', 'mobile-banking', 'bank-transfer'];
export const MOCK_OUTCOMES = ['success', 'failure', 'cancel'];
export const CHECKOUT_TTL_MS = 30 * 60 * 1000;

const PREFIX = { mock: 'SIM', cod: 'COD', sslcommerz: 'SSL' };

// The simulated scenario is an *intent*, never a payment status. The backend maps it
// to a status itself so the client can never declare an order "paid".
export const OUTCOME_STATUS = { success: 'paid', failure: 'failed', cancel: 'cancelled' };

export const emptyFinance = () => ({ earnings: 0, available: 0, pending: 0, paidOut: 0, refunds: 0 });

export function newTransactionId(gateway = 'mock') {
  const prefix = PREFIX[gateway] || 'MKT';
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

export function newPayoutReference() {
  return `PO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function newCheckoutToken() {
  return crypto.randomBytes(24).toString('hex');
}

export const gatewayMode = (gateway) => (gateway === 'cod' ? 'offline' : gateway === 'mock' ? 'simulated' : 'simulated');

export const isSimulated = (payment) => String(payment?.mode) === 'simulated';

export const gatewayLabel = (gateway) => ({
  mock: 'Simulated payment',
  cod: 'Cash on delivery',
  sslcommerz: 'SSLCommerz',
}[gateway] || gateway);

export const amountMatches = (order, payment) => round2(order?.total) === round2(payment?.amount);

export function applyEarning(balance, amount) {
  const value = round2(amount);
  return {
    ...emptyFinance(), ...balance,
    earnings: round2((balance?.earnings || 0) + value),
    available: round2((balance?.available || 0) + value),
  };
}

export function applyRefund(balance, amount) {
  const value = round2(amount);
  return {
    ...emptyFinance(), ...balance,
    earnings: round2((balance?.earnings || 0) - value),
    available: round2(Math.max(0, (balance?.available || 0) - value)),
    refunds: round2((balance?.refunds || 0) + value),
  };
}

export function applyPayoutRequest(balance, amount) {
  const value = round2(amount);
  return {
    ...emptyFinance(), ...balance,
    available: round2((balance?.available || 0) - value),
    pending: round2((balance?.pending || 0) + value),
  };
}

export function applyPayoutComplete(balance, amount) {
  const value = round2(amount);
  return {
    ...emptyFinance(), ...balance,
    pending: round2((balance?.pending || 0) - value),
    paidOut: round2((balance?.paidOut || 0) + value),
  };
}

export function applyPayoutCancel(balance, amount) {
  const value = round2(amount);
  return {
    ...emptyFinance(), ...balance,
    pending: round2((balance?.pending || 0) - value),
    available: round2((balance?.available || 0) + value),
  };
}

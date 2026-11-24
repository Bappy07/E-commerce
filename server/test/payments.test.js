import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OUTCOME_STATUS, PAYMENT_GATEWAYS, PAYMENT_MODES, MOCK_OUTCOMES,
  amountMatches, applyEarning, applyPayoutCancel, applyPayoutComplete,
  applyPayoutRequest, applyRefund, emptyFinance, gatewayLabel, gatewayMode,
  newCheckoutToken, newPayoutReference, newTransactionId,
} from '../src/utils/payments.js';

test('transaction ids are unique and clearly labelled', () => {
  const ids = new Set(Array.from({ length: 100 }, () => newTransactionId('mock')));
  assert.equal(ids.size, 100);
  assert.match(newTransactionId('mock'), /^SIM-/);
  assert.match(newTransactionId('cod'), /^COD-/);
  assert.match(newTransactionId('sslcommerz'), /^SSL-/);
  assert.match(newPayoutReference(), /^PO-/);
  assert.notEqual(newCheckoutToken(), newCheckoutToken());
});

test('simulated outcomes never become a status without the backend', () => {
  assert.deepEqual(OUTCOME_STATUS, { success: 'paid', failure: 'failed', cancel: 'cancelled' });
  assert.deepEqual(MOCK_OUTCOMES, Object.keys(OUTCOME_STATUS));
  assert.deepEqual(PAYMENT_GATEWAYS, ['mock', 'cod', 'sslcommerz']);
  assert.deepEqual(PAYMENT_MODES, ['simulated', 'offline', 'live']);
  assert.equal(gatewayMode('cod'), 'offline');
  assert.equal(gatewayMode('mock'), 'simulated');
  assert.equal(gatewayLabel('mock'), 'Simulated payment');
});

test('order totals must match before settlement', () => {
  assert.equal(amountMatches({ total: 1250.5 }, { amount: 1250.5 }), true);
  assert.equal(amountMatches({ total: 1250.5 }, { amount: 999 }), false);
});

test('seller finance ledger math is consistent', () => {
  let balance = emptyFinance();
  balance = applyEarning(balance, 1000);
  assert.deepEqual(balance, { earnings: 1000, available: 1000, pending: 0, paidOut: 0, refunds: 0 });

  balance = applyPayoutRequest(balance, 400);
  assert.equal(balance.available, 600);
  assert.equal(balance.pending, 400);

  balance = applyPayoutComplete(balance, 400);
  assert.equal(balance.pending, 0);
  assert.equal(balance.paidOut, 400);

  balance = applyEarning(balance, 200);
  balance = applyRefund(balance, 100);
  assert.equal(balance.earnings, 1100);
  assert.equal(balance.available, 700);
  assert.equal(balance.refunds, 100);

  const cancelled = applyPayoutCancel(emptyFinance(), 50);
  assert.equal(cancelled.available, 50);
  assert.equal(cancelled.pending, -50);
});

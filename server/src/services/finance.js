import { Payout } from '../models/payout.js';
import { SellerProfile } from '../models/seller-profile.js';
import { Payment } from '../models/payment.js';
import { Order } from '../models/order.js';
import { runInTransaction } from '../config/db.js';
import { ApiError, pagination, round2 } from '../utils/api.js';
import { notify } from './marketplace.js';
import { emptyFinance, newPayoutReference } from '../utils/payments.js';

const sum = (rows, field) => round2(rows.reduce((total, row) => total + Number(row[field] || 0), 0));
const grouped = (rows) => Object.fromEntries(rows.map((row) => [row._id || 'unknown', row]));

export function financeView(store) {
  const finance = { ...emptyFinance(), ...(store?.finance?.toObject?.() || store?.finance || {}) };
  return {
    sellerId: store?._id ? String(store._id) : '',
    storeName: store?.storeName || '',
    finance: {
      ...finance,
      // available minus pending is already excluded from available at request time.
      withdrawable: round2(finance.available),
    },
  };
}

export async function sellerFinance(sellerId) {
  const store = await SellerProfile.findById(sellerId).lean();
  if (!store) throw new ApiError(404, 'Seller store not found');
  const [payouts, paidPayouts] = await Promise.all([
    Payout.find({ sellerId }).sort({ createdAt: -1 }).limit(50).lean(),
    Payout.aggregate([
      { $match: { sellerId: store._id } },
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);
  const byStatus = grouped(paidPayouts);
  return {
    ...financeView(store),
    payouts: {
      pending: round2(byStatus.pending?.total || 0),
      completed: round2(byStatus.completed?.total || 0),
      cancelled: round2(byStatus.cancelled?.total || 0),
      count: (byStatus.pending?.count || 0) + (byStatus.completed?.count || 0) + (byStatus.cancelled?.count || 0),
    },
    history: payouts.map(payoutView),
  };
}

export async function listPayouts(query = {}, sellerId = null) {
  const { page, limit, skip } = pagination(query);
  const filter = {};
  if (sellerId) filter.sellerId = sellerId;
  else if (query.sellerId) filter.sellerId = query.sellerId;
  if (['pending', 'completed', 'cancelled'].includes(query.status)) filter.status = query.status;
  const [items, total] = await Promise.all([
    Payout.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payout.countDocuments(filter),
  ]);
  return { data: items.map(payoutView), meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export const payoutView = (payout) => ({
  id: String(payout._id || payout.id),
  reference: payout.reference,
  sellerId: String(payout.sellerId),
  storeName: payout.storeName || '',
  amount: round2(payout.amount),
  status: payout.status,
  method: payout.method,
  simulated: payout.simulated !== false,
  note: payout.note || '',
  createdBy: payout.createdBy || '',
  createdAt: payout.createdAt,
  processedAt: payout.processedAt || null,
  timeline: payout.timeline || [],
});

export async function marketplaceFinance() {
  const [paymentRows, commissionRows, payoutRows] = await Promise.all([
    Payment.aggregate([
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, commission: { $sum: '$commissionTotal' }, earnings: { $sum: '$sellerEarningTotal' }, revenue: { $sum: '$total' } } },
    ]),
    Payout.aggregate([
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);
  const payments = grouped(paymentRows);
  const payouts = grouped(payoutRows);
  const commission = commissionRows[0] || {};
  return {
    collected: round2(payments.paid?.total || 0),
    refunded: round2(payments.refunded?.total || 0),
    pendingPayments: round2(payments.pending?.total || 0),
    paymentCounts: Object.fromEntries(paymentRows.map((row) => [row._id, row.count])),
    commission: round2(commission.commission || 0),
    sellerEarnings: round2(commission.earnings || 0),
    payouts: {
      pending: round2(payouts.pending?.total || 0),
      completed: round2(payouts.completed?.total || 0),
      cancelled: round2(payouts.cancelled?.total || 0),
    },
    simulatedOnly: true,
  };
}

export async function createPayout({ sellerId, amount, note = '', adminId = '' }) {
  const value = round2(Number(amount));
  if (!Number.isFinite(value) || value <= 0) throw new ApiError(400, 'Payout amount must be positive');
  const store = await SellerProfile.findById(sellerId);
  if (!store) throw new ApiError(404, 'Seller store not found');

  const result = await runInTransaction(async (session) => {
    const fresh = await SellerProfile.findById(sellerId).session(session);
    if (round2(fresh.finance?.available || 0) < value) {
      throw new ApiError(409, `Only ${round2(fresh.finance?.available || 0)} is available for payout`);
    }
    const payout = await Payout.create([{
      sellerId: fresh._id,
      sellerUserId: fresh.userId,
      storeName: fresh.storeName,
      amount: value,
      reference: newPayoutReference(),
      status: 'pending',
      method: 'manual-simulation',
      simulated: true,
      note,
      createdBy: adminId,
      timeline: [{ label: 'Payout requested by admin', by: adminId }],
    }], { session });
    await SellerProfile.updateOne(
      { _id: fresh._id },
      { $inc: { 'finance.available': -value, 'finance.pending': value } },
      { session },
    );
    return payout[0];
  });

  await notify(store.userId, 'Payout requested', `${value} BDT is pending admin confirmation.`, 'payment', '/dashboard/seller/payouts');
  return payoutView(result);
}

export async function updatePayout(id, { status, note = '', adminId = '' }) {
  if (!['completed', 'cancelled'].includes(status)) throw new ApiError(400, 'Invalid payout status');
  const result = await runInTransaction(async (session) => {
    const payout = await Payout.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status, processedAt: new Date(),
          ...(note ? { note } : {}),
        },
        $push: { timeline: { label: `Payout ${status} by admin`, by: adminId } },
      },
      { new: true, session },
    );
    if (!payout) throw new ApiError(409, 'Payout is no longer pending');

    const inc = status === 'completed'
      ? { 'finance.pending': -payout.amount, 'finance.paidOut': payout.amount }
      : { 'finance.pending': -payout.amount, 'finance.available': payout.amount };
    await SellerProfile.updateOne({ _id: payout.sellerId }, { $inc: inc }, { session });
    return payout;
  });
  await notify(result.sellerUserId, `Payout ${status}`, `${round2(result.amount)} BDT`, 'payment', '/dashboard/seller/payouts');
  return payoutView(result);
}

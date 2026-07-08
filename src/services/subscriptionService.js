import api from './api';

/**
 * Subscription service — talks to /api/subscription on the backend.
 *
 * Backend supports a "mock payment" mode when Razorpay keys are absent
 * (see examzone_server/routes/subscription.js). In that mode createOrder
 * returns { isMock: true } and verifyPayment activates the subscription
 * without a real gateway. The mobile paywall uses this end-to-end today;
 * native Razorpay / store IAP is swapped in later (compliance TBD).
 */
export const subscriptionService = {
  // Public — pricing plans (free / monthly / yearly)
  getPlans: async () => {
    const response = await api.get('/subscription/plans');
    return response.data; // { plans: [...] }
  },

  // Create an order for a paid plan ('monthly' | 'yearly')
  createOrder: async (plan) => {
    const response = await api.post('/subscription/create-order', { plan });
    return response.data; // { orderId, amount, currency, isMock }
  },

  // Verify payment + activate subscription.
  // For mock orders, paymentId/signature are optional (backend fills them).
  verifyPayment: async ({ orderId, paymentId, signature, plan, isMock }) => {
    const response = await api.post('/subscription/verify-payment', {
      orderId,
      paymentId,
      signature,
      plan,
      isMock,
    });
    return response.data; // { message, subscription }
  },

  // Past subscriptions / payments
  getHistory: async () => {
    const response = await api.get('/subscription/history');
    return response.data; // { subscriptions: [...] }
  },

  /**
   * Convenience: run the full mock checkout for a plan.
   * Returns the verifyPayment result. Replace the middle step with the
   * native gateway when real payments land.
   */
  purchaseMock: async (plan) => {
    const order = await subscriptionService.createOrder(plan);
    return subscriptionService.verifyPayment({
      orderId: order.orderId,
      plan,
      isMock: order.isMock,
    });
  },
};

export default subscriptionService;

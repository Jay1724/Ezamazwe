// ============================================================================
// FLAGGED DECISION: payment gateway.
//
// The client confirmed paid courses are in scope, but no payment gateway
// credentials/contract exist yet. Rather than guess (Stripe has limited
// direct support for South African merchants; PayFast and Yoco are the
// common ZAR-friendly options — this needs a real decision from the
// client, ideally informed by their existing banking/merchant setup), this
// build ships a MockPaymentProvider that always "succeeds" after a short
// delay, so the enroll -> pay -> access-unlocked flow can be built and
// demoed end-to-end.
//
// `orders.payment_provider` is stored as 'mock' for every order created
// this way, and the RLS policies on `public.orders` (see the migration)
// only allow the client to write order rows when payment_provider = 'mock'
// — a real integration should flip `status` to 'paid' via a server-side
// webhook using the Supabase service role key instead, and that client
// write path should be removed.
//
// To swap in a real provider: implement the PaymentProvider interface
// below (redirect to PayFast/Yoco's hosted checkout, or use their JS SDK),
// verify the transaction server-side (webhook/ITN), then update the order.
// ============================================================================

export interface PaymentResult {
  providerReference: string;
}

export interface PaymentProvider {
  readonly name: string;
  pay(params: { orderId: string; amountCents: number; currency: string }): Promise<PaymentResult>;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async pay(params: { orderId: string; amountCents: number; currency: string }): Promise<PaymentResult> {
    // Simulate a network round-trip to a hosted checkout.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { providerReference: `MOCK-${params.orderId.slice(0, 8)}-${Date.now()}` };
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();

export function formatMoney(amountCents: number, currency: string): string {
  if (amountCents === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

import Xendit from 'xendit-node';

const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY || '',
});

export const { Invoice, PaymentRequest } = xenditClient;
export const xendit = xenditClient;

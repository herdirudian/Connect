export type FeeType = 'fixed' | 'percent' | 'mixed';

export interface PaymentMethodConfig {
  id: string;
  label: string;
  type: FeeType;
  value: number; // Percentage (0.01 = 1%) or Fixed Amount
  fixed?: number; // Extra fixed amount for mixed type
  xenditCodes: string[];
  group: string;
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  // Virtual Accounts
  { id: 'VA', label: 'Virtual Accounts (All Banks)', type: 'fixed', value: 4000, xenditCodes: ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA', 'CIMB', 'BSI'], group: 'Virtual Accounts' },
  
  // Credit Card
  { id: 'CC', label: 'Credit Card (Visa/Master)', type: 'mixed', value: 0.029, fixed: 2000, xenditCodes: ['CREDIT_CARD'], group: 'Cards' },
  
  // E-Wallets
  { id: 'ASTRAPAY', label: 'AstraPay', type: 'percent', value: 0.015, xenditCodes: ['ASTRAPAY'], group: 'E-Wallets' },
  { id: 'JENIUSPAY', label: 'JeniusPay', type: 'percent', value: 0.02, xenditCodes: ['JENIUSPAY'], group: 'E-Wallets' },
  { id: 'OVO', label: 'OVO', type: 'percent', value: 0.0318, xenditCodes: ['OVO'], group: 'E-Wallets' },
  { id: 'SHOPEEPAY', label: 'ShopeePay', type: 'percent', value: 0.04, xenditCodes: ['SHOPEEPAY'], group: 'E-Wallets' },
  { id: 'LINKAJA', label: 'LinkAja', type: 'percent', value: 0.0315, xenditCodes: ['LINKAJA'], group: 'E-Wallets' },
  { id: 'DANA', label: 'DANA', type: 'percent', value: 0.03, xenditCodes: ['DANA'], group: 'E-Wallets' },
  
  // QR Code
  { id: 'QRIS', label: 'QRIS', type: 'percent', value: 0.007, xenditCodes: ['QRIS'], group: 'QR Code' },
  
  // Direct Debit
  { id: 'DD_BRI', label: 'BRI Direct Debit', type: 'percent', value: 0.019, xenditCodes: ['DD_BRI'], group: 'Direct Debit' },
  
  // Retail
  { id: 'ALFAMART', label: 'Alfamart Group', type: 'fixed', value: 5000, xenditCodes: ['ALFAMART'], group: 'Retail' },
  { id: 'INDOMARET', label: 'Indomaret', type: 'fixed', value: 5500, xenditCodes: ['INDOMARET'], group: 'Retail' },
  
  // PayLater
  { id: 'AKULAKU', label: 'Akulaku', type: 'percent', value: 0.017, xenditCodes: ['AKULAKU'], group: 'PayLater' },
  { id: 'ATOME', label: 'Atome', type: 'percent', value: 0.05, xenditCodes: ['ATOME'], group: 'PayLater' },
  { id: 'INDODANA', label: 'Indodana', type: 'percent', value: 0.023, xenditCodes: ['INDODANA'], group: 'PayLater' },
  { id: 'KREDIVO', label: 'Kredivo', type: 'percent', value: 0.023, xenditCodes: ['KREDIVO'], group: 'PayLater' },
  { id: 'UANGME', label: 'UangMe', type: 'percent', value: 0.018, xenditCodes: ['UANGME'], group: 'PayLater' },
];

export function calculateFee(amount: number, methodId: string): number {
  const method = PAYMENT_METHODS.find(m => m.id === methodId);
  if (!method) return 0;
  
  if (method.type === 'fixed') {
    return method.value;
  } else if (method.type === 'percent') {
    return Math.ceil(amount * method.value);
  } else if (method.type === 'mixed') {
    return Math.ceil(amount * method.value) + (method.fixed || 0);
  }
  return 0;
}

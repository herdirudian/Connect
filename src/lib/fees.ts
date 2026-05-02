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
  // Virtual Accounts (Bank Transfer)
  { id: 'BRI_VA', label: 'Bank BRI', type: 'fixed', value: 4000, xenditCodes: ['BRI'], group: 'Virtual Accounts' },
  { id: 'BSI_VA', label: 'Bank BSI', type: 'fixed', value: 4000, xenditCodes: ['BSI'], group: 'Virtual Accounts' },
  { id: 'SAMPOERNA_VA', label: 'Bank Sampoerna', type: 'fixed', value: 4000, xenditCodes: ['OTHER_BANKS'], group: 'Virtual Accounts' },
  { id: 'MANDIRI_VA', label: 'Bank Mandiri', type: 'fixed', value: 4000, xenditCodes: ['MANDIRI'], group: 'Virtual Accounts' },
  { id: 'CIMB_VA', label: 'Bank CIMB Niaga', type: 'fixed', value: 4000, xenditCodes: ['CIMB'], group: 'Virtual Accounts' },
  { id: 'PERMATA_VA', label: 'Permata Bank', type: 'fixed', value: 4000, xenditCodes: ['PERMATA'], group: 'Virtual Accounts' },
  { id: 'BNI_VA', label: 'Bank BNI', type: 'fixed', value: 4000, xenditCodes: ['BNI'], group: 'Virtual Accounts' },
  { id: 'BJB_VA', label: 'Bank BJB', type: 'fixed', value: 4000, xenditCodes: ['OTHER_BANKS'], group: 'Virtual Accounts' },
  { id: 'OTHER_VA', label: 'Other Banks', type: 'fixed', value: 4000, xenditCodes: ['OTHER_BANKS'], group: 'Virtual Accounts' },
  
  // Credit Card
  { id: 'CC', label: 'Credit Card (Visa/Master)', type: 'mixed', value: 0.029, fixed: 2000, xenditCodes: ['CREDIT_CARD'], group: 'Cards' },
  
  // E-Wallets
  { id: 'ASTRAPAY', label: 'AstraPay', type: 'percent', value: 0.015, xenditCodes: ['ASTRAPAY'], group: 'E-Wallets' },
  { id: 'SHOPEEPAY', label: 'Shopee Pay', type: 'percent', value: 0.04, xenditCodes: ['SHOPEEPAY'], group: 'E-Wallets' },
  
  // QR Code
  { id: 'QRIS', label: 'QRIS', type: 'percent', value: 0.007, xenditCodes: ['QRIS'], group: 'QR Code' },
  
  // Retail
  { id: 'INDOMARET', label: 'Indomaret', type: 'fixed', value: 5500, xenditCodes: ['INDOMARET'], group: 'Retail' },
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

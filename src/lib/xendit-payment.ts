import { xendit } from './xendit';

// Define return type interface to avoid deep imports issues
interface PaymentRequestResult {
  id: string;
  status: string;
  paymentMethod: {
    type: string;
    virtualAccount?: {
      channelCode: string;
      channelProperties: {
        virtualAccountNumber?: string;
        expiresAt?: string;
      };
    };
    qrCode?: {
      channelCode: string;
      channelProperties: {
        qrString?: string;
      };
    };
    ewallet?: {
        channelCode: string;
        channelProperties: {
            successReturnUrl?: string;
        };
    };
    overTheCounter?: {
        channelCode: string;
        channelProperties: {
            paymentCode?: string;
        };
    };
  };
  actions?: Array<{
    action: string;
    url?: string;
    qrCode?: string;
  }>;
}

export async function createXenditPaymentRequest(
  bookingId: string,
  amount: number,
  methodId: string,
  user: { id: string; email: string; name: string; phone?: string },
  description: string,
  redirectUrls?: { success: string; failure: string }
): Promise<PaymentRequestResult | null> {
  
  let paymentMethodParams: any = null;
  const successReturnUrl = redirectUrls?.success || 'https://family.thelodgegroup.id/dashboard/bookings?status=success';
  const failureReturnUrl = redirectUrls?.failure || 'https://family.thelodgegroup.id/dashboard/bookings?status=failed';

  // Map methodId to PaymentRequest parameters
  switch (methodId) {
    // Virtual Accounts
    case 'BCA_VA':
    case 'BNI_VA':
    case 'BRI_VA':
    case 'MANDIRI_VA':
    case 'PERMATA_VA':
    case 'CIMB_VA':
    case 'BSI_VA': {
      const bankCode = methodId.replace('_VA', '');
      paymentMethodParams = {
        type: 'VIRTUAL_ACCOUNT',
        reusability: 'ONE_TIME_USE',
        virtualAccount: {
          channelCode: bankCode,
          channelProperties: {
            customerName: user.name.substring(0, 250), // Limit length
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          }
        }
      };
      break;
    }

    // E-Wallets
    case 'OVO':
    case 'DANA':
    case 'LINKAJA':
    case 'SHOPEEPAY':
    case 'ASTRAPAY':
    case 'JENIUSPAY': {
      const ewalletCode = methodId;
      paymentMethodParams = {
        type: 'EWALLET',
        reusability: 'ONE_TIME_USE',
        ewallet: {
          channelCode: ewalletCode,
          channelProperties: {
            successReturnUrl,
            failureReturnUrl,
          }
        }
      };
      // OVO requires mobile number?
      if (ewalletCode === 'OVO' && user.phone) {
         // OVO usually requires phone number for push notification or it's a redirect?
         // Payment Request V2 OVO is usually Push notification (One Time) or Redirect?
         // Let's assume Redirect for standard e-wallets, but OVO is often special.
         // If OVO requires phone, we need to pass it.
         // checking docs... OVO via Payment Request V2 might need mobileNumber in channelProperties
         // But let's try standard first.
         // Actually, for OVO, 'mobileNumber' is often required in channelProperties.
         if (user.phone) {
             paymentMethodParams.ewallet.channelProperties.mobileNumber = user.phone;
         }
      }
      break;
    }

    // QR Code
    case 'QRIS': {
      paymentMethodParams = {
        type: 'QR_CODE',
        reusability: 'ONE_TIME_USE',
        qrCode: {
          channelCode: 'QRIS',
          channelProperties: {
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          }
        }
      };
      break;
    }

    // Retail (Alfamart/Indomaret) - Check if supported by Payment Request
    case 'ALFAMART':
    case 'INDOMARET': {
        paymentMethodParams = {
            type: 'OVER_THE_COUNTER',
            reusability: 'ONE_TIME_USE',
            overTheCounter: {
                channelCode: methodId,
                channelProperties: {
                    customerName: user.name,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                }
            }
        };
        break;
    }

    // Default: Return null to fallback to Invoice API
    default:
      return null;
  }

  if (!paymentMethodParams) return null;

  try {
    const response = await xendit.PaymentRequest.createPaymentRequest({
      data: {
        referenceId: bookingId,
        amount,
        currency: 'IDR',
        paymentMethod: paymentMethodParams,
        description,
        metadata: {
            source: 'family-thelodge',
            bookingId: bookingId
        },
        customer: {
            id: user.id,
            referenceId: user.id,
            type: 'INDIVIDUAL',
            individualDetail: {
                givenNames: user.name,
            },
            email: user.email,
            mobileNumber: user.phone || undefined
        }
      }
    });

    return response as unknown as PaymentRequestResult;
  } catch (error) {
    console.error('Xendit Payment Request Error:', error);
    throw error; // Let the caller handle fallback or error
  }
}

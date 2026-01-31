const XenditPackage = require('xendit-node');
const Xendit = XenditPackage.default || XenditPackage;

async function testXendit() {
  console.log('Testing Xendit Connection...');
  console.log('Secret Key (First 10 chars):', process.env.XENDIT_SECRET_KEY ? process.env.XENDIT_SECRET_KEY.substring(0, 10) + '...' : 'NOT FOUND');

  const xenditClient = new Xendit({
    secretKey: process.env.XENDIT_SECRET_KEY,
  });

  const { Invoice } = xenditClient;

  try {
    const invoice = await Invoice.createInvoice({
      data: {
        externalId: 'test-conn-' + Date.now(),
        amount: 50000,
        payerEmail: 'test@example.com',
        description: 'Test Connection',
        invoiceDuration: 86400,
        currency: 'IDR',
      }
    });
    console.log('SUCCESS! Invoice created.');
    console.log('Invoice URL:', invoice.invoiceUrl);
  } catch (error) {
    console.error('FAILED:', error.message);
    console.error('Full Error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  }
}

testXendit();

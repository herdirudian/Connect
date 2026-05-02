// Script to trigger payment auto-check endpoint
// Run with: node scripts/check-payments.js
// Recommended: run via PM2 every minute:
// pm2 start scripts/check-payments.js --name "check-payments" --cron "*/1 * * * *"
//
// API URL resolution order:
// 1) CHECK_PAYMENTS_URL env (full URL)
// 2) NEXT_PUBLIC_APP_URL + '/api/cron/check-payments'
// 3) http://localhost:3001/api/cron/check-payments (common prod port)
// 4) http://localhost:3000/api/cron/check-payments (fallback)

const baseFromEnv = process.env.CHECK_PAYMENTS_URL || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/check-payments` : '');
const API_URL = baseFromEnv || 'http://localhost:3001/api/cron/check-payments';

async function check() {
  try {
    console.log(`[${new Date().toISOString()}] Checking payments...`);
    const res = await fetch(API_URL);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    console.log('Result:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Error:`, e.message);
  }
}

check();

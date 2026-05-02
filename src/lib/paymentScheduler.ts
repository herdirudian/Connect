const enabled = process.env.PAYMENT_AUTO_CHECK !== 'false';

if (enabled) {
  const g = global as any;
  if (!g.__payment_scheduler) {
    const target =
      process.env.CHECK_PAYMENTS_URL ||
      (process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/check-payments`
        : 'http://localhost:3001/api/cron/check-payments');

    const run = async () => {
      try {
        await fetch(target);
      } catch {}
    };

    setInterval(run, 60_000);
    g.__payment_scheduler = true;
  }
}

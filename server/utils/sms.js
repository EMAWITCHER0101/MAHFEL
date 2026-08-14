const VERIFY_URL = 'https://api.sms.ir/v1/send/verify';

export async function sendOtpSms(mobile, code, name) {
  const API_KEY = process.env.SMSIR_API_KEY || '';
  const TEMPLATE_ID = process.env.SMSIR_TEMPLATE_ID || '';
  if (!API_KEY || !TEMPLATE_ID) {
    console.log(`[SMS-OFF] OTP for ${mobile}: ${code}`);
    return { sent: false, reason: 'no_config' };
  }
  const cleanMobile = String(mobile).replace(/^0/, '');
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        mobile: cleanMobile,
        templateId: Number(TEMPLATE_ID),
        parameters: [
          { name: 'NAME', value: String(name || 'کاربر') },
          { name: 'CODE', value: String(code) },
        ],
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && (data.status === 1 || data.message === ' success')) {
      return { sent: true, data };
    }
    console.error('[SMS-ERROR]', res.status, data);
    return { sent: false, reason: 'api_error', status: res.status, data };
  } catch (err) {
    console.error('[SMS-EXCEPTION]', err.message);
    return { sent: false, reason: 'exception', error: err.message };
  }
}

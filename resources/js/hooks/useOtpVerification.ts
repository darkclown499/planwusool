/**
 * useOtpVerification
 * ------------------
 * HotSMS-backed phone verification for the storefront checkout.
 *
 * The platform sends OTP codes through the configured SMS gateway (HotSMS by
 * default on wusool.ps, Twilio as fallback) via the `SmsService`. These helpers
 * talk to the storefront OTP endpoints (`/otp/send`, `/otp/verify`,
 * `/otp/resend` on the store subdomain) and keep a 60s resend countdown in sync
 * with the backend rate limiter.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/custom-toast';

export interface OtpError {
  field?: string;
  message: string;
}

interface UseOtpVerificationOptions {
  /** Store id used by the backend to resolve the SMS provider settings. */
  storeId?: string | number;
  /** Route names come from Ziggy (validated at build time). Overridable for tests. */
  endpoints?: {
    send?: string;
    verify?: string;
    resend?: string;
  };
}

interface UseOtpVerificationReturn {
  sending: boolean;
  verifying: boolean;
  resendIn: number;
  lastSentTo: string;
  sendOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, code: string) => Promise<boolean>;
  resendOtp: (phone: string) => Promise<boolean>;
}

const COOLDOWN_SECONDS = 60;

function csrfToken(): string {
  return (
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  );
}

export function useOtpVerification(
  options: UseOtpVerificationOptions = {}
): UseOtpVerificationReturn {
  const { storeId } = options;
  // Relative same-origin paths keep the fetch valid on custom domains / custom
  // subdomains where the store subdomain route() URL would be cross-origin.
  const endpoints = {
    send: options.endpoints?.send ?? '/otp/send',
    verify: options.endpoints?.verify ?? '/otp/verify',
    resend: options.endpoints?.resend ?? '/otp/resend',
  };

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [lastSentTo, setLastSentTo] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const startCooldown = useCallback(() => {
    clearTimer();
    setResendIn(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setResendIn((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const sendOtp = useCallback(
    async (phone: string): Promise<boolean> => {
      if (sending) return false;
      setSending(true);
      try {
        const res = await fetch(endpoints.send, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
          },
          body: JSON.stringify({ phone, store_id: storeId }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setLastSentTo(phone);
          startCooldown();
          toast.success(data.message || 'تم إرسال رمز التحقق برسالة نصية');
          return true;
        }
        toast.error(data.message || 'تعذر إرسال رمز التحقق');
        return false;
      } catch (error) {
        console.error('OTP send error:', error);
        toast.error('تعذر إرسال رمز التحقق. حاول مرة أخرى.');
        return false;
      } finally {
        setSending(false);
      }
    },
    [sending, endpoints.send, storeId, startCooldown]
  );

  const verifyOtp = useCallback(
    async (phone: string, code: string): Promise<boolean> => {
      if (verifying || !code) return false;
      setVerifying(true);
      try {
        const res = await fetch(endpoints.verify, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
          },
          body: JSON.stringify({ phone, code, store_id: storeId }),
        });
        const data = await res.json();
        if (res.ok && data.verified) {
          clearTimer();
          setResendIn(0);
          toast.success('تم التحقق من رقمك بنجاح');
          return true;
        }
        toast.error(data.message || 'رمز التحقق غير صحيح');
        return false;
      } catch (error) {
        console.error('OTP verify error:', error);
        toast.error('تعذر التحقق من الرمز. حاول مرة أخرى.');
        return false;
      } finally {
        setVerifying(false);
      }
    },
    [verifying, endpoints.verify, storeId, clearTimer]
  );

  const resendOtp = useCallback(
    async (phone: string): Promise<boolean> => {
      if (resendIn > 0 || sending) return false;
      return sendOtp(phone);
    },
    [resendIn, sending, sendOtp]
  );

  return { sending, verifying, resendIn, lastSentTo, sendOtp, verifyOtp, resendOtp };
}
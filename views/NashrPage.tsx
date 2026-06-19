
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { PublishedBook, Podcast, Comment, User } from '../types';
import { SohaIcon } from '../components/SohaLogo';
import { toPersianDigits } from '../utils/helpers';
import { updateProfile } from '../services/api';
import CartModal, { type CartItem } from '../components/CartModal';
import CheckoutFlow from '../components/CheckoutFlow';
import OrdersPage, { type Order } from './OrdersPage';
import BookReader from '../components/BookReader';

// ─── Wallet Payment Page ──────────────────────────────────────────────────────
const WalletPaymentPage: React.FC<{
  step: 'amount' | 'processing' | 'done';
  amount: string;
  cardNumber: string;
  cvv2: string;
  expMonth: string;
  expYear: string;
  captcha: string;
  captchaCode: string;
  otp: string[];
  otpTimer: number;
  walletBalance: number;
  otpRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onCardNumberChange: (v: string) => void;
  onCvv2Change: (v: string) => void;
  onExpMonthChange: (v: string) => void;
  onExpYearChange: (v: string) => void;
  onCaptchaChange: (v: string) => void;
  onCaptchaRefresh: () => void;
  onOtpChange: (i: number, v: string) => void;
  onSendOtp: () => void;
  onVerify: () => void;
  onBack: () => void;
  onDone: () => void;
  formatCard: (v: string) => string;
}> = ({
  step, amount, cardNumber, cvv2, expMonth, expYear,
  captcha, captchaCode, otp, otpTimer, walletBalance, otpRefs,
  onCardNumberChange, onCvv2Change, onExpMonthChange, onExpYearChange,
  onCaptchaChange, onCaptchaRefresh, onOtpChange,
  onSendOtp, onVerify, onBack, onDone, formatCard,
}) => {

  const amt = parseInt(amount.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[^0-9]/g, '')) || 0;
  const cardClean = cardNumber.replace(/\s/g, '');
  const cardOk = cardClean.length >= 16 && cvv2.length >= 3 && expMonth.length >= 2 && expYear.length >= 2;
  const capOk = captcha.length === 4 && captcha === captchaCode;
  const otpOk = otp.join('').length >= 6;
  const allValid = cardOk && otpOk;

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 52, borderRadius: 14, fontSize: 16, fontFamily: 'monospace',
    outline: 'none', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    color: '#fff', caretColor: '#f59e0b', transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s',
    boxSizing: 'border-box' as const,
  };
  const focusIn = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)';
    e.currentTarget.style.background = 'rgba(245,158,11,0.02)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.05)';
  };
  const focusOut = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8000, display: 'flex', flexDirection: 'column', background: '#060b16', animation: 'fadeIn 0.3s ease' }} dir="rtl">

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 }}>
          <i className="fas fa-arrow-right" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: 2 }}>مبلغ قابل پرداخت</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>
            {toPersianDigits(amt.toLocaleString('fa-IR'))}
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.25)', marginRight: 4, fontFamily: 'inherit' }}>تومان</span>
          </div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px', WebkitOverflowScrolling: 'touch' as const, scrollbarWidth: 'none' as const }}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>

          {/* ══════ FORM ══════ */}
          {step === 'amount' && (
            <div>

              {/* ── Premium Card Visual ── */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1.58 / 1', borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, #14203a 0%, #0c1628 40%, #080e1c 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)', marginBottom: 28 }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'radial-gradient(ellipse at 75% 20%, rgba(245,158,11,0.25), transparent 60%)' }} />
                <div style={{ position: 'absolute', inset: 0, opacity: 0.2, background: 'radial-gradient(ellipse at 20% 80%, rgba(99,102,241,0.2), transparent 50%)' }} />
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(245,158,11,0.04)', filter: 'blur(20px)' }} />
                <div style={{ position: 'absolute', bottom: -40, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(99,102,241,0.03)', filter: 'blur(25px)' }} />
                <div style={{ position: 'absolute', inset: 0, opacity: 0.015, backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />

                <div style={{ position: 'relative', padding: '22px 24px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 36, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #c9a84c, #a07e3c, #c9a84c)', boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: 6, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, transform: 'rotate(-90deg)' }}>
                        {[12, 9, 6].map(s => (
                          <div key={s} style={{ width: s, height: s, borderRadius: '50%', border: `1.5px solid rgba(255,255,255,${0.1 + s * 0.01})`, borderBottom: 'none', borderRight: 'none', transform: 'rotate(45deg)' }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(228,64,64,0.7)', marginRight: -8 }} />
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,158,11,0.7)' }} />
                    </div>
                  </div>

                  <div dir="ltr" style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.25em', textAlign: 'left' }}>
                    {cardNumber || '••••  ••••  ••••  ••••'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: 24 }}>
                      <div>
                        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', marginBottom: 2, textTransform: 'uppercase' as const }}>CCV2</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{cvv2 || '•••'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', marginBottom: 2, textTransform: 'uppercase' as const }}>VALID THRU</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{expMonth && expYear ? `${expMonth}/${expYear}` : '••/••'}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', marginBottom: 2, textTransform: 'uppercase' as const }}>AMOUNT</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>{toPersianDigits(amt.toLocaleString('fa-IR'))}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Form Container ── */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 20, padding: '20px 18px' }}>

                {/* Card Number */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-credit-card" style={{ fontSize: 11, color: 'rgba(245,158,11,0.5)' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>شماره کارت</span>
                    </div>
                    <span style={{ fontSize: 10, color: cardClean.length >= 16 ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.15)', fontFamily: 'monospace', fontWeight: 600, transition: 'color 0.3s' }}>
                      {cardClean.length}/16
                    </span>
                  </div>
                  <div>
                    <input type="text" value={cardNumber} onChange={e => onCardNumberChange(formatCard(e.target.value))} placeholder="شماره ۱۶ رقمی کارت" dir="ltr" maxLength={19} style={{ ...inputStyle, padding: '0 18px', letterSpacing: '0.18em' }} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                </div>

                {/* CCV2 + Expiry */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-calendar-check" style={{ fontSize: 11, color: 'rgba(245,158,11,0.5)' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>CCV2 و تاریخ انقضا</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="tel" inputMode="numeric" pattern="[0-9]*" value={cvv2} onChange={e => onCvv2Change(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="CCV2" dir="ltr" maxLength={4} style={{ ...inputStyle, flex: 2, fontSize: 15, fontWeight: 700, textAlign: 'center', letterSpacing: '0.15em' }} onFocus={focusIn} onBlur={focusOut} />
                    <input type="tel" inputMode="numeric" pattern="[0-9]*" value={expMonth} onChange={e => onExpMonthChange(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="ماه" dir="ltr" maxLength={2} style={{ ...inputStyle, flex: 1, fontSize: 15, fontWeight: 700, textAlign: 'center' }} onFocus={focusIn} onBlur={focusOut} />
                    <input type="tel" inputMode="numeric" pattern="[0-9]*" value={expYear} onChange={e => onExpYearChange(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="سال" dir="ltr" maxLength={2} style={{ ...inputStyle, flex: 1, fontSize: 15, fontWeight: 700, textAlign: 'center' }} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 5, paddingRight: 2 }}>
                    <span style={{ flex: 2, fontSize: 9, color: 'rgba(255,255,255,0.12)', textAlign: 'center', fontWeight: 500 }}>CCV2</span>
                    <span style={{ flex: 1, fontSize: 9, color: 'rgba(255,255,255,0.12)', textAlign: 'center', fontWeight: 500 }}>ماه</span>
                    <span style={{ flex: 1, fontSize: 9, color: 'rgba(255,255,255,0.12)', textAlign: 'center', fontWeight: 500 }}>سال</span>
                  </div>
                </div>

              </div>

              {/* ── Captcha ── */}
              <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 20, padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-shield-halved" style={{ fontSize: 11, color: 'rgba(245,158,11,0.5)' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>کد امنیتی</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                  <input type="tel" inputMode="numeric" pattern="[0-9]*" value={captcha} onChange={e => onCaptchaChange(e.target.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/\D/g, '').slice(0, 4))} placeholder="۴ رقم" dir="ltr" maxLength={4} style={{ ...inputStyle, flex: 1, fontWeight: 700, textAlign: 'center', letterSpacing: '0.3em' }} onFocus={focusIn} onBlur={focusOut} />
                  <div onClick={onCaptchaRefresh} style={{ width: 120, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.08)', userSelect: 'none', flexShrink: 0, transition: 'background 0.2s' }}>
                    <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 900, color: 'rgba(245,158,11,0.65)', letterSpacing: '0.12em' }}>
                      {captchaCode.split('').map((ch, i) => (
                        <span key={i} style={{ display: 'inline-block', transform: `rotate(${(i % 2 === 0 ? 1 : -1) * (2 + i * 2)}deg)` }}>{ch}</span>
                      ))}
                    </span>
                    <i className="fas fa-rotate" style={{ fontSize: 8, color: 'rgba(245,158,11,0.25)' }} />
                  </div>
                </div>
              </div>


              {/* ── OTP ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-key" style={{ fontSize: 10, color: 'rgba(245,158,11,0.5)' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>کد تایید ۶ رقمی</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 36px)', gap: 5, direction: 'ltr' }}>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                        value={otp[i]}
                        onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(-1); onOtpChange(i, v); if (v && i < 5) otpRefs.current[i + 1]?.focus(); }}
                        onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                        style={{
                          height: 40, borderRadius: 8, fontSize: 16, fontWeight: 900, outline: 'none',
                          textAlign: 'center', caretColor: '#f59e0b',
                          background: otp[i] ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${otp[i] ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.06)'}`,
                          color: otp[i] ? '#f59e0b' : '#fff',
                          transition: 'border-color 0.3s, background 0.3s, transform 0.15s, box-shadow 0.3s',
                          boxSizing: 'border-box' as const,
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.06)'; e.currentTarget.style.zIndex = '1'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = otp[i] ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.zIndex = '0'; }}
                      />
                    ))}
                  </div>
                  <button onClick={onSendOtp} disabled={!cardOk || !capOk} style={{
                    height: 40, padding: '0 12px', borderRadius: 8, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' as const,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0,
                    cursor: 'pointer', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box' as const,
                    background: (cardOk && capOk) ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))' : 'rgba(255,255,255,0.02)',
                    color: (cardOk && capOk) ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                    border: `1px solid ${(cardOk && capOk) ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                    <i className={otpTimer > 0 ? 'fas fa-clock' : 'fas fa-paper-plane'} style={{ fontSize: 9 }} />
                    {otpTimer > 0 ? `${toPersianDigits(String(otpTimer))}s` : 'دریافت کد'}
                  </button>
                </div>
              </div>

              {/* ── Submit ── */}
              <button onClick={onVerify} disabled={!allValid} style={{
                width: '100%', height: 52, borderRadius: 14, fontSize: 14, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                border: 'none', cursor: 'pointer', outline: 'none', marginTop: 20,
                transition: 'all 0.3s', boxSizing: 'border-box' as const,
                background: allValid ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.03)',
                color: allValid ? '#fff' : 'rgba(255,255,255,0.12)',
                boxShadow: allValid ? '0 8px 30px rgba(245,158,11,0.2), 0 0 0 1px rgba(245,158,11,0.3)' : 'none',
              }}>
                <i className="fas fa-lock" style={{ fontSize: 11 }} />
                {allValid ? 'پرداخت و شارژ کیف پول' : 'تمام فیلدها را پر کنید'}
              </button>

              {/* Security */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 16 }}>
                <i className="fas fa-lock" style={{ fontSize: 7, color: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.08)' }}>پرداخت امن با رمزنگاری ۲۵۶ بیتی</span>
              </div>
            </div>
          )}

          {/* ══════ PROCESSING ══════ */}
          {step === 'processing' && (
            <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
              <div style={{ position: 'relative', width: 88, height: 88, marginBottom: 28 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(245,158,11,0.08)', borderTopColor: '#f59e0b', animation: 'spin 1s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.04)', borderBottomColor: '#f59e0b', animation: 'spin 1.4s linear infinite reverse' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.2s ease-in-out infinite' }} />
                </div>
              </div>
              <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', margin: '0 0 4px' }}>در حال پردازش</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', margin: 0 }}>لطفاً صبر کنید...</p>
            </div>
          )}

          {/* ══════ DONE ══════ */}
          {step === 'done' && (
            <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
              <div style={{ position: 'relative', width: 88, height: 88, marginBottom: 24 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(34,197,94,0.06)', animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.08)' }}>
                  <i className="fas fa-check" style={{ fontSize: 32, color: '#22c55e' }} />
                </div>
              </div>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 4px' }}>پرداخت موفق</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: '0 0 4px' }}>کیف پول شما شارژ شد</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#22c55e', margin: '0 0 36px' }}>
                {toPersianDigits(walletBalance.toLocaleString('fa-IR'))} <span style={{ fontSize: 10, color: 'rgba(34,197,94,0.4)' }}>تومان</span>
              </p>
              <button onClick={onDone} style={{ padding: '13px 44px', borderRadius: 14, fontSize: 12, fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 30px rgba(34,197,94,0.2)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                بازگشت به پروفایل
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Note Detail ──────────────────────────────────────────────────────────────
export const NoteDetailView: React.FC<{
    note: PublishedBook; allPodcasts: Podcast[]; comments: Comment[];
    onAddComment: (text: string, note: PublishedBook) => void; onClose: () => void;
    onDeleteComment?: (commentId: string) => void; onLikeComment?: (commentId: string) => void;
    onUpdateComment?: (commentId: string, newText: string) => void;
    currentUserName?: string;
}> = ({ note, allPodcasts, comments, onAddComment, onClose, onDeleteComment, onLikeComment, onUpdateComment, currentUserName }) => {
    const [likedComments, setLikedComments] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('soha_liked_comments') || '[]')));
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const getCid = (c: Comment) => String((c as any)._id || c.id);
    const relatedPodcasts = useMemo(() => {
        if (!note.relatedAudioIds) return [];
        return allPodcasts.filter(p => note.relatedAudioIds?.includes(p.id));
    }, [note.relatedAudioIds, allPodcasts]);
    const noteComments = comments.filter(c => c.bookId === note.id);
    return (
        <div className="fixed inset-0 bg-[#121212] z-[5000] overflow-y-auto animate-fadeIn flex flex-col no-scrollbar text-gray-300">
            <header className="sticky top-0 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/5 p-4 flex justify-between items-center z-10">
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 active:scale-90 transition-transform"><i className="fas fa-times"></i></button>
                <div className="text-center"><p className="text-[10px] font-black text-primary uppercase tracking-widest">مطالعه یادداشت</p></div>
                <div className="w-10"></div>
            </header>
            <main className="max-w-2xl mx-auto w-full px-6 py-10 pb-32">
                <h1 className="text-2xl font-black text-white mb-2 leading-tight text-right">{note.title}</h1>
                <div className="flex items-center gap-3 text-gray-500 text-xs font-bold mb-10 pb-6 border-b border-white/5 flex-row-reverse">
                    <span>{note.authorName}</span><span className="w-1 h-1 rounded-full bg-gray-700"></span><span>{note.date || 'بی‌تاریخ'}</span>
                </div>
                <div className="prose prose-invert prose-lg prose-primary max-w-none text-justify leading-[2.4] text-gray-300 font-medium mb-16 text-right" dangerouslySetInnerHTML={{ __html: note.contentHtml || note.description }} />
                {relatedPodcasts.length > 0 && (
                    <section className="mt-16 pt-10 border-t-4 border-primary/10">
                        <h3 className="text-base font-black text-white mb-6 flex items-center gap-2 justify-end">صوت‌های مرتبط<i className="fas fa-headphones text-primary"></i></h3>
                        <div className="space-y-3">
                            {relatedPodcasts.map(p => (
                                <div key={p.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4 flex-row-reverse">
                                    <img src={p.cover} className="w-14 h-14 rounded-xl object-cover shadow-sm" alt={p.title}/>
                                    <div className="flex-1 min-w-0 text-right"><h4 className="text-white text-sm font-bold truncate">{p.title}</h4><p className="text-gray-500 text-[10px] mt-1 font-bold">{toPersianDigits(p.episodes.length)} اپیزود</p></div>
                                    <button className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"><i className="fas fa-play text-xs"></i></button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                <section className="mt-16 pt-10 border-t border-white/5">
                    <h3 className="text-base font-black text-white mb-6 text-right">گفتگو در مورد یادداشت</h3>
                    <button onClick={() => onAddComment('', note)} className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-right text-sm text-gray-400 font-black flex items-center justify-between group active:scale-95 transition-all mb-8">
                        <div className="flex items-center gap-3"><i className="fas fa-pen-nib text-primary"></i><span>نوشتن اندیشه یا نکته...</span></div>
                        <i className="fas fa-chevron-left text-gray-600"></i>
                    </button>
                    <div className="space-y-4">
                        {noteComments.length > 0 ? noteComments.map(c => {
                            const cid = getCid(c);
                            const isLiked = likedComments.has(cid);
                            const isOwner = currentUserName === c.author;
                            return (
                            <div key={c.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 shadow-sm text-right">
                                <div className="flex justify-between items-center mb-3 flex-row-reverse"><span className="text-primary font-black text-sm">{c.author}</span><span className="text-[10px] text-gray-500 font-bold">{c.date}</span></div>
                                {editingCommentId === cid ? (
                                    <div className="mb-2">
                                        <input value={editText} onChange={e => setEditText(e.target.value)}
                                            onKeyDown={async e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onUpdateComment?.(cid, editText.trim()); setEditingCommentId(null); } if (e.key === 'Escape') setEditingCommentId(null); }}
                                            className="w-full bg-transparent outline-none text-sm leading-relaxed px-2 py-1 rounded-lg" autoFocus
                                            style={{ color: '#ccc', border: '1px solid var(--primary)' }} />
                                        <div className="flex gap-1.5 mt-1">
                                            <button onClick={async () => { onUpdateComment?.(cid, editText.trim()); setEditingCommentId(null); }}
                                                className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                                            <button onClick={() => setEditingCommentId(null)}
                                                className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', color: '#999' }}>لغو</button>
                                        </div>
                                    </div>
                                ) : (
                                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{c.text}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2.5">
                                    {onLikeComment && (
                                        <button onClick={() => { onLikeComment(cid); const next = new Set(likedComments); if (next.has(cid)) next.delete(cid); else next.add(cid); setLikedComments(next); localStorage.setItem('soha_liked_comments', JSON.stringify([...next])); }}
                                            className="text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
                                            style={{ color: isLiked ? 'var(--primary)' : '#999' }}>
                                            <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-[9px]`} /> {c.likes || 0}
                                        </button>
                                    )}
                                    {isOwner && onUpdateComment && (
                                        <button onClick={() => { setEditingCommentId(cid); setEditText(c.text); }}
                                            className="text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
                                            style={{ color: '#999' }}>
                                            <i className="fas fa-pen text-[9px]" />
                                        </button>
                                    )}
                                    {isOwner && onDeleteComment && (
                                        <button onClick={() => onDeleteComment(cid)}
                                            className="text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80 text-red-400/70 hover:text-red-400">
                                            <i className="fas fa-trash text-[9px]" />
                                        </button>
                                    )}
                                </div>
                                {c.replies && c.replies.length > 0 && (
                                    <div className="space-y-2 mt-3 mr-4 pr-3" style={{ borderRight: '2px solid rgba(255,255,255,0.1)' }}>
                                        {c.replies.map(r => {
                                            const rid = getCid(r);
                                            const rIsLiked = likedComments.has(rid);
                                            const rIsOwner = currentUserName === r.author;
                                            return (
                                            <div key={r.id} className="bg-white/5 p-3 rounded-xl border border-white/5 text-right">
                                                <div className="flex justify-between items-center mb-1 flex-row-reverse"><span className="text-primary font-black text-xs">{r.author}</span><span className="text-[9px] text-gray-500 font-bold">{r.date}</span></div>
                                                {editingCommentId === rid ? (
                                                    <div className="mb-1">
                                                        <input value={editText} onChange={e => setEditText(e.target.value)}
                                                            onKeyDown={async e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onUpdateComment?.(rid, editText.trim()); setEditingCommentId(null); } if (e.key === 'Escape') setEditingCommentId(null); }}
                                                            className="w-full bg-transparent outline-none text-xs leading-relaxed px-2 py-1 rounded-lg" autoFocus
                                                            style={{ color: '#ccc', border: '1px solid var(--primary)' }} />
                                                        <div className="flex gap-1.5 mt-1">
                                                            <button onClick={async () => { onUpdateComment?.(rid, editText.trim()); setEditingCommentId(null); }}
                                                                className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                                                            <button onClick={() => setEditingCommentId(null)}
                                                                className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', color: '#999' }}>لغو</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap">{r.text}</p>
                                                )}
                                                <div className="flex items-center gap-3 mt-2">
                                                    {onLikeComment && (
                                                        <button onClick={() => { onLikeComment(rid); const next = new Set(likedComments); if (next.has(rid)) next.delete(rid); else next.add(rid); setLikedComments(next); localStorage.setItem('soha_liked_comments', JSON.stringify([...next])); }}
                                                            className="text-[10px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
                                                            style={{ color: rIsLiked ? 'var(--primary)' : '#999' }}>
                                                            <i className={`${rIsLiked ? 'fas' : 'far'} fa-heart text-[8px]`} /> {r.likes || 0}
                                                        </button>
                                                    )}
                                                    {rIsOwner && onUpdateComment && (
                                                        <button onClick={() => { setEditingCommentId(rid); setEditText(r.text); }}
                                                            className="text-[10px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
                                                            style={{ color: '#999' }}>
                                                            <i className="fas fa-pen text-[8px]" />
                                                        </button>
                                                    )}
                                                    {rIsOwner && onDeleteComment && (
                                                        <button onClick={() => onDeleteComment(rid)}
                                                            className="text-[10px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80 text-red-400/70 hover:text-red-400">
                                                            <i className="fas fa-trash text-[8px]" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            );
                        }) : <div className="py-10 text-center text-gray-600 italic text-sm">اولین کسی باشید که گفتگو می‌کند.</div>}
                    </div>
                </section>
            </main>
        </div>
    );
};

// ─── Book Detail View ─────────────────────────────────────────────────────────
export const BookDetailView: React.FC<{
    book: PublishedBook; allPodcasts: Podcast[]; onClose: () => void;
    comments: Comment[]; onAddComment: (text: string, book: PublishedBook) => void;
    onAddToCart?: (book: PublishedBook) => void; onReadBook?: (book: PublishedBook) => void;
    onDeleteComment?: (commentId: string) => void; onLikeComment?: (commentId: string) => void;
    onUpdateComment?: (commentId: string, newText: string) => void;
    currentUserName?: string; userAvatar?: string;
}> = ({ book, allPodcasts, onClose, comments, onAddComment, onAddToCart, onDeleteComment, onLikeComment, onUpdateComment, currentUserName }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'audio' | 'comments'>('info');
    const [addedToCart, setAddedToCart] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [likedComments, setLikedComments] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('soha_liked_comments') || '[]')));
    const relatedPodcasts = useMemo(() => {
        if (!book.relatedAudioIds) return [];
        return allPodcasts.filter(p => book.relatedAudioIds?.includes(p.id));
    }, [book.relatedAudioIds, allPodcasts]);
    const bookComments = comments.filter(c => c.bookId === book.id);
    const getCid = (c: Comment) => String((c as any)._id || c.id);
    const handleAddToCart = () => { if (onAddToCart) { onAddToCart(book); setAddedToCart(true); setTimeout(() => setAddedToCart(false), 2000); } };

    return (
        <div className="fixed inset-0 z-[2000] overflow-y-auto animate-fadeIn" style={{ background: 'var(--surface)' }} dir="rtl">
            {/* Top bar */}
            <div className="sticky top-0 z-30 px-4 py-3" style={{ background: 'color-mix(in srgb, var(--surface) 92%, transparent)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button onClick={onClose} className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <i className="fas fa-arrow-right text-sm" style={{ color: 'var(--text-2)' }} />
                    </button>
                    <span className="text-[10px] font-black px-3 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>نشر سُها</span>
                    <div className="w-10" />
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-8">
                {/* Hero: Cover + Info side by side on desktop */}
                <div className="flex flex-col md:flex-row items-start gap-8 md:gap-12 pt-8 pb-10">
                    {/* Left: 3D Book Cover */}
                    <div className="w-full md:w-80 shrink-0 flex justify-center">
                        <div className="relative group">
                            {/* Ambient glow */}
                            {book.cover && (
                                <div className="absolute -inset-8 rounded-3xl opacity-30 blur-3xl transition-opacity duration-700 group-hover:opacity-50" style={{ backgroundImage: `url(${book.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                            )}
                            {/* Book */}
                            <div className="relative w-56 h-80 md:w-64 md:h-[23rem] rounded-2xl overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)', transform: 'rotateY(-8deg) rotateX(3deg)', transformStyle: 'preserve-3d' }}>
                                {!imgLoaded && <div className="absolute inset-0 animate-shimmer" />}
                                {book.cover ? (
                                    <img src={book.cover} alt={book.title} className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setImgLoaded(true)} />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center" style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}>
                                        <i className="fas fa-book text-white/30 text-4xl mb-3" />
                                        <span className="text-lg text-white font-black">{book.title.slice(0, 15)}</span>
                                    </div>
                                )}
                                {/* Spine */}
                                <div className="absolute top-0 right-0 bottom-0 w-2 bg-gradient-to-b from-black/20 via-black/40 to-black/20" />
                            </div>
                            {/* Shadow */}
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 h-10 bg-black/20 blur-2xl rounded-full" />
                            {/* New badge */}
                            {book.isNew && (
                                <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-black text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                                    <i className="fas fa-fire text-[8px] ml-1" /> تازه انتشار
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Book Info */}
                    <div className="flex-1 min-w-0 text-right">
                        {/* Category pill */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
                            <span className="text-[10px] font-black" style={{ color: 'var(--primary)' }}>نشر سُها</span>
                        </div>

                        <h1 className="text-2xl md:text-4xl font-black leading-tight mb-2" style={{ color: 'var(--text)' }}>{book.title}</h1>
                        {book.subtitle && <p className="text-sm md:text-base font-bold mb-3" style={{ color: 'var(--primary)' }}>{book.subtitle}</p>}

                        {/* Author & Meta */}
                        <div className="flex items-center gap-3 mb-6 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                <i className="fas fa-pen-fountain text-[10px]" style={{ color: 'var(--primary)' }} />
                                <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{book.authorName}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                <i className="fas fa-building text-[10px]" style={{ color: 'var(--text-3)' }} />
                                <span className="text-xs font-bold" style={{ color: 'var(--text-2)' }}>نشر سُها</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {[1,2,3,4,5].map(s => <i key={s} className="fas fa-star text-[10px]" style={{ color: s <= 4 ? 'var(--accent)' : 'var(--text-3)', opacity: s <= 4 ? 1 : 0.3 }} />)}
                                <span className="text-[10px] font-bold mr-1" style={{ color: 'var(--text-3)' }}>(۴.۰)</span>
                            </div>
                        </div>

                        {/* Price Card */}
                        <div className="p-5 rounded-2xl mb-6" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 6%, var(--surface-2)), color-mix(in srgb, var(--secondary) 4%, var(--surface-2)))', border: '1px solid var(--border)' }}>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--text-3)' }}>قیمت</p>
                                    <p className="text-2xl md:text-3xl font-black" style={{ color: 'var(--primary)' }}>
                                        {book.price && book.price !== '۰' ? toPersianDigits(book.price) : 'رایگان'}
                                        {book.price && book.price !== '۰' && <span className="text-sm font-bold mr-1">تومان</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{ background: 'color-mix(in srgb, #22c55e 12%, transparent)' }}>
                                    <i className="fas fa-check-circle text-[10px]" style={{ color: '#22c55e' }} />
                                    <span className="text-[10px] font-black" style={{ color: '#22c55e' }}>موجود</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mb-8">
                            {onAddToCart && (
                                <button onClick={handleAddToCart} className="flex-1 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] relative overflow-hidden" style={{ background: addedToCart ? '#22c55e' : 'var(--primary)', color: 'white', boxShadow: addedToCart ? '0 10px 30px rgba(34,197,94,0.3)' : '0 10px 30px var(--primary-glow)' }}>
                                    <i className={`fas ${addedToCart ? 'fa-check' : 'fa-cart-plus'}`} />
                                    {addedToCart ? 'اضافه شد به سبد' : 'افزودن به سبد خرید'}
                                </button>
                            )}
                            {book.buyUrl && (
                                <button onClick={() => window.open(book.buyUrl, '_blank')} className="py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                                    <i className="fas fa-external-link-alt text-[10px]" />
                                    سایت ناشر
                                </button>
                            )}
                        </div>


                        {/* Tabs */}
                        <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            {[
                                { key: 'info' as const, icon: 'fa-book-open', label: 'معرفی کتاب' },
                                ...(relatedPodcasts.length > 0 ? [{ key: 'audio' as const, icon: 'fa-headphones', label: 'صوت‌ها' }] : []),
                                { key: 'comments' as const, icon: 'fa-comments', label: 'گفتگوها' },
                            ].map(t => (
                                <button key={t.key} onClick={() => setActiveTab(t.key)} className="flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all" style={{ background: activeTab === t.key ? 'var(--surface)' : 'transparent', color: activeTab === t.key ? 'var(--primary)' : 'var(--text-3)', boxShadow: activeTab === t.key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
                                    <i className={`fas ${t.icon} ml-1`} /> {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'info' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="p-5 rounded-2xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                    <h4 className="text-[10px] font-black mb-3 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
                                        <i className="fas fa-book-open text-primary" /> درباره کتاب
                                    </h4>
                                    <p className="text-sm leading-[2.2] text-justify" style={{ color: 'var(--text-2)' }}>{book.description}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-2xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                        <p className="text-[9px] font-black mb-1" style={{ color: 'var(--text-3)' }}>نویسنده</p>
                                        <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{book.authorName}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                        <p className="text-[9px] font-black mb-1" style={{ color: 'var(--text-3)' }}>ناشر</p>
                                        <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>نشر سُها</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'audio' && (
                            <div className="space-y-3 animate-fadeIn">
                                {relatedPodcasts.map(p => (
                                    <div key={p.id} className="p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.01]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                        <img src={p.cover} className="w-12 h-12 rounded-xl object-cover shadow-md" alt={p.title}/>
                                        <div className="flex-1 min-w-0 text-right">
                                            <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{p.title}</h4>
                                            <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{toPersianDigits(p.episodes.length)} جلسه</p>
                                        </div>
                                        <button className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
                                            <i className="fas fa-play text-xs" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'comments' && (
                            <div className="space-y-3 animate-fadeIn">
                                <button onClick={() => onAddComment('', book)} className="w-full p-4 rounded-2xl text-right text-xs font-black flex items-center justify-between active:scale-[0.98] transition-all" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                                    <div className="flex items-center gap-3"><i className="fas fa-pen-nib text-primary" /><span>نوشتن یادداشت...</span></div>
                                    <i className="fas fa-chevron-left opacity-50" />
                                </button>
                                {bookComments.length > 0 ? bookComments.map(c => {
                                    const cid = getCid(c);
                                    const isLiked = likedComments.has(cid);
                                    const isOwner = currentUserName === c.author;
                                    return (
                                    <div key={c.id} className="p-4 rounded-2xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                        <div className="flex justify-between items-center mb-2 flex-row-reverse">
                                            <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{c.author}</span>
                                            <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{c.date}</span>
                                        </div>
                                        {editingCommentId === cid ? (
                                            <div className="mb-2">
                                                <input value={editText} onChange={e => setEditText(e.target.value)}
                                                    onKeyDown={async e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onUpdateComment?.(cid, editText.trim()); setEditingCommentId(null); } if (e.key === 'Escape') setEditingCommentId(null); }}
                                                    className="w-full bg-transparent outline-none text-sm leading-relaxed px-2 py-1 rounded-lg" autoFocus
                                                    style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
                                                <div className="flex gap-1.5 mt-1">
                                                    <button onClick={async () => { onUpdateComment?.(cid, editText.trim()); setEditingCommentId(null); }}
                                                        className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                                                    <button onClick={() => setEditingCommentId(null)}
                                                        className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
                                                </div>
                                            </div>
                                        ) : (
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-justify" style={{ color: 'var(--text-2)' }}>{c.text}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-2.5">
                                            {onLikeComment && (
                                                <button onClick={() => { onLikeComment(cid); const next = new Set(likedComments); if (next.has(cid)) next.delete(cid); else next.add(cid); setLikedComments(next); localStorage.setItem('soha_liked_comments', JSON.stringify([...next])); }}
                                                    className="text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
                                                    style={{ color: isLiked ? 'var(--primary)' : 'var(--text-3)' }}>
                                                    <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-[9px]`} /> {c.likes || 0}
                                                </button>
                                            )}
                                            {isOwner && onUpdateComment && (
                                                <button onClick={() => { setEditingCommentId(cid); setEditText(c.text); }}
                                                    className="text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
                                                    style={{ color: 'var(--text-3)' }}>
                                                    <i className="fas fa-pen text-[9px]" />
                                                </button>
                                            )}
                                            {isOwner && onDeleteComment && (
                                                <button onClick={() => onDeleteComment(cid)}
                                                    className="text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80 text-red-400/70 hover:text-red-400">
                                                    <i className="fas fa-trash text-[9px]" />
                                                </button>
                                            )}
                                        </div>
                                        {c.replies && c.replies.length > 0 && (
                                            <div className="space-y-2 mt-3 mr-4 pr-3" style={{ borderRight: '2px solid var(--border)' }}>
                                                {c.replies.map(r => {
                                                    const rid = getCid(r);
                                                    const rIsLiked = likedComments.has(rid);
                                                    const rIsOwner = currentUserName === r.author;
                                                    return (
                                                    <div key={r.id} className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                                        <div className="flex justify-between items-center mb-1 flex-row-reverse">
                                                            <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{r.author}</span>
                                                            <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>{r.date}</span>
                                                        </div>
                                                        {editingCommentId === rid ? (
                                                            <div className="mb-1">
                                                                <input value={editText} onChange={e => setEditText(e.target.value)}
                                                                    onKeyDown={async e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onUpdateComment?.(rid, editText.trim()); setEditingCommentId(null); } if (e.key === 'Escape') setEditingCommentId(null); }}
                                                                    className="w-full bg-transparent outline-none text-xs leading-relaxed px-2 py-1 rounded-lg" autoFocus
                                                                    style={{ color: 'var(--text)', border: '1px solid var(--primary)' }} />
                                                                <div className="flex gap-1.5 mt-1">
                                                                    <button onClick={async () => { onUpdateComment?.(rid, editText.trim()); setEditingCommentId(null); }}
                                                                        className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--primary)', color: 'white' }}>ذخیره</button>
                                                                    <button onClick={() => setEditingCommentId(null)}
                                                                        className="text-[9px] font-bold px-3 py-1 rounded-lg" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>لغو</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                        <p className="text-xs leading-relaxed whitespace-pre-wrap text-justify" style={{ color: 'var(--text-2)' }}>{r.text}</p>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-2">
                                                            {onLikeComment && (
                                                                <button onClick={() => { onLikeComment(rid); const next = new Set(likedComments); if (next.has(rid)) next.delete(rid); else next.add(rid); setLikedComments(next); localStorage.setItem('soha_liked_comments', JSON.stringify([...next])); }}
                                                                    className="text-[10px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
                                                                    style={{ color: rIsLiked ? 'var(--primary)' : 'var(--text-3)' }}>
                                                                    <i className={`${rIsLiked ? 'fas' : 'far'} fa-heart text-[8px]`} /> {r.likes || 0}
                                                                </button>
                                                            )}
                                                            {rIsOwner && onUpdateComment && (
                                                                <button onClick={() => { setEditingCommentId(rid); setEditText(r.text); }}
                                                                    className="text-[10px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80"
                                                                    style={{ color: 'var(--text-3)' }}>
                                                                    <i className="fas fa-pen text-[8px]" />
                                                                </button>
                                                            )}
                                                            {rIsOwner && onDeleteComment && (
                                                                <button onClick={() => onDeleteComment(rid)}
                                                                    className="text-[10px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-80 text-red-400/70 hover:text-red-400">
                                                                    <i className="fas fa-trash text-[8px]" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    );
                                }) : <p className="text-center text-sm py-8" style={{ color: 'var(--text-3)' }}>هنوز گفتگویی ثبت نشده.</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main NashrPage ───────────────────────────────────────────────────────────
interface NashrPageProps {
  publishedBooks: PublishedBook[]; allPodcasts: Podcast[]; comments: Comment[];
  onAddComment: (text: string, book: PublishedBook) => void;
  user: User | null;
  onUpdateUser: (user: User) => void;
  onDeleteComment?: (commentId: string) => void;
  onLikeComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  onToggleSidebar?: () => void;
}

const NashrPage: React.FC<NashrPageProps> = ({ publishedBooks, allPodcasts, comments, onAddComment, user, onUpdateUser, onDeleteComment, onLikeComment, onUpdateComment, onToggleSidebar }) => {
  const [selectedItem, setSelectedItem] = useState<PublishedBook | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isScrolled, setIsScrolled] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const books = useMemo(() => publishedBooks.filter(b => b.buyUrl && (b.type === 'book' || (!b.type && b.cover))), [publishedBooks]);
  const notes = useMemo(() => publishedBooks.filter(b => b.type === 'note'), [publishedBooks]);

  // Pick featured books (up to 3)
  const featuredBooks = useMemo(() => {
    if (books.length === 0) return [];
    const newBooks = books.filter(b => b.isNew);
    const rest = books.filter(b => !b.isNew);
    return [...newBooks, ...rest].slice(0, 3);
  }, [books]);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('soha_cart') || '[]'); } catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>(() => {
    try { return JSON.parse(localStorage.getItem('soha_orders') || '[]'); } catch { return []; }
  });
  const [showOrders, setShowOrders] = useState(false);
  const [readingBook, setReadingBook] = useState<PublishedBook | null>(null);
  const [readingStartPage, setReadingStartPage] = useState(0);
  const [toast, setToast] = useState<{ message: string; icon: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    try { return Number(localStorage.getItem('soha_wallet') || '0'); } catch { return 0; }
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [walletPayStep, setWalletPayStep] = useState<'idle' | 'amount' | 'processing' | 'done'>('idle');
  const [walletPayAmount, setWalletPayAmount] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingPhone, setEditingPhone] = useState('');
  const [walletCardNumber, setWalletCardNumber] = useState('');
  const [walletCardCvv2, setWalletCardCvv2] = useState('');
  const [walletCardExpMonth, setWalletCardExpMonth] = useState('');
  const [walletCardExpYear, setWalletCardExpYear] = useState('');
  const [walletCaptcha, setWalletCaptcha] = useState('');
  const [walletCaptchaCode, setWalletCaptchaCode] = useState('');
  const [walletOtp, setWalletOtp] = useState(['', '', '', '', '', '']);
  const [walletGeneratedOtp, setWalletGeneratedOtp] = useState('');
  const [walletOtpTimer, setWalletOtpTimer] = useState(60);
  const walletOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { localStorage.setItem('soha_cart', JSON.stringify(cartItems)); }, [cartItems]);
  useEffect(() => { localStorage.setItem('soha_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('soha_wallet', String(walletBalance)); }, [walletBalance]);

  useEffect(() => {
    if (walletPayStep === 'amount') {
      const c = String(Math.floor(1000 + Math.random() * 9000));
      setWalletCaptchaCode(c);
      setWalletCaptcha('');
    }
  }, [walletPayStep]);

  useEffect(() => {
    const handleScroll = () => { setIsScrolled(window.scrollY > 80); };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Wallet OTP timer — ticks when payment form is open and timer hasn't expired
  useEffect(() => {
    if (walletPayStep === 'idle' || walletPayStep === 'processing' || walletPayStep === 'done' || walletOtpTimer <= 0) return;
    const t = setInterval(() => setWalletOtpTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [walletPayStep, walletOtpTimer]);

  // Generate captcha when entering card step
  useEffect(() => {
    if (walletPayStep === 'amount') {
      const c = String(Math.floor(1000 + Math.random() * 9000));
      setWalletCaptchaCode(c);
      setWalletCaptcha('');
    }
  }, [walletPayStep]);



  // Auto-slide for featured books
  useEffect(() => {
    if (featuredBooks.length <= 1) return;
    slideTimerRef.current = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % featuredBooks.length);
    }, 5000);
    return () => { if (slideTimerRef.current) clearInterval(slideTimerRef.current); };
  }, [featuredBooks.length]);

  const goToSlide = useCallback((idx: number) => {
    setSlideIndex(idx);
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    slideTimerRef.current = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % featuredBooks.length);
    }, 5000);
  }, [featuredBooks.length]);

  const showToast = useCallback((message: string, icon: string = 'fa-check-circle') => {
    setToast({ message, icon }); setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => { if (cartBounce) { const t = setTimeout(() => setCartBounce(false), 500); return () => clearTimeout(t); } }, [cartBounce]);

  const addToCart = useCallback((book: PublishedBook) => {
    setCartItems(prev => {
      const exists = prev.find(i => i.book.id === book.id);
      if (exists) { showToast(`تعداد «${book.title.slice(0, 18)}...» افزایش یافت`, 'fa-plus-circle'); return prev.map(i => i.book.id === book.id ? { ...i, quantity: i.quantity + 1 } : i); }
      showToast(`«${book.title.slice(0, 18)}...» به سبد اضافه شد`, 'fa-cart-plus');
      return [...prev, { book, quantity: 1 }];
    });
    setCartBounce(true);
  }, [showToast]);

  const removeFromCart = useCallback((bookId: number) => { setCartItems(prev => prev.filter(i => i.book.id !== bookId)); showToast('حذف شد', 'fa-trash-alt'); }, [showToast]);
  const updateCartQuantity = useCallback((bookId: number, qty: number) => { if (qty <= 0) { removeFromCart(bookId); return; } setCartItems(prev => prev.map(i => i.book.id === bookId ? { ...i, quantity: qty } : i)); }, [removeFromCart]);
  const handleCheckoutComplete = useCallback((order: Order) => { setOrders(prev => [order, ...prev]); setCartItems([]); showToast(`سفارش ${order.orderNumber} ثبت شد`, 'fa-receipt'); }, [showToast]);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const topUpWallet = useCallback((amount: number) => {
    setWalletBalance(prev => prev + amount);
    showToast(`کیف پول ${toPersianDigits(amount.toLocaleString('fa-IR'))} تومان شارژ شد`, 'fa-wallet');
  }, [showToast]);

  const deductWallet = useCallback((amount: number): boolean => {
    if (walletBalance < amount) return false;
    setWalletBalance(prev => prev - amount);
    return true;
  }, [walletBalance]);

  const formatWalletCard = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 16); return d.replace(/(\d{4})(?=\d)/g, '$1 '); };

  const walletSendOtp = useCallback(() => {
    const amt = parseInt(walletPayAmount.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[^0-9]/g, '')) || 0;
    if (amt < 10000 || walletCardNumber.replace(/\s/g, '').length < 16) return;
    if (walletCaptcha !== walletCaptchaCode) return;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setWalletGeneratedOtp(code);
    setWalletOtpTimer(60);
    setWalletOtp(['', '', '', '', '', '']);
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║       💰 شارژ کیف پول — رمز پویا              ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  رمز پویا:  ${code}                            ║`);
    console.log(`║  کارت:      ${walletCardNumber.replace(/\s/g, '')}              ║`);
    console.log(`║  CCV2:      ${walletCardCvv2}                        ║`);
    console.log(`║  تاریخ:     ${walletCardExpMonth}/${walletCardExpYear}                          ║`);
    console.log(`║  مبلغ:      ${toPersianDigits(amt.toLocaleString('fa-IR'))} تومان                 ║`);
    console.log(`║  تاریخ ثبت: ${new Date().toLocaleString('fa-IR')}    ║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
    setTimeout(() => walletOtpRefs.current[0]?.focus(), 100);
  }, [walletPayAmount, walletCardNumber, walletCardCvv2, walletCardExpMonth, walletCardExpYear, walletCaptcha, walletCaptchaCode]);

  const walletVerifyOtp = useCallback(() => {
    if (walletOtp.join('') === walletGeneratedOtp) {
      const amt = parseInt(walletPayAmount.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[^0-9]/g, '')) || 0;
      setWalletPayStep('processing');
      setTimeout(() => {
        setWalletBalance(prev => prev + amt);
        setWalletPayStep('done');
        showToast(`کیف پول ${toPersianDigits(amt.toLocaleString('fa-IR'))} تومان شارژ شد`, 'fa-wallet');
      }, 2000);
    }
  }, [walletOtp, walletGeneratedOtp, walletPayAmount, showToast]);

  const resetWalletPay = useCallback(() => {
    setWalletPayStep('idle');
    setWalletPayAmount('');
    setWalletCardNumber('');
    setWalletCardCvv2('');
    setWalletCardExpMonth('');
    setWalletCardExpYear('');
    setWalletCaptcha('');
    setWalletOtp(['', '', '', '', '', '']);
    setWalletGeneratedOtp('');
    setWalletOtpTimer(60);
  }, []);

  const parsePrice = (p?: string) => { if (!p) return 0; return parseInt(p.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[^0-9]/g, '')) || 0; };

  // Categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    books.forEach(b => { if (b.subtitle) cats.add(b.subtitle); });
    return ['all', ...Array.from(cats).slice(0, 5)];
  }, [books]);

  const filteredBooks = useMemo(() => {
    let result = [...books];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(q) || b.authorName.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q));
    }
    if (activeCategory !== 'all') {
      result = result.filter(b => b.subtitle === activeCategory);
    }
    if (sortBy === 'newest') result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    else if (sortBy === 'price-low') result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    else if (sortBy === 'price-high') result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    return result;
  }, [books, sortBy, searchQuery, activeCategory]);

  // Navigation
  if (selectedItem) {
    if (selectedItem.type === 'note') return <NoteDetailView note={selectedItem} allPodcasts={allPodcasts} comments={comments} onAddComment={onAddComment} onClose={() => setSelectedItem(null)} onDeleteComment={onDeleteComment} onLikeComment={onLikeComment} onUpdateComment={onUpdateComment} currentUserName={user?.name} />;
    return <BookDetailView book={selectedItem} allPodcasts={allPodcasts} comments={comments} onAddComment={onAddComment} onClose={() => setSelectedItem(null)} onAddToCart={addToCart} onReadBook={setReadingBook} onDeleteComment={onDeleteComment} onLikeComment={onLikeComment} onUpdateComment={onUpdateComment} currentUserName={user?.name} />;
  }
  if (showOrders) return <OrdersPage orders={orders} publishedBooks={publishedBooks} onBack={() => setShowOrders(false)} onReadBook={(book, page) => { setReadingBook(book); setReadingStartPage(page || 0); setShowOrders(false); }} />;
  if (readingBook) return <BookReader book={readingBook} startPage={readingStartPage} onClose={() => { setReadingBook(null); setReadingStartPage(0); }} />;

  return (
    <>
    <main className="flex-grow min-h-screen" style={{ background: 'var(--surface)' }}>

      {/* ═══════════════ STICKY HEADER ═══════════════ */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg' : ''}`} style={{ background: isScrolled ? 'color-mix(in srgb, var(--surface) 95%, transparent)' : 'var(--surface)', backdropFilter: isScrolled ? 'blur(20px)' : 'none', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2.5 shrink-0">
                <button onClick={onToggleSidebar} className="lg:flex hidden items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-90" style={{ color: 'var(--text-3)' }}>
                  <i className="fas fa-bars text-sm"></i>
                </button>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                  <i className="fas fa-feather-alt text-white text-xs"></i>
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-black leading-tight" style={{ color: 'var(--text)' }}>نشر سُها</p>
                  <p className="text-[8px] font-bold" style={{ color: 'var(--text-3)' }}>سرای هنر و اندیشه</p>
                </div>
              </div>
              <div className="relative flex-1">
                <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: 'var(--text-3)' }}></i>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="جستجوی کتاب، نویسنده..." className="w-full pr-10 pl-4 py-2.5 rounded-xl text-sm font-bold outline-none transition-all focus:ring-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 30%, transparent)' } as any} />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setIsProfileOpen(true)} className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <i className="fas fa-user text-[11px]" style={{ color: 'var(--text-2)' }}></i>
              </button>
              <button onClick={() => setIsCartOpen(true)} className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <i className="fas fa-shopping-cart text-[11px]" style={{ color: 'var(--text-2)' }}></i>
                {cartCount > 0 && <span className="absolute -top-1 -left-1 min-w-[16px] h-4 px-0.5 rounded-full text-[7px] font-black text-white flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{cartCount}</span>}
              </button>
              <button onClick={() => setShowOrders(true)} className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <i className="fas fa-receipt text-[11px]" style={{ color: 'var(--text-2)' }}></i>
                {orders.length > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[7px] font-black text-white flex items-center justify-center" style={{ background: 'var(--accent)' }}>{orders.length}</span>}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section ref={heroRef} className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #f0fdfa 0%, #ccfbf1 25%, #e0f7fa 50%, #f0fdfa 75%, #ccfbf1 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(20,184,166,0.12), transparent 50%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 80%, rgba(45,212,191,0.08), transparent 50%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(94,234,212,0.06), transparent 60%)' }} />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-20 blur-[100px]" style={{ background: '#5eead4' }} />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] rounded-full opacity-15 blur-[80px]" style={{ background: '#2dd4bf' }} />
        <div className="relative max-w-6xl mx-auto px-5 pt-8 pb-12 text-center">
          <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight" style={{ color: '#0d9488' }}>
            کتاب‌های نشر سُها
          </h1>
          <p className="text-sm md:text-base mb-6 leading-relaxed max-w-lg mx-auto whitespace-nowrap overflow-hidden text-ellipsis px-4" style={{ color: '#0f766e' }}>
            مجموعه‌ای از بهترین آثار تخصصی در حوزه فلسفه، عرفان و تفکر معاصر ایران
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6" style={{ background: 'var(--surface)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }} />
      </section>

      {/* ═══════════════ FEATURED BOOKS SLIDESHOW ═══════════════ */}
      {featuredBooks.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 -mt-2 mb-10">
          <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
            {/* Pattern */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(16,185,129,0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.3), transparent 50%)' }} />

            {/* Slides */}
            <div className="relative">
              {featuredBooks.map((book, idx) => (
                <div key={book.id} className={`transition-all duration-700 ease-in-out ${idx === slideIndex ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
                  <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-10">
                    {/* Book cover */}
                    <div className="shrink-0 relative group">
                      <div className="absolute -inset-4 rounded-2xl opacity-40 blur-2xl transition-opacity duration-500" style={{ backgroundImage: book.cover ? `url(${book.cover})` : undefined, backgroundSize: 'cover', opacity: idx === slideIndex ? 0.4 : 0 }} />
                      <div className="relative w-40 h-56 md:w-48 md:h-64 rounded-xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-105" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                        {book.cover ? (
                          <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                            <i className="fas fa-book text-white/40 text-3xl" />
                          </div>
                        )}
                        <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-black/30" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3" style={{ background: book.isNew ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)', border: `1px solid ${book.isNew ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}` }}>
                        <i className={`fas ${book.isNew ? 'fa-fire' : 'fa-star'} text-[9px]`} style={{ color: book.isNew ? '#fbbf24' : '#818cf8' }} />
                        <span className="text-[10px] font-black" style={{ color: book.isNew ? '#fbbf24' : '#818cf8' }}>{book.isNew ? 'کتاب ویژه' : 'پیشنهاد ویژه'}</span>
                      </div>
                      <h2 className="text-xl md:text-3xl font-black text-white mb-2 leading-tight">{book.title}</h2>
                      {book.subtitle && <p className="text-xs text-emerald-400 font-bold mb-2">{book.subtitle}</p>}
                      <p className="text-xs text-gray-400 mb-4 line-clamp-2 max-w-md mx-auto md:mx-0">{book.description}</p>
                      <div className="flex items-center gap-4 justify-center md:justify-start mb-5">
                        <span className="text-2xl font-black text-emerald-400">{book.price ? toPersianDigits(book.price) : 'رایگان'} <span className="text-xs">تومان</span></span>
                      </div>
                      <div className="flex gap-3 justify-center md:justify-start">
                        <button onClick={() => addToCart(book)} className="py-3 px-6 rounded-2xl text-sm font-black text-white flex items-center gap-2 transition-all active:scale-95" style={{ background: 'var(--primary)', boxShadow: '0 10px 30px var(--primary-glow)' }}>
                          <i className="fas fa-cart-plus" /> افزودن به سبد
                        </button>
                        <button onClick={() => setSelectedItem(book)} className="py-3 px-6 rounded-2xl text-sm font-black flex items-center gap-2 transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
                          <i className="fas fa-eye" /> مشاهده
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Slide controls */}
            {featuredBooks.length > 1 && (
              <div className="relative z-10 flex items-center justify-center gap-3 pb-5">
                {/* Dots */}
                <div className="flex items-center gap-2">
                  {featuredBooks.map((_, idx) => (
                    <button key={idx} onClick={() => goToSlide(idx)} className={`transition-all duration-300 rounded-full ${idx === slideIndex ? 'w-7 h-2' : 'w-2 h-2'}`} style={{ background: idx === slideIndex ? 'var(--primary)' : 'rgba(255,255,255,0.25)' }} />
                  ))}
                </div>
              </div>
            )}

            {/* Arrow buttons */}
            {featuredBooks.length > 1 && (
              <>
                <button onClick={() => goToSlide((slideIndex - 1 + featuredBooks.length) % featuredBooks.length)} className="absolute top-1/2 -translate-y-1/2 right-3 w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center z-10 transition-all active:scale-90 hover:bg-black/50 border border-white/10">
                  <i className="fas fa-chevron-right text-white text-xs" />
                </button>
                <button onClick={() => goToSlide((slideIndex + 1) % featuredBooks.length)} className="absolute top-1/2 -translate-y-1/2 left-3 w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center z-10 transition-all active:scale-90 hover:bg-black/50 border border-white/10">
                  <i className="fas fa-chevron-left text-white text-xs" />
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════ CATEGORIES + SORT ═══════════════ */}
      <section className="max-w-6xl mx-auto px-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Section title */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(to bottom, var(--primary), var(--secondary))' }} />
            <div>
              <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>همه کتاب‌ها</h2>
              <p className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{toPersianDigits(String(filteredBooks.length))} عنوان</p>
            </div>
           </div>
        </div>

      </section>

      {/* ═══════════════ BOOK GRID ═══════════════ */}
      <section className="max-w-6xl mx-auto px-4 mb-12">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)', border: '2px dashed var(--border)' }}>
              <i className="fas fa-book-open text-2xl" style={{ color: 'var(--text-3)' }} />
            </div>
            <p className="text-sm font-black mb-1" style={{ color: 'var(--text)' }}>کتابی یافت نشد</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>فیلترها را تغییر دهید</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            {filteredBooks.map((book, i) => {
              const inCart = cartItems.find(ci => ci.book.id === book.id);
              const qty = inCart?.quantity || 0;
              return (
              <div key={book.id} className="group cursor-pointer flex flex-col animate-fadeInUp" style={{ animationDelay: `${i * 50}ms` }} onClick={() => setSelectedItem(book)}>
                {/* Book Card */}
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 transition-all duration-500 group-hover:-translate-y-3 group-hover:shadow-xl" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid var(--border)' }}>
                  {book.cover ? (
                    <img src={book.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={book.title} loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                      <i className="fas fa-book text-white/30 text-2xl mb-2" />
                      <span className="text-[11px] text-white font-black">{book.title.slice(0, 12)}</span>
                    </div>
                  )}
                  {/* Spine */}
                  <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-white/10 via-black/20 to-white/10" />

                  {/* New badge */}
                  {book.isNew && (
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[9px] font-black text-white shadow-lg flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                      <i className="fas fa-bolt text-[7px]" /> تازه
                    </div>
                  )}

                  {/* Cart quantity badge */}
                  {qty > 0 && (
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg animate-bounceIn" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                      {toPersianDigits(String(qty))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <h3 className="text-[13px] font-black line-clamp-2 text-right leading-snug mb-1" style={{ color: 'var(--text)' }}>{book.title}</h3>
                <div className="flex items-center justify-between mt-auto mb-2">
                  <span className="text-[10px] font-bold truncate" style={{ color: 'var(--text-3)' }}>{book.authorName}</span>
                  {book.price && book.price !== '۰' && (
                    <span className="text-[11px] font-black tabular-nums" style={{ color: 'var(--primary)' }}>{toPersianDigits(book.price)}</span>
                  )}
                </div>

                {/* Add to cart / Quantity selector */}
                <div onClick={e => e.stopPropagation()}>
                  {qty === 0 ? (
                    <button onClick={() => addToCart(book)} className="w-full py-2 rounded-xl text-[10px] font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 animate-fadeInUp" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--primary)' }}>
                      <i className="fas fa-cart-plus text-[9px]" />
                      افزودن به سبد
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-0 rounded-xl overflow-hidden animate-bounceIn" style={{ border: '1px solid var(--border)', height: 34 }}>
                      <button onClick={() => updateCartQuantity(book.id, qty - 1)} className="h-full px-3 flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                        <i className={`fas ${qty === 1 ? 'fa-trash-can text-[9px]' : 'fa-minus text-[9px]'}`} />
                      </button>
                      <div className="flex-1 text-center text-[12px] font-black tabular-nums" style={{ color: 'var(--text)', background: 'var(--surface)', minWidth: 32 }}>
                        {toPersianDigits(String(qty))}
                      </div>
                      <button onClick={() => updateCartQuantity(book.id, qty + 1)} className="h-full px-3 flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                        <i className="fas fa-plus text-[9px]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════ NOTES SECTION ═══════════════ */}
      {notes.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 mb-12">
          {/* Header */}
          <div className="relative overflow-hidden rounded-3xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--surface-2)), color-mix(in srgb, #f97316 6%, var(--surface-2)))', border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)' }}>
            <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-10" style={{ background: 'var(--accent)' }}></div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10" style={{ background: '#f97316' }}></div>
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--accent), #f97316)' }}>
                <i className="fas fa-feather-alt text-white text-lg"></i>
              </div>
              <div>
                <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>یادداشت‌ها و مقالات</h2>
                <p className="text-[11px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>مجموعه نوشته‌های تخصصی و الهام‌بخش</p>
              </div>
              <div className="mr-auto px-3 py-1 rounded-full text-[10px] font-black" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                {toPersianDigits(notes.length)} مقاله
              </div>
            </div>
          </div>

          {/* Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.map((note, i) => (
              <div key={note.id} className="group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer active:scale-[0.97] hover:shadow-xl"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                onClick={() => setSelectedItem(note)}>
                {/* Gradient accent line */}
                <div className="absolute top-0 right-0 w-full h-1 transition-all duration-500 group-hover:h-1.5"
                  style={{ background: `linear-gradient(to left, var(--accent), #f97316, transparent)` }}></div>

                <div className="p-4 pt-5">
                  {/* Number badge */}
                  <div className="absolute top-4 left-4 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                    style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', color: 'var(--accent)' }}>
                    {toPersianDigits(i + 1)}
                  </div>

                  {/* Title */}
                  <h3 className="text-[13px] font-black leading-7 text-right line-clamp-2 mb-3 pr-10 transition-colors duration-300 group-hover:text-primary"
                    style={{ color: 'var(--text)' }}>
                    {note.title}
                  </h3>

                  {/* Meta */}
                  <div className="flex items-center justify-between flex-row-reverse">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black"
                        style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
                        {note.authorName?.charAt(0)}
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{note.authorName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                      style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}>
                      <i className="fas fa-calendar-alt text-[7px]" style={{ color: 'var(--accent)' }}></i>
                      <span className="text-[9px] font-black" style={{ color: 'var(--accent)' }}>{note.date || 'بی‌تاریخ'}</span>
                    </div>
                  </div>

                  {/* Description preview */}
                  {note.description && (
                    <p className="text-[10px] font-medium leading-5 mt-2.5 line-clamp-2 text-right" style={{ color: 'var(--text-3)' }}>
                      {note.description.replace(/<[^>]*>/g, '').slice(0, 100)}...
                    </p>
                  )}
                </div>

                {/* Bottom accent */}
                <div className="h-0.5 w-full transition-all duration-500 group-hover:h-1 group-hover:opacity-100 opacity-0"
                  style={{ background: 'linear-gradient(to left, var(--accent), #f97316, transparent)' }}></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════ NEWSLETTER CTA ═══════════════ */}
      <section>
        <div className="relative overflow-hidden p-6 md:p-8 text-center rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
          <div className="relative z-10">
            <i className="fas fa-envelope-open-text text-2xl mb-3" style={{ color: 'var(--primary)' }} />
            <h3 className="text-base md:text-lg font-black text-white mb-1">از تازه‌ترین کتاب‌ها باخبر شوید</h3>
            <p className="text-[11px] text-gray-400 mb-4 max-w-md mx-auto">برای دریافت اطلاع‌رسانی انتشار کتاب‌های جدید نشر سُها، در کانال ایتا عضو شوید</p>
            <a href="https://eitaa.com/sohabook" target="_blank" className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl text-sm font-black text-white transition-all active:scale-95" style={{ background: 'var(--primary)', boxShadow: '0 10px 30px var(--primary-glow)' }}>
              <i className="fab fa-telegram-plane" />
              عضویت در کانال ایتا
            </a>
          </div>
        </div>
      </section>

    </main>

    {/* ═══════════════ TOAST ═══════════════ */}
    {toast && (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9000] animate-fadeIn" dir="rtl">
        <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
            <i className={`fas ${toast.icon} text-[10px]`} style={{ color: 'var(--primary)' }} />
          </div>
          <p className="text-[11px] font-black whitespace-nowrap" style={{ color: 'var(--text)' }}>{toast.message}</p>
        </div>
      </div>
    )}

    {/* ═══════════════ MODALS ═══════════════ */}
    <CartModal items={cartItems} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onRemove={removeFromCart} onUpdateQuantity={updateCartQuantity} onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} />
    <CheckoutFlow items={cartItems} isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} onComplete={handleCheckoutComplete} walletBalance={walletBalance} onTopUp={topUpWallet} onDeduct={deductWallet} />
    
    {/* ═══ PROFILE MODAL ═══ */}
    {isProfileOpen && (
      <div className="fixed inset-0 z-[7000] animate-fadeIn flex items-end sm:items-center justify-center mb-20 sm:mb-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} dir="rtl">
        <div className="w-full max-w-[340px] rounded-3xl overflow-hidden animate-scaleIn max-h-[85vh] flex flex-col" style={{ background: 'var(--surface)', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>

          {/* ═══ HEADER ═══ */}
          <div className="relative px-5 pt-6 pb-5 text-center shrink-0">
            <button onClick={() => { resetWalletPay(); setIsProfileOpen(false); setIsEditingProfile(false); }} className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <i className="fas fa-xmark text-[11px]" style={{ color: 'var(--text-3)' }} />
            </button>
            <label className="relative w-[80px] h-[80px] rounded-full mx-auto mb-3 cursor-pointer group block">
              {user?.avatar ? (
                <img src={user.avatar} className="w-full h-full rounded-full object-cover ring-3 ring-offset-2" style={{ '--tw-ring-color': 'var(--primary)', '--tw-ring-offset-color': 'var(--surface)' } as any} alt="" />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center ring-3 ring-offset-2" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', '--tw-ring-color': 'var(--primary)', '--tw-ring-offset-color': 'var(--surface)' } as any}>
                  <i className="fas fa-user text-2xl text-white" />
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <i className="fas fa-camera text-white text-sm" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 256; canvas.height = 256;
                    const ctx = canvas.getContext('2d')!;
                    const m = Math.min(img.width, img.height);
                    ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 256, 256);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    if (user) {
                      updateProfile({ avatar: dataUrl }).catch(() => {});
                      onUpdateUser({ ...user, avatar: dataUrl });
                    }
                  };
                  img.src = ev.target?.result as string;
                };
                reader.readAsDataURL(file);
              }} />
            </label>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{isEditingProfile ? (editingName || 'کاربر نشر سُها') : (user?.name || 'کاربر نشر سُها')}</h3>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{isEditingProfile ? (editingPhone || user?.phoneNumber || '') : (user?.phoneNumber || '')}</p>
            <span className="inline-block mt-1.5 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
              {user?.role === 'admin' ? 'مدیر سایت' : user?.role === 'author' ? 'نویسنده' : 'کاربر'}
            </span>
          </div>

          <div className="h-px mx-5" style={{ background: 'var(--border)' }} />

          {/* ═══ CONTENT ═══ */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">

            {/* ACCOUNT INFO */}
            {walletPayStep === 'idle' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>اطلاعات حساب</p>
                  <button onClick={() => {
                    if (isEditingProfile) {
                      if (user) {
                        const newName = editingName.trim() || user.name;
                        updateProfile({ name: newName }).catch(() => {});
                        onUpdateUser({ ...user, name: newName });
                      }
                      setIsEditingProfile(false);
                    } else {
                      setEditingName(user?.name || '');
                      setEditingPhone(user?.phoneNumber || '');
                      setIsEditingProfile(true);
                    }
                  }} className="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95" style={{ background: isEditingProfile ? 'rgba(34,197,94,0.1)' : 'var(--surface-2)', color: isEditingProfile ? '#22c55e' : 'var(--text-3)', border: '1px solid var(--border)' }}>
                    <i className={`fas ${isEditingProfile ? 'fa-check' : 'fa-pen'} text-[8px] ml-1`} />
                    {isEditingProfile ? 'ذخیره' : 'ویرایش'}
                  </button>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {/* Name */}
                  <div className="px-3.5 py-3" style={{ background: 'var(--surface-2)' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>نام و نام خانوادگی</span>
                    {isEditingProfile ? (
                      <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl text-[12px] font-bold outline-none transition-all" style={{ background: 'var(--surface)', border: '1.5px solid var(--primary)', color: 'var(--text)', caretColor: 'var(--primary)' } as any} dir="rtl" placeholder="نام خود را وارد کنید" />
                    ) : (
                      <p className="text-[12px] font-bold mt-0.5" style={{ color: 'var(--text)' }}>{user?.name || '—'}</p>
                    )}
                  </div>
                  <div className="h-px" style={{ background: 'var(--border)' }} />
                  {/* Phone */}
                  <div className="px-3.5 py-3" style={{ background: 'var(--surface-2)' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>شماره تماس</span>
                    {isEditingProfile ? (
                      <input type="text" value={editingPhone} onChange={e => setEditingPhone(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl text-[12px] font-bold font-mono outline-none transition-all" style={{ background: 'var(--surface)', border: '1.5px solid var(--primary)', color: 'var(--text)', caretColor: 'var(--primary)' } as any} dir="ltr" placeholder="شماره تماس" />
                    ) : (
                      <p className="text-[12px] font-bold font-mono mt-0.5" dir="ltr" style={{ color: 'var(--text)' }}>{user?.phoneNumber || '—'}</p>
                    )}
                  </div>
                  <div className="h-px" style={{ background: 'var(--border)' }} />
                  {/* Role */}
                  <div className="px-3.5 py-3" style={{ background: 'var(--surface-2)' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>نقش</span>
                    <p className="text-[12px] font-bold mt-0.5" style={{ color: 'var(--text)' }}>{user?.role === 'admin' ? 'مدیر سایت' : user?.role === 'author' ? 'نویسنده' : 'کاربر عادی'}</p>
                  </div>
                </div>
                {/* Cancel when editing */}
                {isEditingProfile && (
                  <button onClick={() => setIsEditingProfile(false)} className="w-full mt-2 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 animate-fadeInUp" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                    انصراف
                  </button>
                )}
              </div>
            )}

            {/* WALLET + QUICK CHARGE */}
            {walletPayStep === 'idle' && (
              <div>
                <p className="text-[10px] font-bold mb-2" style={{ color: 'var(--text-3)' }}>کیف پول</p>
                <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-white/70 font-medium">موجودی</p>
                    <i className="fas fa-wallet text-white/50 text-sm" />
                  </div>
                  <p className="text-xl font-bold text-white">{toPersianDigits(walletBalance.toLocaleString('fa-IR'))} <span className="text-xs font-medium">تومان</span></p>
                </div>

                <p className="text-[10px] font-bold mt-3 mb-1.5" style={{ color: 'var(--text-3)' }}>شارژ سریع</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[100000, 200000, 500000, 1000000].map(a => (
                    <button key={a} onClick={() => { setWalletPayAmount(String(a)); setWalletPayStep('amount'); }} className="py-2 rounded-xl text-center transition-all active:scale-95" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text)' }}>{toPersianDigits(a.toLocaleString('fa-IR'))}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 mt-2 mb-2">
                  <input type="text" value={walletPayAmount} onChange={e => setWalletPayAmount(e.target.value)} placeholder="مبلغ دلخواه" className="flex-1 px-3 py-2 rounded-xl text-[11px] font-medium outline-none" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' } as any} />
                  <button onClick={() => { if ((parseInt(walletPayAmount.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[^0-9]/g, '')) || 0) >= 10000) setWalletPayStep('amount'); }} disabled={(parseInt(walletPayAmount.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[^0-9]/g, '')) || 0) < 10000} className="px-4 py-2 rounded-xl text-[10px] font-bold text-white transition-all active:scale-95 disabled:opacity-30" style={{ background: '#f59e0b' }}>شارژ</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    )}

    {/* ═══ FULL-SCREEN WALLET PAYMENT ═══ */}
    {walletPayStep !== 'idle' && (
      <WalletPaymentPage
        step={walletPayStep}
        amount={walletPayAmount}
        cardNumber={walletCardNumber}
        cvv2={walletCardCvv2}
        expMonth={walletCardExpMonth}
        expYear={walletCardExpYear}
        captcha={walletCaptcha}
        captchaCode={walletCaptchaCode}
        otp={walletOtp}
        otpTimer={walletOtpTimer}
        walletBalance={walletBalance}
        otpRefs={walletOtpRefs}
        onCardNumberChange={setWalletCardNumber}
        onCvv2Change={setWalletCardCvv2}
        onExpMonthChange={setWalletCardExpMonth}
        onExpYearChange={setWalletCardExpYear}
        onCaptchaChange={setWalletCaptcha}
        onCaptchaRefresh={() => { const c = String(Math.floor(1000 + Math.random() * 9000)); setWalletCaptchaCode(c); setWalletCaptcha(''); }}
        onOtpChange={(i, v) => { const n = [...walletOtp]; n[i] = v; setWalletOtp(n); }}
        onSendOtp={walletSendOtp}
        onVerify={walletVerifyOtp}
        onBack={resetWalletPay}
        onDone={() => { resetWalletPay(); setIsProfileOpen(false); setIsEditingProfile(false); }}
        formatCard={formatWalletCard}
      />
    )}
    </>
  );
};

export default NashrPage;

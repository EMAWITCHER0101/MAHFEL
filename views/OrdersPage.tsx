
import React, { useState, useEffect, useRef } from 'react';
import { toPersianDigits } from '../utils/helpers';
import type { PublishedBook } from '../types';

export interface Order {
  id: number;
  orderNumber: string;
  items: Array<{ title: string; cover?: string; price?: string; quantity: number }>;
  totalPrice: number;
  paymentMethod: string;
  cardLast4?: string;
  transferDate?: string;
  transferTime?: string;
  trackingCode?: string;
  date: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface ReadingProgress {
  bookTitle: string;
  currentPage: number;
  totalPages: number;
  lastRead: string;
  bookmarks: number[];
}

interface OrdersPageProps {
  orders: Order[];
  publishedBooks: PublishedBook[];
  onBack: () => void;
  onReadBook?: (book: PublishedBook, page?: number) => void;
}

const OrdersPage: React.FC<OrdersPageProps> = ({ orders, publishedBooks, onBack, onReadBook }) => {
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>(() => {
    try { return JSON.parse(localStorage.getItem('soha_reading_progress') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('soha_reading_progress', JSON.stringify(readingProgress));
  }, [readingProgress]);

  const getProgress = (title: string) => readingProgress.find(p => p.bookTitle === title);

  const findBook = (title: string): PublishedBook | undefined =>
    publishedBooks.find(b => b.title === title || b.id === title);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return toPersianDigits(d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    } catch { return iso; }
  };

  const paymentLabels: Record<string, { icon: string; label: string }> = {
    'card-to-card': { icon: 'fa-exchange-alt', label: 'کارت به کارت' },
    'online': { icon: 'fa-globe', label: 'پرداخت آنلاین' },
    'wallet': { icon: 'fa-wallet', label: 'کیف پول' },
  };

  const totalBooks = orders.reduce((sum, o) => sum + o.items.length, 0);
  const confirmedBooks = orders.filter(o => o.status === 'confirmed').reduce((sum, o) => sum + o.items.length, 0);

  return (
    <div className="min-h-screen animate-fadeIn" style={{ background: 'var(--surface)' }} dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4" style={{ background: 'color-mix(in srgb, var(--surface) 92%, transparent)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={onBack} className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <i className="fas fa-arrow-right text-base" style={{ color: 'var(--text-2)' }} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
              <i className="fas fa-receipt text-sm text-white" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black" style={{ color: 'var(--text)' }}>مطالعات من</h1>
              {orders.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>{toPersianDigits(String(orders.length))}</span>
              )}
            </div>
          </div>
          <div className="w-11" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, transparent), color-mix(in srgb, var(--secondary) 10%, transparent))', border: '2px dashed var(--border)' }}>
                <i className="fas fa-receipt text-3xl" style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '2px solid var(--surface)' }}>
                <i className="fas fa-times text-xs" style={{ color: 'var(--text-3)' }} />
              </div>
            </div>
            <p className="text-sm font-black mb-1" style={{ color: 'var(--text)' }}>هنوز مطالعه‌ای ثبت نکرده‌اید</p>
            <p className="text-xs leading-relaxed max-w-[240px]" style={{ color: 'var(--text-3)' }}>کتاب‌های مورد علاقه خود را از نشر سُها تهیه کنید و اینجا مشاهده کنید</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-2xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="text-lg font-black" style={{ color: 'var(--primary)' }}>{toPersianDigits(String(orders.length))}</p>
                <p className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>کل مطالعات</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="text-lg font-black" style={{ color: '#22c55e' }}>{toPersianDigits(String(confirmedBooks))}</p>
                <p className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>کتاب قابل مطالعه</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="text-lg font-black" style={{ color: 'var(--secondary)' }}>{toPersianDigits(String(readingProgress.length))}</p>
                <p className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>در حال مطالعه</p>
              </div>
            </div>

            {/* Continue Reading */}
            {readingProgress.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-black mb-3" style={{ color: 'var(--text)' }}>ادامه مطالعه</h3>
                <div className="space-y-2">
                  {readingProgress.map((prog, i) => {
                    const book = findBook(prog.bookTitle);
                    const pct = prog.totalPages > 0 ? Math.round(((prog.currentPage + 1) / prog.totalPages) * 100) : 0;
                    return (
                      <button key={i} onClick={() => book && onReadBook?.(book, prog.currentPage)} className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <div className="relative w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                          {book?.cover ? (
                            <img src={book.cover} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                              <i className="fas fa-book text-white text-xs" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                          </div>
                        </div>
                        <div className="flex-1 text-right min-w-0">
                          <p className="text-[12px] font-black line-clamp-1" style={{ color: 'var(--text)' }}>{prog.bookTitle}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--border)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                            </div>
                            <span className="text-[9px] font-bold tabular-nums" style={{ color: 'var(--text-3)' }}>{toPersianDigits(String(pct))}%</span>
                          </div>
                          <p className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>صفحه {toPersianDigits(String(prog.currentPage + 1))} از {toPersianDigits(String(prog.totalPages))}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Orders List */}
            <div className="space-y-4">
              {orders.map((order, orderIdx) => {
                const paymentInfo = paymentLabels[order.paymentMethod] || paymentLabels['card-to-card'];
                const isExpanded = expandedOrder === order.id;
                return (
                  <div key={order.id} className="rounded-2xl overflow-hidden animate-fadeInUp" style={{ animationDelay: `${orderIdx * 60}ms`, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {/* Order Header */}
                    <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="w-full p-4 border-b text-right" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: order.status === 'confirmed' ? 'color-mix(in srgb, #22c55e 15%, transparent)' : order.status === 'pending' ? 'color-mix(in srgb, #f59e0b 15%, transparent)' : 'color-mix(in srgb, #ef4444 15%, transparent)' }}>
                            <i className={`fas ${order.status === 'confirmed' ? 'fa-check' : order.status === 'pending' ? 'fa-clock' : 'fa-times'} text-[10px]`} style={{ color: order.status === 'confirmed' ? '#22c55e' : order.status === 'pending' ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>شماره سفارش</p>
                            <p className="text-xs font-black font-mono" style={{ color: 'var(--text)' }}>{order.orderNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <p className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{formatDate(order.date)}</p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black mt-1 ${order.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                              {order.status === 'confirmed' ? 'تایید شده' : order.status === 'pending' ? 'در انتظار' : 'لغو شده'}
                            </span>
                          </div>
                          <i className={`fas fa-chevron-down text-[10px] transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--text-3)' }} />
                        </div>
                      </div>
                    </button>

                    {/* Order Items */}
                    {isExpanded && (
                      <div className="p-4 space-y-2.5 animate-fadeIn">
                        {order.items.map((item, idx) => {
                          const book = findBook(item.title);
                          const progress = getProgress(item.title);
                          const pct = progress && progress.totalPages > 0 ? Math.round(((progress.currentPage + 1) / progress.totalPages) * 100) : 0;
                          return (
                            <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                              <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                                {item.cover ? (
                                  <img src={item.cover} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                                    <i className="fas fa-book text-white text-xs" />
                                  </div>
                                )}
                                <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-black/15" />
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <p className="text-[12px] font-black line-clamp-1" style={{ color: 'var(--text)' }}>{item.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>تعداد: {toPersianDigits(String(item.quantity))}</p>
                                  {progress && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
                                      {toPersianDigits(String(pct))}% خوانده شده
                                    </span>
                                  )}
                                </div>
                                {progress && (
                                  <div className="h-1 rounded-full mt-1.5" style={{ background: 'var(--border)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <p className="text-[11px] font-black tabular-nums" style={{ color: 'var(--primary)' }}>{toPersianDigits(item.price || '۰')}</p>
                                {order.status === 'confirmed' && book && onReadBook && (
                                  <button onClick={() => onReadBook(book)} className="px-2.5 py-1.5 rounded-xl text-[9px] font-black flex items-center gap-1 active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, var(--secondary)))', color: 'white', boxShadow: '0 4px 15px var(--primary-glow)' }}>
                                    <i className="fas fa-book-open text-[7px]" />
                                    {progress ? 'ادامه' : 'شروع'}
                                  </button>
                                )}
                                {order.status === 'confirmed' && !book && (
                                  <span className="px-2.5 py-1.5 rounded-xl text-[9px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                                    ناموجود
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Order Footer (always visible) */}
                    <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <i className={`fas ${paymentInfo.icon} text-[9px]`} style={{ color: 'var(--text-3)' }} />
                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>
                          {paymentInfo.label}
                          {order.cardLast4 && <span className="font-mono"> ••••{order.cardLast4}</span>}
                        </span>
                      </div>
                      <span className="text-[11px] font-black tabular-nums" style={{ color: 'var(--text)' }}>{toPersianDigits(order.totalPrice.toLocaleString('fa-IR'))} <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>تومان</span></span>
                    </div>

                    {/* Transfer info + pending note */}
                    {isExpanded && order.paymentMethod === 'card-to-card' && (
                      <div className="px-4 pb-4 space-y-2 animate-fadeIn">
                        {order.status === 'pending' && (
                          <div className="p-3 rounded-xl flex items-center gap-2.5" style={{ background: 'color-mix(in srgb, #f59e0b 10%, var(--surface))', border: '1px solid color-mix(in srgb, #f59e0b 20%, var(--border))' }}>
                            <i className="fas fa-hourglass-half text-[10px]" style={{ color: '#f59e0b' }} />
                            <p className="text-[10px] font-black" style={{ color: '#b45309' }}>در انتظار بررسی و تایید ادمین — پس از تایید، کتاب قابل مطالعه می‌شود</p>
                          </div>
                        )}
                        {(order.transferDate || order.transferTime) && (
                          <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <p className="text-[9px] font-black mb-1.5" style={{ color: 'var(--text-3)' }}><i className="fas fa-receipt text-[7px] ml-1" />اطلاعات انتقال ثبت‌شده</p>
                            <div className="grid grid-cols-2 gap-y-1.5 text-[10px] font-bold" style={{ color: 'var(--text-2)' }}>
                              {order.transferDate && <span>تاریخ: {toPersianDigits(order.transferDate)}</span>}
                              {order.transferTime && <span>ساعت: {toPersianDigits(order.transferTime)}</span>}
                              {order.trackingCode && <span className="col-span-2" dir="ltr">کد پیگیری: <span className="font-mono">{toPersianDigits(order.trackingCode)}</span></span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;

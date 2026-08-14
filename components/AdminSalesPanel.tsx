import { useState, useEffect, useCallback } from 'react';
import { toPersianDigits } from '../utils/helpers';
import { adminGetPurchaseStats, adminGetExpenses, adminCreateExpense, adminDeleteExpense, PurchaseStats, Expense } from '../services/api';
import { AreaTrendChart, DonutChart, RankBars } from './AdminCharts';

const PERIODS: { v: string; l: string }[] = [
  { v: '7d', l: '۷ روز' },
  { v: '30d', l: '۳۰ روز' },
  { v: '90d', l: '۹۰ روز' },
  { v: 'all', l: 'همه' },
];

const faNum = (n: number): string => toPersianDigits(n.toLocaleString('fa-IR'));

function faShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'numeric' }).format(d);
  } catch {
    return toPersianDigits(dateStr);
  }
}

export default function AdminSalesPanel() {
  const [period, setPeriod] = useState('30d');
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  // فرم هزینه
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expNote, setExpNote] = useState('');
  const [expSaving, setExpSaving] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async (p = period) => {
    setLoading(true);
    setErr('');
    const [s, ex] = await Promise.all([adminGetPurchaseStats(p), adminGetExpenses(p)]);
    if (s) setStats(s); else setErr('خطا در دریافت آمار فروش');
    if (ex) setExpenses(ex);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  const addExpense = async () => {
    const title = expTitle.trim();
    const amount = Number(String(expAmount).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
    if (!title) { showToast('عنوان هزینه را وارد کنید', 'error'); return; }
    if (!Number.isFinite(amount) || amount <= 0) { showToast('مبلغ نامعتبر است', 'error'); return; }
    setExpSaving(true);
    const r = await adminCreateExpense({ title, amount, note: expNote.trim() });
    setExpSaving(false);
    if (r) {
      showToast('هزینه ثبت شد ✅');
      setExpTitle(''); setExpAmount(''); setExpNote('');
      load();
    } else {
      showToast('خطا در ثبت هزینه', 'error');
    }
  };

  const removeExpense = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); setTimeout(() => setConfirmId(c => (c === id ? null : c)), 3000); return; }
    setConfirmId(null);
    const r = await adminDeleteExpense(id);
    if (r) { showToast('هزینه حذف شد'); load(); }
    else showToast('خطا در حذف هزینه', 'error');
  };

  const totalOrders = stats ? stats.totals.confirmed.count + stats.totals.pending.count + stats.totals.rejected.count : 0;
  const confirmedSum = stats?.totals.confirmed.sum || 0;
  const pendingSum = stats?.totals.pending.sum || 0;
  const rejectedSum = stats?.totals.rejected.sum || 0;
  const expenseSum = stats?.expenses.sum || 0;
  const netProfit = stats?.netProfit ?? 0;
  const profitPercent = confirmedSum > 0 ? Math.round((netProfit / confirmedSum) * 100) : 0;
  const profitRatio = confirmedSum > 0 ? Math.min(1, Math.max(0, netProfit / confirmedSum)) : 0;

  const kpis = [
    { label: 'کل سفارش‌ها', value: faNum(totalOrders), icon: 'fa-receipt', color: '#2563eb', sub: `${faNum(stats?.totals.confirmed.count || 0)} تایید شده` },
    { label: 'فروش تایید شده', value: faNum(confirmedSum), icon: 'fa-bag-shopping', color: '#10b981', sub: 'تومان' },
    { label: 'در انتظار بررسی', value: faNum(pendingSum), icon: 'fa-hourglass-half', color: '#f59e0b', sub: `${faNum(stats?.totals.pending.count || 0)} سفارش` },
    { label: 'رد شده', value: faNum(rejectedSum), icon: 'fa-xmark', color: '#ef4444', sub: `${faNum(stats?.totals.rejected.count || 0)} سفارش` },
    { label: 'هزینه‌ها', value: faNum(expenseSum), icon: 'fa-arrow-trend-down', color: '#ec4899', sub: `${faNum(stats?.expenses.count || 0)} مورد` },
    { label: 'سود خالص', value: faNum(netProfit), icon: 'fa-sack-dollar', color: netProfit >= 0 ? '#10b981' : '#ef4444', sub: `${profitPercent >= 0 ? '' : ''}${faNum(Math.abs(profitPercent))}% فروش` },
  ];

  const statusRows = [
    { label: 'تایید شده', count: stats?.totals.confirmed.count || 0, sum: confirmedSum, color: '#10b981', icon: 'fa-circle-check' },
    { label: 'در انتظار', count: stats?.totals.pending.count || 0, sum: pendingSum, color: '#f59e0b', icon: 'fa-hourglass-half' },
    { label: 'رد شده', count: stats?.totals.rejected.count || 0, sum: rejectedSum, color: '#ef4444', icon: 'fa-circle-xmark' },
  ];

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4">
      {/* هدر + بازه */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm" style={{ background: 'var(--primary)' }}>
            <i className="fas fa-chart-line text-[13px]"></i>
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-800">آمار فروش، سود و هزینه‌ها</h3>
            <p className="text-[9px] text-gray-400 font-bold">محاسبه خودکار از درخواست‌های خرید — رفرش خودکار هر ۱۵ ثانیه</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-black transition-all active:scale-95 ${period === p.v ? 'text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              style={{ background: period === p.v ? 'var(--primary)' : undefined }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-500 text-[10px] font-black rounded-xl px-4 py-3"><i className="fas fa-triangle-exclamation ml-1"></i>{err}</div>}

      {/* کارت‌های شاخص */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border shadow-sm p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-400">{k.label}</span>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px]" style={{ background: k.color, opacity: 0.9 }}>
                <i className={`fas ${k.icon}`}></i>
              </span>
            </div>
            <span className="text-[15px] font-black tabular-nums leading-none" style={{ color: k.color }}>{k.value}</span>
            <span className="text-[8px] font-bold text-gray-300">{k.sub}</span>
          </div>
        ))}
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-black"><i className="fas fa-spinner fa-spin"></i> در حال محاسبه…</div>
        </div>
      ) : (
        <>
          {/* نمودارها */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black text-gray-500 flex items-center gap-2">
                  <i className="fas fa-chart-area" style={{ color: '#10b981' }}></i> فروش روزانه (تایید شده)
                </h4>
                <span className="text-[9px] font-black text-gray-400">{faNum(confirmedSum)} تومان در این بازه</span>
              </div>
              <AreaTrendChart data={(stats?.daily || []).map(d => ({ label: faShortDate(d.date), value: d.value }))} color="#10b981" suffix=" ت" height={170} />
            </div>
            <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5 flex flex-col items-center">
              <h4 className="text-[10px] font-black text-gray-500 self-start mb-3 flex items-center gap-2">
                <i className="fas fa-chart-pie" style={{ color: '#8b5cf6' }}></i> سهم وضعیت سفارش‌ها
              </h4>
              <DonutChart
                title="مبلغ کل"
                centerValue={faNum(confirmedSum + pendingSum + rejectedSum)}
                centerLabel="تومان"
                data={[
                  { label: 'تایید شده', value: confirmedSum, color: '#10b981' },
                  { label: 'در انتظار', value: pendingSum, color: '#f59e0b' },
                  { label: 'رد شده', value: rejectedSum, color: '#ef4444' },
                ]}
              />
              <div className="w-full mt-4 space-y-1.5">
                {statusRows.map(r => (
                  <div key={r.label} className="flex items-center justify-between text-[9px] font-black text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: r.color }}></span>{r.label}<span className="text-gray-300">({faNum(r.count)})</span></span>
                    <span className="tabular-nums" style={{ color: r.color }}>{faNum(r.sum)} ت</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* سود خالص */}
          <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <h4 className="text-[10px] font-black text-gray-500 flex items-center gap-2">
                <i className="fas fa-scale-balanced" style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }}></i> محاسبه سود خالص
              </h4>
              <span className="text-[9px] font-bold text-gray-400">سود خالص = فروش تایید شده − هزینه‌ها</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="h-3 flex-1 min-w-[220px] rounded-full overflow-hidden bg-gray-100" dir="ltr">
                <div className="h-full rounded-full" style={{ width: `${profitRatio * 100}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', transition: 'width .8s cubic-bezier(.4,0,.2,1)' }}></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[8px] font-black text-gray-300">فروش</p>
                  <p className="text-[11px] font-black tabular-nums text-green-600">{faNum(confirmedSum)}</p>
                </div>
                <span className="text-gray-300 text-[10px] font-black">−</span>
                <div className="text-center">
                  <p className="text-[8px] font-black text-gray-300">هزینه‌ها</p>
                  <p className="text-[11px] font-black tabular-nums text-pink-500">{faNum(expenseSum)}</p>
                </div>
                <span className="text-gray-300 text-[10px] font-black">=</span>
                <div className="text-center px-3 py-1.5 rounded-xl" style={{ background: netProfit >= 0 ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)' }}>
                  <p className="text-[8px] font-black" style={{ color: netProfit >= 0 ? '#059669' : '#dc2626' }}>سود خالص</p>
                  <p className="text-[13px] font-black tabular-nums" style={{ color: netProfit >= 0 ? '#059669' : '#dc2626' }}>{faNum(netProfit)} تومان</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* پرفروش‌ترین کتاب‌ها */}
            <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
              <h4 className="text-[10px] font-black text-gray-500 mb-3 flex items-center gap-2">
                <i className="fas fa-trophy" style={{ color: '#f59e0b' }}></i> پرفروش‌ترین کتاب‌ها (تایید شده)
              </h4>
              <RankBars
                color="#8b5cf6"
                barColor2="#c4b5fd"
                valueSuffix="تومان"
                data={(stats?.topBooks || []).map(b => ({ title: b.title, value: b.revenue, subtitle: `${faNum(b.qty)} نسخه` }))}
              />
            </div>

            {/* فروش هر کتاب + خریداران */}
            <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black text-gray-500 flex items-center gap-2">
                  <i className="fas fa-users" style={{ color: '#2563eb' }}></i> فروش هر کتاب و خریداران
                </h4>
                <span className="text-[9px] font-black text-gray-400">{faNum((stats?.books || []).length)} کتاب</span>
              </div>
              {(stats?.books || []).length === 0 ? (
                <p className="text-[9px] text-gray-300 text-center py-6">هنوز فروشی ثبت نشده است</p>
              ) : (
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pl-1">
                  {stats!.books.map(b => {
                    const open = expandedBook === b.title;
                    return (
                      <div key={b.title} className="rounded-xl border border-gray-100 overflow-hidden">
                        <button onClick={() => setExpandedBook(open ? null : b.title)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-right">
                          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-[10px] shrink-0"><i className="fas fa-book"></i></span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-gray-700 truncate">{b.title}</p>
                            <p className="text-[8px] font-bold text-gray-400">{faNum(b.orders)} سفارش • {faNum(b.buyers.length)} خریدار</p>
                          </div>
                          <div className="text-left shrink-0">
                            <p className="text-[10px] font-black tabular-nums text-blue-600">{faNum(b.qty)} نسخه</p>
                            <p className="text-[8px] font-bold tabular-nums text-gray-400">{faNum(b.revenue)} ت</p>
                          </div>
                          <i className={`fas fa-chevron-down text-[8px] text-gray-300 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}></i>
                        </button>
                        {open && (
                          <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-2 space-y-1.5">
                            {b.buyers.map((by, i) => (
                              <div key={i} className="flex items-center gap-2 text-[9px] font-bold text-gray-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                                <span className="truncate">{by.name}</span>
                                <span className="text-gray-400 font-mono shrink-0" dir="ltr">{by.phone ? String(by.phone).slice(0, 6) + '•••' + String(by.phone).slice(-2) : ''}</span>
                                <span className="text-gray-300 shrink-0">× {faNum(by.qty)}</span>
                                <span className="text-gray-300 shrink-0 mr-auto">{faShortDate(by.date)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* هزینه‌ها */}
            <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black text-gray-500 flex items-center gap-2">
                  <i className="fas fa-file-invoice-dollar" style={{ color: '#ec4899' }}></i> هزینه‌های این بازه
                  <span className="bg-pink-50 text-pink-500 rounded-full px-2 py-0.5 text-[8px] font-black">{faNum(expenseSum)} تومان</span>
                </h4>
              </div>

              {/* فرم ثبت هزینه */}
              <div className="bg-pink-50/50 border border-pink-100 rounded-xl p-3 mb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="عنوان (مثلاً چاپ کتاب)"
                    className="bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-[10px] text-gray-700 focus:ring-2 focus:ring-pink-200 outline-none" />
                  <input value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="مبلغ (تومان)" dir="ltr"
                    className="bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-[10px] text-gray-700 focus:ring-2 focus:ring-pink-200 outline-none text-left" />
                </div>
                <input value={expNote} onChange={e => setExpNote(e.target.value)} placeholder="توضیح (اختیاری)"
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-[10px] text-gray-700 focus:ring-2 focus:ring-pink-200 outline-none" />
                <button onClick={addExpense} disabled={expSaving}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white text-[10px] font-black transition-all active:scale-95 ${expSaving ? 'bg-gray-300' : 'bg-pink-500 hover:bg-pink-600'}`}>
                  {expSaving ? <><i className="fas fa-spinner fa-spin"></i> در حال ثبت…</> : <><i className="fas fa-plus"></i> ثبت هزینه</>}
                </button>
              </div>

              {/* لیست هزینه‌ها */}
              {!expenses || expenses.length === 0 ? (
                <p className="text-[9px] text-gray-300 text-center py-6">هزینه‌ای در این بازه ثبت نشده است</p>
              ) : (
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pl-1">
                  {expenses.map(e => (
                    <div key={e._id} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2">
                      <span className="w-7 h-7 rounded-lg bg-pink-100 text-pink-500 flex items-center justify-center text-[10px]"><i className="fas fa-coins"></i></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-gray-700 truncate">{e.title}</p>
                        <p className="text-[8px] text-gray-400 truncate">{e.note || faShortDate(e.date || e.createdAt || '')}</p>
                      </div>
                      <span className="text-[10px] font-black tabular-nums text-pink-500 shrink-0">{faNum(e.amount)}</span>
                      <button onClick={() => removeExpense(e._id)}
                        className={`shrink-0 w-6 h-6 rounded-lg text-[9px] font-black transition-all active:scale-90 ${confirmId === e._id ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-400 hover:bg-red-100 hover:text-red-500'}`}>
                        {confirmId === e._id ? <i className="fas fa-check"></i> : <i className="fas fa-trash"></i>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-1/2 translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-white text-[10px] font-black shadow-2xl flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>{toast.message}
        </div>
      )}
    </div>
  );
}

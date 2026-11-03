import { forwardRef } from 'react';
import { useCompanySettings } from '../../features/settings/useSettings';
import { getReceiptText } from '../../utils/receiptDictionary';
import { ReceiptBarcode, ReceiptQrCode } from './ReceiptBarcodeQr';

const fmt = (n) => new Intl.NumberFormat('en-LK', {
    style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(n || 0);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—';

/**
 * Modern Trilingual Thermal Receipt (80mm standard POS width)
 * Supports 'en', 'si', 'ta' languages.
 */
const ThermalReceipt = forwardRef(({
    invoice,
    payments = [],
    companyInfo: propCompanyInfo,
    lang = 'en'
}, ref) => {
    const { data: settingsRes } = useCompanySettings();

    if (!invoice) return null;

    const t = getReceiptText(lang);
    const s = settingsRes?.data || {};

    const companyInfo = propCompanyInfo?.name ? propCompanyInfo : {
        name: s.companyName || 'AsipBook Store',
        address: s.address || 'Colombo, Sri Lanka',
        phone: s.phone || '+94 11 234 5678',
        taxNumber: s.taxRegistrationNumber,
        email: s.email,
        website: s.website,
        footerMessage: s.receiptFooterMessage || '',
        logo: s.logoUrl || propCompanyInfo?.logo || '/asipbook-logo.png'
    };

    const customer = invoice.customerSnapshot || {};

    // Calculate total payments made if payments array provided, else fallback to invoice fields
    const paymentAllocated = payments.reduce((sum, p) => {
        const alloc = p.allocations?.find((a) =>
            (a.documentId?._id?.toString() || a.documentId?.toString()) === invoice._id.toString()
        );
        return sum + (alloc?.amount || 0);
    }, 0);

    const paidAmount = paymentAllocated > 0
        ? paymentAllocated
        : (invoice.amountPaid !== undefined && invoice.amountPaid > 0 ? invoice.amountPaid : invoice.grandTotal);

    const balanceDue = Math.max(0, (invoice.balanceDue !== undefined ? invoice.balanceDue : (invoice.grandTotal - paidAmount)));

    // Calculate line discounts and overall savings
    let calculatedItemDiscounts = 0;
    let totalItemsCount = 0;
    let totalQuantity = 0;

    (invoice.items || []).forEach((item) => {
        const qty = item.quantity || 0;
        const price = item.unitPrice || 0;
        const lineSub = qty * price;
        const lineDisc = item.lineDiscount ?? ((lineSub * ((item.discountPercent || 0) / 100)) + (item.discountAmount || 0));
        calculatedItemDiscounts += (lineDisc || 0);
        totalItemsCount += 1;
        totalQuantity += qty;
    });

    const itemDiscTotal = invoice.totalDiscount !== undefined && invoice.totalDiscount > 0
        ? invoice.totalDiscount
        : calculatedItemDiscounts;
    const orderDisc = invoice.orderDiscount?.amount || 0;
    const couponDisc = invoice.coupon?.discountAmount || 0;
    const loyaltyDisc = invoice.loyaltyDiscount?.discountAmount || 0;

    const totalSavings = itemDiscTotal + orderDisc + couponDisc + loyaltyDisc;

    // Payment method translation
    const methodKey = (invoice.paymentMethod || 'cash').toLowerCase();
    const paymentMethodLabel = t[methodKey] || invoice.paymentMethod?.toUpperCase() || t.cash;

    return (
        <div
            ref={ref}
            className="print-thermal-container bg-white text-black mx-auto select-none"
            style={{
                width: '80mm',
                maxWidth: '100%',
                padding: '14px 12px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Sinhala", "Iskoola Pota", "Noto Sans Tamil", sans-serif',
                fontSize: '12px',
                lineHeight: 1.35,
            }}
        >
            <style type="text/css" media="print">
                {`
                    @page { size: 80mm auto; margin: 0; }
                    html, body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        width: 80mm;
                        background: #fff;
                    }
                    .print-thermal-container {
                        width: 80mm !important;
                        margin: 0 !important;
                        padding: 8px 10px !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                `}
            </style>

            {/* Header / Brand */}
            <div className="text-center mb-3">
                {companyInfo.logo && (
                    <div className="mb-2 flex justify-center">
                        <img
                            src={companyInfo.logo}
                            alt="Logo"
                            className="max-w-[120px] max-h-[60px] object-contain grayscale"
                        />
                    </div>
                )}
                <h1 className="text-base font-black tracking-wide uppercase text-gray-950">
                    {companyInfo.name}
                </h1>
                <div className="text-[11px] text-gray-700 font-medium space-y-0.5 mt-1">
                    {companyInfo.address && <div>{companyInfo.address}</div>}
                    <div className="flex justify-center gap-2 flex-wrap">
                        {companyInfo.phone && <span>{t.tel}: {companyInfo.phone}</span>}
                        {companyInfo.email && <span>{companyInfo.email}</span>}
                    </div>
                    {companyInfo.taxNumber && (
                        <div className="font-bold text-[10px] uppercase tracking-wider text-black mt-0.5">
                            {t.vatNo}: {companyInfo.taxNumber}
                        </div>
                    )}
                </div>

                <div className="inline-block mt-2 px-3 py-0.5 border border-black rounded-full font-bold text-[10px] uppercase tracking-wider">
                    {t.posReceipt}
                </div>
            </div>

            {/* Double Border Separator */}
            <div className="border-t-2 border-b border-black py-0.5 my-2"></div>

            {/* Receipt Meta Details */}
            <div className="text-[11px] space-y-1 font-medium text-gray-800">
                <div className="flex justify-between items-center">
                    <span className="text-gray-500 uppercase text-[10px] font-semibold">{t.receiptNo}</span>
                    <span className="font-black text-black text-xs font-mono">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-500 uppercase text-[10px] font-semibold">{t.date}</span>
                    <span>{formatDate(invoice.invoiceDate)}</span>
                </div>
                {invoice.cashierName && (
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 uppercase text-[10px] font-semibold">{t.cashier}</span>
                        <span className="font-semibold">{invoice.cashierName}</span>
                    </div>
                )}
                {customer.name && (
                    <div className="flex justify-between items-start pt-0.5 border-t border-dotted border-gray-300">
                        <span className="text-gray-500 uppercase text-[10px] font-semibold">{t.customer}</span>
                        <div className="text-right">
                            <span className="font-bold text-gray-900">{customer.name}</span>
                            {customer.phone && <div className="text-[10px] text-gray-600 font-mono">{customer.phone}</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-black my-2"></div>

            {/* Items Header */}
            <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-gray-600 tracking-wider mb-1.5 pb-1 border-b border-gray-300">
                <div className="col-span-7">{t.itemDescription}</div>
                <div className="col-span-2 text-right">{t.qty}</div>
                <div className="col-span-3 text-right">{t.amount}</div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 mb-3">
                {(invoice.items || []).map((item, idx) => {
                    const qty = item.quantity || 0;
                    const price = item.unitPrice || 0;
                    const lineSub = qty * price;
                    const lineDisc = item.lineDiscount ?? ((lineSub * ((item.discountPercent || 0) / 100)) + (item.discountAmount || 0));
                    const lineTotal = Math.max(0, lineSub - lineDisc);

                    return (
                        <div key={idx} className="leading-tight text-[11px]">
                            <div className="font-bold text-gray-950 flex justify-between">
                                <span className="pr-1">{item.productName || item.description}</span>
                                {item.unit && <span className="text-[9px] font-normal text-gray-500">({item.unit})</span>}
                            </div>
                            <div className="grid grid-cols-12 text-gray-700 mt-0.5 text-[10px]">
                                <div className="col-span-7 text-gray-500 font-mono">
                                    {qty} × {fmt(price)}
                                </div>
                                <div className="col-span-2 text-right font-semibold">
                                    {qty}
                                </div>
                                <div className="col-span-3 text-right font-bold text-black font-mono">
                                    {fmt(lineTotal)}
                                </div>
                            </div>
                            {lineDisc > 0 && (
                                <div className="text-[9px] text-emerald-800 font-medium pl-1 italic">
                                    {t.discount}: {item.discountPercent > 0 ? `${item.discountPercent}% ` : ''}(-{fmt(lineDisc)})
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Item summary counter */}
            <div className="flex justify-between text-[10px] text-gray-500 py-1 border-t border-dotted border-gray-400">
                <span>{t.itemsCount}: <strong>{totalItemsCount}</strong></span>
                <span>{t.totalQty}: <strong>{totalQuantity}</strong></span>
            </div>

            {/* Separator */}
            <div className="border-t-2 border-black my-2"></div>

            {/* Totals Section */}
            <div className="text-[11px] space-y-1 font-medium">
                <div className="flex justify-between text-gray-700">
                    <span>{t.subtotal}</span>
                    <span className="font-mono">{fmt(invoice.subtotal)}</span>
                </div>

                {itemDiscTotal > 0 && (
                    <div className="flex justify-between text-gray-700">
                        <span>{t.itemDiscount}</span>
                        <span className="font-mono text-emerald-800 font-semibold">-{fmt(itemDiscTotal)}</span>
                    </div>
                )}

                {orderDisc > 0 && (
                    <div className="flex justify-between text-gray-700">
                        <span>{t.orderDiscount} {invoice.orderDiscount?.value ? `(${invoice.orderDiscount.value}%)` : ''}</span>
                        <span className="font-mono text-emerald-800 font-semibold">-{fmt(orderDisc)}</span>
                    </div>
                )}

                {couponDisc > 0 && (
                    <div className="flex justify-between text-gray-700">
                        <span>{t.couponDiscount} ({invoice.coupon?.code})</span>
                        <span className="font-mono text-emerald-800 font-semibold">-{fmt(couponDisc)}</span>
                    </div>
                )}

                {loyaltyDisc > 0 && (
                    <div className="flex justify-between text-gray-700">
                        <span>{t.pointsUsed} ({invoice.loyaltyDiscount?.pointsRedeemed} pts)</span>
                        <span className="font-mono text-emerald-800 font-semibold">-{fmt(loyaltyDisc)}</span>
                    </div>
                )}

                {invoice.bankPromo?.discountAmount > 0 && (
                    <div className="flex justify-between text-gray-700">
                        <span>💳 Bank Promo ({invoice.bankPromo.bankName})</span>
                        <span className="font-mono text-emerald-800 font-semibold">-{fmt(invoice.bankPromo.discountAmount)}</span>
                    </div>
                )}

                {invoice.totalTax > 0 && (
                    <div className="flex justify-between text-gray-700">
                        <span>{t.totalTax}</span>
                        <span className="font-mono">+{fmt(invoice.totalTax)}</span>
                    </div>
                )}

                {/* Grand Total - Large & Bold */}
                <div className="border-t-2 border-b-2 border-black py-1.5 my-2 flex justify-between items-baseline font-black">
                    <span className="text-xs uppercase tracking-wide">{t.grandTotal}</span>
                    <span className="text-base font-mono tracking-tight">{fmt(invoice.grandTotal)}</span>
                </div>

                {/* Savings Callout Box */}
                {totalSavings > 0 && (
                    <div className="my-2 p-1.5 border border-emerald-600 bg-emerald-50 rounded text-center">
                        <div className="text-[11px] font-black uppercase text-emerald-900 tracking-wide">
                            🎉 {t.totalSavings}: Rs. {fmt(totalSavings)}
                        </div>
                        <div className="text-[9px] text-emerald-800 font-semibold mt-0.5">
                            {t.youSaved}
                        </div>
                    </div>
                )}

                {/* Settlement / Payments */}
                <div className="pt-1 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                        <span className="text-gray-600">{t.paymentMethod}</span>
                        <span className="font-bold uppercase tracking-wider">{paymentMethodLabel}</span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-gray-600">{t.paidAmount}</span>
                        <span className="font-bold font-mono">{fmt(paidAmount)}</span>
                    </div>

                    {invoice.splitPayments && (
                        <div className="pl-2 border-l-2 border-indigo-400 space-y-0.5 text-[10px] my-1 text-gray-700 bg-gray-50/70 p-1 rounded-r">
                            {invoice.splitPayments.cash > 0 && (
                                <div className="flex justify-between">
                                    <span>• Cash:</span>
                                    <span className="font-mono font-bold">Rs. {fmt(invoice.splitPayments.cash)}</span>
                                </div>
                            )}
                            {invoice.splitPayments.card > 0 && (
                                <div className="flex justify-between">
                                    <span>• Card:</span>
                                    <span className="font-mono font-bold">Rs. {fmt(invoice.splitPayments.card)}</span>
                                </div>
                            )}
                            {invoice.splitPayments.bank > 0 && (
                                <div className="flex justify-between">
                                    <span>• Bank Transfer:</span>
                                    <span className="font-mono font-bold">Rs. {fmt(invoice.splitPayments.bank)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {invoice.cashReceived !== undefined && invoice.cashReceived > 0 && (
                        <div className="flex justify-between text-gray-700">
                            <span>{t.cashReceived}</span>
                            <span className="font-mono">{fmt(invoice.cashReceived)}</span>
                        </div>
                    )}

                    {invoice.changeReturned !== undefined && invoice.changeReturned > 0 && (
                        <div className="flex justify-between font-bold text-gray-900">
                            <span>{t.changeReturned}</span>
                            <span className="font-mono text-emerald-800">Rs. {fmt(invoice.changeReturned)}</span>
                        </div>
                    )}

                    {balanceDue > 0 && (
                        <div className="flex justify-between text-red-700 font-bold border-t border-dashed border-red-300 pt-1 mt-1">
                            <span>{t.balanceDue}</span>
                            <span className="font-mono">Rs. {fmt(balanceDue)}</span>
                        </div>
                    )}

                    {invoice.transactionReference && (
                        <div className="flex justify-between text-[10px] text-gray-500">
                            <span>{t.refSlip}</span>
                            <span className="font-mono">{invoice.transactionReference}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Loyalty Points Section */}
            {invoice.loyaltyPointsEarned > 0 && (
                <div className="border border-dashed border-amber-600 bg-amber-50/50 p-1.5 my-2.5 rounded text-[10px] text-center">
                    <div className="font-black uppercase tracking-wider text-amber-900">
                        {t.loyaltyRewards}
                    </div>
                    <div className="flex justify-between items-center mt-1 text-gray-800 font-medium">
                        <span>{t.pointsEarned}:</span>
                        <span className="font-bold text-amber-800 font-mono">+{invoice.loyaltyPointsEarned} pts</span>
                    </div>
                </div>
            )}

            {/* Separator */}
            <div className="border-t border-dashed border-black my-3"></div>

            {/* Exchange Policy & Footer Greeting */}
            <div className="text-center space-y-1.5 my-3">
                <div className="font-black text-[11px] uppercase tracking-wide text-gray-900">
                    {t.thankYou}
                </div>
                <div className="text-[10px] font-semibold text-gray-700">
                    {t.visitAgain}
                </div>
                <div className="text-[9px] text-gray-500 leading-tight italic px-2">
                    {t.exchangePolicy}
                </div>
                {companyInfo.footerMessage && (
                    <div className="text-[9px] text-gray-600 mt-1 whitespace-pre-line font-medium">
                        {companyInfo.footerMessage}
                    </div>
                )}
            </div>

            {/* QR Code and Barcode */}
            <div className="pt-2 flex flex-col items-center justify-center space-y-2">
                <ReceiptQrCode
                    value={`https://verify.asipbook.lk/inv/${invoice.invoiceNumber || invoice._id}`}
                    size={72}
                    label={t.scanVerify}
                />
                <ReceiptBarcode value={invoice.invoiceNumber || 'INV-0000'} width={150} height={30} />
            </div>

            {/* Software Attribution */}
            <div className="text-center text-[8px] text-gray-400 mt-2 tracking-tight">
                {t.softwareCredit}
            </div>

            <div className="h-2"></div>
        </div>
    );
});

ThermalReceipt.displayName = 'ThermalReceipt';
export default ThermalReceipt;

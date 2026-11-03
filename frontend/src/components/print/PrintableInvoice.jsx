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
 * Printable A4 Invoice Component with Trilingual Support (en, si, ta)
 */
const PrintableInvoice = forwardRef(({
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
    const billingAddr = invoice.billingAddress || {};

    const totalPaid = payments.reduce((sum, p) => {
        const alloc = p.allocations?.find((a) =>
            (a.documentId?._id?.toString() || a.documentId?.toString()) === invoice._id.toString()
        );
        return sum + (alloc?.amount || 0);
    }, 0);

    const paidAmount = totalPaid > 0 ? totalPaid : (invoice.amountPaid || invoice.grandTotal);
    const balanceDue = Math.max(0, (invoice.balanceDue !== undefined ? invoice.balanceDue : (invoice.grandTotal - paidAmount)));

    // Savings calculation
    let calculatedItemDiscounts = 0;
    (invoice.items || []).forEach((item) => {
        const lineSub = (item.quantity || 0) * (item.unitPrice || 0);
        const lineDisc = item.lineDiscount ?? ((lineSub * ((item.discountPercent || 0) / 100)) + (item.discountAmount || 0));
        calculatedItemDiscounts += (lineDisc || 0);
    });

    const itemDiscTotal = invoice.totalDiscount !== undefined && invoice.totalDiscount > 0
        ? invoice.totalDiscount
        : calculatedItemDiscounts;
    const orderDisc = invoice.orderDiscount?.amount || 0;
    const couponDisc = invoice.coupon?.discountAmount || 0;
    const loyaltyDisc = invoice.loyaltyDiscount?.discountAmount || 0;
    const totalSavings = itemDiscTotal + orderDisc + couponDisc + loyaltyDisc;

    // Payment method label
    const methodKey = (invoice.paymentMethod || 'cash').toLowerCase();
    const paymentMethodLabel = t[methodKey] || invoice.paymentMethod?.toUpperCase() || t.cash;

    return (
        <div
            ref={ref}
            className="print-invoice-container bg-white text-black p-8 sm:p-12 max-w-[850px] mx-auto shadow-sm border border-gray-200"
            style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Sinhala", "Iskoola Pota", "Noto Sans Tamil", sans-serif'
            }}
        >
            <style type="text/css" media="print">
                {`
                    @page { size: A4 portrait; margin: 10mm; }
                    html, body {
                        margin: 0;
                        padding: 0;
                        background: #fff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print-invoice-container {
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                `}
            </style>

            {/* Header: Company & Invoice Title */}
            <div className="flex justify-between items-start pb-6 border-b-2 border-gray-900">
                <div className="max-w-[60%]">
                    {companyInfo.logo && (
                        <img
                            src={companyInfo.logo}
                            alt="Logo"
                            className="h-14 mb-2 object-contain"
                        />
                    )}
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                        {companyInfo.name}
                    </h1>
                    {companyInfo.address && <p className="text-xs text-gray-600 mt-1">{companyInfo.address}</p>}
                    <div className="text-xs text-gray-600 space-x-2 mt-0.5">
                        {companyInfo.phone && <span>{t.tel}: {companyInfo.phone}</span>}
                        {companyInfo.email && <span>• {companyInfo.email}</span>}
                    </div>
                    {companyInfo.taxNumber && (
                        <p className="text-xs font-bold text-gray-800 mt-1 uppercase">
                            {t.vatNo}: {companyInfo.taxNumber}
                        </p>
                    )}
                </div>

                <div className="text-right">
                    <span className="inline-block bg-blue-900 text-white text-xs font-bold px-3 py-1 rounded uppercase tracking-wider mb-2">
                        {t.taxInvoice}
                    </span>
                    <div className="font-mono text-xl font-black text-gray-950">
                        {invoice.invoiceNumber}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {t.date}: <span className="font-semibold text-gray-800">{formatDate(invoice.invoiceDate)}</span>
                    </div>
                    {invoice.dueDate && (
                        <div className="text-xs text-gray-500">
                            {t.dueDate}: <span className="font-semibold text-gray-800">{formatDate(invoice.dueDate)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bill To & Invoice Info */}
            <div className="grid grid-cols-2 gap-8 my-6">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[10px] font-black uppercase text-blue-900 tracking-wider mb-1.5">
                        {t.billTo}
                    </p>
                    <div className="font-bold text-base text-gray-900">
                        {customer.name || 'Walk-in Customer'}
                    </div>
                    {customer.phone && (
                        <p className="text-xs text-gray-600 mt-0.5">
                            {t.contact}: <span className="font-mono font-medium">{customer.phone}</span>
                        </p>
                    )}
                    {billingAddr.line1 && (
                        <p className="text-xs text-gray-600">{billingAddr.line1}</p>
                    )}
                    {(billingAddr.city || billingAddr.state) && (
                        <p className="text-xs text-gray-600">{billingAddr.city}{billingAddr.state ? `, ${billingAddr.state}` : ''}</p>
                    )}
                    {customer.taxRegistrationNumber && (
                        <p className="text-xs font-bold text-gray-700 mt-1">
                            {t.vatNo}: {customer.taxRegistrationNumber}
                        </p>
                    )}
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[10px] font-black uppercase text-blue-900 tracking-wider mb-1.5">
                        {t.invoiceDetails}
                    </p>
                    <table className="w-full text-xs">
                        <tbody>
                            <tr>
                                <td className="text-gray-500 py-0.5">{t.paymentMethod}:</td>
                                <td className="text-right font-bold text-gray-900 uppercase">{paymentMethodLabel}</td>
                            </tr>
                            {invoice.cashierName && (
                                <tr>
                                    <td className="text-gray-500 py-0.5">{t.cashier}:</td>
                                    <td className="text-right font-medium">{invoice.cashierName}</td>
                                </tr>
                            )}
                            {invoice.paymentTerms?.type && (
                                <tr>
                                    <td className="text-gray-500 py-0.5">{t.paymentTerms}:</td>
                                    <td className="text-right font-semibold">
                                        {invoice.paymentTerms.type === 'credit'
                                            ? `${invoice.paymentTerms.creditDays} days credit`
                                            : invoice.paymentTerms.type.toUpperCase()}
                                    </td>
                                </tr>
                            )}
                            {invoice.transactionReference && (
                                <tr>
                                    <td className="text-gray-500 py-0.5">{t.refSlip}:</td>
                                    <td className="text-right font-mono text-gray-800">{invoice.transactionReference}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full mb-6 border-collapse">
                <thead>
                    <tr className="bg-gray-900 text-white text-[11px] uppercase tracking-wider">
                        <th className="text-center py-2.5 px-3 w-10 rounded-l">#</th>
                        <th className="text-left py-2.5 px-3">{t.itemDescription}</th>
                        <th className="text-right py-2.5 px-3 w-20">{t.qty}</th>
                        <th className="text-right py-2.5 px-3 w-28">{t.unitPrice}</th>
                        <th className="text-right py-2.5 px-3 w-24">{t.discount}</th>
                        <th className="text-right py-2.5 px-3 w-32 rounded-r">{t.amount}</th>
                    </tr>
                </thead>
                <tbody className="text-xs divide-y divide-gray-200">
                    {(invoice.items || []).map((item, idx) => {
                        const qty = item.quantity || 0;
                        const price = item.unitPrice || 0;
                        const lineSub = qty * price;
                        const lineDisc = item.lineDiscount ?? ((lineSub * ((item.discountPercent || 0) / 100)) + (item.discountAmount || 0));
                        const lineTotal = Math.max(0, lineSub - lineDisc);

                        return (
                            <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                                <td className="py-2.5 px-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                                <td className="py-2.5 px-3">
                                    <div className="font-bold text-gray-900">{item.productName || item.description}</div>
                                    {item.productCode && <div className="text-[10px] text-gray-500 font-mono">{item.productCode}</div>}
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium">
                                    {qty} {item.unit || item.unitOfMeasure || ''}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-gray-700">{fmt(price)}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                                    {lineDisc > 0 ? `-${fmt(lineDisc)}` : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-950">{fmt(lineTotal)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Bottom Section: Left Notes/QR, Right Totals */}
            <div className="grid grid-cols-12 gap-8 items-start mb-6">
                <div className="col-span-7 space-y-4">
                    {/* Savings Callout */}
                    {totalSavings > 0 && (
                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg">
                            <div className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                                🌟 {t.totalSavings}: Rs. {fmt(totalSavings)}
                            </div>
                            <p className="text-[11px] text-emerald-800 mt-0.5">
                                {t.youSaved}
                            </p>
                        </div>
                    )}

                    {/* Loyalty Points */}
                    {invoice.loyaltyPointsEarned > 0 && (
                        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs flex justify-between items-center">
                            <span className="font-bold text-amber-950">{t.loyaltyRewards}:</span>
                            <span className="font-black text-amber-800 font-mono">+{invoice.loyaltyPointsEarned} pts {t.pointsEarned}</span>
                        </div>
                    )}

                    {/* QR and Verification */}
                    <div className="flex items-center gap-4 pt-2">
                        <ReceiptQrCode
                            value={`https://verify.asipbook.lk/inv/${invoice.invoiceNumber || invoice._id}`}
                            size={76}
                        />
                        <div className="text-xs text-gray-600">
                            <p className="font-bold text-gray-900">{t.scanVerify}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{t.exchangePolicy}</p>
                            <div className="mt-1">
                                <ReceiptBarcode value={invoice.invoiceNumber || 'INV-0000'} width={130} height={26} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-5">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs space-y-2">
                        <div className="flex justify-between text-gray-600">
                            <span>{t.subtotal}</span>
                            <span className="font-mono">{fmt(invoice.subtotal)}</span>
                        </div>
                        {itemDiscTotal > 0 && (
                            <div className="flex justify-between text-emerald-800">
                                <span>{t.itemDiscount}</span>
                                <span className="font-mono">-Rs. {fmt(itemDiscTotal)}</span>
                            </div>
                        )}
                        {orderDisc > 0 && (
                            <div className="flex justify-between text-emerald-800">
                                <span>{t.orderDiscount}</span>
                                <span className="font-mono">-Rs. {fmt(orderDisc)}</span>
                            </div>
                        )}
                        {couponDisc > 0 && (
                            <div className="flex justify-between text-emerald-800">
                                <span>{t.couponDiscount}</span>
                                <span className="font-mono">-Rs. {fmt(couponDisc)}</span>
                            </div>
                        )}
                        {loyaltyDisc > 0 && (
                            <div className="flex justify-between text-emerald-800">
                                <span>{t.pointsUsed}</span>
                                <span className="font-mono">-Rs. {fmt(loyaltyDisc)}</span>
                            </div>
                        )}
                        {invoice.totalTax > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>{t.totalTax}</span>
                                <span className="font-mono">+Rs. {fmt(invoice.totalTax)}</span>
                            </div>
                        )}

                        <div className="border-t-2 border-gray-900 pt-2.5 mt-2 flex justify-between items-baseline font-black">
                            <span className="text-sm uppercase tracking-tight">{t.grandTotal}</span>
                            <span className="text-lg font-mono text-gray-950">Rs. {fmt(invoice.grandTotal)}</span>
                        </div>

                        <div className="border-t border-gray-200 pt-2 space-y-1">
                            <div className="flex justify-between text-gray-700">
                                <span>{t.paidAmount}</span>
                                <span className="font-mono font-bold text-emerald-800">Rs. {fmt(paidAmount)}</span>
                            </div>
                            {balanceDue > 0 ? (
                                <div className="flex justify-between font-bold text-red-700">
                                    <span>{t.balanceDue}</span>
                                    <span className="font-mono">Rs. {fmt(balanceDue)}</span>
                                </div>
                            ) : (
                                <div className="flex justify-between text-[11px] text-gray-500 font-semibold uppercase">
                                    <span>Status</span>
                                    <span className="text-emerald-700">PAID IN FULL</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Signatures & Footer */}
            <div className="pt-8 border-t border-gray-200 mt-8">
                <div className="grid grid-cols-2 gap-16 text-center text-xs text-gray-500 mb-6">
                    <div>
                        <div className="border-b border-gray-400 h-10 w-48 mx-auto"></div>
                        <p className="mt-1 font-semibold uppercase tracking-wider text-[10px]">{t.cashier} / Prepared By</p>
                    </div>
                    <div>
                        <div className="border-b border-gray-400 h-10 w-48 mx-auto"></div>
                        <p className="mt-1 font-semibold uppercase tracking-wider text-[10px]">Customer Acknowledgement</p>
                    </div>
                </div>

                <div className="text-center text-xs text-gray-600 font-medium">
                    {companyInfo.footerMessage || t.thankYou}
                </div>
                <div className="text-center text-[10px] text-gray-400 mt-1">
                    {t.softwareCredit}
                </div>
            </div>
        </div>
    );
});

PrintableInvoice.displayName = 'PrintableInvoice';
export default PrintableInvoice;

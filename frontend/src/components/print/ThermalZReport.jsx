import { forwardRef } from 'react';
import { useCompanySettings } from '../../features/settings/useSettings';
import { ReceiptBarcode } from './ReceiptBarcodeQr';

const fmt = (n) => new Intl.NumberFormat('en-LK', {
    style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(n || 0);

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—';

/**
 * Supermarket 80mm Thermal Z-Report (End-of-Day) and X-Report (Mid-Day Audit)
 */
const ThermalZReport = forwardRef(({ session, type = 'Z', cashierName = '' }, ref) => {
    const { data: settingsRes } = useCompanySettings();
    const company = settingsRes?.data || {};

    if (!session) return null;

    const isZReport = type.toUpperCase() === 'Z';
    const reportTitle = isZReport ? 'END-OF-DAY (Z-REPORT)' : 'MID-DAY AUDIT (X-REPORT)';

    const expectedCash = (session.openingBalance || 0) + (session.cashSales || 0) - (session.cashExpenses || 0);
    const actualCash = session.actualClosingBalance || 0;
    const difference = actualCash - expectedCash;
    const totalSales = (session.cashSales || 0) + (session.cardSales || 0) + (session.bankSales || 0) + (session.chequeSales || 0);

    const denoms = session.denominations || {};

    return (
        <div
            ref={ref}
            className="print-thermal-container bg-white text-black mx-auto select-none"
            style={{
                width: '80mm',
                maxWidth: '100%',
                padding: '12px 10px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace',
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
                        padding: 8px !important;
                    }
                `}
            </style>

            {/* Header */}
            <div className="text-center mb-3">
                <h1 className="text-base font-black tracking-wider uppercase text-gray-950">
                    {company.companyName || 'AsipBook Supermarket'}
                </h1>
                {company.address && <div className="text-[10px] text-gray-700">{company.address}</div>}
                {company.phone && <div className="text-[10px] text-gray-700">TEL: {company.phone}</div>}
                {company.taxRegistrationNumber && (
                    <div className="text-[10px] font-bold mt-0.5">VAT NO: {company.taxRegistrationNumber}</div>
                )}

                <div className="inline-block mt-2 px-3 py-1 bg-black text-white rounded font-black text-xs uppercase tracking-widest">
                    {reportTitle}
                </div>
            </div>

            {/* Session Metadata */}
            <div className="border-t border-b border-black py-1.5 my-2 text-[11px] space-y-0.5 font-medium">
                <div className="flex justify-between">
                    <span className="text-gray-600">Register / Session:</span>
                    <span className="font-mono font-bold">#{session._id?.slice(-6).toUpperCase() || 'POS-01'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Cashier:</span>
                    <span className="font-bold">{cashierName || session.userId?.firstName || 'Main Cashier'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Opened At:</span>
                    <span>{fmtDate(session.openedAt)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">{isZReport ? 'Closed At:' : 'Report Time:'}</span>
                    <span>{fmtDate(session.closedAt || new Date())}</span>
                </div>
            </div>

            {/* Sales Summary */}
            <div className="my-2.5">
                <div className="font-black text-xs uppercase border-b border-gray-400 pb-1 mb-1.5 tracking-wider">
                    Sales Breakdown
                </div>
                <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                        <span className="text-gray-700">Cash Sales:</span>
                        <span className="font-mono font-semibold">{fmt(session.cashSales)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-700">Card Payments (Visa/MC):</span>
                        <span className="font-mono font-semibold">{fmt(session.cardSales)}</span>
                    </div>
                    {session.bankSales > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-700">Bank Transfer / QR:</span>
                            <span className="font-mono font-semibold">{fmt(session.bankSales)}</span>
                        </div>
                    )}
                    {session.chequeSales > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-700">Cheque Sales:</span>
                            <span className="font-mono font-semibold">{fmt(session.chequeSales)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-t border-black pt-1.5 mt-1 font-black text-xs">
                        <span className="uppercase">Total Gross Sales:</span>
                        <span className="font-mono text-sm">Rs. {fmt(totalSales)}</span>
                    </div>
                </div>
            </div>

            {/* Cash Drawer Reconciliation */}
            <div className="my-2.5 bg-gray-50 p-2 rounded border border-gray-300">
                <div className="font-black text-xs uppercase border-b border-gray-300 pb-1 mb-1.5 tracking-wider">
                    Cash Drawer Audit
                </div>
                <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Opening Float:</span>
                        <span className="font-mono font-medium">{fmt(session.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                        <span>+ Cash Inflow:</span>
                        <span className="font-mono font-semibold">+{fmt(session.cashSales)}</span>
                    </div>
                    {session.cashExpenses > 0 && (
                        <div className="flex justify-between text-red-700">
                            <span>- Cash Expenses / Out:</span>
                            <span className="font-mono font-semibold">-{fmt(session.cashExpenses)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold pt-1 border-t border-gray-300">
                        <span>Expected Cash in Drawer:</span>
                        <span className="font-mono">Rs. {fmt(expectedCash)}</span>
                    </div>
                    {isZReport && (
                        <>
                            <div className="flex justify-between font-black text-xs pt-1 text-gray-900">
                                <span>Actual Counted Cash:</span>
                                <span className="font-mono">Rs. {fmt(actualCash)}</span>
                            </div>
                            <div className={`flex justify-between font-black text-xs p-1 rounded mt-1 ${
                                difference === 0
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : difference > 0
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'bg-red-100 text-red-900'
                            }`}>
                                <span>Variance / Difference:</span>
                                <span className="font-mono">
                                    {difference > 0 ? `+${fmt(difference)} (SURPLUS)` : difference < 0 ? `${fmt(difference)} (SHORTAGE)` : 'Rs. 0.00 (EXACT)'}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Denomination Breakdown (if available) */}
            {(denoms.notes5000 > 0 || denoms.notes1000 > 0 || denoms.notes500 > 0 || denoms.notes100 > 0) && (
                <div className="my-2 text-[10px]">
                    <div className="font-bold text-gray-700 border-b border-dotted pb-0.5 mb-1">
                        Denomination Count
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-gray-600">
                        {denoms.notes5000 > 0 && <div>5000 × {denoms.notes5000} = {fmt(denoms.notes5000 * 5000)}</div>}
                        {denoms.notes1000 > 0 && <div>1000 × {denoms.notes1000} = {fmt(denoms.notes1000 * 1000)}</div>}
                        {denoms.notes500 > 0 && <div>500 × {denoms.notes500} = {fmt(denoms.notes500 * 500)}</div>}
                        {denoms.notes100 > 0 && <div>100 × {denoms.notes100} = {fmt(denoms.notes100 * 100)}</div>}
                        {denoms.notes50 > 0 && <div>50 × {denoms.notes50} = {fmt(denoms.notes50 * 50)}</div>}
                        {denoms.notes20 > 0 && <div>20 × {denoms.notes20} = {fmt(denoms.notes20 * 20)}</div>}
                        {denoms.coins > 0 && <div>Coins = {fmt(denoms.coins)}</div>}
                    </div>
                </div>
            )}

            {/* Signatures */}
            <div className="border-t border-black pt-4 mt-6 text-[10px]">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <div className="border-b border-gray-400 h-6 w-24 mx-auto"></div>
                        <p className="mt-1 font-semibold uppercase text-gray-600">Cashier Signature</p>
                    </div>
                    <div>
                        <div className="border-b border-gray-400 h-6 w-24 mx-auto"></div>
                        <p className="mt-1 font-semibold uppercase text-gray-600">Supervisor Signature</p>
                    </div>
                </div>
            </div>

            {/* Barcode & Footer */}
            <div className="mt-4 pt-2 text-center text-[8px] text-gray-400 border-t border-dashed">
                <ReceiptBarcode value={`Z-${session._id?.slice(-8).toUpperCase() || 'SESSION'}`} width={120} height={24} />
                <p className="mt-1">Generated by AsipBook ERP Supermarket POS</p>
            </div>
        </div>
    );
});

ThermalZReport.displayName = 'ThermalZReport';
export default ThermalZReport;


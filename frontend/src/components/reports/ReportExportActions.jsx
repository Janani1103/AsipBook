import { useState } from 'react';
import { Download, Printer, FileSpreadsheet, FileText } from 'lucide-react';
import Button from '../ui/Button';

/**
 * Reusable Report Export & Print Action Buttons Bar
 * Supports:
 * 1. Download PDF (via formatted browser print-to-pdf)
 * 2. Download Excel / CSV (with UTF-8 BOM for full Microsoft Excel compatibility)
 * 3. Print Report
 */
export default function ReportExportActions({
    reportTitle = 'Report',
    filenamePrefix = 'ASIP_Report',
    getExportData, // function or object: () => ({ headers: [], rows: [], meta: [] })
    disabled = false,
    className = '',
}) {
    const [isExporting, setIsExporting] = useState(false);

    // 1. Download PDF / Print Dialog
    const handleDownloadPdf = () => {
        const originalTitle = document.title;
        const dateStr = new Date().toISOString().slice(0, 10);
        const cleanTitle = `${filenamePrefix}_${reportTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStr}`;
        document.title = cleanTitle;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 1500);
    };

    // 2. Download Excel / CSV
    const handleDownloadExcel = () => {
        if (!getExportData) return;
        setIsExporting(true);

        try {
            const data = typeof getExportData === 'function' ? getExportData() : getExportData;
            if (!data || !data.headers || !data.rows) {
                console.warn('ReportExportActions: getExportData must return { headers, rows }');
                setIsExporting(false);
                return;
            }

            const { headers = [], rows = [], meta = [] } = data;
            const dateStr = new Date().toISOString().slice(0, 10);
            const timeStr = new Date().toLocaleTimeString();

            // Build metadata header rows
            const metaLines = [
                ['COMPANY', 'ASIPBOOK (PVT) LTD'],
                ['REPORT', reportTitle],
                ['GENERATED AT', `${dateStr} ${timeStr}`],
                ...(meta || []),
                ['', ''], // blank separator
            ];

            const escapeCell = (val) => {
                if (val === null || val === undefined) return '""';
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            };

            const csvLines = [
                ...metaLines.map((r) => r.map(escapeCell).join(',')),
                headers.map(escapeCell).join(','),
                ...rows.map((r) => r.map(escapeCell).join(',')),
            ];

            // Add UTF-8 Byte Order Mark (BOM) so Excel natively recognizes UTF-8 (currency, sinhala, formatting)
            const csvContent = '\uFEFF' + csvLines.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filenamePrefix}_${reportTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStr}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to export Excel / CSV:', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={`flex items-center gap-2 flex-wrap ${className}`}>
            {/* Dynamic Print CSS */}
            <style>{`
                @media print {
                    aside, header, nav, .no-print, .print\\:hidden, button:not(.printable-btn) {
                        display: none !important;
                    }
                    body, main {
                        background: #fff !important;
                        margin: 0 !important;
                        padding: 8mm !important;
                    }
                    .print-report-header {
                        display: block !important;
                        margin-bottom: 16px !important;
                        border-bottom: 2px solid #1e293b !important;
                        padding-bottom: 10px !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    th, td {
                        border: 1px solid #cbd5e1 !important;
                        padding: 6px 8px !important;
                    }
                    .card, .p-6, .p-4 {
                        box-shadow: none !important;
                        border: 1px solid #e2e8f0 !important;
                    }
                }
                .print-report-header {
                    display: none;
                }
            `}</style>

            {/* Print Header for Paper / PDF */}
            <div className="print-report-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                            ASIPBOOK (PVT) LTD
                        </h2>
                        <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0 0' }}>
                            Books, Office Stationery & Retail Distribution • Reg: PV-89412
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#312e81' }}>
                            {reportTitle}
                        </h3>
                        <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>
                            Date: {new Date().toLocaleDateString('en-LK')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Download PDF Button */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={disabled}
                className="bg-white hover:bg-gray-50 text-indigo-700 border-indigo-200 shadow-xs cursor-pointer text-xs"
                title="Download report as PDF or send to system printer"
            >
                <FileText size={14} className="mr-1.5 text-indigo-600" /> Download PDF
            </Button>

            {/* Download Excel Button */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadExcel}
                disabled={disabled || isExporting}
                className="bg-white hover:bg-gray-50 text-emerald-700 border-emerald-200 shadow-xs cursor-pointer text-xs"
                title="Download data in Microsoft Excel (CSV) format with full character encoding"
            >
                <FileSpreadsheet size={14} className="mr-1.5 text-emerald-600" />
                {isExporting ? 'Exporting...' : 'Download Excel'}
            </Button>

            {/* Direct Print Button */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                disabled={disabled}
                className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-xs cursor-pointer text-xs"
                title="Print this report"
            >
                <Printer size={14} className="mr-1.5 text-gray-500" /> Print
            </Button>
        </div>
    );
}


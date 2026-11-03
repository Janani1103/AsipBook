import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Printer,
    ArrowLeft,
    FileText,
    Receipt,
    Languages,
    Sparkles,
    Check
} from 'lucide-react';
import { invoicesApi } from '../features/invoices/invoicesApi';
import { paymentsApi } from '../features/payments/paymentsApi';
import { getBluetoothPrintUrl } from '../utils/printHelpers';
import { RECEIPT_LANGUAGES } from '../utils/receiptDictionary';
import ThermalReceipt from '../components/print/ThermalReceipt';
import PrintableInvoice from '../components/print/PrintableInvoice';

export default function ReceiptPrintPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef(null);

    // Persisted preferences
    const [selectedLang, setSelectedLang] = useState(() => {
        return localStorage.getItem('asip_receipt_lang') || 'en';
    });
    const [printFormat, setPrintFormat] = useState(() => {
        return localStorage.getItem('asip_receipt_format') || 'thermal';
    });

    const handleLangChange = (langCode) => {
        setSelectedLang(langCode);
        localStorage.setItem('asip_receipt_lang', langCode);
    };

    const handleFormatChange = (fmt) => {
        setPrintFormat(fmt);
        localStorage.setItem('asip_receipt_format', fmt);
    };

    // Fetch invoice details
    const { data: invoiceRes, isLoading } = useQuery({
        queryKey: ['invoice', id],
        queryFn: () => invoicesApi.getById(id),
        enabled: !!id,
    });

    // Fetch payments for this invoice
    const { data: paymentsRes } = useQuery({
        queryKey: ['invoice-payments', id],
        queryFn: () => paymentsApi.list({ invoiceId: id }),
        enabled: !!id,
    });

    const invoice = invoiceRes?.data;
    const payments = paymentsRes?.data || [];

    // Auto-trigger print once on first mount when invoice is loaded
    const hasAutoPrinted = useRef(false);
    useEffect(() => {
        if (!invoice || hasAutoPrinted.current) return;
        hasAutoPrinted.current = true;
        const timer = setTimeout(() => {
            window.print();
        }, 600);
        return () => clearTimeout(timer);
    }, [invoice]);

    if (isLoading || !invoice) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-700 font-semibold text-sm">Preparing receipt preview...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Dynamic Print CSS */}
            <style>{`
                @media print {
                    @page {
                        size: ${printFormat === 'thermal' ? '80mm auto' : 'A4 portrait'};
                        margin: ${printFormat === 'thermal' ? '0' : '10mm'};
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .printable-area {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        box-shadow: none !important;
                    }
                }
                @media screen {
                    body {
                        background-color: #f3f4f6;
                    }
                }
            `}</style>

            {/* Top Fixed Control Bar */}
            <header className="no-print sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm px-4 py-2.5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={() => navigate('/pos')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                            <ArrowLeft size={15} /> Back to POS
                        </button>
                        <button
                            onClick={() => navigate(`/invoices/${invoice._id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                            <FileText size={15} /> Invoice Record
                        </button>
                    </div>

                    {/* Format and Language Switchers */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {/* Format Switcher */}
                        <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-medium">
                            <button
                                onClick={() => handleFormatChange('thermal')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                                    printFormat === 'thermal'
                                        ? 'bg-white text-blue-700 font-bold shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Receipt size={14} /> 80mm Thermal (POS)
                            </button>
                            <button
                                onClick={() => handleFormatChange('a4')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                                    printFormat === 'a4'
                                        ? 'bg-white text-blue-700 font-bold shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <FileText size={14} /> A4 Tax Invoice
                            </button>
                        </div>

                        {/* Language Selector */}
                        <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-medium">
                            {RECEIPT_LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLangChange(lang.code)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition ${
                                        selectedLang === lang.code
                                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <span>{lang.flag}</span>
                                    <span>{lang.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Print Actions */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button
                            onClick={() => {
                                const url = getBluetoothPrintUrl(invoice._id);
                                window.location.href = url;
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 active:scale-95 transition shadow-sm"
                            title="Print via Android Bluetooth Print App"
                        >
                            <Printer size={15} /> Bluetooth Print
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 active:scale-95 transition shadow-sm"
                        >
                            <Printer size={15} /> Print Receipt
                        </button>
                    </div>
                </div>
            </header>

            {/* Document Preview Canvas */}
            <main className="flex-1 py-8 px-4 flex justify-center items-start overflow-y-auto">
                <div className="printable-area bg-white shadow-xl rounded-sm border border-gray-300 overflow-hidden">
                    {printFormat === 'thermal' ? (
                        <ThermalReceipt
                            ref={printRef}
                            invoice={invoice}
                            payments={payments}
                            lang={selectedLang}
                        />
                    ) : (
                        <PrintableInvoice
                            ref={printRef}
                            invoice={invoice}
                            payments={payments}
                            lang={selectedLang}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

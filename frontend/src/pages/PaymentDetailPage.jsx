import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Printer, FileText, Download, Building2, CheckCircle2 } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '../features/payments/paymentsApi';
import { useDeletePayment } from '../features/payments/usePayments';
import ConfirmDialog from '../components/ui/ConfirmDialog';

function numberToWords(num) {
    if (!num || num === 0) return 'Zero Rupees Only';
    const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
        return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
    };

    const whole = Math.floor(num);
    const decimal = Math.round((num - whole) * 100);
    let str = inWords(whole) + ' Rupees';
    if (decimal > 0) {
        str += ' and ' + inWords(decimal) + ' Cents';
    }
    return str + ' Only';
}

export default function PaymentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['payment', id], queryFn: () => paymentsApi.getById(id),
    });
    const deleteMutation = useDeletePayment();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isVoucherOpen, setIsVoucherOpen] = useState(false);
    const p = data?.data;

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(id);
            setIsDeleteDialogOpen(false);
            navigate('/payments');
        } catch {}
    };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    if (isLoading || !p) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">
                    Payment {p.paymentNumber}
                    <Badge variant={p.direction === 'received' ? 'success' : 'info'}>
                        {p.direction === 'received' ? 'MONEY IN' : 'MONEY OUT'}
                    </Badge>
                </span>}
                description={`${fmtDate(p.paymentDate)} · ${p.method.replace('_', ' ')}`}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => navigate('/payments')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsVoucherOpen(true)}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                        >
                            <Printer size={16} className="mr-1.5 text-indigo-600" /> Print Official Voucher
                        </Button>
                        <Button variant="danger" onClick={() => setIsDeleteDialogOpen(true)} loading={deleteMutation.isPending}>
                            <Trash2 size={16} className="mr-1.5" /> Delete
                        </Button>
                    </div>
                }
            />

            <ConfirmDialog 
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Delete Payment"
                message="Are you sure you want to delete this payment? This action will reverse all invoice/bill allocations and restore bank account balances. This cannot be undone."
                confirmText="Yes, Delete Payment"
                variant="danger"
                loading={deleteMutation.isPending}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">{p.direction === 'received' ? 'From' : 'To'}</p>
                                <p className="font-medium">{p.partyName}</p>
                                <p className="text-gray-600">{p.customerId?.customerCode || p.supplierId?.supplierCode}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Method</p>
                                <p className="capitalize">{p.method.replace('_', ' ')}</p>
                                {p.chequeNumber && <p className="text-gray-600">Cheque: {p.chequeNumber} ({fmtDate(p.chequeDate)})</p>}
                                {p.bankName && <p className="text-gray-600">Bank: {p.bankName}</p>}
                                {p.bankAccountId && (
                                    <button 
                                        onClick={() => navigate('/bank-accounts')}
                                        className="text-primary-600 hover:underline flex items-center gap-1 mt-1"
                                    >
                                        Linked: {p.bankAccountId.accountName}
                                    </button>
                                )}
                                {p.transactionReference && <p className="text-gray-600 mt-1">Ref: {p.transactionReference}</p>}
                            </div>
                        </div>
                        {p.notes && <div className="mt-4 pt-4 border-t"><p className="text-sm whitespace-pre-wrap">{p.notes}</p></div>}
                    </Card>

                    {p.allocations?.length > 0 && (
                        <Card>
                            <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold text-gray-700">Applied To</h3></div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[400px]">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Document</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {p.allocations.map((a) => (
                                            <tr key={a._id}>
                                                <td className="px-4 py-3 font-mono text-sm">
                                                    <button onClick={() => navigate(`/${a.documentType}s/${a.documentId}`)}
                                                        className="text-primary-600 hover:underline">{a.documentNumber}</button>
                                                </td>
                                                <td className="px-4 py-3 text-sm capitalize">{a.documentType}</td>
                                                <td className="px-4 py-3 text-right text-sm font-medium">{fmt(a.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>

                <div>
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Amount</span><span className="font-bold text-lg">{fmt(p.amount)}</span></div>
                            <div className="flex justify-between pt-2 border-t"><span className="text-gray-600">Allocated</span><span>{fmt(p.amount - p.unallocatedAmount)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Unallocated</span><span>{fmt(p.unallocatedAmount)}</span></div>
                            {p.unallocatedAmount > 0 && (
                                <p className="text-xs text-gray-500 pt-2">Available as credit for future applications.</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 mt-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Recorded By</h3>
                        <p className="text-sm">{p.receivedBy?.firstName} {p.receivedBy?.lastName}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(p.createdAt).toLocaleString('en-LK')}</p>
                    </Card>
                </div>
            </div>

            {/* Official Printable Payment / Receipt Voucher Modal */}
            {isVoucherOpen && (
                <Modal
                    isOpen={isVoucherOpen}
                    onClose={() => setIsVoucherOpen(false)}
                    title={`Official Voucher — ${p.paymentNumber}`}
                    size="lg"
                >
                    <div className="p-6 space-y-4">
                        <div id="official-voucher-content" className="p-8 bg-white border border-gray-300 rounded-xl space-y-5 font-sans text-xs text-gray-900 shadow-sm print:p-0 print:border-none print:shadow-none">
                            {/* Header */}
                            <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-indigo-950 uppercase tracking-tight">ASIPBOOK (PVT) LTD</h2>
                                    <p className="text-xs text-gray-600 font-medium">Publishers, Printers & Stationers</p>
                                    <p className="text-[11px] text-gray-500">124 High Level Road, Maharagama, Sri Lanka</p>
                                    <p className="text-[11px] text-gray-500">Tel: +94 11 284 5678 | Email: finance@asipbook.lk</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <span className={`inline-block px-3 py-1 font-black text-xs uppercase tracking-wider rounded ${
                                        p.direction === 'paid' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    }`}>
                                        {p.direction === 'paid' ? 'OFFICIAL PAYMENT VOUCHER' : 'OFFICIAL RECEIPT VOUCHER'}
                                    </span>
                                    <p className="font-mono font-bold text-sm text-gray-900">{p.paymentNumber}</p>
                                    <p className="text-xs text-gray-600">Date: <span className="font-semibold">{fmtDate(p.paymentDate)}</span></p>
                                </div>
                            </div>

                            {/* Beneficiary & Method */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                        {p.direction === 'paid' ? 'Paid To (Supplier / Payee)' : 'Received From (Customer)'}
                                    </p>
                                    <p className="font-bold text-sm text-gray-900 mt-0.5">{p.partyName}</p>
                                    <p className="text-[11px] text-gray-600 font-mono">
                                        ID / Code: {p.customerId?.customerCode || p.supplierId?.supplierCode || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Payment Mode & Account</p>
                                    <p className="font-semibold text-gray-900 capitalize mt-0.5">{p.method?.replace('_', ' ')}</p>
                                    {p.bankAccountId && (
                                        <p className="text-[11px] text-gray-700">Bank: <span className="font-medium">{p.bankAccountId.accountName}</span> ({p.bankAccountId.accountNumber})</p>
                                    )}
                                    {p.chequeNumber && (
                                        <p className="text-[11px] text-indigo-700 font-medium">
                                            Cheque No: {p.chequeNumber} (Matures: {fmtDate(p.chequeDate)})
                                        </p>
                                    )}
                                    {p.transactionReference && (
                                        <p className="text-[11px] text-gray-600">Ref / Txn: {p.transactionReference}</p>
                                    )}
                                </div>
                            </div>

                            {/* Amount in Numbers and Words */}
                            <div className="border border-indigo-200 bg-indigo-50/50 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide">Total Voucher Amount</span>
                                    <span className="text-lg font-black font-mono text-indigo-900">{fmt(p.amount)}</span>
                                </div>
                                <div className="text-xs text-gray-700 italic border-t border-indigo-100 pt-1.5">
                                    <span className="font-semibold not-italic text-gray-500 text-[10px] uppercase mr-1">In Words:</span>
                                    {numberToWords(p.amount)}
                                </div>
                            </div>

                            {/* Allocation Breakdown Table */}
                            {p.allocations?.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                                        Settlement & Document Allocations
                                    </h4>
                                    <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden text-xs">
                                        <thead className="bg-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-1.5 font-bold text-gray-700">Document No</th>
                                                <th className="px-3 py-1.5 font-bold text-gray-700">Doc Type</th>
                                                <th className="px-3 py-1.5 font-bold text-gray-700 text-right">Settled Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {p.allocations.map((a) => (
                                                <tr key={a._id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-1.5 font-mono text-indigo-700">{a.documentNumber}</td>
                                                    <td className="px-3 py-1.5 capitalize text-gray-700">{a.documentType}</td>
                                                    <td className="px-3 py-1.5 text-right font-mono font-medium">{fmt(a.amount)}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-gray-50 font-bold border-t border-gray-300">
                                                <td colSpan={2} className="px-3 py-1.5 text-right text-gray-700">Total Settled:</td>
                                                <td className="px-3 py-1.5 text-right font-mono">{fmt(p.amount - (p.unallocatedAmount || 0))}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {p.notes && (
                                <div className="p-2.5 bg-gray-50 rounded border border-gray-200 text-xs">
                                    <span className="font-bold text-[10px] uppercase text-gray-500 block">Particulars / Notes:</span>
                                    <p className="text-gray-800 whitespace-pre-wrap mt-0.5">{p.notes}</p>
                                </div>
                            )}

                            {/* 4-Tier Official Signature Grid */}
                            <div className="grid grid-cols-4 gap-4 pt-10 text-[10px] text-center">
                                <div>
                                    <div className="border-t border-gray-400 pt-1 font-semibold text-gray-800">Prepared By</div>
                                    <p className="text-[9px] text-gray-500 mt-0.5">Accounts Clerk</p>
                                </div>
                                <div>
                                    <div className="border-t border-gray-400 pt-1 font-semibold text-gray-800">Checked By</div>
                                    <p className="text-[9px] text-gray-500 mt-0.5">Accountant</p>
                                </div>
                                <div>
                                    <div className="border-t border-gray-400 pt-1 font-semibold text-gray-800">Approved By</div>
                                    <p className="text-[9px] text-gray-500 mt-0.5">General Manager / Director</p>
                                </div>
                                <div>
                                    <div className="border-t border-gray-400 pt-1 font-semibold text-gray-800">Received By</div>
                                    <p className="text-[9px] text-gray-500 mt-0.5">Payee Signature & Stamp</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={() => setIsVoucherOpen(false)}>Close</Button>
                            <Button variant="primary" onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
                                <Printer size={15} className="mr-1.5" /> Print Official Voucher
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
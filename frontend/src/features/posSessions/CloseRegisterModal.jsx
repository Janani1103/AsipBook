import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Calculator, Printer, Check, ChevronDown, ChevronUp } from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { posSessionsApi } from './posSessionsApi';
import ThermalZReport from '../../components/print/ThermalZReport';

export default function CloseRegisterModal({ isOpen, onClose, session }) {
    const queryClient = useQueryClient();
    const printRef = useRef(null);

    const [showDenominations, setShowDenominations] = useState(false);
    const [closedSessionData, setClosedSessionData] = useState(null);
    const [denominations, setDenominations] = useState({
        notes5000: 0,
        notes1000: 0,
        notes500: 0,
        notes100: 0,
        notes50: 0,
        notes20: 0,
        coins: 0,
    });

    const { register, handleSubmit, watch, setValue } = useForm({
        defaultValues: {
            actualClosingBalance: '',
            notes: ''
        }
    });

    const handleDenomChange = (field, val) => {
        const count = Math.max(0, parseInt(val, 10) || 0);
        const next = { ...denominations, [field]: count };
        setDenominations(next);

        // Calculate total
        const total = (next.notes5000 * 5000) +
            (next.notes1000 * 1000) +
            (next.notes500 * 500) +
            (next.notes100 * 100) +
            (next.notes50 * 50) +
            (next.notes20 * 20) +
            (next.coins);

        setValue('actualClosingBalance', total.toFixed(2), { shouldValidate: true });
    };

    const closeMutation = useMutation({
        mutationFn: (data) => posSessionsApi.close({
            ...data,
            denominations,
        }),
        onSuccess: (res) => {
            toast.success('Cash Register Closed & Shift Ended');
            queryClient.invalidateQueries(['pos-sessions', 'active']);
            setClosedSessionData(res.data || { ...session, actualClosingBalance: watch('actualClosingBalance'), denominations });
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to close register')
    });

    if (!session) return null;

    const expected = (session.openingBalance || 0) + (session.cashSales || 0) - (session.cashExpenses || 0);
    const actual = parseFloat(watch('actualClosingBalance')) || 0;
    const diff = actual - expected;

    const formatLkr = (val) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(val || 0);

    const handlePrintZReport = () => {
        window.print();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                setClosedSessionData(null);
                onClose();
            }}
            title={closedSessionData ? "Register Closed — Z-Report Ready" : "Close Cash Register (Shift Handover)"}
            size="md"
        >
            {closedSessionData ? (
                <div className="p-6 space-y-4 text-center">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                        <Check size={28} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Shift Closed Successfully</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Closing Balance: <strong>{formatLkr(actual)}</strong> (Variance: {diff >= 0 ? '+' : ''}{formatLkr(diff)})
                        </p>
                    </div>

                    <div className="p-3 bg-gray-50 border rounded-lg max-h-60 overflow-y-auto">
                        <ThermalZReport ref={printRef} session={closedSessionData} type="Z" />
                    </div>

                    <div className="flex gap-2 pt-2 justify-center">
                        <Button
                            variant="primary"
                            onClick={handlePrintZReport}
                            className="flex items-center gap-2"
                        >
                            <Printer size={16} /> Print Z-Report
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setClosedSessionData(null);
                                onClose();
                            }}
                        >
                            Done
                        </Button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit(closeMutation.mutate)}>
                    <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                        {/* Drawer Expected Balance Card */}
                        <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-xs border border-gray-200">
                            <div className="flex justify-between text-gray-600">
                                <span>Opening Cash Float:</span>
                                <span className="font-mono">{formatLkr(session.openingBalance)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-700 font-medium">
                                <span>+ Cash Sales Today:</span>
                                <span className="font-mono">+{formatLkr(session.cashSales)}</span>
                            </div>
                            {session.cashExpenses > 0 && (
                                <div className="flex justify-between text-rose-600">
                                    <span>- Cash Payouts / Expenses:</span>
                                    <span className="font-mono">-{formatLkr(session.cashExpenses)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold pt-2 border-t border-gray-300 text-sm text-gray-900">
                                <span>Expected Cash in Drawer:</span>
                                <span className="font-mono">{formatLkr(expected)}</span>
                            </div>
                        </div>

                        {/* Denomination Counter Toggle */}
                        <div className="border border-blue-200 rounded-xl overflow-hidden bg-blue-50/40">
                            <button
                                type="button"
                                onClick={() => setShowDenominations(!showDenominations)}
                                className="w-full p-3 flex justify-between items-center text-xs font-bold text-blue-900 hover:bg-blue-50 transition"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Calculator size={15} className="text-blue-600" />
                                    Cash Denomination Counter (මුදල් නෝට්ටු ගණනය කිරීම)
                                </span>
                                {showDenominations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {showDenominations && (
                                <div className="p-3 bg-white border-t border-blue-100 grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                                        <span className="font-bold text-gray-700">Rs. 5,000 ×</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={denominations.notes5000 || ''}
                                            onChange={(e) => handleDenomChange('notes5000', e.target.value)}
                                            placeholder="0"
                                            className="w-16 px-2 py-1 text-center font-bold border rounded bg-white"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                                        <span className="font-bold text-gray-700">Rs. 1,000 ×</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={denominations.notes1000 || ''}
                                            onChange={(e) => handleDenomChange('notes1000', e.target.value)}
                                            placeholder="0"
                                            className="w-16 px-2 py-1 text-center font-bold border rounded bg-white"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                                        <span className="font-bold text-gray-700">Rs. 500 ×</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={denominations.notes500 || ''}
                                            onChange={(e) => handleDenomChange('notes500', e.target.value)}
                                            placeholder="0"
                                            className="w-16 px-2 py-1 text-center font-bold border rounded bg-white"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                                        <span className="font-bold text-gray-700">Rs. 100 ×</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={denominations.notes100 || ''}
                                            onChange={(e) => handleDenomChange('notes100', e.target.value)}
                                            placeholder="0"
                                            className="w-16 px-2 py-1 text-center font-bold border rounded bg-white"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                                        <span className="font-bold text-gray-700">Rs. 50 ×</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={denominations.notes50 || ''}
                                            onChange={(e) => handleDenomChange('notes50', e.target.value)}
                                            placeholder="0"
                                            className="w-16 px-2 py-1 text-center font-bold border rounded bg-white"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                                        <span className="font-bold text-gray-700">Rs. 20 ×</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={denominations.notes20 || ''}
                                            onChange={(e) => handleDenomChange('notes20', e.target.value)}
                                            placeholder="0"
                                            className="w-16 px-2 py-1 text-center font-bold border rounded bg-white"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded col-span-2">
                                        <span className="font-bold text-gray-700">Coins Total (Rs.):</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={denominations.coins || ''}
                                            onChange={(e) => handleDenomChange('coins', e.target.value)}
                                            placeholder="0.00"
                                            className="w-28 px-2 py-1 text-center font-bold border rounded bg-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actual Cash Input */}
                        <div>
                            <Input
                                label="Actual Cash Counted in Drawer (LKR) *"
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                {...register('actualClosingBalance')}
                                autoFocus={!showDenominations}
                            />
                        </div>

                        {/* Variance Badge */}
                        <div className={`p-3 rounded-lg border text-xs font-bold flex justify-between items-center ${
                            diff === 0
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : diff > 0
                                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                                    : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}>
                            <span>Cash Difference (Variance):</span>
                            <span className="font-mono text-sm">
                                {diff > 0 ? `+${formatLkr(diff)} (SURPLUS)` : diff < 0 ? `${formatLkr(diff)} (SHORTAGE)` : 'Exact (Balanced)'}
                            </span>
                        </div>

                        <Textarea label="Shift Closing Notes / Handover Details" rows={2} placeholder="Optional notes for manager" {...register('notes')} />
                    </div>

                    <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" loading={closeMutation.isPending} className="font-bold">
                            Close & Generate Z-Report
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, X, ShieldAlert, FileText, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { expensesApi } from './expensesApi';

const DEFAULT_CATEGORIES = [
    'Meals & Entertainment',
    'Fuel & Travel',
    'Office Supplies',
    'Repairs & Maintenance',
    'Salary',
    'Utilities',
    'Rent',
    'Marketing',
    'General / Other',
];

export default function ExpenseFormModal({ isOpen, onClose }) {
    const queryClient = useQueryClient();
    const [categoryInput, setCategoryInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [receiptName, setReceiptName] = useState('');
    const categoryRef = useRef(null);
    const fileInputRef = useRef(null);

    const { data: categoriesData } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: expensesApi.getCategories,
        staleTime: 30000,
    });

    const dbCategories = categoriesData?.data || [];
    const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...dbCategories])];

    const filteredSuggestions = categoryInput
        ? allCategories.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase()))
        : allCategories;

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            amount: '',
            paymentMethod: 'cash',
            isPettyCash: false,
            description: ''
        }
    });

    const watchedAmount = Number(watch('amount') || 0);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Receipt image must be under 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setReceiptPreview(reader.result);
            setReceiptName(file.name);
        };
        reader.readAsDataURL(file);
    };

    const removeReceipt = () => {
        setReceiptPreview(null);
        setReceiptName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    useEffect(() => {
        if (!isOpen) {
            setCategoryInput('');
            setShowSuggestions(false);
            setReceiptPreview(null);
            setReceiptName('');
        }
    }, [isOpen]);

    // Close suggestions on outside click
    useEffect(() => {
        const handler = (e) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const createMutation = useMutation({
        mutationFn: expensesApi.create,
        onSuccess: () => {
            toast.success('Expense recorded successfully');
            queryClient.invalidateQueries(['expenses']);
            queryClient.invalidateQueries(['expense-categories']);
            queryClient.invalidateQueries(['pos-sessions', 'active']);
            reset();
            setCategoryInput('');
            onClose();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to record expense')
    });

    const onSubmit = (data) => {
        if (!categoryInput.trim()) {
            toast.error('Please enter a category');
            return;
        }
        createMutation.mutate({
            ...data,
            category: categoryInput.trim(),
            receiptUrl: receiptPreview || undefined,
            receiptName: receiptName || undefined,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Expense" size="md">
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="p-4 space-y-4">
                    <Input label="Date" type="date" required {...register('date')} />

                    {/* Category with autocomplete */}
                    <div className="relative" ref={categoryRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 text-sm"
                            placeholder="Type or select a category..."
                            value={categoryInput}
                            onChange={(e) => {
                                setCategoryInput(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            autoComplete="off"
                        />
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                                {filteredSuggestions.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors border-b last:border-0 font-medium text-gray-700"
                                        onMouseDown={(e) => {
                                             e.preventDefault();
                                            setCategoryInput(cat);
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                                {categoryInput && !allCategories.some(c => c.toLowerCase() === categoryInput.toLowerCase()) && (
                                    <button
                                        type="button"
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition-colors text-green-700 font-semibold flex items-center gap-2"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        <span className="text-green-500">+</span> Add &quot;{categoryInput}&quot; as new category
                                    </button>
                                )}
                            </div>
                        )}
                        {!categoryInput && (
                            <p className="text-xs text-gray-400 mt-1">Type a category or pick from suggestions</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Amount (LKR)" type="number" step="0.01" required {...register('amount')} />
                        <Select
                            label="Payment Method"
                            required
                            options={[
                                { value: 'cash', label: 'Cash (Deducts from Register)' },
                                { value: 'card', label: 'Card' },
                                { value: 'bank_transfer', label: 'Bank Transfer' }
                            ]}
                            {...register('paymentMethod')}
                        />
                    </div>

                    {/* Petty Cash Checkbox */}
                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="pettyCashCheck"
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            {...register('isPettyCash')}
                        />
                        <label htmlFor="pettyCashCheck" className="text-xs font-semibold text-gray-700 cursor-pointer">
                            Paid via Petty Cash Drawer (සුළු මුදල් ලෙජරය)
                        </label>
                    </div>

                    {/* Approval Notice if > 10,000 */}
                    {watchedAmount > 10000 && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                            <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Manager Approval Required</p>
                                <p className="text-[11px] text-amber-700 mt-0.5">
                                    Expenses exceeding LKR 10,000 will be marked as &quot;Pending Approval&quot; for managerial authorization.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Receipt Voucher Attachment Upload */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Attach Receipt Slip / Bill Voucher (Optional)
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        {receiptPreview ? (
                            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <div className="flex items-center gap-2">
                                    <img src={receiptPreview} alt="Receipt preview" className="w-10 h-10 object-cover rounded border border-indigo-200" />
                                    <div>
                                        <p className="text-xs font-bold text-indigo-950 truncate max-w-[200px]">{receiptName || 'Receipt Attached'}</p>
                                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">Ready to upload</span>
                                    </div>
                                </div>
                                <button type="button" onClick={removeReceipt} className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/30 transition text-xs font-semibold text-gray-600 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Upload size={15} className="text-gray-400" />
                                <span>Click to attach photo of invoice / receipt voucher</span>
                            </button>
                        )}
                    </div>

                    <Textarea label="Description / Notes" rows={2} {...register('description')} />
                </div>

                <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary" loading={createMutation.isPending}>Record Expense</Button>
                </div>
            </form>
        </Modal>
    );
}

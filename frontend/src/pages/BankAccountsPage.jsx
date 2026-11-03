import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Plus, Landmark, CreditCard, PiggyBank, History, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';

const categoryIcons = {
    received: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
    payment: { icon: History, color: 'text-blue-600', bg: 'bg-blue-50' },
    saving: { icon: PiggyBank, color: 'text-amber-600', bg: 'bg-amber-50' }
};

export default function BankAccountsPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isView, setIsView] = useState(false);
    const [formData, setFormData] = useState({
        accountName: '', accountNumber: '', bankName: '', branchName: '', category: 'received', currentBalance: 0
    });

    const { data, isLoading } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => {
            const { data } = await api.get('/bank-accounts');
            return data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/bank-accounts', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Bank account added');
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => (await api.put(`/bank-accounts/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Bank account updated');
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/bank-accounts/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Bank account deleted');
        }
    });

    const openView = (account) => {
        setIsView(true);
        setEditingId(account._id);
        setFormData({
            accountName: account.accountName,
            accountNumber: account.accountNumber,
            bankName: account.bankName,
            branchName: account.branchName,
            category: account.category,
            currentBalance: account.currentBalance || 0
        });
        setIsModalOpen(true);
    };

    const openEdit = (account) => {
        setIsView(false);
        setEditingId(account._id);
        setFormData({
            accountName: account.accountName,
            accountNumber: account.accountNumber,
            bankName: account.bankName,
            branchName: account.branchName,
            category: account.category,
            currentBalance: account.currentBalance || 0
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setIsView(false);
        setFormData({ accountName: '', accountNumber: '', bankName: '', branchName: '', category: 'received', currentBalance: 0 });
    };

    const accounts = data?.data || [];
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n || 0);

    const columns = [
        { key: 'category', label: 'Category', render: (r) => {
            const cfg = categoryIcons[r.category];
            const Icon = cfg.icon;
            return (
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 ${cfg.bg} ${cfg.color} rounded-lg`}><Icon size={16} /></div>
                    <span className="capitalize text-xs font-bold">{r.category}</span>
                </div>
            );
        }},
        { key: 'bankName', label: 'Bank', render: (r) => <div><p className="font-bold text-gray-900">{r.bankName}</p><p className="text-xs text-gray-500">{r.branchName}</p></div> },
        { key: 'accountName', label: 'Account Name', render: (r) => r.accountName },
        { key: 'accountNumber', label: 'Account Number', render: (r) => <span className="font-mono text-gray-600">{r.accountNumber}</span> },
        { key: 'balance', label: 'Balance', render: (r) => <span className="font-bold text-gray-900">{fmt(r.currentBalance)}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        { key: 'actions', label: 'Actions', width: '120px', render: (r) => (
            <div className="flex gap-1 justify-end">
                <button onClick={() => openView(r)} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors" title="View"><Eye size={16} /></button>
                <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors" title="Edit"><Edit2 size={16} /></button>
                <button 
                    onClick={() => { if(window.confirm(`Delete ${r.accountName}?`)) deleteMutation.mutate(r._id) }} 
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    title="Delete"
                    disabled={deleteMutation.isPending}
                ><Trash2 size={16} /></button>
            </div>
        )},
    ];

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Bank Accounts" 
                description="Manage Received, Payment, and Saving bank accounts"
                icon={Landmark}
                actions={
                    <Button variant="primary" onClick={() => { setIsView(false); setIsModalOpen(true); }}>
                        <Plus size={16} className="mr-1.5" /> Add Account
                    </Button>
                }
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                {['received', 'payment', 'saving'].map(cat => {
                    const cfg = categoryIcons[cat];
                    const Icon = cfg.icon;
                    const total = accounts.filter(a => a.category === cat).reduce((s, a) => s + a.currentBalance, 0);
                    return (
                        <Card key={cat} className="p-4 sm:p-6 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-4 sm:p-8 -mr-4 -mt-4 opacity-10 group-hover:opacity-20 transition-opacity ${cfg.color}`}><Icon className="h-16 w-16 sm:h-20 sm:w-20" /></div>
                            <p className="text-2xs sm:text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{cat} Accounts</p>
                            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 sm:mb-4">{fmt(total)}</h3>
                            <div className="flex items-center justify-between text-2xs sm:text-xs font-medium">
                                <span className="text-gray-500">{accounts.filter(a => a.category === cat).length} active</span>
                                <Badge variant="info" className="capitalize">{cat}</Badge>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <Card>
                    {isLoading ? (
                        <div className="py-20 text-center text-gray-500">Loading accounts...</div>
                    ) : accounts.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed rounded-xl m-4 border-gray-100">
                            <Landmark size={48} className="mx-auto text-gray-200 mb-4" />
                            <h3 className="text-gray-900 font-bold">No bank accounts added</h3>
                            <p className="text-gray-500 text-sm">Add your first bank account to start tracking balances.</p>
                            <Button variant="primary" className="mt-4" onClick={() => { setIsView(false); setIsModalOpen(true); }}>Add Account</Button>
                        </div>
                    ) : (
                        <Table columns={columns} data={accounts} />
                    )}
                </Card>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden space-y-4">
                {isLoading ? (
                    <Card className="p-6 text-center text-gray-500">Loading accounts...</Card>
                ) : accounts.length === 0 ? (
                    <Card className="p-6 text-center border-2 border-dashed rounded-xl border-gray-100">
                        <Landmark size={40} className="mx-auto text-gray-200 mb-2" />
                        <h3 className="text-gray-900 font-bold text-sm">No bank accounts added</h3>
                        <p className="text-gray-500 text-xs mt-1">Add your first bank account to start tracking balances.</p>
                        <Button variant="primary" className="mt-3 text-xs py-1.5 px-3" onClick={() => { setIsView(false); setIsModalOpen(true); }}>Add Account</Button>
                    </Card>
                ) : (
                    accounts.map(acc => {
                        const cfg = categoryIcons[acc.category];
                        const Icon = cfg.icon;
                        return (
                            <Card key={acc._id} className="p-4 space-y-3 border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 ${cfg.bg} ${cfg.color} rounded-lg`}>
                                            <Icon size={16} />
                                        </div>
                                        <span className="capitalize text-xs font-bold text-gray-700">{acc.category}</span>
                                    </div>
                                    <Badge variant={acc.isActive ? 'success' : 'default'} className="text-2xs px-2 py-0.5">
                                        {acc.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-gray-900 text-base">{acc.bankName}</h4>
                                    {acc.branchName && <p className="text-xs text-gray-500">{acc.branchName} Branch</p>}
                                    <div className="pt-1 flex flex-col gap-0.5">
                                        <p className="text-xs text-gray-600"><span className="text-gray-400 font-medium">Name:</span> {acc.accountName}</p>
                                        <p className="text-xs font-mono text-gray-600"><span className="text-gray-400 font-sans font-medium">No:</span> {acc.accountNumber}</p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-3xs uppercase tracking-wider text-gray-400 font-bold">Balance</span>
                                        <span className="font-black text-gray-900 text-base">{fmt(acc.currentBalance)}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => openView(acc)} 
                                            className="p-2 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors border border-gray-100"
                                            title="View"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button 
                                            onClick={() => openEdit(acc)} 
                                            className="p-2 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors border border-primary-50"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => { if(window.confirm(`Delete ${acc.accountName}?`)) deleteMutation.mutate(acc._id) }} 
                                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-red-50"
                                            title="Delete"
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? (isView ? 'View Bank Account' : 'Edit Bank Account') : 'Add Bank Account'} size="md">
                <div className="p-6 space-y-4">
                    <Select disabled={isView} 
                        label="Account Category" required
                        options={[
                            { value: 'received', label: 'Received Bank Account' },
                            { value: 'payment', label: 'Payment Bank Account' },
                            { value: 'saving', label: 'Saving Bank Account' },
                        ]}
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                    />
                    <Input disabled={isView} label="Bank Name" required placeholder="e.g., Bank of Ceylon" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} />
                    <Input disabled={isView} label="Branch Name" placeholder="e.g., Colombo Main" value={formData.branchName} onChange={(e) => setFormData({...formData, branchName: e.target.value})} />
                    <Input disabled={isView} label="Account Name" required placeholder="e.g., Rishan Wholesale Main" value={formData.accountName} onChange={(e) => setFormData({...formData, accountName: e.target.value})} />
                    <Input disabled={isView} label="Account Number" required placeholder="e.g., 0012345678" value={formData.accountNumber} onChange={(e) => setFormData({...formData, accountNumber: e.target.value})} />
                    <Input disabled={isView} type="number" label="Current Balance (LKR)" placeholder="e.g., 50000" value={formData.currentBalance} onChange={(e) => setFormData({...formData, currentBalance: Number(e.target.value) || 0})} />
                    
                    <div className="pt-4 flex gap-2">
                        {!isView && (
                            <Button 
                                variant="primary" fullWidth 
                                onClick={() => editingId ? updateMutation.mutate({ id: editingId, data: formData }) : createMutation.mutate(formData)} 
                                loading={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingId ? 'Update Account' : 'Save Account'}
                            </Button>
                        )}
                        <Button variant={isView ? "primary" : "outline"} fullWidth onClick={closeModal}>
                            {isView ? 'Close' : 'Cancel'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

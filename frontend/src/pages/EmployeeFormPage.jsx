import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Briefcase, CreditCard, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import {
    useEmployee, useCreateEmployee, useUpdateEmployee,
    useDepartments, useDesignations, useShifts, useSalaryStructures,
} from '../features/hr/useHr';

const tabs = [
    { id: 'general', label: '1. Basic & Employment Info', icon: User, desc: 'Essential details required to onboard' },
    { id: 'statutory', label: '2. Bank, Statutory & Extended HR', icon: CreditCard, desc: 'Bank account, EPF/ETF & personal details (optional)' },
];

export default function EmployeeFormPage() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const [tab, setTab] = useState('general');

    const createMutation = useCreateEmployee();
    const updateMutation = useUpdateEmployee();
    const { data: existingData } = useEmployee(id);
    const { data: deptsData } = useDepartments();
    const { data: designationsData } = useDesignations();
    const { data: shiftsData } = useShifts();
    const { data: structuresData } = useSalaryStructures({ isActive: 'true' });

    const [form, setForm] = useState({
        firstName: '', lastName: '', gender: '', dateOfBirth: '', nationalIdNumber: '',
        maritalStatus: '', nationality: 'Sri Lankan', bloodGroup: '',
        email: '', phone: '', mobile: '',
        permanentAddress: { line1: '', city: '', postalCode: '' },
        currentAddress: { line1: '', city: '', postalCode: '' },
        emergencyContact: { name: '', relationship: '', phone: '' },
        departmentId: '', designationId: '', reportsToId: '',
        employmentType: 'permanent',
        dateOfJoining: new Date().toISOString().slice(0, 10),
        probationEndDate: '',
        workLocation: '', workShift: '',
        epfNumber: '', etfNumber: '', taxRegistrationNumber: '',
        bankDetails: { bankName: '', branchName: '', accountNumber: '', accountName: '' },
        salaryStructureId: '', basicSalary: 0, commissionRate: 0,
        status: 'active',
        notes: '',
    });

    useEffect(() => {
        if (isEdit && existingData?.data) {
            const e = existingData.data;
            setForm({
                firstName: e.firstName || '',
                lastName: e.lastName || '',
                gender: e.gender || '',
                dateOfBirth: e.dateOfBirth ? e.dateOfBirth.slice(0, 10) : '',
                nationalIdNumber: e.nationalIdNumber || '',
                maritalStatus: e.maritalStatus || '',
                nationality: e.nationality || 'Sri Lankan',
                bloodGroup: e.bloodGroup || '',
                email: e.email || '',
                phone: e.phone || '',
                mobile: e.mobile || '',
                permanentAddress: e.permanentAddress || { line1: '', city: '', postalCode: '' },
                currentAddress: e.currentAddress || { line1: '', city: '', postalCode: '' },
                emergencyContact: e.emergencyContact || { name: '', relationship: '', phone: '' },
                departmentId: e.departmentId?._id || '',
                designationId: e.designationId?._id || '',
                reportsToId: e.reportsToId?._id || '',
                employmentType: e.employmentType || 'permanent',
                dateOfJoining: e.dateOfJoining ? e.dateOfJoining.slice(0, 10) : new Date().toISOString().slice(0, 10),
                probationEndDate: e.probationEndDate ? e.probationEndDate.slice(0, 10) : '',
                workLocation: e.workLocation || '',
                workShift: e.workShift?._id || '',
                epfNumber: e.epfNumber || '',
                etfNumber: e.etfNumber || '',
                taxRegistrationNumber: e.taxRegistrationNumber || '',
                bankDetails: e.bankDetails || { bankName: '', branchName: '', accountNumber: '', accountName: '' },
                salaryStructureId: e.salaryStructureId?._id || '',
                basicSalary: e.basicSalary || 0,
                commissionRate: e.commissionRate || 0,
                status: e.status || 'active',
                notes: e.notes || '',
            });
        }
    }, [isEdit, existingData]);

    const update = (path, value) => {
        setForm((prev) => {
            const copy = { ...prev };
            const parts = path.split('.');
            if (parts.length === 1) copy[parts[0]] = value;
            else {
                copy[parts[0]] = { ...copy[parts[0]], [parts[1]]: value };
            }
            return copy;
        });
    };

    const submit = async () => {
        if (!form.firstName?.trim() || !form.lastName?.trim() || !form.dateOfJoining) {
            toast.error('First name, last name and date of joining are required');
            setTab('general');
            return;
        }
        try {
            const payload = {
                ...form,
                basicSalary: +form.basicSalary || 0,
                commissionRate: +form.commissionRate || 0,
                departmentId: form.departmentId || undefined,
                designationId: form.designationId || undefined,
                reportsToId: form.reportsToId || undefined,
                workShift: form.workShift || undefined,
                salaryStructureId: form.salaryStructureId || undefined,
            };
            if (isEdit) {
                await updateMutation.mutateAsync({ id, data: payload });
                toast.success('Employee updated successfully');
                navigate(`/employees/${id}`);
            } else {
                const result = await createMutation.mutateAsync(payload);
                toast.success('Employee created successfully');
                navigate(`/employees/${result.data._id}`);
            }
        } catch { }
    };

    const deptOptions = (deptsData?.data || []).map((d) => ({ value: d._id, label: d.name }));
    const designationOptions = (designationsData?.data || []).map((d) => ({ value: d._id, label: d.name }));
    const shiftOptions = (shiftsData?.data || []).map((s) => ({ value: s._id, label: s.name }));
    const structureOptions = (structuresData?.data || []).map((s) => ({ value: s._id, label: s.name }));

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                title={isEdit ? `Edit Employee — ${form.firstName} ${form.lastName}` : 'New Employee'}
                description={isEdit ? 'Update employee job profile and statutory records' : 'Quickly onboard a new employee or staff member'}
                actions={
                    <Button variant="outline" onClick={() => navigate('/employees')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back to Employees
                    </Button>
                }
            />

            <Card className="overflow-hidden border border-gray-200 shadow-sm">
                {/* Clean Tab Header */}
                <div className="flex border-b border-gray-200 bg-gray-50/70 px-4 pt-2 gap-2">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                                    active
                                        ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-xs'
                                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60 rounded-t-lg'
                                }`}
                            >
                                <Icon size={16} />
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="p-6">
                    {/* TAB 1: ESSENTIAL & EMPLOYMENT DETAILS */}
                    {tab === 'general' && (
                        <div className="space-y-6">
                            {/* Personal Details */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                                    <User size={16} className="text-indigo-600" />
                                    <span>Personal Information</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="First Name"
                                        placeholder="e.g. Kasun"
                                        required
                                        value={form.firstName}
                                        onChange={(e) => update('firstName', e.target.value)}
                                    />
                                    <Input
                                        label="Last Name"
                                        placeholder="e.g. Perera"
                                        required
                                        value={form.lastName}
                                        onChange={(e) => update('lastName', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="NIC / National ID"
                                        placeholder="e.g. 199012345678"
                                        value={form.nationalIdNumber}
                                        onChange={(e) => update('nationalIdNumber', e.target.value)}
                                    />
                                    <Input
                                        label="Mobile Phone"
                                        placeholder="e.g. 077-1234567"
                                        value={form.mobile}
                                        onChange={(e) => update('mobile', e.target.value)}
                                    />
                                    <Input
                                        label="Email Address (Optional)"
                                        type="email"
                                        placeholder="employee@example.com"
                                        value={form.email}
                                        onChange={(e) => update('email', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Job & Employment Details */}
                            <div className="space-y-3 pt-2">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                                    <Briefcase size={16} className="text-indigo-600" />
                                    <span>Job & Role Details</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select
                                        label="Designation / Role"
                                        placeholder="Select designation..."
                                        options={designationOptions}
                                        value={form.designationId}
                                        onChange={(e) => update('designationId', e.target.value)}
                                    />
                                    <Select
                                        label="Department"
                                        placeholder="Select department..."
                                        options={deptOptions}
                                        value={form.departmentId}
                                        onChange={(e) => update('departmentId', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Select
                                        label="Employment Type"
                                        options={[
                                            { value: 'permanent', label: 'Permanent' },
                                            { value: 'probation', label: 'Probation' },
                                            { value: 'contract', label: 'Contract' },
                                            { value: 'part_time', label: 'Part-time' },
                                            { value: 'intern', label: 'Intern' },
                                            { value: 'consultant', label: 'Consultant' },
                                        ]}
                                        value={form.employmentType}
                                        onChange={(e) => update('employmentType', e.target.value)}
                                    />
                                    <Input
                                        label="Date of Joining"
                                        type="date"
                                        required
                                        value={form.dateOfJoining}
                                        onChange={(e) => update('dateOfJoining', e.target.value)}
                                    />
                                    <Select
                                        label="Work Shift"
                                        placeholder="Default shift..."
                                        options={shiftOptions}
                                        value={form.workShift}
                                        onChange={(e) => update('workShift', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Work Location / Branch"
                                        placeholder="e.g. Colombo Main Store"
                                        value={form.workLocation}
                                        onChange={(e) => update('workLocation', e.target.value)}
                                    />
                                    <Select
                                        label="Employee Status"
                                        options={[
                                            { value: 'active', label: 'Active (Working)' },
                                            { value: 'probation', label: 'Probation' },
                                            { value: 'on_leave', label: 'On Leave' },
                                            { value: 'suspended', label: 'Suspended' },
                                            { value: 'resigned', label: 'Resigned' },
                                            { value: 'terminated', label: 'Terminated' },
                                        ]}
                                        value={form.status}
                                        onChange={(e) => update('status', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Salary & Compensation */}
                            <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-4 space-y-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                    <span>Salary & Compensation</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="Basic Salary (LKR/month)"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={form.basicSalary}
                                        onChange={(e) => update('basicSalary', e.target.value)}
                                    />
                                    <Input
                                        label="Sales Commission (%)"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        placeholder="0"
                                        value={form.commissionRate}
                                        onChange={(e) => update('commissionRate', e.target.value)}
                                    />
                                    <Select
                                        label="Salary Structure (Optional)"
                                        placeholder="Standard / Basic Only"
                                        options={structureOptions}
                                        value={form.salaryStructureId}
                                        onChange={(e) => update('salaryStructureId', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: BANK, STATUTORY & EXTENDED DETAILS */}
                    {tab === 'statutory' && (
                        <div className="space-y-6">
                            {/* Bank Details */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                                    <CreditCard size={16} className="text-indigo-600" />
                                    <span>Bank Account (for direct salary deposit)</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Bank Name"
                                        placeholder="e.g. Commercial Bank, BOC, Sampath"
                                        value={form.bankDetails.bankName}
                                        onChange={(e) => update('bankDetails.bankName', e.target.value)}
                                    />
                                    <Input
                                        label="Branch Name"
                                        placeholder="e.g. Kollupitiya"
                                        value={form.bankDetails.branchName}
                                        onChange={(e) => update('bankDetails.branchName', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Account Number"
                                        placeholder="e.g. 8001234567"
                                        value={form.bankDetails.accountNumber}
                                        onChange={(e) => update('bankDetails.accountNumber', e.target.value)}
                                    />
                                    <Input
                                        label="Account Holder Name"
                                        placeholder="As registered in bank"
                                        value={form.bankDetails.accountName}
                                        onChange={(e) => update('bankDetails.accountName', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Statutory Details */}
                            <div className="space-y-3 pt-2">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                                    <ShieldCheck size={16} className="text-indigo-600" />
                                    <span>Statutory & Tax Compliance</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="EPF Number"
                                        placeholder="e.g. 12345"
                                        value={form.epfNumber}
                                        onChange={(e) => update('epfNumber', e.target.value)}
                                    />
                                    <Input
                                        label="ETF Number"
                                        placeholder="e.g. 12345"
                                        value={form.etfNumber}
                                        onChange={(e) => update('etfNumber', e.target.value)}
                                    />
                                    <Input
                                        label="Tax Registration (TIN)"
                                        placeholder="Optional"
                                        value={form.taxRegistrationNumber}
                                        onChange={(e) => update('taxRegistrationNumber', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Address & Emergency Contact */}
                            <div className="space-y-3 pt-2">
                                <h3 className="text-sm font-semibold text-gray-800 border-b pb-2">
                                    Address & Emergency Contact
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Address Line"
                                            placeholder="Street / Residence address"
                                            value={form.permanentAddress.line1}
                                            onChange={(e) => update('permanentAddress.line1', e.target.value)}
                                        />
                                    </div>
                                    <Input
                                        label="City"
                                        placeholder="e.g. Kandy"
                                        value={form.permanentAddress.city}
                                        onChange={(e) => update('permanentAddress.city', e.target.value)}
                                    />
                                </div>
                                <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
                                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                                        Emergency Contact Person
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <Input
                                            label="Contact Name"
                                            placeholder="Spouse / Parent"
                                            value={form.emergencyContact.name}
                                            onChange={(e) => update('emergencyContact.name', e.target.value)}
                                        />
                                        <Input
                                            label="Relationship"
                                            placeholder="e.g. Wife, Mother"
                                            value={form.emergencyContact.relationship}
                                            onChange={(e) => update('emergencyContact.relationship', e.target.value)}
                                        />
                                        <Input
                                            label="Emergency Phone"
                                            placeholder="07X-XXXXXXX"
                                            value={form.emergencyContact.phone}
                                            onChange={(e) => update('emergencyContact.phone', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Other Personal Details */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                                <Select
                                    label="Gender"
                                    placeholder="Select..."
                                    options={[
                                        { value: 'male', label: 'Male' },
                                        { value: 'female', label: 'Female' },
                                        { value: 'other', label: 'Other' },
                                    ]}
                                    value={form.gender}
                                    onChange={(e) => update('gender', e.target.value)}
                                />
                                <Input
                                    label="Date of Birth"
                                    type="date"
                                    value={form.dateOfBirth}
                                    onChange={(e) => update('dateOfBirth', e.target.value)}
                                />
                                <Select
                                    label="Marital Status"
                                    placeholder="Select..."
                                    options={[
                                        { value: 'single', label: 'Single' },
                                        { value: 'married', label: 'Married' },
                                        { value: 'other', label: 'Other' },
                                    ]}
                                    value={form.maritalStatus}
                                    onChange={(e) => update('maritalStatus', e.target.value)}
                                />
                                <Input
                                    label="Blood Group"
                                    placeholder="e.g. O+, A+"
                                    value={form.bloodGroup}
                                    onChange={(e) => update('bloodGroup', e.target.value)}
                                />
                            </div>

                            <Textarea
                                label="HR Notes / Remarks"
                                rows={2}
                                placeholder="Any additional notes about this employee..."
                                value={form.notes}
                                onChange={(e) => update('notes', e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/90">
                    <div className="text-xs text-gray-500">
                        {tab === 'general' ? (
                            <span>Bank & Statutory details can be added now or later in Tab 2</span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setTab('general')}
                                className="text-indigo-600 hover:underline font-medium cursor-pointer"
                            >
                                ← Back to Basic Details
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => navigate('/employees')}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={submit}
                            loading={createMutation.isPending || updateMutation.isPending}
                        >
                            <Save size={16} className="mr-1.5" /> {isEdit ? 'Update Employee' : 'Save Employee'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

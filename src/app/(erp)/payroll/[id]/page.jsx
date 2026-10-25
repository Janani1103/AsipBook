"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  DollarSign,
  Eye,
  FileText,
  Printer,
  Search,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog.jsx";
import Input from "../../../../components/ui/Input.jsx";
import Modal from "../../../../components/ui/Modal.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Table from "../../../../components/ui/Table.jsx";
import {
  usePayroll,
  usePayrollActions,
} from "../../../../client/features/hr/useHr.js";
import { useBankAccounts } from "../../../../client/features/bankAccounts/useBankAccounts.js";
import { useCompanySettings } from "../../../../client/features/settings/useSettings.js";

const names = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

function TotalCard({ label, value, subtext, highlight = false }) {
  return (
    <Card className={`p-4 ${highlight ? "border-emerald-200 bg-emerald-50/40" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? "text-emerald-900" : "text-gray-900"}`}>
        {value}
      </p>
      {subtext && <p className="mt-0.5 text-xs text-gray-500">{subtext}</p>}
    </Card>
  );
}

export default function PayrollDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const payroll = usePayroll(id).data?.data;
  const actions = usePayrollActions();
  const { data: settingsData } = useCompanySettings();
  const settings = settingsData?.data || {};

  const { data: bankAccountsData } = useBankAccounts({ isActive: true });
  const bankAccounts = bankAccountsData?.data || [];

  const [confirmApprove, setConfirmApprove] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: "bank_transfer",
    bankAccountId: "",
    paidAt: new Date().toISOString().split("T")[0],
    paymentReference: "",
    notes: "",
  });

  if (!payroll) {
    return <div className="py-16 text-center text-gray-500">Loading payroll details...</div>;
  }

  const periodLabel = `${names[payroll.periodMonth - 1]} ${payroll.periodYear}`;
  const payslips = payroll.payslips || [];

  const bankOptions = bankAccounts.map((b) => ({
    value: b._id,
    label: `${b.bankName} - ${b.accountName} (${b.accountNumber}) [Bal: ${money(b.currentBalance)}]`,
  }));

  const filteredPayslips = payslips.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.employeeName?.toLowerCase().includes(term) ||
      item.employeeCode?.toLowerCase().includes(term)
    );
  });

  const handleApprove = async () => {
    try {
      await actions.approve.mutateAsync(payroll._id);
      setConfirmApprove(false);
    } catch {}
  };

  const handleDisbursePayment = async () => {
    if (
      (paymentForm.paymentMethod === "bank_transfer" || paymentForm.paymentMethod === "cheque") &&
      !paymentForm.bankAccountId &&
      bankAccounts.length > 0
    ) {
      toast.error("Please select a bank account to deduct funds from");
      return;
    }

    try {
      await actions.markPaid.mutateAsync({
        id: payroll._id,
        data: paymentForm,
      });
      setIsPaymentModalOpen(false);
    } catch {}
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.employeeName}</p>
          <p className="font-mono text-xs text-gray-500">{row.employeeCode}</p>
        </div>
      ),
    },
    {
      key: "attendance",
      label: "Attendance",
      render: (row) => (
        <div>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {row.daysPresent} / {row.workingDays} days
          </span>
          {row.overtimeHours > 0 && (
            <p className="text-[11px] text-gray-500 mt-0.5">OT: {row.overtimeHours} hrs</p>
          )}
        </div>
      ),
    },
    {
      key: "basicSalary",
      label: "Basic",
      render: (row) => (
        <span className="font-mono text-xs text-gray-700">{money(row.basicSalary)}</span>
      ),
    },
    {
      key: "gross",
      label: "Gross",
      render: (row) => (
        <span className="font-mono text-xs font-medium text-gray-900">
          {money(row.grossEarnings)}
        </span>
      ),
    },
    {
      key: "deductions",
      label: "Deductions",
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-medium text-red-600">
            -{money(row.totalDeductions)}
          </span>
          <p className="text-[10px] text-gray-400">
            EPF 8%: {money(row.epfEmployeeContribution)}
          </p>
        </div>
      ),
    },
    {
      key: "net",
      label: "Net Pay",
      render: (row) => (
        <span className="font-mono text-sm font-bold text-emerald-800">
          {money(row.netPay)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={row.paymentStatus === "paid" ? "success" : "default"}>
          {row.paymentStatus}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "100px",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
            title="Quick View Payslip"
            onClick={() => setSelectedPayslip(row)}
          >
            <Eye size={16} />
          </button>
          <button
            className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
            title="Open Dedicated Payslip Page"
            onClick={() =>
              router.push(`/payroll/${payroll._id}/payslip/${row.employeeId}`)
            }
          >
            <FileText size={16} />
          </button>
        </div>
      ),
    },
  ];

  const pageActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => router.push("/payroll")}>
        <ArrowLeft size={16} className="mr-1.5" />
        Back
      </Button>

      {/* Master Sheet Print Button */}
      <Button
        variant="outline"
        onClick={() => router.push(`/payroll/${payroll._id}/master-sheet`)}
        className="border-gray-300 text-gray-700 hover:bg-gray-100"
      >
        <Printer size={16} className="mr-1.5 text-gray-600" />
        Print Master Sheet
      </Button>

      {payroll.status === "processed" && (
        <Button variant="primary" onClick={() => setConfirmApprove(true)}>
          <CheckCircle size={16} className="mr-1.5" />
          Approve Payroll
        </Button>
      )}

      {payroll.status === "approved" && (
        <Button
          variant="primary"
          onClick={() => {
            setPaymentForm((prev) => ({
              ...prev,
              bankAccountId: prev.bankAccountId || bankAccounts[0]?._id || "",
              paymentReference: prev.paymentReference || payroll.payrollNumber,
            }));
            setIsPaymentModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <DollarSign size={16} className="mr-1.5" />
          Mark Paid & Disburse Funds
        </Button>
      )}

      {payroll.status === "paid" && (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
          <CheckCircle size={14} /> Paid & Disbursed
        </span>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title={payroll.payrollNumber}
        description={`${periodLabel} · ${payroll.totalEmployees} employees · Status: ${payroll.status.toUpperCase()}`}
        actions={pageActions}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TotalCard
          label="Gross Earnings"
          value={money(payroll.totalGrossEarnings)}
          subtext="Total earnings across all staff"
        />
        <TotalCard
          label="Total Deductions"
          value={money(payroll.totalDeductions)}
          subtext={`Includes EPF 8% (${money(payroll.totalEpfEmployee)})`}
        />
        <TotalCard
          label="EPF (12%) + ETF (3%)"
          value={money((payroll.totalEpfEmployer || 0) + (payroll.totalEtf || 0))}
          subtext="Company employer contributions"
        />
        <TotalCard
          label="Net Payable"
          value={money(payroll.totalNetPay)}
          subtext="Net disbursement to employees"
          highlight={true}
        />
      </div>

      <Card>
        {/* Table Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b p-4">
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Search employee by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users size={14} />
            <span>
              Showing {filteredPayslips.length} of {payslips.length} employees
            </span>
          </div>
        </div>

        <Table columns={columns} data={filteredPayslips} />
      </Card>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmApprove}
        onClose={() => setConfirmApprove(false)}
        onConfirm={handleApprove}
        title="Approve Payroll"
        message={`Approve payroll for ${periodLabel} (${payslips.length} employees)? Once approved, you can proceed with fund disbursal.`}
        loading={actions.approve.isPending}
      />

      {/* Payment / Funds Deduction Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Disburse Payroll & Deduct Funds"
        size="md"
      >
        <div className="space-y-4 p-6">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Total Salary Disbursal Amount
            </p>
            <p className="text-3xl font-black text-emerald-950 font-mono mt-0.5">
              {money(payroll.totalNetPay)}
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              For {payroll.totalEmployees} employees · {periodLabel}
            </p>
          </div>

          <Select
            label="Payment Source / Method"
            required
            value={paymentForm.paymentMethod}
            onChange={(e) => {
              const method = e.target.value;
              setPaymentForm((prev) => ({
                ...prev,
                paymentMethod: method,
                bankAccountId:
                  method !== "cash" && !prev.bankAccountId && bankAccounts[0]
                    ? bankAccounts[0]._id
                    : prev.bankAccountId,
              }));
            }}
            options={[
              { value: "bank_transfer", label: "Bank Transfer (Direct Account Deduction)" },
              { value: "cash", label: "Petty Cash / Cash Drawer" },
              { value: "cheque", label: "Company Cheque" },
            ]}
          />

          {(paymentForm.paymentMethod === "bank_transfer" || paymentForm.paymentMethod === "cheque") && (
            <div>
              <Select
                label="Company Bank Account to Deduct From"
                required
                placeholder="Select Bank Account..."
                value={paymentForm.bankAccountId}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, bankAccountId: e.target.value }))
                }
                options={bankOptions}
              />
              {paymentForm.bankAccountId && (
                <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2.5 mt-2">
                  <CreditCard size={14} className="shrink-0" />
                  <span>
                    <strong>{money(payroll.totalNetPay)}</strong> will be automatically deducted from this account balance upon confirmation.
                  </span>
                </div>
              )}
            </div>
          )}

          {paymentForm.paymentMethod === "cash" && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>{money(payroll.totalNetPay)}</strong> will be recorded as a Cash Salary Expense from Petty Cash.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Payment Date"
              type="date"
              required
              value={paymentForm.paidAt}
              onChange={(e) =>
                setPaymentForm((prev) => ({ ...prev, paidAt: e.target.value }))
              }
            />
            <Input
              label="Payment Ref / Cheque No"
              placeholder={payroll.payrollNumber}
              value={paymentForm.paymentReference}
              onChange={(e) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  paymentReference: e.target.value,
                }))
              }
            />
          </div>

          <Input
            label="Remarks / Notes (Optional)"
            placeholder="e.g. October 2026 Salary Disbursal via Commercial Bank"
            value={paymentForm.notes}
            onChange={(e) =>
              setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDisbursePayment}
            loading={actions.markPaid.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <DollarSign size={16} className="mr-1.5" />
            Confirm & Deduct Funds
          </Button>
        </div>
      </Modal>

      {/* Individual Payslip Quick Preview Modal */}
      <Modal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        title={`Payslip - ${selectedPayslip?.employeeName || ""}`}
        size="lg"
      >
        {selectedPayslip && (
          <div className="space-y-6 p-6">
            {/* Header with Company Logo & Period */}
            <div className="flex justify-between items-start border-b pb-4">
              <div className="flex items-center gap-3">
                {settings.logo && (
                  <img
                    src={settings.logo}
                    alt="Company Logo"
                    className="h-12 w-auto object-contain"
                  />
                )}
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {settings.companyName || "Organization"}
                  </h3>
                  <p className="text-xs text-gray-500">{settings.address}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                  {payroll.payrollNumber}
                </span>
                <p className="text-sm font-bold text-gray-900 mt-1">{periodLabel}</p>
                <Badge variant={selectedPayslip.paymentStatus === "paid" ? "success" : "default"}>
                  {selectedPayslip.paymentStatus}
                </Badge>
              </div>
            </div>

            {/* Employee Information */}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-xs">
              <div>
                <p className="text-gray-500 uppercase font-semibold">Employee Details</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {selectedPayslip.employeeName}
                </p>
                <p className="font-mono text-gray-600">{selectedPayslip.employeeCode}</p>
              </div>
              <div>
                <p className="text-gray-500 uppercase font-semibold">Attendance & Period</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  Present: {selectedPayslip.daysPresent} / {selectedPayslip.workingDays} working days
                </p>
                {selectedPayslip.overtimeHours > 0 && (
                  <p className="text-gray-600">OT: {selectedPayslip.overtimeHours} hours</p>
                )}
              </div>
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Earnings */}
              <div className="border border-gray-200 rounded p-4">
                <h4 className="font-bold uppercase tracking-wider text-gray-700 border-b pb-2 mb-2">
                  Earnings
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Basic Salary</span>
                    <span className="font-mono font-medium">{money(selectedPayslip.basicSalary)}</span>
                  </div>
                  {selectedPayslip.earnings?.map((item, index) => (
                    <div key={index} className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-mono">{money(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-bold text-gray-900 text-sm">
                    <span>Gross Earnings</span>
                    <span className="font-mono">{money(selectedPayslip.grossEarnings)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-gray-200 rounded p-4">
                <h4 className="font-bold uppercase tracking-wider text-gray-700 border-b pb-2 mb-2">
                  Deductions
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">EPF Employee (8%)</span>
                    <span className="font-mono text-red-600">
                      -{money(selectedPayslip.epfEmployeeContribution)}
                    </span>
                  </div>
                  {selectedPayslip.deductions?.map((item, index) => (
                    <div key={index} className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-mono text-red-600">-{money(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-bold text-red-700 text-sm">
                    <span>Total Deductions</span>
                    <span className="font-mono">-{money(selectedPayslip.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight & Employer Statutory Contributions */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  Net Salary Payable
                </p>
                <p className="text-2xl font-black text-emerald-900 font-mono">
                  {money(selectedPayslip.netPay)}
                </p>
              </div>
              <div className="text-right text-xs text-gray-600 mt-2 sm:mt-0">
                <p>EPF Employer (12%): <strong className="font-mono">{money(selectedPayslip.epfEmployerContribution)}</strong></p>
                <p>ETF Contribution (3%): <strong className="font-mono">{money(selectedPayslip.etfContribution)}</strong></p>
                <p className="italic text-[10px] text-gray-400">Company employer statutory costs</p>
              </div>
            </div>

            {/* Signature & Seal */}
            <div className="flex justify-between items-center pt-2 px-4 text-xs">
              <div className="flex flex-col items-center">
                <div className="relative h-16 w-36 border-b border-gray-300 flex items-center justify-center">
                  {settings.ownerSeal && (
                    <img
                      src={settings.ownerSeal}
                      alt="Company Seal"
                      className="absolute inset-0 h-full w-full object-contain opacity-25"
                    />
                  )}
                  {settings.ownerSignature && (
                    <img
                      src={settings.ownerSignature}
                      alt="Signature"
                      className="absolute z-10 h-12 w-auto object-contain"
                    />
                  )}
                </div>
                <p className="mt-1 text-gray-500 font-medium">Authorized Signature</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="h-16 w-36 border-b border-gray-300"></div>
                <p className="mt-1 text-gray-500 font-medium">Employee Signature</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={() => setSelectedPayslip(null)}>
            Close
          </Button>
          {selectedPayslip && (
            <Button
              variant="primary"
              onClick={() => {
                const empId = selectedPayslip.employeeId;
                setSelectedPayslip(null);
                router.push(`/payroll/${payroll._id}/payslip/${empId}`);
              }}
            >
              <Printer size={16} className="mr-1.5" />
              Print / Open Full Payslip
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import Button from "../../../../../components/ui/Button.jsx";
import Card from "../../../../../components/ui/Card.jsx";
import PageHeader from "../../../../../components/ui/PageHeader.jsx";
import { usePayroll } from "../../../../../client/features/hr/useHr.js";
import { useCompanySettings } from "../../../../../client/features/settings/useSettings.js";

const monthNames = [
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

const money = (val) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(val || 0);

export default function MasterPayrollSheetPage() {
  const { id } = useParams();
  const router = useRouter();
  const payroll = usePayroll(id).data?.data;
  const { data: settingsData } = useCompanySettings();
  const settings = settingsData?.data || {};

  if (!payroll) {
    return <div className="py-16 text-center text-gray-500">Loading master payroll sheet...</div>;
  }

  const periodLabel = `${monthNames[payroll.periodMonth - 1]} ${payroll.periodYear}`;
  const payslips = payroll.payslips || [];

  // Aggregated totals
  const totalBasic = payslips.reduce((sum, p) => sum + (p.basicSalary || 0), 0);
  const totalGross = payslips.reduce((sum, p) => sum + (p.grossEarnings || 0), 0);
  const totalEpfEmp = payslips.reduce((sum, p) => sum + (p.epfEmployeeContribution || 0), 0);
  const totalEpfEmpr = payslips.reduce((sum, p) => sum + (p.epfEmployerContribution || 0), 0);
  const totalEtf = payslips.reduce((sum, p) => sum + (p.etfContribution || 0), 0);
  const totalDeductions = payslips.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
  const totalNet = payslips.reduce((sum, p) => sum + (p.netPay || 0), 0);
  const otherDeductions = totalDeductions - totalEpfEmp;
  const totalStatutoryCost = totalEpfEmp + totalEpfEmpr + totalEtf;

  const actions = (
    <div className="flex gap-2 no-print">
      <Button variant="outline" onClick={() => router.push(`/payroll/${id}`)}>
        <ArrowLeft size={16} className="mr-1.5" />
        Back to Payroll
      </Button>
      <Button variant="primary" onClick={() => window.print()}>
        <Printer size={16} className="mr-1.5" />
        Print Master Sheet
      </Button>
    </div>
  );

  return (
    <div className="pb-12">
      <div className="no-print">
        <PageHeader
          title="Master Payroll Summary Sheet"
          description={`${periodLabel} · Official Organization Payroll Register`}
          actions={actions}
        />
      </div>

      <Card className="print-container max-w-7xl mx-auto p-8 bg-white text-gray-900 border shadow-sm">
        {/* Organization Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex items-center gap-4">
            {settings.logo && (
              <img
                src={settings.logo}
                alt="Company Logo"
                className="h-16 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
                {settings.companyName || "Organization Name"}
              </h1>
              <p className="text-xs text-gray-600 max-w-md">{settings.address}</p>
              <p className="text-xs text-gray-600">
                Phone: {settings.phone || "—"} {settings.email ? `| Email: ${settings.email}` : ""}
              </p>
              {settings.taxRegistrationNumber && (
                <p className="text-xs font-semibold text-gray-700">
                  VAT/Tax Reg: {settings.taxRegistrationNumber}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block bg-gray-900 text-white text-xs font-bold px-3 py-1 uppercase rounded tracking-wider mb-2">
              Master Payroll Register
            </span>
            <p className="text-lg font-bold text-gray-900">{periodLabel}</p>
            <p className="text-xs font-mono text-gray-600">Ref: {payroll.payrollNumber}</p>
            <p className="text-xs text-gray-500">
              Period: {new Date(payroll.periodStartDate).toLocaleDateString("en-LK")} —{" "}
              {new Date(payroll.periodEndDate).toLocaleDateString("en-LK")}
            </p>
            <p className="text-xs text-gray-500">
              Generated: {new Date(payroll.processedAt || payroll.createdAt).toLocaleDateString("en-LK")}
            </p>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="border border-gray-200 rounded p-2.5 bg-gray-50">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Employees</p>
            <p className="text-base font-bold text-gray-900">{payslips.length}</p>
          </div>
          <div className="border border-gray-200 rounded p-2.5 bg-gray-50">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Gross</p>
            <p className="text-base font-bold text-gray-900">{money(totalGross)}</p>
          </div>
          <div className="border border-gray-200 rounded p-2.5 bg-gray-50">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Deductions</p>
            <p className="text-base font-bold text-red-600">-{money(totalDeductions)}</p>
          </div>
          <div className="border border-emerald-300 rounded p-2.5 bg-emerald-50">
            <p className="text-[11px] font-bold text-emerald-800 uppercase">Net Disbursal</p>
            <p className="text-base font-bold text-emerald-900">{money(totalNet)}</p>
          </div>
          <div className="border border-blue-200 rounded p-2.5 bg-blue-50">
            <p className="text-[11px] font-semibold text-blue-800 uppercase">EPF Employer (12%)</p>
            <p className="text-base font-bold text-blue-900">{money(totalEpfEmpr)}</p>
          </div>
          <div className="border border-purple-200 rounded p-2.5 bg-purple-50">
            <p className="text-[11px] font-semibold text-purple-800 uppercase">ETF (3%)</p>
            <p className="text-base font-bold text-purple-900">{money(totalEtf)}</p>
          </div>
        </div>

        {/* Master Breakdown Table */}
        <div className="overflow-x-auto border border-gray-300 rounded mb-6">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 uppercase font-semibold">
                <th className="py-2.5 px-2 border-r border-gray-300 text-center w-8">#</th>
                <th className="py-2.5 px-2 border-r border-gray-300">Emp Code</th>
                <th className="py-2.5 px-3 border-r border-gray-300">Employee Name</th>
                <th className="py-2.5 px-2 border-r border-gray-300 text-center">Days</th>
                <th className="py-2.5 px-2 border-r border-gray-300 text-right">Basic</th>
                <th className="py-2.5 px-2 border-r border-gray-300 text-right">Gross Earnings</th>
                <th className="py-2.5 px-2 border-r border-gray-300 text-right">EPF 8% (Emp)</th>
                <th className="py-2.5 px-2 border-r border-gray-300 text-right">Other Deduct</th>
                <th className="py-2.5 px-2 border-r border-gray-300 text-right">Total Deduct</th>
                <th className="py-2.5 px-3 border-r border-gray-300 text-right font-bold bg-gray-200">Net Pay</th>
                <th className="py-2.5 px-2 border-r border-gray-300 text-right">EPF 12% (Empr)</th>
                <th className="py-2.5 px-2 border-r border-gray-300 text-right">ETF 3%</th>
                <th className="py-2.5 px-3 text-center">Status / Sign</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((row, idx) => {
                const rowOtherDeduct = (row.totalDeductions || 0) - (row.epfEmployeeContribution || 0);
                return (
                  <tr
                    key={row._id || idx}
                    className={`border-b border-gray-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
                  >
                    <td className="py-2 px-2 border-r border-gray-200 text-center font-mono text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 font-mono font-medium">
                      {row.employeeCode}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-200 font-medium text-gray-900">
                      {row.employeeName}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 text-center text-gray-600">
                      {row.daysPresent}/{row.workingDays}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 text-right">
                      {money(row.basicSalary)}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 text-right font-medium">
                      {money(row.grossEarnings)}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 text-right text-red-600">
                      -{money(row.epfEmployeeContribution)}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 text-right text-gray-600">
                      {rowOtherDeduct > 0 ? `-${money(rowOtherDeduct)}` : "—"}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 text-right font-medium text-red-700">
                      -{money(row.totalDeductions)}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-200 text-right font-bold text-gray-900 bg-gray-100">
                      {money(row.netPay)}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 text-right text-blue-700">
                      {money(row.epfEmployerContribution)}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-200 text-right text-purple-700">
                      {money(row.etfContribution)}
                    </td>
                    <td className="py-2 px-3 text-center text-xs">
                      <span className="capitalize font-semibold text-emerald-700">
                        {row.paymentStatus || "paid"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-900 text-white font-bold border-t-2 border-gray-900">
                <td colSpan={4} className="py-2.5 px-3 border-r border-gray-700 text-left uppercase">
                  Grand Totals ({payslips.length} Employees)
                </td>
                <td className="py-2.5 px-2 border-r border-gray-700 text-right">
                  {money(totalBasic)}
                </td>
                <td className="py-2.5 px-2 border-r border-gray-700 text-right">
                  {money(totalGross)}
                </td>
                <td className="py-2.5 px-2 border-r border-gray-700 text-right text-amber-300">
                  -{money(totalEpfEmp)}
                </td>
                <td className="py-2.5 px-2 border-r border-gray-700 text-right text-gray-300">
                  -{money(otherDeductions)}
                </td>
                <td className="py-2.5 px-2 border-r border-gray-700 text-right text-red-300">
                  -{money(totalDeductions)}
                </td>
                <td className="py-2.5 px-3 border-r border-gray-700 text-right text-emerald-300 text-sm">
                  {money(totalNet)}
                </td>
                <td className="py-2.5 px-2 border-r border-gray-700 text-right text-blue-300">
                  {money(totalEpfEmpr)}
                </td>
                <td className="py-2.5 px-2 border-r border-gray-700 text-right text-purple-300">
                  {money(totalEtf)}
                </td>
                <td className="py-2.5 px-3 text-center text-gray-300">
                  Verified
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Statutory & Banking Summary Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-300 rounded p-4 bg-gray-50/70 mb-8 text-xs">
          <div>
            <h4 className="font-bold text-gray-900 uppercase tracking-wide mb-2">
              Statutory Contributions Summary (EPF / ETF)
            </h4>
            <div className="space-y-1.5 text-gray-700">
              <div className="flex justify-between border-b pb-1">
                <span>Employee EPF (8% deducted from salary):</span>
                <span className="font-semibold">{money(totalEpfEmp)}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>Employer EPF (12% company contribution):</span>
                <span className="font-semibold">{money(totalEpfEmpr)}</span>
              </div>
              <div className="flex justify-between border-b pb-1 font-medium text-blue-900">
                <span>Total EPF Remittance to Department of Labour (20%):</span>
                <span className="font-bold">{money(totalEpfEmp + totalEpfEmpr)}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>Employer ETF (3% company contribution):</span>
                <span className="font-semibold">{money(totalEtf)}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-gray-900">
                <span>Total Statutory Liability for Month:</span>
                <span className="text-sm">{money(totalStatutoryCost)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 uppercase tracking-wide mb-2">
              Bank Disbursal & Audit Verification
            </h4>
            <div className="space-y-1.5 text-gray-700">
              <div className="flex justify-between border-b pb-1">
                <span>Net Salaries Disbursal (Direct Bank / Cash):</span>
                <span className="font-bold text-emerald-800">{money(totalNet)}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>Total Gross Company Payroll Expense:</span>
                <span className="font-semibold">{money(totalGross + totalEpfEmpr + totalEtf)}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>Payroll Reference Code:</span>
                <span className="font-mono font-medium">{payroll.payrollNumber}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Approval Status:</span>
                <span className="font-bold uppercase text-emerald-700">{payroll.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Signatures Section */}
        <div className="grid grid-cols-3 gap-8 pt-8 border-t-2 border-gray-400 text-center text-xs">
          <div className="flex flex-col items-center">
            <div className="h-16 w-full flex items-end justify-center border-b border-gray-400 pb-1">
              <span className="text-gray-400 italic">Signature</span>
            </div>
            <p className="mt-2 font-bold text-gray-900">Prepared By</p>
            <p className="text-gray-500">HR / Payroll Executive</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-16 w-full flex items-end justify-center border-b border-gray-400 pb-1">
              <span className="text-gray-400 italic">Signature</span>
            </div>
            <p className="mt-2 font-bold text-gray-900">Checked By</p>
            <p className="text-gray-500">Accountant / Finance Manager</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-16 w-full relative flex items-center justify-center border-b border-gray-400 pb-1">
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
                  alt="Authorized Signature"
                  className="absolute z-10 h-14 w-auto object-contain"
                />
              )}
            </div>
            <p className="mt-2 font-bold text-gray-900">Authorized & Approved By</p>
            <p className="text-gray-500">Managing Director / Board</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

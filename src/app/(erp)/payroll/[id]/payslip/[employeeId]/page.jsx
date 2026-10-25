"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Mail,
  MessageCircle,
  Printer,
  Receipt,
  UserCheck,
} from "lucide-react";
import Badge from "../../../../../../components/ui/Badge.jsx";
import Button from "../../../../../../components/ui/Button.jsx";
import Card from "../../../../../../components/ui/Card.jsx";
import PageHeader from "../../../../../../components/ui/PageHeader.jsx";
import { usePayslip } from "../../../../../../client/features/hr/useHr.js";
import { useCompanySettings } from "../../../../../../client/features/settings/useSettings.js";

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

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

function formatDateSriLanka(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function numberToWordsLKR(amount) {
  if (!amount || isNaN(amount)) return "Zero Rupees Only";
  const num = Math.round(Number(amount));
  if (num === 0) return "Zero Rupees Only";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function inWords(n) {
    if (n === 0) return "";
    if (n < 20) return a[n] + " ";
    if (n < 100)
      return (
        b[Math.floor(n / 10)] +
        (n % 10 !== 0 ? " " + a[n % 10] : "") +
        " "
      );
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred " +
        (n % 100 !== 0 ? "and " + inWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) + "Thousand " + inWords(n % 1000)
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) + "Lakh " + inWords(n % 100000)
      );
    return (
      inWords(Math.floor(n / 10000000)) + "Crore " + inWords(n % 10000000)
    );
  }

  const result = inWords(num).trim();
  return result ? `${result} Rupees Only` : "Zero Rupees Only";
}

export default function PayslipPage() {
  const { id, employeeId } = useParams();
  const router = useRouter();
  const [printFormat, setPrintFormat] = useState("a4"); // "a4" | "thermal"
  const data = usePayslip(id, employeeId).data?.data;
  const { data: settingsData } = useCompanySettings();
  const settings = settingsData?.data || {};

  if (!data) {
    return (
      <div className="py-20 text-center text-gray-500">
        Loading employee payslip...
      </div>
    );
  }

  const { payslip, payroll, employee } = data;
  const periodTitle = `${monthNames[payroll.periodMonth - 1]} ${payroll.periodYear}`;
  const netInWords = numberToWordsLKR(payslip.netPay);

  // Designation & Department formatting with fallback
  const roleDisplay = [employee.designation, employee.department]
    .filter(Boolean)
    .join(" · ") || "General Staff";

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const text = `*PAYSLIP — ${settings.companyName || "Organization"}*
Period: ${periodTitle} (Ref: ${payroll.payrollNumber})
Employee: ${employee.firstName} ${employee.lastName} (${employee.employeeCode})
Basic Salary: ${money(payslip.basicSalary)}
Gross Earnings: ${money(payslip.grossEarnings)}
Total Deductions: ${money(payslip.totalDeductions)} (EPF 8%: ${money(payslip.epfEmployeeContribution)})
*NET PAY: ${money(payslip.netPay)}*
Amount in Words: ${netInWords}
Status: ${(payslip.paymentStatus || "paid").toUpperCase()}`;

    const url = employee.phone
      ? `https://wa.me/${employee.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Share via Email
  const handleShareEmail = () => {
    const subject = `Payslip for ${periodTitle} - ${employee.firstName} ${employee.lastName}`;
    const body = `Dear ${employee.firstName},

Please find your payslip summary for ${periodTitle}:

Payroll Reference: ${payroll.payrollNumber}
Employee Code: ${employee.employeeCode}
Designation: ${roleDisplay}

Earnings:
- Basic Salary: ${money(payslip.basicSalary)}
- Gross Earnings: ${money(payslip.grossEarnings)}

Deductions:
- EPF Employee (8%): -${money(payslip.epfEmployeeContribution)}
- Total Deductions: -${money(payslip.totalDeductions)}

NET SALARY PAYABLE: ${money(payslip.netPay)}
(${netInWords})

Employer Statutory Contributions:
- EPF Employer (12%): ${money(payslip.epfEmployerContribution)}
- ETF Contribution (3%): ${money(payslip.etfContribution)}

Thank you.
${settings.companyName || "Finance & HR Team"}`;

    const mailto = `mailto:${employee.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <Button variant="outline" onClick={() => router.push(`/payroll/${id}`)}>
        <ArrowLeft size={16} className="mr-1.5" />
        Back
      </Button>

      {/* Format Switcher */}
      <div className="flex items-center rounded-lg border border-gray-300 bg-white p-1 text-xs font-medium text-gray-700">
        <button
          onClick={() => setPrintFormat("a4")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 ${
            printFormat === "a4"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <FileText size={14} />
          A4 Document
        </button>
        <button
          onClick={() => setPrintFormat("thermal")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 ${
            printFormat === "thermal"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Receipt size={14} />
          80mm Thermal
        </button>
      </div>

      <Button
        variant="outline"
        onClick={handleShareWhatsApp}
        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        title="Share via WhatsApp"
      >
        <MessageCircle size={16} className="mr-1.5 text-emerald-600" />
        WhatsApp
      </Button>

      <Button
        variant="outline"
        onClick={handleShareEmail}
        className="border-gray-300 text-gray-700 hover:bg-gray-100"
        title="Share via Email"
      >
        <Mail size={16} className="mr-1.5 text-gray-600" />
        Email
      </Button>

      <Button variant="primary" onClick={() => window.print()}>
        <Printer size={16} className="mr-1.5" />
        Print Payslip
      </Button>
    </div>
  );

  return (
    <div className="pb-12">
      <div className="no-print">
        <PageHeader
          title={`Payslip · ${employee.firstName} ${employee.lastName}`}
          description={`${periodTitle} · ${payroll.payrollNumber}`}
          actions={actions}
        />
      </div>

      {/* 1. Standard A4 Printable Slip */}
      {printFormat === "a4" && (
        <Card className="print-container mx-auto max-w-4xl border bg-white p-8 sm:p-10 text-gray-900 shadow-sm">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-5 mb-6">
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
                  {settings.companyName || "Organization"}
                </h1>
                <p className="text-xs text-gray-600 max-w-sm mt-0.5">{settings.address}</p>
                <p className="text-xs text-gray-600">
                  Tel: {settings.phone || "—"} {settings.email ? `· ${settings.email}` : ""}
                </p>
                {settings.taxRegistrationNumber && (
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">
                    VAT / Tax Reg: {settings.taxRegistrationNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block bg-gray-900 text-white text-xs font-extrabold px-3 py-1 uppercase rounded tracking-wider mb-1">
                PAYSLIP
              </span>
              <p className="text-xl font-bold text-gray-900 mt-1">{periodTitle}</p>
              <p className="font-mono text-xs text-gray-600 font-semibold">{payroll.payrollNumber}</p>
              <p className="text-xs text-gray-500 mt-1">
                Period: {formatDateSriLanka(payroll.periodStartDate)} —{" "}
                {formatDateSriLanka(payroll.periodEndDate)}
              </p>
            </div>
          </div>

          {/* Employee & Payment Details Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Employee Info Card */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4 text-xs">
              <div className="flex items-center gap-2 mb-2 text-gray-500 uppercase font-bold tracking-wider">
                <UserCheck size={14} className="text-blue-600" />
                <span>Employee Information</span>
              </div>
              <p className="text-base font-bold text-gray-900">
                {employee.firstName} {employee.lastName}
              </p>
              <p className="font-mono text-xs font-semibold text-blue-800 mt-0.5">
                Code: {employee.employeeCode}
              </p>
              <div className="mt-2 text-gray-700">
                <span className="inline-block bg-white border border-gray-300 rounded px-2 py-0.5 font-medium text-gray-800">
                  {roleDisplay}
                </span>
              </div>
              {employee.phone && (
                <p className="text-gray-500 mt-2">Mobile: {employee.phone}</p>
              )}
            </div>

            {/* Statutory & Bank Card */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4 text-xs">
              <div className="flex items-center gap-2 mb-2 text-gray-500 uppercase font-bold tracking-wider">
                <CreditCard size={14} className="text-emerald-600" />
                <span>Statutory & Disbursement</span>
              </div>
              <div className="space-y-1.5 text-gray-700">
                <div className="flex justify-between border-b border-gray-200/60 pb-1">
                  <span className="text-gray-500">EPF Registration No:</span>
                  <span className="font-mono font-bold text-gray-900">
                    {employee.epfNumber || "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-200/60 pb-1">
                  <span className="text-gray-500">Bank Name:</span>
                  <span className="font-medium text-gray-900">
                    {employee.bankDetails?.bankName || "Direct Bank / Cash"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-200/60 pb-1">
                  <span className="text-gray-500">Account No:</span>
                  <span className="font-mono font-medium text-gray-900">
                    {employee.bankDetails?.accountNumber || "—"}
                  </span>
                </div>
                <div className="flex justify-between pt-1 items-center">
                  <span className="text-gray-500">Payment Status:</span>
                  <Badge variant={payslip.paymentStatus === "paid" ? "success" : "default"}>
                    {(payslip.paymentStatus || "paid").toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance & Leave Summary Bar */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 mb-6">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
              <Calendar size={13} className="text-blue-700" />
              <span>Attendance & Leave Summary</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-white rounded p-2 border border-blue-100 shadow-2xs">
                <p className="text-[10px] text-gray-500 uppercase">Working Days</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{payslip.workingDays || 0}</p>
              </div>
              <div className="bg-white rounded p-2 border border-blue-100 shadow-2xs">
                <p className="text-[10px] text-gray-500 uppercase">Days Present</p>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">{payslip.daysPresent || 0}</p>
              </div>
              <div className="bg-white rounded p-2 border border-blue-100 shadow-2xs">
                <p className="text-[10px] text-gray-500 uppercase">Leaves Taken</p>
                <p className="text-sm font-bold text-blue-700 mt-0.5">{payslip.leaveDays || 0}</p>
              </div>
              <div className="bg-white rounded p-2 border border-blue-100 shadow-2xs">
                <p className="text-[10px] text-gray-500 uppercase">Days Absent</p>
                <p className="text-sm font-bold text-red-600 mt-0.5">{payslip.daysAbsent || 0}</p>
              </div>
              <div className="bg-white rounded p-2 border border-blue-100 shadow-2xs">
                <p className="text-[10px] text-gray-500 uppercase">Overtime</p>
                <p className="text-sm font-bold text-purple-700 mt-0.5">
                  {payslip.overtimeHours ? `${payslip.overtimeHours} hrs` : "0 hrs"}
                </p>
              </div>
            </div>
          </div>

          {/* Earnings vs Deductions Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Earnings Table */}
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider text-gray-800">
                  Earnings Breakdown
                </span>
                <span className="text-[11px] font-semibold text-gray-500">Amount (LKR)</span>
              </div>
              <div className="divide-y divide-gray-200 text-xs">
                <div className="flex justify-between px-4 py-2.5 bg-white">
                  <span className="text-gray-700">Basic Salary</span>
                  <span className="font-mono font-medium">{money(payslip.basicSalary)}</span>
                </div>
                {payslip.earnings?.map((item, idx) => (
                  <div key={idx} className="flex justify-between px-4 py-2.5 bg-gray-50/50">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-mono font-medium">{money(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-100 px-4 py-2.5 border-t-2 border-gray-300 flex justify-between items-center font-bold text-xs text-gray-900">
                <span>Gross Earnings</span>
                <span className="font-mono text-sm">{money(payslip.grossEarnings)}</span>
              </div>
            </div>

            {/* Deductions Table */}
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider text-gray-800">
                  Deductions Breakdown
                </span>
                <span className="text-[11px] font-semibold text-gray-500">Amount (LKR)</span>
              </div>
              <div className="divide-y divide-gray-200 text-xs">
                <div className="flex justify-between px-4 py-2.5 bg-white">
                  <span className="text-gray-700">EPF Employee Contribution (8%)</span>
                  <span className="font-mono font-medium text-red-600">
                    -{money(payslip.epfEmployeeContribution)}
                  </span>
                </div>
                {payslip.deductions?.map((item, idx) => (
                  <div key={idx} className="flex justify-between px-4 py-2.5 bg-gray-50/50">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-mono font-medium text-red-600">
                      -{money(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-100 px-4 py-2.5 border-t-2 border-gray-300 flex justify-between items-center font-bold text-xs text-red-700">
                <span>Total Deductions</span>
                <span className="font-mono text-sm">-{money(payslip.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* NET PAY Highlight Box & Amount in Words */}
          <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/60 p-5 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-emerald-200 pb-3 mb-3">
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Net Salary Payable
                </p>
                <p className="text-3xl font-black text-emerald-950 font-mono tracking-tight mt-0.5">
                  {money(payslip.netPay)}
                </p>
              </div>

              <div className="text-right text-xs text-gray-600 mt-2 sm:mt-0">
                <p className="font-medium">
                  EPF Employer (12%):{" "}
                  <span className="font-mono font-bold text-gray-900">
                    {money(payslip.epfEmployerContribution)}
                  </span>
                </p>
                <p className="font-medium">
                  ETF Contribution (3%):{" "}
                  <span className="font-mono font-bold text-gray-900">
                    {money(payslip.etfContribution)}
                  </span>
                </p>
                <p className="text-[11px] text-gray-500 italic mt-0.5">
                  Company statutory costs (not deducted from salary)
                </p>
              </div>
            </div>

            {/* Amount in Words */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-600 uppercase tracking-wide">
                Amount in Words:
              </span>
              <span className="font-serif italic font-semibold text-emerald-900">
                {netInWords}
              </span>
            </div>
          </div>

          {/* Authorization & Acknowledgment Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-gray-400 text-xs">
            {/* Company Authorization */}
            <div className="flex flex-col items-center text-center">
              <div className="relative h-20 w-48 border-b border-gray-400 flex items-center justify-center">
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
              <p className="mt-2 font-bold text-gray-900">Authorized Signature & Seal</p>
              <p className="text-gray-500">For {settings.companyName || "Organization"}</p>
            </div>

            {/* Employee Acknowledgment */}
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-48 border-b border-gray-400 flex items-end justify-center pb-1">
                {/* Employee signature line */}
              </div>
              <p className="mt-2 font-bold text-gray-900">Employee Acknowledgment Signature</p>
              <p className="text-[10px] text-gray-500 max-w-xs mt-0.5 italic">
                I hereby confirm receipt of the above salary and accept the deductions made.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-3 border-t border-gray-200 text-center text-[10px] text-gray-400">
            This payslip is a confidential document generated by {settings.companyName || "ERP System"} on{" "}
            {new Date().toLocaleDateString("en-GB")}.
          </div>
        </Card>
      )}

      {/* 2. 80mm Thermal Receipt Format */}
      {printFormat === "thermal" && (
        <div className="print-thermal-container mx-auto max-w-[80mm] border border-gray-300 bg-white p-4 font-mono text-[11px] leading-tight text-gray-900 shadow-sm">
          {/* Header */}
          <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
            <h2 className="text-sm font-bold uppercase">{settings.companyName || "Organization"}</h2>
            <p className="text-[10px]">{settings.address}</p>
            <p className="text-[10px]">Tel: {settings.phone}</p>
            <p className="mt-1 font-bold text-xs uppercase border border-gray-900 inline-block px-2 py-0.5">
              PAYSLIP
            </p>
            <p className="font-bold mt-1">{periodTitle}</p>
            <p className="text-[10px]">{payroll.payrollNumber}</p>
          </div>

          {/* Employee Info */}
          <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
            <div className="flex justify-between">
              <span>Employee:</span>
              <span className="font-bold">{employee.firstName} {employee.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span>Code:</span>
              <span>{employee.employeeCode}</span>
            </div>
            <div className="flex justify-between">
              <span>Designation:</span>
              <span>{roleDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span>EPF No:</span>
              <span>{employee.epfNumber || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>Present:</span>
              <span>{payslip.daysPresent}/{payslip.workingDays} days</span>
            </div>
          </div>

          {/* Earnings */}
          <div className="mb-2">
            <p className="font-bold uppercase text-[10px] border-b pb-0.5 mb-1">Earnings</p>
            <div className="flex justify-between">
              <span>Basic Salary:</span>
              <span>{money(payslip.basicSalary)}</span>
            </div>
            {payslip.earnings?.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span>{item.name}:</span>
                <span>{money(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-dotted pt-0.5 mt-0.5">
              <span>Gross:</span>
              <span>{money(payslip.grossEarnings)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
            <p className="font-bold uppercase text-[10px] border-b pb-0.5 mb-1">Deductions</p>
            <div className="flex justify-between text-red-600">
              <span>EPF 8%:</span>
              <span>-{money(payslip.epfEmployeeContribution)}</span>
            </div>
            {payslip.deductions?.map((item, i) => (
              <div key={i} className="flex justify-between text-red-600">
                <span>{item.name}:</span>
                <span>-{money(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-dotted pt-0.5 mt-0.5 text-red-700">
              <span>Total Deduct:</span>
              <span>-{money(payslip.totalDeductions)}</span>
            </div>
          </div>

          {/* NET PAY */}
          <div className="border-b-2 border-gray-900 pb-2 mb-2 text-center">
            <p className="text-[10px] uppercase font-bold text-gray-600">NET PAYABLE</p>
            <p className="text-base font-black tracking-tight">{money(payslip.netPay)}</p>
            <p className="text-[9px] italic mt-0.5">{netInWords}</p>
          </div>

          {/* Employer statutory note */}
          <div className="text-[10px] text-gray-600 border-b border-dashed border-gray-400 pb-2 mb-3">
            <div className="flex justify-between">
              <span>EPF 12% (Empr):</span>
              <span>{money(payslip.epfEmployerContribution)}</span>
            </div>
            <div className="flex justify-between">
              <span>ETF 3% (Empr):</span>
              <span>{money(payslip.etfContribution)}</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-2 text-center">
            <div className="border-b border-gray-400 h-8 mb-1"></div>
            <p className="text-[10px]">Employee Signature</p>
            <p className="text-[9px] text-gray-500 mt-2">Thank you!</p>
          </div>
        </div>
      )}
    </div>
  );
}

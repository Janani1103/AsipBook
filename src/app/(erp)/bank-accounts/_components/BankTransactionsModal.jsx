"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Calendar,
  CreditCard,
  FileText,
  Landmark,
  Printer,
  Search,
} from "lucide-react";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Input from "../../../../components/ui/Input.jsx";
import Modal from "../../../../components/ui/Modal.jsx";
import Select from "../../../../components/ui/Select.jsx";
import { useBankAccountTransactions } from "../../../../client/features/bankAccounts/useBankAccounts.js";
import { useCompanySettings } from "../../../../client/features/settings/useSettings.js";

const formatCurrency = (val) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(val || 0);

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const typeBadges = {
  expense: "danger",
  payment: "success",
  supplier_payment: "warning",
  transfer: "info",
};

export default function BankTransactionsModal({ account, isOpen, onClose }) {
  const [directionFilter, setDirectionFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useBankAccountTransactions(account?._id, {
    type: directionFilter || undefined,
    search: searchTerm || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: settingsData } = useCompanySettings();
  const settings = settingsData?.data || {};

  const result = data?.data || {};
  const transactions = result.transactions || [];

  if (!account) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        account.category === "cash"
          ? `${account.accountName} — Cash Book Ledger`
          : `${account.bankName} — Transaction History`
      }
      size="xl"
    >
      <div className="space-y-5 p-6">
        {/* Account Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-xl p-3 ${
                account.category === "cash"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {account.category === "cash" ? (
                <Banknote size={24} />
              ) : (
                <Landmark size={24} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">{account.bankName}</h3>
                <Badge
                  variant={account.category === "cash" ? "success" : "info"}
                  className="capitalize text-xs"
                >
                  {account.category === "cash" ? "Cash Drawer" : account.category}
                </Badge>
                {account.branchName && (
                  <span className="text-xs text-gray-500 font-medium">· {account.branchName} Branch</span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                <span className="font-semibold text-gray-800">{account.accountName}</span> ·{" "}
                <span className="font-mono text-gray-500">Acc No: {account.accountNumber}</span>
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:pl-6 border-gray-200">
            <p className="text-2xs font-bold uppercase tracking-wider text-gray-500">
              Current Balance
            </p>
            <p className="text-2xl font-black text-gray-900 font-mono mt-0.5">
              {formatCurrency(account.currentBalance)}
            </p>
          </div>
        </div>

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-2xs">
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Opening Balance
            </p>
            <p className="text-sm font-bold text-gray-900 font-mono mt-1">
              {formatCurrency(result.openingBalance)}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-3xs font-bold uppercase tracking-wider text-emerald-700">
                Total Inflow (Credits)
              </p>
              <ArrowDownLeft size={14} className="text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-emerald-800 font-mono mt-1">
              +{formatCurrency(result.totalCredits)}
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-3xs font-bold uppercase tracking-wider text-red-700">
                Total Outflow (Debits)
              </p>
              <ArrowUpRight size={14} className="text-red-600" />
            </div>
            <p className="text-sm font-bold text-red-800 font-mono mt-1">
              -{formatCurrency(result.totalDebits)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-2xs">
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Total Transactions
            </p>
            <p className="text-sm font-bold text-gray-900 font-mono mt-1">
              {result.transactionCount || 0} Records
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-y border-gray-200 py-3">
          <div className="relative w-full md:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Search reference, party, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="w-36">
              <Select
                placeholder="All Types"
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                options={[
                  { value: "", label: "All Movements" },
                  { value: "credit", label: "Money In (+)" },
                  { value: "debit", label: "Money Out (-)" },
                ]}
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-32 text-xs py-1"
                placeholder="From"
              />
              <span>to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-32 text-xs py-1"
                placeholder="To"
              />
            </div>
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[420px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 border-b border-gray-200 z-10">
              <tr className="text-gray-600 font-semibold uppercase text-3xs tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Description / Party</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-right">Inflow (+)</th>
                <th className="py-2.5 px-3 text-right">Outflow (-)</th>
                <th className="py-2.5 px-3 text-right font-bold">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Loading account transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-700">No transactions found</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Customer payments, supplier disbursals, salary payments, and transfers for this account will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((t, idx) => {
                  const isCredit = t.direction === "credit";
                  return (
                    <tr
                      key={t.id || idx}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                      }`}
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-600 font-medium">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono text-2xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">
                          {t.reference || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Badge variant={typeBadges[t.category] || "default"}>
                          {t.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-gray-900 truncate max-w-xs">
                          {t.description}
                        </p>
                        {t.partyName && t.partyName !== t.description && (
                          <p className="text-3xs text-gray-500 truncate max-w-xs">
                            Party: {t.partyName}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-600 capitalize">
                        {t.paymentMethod?.replace("_", " ") || "bank transfer"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700 whitespace-nowrap">
                        {isCredit ? `+${formatCurrency(t.amount)}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-red-600 whitespace-nowrap">
                        {!isCredit ? `-${formatCurrency(t.amount)}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap bg-gray-50/50">
                        {formatCurrency(t.runningBalance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Showing {transactions.length} record(s) for {account.accountName} ({account.accountNumber})
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="text-xs"
            >
              <Printer size={14} className="mr-1.5" />
              Print Statement
            </Button>
            <Button variant="primary" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

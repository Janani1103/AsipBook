"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Download } from "lucide-react";
import PageHeader from "../../../../../components/ui/PageHeader.jsx";
import Card from "../../../../../components/ui/Card.jsx";
import Button from "../../../../../components/ui/Button.jsx";
import Table from "../../../../../components/ui/Table.jsx";
import Badge from "../../../../../components/ui/Badge.jsx";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";

export default function SupplierLedgerPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function loadLedger() {
      try {
        const queryParams = new URLSearchParams();
        if (filters.startDate) queryParams.append("startDate", filters.startDate);
        if (filters.endDate) queryParams.append("endDate", filters.endDate);

        const response = await axios.get(
          `/api/suppliers/${params.id}/ledger?${queryParams.toString()}`
        );
        if (!cancelled) setLedger(response.data.data);
      } catch (error) {
        if (!cancelled) console.error("Failed to fetch ledger:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadLedger();
    return () => {
      cancelled = true;
    };
  }, [params.id, filters.startDate, filters.endDate]);

  const columns = [
    {
      key: "date",
      label: "Date",
      width: "120px",
      render: (row) => new Date(row.date).toLocaleDateString(),
    },
    {
      key: "type",
      label: "Type",
      width: "100px",
      render: (row) => {
        const typeColors = {
          purchase: "bg-blue-100 text-blue-800",
          return: "bg-orange-100 text-orange-800",
          advance: "bg-purple-100 text-purple-800",
          payment: "bg-green-100 text-green-800",
          refund: "bg-red-100 text-red-800",
          credit_note: "bg-yellow-100 text-yellow-800",
        };
        const color = typeColors[row.type] || "bg-gray-100 text-gray-800";
        return (
          <Badge variant="custom" className={color}>
            {row.type.replace("_", " ").toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: "reference",
      label: "Reference",
      render: (row) => (
        <span className="font-mono text-xs">{row.reference}</span>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (row) => row.description,
    },
    {
      key: "debit",
      label: "Debit",
      width: "120px",
      render: (row) =>
        row.debit > 0 ? (
          <span className="text-red-600">Rs. {row.debit.toFixed(2)}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "credit",
      label: "Credit",
      width: "120px",
      render: (row) =>
        row.credit > 0 ? (
          <span className="text-green-600">Rs. {row.credit.toFixed(2)}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "balance",
      label: "Balance",
      width: "120px",
      render: (row) => (
        <span className="font-medium">Rs. {row.balance.toFixed(2)}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Supplier Ledger"
          description="View supplier transaction history"
          actions={
            <Button
              variant="ghost"
              onClick={() => router.back()}
            >
              <ArrowLeft size={16} className="mr-1.5" />
              Back
            </Button>
          }
        />
        <Card>
          <div className="py-16 text-center text-gray-500">Loading...</div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Supplier Ledger"
        description={`Ledger for ${ledger?.supplier?.name || 'Supplier'}`}
        actions={
          <Button
            variant="ghost"
            onClick={() => router.back()}
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Back
          </Button>
        }
      />
      <Card>
        <Filters filters={filters} setFilters={setFilters} />
        <Summary summary={ledger?.summary} />
        <Table columns={columns} data={ledger?.transactions || []} />
      </Card>
    </div>
  );
}

function Filters({ filters, setFilters }) {
  return (
    <div className="flex flex-wrap gap-3 border-b border-gray-200 p-4">
      <div>
        <label className="mb-1 block text-xs text-gray-600">Start Date</label>
        <input
          type="date"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-600">End Date</label>
        <input
          type="date"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />
      </div>
    </div>
  );
}

function Summary({ summary }) {
  if (!summary) return null;

  return (
    <div className="border-b border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Financial Summary</h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <div>
          <p className="text-xs text-gray-600">Opening Balance</p>
          <p className="text-lg font-semibold">Rs. {summary.openingBalance.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Total Purchases</p>
          <p className="text-lg font-semibold text-red-600">
            Rs. {summary.totalPurchases.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Total Returns</p>
          <p className="text-lg font-semibold text-orange-600">
            Rs. {summary.totalReturns.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Total Payments</p>
          <p className="text-lg font-semibold text-green-600">
            Rs. {summary.totalPayments.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Advance Balance</p>
          <p className="text-lg font-semibold text-purple-600">
            Rs. {summary.advanceBalance.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Outstanding Balance</p>
          <p className="text-lg font-semibold">
            Rs. {summary.outstandingBalance.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

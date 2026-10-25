"use client";
import { useState } from "react";
import { Plus, Search, DollarSign, ArrowLeft } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { useRouter } from "next/navigation";
import axios from "axios";

const paymentTypeLabels = {
  advance: "Advance",
  payment: "Payment",
  refund: "Refund",
  credit_note: "Credit Note",
};

const methodLabels = {
  cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  card: "Card",
  mobile_wallet: "Mobile Wallet",
  other: "Other",
};

const statusVariant = {
  pending: "warning",
  confirmed: "success",
  cleared: "success",
  bounced: "danger",
  cancelled: "default",
  refunded: "default",
  allocated: "info",
};

export default function SupplierPaymentsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    supplierId: "",
    paymentType: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 10,
  });
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.supplierId) params.append("supplierId", filters.supplierId);
      if (filters.paymentType) params.append("paymentType", filters.paymentType);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("page", filters.page);
      params.append("limit", filters.limit);

      const response = await axios.get(`/api/supplier-payments?${params.toString()}`);
      setPayments(response.data.data || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: "paymentNumber",
      label: "Payment #",
      width: "140px",
      render: (row) => (
        <span className="font-mono text-xs">{row.paymentNumber}</span>
      ),
    },
    {
      key: "supplier",
      label: "Supplier",
      render: (row) => row.supplierSnapshot?.name || "—",
    },
    {
      key: "paymentType",
      label: "Type",
      render: (row) => <Badge>{paymentTypeLabels[row.paymentType]}</Badge>,
    },
    {
      key: "amount",
      label: "Amount",
      width: "120px",
      render: (row) => (
        <span className="font-medium">Rs. {row.amount.toFixed(2)}</span>
      ),
    },
    {
      key: "method",
      label: "Method",
      render: (row) => methodLabels[row.method] || row.method,
    },
    {
      key: "paymentDate",
      label: "Date",
      width: "120px",
      render: (row) => new Date(row.paymentDate).toLocaleDateString(),
    },
    {
      key: "unallocated",
      label: "Unallocated",
      width: "120px",
      render: (row) =>
        row.unallocatedAmount > 0 ? (
          <span className="text-amber-600">
            Rs. {row.unallocatedAmount.toFixed(2)}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>{row.status}</Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Supplier Payments"
        description="Manage supplier payments and advances"
        actions={
          <Button
            variant="primary"
            onClick={() => router.push("/supplier-payments/new")}
          >
            <Plus size={16} className="mr-1.5" />
            Add Payment
          </Button>
        }
      />
      <Card>
        <Filters filters={filters} setFilters={setFilters} />
        {loading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No payments"
            description="Add supplier payments to track advances and settlements"
            action={
              <Button
                variant="primary"
                onClick={() => router.push("/supplier-payments/new")}
              >
                <Plus size={16} className="mr-1.5" />
                Add Payment
              </Button>
            }
          />
        ) : (
          <>
            <Table columns={columns} data={payments} />
            <Pagination
              page={filters.page}
              totalPages={totalPages}
              total={total}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function Filters({ filters, setFilters }) {
  return (
    <div className="flex flex-wrap gap-3 border-b border-gray-200 p-4">
      <div className="relative min-w-[200px] flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search supplier..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
          value={filters.supplierId}
          onChange={(e) => setFilters({ ...filters, supplierId: e.target.value, page: 1 })}
        />
      </div>
      <div className="w-48">
        <Select
          placeholder="All Types"
          options={Object.entries(paymentTypeLabels).map(([value, label]) => ({
            value,
            label,
          }))}
          value={filters.paymentType}
          onChange={(e) =>
            setFilters({ ...filters, paymentType: e.target.value, page: 1 })
          }
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-600">Start Date</label>
        <input
          type="date"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-600">End Date</label>
        <input
          type="date"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
        />
      </div>
    </div>
  );
}

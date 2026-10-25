"use client";
import { useState } from "react";
import Link from "next/link";
import { Download, Edit, Eye, FileText, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { useAuthStore } from "../../../client/store/authStore.js";
import { useConvertQuotationToInvoice, useDeleteQuotation, useQuotations } from "../../../client/features/quotations/useQuotations.js";
import { quotationsApi } from "../../../client/features/quotations/quotationsApi.js";
import toast from "react-hot-toast";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";

const variants = { draft: "default", sent: "info", accepted: "success", rejected: "danger", expired: "warning", converted: "success" };
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function QuotationsPage() {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState({ search: "", status: "", page: 1, limit: 10 });
  const { data, isLoading } = useQuotations(filters);
  const remove = useDeleteQuotation();
  const convertToInvoice = useConvertQuotationToInvoice();
  const update = (field, value) => setFilters((current) => ({ ...current, [field]: value, page: field === "page" ? value : 1 }));
  const quotations = data?.data || [];
  const canCreate = ["admin", "manager", "sales_manager", "sales_rep"].includes(user?.role);

  const handleDownload = async (id, quotationNumber) => {
    try {
      const printData = await quotationsApi.getPrintJson(id);
      const content = printData.data.map((item) => item.content).join("\n");
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotation-${quotationNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleConvertToInvoice = async (id) => {
    try {
      await convertToInvoice.mutateAsync(id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to convert to invoice");
    }
  };

  const columns = [
    { key: "quotationNumber", label: "Quote #", render: (row) => <span className="font-mono text-xs">{row.quotationNumber}</span> },
    { key: "quotationDate", label: "Date", render: (row) => new Date(row.quotationDate).toLocaleDateString("en-LK") },
    { key: "validUntil", label: "Valid Until", render: (row) => new Date(row.validUntil).toLocaleDateString("en-LK") },
    { key: "customer", label: "Customer", render: (row) => <div><p className="font-medium text-gray-900">{row.customerSnapshot?.name}</p><p className="text-xs text-gray-500">{row.customerSnapshot?.code}</p></div> },
    { key: "items", label: "Items", render: (row) => row.items?.length || 0 },
    { key: "grandTotal", label: "Total", render: (row) => <span className="font-medium">{money(row.grandTotal)}</span> },
    { key: "salesRep", label: "Sales Rep", render: (row) => row.salesRepId ? `${row.salesRepId.firstName} ${row.salesRepId.lastName}` : "—" },
    { key: "status", label: "Status", render: (row) => <Badge variant={variants[row.status]}>{row.status.replace("_", " ")}</Badge> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Link href={`/quotations/${row._id}`} className="rounded p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600">
            <Eye size={16} />
          </Link>
          <button
            type="button"
            title="Download"
            onClick={() => handleDownload(row._id, row.quotationNumber)}
            className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
          >
            <Download size={16} />
          </button>
          {row.status !== "converted" && (
            <Link
              href={`/quotations/${row._id}/edit`}
              title="Edit Quotation"
              className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
            >
              <Edit size={16} />
            </Link>
          )}
          {row.status === "accepted" && (
            <button
              type="button"
              title="Convert to Invoice"
              disabled={convertToInvoice.isPending}
              onClick={() => handleConvertToInvoice(row._id)}
              className="rounded p-1.5 text-gray-400 hover:bg-purple-50 hover:text-purple-600"
            >
              <Receipt size={16} />
            </button>
          )}
          <button
            type="button"
            title="Delete Quotation"
            disabled={remove.isPending}
            onClick={() =>
              window.confirm(`Delete quotation ${row.quotationNumber}?`) &&
              remove.mutate(row._id)
            }
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Manage customer quotations"
        actions={
          canCreate && (
            <Link href="/quotations/new">
              <Button variant="primary">
                <Plus size={16} className="mr-1.5" />
                New Quotation
              </Button>
            </Link>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search by quote number or customer..."
              value={filters.search}
              onChange={(event) => update("search", event.target.value)}
            />
          </div>
          <Select
            className="w-48"
            placeholder="All Statuses"
            options={["draft", "sent", "accepted", "rejected", "expired", "converted"].map((value) => ({
              value,
              label: value.replace("_", " ")
            }))}
            value={filters.status}
            onChange={(event) => update("status", event.target.value)}
          />
        </div>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading quotations...</div>
        ) : quotations.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotations yet"
            description="Create your first quotation"
            action={
              canCreate && (
                <Link href="/quotations/new">
                  <Button variant="primary">
                    <Plus size={16} className="mr-1.5" />
                    New Quotation
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <>
            <Table columns={columns} data={quotations} />
            <Pagination
              page={filters.page}
              totalPages={data?.totalPages || 1}
              total={data?.total || 0}
              onPageChange={(page) => update("page", page)}
            />
          </>
        )}
      </Card>
    </div>
  );
}

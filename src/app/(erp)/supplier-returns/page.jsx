"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Plus, TruckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { productsApi } from "../../../client/features/products/productsApi.js";
import { suppliersApi } from "../../../client/features/suppliers/suppliersApi.js";
import { useWarehouses } from "../../../client/features/warehouses/useWarehouses.js";
import { useCreateSupplierReturn, useSupplierReturns } from "../../../client/features/supplierReturns/useSupplierReturns.js";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);
const blankLine = () => ({ productId: "", quantity: 1, unitPrice: 0, reason: "damaged", batchNumber: "" });

const refundTypeLabels = {
  cash: "Cash Refund",
  credit: "Credit Note",
  replacement: "Replacement",
};

export default function SupplierReturnsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ status: "", page: 1, limit: 15 });
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState([blankLine()]);
  const [notes, setNotes] = useState("");
  const [refundType, setRefundType] = useState("credit");
  const { data, isLoading } = useSupplierReturns(filters);
  const { data: suppliers } = useQuery({ queryKey: ["suppliers", "active"], queryFn: () => suppliersApi.list({ status: "active", limit: 200 }) });
  const { data: products } = useQuery({ queryKey: ["products", "raw"], queryFn: () => productsApi.list({ limit: 500 }) });
  const { data: warehouses } = useWarehouses({ isActive: true });
  const create = useCreateSupplierReturn();
  const total = useMemo(() => items.reduce((sum, item) => sum + (+item.quantity || 0) * (+item.unitPrice || 0), 0), [items]);
  const returns = data?.data || [];
  const update = (index, field, value) => setItems((current) => current.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    const next = { ...item, [field]: value };
    if (field === "productId" && value) {
      const product = products?.data?.find((entry) => entry._id === value);
      if (product) next.unitPrice = product.costs?.lastPurchaseCost || product.costs?.averageCost || 0;
    }
    return next;
  }));
  const submit = async () => {
    if (!supplierId || !warehouseId) return toast.error("Select supplier and warehouse");
    if (items.some((item) => !item.productId || !item.quantity)) return toast.error("All items need product and qty");
    try {
      const result = await create.mutateAsync({ supplierId, warehouseId, refundType, items: items.map((item) => ({ productId: item.productId, quantity: +item.quantity, unitPrice: +item.unitPrice, reason: item.reason, reasonDescription: item.reasonDescription, batchNumber: item.batchNumber || undefined })), notes: notes || undefined });
      setOpen(false);
      router.push(`/supplier-returns/${result.data._id}`);
    } catch {}
  };
  const columns = [
    { key: "returnNumber", label: "Ref #", render: (row) => <span className="font-mono text-xs">{row.returnNumber}</span> },
    { key: "returnDate", label: "Date", render: (row) => new Date(row.returnDate).toLocaleDateString("en-LK") },
    { key: "supplier", label: "Supplier", render: (row) => row.supplierSnapshot?.name },
    { key: "items", label: "Items", render: (row) => row.items?.length },
    { key: "value", label: "Return Value", render: (row) => money(row.totalReturnValue) },
    { key: "refundType", label: "Refund Type", render: (row) => <Badge variant={row.refundType === "cash" ? "success" : row.refundType === "credit" ? "info" : "warning"}>{refundTypeLabels[row.refundType] || row.refundType}</Badge> },
    { key: "status", label: "Status", render: (row) => <Badge>{row.status.replace(/_/g, " ")}</Badge> },
    { key: "actions", label: "", render: (row) => <button className="rounded p-1.5 hover:bg-gray-100" onClick={() => router.push(`/supplier-returns/${row._id}`)}><Eye size={16} /></button> },
  ];
  return <div><PageHeader title="Supplier Returns" description="Send defective goods back to suppliers" actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1.5" /> New Supplier Return</Button>} /><Card><div className="flex gap-3 border-b p-4"><div className="w-48"><Select placeholder="All Statuses" options={[{ value: "draft", label: "Draft" }, { value: "sent", label: "Sent" }, { value: "credit_received", label: "Credit Received" }, { value: "cancelled", label: "Cancelled" }]} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))} /></div></div>{isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div> : returns.length === 0 ? <EmptyState icon={TruckIcon} title="No supplier returns" description="Create one when returning goods to supplier" /> : <><Table columns={columns} data={returns} onRowClick={(row) => router.push(`/supplier-returns/${row._id}`)} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} /></>}</Card><Modal isOpen={open} onClose={() => setOpen(false)} title="New Supplier Return" size="lg"><div className="space-y-4 p-6"><div className="grid grid-cols-2 gap-4"><Select label="Supplier" required placeholder="Select..." options={(suppliers?.data || []).map((entry) => ({ value: entry._id, label: `${entry.displayName} (${entry.supplierCode})` }))} value={supplierId} onChange={(event) => setSupplierId(event.target.value)} /><Select label="From Warehouse" required placeholder="Select..." options={(warehouses?.data || []).map((entry) => ({ value: entry._id, label: `${entry.name} (${entry.warehouseCode})` }))} value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} /></div><Select label="Refund Type" required options={Object.entries(refundTypeLabels).map(([value, label]) => ({ value, label }))} value={refundType} onChange={(event) => setRefundType(event.target.value)} /><div><div className="mb-2 flex justify-between"><h4 className="text-sm font-semibold">Items</h4><Button type="button" variant="outline" size="sm" onClick={() => setItems((current) => [...current, blankLine()])}>Add Item</Button></div><div className="max-h-[300px] space-y-2 overflow-y-auto">{items.map((item, index) => <div key={index} className="space-y-2 rounded border p-3"><div className="flex items-start justify-between"><div className="mr-2 flex-1"><Select placeholder="Product..." options={(products?.data || []).map((product) => ({ value: product._id, label: product.name }))} value={item.productId} onChange={(event) => update(index, "productId", event.target.value)} /></div><Button variant="outline" size="sm" onClick={() => setItems((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="mt-1 text-red-600">Remove</Button></div><div className="grid grid-cols-4 gap-2"><Input type="number" label="Qty" value={item.quantity} onChange={(event) => update(index, "quantity", event.target.value)} /><Input type="number" label="Unit Price" value={item.unitPrice} onChange={(event) => update(index, "unitPrice", event.target.value)} /><Input label="Batch No" value={item.batchNumber} onChange={(event) => update(index, "batchNumber", event.target.value)} /><Select label="Reason" options={[{ value: "damaged", label: "Damaged" }, { value: "defective", label: "Defective" }, { value: "wrong_item", label: "Wrong Item" }, { value: "expired", label: "Expired" }, { value: "quality_issue", label: "Quality Issue" }, { value: "other", label: "Other" }]} value={item.reason} onChange={(event) => update(index, "reason", event.target.value)} /></div></div>)}</div></div><Textarea label="Notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /><div className="flex items-center justify-between border-t pt-4"><div className="text-sm font-semibold">Total: {money(total)}</div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" variant="primary" onClick={submit} loading={create.isPending}>Create Return</Button></div></div></div></Modal></div>;
}

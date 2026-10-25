"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertTriangle, Plus, Eye, Edit, Trash2 } from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import { productsApi } from "../../../client/features/products/productsApi.js";
import { useWarehouses } from "../../../client/features/warehouses/useWarehouses.js";
import { useCreateDamage, useDamages, useDamageSummary, useUpdateDamage, useDeleteDamage } from "../../../client/features/damages/useDamages.js";

const sources = [
  { value: "production_reject", label: "Production reject" },
  { value: "warehouse_damage", label: "Warehouse damage" },
  { value: "customer_return", label: "Customer return" },
  { value: "supplier_delivery", label: "Supplier delivery" },
  { value: "transit", label: "Transit" },
  { value: "expired", label: "Expired" },
  { value: "theft", label: "Theft" },
  { value: "other", label: "Other" }
];
const dispositions = [
  { value: "pending", label: "Pending" },
  { value: "scrap", label: "Scrap" },
  { value: "repair", label: "Send to repair" },
  { value: "return_to_supplier", label: "Return to supplier" },
  { value: "write_off", label: "Write off" }
];
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function DamagesPage() {
  const [filters, setFilters] = useState({ source: "", page: 1, limit: 15 });
  const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'view'
  const [form, setForm] = useState({ productId: "", quantity: 0, warehouseId: "", source: "warehouse_damage", description: "", disposition: "pending", costPerUnit: 0, adjustStock: true, isRefundable: false, refundAmount: 0, refundNotes: "" });
  const [selectedDamage, setSelectedDamage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  
  const { data, isLoading } = useDamages(filters);
  const { data: summaryData } = useDamageSummary();
  const { data: productsData } = useQuery({ queryKey: ["products", "all"], queryFn: () => productsApi.list({ limit: 500 }) });
  const { data: warehousesData } = useWarehouses({ isActive: true });
  
  const create = useCreateDamage();
  const update = useUpdateDamage();
  const remove = useDeleteDamage();
  
  const damages = data?.data || [];
  const summary = summaryData?.data || { bySource: [], totalCount: 0, totalValue: 0 };
  
  const openModal = (mode, damage = null) => {
    setModalMode(mode);
    if (damage) {
      setSelectedDamage(damage);
      setForm({
        productId: damage.productId?._id || damage.productId,
        quantity: damage.quantity,
        warehouseId: damage.warehouseId?._id || damage.warehouseId,
        source: damage.source,
        description: damage.description || "",
        disposition: damage.disposition,
        costPerUnit: damage.costPerUnit,
        adjustStock: damage.stockAdjusted,
        isRefundable: damage.isRefundable || false,
        refundAmount: damage.refundAmount || 0,
        refundNotes: damage.refundNotes || ""
      });
    } else {
      setSelectedDamage(null);
      setForm({ productId: "", quantity: 0, warehouseId: "", source: "warehouse_damage", description: "", disposition: "pending", costPerUnit: 0, adjustStock: true, isRefundable: false, refundAmount: 0, refundNotes: "" });
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedDamage(null);
  };

  const submit = async () => {
    if (!form.productId || !form.quantity || !form.warehouseId) return toast.error("Required fields missing");
    try {
      if (modalMode === 'edit') {
        await update.mutateAsync({ 
          id: selectedDamage._id, 
          description: form.description, 
          disposition: form.disposition,
          isRefundable: form.isRefundable,
          refundAmount: +form.refundAmount,
          refundNotes: form.refundNotes
        });
      } else {
        await create.mutateAsync({ 
          ...form, 
          quantity: +form.quantity, 
          costPerUnit: +form.costPerUnit,
          refundAmount: +form.refundAmount 
        });
      }
      closeModal();
    } catch {}
  };

  const columns = [
    { key: "damageNumber", label: "Ref #", render: (row) => <span className="font-mono text-xs">{row.damageNumber}</span> },
    { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt).toLocaleDateString("en-LK") },
    { key: "product", label: "Product", render: (row) => <div><p className="text-sm">{row.productName}</p><p className="font-mono text-xs text-gray-500">{row.productCode}</p></div> },
    { key: "quantity", label: "Qty", render: (row) => `${row.quantity} ${row.unitOfMeasure || ""}` },
    { key: "value", label: "Value", render: (row) => money(row.totalValue) },
    { key: "refund", label: "Refund", render: (row) => row.isRefundable ? <div className="text-green-600 font-semibold">{money(row.refundAmount)}</div> : <span className="text-gray-400">—</span> },
    { key: "source", label: "Source", render: (row) => <Badge>{row.source.replace(/_/g, " ")}</Badge> },
    { key: "disposition", label: "Disposition", render: (row) => row.disposition.replace(/_/g, " ") },
    { key: "actions", label: "Actions", width: "120px", render: (row) => (
      <div className="flex gap-1">
        <button onClick={() => openModal('view', row)} className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="View"><Eye size={16} /></button>
        {!row.writtenOff && (
          <button onClick={() => openModal('edit', row)} className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600" title="Edit"><Edit size={16} /></button>
        )}
        {!row.writtenOff && (
          <button onClick={() => setDeletingId(row._id)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={16} /></button>
        )}
      </div>
    )}
  ];

  const isView = modalMode === 'view';
  const isEdit = modalMode === 'edit';

  return (
    <div>
      <PageHeader 
        title="Damages & Scrap Register" 
        description="Track damaged goods across the business" 
        actions={
          <Button variant="primary" onClick={() => openModal('create')}>
            <Plus size={16} className="mr-1.5" /> Record Damage
          </Button>
        } 
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Damages Recorded</p>
          <p className="text-2xl font-semibold">{summary.totalCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Value Lost</p>
          <p className="text-2xl font-semibold text-red-600">{money(summary.totalValue)}</p>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">Top Source</p>
          <p className="text-lg font-semibold text-amber-900">{summary.bySource[0]?._id?.replace(/_/g, " ") || "—"}</p>
        </Card>
      </div>
      <Card>
        <div className="border-b p-4">
          <div className="w-56">
            <Select 
              placeholder="All Sources" 
              options={sources} 
              value={filters.source} 
              onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value, page: 1 }))} 
            />
          </div>
        </div>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : damages.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No damages" description="Record damage when found" />
        ) : (
          <>
            <Table columns={columns} data={damages} />
            <Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />
          </>
        )}
      </Card>
      
      <Modal isOpen={!!modalMode} onClose={closeModal} title={isView ? "View Damage" : isEdit ? "Edit Damage" : "Record Damage"} size="md">
        <div className="space-y-4 p-6">
          <Select 
            label="Product" 
            required 
            placeholder="Select product..." 
            options={(productsData?.data || []).map((product) => ({ value: product._id, label: `${product.name} (${product.productCode})` }))} 
            value={form.productId} 
            onChange={(event) => setForm({ ...form, productId: event.target.value })} 
            disabled={isView || isEdit}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Quantity" 
              required 
              type="number" 
              step="0.01" 
              min="0.01" 
              value={form.quantity} 
              onChange={(event) => setForm({ ...form, quantity: event.target.value })} 
              disabled={isView || isEdit}
            />
            <Input 
              label="Cost per unit" 
              type="number" 
              step="0.01" 
              min="0" 
              value={form.costPerUnit} 
              onChange={(event) => setForm({ ...form, costPerUnit: event.target.value })} 
              disabled={isView || isEdit}
            />
          </div>
          <Select 
            label="Warehouse" 
            required 
            placeholder="Select..." 
            options={(warehousesData?.data || []).map((warehouse) => ({ value: warehouse._id, label: `${warehouse.name} (${warehouse.warehouseCode})` }))} 
            value={form.warehouseId} 
            onChange={(event) => setForm({ ...form, warehouseId: event.target.value })} 
            disabled={isView || isEdit}
          />
          <Select 
            label="Source" 
            required 
            options={sources.filter((option) => option.value !== "customer_return" && option.value !== "supplier_delivery")} 
            value={form.source} 
            onChange={(event) => setForm({ ...form, source: event.target.value })} 
            disabled={isView || isEdit}
          />
          <Select 
            label="Disposition" 
            options={dispositions} 
            value={form.disposition} 
            onChange={(event) => setForm({ ...form, disposition: event.target.value })} 
            disabled={isView}
          />
          <Textarea 
            label="Description" 
            rows={3} 
            value={form.description} 
            onChange={(event) => setForm({ ...form, description: event.target.value })} 
            disabled={isView || isEdit}
          />
          
          <div className="rounded-lg border p-4 bg-gray-50/50 space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.isRefundable} onChange={(event) => setForm({ ...form, isRefundable: event.target.checked })} disabled={isView} />
              Is this damage refundable? (e.g. from Supplier or Transporter)
            </label>
            
            {form.isRefundable && (
              <div className="grid grid-cols-1 gap-4 pt-2 border-t">
                <Input 
                  label="Refund Amount (Expected/Received)" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={form.refundAmount} 
                  onChange={(event) => setForm({ ...form, refundAmount: event.target.value })} 
                  disabled={isView}
                />
                <Textarea 
                  label="Refund Notes (Who is paying, reference #)" 
                  rows={2} 
                  value={form.refundNotes} 
                  onChange={(event) => setForm({ ...form, refundNotes: event.target.value })} 
                  disabled={isView}
                />
              </div>
            )}
          </div>

          {(!isView && !isEdit) && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.adjustStock} onChange={(event) => setForm({ ...form, adjustStock: event.target.checked })} />
              Also decrement stock immediately
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={closeModal}>Close</Button>
          {!isView && (
            <Button variant="primary" onClick={submit} loading={create.isPending || update.isPending}>
              {isEdit ? "Save Changes" : "Record"}
            </Button>
          )}
        </div>
      </Modal>
      
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          await remove.mutateAsync(deletingId);
          setDeletingId(null);
        }}
        title="Delete Damage Record"
        message="Are you sure you want to delete this damage record? If stock was decremented, it will be added back."
        confirmText="Delete"
        variant="danger"
        loading={remove.isPending}
      />
    </div>
  );
}

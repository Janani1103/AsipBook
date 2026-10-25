"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Workflow, Eye, Edit, Trash2 } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Select from "../../../components/ui/Select.jsx";
import Input from "../../../components/ui/Input.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import { useBoms, useDeleteBom } from "../../../client/features/boms/useBoms.js";

const variants = {
  draft: "default",
  active: "success",
  inactive: "warning",
  archived: "default",
};

export default function BomsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 15,
  });
  const [deletingItem, setDeletingItem] = useState(null);
  const { data, isLoading } = useBoms(filters);
  const deleteMutation = useDeleteBom();
  const rows = data?.data || [];
  const changeFilters = (updates) =>
    setFilters((current) => ({ ...current, ...updates, page: 1 }));
  const columns = [
    { key: "bomCode", label: "BOM #", render: (item) => <span className="font-mono text-xs">{item.bomCode}</span> },
    { key: "name", label: "Recipe Name", render: (item) => <div><p className="font-medium">{item.name}</p><p className="text-xs text-gray-500">v{item.version}</p></div> },
    { key: "finished", label: "Produces", render: (item) => <div><p>{item.finishedProductName}</p><p className="text-xs text-gray-500">{item.outputQuantity} {item.outputUnitOfMeasure}</p></div> },
    { key: "components", label: "Components", render: (item) => item.components?.length || 0 },
    { key: "cost", label: "Cost/Unit", render: (item) => item.costPerUnit },
    { key: "status", label: "Status", render: (item) => <Badge variant={variants[item.status]}>{item.status}</Badge> },
    {
      key: "actions",
      label: "Actions",
      render: (item) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); router.push(`/boms/${item._id}`); }}
            title="View BOM"
          >
            <Eye size={16} className="text-gray-500 hover:text-indigo-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); router.push(`/boms/${item._id}/edit`); }}
            title="Edit BOM"
          >
            <Edit size={16} className="text-gray-500 hover:text-indigo-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }}
            title="Delete BOM"
          >
            <Trash2 size={16} className="text-gray-500 hover:text-red-600" />
          </Button>
        </div>
      ),
    },
  ];
  const confirmDelete = async () => {
    if (deletingItem) {
      await deleteMutation.mutateAsync(deletingItem._id);
      setDeletingItem(null);
    }
  };
  return (
    <div>
      <PageHeader title="Bills of Materials (BOM)" description="Recipes that define how finished products are made from raw materials" actions={<Button variant="primary" onClick={() => router.push("/boms/new")}><Plus size={16} className="mr-1.5" /> New BOM</Button>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b p-4">
          <input placeholder="Search BOM or product..." value={filters.search} onChange={(event) => changeFilters({ search: event.target.value })} className="min-w-[200px] flex-1 rounded-lg border px-3 py-2 text-sm" />
          <div className="w-36">
            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(event) => changeFilters({ startDate: event.target.value })}
            />
          </div>
          <div className="w-36">
            <Input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(event) => changeFilters({ endDate: event.target.value })}
            />
          </div>
          <div className="w-48">
            <Select placeholder="All Statuses" options={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "inactive", label: "Inactive" }, { value: "archived", label: "Archived" }]} value={filters.status} onChange={(event) => changeFilters({ status: event.target.value })} />
          </div>
        </div>
        {isLoading && <div className="py-16 text-center">Loading...</div>}
        {!isLoading && rows.length === 0 && <EmptyState icon={Workflow} title="No BOMs yet" description="Create your first recipe to manufacture products" />}
        {!isLoading && rows.length > 0 && <><Table columns={columns} data={rows} onRowClick={(item) => router.push(`/boms/${item._id}`)} /><Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} /></>}
      </Card>
      
      <ConfirmDialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={confirmDelete}
        title="Delete BOM"
        message={`Are you sure you want to delete the BOM for ${deletingItem?.finishedProductName}? This will archive it.`}
        confirmText="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

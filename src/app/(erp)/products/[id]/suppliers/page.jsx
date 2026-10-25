"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Star, Check } from "lucide-react";
import PageHeader from "../../../../../components/ui/PageHeader.jsx";
import Card from "../../../../../components/ui/Card.jsx";
import Button from "../../../../../components/ui/Button.jsx";
import Input from "../../../../../components/ui/Input.jsx";
import Select from "../../../../../components/ui/Select.jsx";
import Table from "../../../../../components/ui/Table.jsx";
import Badge from "../../../../../components/ui/Badge.jsx";
import Modal from "../../../../../components/ui/Modal.jsx";
import ConfirmDialog from "../../../../../components/ui/ConfirmDialog.jsx";
import toast from "react-hot-toast";
import axios from "axios";

const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function ProductSuppliersPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [deletingMapping, setDeletingMapping] = useState(null);
  const [formData, setFormData] = useState({
    supplierId: "",
    buyingPrice: 0,
    isPrimary: false,
    minimumOrderQuantity: 1,
    leadTimeDays: 7,
    returnable: true,
    returnPeriodDays: 7,
  });

  const [refreshKey, setRefreshKey] = useState(0);
  const refreshData = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [productRes, suppliersRes, allSuppliersRes] = await Promise.all([
          axios.get(`/api/products/${params.id}`),
          axios.get(`/api/product-suppliers?productId=${params.id}`),
          axios.get("/api/suppliers?status=active&limit=500"),
        ]);
        if (!cancelled) {
          setProduct(productRes.data.data);
          setSuppliers(suppliersRes.data.data || []);
          setAllSuppliers(allSuppliersRes.data.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch data:", error);
          toast.error("Failed to load data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [params.id, refreshKey]);

  const openModal = (mapping = null) => {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        supplierId: mapping.supplierId?._id || mapping.supplierId,
        buyingPrice: mapping.buyingPrice,
        isPrimary: mapping.isPrimary,
        minimumOrderQuantity: mapping.minimumOrderQuantity || 1,
        leadTimeDays: mapping.leadTimeDays || 7,
        returnable: mapping.returnPolicy?.returnable ?? true,
        returnPeriodDays: mapping.returnPolicy?.returnPeriodDays || 7,
      });
    } else {
      setEditingMapping(null);
      setFormData({
        supplierId: "",
        buyingPrice: 0,
        isPrimary: false,
        minimumOrderQuantity: 1,
        leadTimeDays: 7,
        returnable: true,
        returnPeriodDays: 7,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMapping(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        productId: params.id,
        ...formData,
        buyingPrice: Number(formData.buyingPrice),
        minimumOrderQuantity: Number(formData.minimumOrderQuantity),
        leadTimeDays: Number(formData.leadTimeDays),
        returnPeriodDays: Number(formData.returnPeriodDays),
        returnPolicy: {
          returnable: formData.returnable,
          returnPeriodDays: formData.returnPeriodDays,
        },
      };

      if (editingMapping) {
        await axios.put(`/api/product-suppliers/${editingMapping._id}`, payload);
        toast.success("Supplier mapping updated");
      } else {
        await axios.post("/api/product-suppliers", payload);
        toast.success("Supplier added to product");
      }

      closeModal();
      refreshData();
    } catch (error) {
      console.error("Failed to save mapping:", error);
      toast.error(error.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/product-suppliers/${deletingMapping._id}`);
      toast.success("Supplier mapping removed");
      setDeletingMapping(null);
      refreshData();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to remove supplier");
    }
  };

  const columns = [
    {
      key: "supplier",
      label: "Supplier",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.isPrimary && <Star size={16} className="text-yellow-500 fill-yellow-500" />}
          <div>
            <p className="font-medium">{row.supplierId?.displayName || row.supplierName}</p>
            <p className="text-xs text-gray-500">{row.supplierId?.supplierCode || row.supplierCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "buyingPrice",
      label: "Buying Price",
      render: (row) => money(row.buyingPrice),
    },
    {
      key: "moq",
      label: "Min Order Qty",
      render: (row) => row.minimumOrderQuantity,
    },
    {
      key: "leadTime",
      label: "Lead Time",
      render: (row) => `${row.leadTimeDays} days`,
    },
    {
      key: "returnPolicy",
      label: "Return Policy",
      render: (row) =>
        row.returnPolicy?.returnable ? (
          <Badge variant="success">{row.returnPolicy.returnPeriodDays} days</Badge>
        ) : (
          <Badge variant="default">No Returns</Badge>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={row.status === "active" ? "success" : "default"}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openModal(row)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDeletingMapping(row)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Product Suppliers"
          description="Manage suppliers for this product"
          actions={
            <Button variant="ghost" onClick={() => router.back()}>
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

  const supplierOptions = allSuppliers
    .filter((s) => !suppliers.some((ps) => ps.supplierId?._id === s._id || ps.supplierId === s._id))
    .map((s) => ({ value: s._id, label: `${s.displayName} (${s.supplierCode})` }));

  return (
    <div>
      <PageHeader
        title="Product Suppliers"
        description={`Manage suppliers for ${product?.name}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft size={16} className="mr-1.5" />
              Back
            </Button>
            <Button variant="primary" onClick={() => openModal()}>
              <Plus size={16} className="mr-1.5" />
              Add Supplier
            </Button>
          </>
        }
      />
      <Card>
        {suppliers.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="mb-4">No suppliers added to this product yet</p>
            <Button variant="primary" onClick={() => openModal()}>
              <Plus size={16} className="mr-1.5" />
              Add First Supplier
            </Button>
          </div>
        ) : (
          <Table columns={columns} data={suppliers} />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingMapping ? "Edit Supplier Mapping" : "Add Supplier to Product"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <Select
            label="Supplier"
            required
            disabled={!!editingMapping}
            options={editingMapping ? [{ value: formData.supplierId, label: editingMapping.supplierName }] : supplierOptions}
            value={formData.supplierId}
            onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
          />
          <Input
            label="Buying Price (LKR)"
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.buyingPrice}
            onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum Order Quantity"
              type="number"
              min="1"
              value={formData.minimumOrderQuantity}
              onChange={(e) => setFormData({ ...formData, minimumOrderQuantity: e.target.value })}
            />
            <Input
              label="Lead Time (Days)"
              type="number"
              min="0"
              value={formData.leadTimeDays}
              onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
            />
          </div>
          <div className="space-y-3 rounded-lg border p-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPrimary}
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Mark as Primary Supplier</span>
            </label>
            <p className="text-xs text-gray-500">Primary supplier will be selected by default for purchases</p>
          </div>
          <div className="space-y-3 rounded-lg border p-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.returnable}
                onChange={(e) => setFormData({ ...formData, returnable: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Returns Allowed</span>
            </label>
            {formData.returnable && (
              <Input
                label="Return Period (Days)"
                type="number"
                min="0"
                value={formData.returnPeriodDays}
                onChange={(e) => setFormData({ ...formData, returnPeriodDays: e.target.value })}
              />
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingMapping ? "Update" : "Add"} Supplier
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingMapping}
        onClose={() => setDeletingMapping(null)}
        onConfirm={handleDelete}
        title="Remove Supplier"
        message={`Are you sure you want to remove ${deletingMapping?.supplierName} from this product?`}
      />
    </div>
  );
}

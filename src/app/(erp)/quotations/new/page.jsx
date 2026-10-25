"use client";
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities, @next/next/no-location-assign-relative-destination */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Save, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { customersApi } from "../../../../client/features/customers/customersApi.js";
import { productsApi } from "../../../../client/features/products/productsApi.js";
import { stockApi } from "../../../../client/features/stock/stockApi.js";
import { useWarehouses } from "../../../../client/features/warehouses/useWarehouses.js";
import { useCreateQuotation } from "../../../../client/features/quotations/useQuotations.js";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Input from "../../../../components/ui/Input.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Select from "../../../../components/ui/Select.jsx";
import Textarea from "../../../../components/ui/Textarea.jsx";
''
const money = (value) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(value || 0);

export default function NewQuotationPage() {
  const create = useCreateQuotation();
  const [header, setHeader] = useState({
    customerId: "",
    sourceWarehouseId: "",
    shippingAddressLabel: "",
    priority: "normal",
    validUntil: "",
    customerNotes: "",
    internalNotes: "",
    shippingCost: 0,
    orderDiscountPercent: 0
  });
  const [items, setItems] = useState([]);

  const { data: customerData } = useQuery({
    queryKey: ["customers", "active"],
    queryFn: () => customersApi.list({ status: "active", limit: 500 })
  });
  const { data: productData } = useQuery({
    queryKey: ["products", "active"],
    queryFn: () => productsApi.list({ status: "active", limit: 500 })
  });
  const { data: warehouseData } = useWarehouses({ isActive: true });

  const customers = customerData?.data || [];
  const products = productData?.data || [];
  const warehouses = warehouseData?.data || [];

  useEffect(() => {
    if (!header.sourceWarehouseId && warehouses.length) {
      setHeader((value) => ({
        ...value,
        sourceWarehouseId: (warehouses.find((warehouse) => warehouse.isDefault) || warehouses[0])._id
      }));
    }
  }, [warehouses, header.sourceWarehouseId]);

  const selectedCustomer = customers.find((customer) => customer._id === header.customerId);
  const selectedWarehouse = warehouses.find((warehouse) => warehouse._id === header.sourceWarehouseId);

  const { data: stockData } = useQuery({
    queryKey: ["stock", "for-quotations", header.sourceWarehouseId],
    queryFn: () => stockApi.list({ warehouseId: header.sourceWarehouseId, limit: 500 }),
    enabled: !!header.sourceWarehouseId
  });

  const stockMap = useMemo(() => {
    const map = new Map();
    (stockData?.data || []).forEach((stock) => {
      const id = stock.productId?._id || stock.productId;
      const row = map.get(id) || { onHand: 0, reserved: 0 };
      row.onHand += stock.quantities?.onHand || 0;
      row.reserved += stock.quantities?.reserved || 0;
      row.available = Math.max(0, row.onHand - row.reserved);
      map.set(id, row);
    });
    return map;
  }, [stockData]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    items.forEach((item) => {
      const lineSubtotal = (+item.orderedQuantity || 0) * (+item.unitPrice || 0);
      const discount = lineSubtotal * (+item.discountPercent || 0) / 100;
      const taxable = item.taxable ? lineSubtotal - discount : 0;
      subtotal += lineSubtotal;
      totalDiscount += discount;
      totalTax += taxable * (+item.taxRate || 0) / 100;
    });
    const orderLevelDiscount = (subtotal - totalDiscount) * (+header.orderDiscountPercent || 0) / 100;
    return {
      subtotal: +subtotal.toFixed(2),
      totalDiscount: +totalDiscount.toFixed(2),
      totalTax: +totalTax.toFixed(2),
      orderLevelDiscount: +orderLevelDiscount.toFixed(2),
      grandTotal: +(subtotal - totalDiscount - orderLevelDiscount + totalTax + (+header.shippingCost || 0)).toFixed(2)
    };
  }, [items, header.orderDiscountPercent, header.shippingCost]);

  const changeHeader = (field, value) => setHeader((current) => ({ ...current, [field]: value }));

  const addItem = () => setItems((current) => [
    ...current,
    { productId: "", orderedQuantity: 1, unitPrice: 0, discountPercent: 0, taxRate: 18, taxable: true }
  ]);

  const updateItem = (index, field, value) => setItems((current) =>
    current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      if (field === "productId" && value) {
        const product = products.find((row) => row._id === value);
        if (product) {
          let price = product.basePrice;
          if (selectedCustomer?.defaultDiscountPercent) {
            price *= 1 - selectedCustomer.defaultDiscountPercent / 100;
          }
          next.unitPrice = +price.toFixed(2);
          next.taxRate = product.tax?.taxRate || 0;
          next.taxable = product.tax?.taxable ?? true;
        }
      }
      return next;
    })
  );

  const submit = async (saveAsDraft) => {
    if (!header.customerId) return toast.error("Select a customer");
    if (!header.sourceWarehouseId) return toast.error("Select a warehouse");
    if (!items.length) return toast.error("Add at least one item");
    if (items.some((item) => !item.productId || !item.orderedQuantity)) {
      return toast.error("All items must have a product and quantity");
    }
    const payload = {
      customerId: header.customerId,
      sourceWarehouseId: header.sourceWarehouseId,
      source: "direct",
      shippingAddressLabel: header.shippingAddressLabel || undefined,
      validUntil: header.validUntil || undefined,
      priority: header.priority,
      items: items.map((item) => ({
        productId: item.productId,
        orderedQuantity: +item.orderedQuantity,
        unitPrice: +item.unitPrice,
        discountPercent: +item.discountPercent || 0,
        taxRate: +item.taxRate || 0,
        taxable: item.taxable
      })),
      orderDiscount: header.orderDiscountPercent > 0
        ? { type: "percentage", value: +header.orderDiscountPercent }
        : undefined,
      shippingCost: +header.shippingCost || 0,
      customerNotes: header.customerNotes || undefined,
      internalNotes: header.internalNotes || undefined,
      status: saveAsDraft ? "draft" : "sent"
    };
    try {
      const result = await create.mutateAsync(payload);
      window.location.assign(`/quotations/${result.data._id}`);
    } catch {}
  };

  const productOptions = products
    .filter((product) => product.canBeSold !== false)
    .map((product) => {
      const available = stockMap.get(product._id)?.available || 0;
      return {
        value: product._id,
        label: `${product.name} · ${product.productCode} · ${
          available <= 0 ? "⚠ Out of stock" : `✓ ${available} available`
        } · LKR ${product.basePrice}`,
        disabled: false
      };
    });

  return (
    <div>
      <PageHeader
        title="New Quotation"
        description={selectedWarehouse ? `Quote from: ${selectedWarehouse.name}` : "Select a warehouse to begin"}
        actions={
          <Link href="/quotations">
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-1.5" />
              Back
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Customer & Delivery</h3>
            <div className="space-y-4">
              <Select
                label="Customer"
                required
                placeholder="Select a customer..."
                options={customers.map((customer) => ({
                  value: customer._id,
                  label: `${customer.displayName} (${customer.customerCode})`
                }))}
                value={header.customerId}
                onChange={(event) => {
                  changeHeader("customerId", event.target.value);
                  changeHeader("shippingAddressLabel", "");
                }}
              />
              <Select
                label="Source Warehouse"
                required
                placeholder="Select warehouse..."
                options={warehouses.map((warehouse) => ({
                  value: warehouse._id,
                  label: `${warehouse.name} (${warehouse.warehouseCode})${
                    warehouse.isDefault ? " · Default" : ""
                  }`
                }))}
                value={header.sourceWarehouseId}
                onChange={(event) => changeHeader("sourceWarehouseId", event.target.value)}
              />
              {selectedCustomer && (
                <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
                  <p>Tax Reg: {selectedCustomer.taxRegistrationNumber || "—"}</p>
                  <p>
                    Terms: {selectedCustomer.paymentTerms?.type?.toUpperCase()}
                    {selectedCustomer.paymentTerms?.type === "credit" &&
                      ` (${selectedCustomer.paymentTerms.creditDays}d)`}
                  </p>
                  <p>Available credit: {money(selectedCustomer.creditStatus?.availableCredit)}</p>
                  <p>Default discount: {selectedCustomer.defaultDiscountPercent || 0}%</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Valid Until"
                  type="date"
                  value={header.validUntil}
                  onChange={(event) => changeHeader("validUntil", event.target.value)}
                />
                <Select
                  label="Priority"
                  options={[
                    { value: "low", label: "Low" },
                    { value: "normal", label: "Normal" },
                    { value: "high", label: "High" },
                    { value: "urgent", label: "Urgent" }
                  ]}
                  value={header.priority}
                  onChange={(event) => changeHeader("priority", event.target.value)}
                />
              </div>
              {selectedCustomer?.shippingAddresses?.length > 0 && (
                <Select
                  label="Shipping Address"
                  placeholder="Default billing address"
                  options={selectedCustomer.shippingAddresses.map((address) => ({
                    value: address.label,
                    label: `${address.label}: ${address.line1}${address.city ? `, ${address.city}` : ""}`
                  }))}
                  value={header.shippingAddressLabel}
                  onChange={(event) => changeHeader("shippingAddressLabel", event.target.value)}
                />
              )}
            </div>
          </Card>
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Line Items</h3>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus size={14} className="mr-1" />
                Add Item
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No items added yet. Click "Add Item" to begin.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-lg border p-4 md:grid-cols-12 md:gap-4"
                  >
                    <div className="md:col-span-5">
                      <Select
                        placeholder="Select product..."
                        options={productOptions}
                        value={item.productId}
                        onChange={(event) => updateItem(index, "productId", event.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Qty"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.orderedQuantity}
                        onChange={(event) => updateItem(index, "orderedQuantity", event.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Unit Price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) => updateItem(index, "unitPrice", event.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Discount %"
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercent}
                        onChange={(event) => updateItem(index, "discountPercent", event.target.value)}
                      />
                    </div>
                    <div className="flex items-end md:col-span-1">
                      <button
                        type="button"
                        disabled={items.length === 1}
                        onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                        className="rounded p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Notes</h3>
            <div className="space-y-4">
              <Textarea
                label="Customer Notes (Visible to customer)"
                placeholder="Notes that will appear on the quotation..."
                value={header.customerNotes}
                onChange={(event) => changeHeader("customerNotes", event.target.value)}
              />
              <Textarea
                label="Internal Notes (Hidden from customer)"
                placeholder="Internal notes for your team..."
                value={header.internalNotes}
                onChange={(event) => changeHeader("internalNotes", event.target.value)}
              />
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Item Discounts</span>
                <span className="text-red-600">-{money(totals.totalDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{money(totals.totalTax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Discount ({header.orderDiscountPercent}%)</span>
                <span className="text-red-600">-{money(totals.orderLevelDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{money(header.shippingCost)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{money(totals.grandTotal)}</span>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Additional Charges</h3>
            <div className="space-y-4">
              <Input
                label="Shipping Cost"
                type="number"
                min="0"
                step="0.01"
                value={header.shippingCost}
                onChange={(event) => changeHeader("shippingCost", event.target.value)}
              />
              <Input
                label="Order Discount %"
                type="number"
                min="0"
                max="100"
                value={header.orderDiscountPercent}
                onChange={(event) => changeHeader("orderDiscountPercent", event.target.value)}
              />
            </div>
          </Card>
          <Card className="p-6">
            <div className="space-y-3">
              <Button
                fullWidth
                variant="outline"
                loading={create.isPending}
                onClick={() => submit(true)}
              >
                Save as Draft
              </Button>
              <Button
                fullWidth
                variant="primary"
                loading={create.isPending}
                onClick={() => submit(false)}
              >
                Send Quotation
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

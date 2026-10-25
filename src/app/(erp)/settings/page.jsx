"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { Settings, Save, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  useCompanySettings,
  useUpdateCompanySettings,
} from "../../../client/features/settings/useSettings.js";
import Button from "../../../components/ui/Button.jsx";

export default function SettingsPage() {
  const { data: settingsRes, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    taxRegistrationNumber: "",
    logo: "",
    ownerSeal: "",
    ownerSignature: "",
    receiptFooterMessage: "",
    businessType: "general_retail",
    features: {
      batchTracking: false,
      expiryTracking: false,
      multipleSuppliers: false,
      supplierReturns: false,
      advancePayments: false,
      fefoStockSelection: false,
    },
  });

  useEffect(() => {
    if (settingsRes?.data) {
      const s = settingsRes.data;
      setFormData({
        companyName: s.companyName || "",
        address: s.address || "",
        phone: s.phone || "",
        email: s.email || "",
        website: s.website || "",
        taxRegistrationNumber: s.taxRegistrationNumber || "",
        logo: s.logo || "",
        ownerSeal: s.ownerSeal || "",
        ownerSignature: s.ownerSignature || "",
        receiptFooterMessage: s.receiptFooterMessage || "",
        businessType: s.businessType || "general_retail",
        features: {
          batchTracking: s.features?.batchTracking || false,
          expiryTracking: s.features?.expiryTracking || false,
          multipleSuppliers: s.features?.multipleSuppliers || false,
          supplierReturns: s.features?.supplierReturns || false,
          advancePayments: s.features?.advancePayments || false,
          fefoStockSelection: s.features?.fefoStockSelection || false,
        },
      });
    }
  }, [settingsRes]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("features.")) {
      const featureName = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        features: {
          ...prev.features,
          [featureName]: type === "checkbox" ? checked : value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(formData);
      toast.success("Settings updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update settings");
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Settings className="text-primary-600" />
            Company Settings
          </h1>
          <p className="mt-1 text-gray-500">Manage your company details for receipts and invoices.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Company Name *</label>
              <input
                type="text"
                name="companyName"
                required
                value={formData.companyName}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Company Logo</label>
              <div className="flex items-start gap-4">
                {formData.logo && (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border">
                    <img
                      src={formData.logo}
                      alt="Company Logo"
                      className="h-full w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, logo: "" }))}
                      className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Upload from File</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "logo")}
                        className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Or Enter URL</label>
                    <input
                      type="text"
                      name="logo"
                      value={formData.logo}
                      onChange={handleChange}
                      placeholder="Enter logo URL (e.g., https://example.com/logo.png)"
                      className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Upload an image file or paste a URL. It will appear on invoices, quotations, and receipts.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Owner Seal</label>
              <div className="flex items-start gap-4">
                {formData.ownerSeal && (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border">
                    <img src={formData.ownerSeal} alt="Owner Seal" className="h-full w-full object-contain" />
                    <button type="button" onClick={() => setFormData((prev) => ({ ...prev, ownerSeal: "" }))} className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Upload Seal Image</label>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "ownerSeal")} className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Transparent PNG recommended. Used for official documents like Payslips.</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Owner Signature</label>
              <div className="flex items-start gap-4">
                {formData.ownerSignature && (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border">
                    <img src={formData.ownerSignature} alt="Owner Signature" className="h-full w-full object-contain" />
                    <button type="button" onClick={() => setFormData((prev) => ({ ...prev, ownerSignature: "" }))} className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Upload Signature Image</label>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "ownerSignature")} className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Transparent PNG recommended. Appears alongside the seal.</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Website</label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tax / Registration Number
              </label>
              <input
                type="text"
                name="taxRegistrationNumber"
                value={formData.taxRegistrationNumber}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Receipt Footer Message
              </label>
              <textarea
                name="receiptFooterMessage"
                rows={3}
                value={formData.receiptFooterMessage}
                onChange={handleChange}
                placeholder="E.g. Thank you for your business! Please visit again."
                className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                This message will be printed at the bottom of thermal receipts.
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Business Type & Features</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Business Type</label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="general_retail">General Retail</option>
                  <option value="bakery">Bakery</option>
                  <option value="food">Food & Beverage</option>
                  <option value="beverage">Beverage</option>
                  <option value="mixed">Mixed Business</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select your primary business type to enable relevant features.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium text-gray-700">
                Feature Toggles
              </label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="features.batchTracking"
                    checked={formData.features.batchTracking}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">Batch Tracking</span>
                    <span className="block text-xs text-gray-500">Track products by batch numbers</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="features.expiryTracking"
                    checked={formData.features.expiryTracking}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">Expiry Tracking</span>
                    <span className="block text-xs text-gray-500">Track product expiry dates</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="features.multipleSuppliers"
                    checked={formData.features.multipleSuppliers}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">Multiple Suppliers</span>
                    <span className="block text-xs text-gray-500">Assign multiple suppliers per product</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="features.supplierReturns"
                    checked={formData.features.supplierReturns}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">Supplier Returns</span>
                    <span className="block text-xs text-gray-500">Enable supplier return management</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="features.advancePayments"
                    checked={formData.features.advancePayments}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">Advance Payments</span>
                    <span className="block text-xs text-gray-500">Allow advance payments to suppliers</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="features.fefoStockSelection"
                    checked={formData.features.fefoStockSelection}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">FEFO Stock Selection</span>
                    <span className="block text-xs text-gray-500">First Expiry, First Out stock picking</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button type="submit" variant="primary" loading={updateSettings.isPending}>
              <Save size={18} className="mr-2" /> Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

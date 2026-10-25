"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { useBankAccounts } from "../bankAccounts/useBankAccounts.js";
import {
  useCreateExpense,
  useExpenseCategories,
  useUpdateExpense,
} from "./useExpenses.js";

const DEFAULT_CATEGORIES = [
  "Meals & Entertainment",
  "Fuel & Travel",
  "Office Supplies",
  "Repairs & Maintenance",
  "Salary",
  "Utilities",
  "Rent",
  "Marketing",
  "General / Other",
];

const getInitialForm = (expense) => ({
  date: expense?.date
    ? new Date(expense.date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0],
  amount: expense?.amount !== undefined ? expense.amount : "",
  paymentMethod: expense?.paymentMethod || "cash",
  bankAccountId: expense?.bankAccountId?._id || expense?.bankAccountId || "",
  reference: expense?.reference || "",
  description: expense?.description || "",
});

export default function ExpenseFormModal({
  isOpen,
  onClose,
  expenseToEdit = null,
}) {
  const categoryRef = useRef(null);
  const [categoryInput, setCategoryInput] = useState(
    expenseToEdit?.category || ""
  );
  const [formData, setFormData] = useState(() => getInitialForm(expenseToEdit));
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: categoriesData } = useExpenseCategories();
  const { data: bankAccountsData } = useBankAccounts();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const isEditing = !!expenseToEdit;
  const isPending = isEditing ? updateExpense.isPending : createExpense.isPending;

  const dbCategories = categoriesData?.data || [];
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...dbCategories])];
  const filteredSuggestions = categoryInput
    ? allCategories.filter((category) =>
      category.toLowerCase().includes(categoryInput.toLowerCase())
    )
    : allCategories;

  const bankAccounts = bankAccountsData?.data || [];


  useEffect(() => {
    const handleMouseDown = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const closeModal = () => {
    setFormData(getInitialForm(null));
    setCategoryInput("");
    setShowSuggestions(false);
    onClose();
  };

  const submitExpense = (event) => {
    event.preventDefault();

    if (!categoryInput.trim()) {
      toast.error("Please enter a category");
      return;
    }

    const payload = {
      ...formData,
      amount: Number(formData.amount),
      category: categoryInput.trim(),
      bankAccountId: formData.bankAccountId || undefined,
    };

    if (isEditing) {
      updateExpense.mutate(
        { id: expenseToEdit._id, data: payload },
        { onSuccess: closeModal }
      );
    } else {
      createExpense.mutate(payload, { onSuccess: closeModal });
    }
  };

  const isNewCategory =
    categoryInput &&
    !allCategories.some(
      (category) => category.toLowerCase() === categoryInput.toLowerCase()
    );

  const bankAccountOptions = [
    { value: "", label: formData.paymentMethod === "cash" ? "Cash in Hand (Default)" : "Select Bank Account (Optional)" },
    ...bankAccounts.map((acc) => ({
      value: acc._id,
      label: `${acc.bankName} - ${acc.accountName} (${acc.category})`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Expense: ${expenseToEdit.expenseNumber}` : "Record Expense"}
      size="md"
    >
      <form onSubmit={submitExpense}>
        <div className="space-y-4 p-4">
          <Input
            label="Date"
            type="date"
            required
            value={formData.date}
            onChange={(event) => updateField("date", event.target.value)}
          />

          <div ref={categoryRef} className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Category <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="Type or select a category..."
              value={categoryInput}
              onChange={(event) => {
                setCategoryInput(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {filteredSuggestions.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="w-full border-b px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors last:border-0 hover:bg-primary-50"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setCategoryInput(category);
                      setShowSuggestions(false);
                    }}
                  >
                    {category}
                  </button>
                ))}
                {isNewCategory && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-green-700 transition-colors hover:bg-green-50"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="text-green-500">+</span>
                    Add &quot;{categoryInput}&quot; as new category
                  </button>
                )}
              </div>
            )}
            {!categoryInput && (
              <p className="mt-1 text-xs text-gray-400">
                Type a category or pick from suggestions
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (LKR)"
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(event) => updateField("amount", event.target.value)}
            />
            <Select
              label="Payment Method"
              required
              options={[
                { value: "cash", label: "Cash (Deducts from Cash in Hand)" },
                { value: "bank_transfer", label: "Bank Transfer" },
                { value: "card", label: "Card" },
                { value: "cheque", label: "Cheque" },
                { value: "other", label: "Other" },
              ]}
              value={formData.paymentMethod}
              onChange={(event) =>
                updateField("paymentMethod", event.target.value)
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Account / Cash Drawer"
              options={bankAccountOptions}
              value={formData.bankAccountId}
              onChange={(event) =>
                updateField("bankAccountId", event.target.value)
              }
            />

            <Input
              label="Reference / Voucher #"
              placeholder="e.g. REC-1029, Cheque #"
              value={formData.reference}
              onChange={(event) => updateField("reference", event.target.value)}
            />
          </div>

          <Textarea
            label="Description / Notes"
            rows={3}
            value={formData.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isPending}
          >
            {isEditing ? "Update Expense" : "Record Expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

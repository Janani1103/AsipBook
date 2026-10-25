"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { expensesApi } from "./expensesApi.js";

export function useExpenses(filters = {}) {
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => expensesApi.list(filters),
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense-categories"],
    queryFn: expensesApi.getCategories,
    staleTime: 30000,
  });
}

export function useExpense(id) {
  return useQuery({
    queryKey: ["expense", id],
    queryFn: () => expensesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["pos-sessions", "active"] });
      toast.success("Expense recorded successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to record expense");
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => expensesApi.update({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense"] });
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["pos-sessions", "active"] });
      toast.success("Expense updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update expense");
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => {
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["pos-sessions", "active"] });
    },
  });
}

"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { creditNotesApi } from "./creditNotesApi.js";
export const useCreditNotes = (filters = {}) => useQuery({ queryKey: ["creditNotes", filters], queryFn: () => creditNotesApi.list(filters), placeholderData: (previous) => previous });
export const useCreditNote = (id) => useQuery({ queryKey: ["creditNote", id], queryFn: () => creditNotesApi.getById(id), enabled: !!id });
export const useCreateCreditNote = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data) => creditNotesApi.create(data),
    onSuccess: () => {
      ["creditNotes", "customers", "invoices"].forEach((key) =>
        client.invalidateQueries({ queryKey: [key] })
      );
      toast.success("Credit note issued successfully");
    },
    onError: (error) => toast.error(error.response?.data?.message || "Failed to create credit note"),
  });
};

export const useApplyCreditNote = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => creditNotesApi.apply(id, data),
    onSuccess: () => {
      ["creditNotes", "creditNote", "invoices", "invoice", "customers"].forEach((key) =>
        client.invalidateQueries({ queryKey: [key] })
      );
      toast.success("Credit applied to invoice");
    },
    onError: (error) => toast.error(error.response?.data?.message || "Failed to apply credit"),
  });
};

export const useUpdateCreditNote = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => creditNotesApi.update(id, data),
    onSuccess: () => {
      ["creditNotes", "creditNote", "customers", "invoices", "invoice"].forEach((key) =>
        client.invalidateQueries({ queryKey: [key] })
      );
      toast.success("Credit note updated successfully");
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Failed to update credit note"),
  });
};

export const useDeleteCreditNote = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => creditNotesApi.remove(id),
    onSuccess: () => {
      ["creditNotes", "creditNote", "customers", "invoices", "invoice"].forEach((key) =>
        client.invalidateQueries({ queryKey: [key] })
      );
      toast.success("Credit note deleted successfully");
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Failed to delete credit note"),
  });
};


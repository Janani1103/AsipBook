"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { chequesApi } from "./chequesApi.js";

export function useCheques(filters = {}) {
  return useQuery({
    queryKey: ["cheques", filters],
    queryFn: () => chequesApi.list(filters),
  });
}

export function useCheque(id) {
  return useQuery({
    queryKey: ["cheque", id],
    queryFn: () => chequesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chequesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cheque recorded successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to record cheque");
    },
  });
}

export function useUpdateCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => chequesApi.update({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["cheque"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cheque updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update cheque");
    },
  });
}

export function useUpdateChequeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chequesApi.updateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cheque status updated");
    },
  });
}

export function useDeleteCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chequesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cheque record deleted");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Delete failed");
    },
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { grnsApi } from "./grnsApi.js";

const showError = (error, fallback = "Failed") =>
  toast.error(error.response?.data?.message || fallback);

export const useGrns = (filters = {}) =>
  useQuery({
    queryKey: ["grns", filters],
    queryFn: () => grnsApi.list(filters),
    placeholderData: (previous) => previous,
  });

export const useGrn = (id) =>
  useQuery({
    queryKey: ["grn", id],
    queryFn: () => grnsApi.getById(id),
    enabled: !!id,
  });

export function useCreateGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: grnsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["grns"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      toast.success(data.message || "Goods received successfully");
    },
    onError: (error) => showError(error),
  });
}

export function useUpdateGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => grnsApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["grns"] });
      queryClient.invalidateQueries({ queryKey: ["grn"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      toast.success(data.message || "GRN updated successfully");
    },
    onError: (error) => showError(error, "Failed to update GRN"),
  });
}

export function useCancelGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: grnsApi.cancel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["grns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      toast.success(data.message || "GRN cancelled and stock reversed");
    },
    onError: (error) => showError(error, "Cancellation failed"),
  });
}


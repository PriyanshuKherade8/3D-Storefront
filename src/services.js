import { useMutation, useQuery } from "@tanstack/react-query";
import { backendClient, httpClient } from "./httpClient";
import { useLocation, useParams } from "react-router-dom";

export const useGetProductListData = (id) => {
  const { data, error, isLoading } = useQuery({
    queryKey: ["allData", id],
    queryFn: () => httpClient.get(`get_storefront?storefront=${id}`),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

  return { data, error, isLoading };
};

export const useSetProductChangeCall = () => {
  const { mutate, isLoading, data, error } = useMutation({
    mutationFn: async (payload) => {
      const response = await backendClient.post(
        "/player/send_socket_message",
        payload
      );
      return response.data;
    },
  });

  return { mutate, isLoading, data, error };
};

export const useSetActionCall = () => {
  const { mutate, isLoading, data, error } = useMutation({
    mutationFn: async (payload) => {
      const response = await backendClient.post(
        "/player/send_socket_message",
        payload
      );
      return response.data;
    },
  });

  return { mutate, isLoading, data, error };
};

import { useMutation, useQuery } from "@tanstack/react-query";
import { backendClient, httpClient } from "./httpClient";
import { useLocation, useParams } from "react-router-dom";

export const useGetProductListData = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const storefrontId = queryParams.get("storefront");

  const { data, error, isLoading } = useQuery({
    queryKey: ["allData", storefrontId],
    queryFn: () => httpClient.get(`get_storefront?storefront=${storefrontId}`),
    enabled: !!storefrontId,
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

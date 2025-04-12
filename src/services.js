import { useMutation, useQuery } from "@tanstack/react-query";
import { backendClient, httpClient } from "./httpClient";

export const useGetProductListData = () => {
  const { data, error, isLoading } = useQuery({
    queryKey: ["allData"],
    queryFn: () => httpClient.get(`get_storefront?storefront=STR1000000001`),
    // enabled: !!url_id,
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

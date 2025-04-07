import { useQuery } from "@tanstack/react-query";
import { httpClient } from "./httpClient";

export const useGetProductListData = () => {
  const { data, error, isLoading } = useQuery({
    queryKey: ["allData"],
    queryFn: () => httpClient.get(`get_storefront?storefront=STR1000000001`),
    // enabled: !!url_id,
    refetchOnWindowFocus: false,
  });

  return { data, error, isLoading };
};

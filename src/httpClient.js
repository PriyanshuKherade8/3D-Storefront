import axios from "axios";

export const httpClient = axios.create({
  baseURL: "http://143.110.186.134/api/storefront",
  headers: {
    "Content-Type": "application/json",
  },
});

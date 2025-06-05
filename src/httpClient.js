import axios from "axios";

export const httpClient = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}/storefront`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const backendClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

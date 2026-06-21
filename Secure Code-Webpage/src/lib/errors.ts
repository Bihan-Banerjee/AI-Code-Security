import { AxiosError } from "axios";

/** Extracts a human-readable message from an unknown thrown value (esp. AxiosError). */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const ax = err as AxiosError<{ error?: string }>;
  if (ax?.response?.data?.error) return ax.response.data.error;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

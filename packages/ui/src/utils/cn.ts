import { type ClassValue, clsx } from "clsx";

/**
 * Utility function to merge className values with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
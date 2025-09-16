import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  value: number,
  currency: string = "USD",
  decimals: number = 2
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercentage(
  value: number,
  decimals: number = 2
): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date))
}

export function calculateProfitLoss(
  openPrice: number,
  currentPrice: number,
  lots: number,
  type: "buy" | "sell"
): number {
  const priceDiff = type === "buy" 
    ? currentPrice - openPrice 
    : openPrice - currentPrice;
  
  return priceDiff * lots * 100000; // Assuming standard lot size
}

export function calculateProfitLossPercentage(
  openPrice: number,
  currentPrice: number,
  type: "buy" | "sell"
): number {
  const priceDiff = type === "buy" 
    ? currentPrice - openPrice 
    : openPrice - currentPrice;
  
  return (priceDiff / openPrice) * 100;
}
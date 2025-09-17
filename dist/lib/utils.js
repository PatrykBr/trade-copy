"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.formatCurrency = formatCurrency;
exports.formatPercentage = formatPercentage;
exports.formatDateTime = formatDateTime;
exports.formatDate = formatDate;
exports.formatTime = formatTime;
exports.calculateProfitLoss = calculateProfitLoss;
exports.calculateProfitLossPercentage = calculateProfitLossPercentage;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
function formatCurrency(value, currency = "USD", decimals = 2) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}
function formatPercentage(value, decimals = 2) {
    return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value / 100);
}
function formatDateTime(date) {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(date));
}
function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(date));
}
function formatTime(date) {
    return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(new Date(date));
}
function calculateProfitLoss(openPrice, currentPrice, lots, type) {
    const priceDiff = type === "buy"
        ? currentPrice - openPrice
        : openPrice - currentPrice;
    return priceDiff * lots * 100000; // Assuming standard lot size
}
function calculateProfitLossPercentage(openPrice, currentPrice, type) {
    const priceDiff = type === "buy"
        ? currentPrice - openPrice
        : openPrice - currentPrice;
    return (priceDiff / openPrice) * 100;
}

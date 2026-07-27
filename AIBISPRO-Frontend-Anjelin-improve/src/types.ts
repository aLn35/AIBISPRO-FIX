/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = "MAINTAINANCE" | "OWNER" | "MANAGER" | "CUSTOMER";

export interface User {
  id?: number;
  email: string;
  name: string;
  role: Role;
  assignedCompanies: string[]; // List of company IDs (stringified backend ids) they can access
  password?: string;
}

export interface Company {
  id: string; // stringified real backend company id
  name: string;
  type: string;
  branches: number;
  location: string;
  description: string;
  avatarUrl: string;
  partnershipStatus?: "active" | "inactive";
}

export interface FinancialMetric {
  id: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  revenue: number;
  expenses: number;
  cogs: number;
  profit: number;
  cashFlow: number;
  inventoryValue: number;
}

export interface Product {
  id: string;
  companyId: string;
  productId?: number; // real backend products.id - needed to edit/delete this menu item
  sizeId?: number; // real backend product_sizes.id - needed to edit price/stock/size name
  sizeName?: string;
  name: string;
  category: string;
  price: number; // in primary currency (IDR)
  cogs: number; // cost of goods sold
  stock: number;
  minStock: number; // reorder point
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  salesCount: number; // for top/worst products analysis
}

export interface Sale {
  id: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  totalAmount: number;
  tax: number;
  paymentMethod: string;
  items: SaleItem[];
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  cogs: number;
}

export interface Promotion {
  id: string;
  companyId: string;
  name: string;
  type: "DISCOUNT" | "BUNDLE" | "BUY_1_GET_1";
  discountPercent?: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "COMPLETED" | "PENDING_APPROVAL" | "REJECTED";
  conversionRate: number; // e.g. 15.4 for 15.4%
  revenueGenerated: number;
  description?: string;
  rejectReason?: string;
  imageUrl?: string;
}

export interface RestockRequest {
  id: number;
  companyId: number;
  productSizeId: number | null;
  productName: string;
  quantity: number;
  supplierName?: string;
  estimatedCost?: number;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  initiatedBy: number;
  initiatedByRole: "MANAGER" | "OWNER";
  initiatedByName?: string;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  source: "manual" | "import";
  createdAt: string;
}

export interface BundleProposal {
  id: number;
  companyId: number;
  name: string;
  productIds: number[];
  productNames?: string[];
  regularPrice: number;
  bundlePrice: number;
  strategy?: string;
  status: "pending" | "approved" | "rejected";
  createdBy: number;
  createdByName?: string;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

export interface Bundle {
  id: string;
  companyId: string;
  name: string;
  products: string[]; // Product names or IDs
  bundlePrice: number;
  regularPrice: number;
  salesCount: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface RevenueForecast {
  id: string;
  companyId: string;
  targetMonth: string; // e.g. "July 2026"
  forecastedRevenue: number;
  confidenceScore: number; // e.g. 92%
  keyDrivers: string[];
}

export interface ChatbotLog {
  id: string;
  companyId: string;
  sender: "USER" | "AI";
  message: string;
  timestamp: string;
}

export interface AiInsight {
  id: string;
  companyId: string;
  title: string;
  summary: string;
  details: string;
  recommendations: string[];
  type: "ALERT" | "INFO" | "SUCCESS";
  date: string;
}

export interface Event {
  id: string;
  companyId: string;
  title: string;
  description: string;
  date: string;
  type: "PROMOTION" | "HOLIDAY" | "SUPPLY_DELAY" | "MAINTENANCE";
}

export interface Expense {
  id: string;
  companyId: string;
  category: string; // Rent, Salaries, Ingredients, Utilities, Marketing
  amount: number;
  date: string;
  description: string;
}

export interface Notification {
  id: string;
  companyId: string;
  title: string;
  message: string;
  type: "ALERT" | "SUCCESS" | "INFO";
  read: boolean;
  date: string;
}

export interface InboxMessage {
  id: string;
  companyId: string;
  authorId: number;
  authorName: string;
  authorRole: Role;
  message: string;
  aiGenerated: boolean;
  isRead: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  id: string;
  companyId: string | null;
  title: string;
  messageCount: number;
  updatedAt: string;
}

export type Currency = "IDR" | "USD";

export type TimeFilter = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "LAST_MONTH" | "QUARTERLY" | "YEARLY";

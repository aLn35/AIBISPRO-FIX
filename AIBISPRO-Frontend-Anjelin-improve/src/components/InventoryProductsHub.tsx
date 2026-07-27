/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Company, Product, Promotion, Currency, FinancialMetric, RevenueForecast, User } from "../types";
import ManagerDashboard from "./ManagerDashboard";

interface InventoryProductsHubProps {
  currentUser: User;
  company: Company;
  products: Product[];
  promotions: Promotion[];
  metrics: FinancialMetric[];
  forecast: RevenueForecast | undefined;
  currency: Currency;
  onApprovePromotion: (promoId: string) => void;
  onRejectPromotion: (promoId: string, reason: string) => void;
  onAddPromotion: (promo: Omit<Promotion, "id" | "companyId" | "conversionRate" | "revenueGenerated">) => void;
  onDataChanged?: () => void;
}

export default function InventoryProductsHub({
  currentUser,
  company,
  products,
  promotions,
  metrics,
  forecast,
  currency,
  onApprovePromotion,
  onRejectPromotion,
  onAddPromotion,
  onDataChanged,
}: InventoryProductsHubProps) {
  return (
    <ManagerDashboard
      currentUser={currentUser}
      company={company}
      products={products}
      promotions={promotions}
      metrics={metrics}
      forecast={forecast}
      currency={currency}
      onApprovePromotion={onApprovePromotion}
      onRejectPromotion={onRejectPromotion}
      onAddPromotion={onAddPromotion}
      onDataChanged={onDataChanged}
      pageMode="OPERATIONS"
    />
  );
}

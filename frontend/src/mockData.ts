/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Company, Product, FinancialMetric, Sale, Promotion, Bundle, RevenueForecast, AiInsight, Event, Expense, Notification, ChatbotLog } from "./types";

export const PRESET_COMPANIES: Company[] = [
  {
    id: "abc_coffee",
    name: "ABC Coffee",
    type: "Coffee Chain",
    branches: 12,
    location: "Jakarta, Bandung & Surabaya",
    description: "Premium arabica coffee roasters and cozy lifestyle cafes catering to students and professionals.",
    avatarUrl: "☕",
  },
  {
    id: "xyz_restaurant",
    name: "XYZ Restaurant",
    type: "Restaurant Group",
    branches: 5,
    location: "Jakarta & Bali",
    description: "Fine dining and casual fusion food, specialized in premium ingredients and modern Indonesian-Western cuisine.",
    avatarUrl: "🍽️",
  },
  {
    id: "sushi_house",
    name: "Sushi House",
    type: "Premium Japanese Restaurant",
    branches: 3,
    location: "Jakarta & Tangerang",
    description: "Authentic premium sushi, sashimi and ramen crafted by traditional sushi chefs with high-grade imported ingredients.",
    avatarUrl: "🍣",
  },
  {
    id: "burger_factory",
    name: "Burger Factory",
    type: "Gourmet Burger Chain",
    branches: 4,
    location: "Jakarta & Yogyakarta",
    description: "Handcrafted gourmet burgers, smash burgers, and house-made milkshakes in a trendy fast-casual atmosphere.",
    avatarUrl: "🍔",
  },
  {
    id: "central_kitchen",
    name: "Central Kitchen Group",
    type: "Cloud Kitchen & Catering",
    branches: 8,
    location: "Jakarta Greater Area",
    description: "Catering, private labels, and multi-brand delivery-only cloud kitchen units running ultra-optimized operations.",
    avatarUrl: "🍳",
  }
];

// Generates daily financial metrics for the last 30 days plus general summary totals
export const getInitialFinancialMetrics = (): FinancialMetric[] => {
  const metrics: FinancialMetric[] = [];
  const today = new Date();

  PRESET_COMPANIES.forEach((c) => {
    // Determine base volumes depending on size
    let baseRevenue = 20000000; // Rp 20M per day default
    let baseMargin = 0.65; // default 65% margin (COGS 35%)
    let baseExpensePercent = 0.45; // default 45% expenses

    if (c.id === "abc_coffee") {
      baseRevenue = 45000000; // Rp 45M daily across 12 branches
      baseMargin = 0.72; // coffee has very high gross margins
      baseExpensePercent = 0.50; // high lease and staff costs
    } else if (c.id === "xyz_restaurant") {
      baseRevenue = 60000000; // Rp 60M daily across 5 branches
      baseMargin = 0.60; // restaurant has food COGS around 40%
      baseExpensePercent = 0.42;
    } else if (c.id === "sushi_house") {
      baseRevenue = 35000000; // Rp 35M daily across 3 branches
      baseMargin = 0.55; // raw seafood import is expensive (COGS 45%)
      baseExpensePercent = 0.35;
    } else if (c.id === "burger_factory") {
      baseRevenue = 28000000; // Rp 28M daily across 4 branches
      baseMargin = 0.65;
      baseExpensePercent = 0.45;
    } else if (c.id === "central_kitchen") {
      baseRevenue = 75000000; // Rp 75M daily across 8 kitchen units
      baseMargin = 0.52; // high volume, lower margin (COGS 48%)
      baseExpensePercent = 0.30; // very low rent and front of house costs
    }

    // Generate 30 days of data
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      // Add slight random fluctuation (-15% to +25%)
      const fluctuation = 0.85 + Math.random() * 0.4;
      // Weekend boost
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const weekendMultiplier = isWeekend ? 1.4 : 1.0;

      const revenue = Math.round(baseRevenue * fluctuation * weekendMultiplier);
      const cogs = Math.round(revenue * (1 - baseMargin));
      const expenses = Math.round((baseRevenue * baseExpensePercent * (0.9 + Math.random() * 0.2)) / (isWeekend ? 0.95 : 1.0));
      const profit = revenue - cogs - expenses;
      const cashFlow = Math.round(profit * (0.85 + Math.random() * 0.3)); // slightly decoupled from accounting profit
      const inventoryValue = Math.round(revenue * 0.4 * (0.95 + Math.random() * 0.1));

      metrics.push({
        id: `${c.id}_metric_${dateStr}`,
        companyId: c.id,
        date: dateStr,
        revenue,
        expenses,
        cogs,
        profit,
        cashFlow,
        inventoryValue,
      });
    }
  });

  return metrics;
};

export const getInitialProducts = (): Product[] => {
  const list: Product[] = [];

  // ABC Coffee
  list.push(
    { id: "abc_p1", companyId: "abc_coffee", name: "Iced Palm Sugar Latte", category: "Coffee", price: 32000, cogs: 8000, stock: 450, minStock: 100, status: "IN_STOCK", salesCount: 3420 },
    { id: "abc_p2", companyId: "abc_coffee", name: "Avocado Espresso Shake", category: "Coffee", price: 42000, cogs: 11000, stock: 320, minStock: 80, status: "IN_STOCK", salesCount: 2150 },
    { id: "abc_p3", companyId: "abc_coffee", name: "Signature Cold Brew", category: "Coffee", price: 38000, cogs: 7000, stock: 15, minStock: 50, status: "LOW_STOCK", salesCount: 1840 },
    { id: "abc_p4", companyId: "abc_coffee", name: "Butter Croissant", category: "Bakery", price: 28000, cogs: 9000, stock: 120, minStock: 40, status: "IN_STOCK", salesCount: 2950 },
    { id: "abc_p5", companyId: "abc_coffee", name: "Chocolate Fudge Muffin", category: "Bakery", price: 30000, cogs: 10000, stock: 0, minStock: 30, status: "OUT_OF_STOCK", salesCount: 1200 },
    { id: "abc_p6", companyId: "abc_coffee", name: "Matcha Sakura Latte", category: "Non-Coffee", price: 36000, cogs: 9500, stock: 140, minStock: 40, status: "IN_STOCK", salesCount: 1480 },
    { id: "abc_p7", companyId: "abc_coffee", name: "Earl Grey Milk Tea", category: "Non-Coffee", price: 34000, cogs: 8000, stock: 8, minStock: 35, status: "LOW_STOCK", salesCount: 890 }
  );

  // XYZ Restaurant
  list.push(
    { id: "xyz_p1", companyId: "xyz_restaurant", name: "Nasi Goreng Wagyu Prime", category: "Main Course", price: 125000, cogs: 45000, stock: 180, minStock: 50, status: "IN_STOCK", salesCount: 1540 },
    { id: "xyz_p2", companyId: "xyz_restaurant", name: "Truffle Butter Tagliatelle", category: "Main Course", price: 145000, cogs: 52000, stock: 110, minStock: 30, status: "IN_STOCK", salesCount: 1210 },
    { id: "xyz_p3", companyId: "xyz_restaurant", name: "Crispy Duck Sambal Matah", category: "Local Special", price: 98000, cogs: 38000, stock: 95, minStock: 25, status: "IN_STOCK", salesCount: 1840 },
    { id: "xyz_p4", companyId: "xyz_restaurant", name: "Pan-Seared Salmon Fillet", category: "Main Course", price: 165000, cogs: 70000, stock: 12, minStock: 35, status: "LOW_STOCK", salesCount: 940 },
    { id: "xyz_p5", companyId: "xyz_restaurant", name: "Wagyu Beef Satay (10 pcs)", category: "Appetizer", price: 85000, cogs: 34000, stock: 150, minStock: 40, status: "IN_STOCK", salesCount: 1620 },
    { id: "xyz_p6", companyId: "xyz_restaurant", name: "Premium Ice Durian Lava", category: "Dessert", price: 55000, cogs: 18000, stock: 0, minStock: 20, status: "OUT_OF_STOCK", salesCount: 450 },
    { id: "xyz_p7", companyId: "xyz_restaurant", name: "Cold Brew Lemongrass Tea", category: "Drinks", price: 28000, cogs: 6000, stock: 300, minStock: 100, status: "IN_STOCK", salesCount: 2200 }
  );

  // Sushi House
  list.push(
    { id: "sushi_p1", companyId: "sushi_house", name: "Premium Salmon Aburi Roll", category: "Sushi Roll", price: 115000, cogs: 48000, stock: 120, minStock: 40, status: "IN_STOCK", salesCount: 2310 },
    { id: "sushi_p2", companyId: "sushi_house", name: "O-Toro Sashimi Platter (5pcs)", category: "Sashimi", price: 320000, cogs: 165000, stock: 15, minStock: 20, status: "LOW_STOCK", salesCount: 420 },
    { id: "sushi_p3", companyId: "sushi_house", name: "Black Garlic Tonkotsu Ramen", category: "Ramen", price: 88000, cogs: 31000, stock: 240, minStock: 60, status: "IN_STOCK", salesCount: 1980 },
    { id: "sushi_p4", companyId: "sushi_house", name: "Spicy Tuna Volcano Roll", category: "Sushi Roll", price: 95000, cogs: 36000, stock: 160, minStock: 40, status: "IN_STOCK", salesCount: 1450 },
    { id: "sushi_p5", companyId: "sushi_house", name: "Wagyu Beef Donburi", category: "Rice Bowl", price: 145000, cogs: 62000, stock: 90, minStock: 30, status: "IN_STOCK", salesCount: 890 },
    { id: "sushi_p6", companyId: "sushi_house", name: "Hokkaido Matcha Softserve", category: "Dessert", price: 42000, cogs: 15000, stock: 0, minStock: 25, status: "OUT_OF_STOCK", salesCount: 740 }
  );

  // Burger Factory
  list.push(
    { id: "burger_p1", companyId: "burger_factory", name: "The Double Smash Royale", category: "Burgers", price: 65000, cogs: 22000, stock: 400, minStock: 100, status: "IN_STOCK", salesCount: 4500 },
    { id: "burger_p2", companyId: "burger_factory", name: "Truffle Mushroom Beef Burger", category: "Burgers", price: 78000, cogs: 29000, stock: 210, minStock: 60, status: "IN_STOCK", salesCount: 2340 },
    { id: "burger_p3", companyId: "burger_factory", name: "Spicy Crispy Chicken Stack", category: "Burgers", price: 58000, cogs: 19000, stock: 14, minStock: 80, status: "LOW_STOCK", salesCount: 3120 },
    { id: "burger_p4", companyId: "burger_factory", name: "Loaded Cheese & Bacon Fries", category: "Sides", price: 38000, cogs: 13000, stock: 350, minStock: 90, status: "IN_STOCK", salesCount: 3890 },
    { id: "burger_p5", companyId: "burger_factory", name: "Salted Caramel Shake", category: "Beverages", price: 35000, cogs: 11000, stock: 180, minStock: 50, status: "IN_STOCK", salesCount: 1940 },
    { id: "burger_p6", companyId: "burger_factory", name: "Onion Rings Double-Basket", category: "Sides", price: 28000, cogs: 8000, stock: 0, minStock: 40, status: "OUT_OF_STOCK", salesCount: 1050 }
  );

  // Central Kitchen Group
  list.push(
    { id: "ck_p1", companyId: "central_kitchen", name: "Catering Meal Prep Box (Chicken)", category: "Meal Prep", price: 45000, cogs: 18000, stock: 1200, minStock: 300, status: "IN_STOCK", salesCount: 12400 },
    { id: "ck_p2", companyId: "central_kitchen", name: "Catering Meal Prep Box (Beef)", category: "Meal Prep", price: 55000, cogs: 24000, stock: 850, minStock: 250, status: "IN_STOCK", salesCount: 9300 },
    { id: "ck_p3", companyId: "central_kitchen", name: "Catering Meal Prep Box (Salmon)", category: "Meal Prep", price: 75000, cogs: 39000, stock: 45, minStock: 150, status: "LOW_STOCK", salesCount: 3400 },
    { id: "ck_p4", companyId: "central_kitchen", name: "Party Catering Tray (10 pax)", category: "Catering", price: 450000, cogs: 210000, stock: 110, minStock: 20, status: "IN_STOCK", salesCount: 1250 },
    { id: "ck_p5", companyId: "central_kitchen", name: "Family Snack Platter (5 pax)", category: "Catering", price: 180000, cogs: 85000, stock: 140, minStock: 30, status: "IN_STOCK", salesCount: 1820 },
    { id: "ck_p6", companyId: "central_kitchen", name: "Vegan Superfood Salad Prep", category: "Meal Prep", price: 42000, cogs: 16000, stock: 0, minStock: 100, status: "OUT_OF_STOCK", salesCount: 2210 }
  );

  return list;
};

export const getInitialPromotions = (): Promotion[] => [
  { id: "promo_abc1", companyId: "abc_coffee", name: "Morning Booster discount 20%", type: "DISCOUNT", discountPercent: 20, startDate: "2026-06-01", endDate: "2026-06-30", status: "ACTIVE", conversionRate: 18.2, revenueGenerated: 142000000 },
  { id: "promo_abc2", companyId: "abc_coffee", name: "Croissant Bundle - Coffee + Croissant Combo", type: "BUNDLE", startDate: "2026-06-05", endDate: "2026-06-25", status: "ACTIVE", conversionRate: 24.5, revenueGenerated: 285000000 },
  { id: "promo_abc3", companyId: "abc_coffee", name: "Weekend Delight Buy 1 Get 1 free", type: "BUY_1_GET_1", startDate: "2026-06-10", endDate: "2026-07-10", status: "ACTIVE", conversionRate: 31.2, revenueGenerated: 340000000 },
  { id: "promo_abc4", companyId: "abc_coffee", name: "Grand Holiday 40% Off Cafe", type: "DISCOUNT", discountPercent: 40, startDate: "2026-07-01", endDate: "2026-07-07", status: "PENDING_APPROVAL", conversionRate: 0, revenueGenerated: 0 },

  { id: "promo_xyz1", companyId: "xyz_restaurant", name: "Wagyu Delight 15% Off", type: "DISCOUNT", discountPercent: 15, startDate: "2026-06-01", endDate: "2026-06-30", status: "ACTIVE", conversionRate: 14.8, revenueGenerated: 189000000 },
  { id: "promo_xyz2", companyId: "xyz_restaurant", name: "Father's Day Special Free Starter", type: "BUY_1_GET_1", startDate: "2026-06-15", endDate: "2026-06-21", status: "COMPLETED", conversionRate: 11.2, revenueGenerated: 94000000 },
  { id: "promo_xyz3", companyId: "xyz_restaurant", name: "Executive Set Lunch Menu", type: "BUNDLE", startDate: "2026-06-15", endDate: "2026-07-15", status: "ACTIVE", conversionRate: 20.3, revenueGenerated: 254000000 },
  { id: "promo_xyz4", companyId: "xyz_restaurant", name: "Mid-Year Festival 30% discount", type: "DISCOUNT", discountPercent: 30, startDate: "2026-07-05", endDate: "2026-07-20", status: "PENDING_APPROVAL", conversionRate: 0, revenueGenerated: 0 },

  { id: "promo_sushi1", companyId: "sushi_house", name: "Sashimi Supreme Day (15% off)", type: "DISCOUNT", discountPercent: 15, startDate: "2026-06-10", endDate: "2026-06-20", status: "COMPLETED", conversionRate: 16.5, revenueGenerated: 112000000 },
  { id: "promo_sushi2", companyId: "sushi_house", name: "Ramen & Ocha Duo Special", type: "BUNDLE", startDate: "2026-06-01", endDate: "2026-06-30", status: "ACTIVE", conversionRate: 22.8, revenueGenerated: 198000000 },

  { id: "promo_burger1", companyId: "burger_factory", name: "Students Smash Burger Combo 10%", type: "DISCOUNT", discountPercent: 10, startDate: "2026-06-01", endDate: "2026-06-30", status: "ACTIVE", conversionRate: 29.4, revenueGenerated: 176000000 },
  { id: "promo_burger2", companyId: "burger_factory", name: "Friday Fries Frenzy free upgrade", type: "BUY_1_GET_1", startDate: "2026-06-01", endDate: "2026-08-31", status: "ACTIVE", conversionRate: 34.1, revenueGenerated: 215000000 },

  { id: "promo_ck1", companyId: "central_kitchen", name: "Corporate Meal-Prep Sub Discount", type: "DISCOUNT", discountPercent: 12, startDate: "2026-06-01", endDate: "2026-06-30", status: "ACTIVE", conversionRate: 15.6, revenueGenerated: 420000000 },
  { id: "promo_ck2", companyId: "central_kitchen", name: "Weekend Catering Box Discount 15%", type: "DISCOUNT", discountPercent: 15, startDate: "2026-06-15", endDate: "2026-07-15", status: "ACTIVE", conversionRate: 19.8, revenueGenerated: 310000000 }
];

export const getInitialBundles = (): Bundle[] => [
  { id: "b_abc1", companyId: "abc_coffee", name: "Latte & Croissant Combo", products: ["Iced Palm Sugar Latte", "Butter Croissant"], bundlePrice: 50000, regularPrice: 60000, salesCount: 840, status: "ACTIVE" },
  { id: "b_abc2", companyId: "abc_coffee", name: "Brew & Muffin Break", products: ["Signature Cold Brew", "Chocolate Fudge Muffin"], bundlePrice: 55000, regularPrice: 68000, salesCount: 310, status: "ACTIVE" },

  { id: "b_xyz1", companyId: "xyz_restaurant", name: "Royal Javanese Feast (2 pax)", products: ["Crispy Duck Sambal Matah", "Wagyu Beef Satay (10 pcs)", "Cold Brew Lemongrass Tea"], bundlePrice: 220000, regularPrice: 239000, salesCount: 420, status: "ACTIVE" },
  { id: "b_xyz2", companyId: "xyz_restaurant", name: "Prime Wagyu & Truffle Dinner", products: ["Nasi Goreng Wagyu Prime", "Truffle Butter Tagliatelle"], bundlePrice: 240000, regularPrice: 270000, salesCount: 180, status: "ACTIVE" },

  { id: "b_sushi1", companyId: "sushi_house", name: "Sumo Ramen Roll Combo", products: ["Black Garlic Tonkotsu Ramen", "Spicy Tuna Volcano Roll"], bundlePrice: 160000, regularPrice: 183000, salesCount: 540, status: "ACTIVE" },

  { id: "b_burger1", companyId: "burger_factory", name: "Double Smash Royale Cheese-Fest", products: ["The Double Smash Royale", "Loaded Cheese & Bacon Fries", "Salted Caramel Shake"], bundlePrice: 120000, regularPrice: 138000, salesCount: 1220, status: "ACTIVE" }
];

export const getInitialForecasts = (): RevenueForecast[] => [
  { id: "fc_abc", companyId: "abc_coffee", targetMonth: "July 2026", forecastedRevenue: 1550000000, confidenceScore: 94, keyDrivers: ["Expansion of 2 new branches in Bandung", "High-margin Signature Cold Brew growth", "Morning Booster promo campaign scaling"] },
  { id: "fc_xyz", companyId: "xyz_restaurant", targetMonth: "July 2026", forecastedRevenue: 1980000000, confidenceScore: 89, keyDrivers: ["Corporate lunch catering contract sign-off", "Mid-Year Festival 30% discount promotion", "Tourists spike in Bali branch"] },
  { id: "fc_sushi", companyId: "sushi_house", targetMonth: "July 2026", forecastedRevenue: 1180000000, confidenceScore: 91, keyDrivers: ["Premium import contract secured at lower yen", "New Bento Box Delivery launching", "Sushi Roll promotion performance"] },
  { id: "fc_burger", companyId: "burger_factory", targetMonth: "July 2026", forecastedRevenue: 950000000, confidenceScore: 93, keyDrivers: ["University re-opening boosts student discount usage", "Truffle Burger seasonal special campaign", "Expanded delivery radius with cloud aggregator"] },
  { id: "fc_ck", companyId: "central_kitchen", targetMonth: "July 2026", forecastedRevenue: 2450000000, confidenceScore: 88, keyDrivers: ["Signing of national school lunch supply deal", "Adding 2 additional cooking line operations", "Scale up of vegetarian box subscription model"] }
];

export const getInitialInsights = (): AiInsight[] => [
  {
    id: "ins_abc_1",
    companyId: "abc_coffee",
    title: "Latte COGS Margin Sweetspot",
    summary: "Coffee category gross margins have reached an all-time high of 72%. Iced Palm Sugar Latte remains the cash cow.",
    details: "Your current pricing of Rp 32,000 for Iced Palm Sugar Latte with Rp 8,000 COGS generates outstanding cash flow. However, dairy price hikes are forecasted next month. Securing bulk contracts now will save an estimated Rp 14,000,000 in July.",
    recommendations: ["Pre-order and secure dairy raw contracts for Q3", "Run targeted promo bundle on Signature Cold Brew and Croissant Combo to drive cross-sell"],
    type: "SUCCESS",
    date: "2026-06-24",
  },
  {
    id: "ins_abc_2",
    companyId: "abc_coffee",
    title: "Critical Low Stock Alert",
    summary: "Signature Cold Brew stock is down to 15 bottles. Daily run-rate requires at least 45 bottles.",
    details: "We have detected consecutive low-stock states over the past 3 days for Signature Cold Brew across 4 prime Jakarta branches. This has caused a potential revenue leakage of Rp 5,400,000.",
    recommendations: ["Approve immediate stock replenishment order", "Review brewing capacity in central roasting facility"],
    type: "ALERT",
    date: "2026-06-23",
  },

  {
    id: "ins_xyz_1",
    companyId: "xyz_restaurant",
    title: "Menu Engineering Opportunity",
    summary: "Nasi Goreng Wagyu Prime generates 40% of Main Course profits, but Duck Sambal Matah volume is dropping.",
    details: "Analyzing 30 days of sales indicates Wagyu Fried Rice has an incredible 64% margin with high volume. Crispy Duck Sambal Matah is premium but ingredient costs spiked by 12% in Bali, shrinking margins to 55%.",
    recommendations: ["Promote Wagyu Fried Rice via the Executive Set Lunch Menu", "Renegotiate duck poultry supply agreements or adjust local Bali pricing slightly"],
    type: "INFO",
    date: "2026-06-24",
  },
  {
    id: "ins_xyz_2",
    companyId: "xyz_restaurant",
    title: "Dessert Raw Material Out of Stock",
    summary: "Premium Ice Durian Lava ingredients are fully depleted.",
    details: "This high-ticket dessert item (Rp 55,000) has been offline for 4 days due to supply chain delays from our primary Sumatran durian distributor.",
    recommendations: ["Re-route supply from backup Tangerang warehouse", "Set up immediate automated notification when raw durian levels fall below 15 kg"],
    type: "ALERT",
    date: "2026-06-22",
  }
];

export const getInitialEvents = (): Event[] => [
  { id: "evt_1", companyId: "abc_coffee", title: "National Coffee Day Promotion", description: "All-day store discount and media coverage event.", date: "2026-07-05", type: "PROMOTION" },
  { id: "evt_2", companyId: "abc_coffee", title: "Eid Holiday Week", description: "Holiday staffing schedules and high shopping mall foot traffic.", date: "2026-06-28", type: "HOLIDAY" },
  { id: "evt_3", companyId: "xyz_restaurant", title: "Gastro Summit Jakarta", description: "We are catering the VIP lounge at Jakarta Expo.", date: "2026-07-12", type: "PROMOTION" },
  { id: "evt_4", companyId: "xyz_restaurant", title: "Sumatran Durian Shipment Delay", description: "Port delays affecting exotic fruit supply.", date: "2026-06-20", type: "SUPPLY_DELAY" }
];

export const getInitialExpenses = (): Expense[] => [
  { id: "exp_abc_1", companyId: "abc_coffee", category: "Salaries", amount: 145000000, date: "2026-06-20", description: "Baristas and cafe supervisor payroll" },
  { id: "exp_abc_2", companyId: "abc_coffee", category: "Rent", amount: 85000000, date: "2026-06-01", description: "Sudirman Mall Branch monthly leasing" },
  { id: "exp_abc_3", companyId: "abc_coffee", category: "Ingredients", amount: 110000000, date: "2026-06-15", description: "Coffee bean wholesale bulk order (500kg arabica)" },
  { id: "exp_abc_4", companyId: "abc_coffee", category: "Utilities", amount: 24000000, date: "2026-06-18", description: "Electricity, water, high-speed internet" },

  { id: "exp_xyz_1", companyId: "xyz_restaurant", category: "Salaries", amount: 180000000, date: "2026-06-20", description: "Kitchen crew, chef de cuisine, and service staff payroll" },
  { id: "exp_xyz_2", companyId: "xyz_restaurant", category: "Rent", amount: 120000000, date: "2026-06-01", description: "Senopati high street branch lease" },
  { id: "exp_xyz_3", companyId: "xyz_restaurant", category: "Ingredients", amount: 240000000, date: "2026-06-12", description: "Wagyu beef strip loin, salmon fillets, and imported oils" }
];

export const getInitialNotifications = (): Notification[] => [
  { id: "not_1", companyId: "abc_coffee", title: "Low Stock Alert", message: "Signature Cold Brew stock is critically low (15 bottles left).", type: "ALERT", read: false, date: "2026-06-24" },
  { id: "not_2", companyId: "abc_coffee", title: "Promotion Requested", message: "Manager submitted Grand Holiday 40% Off promotion for review.", type: "INFO", read: false, date: "2026-06-23" },
  { id: "not_3", companyId: "xyz_restaurant", title: "Out of Stock", message: "Ice Durian Lava is out of stock.", type: "ALERT", read: false, date: "2026-06-24" },
  { id: "not_4", companyId: "xyz_restaurant", title: "New Sale Registered", message: "Wagyu Party Catering order of Rp 12.500.000 completed.", type: "SUCCESS", read: true, date: "2026-06-23" }
];

export const getInitialInventoryLogs = () => [
  { id: "inv_log_1", companyId: "abc_coffee", productId: "abc_p3", productName: "Signature Cold Brew", type: "IN" as const, quantity: 150, date: "2026-06-24", notes: "Brewing replenishment batch requested by supervisor", approvedBy: "", status: "PENDING_APPROVAL" as const },
  { id: "inv_log_2", companyId: "abc_coffee", productId: "abc_p5", productName: "Chocolate Fudge Muffin", type: "IN" as const, quantity: 100, date: "2026-06-23", notes: "Reorder from central bakery supplier", approvedBy: "", status: "PENDING_APPROVAL" as const },
  { id: "inv_log_3", companyId: "abc_coffee", productId: "abc_p1", productName: "Iced Palm Sugar Latte", type: "OUT" as const, quantity: 120, date: "2026-06-23", notes: "Daily checkout sales depletion", approvedBy: "System", status: "COMPLETED" as const },

  { id: "inv_log_4", companyId: "xyz_restaurant", productId: "xyz_p6", productName: "Premium Ice Durian Lava", type: "IN" as const, quantity: 80, date: "2026-06-24", notes: "Emergency local durian supplier procurement", approvedBy: "", status: "PENDING_APPROVAL" as const },
  { id: "inv_log_5", companyId: "xyz_restaurant", productId: "xyz_p4", productName: "Pan-Seared Salmon Fillet", type: "IN" as const, quantity: 40, date: "2026-06-24", notes: "Replenish fresh salmon imported from Norway", approvedBy: "", status: "PENDING_APPROVAL" as const }
];

// No fabricated numbers here on purpose: every real answer now comes from the backend's
// grounded /chat endpoint (statistical/rule-based, reads live DB data). A canned greeting
// with invented stats would be exactly the kind of hallucination this system is meant to avoid.
export const getInitialChatbotLogs = (): ChatbotLog[] => [
  { id: "chat_init_abc", companyId: "abc_coffee", sender: "AI", message: "Hi! I'm your AIBISPRO AI Advisor. Ask me about real stock levels, sales, forecasts, promotions, or product recommendations — every answer is computed live from your actual data.", timestamp: "2026-06-24T06:00:00Z" },
  { id: "chat_init_xyz", companyId: "xyz_restaurant", sender: "AI", message: "Hi! I'm your AIBISPRO AI Advisor. Ask me about real stock levels, sales, forecasts, promotions, or product recommendations — every answer is computed live from your actual data.", timestamp: "2026-06-24T06:00:00Z" },
  { id: "chat_init_sushi", companyId: "sushi_house", sender: "AI", message: "Hi! I'm your AIBISPRO AI Advisor. Ask me about real stock levels, sales, forecasts, promotions, or product recommendations — every answer is computed live from your actual data.", timestamp: "2026-06-24T06:00:00Z" },
  { id: "chat_init_burger", companyId: "burger_factory", sender: "AI", message: "Hi! I'm your AIBISPRO AI Advisor. Ask me about real stock levels, sales, forecasts, promotions, or product recommendations — every answer is computed live from your actual data.", timestamp: "2026-06-24T06:00:00Z" },
  { id: "chat_init_ck", companyId: "central_kitchen", sender: "AI", message: "Hi! I'm your AIBISPRO AI Advisor. Ask me about real stock levels, sales, forecasts, promotions, or product recommendations — every answer is computed live from your actual data.", timestamp: "2026-06-24T06:00:00Z" }
];

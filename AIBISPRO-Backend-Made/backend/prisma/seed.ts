import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ---------- helpers ----------
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

type SizeDef = { size_name: string; selling_price: number; cost_price: number; current_stock: number; minimum_stock: number };
type ProductDef = { name: string; category: string; description: string; sizes: SizeDef[]; tier: 'top' | 'slow' | 'normal' };

type CompanyDef = {
  key: string;
  name: string;
  type: string;
  branches: number;
  location: string;
  description: string;
  avatar_emoji: string;
  paymentMethods: string[];
  products: ProductDef[];
};

const COMPANIES: CompanyDef[] = [
  {
    key: 'abc_coffee',
    name: 'ABC Coffee',
    type: 'Coffee Chain',
    branches: 12,
    location: 'Jakarta, Bandung & Surabaya',
    description: 'Premium arabica coffee roasters and cozy lifestyle cafes catering to students and professionals.',
    avatar_emoji: '☕',
    paymentMethods: ['cash', 'card', 'e-wallet'],
    products: [
      { name: 'Espresso', category: 'Coffee', description: 'Concentrated shot of rich espresso.', tier: 'top', sizes: [{ size_name: 'R', selling_price: 18000, cost_price: 7000, current_stock: 60, minimum_stock: 15 }, { size_name: 'L', selling_price: 23000, cost_price: 9000, current_stock: 55, minimum_stock: 15 }] },
      { name: 'Americano', category: 'Coffee', description: 'Espresso diluted with hot water.', tier: 'normal', sizes: [{ size_name: 'R', selling_price: 18000, cost_price: 7000, current_stock: 45, minimum_stock: 15 }, { size_name: 'L', selling_price: 23000, cost_price: 9000, current_stock: 40, minimum_stock: 15 }] },
      { name: 'Cappuccino', category: 'Coffee', description: 'Espresso with steamed milk foam.', tier: 'top', sizes: [{ size_name: 'R', selling_price: 22000, cost_price: 9000, current_stock: 70, minimum_stock: 15 }, { size_name: 'L', selling_price: 27000, cost_price: 11000, current_stock: 65, minimum_stock: 15 }] },
      { name: 'Latte', category: 'Coffee', description: 'Espresso with steamed milk.', tier: 'top', sizes: [{ size_name: 'R', selling_price: 22000, cost_price: 9000, current_stock: 65, minimum_stock: 15 }, { size_name: 'L', selling_price: 27000, cost_price: 11000, current_stock: 60, minimum_stock: 15 }] },
      { name: 'Caramel Macchiato', category: 'Coffee', description: 'Espresso with vanilla, milk, and caramel drizzle.', tier: 'normal', sizes: [{ size_name: 'R', selling_price: 27000, cost_price: 11000, current_stock: 8, minimum_stock: 15 }, { size_name: 'L', selling_price: 32000, cost_price: 13000, current_stock: 30, minimum_stock: 15 }] },
      { name: 'Matcha Latte', category: 'Non-Coffee', description: 'Japanese matcha with steamed milk.', tier: 'normal', sizes: [{ size_name: 'R', selling_price: 24000, cost_price: 10000, current_stock: 35, minimum_stock: 12 }] },
      { name: 'Milk Tea', category: 'Non-Coffee', description: 'Classic milk tea, brewed fresh daily.', tier: 'normal', sizes: [{ size_name: 'R', selling_price: 20000, cost_price: 8000, current_stock: 45, minimum_stock: 12 }, { size_name: 'L', selling_price: 25000, cost_price: 10000, current_stock: 400, minimum_stock: 12 }] },
      { name: 'Croissant', category: 'Pastry', description: 'Buttery, flaky French pastry.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 15000, cost_price: 6000, current_stock: 5, minimum_stock: 20 }] },
      { name: 'Cinnamon Roll', category: 'Pastry', description: 'Warm roll with cinnamon glaze.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 18000, cost_price: 7500, current_stock: 10, minimum_stock: 15 }] },
      { name: 'Potato Chips', category: 'Snacks', description: 'Crispy salted potato chips.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 12000, cost_price: 5000, current_stock: 350, minimum_stock: 20 }] },
      { name: 'Tumbler', category: 'Merchandise', description: 'Branded insulated tumbler.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 85000, cost_price: 40000, current_stock: 9, minimum_stock: 10 }] },
    ],
  },
  {
    key: 'xyz_restaurant',
    name: 'XYZ Restaurant',
    type: 'Restaurant Group',
    branches: 5,
    location: 'Jakarta & Bali',
    description: 'Fine dining and casual fusion food, specialized in premium ingredients and modern Indonesian-Western cuisine.',
    avatar_emoji: '🍽️',
    paymentMethods: ['cash', 'card', 'qris'],
    products: [
      { name: 'Nasi Goreng Wagyu Prime', category: 'Main Course', description: 'Signature fried rice with premium wagyu slices.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 85000, cost_price: 38000, current_stock: 40, minimum_stock: 10 }] },
      { name: 'Truffle Butter Tagliatelle', category: 'Main Course', description: 'Handmade pasta with black truffle butter sauce.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 95000, cost_price: 42000, current_stock: 30, minimum_stock: 10 }] },
      { name: 'Crispy Duck Sambal Matah', category: 'Main Course', description: 'Crispy duck with Balinese chili relish.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 110000, cost_price: 50000, current_stock: 20, minimum_stock: 8 }] },
      { name: 'Wagyu Beef Satay (10pcs)', category: 'Appetizer', description: 'Grilled wagyu skewers with peanut sauce.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 75000, cost_price: 34000, current_stock: 6, minimum_stock: 12 }] },
      { name: 'Caesar Salad', category: 'Appetizer', description: 'Classic Caesar salad with parmesan crisps.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 45000, cost_price: 18000, current_stock: 60, minimum_stock: 10 }] },
      { name: 'Grilled Salmon', category: 'Main Course', description: 'Norwegian salmon with lemon butter sauce.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 98000, cost_price: 46000, current_stock: 25, minimum_stock: 8 }] },
      { name: 'Cold Brew Lemongrass Tea', category: 'Beverage', description: 'House cold brew infused with lemongrass.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 28000, cost_price: 9000, current_stock: 50, minimum_stock: 15 }] },
      { name: 'Iced Lemon Tea', category: 'Beverage', description: 'Refreshing iced lemon tea.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 22000, cost_price: 7000, current_stock: 55, minimum_stock: 15 }] },
      { name: 'Chocolate Lava Cake', category: 'Dessert', description: 'Warm molten chocolate cake with vanilla ice cream.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 42000, cost_price: 16000, current_stock: 7, minimum_stock: 12 }] },
      { name: 'Tiramisu', category: 'Dessert', description: 'Classic Italian coffee-flavored dessert.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 38000, cost_price: 15000, current_stock: 200, minimum_stock: 10 }] },
    ],
  },
  {
    key: 'sushi_house',
    name: 'Sushi House',
    type: 'Premium Japanese Restaurant',
    branches: 3,
    location: 'Jakarta & Tangerang',
    description: 'Authentic premium sushi, sashimi and ramen crafted by traditional sushi chefs with high-grade imported ingredients.',
    avatar_emoji: '🍣',
    paymentMethods: ['cash', 'card', 'qris'],
    products: [
      { name: 'Salmon Nigiri (2pcs)', category: 'Sushi', description: 'Fresh salmon over seasoned rice.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 38000, cost_price: 18000, current_stock: 45, minimum_stock: 15 }] },
      { name: 'Tuna Sashimi (5pcs)', category: 'Sashimi', description: 'Premium bluefin tuna slices.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 65000, cost_price: 32000, current_stock: 6, minimum_stock: 12 }] },
      { name: 'California Roll', category: 'Sushi', description: 'Crab, avocado, and cucumber roll.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 48000, cost_price: 20000, current_stock: 40, minimum_stock: 15 }] },
      { name: 'Dragon Roll', category: 'Sushi', description: 'Eel and avocado specialty roll.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 62000, cost_price: 28000, current_stock: 25, minimum_stock: 10 }] },
      { name: 'Chicken Katsu Curry', category: 'Ramen', description: 'Crispy chicken cutlet with Japanese curry rice.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 58000, cost_price: 26000, current_stock: 30, minimum_stock: 10 }] },
      { name: 'Ramen Tonkotsu', category: 'Ramen', description: 'Rich pork bone broth ramen.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 65000, cost_price: 29000, current_stock: 9, minimum_stock: 12 }] },
      { name: 'Miso Soup', category: 'Appetizer', description: 'Traditional soybean paste soup.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 18000, cost_price: 6000, current_stock: 60, minimum_stock: 15 }] },
      { name: 'Edamame', category: 'Appetizer', description: 'Steamed and salted soybeans.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 22000, cost_price: 8000, current_stock: 150, minimum_stock: 15 }] },
      { name: 'Green Tea', category: 'Beverage', description: 'Traditional hot or iced green tea.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 15000, cost_price: 5000, current_stock: 50, minimum_stock: 15 }] },
      { name: 'Mochi Ice Cream (3pcs)', category: 'Dessert', description: 'Assorted mochi ice cream.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 32000, cost_price: 13000, current_stock: 10, minimum_stock: 12 }] },
    ],
  },
  {
    key: 'burger_factory',
    name: 'Burger Factory',
    type: 'Gourmet Burger Chain',
    branches: 4,
    location: 'Jakarta & Yogyakarta',
    description: 'Handcrafted gourmet burgers, smash burgers, and house-made milkshakes in a trendy fast-casual atmosphere.',
    avatar_emoji: '🍔',
    paymentMethods: ['cash', 'card', 'e-wallet'],
    products: [
      { name: 'Classic Smash Burger', category: 'Burger', description: 'Double smashed beef patty with classic toppings.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 45000, cost_price: 20000, current_stock: 55, minimum_stock: 15 }] },
      { name: 'Truffle Cheese Burger', category: 'Burger', description: 'Smash burger with truffle mayo and aged cheddar.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 58000, cost_price: 26000, current_stock: 8, minimum_stock: 15 }] },
      { name: 'BBQ Bacon Burger', category: 'Burger', description: 'Smoky BBQ sauce with crispy bacon.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 52000, cost_price: 24000, current_stock: 35, minimum_stock: 15 }] },
      { name: 'Crispy Chicken Burger', category: 'Burger', description: 'Crispy fried chicken thigh with spicy mayo.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 42000, cost_price: 19000, current_stock: 40, minimum_stock: 15 }] },
      { name: 'Sweet Potato Fries', category: 'Side', description: 'Crispy sweet potato fries.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 22000, cost_price: 9000, current_stock: 45, minimum_stock: 12 }] },
      { name: 'Regular Fries', category: 'Side', description: 'Classic salted fries.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 18000, cost_price: 7000, current_stock: 200, minimum_stock: 12 }] },
      { name: 'Onion Rings', category: 'Side', description: 'Crispy beer-battered onion rings.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 20000, cost_price: 8000, current_stock: 9, minimum_stock: 12 }] },
      { name: 'Chocolate Milkshake', category: 'Beverage', description: 'Thick house-made chocolate milkshake.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 32000, cost_price: 14000, current_stock: 30, minimum_stock: 10 }] },
      { name: 'Vanilla Milkshake', category: 'Beverage', description: 'Classic vanilla bean milkshake.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 30000, cost_price: 13000, current_stock: 150, minimum_stock: 10 }] },
      { name: 'Cola', category: 'Beverage', description: 'Ice-cold cola.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 12000, cost_price: 4000, current_stock: 100, minimum_stock: 15 }] },
    ],
  },
  {
    key: 'central_kitchen',
    name: 'Central Kitchen Group',
    type: 'Cloud Kitchen & Catering',
    branches: 8,
    location: 'Jakarta Greater Area',
    description: 'Catering, private labels, and multi-brand delivery-only cloud kitchen units running ultra-optimized operations.',
    avatar_emoji: '🍳',
    paymentMethods: ['card', 'bank-transfer', 'qris'],
    products: [
      { name: 'Catering Package A (20pax)', category: 'Catering', description: 'Standard corporate catering package.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 1200000, cost_price: 650000, current_stock: 20, minimum_stock: 5 }] },
      { name: 'Catering Package B (50pax)', category: 'Catering', description: 'Large event catering package.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 2800000, cost_price: 1500000, current_stock: 3, minimum_stock: 5 }] },
      { name: 'Bulk Fried Rice Tray', category: 'Bulk Order', description: 'Large tray of fried rice, serves 15.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 250000, cost_price: 110000, current_stock: 30, minimum_stock: 8 }] },
      { name: 'Bulk Chicken Box', category: 'Bulk Order', description: 'Bulk fried chicken box, 30 pieces.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 320000, cost_price: 150000, current_stock: 25, minimum_stock: 8 }] },
      { name: 'Private Label Sauce 1L', category: 'Private Label', description: 'White-label sauce for partner brands.', tier: 'slow', sizes: [{ size_name: 'Regular', selling_price: 45000, cost_price: 18000, current_stock: 200, minimum_stock: 20 }] },
      { name: 'Frozen Meatball Pack', category: 'Private Label', description: 'Frozen meatball pack, 1kg.', tier: 'normal', sizes: [{ size_name: 'Regular', selling_price: 65000, cost_price: 30000, current_stock: 9, minimum_stock: 20 }] },
      { name: 'Snack Box Corporate', category: 'Snack Box', description: 'Corporate meeting snack box.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 85000, cost_price: 38000, current_stock: 7, minimum_stock: 15 }] },
      { name: 'Rice Box Set', category: 'Snack Box', description: 'Individual rice box set for events.', tier: 'top', sizes: [{ size_name: 'Regular', selling_price: 35000, cost_price: 16000, current_stock: 50, minimum_stock: 20 }] },
    ],
  },
];

async function seedCompanySales(companyId: number, products: ProductDef[], paymentMethods: string[]) {
  type FlatSize = { id: number; product_id: number; productName: string; size_name: string; selling_price: number; weight: number };
  const flatSizes: FlatSize[] = [];

  for (const def of products) {
    // find-or-create category (no unique constraint on name+company)
    let cat = await prisma.categories.findFirst({ where: { name: def.category, company_id: companyId } });
    if (!cat) cat = await prisma.categories.create({ data: { name: def.category, company_id: companyId } });

    const product = await prisma.products.create({
      data: { name: def.name, description: def.description, category_id: cat.id, company_id: companyId, is_active: true },
    });

    for (const s of def.sizes) {
      const ps = await prisma.product_sizes.create({
        data: { product_id: product.id, size_name: s.size_name, selling_price: s.selling_price, cost_price: s.cost_price, current_stock: s.current_stock, minimum_stock: s.minimum_stock },
      });
      let weight = 1;
      if (def.tier === 'top') weight = 5;
      else if (def.tier === 'slow') weight = 0.4;
      flatSizes.push({ id: ps.id, product_id: product.id, productName: def.name, size_name: s.size_name, selling_price: s.selling_price, weight });
    }
  }

  const TOTAL_DAYS = 90;
  let totalSalesCreated = 0;

  for (let dayOffset = 0; dayOffset < TOTAL_DAYS; dayOffset++) {
    const dayDate = daysAgo(TOTAL_DAYS - 1 - dayOffset);
    const progress = dayOffset / (TOTAL_DAYS - 1);
    const dayOfWeek = dayDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let baseCount = 4 + Math.round(progress * 14);
    if (isWeekend) baseCount = Math.round(baseCount * 1.4);
    const transactionCount = Math.min(25, Math.max(3, baseCount));

    for (let t = 0; t < transactionCount; t++) {
      const hour = randInt(7, 21);
      const minute = randInt(0, 59);
      const transactionDate = new Date(dayDate);
      transactionDate.setHours(hour, minute, randInt(0, 59), 0);

      const itemsCount = randInt(1, 3);
      const chosenSizes: FlatSize[] = [];
      const usedIds = new Set<number>();
      for (let i = 0; i < itemsCount; i++) {
        let attempt = 0;
        let candidate = weightedPick(flatSizes);
        while (usedIds.has(candidate.id) && attempt < 5) {
          candidate = weightedPick(flatSizes);
          attempt++;
        }
        if (!usedIds.has(candidate.id)) {
          usedIds.add(candidate.id);
          chosenSizes.push(candidate);
        }
      }

      const itemsToCreate = chosenSizes.map((size) => {
        let qty = randInt(1, 3);
        qty = Math.max(1, Math.round(qty * (0.8 + progress * 0.4)));
        const subtotal = size.selling_price * qty;
        return { product_id: size.product_id, product_size_id: size.id, quantity: qty, unit_price: size.selling_price, subtotal };
      });

      const totalAmount = itemsToCreate.reduce((s, i) => s + i.subtotal, 0);
      const totalItems = itemsToCreate.reduce((s, i) => s + i.quantity, 0);

      const sale = await prisma.sales.create({
        data: { transaction_date: transactionDate, total_amount: totalAmount, payment_method: pick(paymentMethods), total_items: totalItems, source: 'pos', company_id: companyId },
      });

      await prisma.sale_items.createMany({
        data: itemsToCreate.map((i) => ({ sale_id: sale.id, product_id: i.product_id, product_size_id: i.product_size_id, quantity: i.quantity, unit_price: i.unit_price, subtotal: i.subtotal })),
      });

      totalSalesCreated += 1;
    }
  }

  return totalSalesCreated;
}

async function main() {
  console.log('Cleaning existing data...');
  await prisma.ai_insights.deleteMany();
  await prisma.chatbot_logs.deleteMany();
  await prisma.datasets.deleteMany();
  await prisma.approval_requests.deleteMany();
  await prisma.revenue_forecasts.deleteMany();
  await prisma.sale_items.deleteMany();
  await prisma.sales.deleteMany();
  await prisma.inventory_logs.deleteMany();
  await prisma.bundles.deleteMany();
  await prisma.promotions.deleteMany();
  await prisma.product_sizes.deleteMany();
  await prisma.products.deleteMany();
  await prisma.categories.deleteMany();
  await prisma.events.deleteMany();
  await prisma.user_company_access.deleteMany();
  await prisma.users.deleteMany();
  await prisma.companies.deleteMany();

  console.log('Seeding companies...');
  const companyRows: Record<string, { id: number }> = {};
  for (const c of COMPANIES) {
    const row = await prisma.companies.create({
      data: {
        name: c.name,
        type: c.type,
        branches: c.branches,
        location: c.location,
        description: c.description,
        avatar_emoji: c.avatar_emoji,
        partnership_status: 'active',
      },
    });
    companyRows[c.key] = { id: row.id };
  }

  console.log('Seeding users...');
  const seedPassword = process.env.SEED_USER_PASSWORD;
  if (!seedPassword) {
    throw new Error('Set SEED_USER_PASSWORD in AIBISPRO-Backend-Made/.env before seeding');
  }
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const maintainance = await prisma.users.create({ data: { name: 'Maintenance Admin', email: 'maintainance@aibispro.com', password: passwordHash, role: 'MAINTAINANCE' } });
  const owner = await prisma.users.create({ data: { name: 'Business Owner', email: 'owner@aibispro.com', password: passwordHash, role: 'OWNER' } });
  const manager = await prisma.users.create({ data: { name: 'Store Manager', email: 'manager@aibispro.com', password: passwordHash, role: 'MANAGER' } });
  const customer = await prisma.users.create({ data: { name: 'Guest Customer', email: 'customer@aibispro.com', password: passwordHash, role: 'CUSTOMER' } });

  // MAINTAINANCE grants Owner access to 3 of the 5 companies (abc_coffee, xyz_restaurant, sushi_house)
  const ownerCompanies = ['abc_coffee', 'xyz_restaurant', 'sushi_house'];
  for (const key of ownerCompanies) {
    await prisma.user_company_access.create({ data: { user_id: owner.id, company_id: companyRows[key].id, granted_by: maintainance.id } });
  }
  // Owner grants Manager a subset of their own companies (abc_coffee, xyz_restaurant)
  const managerCompanies = ['abc_coffee', 'xyz_restaurant'];
  for (const key of managerCompanies) {
    await prisma.user_company_access.create({ data: { user_id: manager.id, company_id: companyRows[key].id, granted_by: owner.id } });
  }
  // burger_factory and central_kitchen stay unassigned for now (demonstrates partnership curation)

  console.log('Seeding per-company catalogs, promotions, bundles, events, and 90 days of sales...');
  for (const c of COMPANIES) {
    const companyId = companyRows[c.key].id;
    console.log(`  -> ${c.name}`);

    const salesCreated = await seedCompanySales(companyId, c.products, c.paymentMethods);

    await prisma.promotions.create({
      data: {
        title: `${c.name} Loyalty Discount`,
        description: `Seasonal discount campaign for ${c.name}.`,
        discount_percent: randInt(10, 25),
        start_date: daysAgo(10),
        end_date: daysAgo(-15),
        status: 'active',
        created_by: manager.id,
        approved_by: owner.id,
        company_id: companyId,
      },
    });
    await prisma.promotions.create({
      data: {
        title: `${c.name} Weekend Special`,
        description: `Upcoming weekend promotional bundle for ${c.name}.`,
        discount_percent: randInt(10, 20),
        start_date: daysAgo(-5),
        end_date: daysAgo(-20),
        status: 'pending',
        created_by: manager.id,
        approved_by: null,
        company_id: companyId,
      },
    });

    await prisma.bundles.create({
      data: {
        name: `${c.name} Combo Deal`,
        description: `Popular combo bundle for ${c.name}.`,
        bundle_price: 45000,
        status: 'active',
        created_by: manager.id,
        approved_by: owner.id,
        company_id: companyId,
      },
    });

    await prisma.events.create({
      data: {
        name: `${c.name} Anniversary Sale`,
        event_type: 'promo',
        event_date: daysAgo(28),
        start_date: daysAgo(30),
        end_date: daysAgo(25),
        impact_score: 4,
        company_id: companyId,
      },
    });

    console.log(`     ${salesCreated} sales created`);
  }

  console.log('Seed complete.');
  console.log('--- Login accounts (password for all: SEED_USER_PASSWORD from .env) ---');
  console.log(`MAINTAINANCE: ${maintainance.email} (sees all 5 companies)`);
  console.log(`OWNER:        ${owner.email} (ABC Coffee, XYZ Restaurant, Sushi House)`);
  console.log(`MANAGER:      ${manager.email} (ABC Coffee, XYZ Restaurant)`);
  console.log(`CUSTOMER:     ${customer.email} (guest browsing, no chatbot)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Demo data for immediate UI rendering (no DB required for visual demo)

export const DEMO_CATEGORIES = [
  { id: "cat-1", name: "🍔 Burgers", icon: "🍔", sortOrder: 1 },
  { id: "cat-2", name: "🍕 Pizza", icon: "🍕", sortOrder: 2 },
  { id: "cat-3", name: "🥗 Salads", icon: "🥗", sortOrder: 3 },
  { id: "cat-4", name: "🍗 Chicken", icon: "🍗", sortOrder: 4 },
  { id: "cat-5", name: "🍜 Pasta", icon: "🍜", sortOrder: 5 },
  { id: "cat-6", name: "🥤 Drinks", icon: "🥤", sortOrder: 6 },
  { id: "cat-7", name: "🍰 Desserts", icon: "🍰", sortOrder: 7 },
  { id: "cat-8", name: "🥘 BBQ", icon: "🥘", sortOrder: 8 },
];

export const DEMO_MENU_ITEMS = [
  // Burgers
  { id: "item-1", name: "Classic Burger", price: 550, categoryId: "cat-1", isAvailable: true, description: "Juicy beef patty with lettuce, tomato & cheese" },
  { id: "item-2", name: "Double Smash Burger", price: 850, categoryId: "cat-1", isAvailable: true, description: "Two smashed beef patties with special sauce" },
  { id: "item-3", name: "Chicken Zinger Burger", price: 650, categoryId: "cat-1", isAvailable: true, description: "Crispy fried chicken with mayo & coleslaw" },
  { id: "item-4", name: "Mushroom Swiss Burger", price: 750, categoryId: "cat-1", isAvailable: false, description: "Beef patty topped with mushrooms & Swiss cheese" },
  // Pizza
  { id: "item-5", name: "Margherita Pizza", price: 950, categoryId: "cat-2", isAvailable: true, description: "Fresh mozzarella, tomato, basil" },
  { id: "item-6", name: "Pepperoni Pizza", price: 1150, categoryId: "cat-2", isAvailable: true, description: "Loaded with pepperoni & mozzarella" },
  { id: "item-7", name: "BBQ Chicken Pizza", price: 1250, categoryId: "cat-2", isAvailable: true, description: "Grilled chicken, onions, BBQ sauce" },
  { id: "item-8", name: "Veggie Supreme", price: 1050, categoryId: "cat-2", isAvailable: true, description: "Bell peppers, olives, onions, mushrooms" },
  // Salads
  { id: "item-9", name: "Caesar Salad", price: 450, categoryId: "cat-3", isAvailable: true, description: "Romaine lettuce, parmesan, croutons" },
  { id: "item-10", name: "Greek Salad", price: 500, categoryId: "cat-3", isAvailable: true, description: "Feta cheese, olives, cucumber, tomato" },
  // Chicken
  { id: "item-11", name: "Fried Chicken (3pc)", price: 650, categoryId: "cat-4", isAvailable: true, description: "Crispy fried chicken pieces" },
  { id: "item-12", name: "Grilled Chicken Platter", price: 950, categoryId: "cat-4", isAvailable: true, description: "Grilled chicken with rice & salad" },
  { id: "item-13", name: "Chicken Wings (6pc)", price: 550, categoryId: "cat-4", isAvailable: true, description: "Spicy buffalo wings" },
  { id: "item-14", name: "Chicken Tikka", price: 850, categoryId: "cat-4", isAvailable: true, description: "Marinated grilled chicken tikka" },
  // Pasta
  { id: "item-15", name: "Spaghetti Bolognese", price: 750, categoryId: "cat-5", isAvailable: true, description: "Classic meat sauce pasta" },
  { id: "item-16", name: "Alfredo Pasta", price: 800, categoryId: "cat-5", isAvailable: true, description: "Creamy white sauce with chicken" },
  { id: "item-17", name: "Penne Arrabiata", price: 700, categoryId: "cat-5", isAvailable: true, description: "Spicy tomato sauce penne" },
  // Drinks
  { id: "item-18", name: "Fresh Lime Soda", price: 200, categoryId: "cat-6", isAvailable: true, description: "Refreshing lime with soda" },
  { id: "item-19", name: "Mango Shake", price: 350, categoryId: "cat-6", isAvailable: true, description: "Fresh mango milkshake" },
  { id: "item-20", name: "Iced Coffee", price: 400, categoryId: "cat-6", isAvailable: true, description: "Cold brewed coffee with cream" },
  { id: "item-21", name: "Mineral Water", price: 100, categoryId: "cat-6", isAvailable: true, description: "500ml bottled water" },
  // Desserts
  { id: "item-22", name: "Chocolate Brownie", price: 350, categoryId: "cat-7", isAvailable: true, description: "Warm brownie with ice cream" },
  { id: "item-23", name: "Cheesecake", price: 450, categoryId: "cat-7", isAvailable: true, description: "New York style cheesecake" },
  // BBQ
  { id: "item-24", name: "BBQ Platter (2 Person)", price: 2500, categoryId: "cat-8", isAvailable: true, description: "Seekh kebab, chicken tikka, ribs, naan" },
  { id: "item-25", name: "Seekh Kebab (6pc)", price: 750, categoryId: "cat-8", isAvailable: true, description: "Spiced minced meat kebabs" },
];

export const DEMO_TABLES = [
  { id: "tbl-1", name: "T1", capacity: 2, status: "FREE" as const, floor: "Family Hall" },
  { id: "tbl-2", name: "T2", capacity: 2, status: "OCCUPIED" as const, floor: "Family Hall" },
  { id: "tbl-3", name: "T3", capacity: 4, status: "FREE" as const, floor: "Family Hall" },
  { id: "tbl-4", name: "T4", capacity: 4, status: "OCCUPIED" as const, floor: "Family Hall" },
  { id: "tbl-5", name: "T5", capacity: 6, status: "FREE" as const, floor: "Family Hall" },
  { id: "tbl-6", name: "T6", capacity: 6, status: "RESERVED" as const, floor: "Family Hall" },
  { id: "tbl-7", name: "T7", capacity: 8, status: "FREE" as const, floor: "Family Hall" },
  { id: "tbl-8", name: "T8", capacity: 4, status: "OCCUPIED" as const, floor: "Family Hall" },
  { id: "tbl-9", name: "T9", capacity: 2, status: "FREE" as const, floor: "Family Hall" },
  { id: "tbl-10", name: "T10", capacity: 4, status: "FREE" as const, floor: "Family Hall" },
  { id: "tbl-11", name: "VIP 1", capacity: 8, status: "RESERVED" as const, floor: "Roof Top" },
  { id: "tbl-12", name: "VIP 2", capacity: 10, status: "FREE" as const, floor: "Roof Top" },
  { id: "tbl-13", name: "Out 1", capacity: 4, status: "FREE" as const, floor: "Outdoor" },
  { id: "tbl-14", name: "Out 2", capacity: 4, status: "OCCUPIED" as const, floor: "Outdoor" },
  { id: "tbl-15", name: "Out 3", capacity: 6, status: "FREE" as const, floor: "Outdoor" },
];

export const DEMO_ORDERS = [
  {
    id: "ord-1",
    orderNumber: "ORD-1001",
    tableName: "T2",
    tableId: "tbl-2",
    waiterName: "Ali Ahmed",
    status: "PREPARING" as const,
    orderType: "DINE_IN",
    items: [
      { name: "Classic Burger", quantity: 2, unitPrice: 550 },
      { name: "Fresh Lime Soda", quantity: 2, unitPrice: 200 },
      { name: "Chicken Wings (6pc)", quantity: 1, unitPrice: 550 },
    ],
    subtotal: 2050,
    tax: 328,
    total: 2378,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: "ord-2",
    orderNumber: "ORD-1002",
    tableName: "T4",
    tableId: "tbl-4",
    waiterName: "Sara Khan",
    status: "PENDING" as const,
    orderType: "DINE_IN",
    items: [
      { name: "Pepperoni Pizza", quantity: 1, unitPrice: 1150 },
      { name: "Caesar Salad", quantity: 1, unitPrice: 450 },
      { name: "Iced Coffee", quantity: 2, unitPrice: 400 },
    ],
    subtotal: 2400,
    tax: 384,
    total: 2784,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: "ord-3",
    orderNumber: "ORD-1003",
    tableName: "T8",
    tableId: "tbl-8",
    waiterName: "Ali Ahmed",
    status: "READY" as const,
    orderType: "DINE_IN",
    items: [
      { name: "Grilled Chicken Platter", quantity: 2, unitPrice: 950 },
      { name: "Mango Shake", quantity: 2, unitPrice: 350 },
    ],
    subtotal: 2600,
    tax: 416,
    total: 3016,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: "ord-4",
    orderNumber: "ORD-1004",
    tableName: "Out 2",
    tableId: "tbl-14",
    waiterName: "Sara Khan",
    status: "PREPARING" as const,
    orderType: "DINE_IN",
    items: [
      { name: "BBQ Platter (2 Person)", quantity: 1, unitPrice: 2500 },
      { name: "Fresh Lime Soda", quantity: 3, unitPrice: 200 },
    ],
    subtotal: 3100,
    tax: 496,
    total: 3596,
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: "ord-5",
    orderNumber: "ORD-1005",
    tableName: null,
    tableId: null,
    waiterName: "Ali Ahmed",
    status: "PENDING" as const,
    orderType: "TAKEAWAY",
    items: [
      { name: "Double Smash Burger", quantity: 3, unitPrice: 850 },
      { name: "Chicken Zinger Burger", quantity: 2, unitPrice: 650 },
    ],
    subtotal: 3850,
    tax: 616,
    total: 4466,
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
  },
];

export const DEMO_STATS = {
  todayRevenue: 45780,
  todayOrders: 38,
  avgTicket: 1205,
  activeOrders: 12,
  tablesOccupied: 4,
  totalTables: 15,
  topItems: [
    { name: "Classic Burger", count: 45, revenue: 24750 },
    { name: "Pepperoni Pizza", count: 32, revenue: 36800 },
    { name: "Chicken Wings", count: 28, revenue: 15400 },
    { name: "Grilled Chicken Platter", count: 25, revenue: 23750 },
    { name: "BBQ Platter", count: 18, revenue: 45000 },
  ],
  revenueByHour: [
    { hour: "10AM", amount: 2500 },
    { hour: "11AM", amount: 4200 },
    { hour: "12PM", amount: 8900 },
    { hour: "1PM", amount: 12500 },
    { hour: "2PM", amount: 7800 },
    { hour: "3PM", amount: 3200 },
    { hour: "4PM", amount: 1800 },
    { hour: "5PM", amount: 2100 },
    { hour: "6PM", amount: 5600 },
    { hour: "7PM", amount: 9800 },
    { hour: "8PM", amount: 11200 },
    { hour: "9PM", amount: 8500 },
  ],
};

export const DEMO_EMPLOYEES = [
  { id: "emp-1", name: "Admin User", email: "admin@restaurant.com", role: "OWNER", phone: "0300-1234567", isActive: true },
  { id: "emp-2", name: "Ali Ahmed", email: "ali@restaurant.com", role: "WAITER", phone: "0301-2345678", isActive: true },
  { id: "emp-3", name: "Sara Khan", email: "sara@restaurant.com", role: "WAITER", phone: "0302-3456789", isActive: true },
  { id: "emp-4", name: "Hassan Raza", email: "hassan@restaurant.com", role: "CASHIER", phone: "0303-4567890", isActive: true },
  { id: "emp-5", name: "Chef Asad", email: "asad@restaurant.com", role: "KITCHEN_STAFF", phone: "0304-5678901", isActive: true },
  { id: "emp-6", name: "Usman Rider", email: "usman@restaurant.com", role: "DELIVERY_RIDER", phone: "0305-6789012", isActive: true },
  { id: "emp-7", name: "Fatima Bibi", email: "fatima@restaurant.com", role: "ACCOUNTANT", phone: "0306-7890123", isActive: true },
  { id: "emp-8", name: "Bilal Manager", email: "bilal@restaurant.com", role: "MANAGER", phone: "0307-8901234", isActive: true },
];

export const DEMO_INVENTORY = [
  { id: "inv-1", name: "Beef Patties", quantity: 120, unit: "pcs", lowStockAlert: 30, supplier: "Meat House" },
  { id: "inv-2", name: "Chicken Breast", quantity: 45, unit: "kg", lowStockAlert: 15, supplier: "Meat House" },
  { id: "inv-3", name: "Pizza Dough", quantity: 80, unit: "pcs", lowStockAlert: 20, supplier: "Flour Mill Co" },
  { id: "inv-4", name: "Mozzarella Cheese", quantity: 12, unit: "kg", lowStockAlert: 5, supplier: "Dairy Fresh" },
  { id: "inv-5", name: "Cooking Oil", quantity: 8, unit: "liters", lowStockAlert: 10, supplier: "General Store" },
  { id: "inv-6", name: "Tomatoes", quantity: 25, unit: "kg", lowStockAlert: 10, supplier: "Veggie Mart" },
  { id: "inv-7", name: "Lettuce", quantity: 15, unit: "kg", lowStockAlert: 5, supplier: "Veggie Mart" },
  { id: "inv-8", name: "Soft Drink Cans", quantity: 200, unit: "pcs", lowStockAlert: 50, supplier: "Beverage Dist." },
  { id: "inv-9", name: "Burger Buns", quantity: 8, unit: "pcs", lowStockAlert: 30, supplier: "Flour Mill Co" },
  { id: "inv-10", name: "French Fries (Frozen)", quantity: 35, unit: "kg", lowStockAlert: 10, supplier: "Frozen Foods" },
];

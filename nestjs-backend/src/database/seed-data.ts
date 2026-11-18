export interface SeedRole {
  name: string;
  slug: string;
  description: string;
}

export interface SeedPermission {
  name: string;
  slug: string;
  group: string;
  description: string;
}

export interface SeedCategory {
  name: string;
  slug: string;
  icon: string;
  description: string;
  sortOrder: number;
  parentSlug?: string;
}

export interface SeedAttribute {
  categorySlug: string;
  name: string;
  code: string;
  type: string;
  required?: boolean;
  filterable?: boolean;
  variantOption?: boolean;
  sortOrder: number;
  options?: string[];
}

export interface SeedBrand {
  name: string;
  slug: string;
  logoUrl: string;
  description: string;
  country: string;
  website: string;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  translations: Array<{ locale: string; name: string; description: string }>;
}

export interface SeedProduct {
  name: string;
  slug: string;
  sku: string;
  legacyCategorySlug: string;
  universalCategorySlug?: string;
  brand: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  galleryUrls: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  isFlashSale: boolean;
  isNewArrival: boolean;
  specifications: Record<string, string>;
}

export interface SeedBanner {
  title: string;
  subtitle: string;
  badgeText: string;
  imageUrl: string;
  videoUrl?: string | null;
  linkUrl: string;
  buttonText: string;
  backgroundStyle: string;
  placement: string;
  sortOrder: number;
}

export const SEED_ROLES: SeedRole[] = [
  ['SUPER_ADMIN', 'super_admin', 'System Super Administrator with unrestricted root access.'],
  ['ADMIN', 'admin', 'Platform Administrator managing platform operations, disputes, and compliance.'],
  ['STAFF', 'staff', 'General operational staff handling day-to-day administrative tasks.'],
  ['PRODUCT_MANAGER', 'product_manager', 'Oversees product catalogs, categories, brands, variants, and pricing.'],
  ['ORDER_MANAGER', 'order_manager', 'Manages order lifecycle, fulfillment queues, customer cancellations, and statuses.'],
  ['INVENTORY_MANAGER', 'inventory_manager', 'Controls stock movements, counts, valuation, and threshold alerts.'],
  ['WAREHOUSE_MANAGER', 'warehouse_manager', 'Supervises physical warehouses, bin locations, and goods receiving.'],
  ['FINANCE_MANAGER', 'finance_manager', 'Authorizes expenses, budgets, payouts, and financial policy execution.'],
  ['ACCOUNTANT', 'accountant', 'Posts double-entry journals, reconciles banks, and prepares reports.'],
  ['PURCHASING_MANAGER', 'purchasing_manager', 'Creates purchase orders, handles supplier quotations, and 3-way matching.'],
  ['CUSTOMER_SUPPORT', 'customer_support', 'Assists customers, handles inquiries, and reviews dispute tickets.'],
  ['LOGISTICS_MANAGER', 'logistics_manager', 'Oversees delivery dispatch, carrier fleets, routes, and performance.'],
  ['DISPATCHER', 'dispatcher', 'Assigns parcels to delivery drivers and monitors live transit.'],
  ['DELIVERY_DRIVER', 'delivery_driver', 'Fulfills delivery packages, broadcasts GPS location, collects proof.'],
  ['COURIER', 'courier', 'Courier role for assigned delivery routes and cash handover confirmation.'],
  ['DELIVERY', 'delivery', 'Fleet monitoring role with read access to every driver GPS position and live delivery route.'],
  ['SELLER', 'seller', 'Multi-vendor merchant store owner managing storefront and products.'],
  ['SELLER_STAFF', 'seller_staff', 'Staff member assisting an authorized marketplace vendor.'],
  ['CUSTOMER', 'customer', 'Verified retail customer purchasing goods and managing personal profile.'],
].map(([name, slug, description]) => ({ name, slug, description }));

export const SEED_PERMISSIONS: SeedPermission[] = [
  ['View Products', 'products.view', 'products', 'View catalog products and specifications'],
  ['Create Products', 'products.create', 'products', 'Create new products and variants'],
  ['Update Products', 'products.update', 'products', 'Update product details, pricing, and images'],
  ['Delete Products', 'products.delete', 'products', 'Archive or delete products'],
  ['View Orders', 'orders.view', 'orders', 'View customer and vendor orders'],
  ['Update Orders', 'orders.update', 'orders', 'Update order statuses and fulfillment'],
  ['View Payments', 'payments.view', 'payments', 'Inspect transactions and settlement references'],
  ['Approve Refunds', 'payments.refund.approve', 'payments', 'Authorize customer refund payouts'],
  ['View Inventory', 'inventory.view', 'inventory', 'Inspect warehouse stock levels and valuation'],
  ['Adjust Inventory', 'inventory.adjust', 'inventory', 'Perform manual and audit stock adjustments'],
  ['Transfer Inventory', 'inventory.transfer', 'inventory', 'Execute warehouse-to-warehouse transfers'],
  ['Approve Inventory', 'inventory.approve', 'inventory', 'Approve write-offs and large count adjustments'],
  ['Manage Suppliers', 'suppliers.manage', 'purchasing', 'Register and maintain vendor suppliers'],
  ['Create Purchases', 'purchases.create', 'purchasing', 'Draft purchase requests and purchase orders'],
  ['Approve Purchases', 'purchases.approve', 'purchasing', 'Authorize purchase order issuance'],
  ['Create Expenses', 'expenses.create', 'expenses', 'Record operational expense claims and bills'],
  ['Approve Expenses', 'expenses.approve', 'expenses', 'Approve corporate and departmental expenses'],
  ['View Accounting', 'accounting.view', 'accounting', 'Inspect chart of accounts and general ledger'],
  ['Create Journals', 'accounting.journals.create', 'accounting', 'Draft double-entry journal entries'],
  ['Post Journals', 'accounting.journals.post', 'accounting', 'Permanently post balanced journals to general ledger'],
  ['View Financial Reports', 'accounting.reports.view', 'accounting', 'Generate and review P&L, balance sheets, and trial balance'],
  ['Reconcile Banking', 'banking.reconcile', 'accounting', 'Perform bank statements and Bakong KHQR reconciliations'],
  ['Assign Deliveries', 'delivery.assign', 'logistics', 'Assign orders to delivery drivers'],
  ['Update Deliveries', 'delivery.update', 'logistics', 'Update shipment transit state and proof of delivery'],
  ['View Live Tracking', 'delivery.tracking.view', 'logistics', 'Monitor real-time GPS fleet positions'],
  ['Manage Staff', 'staff.manage', 'administration', 'Invite, suspend, and configure staff accounts'],
  ['Manage Roles', 'roles.manage', 'administration', 'Create and customize role configurations'],
  ['Grant Permissions', 'permissions.grant', 'administration', 'Assign permissions to roles without escalation'],
  ['Manage Settings', 'settings.manage', 'administration', 'Update system and store configurations'],
].map(([name, slug, group, description]) => ({ name, slug, group, description }));

export const ROLE_PERMISSION_SLUGS: Record<string, string[]> = {
  accountant: ['accounting.view', 'accounting.journals.create', 'accounting.journals.post', 'accounting.reports.view', 'banking.reconcile', 'expenses.create'],
  inventory_manager: ['inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.approve', 'products.view', 'products.update'],
  customer: ['products.view', 'orders.view', 'delivery.tracking.view'],
  order_manager: ['orders.view', 'orders.update', 'delivery.tracking.view'],
  logistics_manager: ['orders.view', 'orders.update', 'delivery.assign', 'delivery.update', 'delivery.tracking.view'],
  dispatcher: ['orders.view', 'orders.update', 'delivery.assign', 'delivery.update', 'delivery.tracking.view'],
  delivery_driver: ['orders.view', 'orders.update', 'delivery.update', 'delivery.tracking.view'],
  courier: ['orders.view', 'orders.update', 'delivery.update', 'delivery.tracking.view'],
  delivery: ['orders.view', 'orders.update', 'delivery.update', 'delivery.tracking.view'],
};

export const BASE_CATEGORIES: SeedCategory[] = [
  ['Laptops & Computers', 'laptops', 'Laptop', 'High performance laptops, ultrabooks, and workstations', 1],
  ['Smartphones & Tablets', 'smartphones', 'Smartphone', 'Flagship iOS and Android mobile devices', 2],
  ['Audio & Acoustics', 'audio', 'Headphones', 'Wireless noise cancelling headphones and studio acoustics', 3],
  ['Wearables & Smartwatches', 'wearables', 'Watch', 'GPS fitness smartwatches and smart bands', 4],
  ['Drones & Cameras', 'drones', 'Camera', 'Aerial 4K HDR drones and handheld gimbals', 5],
  ['Fashion & Sportswear', 'fashion', 'Shirt', 'Original footwear and athletic apparel', 6],
].map(([name, slug, icon, description, sortOrder]) => ({ name: String(name), slug: String(slug), icon: String(icon), description: String(description), sortOrder: Number(sortOrder) })) as SeedCategory[];

export const UNIVERSAL_CATEGORIES: SeedCategory[] = [
  ['Electronics & Computers', 'electronics-computers', 'Laptop', 'Laptops, desktop PCs, PC parts, monitors, and computer accessories.', 1],
  ['Mobile Phones & Accessories', 'mobile-phones-accessories', 'Smartphone', 'Smartphones, tablets, phone cases, fast chargers, and smart wearables.', 2],
  ['Fashion & Clothing', 'fashion-clothing', 'Shirt', "Men's, women's, and kids' apparel, casual wear, and formal outfits.", 3],
  ['Shoes & Bags', 'shoes-bags', 'Footprints', 'Running shoes, casual sneakers, leather boots, backpacks, and luxury handbags.', 4],
  ['Beauty & Personal Care', 'beauty-personal-care', 'Sparkles', 'Skincare, fragrances, makeup, hair care, and grooming essentials.', 5],
  ['Health & Wellness', 'health-wellness', 'HeartPulse', 'Vitamins, supplements, fitness gear, medical monitors, and wellness tea.', 6],
  ['Home & Living', 'home-living', 'Home', 'Home decor, bedsheets, smart lighting, curtains, and air purifiers.', 7],
  ['Furniture', 'furniture', 'Armchair', 'Sofas, ergonomic office chairs, dining tables, beds, and storage cabinets.', 8],
  ['Kitchen & Dining', 'kitchen-dining', 'Utensils', 'Cookware sets, blenders, espresso machines, dinnerware, and cutlery.', 9],
  ['Groceries & Food', 'groceries-food', 'Apple', 'Fresh produce, beverages, organic snacks, pantry essentials, and coffee beans.', 10],
  ['Baby & Kids', 'baby-kids', 'Baby', 'Baby strollers, car seats, infant nutrition, baby care, and nursery items.', 11],
  ['Toys & Games', 'toys-games', 'Gamepad2', 'Board games, Lego & building sets, gaming consoles, action figures, and puzzles.', 12],
  ['Sports & Outdoors', 'sports-outdoors', 'Trophy', 'Gym equipment, camping tents, hiking boots, cycling gear, and swimsuits.', 13],
  ['Automotive Accessories', 'automotive-accessories', 'Car', 'Dash cameras, car chargers, interior organizers, detailing waxes, and helmets.', 14],
  ['Books & Stationery', 'books-stationery', 'BookOpen', 'Bestselling novels, educational textbooks, journals, luxury pens, and art supplies.', 15],
  ['Office Supplies', 'office-supplies', 'Briefcase', 'Paper, printers, shredders, filing cabinets, and office stationery.', 16],
  ['Pet Supplies', 'pet-supplies', 'Dog', 'Cat and dog food, grooming tools, scratching posts, toys, and pet beds.', 17],
  ['Garden & Outdoor', 'garden-outdoor', 'Flower2', 'Planters, outdoor lighting, gardening shears, hoses, and BBQ grills.', 18],
  ['Tools & Home Improvement', 'tools-home-improvement', 'Wrench', 'Power drills, hardware toolkits, safety gloves, ladders, and plumbing supplies.', 19],
  ['Jewelry & Watches', 'jewelry-watches', 'Watch', 'Precious necklaces, rings, earrings, luxury chronographs, and bracelets.', 20],
  ['Digital Products', 'digital-products', 'Binary', 'Software licenses, online courses, digital gift cards, and eBooks.', 21],
  ['Handmade Products', 'handmade-products', 'Palette', 'Artisanal crafts, woven textiles, handmade pottery, and local souvenirs.', 22],
  ['Gifts & Flowers', 'gifts-flowers', 'Gift', 'Fresh floral bouquets, festive gift hampers, customized greeting cards.', 23],
  ['Musical Instruments', 'musical-instruments', 'Music', 'Acoustic guitars, digital pianos, violins, drums, and DJ audio controllers.', 24],
  ['Travel Accessories', 'travel-accessories', 'Luggage', 'Hard-shell suitcases, passport covers, neck pillows, and universal travel adapters.', 25],
  ['Other Products', 'other-products', 'Package', 'General merchandise, seasonal seasonal items, and novelties.', 26],
].map(([name, slug, icon, description, sortOrder]) => ({ name: String(name), slug: String(slug), icon: String(icon), description: String(description), sortOrder: Number(sortOrder) })) as SeedCategory[];

export const UNIVERSAL_SUBCATEGORIES: SeedCategory[] = [
  ['Laptops & Ultrabooks', 'laptops-ultrabooks', 'Laptop', 'Flagship performance, thin & light, and creator notebooks', 1, 'electronics-computers'],
  ['Computer Components', 'computer-components', 'Cpu', 'CPUs, GPUs, motherboards, RAM, and internal SSDs', 2, 'electronics-computers'],
  ['Audio & Headphones', 'audio-headphones', 'Headphones', 'Studio acoustics, wireless earbuds, and soundbars', 3, 'electronics-computers'],
  ['Smartphones', 'smartphones', 'Smartphone', 'Flagship iOS and Android mobile phones', 1, 'mobile-phones-accessories'],
  ['Tablets & e-Readers', 'tablets-ereaders', 'Tablet', 'Productivity tablets, iPads, and digital readers', 2, 'mobile-phones-accessories'],
  ['Smartwatches & Bands', 'smartwatches-bands', 'Watch', 'GPS sports trackers and health watches', 3, 'mobile-phones-accessories'],
  ["Men's Fashion", 'mens-fashion', 'Shirt', "Men's shirts, pants, jackets, and sportswear", 1, 'fashion-clothing'],
  ["Women's Fashion", 'womens-fashion', 'Sparkles', "Dresses, blouses, skirts, and activewear", 2, 'fashion-clothing'],
].map(([name, slug, icon, description, sortOrder, parentSlug]) => ({ name: String(name), slug: String(slug), icon: String(icon), description: String(description), sortOrder: Number(sortOrder), parentSlug: String(parentSlug) })) as SeedCategory[];

export const SEED_ATTRIBUTES: SeedAttribute[] = [
  { categorySlug: 'fashion-clothing', name: 'Clothing Size', code: 'size', type: 'select', required: true, filterable: true, variantOption: true, sortOrder: 1, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { categorySlug: 'fashion-clothing', name: 'Color', code: 'color', type: 'select', required: true, filterable: true, variantOption: true, sortOrder: 2, options: ['Black', 'White', 'Navy Blue', 'Red', 'Heather Gray', 'Olive Green'] },
  { categorySlug: 'fashion-clothing', name: 'Material Fabric', code: 'material', type: 'text', filterable: true, sortOrder: 3 },
  { categorySlug: 'electronics-computers', name: 'Brand Name', code: 'brand', type: 'text', required: true, filterable: true, sortOrder: 1 },
  { categorySlug: 'electronics-computers', name: 'RAM Capacity', code: 'ram', type: 'select', filterable: true, variantOption: true, sortOrder: 2, options: ['8GB', '16GB', '32GB', '36GB', '64GB', '128GB'] },
  { categorySlug: 'electronics-computers', name: 'Internal Storage', code: 'storage', type: 'select', filterable: true, variantOption: true, sortOrder: 3, options: ['256GB SSD', '512GB SSD', '1TB NVMe', '2TB NVMe'] },
  { categorySlug: 'electronics-computers', name: 'Processor CPU', code: 'processor', type: 'text', filterable: true, sortOrder: 4 },
  { categorySlug: 'furniture', name: 'Primary Material', code: 'material', type: 'text', filterable: true, sortOrder: 1 },
  { categorySlug: 'furniture', name: 'Dimensions (W x H x L)', code: 'dimensions', type: 'text', sortOrder: 2 },
  { categorySlug: 'furniture', name: 'Assembly Required', code: 'assembly_required', type: 'boolean', sortOrder: 3 },
  { categorySlug: 'groceries-food', name: 'Net Weight', code: 'net_weight', type: 'text', sortOrder: 1 },
  { categorySlug: 'groceries-food', name: 'Expiration Date', code: 'expiration_date', type: 'date', sortOrder: 2 },
  { categorySlug: 'books-stationery', name: 'Author', code: 'author', type: 'text', required: true, filterable: true, sortOrder: 1 },
  { categorySlug: 'books-stationery', name: 'ISBN Number', code: 'isbn', type: 'text', sortOrder: 2 },
];

const brand = (name: string, slug: string, country: string, website: string, description: string, sortOrder: number): SeedBrand => ({
  name,
  slug,
  country,
  website,
  description,
  sortOrder,
  logoUrl: `https://images.unsplash.com/photo-${slug === 'apple' ? '1611186871348-b1ce696e52c9' : slug === 'samsung' ? '1610945265064-0e34e5519bbf' : '1523381294911-8d3cead13475'}?w=300&auto=format&fit=crop&q=80`,
  seoTitle: `${name} Official Store | TYUSHOP`,
  seoDescription: description,
  translations: [
    { locale: 'en', name, description },
    { locale: 'km', name: `${name} (${name})`, description },
  ],
});

export const SEED_BRANDS: SeedBrand[] = [
  brand('Apple', 'apple', 'United States', 'https://www.apple.com', 'World-renowned personal technology, MacBook Pro, Apple Watch Ultra, and Apple Silicon ecosystems.', 1),
  brand('Sony', 'sony', 'Japan', 'https://www.sony.com', 'Pioneering Japanese acoustic engineering, WH-1000XM5 wireless noise cancelling, and pro audio.', 2),
  brand('Samsung', 'samsung', 'South Korea', 'https://www.samsung.com', 'Galaxy S24 Ultra AI Smartphones, Dynamic AMOLED displays, and next-gen mobile innovations.', 3),
  brand('Nike', 'nike', 'United States', 'https://www.nike.com', 'World leader in athletic footwear, Alphafly road racing innovations, and performance gear.', 4),
  brand('Anker', 'anker', 'United States', 'https://www.anker.com', "The world's #1 mobile charging brand, PowerLine endurance cables, and GaN fast chargers.", 5),
  brand('Xiaomi', 'xiaomi', 'China', 'https://www.mi.com', 'Smart living ecosystem, wireless dual-mode silent computer peripherals, and IoT lifestyle hardware.', 6),
  brand('JBL', 'jbl', 'United States', 'https://www.jbl.com', 'Bold styling, rich JBL Pro Sound, IP67 waterproof Bluetooth speakers, and portable audio.', 7),
  brand('MegaBasics', 'megabasics', 'Cambodia', 'https://tyushop.blog/brands/megabasics', 'Everyday insulated travel tumblers, stainless steel bottles, and minimalist lifestyle essentials.', 8),
  brand('Aura Silk', 'aura-silk', 'Cambodia', 'https://tyushop.blog/brands/aura-silk', 'Artisanal silk blouses, breathable linen dresses, and elegant contemporary womenswear.', 9),
  brand('UrbanPulse', 'urbanpulse', 'Singapore', 'https://urbanpulse.asia', 'Athleisure, dynamic streetwear, high-performance denim, and active lifestyle apparel.', 10),
  brand('Apex Tech', 'apex-tech', 'Taiwan', 'https://apextech.io', 'Flagship laptops, computer peripherals, high-speed NVMe storage, and productivity hardware.', 11),
  brand('Lumina Audio', 'lumina-audio', 'Japan', 'https://luminaaudio.jp', 'Audiophile-grade wireless headphones, active noise-canceling earbuds, and studio monitors.', 12),
  brand('Terra Living', 'terra-living', 'Cambodia', 'https://tyushop.blog/brands/terra-living', 'Solid teak and Scandinavian inspired furniture, ergonomic desk setups, and sustainable home decor.', 13),
  brand('Botanica Care', 'botanica-care', 'France', 'https://botanicacare.fr', 'Organic botanical skincare, clean cosmetics, and rejuvenating mineral sunscreens.', 14),
  brand('KhmerCraft Heritage', 'khmercraft-heritage', 'Cambodia', 'https://tyushop.blog/brands/khmercraft', 'Authentic handmade Cambodian crafts, traditional krama scarves, and hand-carved stone art.', 15),
];

const gallery = (ids: string[]): string[] => ids.map((id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`);

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: 'Apple MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD)', slug: 'apple-macbook-pro-16-m3-max', sku: 'LAP-MBP-016', legacyCategorySlug: 'laptops', universalCategorySlug: 'laptops-ultrabooks', brand: 'Apple',
    description: 'The ultimate pro laptop. Powered by M3 Max with a 14-core CPU, 30-core GPU, Liquid Retina XDR display, and up to 22 hours of battery life.', price: 3499, discountPrice: 3299, stockQuantity: 15, lowStockThreshold: 3, rating: 4.9, reviewsCount: 128,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80', galleryUrls: gallery(['1517336714731-489689fd1ca8', '1611186871348-b1ce696e52c9', '1541807084-5c52b6b3adef', '1516321318423-f06f85e504b3', '1525547719571-a2d4ac8945e2']), isFeatured: true, isBestSeller: true, isFlashSale: false, isNewArrival: true,
    specifications: { Processor: 'Apple M3 Max 14-core', RAM: '36GB Unified Memory', Storage: '1TB NVMe SSD', Screen: '16.2-inch Liquid Retina XDR', Color: 'Space Black' },
  },
  {
    name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', slug: 'sony-wh-1000xm5-wireless-headphones', sku: 'AUD-SNY-XM5', legacyCategorySlug: 'audio', universalCategorySlug: 'audio-headphones', brand: 'Sony',
    description: 'Industry-leading noise cancellation optimized by two processors and 8 microphones. Exceptional sound with 30-hour battery life.', price: 398, discountPrice: 349, stockQuantity: 28, lowStockThreshold: 5, rating: 4.8, reviewsCount: 95,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', galleryUrls: gallery(['1505740420928-5e560c06d30e', '1546435770-a3e426bf472b', '1583394838336-acd977736f90', '1484704849700-f032a568e944']), isFeatured: true, isBestSeller: true, isFlashSale: true, isNewArrival: false,
    specifications: { Connectivity: 'Bluetooth 5.2 / 3.5mm Aux', 'Battery Life': '30 hours (ANC on)', Microphones: '8 Beamforming mics', Color: 'Silver / Platinum' },
  },
  {
    name: 'Samsung Galaxy S24 Ultra 5G AI Smartphone (512GB)', slug: 'samsung-galaxy-s24-ultra-512gb', sku: 'PHN-SMS-S24', legacyCategorySlug: 'smartphones', universalCategorySlug: 'smartphones', brand: 'Samsung',
    description: 'Galaxy AI is here. Titanium frame, 200MP camera with Quad Telephoto system, and Snapdragon 8 Gen 3 for Galaxy.', price: 1299, discountPrice: 1199, stockQuantity: 22, lowStockThreshold: 4, rating: 4.9, reviewsCount: 210,
    imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80', galleryUrls: gallery(['1610945265064-0e34e5519bbf', '1592899677977-9c10ca588bbd', '1580910051074-3eb694886505', '1565849904461-04a58ad377e0']), isFeatured: true, isBestSeller: false, isFlashSale: true, isNewArrival: true,
    specifications: { Processor: 'Snapdragon 8 Gen 3', RAM: '12GB', Storage: '512GB', Camera: '200MP + 50MP + 12MP + 10MP', Display: '6.8-inch Dynamic AMOLED 2X 120Hz' },
  },
  {
    name: 'Apple Watch Ultra 2 GPS + Cellular Titanium Case', slug: 'apple-watch-ultra-2-titanium', sku: 'WAT-APL-ULT2', legacyCategorySlug: 'wearables', universalCategorySlug: 'smartwatches-bands', brand: 'Apple',
    description: 'The most rugged and capable Apple Watch. Engineered for endurance athletes, outdoor adventurers, and water sports enthusiasts.', price: 799, discountPrice: null, stockQuantity: 4, lowStockThreshold: 5, rating: 4.8, reviewsCount: 64,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', galleryUrls: gallery(['1523275335684-37898b6baf30', '1508685096489-7aacd43bd3b1', '1434493789847-2f02dc6ca35d']), isFeatured: false, isBestSeller: false, isFlashSale: false, isNewArrival: true,
    specifications: { Case: '49mm Aerospace-grade Titanium', Display: '3000 nits Always-On Retina', 'Water Resistance': '100m / EN13319 dive rated' },
  },
  {
    name: 'DJI Mini 4 Pro Drone with RC 2 Controller & 4K HDR', slug: 'dji-mini-4-pro-drone-rc2', sku: 'DRN-DJI-M4P', legacyCategorySlug: 'drones', universalCategorySlug: 'drones', brand: 'DJI',
    description: 'Sub-249g ultra-lightweight mini drone with omnidirectional obstacle sensing, 4K/60fps HDR true vertical shooting, and 20km FHD transmission.', price: 959, discountPrice: 899, stockQuantity: 7, lowStockThreshold: 3, rating: 4.9, reviewsCount: 43,
    imageUrl: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=600&q=80', galleryUrls: gallery(['1527977966376-1c8408f9f108', '1508614589041-895b88991e3e', '1473968512647-3e447244af8f']), isFeatured: true, isBestSeller: false, isFlashSale: false, isNewArrival: false,
    specifications: { Weight: '249g', 'Flight Time': '34 minutes', Video: '4K/60fps HDR True Vertical', Sensing: 'Omnidirectional Obstacle Avoidance' },
  },
  {
    name: 'Nike Air Zoom Alphafly NEXT% 2 Road Racing Shoes', slug: 'nike-air-zoom-alphafly-next-2', sku: 'FSH-NKE-ALP2', legacyCategorySlug: 'fashion', universalCategorySlug: 'shoes-bags', brand: 'Nike',
    description: 'Engineered for marathoners and competitive racers. Dual Zoom Air pods, full-length carbon fiber Flyplate, and ZoomX foam midsole.', price: 275, discountPrice: 245, stockQuantity: 19, lowStockThreshold: 4, rating: 4.7, reviewsCount: 88,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', galleryUrls: gallery(['1542291026-7eec264c27ff', '1608231387042-66d1773070a5', '1595950653106-6c9ebd614d3a']), isFeatured: false, isBestSeller: true, isFlashSale: true, isNewArrival: false,
    specifications: { Type: 'Marathon Road Racing', Cushioning: 'ZoomX Foam + Dual Air Pods', Plate: 'Full-length Carbon Fiber Flyplate' },
  },
  {
    name: 'Anker PowerLine III USB-C Fast Charging Cable (100W)', slug: 'anker-powerline-iii-usbc-cable', sku: 'RWD-ANK-015', legacyCategorySlug: 'smartphones', brand: 'Anker',
    description: 'Ultra-durable 100W USB-C PD fast charging cable. Redeemable for FREE with 100 Loyalty Points (under $20-$30 reward item)!', price: 18, discountPrice: 14.5, stockQuantity: 50, lowStockThreshold: 5, rating: 4.9, reviewsCount: 84,
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80', galleryUrls: gallery(['1583863788434-e58a36330cf0', '1609592807908-1e434850fa91']), isFeatured: true, isBestSeller: true, isFlashSale: true, isNewArrival: true,
    specifications: { Output: '100W Power Delivery', 'Reward Program': '100 Points Free Item Eligible' },
  },
  {
    name: 'JBL GO 3 Portable Waterproof Bluetooth Speaker', slug: 'jbl-go-3-portable-bluetooth-speaker', sku: 'RWD-JBL-029', legacyCategorySlug: 'audio', brand: 'JBL',
    description: 'Rich JBL Pro Sound with IP67 waterproof rating. Eligible for 100 Points Free Exchange (under $30)!', price: 29, discountPrice: 24.99, stockQuantity: 35, lowStockThreshold: 5, rating: 4.9, reviewsCount: 140,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80', galleryUrls: gallery(['1608043152269-423dbba4e7e1', '1545454675-3531b543be5d']), isFeatured: true, isBestSeller: true, isFlashSale: true, isNewArrival: true,
    specifications: { Waterproof: 'IP67 Rated', 'Reward Program': '100 Points Free Item Eligible' },
  },
  {
    name: 'Xiaomi Mi Dual-Mode Silent Wireless Mouse', slug: 'xiaomi-mi-wireless-silent-mouse', sku: 'RWD-XIA-022', legacyCategorySlug: 'laptops', brand: 'Xiaomi',
    description: 'Ergonomic Bluetooth & 2.4GHz wireless silent mouse. Eligible for 100 Loyalty Points Free Redemption!', price: 22, discountPrice: 19, stockQuantity: 40, lowStockThreshold: 5, rating: 4.8, reviewsCount: 62,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80', galleryUrls: gallery(['1527864550417-7fd91fc51a46', '1615663245857-ac93bb7c39e7']), isFeatured: false, isBestSeller: true, isFlashSale: true, isNewArrival: true,
    specifications: { Connectivity: 'Bluetooth + 2.4GHz USB', 'Reward Program': '100 Points Free Item Eligible' },
  },
  {
    name: 'MegaBasics Insulated Stainless Steel Travel Tumbler (750ml)', slug: 'megabasics-stainless-travel-tumbler', sku: 'RWD-MGB-019', legacyCategorySlug: 'laptops', brand: 'MegaBasics',
    description: 'Double-wall vacuum insulated tumbler keeping drinks icy cold for 24 hours. Free with 100 Loyalty Points!', price: 19.5, discountPrice: 16, stockQuantity: 60, lowStockThreshold: 5, rating: 4.7, reviewsCount: 51,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80', galleryUrls: gallery(['1602143407151-7111542de6e8', '1517256064527-09c73fc73e38', '1577705998148-6da4f3963bc8']), isFeatured: false, isBestSeller: false, isFlashSale: true, isNewArrival: true,
    specifications: { Capacity: '750ml', Insulation: 'Double-wall vacuum', 'Reward Program': '100 Points Free Item Eligible' },
  },
];

export const DEFAULT_STORE_SETTINGS: Record<string, string> = {
  store_name: 'MegaCommerce Flagship Store',
  store_description: 'Premium Multi-Vendor Marketplace specializing in verified electronics, smartphones, acoustics, and smart lifestyle.',
  store_address: '#182 Preah Norodom Boulevard, Sangkat Tonle Bassac, Khan Chamkarmon, Phnom Penh 12301, Cambodia',
  business_email: 'Vothanarern@gmail.com',
  support_email: 'Vothanarern@gmail.com',
  contact_phone: '016 555 637',
  telegram_bot_username: 'TYUSHOP_Bot',
  telegram_support_contact: '@MegaCommerceSupport',
  website_url: 'http://localhost:3000',
  country: 'Cambodia',
  default_currency: 'USD',
  supported_languages: JSON.stringify({ en: 'English', km: 'Khmer' }),
  brand_color: '#4f46e5',
  receipt_footer_message: 'Thank you for choosing MegaCommerce Flagship. For returns or warranty claims, contact support@megacommerce.local within 7 days.',
  tax_id: 'KHM-VAT-9024881',
  return_policy_days: '7',
  shipping_policy: 'Free express shipping on all orders exceeding $50. Standard nationwide delivery within 24 to 48 hours.',
};

export const ENV_STORE_SETTINGS: Record<string, string> = {
  store_name: 'TYUSHOP',
  support_email: 'Vothanarern@gmail.com',
  support_phone: '016 555 637',
  store_address: 'Phnom Penh, Cambodia',
  mail_mailer: 'smtp',
  mail_host: 'smtp.resend.com',
  mail_port: '587',
  mail_username: 'resend',
  mail_encryption: 'tls',
  mail_from_address: 'no-reply@tyushop.blog',
  mail_from_name: 'TYUSHOP',
  telegram_mini_app_url: 'https://tyushop.blog/telegram-app',
  bakong_account_id: 'roeun_vathana1@bkrt',
  bakong_merchant_name: 'Tyushop',
  bakong_merchant_city: 'Phnom Penh',
  bakong_api_url: 'https://api-bakong.nbc.gov.kh',
};

export const SEED_BANNERS: SeedBanner[] = [
  { title: 'The Next-Gen Universal Marketplace', subtitle: 'Engineered with modern multi-vendor commerce architecture. Browse 26 universal departments, dynamic specifications, and multi-SKU variants powered by real-time inventory control.', badgeText: 'Universal Multi-Category Marketplace', imageUrl: '/api/v1/media/branding/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg', videoUrl: '/api/v1/media/branding/gemini_generated_video_4b7f1e53.mp4', linkUrl: '/products', buttonText: 'Explore Catalog', backgroundStyle: 'gradient-primary', placement: 'hero', sortOrder: 1 },
  { title: 'Cambodia Flagship Tech & Mobile Deals', subtitle: 'Official Apple, Sony, Samsung, DJI & tech accessories with nationwide express delivery and 0% fee Bakong KHQR checkout.', badgeText: 'Official Tech Flagship', imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80', linkUrl: '/products?category=electronics-computers', buttonText: 'Shop Electronics', backgroundStyle: 'gradient-purple', placement: 'hero', sortOrder: 2 },
  { title: "Men's & Women's Fashion Master Showcase", subtitle: 'Curated premium apparel, streetwear, athletic sportswear, and handcrafted traditional Khmer silk collections.', badgeText: 'Trending Collections', imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80', linkUrl: '/products?category=fashion-clothing', buttonText: 'Browse Fashion', backgroundStyle: 'gradient-emerald', placement: 'hero', sortOrder: 3 },
  { title: 'Nationwide Express Courier & Live GPS Tracking', subtitle: 'Order before 2 PM for same-day delivery across Phnom Penh. Real-time driver parcel tracking with verified delivery security.', badgeText: 'Fast Dispatch', imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80', linkUrl: '/about', buttonText: 'Learn About Delivery', backgroundStyle: 'gradient-amber', placement: 'hero', sortOrder: 4 },
];

export const SEEDER_NAMES = {
  commerce: 'Database\\Seeders\\CommerceAndTelegramSeeder',
  universal: 'Database\\Seeders\\UniversalCategorySeeder',
  banner: 'Database\\Seeders\\BannerSeeder',
} as const;

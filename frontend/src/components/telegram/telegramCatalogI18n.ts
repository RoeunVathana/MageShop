import type { CategoryItem, ProductItem } from '@/services/telegramApi';

type Language = 'EN' | 'KM';

const CATEGORY_NAMES_KM: Record<string, string> = {
  laptops: 'កុំព្យូទ័រយួរដៃ និងកុំព្យូទ័រ',
  smartphones: 'ស្មាតហ្វូន និងថេប្លេត',
  audio: 'សំឡេង និងកាស',
  wearables: 'ឧបករណ៍ពាក់ និងនាឡិកាឆ្លាតវៃ',
  drones: 'ដ្រូន និងកាមេរ៉ា',
  fashion: 'ម៉ូដ និងសម្លៀកបំពាក់កីឡា',
  'electronics-computers': 'អេឡិចត្រូនិក និងកុំព្យូទ័រ',
  'mobile-phones-accessories': 'ទូរស័ព្ទ និងគ្រឿងបន្លាស់',
  'fashion-clothing': 'ម៉ូដ និងសម្លៀកបំពាក់',
  'shoes-bags': 'ស្បែកជើង និងកាបូប',
  'beauty-personal-care': 'សម្រស់ និងការថែទាំផ្ទាល់ខ្លួន',
  'health-wellness': 'សុខភាព និងសុខុមាលភាព',
  'home-living': 'គេហដ្ឋាន និងការរស់នៅ',
  furniture: 'គ្រឿងសង្ហារឹម',
  'kitchen-dining': 'ផ្ទះបាយ និងការទទួលទាន',
  'groceries-food': 'គ្រឿងទេស និងអាហារ',
  'baby-kids': 'ទារក និងកុមារ',
  'toys-games': 'ប្រដាប់ក្មេងលេង និងហ្គេម',
  'sports-outdoors': 'កីឡា និងក្រៅផ្ទះ',
  'automotive-accessories': 'គ្រឿងបន្លាស់យានយន្ត',
  'books-stationery': 'សៀវភៅ និងសម្ភារៈការិយាល័យ',
  'office-supplies': 'សម្ភារៈការិយាល័យ',
  'pet-supplies': 'សម្ភារៈសត្វចិញ្ចឹម',
  'garden-outdoor': 'សួនច្បារ និងក្រៅផ្ទះ',
  'tools-home-improvement': 'ឧបករណ៍ និងជួសជុលផ្ទះ',
  'jewelry-watches': 'គ្រឿងអលង្ការ និងនាឡិកា',
  'digital-products': 'ផលិតផលឌីជីថល',
  'handmade-products': 'ផលិតផលធ្វើដោយដៃ',
  'gifts-flowers': 'អំណោយ និងផ្កា',
  'musical-instruments': 'ឧបករណ៍តន្ត្រី',
  'travel-accessories': 'គ្រឿងបន្លាស់ធ្វើដំណើរ',
  'other-products': 'ផលិតផលផ្សេងៗ',
  'laptops-ultrabooks': 'កុំព្យូទ័រយួរដៃ និង Ultrabook',
  'computer-components': 'គ្រឿងបន្លាស់កុំព្យូទ័រ',
  'audio-headphones': 'សំឡេង និងកាស',
  'tablets-ereaders': 'ថេប្លេត និងឧបករណ៍អានសៀវភៅ',
  'smartwatches-bands': 'នាឡិកាឆ្លាតវៃ និងខ្សែដៃ',
  'mens-fashion': 'ម៉ូដបុរស',
  'womens-fashion': 'ម៉ូដនារី',
};

const PRODUCT_NAMES_KM: Record<string, string> = {
  'apple-macbook-pro-16-m3-max': 'Apple MacBook Pro 16" M3 Max (RAM 36GB, SSD 1TB)',
  'sony-wh-1000xm5-wireless-headphones': 'Sony WH-1000XM5 កាសឥតខ្សែបំបាត់សំឡេងរំខាន',
  'samsung-galaxy-s24-ultra-512gb': 'Samsung Galaxy S24 Ultra 5G AI ស្មាតហ្វូន (512GB)',
  'apple-watch-ultra-2-titanium': 'Apple Watch Ultra 2 GPS + Cellular តួ Titanium',
  'dji-mini-4-pro-drone-rc2': 'DJI Mini 4 Pro ដ្រូន ជាមួយឧបករណ៍បញ្ជា RC 2 និង 4K HDR',
  'nike-air-zoom-alphafly-next-2': 'Nike Air Zoom Alphafly NEXT% 2 ស្បែកជើងប្រណាំងផ្លូវ',
  'anker-powerline-iii-usbc-cable': 'Anker PowerLine III ខ្សែសាក USB-C លឿន (100W)',
  'jbl-go-3-portable-bluetooth-speaker': 'JBL GO 3 ឧបករណ៍បំពងសំឡេង Bluetooth មិនជ្រាបទឹក',
  'xiaomi-mi-wireless-silent-mouse': 'Xiaomi Mi Dual-Mode កណ្តុរឥតខ្សែស្ងាត់',
  'megabasics-stainless-travel-tumbler': 'MegaBasics ដបទឹកធ្វើដំណើរដែកអ៊ីណុករក្សាកម្ដៅ (750ml)',
};

const PRODUCT_NAMES_BY_ENGLISH: Record<string, string> = {
  'Apple MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD)': PRODUCT_NAMES_KM['apple-macbook-pro-16-m3-max'],
  'Sony WH-1000XM5 Wireless Noise Cancelling Headphones': PRODUCT_NAMES_KM['sony-wh-1000xm5-wireless-headphones'],
  'Samsung Galaxy S24 Ultra 5G AI Smartphone (512GB)': PRODUCT_NAMES_KM['samsung-galaxy-s24-ultra-512gb'],
  'Apple Watch Ultra 2 GPS + Cellular Titanium Case': PRODUCT_NAMES_KM['apple-watch-ultra-2-titanium'],
  'DJI Mini 4 Pro Drone with RC 2 Controller & 4K HDR': PRODUCT_NAMES_KM['dji-mini-4-pro-drone-rc2'],
  'Nike Air Zoom Alphafly NEXT% 2 Road Racing Shoes': PRODUCT_NAMES_KM['nike-air-zoom-alphafly-next-2'],
  'Anker PowerLine III USB-C Fast Charging Cable (100W)': PRODUCT_NAMES_KM['anker-powerline-iii-usbc-cable'],
  'JBL GO 3 Portable Waterproof Bluetooth Speaker': PRODUCT_NAMES_KM['jbl-go-3-portable-bluetooth-speaker'],
  'Xiaomi Mi Dual-Mode Silent Wireless Mouse': PRODUCT_NAMES_KM['xiaomi-mi-wireless-silent-mouse'],
  'MegaBasics Insulated Stainless Steel Travel Tumbler (750ml)': PRODUCT_NAMES_KM['megabasics-stainless-travel-tumbler'],
};

export function localizeCategoryName(category: Pick<CategoryItem, 'name' | 'slug' | 'name_km'> | null | undefined, language: Language): string {
  if (!category) return '';
  if (language !== 'KM') return category.name;
  return CATEGORY_NAMES_KM[category.slug] || category.name_km || category.name;
}

export function localizeProductName(product: Pick<ProductItem, 'name' | 'slug' | 'name_km'> | { name?: string | null; slug?: string | null; name_km?: string | null } | null | undefined, language: Language): string {
  if (!product) return '';
  const name = String(product.name || '');
  if (language !== 'KM') return name;
  return product.name_km || PRODUCT_NAMES_KM[String(product.slug || '')] || PRODUCT_NAMES_BY_ENGLISH[name] || name;
}

export function localizeStoreName(name: string | undefined, language: Language): string {
  if (language !== 'KM' || !name) return name || 'TYUSHOP';
  if (/mega.?commerce flagship store/i.test(name)) return 'ហាង MegaCommerce Flagship';
  if (/tyushop/i.test(name)) return 'ហាង TYUSHOP';
  return name;
}

export function localizeShippingPolicy(policy: string | undefined, language: Language): string {
  if (!policy) return '';
  if (language !== 'KM') return policy;
  if (/free express nationwide delivery in cambodia over \$50/i.test(policy)) return 'ដឹកជញ្ជូនរហ័សទូទាំងកម្ពុជាឥតគិតថ្លៃសម្រាប់ការទិញលើស $50។';
  if (/free|delivery|shipping/i.test(policy)) return 'ដឹកជញ្ជូនរហ័ស និងមានការតាមដាន GPS ទូទាំងប្រទេសកម្ពុជា។';
  return policy;
}


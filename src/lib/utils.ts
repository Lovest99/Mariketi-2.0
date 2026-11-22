import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function generateRef(prefix: string): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-2026-${num}`;
}

export {
  AFRICAN_COUNTRIES,
  AFRICAN_REGIONS,
  AFRICAN_REGION_SUMMARY,
  COUNTRIES_BY_REGION,
  formatLocationWithFlag,
  getCountry,
  getCountryFlag,
  getCountryRegion,
  getDistrictsForProvince,
  getProvincesForCountry,
  type AfricanCountry,
} from './africanCountries';

export const ZIMBABWE_PROVINCES: Record<string, string[]> = {
  'Matabeleland South': ['Gwanda', 'Beitbridge', 'Umzingwane', 'Matobo', 'Insiza', 'Plumtree'],
  'Matabeleland North': ['Lupane', 'Bubi', 'Umguza', 'Hwange', 'Nkayi'],
  'Mashonaland East': ['Marondera', 'Macheke', 'Goromonzi', 'Murehwa', 'Chikomba', 'Wedza'],
  'Mashonaland West': ['Chinhoyi', 'Kadoma', 'Chegutu', 'Makonde', 'Hurungwe', 'Zvimba'],
  'Mashonaland Central': ['Bindura', 'Mazowe', 'Shamva', 'Guruve', 'Mount Darwin'],
  'Midlands': ['Gweru', 'Kwekwe', 'Zvishavane', 'Shurugwi', 'Gokwe South', 'Mvuma'],
  'Masvingo': ['Masvingo', 'Chiredzi', 'Mwenezi', 'Gutu', 'Bikita'],
  'Manicaland': ['Mutare', 'Rusape', 'Chipinge', 'Nyanga', 'Makoni'],
  'Harare': ['Harare', 'Chitungwiza', 'Epworth'],
  'Bulawayo': ['Bulawayo'],
};

export const ASSET_IMAGES = {
  heroCattle: '/src/assets/images/hero_zimbabwe_cattle_1795177648616.jpg',
  brahmanBull: '/src/assets/images/listing_brahman_bull_1795177651029.jpg',
  boerGoats: '/src/assets/images/listing_boer_goats_1795177649420.jpg',
  dorperSheep: '/src/assets/images/listing_dorper_sheep_1795177648995.jpg',
  largeWhitePigs: '/src/assets/images/listing_largewhite_pigs_1795177646468.jpg',
  poultryBroilers: '/src/assets/images/listing_poultry_broilers_1795177649788.jpg',
  fieldAgent: '/src/assets/images/field_verification_agent_1795177647961.jpg',
} as const;

export const BRAND_ASSETS = {
  webLogo: '/assets/aistudio/mariketi-web-logo_bb82d183.png',
  favicon192: '/assets/aistudio/mariketi-favicon-192_a40122c0.png',
  favicon64: '/assets/aistudio/mariketi-favicon-64_95a7d1a6.png',
  favicon32: '/assets/aistudio/mariketi-favicon-32_2e5c0855.png',
} as const;

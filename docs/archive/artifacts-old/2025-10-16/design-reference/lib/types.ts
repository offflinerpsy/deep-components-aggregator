// Backend API types
export interface SearchResult {
  mpn: string
  manufacturer: string
  description: string
  datasheet?: string
  image?: string
  category?: string
  providers: ProviderOffer[]
}

export interface ProviderOffer {
  provider: "mouser" | "digikey" | "tme" | "farnell"
  stock: number
  prices: PriceBreak[]
  url: string
  currency: string
}

export interface PriceBreak {
  quantity: number
  price: number
}

export interface ProductDetails extends SearchResult {
  attributes?: Record<string, string>
  files?: ProductFile[]
}

export interface ProductFile {
  name: string
  url: string
  type: "datasheet" | "manual" | "other"
}

export interface UserOrder {
  id: string
  mpn: string
  manufacturer: string
  quantity: number
  price: number
  status: "pending" | "confirmed" | "shipped" | "delivered"
  createdAt: string
}

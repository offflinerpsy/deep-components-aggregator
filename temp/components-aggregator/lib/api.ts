const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9201"

const MOCK_PRODUCT = {
  mpn: "CRCW06030000Z0EA",
  manufacturer: "Vishay",
  description: "RES 0 OHM JUMPER 1/10W 0603 SMD",
  category: "Resistors",
  images: ["/electronic-component-resistor.jpg", "/electronic-component-chip.jpg"],
  price: 0.15,
  currency: "USD",
  stock: 5000,
  regions: [
    { region: "US", price: 0.15, stock: 5000, leadTime: "2 Days" },
    { region: "EU", price: 0.18, stock: 3000, leadTime: "5 Days" },
    { region: "Global", price: 0.2, stock: 10000, leadTime: "7 Days" },
  ],
  specifications: {
    Packaging: "Tape & Reel",
    Manufacturer: "Vishay",
    "Product Category": "Chip Resistor - Surface Mount",
    RoHS: "RoHS Compliant",
    Resistance: "0 Ohms",
    Tolerance: "Jumper",
    Power: "0.1W, 1/10W",
    Composition: "Thick Film",
    "Temperature Coefficient": "±100ppm/°C",
    "Operating Temperature": "-55°C ~ 155°C",
    "Package / Case": "0603 (1608 Metric)",
    "Supplier Device Package": "0603",
    "Size / Dimension": '0.063" L x 0.031" W (1.60mm x 0.80mm)',
  },
  documents: [{ name: "Datasheet", url: "#" }],
}

const MOCK_VITRINE = [
  { mpn: "BSS138L", manufacturer: "onsemi", description: "MOSFET N-CH 50V 220MA SOT23", price: 0.24 },
  { mpn: "TPS6521903RHBR", manufacturer: "Texas Instruments", description: "PMIC - Power Management", price: 2.68 },
  { mpn: "CRCW06030000Z0EA", manufacturer: "Vishay", description: "RES 0 OHM JUMPER 1/10W 0603", price: 0.15 },
]

export async function getProduct(mpn: string) {
  try {
    const response = await fetch(`${API_URL}/api/product?mpn=${encodeURIComponent(mpn)}`)
    if (!response.ok) throw new Error("Failed to fetch product")
    return response.json()
  } catch (error) {
    console.warn("[v0] API unavailable, using mock data for preview")
    return { ...MOCK_PRODUCT, mpn }
  }
}

export async function getVitrine() {
  try {
    const response = await fetch(`${API_URL}/api/vitrine`)
    if (!response.ok) throw new Error("Failed to fetch vitrine")
    return response.json()
  } catch (error) {
    console.warn("[v0] API unavailable, using mock vitrine data for preview")
    return MOCK_VITRINE
  }
}

export async function createOrder(data: { name: string; phone: string; email: string; mpn: string; quantity: number }) {
  try {
    const response = await fetch(`${API_URL}/api/user/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to create order")
    return response.json()
  } catch (error) {
    console.warn("[v0] API unavailable, simulating order creation")
    return { success: true, orderId: "MOCK-" + Date.now() }
  }
}

export async function getUserOrders() {
  try {
    const response = await fetch(`${API_URL}/api/user/orders`, {
      credentials: "include",
    })
    if (!response.ok) throw new Error("Failed to fetch orders")
    return response.json()
  } catch (error) {
    console.warn("[v0] API unavailable, returning empty orders")
    return []
  }
}

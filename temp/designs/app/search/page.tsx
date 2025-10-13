"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Footer from "@/components/Footer"
import { MicrochipLogo } from "@/components/MicrochipLoader"

const MOCK_RESULTS = [
  {
    mpn: "BSS138",
    manufacturer: "Nexperia",
    description: "MOSFET N-CH 50V 0.22A SOT-23",
    image: "/electronic-component-chip.jpg",
    providers: [
      { provider: "mouser", prices: [{ price: 4.12, quantity: 1 }] },
      { provider: "digikey", prices: [{ price: 3.98, quantity: 1 }] },
    ],
  },
  {
    mpn: "LM317T",
    manufacturer: "Texas Instruments",
    description: "Linear Voltage Regulator IC Positive Adjustable 1.2 V to 37 V 1.5A TO-220-3",
    image: "/electronic-component-chip.jpg",
    providers: [
      { provider: "mouser", prices: [{ price: 23.82, quantity: 1 }] },
      { provider: "tme", prices: [{ price: 21.45, quantity: 1 }] },
    ],
  },
  {
    mpn: "1N4148",
    manufacturer: "onsemi",
    description: "Diodes Incorporated 1N4148 - Fast Switching Diode, 75V, 200mA, DO-35",
    image: "/electronic-component-chip.jpg",
    providers: [{ provider: "digikey", prices: [{ price: 1.34, quantity: 1 }] }],
  },
  {
    mpn: "CRCW06030000Z0EA",
    manufacturer: "Vishay",
    description: "RES 0 OHM JUMPER 1/10W 0603",
    image: "/electronic-component-resistor.jpg",
    providers: [
      { provider: "mouser", prices: [{ price: 0.89, quantity: 1 }] },
      { provider: "digikey", prices: [{ price: 0.76, quantity: 10 }] },
    ],
  },
  {
    mpn: "FT232RL-REEL",
    manufacturer: "FTDI",
    description: "IC USB FS SERIAL UART 28-SSOP",
    image: "/electronic-component-chip.jpg",
    providers: [{ provider: "mouser", prices: [{ price: 134.56, quantity: 1 }] }],
  },
]

export default function SearchPage() {
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)
  const [searchValue, setSearchValue] = useState("транзистор")
  const [priceFrom, setPriceFrom] = useState("")
  const [priceTo, setPriceTo] = useState("")
  const [inStockOnly, setInStockOnly] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sortBy, setSortBy] = useState<"price" | "name" | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const results = MOCK_RESULTS

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Search:", searchValue)
  }

  const handleProductClick = (mpn: string) => {
    router.push(`/product/${encodeURIComponent(mpn)}`)
  }

  const getPriceRange = (providers: any[]) => {
    if (!providers || providers.length === 0) return null
    const allPrices = providers.flatMap((p) => p.prices.map((pr: any) => pr.price))
    return {
      min: Math.min(...allPrices),
      max: Math.max(...allPrices),
      minQty: providers[0]?.prices[0]?.quantity || 1,
    }
  }

  const getRegions = (providers: any[]) => {
    const regionMap: Record<string, string> = {
      mouser: "US",
      digikey: "US",
      tme: "EU",
      farnell: "EU",
    }
    return [...new Set(providers.map((p) => regionMap[p.provider] || "US"))]
  }

  const handleSort = (column: "price" | "name") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    if (!sortBy) return 0
    if (sortBy === "price") {
      const priceA = getPriceRange(a.providers)?.min || 0
      const priceB = getPriceRange(b.providers)?.min || 0
      return sortOrder === "asc" ? priceA - priceB : priceB - priceA
    }
    if (sortBy === "name") {
      return sortOrder === "asc" ? a.mpn.localeCompare(b.mpn) : b.mpn.localeCompare(a.mpn)
    }
    return 0
  })

  return (
    <div className="min-h-screen relative bg-background">
      <header className="glass sticky top-0 z-50 border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => router.push("/")}>
            <MicrochipLogo className="w-10 h-10" />
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => router.push("/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Источники
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors">О нас</button>
          </nav>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setIsDark(!isDark)} className="w-10 h-10 p-0">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </Button>

            <button
              className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span
                className={`w-6 h-0.5 bg-foreground transition-all ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`}
              />
              <span className={`w-6 h-0.5 bg-foreground transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} />
              <span
                className={`w-6 h-0.5 bg-foreground transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}
              />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg">
            <nav className="container mx-auto px-6 py-4 flex flex-col gap-4">
              <button
                onClick={() => {
                  router.push("/")
                  setMobileMenuOpen(false)
                }}
                className="text-left text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Источники
              </button>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-left text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                О нас
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="container mx-auto px-6 py-12 relative z-10">
        <div className="flex justify-center mb-12 fade-in">
          <form onSubmit={handleSearch} className="search-box">
            <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder=" " />
            <button type="reset" onClick={() => setSearchValue("")}></button>
          </form>
        </div>

        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Цена, ₽:</label>
              <input
                type="number"
                placeholder="от"
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                className="w-24 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="number"
                placeholder="до"
                value={priceTo}
                onChange={(e) => setPriceTo(e.target.value)}
                className="w-24 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded border-border text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Только в наличии
              </span>
            </label>

            <div className="ml-auto text-sm text-muted-foreground">
              Найдено: <span className="font-semibold text-foreground">{sortedResults.length}</span> результатов
            </div>
          </div>
        </div>

        <div className="hidden md:block glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Фото
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Производитель
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("name")}
                  >
                    MPN {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Описание
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Регионы
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("price")}
                  >
                    Цена {sortBy === "price" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sortedResults.map((result) => {
                  const priceRange = getPriceRange(result.providers)
                  const regions = getRegions(result.providers)

                  return (
                    <tr
                      key={result.mpn}
                      onClick={() => handleProductClick(result.mpn)}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="w-14 h-14 rounded-lg bg-background flex items-center justify-center border border-border overflow-hidden">
                          <img
                            src={result.image || "/placeholder.svg"}
                            alt={result.mpn}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              const target = e.currentTarget
                              target.style.display = "none"
                              const svg = target.nextElementSibling as HTMLElement
                              if (svg) svg.classList.remove("hidden")
                            }}
                          />
                          <svg
                            className="hidden w-7 h-7 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                          >
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                            <line x1="8" y1="8" x2="16" y2="8" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                            <line x1="8" y1="16" x2="16" y2="16" />
                          </svg>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-sm text-foreground">{result.manufacturer}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {result.mpn}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-muted-foreground max-w-md leading-relaxed line-clamp-3">
                          {result.description}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {regions.map((region) => (
                            <span
                              key={region}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            >
                              {region}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {priceRange && (
                          <div className="text-right">
                            <div className="text-base font-bold text-green-600 dark:text-green-400 tabular-nums">
                              {priceRange.min.toLocaleString("ru-RU", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              ₽
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">от {priceRange.minQty} шт</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleProductClick(result.mpn)
                            }}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
                          >
                            Купить
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-4">
          {sortedResults.map((result) => {
            const priceRange = getPriceRange(result.providers)
            const regions = getRegions(result.providers)

            return (
              <div
                key={result.mpn}
                onClick={() => handleProductClick(result.mpn)}
                className="glass-card rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all"
              >
                <div className="flex gap-4 mb-3">
                  <div className="w-20 h-20 rounded-lg bg-background flex items-center justify-center border border-border overflow-hidden flex-shrink-0">
                    <img
                      src={result.image || "/placeholder.svg"}
                      alt={result.mpn}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = "none"
                        const svg = target.nextElementSibling as HTMLElement
                        if (svg) svg.classList.remove("hidden")
                      }}
                    />
                    <svg
                      className="hidden w-10 h-10 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                    >
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <line x1="8" y1="8" x2="16" y2="8" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                      <line x1="8" y1="16" x2="16" y2="16" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                      {result.mpn}
                    </div>
                    <div className="font-medium text-sm text-foreground mb-1">{result.manufacturer}</div>
                    <div className="flex flex-wrap gap-1">
                      {regions.map((region) => (
                        <span
                          key={region}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        >
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                  {result.description}
                </div>
                <div className="flex items-center justify-between">
                  {priceRange && (
                    <div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                        {priceRange.min.toLocaleString("ru-RU", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ₽
                      </div>
                      <div className="text-xs text-muted-foreground">от {priceRange.minQty} шт</div>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProductClick(result.mpn)
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 active:scale-95"
                  >
                    Купить
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <Footer />
    </div>
  )
}

const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
)

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
)

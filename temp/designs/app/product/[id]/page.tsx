"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Footer from "@/components/Footer"
import { MicrochipLogo } from "@/components/MicrochipLoader"

const MOCK_PRODUCT = {
  mpn: "BSS138",
  manufacturer: "Nexperia",
  description: "MOSFET N-CH 50V 0.22A SOT-23 - N-Channel Enhancement Mode Field-Effect Transistor",
  images: ["/electronic-component-chip.jpg", "/electronic-chip-component.jpg", "/transistor-component.jpg"],
  providers: [
    {
      provider: "Mouser",
      stock: 15420,
      currency: "₽",
      prices: [
        { price: 4.12, quantity: 1 },
        { price: 3.89, quantity: 10 },
        { price: 3.45, quantity: 100 },
      ],
    },
    {
      provider: "Digikey",
      stock: 8934,
      currency: "₽",
      prices: [
        { price: 3.98, quantity: 1 },
        { price: 3.76, quantity: 10 },
        { price: 3.32, quantity: 100 },
      ],
    },
  ],
  attributes: {
    "Package Type": "SOT-23",
    "Voltage - Drain Source": "50V",
    "Current - Continuous Drain": "220mA",
    "Rds On (Max)": "1.5 Ohm @ 10V",
    "Vgs(th) (Max)": "1.5V",
    "Gate Charge (Qg)": "2.7nC @ 10V",
    "Input Capacitance (Ciss)": "35pF @ 25V",
    "Power Dissipation (Max)": "360mW",
    "Operating Temperature": "-55°C ~ 150°C (TJ)",
    "Mounting Type": "Surface Mount",
    "Supplier Device Package": "SOT-23-3",
    "FET Type": "N-Channel",
    "FET Feature": "Logic Level Gate",
    "Drain to Source Voltage (Vdss)": "50V",
    "Gate to Source Voltage (Vgss)": "±20V",
    "Drive Voltage (Max Rds On, Min Rds On)": "10V",
    "Vgs(th) (Min)": "0.8V",
    "Power - Max": "360mW",
    "Rds On (Typ)": "1.2 Ohm @ 10V",
    "Input Capacitance (Ciss) @ Vds": "35pF @ 25V",
    "Reverse Recovery Time (trr)": "-",
    "Operating Temperature Range": "-55°C ~ 150°C (TJ)",
    "Mounting Style": "SMD/SMT",
    "Package / Case": "TO-236-3, SC-59, SOT-23-3",
  },
  files: [
    { name: "Datasheet BSS138.pdf", url: "#", type: "datasheet" },
    { name: "Application Note.pdf", url: "#", type: "manual" },
  ],
}

const MoonIconComponent = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
)

const SunIconComponent = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
)

export default function ProductPage() {
  const router = useRouter()
  const params = useParams()
  const mpn = params.id as string

  const [isDark, setIsDark] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" })
  const [activeTab, setActiveTab] = useState<"specs" | "offers" | "docs">("specs")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const product = MOCK_PRODUCT

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowOrderModal(false)
    alert("Заказ отправлен! Мы свяжемся с вами в ближайшее время.")
  }

  const bestPrice =
    product.providers.length > 0 ? Math.min(...product.providers.flatMap((p) => p.prices.map((pr) => pr.price))) : 0

  const totalStock = product.providers.reduce((sum, p) => sum + p.stock, 0)

  const pdfFiles = product.files || []

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold mb-6">Оформление заказа</h2>
            <form onSubmit={handleOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">ФИО</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Телефон</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="example@mail.com"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all"
                >
                  Отправить заказ
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-all"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {isDark ? <SunIconComponent /> : <MoonIconComponent />}
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

      <main className="flex-1 container mx-auto px-6 py-8 md:py-12 max-w-7xl relative z-10">
        <div className="glass-card rounded-xl p-4 md:p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Image Gallery */}
            <div className="md:col-span-3">
              <div className="aspect-square w-full bg-background rounded-lg flex items-center justify-center border border-border overflow-hidden mb-3">
                <img
                  src={product.images[currentImageIndex] || "/placeholder.svg"}
                  alt={product.mpn}
                  className="w-full h-full object-contain p-4"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                    if (placeholder) placeholder.classList.remove("hidden")
                  }}
                />
                <div className="hidden flex-col items-center justify-center text-muted-foreground">
                  <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 64 64" strokeWidth="1">
                    <rect x="20" y="20" width="24" height="24" rx="2" />
                    <line x1="28" y1="26" x2="36" y2="26" />
                    <line x1="28" y1="30" x2="36" y2="30" />
                    <line x1="28" y1="34" x2="36" y2="34" />
                  </svg>
                  <span className="text-xs">Нет изображения</span>
                </div>
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onMouseEnter={() => setCurrentImageIndex(idx)}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-14 h-14 rounded border-2 transition-all ${
                        currentImageIndex === idx ? "border-blue-500" : "border-border hover:border-blue-300"
                      }`}
                    >
                      <img
                        src={img || "/placeholder.svg"}
                        alt={`${product.mpn} ${idx + 1}`}
                        className="w-full h-full object-contain p-1"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Center: Product Info + Documents */}
            <div className="md:col-span-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">{product.mpn}</h1>

              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Производитель:</span>
                  <span className="font-semibold text-foreground">{product.manufacturer}</span>
                </div>
                <div className="h-4 w-px bg-border hidden md:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Артикул:</span>
                  <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded">
                    {product.mpn}
                  </span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{product.description}</p>

              {pdfFiles.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Документы:</span>
                  {pdfFiles.map((pdf, idx) => (
                    <a
                      key={idx}
                      href={pdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors group"
                      title={pdf.name}
                    >
                      <svg
                        className="w-3.5 h-3.5 text-red-600 dark:text-red-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs font-medium text-red-600 dark:text-red-400 group-hover:underline">
                        PDF
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Price & Buy Block */}
            <div className="md:col-span-3">
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Лучшая цена</div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                    ₽{bestPrice.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">за единицу</div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/30 mb-4">
                  <svg
                    className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    {totalStock.toLocaleString()} шт
                  </span>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium mb-2 text-muted-foreground">Количество</label>
                  <div className="flex items-center gap-0 w-full max-w-[130px]">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors rounded-l border border-r-0 border-border"
                      disabled={quantity <= 1}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                      className="w-[52px] h-9 text-center bg-background border-y border-border text-foreground font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:z-10"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-9 h-9 flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors rounded-r border border-l-0 border-border"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-baseline py-2.5 mb-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">Итого:</span>
                  <span className="text-xl font-bold text-foreground tabular-nums">
                    ₽{(bestPrice * quantity).toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => setShowOrderModal(true)}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] mb-3"
                >
                  Купить
                </button>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <svg
                      className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Быстрая доставка</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <svg
                      className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Гарантия качества</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden" style={{ minHeight: "400px" }}>
          <div className="flex border-b border-border bg-muted/30">
            <button
              onClick={() => setActiveTab("specs")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "specs"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Характеристики
            </button>
            <button
              onClick={() => setActiveTab("offers")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "offers"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Предложения ({product.providers.length})
            </button>
          </div>

          <div className="p-6">
            {activeTab === "specs" && product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="max-h-[600px] overflow-y-auto pr-2">
                <div className="space-y-0">
                  {Object.entries(product.attributes).map(([key, value], idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-[minmax(200px,35%)_1fr] gap-3 md:gap-6 py-3 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <div className="text-sm text-muted-foreground font-medium">{key}</div>
                      <div className="text-sm font-medium text-foreground break-words leading-relaxed">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "offers" && product.providers && product.providers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.providers.map((provider, idx) => (
                  <div
                    key={idx}
                    className="border border-border rounded-lg p-4 hover:border-blue-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-blue-600 dark:text-blue-400 uppercase text-sm">
                        {provider.provider}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{provider.stock.toLocaleString()}</span> шт
                      </div>
                    </div>
                    <div className="space-y-2">
                      {provider.prices.map((price, pidx) => (
                        <div key={pidx} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{price.quantity}+ шт</span>
                          <span className="font-semibold tabular-nums">
                            {price.price.toFixed(2)} {provider.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

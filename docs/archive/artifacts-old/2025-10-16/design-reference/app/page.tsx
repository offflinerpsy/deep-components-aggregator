"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Footer from "@/components/Footer"
import { MicrochipLogo } from "@/components/MicrochipLoader"

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

const ActivityIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
)

const ChipIcon = () => (
  <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" strokeWidth="1.5">
    <rect x="20" y="20" width="24" height="24" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="28" y1="26" x2="36" y2="26" />
    <line x1="28" y1="30" x2="36" y2="30" />
    <line x1="28" y1="34" x2="36" y2="34" />
    <line x1="28" y1="38" x2="36" y2="38" />
    {/* Pins */}
    <line x1="20" y1="24" x2="16" y2="24" />
    <line x1="20" y1="28" x2="16" y2="28" />
    <line x1="20" y1="32" x2="16" y2="32" />
    <line x1="20" y1="36" x2="16" y2="36" />
    <line x1="20" y1="40" x2="16" y2="40" />
    <line x1="44" y1="24" x2="48" y2="24" />
    <line x1="44" y1="28" x2="48" y2="28" />
    <line x1="44" y1="32" x2="48" y2="32" />
    <line x1="44" y1="36" x2="48" y2="36" />
    <line x1="44" y1="40" x2="48" y2="40" />
  </svg>
)

const ConnectorIcon = () => (
  <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" strokeWidth="1.5">
    <rect x="22" y="16" width="20" height="32" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="26" y1="22" x2="38" y2="22" />
    <line x1="26" y1="26" x2="38" y2="26" />
    <line x1="26" y1="30" x2="38" y2="30" />
    <line x1="26" y1="34" x2="38" y2="34" />
    <line x1="26" y1="38" x2="38" y2="38" />
    <line x1="26" y1="42" x2="38" y2="42" />
    <circle cx="28" cy="22" r="1" fill="#3498DB" />
    <circle cx="36" cy="22" r="1" fill="#3498DB" />
    <circle cx="28" cy="26" r="1" fill="#3498DB" />
    <circle cx="36" cy="26" r="1" fill="#3498DB" />
  </svg>
)

const CapacitorIcon = () => (
  <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" strokeWidth="1.5">
    <ellipse cx="32" cy="24" rx="8" ry="4" />
    <line x1="24" y1="24" x2="24" y2="40" />
    <line x1="40" y1="24" x2="40" y2="40" />
    <ellipse cx="32" cy="40" rx="8" ry="4" />
    <line x1="32" y1="16" x2="32" y2="20" />
    <line x1="32" y1="44" x2="32" y2="48" />
    <line x1="28" y1="28" x2="36" y2="28" strokeWidth="0.5" />
    <line x1="28" y1="36" x2="36" y2="36" strokeWidth="0.5" />
  </svg>
)

const ResistorIcon = () => (
  <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" strokeWidth="1.5">
    <rect x="20" y="28" width="24" height="8" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="32" x2="20" y2="32" />
    <line x1="44" y1="32" x2="52" y2="32" />
    {/* Color bands */}
    <line x1="26" y1="28" x2="26" y2="36" stroke="#E74C3C" strokeWidth="2" />
    <line x1="32" y1="28" x2="32" y2="36" stroke="#F39C12" strokeWidth="2" />
    <line x1="38" y1="28" x2="38" y2="36" stroke="#27AE60" strokeWidth="2" />
  </svg>
)

const TransistorIcon = () => (
  <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" strokeWidth="1.5">
    <circle cx="32" cy="32" r="10" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="32" y1="16" x2="32" y2="22" />
    <line x1="32" y1="42" x2="32" y2="48" />
    <line x1="38" y1="28" x2="44" y2="22" />
    <line x1="38" y1="36" x2="44" y2="42" />
    <line x1="26" y1="32" x2="32" y2="32" />
    <path d="M32 28 L36 32 L32 36" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const DiodeIcon = () => (
  <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" strokeWidth="1.5">
    <rect x="22" y="28" width="20" height="8" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="32" x2="22" y2="32" />
    <line x1="42" y1="32" x2="52" y2="32" />
    <line x1="38" y1="28" x2="38" y2="36" strokeWidth="2" />
    <path d="M28 28 L28 36 L34 32 Z" fill="#3498DB" stroke="none" />
  </svg>
)

const SwitchIcon = () => (
  <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" strokeWidth="1.5">
    <rect x="16" y="26" width="32" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="20" y="28" width="8" height="8" rx="1" fill="#3498DB" fillOpacity="0.2" />
    <circle cx="40" cy="32" r="2" fill="none" />
    <line x1="12" y1="32" x2="16" y2="32" />
    <line x1="48" y1="32" x2="52" y2="32" />
  </svg>
)

const MemoryIcon = () => (
  <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" stroke="#3498DB" strokeWidth="1.5">
    <rect x="18" y="18" width="28" height="28" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="26" y1="18" x2="46" y2="18" strokeWidth="0.5" />
    <line x1="32" y1="18" x2="46" y2="18" strokeWidth="0.5" />
    <line x1="38" y1="18" x2="46" y2="18" strokeWidth="0.5" />
    <line x1="18" y1="26" x2="46" y2="26" strokeWidth="0.5" />
    <line x1="18" y1="32" x2="46" y2="32" strokeWidth="0.5" />
    <line x1="18" y1="38" x2="46" y2="38" strokeWidth="0.5" />
    {/* Pins */}
    <line x1="18" y1="22" x2="14" y2="22" />
    <line x1="18" y1="28" x2="14" y2="28" />
    <line x1="18" y1="34" x2="14" y2="34" />
    <line x1="18" y1="40" x2="14" y2="40" />
    <line x1="46" y1="22" x2="50" y2="22" />
    <line x1="46" y1="28" x2="50" y2="28" />
    <line x1="46" y1="34" x2="50" y2="34" />
    <line x1="46" y1="40" x2="50" y2="40" />
  </svg>
)

export default function ComponentsAggregator() {
  const [isDark, setIsDark] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [apiStatus, setApiStatus] = useState<"online" | "offline">("online")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  useEffect(() => {
    const interval = setInterval(() => {
      setApiStatus(Math.random() > 0.1 ? "online" : "offline")
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchValue)}`
    }
  }

  const components = [
    { id: "LM317T", category: "Power Circuits", icon: ChipIcon },
    { id: "M83513/19-E01NW", category: "Connectors", icon: ConnectorIcon },
    { id: "500C122T250BA2B", category: "Capacitors", icon: CapacitorIcon },
    { id: "FT232RL-REEL", category: "Microcontrollers and Processors", icon: ChipIcon },
    { id: "BSS138", category: "Transistors", icon: TransistorIcon },
    { id: "CRCW06030000Z0EA", category: "Resistors", icon: ResistorIcon },
    { id: "1N4148", category: "Diodes", icon: DiodeIcon },
    { id: "ULN2803A", category: "Drivers And Interfaces", icon: ChipIcon },
    { id: "MAX4236EUT+T", category: "Amplifier Circuits", icon: ChipIcon },
    { id: "96BB2-006-F", category: "Switches", icon: SwitchIcon },
    { id: "MWDM2L-9SBSR1T-.110", category: "Connectors", icon: ConnectorIcon },
    { id: "M83513/13-B02NT", category: "Connectors", icon: ConnectorIcon },
    { id: "C4559-6", category: "Terminal Blocks", icon: ConnectorIcon },
    { id: "805-001-16M12-26PA", category: "Connectors", icon: ConnectorIcon },
    { id: "1-178140-3", category: "Connectors", icon: ConnectorIcon },
    { id: "BU931T", category: "Transistors", icon: TransistorIcon },
    { id: "1775690-2", category: "Connectors", icon: ConnectorIcon },
    { id: "EK-V6-ML605-G", category: "Capacitors", icon: CapacitorIcon },
    { id: "DS12C887+", category: "Microcontrollers and Processors", icon: ChipIcon },
    { id: "RS1G-13-F", category: "Diodes", icon: DiodeIcon },
    { id: "LF353N", category: "Amplifier Circuits", icon: ChipIcon },
    { id: "08053C104KAT2A", category: "Capacitors", icon: CapacitorIcon },
    { id: "US1G-13-F", category: "Diodes", icon: DiodeIcon },
    { id: "96BB2-006-F", category: "Switches", icon: SwitchIcon },
    { id: "1N4148", category: "Diodes", icon: DiodeIcon },
    { id: "2N7002", category: "Transistors", icon: TransistorIcon },
    { id: "GRM188R71H104KA93D", category: "Capacitors", icon: CapacitorIcon },
    { id: "5015", category: "Connectors", icon: ConnectorIcon },
    { id: "AT45DB321D-SU", category: "Memory", icon: MemoryIcon },
    { id: "C0805C104K5RACTU", category: "Capacitors", icon: CapacitorIcon },
  ]

  return (
    <div className="min-h-screen relative bg-background">
      <header className="glass sticky top-0 z-50 border-b border-border bg-background">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => (window.location.href = "/")}>
            <MicrochipLogo className="w-10 h-10" />
          </div>

          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-8">
              <button className="text-muted-foreground hover:text-foreground transition-colors">Источники</button>
              <button className="text-muted-foreground hover:text-foreground transition-colors">О нас</button>
            </nav>

            <Button variant="ghost" size="sm" onClick={() => setIsDark(!isDark)} className="w-10 h-10 p-0">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-16 pb-24 px-6 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h1 className={`title-main ${mounted ? "fade-in" : ""}`}>
              Поиск для <span className="gradient-text">Инженеров и Разработчиков</span>
            </h1>

            <p
              className={`text-lg text-muted-foreground mb-8 ${mounted ? "fade-in" : ""}`}
              style={{ animationDelay: "0.2s" }}
            >
              Найдите нужные компоненты быстро и эффективно среди миллионов позиций от ведущих поставщиков
            </p>
          </div>

          <div className={`flex justify-center mb-12 ${mounted ? "fade-in" : ""}`} style={{ animationDelay: "0.4s" }}>
            <form className="search-box" onSubmit={handleSearch}>
              <input type="text" placeholder=" " value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />
              <button type="reset" onClick={() => setSearchValue("")}></button>
            </form>
          </div>

          <p className="text-center text-muted-foreground mb-12 text-sm">
            Поддерживаем номер детали, часть названия, производителя
          </p>

          <div className={`mb-16 ${mounted ? "fade-in" : ""}`} style={{ animationDelay: "0.6s" }}>
            <h2 className="text-2xl font-light text-center mb-8 text-foreground">ЧТО ИЩУТ ЛЮДИ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {components.map((component, index) => {
                const IconComponent = component.icon
                return (
                  <div
                    key={`${component.id}-${index}`}
                    className="component-card cursor-pointer"
                    style={{ animationDelay: `${0.8 + index * 0.02}s` }}
                    onClick={() => (window.location.href = `/product/${encodeURIComponent(component.id)}`)}
                  >
                    <div className="component-icon">
                      <IconComponent />
                    </div>
                    <div className="component-info">
                      <div className="component-id">{component.id}</div>
                      <div className="component-category">Part Category: {component.category}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

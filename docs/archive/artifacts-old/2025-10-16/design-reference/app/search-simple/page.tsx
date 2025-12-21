"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SearchSimple() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // ЗАМЕНИ ЭТУ ФУНКЦИЮ НА СВОЙ API ВЫЗОВ
  const handleSearch = async (searchQuery: string) => {
    setLoading(true)

    try {
      // ТВОЙ КОД ЗДЕСЬ:
      // const response = await fetch(`http://localhost:9201/api/live/search?query=${searchQuery}`)
      // const data = await response.json()
      // setResults(data.results)

      // ВРЕМЕННЫЕ MOCK ДАННЫЕ (УДАЛИ ПОСЛЕ ПОДКЛЮЧЕНИЯ API):
      setResults([
        {
          id: "1",
          mpn: "MWDM2L-9SBSR1T-.110",
          manufacturer: "GLENAIR",
          description: 'D-Sub Micro-D Connector MICR D PCB CON 9SKT CNT W/POST.032" PNL',
          image: null,
          regions: ["EU", "US"],
          prices: [
            { quantity: 1, price: 17666 },
            { quantity: 10, price: 19234 },
            { quantity: 100, price: 21450 },
          ],
        },
      ])
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            ДИПОНИКА
          </Link>
          <nav className="flex gap-6">
            <Link href="/" className="hover:text-primary transition-colors">
              Главная
            </Link>
            <Link href="/about" className="hover:text-primary transition-colors">
              О нас
            </Link>
            <Link href="/contacts" className="hover:text-primary transition-colors">
              Контакты
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="glass rounded-2xl p-6 mb-8 sticky top-20">
          <div className="relative flex items-center gap-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
              placeholder="Поиск компонентов..."
              className="flex-1 bg-transparent border-none outline-none text-lg"
            />
            <button
              onClick={() => handleSearch(query)}
              className="px-8 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-full font-semibold hover:scale-105 transition-transform"
            >
              Найти
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-400">Поиск...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left">Фото</th>
                    <th className="px-6 py-4 text-left">Производитель</th>
                    <th className="px-6 py-4 text-left">MPN</th>
                    <th className="px-6 py-4 text-left">Описание</th>
                    <th className="px-6 py-4 text-left">Регион</th>
                    <th className="px-6 py-4 text-right">Цена</th>
                    <th className="px-6 py-4 text-center">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item) => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-16 h-16 glass rounded-lg flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image || "/placeholder.svg"}
                              alt={item.mpn}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <svg
                              className="w-8 h-8 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 48 48"
                            >
                              <rect x="12" y="12" width="24" height="24" rx="2" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{item.manufacturer}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/product-simple/${item.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {item.mpn}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 max-w-md">{item.description}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {item.regions.map((region: string) => (
                            <span key={region} className="px-2 py-1 glass rounded text-xs">
                              {region}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-lg font-bold text-[#10b981]">
                          {item.prices[0].price.toLocaleString()} ₽
                        </div>
                        <div className="text-xs text-gray-400">от {item.prices[0].quantity} шт</div>
                        {item.prices.length > 1 && (
                          <div className="text-sm text-gray-400 mt-1">
                            до {item.prices[item.prices.length - 1].price.toLocaleString()} ₽
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="px-6 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-lg hover:scale-105 transition-transform">
                          Купить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center text-gray-400">Введите запрос для поиска</div>
        )}
      </div>
    </div>
  )
}

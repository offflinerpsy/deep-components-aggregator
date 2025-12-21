"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function ProductSimple() {
  const params = useParams()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    loadProduct()
  }, [params.id])

  // ЗАМЕНИ ЭТУ ФУНКЦИЮ НА СВОЙ API ВЫЗОВ
  const loadProduct = async () => {
    try {
      // ТВОЙ КОД ЗДЕСЬ:
      // const response = await fetch(`http://localhost:9201/api/product/${params.id}`)
      // const data = await response.json()
      // setProduct(data)

      // ВРЕМЕННЫЕ MOCK ДАННЫЕ (УДАЛИ ПОСЛЕ ПОДКЛЮЧЕНИЯ API):
      setProduct({
        id: params.id,
        mpn: "MWDM2L-9SBSR1T-.110",
        manufacturer: "GLENAIR",
        description: 'D-Sub Micro-D Connector MICR D PCB CON 9SKT CNT W/POST.032" PNL',
        category: "Connectors",
        stock: 656,
        images: [],
        prices: [
          { quantity: 1, price: 17666 },
          { quantity: 10, price: 19234 },
          { quantity: 100, price: 21450 },
        ],
        specs: {
          Категория: "Connectors",
          Производитель: "GLENAIR",
          Тип: "D-Sub Micro-D",
          Контакты: "9 контактов",
        },
        pdfs: [{ name: "Datasheet.pdf", url: "#" }],
      })
    } catch (error) {
      console.error("Load product error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrder = async (formData: any) => {
    // ТВОЙ КОД ДЛЯ ОТПРАВКИ ЗАКАЗА:
    // await fetch('http://localhost:9201/api/orders', {
    //   method: 'POST',
    //   body: JSON.stringify({ ...formData, productId: params.id, quantity })
    // })

    alert("Заказ отправлен!")
    setShowModal(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!product) return <div>Товар не найден</div>

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
            <Link href="/search-simple" className="hover:text-primary transition-colors">
              Поиск
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo & PDF */}
            <div className="glass rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-center h-64 glass rounded-lg">
                  <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <rect x="12" y="12" width="24" height="24" rx="2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Документация</h3>
                  {product.pdfs.map((pdf: any) => (
                    <a
                      key={pdf.name}
                      href={pdf.url}
                      className="flex items-center gap-3 p-3 glass rounded-lg hover:scale-105 transition-transform"
                    >
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>{pdf.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Specs */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Характеристики</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">{key}:</span>
                    <span className="font-medium">{value as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="glass rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold">{product.mpn}</h2>
                <p className="text-sm text-gray-400 mt-2">{product.manufacturer}</p>
              </div>

              <div className="p-4 bg-[#10b981]/10 rounded-lg">
                <div className="text-[#10b981] font-semibold">В наличии: {product.stock} шт</div>
              </div>

              <div className="space-y-2">
                {product.prices.map((price: any) => (
                  <div key={price.quantity} className="flex justify-between p-3 glass rounded-lg">
                    <span>{price.quantity}+ шт</span>
                    <span className="font-bold">{price.price.toLocaleString()} ₽</span>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm mb-2">Количество:</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="1"
                  className="w-full p-3 glass rounded-lg"
                />
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="w-full py-4 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-lg font-semibold hover:scale-105 transition-transform"
              >
                Заказать
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div className="glass p-8 rounded-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-6">Оформление заказа</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleOrder({
                  name: formData.get("name"),
                  phone: formData.get("phone"),
                  email: formData.get("email"),
                })
              }}
              className="space-y-4"
            >
              <input name="name" required placeholder="ФИО" className="w-full p-3 glass rounded-lg" />
              <input name="phone" required placeholder="Телефон" className="w-full p-3 glass rounded-lg" />
              <input name="email" required type="email" placeholder="Email" className="w-full p-3 glass rounded-lg" />
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-lg font-semibold"
              >
                Отправить
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

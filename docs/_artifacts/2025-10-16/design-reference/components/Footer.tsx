export default function Footer() {
  return (
    <footer className="footer">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-lg mb-4">О компании</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  О нас
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Контакты
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Вакансии
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-4">Помощь</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Доставка
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Возврат
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-4">Информация</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Политика конфиденциальности
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Условия использования
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-4">Контакты</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Email: info@diponika.ru</li>
              <li>Тел: +7 (495) 123-45-67</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>© 2025 ДИПОНИКА. Все права защищены.</p>
        </div>
      </div>
    </footer>
  )
}

// compel.ts - адаптер для Compel
import { BaseAdapter } from './base';
import { SearchRow, ProductCanon, ParseResult, DocLink, SpecKV } from '../../types/canon';

export class CompelAdapter extends BaseAdapter {
  constructor() {
    super('compel');
  }
  
  async fetchSearch(query: string): Promise<ParseResult<SearchRow[]>> {
    const searchUrl = this.config.search(query);
    const $ = await this.loadHtml(searchUrl);
    
    if (!$) {
      return { status: 'ERROR', error: 'Failed to load search page' };
    }
    
    const results: SearchRow[] = [];
    const items = $(this.config.selectors.searchItems);
    
    items.each((_, elem) => {
      const $item = $(elem);
      const link = $item.find(this.config.selectors.searchLink).attr('href');
      if (!link) return;
      
      const title = $item.find('.product-title, .item-name, h3').text().trim();
      const mpn = this.extractMpnFromText(title);
      const manufacturer = $item.find(this.config.selectors.manufacturer).text().trim();
      const description = $item.find(this.config.selectors.desc).text().trim();
      const priceText = $item.find(this.config.selectors.price).text();
      const stockText = $item.find(this.config.selectors.stock).text();
      const imageUrl = $item.find('img').attr('src');
      
      const priceData = this.extractPrice(priceText);
      const stock = this.extractStock(stockText);
      
      results.push({
        mpn: mpn || query,
        title: title || mpn || query,
        manufacturer: manufacturer || '',
        description_short: this.truncateDescription(description),
        package: '',
        packaging: '',
        regions: ['RU'],
        stock,
        min_price_rub: priceData?.currency === 'RUB' ? priceData.price : null,
        min_currency: priceData?.currency || null,
        image_url: imageUrl ? this.makeAbsoluteUrl(imageUrl) : null,
        product_url: this.makeAbsoluteUrl(link),
        source: 'compel'
      });
    });
    
    await this.throttle();
    
    return {
      status: results.length > 0 ? 'OK' : 'EMPTY',
      data: results
    };
  }
  
  async fetchProduct(mpnOrUrl: string): Promise<ParseResult<ProductCanon>> {
    const url = mpnOrUrl.startsWith('http') ? mpnOrUrl : this.config.search(mpnOrUrl);
    const $ = await this.loadHtml(url);
    
    if (!$) {
      return { status: 'ERROR', error: 'Failed to load product page' };
    }
    
    // Если это страница поиска, берём первый результат
    if (!mpnOrUrl.startsWith('http')) {
      const firstLink = $(this.config.selectors.searchLink).first().attr('href');
      if (firstLink) {
        const productUrl = this.makeAbsoluteUrl(firstLink);
        const $product = await this.loadHtml(productUrl);
        if ($product) {
          return this.parseProductPage($product, productUrl, mpnOrUrl);
        }
      }
    }
    
    return this.parseProductPage($, url, mpnOrUrl);
  }
  
  private async parseProductPage($: any, url: string, mpn: string): Promise<ParseResult<ProductCanon>> {
    // Основные поля
    const title = $(this.config.selectors.title).first().text().trim();
    const manufacturer = $(this.config.selectors.manufacturer).first().text().trim();
    const description = $(this.config.selectors.desc).html() || '';
    const packageText = $(this.config.selectors.package).first().text().trim();
    const packaging = $(this.config.selectors.packaging).first().text().trim();
    
    // Цена и наличие
    const priceText = $(this.config.selectors.price).first().text();
    const stockText = $(this.config.selectors.stock).first().text();
    const priceData = this.extractPrice(priceText);
    const stock = this.extractStock(stockText);
    
    // Изображения
    const images: { image_url: string }[] = [];
    $(this.config.selectors.images).each((_, img) => {
      const src = $(img).attr('src');
      if (src && !src.includes('no-image')) {
        images.push({ image_url: this.makeAbsoluteUrl(src) });
      }
    });
    
    // Документация - Compel имеет специальные PDF endpoints
    const docs: DocLink[] = [];
    
    // Ищем прямые PDF ссылки
    $(this.config.selectors.pdfLinks).each((_, link) => {
      const href = $(link).attr('href');
      const text = $(link).text().trim();
      if (href) {
        docs.push({
          label: text || 'Datasheet',
          url: this.makeAbsoluteUrl(href)
        });
      }
    });
    
    // Также проверяем специальные infosheets endpoints
    const productId = this.extractProductId(url);
    if (productId) {
      docs.push({
        label: 'Техническая документация',
        url: `${this.config.base}/infosheets/pdf/${productId}`
      });
    }
    
    // Технические характеристики
    const specs: SpecKV[] = [];
    const specTable = $(this.config.selectors.specsTable).first();
    specTable.find(this.config.selectors.specsRows).each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const name = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();
        if (name && value && this.isValidSpec(name)) {
          specs.push({ name, value });
        }
      }
    });
    
    await this.throttle();
    
    const hasContent = title || images.length > 0 || specs.length > 0 || docs.length > 0;
    
    return {
      status: hasContent ? 'OK' : 'EMPTY',
      data: {
        mpn: this.normalizeMpn(mpn),
        title: title || mpn,
        manufacturer: manufacturer || '',
        gallery: images.length > 0 ? images : [{ image_url: '' }],
        meta: {
          package: packageText || '',
          packaging: packaging || ''
        },
        order: {
          regions: ['RU'],
          stock,
          min_price_rub: priceData?.currency === 'RUB' ? priceData.price : null,
          min_currency: priceData?.currency || null
        },
        description_html: this.sanitizeHtml(description),
        docs,
        specs,
        sources: [{
          source: 'compel',
          product_url: url
        }]
      }
    };
  }
  
  private extractMpnFromText(text: string): string {
    const match = text.match(/([A-Z0-9][A-Z0-9\-\/]+)/i);
    return match ? this.normalizeMpn(match[1]) : '';
  }
  
  private extractProductId(url: string): string | null {
    const match = url.match(/\/item\/(\d+)/);
    return match ? match[1] : null;
  }
  
  private isValidSpec(name: string): boolean {
    const invalidNames = ['цена', 'наличие', 'заказ', 'купить', 'корзина'];
    return !invalidNames.some(invalid => name.toLowerCase().includes(invalid));
  }
  
  private sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .trim();
  }
}

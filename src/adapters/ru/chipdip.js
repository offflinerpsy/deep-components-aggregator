import { getHtml } from '../../net/http.js';
import { extractProductHtmlFirst } from '../../parsing/extractProduct.js';

export async function chipdipProductByUrl(url) {
  if (!url || !url.startsWith('http')) return { ok: false, error: 'bad_url' };
  const res = await getHtml(url, {});
  if (!res.ok) return { ok: false, error: 'fetch_fail', status: res.status };
  const ext = await extractProductHtmlFirst(url, res.text, { minFields: 3, allowRender: true });
  if (!ext.ok) return { ok: false, error: ext.error };
  const d = ext.data;
  const product = {
    mpn: '',
    title: d.title,
    description: d.description,
    images: d.images,
    datasheets: d.pdfs,
    technical_specs: d.specs.reduce((acc, it) => (it?.name && it?.value ? (acc[it.name] = it.value, acc) : acc), {}),
    supplier: 'ChipDip',
    url,
    region: 'RU'
  };
  return { ok: true, product, meta: { source: ext.source } };
}

export async function parseChipDip(mpn) {
  const url = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(mpn)}`;
  const result = await chipdipProductByUrl(url);
  if (!result.ok) return { ok: false, source: 'chipdip', reason: result.error };
  
  return {
    ok: true,
    source: 'chipdip',
    priority: 1,
    data: result.product
  };
}
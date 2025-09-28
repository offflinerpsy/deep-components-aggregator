import { load } from 'cheerio';

export const extractProductLinks = (html) => {
  const $ = load(html);
  const arr = [];
  $('a[href*="/product/"], a[href*="/product0/"]').each((_,a)=>{
    const href = $(a).attr('href')||'';
    if (href.includes('/product')) arr.push(new URL(href, 'https://www.chipdip.ru').toString());
  });
  return Array.from(new Set(arr)).slice(0, 20);
};

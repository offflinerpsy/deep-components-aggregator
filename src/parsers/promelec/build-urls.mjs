const HOST = 'https://www.promelec.ru';

export const promelec = {
  searchUrl(q) {
    // У Promelec штатная выдача по тексту: /search/?text=...
    const u = new URL(HOST + '/search/');
    u.searchParams.set('text', q);
    return u.toString();
  },
  // запасной вход — брендовые/категорийные страницы (можно использовать позже)
  host: HOST
};


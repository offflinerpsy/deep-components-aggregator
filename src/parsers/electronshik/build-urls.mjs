const HOST = 'https://www.electronshik.ru';

export const electronshik = {
  searchUrl(q) {
    // Поисковая страница у них открывает «результаты поиска» по строке (SSR).
    // Варианты обычно /search/?text= или /?s= — используем первый и даём fallback.
    const u = new URL(HOST + '/search/');
    u.searchParams.set('text', q);
    return u.toString();
  },
  host: HOST
};


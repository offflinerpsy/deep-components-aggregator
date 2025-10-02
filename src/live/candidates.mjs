export const norm = s =>
  s.normalize("NFKC")
   .trim()
   .toUpperCase()
   .replace(/\s+/g,"")
   .replace(/[._]/g,"-");

// буквы+цифры, длина 3..40, допускаем -,/,+
export const isMPN = s => {
  const t = norm(s);
  return /[A-Z0-9]/.test(t) && /\d/.test(t) && /^[A-Z0-9][A-Z0-9\-\/+]{1,39}$/.test(t);
};

export function decideQueryKind(q) {
  const t = norm(q);
  return isMPN(t) ? "mpn" : "text";
}

export async function candidates(q) {
  const kind = decideQueryKind(q);
  const t = norm(q);
  if (kind === "mpn") {
    // 1) прямая страница товара по поиску сайта (ChipDip)
    return [
      `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(t)}`,
      `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(t.replace(/-/g,""))}`
    ];
  }
  // текстовый — шире, чтобы не оставаться с пустотой
  return [
    `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(q)}`
  ];
}

import { create, insertMultiple, search } from "@orama/orama";

let db;
let sourceItems = [];

function transliterate(text) {
  if (!text) return "";

  const map = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "",
    "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya"
  };

  return text.toLowerCase().split("").map(char => {
    return map[char] || char;
  }).join("");
}

export async function buildIndex(items) {
  sourceItems = items || [];

  db = await create({
    schema: {
      mpn: "string",
      brand: "string",
      title: "string",
      desc: "string",
      regions: "string[]",
      price: "number",
      image: "string",
      sku: "string",
      pkg: "string",
      pkg_type: "string",
      tech_specs: "string[]",
      translit: "string"
    }
  });

  const indexItems = sourceItems.map(p => {
    const textFields = [
      p.mpn || "",
      p.brand || "",
      p.title || "",
      p.desc_short || "",
      p.sku || ""
    ].join(" ");

    const techSpecs = [];
    if (p.specs) {
      for (const [key, value] of Object.entries(p.specs)) {
        techSpecs.push(`${key}: ${value}`);
      }
    }

    return {
      mpn: p.mpn || "",
      brand: p.brand || "",
      title: p.title || "",
      desc: p.desc_short || "",
      regions: p.regions || [],
      price: p.price_min_rub ?? Number.MAX_SAFE_INTEGER,
      image: p.image || "",
      sku: p.sku || "",
      pkg: p.pkg || "",
      pkg_type: p.pkg_type || "",
      tech_specs: techSpecs,
      translit: transliterate(textFields)
    };
  });

  await insertMultiple(db, indexItems);
  return db;
}

export async function searchIndex(q, { limit = 50 } = {}) {
  if (!db) {
    throw new Error("INDEX_NOT_READY");
  }

  const term = String(q || "").trim();
  if (!term) {
    return { hits: [] };
  }

  const translitTerm = transliterate(term);
  const lc = term.toLowerCase();

  // Поиск по точным совпадениям MPN
  const mpnMatches = await search(db, {
    term,
    where: { mpn: term },
    limit: 10
  });

  // Поиск по точным совпадениям SKU
  const skuMatches = await search(db, {
    term,
    where: { sku: term },
    limit: 10
  });

  const exactMatches = {
    count: mpnMatches.count + skuMatches.count,
    hits: [...mpnMatches.hits, ...skuMatches.hits]
  };

  if (exactMatches.count > 0) {
    const exactDocs = exactMatches.hits.map(h => h.document);

    const fuzzyResult = await search(db, {
      term,
      limit: limit + exactDocs.length,
      boost: {
        mpn: 6,
        sku: 5,
        brand: 2,
        title: 1.5,
        desc: 1,
        tech_specs: 1,
        translit: 1.2
      }
    });

    const fuzzyDocs = fuzzyResult.hits
      .map(h => h.document)
      .filter(d => !exactDocs.some(e => e.mpn === d.mpn));

    const merged = [...exactDocs, ...fuzzyDocs].slice(0, limit);

    return {
      count: merged.length,
      hits: merged.map(document => ({ document }))
    };
  }

  const result = await search(db, {
    term,
    limit,
    boost: {
      mpn: 6,
      sku: 5,
      brand: 2,
      title: 1.5,
      desc: 1,
      tech_specs: 1,
      translit: 1.2
    }
  });

  return {
    count: result.count,
    hits: result.hits
  };
}

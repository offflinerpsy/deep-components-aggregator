import { create, insertMultiple, search } from "@orama/orama";

export async function createDb(docs=[]) {
  const db = await create({
    schema: {
      id: "string",
      url: "string",
      title: "string",
      brand: "string",
      sku: "string",
      mpn: "string",
      text: "string"
    }
  });
  if (docs.length) await insertMultiple(db, docs);
  return db;
}

export async function queryDb(db, q) {
  const res = await search(db, {
    term: q,
    properties: ["mpn","sku","brand","title","text"],
    boost: { mpn: 6, sku: 5, brand: 2, title: 1.5, text: 1 }, // поля с бустами
  });
  return res;
}

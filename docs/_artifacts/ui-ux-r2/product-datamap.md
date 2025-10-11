# Product data map — API → UI

- brand, mpn, descShort → hero
- regions[] { code, priceMin, stockTotal } → buy-card and results summary
- specs[] { name, value } → Specs tab (table)
- offers[] { region, price, moq, eta } → Offers tab (pagination 25–50 per page)
- docs[] { title, url } → Docs tab
- queryNorm → normalization badge on /results

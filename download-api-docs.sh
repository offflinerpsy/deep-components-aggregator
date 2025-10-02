#!/bin/bash
# Download full API documentation from all 3 donors

echo "📚 Downloading API Documentation..."
echo "=================================="

mkdir -p /tmp/api-docs

# 1. Mouser API Documentation
echo ""
echo "📦 MOUSER API..."
curl -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://www.mouser.com/api-hub/" -o /tmp/api-docs/mouser-hub.html 2>/dev/null

curl -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://www.mouser.com/pdfdocs/MouserSearchAPI.pdf" -o /tmp/api-docs/mouser-search-api.pdf 2>/dev/null

curl -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://www.mouser.com/api-search" -o /tmp/api-docs/mouser-search.html 2>/dev/null

# Try alternative Mouser docs URLs
curl -L -A "Mozilla/5.0" \
  "https://api.mouser.com/api/docs" -o /tmp/api-docs/mouser-api-docs.html 2>/dev/null

echo "✅ Mouser docs saved"

# 2. TME API Documentation  
echo ""
echo "📦 TME API..."
curl -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://developers.tme.eu/" -o /tmp/api-docs/tme-home.html 2>/dev/null

curl -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://api-doc.tme.eu/" -o /tmp/api-docs/tme-api-doc.html 2>/dev/null

# Try to get TME PDF documentation
curl -L -A "Mozilla/5.0" \
  "https://developers.tme.eu/pdfs/en/api.pdf" -o /tmp/api-docs/tme-api.pdf 2>/dev/null

curl -L -A "Mozilla/5.0" \
  "https://developers.tme.eu/en/how-to-start/download" -o /tmp/api-docs/tme-guide.html 2>/dev/null

echo "✅ TME docs saved"

# 3. Farnell API Documentation
echo ""
echo "📦 FARNELL API..."
curl -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://partner.element14.com/docs/Product_Search_API_REST__Description" -o /tmp/api-docs/farnell-search-api.html 2>/dev/null

curl -L -A "Mozilla/5.0" \
  "https://api.element14.com/docs" -o /tmp/api-docs/farnell-api-docs.html 2>/dev/null

curl -L -A "Mozilla/5.0" \
  "https://www.element14.com/community/docs/DOC-76275/l/restful-api-information" -o /tmp/api-docs/farnell-rest-api-info.html 2>/dev/null

echo "✅ Farnell docs saved"

# List downloaded files
echo ""
echo "📋 Downloaded files:"
echo "==================="
ls -lh /tmp/api-docs/

echo ""
echo "📊 File sizes:"
du -h /tmp/api-docs/*

echo ""
echo "✅ All documentation downloaded!"
echo ""
echo "Now extracting text content..."
echo "=============================="

# Extract text from HTML files
for file in /tmp/api-docs/*.html; do
    if [ -f "$file" ]; then
        basename="$(basename "$file" .html)"
        echo ""
        echo "📄 $basename:"
        echo "---"
        # Use lynx or w3m if available, otherwise grep
        if command -v lynx &> /dev/null; then
            lynx -dump -nolist "$file" | head -200 > "/tmp/api-docs/${basename}.txt"
        elif command -v w3m &> /dev/null; then
            w3m -dump "$file" | head -200 > "/tmp/api-docs/${basename}.txt"
        else
            grep -oP '(?<=>)[^<]+(?=<)' "$file" | grep -v '^[[:space:]]*$' | head -200 > "/tmp/api-docs/${basename}.txt"
        fi
        head -100 "/tmp/api-docs/${basename}.txt"
    fi
done

echo ""
echo "🎉 DONE! All docs in /tmp/api-docs/"

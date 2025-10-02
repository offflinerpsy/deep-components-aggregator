import requests
from html.parser import HTMLParser

class SpecCounter(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_specs_list = False
        self.in_li = False
        self.specs = []
        self.current_spec = ""
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'ul' and attrs_dict.get('id') == 'technicalSpecsList':
            self.in_specs_list = True
        elif tag == 'li' and self.in_specs_list:
            self.in_li = True
            self.current_spec = ""
    
    def handle_endtag(self, tag):
        if tag == 'ul' and self.in_specs_list:
            self.in_specs_list = False
        elif tag == 'li' and self.in_li:
            self.in_li = False
            if self.current_spec.strip():
                self.specs.append(self.current_spec.strip())
    
    def handle_data(self, data):
        if self.in_li:
            self.current_spec += data

print("Loading product page HTML...")
response = requests.get('http://5.129.228.88:9201/product.html?mpn=M83513/19-E01NW')
html = response.text

parser = SpecCounter()
parser.feed(html)

print(f"\n✅ Found {len(parser.specs)} specifications on page!")
print("\nAll specifications:")
for i, spec in enumerate(parser.specs, 1):
    # Clean up the spec text
    spec_clean = ' '.join(spec.split())
    print(f"   {i}. {spec_clean}")

if len(parser.specs) >= 15:
    print(f"\n🎉 SUCCESS! Page shows {len(parser.specs)} specifications (target was 15-20+)")
else:
    print(f"\n⚠️  Only {len(parser.specs)} specifications (expected 15-20+)")

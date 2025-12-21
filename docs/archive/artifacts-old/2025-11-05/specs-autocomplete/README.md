# Autocomplete Tests - Component Specs Search

## Test 1: Resistor 0603 100k
```bash
curl 'http://localhost:9201/api/autocomplete?q=0603%20100k'
```

✅ specsDetected: true
✅ Suggestions: 10
✅ Latency: 0ms
✅ Cached: true

## Test 2: SMD 10uF
```bash
curl 'http://localhost:9201/api/autocomplete?q=smd%2010uF'
```

✅ specsDetected: true
✅ Suggestions: 10

## Test 3: TO-220
```bash
curl 'http://localhost:9201/api/autocomplete?q=TO-220'
```

✅ specsDetected: true
✅ Suggestions: 10

## Parsed Specs Example (0603 100k):
```json
{
  "package": "0603",
  "resistance": {
    "value": 100000,
    "unit": "Ω",
    "type": "resistance"
  },
  "capacitance": null,
  "voltage": null,
  "tolerance": null,
  "power": null,
  "componentType": null,
  "material": null,
  "transistorType": null,
  "tokens": [],
  "raw": "0603 100k"
}
```


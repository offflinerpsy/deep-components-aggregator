import Ajv from 'ajv';

export const allowedRegions = new Set(['RU','EU','US','ASIA']);

export function nonEmptyStr(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

export const canonSchema = {
  type: 'object',
  required: ['mpn','pricing','availability'],
  properties: {
    mpn: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    images: { type: 'array', items: { type: 'string' } },
    datasheets: { type: 'array', items: { type: 'string' } },
    manufacturer: { type: 'string' },
    package: { type: 'string' },
    packaging: { type: 'string' },
    technical_specs: { type: 'object', additionalProperties: { type: ['string','number'] } },
    availability: {
      type: 'object', required: ['inStock'],
      properties: { inStock: { type: 'number' } }
    },
    regions: { type: 'array', items: { type: 'string' } },
    pricing: {
      type: 'array',
      items: {
        type: 'object',
        required: ['qty','price','currency','price_rub'],
        properties: {
          qty: { type: 'number' }, price: { type: 'number' },
          currency: { type: 'string' }, price_rub: { type: 'number' }
        }
      }
    }
  },
  additionalProperties: true
} as const;

export function mkAjv() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(canonSchema);
  return validate;
}

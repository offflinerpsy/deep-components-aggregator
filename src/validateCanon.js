import Ajv from 'ajv/dist/2020.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaProduct = JSON.parse(fs.readFileSync(path.join(__dirname, 'schemas/product-canon.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(schemaProduct);

export function validateCanon(obj) {
  const ok = validate(obj);
  return ok ? { ok: true } : { ok: false, errors: validate.errors };
}

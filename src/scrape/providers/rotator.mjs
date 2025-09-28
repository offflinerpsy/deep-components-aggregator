import fs from 'node:fs';
import path from 'node:path';

const stPath = path.resolve('data/state/usage.json');
const rd = () => fs.existsSync(stPath) ? JSON.parse(fs.readFileSync(stPath,'utf8')) : {bee:[],api:[],bot:[]};
const wr = (obj) => (fs.mkdirSync(path.dirname(stPath),{recursive:true}), fs.writeFileSync(stPath, JSON.stringify(obj,null,2)));

const load = (name) => {
  const p = path.resolve(`secrets/apis/${name}.txt`);
  return fs.existsSync(p) ? fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean) : [];
};

export const pick = (kind) => {
  const keys = load(kind);
  if (!keys.length) return null;
  const usage = rd();
  if (!usage[kind]?.length) usage[kind] = keys.map(k => ({k, used:0}));
  // align with actual keys
  const set = new Map(usage[kind].map(x=>[x.k,x]));
  keys.forEach(k=> set.has(k) || usage[kind].push({k,used:0}));
  usage[kind] = usage[kind].filter(x=> keys.includes(x.k));

  usage[kind].sort((a,b)=> a.used - b.used);
  const chosen = usage[kind][0];
  chosen.used += 1;
  wr(usage);
  return chosen.k;
};

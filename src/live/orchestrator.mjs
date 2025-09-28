import {get as bee} from '../scrape/providers/scrapingbee.mjs';
import {get as sapi} from '../scrape/providers/scraperapi.mjs';
import {get as bot} from '../scrape/providers/scrapingbot.mjs';
import {extractProductLinks} from '../parsers/chipdip/listing.mjs';
import {toCanon} from '../parsers/chipdip/product.mjs';
import {insertProduct, upsertOffer} from '../db/sqlite.mjs';
import pLimit from 'p-limit';
import {fetch} from 'undici';

const lim = pLimit(4); // общая конкуренция (берём мягко)

const providers = [bee, sapi, bot];

const hit = async (url) => {
  const fn = providers[Math.floor(Math.random()*providers.length)];
  const r = await fn(url);
  if (r.status !== 'ok') return {ok:false};
  return {ok:true, html:r.html, provider:r.provider};
};

export const plan = async (q, emit, deadlineMs=12000) => {
  const start = Date.now();
  const qTrim = (q||'').trim();
  if (!qTrim) return;

  // 1) если похоже на MPN/артикул — сразу бьём в карточку по поиску чипдипа
  const searchUrl = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(qTrim)}`;
  const r0 = await hit(searchUrl);
  if (r0.ok) {
    const links = extractProductLinks(r0.html);
    for (const url of links) {
      if (Date.now()-start > deadlineMs) return;
      await lim(async ()=>{
        const r1 = await hit(url);
        if (!r1.ok) return;
        const canon = toCanon(r1.html, url);
        const pid = insertProduct(canon);
        canon.offers?.forEach(o => upsertOffer(pid, {...o, provider:r1.provider}));
        emit({type:'item', item:{...canon, id: pid}});
      })();
    }
  }

  // 2) если ничего не пришло — мягкая добивка (страница каталога/вариации)
  if (Date.now()-start < deadlineMs && (!r0.ok)) {
    const alt = `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(qTrim)}&page=2`;
    const rA = await hit(alt);
    if (rA.ok) {
      extractProductLinks(rA.html).slice(0,10).forEach(async url=>{
        if (Date.now()-start > deadlineMs) return;
        await lim(async ()=>{
          const rB = await hit(url);
          if (!rB.ok) return;
          const canon = toCanon(rB.html, url);
          const pid = insertProduct(canon);
          canon.offers?.forEach(o => upsertOffer(pid, {...o, provider:rB.provider}));
          emit({type:'item', item:{...canon, id: pid}});
        })();
      });
    }
  }
};

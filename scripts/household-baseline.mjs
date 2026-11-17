import {gunzipSync} from 'node:zlib';
// This encrypted Actions secret is read only by the sync job, never by the browser.
export function decodeHouseholdBaseline(encoded,geo){
 if(!encoded)throw Error('HOUSEHOLD_BASELINE_GZIP is required; preserving the published snapshot.');
 const seed=JSON.parse(gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:8000000}).toString('utf8'));
 if(seed.version!==1||!Array.isArray(seed.records)||!Number.isInteger(seed.submissions)||!Number.isInteger(seed.duplicatesRemoved)||seed.submissions<seed.records.length)throw Error('Invalid household baseline');
 const ids=new Set(geo.rows.map(r=>r.id)),keys=new Set(['sourceId','type','tikinaId','entityKey','submissionKey','observedAt','rain','bore','noWater','reduced','shortage','population','affected','ageSex']);
 for(const r of seed.records){
  if(Object.keys(r).some(k=>!keys.has(k))||r.sourceId!=='households'||r.type!=='household'||!ids.has(r.tikinaId)||!/^[a-f0-9]{24}$/.test(r.entityKey)||r.submissionKey!==null&&!/^[a-f0-9]{24}$/.test(r.submissionKey)||!Number.isFinite(new Date(r.observedAt).getTime()))throw Error('Invalid baseline identity');
  for(const k of ['rain','bore','shortage'])if(typeof r[k]!=='boolean')throw Error('Invalid baseline signal');
  for(const k of ['noWater','reduced'])if(r[k]!==null&&typeof r[k]!=='boolean')throw Error('Invalid baseline availability');
  for(const k of ['population','affected'])if(r[k]!==null&&(!Number.isInteger(r[k])||r[k]<0||r[k]>100))throw Error('Invalid baseline population');
  if(r.ageSex!==null){if(Object.keys(r.ageSex).some(k=>!['female','male'].includes(k)))throw Error('Invalid baseline age fields');for(const k of ['female','male'])if(!Array.isArray(r.ageSex[k])||r.ageSex[k].length!==4||r.ageSex[k].some(v=>!Number.isInteger(v)||v<0||v>100))throw Error('Invalid baseline age counts');if([...r.ageSex.female,...r.ageSex.male].reduce((a,b)=>a+b,0)!==r.population)throw Error('Inconsistent baseline ages');}
 }
 return seed;
}

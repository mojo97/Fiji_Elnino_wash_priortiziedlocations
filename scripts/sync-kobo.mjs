// Node 22+. Tokens remain in process memory; raw submissions are never written.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dataDir=new URL('../docs/data/',import.meta.url);
const read=async n=>JSON.parse(await fs.readFile(new URL(n,dataDir),'utf8'));
const text=v=>v===null||v===undefined?'':String(v).trim();
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,20);
export const mappedBool=(v,m)=>{if(v===null||v===undefined||v==='')return null;const s=text(v);if(m.trueValues.includes(s))return true;if(m.falseValues.includes(s))return false;return null;};
export function normalize(row,source,mapping,crosswalk={},allowCoords=false){
 const val=k=>row[mapping.fields[k]], rawCommunity=text(val('communityKey'));
 const communityKey=crosswalk[`${source.id}:${rawCommunity}`]||rawCommunity;
 if(!communityKey)throw Error('missing community key');
 const date=new Date(val('observedAt'));if(!Number.isFinite(date.getTime())||date>Date.now()+86400000)throw Error('invalid observation date');
 const rawEntity=text(val('entityKey'));if(!rawEntity)throw Error('missing entity key');
 const name=text(val('name'));if(!name)throw Error('missing location name');
 const o={sourceId:source.id,type:source.type,entityKey:hash(`${source.id}|${rawEntity}`),communityKey,name,province:text(val('province')),pcode:text(val('pcode')),observedAt:date.toISOString(),noWater:mappedBool(val('noWater'),mapping.noWater),rainwaterMain:mappedBool(val('rainwaterMain'),mapping.rainwaterMain)};
 // Only a reviewed community/facility geopoint may be exposed. Never household GPS.
 if(allowCoords&&source.type!=='household'&&mapping.fields.geopoint){const [lat,lon]=text(val('geopoint')).split(/\s+/).map(Number);if(Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180){o.lat=lat;o.lon=lon;}}
 return o;
}
export function aggregateHouseholds(records){
 // Latest response for each hashed household within this source, then group by community/day.
 const entities=new Map();for(const r of records){const old=entities.get(r.entityKey);if(!old||r.observedAt>old.observedAt)entities.set(r.entityKey,r);}
 const groups=new Map();for(const r of entities.values()){const day=r.observedAt.slice(0,10),key=`${r.communityKey}|${day}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 return [...groups.entries()].map(([key,rs])=>{const r=rs[0],tri=k=>rs.some(x=>x[k]===true)?true:rs.every(x=>x[k]===false)?false:null;return {sourceId:r.sourceId,type:'household',entityKey:hash(r.communityKey),communityKey:r.communityKey,name:r.communityKey,province:r.province,pcode:r.pcode,observedAt:rs.map(x=>x.observedAt).sort().at(-1),noWater:tri('noWater'),rainwaterMain:tri('rainwaterMain'),reportCount:rs.length};});
}
async function allSubmissions(uid,token){
 let url=`https://kf.kobotoolbox.org/api/v2/assets/${encodeURIComponent(uid)}/data/?format=json&limit=1000`,records=[],seen=new Set();
 while(url){const u=new URL(url);if(u.origin!=='https://kf.kobotoolbox.org'||!u.pathname.startsWith(`/api/v2/assets/${uid}/data/`))throw Error('Unsafe pagination URL');if(seen.has(url))throw Error('Repeated pagination URL');seen.add(url);
 const response=await fetch(url,{headers:{Authorization:`Token ${token}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error(`Kobo HTTP ${response.status}`);const d=await response.json();if(!Array.isArray(d.results))throw Error('Unexpected Kobo response');records.push(...d.results);if(records.length>500000)throw Error('Safety limit exceeded');url=d.next?new URL(d.next,u).href:null;
 }return records;
}
function checkMapping(m){for(const k of ['communityKey','entityKey','name','observedAt','noWater','rainwaterMain'])if(!m?.fields?.[k])throw Error(`Missing reviewed field mapping: ${k}`);for(const k of ['noWater','rainwaterMain'])if(!Array.isArray(m[k]?.trueValues)||!Array.isArray(m[k]?.falseValues)||m[k].trueValues.some(x=>m[k].falseValues.includes(x)))throw Error(`Invalid coded answer mapping: ${k}`);}
export async function sync(){
 const config=await read('connections.json'),token=process.env.KOBO_TOKEN;
 const enabled=config.sources.filter(s=>s.enabled);if(!enabled.length)throw Error('No reviewed Kobo sources are enabled. Existing snapshot preserved.');if(!token)throw Error('KOBO_TOKEN secret is missing. Existing snapshot preserved.');
 const prior=await read('assessments.json');let records=[],sources=[],issues=[];
 for(const source of config.sources){if(!source.enabled){sources.push({id:source.id,status:'not_connected'});continue;}
 try{if(!/^a[A-Za-z0-9]+$/.test(source.assetUid))throw Error('Invalid/missing asset UID');const m=config.fieldMappings[source.id];checkMapping(m);const raw=await allSubmissions(source.assetUid,token),normalized=[];let rejected=0;
 for(const row of raw)try{normalized.push(normalize(row,source,m,config.crosswalk,config.publication?.allowCommunityCoordinates===true));}catch{rejected++;}
 if(rejected)issues.push(`${source.id}: ${rejected} records rejected for missing keys, names or dates; review mapping.`);
 records.push(...(source.type==='household'?aggregateHouseholds(normalized):normalized));sources.push({id:source.id,status:rejected?'partial':'ok',fetchedAt:new Date().toISOString(),submissionCount:raw.length,rejectedCount:rejected});
 }catch(error){records.push(...prior.records.filter(r=>r.sourceId===source.id));sources.push({id:source.id,status:'error',lastSuccess:prior.sources.find(s=>s.id===source.id)?.fetchedAt||null});issues.push(`${source.id}: ${error.message}. Previous records retained.`);}
 }
 const status=sources.some(s=>['error','partial'].includes(s.status))?'partial':sources.some(s=>s.status==='not_connected')?'partial':'ok';
 const result={generatedAt:new Date().toISOString(),status,sources,records,issues};const path=new URL('assessments.json',dataDir),tmp=new URL('assessments.tmp.json',dataDir);await fs.writeFile(tmp,JSON.stringify(result,null,2));await fs.rename(tmp,path);
 console.log(`Wrote sanitised snapshot: ${records.length} records; status ${status}.`);
 if(sources.some(s=>s.status==='error'))process.exitCode=1;
}

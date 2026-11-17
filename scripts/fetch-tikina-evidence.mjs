import fs from 'node:fs/promises';
import {forms,normalizeResponses,aggregateForPublication,mergeHouseholds} from './kobo-analysis.mjs';
import {decodeHouseholdBaseline} from './household-baseline.mjs';
import {validatePublicAggregate} from './public-aggregate.mjs';
const publicMode=process.env.PUBLIC_SAFE_MODE==='true';
if(process.env.GITHUB_ACTIONS==='true'&&process.env.PRIVATE_REPOSITORY!=='true'&&!publicMode)throw Error('Assessment processing requires a private repository.');
const root=new URL('../',import.meta.url),geo=JSON.parse(await fs.readFile(new URL('docs/data/tikinas.json',root),'utf8'));
const headers={Accept:'application/json',...(process.env.KOBO_TOKEN?{Authorization:`Token ${process.env.KOBO_TOKEN}`}:{})};
async function get(url){const u=new URL(url);if(u.origin!=='https://kf.kobotoolbox.org')throw Error('Unexpected Kobo origin');const r=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`Kobo HTTP ${r.status}`);return r.json();}
let records=[],sources=[];for(const form of forms){try{const meta=await get(`https://kf.kobotoolbox.org/api/v2/assets/${form.uid}/?format=json`);let raw=[],url=`https://kf.kobotoolbox.org/api/v2/assets/${form.uid}/data/?format=json&limit=1000`,seen=new Set();while(url){if(!url.startsWith(`https://kf.kobotoolbox.org/api/v2/assets/${form.uid}/data/`)||seen.has(url))throw Error('Invalid pagination URL');seen.add(url);const d=await get(url);if(!Array.isArray(d.results))throw Error('Invalid submission response');raw.push(...d.results);if(raw.length>500000)throw Error('Submission limit');url=d.next;}
 const result=normalizeResponses(form,raw,meta.content,geo.rows);records.push(...result.records);sources.push({id:form.id,name:form.name,status:'ok',fetchedAt:new Date().toISOString(),submissions:raw.length,retained:result.records.length,duplicatesRemoved:result.duplicatesRemoved,issues:result.issues});console.log(`${form.id}: ${raw.length} submissions; ${result.records.length} latest records retained.`);
 }catch(e){sources.push({id:form.id,name:form.name,status:'error',error:e.message});}}
// Fail closed: do not replace a complete published analysis with partial data.
if(sources.some(s=>s.status==='error'))throw Error('One or more forms failed. Existing evidence preserved. Review source access; no raw response contents were logged.');
const seed=decodeHouseholdBaseline(process.env.HOUSEHOLD_BASELINE_GZIP,geo);
const live=records.filter(r=>r.sourceId==='households'),merged=mergeHouseholds(seed.records,live);
records=records.filter(r=>r.sourceId!=='households').concat(merged.records);
const householdSource=sources.find(s=>s.id==='households');
householdSource.submissions+=seed.submissions;householdSource.retained=merged.records.length;householdSource.duplicatesRemoved+=seed.duplicatesRemoved+merged.duplicatesRemoved;
for(const [key,value] of Object.entries(seed.issues))householdSource.issues[key]=(householdSource.issues[key]||0)+value;
console.log(`Unified household dataset: ${merged.records.length} households; ${merged.duplicatesRemoved} cross-input repeats removed.`);
if(!publicMode){await fs.mkdir(new URL('data/',root),{recursive:true});await fs.writeFile(new URL('data/private-evidence.json',root),JSON.stringify({generatedAt:new Date().toISOString(),sources,records},null,2));}
let aggregate=aggregateForPublication(records,sources);
aggregate=validatePublicAggregate(aggregate,geo);await fs.writeFile(new URL(publicMode?'docs/data/tikina-evidence.json':'data/tikina-evidence.json',root),JSON.stringify(aggregate,null,2));
if(!publicMode&&process.env.DASHBOARD_TOKEN){const target='mojo97/Fiji_Elnino_wash_priortiziedlocations',path='docs/data/tikina-evidence.json',url=`https://api.github.com/repos/${target}/contents/${path}`,h={Authorization:`Bearer ${process.env.DASHBOARD_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};const old=await fetch(url,{headers:h});if(!old.ok)throw Error(`Public aggregate lookup HTTP ${old.status}`);const prior=await old.json();const response=await fetch(url,{method:'PUT',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({message:'Refresh Tikina-level WASH assessment aggregates',sha:prior.sha,content:Buffer.from(JSON.stringify(aggregate,null,2)).toString('base64')})});if(!response.ok)throw Error(`Aggregate publication HTTP ${response.status}`);console.log('Published only the Tikina aggregate.');}else console.log(publicMode?'Wrote Tikina aggregates only. No individual records persisted.':'Aggregate prepared privately. Add DASHBOARD_TOKEN to enable automatic aggregate publication.');

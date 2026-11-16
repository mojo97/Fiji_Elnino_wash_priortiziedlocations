// Explicit allowlist: never copy the docs directory wholesale into a public artifact.
import fs from 'node:fs/promises';
import {validatePublicAggregate} from './public-aggregate.mjs';
const root=new URL('../',import.meta.url),source=new URL('docs/',root),target=new URL('public/',root);
await fs.mkdir(new URL('data/',target),{recursive:true});await fs.mkdir(new URL('assets/',target),{recursive:true});
// Refuse a dirty output folder rather than risking a previously copied private snapshot.
const allowedRoot=new Set(['data','assets','index.html','style.css','app.mjs','core.mjs','tikina.mjs','tikina-core.mjs']);
for(const n of await fs.readdir(target))if(!allowedRoot.has(n))throw Error(`Unexpected public output entry: ${n}`);
const jsonFiles=['islands.json','jmp-context.json','methodology.json','provenance.json','rainfall.json','tikinas.json','tikina-evidence.json'];
validatePublicAggregate(JSON.parse(await fs.readFile(new URL('data/tikina-evidence.json',source),'utf8')),JSON.parse(await fs.readFile(new URL('data/tikinas.json',source),'utf8')));
for(const n of jsonFiles)await fs.copyFile(new URL('data/'+n,source),new URL('data/'+n,target));
for(const n of ['style.css','app.mjs','core.mjs','tikina.mjs','tikina-core.mjs'])await fs.copyFile(new URL(n,source),new URL(n,target));
for(const n of ['communities relying on rainwater or ran out of water.png','communities relying on rainwater or ran out of water_Map.png'])await fs.copyFile(new URL('assets/'+n,source),new URL('assets/'+n,target));
let html=await fs.readFile(new URL('index.html',source),'utf8');
html=html.replace('RESPONSE TEAM WORKSPACE','PUBLIC AGGREGATE VIEW').replace('Access must be enforced by your hosting provider.','Kobo response records are excluded from this public site.').replace('Find vulnerable locations. Verify current needs. Direct support.','Explore Tikina water vulnerability, official 2026 population and current Kobo assessment aggregates.');
await fs.writeFile(new URL('index.html',target),html);
const write=async(n,x)=>fs.writeFile(new URL('data/'+n,target),JSON.stringify(x,null,2));
await write('assessments.json',{generatedAt:null,status:'public_aggregate',sources:[],records:[],issues:['PUBLIC AGGREGATE VIEW: incoming Kobo responses are kept private and are never included in this deployment. Only reviewed Tikina-level assessment aggregates are published. Individual records remain private.']});
await write('baseline-communities.json',[]);
await write('connections.json',{sources:[],fieldMappings:{},crosswalk:{},publication:{allowCommunityCoordinates:false}});
const allowedData=new Set([...jsonFiles,'assessments.json','baseline-communities.json','connections.json']);
for(const n of await fs.readdir(new URL('data/',target)))if(!allowedData.has(n))throw Error(`Unexpected public data file: ${n}`);
const expectedAssets=new Set(['communities relying on rainwater or ran out of water.png','communities relying on rainwater or ran out of water_Map.png']);
for(const n of await fs.readdir(new URL('assets/',target)))if(!expectedAssets.has(n))throw Error(`Unexpected public asset: ${n}`);
const result=JSON.parse(await fs.readFile(new URL('data/assessments.json',target),'utf8'));if(result.records.length)throw Error('Public response exclusion failed');
console.log('Public aggregate artifact built. Kobo responses, field mappings, form links, community baselines and credentials excluded.');

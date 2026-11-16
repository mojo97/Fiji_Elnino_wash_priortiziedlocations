import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
test('public artifact excludes private responses, baseline matches and connection mappings',async()=>{
 const fixture=await fs.mkdtemp(path.join(os.tmpdir(),'fiji-public-qa-'));
 await fs.cp(new URL('../docs/',import.meta.url),path.join(fixture,'docs'),{recursive:true});
 await fs.mkdir(path.join(fixture,'scripts'));for(const n of ['build-public.mjs','public-aggregate.mjs'])await fs.copyFile(new URL('./'+n,import.meta.url),path.join(fixture,'scripts',n));
 const sentinel='PRIVATE_RESPONSE_SENTINEL_739201';
 for(const name of ['assessments','connections','baseline-communities'])await fs.writeFile(path.join(fixture,'docs','data',name+'.json'),JSON.stringify({privateSentinel:sentinel,records:[{name:sentinel}]}));
 execFileSync(process.execPath,[path.join(fixture,'scripts','build-public.mjs')]);
 const snapshot=JSON.parse(await fs.readFile(path.join(fixture,'public','data','assessments.json'),'utf8'));assert.deepEqual(snapshot.records,[]);assert.equal(snapshot.status,'public_aggregate');
 for(const name of await fs.readdir(path.join(fixture,'public','data'))){const content=await fs.readFile(path.join(fixture,'public','data',name),'utf8');assert.ok(!content.includes(sentinel),name+' leaked private data');}
 const aggPath=path.join(fixture,'docs','data','tikina-evidence.json'),bad=JSON.parse(await fs.readFile(aggPath,'utf8'));bad.groups[0].respondent=sentinel;await fs.writeFile(aggPath,JSON.stringify(bad));assert.throws(()=>execFileSync(process.execPath,[path.join(fixture,'scripts','build-public.mjs')],{stdio:'pipe'}));
 // Fixture remains in OS temp for inspection; no user/source files are modified.
});

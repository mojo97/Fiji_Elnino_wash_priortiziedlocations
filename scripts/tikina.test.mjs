import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeResponses,aggregateForPublication,forms} from './kobo-analysis.mjs';import {summariseTikinas} from '../docs/tikina-core.mjs';
const t={id:'ba|tavua',tikina:'Tavua',province:'Ba',population2026:1000};const schema={survey:[{name:'Province',select_from_list_name:'p'},{name:'tikina',select_from_list_name:'t'}],choices:[{list_name:'p',name:'ba',label:['Ba']},{list_name:'t',name:'tavua',label:['Tavua']}]};const r={'g/Province':'ba','g/tikina':'tavua','g/community':'QA Village',start:'2026-11-15','g/source_type':'borehole','g/supply_status':'reduced','g/community_population':100,'g/people_affected':70,'assessor/email':'private@example.org'};
test('population reports deduplicate repeated community sources and omit personal details',()=>{const a=normalizeResponses(forms.find(f=>f.id==='community'),[r,{...r,start:'2026-11-16','g/people_affected':60}],schema,[t]);assert.equal(a.records.length,1);assert.equal(a.records[0].affected,60);assert.equal(a.records[0].bore,true);assert.equal(a.records[0].rain,false);assert.ok(!JSON.stringify(a).includes('private@example'));const pub=aggregateForPublication(a.records,[]);assert.ok(!JSON.stringify(pub).includes('QA Village'));assert.ok(!JSON.stringify(pub).includes('entityKey'));assert.equal(pub.groups[0].affectedReported,60);});
test('impossible affected counts and unmatched Tikina are exposed rather than guessed',()=>{const a=normalizeResponses(forms.find(f=>f.id==='community'),[{...r,'g/people_affected':150}],schema,[t]);assert.equal(a.records[0].affected,null);assert.equal(a.issues.invalidPopulation,1);const b=normalizeResponses(forms[0],[{...r,'g/tikina':'unmatched'}],schema,[t]);assert.equal(b.records.length,0);assert.equal(b.issues.unmatchedTikina,1);});
test('borehole plus dry conditions alone is Watch, verified shortage raises High',()=>{const m={freshDays:30,rainFreshDays:45,rainThreshold:60,rainDeficitWeight:20,rainwaterWeight:25,noWaterWeight:60,boreholeWeight:15,highThreshold:60,mediumThreshold:25,criticalNoWater:true};const evidence={groups:[{tikinaId:t.id,sourceId:'community',type:'community',observedDate:'2026-11-15',reports:1,bore:1,dependent:1,dependentShortage:0}]};const rain=[{PCODE:'FJ201',date:'2026-11-01',r3h:40,r3h_avg:100}];assert.equal(summariseTikinas({rows:[t]},evidence,rain,m,new Date('2026-11-16'))[0].priority,'Watch');evidence.groups[0].dependentShortage=1;evidence.groups[0].shortage=1;assert.equal(summariseTikinas({rows:[t]},evidence,rain,m,new Date('2026-11-16'))[0].priority,'High');});
test('2026 population never becomes affected population just because it is dry',()=>{const a=summariseTikinas({rows:[t]},{groups:[]},[{PCODE:'FJ201',date:'2026-11-01',r3h:30,r3h_avg:100}],{freshDays:30,rainFreshDays:45,rainThreshold:60,rainDeficitWeight:20},new Date('2026-11-16'))[0];assert.equal(a.reportedAffected,null);assert.equal(a.householdAffected,null);assert.equal(a.priority,'Assessment gap');});
test('additional household cohort contributes signals without adding its members to API members',()=>{
 const m={freshDays:30,rainFreshDays:45,rainThreshold:60,rainDeficitWeight:20,rainwaterWeight:25,noWaterWeight:60,boreholeWeight:15,highThreshold:60,mediumThreshold:25,criticalNoWater:true};
 const base={tikinaId:t.id,type:'household',observedDate:'2026-11-15',reports:5,householdPopulationCoverage:5,householdMembersAffected:20};
 const e={groups:[{...base,sourceId:'households'},{...base,sourceId:'household_export',householdMembersAffected:30,bore:5,dependent:5,dependentShortage:5,shortage:5}]};
 const a=summariseTikinas({rows:[t]},e,[{PCODE:'FJ201',date:'2026-11-01',r3h:40,r3h_avg:100}],m,new Date('2026-11-16'))[0];
 assert.equal(a.householdAffected,20);assert.equal(a.supplementAffected,30);assert.equal(a.householdReports,5);assert.equal(a.supplementReports,5);assert.equal(a.priority,'High');
 e.groups[1].observedDate='2020-01-01';const b=summariseTikinas({rows:[t]},e,[],m,new Date('2026-11-16'))[0];assert.equal(b.supplementReports,0);assert.equal(b.householdAffected,20);
});
test('sometimes and never enough drinking water are shortage signals even with normal source supply',()=>{
 const form=forms.find(f=>f.id==='households'),hh={...r,'g/household_code':'TEST-1','g/consent':'yes','g/source_now':'borehole','g/source_supply':'normal','g/enough_all':'sometimes'};
 for(const key of ['f_5','f_17','f_59','f_60','m_5','m_17','m_59','m_60'])hh['g/'+key]=1;
 const a=normalizeResponses(form,[hh],schema,[t]);assert.equal(a.records[0].shortage,true);assert.equal(a.records[0].affected,8);assert.equal(a.records[0].noWater,false);
});
test('older household totals fill missing age breakdowns without treating blank ages as zero',()=>{
 const form=forms.find(f=>f.id==='households'),hh={...r,'g/household_code':'TEST-2','g/consent':'yes','g/source_now':'rainwater','g/source_supply':'reduced','g/hh_female':3,'g/hh_male':2};
 const a=normalizeResponses(form,[hh],schema,[t]);assert.equal(a.records[0].population,5);assert.equal(a.records[0].affected,5);assert.equal(a.issues.populationFromTotals,1);
 delete hh['g/hh_male'];const b=normalizeResponses(form,[hh],schema,[t]);assert.equal(b.records[0].population,null);assert.equal(b.issues.missingPopulation,1);
});

test('age pyramid keeps complete counts, deduplicates households and suppresses fewer than five complete breakdowns',async()=>{
 const {validatePublicAggregate}=await import('./public-aggregate.mjs');
 const form=forms.find(f=>f.id==='households'),hh={...r,'g/consent':'yes','g/source_now':'borehole','g/source_supply':'reduced'};
 for(const k of ['f_5','f_17','f_59','f_60','m_5','m_17','m_59','m_60'])hh['g/'+k]=1;
 const raw=Array.from({length:5},(_,i)=>({...hh,'g/household_code':'HH'+i}));raw.push({...raw[0],start:'2026-11-16'});
 const a=normalizeResponses(form,raw,schema,[t]);assert.equal(a.records.length,5);
 const pub=aggregateForPublication(a.records,[]);const small=pub.groups.find(g=>g.observedDate==='2026-11-16');assert.equal(small.ageFemale,null);assert.equal(small.ageSuppressed,true);
 const all=aggregateForPublication(a.records.map(x=>({...x,observedAt:'2026-11-16T00:00:00Z'})),[]);assert.deepEqual(all.groups[0].ageFemale,[5,5,5,5]);assert.deepEqual(all.groups[0].ageMale,[5,5,5,5]);assert.equal(all.groups[0].ageHouseholds,5);validatePublicAggregate(all,{rows:[t]});
 const bad=structuredClone(pub);bad.groups[0].ageFemale=[1,1,1,1];assert.throws(()=>validatePublicAggregate(bad,{rows:[t]}));
 delete hh['g/f_5'];hh['g/hh_female']=4;hh['g/hh_male']=4;const missing=normalizeResponses(form,[{...hh,'g/household_code':'missing'}],schema,[t]);assert.equal(missing.records[0].population,8);assert.equal(missing.records[0].ageSex,null);
});

test('age pyramid respects selected Tikina, source and freshness without combining household cohorts',async()=>{
 const {summariseAgeSex}=await import('../docs/tikina-core.mjs');
 const g={tikinaId:t.id,sourceId:'households',type:'household',observedDate:'2026-11-16',reports:6,ageHouseholds:5,ageFemale:[1,2,3,4],ageMale:[4,3,2,1]};
 const d={groups:[g,{...g,sourceId:'household_export',ageFemale:[20,20,20,20]},{...g,observedDate:'2026-01-01'},{...g,tikinaId:'other'}]};
 const a=summariseAgeSex(d,t.id,'households',30,new Date('2026-11-17'));assert.deepEqual(a.female,[1,2,3,4]);assert.equal(a.reports,6);assert.equal(a.publishedHouseholds,5);
 const b=summariseAgeSex(d,t.id,'household_export',30,new Date('2026-11-17'));assert.deepEqual(b.female,[20,20,20,20]);
});

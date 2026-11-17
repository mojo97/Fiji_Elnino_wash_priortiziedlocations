export function summariseTikinas(geo,evidence,rain,method,now=new Date()){
 const provinceCodes={ba:'FJ201',bua:'FJ102',cakaudrove:'FJ103',kadavu:'FJ304',lau:'FJ305',lomaiviti:'FJ306',macuata:'FJ107',nadroganavosa:'FJ208',naitasiri:'FJ409',namosi:'FJ410',ra:'FJ211',rewa:'FJ412',serua:'FJ413',tailevu:'FJ414',rotuma:'FJ315'};
 return geo.rows.map(t=>{
  const pcode=provinceCodes[t.province.toLowerCase().replace(/[^a-z]/g,'')],p=rain.find(x=>x.PCODE===pcode);
  const ratio=p&&Number(p.r3h_avg)>0?100*Number(p.r3h)/Number(p.r3h_avg):null,age=p?(now-new Date(p.date))/86400000:Infinity;
  const dry=ratio!==null&&age>=-1&&age<=method.rainFreshDays&&ratio<method.rainThreshold;
  const groups=evidence.groups.filter(g=>g.tikinaId===t.id),fresh=groups.filter(g=>{const a=(now-new Date(g.observedDate))/86400000;return a>=-1&&a<=method.freshDays;});
  const api=fresh.filter(g=>g.sourceId!=='household_export'),supp=fresh.filter(g=>g.sourceId==='household_export'),community=api.filter(g=>['community','kii'].includes(g.sourceId)),hh=api.filter(g=>g.type==='household'),fac=api.filter(g=>['school','health'].includes(g.type));
  const sum=(k,gs=api)=>gs.reduce((n,g)=>n+(Number(g[k])||0),0),relevant=community.concat(hh),signals=relevant.concat(supp),has=k=>sum(k,signals)>0;
  // Signal presence can raise priority; household person counts from separate cohorts never add together.
  const score=Math.min(100,(has('noWater')?method.noWaterWeight:0)+(has('rain')?method.rainwaterWeight:0)+(has('bore')?(method.boreholeWeight??15):0)+(has('shortage')&&!has('noWater')?(method.shortageWeight??30):0)+(dry?method.rainDeficitWeight:0));
  const priority=has('noWater')&&method.criticalNoWater?'Urgent':score>=method.highThreshold&&(has('dependentShortage')||has('noWater'))?'High':dry&&has('dependent')&&score>=method.mediumThreshold?'Watch':fresh.length?'Verify':'Assessment gap';
  return {...t,pcode,rainRatio:ratio,rainDate:p?.date,rainQuality:p?.version,rainFresh:age>=-1&&age<=method.rainFreshDays,dry,score,priority,
   reports:sum('reports'),allReports:sum('reports',groups),rainReports:sum('rain',relevant),boreReports:sum('bore',relevant),dependentReports:sum('dependent',relevant),shortageReports:sum('shortage',relevant),dependentShortage:sum('dependentShortage',relevant),noWaterReports:sum('noWater',relevant),
   reportedAffected:sum('affectedReportedCoverage')?sum('affectedReported'):null,affectedCoverage:sum('affectedReportedCoverage'),householdAffected:sum('householdPopulationCoverage',hh)?sum('householdMembersAffected',hh):null,householdReports:sum('reports',hh),
   supplementReports:sum('reports',supp),supplementAllReports:sum('reports',groups.filter(g=>g.sourceId==='household_export')),supplementRain:sum('rain',supp),supplementBore:sum('bore',supp),supplementDependent:sum('dependent',supp),supplementShortages:sum('shortage',supp),supplementDependentShortage:sum('dependentShortage',supp),supplementNoWater:sum('noWater',supp),supplementAffected:sum('householdPopulationCoverage',supp)?sum('householdMembersAffected',supp):null,
   schoolReports:sum('reports',fac.filter(g=>g.type==='school')),healthReports:sum('reports',fac.filter(g=>g.type==='health')),facilityShortages:sum('shortage',fac),unknownSupply:sum('unknownSupply'),latestObservation:fresh.length?fresh.map(g=>g.observedDate).sort().at(-1):null};
 });
}
export function summariseAgeSex(evidence,tikinaId,sourceId,freshDays,now=new Date()){
 const groups=evidence.groups.filter(g=>g.tikinaId===tikinaId&&g.sourceId===sourceId&&g.type==='household'&&(now-new Date(g.observedDate))/86400000>=-1&&(now-new Date(g.observedDate))/86400000<=freshDays);
 const visible=groups.filter(g=>Array.isArray(g.ageFemale)&&Array.isArray(g.ageMale));
 const sum=k=>groups.reduce((s,g)=>s+(g[k]||0),0);
 return {reports:sum('reports'),complete:sum('ageHouseholds'),publishedHouseholds:visible.reduce((s,g)=>s+g.ageHouseholds,0),suppressed:groups.filter(g=>g.ageSuppressed).reduce((s,g)=>s+g.ageHouseholds,0),female:[0,1,2,3].map(i=>visible.reduce((s,g)=>s+g.ageFemale[i],0)),male:[0,1,2,3].map(i=>visible.reduce((s,g)=>s+g.ageMale[i],0))};
}

export const daysOld=(date,now=new Date())=>{const d=new Date(date);return Number.isFinite(d.getTime())?(now-d)/86400000:Infinity;};
export function validateMethod(m){const limits={freshDays:[1,365],rainFreshDays:[1,365],noWaterWeight:[0,100],rainwaterWeight:[0,100],historyWeight:[0,100],rainDeficitWeight:[0,100],rainThreshold:[0,200],highThreshold:[1,100],mediumThreshold:[0,99]};for(const [k,[lo,hi]]of Object.entries(limits))if(typeof m[k]!=='number'||!Number.isFinite(m[k])||m[k]<lo||m[k]>hi)throw Error(`Invalid ${k}: must be ${lo}–${hi}`);if(m.mediumThreshold>=m.highThreshold)throw Error('High threshold must exceed medium threshold');if(typeof m.criticalNoWater!=='boolean')throw Error('criticalNoWater must be true or false');return m;}
export function classify(r,m,rain,baseline=[],now=new Date()){
 const age=daysOld(r.observedAt,now),fresh=age>=-1&&age<=m.freshDays;
 const b=baseline.find(x=>x.communityKey===r.communityKey),p=rain.find(x=>x.PCODE===r.pcode);
 const rainAge=p?daysOld(p.date,now):Infinity,ratio=p&&Number(p.r3h_avg)>0?100*Number(p.r3h)/Number(p.r3h_avg):null;
 const dry=ratio!==null&&rainAge>=-1&&rainAge<=m.rainFreshDays&&ratio<m.rainThreshold;
 const reasons=[];let score=0;
 if(fresh&&r.noWater===true){score+=m.noWaterWeight;reasons.push('Recent water-unavailable report');}
 if(r.rainwaterMain===true){score+=m.rainwaterWeight;reasons.push('Rainwater is main drinking source');}
 if(b?.historicalNoWater===true){score+=m.historyWeight;reasons.push('Historical shortage baseline matched');}
 if(dry){score+=m.rainDeficitWeight;reasons.push('Area rainfall below configured threshold');}
 score=Math.min(100,score);
 let priority=!fresh?'Needs update':r.noWater===null||r.noWater===undefined?'Verify data':m.criticalNoWater&&r.noWater===true?'Urgent':score>=m.highThreshold?'High':score>=m.mediumThreshold?'Watch':'Lower';
 return {...r,score,priority,fresh,reasons,baselineMatched:!!b,ratio,rainDate:p?.date||null,age};
}
export function latestEntities(records){const map=new Map();for(const r of records){const key=[r.sourceId,r.type,r.entityKey].join('|');const old=map.get(key);if(!old||new Date(r.observedAt)>new Date(old.observedAt))map.set(key,r);}return [...map.values()];}
export const longitude=l=>l<0?l+360:l;

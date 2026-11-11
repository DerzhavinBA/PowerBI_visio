'use strict';
const styles=Object.freeze([
 {value:'striped',displayName:'Вертикальная штриховка'},
 {value:'solid',displayName:'Сплошная заливка'},
 {value:'diagonal',displayName:'Диагональная штриховка'},
 {value:'dashed',displayName:'Пунктирная линия'},
 {value:'dotted',displayName:'Точечная линия'}
]);
const defaults=Object.freeze({show:true,color:'#808080',style:'striped',showMarker:true,showLabel:false,autoThickness:true,lineThickness:6,autoMarkerSize:true,markerSize:24,markerWidth:2,markerSameColor:true,markerColor:'#808080'});
function color(value,fallback=defaults.color){
 const s=value?.solid?.color??value;if(typeof s!=='string')return fallback;
 const trimmed=s.trim();
 const hex=/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(trimmed);
 const named=/^(black|white|red|green|blue|gray|grey|silver|maroon|purple|fuchsia|lime|olive|yellow|navy|teal|aqua|orange|transparent)$/i.test(trimmed);
 const css=typeof CSS!=='undefined'&&CSS.supports?.('color',trimmed)&&!/(var\(|currentcolor|inherit|initial|unset)/i.test(trimmed);
 return hex||named||css?trimmed:fallback;
}
function bounded(value,min,max,fallback){return typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,Math.round(value))):fallback;}
function settings(objects){const o=objects?.forecast||{};return {...defaults,...o,color:color(o.color),markerColor:color(o.markerColor),style:styles.some(s=>s.value===o.style)?o.style:defaults.style,
 lineThickness:bounded(o.lineThickness,1,64,defaults.lineThickness),markerSize:bounded(o.markerSize,4,96,defaults.markerSize),markerWidth:bounded(o.markerWidth,1,16,defaults.markerWidth)};}
function date(value){
 if(value===null||value===undefined||value==='')return null;
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)){
  const [y,m,d]=value.split('-').map(Number),v=new Date(y,m-1,d);
  return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d?v:null;
 }
 if(typeof value!=='string'&&typeof value!=='number'&&!(value instanceof Date))return null;
 const d=new Date(value);return Number.isFinite(+d)?d:null;
}
function ordinal(d){return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000;}
function endBoundary(d,hour){const r=new Date(d);if(!hour&&r.getHours()===0&&r.getMinutes()===0&&r.getSeconds()===0)r.setHours(23,59,59,0);return r;}
function normalize(startValue,planValue,value,hour=false){
 if(value===null||value===undefined||value==='')return null;
 const start=date(startValue),plan=date(planValue),end=date(value);
 if(!start||!plan||!end)return {error:'Некорректная дата начала, плана или прогноза'};
 const normalizedPlan=endBoundary(plan,hour),normalizedEnd=endBoundary(end,hour);
 if(normalizedEnd<start)return {error:'Прогноз раньше даты начала работы'};
 const days=ordinal(end)-ordinal(plan),delta=+normalizedEnd-+normalizedPlan;
 return {start,plan:normalizedPlan,end:normalizedEnd,days,kind:delta>0?'late':delta<0?'early':'equal'};
}
function collect(categorical,host,config=defaults,hour=false){
 const cols=categorical?.categories||[],find=r=>cols.find(c=>c.source.roles?.[r]);
 const measure=categorical?.values?.find(c=>c.source.roles?.forecastColor);
 const fc=find('forecastEnd'),from=find('froms'),to=find('tos'),item=find('items');
 const records=new Map(),warnings=[],conflicts=new Set();
 if(!fc||!from||!to)return {records,warnings};
 if(fc.source.type&&!fc.source.type.dateTime)return {records,warnings:['Поле прогноза должно иметь тип Дата или Дата/время; выберите саму дату, не иерархию.']};
 fc.values.forEach((value,i)=>{
  const record=normalize(from.values[i],to.values[i],value,hour);if(!record)return;
  const label=String(item?.values[i]??('Строка '+(i+1)));
  if(record.error){warnings.push(label+': '+record.error);return;}
  const identity=host.createSelectionIdBuilder().withCategory(to,i).createSelectionId(),key=identity.getKey();
  if(conflicts.has(key))return;
  if(records.has(key)){records.delete(key);conflicts.add(key);warnings.push(label+': неоднозначная идентичность работы; уточните детализацию данных');return;}
  const rowColor=cols.map(c=>c.objects?.[i]?.forecast?.color).find(v=>v!=null);
  const lineColor=color(measure?.values[i],color(rowColor,config.color));
  const rowMarkerColor=cols.map(c=>c.objects?.[i]?.forecast?.markerColor).find(v=>v!=null);
  const markerColor=config.markerSameColor!==false?lineColor:color(rowMarkerColor,config.markerColor);
  records.set(key,{...record,identity,color:lineColor,markerColor,label});
 });return {records,warnings};
}
function layout(plan,end,min,max,kind){return {x:Math.max(min,Math.min(max,plan)),width:kind==='late'?Math.max(0,Math.min(end,max)-Math.max(plan,min)):0,marker:end>=min&&end<=max?end:null};}
function tooltip(r,locale='ru-RU'){
 const fmt=d=>d.toLocaleDateString(locale);
 return [{displayName:'Начало',value:fmt(r.start)},{displayName:'Окончание план',value:fmt(r.plan)},{displayName:'Окончание прогноз',value:fmt(r.end)},{displayName:'Отклонение от плана',value:(r.days>0?'+':'')+r.days+' дн.'}];
}
module.exports={styles,defaults,color,settings,date,normalize,collect,layout,tooltip};

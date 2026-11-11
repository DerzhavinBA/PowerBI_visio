'use strict';
const forecast=require('./forecast.cjs');
// InstancesOnly = 1 in powerbi-visuals-utils-dataviewutils; no aggregate forecasts.
const wildcard={data:[{dataViewWildcard:{matchingOption:1}}]};
const sections=[
 ['timeline','Шкала и календарь',['zooming','xAxeFormat','tmhiCalendar']],
 ['bars','Работы',['textValues']],
 ['hierarchy','Иерархия и порядок',['leftAxis','groups','subgroups','wrapping','sorting','tmhiSort']],
 ['labels','Подписи и столбцы',['labels','additionalColumn']],
 ['colors','Цвета и легенда',['legend','groupColors','msColorCategories','colorCategories','msColorRanges','colorRanges','targetCategoryColors','categoryMap']],
 ['markers','Маркеры и вехи',['milestones','todayLine','targetLine','tmhiCurrent','tmhiLevel']],
 ['interaction','Взаимодействия',['enableTooltip','tmhiPanel']],
 ['advanced','Дополнительно',['licenseNo','tmhi']]
];
const common={
 zooming:['showInVisualZoom','verticalZoom','verticalZoomByItemSize','verticalZoomItemSize','horizontalZoom','horizontalZoomByPeriod','horizontalZoomPeriod','focusOnToday'],
 xAxeFormat:['show','position','showTop','includeWeekends','markWeekends','weekendMarkColor','tickInterval','format','fontSize'],
 textValues:['show','mainBar','barShape','colorBy','defaultColorA','showPlans','showText','barsOffset'],
};
function slice(objectName,propertyName,spec,value,instance={},uid){
 const descriptor={objectName,propertyName};
 if(instance.selector!=null)descriptor.selector=instance.selector;
 if(instance.altConstantValueSelector!==undefined)descriptor.altConstantValueSelector=instance.altConstantValueSelector;
 const kind=instance.propertyInstanceKind?.[propertyName];if(kind!==undefined)descriptor.instanceKind=kind;
 const properties={descriptor,value},type=spec.type||{},valid=instance.validValues?.[propertyName];let control;
 if(type.fill){control='ColorPicker';properties.value={value:forecast.color(value)};}
 else if(Array.isArray(valid)||Array.isArray(type.enumeration)){
  control='Dropdown';properties.items=(Array.isArray(valid)?valid:type.enumeration).map(v=>typeof v==='object'?{value:v.value,displayName:v.displayName||String(v.value)}:{value:v,displayName:String(v)});
  properties.value=properties.items.find(v=>v.value===value)||{value,displayName:String(value??'')};
 }else if(type.bool)control='ToggleSwitch';
 else if(type.numeric||type.integer){control='NumUpDown';const range=valid?.numberRange;
  if(range){properties.options={};if(range.min!==undefined)properties.options.minValue={type:0,value:range.min};if(range.max!==undefined)properties.options.maxValue={type:1,value:range.max};}
 }else if(type.text){control='TextInput';properties.placeholder='';}
 else return null;
 return {uid:uid||`${objectName}.${propertyName}`,displayName:spec.displayName||instance.displayName||propertyName,description:spec.description,control:{type:control,properties}};
}
function forecastCard(objects,bound){
 const s=forecast.settings(objects),bool=name=>({displayName:name,type:{bool:true}}),number=name=>({displayName:name,type:{numeric:true}});
 const dax='Через fx выберите значение поля и DAX-меру с цветом #RRGGBB.';
 const specs={
  color:{displayName:'Цвет линии прогноза',description:dax+' Поле «Цвет прогноза (DAX)» имеет приоритет.',type:{fill:{solid:{color:true}}}},
  style:{displayName:'Вид линии прогноза',type:{enumeration:forecast.styles}},
  autoThickness:bool('Автоматическая толщина линии'),lineThickness:number('Толщина линии (пикс.)'),
  showMarker:bool('Маркер прогнозной даты'),autoMarkerSize:bool('Автоматическая высота маркера'),
  markerSize:number('Высота маркера (пикс.)'),markerWidth:number('Толщина маркера (пикс.)'),markerSameColor:bool('Маркер — цвет линии'),
  markerColor:{displayName:'Цвет маркера',description:dax,type:{fill:{solid:{color:true}}}},
  showLabel:bool('Подпись прогнозной даты')
 };
 specs.lineThickness.description='1–64 пикс. Ограничивается высотой основной полосы.';
 specs.markerSize.description='4–96 пикс. Ограничивается высотой строки.';
 specs.markerWidth.description='1–16 пикс.';
 const ranges={lineThickness:{min:1,max:64},markerSize:{min:4,max:96},markerWidth:{min:1,max:16}};
 const hidden=new Set();if(s.autoThickness)hidden.add('lineThickness');
 if(s.autoMarkerSize)hidden.add('markerSize');if(s.markerSameColor)hidden.add('markerColor');
 if(!s.showMarker)for(const key of ['autoMarkerSize','markerSize','markerWidth','markerSameColor','markerColor'])hidden.add(key);
 const slices=Object.entries(specs).filter(([key])=>!hidden.has(key)).map(([key,spec])=>{
  const instance={};if(bound&&(key==='color'||key==='markerColor'))Object.assign(instance,{selector:wildcard,altConstantValueSelector:null,propertyInstanceKind:{[key]:3}});
  if(ranges[key])instance.validValues={[key]:{numberRange:ranges[key]}};
  return slice('forecast',key,spec,s[key],instance);
 });
 const toggle=slice('forecast','show',bool('Показывать прогноз'),s.show);toggle.suppressDisplayName=true;delete toggle.displayName;delete toggle.description;
 return {uid:'forecast',displayName:'Прогноз завершения',description:bound?'Продолжение до прогноза; ранняя дата отмечается внутри полосы.':'Добавьте поле «Прогнозная дата завершения» в данные визуала.',topLevelToggle:toggle,groups:s.show?[{uid:'forecast.appearance',displayName:'Оформление',slices}]:[],revertToDefaultDescriptors:['show',...Object.keys(specs)].map(propertyName=>({objectName:'forecast',propertyName})).concat(bound?['color','markerColor'].map(propertyName=>({objectName:'forecast',propertyName,selector:wildcard})):[])};
}
function build(capabilities,enumerate,objects={},bound=false){
 const cards=sections.map(([uid,displayName])=>({uid,displayName,groups:[],revertToDefaultDescriptors:[]}));
 for(const [objectName,definition]of Object.entries(capabilities.objects)){
  if(objectName==='forecast')continue;
  const result=enumerate({objectName});if(!result)continue;
  const instances=Array.isArray(result)?result:result.instances||[],containers=result.containers||[];
  const ci=sections.findIndex(s=>s[2].includes(objectName)),card=cards[ci<0?cards.length-1:ci];
  // Include all properties in reset, including currently hidden conditional controls.
  for(const propertyName of Object.keys(definition.properties))card.revertToDefaultDescriptors.push({objectName,propertyName});
  const group={uid:objectName,displayName:definition.displayName||objectName,slices:[],collapsible:true};
  const items=new Map();
  instances.forEach((instance,index)=>{
   const slices=[];
   for(const [key,value]of Object.entries(instance.properties||{})){
    const spec=definition.properties[key];if(!spec||value===undefined)continue;
    const result=slice(objectName,key,spec,value,instance,`${objectName}.${key}.${index}`);if(result)slices.push(result);
    card.revertToDefaultDescriptors.push({objectName,propertyName:key,...(instance.selector?{selector:instance.selector}:{})});
   }
   if(instance.containerIdx!==undefined||instance.selector){
    const key=instance.containerIdx!==undefined?`c${instance.containerIdx}`:`i${index}`;
    if(!items.has(key))items.set(key,{uid:objectName+'.'+key,displayName:containers[instance.containerIdx]?.displayName||instance.displayName||definition.displayName||String(index+1),slices:[]});
    items.get(key).slices.push(...slices);
   }else group.slices.push(...slices);
  });
  if(items.size){group.container={uid:objectName+'.container',displayName:group.displayName,containerItems:[...items.values()]};group.sliceWithContainer=group.slices.length>0;}
  const primary=common[objectName];
  const extra=primary?group.slices.filter(s=>!primary.includes(s.control.properties.descriptor.propertyName)):[];
  if(extra.length)group.slices=group.slices.filter(s=>primary.includes(s.control.properties.descriptor.propertyName));
  if(group.slices.length||items.size)card.groups.push(group);
  if(extra.length)card.groups.push({uid:objectName+'.advanced',displayName:group.displayName+' — дополнительно',collapsible:true,slices:extra});
 }
 return {cards:[...cards.slice(0,2).filter(c=>c.groups.length),forecastCard(objects,bound),...cards.slice(2).filter(c=>c.groups.length)]};
}
module.exports={build,slice,wildcard};

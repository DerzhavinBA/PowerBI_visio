'use strict';
const forecast=require('./forecast.cjs'),formatting=require('./formatting.cjs'),{render}=require('./render.cjs');
let nextId=0;
function attach(visual,options,capabilities){
 let latest,config=forecast.defaults,records=new Map(),disposed=false;
 const prefix='tmhi-forecast-'+(++nextId),doc=options.element.ownerDocument;
 const warning=doc.createElement('details');warning.className='forecast-warning';warning.hidden=true;
 const summary=doc.createElement('summary');summary.setAttribute('aria-live','polite');const body=doc.createElement('div');warning.append(summary,body);options.element.append(warning);
 const reset=doc.createElement('button');reset.type='button';reset.className='tmhi-reset-settings';reset.textContent='Вернуть стандартные настройки';reset.hidden=true;
 reset.title='Сбросить оформление графика. Привязки данных, лицензия и сворачивание сохраняются.';
 options.element.append(reset);
 reset.onclick=function(event){
  event.stopPropagation();if(disposed||reset.hidden)return;
  const unique=new Map();
  const add=d=>{
   if(['licenseNo','wrapping'].includes(d.objectName))return;
   const selector=d.selector??null,key=JSON.stringify([d.objectName,selector]);
   if(!unique.has(key))unique.set(key,{objectName:d.objectName,selector,properties:{}});
   unique.get(key).properties[d.propertyName]=null;
  };
  for(const [objectName,definition] of Object.entries(capabilities.objects))for(const propertyName of Object.keys(definition.properties))add({objectName,propertyName});
  for(const card of visual.getFormattingModel().cards)for(const descriptor of card.revertToDefaultDescriptors||[])add(descriptor);
  // Remove conditional rules even if the forecast field is currently disconnected.
  for(const propertyName of ['color','markerColor'])add({objectName:'forecast',propertyName,selector:formatting.wildcard});
  options.host.persistProperties({remove:[...unique.values()]});
 };
 function prepare(e){
  const view=e?.dataViews?.[0];config=forecast.settings(view?.metadata?.objects);
  const result=config.show?forecast.collect(view?.categorical,options.host,config,view?.metadata?.objects?.xAxeFormat?.tickInterval==='hour'):{records:new Map(),warnings:[]};records=result.records;
  warning.hidden=!result.warnings.length;summary.textContent='Проверьте прогноз: '+result.warnings.length;
  body.textContent=result.warnings.slice(0,20).join('\n')+(result.warnings.length>20?'\n… и ещё '+(result.warnings.length-20):'');
  if(warning.hidden)warning.open=false;
 }
 const update=visual.update;visual.update=function(e){latest=e;reset.hidden=e?.viewMode!==1;const palette=options.host.colorPalette;reset.style.color=palette?.isHighContrast?palette.foreground.value:'';reset.style.backgroundColor=palette?.isHighContrast?palette.background.value:'';if(!e?.dataViews?.[0]?.categorical){prepare(e);this.barContainer?.node()?.querySelectorAll('.forecast').forEach(n=>n.remove());}return update.call(this,e);};
 // showVisual receives the locally filtered DataView from the existing filter panel.
 const show=visual.showVisual;visual.showVisual=function(e,...rest){prepare(e);return show.call(this,e,...rest);};
 const zoom=visual.handleZoom;visual.handleZoom=function(...args){
  const model=this.viewModel;
  if(config.show&&model?.dataMax){for(const p of model.dataPoints||[]){
   if(this.isCalculatedItem(p))continue;const r=records.get(p.selectionId?.getKey());
   if(r&&r.end>model.dataMax)model.dataMax=new Date(r.end);
  }}
  // Original explicit period zoom and scroll are handled unchanged by the base visual.
  return zoom.apply(this,args);
 };
 const bars=visual.addBarTexts;visual.addBarTexts=function(groups,...args){const result=bars.call(this,groups,...args);if(!disposed)render(this,groups,records,config,options.host.colorPalette,prefix);return result;};
 const tooltip=visual.getTooltipData;visual.getTooltipData=function(point){
  const base=tooltip.call(this,point),record=records.get(point.selectionId?.getKey());
  if(!record||this.isCalculatedItem(point))return base;
  const settings=this.viewModel.settings,names=[settings.infoPanelStartDateLabel,settings.infoPanelEndDateLabel];
  return base.filter(x=>!names.includes(x.displayName)).concat(forecast.tooltip(record,options.host.locale||'ru-RU'));
 };
 const enumeration=visual.enumerateObjectInstances;
 visual.getFormattingModel=function(){const view=latest?.dataViews?.[0];return formatting.build(capabilities,e=>this.viewModel?.settings?enumeration.call(this,e):[],view?.metadata?.objects,!!view?.categorical?.categories?.some(c=>c.source.roles?.forecastEnd));};
 const destroy=visual.destroy;visual.destroy=function(){disposed=true;records.clear();warning.remove();reset.onclick=null;reset.remove();return destroy?.call(this);};
 return visual;
}
function install(root,capabilities){
 const guid='ganttTMHI84F997DD65FE42E9AAE536431246AB90',plugin=root.powerbi?.visuals?.plugins?.[guid];
 if(!plugin)throw new Error('Исходный плагин Гантт ТМХИ не зарегистрирован');
 const create=plugin.create;plugin.apiVersion='5.1.0';plugin.displayName='Гантт_ТМХИ 1.6.3.0';
 plugin.create=function(options){return attach(create.call(this,options),options,capabilities);};
}
module.exports={attach,install};

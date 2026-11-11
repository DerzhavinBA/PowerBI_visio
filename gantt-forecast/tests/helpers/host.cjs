const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('node:fs');
function environment(code){
 const errors=[],dom=new JSDOM('<!DOCTYPE html><html><body><div id="visual" style="position:relative;width:1000px;height:500px"></div></body></html>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://visual.test',virtualConsole:new VirtualConsole().on('jsdomError',e=>errors.push(e))});
 const w=dom.window;w.powerbi={visuals:{plugins:{}}};
 w.HTMLCanvasElement.prototype.getContext=function(){return {measureText:s=>({width:String(s).length*7}),font:''};};
 w.SVGElement.prototype.getBBox=function(){return {x:Number(this.getAttribute('x')||0),y:Number(this.getAttribute('y')||0),width:Number(this.getAttribute('width')||this.textContent.length*7),height:Number(this.getAttribute('height')||12)};};
 w.SVGElement.prototype.beginElement=function(){};
 w.SVGElement.prototype.getComputedTextLength=function(){return this.textContent.length*7;};
 w.eval(code);
 let selections=[];const events={clicks:[],menus:[],tooltips:[],persist:[]};
 const host={locale:'ru-RU',colorPalette:{isHighContrast:false,foreground:{value:'#242424'},background:{value:'#FFFFFF'},getColor:()=>({value:'#004F9E'})},
  createLocalizationManager:()=>({getDisplayName:key=>key}),
  eventService:{renderingStarted(){},renderingFinished(){},renderingFailed(){}},
  tooltipService:{enabled:()=>true,show:e=>events.tooltips.push(e),hide(){},move(){}},
  createSelectionIdBuilder(){let key;return {withCategory(c,i){key=c.identity?.[i]?.key??String(i);return this;},withMeasure(){return this;},withSeries(){return this;},createSelectionId(){return {getKey:()=>key,getSelector:()=>({data:[{scopeId:key}]}),getSelectorsByColumn:()=>({dataMap:{row:key}}),equals:o=>o.getKey()===key,includes:o=>o.getKey()===key,hasIdentity:()=>true};}};},
  createSelectionManager:()=>({select(id,multi){events.clicks.push({key:id.getKey(),multi});selections=multi?[...selections,id]:[id];return Promise.resolve(selections);},clear(){selections=[];return Promise.resolve([]);},getSelectionIds:()=>selections,hasSelection:()=>!!selections.length,showContextMenu(id,position){events.menus.push({id,position});return Promise.resolve();},registerOnSelectCallback(){}}),
  persistProperties:p=>events.persist.push(p),launchUrl(){},displayWarningIcon(){},instanceId:'test'};
 const element=w.document.querySelector('#visual');
 const visual=w.powerbi.visuals.plugins.ganttTMHI84F997DD65FE42E9AAE536431246AB90.create({element,host});
 function data(withForecast=true){
  const cols=[['items',['Работа А','Работа Б'],{text:true}],['froms',[new w.Date(2026,0,1),new w.Date(2026,0,5)],{dateTime:true}],['tos',[new w.Date(2026,1,1),new w.Date(2026,1,5)],{dateTime:true}]];
  if(withForecast)cols.push(['forecastEnd',[new w.Date(2026,2,1),new w.Date(2026,0,20)],{dateTime:true}]);
  const categories=cols.map(([r,values,type],index)=>({source:{displayName:r,queryName:'Tasks.'+r,roles:{[r]:true},rolesIndex:{[r]:[0]},type,index},values,identity:values.map((_,i)=>({key:'task-'+i,getKey(){return this.key;}}))}));
  return {type:2,viewMode:1,viewport:{width:1000,height:500},dataViews:[{metadata:{columns:categories.map(c=>c.source),objects:{tmhiCurrent:{enabled:false},tmhiLevel:{enabled:false},tmhiPanel:{enabled:false},zooming:{focusOnToday:false},textValues:{show:true},enableTooltip:{show:false}}},categorical:{categories}}]};
 }
 return {w,dom,visual,host,element,events,errors,data,async flush(){await new Promise(r=>setTimeout(r,400));},close(){visual.destroy?.();w.close();}};
}
module.exports={environment};

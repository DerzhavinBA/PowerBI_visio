const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {environment}=require('./helpers/host.cjs');
test('entire recovered plugin renders forecast and connects tooltip/context/selection',async()=>{
 const e=environment(fs.readFileSync('.tmp/visual.js','utf8'));
 try{
  e.visual.update(e.data());await e.flush();
  assert.equal(e.errors.length,0,e.errors.map(x=>x.stack).join('\n'));
  assert.equal(e.element.querySelectorAll('.forecast-extension').length,1);
  assert.equal(e.element.querySelectorAll('.forecast-marker').length,2);
  const n=e.element.querySelector('.forecast-extension');
  n.dispatchEvent(new e.w.MouseEvent('click',{bubbles:true,ctrlKey:true}));await Promise.resolve();assert.equal(e.events.clicks.at(-1).key,'task-0');assert.equal(e.events.clicks.at(-1).multi,true);
  n.dispatchEvent(new e.w.MouseEvent('contextmenu',{bubbles:true}));assert.equal(e.events.menus.at(-1).id.getKey(),'task-0');
  assert.ok(e.visual.getTooltipData(n.__data__).some(x=>x.displayName==='Окончание прогноз'));
  const model=e.visual.getFormattingModel();assert.ok(model.cards.length>=5);
 }finally{e.close();}
});
test('without forecast core geometry and legacy enumeration match original',async()=>{
 const base=environment(fs.readFileSync('vendor/visual.js','utf8')),updated=environment(fs.readFileSync('.tmp/visual.js','utf8'));
 try{
  base.visual.update(base.data(false));updated.visual.update(updated.data(false));await Promise.all([base.flush(),updated.flush()]);
  const geometry=e=>[...e.element.querySelectorAll('.barColShape,.barColCol')].map(n=>['x','y','width','height','d','fill'].map(a=>n.getAttribute(a)));
  assert.ok(geometry(base).length);assert.deepEqual(geometry(updated),geometry(base));assert.equal(updated.element.querySelector('.forecast'),null);
  assert.equal(JSON.stringify(updated.visual.enumerateObjectInstances({objectName:'textValues'})),JSON.stringify(base.visual.enumerateObjectInstances({objectName:'textValues'})));
 }finally{base.close();updated.close();}
});
test('five levels keep forecasts on leaves only; collapse and row filtering do not attach dates to parents',async()=>{
 const e=environment(fs.readFileSync('.tmp/visual.js','utf8'));
 try{
  const data=e.data(),view=data.dataViews[0],cats=view.categorical.categories;
  cats[0].values=['Раздел','Раздел'];
  for(let level=1;level<5;level++)cats.push({source:{displayName:'Уровень '+level,queryName:'Tasks.Level'+level,roles:{items:true},rolesIndex:{items:[level]},type:{text:true},index:cats.length},values:level===4?['Работа А','Работа Б']:['Этап '+level,'Этап '+level],identity:cats[0].identity});
  view.metadata.columns=cats.map(c=>c.source);
  e.visual.update(data);await e.flush();
  assert.equal(e.element.querySelectorAll('.forecast-marker').length,2);
  for(const marker of e.element.querySelectorAll('.forecast-marker'))assert.equal(e.visual.isCalculatedItem(marker.__data__),false);
  const calculated=e.visual.viewModel.dataPoints.find(p=>e.visual.isCalculatedItem(p));assert.ok(calculated);
  e.visual.wrappingFilter=[calculated.group+'||'+calculated.subgroup+'||'+calculated.levelName];e.visual.updateImmediate(data,true);await e.flush();
  assert.equal(e.element.querySelectorAll('.forecast-marker').length,0);
  e.visual.wrappingFilter=[];
  const filtered={...data,dataViews:[{...view,categorical:{categories:cats.map(c=>({...c,values:[c.values[1]],identity:[c.identity[1]]}))}}]};
  e.visual.updateImmediate(filtered,true);await e.flush();
  assert.equal(e.element.querySelectorAll('.forecast-marker').length,1);assert.equal(e.element.querySelector('.forecast-marker').__data__.selectionId.getKey(),'task-1');
 }finally{e.close();}
});
test('emitted formatting model type-checks against official Power BI 5.1 declarations',()=>{
 const e=environment(fs.readFileSync('.tmp/visual.js','utf8'));
 try{
  const data=e.data();data.dataViews[0].metadata.objects.forecast={autoThickness:false,autoMarkerSize:false,markerSameColor:false};e.visual.update(data);const model=e.visual.getFormattingModel();
  fs.writeFileSync('.tmp/formatting-contract.ts',"import powerbi from 'powerbi-visuals-api';\nconst model: powerbi.visuals.FormattingModel = "+JSON.stringify(model,null,2)+';\n');
  require('node:child_process').execFileSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--noEmit','--skipLibCheck','--esModuleInterop','--target','ES2020','--moduleResolution','node','.tmp/formatting-contract.ts'],{stdio:'pipe'});
 }finally{e.close();}
});
test('empty first update shows instructions and accepts subsequent valid data',async()=>{
 const e=environment(fs.readFileSync('.tmp/visual.js','utf8'));
 try{e.visual.update({type:2,viewMode:1,viewport:{width:800,height:400},dataViews:[]});assert.ok(e.visual.getFormattingModel().cards.length);e.visual.update(e.data());await e.flush();assert.equal(e.element.querySelectorAll('.forecast-marker').length,2);}finally{e.close();}
});
test('full plugin accepts DAX color measure alongside legacy measures and independent marker fx',async()=>{
 const e=environment(fs.readFileSync('.tmp/visual.js','utf8'));
 try{
  const data=e.data(),view=data.dataViews[0];
  const values=[{source:{displayName:'Цвет DAX',queryName:'Tasks.ForecastColor',roles:{forecastColor:true},type:{text:true}},values:['#D23100','#176B34']},{source:{displayName:'Число',queryName:'Tasks.Amount',roles:{measures:true},type:{numeric:true}},values:[10,20]}];
  view.categorical.values=values;view.metadata.columns.push(...values.map(v=>v.source));
  view.metadata.objects.forecast={style:'solid',autoThickness:false,lineThickness:8,autoMarkerSize:false,markerSize:30,markerWidth:4,markerSameColor:false};
  view.categorical.categories[3].objects=[{forecast:{markerColor:{solid:{color:'#004F9E'}}}},{}];
  e.visual.update(data);await e.flush();
  assert.equal(e.element.querySelector('.forecast-extension').getAttribute('fill'),'#D23100');assert.equal(e.element.querySelector('.forecast-marker').getAttribute('fill'),'#004F9E');
  assert.equal(e.element.querySelector('.forecast-extension').getAttribute('height'),'8');assert.equal(e.element.querySelector('.forecast-marker').getAttribute('height'),'30');
  const second=e.visual.viewModel.dataPoints.find(p=>p.selectionId.getKey()==='task-1');assert.equal(second.measure,20);
  const filtered={...data,dataViews:[{...view,categorical:{categories:view.categorical.categories.map(c=>({...c,values:[c.values[1]],identity:[c.identity[1]],objects:c.objects?[c.objects[1]]:undefined})),values:values.map(c=>({...c,values:[c.values[1]]}))}}]};
  e.visual.updateImmediate(filtered,true);await e.flush();
  const marker=e.element.querySelector('.forecast-marker');assert.equal(marker.__data__.selectionId.getKey(),'task-1');assert.equal(marker.getAttribute('fill'),'#808080');
 }finally{e.close();}
});
test('reset button persists default removals only on user action and survives updates',async()=>{
 const e=environment(fs.readFileSync('.tmp/visual.js','utf8'));
 try{
  const data=e.data();data.dataViews[0].metadata.objects.forecast={autoThickness:false,lineThickness:12,markerColor:{solid:{color:'#123456'}}};
  e.visual.update(data);await e.flush();
  const button=e.element.querySelector('.tmhi-reset-settings');assert.ok(button);assert.equal(button.textContent,'Вернуть стандартные настройки');assert.equal(button.hidden,false);
  const before=e.events.persist.length;button.click();assert.equal(e.events.persist.length,before+1);
  const removals=e.events.persist.at(-1).remove;assert.ok(removals.some(x=>x.objectName==='forecast'&&'lineThickness' in x.properties));assert.ok(removals.some(x=>x.objectName==='forecast'&&x.selector?.data?.[0]?.dataViewWildcard));assert.ok(!removals.some(x=>['licenseNo','wrapping'].includes(x.objectName)));
  assert.equal(data.dataViews[0].metadata.objects.forecast.lineThickness,12);
  e.visual.update({...data,viewMode:0});assert.equal(button.hidden,true);
  e.visual.update(data);assert.equal(e.element.querySelectorAll('.tmhi-reset-settings').length,1);
  e.visual.destroy();assert.equal(button.isConnected,false);
 }finally{e.close();}
});

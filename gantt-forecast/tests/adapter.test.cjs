const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');
let attach;try{({attach}=require('../src/adapter.cjs'));}catch{}
function fixture(){
 const dom=new JSDOM('<div id="visual"></div>'),element=dom.window.document.querySelector('div');
 const identity={getKey:()=> 'A',getSelector:()=>({data:['A']})};
 const host={locale:'ru-RU',colorPalette:{},createSelectionIdBuilder(){return {withCategory(){return this;},createSelectionId(){return identity;}};}};
 const point={selectionId:identity,to:new Date('2026-02-01T23:59:59'),from:new Date('2026-01-01')};
 const model={dataMin:point.from,dataMax:point.to,dataPoints:[point],settings:{}};
 const visual={host,viewModel:model,isCalculatedItem:()=>false,handleZoom(){this.seenMax=this.viewModel.dataMax;},showVisual(e){this.handleZoom(e);},addBarTexts(){},getTooltipData(){return [{displayName:'Работа',value:'A'}];},enumerateObjectInstances(){return [];},update(e){if(e.dataViews?.length)this.showVisual(e);},destroy(){this.dead=true;}};
 const col=(role,values,type)=>({source:{roles:{[role]:true},type},values});
 const options={dataViews:[{metadata:{objects:{}},categorical:{categories:[col('items',['A']),col('froms',[new Date('2026-01-01')]),col('tos',[new Date('2026-02-01')]),col('forecastEnd',[new Date('2026-03-01')])]}}]};
 return {visual,options,host,element,point,dom};
}
test('adapter extends domain before zoom, adds tooltip; no forecast on calculated rows',()=>{
 assert.equal(typeof attach,'function');const x=fixture();attach(x.visual,{host:x.host,element:x.element},{objects:{}});x.visual.update(x.options);
 assert.equal(x.visual.seenMax.getMonth(),2);assert.ok(x.visual.getTooltipData(x.point).some(x=>x.displayName==='Окончание прогноз'));
 x.visual.isCalculatedItem=()=>true;assert.equal(x.visual.getTooltipData(x.point).length,1);
});
test('invalid date warns without losing work; empty update clears forecast and destroy cleans UI',()=>{
 assert.equal(typeof attach,'function');const x=fixture();attach(x.visual,{host:x.host,element:x.element},{objects:{}});
 x.options.dataViews[0].categorical.categories[3].values=[new Date('2025-01-01')];x.visual.update(x.options);
 assert.match(x.element.textContent,/раньше/);assert.equal(x.visual.viewModel.dataPoints.length,1);
 x.visual.update({dataViews:[]});assert.equal(x.element.querySelector('.forecast-warning').hidden,true);assert.equal(x.visual.getTooltipData(x.point).length,1);
 x.visual.destroy();assert.equal(x.element.querySelector('.forecast-warning'),null);assert.equal(x.visual.dead,true);
});

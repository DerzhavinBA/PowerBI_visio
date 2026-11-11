const {test}=require('node:test');const assert=require('node:assert/strict');
let build;try{({build}=require('../src/formatting.cjs'));}catch{}
const caps={objects:{zooming:{displayName:'Масштаб',properties:{verticalZoom:{displayName:'Высота',type:{numeric:true}}}},tmhiLevel:{displayName:'Уровни',properties:{field:{displayName:'Поле',type:{text:true}},show:{displayName:'Показать',type:{bool:true}}}}}};
test('legacy containers, selectors, dynamic choices, ranges and reset survive modern formatting',()=>{
 assert.equal(typeof build,'function');
 const enumerate=({objectName})=>objectName==='zooming'?[{properties:{verticalZoom:100},validValues:{verticalZoom:{numberRange:{min:10,max:500}}}}]:{instances:[{properties:{field:'a',show:true},selector:{metadata:'table.a'},containerIdx:0,validValues:{field:[{value:'a',displayName:'A'}]}}],containers:[{displayName:'Уровень 1'}]};
 const model=build(caps,enumerate,{},false);const serialized=JSON.stringify(model);
 assert.match(serialized,/table.a/);assert.match(serialized,/Уровень 1/);assert.match(serialized,/Dropdown/);assert.match(serialized,/500/);
 const slices=model.cards.flatMap(c=>c.groups.flatMap(g=>g.slices||[]));assert.ok(slices.some(s=>s.control.type==='NumUpDown'));
 assert.ok(model.cards.every(c=>c.revertToDefaultDescriptors?.length));
});
test('forecast color fx targets row instances and constant uses global fallback; disabled details stay hidden',()=>{
 assert.equal(typeof build,'function');const model=build({objects:{}},()=>[],{},true);
 const card=model.cards.find(c=>c.uid==='forecast'),color=card.groups.flatMap(g=>g.slices).find(s=>s.uid==='forecast.color');
 assert.equal(color.control.properties.descriptor.instanceKind,3);
 assert.deepEqual(color.control.properties.descriptor.selector,{data:[{dataViewWildcard:{matchingOption:1}}]});
 assert.equal(color.control.properties.value.value,'#808080');
 const hidden=build({objects:{}},()=>[],{forecast:{show:false}},true).cards.find(c=>c.uid==='forecast');assert.equal(hidden.groups.length,0);
});
test('dynamic category color labels retain the real member name instead of color0',()=>{
 const caps={objects:{colorCategories:{displayName:'Категории',properties:{color0:{type:{fill:{solid:{color:true}}}}}}}};
 const model=build(caps,()=>[{displayName:'Монтаж',properties:{color0:{solid:{color:'#004F9E'}}}}]);
 assert.equal(model.cards[1].groups[0].slices[0].displayName,'Монтаж');
});
test('text input meets API 5.1 required placeholder contract',()=>{
 const {slice}=require('../src/formatting.cjs');assert.equal(slice('x','name',{type:{text:true}},'abc').control.properties.placeholder,'');
});
test('rare scale controls are separated without changing persisted identifiers',()=>{
 const model=build({objects:{zooming:{displayName:'Масштаб',properties:{verticalZoom:{type:{numeric:true}},minZoomPeriod:{type:{text:true}}}}}},()=>[{properties:{verticalZoom:100,minZoomPeriod:'D'}}]);
 const advanced=model.cards[0].groups.find(g=>g.uid==='zooming.advanced');assert.ok(advanced);assert.equal(advanced.slices[0].control.properties.descriptor.propertyName,'minZoomPeriod');
});
test('forecast style selector exposes all five choices and preserves the saved choice',()=>{
 const caps=require('../capabilities.json');const model=build(caps,()=>[],{forecast:{style:'dashed'}},true);
 const style=model.cards.find(c=>c.uid==='forecast').groups[0].slices.find(s=>s.uid==='forecast.style');
 assert.equal(style.displayName,'Вид линии прогноза');assert.equal(style.control.properties.value.value,'dashed');
 assert.deepEqual(style.control.properties.items.map(x=>x.value),['striped','solid','diagonal','dashed','dotted']);
 assert.deepEqual(style.control.properties.items,caps.objects.forecast.properties.style.type.enumeration);
});
test('manual sizes and independent marker fx are exposed with limits and complete reset',()=>{
 const model=build({objects:{}},()=>[],{forecast:{autoThickness:false,autoMarkerSize:false,markerSameColor:false}},true);
 const card=model.cards.find(c=>c.uid==='forecast'),s=card.groups.flatMap(g=>g.slices),get=k=>s.find(s=>s.uid==='forecast.'+k);
 assert.equal(get('lineThickness').control.properties.options.maxValue.value,64);
 assert.equal(get('markerSize').control.properties.options.minValue.value,4);
 assert.equal(get('markerColor').control.properties.descriptor.instanceKind,3);
 const auto=build({objects:{}},()=>[],{},true).cards.find(c=>c.uid==='forecast');assert.ok(!auto.groups[0].slices.some(s=>s.uid==='forecast.lineThickness'));
 for(const key of ['lineThickness','markerSize','markerWidth','markerColor'])assert.ok(auto.revertToDefaultDescriptors.some(d=>d.propertyName===key));
});

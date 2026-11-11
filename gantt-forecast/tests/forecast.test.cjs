const {test}=require('node:test'); const assert=require('node:assert/strict');
let f; try { f=require('../src/forecast.cjs'); } catch { f={}; }
const day=s=>new Date(s+'T00:00:00');
test('late forecast retains plan, extends to forecast, counts calendar days across year',()=>{
 assert.equal(typeof f.normalize,'function');
 const r=f.normalize(day('2026-12-01'),day('2026-12-30'),day('2027-01-03'));
 assert.equal(r.kind,'late');assert.equal(r.days,4);assert.equal(r.plan.getDate(),30);assert.equal(r.end.getDate(),3);
});
test('early and equal forecasts are markers; null is absent; before start invalid',()=>{
 assert.equal(typeof f.normalize,'function');
 assert.equal(f.normalize(day('2026-01-01'),day('2026-02-01'),day('2026-01-20')).kind,'early');
 assert.equal(f.normalize(day('2026-01-01'),day('2026-02-01'),day('2026-02-01')).kind,'equal');
 assert.equal(f.normalize(day('2026-01-01'),day('2026-02-01'),null),null);
 assert.match(f.normalize(day('2026-01-01'),day('2026-02-01'),day('2025-12-31')).error,/начала/);
 assert.match(f.normalize(day('2026-01-01'),day('2026-02-01'),'garbage').error,/дат/);
});
test('date-only uses local calendar, end boundary matches existing inclusive day; DST does not change day delta',()=>{
 assert.equal(typeof f.normalize,'function');
 const r=f.normalize('2026-03-01','2026-03-07','2026-03-09');
 assert.equal(r.end.getDate(),9); assert.equal(r.end.getHours(),23);assert.equal(r.days,2);
 assert.equal(f.normalize('2026-01-01','2026-02-28','2026-02-30').error.includes('дат'),true);
});
function categorical(){return {categories:[
 {source:{roles:{forecastEnd:true}},values:['2026-02-05','2026-02-08'],objects:[{forecast:{color:{solid:{color:'#D23100'}}}},{}]},
 {source:{roles:{items:true}},values:['Same','Same'],identity:[{key:'A'},{key:'B'}]},
 {source:{roles:{tos:true}},values:['2026-02-01','2026-02-02'],identity:[{key:'A'},{key:'B'}]},
 {source:{roles:{froms:true}},values:['2026-01-01','2026-01-01']}
]};}
const host={createSelectionIdBuilder(){return {withCategory(c,i){this.key=c.identity[i].key;return this;},createSelectionId(){return {getKey:()=>this.key,getSelector:()=>({data:[this.key]})};}};}};
test('roles and identity survive reordered columns and same labels in different branches; row color wins',()=>{
 assert.equal(typeof f.collect,'function');const c=categorical(),s={color:'#808080'};
 const result=f.collect(c,host,s);assert.equal(result.records.get('A').color,'#D23100');assert.equal(result.records.get('B').color,'#808080');
 c.categories.forEach(c=>{c.values.reverse();c.identity?.reverse();c.objects?.reverse();});
 const sorted=f.collect(c,host,s);assert.equal(sorted.records.get('A').end.getDate(),5);assert.equal(sorted.records.get('B').end.getDate(),8);
});
test('clipping never reverses continuation or displays out-of-domain marker',()=>{
 assert.equal(typeof f.layout,'function');
 assert.deepEqual(f.layout(80,140,0,100,'late'),{x:80,width:20,marker:null});
 assert.deepEqual(f.layout(-30,20,0,100,'late'),{x:0,width:20,marker:20});
 assert.deepEqual(f.layout(80,50,0,100,'early'),{x:80,width:0,marker:50});
});
test('non-date forecast field yields a diagnostic instead of epoch dates',()=>{
 const c=categorical();c.categories[0].source.type={numeric:true};c.categories[0].values=[100,200];
 const result=f.collect(c,host,{color:'#808080'});assert.equal(result.records.size,0);assert.match(result.warnings[0],/тип/);
});
test('non-midnight same-day timestamps classify by time even on daily scale',()=>{
 const start='2026-01-01T08:00:00',plan='2026-01-01T12:00:00';
 assert.equal(f.normalize(start,plan,'2026-01-01T18:00:00').kind,'late');
 assert.equal(f.normalize(start,plan,'2026-01-01T10:00:00').kind,'early');
 assert.match(f.normalize(start,plan,'2026-01-01T07:00:00').error,/начала/);
 assert.equal(f.normalize(start,plan,'2026-01-01T18:00:00').days,0);
});
test('size settings preserve auto defaults and constrain invalid persisted sizes',()=>{
 const s=f.settings({forecast:{lineThickness:999,markerSize:-2,markerWidth:NaN}});
 assert.equal(s.autoThickness,true);assert.equal(s.lineThickness,64);assert.equal(s.markerSize,4);assert.equal(s.markerWidth,2);assert.equal(s.autoMarkerSize,true);
});
test('DAX measure color takes priority over fx, with fallback for empty or invalid measure results',()=>{
 const c=categorical();c.values=[{source:{roles:{forecastColor:true}},values:['#176B34',null]}];
 const config=f.settings({forecast:{color:{solid:{color:'#758CC7'}}}});
 let result=f.collect(c,host,config);assert.equal(result.records.get('A').color,'#176B34');assert.equal(result.records.get('B').color,'#758CC7');
 c.values[0].values=['not-a-color','#12345'];result=f.collect(c,host,config);assert.equal(result.records.get('A').color,'#D23100');assert.equal(result.records.get('B').color,'#758CC7');
});
test('marker follows line by default, or reads independent conditional marker color',()=>{
 const c=categorical();c.categories[0].objects[0].forecast.markerColor={solid:{color:'#004F9E'}};
 assert.equal(f.collect(c,host,f.settings({})).records.get('A').markerColor,'#D23100');
 const cfg=f.settings({forecast:{markerSameColor:false,markerColor:{solid:{color:'#111111'}}}});
 const records=f.collect(c,host,cfg).records;assert.equal(records.get('A').markerColor,'#004F9E');assert.equal(records.get('B').markerColor,'#111111');
});

const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');const f=require('../src/forecast.cjs');
let render;try{({render}=require('../src/render.cjs'));}catch{}
function fixture(kind='late'){
 const dom=new JSDOM('<svg xmlns="http://www.w3.org/2000/svg"><g class="bar"><g class="barCol"><rect class="barColShape" x="10" y="20" width="40" height="12"/></g></g></svg>');
 const doc=dom.window.document,bar=doc.querySelector('.bar'),shape=doc.querySelector('rect');shape.getBBox=()=>({x:10,y:20,width:40,height:12});
 const point={selectionId:{getKey:()=> 'A'},to:new Date(50),component:'A'};bar.__data__=point;shape.__data__=point;
 const record={kind,start:new Date(10),plan:new Date(50),end:new Date(kind==='late'?80:30),days:3,color:'#808080'};
 const visual={isCalculatedItem:()=>false,xScale:d=>+d,contentWidth:100,viewModel:{settings:{}},barContainer:{node:()=>doc.querySelector('svg')}};
 visual.xScale.range=()=>[0,100];
 return {dom,doc,bar,shape,point,record,visual,groups:{each(fn){fn.call(bar,point);}}};
}
test('continuation shares bar geometry, original click behavior and context identity',()=>{
 assert.equal(typeof render,'function');const x=fixture();let clicks=0;x.shape.addEventListener('click',e=>{clicks++;assert.equal(e.ctrlKey,true);});
 render(x.visual,x.groups,new Map([['A',x.record]]),f.defaults,{},'test');
 const extension=x.doc.querySelector('.forecast-extension');assert.equal(extension.getAttribute('width'),'30');assert.equal(extension.getAttribute('y'),'20');assert.equal(extension.parentElement.parentElement.className.baseVal,'barCol');
 assert.equal(extension.__data__,x.point);extension.dispatchEvent(new x.dom.window.MouseEvent('click',{ctrlKey:true,bubbles:true}));assert.equal(clicks,1);
 assert.ok(x.doc.querySelector('pattern'));assert.equal(x.doc.querySelector('.forecast-marker').getAttribute('x'),'79');
});
test('early forecast only marker; calculated groups excluded; high contrast overrides custom color',()=>{
 assert.equal(typeof render,'function');const x=fixture('early');render(x.visual,x.groups,new Map([['A',x.record]]),f.defaults,{isHighContrast:true,foreground:{value:'#FFFFFF'},background:{value:'#000000'}},'test');
 assert.equal(x.doc.querySelector('.forecast-extension'),null);assert.equal(x.doc.querySelector('.forecast-marker').getAttribute('fill'),'#FFFFFF');
 x.visual.isCalculatedItem=()=>true;render(x.visual,x.groups,new Map([['A',x.record]]),f.defaults,{},'test');assert.equal(x.doc.querySelector('.forecast'),null);
});
test('missing record or disabled forecast removes decorations',()=>{
 assert.equal(typeof render,'function');const x=fixture();render(x.visual,x.groups,new Map([['A',x.record]]),f.defaults,{},'test');
 render(x.visual,x.groups,new Map(),f.defaults,{},'test');assert.equal(x.doc.querySelector('.forecast'),null);
});
test('early-date label has contrasting halo over the primary bar',()=>{
 const x=fixture('early');x.dom.window.SVGElement.prototype.getBBox=function(){return {x:Number(this.getAttribute('x')),y:20,width:30,height:12};};
 render(x.visual,x.groups,new Map([['A',x.record]]),{...f.defaults,showLabel:true},{},'test');
 const label=x.doc.querySelector('.forecast-label');assert.ok(label);assert.equal(label.getAttribute('stroke'),'#FFFFFF');assert.equal(label.getAttribute('paint-order'),'stroke');
});
for(const style of ['solid','diagonal','dashed','dotted'])test('forecast style '+style+' keeps geometry, color and click identity',()=>{
 const x=fixture();x.record.color='#D23100';let selected=false;x.shape.addEventListener('click',()=>selected=true);
 const config=f.settings({forecast:{style}});assert.equal(config.style,style);
 render(x.visual,x.groups,new Map([['A',x.record]]),config,{},'style');
 const extension=x.doc.querySelector('.forecast-extension');assert.equal(extension.getAttribute('width'),'30');assert.equal(extension.getAttribute('height'),'12');
 const pattern=x.doc.querySelector('pattern');
 if(style==='solid'){assert.equal(pattern,null);assert.equal(extension.getAttribute('fill'),'#D23100');}
 else {assert.ok(pattern);assert.equal(pattern.getAttribute('data-style'),style);assert.ok(pattern.querySelector('[fill="#D23100"],[stroke="#D23100"]'));}
 if(style==='dotted')assert.ok(pattern.querySelector('circle'));
 if(style==='dashed'){const dash=pattern.querySelector('.forecast-dash');assert.ok(Number(dash.getAttribute('height'))<12);}
 if(style==='diagonal')assert.ok(pattern.querySelector('path'));
 extension.dispatchEvent(new x.dom.window.MouseEvent('click',{bubbles:true}));assert.equal(selected,true);assert.equal(extension.__data__,x.point);
});
for(const style of ['solid','striped','diagonal','dashed','dotted'])test('explicit forecast thickness centered for '+style,()=>{
 const x=fixture();const cfg=f.settings({forecast:{style,autoThickness:false,lineThickness:6,autoMarkerSize:false,markerSize:20,markerWidth:4}});
 render(x.visual,x.groups,new Map([['A',{...x.record,markerColor:'#004F9E'}]]),cfg,{},'sizing');
 const n=x.doc.querySelector('.forecast-extension');assert.equal(n.getAttribute('height'),'6');assert.equal(n.getAttribute('y'),'23');
 const marker=x.doc.querySelector('.forecast-marker');assert.equal(marker.getAttribute('height'),'20');assert.equal(marker.getAttribute('y'),'16');assert.equal(marker.getAttribute('width'),'4');assert.equal(marker.getAttribute('x'),'78');assert.equal(marker.getAttribute('fill'),'#004F9E');
 const hit=x.doc.querySelector('.forecast-hit-area');assert.equal(hit.getAttribute('height'),'12');assert.equal(hit.__data__,x.point);
 if(style==='dotted')assert.equal(x.doc.querySelector('circle').getAttribute('r'),'3');
 if(style==='dashed')assert.equal(x.doc.querySelector('.forecast-dash').getAttribute('height'),'6');
});

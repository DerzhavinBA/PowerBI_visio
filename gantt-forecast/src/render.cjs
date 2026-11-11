'use strict';
const forecast=require('./forecast.cjs');
const NS='http://www.w3.org/2000/svg';
function intersects(a,b){return a.x<b.x+b.width+4&&a.x+a.width+4>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
function render(visual,groups,records,config,palette={},prefix='forecast'){
 let serial=0;const locale=visual.host?.locale||'ru-RU';
 groups.each(function(point){
  const bar=this;bar.querySelectorAll('.forecast').forEach(n=>n.remove());
  const record=records.get(point.selectionId?.getKey());
  if(!config.show||!record||visual.isCalculatedItem(point))return;
  const col=bar.querySelector('.barCol'),shape=col?.querySelector('.barColShape,.barColCol');
  if(!shape||shape.getAttribute('display')==='none')return;
  const box=shape.getBBox();if(!Number.isFinite(box.y)||box.height<=0)return;
  const doc=bar.ownerDocument,range=visual.xScale.range(),min=Math.min(...range),max=Math.max(...range);
  const geometry=forecast.layout(visual.xScale(point.to),visual.xScale(record.end),min,max,record.kind);
  const ink=palette.isHighContrast?palette.foreground.value:record.color;
  const paper=palette.isHighContrast?palette.background.value:'#FFFFFF';
  const markerInk=palette.isHighContrast?palette.foreground.value:(record.markerColor||ink);
  const lineHeight=config.autoThickness===false?Math.min(box.height,config.lineThickness):box.height;
  const lineY=box.y+(box.height-lineHeight)/2;
  const thinInk=config.autoThickness===false?lineHeight:Math.min(3,box.height);
  function node(tag,attrs,parent){const n=doc.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));n.__data__=point;parent.appendChild(n);return n;}
  const layer=node('g',{class:'forecast'},col);
  const title=node('title',{},layer);title.textContent=forecast.tooltip(record,locale).map(r=>r.displayName+': '+r.value).join('; ');
  layer.setAttribute('role','img');layer.setAttribute('aria-label',title.textContent);
  function interactive(n){n.addEventListener('click',event=>{
   event.stopPropagation();shape.dispatchEvent(new doc.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:event.ctrlKey,metaKey:event.metaKey,shiftKey:event.shiftKey,clientX:event.clientX,clientY:event.clientY}));
  });}
  if(geometry.width>0){
   const hit=node('rect',{class:'forecast-hit-area',x:geometry.x,y:box.y,width:geometry.width,height:box.height,fill:'transparent','pointer-events':'all'},layer);interactive(hit);
   let fill=ink;
   if(config.style!=='solid'){
    const id=prefix+'-'+(++serial)+'-'+(point.selectionId?.getKey()||'').replace(/[^a-zA-Z0-9]/g,'').slice(-32);
    const linear=config.style==='dashed'||config.style==='dotted';
    const period=config.style==='dashed'?Math.max(14,thinInk*3.5):config.style==='dotted'?Math.max(8,thinInk*8/3):8,patternHeight=linear?lineHeight:8;
    const defs=node('defs',{},layer),pattern=node('pattern',{id,width:period,height:patternHeight,x:geometry.x,y:lineY,patternUnits:'userSpaceOnUse','data-style':config.style},defs);
    node('rect',{width:period,height:patternHeight,fill:paper},pattern);
    if(config.style==='diagonal')node('path',{d:'M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6',stroke:ink,'stroke-width':3,fill:'none'},pattern);
    else if(config.style==='dashed'){
     const thickness=thinInk;
     node('rect',{class:'forecast-dash',x:0,y:(lineHeight-thickness)/2,width:Math.max(8,thinInk*2),height:thickness,fill:ink},pattern);
    }else if(config.style==='dotted')node('circle',{cx:thinInk/2+.5,cy:lineHeight/2,r:thinInk/2,fill:ink},pattern);
    else node('rect',{width:4,height:8,fill:ink},pattern);
    fill='url(#'+id+')';
   }
   const n=node('rect',{class:'forecast-extension',x:geometry.x,y:lineY,width:geometry.width,height:lineHeight,fill,'pointer-events':'all'},layer);interactive(n);
  }
  if(config.showMarker&&geometry.marker!==null){
   // Filled rectangles inherit barCol fill-opacity during selection, unlike strokes.
   const available=visual.yScale?.step?Math.max(4,visual.yScale.step()-2):Infinity;
   const height=config.autoMarkerSize===false?Math.min(config.markerSize,available):box.height+4;
   const width=config.markerWidth??2,y=box.y+(box.height-height)/2;
   const halo=node('rect',{class:'forecast-marker-halo',x:geometry.marker-width/2-1,y,width:width+2,height,fill:paper},layer);interactive(halo);
   const marker=node('rect',{class:'forecast-marker',x:geometry.marker-width/2,y,width,height,fill:markerInk},layer);interactive(marker);
  }
  if(config.showLabel&&geometry.marker!==null){
   const label=node('text',{class:'forecast-label',x:geometry.marker+Math.max(6,(config.markerWidth??2)/2+4),y:box.y+box.height/2+4,fill:palette.isHighContrast?ink:'#242424',stroke:paper,'stroke-width':3,'stroke-linejoin':'round','paint-order':'stroke','font-size':11,'font-family':'Calibri, Segoe UI, sans-serif'},layer);
   label.textContent=record.end.toLocaleDateString(locale);interactive(label);
   const b=label.getBBox();
   const overlap=[...visual.barContainer.node().querySelectorAll('text')].some(other=>other!==label&&other.getAttribute('visibility')!=='hidden'&&other.textContent&&intersects(b,other.getBBox()));
   if(b.x<min||b.x+b.width>max||overlap)label.remove();
  }
 });
}
module.exports={render,intersects};

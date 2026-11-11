'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PowerBICustomVisualsWebpackPlugin:Plugin}=require('powerbi-visuals-webpack-plugin'),JSZip=require('jszip'),Ajv=require('ajv');
process.chdir(path.resolve(__dirname,'..'));
async function build(){
 const original=JSON.parse(fs.readFileSync('vendor/resource.json','utf8')),config=JSON.parse(fs.readFileSync('pbiviz.json','utf8')),capabilities=JSON.parse(fs.readFileSync('capabilities.json','utf8'));
 const vendor=fs.readFileSync('vendor/visual.js','utf8');if(vendor!==original.content.js)throw new Error('Vendor JS changed');
 const schema=require('powerbi-visuals-api/schema.capabilities.json');const ajv=new Ajv({strict:false,allErrors:true});if(!ajv.validate(schema,capabilities))throw new Error(JSON.stringify(ajv.errors));
 // Compile isolated CommonJS modules to closures. No runtime eval, network or vendor rewriting.
 const names=['forecast','formatting','render','adapter'];
 const modules=names.map(name=>`${JSON.stringify('./'+name+'.cjs')}:function(module,exports,require){\n${fs.readFileSync('src/'+name+'.cjs','utf8')}\n}`).join(',\n');
 const extension=`\n;(function(root){'use strict';const factories={${modules}},cache={};function require(name){if(!cache[name]){const module=cache[name]={exports:{}};factories[name](module,module.exports,require);}return cache[name].exports;}require('./adapter.cjs').install(root,${JSON.stringify(capabilities)});})(window);\n`;
 const resource={...original,...config,capabilities,content:{...original.content,js:vendor+extension,css:original.content.css+'\n'+fs.readFileSync('src/forecast.css','utf8')}};
 const plugin=new Plugin({...config,devMode:false,compression:6,generatePlugin:false});
 // Use the official tools' package emitter on recovered precompiled code. Preserve original author metadata (email was empty).
 const packageJSON=await plugin.generatePackageJson(resource);fs.mkdirSync('.tmp',{recursive:true});
 await plugin.generatePbiviz(resource,packageJSON,path.resolve('.tmp'));
 const emitted=path.join('.tmp',config.visual.guid+'.'+config.visual.version+'.pbiviz');
 const zip=await JSZip.loadAsync(fs.readFileSync(emitted));zip.file('THIRD-PARTY-NOTICES.txt',fs.readFileSync('THIRD-PARTY-NOTICES.txt'));
 // Deterministic archive timestamps for reproducible builds.
 zip.forEach((name,file)=>{file.date=new Date('2026-10-30T00:00:00Z');});
 const buffer=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
 const output='dist/Гантт_ТМХИ_1.6.3.0.pbiviz';fs.mkdirSync('dist',{recursive:true});fs.writeFileSync(output,buffer);
 fs.writeFileSync('.tmp/visual.js',resource.content.js);fs.writeFileSync('.tmp/visual.css',resource.content.css);
 fs.writeFileSync('dist/build-info.json',JSON.stringify({version:config.visual.version,apiVersion:config.apiVersion,originalPayloadUnchanged:true,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),packager:require('powerbi-visuals-webpack-plugin/package.json').version,hostValidation:'NOT RUN'},null,2)+'\n');
 console.log(output);console.log('Capabilities validated against API 5.1 schema. Power BI host validation NOT RUN.');
}
build().catch(e=>{console.error(e);process.exitCode=1;});

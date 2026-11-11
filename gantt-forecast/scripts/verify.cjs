'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm'),JSZip=require('jszip');
process.chdir(path.resolve(__dirname,'..'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const original=JSON.parse(fs.readFileSync('vendor/resource.json','utf8')),expected=fs.readFileSync('vendor/original.sha256','utf8').split(/\s/)[0];
 assert.equal(sha(fs.readFileSync('../Гантт_ТМХИ.pbiviz')),expected);
 const packagePath='dist/Гантт_ТМХИ_1.6.3.0.pbiviz',buffer=fs.readFileSync(packagePath),zip=await JSZip.loadAsync(buffer),manifest=JSON.parse(await zip.file('package.json').async('string'));
 const resource=JSON.parse(await zip.file(manifest.resources[0].file).async('string'));
 assert.equal(resource.visual.guid,original.visual.guid);assert.equal(resource.apiVersion,'5.1.0');assert.equal(resource.visual.version,'1.6.3.0');
 assert.ok(resource.content.js.startsWith(original.content.js));assert.ok(resource.content.css.startsWith(original.content.css));new vm.Script(resource.content.js);
 for(const role of original.capabilities.dataRoles)assert.deepEqual(resource.capabilities.dataRoles.find(x=>x.name===role.name),role);
 for(const [name,object]of Object.entries(original.capabilities.objects))assert.deepEqual(resource.capabilities.objects[name],object);
 assert.equal(resource.capabilities.dataRoles.filter(x=>x.name==='forecastEnd').length,1);
 assert.equal(await zip.file('THIRD-PARTY-NOTICES.txt').async('string'),fs.readFileSync('THIRD-PARTY-NOTICES.txt','utf8'));
 const result={package:packagePath,sha256:sha(buffer),originalSHA256:expected,originalUnchanged:true,vendorJavaScriptUnchanged:true,legacyRolesAndObjectsUnchanged:true,syntax:'PASS',apiVersion:resource.apiVersion,powerBIHost:'NOT RUN'};
 fs.writeFileSync('dist/verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});

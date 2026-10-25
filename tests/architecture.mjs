import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){return nextResolve(specifier==='three'?new URL('../vendor/three/build/three.module.js',import.meta.url).href:specifier,context)}});
const {architecturePresets,createArchitectureGeometry}=await import('../engine/architecture.js');
for(const options of [{},{width:2.4,height:2,depth:.4,steps:12,detail:6}])for(const preset of architecturePresets){
 const g=createArchitectureGeometry(preset.id,options),p=g.attributes.position,a=g.index.array,edges=new Map();
 assert(p.count<300000);assert([...p.array].every(Number.isFinite));assert([...g.attributes.normal.array].every(Number.isFinite));
 let volume=0;
 for(let i=0;i<a.length;i+=3){const [x,y,z]=a.slice(i,i+3);assert(x<p.count&&y<p.count&&z<p.count);assert(x!==y&&y!==z&&z!==x);for(const [u,v] of [[x,y],[y,z],[z,x]]){const k=u<v?u+':'+v:v+':'+u;edges.set(k,(edges.get(k)||0)+1)}volume+=p.getX(x)*(p.getY(y)*p.getZ(z)-p.getZ(y)*p.getY(z))+p.getY(x)*(p.getZ(y)*p.getX(z)-p.getX(y)*p.getZ(z))+p.getZ(x)*(p.getX(y)*p.getY(z)-p.getY(y)*p.getX(z));}
 assert([...edges.values()].every(n=>n===2),preset.id+' open/nonmanifold component');assert(volume>0,preset.id+' inverted volume');
 const bounds=g.boundingBox,expected=options.width?[options.width,options.height,options.depth]:preset.size,actual=[bounds.max.x-bounds.min.x,bounds.max.y-bounds.min.y,bounds.max.z-bounds.min.z];for(let i=0;i<3;i++)assert(Math.abs(expected[i]-actual[i])<1e-4,preset.id+' dimensions');assert(Math.abs(bounds.min.y)<1e-5,preset.id+' ground level');g.dispose();console.log('PASS',preset.id,options.width?'custom / fine':'default',p.count,'vertices');
}
assert.throws(()=>createArchitectureGeometry('stairs',{width:NaN}));assert.throws(()=>createArchitectureGeometry('door',{height:0}));assert.throws(()=>createArchitectureGeometry('unknown'));
console.log('PASS all presets: closed solids, outward faces, finite data, exact dimensions and validation');
const THREE=await import('../vendor/three/build/three.module.js');
for(const [id,x,y] of [['window',0,.5],['double-window',.25,.7],['door-frame',0,.5],['arch',0,.3],['door-wall',0,.4],['window-wall',0,.5]]){
 const g=createArchitectureGeometry(id),p=architecturePresets.find(p=>p.id===id),m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.updateMatrixWorld();const ray=new THREE.Raycaster(new THREE.Vector3(x*p.size[0],y*p.size[1],p.size[2]+1),new THREE.Vector3(0,0,-1));assert(ray.intersectObject(m).length===0,id+' missing opening');g.dispose();m.material.dispose();console.log('PASS real opening',id);
}

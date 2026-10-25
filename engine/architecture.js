import * as THREE from '../vendor/three/build/three.module.js';
import {mergeVertices,mergeGeometries} from '../vendor/three/examples/jsm/utils/BufferGeometryUtils.js';

// Parts are authored in app units with a ground-level pivot and front along +Z.
// Each component is a closed indexed solid. Components remain independent where
// they meet, so an optional voxel remesh can fuse an assembled building later.
export const architecturePresets=Object.freeze([
 {id:'wall',name:'Wall',category:'Structure',size:[3,2.5,.2]},
 {id:'door-wall',name:'Wall with doorway',category:'Structure',size:[3,2.5,.2]},
 {id:'window-wall',name:'Wall with window opening',category:'Structure',size:[3,2.5,.2]},
 {id:'floor',name:'Floor / foundation slab',category:'Structure',size:[3,.18,3]},
 {id:'room',name:'Room shell with doorway',category:'Structure',size:[3.5,2.8,3.5]},
 {id:'column',name:'Round column',category:'Structure',size:[.45,2.8,.45]},
 {id:'square-column',name:'Square pillar',category:'Structure',size:[.4,2.8,.4]},
 {id:'beam',name:'Beam / lintel',category:'Structure',size:[3,.25,.25]},
 {id:'arch',name:'Archway',category:'Structure',size:[1.8,2.7,.3]},
 {id:'door',name:'Paneled door',category:'Doors & windows',size:[1,2.1,.14]},
 {id:'door-frame',name:'Door frame',category:'Doors & windows',size:[1.2,2.3,.18]},
 {id:'window',name:'Window frame',category:'Doors & windows',size:[1.4,1.2,.16]},
 {id:'double-window',name:'Divided window frame',category:'Doors & windows',size:[2,1.3,.16]},
 {id:'window-pane',name:'Glass pane',category:'Doors & windows',size:[1.1,.9,.04],glass:true},
 {id:'stairs',name:'Straight stairs',category:'Stairs & access',size:[1.5,2.2,3.2]},
 {id:'corner-stairs',name:'L-shaped stairs',category:'Stairs & access',size:[2.8,2.2,2.8]},
 {id:'spiral-stairs',name:'Spiral stairs',category:'Stairs & access',size:[2.6,2.8,2.6]},
 {id:'ramp',name:'Ramp',category:'Stairs & access',size:[1.6,1,3]},
 {id:'landing',name:'Landing / platform',category:'Stairs & access',size:[1.5,.22,1.5]},
 {id:'railing',name:'Balcony handrail',category:'Rails & exterior',size:[3,1,.16]},
 {id:'stair-rail',name:'Stair handrail',category:'Rails & exterior',size:[.16,3.2,3.2]},
 {id:'fence',name:'Fence panel',category:'Rails & exterior',size:[3,1.4,.16]},
 {id:'balcony',name:'Balcony with railings',category:'Rails & exterior',size:[3,1.2,1.3]},
 {id:'gable-roof',name:'Gable roof',category:'Roofs',size:[3.5,1.3,3.5]},
 {id:'hip-roof',name:'Hip roof',category:'Roofs',size:[3.5,1.2,3.5]},
 {id:'flat-roof',name:'Flat roof slab',category:'Roofs',size:[3.5,.2,3.5]},
 {id:'chimney',name:'Chimney',category:'Roofs',size:[.6,1.2,.6]},
 {id:'wall-light',name:'Wall light fixture',category:'Light fixtures',size:[.3,.6,.3]},
 {id:'ceiling-light',name:'Ceiling light fixture',category:'Light fixtures',size:[.55,.12,.55]},
 {id:'lamp-post',name:'Street lamp / lamp post',category:'Light fixtures',size:[.7,3,.7]}
]);

export function createArchitectureGeometry(id,options={}){
 const preset=architecturePresets.find(p=>p.id===id);if(!preset)throw Error('Unknown building part');
 const dimension=(v,d)=>{const n=v===undefined?d:Number(v);if(!Number.isFinite(n)||n<.02||n>50)throw Error('Dimensions must be between 0.02 and 50 app units.');return n};
 const w=dimension(options.width,preset.size[0]),h=dimension(options.height,preset.size[1]),d=dimension(options.depth,preset.size[2]);
 const n=Math.max(3,Math.min(24,Math.round(Number(options.steps)||8))),detail=Math.max(1,Math.min(8,Math.round(Number(options.detail)||3)));
 let needsRefinement=false;const parts=[],segments=x=>Math.max(1,Math.min(16,Math.ceil(x*detail)));
 function closed(source){source.deleteAttribute('normal');source.deleteAttribute('uv');const g=mergeVertices(source,1e-6);source.dispose();g.clearGroups();let volume=0;const p=g.attributes.position,a=g.index.array;for(let i=0;i<a.length;i+=3){const x=a[i],y=a[i+1],z=a[i+2];volume+=p.getX(x)*(p.getY(y)*p.getZ(z)-p.getZ(y)*p.getY(z))+p.getY(x)*(p.getZ(y)*p.getX(z)-p.getX(y)*p.getZ(z))+p.getZ(x)*(p.getX(y)*p.getY(z)-p.getY(y)*p.getX(z))}if(volume<0)for(let i=0;i<a.length;i+=3){const v=a[i+1];a[i+1]=a[i+2];a[i+2]=v}g.computeVertexNormals();parts.push(g);return g}
 function box(x,y,z,cx=0,cy=y/2,cz=0){return closed(new THREE.BoxGeometry(x,y,z,segments(x),segments(y),segments(z)).translate(cx,cy,cz))}
 function cylinder(r1,r2,height,cx,cy,cz){return closed(new THREE.CylinderGeometry(r1,r2,height,Math.max(12,detail*8),segments(height),false).translate(cx,cy,cz))}
 function extrusion(shape,depth){needsRefinement=true;return closed(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:Math.max(12,detail*6),steps:segments(depth)}).translate(0,0,-depth/2))}
 function slabShape(points,depth){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return extrusion(shape,depth)}
 function rail(a,b,r){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),length=start.distanceTo(end);if(length<1e-6)return;const g=new THREE.CylinderGeometry(r,r,length,Math.max(12,detail*6),segments(length),false);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());return closed(g)}
 function frame(width,height,depth,centerX=0,baseY=0,z=0,bottom=true,divider=false){const t=Math.min(width*.09,height*.09);box(t,height,depth,centerX-width/2+t/2,baseY+height/2,z);box(t,height,depth,centerX+width/2-t/2,baseY+height/2,z);box(width-2*t,t,depth,centerX,baseY+height-t/2,z);if(bottom)box(width-2*t,t,depth,centerX,baseY+t/2,z);if(divider){box(t,height-2*t,depth*.8,centerX,baseY+height/2,z);box(width-2*t,t,depth*.8,centerX,baseY+height/2,z)}}
 function stair(width,height,depth,count){const points=[[-depth/2,0],[depth/2,0],[depth/2,height]];for(let i=count-1;i>=0;i--){points.push([-depth/2+i*depth/count,(i+1)*height/count],[-depth/2+i*depth/count,i*height/count])}return slabShape(points,width).rotateY(Math.PI/2)}
 function straightRailing(width,height,depth,z=0){const r=Math.min(depth/2,width*.025,height*.035);for(let i=0;i<n;i++)cylinder(r,r,height-r,-width/2+r+(width-2*r)*i/(n-1),(height-r)/2,z);rail([-width/2+r,height-r,z],[width/2-r,height-r,z],r);rail([-width/2+r,height*.48,z],[width/2-r,height*.48,z],r*.7)}
 try{
 switch(id){
 case 'wall':case 'floor':case 'square-column':case 'beam':case 'landing':case 'flat-roof':case 'window-pane':box(w,h,d);break;
 case 'door-wall':{const openingW=w*.4,openingH=h*.8,side=(w-openingW)/2;box(side,h,d,-w/2+side/2);box(side,h,d,w/2-side/2);box(openingW,h-openingH,d,0,openingH+(h-openingH)/2);break}
 case 'window-wall':{const ow=w*.6,oh=h*.5,low=h*.27,side=(w-ow)/2;box(side,h,d,-w/2+side/2);box(side,h,d,w/2-side/2);box(ow,low,d,0,low/2);box(ow,h-low-oh,d,0,low+oh+(h-low-oh)/2);break}
 case 'room':{const t=Math.min(w,d,h)*.06,ow=w*.35,oh=h*.75,side=(w-ow)/2;box(w,t,d);box(w,h-t,t,0,t+(h-t)/2,-d/2+t/2);box(t,h-t,d-t,-w/2+t/2,t+(h-t)/2,t/2);box(t,h-t,d-t,w/2-t/2,t+(h-t)/2,t/2);box(side,h-t,t,-w/2+side/2,t+(h-t)/2,d/2-t/2);box(side,h-t,t,w/2-side/2,t+(h-t)/2,d/2-t/2);box(ow,h-oh,t,0,oh+(h-oh)/2,d/2-t/2);break}
 case 'column':{const g=cylinder(.5,.5,h,0,h/2,0);g.scale(w,1,d);break}
 case 'arch':{const shape=new THREE.Shape();shape.moveTo(-.5,0);shape.lineTo(-.5,.65);shape.absellipse(0,.65,.5,.35,Math.PI,0,true);shape.lineTo(.5,0);shape.lineTo(.38,0);shape.lineTo(.38,.65);shape.absellipse(0,.65,.38,.26,0,Math.PI,false);shape.lineTo(-.38,0);shape.closePath();extrusion(shape,d).scale(w,h,1);break}
 case 'door':{box(w,h,d*.55);const trim=Math.min(w,h)*.07;for(let i=0;i<2;i++)box(w-trim*2,h*.36,d*.2,0,h*(.27+i*.45),d*.35);const knob=new THREE.SphereGeometry(Math.min(w,h)*.045,16,12);knob.translate(w*.32,h*.48,d*.45);closed(knob);break}
 case 'door-frame':frame(w,h,d,0,0,0,false);break;
 case 'window':frame(w,h,d);break;
 case 'double-window':frame(w,h,d,0,0,0,true,true);break;
 case 'stairs':stair(w,h,d,n);break;
 case 'corner-stairs':{const half=Math.max(2,Math.floor(n/2));stair(w*.42,h*.5,d*.6,half).translate(-w*.29,0,d*.2);stair(d*.42,h*.5,w*.6,n-half).rotateY(-Math.PI/2).translate(w*.2,h*.5,-d*.29);box(w*.42,h*.5,d*.42,-w*.29,h*.25,-d*.29);break}
 case 'spiral-stairs':{const rise=h/(n+1),radius=Math.min(w,d)/2,core=radius*.1;for(let i=0;i<n;i++){const angle=i/(n-1)*Math.PI*1.75,g=box(radius*.9,rise*.45,radius*.48,core+radius*.45,rise*(i+1),0);g.rotateY(angle)}cylinder(core,core,h,0,h/2,0);break}
 case 'ramp':slabShape([[-d/2,0],[d/2,0],[d/2,h]],w).rotateY(Math.PI/2);break;
 case 'railing':straightRailing(w,h,d);break;
 case 'stair-rail':{const r=Math.min(w,d*.035,h*.035)/2,guard=h*.3,rise=h-guard;for(let i=0;i<n;i++){const f=i/(n-1);cylinder(r,r,guard,0,guard/2+rise*f,d/2-d*f)}rail([0,guard,d/2],[0,h,-d/2],r);rail([0,guard*.5,d/2],[0,rise+guard*.5,-d/2],r*.75);break}
 case 'fence':{const post=Math.min(w/(n*2),d);for(let i=0;i<n;i++)box(post,h,d,-w/2+post/2+(w-post)*i/(n-1));box(w,h*.08,d*.6,0,h*.3);box(w,h*.08,d*.6,0,h*.75);break}
 case 'balcony':{const t=h*.13;box(w,t,d);const first=parts.length;straightRailing(w,h-t,Math.min(d*.1,.1),d/2-.05);for(let i=first;i<parts.length;i++)parts[i].translate(0,t,0);for(const x of [-w/2+.05,w/2-.05]){for(let i=0;i<Math.max(3,n/2);i++){const z=-d/2+d*i/(Math.max(3,Math.ceil(n/2))-1);cylinder(.04,.04,h-t,x,t+(h-t)/2,z)}rail([x,h-.04,-d/2],[x,h-.04,d/2-.05],.04)}break}
 case 'gable-roof':slabShape([[-w/2,0],[w/2,0],[0,h]],d);break;
 case 'hip-roof':{needsRefinement=true;const g=new THREE.BufferGeometry(),points=[-w/2,0,-d/2,w/2,0,-d/2,w/2,0,d/2,-w/2,0,d/2,0,h,-d*.25,0,h,d*.25];g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex([0,2,1,0,3,2,0,1,4,1,2,5,1,5,4,2,3,5,3,0,4,3,4,5]);closed(g);break}
 case 'chimney':{const t=Math.min(w,d)*.18;box(t,h,d,-w/2+t/2);box(t,h,d,w/2-t/2);box(w-2*t,h,t,0,h/2,-d/2+t/2);box(w-2*t,h,t,0,h/2,d/2-t/2);break}
 case 'wall-light':box(w*.65,h,d*.2,0,h/2,-d*.4);box(w*.7,h*.1,d*.65,0,h*.25,-d*.05);cylinder(w*.45,w*.22,h*.5,0,h*.6,d*.1);break;
 case 'ceiling-light':cylinder(.5,.44,h,0,h/2,0).scale(w,1,d);break;
 case 'lamp-post':{const r=Math.min(w,d)*.06;cylinder(r*2.5,r*3,h*.08,0,h*.04,0);cylinder(r,r,h*.85,0,h*.45,0);rail([0,h*.84,0],[w*.3,h*.84,0],r);cylinder(w*.32,w*.15,h*.12,w*.25,h*.89,0);break}
 default:throw Error('Building part has no geometry');
 }
 let g=mergeGeometries(parts,false);if(!g)throw Error('Could not assemble building geometry');
 // Subdivide cap triangles as well as depth slices for useful sculpt detail.
 for(let level=0;level<(needsRefinement?(detail>=5?3:detail>=2?2:0):0);level++){
  const positions=Array.from(g.attributes.position.array),triangles=[],edges=new Map(),old=g.index.array;
  const midpoint=(a,b)=>{const key=a<b?a+':'+b:b+':'+a;if(edges.has(key))return edges.get(key);const id=positions.length/3;for(let k=0;k<3;k++)positions.push((positions[a*3+k]+positions[b*3+k])*.5);edges.set(key,id);return id};
  for(let i=0;i<old.length;i+=3){const a=old[i],b=old[i+1],c=old[i+2],ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);triangles.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca)}
  const refined=new THREE.BufferGeometry();refined.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));refined.setIndex(triangles);g.dispose();g=refined;
 }
 // Normalize complete bounds to the requested dimensions, keeping the base at Y=0.
 g.computeBoundingBox();const size=g.boundingBox.getSize(new THREE.Vector3());if(Math.min(size.x,size.y,size.z)<=1e-7){g.dispose();throw Error('Building dimensions collapsed')}
 g.scale(w/size.x,h/size.y,d/size.z);g.computeBoundingBox();const b=g.boundingBox;g.translate(-(b.min.x+b.max.x)/2,-b.min.y,-(b.min.z+b.max.z)/2);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
 }finally{for(const part of parts)part.dispose()}
}

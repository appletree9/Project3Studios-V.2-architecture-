// Durable, per-project saves. Automatic saves never open pickers or download files.
// IndexedDB transactions replace a whole record atomically: a failed write retains
// the last good snapshot. Each tab starts with a new ID until a save is restored.
export function installProjectSaving({capture, restore, busy, finish, saveButton, openButton}) {
 const el=id=>document.getElementById(id);
 const scope=new URL('../',import.meta.url).pathname;
 const database='project3studios-v2:'+scope+':projects';
 let db, current={id:crypto.randomUUID?.()||Date.now()+'-'+Math.random(),name:'My Sculpt'}, handle=null;
 let revision=0, savedRevision=0, timer=0, writing=null, loading=false, pendingRecovery=false, initialized=false;
 const panel=document.createElement('section');panel.id='p3ProjectSaving';
 panel.innerHTML=`<div class="heading">PROJECT SAVING</div><div class="row"><button id="p3QuickSaveNow">Save Now</button><button id="p3QuickOpenProject">Open file</button></div><label>Project name<input id="p3ProjectName" value="My Sculpt" maxlength="120" style="width:100%"></label><label class="p3-auto-label"><input id="p3AutoSave" type="checkbox" checked> Auto save on this device</label><p class="tiny" id="p3SaveStatus" role="status">Opening saved projects…</p><div class="row"><button id="p3SaveAs">Save a copy</button><button id="p3DownloadProject">Download project file</button></div><button id="p3LinkProjectFile">Choose file for Save Now…</button><label>Saved projects on this device<select id="p3SavedProjects" style="width:100%"><option value="">Choose a project…</option></select></label><button id="p3RestoreProject">Open saved project</button><p class="tiny">Save Now updates this project without renaming it. Auto save keeps a device copy after editing and when leaving the app. Download a project file for a separate backup. Clearing site data removes device saves.</p>`;
 const style=document.createElement('style');style.textContent='#p3ProjectSaving{min-width:0}#p3ProjectSaving label{display:block;margin:10px 0}#p3ProjectSaving .p3-auto-label{display:flex;align-items:center;gap:6px}#p3ProjectSaving input[type=checkbox]{width:18px;flex:none}#p3ProjectSaving .row{display:grid;grid-template-columns:1fr 1fr;gap:6px}#p3ProjectSaving button{width:100%;margin-top:6px}#p3ProjectSaving input,#p3ProjectSaving select{box-sizing:border-box;max-width:100%}#p3SaveStatus{overflow-wrap:anywhere}';document.head.append(style);
 saveButton.textContent='Save Now';document.getElementById('right').append(panel);
 const status=el('p3SaveStatus'),name=el('p3ProjectName'),auto=el('p3AutoSave'),list=el('p3SavedProjects');
 const banner=document.createElement('section');banner.id='p3RecoveryBanner';banner.hidden=true;banner.setAttribute('aria-label','Saved project recovery');
 banner.style.cssText='position:fixed;z-index:100001;top:12px;left:50%;transform:translateX(-50%);width:min(480px,94vw);box-sizing:border-box;padding:14px;background:var(--panel,#292823);color:var(--text,#eee8dc);border:1px solid #a99b84;border-radius:12px;box-shadow:0 6px 30px #0008';
 banner.innerHTML='<p id="p3RecoveryText"></p><div class="row"><button id="p3RecoverLast">Restore last project</button><button id="p3RecoveryFresh">Start fresh</button></div>';
 document.body.append(banner);
 const say=text=>status.textContent=text;
 const clean=s=>String(s||'My Sculpt').trim().replace(/[\\/:*?"<>|]/g,'_').slice(0,120)||'My Sculpt';
 const fail=e=>{say('Save failed: '+(e?.message||e)+'. Previous saved copy is unchanged. Download a backup.');};
 function transaction(store,mode,action){return new Promise((resolve,reject)=>{
  if(!db){reject(Error('Device storage is unavailable'));return;}
  const tx=db.transaction(store,mode);let result;
  try{const request=action(tx.objectStore(store));request.onsuccess=()=>result=request.result;}catch(e){tx.abort();reject(e);return;}
  tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Storage write was interrupted'));
 });}
 const get=id=>transaction('projects','readonly',s=>s.get(id));
 async function refresh(){const heads=await transaction('heads','readonly',s=>s.getAll());heads.sort((a,b)=>b.updated-a.updated);list.replaceChildren(new Option('Choose a project…',''));for(const h of heads)list.add(new Option(h.name+' · '+new Date(h.updated).toLocaleString(),h.id));list.value=current.id;return heads;}
 function put(record){return new Promise((resolve,reject)=>{
  if(!db){reject(Error('Device storage is unavailable'));return;}
  const tx=db.transaction(['projects','heads'],'readwrite');
  try{tx.objectStore('projects').put(record);tx.objectStore('heads').put({id:record.id,name:record.name,updated:record.updated});}
  catch(e){tx.abort();reject(e);return;}
  tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Storage write was interrupted'));
 });}
 function guard(e){if(revision!==savedRevision){e.preventDefault();e.returnValue='';}}
 function updateGuard(){window.removeEventListener('beforeunload',guard);if(revision!==savedRevision)window.addEventListener('beforeunload',guard);}
 function mark(){if(loading||!initialized)return;revision++;updateGuard();if(!pendingRecovery)say('Unsaved changes · '+current.name);schedule();}
 function schedule(){clearTimeout(timer);if(auto.checked&&!pendingRecovery)timer=setTimeout(()=>save(false).catch(fail),1800);}
 async function save(manual=false){
  if(!initialized)throw Error('Project storage is still opening');
  if(pendingRecovery){say('Restore your last project or choose Start fresh before saving.');banner.hidden=false;return false;}
  if(writing){await writing;if(manual||revision!==savedRevision)return save(manual);return true;}
  if(busy()){if(manual){say('Finish the current operation, then save.');}else schedule();return false;}
  if(!manual&&revision===savedRevision)return true;
  finish();current.name=clean(name.value);name.value=current.name;
  // Capture synchronously, before yielding. Later edits get a higher revision and
  // cannot be falsely marked saved when this transaction eventually completes.
  const atRevision=revision, data=capture(),record={...current,updated:Date.now(),data,handle};
  say('Saving '+current.name+'…');
  writing=(async()=>{await put(record);savedRevision=atRevision;updateGuard();say('Saved on this device · '+current.name+' · '+new Date(record.updated).toLocaleTimeString());await refresh();})();
  let completed=false;try{await writing;completed=true;}finally{writing=null;if(completed&&revision!==savedRevision)schedule();}
  if(manual&&handle){
   // Permission prompts are only permitted after an explicit Save Now click.
   try{let permission=await handle.queryPermission({mode:'readwrite'});if(permission!=='granted')permission=await handle.requestPermission({mode:'readwrite'});if(permission!=='granted')throw Error('File permission was not granted');await writeFile(handle,data);say('Saved on this device and to '+handle.name);}
   catch(e){say('Saved on this device. File update failed: '+e.message);}
  }
  return true;
 }
 async function writeFile(target,data){const stream=await target.createWritable();try{await stream.write(new Blob([JSON.stringify(data)],{type:'application/json'}));await stream.close();}catch(e){try{await stream.abort();}catch{}throw e;}}
 async function loadRecord(id){
  if(busy())throw Error('Finish the current operation first');
  const record=await get(id);if(!record)throw Error('Saved project was not found');
  if(revision!==savedRevision&&!confirm('Replace the current scene with "'+record.name+'"? Save current changes first.'))return;
  if(writing)await writing;
  loading=true;try{finish();restore(record.data);current={id:record.id,name:record.name};handle=record.handle||null;name.value=current.name;revision=savedRevision=0;pendingRecovery=false;banner.hidden=true;updateGuard();await refresh();say('Restored '+current.name+' · Save Now updates this project');}finally{loading=false;}
 }
 saveButton.addEventListener('click',()=>save(true).catch(fail));
 el('p3QuickSaveNow').onclick=()=>saveButton.click();
 el('p3QuickOpenProject').onclick=()=>openButton.click();
 el('p3SaveAs').onclick=async()=>{try{if(pendingRecovery){banner.hidden=false;return;}if(busy())throw Error('Finish the current operation first');if(writing)await writing;const next=prompt('Name for the separate project copy',current.name+' Copy');if(next===null)return;current={id:crypto.randomUUID?.()||Date.now()+'-'+Math.random(),name:clean(next)};handle=null;name.value=current.name;mark();await save(true);}catch(e){fail(e);}};
 el('p3RestoreProject').onclick=()=>{if(list.value)loadRecord(list.value).catch(fail);};
 name.oninput=mark;
 name.onchange=()=>{current.name=clean(name.value);name.value=current.name;mark();};
 auto.onchange=()=>{if(auto.checked)schedule();else clearTimeout(timer);};
 el('p3DownloadProject').onclick=()=>{try{if(busy())throw Error('Finish the current operation first');finish();const data=capture(),url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=clean(name.value)+'.p3sculpt';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);say('Project file downloaded · '+a.download);}catch(e){fail(e);}};
 const link=el('p3LinkProjectFile');link.hidden=typeof window.showSaveFilePicker!=='function';
 link.onclick=async()=>{try{if(pendingRecovery){banner.hidden=false;return;}if(busy())throw Error('Finish the current operation first');const target=await window.showSaveFilePicker({suggestedName:clean(name.value)+'.p3sculpt',types:[{description:'Project3Studios project',accept:{'application/json':['.p3sculpt']}}]});finish();await writeFile(target,capture());handle=target;mark();await save(false);say('File connected · Save Now updates '+target.name);}catch(e){if(e.name!=='AbortError')fail(e);}};
 // Input notifications happen after editing, never on every pointer sample.
 document.addEventListener('pointerup',e=>{if(!panel.contains(e.target)&&!banner.contains(e.target))mark();});
 document.addEventListener('input',e=>{if(!panel.contains(e.target))mark();});
 document.addEventListener('change',e=>{if(!panel.contains(e.target)&&e.target.type!=='file')mark();});
 window.addEventListener('p3-project-change',mark);
 const backgroundSave=()=>{try{finish();if(auto.checked&&!pendingRecovery)save(false).catch(fail);}catch(e){fail(e);}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)backgroundSave();});
 window.addEventListener('pagehide',backgroundSave);
 // Long strokes remain responsive; the timer waits until the operation ends.
 setInterval(()=>{if(auto.checked&&revision!==savedRevision&&!busy())save(false).catch(fail);},30000);
 el('p3RecoveryFresh').onclick=()=>{pendingRecovery=false;banner.hidden=true;mark();};
 let lastId;
 el('p3RecoverLast').onclick=()=>loadRecord(lastId).catch(fail);
 const ready=new Promise(resolve=>{
  try{const request=indexedDB.open(database,1);request.onupgradeneeded=()=>{request.result.createObjectStore('projects',{keyPath:'id'});request.result.createObjectStore('heads',{keyPath:'id'});};request.onerror=()=>{initialized=true;fail(request.error);resolve();};request.onblocked=()=>say('Storage is blocked. Close another tab of the app, then reload.');request.onsuccess=async()=>{db=request.result;db.onversionchange=()=>db.close();initialized=true;try{const heads=await refresh();if(heads.length){lastId=heads[0].id;pendingRecovery=true;el('p3RecoveryText').textContent='Saved project found: '+heads[0].name+'. Restore it to keep working on the same save.';banner.hidden=false;say('Saved project available · Restore or Start fresh');}else say('Ready · Save Now creates a device save; later saves update it');}catch(e){fail(e);}resolve();};}catch(e){initialized=true;fail(e);resolve();}
 });
 return {ready,mark,save,async imported(filename){if(writing)await writing;pendingRecovery=false;banner.hidden=true;current={id:crypto.randomUUID?.()||Date.now()+'-'+Math.random(),name:clean(filename.replace(/\.p3sculpt$/i,''))};handle=null;name.value=current.name;mark();return save(false);}};
}

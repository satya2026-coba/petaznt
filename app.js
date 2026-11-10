const ENDPOINT='https://api-interop.atrbpn.go.id/manajemen/interop/api/eksternal/klungkung/service-znt-wms';
const $=id=>document.getElementById(id);
const map=L.map('map',{preferCanvas:true}).setView([-8.535,115.405],11);
const base={
 osm:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}),
 gray:L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19,attribution:'© CARTO'}),
 sat:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'})
};base.osm.addTo(map);
let layerRefs={},active=null;
function setStatus(msg,kind='neutral'){const el=$('status');el.className='notice '+kind;el.querySelector('span').textContent=msg;$('dot').className='status-indicator '+(kind==='good'?'ok':kind==='bad'?'err':'');$('connectionText').textContent=kind==='good'?'Layanan ZNT terhubung':kind==='bad'?'Koneksi layanan bermasalah':'Memeriksa layanan';}
function endpoint(){return $('serviceUrl').value.trim().replace(/[?&]+$/,'');}
function makeUrl(params){const u=new URL(endpoint());Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));return u.href;}
function localChildren(node,name){return [...node.children].filter(x=>x.localName===name);}
function parseLayers(xml){const roots=[...xml.getElementsByTagNameNS('*','Layer')];return roots.filter(n=>localChildren(n,'Name').length>0).map(n=>({node:n,name:localChildren(n,'Name')[0].textContent.trim(),title:localChildren(n,'Title')[0]?.textContent.trim()||localChildren(n,'Name')[0].textContent.trim()}));}
async function connect(){
 const url=endpoint();if(!url){setStatus('Alamat layanan belum diisi.','bad');return;}
 setStatus('Mengambil daftar layer dari server…');
 try{
  const res=await fetch(makeUrl({SERVICE:'WMS',REQUEST:'GetCapabilities',VERSION:'1.1.1'}),{method:'GET'});
  const body=await res.text();if(!res.ok)throw Error('Server HTTP '+res.status);
  const xml=new DOMParser().parseFromString(body,'application/xml');
  if(xml.getElementsByTagName('parsererror').length)throw Error('Respons server bukan XML yang valid.');
  const found=parseLayers(xml);if(!found.length)throw Error('Tidak ditemukan layer WMS bernama. Periksa dukungan GetCapabilities atau hak akses.');
  $('layers').replaceChildren();layerRefs={};active=null;
  found.forEach((item,i)=>{
   const label=document.createElement('label');label.className='layer-item';
   const check=document.createElement('input');check.type='checkbox';check.checked=i===0;
   const detail=document.createElement('span');const title=document.createElement('b');title.textContent=item.title;const name=document.createElement('small');name.textContent=item.name;detail.append(title,name);label.append(check,detail);$('layers').append(label);
   const wms=L.tileLayer.wms(url,{layers:item.name,format:'image/png',transparent:true,version:'1.1.1',attribution:'ATR/BPN · ZNT'});
   layerRefs[item.name]=wms;if(i===0){wms.addTo(map);active={name:item.name,layer:wms,title:item.title};}
   check.addEventListener('change',()=>{if(check.checked){wms.addTo(map);active={name:item.name,layer:wms,title:item.title};$('mapMessage').textContent='Layer aktif: '+item.title;}else{map.removeLayer(wms);if(active?.name===item.name)active=null;}});
  });
  setStatus('Koneksi berhasil. '+found.length+' layer ditemukan.','good');
  $('mapMessage').textContent='Layer '+found[0].title+' ditambahkan. Jika belum terlihat, periksa skala atau cakupan layer.';
 }catch(err){
  const cors=/Failed to fetch|NetworkError|Load failed/i.test(err.message);
  setStatus((cors?'Browser tidak dapat membaca respons server (kemungkinan CORS/jaringan). ':'Gagal membaca layanan: ')+err.message,'bad');
  $('layers').innerHTML='<div class="placeholder">Layer belum dapat dimuat. Pastikan endpoint aktif, akses diizinkan, dan server mengizinkan permintaan dari domain aplikasi (CORS).</div>';
 }
}
$('connectBtn').onclick=connect;$('refreshBtn').onclick=connect;$('loadLayers').onclick=connect;
$('basemap').onchange=e=>{Object.values(base).forEach(x=>map.removeLayer(x));base[e.target.value].addTo(map);};
$('goCoord').onclick=()=>{const lat=Number($('lat').value),lng=Number($('lng').value);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){alert('Latitude atau longitude tidak valid.');return;}map.setView([lat,lng],16);};
$('zoomKl').onclick=()=>map.setView([-8.535,115.405],11);
$('fullScreen').onclick=()=>{const el=document.querySelector('.map-card');if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.();setTimeout(()=>map.invalidateSize(),300);};
function safeFeatureContent(raw,contentType){
 const root=document.createElement('div');
 const addMeta=(label,value)=>{
  if(value===undefined||value===null||value==='')return;
  const p=document.createElement('p');p.className='feature-meta';
  const b=document.createElement('b');b.textContent=label+': ';
  const span=document.createElement('span');span.textContent=String(value);
  p.append(b,span);root.append(p);
 };
 function htmlTable(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const sourceTables=[...doc.querySelectorAll('table')];
  if(!sourceTables.length)return null;
  const result=document.createElement('div');
  sourceTables.forEach(source=>{
   const caption=source.querySelector('caption');
   if(caption&&caption.textContent.trim()){
    const heading=document.createElement('div');heading.className='feature-caption';heading.textContent=caption.textContent.trim();result.append(heading);
   }
   const table=document.createElement('table');table.className='feature-table';
   const rows=[...source.querySelectorAll('tr')];
   rows.forEach((row,index)=>{
    const cells=[...row.querySelectorAll(':scope > th, :scope > td')];
    if(!cells.length)return;
    const tr=document.createElement('tr');
    cells.forEach((cell,i)=>{
     const isHeader=cell.tagName.toLowerCase()==='th'||index===0;
     const el=document.createElement(isHeader?'th':'td');
     el.textContent=cell.textContent.replace(/\s+/g,' ').trim();
     tr.append(el);
    });
    table.append(tr);
   });
   result.append(table);
  });
  return result;
 }
 function renderPayload(payload,ctype){
  // The API wraps its actual GeoServer HTML in JSON: {status_code, messages, data:"<html>..."}
  if(typeof payload==='string'){
   const trimmed=payload.trim();
   if(trimmed.startsWith('{')||trimmed.startsWith('[')){
    try{return renderPayload(JSON.parse(trimmed),'application/json');}catch(_){}
   }
   if(/<(html|table|body|tr|td|th)\b/i.test(trimmed)){
    const parsed=htmlTable(trimmed);
    if(parsed)return parsed;
    const doc=new DOMParser().parseFromString(trimmed,'text/html');
    const clean=document.createElement('div');clean.textContent=(doc.body?.textContent||trimmed).trim();return clean;
   }
   const pre=document.createElement('pre');pre.className='feature-raw';pre.textContent=trimmed||'Tidak ada informasi pada titik ini.';return pre;
  }
  if(Array.isArray(payload)){
   const wrap=document.createElement('div');
   payload.forEach((item,i)=>{const section=renderPayload(item,'');section.classList.add('feature-section');wrap.append(section);});
   return wrap;
  }
  if(payload&&typeof payload==='object'){
   const wrap=document.createElement('div');
   if(payload.status_code!==undefined)addMeta('Status',payload.status_code);
   if(payload.messages)addMeta('Pesan',payload.messages);
   if(payload.data!==undefined){
    const data=renderPayload(payload.data,typeof payload.data==='string'?'text/html':'application/json');
    data.classList.add('feature-data');wrap.append(data);
   }else{
    const table=document.createElement('table');table.className='feature-table';
    Object.entries(payload).forEach(([key,value])=>{
     const tr=table.insertRow();const th=document.createElement('th');th.textContent=key;
     const td=document.createElement('td');
     if(value&&typeof value==='object')td.textContent=JSON.stringify(value);
     else td.textContent=String(value??'');
     tr.append(th,td);
    });wrap.append(table);
   }
   return wrap;
  }
  const empty=document.createElement('div');empty.textContent='Tidak ada informasi pada titik ini.';return empty;
 }
 // Parse the outer response as JSON first, then render the nested HTML in data as a real table.
 try{
  const parsed=JSON.parse(raw);
  const rendered=renderPayload(parsed,contentType||'application/json');
  root.append(rendered);
  return root;
 }catch(_){
  const rendered=renderPayload(raw,contentType||'');
  root.append(rendered);
  return root;
 }
}
map.on('click',async e=>{
 if(!active){$('mapMessage').textContent='Aktifkan layer terlebih dahulu untuk identifikasi.';return;}
 $('modal').classList.remove('hidden');$('featureInfo').textContent='Mengambil informasi dari layanan WMS…';
 try{
  const size=map.getSize(),pt=map.latLngToContainerPoint(e.latlng),bounds=map.getBounds();
  const sw=map.options.crs.project(bounds.getSouthWest()),ne=map.options.crs.project(bounds.getNorthEast());
  const bbox=[sw.x,sw.y,ne.x,ne.y].join(',');
  const url=makeUrl({SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetFeatureInfo',LAYERS:active.name,QUERY_LAYERS:active.name,STYLES:'',SRS:'EPSG:3857',BBOX:bbox,WIDTH:size.x,HEIGHT:size.y,FORMAT:'image/png',INFO_FORMAT:'text/html',X:Math.round(pt.x),Y:Math.round(pt.y),FEATURE_COUNT:5});
  const r=await fetch(url);const raw=await r.text();if(!r.ok)throw Error('HTTP '+r.status);
  $('featureInfo').replaceChildren(safeFeatureContent(raw,r.headers.get('content-type')||''));
 }catch(err){$('featureInfo').textContent='Informasi tidak dapat ditampilkan. Server mungkin tidak menyediakan GetFeatureInfo, memerlukan autentikasi, atau membatasi CORS. Detail: '+err.message;}
});
$('closeModal').onclick=()=>$('modal').classList.add('hidden');$('modal').onclick=e=>{if(e.target.id==='modal')$('modal').classList.add('hidden');};
connect();
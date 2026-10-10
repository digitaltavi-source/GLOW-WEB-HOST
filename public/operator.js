'use strict';
const el=id=>document.getElementById(id);
let config,token='',expires=0,binding=null,reviewDocument=null,busy=false;
function status(message,error=false){el('status').textContent=message;el('status').dataset.error=String(error);}
function random(){const bytes=crypto.getRandomValues(new Uint8Array(32));return b64url(bytes);}
function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function reset(){token='';expires=0;binding=null;reviewDocument=null;el('upload-button').disabled=true;el('evidence-button').disabled=true;el('result').textContent='';el('review').textContent='';el('binding').textContent='';el('logout').hidden=true;}
function credentials(){if(!token||Date.now()>=expires){reset();throw Error('Phiên đăng nhập hết hạn. Hãy đăng nhập lại.');}return {'Authorization':'Bearer '+token,'Content-Type':'application/json'};}
async function json(response){const data=await response.json();if(!response.ok||data.status==='failed')throw Error(data.error||data.errors?.[0]?.code||'Yêu cầu chưa được chấp nhận.');return data;}
async function login(){
 if(!config?.login_configured)throw Error('Chưa cấu hình ứng dụng đăng nhập quản trị. Cần cấu hình Auth0 trước khi sử dụng.');
 const state=random(),verifier=random(),challenge=b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 sessionStorage.setItem('glow-admission-pkce',JSON.stringify({state,verifier,created:Date.now(),client:config.client_id,issuer:config.issuer,redirect:config.redirect_uri}));
 const url=new URL('authorize',config.issuer.endsWith('/')?config.issuer:config.issuer+'/');
 url.search=new URLSearchParams({response_type:'code',client_id:config.client_id,redirect_uri:config.redirect_uri,audience:config.audience,scope:config.scope,state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
 location.assign(url);
}
async function callback(){
 const query=new URLSearchParams(location.search);
 if(!query.has('code')&&!query.has('error'))return;
 const saved=sessionStorage.getItem('glow-admission-pkce');sessionStorage.removeItem('glow-admission-pkce');
 history.replaceState(null,'','/operator');
 const pending=saved?JSON.parse(saved):null;
 if(!pending||query.get('state')!==pending.state||Date.now()-pending.created>600000||pending.client!==config.client_id||pending.issuer!==config.issuer||pending.redirect!==config.redirect_uri)throw Error('Phiên xác thực không khớp. Hãy đăng nhập lại.');
 if(query.has('error'))throw Error('Đăng nhập chưa được cấp quyền.');
 const response=await fetch(new URL('oauth/token',config.issuer.endsWith('/')?config.issuer:config.issuer+'/'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grant_type:'authorization_code',client_id:config.client_id,redirect_uri:config.redirect_uri,code:query.get('code'),code_verifier:pending.verifier})});
 const data=await json(response);
 if(typeof data.access_token!=='string'||data.token_type?.toLowerCase()!=='bearer'||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw Error('Không nhận được phiên API hợp lệ.');
 token=data.access_token;expires=Date.now()+Math.min(data.expires_in,86400)*1000;el('logout').hidden=false;status('Đã đăng nhập. Kiểm tra mission trước khi đăng ký file.');
}
async function getWork(){
 const mission=el('mission').value.trim();if(!/^NM-[a-f0-9]{12}$/.test(mission))throw Error('Mã mission không hợp lệ.');
 binding=null;el('upload-button').disabled=true;el('evidence-button').disabled=true;
 const response=await fetch('/mcp-v2',{method:'POST',headers:{...credentials(),Accept:'application/json, text/event-stream','mcp-protocol-version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'glow_get_factory_work',arguments:{mission_id:mission}}})});
 if(!response.ok)throw Error('Không đọc được mission: '+response.status);
 const raw=await response.text();const packet=JSON.parse(raw.startsWith('data:')||raw.startsWith('event:')?raw.split('\n').find(line=>line.startsWith('data:')).slice(5):raw);
 const responseBody=packet.result?.structuredContent;
 if(packet.error||packet.result?.isError||!responseBody||responseBody.status==='failed')throw Error(responseBody?.errors?.[0]?.code||'Không đọc được binding của mission.');
 const work=responseBody.result?.payload,plan=work?.preproduction_capability_plan;
 if(work?.phase!=='H2'||!plan)throw Error('Mission chưa có work H2 để đăng ký bằng chứng.');
 binding={mission_id:mission,expected_state_version:work.state_version,phase_work_id:plan.phase_work_id,work_contract_revision:plan.work_contract_revision};
 el('binding').textContent='H2 · version '+work.state_version+' · đúng tài khoản sở hữu mission';
 el('upload-button').disabled=false;el('evidence-button').disabled=false;
}
async function admit(action,args){
 if(!binding||el('mission').value.trim()!==binding.mission_id)throw Error('Hãy kiểm tra lại mission.');
 if(busy)throw Error('Đang xử lý yêu cầu trước.');busy=true;
 try{
 const out=await json(await fetch('/api/operator/admission',{method:'POST',headers:credentials(),body:JSON.stringify({action,args:{...args,...binding}})}));
 const result=out.result?.payload;el('result').textContent=JSON.stringify(result,null,2);return result;
 }finally{busy=false;}
}
function run(task){Promise.resolve().then(task).catch(error=>status(error.message,true));}
el('login').addEventListener('click',()=>run(login));
el('logout').addEventListener('click',()=>{reset();status('Đã kết thúc phiên quản trị trên trang này.');});
el('work').addEventListener('click',()=>run(getWork));
el('mission').addEventListener('input',()=>{binding=null;el('upload-button').disabled=true;el('evidence-button').disabled=true;el('binding').textContent='';});
el('upload').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
 const file=el('artifact').files[0];if(!file||file.size===0||file.size>8*1024*1024)throw Error('Chọn file thật, không rỗng, tối đa 8 MiB.');
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 const expected=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const result=await admit('register_artifact',{data_base64:btoa(binary)});
 if(result?.artifact_sha256!==expected)throw Error('Hash file trả về không khớp. Dừng đăng ký evidence.');
 status('Đã đăng ký đúng bytes của file. Đây là xác nhận identity, chưa phải phê duyệt chất lượng.');
});});
el('evidence-file').addEventListener('change',()=>{reviewDocument=null;el('reviewed').checked=false;run(async()=>{
 const file=el('evidence-file').files[0];if(!file||file.size>512*1024)throw Error('Chọn hồ sơ JSON tối đa 512 KiB.');
 const document=JSON.parse(await file.text());
 const allowed=['kind','artifact_sha256','evidence_sha256','bindings','reviewed_result'];
 if(!document||typeof document!=='object'||Array.isArray(document)||Object.keys(document).some(key=>!allowed.includes(key)))throw Error('Hồ sơ có trường ngoài contract.');
 reviewDocument=document;el('review').textContent=JSON.stringify(document,null,2);
});});
el('evidence').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
 if(!reviewDocument||!el('reviewed').checked)throw Error('Đọc hồ sơ và xác nhận đã xem bằng chứng.');
 await admit('register_evidence',reviewDocument);status('Đã nhận GE từ backend. Tiếp tục capability submission; H2 vẫn cần khách hàng duyệt riêng.');
});});
run(async()=>{config=await json(await fetch('/api/operator/config',{cache:'no-store'}));if(!config.enabled)throw Error('Kênh quản trị chưa sẵn sàng trên deployment này.');if(!config.login_configured){status('Giao diện đã có; cần cấu hình ứng dụng đăng nhập quản trị trước khi sử dụng.',true);return;}status('Đăng nhập để đăng ký bằng chứng dự án.');await callback();});

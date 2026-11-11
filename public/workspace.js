'use strict';
const byId=id=>document.getElementById(id);
const form=byId('brief'),result=byId('result'),output=byId('capsule'),feedback=byId('feedback'),goal=byId('goal');
const counter=()=>byId('remaining').textContent=goal.value.length+' / 700';
goal.addEventListener('input',counter);counter();
let lastDraft=null;
const show=(message)=>{feedback.textContent=message};
form.addEventListener('submit',event=>{
 event.preventDefault();
 const selected=form.querySelector('input[name="type"]:checked');
 if(!selected){show('Hãy chọn loại website.');form.querySelector('input[name="type"]').focus();return}
 const description=goal.value.trim();
 if(description.length<15){show('Hãy mô tả mục tiêu với ít nhất 15 ký tự.');goal.focus();return}
 lastDraft={schema:'GLOW_WEB_PUBLIC_INTAKE_V1',intent:'START_GLOW_WEB_MISSION',website_type:selected.value,goal:description,name_or_brand:byId('brand').value.trim()||null,language:byId('language').value,privacy:'PUBLIC_INTAKE_ONLY_NO_PRIVATE_FACTORY_STATE',execution_profile:'DEMO_BOUNDED',notice:'DRAFT_ONLY_NOT_SUBMITTED'};
 output.textContent=JSON.stringify(lastDraft,null,2);
 result.hidden=false;result.focus();show('Đã chuẩn bị bản nháp. Chưa gửi dữ liệu lên nhà máy.');
});
byId('copy').addEventListener('click',async()=>{
 if(!lastDraft)return;
 try{await navigator.clipboard.writeText(JSON.stringify(lastDraft,null,2));show('Đã sao chép nội dung. Bạn có thể gửi qua kênh đã kết nối.')}
 catch{show('Trình duyệt chưa cho phép sao chép tự động. Hãy chọn và sao chép văn bản trong khung.')}
});
async function checkConnection(){
 const host=byId('host-status'),service=byId('service-status'),dh=byId('dot-host'),ds=byId('dot-service');
 host.textContent='Đang kiểm tra…';service.textContent='Đang kiểm tra…';dh.className='dot';ds.className='dot';
 const timeout=AbortSignal.timeout(7000);
 const [a,b]=await Promise.allSettled([
 fetch('/api/public/profile',{signal:timeout,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('unavailable');const j=await r.json();if(j.product!=='GLOW Web')throw Error('unexpected');return j}),
 fetch('/readyz',{signal:timeout,cache:'no-store'}).then(async r=>({ok:r.ok,body:await r.json()}))
 ]);
 if(a.status==='fulfilled'){host.textContent='Đã kết nối';dh.classList.add('ok')}else{host.textContent='Chưa xác nhận kết nối';dh.classList.add('down')}
 if(b.status==='fulfilled'&&b.value.ok&&b.value.body.ok===true){service.textContent='Đã phản hồi, chưa xác nhận dự án';ds.classList.add('ok')}
 else{service.textContent='Chưa sẵn sàng hoặc tạm gián đoạn';ds.classList.add('down')}
}
byId('refresh').addEventListener('click',checkConnection);
void checkConnection();
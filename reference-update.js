// 公开客户端只提交固定更新任务；执行凭据仅保存在云端和 NAS。
function connectReferenceUpdate(button, report, reread, api) {
  const endpoint='https://yuyi-materials-api.kslk367270327.chatgpt.site/api/materials-update';
  let pending=false;
  async function request(method,job){
    if(api)return api(method,job);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{const r=await fetch(endpoint+(job?'?job='+encodeURIComponent(job):''),{method,credentials:'omit',cache:'no-store',headers:method==='POST'?{'Content-Type':'application/json'}:{},body:method==='POST'?'{}':undefined,signal:controller.signal});const result=await r.json();if(!r.ok)throw Error(result.message||'更新服务暂不可用');return result;}finally{clearTimeout(timer);}
  }
  button.addEventListener('click',async()=>{
    if(pending)return;pending=true;
    const label=button.querySelector('span:last-child'),original=label.textContent;
    button.disabled=true;button.setAttribute('aria-busy','true');label.textContent='更新中';report('正在提交更新请求…',false);
    try{
      let result=await request('POST');const started=Date.now();
      while(['queued','running'].includes(result.state)){
        report(result.message||'正在更新跨表引用…',false);
        if(Date.now()-started>95000)throw Error('更新超时，结果尚未确认，请稍后查看。');
        await new Promise(resolve=>setTimeout(resolve,2000));
        result=await request('GET',result.job);
      }
      if(result.state!=='success')throw Error(result.message||'更新未完成，请稍后重试。');
      report('跨表引用更新成功，正在重新读取统计…',false);
      const fresh=await reread(result.completedAt);
      report(fresh?'跨表引用已更新，统计已刷新。':'跨表引用已更新；统计仍在读取，请以页面读取时间为准。',false);
    }catch(error){report(error.message==='Failed to fetch'?'暂时无法连接更新服务，请检查网络后重试。':error.message,true);}
    finally{pending=false;button.disabled=false;button.removeAttribute('aria-busy');label.textContent=original;}
  });
}

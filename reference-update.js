// 公开客户端只提交固定更新任务；执行凭据仅保存在云端和 NAS。
function createReferenceUpdater(report, reread, api, recordSuccess) {
  const endpoint='https://yuyi-materials-api.kslk367270327.chatgpt.site/api/materials-update';
  let pending=null;
  async function request(method,job){
    if(api)return api(method,job);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{const r=await fetch(endpoint+(job?'?job='+encodeURIComponent(job):''),{method,credentials:'omit',cache:'no-store',headers:method==='POST'?{'Content-Type':'application/json'}:{},body:method==='POST'?'{}':undefined,signal:controller.signal});const result=await r.json();if(!r.ok)throw Error(result.message||'更新服务暂不可用');return result;}finally{clearTimeout(timer);}
  }
  async function run(){
    report('正在更新台账引用…',false);
    try{
      let result=await request('POST');const started=Date.now();
      while(['queued','running'].includes(result.state)){
        report(result.message||'正在更新跨表引用…',false);
        if(Date.now()-started>95000)throw Error('更新超时，结果尚未确认，请稍后查看。');
        await new Promise(resolve=>setTimeout(resolve,2000));
        result=await request('GET',result.job);
      }
      if(result.state!=='success')throw Error(result.message||'更新未完成，请稍后重试。');
      if(recordSuccess)recordSuccess(result.completedAt);
      report('跨表引用已更新，正在读取自用施工台账…',false);
      const fresh=await reread(result.completedAt);
      report(fresh?'台账引用和统计已更新。':'台账引用已更新，统计暂未取得新数据，请查看读取时间。',!fresh);
      return !!fresh;
    }catch(error){
      await reread();
      report(error.message==='Failed to fetch'?'台账引用暂未更新，请检查网络后下拉重试。':error.message,true);
      return false;
    }
  }
  function update(){
    if(!pending)pending=run().finally(()=>{pending=null;});
    return pending;
  }
  update.readStatus=async()=>{
    try{const status=await request('GET');if(status.lastSuccessAt&&recordSuccess)recordSuccess(status.lastSuccessAt);}catch{}
  };
  return update;
}

const ENDPOINT = 'https://yuyi-materials-api.kslk367270327.chatgpt.site/api/materials';
const $ = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const signed = n => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
let data, station = 'all', loading = false;
const names = ['水泥','石屑','5–10 mm','10–20 mm','20–25 mm','20–30 mm'];
function validate(payload) {
  if (!payload.success || !Array.isArray(payload.rows) || payload.rows.length < 16 || !Number.isFinite(Date.parse(payload.readAt))) throw Error('数据格式异常');
  const rows = payload.rows;
  for(let r=2;r<16;r++) for(let c=2;c<10;c++) if(typeof rows[r]?.[c] !== 'number' || !Number.isFinite(rows[r][c])) throw Error('统计表存在空值或公式错误');
  // 容差只覆盖显示舍入；异常总计不能继续显示为正常数据。
  for(let c=2;c<10;c++) {
    if(Math.abs(rows[15][c]-rows[3][c]-rows[5][c]-rows[9][c]-rows[11][c])>.05) throw Error('进场总量校验未通过');
    if(Math.abs(rows[14][c]-rows[2][c]-rows[8][c])>.05) throw Error('理论总消耗校验未通过');
  }
  return payload;
}
function value(row,col){return data.rows[row-1][col];}
function values(col){
  const selected = station==='all' ? [0,1] : [Number(station)];
  const total = {theory:0,self:0,external:0,selfBatches:0,externalBatches:0};
  for(const s of selected){const r=3+s*6; total.theory+=value(r,col);total.self+=value(r+1,col);total.selfBatches+=value(r+2,col);total.external+=value(r+3,col);total.externalBatches+=value(r+4,col);}
  total.incoming=total.self+total.external;total.delta=total.incoming-total.theory;return total;
}
function material(i){const v=values(i+2),max=Math.max(v.incoming,v.theory,1);return `<details class="material"><summary><div class="material-title"><div class="material-name"><span class="num">0${i+1}</span>${names[i]}</div><span class="pill ${v.delta<0?'negative':''}">差值 ${signed(v.delta)}</span></div><div class="material-values"><div><span>进场量 / t</span><b>${fmt(v.incoming)}</b></div><div><span>理论消耗 / t</span><b>${fmt(v.theory)}</b></div></div><div class="bars" aria-hidden="true"><div class="bar-track"><i style="width:${v.incoming/max*100}%"></i></div><div class="bar-track"><i class="theory" style="width:${v.theory/max*100}%"></i></div></div><span class="expand-hint">自检 / 外委明细 ⌄</span></summary><div class="detail-grid"><div><span>自检进场量</span><b>${fmt(v.self)}</b><small>t</small></div><div><span>外委进场量</span><b>${fmt(v.external)}</b><small>t</small></div><div><span>自检批次</span><b>${v.selfBatches}</b><small>批</small></div><div><span>外委批次</span><b>${v.externalBatches}</b><small>批</small></div></div></details>`;}
function render(){
  if(!data)return;
  const expanded = [...document.querySelectorAll('#dashboard details')].map((el,i)=>el.open?i:-1).filter(i=>i>=0);
  const v=values(9),agg=values(8);
  $('#dashboard').innerHTML=`<section class="hero" aria-label="${station==='all'?'全部站点':Number(station)+1+'号站'}总览"><div class="hero-top"><span>累计进场总量</span><span class="unit-badge">TONNES</span></div><div class="hero-number">${fmt(v.incoming)}<small>t</small></div><div class="hero-bottom"><div><span>理论总消耗 / t</span><strong>${fmt(v.theory)}</strong></div><div><span>进场 − 理论 / t</span><strong class="delta">${signed(v.delta)}</strong></div></div></section><div class="metrics"><section class="metric"><label>自检进场量</label><strong>${fmt(v.self)}<small>t</small></strong><footer><b>${v.selfBatches}</b> 批次 · 占进场 ${v.incoming?(v.self/v.incoming*100).toFixed(1):'0.0'}%</footer></section><section class="metric"><label>外委进场量</label><strong>${fmt(v.external)}<small>t</small></strong><footer><b>${v.externalBatches}</b> 批次 · 占进场 ${v.incoming?(v.external/v.incoming*100).toFixed(1):'0.0'}%</footer></section></div><div class="section-head"><h2>材料明细</h2><span>6 类材料 · 单位 t</span></div><div class="legend"><span><i></i>实际进场</span><span><i class="theory"></i>理论消耗</span></div><div class="materials">${names.map((_,i)=>material(i)).join('')}</div><div class="aggregate"><div>集料进场合计<span>石屑 + 各规格碎石，不含水泥</span></div><strong>${fmt(agg.incoming)} <small>t</small></strong></div><details class="notes"><summary>统计口径与数据来源 ⌄</summary><p>进场总量 = 自检进场量 + 外委进场量。差值 = 进场总量 − 理论消耗。差值为统计量差额，不代表实盘库存或损耗率。</p><p>自检水泥按用途“底基层、基层”统计；外委统一按 X 列“水稳混合料”筛选，并只统计有有效代表数量的记录。每条有效记录计一个批次。全部站点为 1# 与 2# 之和。</p><p>页面每 60 秒尝试读取统计表当前值；实时通道不可达时显示同域备用快照，备用同步计划为每 5 分钟一次，可能延迟。读取时间不代表源台账最后修改时间。跨表引用的新数据须在金山文档完成“更新引用”，本页才会显示更新后的结果。</p><a href="https://www.kdocs.cn/l/clnD16go2o5m" target="_blank" rel="noopener noreferrer">打开施工台账 ↗</a></details>`;
  expanded.forEach(i=>{const el=document.querySelectorAll('#dashboard details')[i];if(el)el.open=true;});
}
function timeText(t){return new Date(t).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});}
async function readJSON(url){
  const controller=typeof AbortController==='function'?new AbortController():null;
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{if(controller)controller.abort();reject(Error('读取超时'));},20000);});
  try{return await Promise.race([fetch(url,{cache:'no-store',...(controller?{signal:controller.signal}:{})}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return validate(await r.json());}),timeout]);}finally{clearTimeout(timer);}
}
function showData(payload,mode){
  if(!data || Date.parse(payload.readAt)>=Date.parse(data.readAt)){data=payload;render();try{localStorage.setItem('yuyi-materials-v1',JSON.stringify(data));}catch{}}
  const stale=Date.now()-Date.parse(data.readAt)>(mode==='live'?180000:900000);
  $('#status').textContent=stale?'数据待更新':mode==='live'?'已连接台账':'备用数据';
  $('#status').classList.toggle('error',stale);
  $('#sync').textContent=`读取于 ${timeText(data.readAt)} · ${mode==='live'?'每分钟自动刷新':'备用快照，约每 5 分钟同步（可能延迟）'}${stale?' · 当前数据已过期':''}`;
}
async function refresh(){
  if(loading)return;loading=true;$('#refresh').disabled=true;
  $('#status').textContent='读取中';
  try{
    let liveSucceeded=false;
    const live=readJSON(ENDPOINT).then(v=>{liveSucceeded=true;showData(v,'live');return v;}).catch(()=>null);
    const backup=readJSON('./data.json?t='+Date.now()).then(v=>{if(!liveSucceeded)showData(v,'snapshot');return v;}).catch(()=>null);
    const results=await Promise.all([live,backup]);
    if(results[0])showData(results[0],'live');
    else if(results[1])showData(results[1],'snapshot');
    else throw Error('两个数据通道均不可用');
  }catch{
    $('#status').textContent=data?'更新失败':'连接失败';$('#status').classList.add('error');
    $('#sync').textContent=data?`暂无法读取最新数据，保留 ${timeText(data.readAt)} 的结果。点击右上角重试。`:'暂时无法读取台账，请点击右上角重试。';
    if(!data)$('#dashboard').innerHTML='<section class="loading">数据尚未加载<br><br>网络恢复后会自动重试</section>';
  }finally{loading=false;$('#refresh').disabled=false;}
}
document.querySelectorAll('[data-station]').forEach(button=>button.addEventListener('click',()=>{station=button.dataset.station;document.querySelectorAll('[data-station]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});render();}));
function tab(name){document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);if(b.dataset.tab===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});const water=name==='water';$('#main').hidden=!water;$('#future').hidden=water;if(!water){const label=name==='asphalt'?'沥青':'混凝土';$('#future').innerHTML=`<span class="future-icon">${name==='asphalt'?'≋':'▦'}</span><h1>${label}混合料</h1><p>原材消耗统计即将接入<br>当前可查看水稳原材数据</p><button id="back-water">查看水稳统计</button>`;$('#back-water').onclick=()=>tab('water');}window.scrollTo({top:0,behavior:'instant'});}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
$('#refresh').addEventListener('click',refresh);
try{const saved=localStorage.getItem('yuyi-materials-v1');if(saved){data=validate(JSON.parse(saved));render();$('#sync').textContent=`本地缓存 ${timeText(data.readAt)} · 正在读取最新数据`;}}catch{}
refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('online',refresh);

const ENDPOINT = 'https://yuyi-materials-api.kslk367270327.chatgpt.site/api/materials';
const $ = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n).replace(/(\.\d{2})$/, '<span class="decimal">$1</span>');
const signed = n => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
let data, station = 'all', loading = false;
const names = ['水泥','石屑','5–10 mm','10–20 mm','20–25 mm','20–30 mm'];
// 统一 24px 线性图标，避免字符图标在不同手机上显示不一致。
const iconPaths = {
  layers:'<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  road:'<path d="m7 3-3 18M17 3l3 18M12 3v3m0 4v4m0 4v3"/>',
  cube:'<path d="m12 3 9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5"/>',
  refresh:'<path d="M20 7v5h-5"/><path d="M20 12a8 8 0 1 0-2.35 5.65M20 7v5"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  bag:'<path d="m8 3 1 4-4 6v7h14v-7l-4-6 1-4ZM9 7h6M9 14h6M12 11v6"/>',
  stone:'<path d="m3 15 4-9 8-2 6 10-5 6H7Z"/><path d="m7 6 4 7 10 1M11 13l-4 7m4-7 5 7"/>',
  check:'<path d="M9 3H5v18h14V3h-4M9 3v4h6V3ZM8 14l3 3 5-6"/>'
};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.layers}</svg>`;}
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});

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
function material(i){
  const v=values(i+2);
  return `<details class="material"><summary><div class="material-title"><span class="material-icon">${icon(i===0?'bag':'stone')}</span><div class="material-name">${names[i]}</div><span class="detail-action">明细 ${icon('chevron')}</span></div><div class="material-values"><div><span>累计进场</span><b>${fmt(v.incoming)}</b></div><div><span>理论消耗</span><b>${fmt(v.theory)}</b></div><div class="difference ${v.delta<0?'negative':''}"><span>差值</span><b>${signed(v.delta)}</b></div></div></summary><div class="detail-grid"><div><span>自检进场量</span><b>${fmt(v.self)}</b><small>t</small></div><div><span>外委进场量</span><b>${fmt(v.external)}</b><small>t</small></div><div><span>自检批次</span><b>${v.selfBatches}</b><small>批</small></div><div><span>外委批次</span><b>${v.externalBatches}</b><small>批</small></div></div></details>`;
}
function render(){
  if(!data)return;
  const expanded = [...document.querySelectorAll('#dashboard details')].map((el,i)=>el.open?i:-1).filter(i=>i>=0);
  const v=values(9),agg=values(8);
  $('#dashboard').innerHTML=`<section class="hero" aria-label="${station==='all'?'全部站点':Number(station)+1+'号站'}总览"><div class="hero-top"><span>累计进场总量</span><span class="unit-badge">${station==='all'?'全部站点':Number(station)+1+'# 拌合站'}</span></div><div class="hero-number">${fmt(v.incoming)}<small>t</small></div><div class="hero-bottom"><div><span>理论总消耗 / t</span><strong>${fmt(v.theory)}</strong></div><div><span>进场 − 理论 / t</span><strong class="delta">${signed(v.delta)}</strong></div></div></section><details class="inspection"><summary><span class="inspection-label">${icon('check')} 检验统计</span><span class="inspection-count">自检 ${v.selfBatches} 批 · 外委 ${v.externalBatches} 批</span>${icon('chevron')}</summary><div class="metrics"><section class="metric"><label>自检进场量</label><strong>${fmt(v.self)}<small>t</small></strong><footer><b>${v.selfBatches}</b> 批次 · 占进场 ${v.incoming?(v.self/v.incoming*100).toFixed(1):'0.0'}%</footer></section><section class="metric"><label>外委进场量</label><strong>${fmt(v.external)}<small>t</small></strong><footer><b>${v.externalBatches}</b> 批次 · 占进场 ${v.incoming?(v.external/v.incoming*100).toFixed(1):'0.0'}%</footer></section></div></details><div class="section-head"><h2>材料明细</h2><span>6 类材料 / 单位 t</span></div><p class="section-caption">差值 = 进场 − 理论消耗，不代表库存</p><div class="materials">${names.map((_,i)=>material(i)).join('')}</div><div class="aggregate"><div>集料进场合计<span>石屑 + 各规格碎石，不含水泥</span></div><strong>${fmt(agg.incoming)} <small>t</small></strong></div><details class="notes"><summary>统计口径与数据来源 ⌄</summary><p>进场总量 = 自检进场量 + 外委进场量。差值 = 进场总量 − 理论消耗。差值为统计量差额，不代表实盘库存或损耗率。</p><p>自检水泥按用途“底基层、基层”统计；外委统一按 X 列“水稳混合料”筛选，并只统计有有效代表数量的记录。每条有效记录计一个批次。全部站点为 1# 与 2# 之和。</p><p>页面每 60 秒尝试读取统计表当前值；实时通道不可达时显示同域备用快照，备用同步计划为每 5 分钟一次，可能延迟。读取时间不代表源台账最后修改时间。跨表引用的新数据须在金山文档完成“更新引用”，本页才会显示更新后的结果。</p><a href="https://www.kdocs.cn/l/clnD16go2o5m" target="_blank" rel="noopener noreferrer">打开施工台账 ↗</a></details>`;
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
  $('#sync').classList.toggle('error',stale);
  $('#sync').textContent=`读取 ${timeText(data.readAt)} · ${mode==='live'?'实时台账':'备用快照'}${stale?'（已过期）':''}`;
}
async function refresh(){
  if(loading)return;loading=true;
  $('#sync').setAttribute('aria-busy','true');
  try{
    let liveSucceeded=false;
    const live=readJSON(ENDPOINT).then(v=>{liveSucceeded=true;showData(v,'live');return v;}).catch(()=>null);
    const backup=readJSON('./data.json?t='+Date.now()).then(v=>{if(!liveSucceeded)showData(v,'snapshot');return v;}).catch(()=>null);
    const results=await Promise.all([live,backup]);
    if(results[0])showData(results[0],'live');
    else if(results[1])showData(results[1],'snapshot');
    else throw Error('两个数据通道均不可用');
    return true;
  }catch{
    $('#sync').classList.add('error');
    $('#sync').textContent=data?`暂无法读取最新数据，保留 ${timeText(data.readAt)} 的结果。下拉刷新重试。`:'暂时无法读取台账，请下拉刷新重试。';
    if(!data)$('#dashboard').innerHTML='<section class="loading">数据尚未加载<br><br>网络恢复后会自动重试</section>';
    return false;
  }finally{loading=false;$('#sync').removeAttribute('aria-busy');}
}
// 只接管页面顶部的单指向下手势；普通滚动、横向移动和多指缩放保持原生行为。
const pull = $('#pull-refresh'), pullLabel = $('#pull-label');
let pullStart = null, pullDistance = 0, pullBusy = false;
function resetPull(){pullStart=null;pullDistance=0;if(!pullBusy){pull.style.height='0px';pull.classList.remove('dragging','refreshing');}}
$('#main').addEventListener('touchstart',event=>{
  if(event.touches.length!==1){resetPull();return;}
  if(loading||pullBusy||window.scrollY>0)return;
  const t=event.touches[0];pullStart={x:t.clientX,y:t.clientY};pullDistance=0;
},{passive:true});
$('#main').addEventListener('touchmove',event=>{
  if(!pullStart)return;
  if(event.touches.length!==1||window.scrollY>0){resetPull();return;}
  const t=event.touches[0],dy=t.clientY-pullStart.y,dx=Math.abs(t.clientX-pullStart.x);
  if(dy<=0||dx>Math.max(12,dy)){resetPull();return;}
  if(dy<8)return;
  if(event.cancelable)event.preventDefault();
  pullDistance=Math.min(88,dy*.5);pull.classList.add('dragging');pull.style.height=pullDistance+'px';
  pullLabel.textContent=pullDistance>=64?'松开刷新':'下拉刷新';
},{passive:false});
$('#main').addEventListener('touchend',async()=>{
  if(!pullStart)return;
  const ready=pullDistance>=64;pullStart=null;
  if(!ready||loading){resetPull();return;}
  pullBusy=true;pull.classList.remove('dragging');pull.classList.add('refreshing');pull.style.height='54px';pullLabel.textContent='正在刷新…';
  try{const ok=await refresh();pullLabel.textContent=ok?'已重新读取数据':'刷新失败，请重试';}
  finally{pull.classList.remove('refreshing');setTimeout(()=>{pullBusy=false;resetPull();},1000);}
},{passive:true});
$('#main').addEventListener('touchcancel',resetPull,{passive:true});

document.querySelectorAll('[data-station]').forEach(button=>button.addEventListener('click',()=>{station=button.dataset.station;document.querySelectorAll('[data-station]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});render();}));
function tab(name){document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);if(b.dataset.tab===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});const water=name==='water';$('#main').hidden=!water;$('#future').hidden=water;if(!water){const label=name==='asphalt'?'沥青':'混凝土';$('#future').innerHTML=`<span class="future-icon">${icon(name==='asphalt'?'road':'cube')}</span><h1>${label}混合料</h1><p>原材消耗统计即将接入<br>当前可查看水稳原材数据</p><button id="back-water">查看水稳统计</button>`;$('#back-water').onclick=()=>tab('water');}window.scrollTo({top:0,behavior:'instant'});}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
try{const saved=localStorage.getItem('yuyi-materials-v1');if(saved){data=validate(JSON.parse(saved));render();$('#sync').textContent=`本地缓存 ${timeText(data.readAt)} · 正在读取最新数据`;}}catch{}
refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('online',refresh);

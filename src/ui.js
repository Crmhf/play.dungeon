// ========== HUD / UI / 主入口 (依赖 engine.js 的全局 G) ==========
window.addEventListener('error',e=>{
  let d=document.getElementById('errbox'); if(!d){d=document.createElement('div');d.id='errbox';d.style.cssText='position:fixed;top:0;left:0;color:#f66;z-index:999;font:12px monospace;background:#000a;padding:4px;max-width:90vw';document.body.appendChild(d);}
  d.textContent='ERR: '+e.message+' @ '+(e.filename||'').split('/').pop()+':'+e.lineno;
});

function drawHUD(ctx){
  // 顶部栏
  ctx.fillStyle='rgba(10,6,18,0.72)'; ctx.fillRect(0,0,VIEW_W,64);
  ctx.strokeStyle='rgba(150,110,220,0.4)';ctx.lineWidth=2;ctx.strokeRect(-2,-2,VIEW_W+4,66);

  // P1 / P2 血条面板: P1左上角, P2右上角
  G.players.forEach((p,i)=>{
    const leftSide = i===0;
    const x = leftSide? 20 : VIEW_W-20-260, y=14;
    ctx.textAlign='left';
    ctx.fillStyle=p.alive?p.color:'#555'; ctx.font='bold 13px "Press Start 2P",monospace';
    ctx.fillText(`P${i+1} ${p.def.name}`, x, y+10);
    // 每人独立金币(名字右侧)
    if(G.imgs.coin) ctx.drawImage(G.imgs.coin, x+118, y-1, 15,15);
    ctx.fillStyle='#ffd34d'; ctx.font='bold 11px "Press Start 2P",monospace';
    ctx.fillText(`${p.gold||0}`, x+136, y+11);
    drawBar(ctx,x,y+18,150,12,p.hp/p.maxHp, p.alive?'#7ee081':'#444');
    ctx.fillStyle='#fff';ctx.font='9px "Press Start 2P",monospace';
    ctx.fillText(`${Math.ceil(p.hp)}/${Math.ceil(p.maxHp)}`,x+156,y+27);
    // 当前武器 + 装备图标
    if(p.weapon && WEAPONS[p.weapon]){ const w=WEAPONS[p.weapon];
      ctx.font='13px sans-serif'; ctx.fillStyle=w.color;
      ctx.fillText(w.icon+' '+w.name, x, y+48); }
    if(p.gear && GEARS[p.gear]){ const g=GEARS[p.gear];
      ctx.font='12px sans-serif'; ctx.fillStyle=g.color;
      ctx.fillText(g.icon, x+108, y+48); }

    // ===== 专属技能冷却框(面板右端 36x36) =====
    if(p.def.skill){
      const sk=p.def.skill;
      const cdBase=p.skillCdMax||p.skillMax;
      const frac=p.skillCd>0? clamp(p.skillCd/cdBase,0,1):0;
      const cx=x+222, cy=y+2, cs=36; // 框左上+边长
      // 底框
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(cx-2,cy-2,cs+4,cs+4);
      ctx.strokeStyle=frac>0?'#4a3a6a':sk.color; ctx.lineWidth=2;
      ctx.strokeRect(cx-2,cy-2,cs+4,cs+4);
      if(frac>0){
        // 冷却中: 暗底 + 按剩余比例从顶部往下亮起(回充动画)
        ctx.fillStyle='rgba(60,45,90,0.6)'; ctx.fillRect(cx,cy,cs,cs);
        ctx.save(); ctx.beginPath(); ctx.rect(cx, cy+cs*frac, cs, cs*(1-frac)); ctx.clip();
        ctx.fillStyle=sk.color; ctx.globalAlpha=0.35; ctx.fillRect(cx,cy,cs,cs); ctx.restore();
        // 剩余秒数
        ctx.fillStyle='#fff'; ctx.font='bold 14px "Press Start 2P",monospace'; ctx.textAlign='center';
        ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=3;
        const cdTxt=p.skillCd.toFixed(1);
        ctx.strokeText(cdTxt,cx+cs/2,cy+cs/2+5); ctx.fillText(cdTxt,cx+cs/2,cy+cs/2+5);
        ctx.textAlign='left';
      } else {
        // 就绪: 高亮✦ + 脉冲边框
        const pulse=0.7+Math.sin(G.time*6)*0.3;
        ctx.save(); ctx.globalAlpha=pulse;
        ctx.strokeStyle=sk.color; ctx.lineWidth=3;
        ctx.strokeRect(cx-3,cy-3,cs+6,cs+6);
        ctx.fillStyle=sk.color; ctx.font='bold 20px sans-serif'; ctx.textAlign='center';
        ctx.fillText('✦',cx+cs/2,cy+cs/2+7); ctx.restore();
        ctx.textAlign='left';
      }
      // 技能名(框下方)
      ctx.fillStyle=frac>0?'#8a7ab0':sk.color; ctx.font='9px "Press Start 2P",monospace'; ctx.textAlign='center';
      ctx.fillText(sk.name, cx+cs/2, cy+cs+12);
      ctx.textAlign='left';
    }
  });

  // 波次 / 关卡
  ctx.textAlign='center'; ctx.fillStyle='#ffd34d'; ctx.font='bold 16px "Press Start 2P",monospace';
  ctx.fillText(`波次 ${G.wave}/${TOTAL_WAVES}`, VIEW_W/2, 26);
  ctx.fillStyle=LEVEL_DEFS[G.level].tint; ctx.font='11px "Press Start 2P",monospace';
  ctx.fillText(LEVEL_DEFS[G.level].name, VIEW_W/2, 48);

  // Boss 大血条(有存活Boss时)
  const boss=G.enemies.find(e=>e.isBoss&&e.alive);
  if(boss){
    const bw=560, bx=VIEW_W/2-bw/2, by=72;
    ctx.textAlign='center'; ctx.fillStyle='#ff5c5c'; ctx.font='bold 13px "Press Start 2P",monospace';
    ctx.fillText(boss.pumpkinKing?'🎃 南 瓜 王':'👹 BOSS', VIEW_W/2, by-6);
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(bx-3,by-3,bw+6,18);
    const frac=clamp(boss.hp/boss.maxHp,0,1);
    const grad=ctx.createLinearGradient(bx,0,bx+bw,0);
    grad.addColorStop(0,'#ff2a2a'); grad.addColorStop(1,'#ff8a5c');
    ctx.fillStyle=grad; ctx.fillRect(bx,by,bw*frac,12);
    ctx.strokeStyle='#ffd34d'; ctx.lineWidth=2; ctx.strokeRect(bx-3,by-3,bw+6,18);
  }

  // 击杀数/FPS(右下角; 金币已改为每人独立,显示在各自面板)
  ctx.textAlign='right'; ctx.fillStyle='#ff8a5c'; ctx.font='bold 14px "Press Start 2P",monospace';
  ctx.fillText(`💀 ${G.kills}`, VIEW_W-20, VIEW_H-36);
  ctx.fillStyle='#8ab'; ctx.font='10px "Press Start 2P",monospace';
  ctx.fillText(`${G.fps}fps`, VIEW_W-20, VIEW_H-18);

  // 连击(右侧中部,有连击时显示)
  if(G.combo>1){
    const pulse=1+Math.sin(G.time*12)*0.06;
    ctx.save(); ctx.translate(VIEW_W-90,140); ctx.scale(pulse,pulse);
    ctx.textAlign='center';
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath();ctx.arc(0,0,46,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=G.combo>=20?'#ffd34d':G.combo>=10?'#ff9540':'#b06ce0'; ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,46,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='bold 26px "Press Start 2P",monospace';
    ctx.fillText(G.combo, 0, 2);
    ctx.fillStyle='#c8bce0'; ctx.font='9px "Press Start 2P",monospace';
    ctx.fillText('连击', 0, 22);
    // 连击伤害加成
    if(G.comboMul>1){ ctx.fillStyle='#ffd34d'; ctx.font='9px "Press Start 2P",monospace';
      ctx.fillText('+'+Math.round((G.comboMul-1)*100)+'%', 0, 36); }
    ctx.restore();
  }

  // 复活进度(队友倒地时)
  const deadP = G.players.find(p=>!p.alive);
  if(deadP && G.players.length>1){
    ctx.textAlign='center';
    ctx.fillStyle='#ff5c5c'; ctx.font='bold 14px "Press Start 2P",monospace';
    ctx.fillText(`P${deadP.slot+1} 倒下了!`, VIEW_W/2, 96);
    const coins=(G.players.find(p=>p.alive)||{}).reviveCoins||G.reviveCoins||0;
    if(coins>0){ ctx.fillStyle='#5cd4ff'; ctx.font='11px "Press Start 2P",monospace';
      ctx.fillText(`靠近按住复活 (${coins}币)`, VIEW_W/2, 118);
      if(G.reviveProgress>0){ drawBar(ctx, VIEW_W/2-90, 128, 180, 8, G.reviveProgress/2, '#5cd4ff'); } }
    else { ctx.fillStyle='#8a7ab0'; ctx.font='10px "Press Start 2P",monospace';
      ctx.fillText('需要复活币(打怪/南瓜灯掉落)', VIEW_W/2, 118); }
  }

  // 操作提示(底部) — 触屏设备改显示简化提示
  ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='10px "Press Start 2P",monospace';
  if(G.isTouch){ ctx.fillText('左摇杆移动 · 自动攻击 · 💨闪避 · ✨技能', VIEW_W/2, VIEW_H-12); }
  else { ctx.fillText('P1: WASD移动 C技能 F闪避   P2: 方向键 L技能 I闪避   攻击自动 T开关自动战斗 Esc暂停 M静音', VIEW_W/2, VIEW_H-12); }
}

// ---------- DOM UI ----------
const $=id=>document.getElementById(id);

function showUpgradeUI(picks){
  const el=$('upgrade'); el.classList.remove('hidden');
  const box=$('upgrade-cards'); box.innerHTML='';
  picks.forEach((u,i)=>{
    const d=document.createElement('div'); d.className='up-card';
    d.innerHTML=`<div class="up-icon">${u.icon}</div><div class="up-name">${u.name}</div><div class="up-key">按 ${i+1}</div>`;
    d.onclick=()=>applyUpgrade(i);
    box.appendChild(d);
  });
}
function hideUpgradeUI(){ $('upgrade').classList.add('hidden'); }
function updateUpgradeTimer(t){ const el=$('up-timer'); if(el) el.textContent=Math.ceil(t)+'s'; }

function showGameOverUI(){
  $('over-stats').innerHTML=
    `<div>扛到波次 <b>${G.wave}</b> / ${TOTAL_WAVES}</div>
     <div>击杀怪物 <b>${G.kills}</b></div>
     <div>击破 BOSS <b>${G.bossesDown}</b></div>
     <div style="color:#b06ce0">+${G.soulsGain||0} 💠 灵魂碎片</div>
     <div>历史最佳 <b>${G.bestWave}</b> 波</div>`;
  $('gameover').classList.remove('hidden');
}
function showVictoryUI(){
  $('win-stats').innerHTML=
    `<div>通关全部 <b>${TOTAL_WAVES}</b> 波!</div>
     <div>总击杀 <b>${G.kills}</b> · 击破 BOSS <b>${G.bossesDown}</b></div>
     <div style="color:#b06ce0">+${G.soulsGain||0} 💠 灵魂碎片</div>`;
  $('victory').classList.remove('hidden');
}

// ---------- 商店 UI (P1/P2 金币独立, 分人购买) ----------
function showShopUI(){
  $('shop').classList.remove('hidden');
  $('shop-gold').innerHTML=G.players.map((p,i)=>
    `<span style="color:${p.color}">P${i+1}</span> 💰${p.gold||0}`).join(' · ');
  const box=$('shop-cards'); box.innerHTML='';
  G.shopItems.forEach((it,i)=>{
    it.soldBy=it.soldBy||{};
    const d=document.createElement('div');
    d.className='shop-card';
    const btns=G.players.map((p,si)=>{
      const consumable = it.kind==='heal'||it.kind==='revive'||it.kind==='maxhp'; // 消耗品可重复买
      const sold=!consumable && !!it.soldBy[si];
      const afford=(p.gold||0)>=it.price;
      const cls=sold?'sold':(afford?'':'no');
      return `<button class="shop-buy ${cls}" data-i="${i}" data-s="${si}" ${sold||!p.alive?'disabled':''}
        style="font-family:inherit;font-size:10px;margin:3px 2px 0;padding:7px 10px;cursor:pointer;border-radius:6px;
        border:2px solid ${sold?'#444':p.color};background:${sold?'#1a1428':'#241a3a'};color:${sold?'#666':afford?'#ffd34d':'#ff5c5c'}">
        P${si+1} ${sold?'已购':'💰'+it.price}</button>`;
    }).join('');
    d.innerHTML=`<div class="shop-icon">${it.icon}</div>
      <div class="shop-name">${it.name}</div>
      <div class="shop-desc">${it.desc}</div>
      <div class="shop-buyrow">${btns}</div>`;
    box.appendChild(d);
  });
  box.querySelectorAll('.shop-buy:not([disabled])').forEach(b=>{
    b.onclick=()=>buyShopItem(+b.dataset.i, +b.dataset.s);
  });
}
function hideShopUI(){ $('shop').classList.add('hidden'); }

// ---------- 局外成长 UI ----------
function showMetaUI(){
  loadMeta();
  $('meta').classList.remove('hidden');
  $('menu').classList.add('hidden');
  renderMetaCards();
}
function renderMetaCards(){
  $('meta-souls').textContent=G.meta.souls;
  const box=$('meta-cards'); box.innerHTML='';
  for(const k in META_UPGRADES){
    const m=META_UPGRADES[k]; const lv=G.meta.upg[k]||0;
    const maxed=lv>=m.max; const cost=metaCost(k);
    const afford=G.meta.souls>=cost;
    const d=document.createElement('div');
    d.className='shop-card'+((!afford&&!maxed)?' cant':'');
    d.innerHTML=`<div class="shop-lv">${lv}/${m.max}</div>
      <div class="shop-icon">${m.icon}</div>
      <div class="shop-name">${m.name}</div>
      <div class="shop-desc">${m.desc}</div>
      <div class="shop-price ${afford?'':'no'}">${maxed?'已满级':'💠'+cost}</div>`;
    if(!maxed) d.onclick=()=>{ buyMeta(k); renderMetaCards(); };
    box.appendChild(d);
  }
}

// ---------- 角色选择 ----------
let selection=[];
function buildSelect(){
  const box=$('hero-cards'); box.innerHTML='';
  for(const k in HERO_TYPES){
    const t=HERO_TYPES[k];
    const d=document.createElement('div'); d.className='hero-card'; d.dataset.hero=k;
    const stars='★'.repeat(Math.round(t.hp/48))+'☆'.repeat(5-Math.round(t.hp/48));
    d.innerHTML=`<img class="hero-avatar" src="assets/img/ui/hero-${k}.jpg" alt="${t.name}"
        style="width:100%;border-radius:6px;margin-bottom:10px;image-rendering:auto;border:2px solid ${t.color}55">
      <div class="hero-name">${t.name}</div><div class="hero-desc">${t.desc}</div>
      <div class="hero-skill" style="font-size:9px;color:${t.skill.color};line-height:1.6;min-height:28px">✦${t.skill.name}<br><span style="color:#8a7ab0">${t.skill.desc}</span></div>
      <div class="hero-passive" style="font-size:8px;color:#ffd34d;line-height:1.5;min-height:22px">◆${t.passive.name}<br><span style="color:#8a7ab0">${t.passive.desc}</span></div>
      <div class="hero-hp">${stars}</div>`;
    d.onclick=()=>{ if(selection.includes(k)){selection=selection.filter(x=>x!==k);d.classList.remove('sel');}
      else if(selection.length<2){selection.push(k);d.classList.add('sel');}
      $('start-btn').textContent=selection.length?`开始战斗 (${selection.length}P)`:'选择角色'; };
    box.appendChild(d);
  }
}

// ---------- 主循环 ----------
let lastT=0;
function loop(t){
  // 健壮性: 某些环境 rAF 不传时间戳(或 NaN), 回退 performance.now(), dt 异常时按 60fps 步进
  const now=(typeof t==='number'&&t===t)? t : performance.now();
  let dt=Math.min(0.05,(now-lastT)/1000); lastT=now;
  if(!(dt>0)) dt=0.016;
  if(G.state!=='pause') update(dt);
  if(G.state!=='menu'&&G.state!=='select') render();
  requestAnimationFrame(loop);
}

function setupCanvas(){
  G.canvas=$('game'); G.ctx=G.canvas.getContext('2d');
  G.canvas.width=VIEW_W; G.canvas.height=VIEW_H;
  fitCanvas();
  window.addEventListener('resize',fitCanvas);
}
function fitCanvas(){
  const s=Math.min(window.innerWidth/VIEW_W, window.innerHeight/VIEW_H);
  G.canvas.style.width=VIEW_W*s+'px'; G.canvas.style.height=VIEW_H*s+'px';
}

// ---------- 输入 ----------
// 部分环境(合成事件/移动端/IME)的 KeyboardEvent.code 为空, 用 e.key 兜底换算
function keyAlias(e){
  if(e.code) return e.code;
  const k=e.key||'';
  if(/^[a-zA-Z]$/.test(k)) return 'Key'+k.toUpperCase();
  if(/^[0-9]$/.test(k)) return 'Digit'+k;
  return k; // ArrowUp / Escape 等命名键与 code 一致
}
window.addEventListener('keydown',e=>{
  const kc=keyAlias(e);
  keys[kc]=true; keyHit[kc]=true; // keyHit: 点按消费型(技能/闪避)
  if(kc==='Escape'){ togglePause(); }
  if(kc==='KeyM'){ G.muted=!G.muted; applyMute(); }
  if(G.state==='upgrade'){
    if(kc==='Digit1')applyUpgrade(0);
    if(kc==='Digit2')applyUpgrade(1);
    if(kc==='Digit3')applyUpgrade(2);
  }
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(kc))e.preventDefault();
    if(G.state==='shop' && kc==='Escape'){ closeShop(); $('pause').classList.add('hidden'); }
    if(kc==='KeyT'){ G.autoBattle=!G.autoBattle; for(const p of G.players) if(!p.ai)p.auto=G.autoBattle;
      spawnFloater(WORLD_W/2,WORLD_H/2-100, G.autoBattle?'自动战斗: 开':'自动战斗: 关', G.autoBattle?'#7ee081':'#ff8a5c', 20); }
});
window.addEventListener('keyup',e=>{keys[keyAlias(e)]=false;});

function togglePause(){
  if(G.state==='play'||G.state==='intermission'){ G._preState=G.state; G.state='pause'; $('pause').classList.remove('hidden'); }
  else if(G.state==='pause'){ G.state=G._preState||'play'; $('pause').classList.add('hidden'); }
}

// ---------- 启动 ----------
window.addEventListener('DOMContentLoaded', async ()=>{
  setupCanvas();
  buildSelect();
  // 进度条
  let n=0; const total=60;
  await preload(()=>{ n++; $('load-fill').style.width=Math.min(100,n/total*100)+'%'; });
  $('loading').classList.add('hidden');
  $('menu').classList.remove('hidden');

  // 菜单按钮
  $('start-btn').onclick=()=>{
    if(!selection.length)selection=['knight'];
    $('select').classList.add('hidden');
    document.body.requestPointerLock&&0;
    startGame(selection);
  };
  $('mode1').onclick=()=>{ selection=selection.slice(0,1); $('mode1').classList.add('on');$('mode2').classList.remove('on'); };
  $('mode2').onclick=()=>{ $('mode2').classList.add('on');$('mode1').classList.remove('on'); };
  $('to-select').onclick=()=>{ $('menu').classList.add('hidden'); $('select').classList.remove('hidden'); };
  $('to-meta').onclick=showMetaUI;
  $('meta-back').onclick=()=>{ $('meta').classList.add('hidden'); $('menu').classList.remove('hidden'); };
  $('shop-leave').onclick=closeShop;
  // 结束重开
  const restart=()=>{ $('gameover').classList.add('hidden');$('victory').classList.add('hidden');
    selection=[];document.querySelectorAll('.hero-card').forEach(c=>c.classList.remove('sel'));
    $('select').classList.remove('hidden'); G.state='select'; playBgm('menu'); };
  $('retry-btn').onclick=restart; $('win-retry-btn').onclick=restart;
  $('resume-btn').onclick=togglePause;

  playBgm('menu');
  G.state='menu';
  // 深链直开: #auto=knight,archer 跳过菜单直接开局(测试/嵌入用)
  const am=(location.hash||'').match(/auto=([a-z,]+)/);
  if(am){ const sel=am[1].split(',').filter(k=>HERO_TYPES[k]).slice(0,2);
    if(sel.length){ $('loading').classList.add('hidden'); $('menu').classList.add('hidden'); $('select').classList.add('hidden'); startGame(sel); } }
  requestAnimationFrame(loop);
});

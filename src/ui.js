// ========== HUD / UI / 主入口 (依赖 engine.js 的全局 G) ==========

function drawHUD(ctx){
  // 顶部栏
  ctx.fillStyle='rgba(10,6,18,0.72)'; ctx.fillRect(0,0,VIEW_W,64);
  ctx.strokeStyle='rgba(150,110,220,0.4)';ctx.lineWidth=2;ctx.strokeRect(-2,-2,VIEW_W+4,66);

  // P1 / P2 血条
  G.players.forEach((p,i)=>{
    const x=20+i*280, y=14;
    ctx.fillStyle=p.alive?p.color:'#555'; ctx.font='bold 13px "Press Start 2P",monospace'; ctx.textAlign='left';
    ctx.fillText(`P${i+1} ${p.def.name}`, x, y+10);
    drawBar(ctx,x,y+18,180,12,p.hp/p.maxHp, p.alive?'#7ee081':'#444');
    ctx.fillStyle='#fff';ctx.font='10px "Press Start 2P",monospace';
    ctx.fillText(`${Math.ceil(p.hp)}/${Math.ceil(p.maxHp)}`,x+186,y+28);
  });

  // 波次 / 关卡
  ctx.textAlign='center'; ctx.fillStyle='#ffd34d'; ctx.font='bold 16px "Press Start 2P",monospace';
  ctx.fillText(`波次 ${G.wave}/${TOTAL_WAVES}`, VIEW_W/2, 26);
  ctx.fillStyle=LEVEL_DEFS[G.level].tint; ctx.font='11px "Press Start 2P",monospace';
  ctx.fillText(LEVEL_DEFS[G.level].name, VIEW_W/2, 48);

  // 金币 / 击杀
  ctx.textAlign='right'; ctx.fillStyle='#ffd34d'; ctx.font='bold 14px "Press Start 2P",monospace';
  if(G.imgs.coin) ctx.drawImage(G.imgs.coin, VIEW_W-220, 16, 22,22);
  ctx.fillText(`${G.gold}`, VIEW_W-190, 34);
  ctx.fillStyle='#ff8a5c'; ctx.fillText(`💀 ${G.kills}`, VIEW_W-110, 34);
  ctx.fillStyle='#8ab'; ctx.font='10px "Press Start 2P",monospace';
  ctx.fillText(`${G.fps}fps`, VIEW_W-20, 58);

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
  if(G.isTouch){ ctx.fillText('左摇杆移动 · ⚔️攻击 · 💨闪避 · ✨技能', VIEW_W/2, VIEW_H-12); }
  else { ctx.fillText('P1: WASD移动 C攻击 F闪避 B技能      P2: 方向键 L攻击 I闪避 J技能      Esc暂停 M静音', VIEW_W/2, VIEW_H-12); }
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
     <div>历史最佳 <b>${G.bestWave}</b> 波</div>`;
  $('gameover').classList.remove('hidden');
}
function showVictoryUI(){
  $('win-stats').innerHTML=
    `<div>通关全部 <b>${TOTAL_WAVES}</b> 波!</div>
     <div>总击杀 <b>${G.kills}</b> · 击破 BOSS <b>${G.bossesDown}</b></div>`;
  $('victory').classList.remove('hidden');
}

// ---------- 角色选择 ----------
let selection=[];
function buildSelect(){
  const box=$('hero-cards'); box.innerHTML='';
  for(const k in HERO_TYPES){
    const t=HERO_TYPES[k];
    const d=document.createElement('div'); d.className='hero-card'; d.dataset.hero=k;
    const stars='★'.repeat(Math.round(t.hp/40))+'☆'.repeat(5-Math.round(t.hp/40));
    d.innerHTML=`<div class="hero-name">${t.name}</div><div class="hero-desc">${t.desc}</div><div class="hero-hp">${stars}</div>`;
    d.onclick=()=>{ if(selection.includes(k)){selection=selection.filter(x=>x!==k);d.classList.remove('sel');}
      else if(selection.length<2){selection.push(k);d.classList.add('sel');}
      $('start-btn').textContent=selection.length?`开始战斗 (${selection.length}P)`:'选择角色'; };
    box.appendChild(d);
  }
}

// ---------- 主循环 ----------
let lastT=0;
function loop(t){
  const dt=Math.min(0.05,(t-lastT)/1000); lastT=t;
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
window.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(e.code==='Escape'){ togglePause(); }
  if(e.code==='KeyM'){ G.muted=!G.muted; applyMute(); }
  if(G.state==='upgrade'){
    if(e.code==='Digit1')applyUpgrade(0);
    if(e.code==='Digit2')applyUpgrade(1);
    if(e.code==='Digit3')applyUpgrade(2);
  }
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});

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
  // 结束重开
  const restart=()=>{ $('gameover').classList.add('hidden');$('victory').classList.add('hidden');
    selection=[];document.querySelectorAll('.hero-card').forEach(c=>c.classList.remove('sel'));
    $('select').classList.remove('hidden'); G.state='select'; playBgm('menu'); };
  $('retry-btn').onclick=restart; $('win-retry-btn').onclick=restart;
  $('resume-btn').onclick=togglePause;

  playBgm('menu');
  G.state='menu';
  requestAnimationFrame(loop);
});

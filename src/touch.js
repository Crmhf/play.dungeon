// ========== 移动端虚拟按键: 摇杆 + 攻击/闪避/技能 ==========
// 触屏设备自动启用; 攻击自动锁定最近怪, 降低触屏瞄准负担
(function(){
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints>0;
  if(!isTouch) return;
  G.isTouch = true;

  // 注入样式
  const css = `
    #touch-ui{position:absolute;inset:0;pointer-events:none;z-index:5;font-family:inherit}
    .tzone{position:absolute;pointer-events:auto}
    #stick-base{position:absolute;width:130px;height:130px;border-radius:50%;
      background:rgba(122,74,208,.18);border:2px solid rgba(176,108,224,.5);display:none}
    #stick-nub{position:absolute;width:56px;height:56px;border-radius:50%;left:37px;top:37px;
      background:radial-gradient(circle at 35% 30%,#b06ce0,#5a2ab0);box-shadow:0 0 16px rgba(176,108,224,.8)}
    .tbtn{position:absolute;width:78px;height:78px;border-radius:50%;pointer-events:auto;
      display:flex;align-items:center;justify-content:center;font-size:15px;color:#fff;
      background:rgba(122,74,208,.28);border:2px solid rgba(176,108,224,.7);user-select:none;
      -webkit-user-select:none;touch-action:none;letter-spacing:0}
    .tbtn:active,.tbtn.on{background:rgba(255,211,77,.4);border-color:#ffd34d;transform:scale(.94)}
    #tb-dash{right:140px;bottom:56px}
    #tb-skill{right:26px;bottom:96px;width:96px;height:96px;font-size:19px}
    #tb-pause{right:20px;top:76px;width:52px;height:52px;font-size:14px}
    .tcool{position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(0,0,0,.65) var(--p,0%),transparent 0);pointer-events:none}
    #skill-cd-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      font-size:24px;color:#fff;text-shadow:0 0 8px #5cd4ff,0 2px 2px #000;pointer-events:none}
    @media (max-width:820px){ .tbtn{width:66px;height:66px} #tb-skill{width:84px;height:84px;bottom:84px} }
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  // DOM
  const ui=document.createElement('div'); ui.id='touch-ui';
  ui.innerHTML=`
    <div class="tzone" id="stick-zone" style="left:0;bottom:0;width:46%;height:70%"></div>
    <div id="stick-base"><div id="stick-nub"></div></div>
    <div class="tbtn" id="tb-dash">💨</div>
    <div class="tbtn" id="tb-skill">✨<div class="tcool" id="skill-cool"></div><span id="skill-cd-num"></span></div>
    <div class="tbtn" id="tb-pause">⏸</div>`;
  document.getElementById('wrap').appendChild(ui);

  const $=id=>document.getElementById(id);
  const base=$('stick-base'), nub=$('stick-nub'), zone=$('stick-zone');
  const K = KEYMAP.p1; // 触屏控制 P1

  // ---- 虚拟摇杆 ----
  let stickId=null, cx=0, cy=0;
  const R=44;
  function setMove(dx,dy){
    keys[K.left]=dx<-0.3; keys[K.right]=dx>0.3;
    keys[K.up]=dy<-0.3; keys[K.down]=dy>0.3;
  }
  zone.addEventListener('touchstart',e=>{
    e.preventDefault();
    const t=e.changedTouches[0]; stickId=t.identifier;
    cx=t.clientX; cy=t.clientY;
    base.style.display='block';
    base.style.left=(cx-65)+'px'; base.style.top=(cy-65)+'px';
    nub.style.left='37px'; nub.style.top='37px';
  },{passive:false});
  zone.addEventListener('touchmove',e=>{
    e.preventDefault();
    for(const t of e.changedTouches){ if(t.identifier!==stickId)continue;
      let dx=t.clientX-cx, dy=t.clientY-cy;
      const d=Math.hypot(dx,dy);
      if(d>R){ dx=dx/d*R; dy=dy/d*R; }
      nub.style.left=(37+dx)+'px'; nub.style.top=(37+dy)+'px';
      setMove(dx/R, dy/R);
    }
  },{passive:false});
  const endStick=e=>{
    for(const t of e.changedTouches){ if(t.identifier!==stickId)continue;
      stickId=null; base.style.display='none'; setMove(0,0);
      keys[K.left]=keys[K.right]=keys[K.up]=keys[K.down]=false;
    }
  };
  zone.addEventListener('touchend',endStick); zone.addEventListener('touchcancel',endStick);

  // ---- 闪避 / 技能 (点按) ----
  $('tb-dash').addEventListener('touchstart',e=>{e.preventDefault();keyHit[K.dash]=true;},{passive:false});
  $('tb-skill').addEventListener('touchstart',e=>{e.preventDefault();
    const p=G.players[0]; if(p&&p.skillCd<=0){$('tb-skill').classList.add('on');setTimeout(()=>$('tb-skill').classList.remove('on'),200);}
    keyHit[K.skill]=true; },{passive:false});

  // ---- 暂停 ----
  $('tb-pause').addEventListener('touchstart',e=>{e.preventDefault();togglePause();},{passive:false});

  // ---- 攻击全自动(引擎锁定最近怪), 触屏无需攻击键 ----
  // 技能冷却可视化: 锥形遮罩 + 剩余秒数
  setInterval(()=>{
    const p=G.players&&G.players[0];
    if(!p) return;
    const el=$('skill-cool'), num=$('skill-cd-num');
    if(el) el.style.setProperty('--p', (p.skillCd>0? (p.skillCd/p.skillMax*100):0)+'%');
    if(num) num.textContent = p.skillCd>0? p.skillCd.toFixed(1):'';
  },80);

  // 阻止整页滚动/缩放
  document.addEventListener('touchmove',e=>{ if(G.state==='play')e.preventDefault(); },{passive:false});
  document.addEventListener('gesturestart',e=>e.preventDefault());
})();

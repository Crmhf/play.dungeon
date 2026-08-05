// ============================================================
//  DUNGEON DUO · 地牢双雄 — 俯视双人合作 Roguelike
//  单文件引擎: 状态机 / 精灵表动画 / 波次怪潮 / 3选1升级 / Boss / 粒子打击感
// ============================================================
'use strict';

// ---------- 常量 ----------
const VIEW_W = 1280, VIEW_H = 720;
const WORLD_W = 2400, WORLD_H = 1500;
const WAVES_PER_LEVEL = 6;          // 每关 6 波
const LEVELS = 5;                    // 5 主题关卡
const TOTAL_WAVES = WAVES_PER_LEVEL * LEVELS; // 30
const DEATH_ANIM_DUR = 0.38;         // 小怪死亡消散动画时长(秒)

// ---------- 资源清单 ----------
const ASSETS = {
  levels: [
    'assets/img/levels/level1-dungeon.jpg',
    'assets/img/levels/level2-graveyard.jpg',
    'assets/img/levels/level3-castle.jpg',
    'assets/img/levels/level4-abyss.jpg',
    'assets/img/levels/level5-halloween.jpg',
  ],
  ui: { logo: 'assets/img/ui/logo.png', coin: 'assets/img/ui/coin.png' },
  bgm: {
    menu: 'assets/audio/bgm/bgm-menu.mp3',
    battle: 'assets/audio/bgm/bgm-battle.mp3',
    boss: 'assets/audio/bgm/bgm-boss.mp3',
    victory: 'assets/audio/bgm/bgm-victory.mp3',
    defeat: 'assets/audio/bgm/bgm-defeat.mp3',
  },
};

// 敌人精灵表定义: dir / 移动图 / 帧宽 / 帧高 / ai / 基础属性
// faceLeft: 素材本身默认朝左(绘制时需按 face 再翻一次), 避免"倒着走"
const ENEMY_TYPES = {
  slime:    { dir:'Slime',    sheet:'Idle-Run (44x30).png', fw:44, fh:30, ai:'chase',  hp:20, spd:60,  dmg:6,  gold:2, scale:2.2 },
  bat:      { dir:'Bat',      sheet:'Flying (46x30).png',   fw:46, fh:30, ai:'chase',  hp:14, spd:120, dmg:5,  gold:2, scale:2.2, fly:true },
  chicken:  { dir:'Chicken',  sheet:'Run (32x34).png',      fw:32, fh:34, ai:'chase',  hp:16, spd:95,  dmg:5,  gold:2, scale:2.2, faceLeft:true },
  bunny:    { dir:'Bunny',    sheet:'Run (34x44).png',      fw:34, fh:44, ai:'chase',  hp:18, spd:110, dmg:6,  gold:3, scale:2.2 },
  angrypig: { dir:'AngryPig', sheet:'Run (36x30).png',      fw:36, fh:30, ai:'elite',  hp:45, spd:85,  dmg:12, gold:5, scale:2.4 },
  skull:    { dir:'Skull',    sheet:'Idle 1 (52x54).png',   fw:52, fh:54, ai:'elite',  hp:40, spd:70,  dmg:10, gold:5, scale:2.0, fly:true },
  snail:    { dir:'Snail',    sheet:'Walk (38x24).png',     fw:38, fh:24, ai:'ranged', hp:55, spd:35,  dmg:8,  gold:6, scale:2.4, proj:'shell', faceLeft:true },
  rino:     { dir:'Rino',     sheet:'Run (52x34).png',      fw:52, fh:34, ai:'charge', hp:70, spd:70,  dmg:16, gold:8, scale:2.4, faceLeft:true },
  bee:      { dir:'Bee',      sheet:'Attack (36x34).png',   fw:36, fh:34, ai:'ranged', hp:24, spd:80,  dmg:8,  gold:5, scale:2.2, fly:true, proj:'sting' },
  trunk:    { dir:'Trunk',    sheet:'Attack (64x32).png',   fw:64, fh:32, ai:'lobber', hp:65, spd:50,  dmg:14, gold:8, scale:2.4, proj:'rock', faceLeft:true },
  ghost:    { dir:'Ghost',    sheet:'Idle (44x30).png',     fw:44, fh:30, ai:'stealth',hp:30, spd:75,  dmg:12, gold:7, scale:2.2, fly:true },
  mushroom: { dir:'Mushroom', sheet:'Run (32x32).png',      fw:32, fh:32, ai:'chase',  hp:30, spd:65,  dmg:8,  gold:4, scale:2.2 },
  plant:    { dir:'Plant',    sheet:'Attack (44x42).png',   fw:44, fh:42, ai:'ranged', hp:50, spd:0,   dmg:10, gold:6, scale:2.2, proj:'seed', faceLeft:true },
  chameleon:{ dir:'Chameleon',sheet:'Run (84x38).png',      fw:84, fh:38, ai:'stealth',hp:48, spd:90,  dmg:13, gold:8, scale:2.0 },
  turtle:   { dir:'Turtle',   sheet:'Spikes out (44x26).png',fw:44, fh:26, ai:'chase',  hp:95, spd:45,  dmg:14, gold:9, scale:2.4 }, // 尖刺龟: 高血坦克前排
  skeleton: { frames:'assets/sprites/enemies/2dpd/skeleton1/v1/skeleton_v1_%d.png', nframes:4, ai:'summoner', hp:60, spd:60, dmg:12, gold:9, scale:2.6 },
  vampire:  { frames:'assets/sprites/enemies/2dpd/vampire/v1/vampire_v1_%d.png', nframes:4, ai:'charge', hp:80, spd:95, dmg:18, gold:12, scale:2.6 },
};

// 英雄定义: 取自 Dungeon_Character.png (16px 网格) 与 priest 逐帧
// 平衡设计: 近战贴脸冒险换最高伤害(盗贼78/骑士52 DPS), 远程用伤害换安全与功能(弓手36/法师32 DPS)
// passive: 英雄专属天生被动 — 骑士减伤 / 弓手鹰眼暴击 / 法师技能急速 / 刺客高暴击
const HERO_TYPES = {
  knight: { name:'骑士', desc:'近战肉盾 · 横扫一片', sheet:'chars', col:0, row:0, hp:240, spd:150, atk:26, rate:0.50, range:70,  arc:true,  projSpeed:0,   dash:1.5, color:'#c8d0e0', sfx:'sword',
    passive:{ key:'damageReduce', val:0.15, name:'圣盾体质', desc:'受伤减免15%' },
    skill:{ name:'旋风斩', cd:7, color:'#9adcff', desc:'横扫+减速敌人+3秒减伤50%' } },
  archer: { name:'弓手', desc:'远程安全输出 · 穿透箭', sheet:'chars', col:6, row:3, hp:115, spd:165, atk:13, rate:0.36, range:420, arc:false, projSpeed:520, pierce:true, dash:1.0, color:'#a8e063', sfx:'bow',
    passive:{ key:'critChance', val:0.18, name:'鹰眼', desc:'天生暴击率18%' },
    skill:{ name:'天降箭雨', cd:9, color:'#a8e063', desc:'目标区域倾泻24支落箭' } },
  mage:   { name:'法师', desc:'中距AOE · 弹射灼烧', sheet:'priest', variant:1, hp:100, spd:140, atk:16, rate:0.50, range:380, arc:false, projSpeed:420, bounce:2, aoe:60, dash:0.9, color:'#b06ce0', sfx:'magic',
    passive:{ key:'skillCdMul', val:0.8, name:'奥术亲和', desc:'技能冷却-20%' },
    skill:{ name:'奥术湮灭', cd:12, color:'#e08cff', desc:'大爆炸+灼烧3秒,毁天灭地' } },
  rogue:  { name:'盗贼', desc:'近战爆发 · 刀刀烈火', sheet:'chars', col:0, row:1, hp:115, spd:195, atk:14, rate:0.18, range:64,  arc:true,  projSpeed:0,   dodgeCd:1.3, dash:1.3, color:'#e0b25c', sfx:'swing',
    passive:{ key:'critChance', val:0.22, name:'刺客直觉', desc:'天生暴击率22%' },
    skill:{ name:'暗影突袭', cd:7, color:'#e0b25c', desc:'隐身必暴+加速,重置闪避' } },
};

// 关卡主题
const LEVEL_DEFS = [
  { name:'暗黑地牢', tint:'#6a4a9a', fog:'rgba(40,20,70,0.35)', pool:['slime','bat','chicken'] },
  { name:'阴森墓地', tint:'#3a6a4a', fog:'rgba(15,50,30,0.35)', pool:['slime','bat','chicken','bunny','angrypig','turtle'] },
  { name:'沙石古堡', tint:'#b06a3a', fog:'rgba(90,45,15,0.32)', pool:['angrypig','skull','snail','mushroom','bunny','turtle'] },
  { name:'火焰深渊', tint:'#c04a20', fog:'rgba(90,20,5,0.35)',  pool:['skull','rino','bee','trunk','plant','turtle'] },
  { name:'万圣夜宴', tint:'#9a4ab0', fog:'rgba(60,15,80,0.35)', pool:['vampire','chameleon','ghost','skeleton','trunk','bee','turtle'] },
];

// 武器定义: 改变攻击手感(伤害/攻速/范围/特效/元素)
const WEAPONS = {
  // ---- 近战 ----
  sword:    { name:'铁剑',     icon:'🗡️', cls:'melee',  dmgMul:1.0, rateMul:1.0,  rangeMul:1.0, color:'#c8d0e0', sfx:'sword', desc:'均衡的初始武器' },
  pumpkin:  { name:'南瓜锤',   icon:'🎃', cls:'melee',  dmgMul:1.8, rateMul:1.6,  rangeMul:1.3, knockback:320, aoeWave:true, color:'#ff9540', sfx:'heavy', desc:'重锤!大范围击退+冲击波' },
  bonescythe:{name:'幽灵镰刀', icon:'💀', cls:'melee',  dmgMul:1.3, rateMul:0.85, rangeMul:1.5, lifesteal:0.08, color:'#b06ce0', sfx:'swing', desc:'吸血镰刀,大范围收割' },
  dagger:   { name:'淬毒双刃', icon:'🔪', cls:'melee',  dmgMul:1.0, rateMul:0.6,  rangeMul:0.9, elem:'poison', poison:6, color:'#8ee05c', sfx:'swing', desc:'剧毒双刃,持续掉血' },
  flamesword:{name:'烈焰巨剑', icon:'🔥', cls:'melee',  dmgMul:1.5, rateMul:1.2,  rangeMul:1.1, elem:'fire', color:'#ff5c2a', sfx:'sword', desc:'重剑横扫,命中灼烧2秒' },
  stormhammer:{name:'雷霆战锤',icon:'⚡', cls:'melee',  dmgMul:1.4, rateMul:1.3,  rangeMul:1.2, chain:0.3, color:'#ffe95c', sfx:'heavy', desc:'命中30%触发连锁闪电' },
  shadowblade:{name:'影刃',    icon:'🌑', cls:'melee',  dmgMul:0.9, rateMul:0.5,  rangeMul:0.9, critBonus:0.15, color:'#8a7ab0', sfx:'swing', desc:'极快,暴击率+15%' },
  // ---- 远程 ----
  bow:      { name:'短弓',     icon:'🏹', cls:'ranged', dmgMul:1.0, rateMul:1.0,  rangeMul:1.0, color:'#a8e063', sfx:'bow', desc:'均衡的初始弓' },
  crossbow: { name:'连弩',     icon:'⚙️', cls:'ranged', dmgMul:0.45, rateMul:0.7, rangeMul:1.1, shots:2, color:'#ffd34d', sfx:'bow', desc:'双发连弩,射速极快(单箭伤害低)' },
  firestaff:{ name:'火焰法杖', icon:'🔥', cls:'ranged', dmgMul:1.25, rateMul:1.1, rangeMul:1.0, elem:'fire', aoe:50, color:'#ff5c2a', sfx:'magic', desc:'火焰弹,命中爆炸溅射' },
  froststaff:{name:'寒霜法杖', icon:'❄️', cls:'ranged', dmgMul:1.0, rateMul:0.9,  rangeMul:1.2, elem:'frost', slow:0.5, color:'#5cd4ff', sfx:'magic', desc:'寒霜弹,减速敌人(功能向)' },
  venombow: { name:'剧毒之弓', icon:'🐍', cls:'ranged', dmgMul:0.9, rateMul:0.9,  rangeMul:1.0, elem:'poison', poison:5, color:'#8ee05c', sfx:'bow', desc:'箭矢淬毒,持续掉血3秒' },
  stormstaff:{name:'雷霆法杖', icon:'🌩️', cls:'ranged', dmgMul:1.1, rateMul:1.0,  rangeMul:1.0, chain:0.35, color:'#ffe95c', sfx:'magic', desc:'命中35%触发连锁闪电' },
  icebow:   { name:'寒冰弓',   icon:'🧊', cls:'ranged', dmgMul:0.95, rateMul:0.95,rangeMul:1.1, slow:0.5, color:'#9adcff', sfx:'bow', desc:'冰箭减速,风筝神器' },
};

// 装备定义(每人1个装备槽, 可替换; apply/remove 精确互逆)
const GEARS = {
  knightplate:{ name:'骑士铠甲', icon:'🛡️', price:60, color:'#c8d0e0', desc:'生命+60 移速-5%',   apply:p=>{p.maxHp+=60;p.hp+=60;p.spd*=0.95;}, remove:p=>{p.maxHp-=60;p.hp=Math.min(p.hp,p.maxHp);p.spd/=0.95;} },
  leather:    { name:'迅捷皮甲', icon:'🥋', price:50, color:'#a8e063', desc:'生命+25 移速+10%',   apply:p=>{p.maxHp+=25;p.hp+=25;p.spd*=1.10;}, remove:p=>{p.maxHp-=25;p.hp=Math.min(p.hp,p.maxHp);p.spd/=1.10;} },
  fang:       { name:'吸血牙坠', icon:'🧛', price:65, color:'#ff5c8a', desc:'吸血+8%',          apply:p=>p.lifesteal+=0.08, remove:p=>p.lifesteal-=0.08 },
  boots:      { name:'疾风之靴', icon:'👢', price:55, color:'#5cd4ff', desc:'移速+15%',          apply:p=>p.spd*=1.15, remove:p=>p.spd/=1.15 },
  ring:       { name:'守护之戒', icon:'💍', price:60, color:'#ffd34d', desc:'受伤无敌+0.4s',      apply:p=>p.iframeBonus+=0.4, remove:p=>p.iframeBonus-=0.4 },
  eagle:      { name:'鹰眼吊坠', icon:'🦅', price:55, color:'#a8e063', desc:'射程+15%',          apply:p=>p.rangeMul*=1.15, remove:p=>p.rangeMul/=1.15 },
  belt:       { name:'力量腰带', icon:'🎗️', price:65, color:'#ff9540', desc:'伤害+12%',          apply:p=>p.dmgMul*=1.12, remove:p=>p.dmgMul/=1.12 },
  clover:     { name:'幸运四叶草',icon:'🍀', price:50, color:'#7ee081', desc:'金币获取+25%',      apply:p=>p.goldMul=(p.goldMul||1)*1.25, remove:p=>p.goldMul=(p.goldMul||1)/1.25 },
};
function setGear(p, key){
  const g=GEARS[key]; if(!g) return;
  if(p.gear && GEARS[p.gear]) GEARS[p.gear].remove(p); // 卸下旧装备
  p.gear=key; g.apply(p);
  spawnFloater(p.x,p.y-30, g.icon+' '+g.name, g.color, 15);
}

// 升级池
const UPGRADES = [
  { id:'dmg',    icon:'⚔️', name:'攻击伤害 +15%',   cat:'atk', apply:p=>p.dmgMul*=1.15 },
  { id:'aspd',   icon:'⚡', name:'攻击速度 +12%',   cat:'atk', apply:p=>p.rateMul*=0.88 },
  { id:'proj',   icon:'✨', name:'弹道数量 +1',     cat:'atk', apply:p=>p.shots+=1,  rangedOnly:true },
  { id:'pspd',   icon:'💨', name:'弹道速度 +25%',   cat:'atk', apply:p=>p.projMul*=1.25, rangedOnly:true },
  { id:'range',  icon:'🎯', name:'攻击范围 +20%',   cat:'atk', apply:p=>p.rangeMul*=1.2 },
  { id:'hp',     icon:'❤️', name:'生命上限 +20%并回满', cat:'def', apply:p=>{p.maxHp*=1.2;p.hp=p.maxHp;} },
  { id:'iframe', icon:'🛡️', name:'受伤无敌 +0.3s',  cat:'def', apply:p=>p.iframeBonus+=0.3 },
  { id:'dash',   icon:'💫', name:'闪避距离 +25%',   cat:'def', apply:p=>p.dashMul*=1.25 },
  { id:'regen',  icon:'🌿', name:'缓慢回血',        cat:'def', apply:p=>p.regen+=0.8 },
  { id:'vamp',   icon:'🩸', name:'吸血 6%',         cat:'sp',  apply:p=>p.lifesteal+=0.06 },
  { id:'explode',icon:'💥', name:'击杀爆炸',        cat:'sp',  apply:p=>p.killExplode=true },
  { id:'thunder',icon:'⚡', name:'雷霆一击 8%',     cat:'sp',  apply:p=>p.thunder+=0.08 },
  { id:'minion', icon:'💀', name:'召唤骷髅随从',    cat:'sp',  apply:p=>p.minions=(p.minions||0)+1 },
  { id:'thorns', icon:'🌵', name:'反伤护甲 30%',    cat:'sp',  apply:p=>p.thorns+=0.3 },
];

// ---------- 全局状态 ----------
const G = {
  state: 'menu',           // menu | select | play | upgrade | shop | levelclear | gameover | victory | pause
  canvas: null, ctx: null,
  imgs: {}, audio: {}, bgmNow: null,
  players: [], enemies: [], projectiles: [], eprojectiles: [], pickups: [], particles: [], floaters: [], minions: [],
  wave: 0, level: 0, gold: 0, kills: 0, bossesDown: 0,
  camX: 0, camY: 0, shake: 0, shakeT: 0,
  spawnQueue: [], spawnTimer: 0, waveTimer: 0, interTimer: 0,
  upgradeChoices: [], upgradeTimer: 0,
  hitStop: 0, slowmo: 1,
  muted: false, volume: 0.7,
  time: 0, fps: 60, _fpsAcc: 0, _fpsN: 0,
  portal: null, levelTrans: 0,
  bestWave: 0,
  // 新增: 连击 / 慢镜头 / 道具 / 陷阱 / 复活 / 局外
  combo: 0, comboT: 0, comboBest: 0, comboMul: 1,
  timeScale: 1, timeScaleT: 0,
  flash: 0, flashColor: '#fff', // 全屏闪光
  dashGhosts: [], // 冲刺残影
  props: [], traps: [],
  reviveCoins: 0, reviveProgress: 0,
  shopItems: [],
  autoBattle: true, // 自动战斗开关
  meta: null,
};

// ---------- 输入 ----------
// 攻击全自动(锁定最近怪); 玩家只需 移动 / 技能 / 闪避
// keyHit: 点按型按键(技能/闪避)在 keydown 时置位, 由 updatePlayer 消费,
//         避免快速点按时 keydown/keyup 落在同一帧间隙被漏检
const keys = {};
const keyHit = {};
const KEYMAP = {
  p1: { up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', skill:'KeyC', dash:'KeyF' },
  p2: { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', skill:'KeyL', dash:'KeyI' },
};

// ---------- 资源加载 ----------
function loadImage(src){ return new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src; }); }

async function preload(onProgress){
  const jobs = [];
  const add = (key, src)=> jobs.push(loadImage(src).then(img=>{ G.imgs[key]=img; onProgress&&onProgress(); }));

  ASSETS.levels.forEach((s,i)=>add('level'+i, s));
  add('logo', ASSETS.ui.logo); add('coin', ASSETS.ui.coin);
  add('chars', 'assets/sprites/heroes/Dungeon_Character.png');

  // 敌人精灵表
  for (const k in ENEMY_TYPES){
    const t = ENEMY_TYPES[k];
    if (t.sheet) add('ene_'+k, `assets/sprites/enemies/${t.dir}/${t.sheet}`);
    if (t.frames){ // 逐帧
      for (let i=1;i<=t.nframes;i++) add(`ene_${k}_${i}`, t.frames.replace('%d', i));
    }
  }
  // 牧师逐帧
  for (let i=1;i<=4;i++) add(`priest_1_${i}`, `assets/sprites/heroes/priest/priest1/v1/priest1_v1_${i}.png`);
  for (let i=1;i<=4;i++) add(`priest_2_${i}`, `assets/sprites/heroes/priest/priest2/v1/priest2_v1_${i}.png`);
  // 道具
  for (let i=1;i<=8;i++) add(`jack_${i}`, `assets/sprites/props/jackolantern/Jackolantern1_${i}.png`);
  for (let i=1;i<=8;i++) add(`candle_${i}`, `assets/sprites/props/candles/Candles_${i}.png`);

  await Promise.all(jobs);
  setupAudio();
}

// ---------- 音频 ----------
function setupAudio(){
  G.audio.bgm = {};
  for (const k in ASSETS.bgm){ const a=new Audio(ASSETS.bgm[k]); a.loop=(k!=='victory'&&k!=='defeat'); a.preload='auto'; G.audio.bgm[k]=a; }
  G.sfxPaths = {
    swing:['assets/audio/sfx/swing1.wav','assets/audio/sfx/swing2.wav','assets/audio/sfx/swing3.wav','assets/audio/sfx/swing4.wav'],
    sword:['assets/audio/sfx/sword1.mp3','assets/audio/sfx/sword2.mp3','assets/audio/sfx/sword3.mp3'],
    bow:['assets/audio/sfx/bow1.wav','assets/audio/sfx/bow2.wav'],
    bowhit:['assets/audio/sfx/bowhit.mp3'],
    magic:['assets/audio/sfx/magic1.wav','assets/audio/sfx/magic2.wav','assets/audio/sfx/magic3.wav'],
    explode:['assets/audio/sfx/explode1.wav','assets/audio/sfx/explode2.wav'],
    hit:['assets/audio/sfx/hit1.wav','assets/audio/sfx/hit2.wav'],
    hurt:['assets/audio/sfx/hurt1.wav','assets/audio/sfx/hurt2.wav'],
    heavy:['assets/audio/sfx/heavy1.wav','assets/audio/sfx/heavy2.wav'],
    flame:['assets/audio/sfx/flame.wav'],
  };
  G.sfxPool = {};
}
function playSfx(name, vol=1, rate=0){
  if (G.muted) return;
  const paths = G.sfxPaths[name]; if(!paths) return;
  const src = paths[(Math.random()*paths.length)|0];
  // 池化避免重叠卡顿
  const pool = G.sfxPool[src] = G.sfxPool[src] || [];
  let a = pool.find(x=>x.paused || x.ended);
  if(!a && pool.length<6){ a=new Audio(src); pool.push(a); }
  if(a){ a.volume=Math.min(1, vol*G.volume); a.currentTime=0;
    // 音高随机化(±8%), 减少机械重复感
    a.playbackRate = rate>0 ? rate : (1+rand(-0.08,0.08));
    a.play().catch(()=>{}); }
}
function playBgm(name){
  if (G.bgmNow===name) return;
  for (const k in G.audio.bgm){ G.audio.bgm[k].pause(); }
  G.bgmNow = name;
  const a = G.audio.bgm[name];
  if(a && !G.muted){ a.volume = G.volume*0.6; a.currentTime=0; a.play().catch(()=>{}); }
}
function applyMute(){ for(const k in G.audio.bgm) G.audio.bgm[k].muted=G.muted; }

// ---------- 工具 ----------
const rand=(a,b)=>a+Math.random()*(b-a);
const irand=(a,b)=>(a+Math.random()*(b-a+1))|0;
const dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
function angleTo(x1,y1,x2,y2){return Math.atan2(y2-y1,x2-x1);}

// ---------- 粒子 / 飘字 ----------
function spawnParticles(x,y,color,n=8,spd=120,life=0.5,size=3){
  for(let i=0;i<n;i++){ const a=rand(0,Math.PI*2), s=rand(spd*0.3,spd);
    G.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(life*0.5,life),maxLife:life,color,size:rand(size*0.5,size)}); }
}
function spawnFloater(x,y,text,color='#fff',size=16){
  if(G.floaters.length>40) G.floaters.shift(); // 防刷屏: 只留最近40个
  G.floaters.push({x,y,text,color,size,life:0.9,vy:-50,vx:rand(-12,12)});
}
function addShake(amt, t=0.12){ G.shake=Math.max(G.shake,amt); G.shakeT=Math.max(G.shakeT,t); }
function hitStop(t){ G.hitStop=Math.max(G.hitStop,t); }
function screenFlash(color, amt=0.5){ G.flash=Math.max(G.flash,amt); G.flashColor=color; }

// ---------- 玩家 ----------
function makePlayer(heroKey, slot){ // slot 0=P1 1=P2
  const t = HERO_TYPES[heroKey];
  const p = {
    slot, heroKey, def:t,
    x: WORLD_W/2 + (slot? 60:-60), y: WORLD_H/2,
    vx:0, vy:0, r:20, face: slot? -1:1, aimAngle:0,
    hp:t.hp, maxHp:t.hp, spd:t.spd, atk:t.atk, rate:t.rate,
    dmgMul:1, rateMul:1, projMul:1, rangeMul:1, shots:1, dashMul:1,
    iframeBonus:0, regen:0, lifesteal:0, thorns:0, thunder:0,
    killExplode:false, minions:0, gold:0, // gold: 每人独立金币
    atkCd:0, dashCd:0, dashing:0, dashDx:0, dashDy:0, invuln:0,
    skillCd:0, skillMax:t.skill.cd, guardT:0, shadowT:0, // guardT: 骑士减伤 / shadowT: 盗贼必暴
    gear:null, // 装备槽(GEARS)
    // 英雄专属天生被动
    damageReduce: t.passive&&t.passive.key==='damageReduce'? t.passive.val:0,
    critChance:   t.passive&&t.passive.key==='critChance'?   t.passive.val:0.1,
    skillCdMul:   t.passive&&t.passive.key==='skillCdMul'?   t.passive.val:1,
    animT:0, walkT:0, state:'idle',
    alive:true, color:t.color,
    ai:false, auto:true, // ai=AI队友 / auto=自动战斗
  };
  // 初始武器按职业
  p.weapon = heroKey==='knight'?'sword':heroKey==='archer'?'bow':heroKey==='mage'?'firestaff':'dagger';
  return p;
}

// 换武器: 应用新武器攻速(以职业基础攻速为基准)
function setWeapon(p, wkey){
  if(!WEAPONS[wkey]) return;
  p.weapon=wkey;
  p.rate = p.def.rate * (WEAPONS[wkey].rateMul||1);
  spawnFloater(p.x,p.y-30, WEAPONS[wkey].icon+' '+WEAPONS[wkey].name, WEAPONS[wkey].color, 15);
}

function playerNearestEnemy(p){
  let best=null, bd=1e9;
  for(const e of G.enemies){ if(!e.alive) continue; const d=dist(p.x,p.y,e.x,e.y); if(d<bd){bd=d;best=e;} }
  return best;
}

function playerAttack(p){
  const t=p.def;
  const w=p.weapon? WEAPONS[p.weapon]:null;
  const range = t.range * p.rangeMul * (w?w.rangeMul:1);
  const target = playerNearestEnemy(p);
  if (target) p.aimAngle = angleTo(p.x,p.y,target.x,target.y);
  p.face = Math.cos(p.aimAngle) >= 0 ? 1 : -1;
  const baseDmg = p.atk*p.dmgMul*(w?w.dmgMul:1);
  const atkColor = w?w.color:p.color;
  const elem = w?w.elem:null;

  if (t.arc){ // 近战扇形
    playSfx(w?w.sfx:(t.sfx==='swing'?'swing':'sword'), 0.7);
    let hitAny=false;
    for(const e of G.enemies){
      if(!e.alive) continue;
      const d=dist(p.x,p.y,e.x,e.y);
      if(d > range+e.r) continue;
      let da = Math.abs(((angleTo(p.x,p.y,e.x,e.y)-p.aimAngle)+Math.PI*3)%(Math.PI*2)-Math.PI);
      if(da < 1.1){
        damageEnemy(e, baseDmg, p, {knockback:(w&&w.knockback)||160, elem});
        if(w&&w.poison){ e.poison={dps:w.poison,t:3}; }
        if(w&&w.elem==='fire'&&e.alive){ e.burn={dps:4+baseDmg*0.12,t:2}; } // 烈焰巨剑灼烧
        if(w&&w.slow){ e.slowT=1.5; e.slowMul=w.slow; }
        if(w&&w.chain && Math.random()<w.chain){ chainLightning(e, baseDmg*0.5, p); } // 雷霆战锤
        hitAny=true;
      }
    }
    // 南瓜锤冲击波
    if(w&&w.aoeWave){
      addShake(8,0.18); playSfx('explode',0.5);
      G.particles.push({shock:true,x:p.x,y:p.y,r:10,maxR:range*1.6,life:0.3,maxLife:0.3,color:w.color});
      for(const e of G.enemies){ if(!e.alive)continue; if(dist(p.x,p.y,e.x,e.y)<range*1.6+e.r) damageEnemy(e, baseDmg*0.4, p, {knockback:280,noCrit:true}); }
    }
    // 近战可打碎道具
    tryBreakProps(p.x+Math.cos(p.aimAngle)*range*0.6, p.y+Math.sin(p.aimAngle)*range*0.6, range*0.7);
    // 近战挥砍特效
    G.particles.push({slash:true,x:p.x,y:p.y,ang:p.aimAngle,life:0.12,maxLife:0.12,color:atkColor,range});
    if(hitAny){ hitStop(0.03); addShake(3,0.08); }
  } else { // 远程弹道
    playSfx(w?w.sfx:t.sfx, 0.7);
    const n=p.shots+(w&&w.shots? w.shots-1:0);
    for(let i=0;i<n;i++){
      const spread = n>1 ? (i-(n-1)/2)*0.18 : 0;
      const a=p.aimAngle+spread;
      const spd=t.projSpeed*p.projMul;
      G.projectiles.push({
        x:p.x,y:p.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
        dmg:baseDmg, r:8, pierce:t.pierce, bounce:t.bounce||0, aoe:(w&&w.aoe)||t.aoe||0,
        slow:(w&&w.slow)||0, elem, color:atkColor, owner:p, life: range/spd, kind:w?w.sfx:t.sfx,
        poison:(w&&w.poison)||0, chain:(w&&w.chain)||0,
      });
      // 枪口闪光(短促亮粒)
      G.particles.push({x:p.x+Math.cos(a)*p.r, y:p.y+Math.sin(a)*p.r, vx:Math.cos(a)*40, vy:Math.sin(a)*40, life:0.08, maxLife:0.08, color:'#fff', size:7});
    }
  }
}

function playerSkill(p){
  if(p.skillCd>0) return;
  const sk=p.def.skill;
  p.skillCd=p.skillMax*(p.skillCdMul||1); // 法师奥术亲和: CD-20%
  p.skillCdMax=p.skillCd; // 冷却饼图基准
  // 释放时头顶显示技能名
  spawnFloater(p.x, p.y-p.r-24, sk.name+'!', sk.color, 22);
  if(p.heroKey==='knight'){ // 旋风斩: 大横扫+减速控制 + 3秒减伤护盾(肉盾: 控场承伤)
    playSfx('heavy',0.9); addShake(8,0.2);
    for(const e of G.enemies){ if(!e.alive)continue;
      if(dist(p.x,p.y,e.x,e.y)<200+e.r){ damageEnemy(e,p.atk*p.dmgMul*2.2,p);
        e.slowT=1.2; e.slowMul=0.4; } } // 命中减速60%, 给队友输出窗口
    for(let a=0;a<Math.PI*2;a+=0.35) G.particles.push({x:p.x,y:p.y,vx:Math.cos(a)*280,vy:Math.sin(a)*280,life:0.4,maxLife:0.4,color:sk.color,size:4});
    p.guardT=3; // 减伤50% 3秒
    spawnFloater(p.x, p.y+p.r+18, '减伤护盾!', '#5cd4ff', 14);
  } else if(p.heroKey==='archer'){ // 天降箭雨: 锁定最近怪区域, 高密度落箭(远程压场)
    playSfx('bow',1); addShake(4,0.15);
    const tgt=playerNearestEnemy(p);
    const cx=tgt?tgt.x:p.x, cy=tgt?tgt.y:p.y;
    for(let i=0;i<24;i++){ const ox=rand(-150,150), oy=rand(-150,150);
      G.projectiles.push({x:cx+ox, y:cy+oy-300, vx:rand(-30,30), vy:580*p.projMul, dmg:p.atk*p.dmgMul*1.35, r:8, pierce:true, bounce:0, aoe:0, color:p.color, owner:p, life:0.9, kind:'bow'}); }
  } else if(p.heroKey==='mage'){ // 奥术湮灭: 大爆炸+灼烧DoT(玻璃大炮: 爆发+持续)
    playSfx('explode',1); addShake(14,0.4); hitStop(0.08); screenFlash('#e08cff',0.5);
    for(const e of G.enemies){ if(!e.alive)continue;
      if(dist(p.x,p.y,e.x,e.y)<340+e.r){ damageEnemy(e,p.atk*p.dmgMul*3.2,p,{knockback:260});
        if(e.alive) e.burn={dps:6+p.atk*p.dmgMul*0.25, t:3}; } } // 灼烧3秒
    G.particles.push({shock:true,x:p.x,y:p.y,r:10,maxR:340,life:0.4,maxLife:0.4,color:sk.color});
    for(let i=0;i<40;i++) spawnParticles(p.x,p.y,sk.color,1,340,0.7,5);
  } else if(p.heroKey==='rogue'){ // 暗影突袭: 隐身冲刺+4秒必暴+加速, 并重置闪避(刺客节奏)
    playSfx('swing',0.8);
    p.invuln=Math.max(p.invuln,1.2); p.dashing=0.35; p.shadowT=4;
    p.dashCd=0; // 重置闪避, 可立刻再位移一次
    const a=p.aimAngle; p.dashDx=Math.cos(a); p.dashDy=Math.sin(a);
    spawnParticles(p.x,p.y,sk.color,16,180,0.5,4);
    spawnFloater(p.x, p.y+p.r+18, '刀刀暴击!', '#ff4d4d', 14);
  }
}

function playerDash(p){
  if(p.dashCd>0) return;
  p.dashCd=Math.max(0.4, (p.def.dodgeCd||1.2)*0.8);
  p.dashing=0.18; p.invuln=Math.max(p.invuln,0.25+p.iframeBonus);
  let dx=p.vx, dy=p.vy;
  if(dx===0&&dy===0){ dx=p.face; dy=0; }
  const l=Math.hypot(dx,dy)||1;
  p.dashDx=dx/l; p.dashDy=dy/l;
  p.dashGhost=0.18; // 残影计时
  playSfx('swing',0.5);
  spawnParticles(p.x,p.y,'#ffffff',6,80,0.3,3);
}

// ---------- 敌人 ----------
function makeEnemy(type, x, y, hpMul=1, dmgMul=1){
  const t=ENEMY_TYPES[type];
  const r = t.fw? (t.fw*t.scale*0.32) : 18;
  return { type, def:t, x, y, vx:0, vy:0, kvx:0, kvy:0, r,
    hp: t.hp*hpMul, maxHp: t.hp*hpMul, spd:t.spd, dmg:t.dmg*dmgMul,
    mass: Math.max(0.5, r/22), // 质量: 越大越难击退
    face:1, animT:rand(0,1), hitT:0, alive:true, spawnT:0.35, deathT:-1, // spawnT: 出生弹出 / deathT: 死亡消散
    aiT:0, aiState:'idle', chargeDx:0, chargeDy:0, stealth:0, shootCd:rand(1,2),
    touchCd:0, gold:t.gold, isBoss:false };
}

function makeBoss(levelIdx){
  // BOSS 基于关卡主题放大
  const base = ['angrypig','skull','trunk','vampire','vampire'][levelIdx] || 'angrypig';
  const e = makeEnemy(base, WORLD_W/2, 200, 8 + levelIdx*4);
  e.isBoss=true; e.r*=2.4; e.dmg*=1.5+levelIdx*0.15; e.spd*=0.9; e.gold=50+levelIdx*20;
  e.mass=10; // Boss 重, 免疫击退在 damageEnemy 判断
  e.bossPhase=0; e.scaleMul=2.4;
  if(levelIdx===4){ e.pumpkinKing=true; } // 南瓜王
  return e;
}

// 伤害数字分层: 普通金 / 暴击红大 / 吸血绿 / 雷霆黄
function damageEnemy(e, dmg, source, opts){
  if(!e.alive) return;
  opts=opts||{};
  // 暴击(盗贼暗影突袭期间刀刀暴击; 英雄被动/影刃加成暴击率)
  let crit=false;
  if(source && !opts.noCrit){
    const wpn=source.weapon?WEAPONS[source.weapon]:null;
    const cr=source.shadowT>0?1:((source.critChance||0.1)+((wpn&&wpn.critBonus)||0));
    if(Math.random()<cr){ crit=true; dmg*=2; }
  }
  // 连击倍率
  if(source) dmg*=G.comboMul;
  e.hp-=dmg; e.hitT=0.12;
  // 击退(物理): 冲量写入独立通道 kvx/kvy, 不会被 AI 速度覆写, 由 updateEnemy 摩擦衰减
  if(source && !e.isBoss){
    const a=angleTo(source.x,source.y,e.x,e.y);
    const kb=opts.knockback||90;
    const mass = e.mass||1;
    e.kvx=(e.kvx||0)+Math.cos(a)*kb/mass; e.kvy=(e.kvy||0)+Math.sin(a)*kb/mass;
  }
  // 伤害数字分层
  const col = opts.color || (crit?'#ff4d4d':(opts.elem==='fire'?'#ff9540':opts.elem==='thunder'?'#ffe95c':opts.elem==='poison'?'#8ee05c':'#ffd34d'));
  spawnFloater(e.x+rand(-6,6), e.y-e.r-6, Math.round(dmg)+(crit?'!':''), col, crit?(e.isBoss?30:22):(e.isBoss?22:15));
  spawnParticles(e.x, e.y, crit?'#ff4d4d':'#ff6a5c', crit?8:4, 90, 0.3, 3);
  if(source && source.lifesteal){ const heal=dmg*source.lifesteal; source.hp=Math.min(source.maxHp, source.hp+heal);
    spawnFloater(source.x, source.y-source.r-16, '+'+Math.round(heal), '#7ee081', 13); }
  if(source && Math.random()<source.thunder){ // 雷霆
    playSfx('explode',0.5); addShake(5,0.1);
    for(const o of G.enemies){ if(o.alive&&dist(e.x,e.y,o.x,o.y)<120){ o.hp-=dmg*0.6; o.hitT=0.1; spawnFloater(o.x,o.y-o.r-6,Math.round(dmg*0.6),'#ffe95c',13); } }
    for(let i=0;i<10;i++) spawnParticles(e.x,e.y,'#ffe95c',1,200,0.3,3);
  }
  if(crit){ addShake(4,0.08); playSfx('hit',0.6); e.critT=0.18; hitStop(0.05); } // 暴击缩放+顿挫
  if(e.hp<=0){ killEnemy(e, source); }
}

// 连锁闪电(雷霆战锤/雷霆法杖): 从命中目标跳到附近最多2个敌人
function chainLightning(e, dmg, source, n=2){
  playSfx('magic',0.3);
  let cur=e; const hitSet=new Set([e]);
  for(let i=0;i<n;i++){
    let best=null,bd=1e9;
    for(const o of G.enemies){ if(!o.alive||hitSet.has(o)) continue; const d=dist(cur.x,cur.y,o.x,o.y); if(d<bd&&d<220){bd=d;best=o;} }
    if(!best) break;
    for(let j=0;j<5;j++){ const tt=j/4;
      G.particles.push({x:lerp(cur.x,best.x,tt),y:lerp(cur.y,best.y,tt),vx:0,vy:0,life:0.15,maxLife:0.15,color:'#ffe95c',size:3}); }
    damageEnemy(best,dmg,source,{noCrit:true,elem:'thunder'});
    hitSet.add(best); cur=best;
  }
}

function killEnemy(e, source){
  if(!e.alive) return;
  e.alive=false; e.deathT=0; e.hitT=0; G.kills++; // deathT: 播放消散动画后彻底移除
  // 连击
  G.combo++; G.comboT=3; G.comboBest=Math.max(G.comboBest,G.combo);
  G.comboMul=1+Math.min(0.5, G.combo*0.02); // 每连击+2%伤害,上限50%
  // 连击里程碑(10/25/50): 音高上扬提示
  if(G.combo===10||G.combo===25||G.combo===50){ playSfx('magic',0.7, 1+G.combo*0.01); screenFlash('#ffd34d',0.2);
    spawnFloater(e.x, e.y-70, G.combo+' 连击!', '#ffd34d', 30); }
  playSfx('hit',0.5);
  spawnParticles(e.x,e.y,'#ffffff',e.isBoss?30:10,e.isBoss?240:140,0.5,4);
  spawnParticles(e.x,e.y,'#8a2a3a',e.isBoss?20:8,120,0.5,4);
  // 掉落金币/经验
  const gd=e.gold;
  for(let i=0;i<Math.min(5,Math.ceil(gd/3));i++) G.pickups.push({x:e.x+rand(-16,16),y:e.y+rand(-16,16),vx:rand(-60,60),vy:rand(-60,60),kind:'coin',val:Math.ceil(gd/Math.min(5,Math.ceil(gd/3))),life:20,t:0});
  if(Math.random()<0.06) G.pickups.push({x:e.x,y:e.y,vx:0,vy:0,kind:'heart',val:20,life:20,t:0});
  if(Math.random()<0.03) G.pickups.push({x:e.x,y:e.y,vx:0,vy:0,kind:'revive',val:1,life:25,t:0});
  // 武器/装备掉落: BOSS必掉武器+装备 / 精英小概率
  if(e.isBoss){
    G.pickups.push({x:e.x-20,y:e.y,vx:0,vy:0,kind:'weapon',val:SHOP_SELLABLE[irand(0,SHOP_SELLABLE.length-1)],life:30,t:0});
    G.pickups.push({x:e.x+20,y:e.y,vx:0,vy:0,kind:'gear',val:GEAR_SELLABLE[irand(0,GEAR_SELLABLE.length-1)],life:30,t:0});
  } else if(Math.random()<0.02){
    G.pickups.push({x:e.x,y:e.y,vx:0,vy:0,kind:'weapon',val:SHOP_SELLABLE[irand(0,SHOP_SELLABLE.length-1)],life:30,t:0});
  } else if(Math.random()<0.012){
    G.pickups.push({x:e.x,y:e.y,vx:0,vy:0,kind:'gear',val:GEAR_SELLABLE[irand(0,GEAR_SELLABLE.length-1)],life:30,t:0});
  }
  if(source && source.killExplode){ playSfx('explode',0.6);
    for(const o of G.enemies){ if(o.alive&&dist(e.x,e.y,o.x,o.y)<110) damageEnemy(o,20,source,{noCrit:true}); }
    for(let i=0;i<12;i++) spawnParticles(e.x,e.y,'#ff9540',1,220,0.4,4);
  }
  if(e.isBoss){ G.bossesDown++; addShake(16,0.5); hitStop(0.2); playSfx('explode',1); screenFlash('#ffd34d',0.5);
    G.timeScale=0.25; G.timeScaleT=0.9; // Boss 死亡慢镜头
    spawnFloater(e.x,e.y-40,'BOSS 击破!','#ffd34d',36); }
}

// ---------- 敌人 AI ----------
function nearestPlayer(e){
  let best=null,bd=1e9;
  for(const p of G.players){ if(!p.alive)continue; const d=dist(e.x,e.y,p.x,p.y); if(d<bd){bd=d;best=p;} }
  return best;
}

function updateEnemy(e, dt){
  if(!e.alive) return;
  e.animT+=dt; if(e.hitT>0)e.hitT-=dt; if(e.touchCd>0)e.touchCd-=dt; if(e.aiT>0)e.aiT-=dt;
  if(e.spawnT>0) e.spawnT-=dt;
  // 中毒 DoT
  if(e.poison && e.poison.t>0){ e.poison.t-=dt; e.hp-=e.poison.dps*dt;
    if(Math.random()<dt*8) spawnParticles(e.x,e.y-e.r,'#8ee05c',1,30,0.4,3);
    if(e.hp<=0){ killEnemy(e,null); return; } }
  // 灼烧 DoT(法师奥术湮灭)
  if(e.burn && e.burn.t>0){ e.burn.t-=dt; e.hp-=e.burn.dps*dt;
    if(Math.random()<dt*10) spawnParticles(e.x,e.y-e.r,'#ff9540',1,50,0.35,3);
    if(e.hp<=0){ killEnemy(e,null); return; } }
  // 减速
  let spdMul=1;
  if(e.slowT>0){ e.slowT-=dt; spdMul=e.slowMul||0.5; if(e.slowT<=0)e.slowMul=1; }
  const p=nearestPlayer(e);
  if(!p){ e.vx*=0.9; e.vy*=0.9; return; }
  const d=dist(e.x,e.y,p.x,p.y);
  const a=angleTo(e.x,e.y,p.x,p.y);
  const ai=e.def.ai;

  if(ai==='chase'){
    e.vx=Math.cos(a)*e.spd; e.vy=Math.sin(a)*e.spd;
  } else if(ai==='elite'){ // 围猎: 环绕接近
    const orbit = d<120 ? Math.PI/2 : 0;
    e.vx=Math.cos(a+orbit*0.4)*e.spd; e.vy=Math.sin(a+orbit*0.4)*e.spd;
  } else if(ai==='ranged'){
    if(d>300){ e.vx=Math.cos(a)*e.spd; e.vy=Math.sin(a)*e.spd; }
    else if(d<200){ e.vx=-Math.cos(a)*e.spd*0.6; e.vy=-Math.sin(a)*e.spd*0.6; }
    else { e.vx*=0.8; e.vy*=0.8; }
    e.shootCd-=dt;
    if(e.shootCd<=0 && d<420){ e.shootCd=rand(1.8,2.6); enemyShoot(e,a); }
  } else if(ai==='lobber'){
    if(d>360){ e.vx=Math.cos(a)*e.spd; e.vy=Math.sin(a)*e.spd; } else { e.vx*=0.8; e.vy*=0.8; }
    e.shootCd-=dt;
    if(e.shootCd<=0 && d<520){ e.shootCd=rand(2.2,3); enemyShoot(e,a,true); }
  } else if(ai==='charge'){
    if(e.aiState==='idle'){ e.vx=Math.cos(a)*e.spd; e.vy=Math.sin(a)*e.spd;
      if(d<320 && e.aiT<=0){ e.aiState='windup'; e.aiT=0.6; e.vx=e.vy=0; } }
    else if(e.aiState==='windup'){ e.vx=e.vy=0; spawnParticles(e.x,e.y,'#ffaa40',1,40,0.2,3);
      if(e.aiT<=0){ e.aiState='charge'; e.aiT=0.7; e.chargeDx=Math.cos(a); e.chargeDy=Math.sin(a); playSfx('heavy',0.4); } }
    else if(e.aiState==='charge'){ e.vx=e.chargeDx*e.spd*4; e.vy=e.chargeDy*e.spd*4;
      if(e.aiT<=0){ e.aiState='idle'; e.aiT=1.2; } }
  } else if(ai==='stealth'){
    e.stealth = d>200 ? 0.4 : Math.max(0,e.stealth-dt*2);
    e.vx=Math.cos(a)*e.spd; e.vy=Math.sin(a)*e.spd;
  } else if(ai==='summoner'){
    if(d>280){ e.vx=Math.cos(a)*e.spd; e.vy=Math.sin(a)*e.spd; } else { e.vx*=0.85; e.vy*=0.85; }
    e.shootCd-=dt;
    if(e.shootCd<=0 && G.enemies.length<140){ e.shootCd=rand(3,4);
      const s=makeEnemy('slime', e.x+rand(-30,30), e.y+rand(-30,30), 0.6); G.enemies.push(s);
      spawnParticles(e.x,e.y,'#9a4ab0',10,120,0.5,4); playSfx('magic',0.4); }
  }

  // Boss 额外技能
  if(e.isBoss){ updateBoss(e, dt, p, d, a); }

  // 位置积分: AI 速度 + 击退冲量(应用减速), 世界边界
  const mvx=e.vx+(e.kvx||0), mvy=e.vy+(e.kvy||0);
  e.x=clamp(e.x+mvx*spdMul*dt, 40, WORLD_W-40);
  e.y=clamp(e.y+mvy*spdMul*dt, 40, WORLD_H-40);

  // 朝向: 面向实际合速度方向(不倒着走); 停下/蓄力时面向玩家
  if(Math.abs(mvx)>6) e.face = mvx>=0?1:-1;
  else e.face = p.x>=e.x?1:-1;

  // 摩擦: 只衰减击退冲量(恢复自主移动), 不衰减 AI 速度
  const fr=Math.exp(-dt*4.5);
  e.kvx=(e.kvx||0)*fr; e.kvy=(e.kvy||0)*fr;

  // 软性推挤: 与玩家重叠时把玩家挤开一点(避免完全穿模)
  if(d < e.r+p.r-2){
    const ov=(e.r+p.r-2-d)||1, nx=(p.x-e.x)/(d||1), ny=(p.y-e.y)/(d||1);
    const push=ov*0.5;
    p.x=clamp(p.x+nx*push,30,WORLD_W-30); p.y=clamp(p.y+ny*push,30,WORLD_H-30);
  }

  // 接触伤害
  if(e.touchCd<=0 && d < e.r+p.r-4 && p.invuln<=0){
    hurtPlayer(p, e.dmg, e); e.touchCd=0.8;
  }
}

// 敌人群体分离 (flocking): 每帧一次, 让怪彼此错开不叠成一团
function separateEnemies(){
  const arr=G.enemies;
  for(let i=0;i<arr.length;i++){
    const a=arr[i]; if(!a.alive) continue;
    for(let j=i+1;j<arr.length;j++){
      const b=arr[j]; if(!b.alive) continue;
      const dx=b.x-a.x, dy=b.y-a.y;
      const rr=(a.r+b.r)*0.9;
      const d2=dx*dx+dy*dy;
      if(d2>rr*rr) continue;
      let d=Math.sqrt(d2), nx, ny;
      if(d<0.01){ nx=rand(-1,1); ny=rand(-1,1); const nl=Math.hypot(nx,ny)||1; nx/=nl; ny/=nl; d=0.01; } // 完全重叠给随机方向
      else { nx=dx/d; ny=dy/d; }
      const ov=(rr-d)*0.5;
      const ma=a.mass||1, mb=b.mass||1, tot=ma+mb;
      // 按质量分配位移(轻的推得多)
      a.x-=nx*ov*(mb/tot); a.y-=ny*ov*(mb/tot);
      b.x+=nx*ov*(ma/tot); b.y+=ny*ov*(ma/tot);
    }
  }
}

function enemyShoot(e, angle, lob=false){
  playSfx(e.def.proj==='rock'?'heavy':'magic', 0.35);
  const spd = lob? 260: 300;
  G.eprojectiles.push({x:e.x,y:e.y,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,
    dmg:e.dmg, r: lob?12:8, life:3, color:'#ff5c8a', lob, t:0, gravity: lob?300:0, vy0: lob?-180:0});
}

function updateBoss(e, dt, p, d, a){
  e.bossSkillCd=(e.bossSkillCd||3)-dt;
  if(e.pumpkinKing){ // 南瓜王多阶段
    const frac=e.hp/e.maxHp;
    if(frac<0.66&&e.bossPhase<1){e.bossPhase=1; spawnFloater(e.x,e.y-60,'狂暴!','#ff9540',30); e.spd*=1.3;}
    if(frac<0.33&&e.bossPhase<2){e.bossPhase=2; spawnFloater(e.x,e.y-60,'最终形态!','#ff5c5c',32); e.spd*=1.3; e.dmg*=1.3;}
    if(e.bossSkillCd<=0){ e.bossSkillCd=4-e.bossPhase;
      // 召唤南瓜灯怪
      for(let i=0;i<2+e.bossPhase;i++){ if(G.enemies.length<150) G.enemies.push(makeEnemy('ghost',e.x+rand(-80,80),e.y+rand(-80,80),1)); }
      // 环形弹幕
      for(let i=0;i<12;i++){ const an=i/12*Math.PI*2; G.eprojectiles.push({x:e.x,y:e.y,vx:Math.cos(an)*220,vy:Math.sin(an)*220,dmg:e.dmg*0.6,r:10,life:3,color:'#ff9540',t:0}); }
      playSfx('explode',0.7); addShake(8,0.2);
    }
  } else if(e.bossSkillCd<=0){
    e.bossSkillCd=3.5;
    for(let i=0;i<8;i++){ const an=i/8*Math.PI*2 + e.animT; G.eprojectiles.push({x:e.x,y:e.y,vx:Math.cos(an)*200,vy:Math.sin(an)*200,dmg:e.dmg*0.6,r:9,life:3,color:'#c06ce0',t:0}); }
    playSfx('magic',0.6);
  }
}

// ---------- 玩家受伤 ----------
function hurtPlayer(p, dmg, from){
  if(p.invuln>0||!p.alive) return;
  if(p.guardT>0) dmg*=0.5; // 骑士旋风斩护盾: 减伤50%
  if(p.damageReduce>0) dmg*=(1-p.damageReduce); // 骑士圣盾体质: 常驻减免15%
  p.hp-=dmg; p.invuln=0.6+p.iframeBonus;
  playSfx('hurt',0.7); addShake(6,0.15); hitStop(0.04);
  p.hurtT=0.2; // 受击缩放
  // 受击击退(物理): 被怪撞会产生位移
  if(from){ const a=angleTo(from.x,from.y,p.x,p.y); const kb=Math.min(180, from.dmg*9);
    p.x=clamp(p.x+Math.cos(a)*kb*0.06,30,WORLD_W-30); p.y=clamp(p.y+Math.sin(a)*kb*0.06,30,WORLD_H-30); }
  spawnFloater(p.x,p.y-30,'-'+Math.round(dmg),'#ff5c5c',18);
  spawnParticles(p.x,p.y,'#ff5c5c',8,140,0.4,3);
  if(p.thorns>0 && from){ damageEnemy(from, dmg*p.thorns, null); }
  if(p.hp<=0){ p.hp=0; p.alive=false; playSfx('heavy',0.8); screenFlash('#ff2a2a',0.4); spawnParticles(p.x,p.y,'#888',20,160,0.8,4);
    checkGameOver(); }
}

function checkGameOver(){
  if(G.players.every(p=>!p.alive)){ doGameOver(); }
}

// ---------- 随从 ----------
function syncMinions(){
  for(const p of G.players){
    const want=p.minions||0;
    const have=G.minions.filter(m=>m.owner===p).length;
    for(let i=have;i<want;i++) G.minions.push({owner:p,x:p.x+rand(-40,40),y:p.y+rand(-40,40),r:14,animT:0,atkCd:0,hp:40,alive:true});
  }
}
function updateMinions(dt){
  for(const m of G.minions){
    if(!m.alive) continue;
    m.animT+=dt; m.atkCd-=dt;
    // 找最近怪
    let best=null,bd=1e9;
    for(const e of G.enemies){ if(!e.alive)continue; const d=dist(m.x,m.y,e.x,e.y); if(d<bd){bd=d;best=e;} }
    if(best){
      const a=angleTo(m.x,m.y,best.x,best.y);
      if(bd>40){ m.x+=Math.cos(a)*180*dt; m.y+=Math.sin(a)*180*dt; }
      else if(m.atkCd<=0){ m.atkCd=0.8; damageEnemy(best, 12, m.owner); playSfx('hit',0.3); }
    } else { // 跟随主人
      const p=m.owner, a=angleTo(m.x,m.y,p.x,p.y), d=dist(m.x,m.y,p.x,p.y);
      if(d>60){ m.x+=Math.cos(a)*220*dt; m.y+=Math.sin(a)*220*dt; }
    }
  }
}

// ---------- 波次 / 生成 ----------
function startWave(){
  G.wave++;
  const lvl=Math.floor((G.wave-1)/WAVES_PER_LEVEL);
  const waveInLvl=(G.wave-1)%WAVES_PER_LEVEL+1;
  const isBossWave = (waveInLvl===WAVES_PER_LEVEL);
  G.spawnQueue=[];

  if(isBossWave){
    G.enemies.push(makeBoss(lvl));
    // Boss 护卫小队(4只本关小怪), 避免Boss波太空
    const pool=LEVEL_DEFS[lvl].pool;
    for(let i=0;i<4;i++){
      const a=i/4*Math.PI*2;
      G.enemies.push(makeEnemy(pool[irand(0,pool.length-1)], WORLD_W/2+Math.cos(a)*220, 200+Math.sin(a)*160, 1+lvl*0.5));
    }
    spawnFloater(WORLD_W/2, 200, '⚠ BOSS 出现 ⚠', '#ff5c5c', 40);
    playBgm('boss'); addShake(10,0.4);
  } else {
    const pool=LEVEL_DEFS[lvl].pool;
    const count = 10 + G.wave*4;                // 递增数量(压力曲线)
    const hpMul = 1 + (G.wave-1)*0.15;           // 递增血量
    const dmgMul = 1 + (G.wave-1)*0.05;          // 递增伤害(避免后期挠痒痒)
    for(let i=0;i<count;i++){
      const type=pool[irand(0,pool.length-1)];
      G.spawnQueue.push({type, hpMul, dmgMul});
    }
    G.spawnTimer=0;
    if(G.bgmNow!=='battle') playBgm('battle');
  }
  G.waveTimer=0;
  G.state='play';
  // 每波开始刷新场景道具与陷阱(仅本关第1波)
  if(waveInLvl===1){ spawnProps(); spawnTraps(); }
  spawnFloater(WORLD_W/2, WORLD_H/2-120, `第 ${G.wave} 波`, '#fff', 36);
  if(waveInLvl===1 && G.wave>1) spawnFloater(WORLD_W/2, WORLD_H/2-160, LEVEL_DEFS[lvl].name, LEVEL_DEFS[lvl].tint, 28);
}

function spawnFromQueue(dt){
  if(!G.spawnQueue.length) return;
  G.spawnTimer-=dt;
  if(G.spawnTimer<=0){
    G.spawnTimer=0.3;
    const batch=Math.min(5,G.spawnQueue.length); // 每批5只, 压力来得更快
    for(let i=0;i<batch;i++){
      const s=G.spawnQueue.shift();
      // 边缘生成
      const side=irand(0,3); let x,y;
      if(side===0){x=rand(60,WORLD_W-60);y=60;} else if(side===1){x=rand(60,WORLD_W-60);y=WORLD_H-60;}
      else if(side===2){x=60;y=rand(60,WORLD_H-60);} else {x=WORLD_W-60;y=rand(60,WORLD_H-60);}
      G.enemies.push(makeEnemy(s.type,x,y,s.hpMul,s.dmgMul||1));
      spawnParticles(x,y,'#9a4ab0',6,80,0.4,3);
    }
  }
}

function checkWaveClear(){
  if(G.state!=='play') return;
  if(G.spawnQueue.length===0 && G.enemies.every(e=>!e.alive)){
    // 波次结束
    G.enemies=G.enemies.filter(e=>e.alive);
    if(G.wave>=TOTAL_WAVES){ doVictory(); return; }
    // 清场奖励: 每位存活玩家各得一份(连击加成结算)
    const bonus = 8 + Math.ceil(G.wave*1.5) + Math.round(G.comboBest*0.5);
    for(const p of G.players){ if(p.alive) p.gold=(p.gold||0)+bonus; }
    playSfx('bowhit',0.6);
    if(G.comboBest>=8) spawnFloater(WORLD_W/2, WORLD_H/2-40, `清场! 每人+${bonus}💰 (最佳${G.comboBest}连)`, '#ffd34d', 24);
    G.comboBest=0;
    const waveInLvl=G.wave%WAVES_PER_LEVEL;
    if(waveInLvl===0){ // 关卡结束 -> 传送门
      G.levelTrans=0; G.portal={x:WORLD_W/2,y:WORLD_H/2,t:0};
      G.state='levelclear';
      spawnFloater(WORLD_W/2,WORLD_H/2,'关卡通过!','#ffd34d',40);
      playBgm('victory');
    } else {
      offerUpgrades();
    }
  }
}

function offerUpgrades(){
  G.state='upgrade'; G.upgradeTimer=15;
  // 随机3个(考虑远程限定)
  const pool=UPGRADES.filter(u=>{
    if(u.rangedOnly) return G.players.some(p=>!p.def.arc);
    return true;
  });
  const picks=[];
  const c=[...pool];
  for(let i=0;i<3 && c.length;i++){ picks.push(c.splice(irand(0,c.length-1),1)[0]); }
  G.upgradeChoices=picks;
  showUpgradeUI(picks);
}

function applyUpgrade(idx){
  const u=G.upgradeChoices[idx]; if(!u) return;
  for(const p of G.players){ if(p.alive) u.apply(p); }
  syncMinions();
  hideUpgradeUI();
  G.interTimer=2.0; G.state='intermission';
  spawnFloater(WORLD_W/2,WORLD_H/2-80, u.name, '#7ee081', 26);
}

// ---------- 关卡推进 ----------
function nextLevel(){
  G.level++;
  G.portal=null;
  // 恢复少量血
  for(const p of G.players) if(p.alive) p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.3);
  G.interTimer=2.5; G.state='intermission';
  spawnFloater(WORLD_W/2,WORLD_H/2,'进入 '+LEVEL_DEFS[G.level].name,'#fff',36);
}

// ========== 商店系统 (每关过关后) ==========
const SHOP_SELLABLE=['pumpkin','bonescythe','crossbow','firestaff','froststaff','flamesword','stormhammer','shadowblade','venombow','stormstaff','icebow'];
const GEAR_SELLABLE=Object.keys(GEARS);
function rollShop(){
  const items=[];
  const pm=1+G.level*0.3; // 价格随关卡上浮(经济曲线)
  const price=b=>Math.round(b*pm/5)*5;
  // 2 把随机武器(不重复)
  const ws=[...SHOP_SELLABLE];
  for(let i=0;i<2 && ws.length;i++){
    const k=ws.splice(irand(0,ws.length-1),1)[0];
    items.push({ kind:'weapon', key:k, icon:WEAPONS[k].icon, name:WEAPONS[k].name, desc:WEAPONS[k].desc, price:price(55), color:WEAPONS[k].color });
  }
  // 2 件随机装备(不重复)
  const gs=[...GEAR_SELLABLE];
  for(let i=0;i<2 && gs.length;i++){
    const k=gs.splice(irand(0,gs.length-1),1)[0];
    items.push({ kind:'gear', key:k, icon:GEARS[k].icon, name:GEARS[k].name, desc:GEARS[k].desc, price:price(GEARS[k].price), color:GEARS[k].color });
  }
  items.push({ kind:'heal',  icon:'❤️', name:'治疗药水', desc:'恢复 50% 生命', price:price(30), color:'#ff5c8a' });
  items.push({ kind:'revive',icon:'✚',  name:'复活币',   desc:'队友倒地时原地复活', price:price(40), color:'#5cd4ff' });
  items.push({ kind:'maxhp', icon:'🛡️', name:'生命强化', desc:'+25 最大生命', price:price(50), color:'#7ee081' });
  G.shopItems=items;
}
function openShop(){
  if(G.level>=LEVELS) return;      // 通关不再进商店
  G.state='shop';
  rollShop();
  playSfx('magic',0.6);
  showShopUI();
}
function buyShopItem(i, slot){
  const it=G.shopItems[i]; if(!it) return;
  const p=G.players[slot]; if(!p || !p.alive) return;
  const repeatable = it.kind==='heal'||it.kind==='revive'||it.kind==='maxhp'; // 消耗品可重复购买(金币出口)
  it.soldBy=it.soldBy||{};
  if(!repeatable && it.soldBy[slot]) return;
  if((p.gold||0)<it.price){ playSfx('hit',0.3); spawnFloater(p.x,p.y-40,'P'+(slot+1)+' 金币不足!','#ff5c5c',22); return; }
  p.gold-=it.price; if(!repeatable) it.soldBy[slot]=true; playSfx('bowhit',0.7);
  if(it.kind==='weapon') setWeapon(p,it.key);
  else if(it.kind==='gear') setGear(p,it.key);
  else if(it.kind==='heal'){ p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.5); spawnFloater(p.x,p.y-30,'+50%❤','#7ee081',18); }
  else if(it.kind==='revive'){ p.reviveCoins=(p.reviveCoins||0)+1; spawnFloater(p.x,p.y-30,'复活币+1','#5cd4ff',18); }
  else if(it.kind==='maxhp'){ p.maxHp+=25; p.hp+=25; spawnFloater(p.x,p.y-30,'生命上限+25','#7ee081',18); }
  showShopUI(); // 刷新已售状态
}
function closeShop(){
  hideShopUI();
  G.state='intermission'; G.interTimer=0.5;
}

// ========== 局外永久成长 (Meta / localStorage) ==========
const META_KEY='dungeon_duo_meta_v1';
const META_UPGRADES={
  atk:   { name:'永久攻击', icon:'⚔️', desc:'每级 +5% 基础伤害', max:10, base:40, mul:1.5 },
  hp:    { name:'永久生命', icon:'❤️', desc:'每级 +12 基础生命', max:10, base:40, mul:1.5 },
  spd:   { name:'永久移速', icon:'💨', desc:'每级 +3% 移动速度', max:8,  base:45, mul:1.5 },
  gold:  { name:'黄金猎手', icon:'💰', desc:'每级 +8% 金币获取', max:8,  base:45, mul:1.5 },
  revive:{ name:'备用复活', icon:'✚',  desc:'每级开局 +1 复活币', max:3, base:90, mul:2 },
};
function metaCost(k){ const m=META_UPGRADES[k]; const lv=G.meta.upg[k]||0; return Math.round(m.base*Math.pow(m.mul,lv)); }
function loadMeta(){
  try{ G.meta=JSON.parse(localStorage.getItem(META_KEY))||null; }catch(e){ G.meta=null; }
  if(!G.meta) G.meta={ souls:0, bestWave:0, runs:0, upg:{} };
  if(!G.meta.upg) G.meta.upg={};
  G.bestWave=G.meta.bestWave||0;
}
function saveMeta(){ try{ localStorage.setItem(META_KEY, JSON.stringify(G.meta)); }catch(e){} }
function awardSouls(){
  const gain=Math.round(G.wave*2 + G.kills*0.5 + G.bossesDown*15);
  G.meta.souls+=gain; G.meta.runs++;
  G.meta.bestWave=Math.max(G.meta.bestWave||0, G.wave);
  G.bestWave=G.meta.bestWave;
  saveMeta();
  return gain;
}
function buyMeta(k){
  const m=META_UPGRADES[k]; const lv=G.meta.upg[k]||0;
  if(lv>=m.max) return;
  const cost=metaCost(k);
  if(G.meta.souls<cost){ playSfx('hit',0.3); return; }
  G.meta.souls-=cost; G.meta.upg[k]=lv+1; saveMeta(); playSfx('bowhit',0.7);
}
function applyMetaToPlayer(p){
  const u=G.meta?G.meta.upg:{};
  if(u.atk) p.dmgMul*=1+u.atk*0.05;
  if(u.hp){ p.maxHp+=u.hp*12; p.hp=p.maxHp; }
  if(u.spd) p.spd*=1+u.spd*0.03;
  if(u.gold) p.goldMul=1+u.gold*0.08;
  if(u.revive) p.reviveCoins=(p.reviveCoins||0)+u.revive;
}

// ---------- 游戏流程 ----------
function startGame(sel){ // sel: ['knight','archer']
  loadMeta();
  G.players=[makePlayer(sel[0],0)];
  if(sel.length>1) G.players.push(makePlayer(sel[1],1));
  else { // 单人: 配一个 AI 队友(默认弓手补位)
    const aiKey = sel[0]==='archer'?'knight':'archer';
    const ai=makePlayer(aiKey,1); ai.ai=true; ai.auto=true;
    G.players.push(ai);
  }
  for(const p of G.players){ applyMetaToPlayer(p); if(!p.ai) p.auto=(G.autoBattle!==false); }
  G.enemies=[];G.projectiles=[];G.eprojectiles=[];G.pickups=[];G.particles=[];G.floaters=[];G.minions=[];
  G.wave=0;G.level=0;G.gold=0;G.kills=0;G.bossesDown=0; // G.gold 弃用: 金币按人独立(p.gold)
  G.camX=WORLD_W/2-VIEW_W/2; G.camY=WORLD_H/2-VIEW_H/2;
  G.interTimer=2.0; G.state='intermission';
  playBgm('battle');
}

function doGameOver(){
  G.state='gameover';
  G.soulsGain=awardSouls();
  playBgm('defeat');
  showGameOverUI();
}
function doVictory(){
  G.state='victory';
  G.soulsGain=awardSouls();
  playBgm('victory'); showVictoryUI();
}

// ---------- 主更新 ----------
function update(dt){
  // 慢镜头(Boss死亡)
  if(G.timeScaleT>0){ G.timeScaleT-=dt; if(G.timeScaleT<=0) G.timeScale=1; }
  dt*=G.timeScale;
  G.time+=dt;
  // 帧率统计
  G._fpsAcc+=dt; G._fpsN++;
  if(G._fpsAcc>=0.5){ G.fps=Math.round(G._fpsN/G._fpsAcc); G._fpsAcc=0; G._fpsN=0; }

  // 连击衰减
  if(G.comboT>0){ G.comboT-=dt; if(G.comboT<=0){ G.combo=0; G.comboMul=1; } }

  // 打击停顿 & 屏幕震动衰减
  if(G.hitStop>0){ G.hitStop-=dt; return; }
  if(G.shakeT>0){ G.shakeT-=dt; if(G.shakeT<=0)G.shake=0; }
  if(G.flash>0){ G.flash-=dt*2.2; if(G.flash<0)G.flash=0; }

  if(G.state==='play'||G.state==='intermission'||G.state==='levelclear'){
    // 玩家
    for(const p of G.players){ if(!p.alive) continue; if(p.ai) updateAIPlayer(p,dt); else updatePlayer(p,dt); }
    updateMinions(dt);
    // 敌人
    for(const e of G.enemies){ if(e.alive) updateEnemy(e,dt); else if(e.deathT>=0) e.deathT+=dt; }
    separateEnemies(); // 群体分离
    G.enemies=G.enemies.filter(e=>e.alive || (e.deathT>=0 && e.deathT<DEATH_ANIM_DUR));
    // 弹道
    updateProjectiles(dt);
    // 拾取
    updatePickups(dt);
    // 道具 / 陷阱 / 复活
    updateProps(dt); updateTraps(dt); updateRevive(dt);
    // 相机
    updateCamera(dt);
  }

  if(G.state==='play'){
    spawnFromQueue(dt);
    G.waveTimer+=dt;
    checkWaveClear();
  } else if(G.state==='intermission'){
    G.interTimer-=dt;
    if(G.interTimer<=0) startWave();
  } else if(G.state==='levelclear'){
    G.levelTrans+=dt;
    if(G.portal){ G.portal.t+=dt; }
    // 玩家走进传送门 或 自动3秒
    let enter=G.levelTrans>3;
    for(const p of G.players) if(p.alive&&G.portal&&dist(p.x,p.y,G.portal.x,G.portal.y)<60) enter=true;
    if(enter){ nextLevel(); openShop(); } // 过先进商店再下一关
  } else if(G.state==='upgrade'){
    G.upgradeTimer-=dt;
    updateUpgradeTimer(G.upgradeTimer);
    if(G.upgradeTimer<=0) applyUpgrade(0); // 超时自动选第一个
  }

  // 粒子 & 飘字始终更新
  updateParticles(dt);
  // 残影衰减
  for(const gh of G.dashGhosts) gh.life-=dt;
  G.dashGhosts=G.dashGhosts.filter(g=>g.life>0);
}

function updatePlayer(p,dt){
  const map = p.slot===0?KEYMAP.p1:KEYMAP.p2;
  let mx=0,my=0;
  if(keys[map.up])my-=1; if(keys[map.down])my+=1;
  if(keys[map.left])mx-=1; if(keys[map.right])mx+=1;
  const l=Math.hypot(mx,my);
  if(l>0){mx/=l;my/=l;}

  if(p.atkCd>0)p.atkCd-=dt; if(p.dashCd>0)p.dashCd-=dt;
  if(p.invuln>0)p.invuln-=dt; if(p.skillCd>0)p.skillCd-=dt;
  if(p.hurtT>0)p.hurtT-=dt; // 受击缩放计时
  if(p.guardT>0)p.guardT-=dt; if(p.shadowT>0)p.shadowT-=dt;
  if(p.regen>0) p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);

  if(p.dashing>0){
    p.dashing-=dt;
    const dashSpd=p.spd*3.2*p.dashMul*(p.def.dash||1); // 近战闪避距离更远(骑士1.5x/盗贼1.3x)
    p.vx=p.dashDx*dashSpd; p.vy=p.dashDy*dashSpd;
    // 冲刺残影
    p._ghostT=(p._ghostT||0)-dt;
    if(p._ghostT<=0){ p._ghostT=0.03; G.dashGhosts.push({x:p.x,y:p.y,face:p.face,color:p.color,life:0.25,maxLife:0.25,def:p.def,heroKey:p.heroKey}); }
  } else {
    const spdB = p.shadowT>0? 1.3:1; // 暗影突袭期间移速+30%
    p.vx=mx*p.spd*spdB; p.vy=my*p.spd*spdB;
  }
  p.x=clamp(p.x+p.vx*dt,30,WORLD_W-30);
  p.y=clamp(p.y+p.vy*dt,30,WORLD_H-30);

  // 攻击朝向最近怪 (辅助瞄准: 自动锁定最近目标)
  const tgt=playerNearestEnemy(p);
  if(tgt) p.aimAngle=angleTo(p.x,p.y,tgt.x,tgt.y);

  // 朝向: 怪在近身交战距离内→面向怪; 否则面向移动方向(不倒着走)
  if(l>0){
    p.walkT+=dt; p.state='run';
    const engage = (p.def.arc? 150 : 380) * p.rangeMul;
    if(tgt && dist(p.x,p.y,tgt.x,tgt.y) < engage) p.face = Math.cos(p.aimAngle)>=0?1:-1;
    else p.face = mx>=0?1:-1;
  } else {
    p.state='idle';
    if(tgt && dist(p.x,p.y,tgt.x,tgt.y) < 480) p.face = Math.cos(p.aimAngle)>=0?1:-1;
  }
  p.animT+=dt;

  // 攻击全自动: 有怪且处于攻击范围时自动出手(C/L 已改为技能键)
  const wantAtk = p.auto && tgt;
  if(wantAtk && p.atkCd<=0){ p.atkCd=p.rate*p.rateMul; playerAttack(p); }
  if(keyHit[map.dash]){ keyHit[map.dash]=false; playerDash(p); }
  if(keyHit[map.skill]){ keyHit[map.skill]=false; playerSkill(p); }
}

// ---------- AI 队友 (单人模式) ----------
function updateAIPlayer(p,dt){
  if(p.atkCd>0)p.atkCd-=dt; if(p.dashCd>0)p.dashCd-=dt;
  if(p.invuln>0)p.invuln-=dt; if(p.skillCd>0)p.skillCd-=dt;
  if(p.guardT>0)p.guardT-=dt; if(p.shadowT>0)p.shadowT-=dt;
  if(p.regen>0) p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);

  const tgt=playerNearestEnemy(p);
  let mx=0,my=0;
  if(tgt){
    const d=dist(p.x,p.y,tgt.x,tgt.y);
    p.aimAngle=angleTo(p.x,p.y,tgt.x,tgt.y);
    const desired = p.def.arc? 50 : 280; // 近战贴近 / 远程保持距离
    if(d>desired+20){ mx=Math.cos(p.aimAngle); my=Math.sin(p.aimAngle); }
    else if(d<desired-20 && !p.def.arc){ mx=-Math.cos(p.aimAngle); my=-Math.sin(p.aimAngle); }
    // 自动攻击(射程按职业+升级倍率, 含武器)
    const w=p.weapon?WEAPONS[p.weapon]:null;
    const aiRange=p.def.range*p.rangeMul*(w?w.rangeMul:1);
    if(p.atkCd<=0 && d < aiRange*1.1+40){ p.atkCd=p.rate*p.rateMul; playerAttack(p); }
    // 危险时闪避
    if(d<70 && p.dashCd<=0 && Math.random()<0.04){ playerDash(p); }
    // 技能好了就用(怪多时)
    if(p.skillCd<=0 && G.enemies.filter(e=>e.alive).length>=4){ playerSkill(p); }
  } else {
    // 没怪时跟随 P1
    const leader=G.players.find(q=>q!==p&&q.alive);
    if(leader){ const d=dist(p.x,p.y,leader.x,leader.y);
      if(d>90){ const a=angleTo(p.x,p.y,leader.x,leader.y); mx=Math.cos(a); my=Math.sin(a); } }
  }
  // 躲避激活的陷阱(AI不再站刺上输出)
  for(const tr of G.traps){ if(tr.active){ const td=dist(p.x,p.y,tr.x,tr.y);
    if(td<tr.r+50){ const ta=angleTo(tr.x,tr.y,p.x,p.y); mx+=Math.cos(ta)*1.3; my+=Math.sin(ta)*1.3; } } }
  const l=Math.hypot(mx,my); if(l>0){mx/=l;my/=l;}
  if(p.dashing>0){ // AI 闪避位移(与玩家一致, 近战更远)
    p.dashing-=dt;
    const dashSpd=p.spd*3.2*p.dashMul*(p.def.dash||1);
    p.vx=p.dashDx*dashSpd; p.vy=p.dashDy*dashSpd;
  } else {
    const spdB = p.shadowT>0? 1.3:1; // 暗影突袭移速加成(AI一致)
    p.vx=mx*p.spd*spdB; p.vy=my*p.spd*spdB;
  }
  p.x=clamp(p.x+p.vx*dt,30,WORLD_W-30);
  p.y=clamp(p.y+p.vy*dt,30,WORLD_H-30);  if(l>0){
    p.walkT+=dt; p.state='run';
    // 朝向: 面向移动方向(不倒着走); 交战贴脸时除外
    if(tgt && dist(p.x,p.y,tgt.x,tgt.y) < (p.def.arc?90:70)) p.face = Math.cos(p.aimAngle)>=0?1:-1;
    else p.face = mx>=0?1:-1;
  } else {
    p.state='idle';
    if(tgt) p.face = Math.cos(p.aimAngle)>=0?1:-1;
  }
  p.animT+=dt;
}

function updateProjectiles(dt){
  // 玩家弹道
  for(const pr of G.projectiles){
    pr.x+=pr.vx*dt; pr.y+=pr.vy*dt; pr.life-=dt;
    tryBreakProps(pr.x,pr.y,pr.r); // 弹道打碎道具
    for(const e of G.enemies){
      if(!e.alive||pr.dead)continue;
      if(dist(pr.x,pr.y,e.x,e.y)<pr.r+e.r){
        damageEnemy(e,pr.dmg,pr.owner,{elem:pr.elem});
        if(pr.slow){ e.slowT=1.5; e.slowMul=pr.slow; } // 寒霜减速
        if(pr.poison){ e.poison={dps:pr.poison,t:3}; } // 剧毒之弓
        if(e.alive&&pr.elem==='fire'){ e.burn={dps:4+pr.dmg*0.12,t:2}; } // 火焰灼烧
        if(pr.chain && Math.random()<pr.chain){ chainLightning(e, pr.dmg*0.5, pr.owner); } // 雷霆法杖
        if(pr.aoe){ playSfx('explode',0.4); for(const o of G.enemies){if(o.alive&&o!==e&&dist(pr.x,pr.y,o.x,o.y)<pr.aoe)damageEnemy(o,pr.dmg*0.6,pr.owner,{elem:pr.elem,noCrit:true});} spawnParticles(pr.x,pr.y,pr.color,8,140,0.3,3); pr.dead=true; }
        else if(pr.bounce>0){ pr.bounce--; let nb=null,nd=1e9; for(const o of G.enemies){if(o.alive&&o!==e){const d=dist(pr.x,pr.y,o.x,o.y);if(d<nd){nd=d;nb=o;}}} if(nb){const a=angleTo(pr.x,pr.y,nb.x,nb.y);const s=Math.hypot(pr.vx,pr.vy);pr.vx=Math.cos(a)*s;pr.vy=Math.sin(a)*s;} else pr.dead=true; }
        else if(pr.pierce){ pr.pierceHits=(pr.pierceHits||0)+1; if(pr.pierceHits>3)pr.dead=true; }
        else pr.dead=true;
        break;
      }
    }
  }
  G.projectiles=G.projectiles.filter(p=>!p.dead&&p.life>0&&p.x>0&&p.x<WORLD_W&&p.y>0&&p.y<WORLD_H);

  // 敌方弹道
  for(const pr of G.eprojectiles){
    pr.t+=dt;
    if(pr.lob){ pr.vy+=pr.gravity*dt; }
    pr.x+=pr.vx*dt; pr.y+=pr.vy*dt; pr.life-=dt;
    for(const p of G.players){
      if(!p.alive||p.invuln>0||pr.dead)continue;
      if(dist(pr.x,pr.y,p.x,p.y)<pr.r+p.r){ hurtPlayer(p,pr.dmg,null); pr.dead=true; break; }
    }
    if(pr.lob&&pr.y>WORLD_H-40){ pr.dead=true; spawnParticles(pr.x,WORLD_H-40,pr.color,8,120,0.4,4); }
  }
  G.eprojectiles=G.eprojectiles.filter(p=>!p.dead&&p.life>0);
}

function updatePickups(dt){
  for(const pk of G.pickups){
    pk.t+=dt; pk.life-=dt;
    // 磁吸到最近玩家
    let best=null,bd=1e9;
    for(const p of G.players){if(!p.alive)continue;const d=dist(pk.x,pk.y,p.x,p.y);if(d<bd){bd=d;best=p;}}
    if(best){
      if(bd<130){ // 磁吸: 越近吸越快(缓入)
        const a=angleTo(pk.x,pk.y,best.x,best.y);
        const pull = 400 + (130-bd)*6;
        pk.vx=Math.cos(a)*pull; pk.vy=Math.sin(a)*pull;
      } else { pk.vx*=0.88; pk.vy*=0.88; } // 初始弹出后减速(惯性)
      pk.x+=pk.vx*dt; pk.y+=pk.vy*dt;
      if(bd<best.r+10){
        pk.dead=true;
        if(pk.kind==='coin'){ const gv=Math.round(pk.val*(best.goldMul||1)); best.gold=(best.gold||0)+gv; playSfx('hit',0.2); spawnFloater(best.x,best.y-24,'+'+gv,'#ffd34d',13); }
        else if(pk.kind==='heart'){ best.hp=Math.min(best.maxHp,best.hp+pk.val); spawnFloater(best.x,best.y-24,'+'+pk.val+'❤','#7ee081',15); }
        else if(pk.kind==='revive'){ best.reviveCoins=(best.reviveCoins||0)+1; spawnFloater(best.x,best.y-24,'复活币!','#5cd4ff',16); }
        else if(pk.kind==='weapon'){ setWeapon(best,pk.val); playSfx('magic',0.5); spawnParticles(best.x,best.y,WEAPONS[pk.val].color,10,120,0.4,4); }
        else if(pk.kind==='gear'){ setGear(best,pk.val); playSfx('magic',0.5); spawnParticles(best.x,best.y,GEARS[pk.val].color,10,120,0.4,4); }
        spawnParticles(best.x,best.y,'#ffd34d',5,80,0.3,3);
      }
    }
  }
  G.pickups=G.pickups.filter(p=>!p.dead&&p.life>0);
}

function updateCamera(dt){
  // 跟随存活玩家中心
  const alive=G.players.filter(p=>p.alive);
  if(!alive.length) return;
  let cx=0,cy=0; for(const p of alive){cx+=p.x;cy+=p.y;} cx/=alive.length;cy/=alive.length;
  const tx=clamp(cx-VIEW_W/2, 0, WORLD_W-VIEW_W);
  const ty=clamp(cy-VIEW_H/2, 0, WORLD_H-VIEW_H);
  G.camX=lerp(G.camX,tx,Math.min(1,dt*4));
  G.camY=lerp(G.camY,ty,Math.min(1,dt*4));
}

function updateParticles(dt){
  for(const pt of G.particles){ pt.life-=dt; if(!pt.slash){pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vx*=0.96;pt.vy*=0.96;} }
  G.particles=G.particles.filter(p=>p.life>0);
  for(const f of G.floaters){ f.life-=dt; f.x+=(f.vx||0)*dt; f.y+=f.vy*dt; f.vy*=0.95; f.vx*=0.9; }
  G.floaters=G.floaters.filter(f=>f.life>0);
}

// ---------- 渲染 ----------
function render(){
  const ctx=G.ctx;
  ctx.fillStyle='#0a0612'; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.save();
  // 屏幕震动
  if(G.shake>0){ ctx.translate(rand(-G.shake,G.shake), rand(-G.shake,G.shake)); }
  ctx.translate(-G.camX,-G.camY);

  // 背景
  drawBackground(ctx);

  // 拾取物
  for(const pk of G.pickups) drawPickup(ctx,pk);
  // 道具与陷阱(场景层)
  for(const pr of G.props) drawProp(ctx,pr);
  for(const tr of G.traps) drawTrap(ctx,tr);
  // 随从
  for(const m of G.minions) if(m.alive) drawMinion(ctx,m);
  // 冲刺残影(玩家之前)
  for(const gh of G.dashGhosts){ ctx.save(); ctx.globalAlpha=gh.life/gh.maxLife*0.35; ctx.fillStyle=gh.color;
    ctx.beginPath(); ctx.arc(gh.x,gh.y-8,14,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  // 敌人(按y排序)
  const sorted=[...G.enemies].sort((a,b)=>a.y-b.y);
  for(const e of sorted) drawEnemy(ctx,e);
  // 玩家
  for(const p of G.players) drawPlayer(ctx,p);
  // 弹道
  for(const pr of G.projectiles) drawProjectile(ctx,pr);
  for(const pr of G.eprojectiles) drawEProjectile(ctx,pr);
  // 传送门
  if(G.portal) drawPortal(ctx,G.portal);
  // 粒子
  for(const pt of G.particles) drawParticle(ctx,pt);
  // 飘字
  for(const f of G.floaters) drawFloater(ctx,f);

  ctx.restore();

  // 暗角滤镜
  drawVignette(ctx);
  // 全屏闪光(叠在暗角之上, 淡出)
  if(G.flash>0){ ctx.globalAlpha=Math.min(1,G.flash); ctx.fillStyle=G.flashColor; ctx.fillRect(0,0,VIEW_W,VIEW_H); ctx.globalAlpha=1; }
  // HUD
  drawHUD(ctx);
}

function drawBackground(ctx){
  const img=G.imgs['level'+G.level];
  if(img){ ctx.drawImage(img, 0,0, WORLD_W, WORLD_H); }
  else { ctx.fillStyle=LEVEL_DEFS[G.level].tint; ctx.fillRect(0,0,WORLD_W,WORLD_H); }
  // 色调雾
  ctx.fillStyle=LEVEL_DEFS[G.level].fog; ctx.fillRect(0,0,WORLD_W,WORLD_H);
  // 世界边界
  ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=8; ctx.strokeRect(0,0,WORLD_W,WORLD_H);
}

function drawShadow(ctx,x,y,r){
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x,y+r*0.8,r*0.9,r*0.35,0,0,Math.PI*2); ctx.fill();
}

function drawPlayer(ctx,p){
  if(!p.alive){ // 尸体标记
    ctx.globalAlpha=0.4; ctx.fillStyle='#555';
    ctx.beginPath();ctx.arc(p.x,p.y,14,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle='#fff';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('✝',p.x,p.y+4);
    return;
  }
  drawShadow(ctx,p.x,p.y,p.r);
  const blink = p.invuln>0 && (G.time*20|0)%2===0;
  ctx.save();
  if(blink) ctx.globalAlpha=0.4;
  ctx.translate(p.x,p.y);
  // 受击压扁回弹
  let psq=1; if(p.hurtT>0){ psq=1+Math.sin(p.hurtT/0.2*Math.PI)*0.2; }
  // 待机呼吸(轻微起伏)
  let breathe=1; if(p.state==='idle'){ breathe=1+Math.sin(p.animT*3)*0.03; }
  ctx.scale(p.face*psq*breathe,(1/psq)*breathe);

  const t=p.def;
  if(t.sheet==='chars'){
    const img=G.imgs.chars;
    if(img){ const bob=p.state==='run'?Math.sin(p.walkT*14)*1.5:0;
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(img, t.col*16, t.row*16, 16,16, -p.r,-p.r*1.3+bob, p.r*2,p.r*2); }
  } else { // priest 逐帧
    const frame=((p.animT*6)|0)%4+1;
    const img=G.imgs[`priest_${t.variant}_${frame}`];
    if(img){ const bob=p.state==='run'?Math.sin(p.walkT*14)*1.5:0;
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(img, -p.r,-p.r*1.3+bob, p.r*2,p.r*2); }
  }
  ctx.restore();

  // 描边光圈(区分P1P2)
  ctx.strokeStyle=p.slot===0?'#5cd4ff':'#ffb34d'; ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(p.x,p.y+p.r*0.8,p.r*0.6,0,Math.PI);ctx.stroke();

  // 骑士减伤护盾(旋风斩后3秒)
  if(p.guardT>0){ ctx.save(); ctx.globalAlpha=0.35+Math.sin(G.time*10)*0.12;
    ctx.strokeStyle='#5cd4ff'; ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(p.x,p.y-p.r*0.3,p.r*1.5,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=0.12; ctx.fillStyle='#5cd4ff';
    ctx.beginPath();ctx.arc(p.x,p.y-p.r*0.3,p.r*1.5,0,Math.PI*2);ctx.fill(); ctx.restore(); }
  // 盗贼暗影状态(刀刀暴击4秒): 紫黑残影环绕
  if(p.shadowT>0){ ctx.save(); ctx.globalAlpha=0.4+Math.sin(G.time*14)*0.15;
    ctx.strokeStyle='#b06ce0'; ctx.lineWidth=2.5; ctx.setLineDash([6,6]);
    ctx.beginPath();ctx.arc(p.x,p.y-p.r*0.3,p.r*1.4,G.time*3,G.time*3+Math.PI*2);ctx.stroke();
    ctx.restore(); }

  // 技能冷却指示(饼图+剩余秒数)
  if(p.skillCd>0){ const cdBase=p.skillCdMax||p.skillMax;
    ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.arc(p.x,p.y-p.r-14,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#5cd4ff';ctx.beginPath();ctx.arc(p.x,p.y-p.r-14,6,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-p.skillCd/cdBase));ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.strokeStyle='rgba(0,0,0,0.8)'; ctx.lineWidth=2.5;
    const cdTxt=p.skillCd.toFixed(1);
    ctx.strokeText(cdTxt,p.x,p.y-p.r-24); ctx.fillText(cdTxt,p.x,p.y-p.r-24); }
  // 血条
  drawBar(ctx,p.x-p.r,p.y-p.r-10,p.r*2,4,p.hp/p.maxHp,'#7ee081');
}

// 绘制敌人精灵帧(含 faceLeft 翻转修正)
function drawEnemySprite(ctx,e){
  const t=e.def;
  const sm=e.scaleMul||1;
  ctx.imageSmoothingEnabled=false;
  if(t.sheet){
    const img=G.imgs['ene_'+e.type];
    if(img){
      const nf=Math.max(1,Math.round(img.width/t.fw));
      const f=((e.animT*8)|0)%nf;
      const w=e.r*2.4, h=e.r*2.4*(t.fh/t.fw);
      ctx.drawImage(img, f*t.fw,0,t.fw,t.fh, -w/2,-h*0.75, w,h);
    }
  } else if(t.frames){
    const f=((e.animT*6)|0)%t.nframes+1;
    const img=G.imgs[`ene_${e.type}_${f}`];
    if(img){ ctx.drawImage(img,-e.r*1.3*sm,-e.r*1.5*sm,e.r*2.6*sm,e.r*2.6*sm); }
  }
}

function drawEnemy(ctx,e){
  const t=e.def;
  const flip = t.faceLeft? -1:1; // 素材默认朝左的怪, 翻转基准取反

  // ---- 死亡消散: 压扁 + 淡出 + 微下沉, 不再残留圆圈 ----
  if(!e.alive){
    const k=clamp(e.deathT/DEATH_ANIM_DUR,0,1);
    const alpha=1-k;
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.translate(e.x, e.y + k*e.r*0.35);
    ctx.scale(e.face*flip*(1+k*0.7), Math.max(0.05,(1-k*0.85)));
    drawEnemySprite(ctx,e);
    ctx.restore();
    // 消散碎屑
    if(k>0.15 && Math.random()<0.35)
      G.particles.push({x:e.x+rand(-e.r,e.r), y:e.y-rand(0,e.r), vx:rand(-24,24), vy:rand(-60,-16), life:0.35, maxLife:0.35, color:'#cfc4e8', size:rand(2,4)});
    return;
  }

  const alpha = e.aiState==='windup'? 0.7 : (t.ai==='stealth'? (1-(e.stealth||0)) : 1);
  ctx.save();
  ctx.globalAlpha=alpha;
  drawShadow(ctx,e.x,e.y,e.r);
  const flash=e.hitT>0;
  ctx.translate(e.x,e.y);
  // 出生弹出(回弹缩放)
  let born=1; if(e.spawnT>0){ const tt=1-e.spawnT/0.35; born=tt<0.7? tt/0.7*1.15 : 1.15-(tt-0.7)/0.3*0.15; }
  // 受击压扁回弹(暴击更明显)
  let sq=1;
  if(e.critT>0){ e.critT-=0.016; sq=1+Math.sin(e.critT/0.18*Math.PI)*0.25; }
  else if(e.hitT>0){ sq=1+Math.sin(e.hitT/0.12*Math.PI)*0.12; }
  ctx.scale(e.face*flip*sq*born, (1/sq)*born);
  drawEnemySprite(ctx,e);
  if(flash){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=alpha*0.55; ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(0,-e.r*0.5,e.r*0.8,0,Math.PI*2);ctx.fill(); ctx.globalCompositeOperation='source-over'; }
  ctx.restore();

  // 濒死红闪(<25%血, 越死闪越快)
  if(e.alive && e.hp<e.maxHp*0.25 && (G.time*8|0)%2===0){
    ctx.globalAlpha=0.3; ctx.fillStyle='#ff3b3b';
    ctx.beginPath();ctx.arc(e.x,e.y-e.r*0.4,e.r*0.9,0,Math.PI*2);ctx.fill(); ctx.globalAlpha=1;
  }

  // 血条(Boss 大血条)
  if(e.isBoss){ drawBar(ctx,e.x-e.r,e.y-e.r-16,e.r*2,7,e.hp/e.maxHp,'#ff5c5c'); }
  else if(e.hp<e.maxHp){ drawBar(ctx,e.x-e.r,e.y-e.r-8,e.r*2,3,e.hp/e.maxHp,'#ff8a5c'); }
  // windup 警示
  if(e.aiState==='windup'){ ctx.strokeStyle='rgba(255,80,80,0.8)';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(e.x,e.y,e.r+6+Math.sin(G.time*20)*3,0,Math.PI*2);ctx.stroke(); }
}

function drawMinion(ctx,m){
  drawShadow(ctx,m.x,m.y,m.r);
  const f=((m.animT*6)|0)%4+1;
  const img=G.imgs[`ene_skeleton_${f}`];
  ctx.imageSmoothingEnabled=false;
  if(img) ctx.drawImage(img,m.x-m.r,m.y-m.r*1.3,m.r*2,m.r*2);
}

function drawProjectile(ctx,pr){
  ctx.save();
  const a=Math.atan2(pr.vy,pr.vx);
  // 拖尾(速度方向的渐隐残影)
  ctx.strokeStyle=pr.color; ctx.globalAlpha=0.35; ctx.lineWidth=pr.r*0.9; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(pr.x-Math.cos(a)*pr.r*2.4, pr.y-Math.sin(a)*pr.r*2.4); ctx.lineTo(pr.x,pr.y); ctx.stroke();
  ctx.globalAlpha=1;
  ctx.fillStyle=pr.color; ctx.shadowColor=pr.color; ctx.shadowBlur=10;
  ctx.translate(pr.x,pr.y); ctx.rotate(a);
  if(pr.kind==='bow'){ ctx.fillRect(-10,-2,20,4); ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(4,-4);ctx.lineTo(4,4);ctx.fill(); }
  else { ctx.beginPath();ctx.arc(0,0,pr.r,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.beginPath();ctx.arc(0,0,pr.r*0.45,0,Math.PI*2);ctx.fill(); }
  ctx.restore();
}
function drawEProjectile(ctx,pr){
  ctx.save(); ctx.fillStyle=pr.color; ctx.shadowColor=pr.color; ctx.shadowBlur=10;
  ctx.beginPath();ctx.arc(pr.x,pr.y,pr.r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(pr.x,pr.y,pr.r*0.4,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawPickup(ctx,pk){
  const bob=Math.sin(pk.t*5)*3;
  if(pk.kind==='coin'){ const img=G.imgs.coin;
    if(img){ctx.drawImage(img,pk.x-10,pk.y-10+bob,20,20);} else {ctx.fillStyle='#ffd34d';ctx.beginPath();ctx.arc(pk.x,pk.y+bob,7,0,Math.PI*2);ctx.fill();}
  } else if(pk.kind==='heart'){ ctx.fillStyle='#ff5c8a';ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText('❤',pk.x,pk.y+bob+6); }
  else if(pk.kind==='revive'){ ctx.fillStyle='#5cd4ff';ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText('✚',pk.x,pk.y+bob+6); }
  else if(pk.kind==='weapon'){ const w=WEAPONS[pk.val];
    ctx.fillStyle=w.color;ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText(w.icon,pk.x,pk.y+bob+6);
    if(pk.t<3){ ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.fillText(w.name,pk.x,pk.y+bob+26); }
  } else if(pk.kind==='gear'){ const g=GEARS[pk.val];
    ctx.fillStyle=g.color;ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText(g.icon,pk.x,pk.y+bob+6);
    if(pk.t<3){ ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.fillText(g.name,pk.x,pk.y+bob+26); }
  }
}
function drawPortal(ctx,po){
  const r=50+Math.sin(po.t*4)*8;
  ctx.save(); ctx.translate(po.x,po.y); ctx.rotate(po.t*2);
  const g=ctx.createRadialGradient(0,0,0,0,0,r);
  g.addColorStop(0,'#fff'); g.addColorStop(0.5,'#b06ce0'); g.addColorStop(1,'rgba(106,74,154,0)');
  ctx.fillStyle=g; ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill(); ctx.restore();
  ctx.fillStyle='#fff';ctx.font='bold 16px sans-serif';ctx.textAlign='center';
  ctx.fillText('传 送 门',po.x,po.y-r-10);
}
function drawParticle(ctx,pt){
  const a=pt.life/pt.maxLife;
  if(pt.shock){ // 冲击波扩散环
    ctx.save();ctx.globalAlpha=a*0.8;ctx.strokeStyle=pt.color;ctx.lineWidth=6*a;
    const r=lerp(pt.maxR,10,pt.life/pt.maxLife);
    ctx.beginPath();ctx.arc(pt.x,pt.y,r,0,Math.PI*2);ctx.stroke();ctx.restore();return; }
  if(pt.slash){ ctx.save();ctx.globalAlpha=a;ctx.translate(pt.x,pt.y);ctx.rotate(pt.ang);
    ctx.strokeStyle=pt.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,pt.range*0.7,-0.9,0.9);ctx.stroke();ctx.restore();return; }
  ctx.globalAlpha=a; ctx.fillStyle=pt.color;
  ctx.fillRect(pt.x-pt.size/2,pt.y-pt.size/2,pt.size,pt.size); ctx.globalAlpha=1;
}
function drawFloater(ctx,f){
  ctx.globalAlpha=Math.min(1,f.life*2); ctx.fillStyle=f.color;
  ctx.font=`bold ${f.size}px 'Press Start 2P', monospace`; ctx.textAlign='center';
  ctx.strokeStyle='rgba(0,0,0,0.8)';ctx.lineWidth=3;ctx.strokeText(f.text,f.x,f.y);
  ctx.fillText(f.text,f.x,f.y); ctx.globalAlpha=1;
}
function drawBar(ctx,x,y,w,h,frac,color){
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(x-1,y-1,w+2,h+2);
  ctx.fillStyle=color;ctx.fillRect(x,y,w*clamp(frac,0,1),h);
}
function drawVignette(ctx){
  const g=ctx.createRadialGradient(VIEW_W/2,VIEW_H/2,VIEW_H*0.4,VIEW_W/2,VIEW_H/2,VIEW_H*0.85);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle=g;ctx.fillRect(0,0,VIEW_W,VIEW_H);
}

// ========== 环境道具(可打碎) ==========
function spawnProps(){
  G.props=[];
  const lvl=G.level;
  // 每关随机摆南瓜灯/蜡烛(万圣节关卡更多)
  const n = lvl===4? 10 : 5;
  for(let i=0;i<n;i++){
    const kind = (lvl===4||Math.random()<0.5)?'jack':'candle';
    const x=rand(120,WORLD_W-120), y=rand(120,WORLD_H-120);
    G.props.push({kind,x,y,r:20,hp:1,alive:true,frame:irand(1,8),t:rand(0,2)});
  }
}
function updateProps(dt){
  for(const pr of G.props){ if(pr.alive) pr.t+=dt; }
  G.props=G.props.filter(p=>p.alive);
}
function breakProp(pr){
  pr.alive=false;
  playSfx('hit',0.4);
  spawnParticles(pr.x,pr.y, pr.kind==='jack'?'#ff9540':'#ffe95c', 10, 120, 0.4, 4);
  // 掉落
  const r=Math.random();
  if(r<0.4) G.pickups.push({x:pr.x,y:pr.y,vx:0,vy:0,kind:'coin',val:irand(3,8),life:20,t:0});
  else if(r<0.55) G.pickups.push({x:pr.x,y:pr.y,vx:0,vy:0,kind:'heart',val:15,life:20,t:0});
  else if(r<0.62) G.pickups.push({x:pr.x,y:pr.y,vx:0,vy:0,kind:'revive',val:1,life:25,t:0});
  else if(r<0.62) G.pickups.push({x:pr.x,y:pr.y,vx:0,vy:0,kind:'weapon',val:SHOP_SELLABLE[irand(0,SHOP_SELLABLE.length-1)],life:30,t:0});
  else if(r<0.68) G.pickups.push({x:pr.x,y:pr.y,vx:0,vy:0,kind:'gear',val:GEAR_SELLABLE[irand(0,GEAR_SELLABLE.length-1)],life:30,t:0});
}
// 玩家近战/弹道可打碎道具 — 在近战与弹道命中检测里调用
function tryBreakProps(x,y,rad){
  for(const pr of G.props){ if(pr.alive && dist(x,y,pr.x,pr.y)<rad+pr.r) breakProp(pr); }
}

// ========== 陷阱 ==========
function spawnTraps(){
  G.traps=[];
  const n = 2+G.level; // 越往后越多
  for(let i=0;i<n;i++){
    G.traps.push({x:rand(200,WORLD_W-200),y:rand(200,WORLD_H-200),r:26,t:rand(0,2),cd:0,dmg:14+G.level*4,active:false});
  }
}
function updateTraps(dt){
  for(const tr of G.traps){
    tr.t+=dt; if(tr.cd>0)tr.cd-=dt;
    tr.active = (tr.t%2.5)<0.6; // 周期性弹出尖刺
    if(tr.active && tr.cd<=0){
      for(const p of G.players){ if(p.alive&&p.invuln<=0&&dist(p.x,p.y,tr.x,tr.y)<tr.r){ hurtPlayer(p,tr.dmg,null); tr.cd=0.5; } }
    }
  }
}

// ========== 复活救援 ==========
function updateRevive(dt){
  if(G.players.length<2){ G.reviveProgress=0; return; }
  const dead=G.players.find(p=>!p.alive);
  if(!dead){ G.reviveProgress=0; return; }
  const saver=G.players.find(p=>p.alive);
  if(!saver) return;
  const near = dist(saver.x,saver.y,dead.x,dead.y)<70;
  const hasCoin = (saver.reviveCoins||0)+(G.reviveCoins||0) > 0;
  if(near && hasCoin){
    G.reviveProgress+=dt;
    if(G.reviveProgress>=2){ // 2秒救起
      // 消耗一个复活币
      if(saver.reviveCoins>0) saver.reviveCoins--; else G.reviveCoins--;
      dead.alive=true; dead.hp=Math.round(dead.maxHp*0.5); dead.invuln=2;
      G.reviveProgress=0;
      playSfx('magic',0.8); addShake(6,0.2);
      spawnFloater(dead.x,dead.y-40,'复活!','#5cd4ff',30);
      spawnParticles(dead.x,dead.y,'#5cd4ff',24,200,0.7,4);
    }
  } else { G.reviveProgress=Math.max(0,G.reviveProgress-dt*2); }
}

// ========== 慢镜头 & 连击已在 update 集成 ==========

// ========== 道具/陷阱 渲染 ==========
function drawProp(ctx,pr){
  drawShadow(ctx,pr.x,pr.y,pr.r);
  const bob=Math.sin(pr.t*3)*1;
  ctx.imageSmoothingEnabled=false;
  const img=G.imgs[pr.kind+'_'+pr.frame];
  if(img){ const s=pr.r*2.4; ctx.drawImage(img, pr.x-s/2, pr.y-s*0.7+bob, s, s); }
  // 发光
  ctx.save(); ctx.globalAlpha=0.25+Math.sin(pr.t*4)*0.1;
  ctx.fillStyle=pr.kind==='jack'?'#ff9540':'#ffe95c';
  ctx.beginPath();ctx.arc(pr.x,pr.y-pr.r*0.3,pr.r*0.9,0,Math.PI*2);ctx.fill(); ctx.restore();
}
function drawTrap(ctx,tr){
  // 地刺陷阱底座
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.beginPath();ctx.arc(tr.x,tr.y,tr.r,0,Math.PI*2);ctx.fill();
  const phase=tr.t%2.5;
  // 预警: 即将弹出前0.5s红圈脉冲
  if(!tr.active && phase>2.0){
    const w=(phase-2.0)/0.5;
    ctx.strokeStyle=`rgba(255,80,80,${0.3+w*0.5})`; ctx.lineWidth=2+w*2;
    ctx.beginPath();ctx.arc(tr.x,tr.y,tr.r*(0.7+w*0.3),0,Math.PI*2);ctx.stroke();
  } else {
    ctx.strokeStyle='rgba(150,150,170,0.5)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(tr.x,tr.y,tr.r,0,Math.PI*2);ctx.stroke();
  }
  // 弹出尖刺
  if(tr.active){
    ctx.fillStyle='#e8ecf5';
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2;
      const sx=tr.x+Math.cos(a)*tr.r*0.5, sy=tr.y+Math.sin(a)*tr.r*0.5;
      ctx.beginPath();ctx.moveTo(sx-5,sy);ctx.lineTo(sx+5,sy);ctx.lineTo(sx,sy-14);ctx.fill(); }
  }
}

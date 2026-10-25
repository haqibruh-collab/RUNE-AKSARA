const WORD_LISTS = {
  1: ["aku","ada","air","apa","ayam","baju","batu","buku","cari","coba","dada","data","emas","gaji","gigi","hari","jaga","jala","jual","kaca","kaki","kata","kuda","laba","lagu","laut","lima","luka","mata","meja","muka","nada","nasi","obat","pagi","peta","rasa","roda","satu","sapi","tali","tiga","ular"],
  2: ["rumah","pintu","warna","bunga","cerita","sayang","musim","pantai","gunung","sungai","hutan","sawah","ladang","petani","pasar","dagang","rakyat","negeri","bangsa","budaya","agama","sekolah","keluarga","teman","bahasa","cerdas","rajin","sehat","sabar","jujur","ramah"],
  3: ["masalah","keadaan","kegiatan","penting","kejadian","kekuatan","kemajuan","kesulitan","kekayaan","perasaan","pemikiran","kesenian","keamanan","kesadaran","kepastian","kebenaran","kejujuran","kepribadian","kesehatan","pekerjaan","kehidupan","kebiasaan"],
  4: ["teknologi","informasi","komunikasi","transportasi","infrastruktur","administrasi","organisasi","internasional","konstitusi","demokrasi","psikologi","fotosintesis","karbohidrat","globalisasi","modernisasi","konsolidasi","integritas","akuntabilitas","sistematis","komprehensif"],
  5: [
    "waktu adalah emas","kerja keras membuahkan hasil","tak kenal maka tak sayang",
    "sedia payung sebelum hujan","berakit rakit ke hulu","bersatu kita teguh",
    "sekali merengkuh dayung","hemat pangkal kaya","rajin pangkal pandai","malu bertanya sesat di jalan"
  ]
};
const SHORT_WORDS = ["aku","ada","air","apa","ayam","baju","batu","cari","data","dada","emas","gaji","gigi","hari","jaga","jala","jual","kaca","kaki","kata","kuda","laba","lagu","laut","lima","luka","mata","meja","muka","nada","nasi","obat","pagi","peta","rasa","roda","satu","sapi","tali","tiga","ular"];

const LEVEL_CONFIG = {
  1:{ name:"Sangat Mudah", enemiesToClear:8,  spawnMin:2.2, spawnMax:3.2, speedMin:26, speedMax:38,  damage:8,  maxOnScreen:2 },
  2:{ name:"Mudah",        enemiesToClear:10, spawnMin:1.8, spawnMax:2.6, speedMin:38, speedMax:55,  damage:10, maxOnScreen:2 },
  3:{ name:"Sedang",       enemiesToClear:10, spawnMin:1.4, spawnMax:2.1, speedMin:55, speedMax:75,  damage:12, maxOnScreen:3 },
  4:{ name:"Sulit",        enemiesToClear:12, spawnMin:1.1, spawnMax:1.7, speedMin:75, speedMax:105, damage:15, maxOnScreen:3 },
  5:{ name:"Boss Fight" }
};
const BOSS_TOTAL_HP = 1000;
const BOSS_TIME_PER_PHRASE = 7.5;
const EMP_COMBO_STEP = 12;
const EMP_CHARGE_PER_STEP = 28;
const EMP_MAX = 100;
const FREEZE_DURATION = 3.5;

const HS_KEY = "runeAksaraHighScores";
function loadHighScores(){ try{ return JSON.parse(localStorage.getItem(HS_KEY)) || {}; }catch(e){ return {}; } }
function saveHighScore(key, s){
  const scores = loadHighScores();
  if(!scores[key] || s > scores[key]){ scores[key] = s; localStorage.setItem(HS_KEY, JSON.stringify(scores)); }
  return scores[key] || s;
}
function getHighScore(key){ return loadHighScores()[key] || 0; }

const AudioEngine = (() => {
  let ctx = null;
  let volume = parseFloat(localStorage.getItem('runeAksaraVolume'));
  if(isNaN(volume)) volume = 0.8;
  function ensure(){ if(!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)(); return ctx; }
  function beep(freq, dur, type="sine", gain=0.08){
    if(volume<=0) return;
    const c = ensure();
    const osc = c.createOscillator(); const g = c.createGain();
    osc.type = type; osc.frequency.value = freq; g.gain.value = gain*volume;
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(g); g.connect(c.destination); osc.start(); osc.stop(c.currentTime + dur);
  }
  function noiseBurst(dur, gain=0.1){
    if(volume<=0) return;
    const c = ensure();
    const bufferSize = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
    const src = c.createBufferSource(); src.buffer = buffer;
    const g = c.createGain(); g.gain.value = gain*volume;
    src.connect(g); g.connect(c.destination); src.start();
  }
  return {
    typeCorrect(comboLevel){
      const jitter = (Math.random()-0.5)*26;
      const wave = Math.random()<0.15 ? "triangle" : "square";
      beep(440 + Math.min(comboLevel,20)*12 + jitter, 0.06, wave, 0.05);
    },
    typeWrong(){
      const jitter = (Math.random()-0.5)*40;
      const wave = Math.random()<0.5 ? "sawtooth" : "square";
      beep(150 + jitter, 0.12, wave, 0.07);
    },
    shoot(){ beep(900 + (Math.random()-0.5)*80, 0.05, "sawtooth", 0.04); },
    explode(){ noiseBurst(0.18, 0.12); beep(180,0.15,"sine",0.08); },
    armorBreak(){ beep(320,0.08,"square",0.06); },
    freeze(){ beep(700,0.2,"sine",0.07); setTimeout(()=>beep(500,0.25,"sine",0.06),100); },
    empBurst(){ noiseBurst(0.3,0.14); [200,500,900].forEach((f,i)=>setTimeout(()=>beep(f,0.2,"triangle",0.09), i*60)); },
    finisher(){ noiseBurst(0.35,0.16); [300,600,900,1300].forEach((f,i)=>setTimeout(()=>beep(f,0.18,"triangle",0.1), i*70)); },
    victory(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,0.25,"triangle",0.08), i*120)); },
    gameover(){ [400,300,220,150].forEach((f,i)=>setTimeout(()=>beep(f,0.3,"sawtooth",0.08), i*140)); },
    setVolume(v){ volume = v; localStorage.setItem('runeAksaraVolume', v); },
    getVolume(){ return volume; },
    unlock(){
      const c = ensure();
      if(c.state === 'suspended'){ c.resume(); }
    }
  };
})();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const PLAYER_X = 90, PLAYER_Y = H/2;

// =========================================================
// RESPONSIVITAS MOBILE: sesuaikan ukuran stage terhadap
// visualViewport (bagian layar yang tidak tertutup keyboard virtual)
// =========================================================
function fitStage(){
  const vv = window.visualViewport;
  const availW = vv ? vv.width : window.innerWidth;
  const availH = vv ? vv.height : window.innerHeight;
  const app = document.getElementById('app');
  app.style.height = availH + 'px';

  const stageEl = document.getElementById('stage');
  const aspect = 900/520;
  let w = Math.min(availW*0.96, 900);
  let h = w/aspect;
  const maxH = availH*0.96;
  if(h > maxH){ h = maxH; w = h*aspect; }
  stageEl.style.width = w + 'px';
  stageEl.style.height = h + 'px';

  // Skala HUD/menu proporsional terhadap ukuran stage sebenarnya (referensi 900px),
  // dibatasi agar teks tidak jadi terlalu kecil atau terlalu besar di kasus ekstrem.
  const scale = Math.min(1.15, Math.max(0.6, w/900));
  document.documentElement.style.setProperty('--ui-scale', scale.toFixed(3));
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', fitStage);
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', fitStage);
  window.visualViewport.addEventListener('scroll', fitStage);
}
fitStage();

let state = "LOBBY";
let stateBeforePause = "PLAYING";
let currentLevel = 1;
let isEndless = false;
let enemies = [];
let particles = [];
let lightnings = [];
let rings = [];
let empShockwave = null;
let currentTarget = null;
let spawnTimer = 0, nextSpawn = 1;
let enemiesSpawned = 0, enemiesCleared = 0;
let playerHealth = 100, playerMaxHealth = 100;
let score = 0, combo = 0, maxCombo = 0;
let totalCorrect = 0, totalTyped = 0, wordsCompleted = 0;
let sessionStart = 0;
let shakeTime = 0, shakeStrength = 0;
let boss = null;
let clock = 0;
let empCharge = 0;
let freezeTimer = 0;
let lastKillPos = null;
let lastKillTime = -999;
const CHAIN_WINDOW = 0.6; // jendela waktu (detik) agar dua kill berturut-turut dianggap "chain"
let pillars = [];
const COMBO_FINISHER_THRESHOLD = 50;
function isSurvivalMode(){ return isEndless; }

// =========================================================
// LATAR LUAR ANGKASA
// =========================================================
const stars = [];
for(let i=0;i<140;i++){
  stars.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.6+0.3, speed: 15+Math.random()*55, tw: Math.random()*Math.PI*2 });
}
const nebulaBlobs = [
  {x:W*0.15, y:H*0.2, r:220, color:"rgba(255,62,154,0.10)"},
  {x:W*0.8,  y:H*0.75, r:260, color:"rgba(53,240,208,0.08)"},
  {x:W*0.55, y:H*0.15, r:180, color:"rgba(124,77,255,0.10)"}
];

function makeRockShape(points=9){
  const shape = [];
  for(let i=0;i<points;i++) shape.push(0.72 + Math.random()*0.5);
  return shape;
}
function drawRock(x,y,radius,shape,fillColor,strokeColor,rotation=0){
  ctx.save(); ctx.translate(x,y); ctx.rotate(rotation);
  ctx.beginPath();
  for(let i=0;i<shape.length;i++){
    const ang = (i/shape.length)*Math.PI*2;
    const r = radius*shape[i];
    const px = Math.cos(ang)*r, py = Math.sin(ang)*r;
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath(); ctx.fillStyle = fillColor; ctx.fill();
  ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

const idleAsteroids = [];
for(let i=0;i<4;i++){
  idleAsteroids.push({ x: Math.random()*W, y: 60+Math.random()*(H-120), radius: 14+Math.random()*16, speed: 10+Math.random()*20, shape: makeRockShape(8), rot: Math.random()*Math.PI*2, rotSpeed:(Math.random()-0.5)*0.4 });
}

function updateBackground(dt){
  clock += dt;
  for(const s of stars){ s.x -= s.speed*dt; if(s.x < 0){ s.x = W; s.y = Math.random()*H; } }
  for(const a of idleAsteroids){ a.x -= a.speed*dt; a.rot += a.rotSpeed*dt; if(a.x < -40){ a.x = W+40; a.y = 60+Math.random()*(H-120); } }
}

function drawBackground(){
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0, "#0A0620"); grad.addColorStop(1, "#05040C");
  ctx.fillStyle = grad; ctx.fillRect(-20,-20,W+40,H+40);
  for(const n of nebulaBlobs){
    const rg = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);
    rg.addColorStop(0, n.color); rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
  }
  for(const s of stars){
    const a = 0.5 + Math.sin(clock*2 + s.tw)*0.4;
    ctx.globalAlpha = Math.max(a,0.15); ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
  }
}

function drawLobbyPlanet(){
  const px = W*0.74, py = H*1.18, pr = W*0.60;
  const glow = ctx.createRadialGradient(px, py-pr*0.99, 0, px, py-pr*0.99, pr*0.45);
  glow.addColorStop(0, "rgba(255,225,175,0.9)");
  glow.addColorStop(1, "rgba(255,225,175,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(px, py-pr, pr*0.45, 0, Math.PI*2); ctx.fill();

  const body = ctx.createLinearGradient(px-pr, py-pr, px+pr, py);
  body.addColorStop(0, "#2A1A0C"); body.addColorStop(0.42, "#6E4520");
  body.addColorStop(0.6, "#D9903F"); body.addColorStop(1, "#150D06");
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI*2); ctx.fill();

  ctx.strokeStyle = "rgba(255,220,170,0.55)"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(px, py, pr, Math.PI*1.14, Math.PI*1.86); ctx.stroke();
}

function drawIdleScene(){
  for(const a of idleAsteroids){ drawRock(a.x, a.y, a.radius, a.shape, "rgba(124,110,150,0.5)", "rgba(80,70,110,0.6)", a.rot); }
  drawShip(PLAYER_X, PLAYER_Y + Math.sin(clock*1.6)*6, false);
}

function drawShip(x, y, thrustBoost){
  const flameLen = (thrustBoost? 22:12) + Math.sin(clock*22)*4;
  ctx.fillStyle = "rgba(255,150,50,0.9)";
  ctx.beginPath(); ctx.moveTo(x-16,y-6); ctx.lineTo(x-16-flameLen,y); ctx.lineTo(x-16,y+6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#8C81AC";
  ctx.beginPath(); ctx.moveTo(x-4,y-16); ctx.lineTo(x-14,y-4); ctx.lineTo(x-4,y-2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-4,y+16); ctx.lineTo(x-14,y+4); ctx.lineTo(x-4,y+2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#35F0D0";
  ctx.beginPath(); ctx.moveTo(x-16,y-11); ctx.lineTo(x+26,y); ctx.lineTo(x-16,y+11); ctx.lineTo(x-6,y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#EAFBFF"; ctx.beginPath(); ctx.arc(x+7,y,4,0,Math.PI*2); ctx.fill();
}

// =========================================================
// LOCK-ON RETICLE
// =========================================================
function drawLockOn(x,y,radius){
  const pulse = 1+Math.sin(clock*8)*0.08;
  const R = (radius+10)*pulse;
  ctx.save(); ctx.translate(x,y); ctx.rotate(clock*1.4);
  ctx.strokeStyle = "#35F0D0"; ctx.lineWidth = 2; ctx.setLineDash([6,6]);
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(-(R+9),0); ctx.lineTo(-(R-1),0);
  ctx.moveTo((R-1),0); ctx.lineTo((R+9),0);
  ctx.moveTo(0,-(R+9)); ctx.lineTo(0,-(R-1));
  ctx.moveTo(0,(R-1)); ctx.lineTo(0,(R+9));
  ctx.stroke();
  ctx.restore();
}

// =========================================================
// LEVEL / ENDLESS STATE
// =========================================================
function resetForLevel(level){
  isEndless = false; currentLevel = level; enemies = []; particles = []; lightnings = []; rings = []; pillars = []; empShockwave = null;
  currentTarget = null; spawnTimer = 0; nextSpawn = 0.8;
  enemiesSpawned = 0; enemiesCleared = 0;
  playerHealth = 100; score = 0; combo = 0; maxCombo = 0;
  totalCorrect = 0; totalTyped = 0; wordsCompleted = 0;
  sessionStart = performance.now(); boss = null; empCharge = 0; freezeTimer = 0;
  lastKillPos = null; lastKillTime = -999;

  document.getElementById('bossWrap').style.display = level === 5 ? 'block' : 'none';
  document.getElementById('empWrap').style.display = 'none';
  document.getElementById('empLabel').style.display = 'none';
  document.getElementById('levelLabel').textContent = "Level " + level + " — " + LEVEL_CONFIG[level].name;
  document.getElementById('healthFill').style.width = "100%";
  document.getElementById('healthFill').style.background = "#C8FF4D";
  document.getElementById('vignette').classList.remove('active');

  if(level === 5){ startBoss(); state = "BOSS"; }
  else { state = "PLAYING"; }
}

function resetForEndless(){
  isEndless = true; currentLevel = 0; enemies = []; particles = []; lightnings = []; rings = []; pillars = []; empShockwave = null;
  currentTarget = null; spawnTimer = 0; nextSpawn = 1.2;
  enemiesSpawned = 0; enemiesCleared = 0;
  playerHealth = 100; score = 0; combo = 0; maxCombo = 0;
  totalCorrect = 0; totalTyped = 0; wordsCompleted = 0;
  sessionStart = performance.now(); boss = null; empCharge = 0; freezeTimer = 0;
  lastKillPos = null; lastKillTime = -999;

  document.getElementById('bossWrap').style.display = 'none';
  document.getElementById('empWrap').style.display = 'block';
  document.getElementById('empLabel').style.display = 'block';
  document.getElementById('empFill').style.width = '0%';
  document.getElementById('levelLabel').textContent = "Mode Bertahan Hidup";
  document.getElementById('healthFill').style.width = "100%";
  document.getElementById('healthFill').style.background = "#C8FF4D";
  document.getElementById('vignette').classList.remove('active');
  state = "ENDLESS";
}

function endlessElapsed(){ return (performance.now()-sessionStart)/1000; }
function endlessWordPool(){
  const t = endlessElapsed();
  if(t < 20) return WORD_LISTS[1];
  if(t < 45) return WORD_LISTS[1].concat(WORD_LISTS[2]);
  if(t < 75) return WORD_LISTS[2].concat(WORD_LISTS[3]);
  if(t < 110) return WORD_LISTS[3].concat(WORD_LISTS[4]);
  return WORD_LISTS[4].concat(WORD_LISTS[5]);
}
function endlessConfig(){
  const t = endlessElapsed();
  return {
    spawnMin: Math.max(0.55, 2.0 - t*0.010),
    spawnMax: Math.max(0.95, 3.0 - t*0.012),
    speedMin: 26 + t*0.55,
    speedMax: 40 + t*0.7,
    damage: 8 + Math.floor(t/40)*2,
    maxOnScreen: Math.min(5, 2+Math.floor(t/30))
  };
}

function pickWord(level){ const pool = WORD_LISTS[level]; return pool[Math.floor(Math.random()*pool.length)]; }
function pickWordFrom(pool){ return pool[Math.floor(Math.random()*pool.length)]; }
function pickShortWord(){ return SHORT_WORDS[Math.floor(Math.random()*SHORT_WORDS.length)]; }
function getCurrentWord(e){ return e.words[e.wordIndex]; }
function toDisplayText(str){ return str.split('').map(c => c===' ' ? '␣' : c).join(''); }

function pickEnemyType(t){
  if(!isEndless || t < 12) return "normal";
  const r = Math.random();
  if(r < 0.14) return "speedster";
  if(r < 0.26) return "armored";
  if(r < 0.34) return "freeze";
  return "normal";
}

function spawnEnemy(){
  const cfg = isEndless ? endlessConfig() : LEVEL_CONFIG[currentLevel];
  const lanes = [H*0.28, H*0.5, H*0.72];
  const occupied = enemies.map(e=>e.y);
  let y = lanes.find(l => !occupied.includes(l)) ?? lanes[Math.floor(Math.random()*lanes.length)];

  const type = isEndless ? pickEnemyType(endlessElapsed()) : "normal";
  let words, speedMult = 1, radiusBonus = 0, baseColor = "#7C6E96";

  if(type === "armored"){
    const pool = endlessWordPool();
    words = [pickWordFrom(pool), pickWordFrom(pool)];
    radiusBonus = 6; baseColor = "#8A6A3A";
  } else if(type === "speedster"){
    words = [pickShortWord()];
    speedMult = 1.5; radiusBonus = -6; baseColor = "#7C6E96";
  } else if(type === "freeze"){
    const pool = endlessWordPool();
    words = [pickWordFrom(pool)];
    baseColor = "#3A6EA5";
  } else {
    words = [isEndless ? pickWordFrom(endlessWordPool()) : pickWord(currentLevel)];
  }

  const wordLenTotal = words.join('').length;
  enemies.push({
    x: W - 40, y, words, wordIndex: 0, typedIndex: 0,
    type, speed: (cfg.speedMin + Math.random()*(cfg.speedMax-cfg.speedMin)) * speedMult,
    alive: true, hitFlash: 0,
    radius: Math.max(10, 16 + Math.min(wordLenTotal,10)*1.1 + radiusBonus),
    shape: makeRockShape(8+Math.floor(Math.random()*3)),
    rot: Math.random()*Math.PI*2, rotSpeed:(Math.random()-0.5)*0.6,
    baseColor
  });
  enemiesSpawned++;
}

function startBoss(){
  boss = { hp: BOSS_TOTAL_HP, maxHp: BOSS_TOTAL_HP, phrase: pickWord(5), typedIndex: 0, timer: BOSS_TIME_PER_PHRASE, hitFlash: 0, shape: makeRockShape(12), rot: 0, rotSpeed: 0.15 };
  currentTarget = null;
}
function nextBossPhrase(damagePlayer){
  if(damagePlayer){ playerHealth = Math.max(0, playerHealth - 10); combo = 0; }
  boss.phrase = pickWord(5); boss.typedIndex = 0;
  boss.timer = Math.max(4, BOSS_TIME_PER_PHRASE - (BOSS_TOTAL_HP-boss.hp)/BOSS_TOTAL_HP*3);
}

function generateBoltPoints(x1,y1,x2,y2){
  const dx = x2-x1, dy = y2-y1;
  const dist = Math.hypot(dx,dy) || 1;
  const segments = Math.max(3, Math.min(9, Math.round(dist/26)));
  const nx = -dy/dist, ny = dx/dist;
  const pts = [{x:x1,y:y1}];
  for(let i=1;i<segments;i++){
    const t = i/segments;
    const baseX = x1+dx*t, baseY = y1+dy*t;
    const wobble = (Math.random()-0.5) * 20 * (1 - Math.abs(t-0.5)*1.3);
    pts.push({x:baseX+nx*wobble, y:baseY+ny*wobble});
  }
  pts.push({x:x2,y:y2});
  return pts;
}
function spawnLightning(x1,y1,x2,y2,intensity=1){
  lightnings.push({ points: generateBoltPoints(x1,y1,x2,y2), time:0, maxTime:0.2, intensity, closed:false });
  AudioEngine.shoot();
}
function generateArcRingPoints(cx,cy,radius,segments=10){
  const pts = [];
  for(let i=0;i<segments;i++){
    const ang = (i/segments)*Math.PI*2;
    const r = radius*(0.8+Math.random()*0.35);
    pts.push({x:cx+Math.cos(ang)*r, y:cy+Math.sin(ang)*r});
  }
  return pts;
}
function spawnMicroLightning(cx,cy,radius){
  lightnings.push({ points: generateArcRingPoints(cx,cy,radius), time:0, maxTime:0.25, intensity:0.9, closed:true });
}
function explodeAt(x, y, color, big){
  rings.push({x, y, radius:big?6:4, maxRadius: big?60:32, time:0, maxTime: big?0.4:0.28, color});
  spawnParticles(x, y, big?26:14, color);
  triggerShake(big?0.22:0.12, big?9:4);
  AudioEngine.explode();
}
function spawnParticles(x,y,count,color){
  for(let i=0;i<count;i++){
    const ang = Math.random()*Math.PI*2, spd = 50+Math.random()*130;
    particles.push({x,y,vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, life:0.35+Math.random()*0.3, maxLife:0.65, color, size:2+Math.random()*2});
  }
}
function spawnParticlesUpward(x,y,count){
  for(let i=0;i<count;i++){
    const vx = (Math.random()-0.5)*70;
    const vy = -(130+Math.random()*190);
    particles.push({x,y,vx,vy,life:0.45+Math.random()*0.3, maxLife:0.8, color:"#FFD65C", size:2+Math.random()*3});
  }
}
function showFinisherText(comboVal){
  const el = document.getElementById('finisherTag');
  el.textContent = comboVal + "x AOE FINISHER!";
  el.style.opacity = "1"; el.style.transform = "translate(-50%,-50%) scale(1.35)";
  setTimeout(()=>{ el.style.transform = "translate(-50%,-50%) scale(1)"; }, 120);
  setTimeout(()=>{ el.style.opacity = "0"; }, 750);
}
const FINISHER_RADIUS = 170;
function triggerLightPillarFinisher(cx, cy){
  pillars.push({ x:cx, time:0, maxTime:0.5 });
  spawnParticlesUpward(cx, cy, 30);
  triggerShake(0.35, 20);
  AudioEngine.finisher();
  showFinisherText(combo);

  for(const e of enemies){
    if(e.alive && e.x !== cx && Math.hypot(e.x-cx, e.y-cy) <= FINISHER_RADIUS){
      e.alive = false;
      wordsCompleted++; enemiesCleared++;
      score += e.words.join('').length * 8;
      spawnParticles(e.x, e.y, 14, "#FFD65C");
    }
  }
}
function updatePillars(dt){ for(const p of pillars){ p.time += dt; } pillars = pillars.filter(p=>p.time<p.maxTime); }
function drawPillars(){
  for(const p of pillars){
    const fade = Math.max(1 - p.time/p.maxTime, 0);
    ctx.save();
    ctx.globalAlpha = fade*0.45; ctx.fillStyle = "#FFD65C";
    ctx.shadowColor = "#FFD65C"; ctx.shadowBlur = 32;
    ctx.fillRect(p.x-24, -20, 48, H+40);

    ctx.globalAlpha = fade*0.85; ctx.shadowBlur = 14;
    ctx.fillRect(p.x-9, -20, 18, H+40);

    ctx.globalAlpha = fade; ctx.fillStyle = "#FFFFFF"; ctx.shadowBlur = 0;
    ctx.fillRect(p.x-2, -20, 4, H+40);
    ctx.restore();
  }
}
function triggerShake(dur, strength){ shakeTime = Math.max(shakeTime,dur); shakeStrength = Math.max(shakeStrength,strength); }

function addEmpCharge(){
  if(!isEndless) return;
  if(combo>0 && combo % EMP_COMBO_STEP === 0){
    empCharge = Math.min(EMP_MAX, empCharge + EMP_CHARGE_PER_STEP);
    updateEmpUI();
  }
}
function updateEmpUI(){
  document.getElementById('empFill').style.width = empCharge + "%";
}

function triggerEmpBurst(){
  if(!isEndless || empCharge < EMP_MAX || enemies.length === 0) return;
  empCharge = 0; updateEmpUI();
  for(const e of enemies){
    score += e.words.join('').length * 5;
    spawnMicroLightning(e.x, e.y, e.radius+6);
    explodeAt(e.x, e.y, "#FFFFFF", true);
  }
  enemies = []; currentTarget = null;
  empShockwave = { x:PLAYER_X, y:PLAYER_Y, radius:10, maxRadius: Math.max(W,H)*1.1, time:0, maxTime:0.6 };
  AudioEngine.empBurst();
  triggerShake(0.3, 14);
}

function processChar(rawChar){
  if(state !== "PLAYING" && state !== "BOSS" && state !== "ENDLESS") return;
  const ch = rawChar.toLowerCase();
  const isLetter = /^[a-z]$/.test(ch);
  const isSpace = ch === " ";
  if(!isLetter && !isSpace) return;
  totalTyped++;

  if(state === "BOSS"){
    if(boss.typedIndex < boss.phrase.length && boss.phrase[boss.typedIndex] === ch){
      boss.typedIndex++; totalCorrect++; combo++; maxCombo = Math.max(maxCombo, combo);
      AudioEngine.typeCorrect(combo);
      spawnParticles(W/2, H*0.35, 4, "#35F0D0");
      if(boss.typedIndex >= boss.phrase.length){
        const dmg = BOSS_TOTAL_HP / WORD_LISTS[5].length;
        boss.hp = Math.max(0, boss.hp - dmg);
        score += boss.phrase.length * 15 + combo*2; wordsCompleted++;
        spawnLightning(PLAYER_X+16, PLAYER_Y, W/2, H*0.35);
        explodeAt(W/2, H*0.35, "#FF3E9A", true);
        const hpAfter = boss.hp;
        if(hpAfter <= 0){ setTimeout(()=>triggerVictory(), 150); }
        else { nextBossPhrase(false); }
      }
    } else {
      combo = 0; AudioEngine.typeWrong(); boss.hitFlash = 0.15; score = Math.max(0, score - 5);
    }
    updateStats(); return;
  }

  if(!currentTarget || !currentTarget.alive){
    currentTarget = enemies.filter(e => e.alive && e.typedIndex === 0 && getCurrentWord(e)[0] === ch).sort((a,b) => a.x - b.x)[0] || null;
    if(!currentTarget){ combo = 0; AudioEngine.typeWrong(); updateStats(); return; }
  }

  const w = getCurrentWord(currentTarget);
  if(currentTarget.typedIndex < w.length && w[currentTarget.typedIndex] === ch){
    currentTarget.typedIndex++; totalCorrect++; combo++; maxCombo = Math.max(maxCombo, combo);
    AudioEngine.typeCorrect(combo);
    addEmpCharge();
    spawnParticles(currentTarget.x, currentTarget.y, 4, "#35F0D0");
    if(currentTarget.typedIndex >= w.length){
      if(currentTarget.wordIndex + 1 < currentTarget.words.length){
        currentTarget.wordIndex++; currentTarget.typedIndex = 0;
        AudioEngine.armorBreak();
        spawnParticles(currentTarget.x, currentTarget.y, 10, "#FFC96B");
        triggerShake(0.08, 3);
      } else {
        killEnemy(currentTarget); currentTarget = null;
      }
    }
  } else {
    combo = 0; AudioEngine.typeWrong(); currentTarget.hitFlash = 0.15; score = Math.max(0, score - 3);
  }
  updateStats();
}

function killEnemy(enemy){
  enemy.alive = false; wordsCompleted++; enemiesCleared++;
  score += enemy.words.join('').length * 10 + combo*2;
  const ex = enemy.x, ey = enemy.y, etype = enemy.type;

  // Pilih jenis serangan: Chain Lightning biasa (combo < 100) atau
  // Super Finisher Pilar Cahaya AoE (combo >= 100), khusus Survival Mode.
  const finisherReady = isSurvivalMode() && combo >= COMBO_FINISHER_THRESHOLD;

  if(finisherReady){
    triggerLightPillarFinisher(ex, ey);
  } else {
    // Petir HANYA menyambar dari player ke target yang BARU SAJA selesai diketik.
    spawnLightning(PLAYER_X+16, PLAYER_Y, ex, ey);
    explodeAt(ex, ey, etype==="freeze" ? "#7EC8FF" : "#FF3E9A", false);

    // Chain lightning: hanya menyambung ke target sebelumnya yang JUGA sudah
    // selesai dihancurkan (bukan musuh hidup yang belum diketik), dan hanya
    // jika combo >= 2 serta kill sebelumnya terjadi dalam jendela waktu singkat.
    if(combo >= 2 && lastKillPos && (clock - lastKillTime) <= CHAIN_WINDOW){
      spawnLightning(lastKillPos.x, lastKillPos.y, ex, ey, 0.6);
      spawnParticles(ex, ey, 6, "#B98CFF");
    }
  }
  lastKillPos = { x: ex, y: ey };
  lastKillTime = clock;

  enemies = enemies.filter(e => e.alive);
  if(etype === "freeze"){
    freezeTimer = FREEZE_DURATION;
    AudioEngine.freeze();
  }
  if(!isEndless) checkLevelClear();
}

function checkLevelClear(){
  const cfg = LEVEL_CONFIG[currentLevel];
  if(currentLevel < 5 && enemiesCleared >= cfg.enemiesToClear && enemies.length === 0){ triggerLevelComplete(); }
}

function updateStats(){
  const elapsedMin = Math.max((performance.now()-sessionStart)/60000, 0.001);
  const wpm = (totalCorrect/5)/elapsedMin;
  const acc = totalTyped>0 ? (totalCorrect/totalTyped*100) : 100;
  document.getElementById('scoreVal').textContent = score;
  document.getElementById('wpmVal').textContent = wpm.toFixed(1);
  document.getElementById('accVal').textContent = acc.toFixed(1);
  document.getElementById('comboVal').textContent = combo;
  if(combo>1 && combo%5===0){ popCombo(combo); }
}
function popCombo(c){
  const el = document.getElementById('comboTag');
  el.textContent = "Combo x"+c+"!";
  el.style.opacity = "1"; el.style.transform = "translate(-50%,-50%) scale(1.3)";
  setTimeout(()=>{ el.style.transform="translate(-50%,-50%) scale(1)"; },100);
  setTimeout(()=>{ el.style.opacity="0"; },500);
}

let lastTime = performance.now();
function loop(now){
  const dt = Math.min((now-lastTime)/1000, 0.05);
  lastTime = now;
  updateBackground(dt);
  if(state === "PLAYING" || state === "ENDLESS") updatePlaying(dt);
  if(state === "BOSS") updateBoss(dt);
  if(state === "PLAYING" || state === "BOSS" || state === "ENDLESS"){
    updateParticles(dt); updateLightnings(dt); updateRings(dt); updateEmpShockwave(dt); updatePillars(dt);
    if(shakeTime>0) shakeTime -= dt; else shakeStrength = 0;
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function updatePlaying(dt){
  const cfg = isEndless ? endlessConfig() : LEVEL_CONFIG[currentLevel];
  const canSpawnMore = isEndless ? true : (enemiesSpawned < cfg.enemiesToClear);
  if(canSpawnMore && enemies.length < cfg.maxOnScreen){
    spawnTimer += dt;
    if(spawnTimer >= nextSpawn){
      spawnTimer = 0; nextSpawn = cfg.spawnMin + Math.random()*(cfg.spawnMax-cfg.spawnMin);
      spawnEnemy();
    }
  }
  if(freezeTimer > 0) freezeTimer -= dt;

  for(const e of enemies){
    const moveMul = freezeTimer > 0 ? 0 : 1;
    e.x -= e.speed*dt*moveMul; e.rot += e.rotSpeed*dt;
    if(e.hitFlash>0) e.hitFlash -= dt;
    if(e.x <= PLAYER_X + 20){
      playerHealth = Math.max(0, playerHealth - cfg.damage); combo = 0;
      triggerShake(0.2, 10); e.alive = false;
    }
  }
  enemies = enemies.filter(e=>e.alive);
  document.getElementById('healthFill').style.width = (playerHealth/playerMaxHealth*100)+"%";
  document.getElementById('healthFill').style.background = playerHealth<30?"#FF4D6A":playerHealth<60?"#FFD24D":"#C8FF4D";
  document.getElementById('vignette').classList.toggle('active', playerHealth <= playerMaxHealth*0.25 && playerHealth>0);
  if(playerHealth<=0) triggerGameOver();
}

function updateBoss(dt){
  boss.timer -= dt; boss.rot += boss.rotSpeed*dt;
  if(boss.hitFlash>0) boss.hitFlash -= dt;
  document.getElementById('bossFill').style.width = (boss.hp/boss.maxHp*100)+"%";
  if(boss.timer<=0){ nextBossPhrase(true); }
  document.getElementById('healthFill').style.width = (playerHealth/playerMaxHealth*100)+"%";
  document.getElementById('vignette').classList.toggle('active', playerHealth <= playerMaxHealth*0.25 && playerHealth>0);
  if(playerHealth<=0) triggerGameOver();
}

function updateParticles(dt){ for(const p of particles){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; p.vx*=0.94; p.vy*=0.94; } particles = particles.filter(p=>p.life>0); }
function updateLightnings(dt){ for(const l of lightnings){ l.time += dt; } lightnings = lightnings.filter(l=>l.time<l.maxTime); }
function updateRings(dt){ for(const r of rings){ r.time += dt; r.radius = r.radius + (r.maxRadius-r.radius)*0.25; } rings = rings.filter(r=>r.time<r.maxTime); }
function updateEmpShockwave(dt){
  if(!empShockwave) return;
  empShockwave.time += dt;
  empShockwave.radius += (empShockwave.maxRadius - empShockwave.radius) * 0.18;
  if(empShockwave.time >= empShockwave.maxTime) empShockwave = null;
}

function render(){
  ctx.save();
  if(shakeTime>0){ const s = shakeStrength * (shakeTime/0.22); ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s); }
  ctx.clearRect(-20,-20,W+40,H+40);
  drawBackground();

  if(state === "LOBBY" || state === "MENU"){
    drawLobbyPlanet();
    drawIdleScene();
  } else {
    drawShip(PLAYER_X, PLAYER_Y, state==="PLAYING"||state==="BOSS"||state==="ENDLESS");
    if(state === "PLAYING" || state === "ENDLESS" || state === "PAUSED" || state === "LEVEL_COMPLETE" || state === "GAMEOVER"){
      for(const e of enemies) drawEnemy(e);
      if(currentTarget && currentTarget.alive && (state==="PLAYING"||state==="ENDLESS")){
        drawLockOn(currentTarget.x, currentTarget.y, currentTarget.radius);
      }
    }
    if(boss && (state === "BOSS" || state === "PAUSED" || state === "VICTORY")){
      drawBoss();
      if(state==="BOSS") drawLockOn(W/2, H*0.35, 56);
    }
  }

  drawPillars();

  drawLightnings();
  for(const r of rings){
    const alpha = Math.max(1 - r.time/r.maxTime, 0);
    ctx.globalAlpha = alpha; ctx.strokeStyle = r.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if(empShockwave){
    const fade = Math.max(1 - empShockwave.time/empShockwave.maxTime, 0);
    const r = empShockwave.radius;

    // Cincin luar: glow lebar cyan memudar
    ctx.globalAlpha = fade * 0.35;
    ctx.strokeStyle = "#35F0D0"; ctx.lineWidth = 26;
    ctx.shadowColor = "#35F0D0"; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(empShockwave.x, empShockwave.y, r, 0, Math.PI*2); ctx.stroke();

    // Cincin tengah: pita neon lebih tegas
    ctx.globalAlpha = fade * 0.7;
    ctx.strokeStyle = "#35F0D0"; ctx.lineWidth = 6; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(empShockwave.x, empShockwave.y, r*0.97, 0, Math.PI*2); ctx.stroke();

    // Cincin inti: garis putih terang tipis di tepi
    ctx.globalAlpha = fade;
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 2; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(empShockwave.x, empShockwave.y, r, 0, Math.PI*2); ctx.stroke();

    ctx.globalAlpha = 1;
  }
  for(const p of particles){
    ctx.globalAlpha = Math.max(p.life/p.maxLife,0);
    ctx.fillStyle = p.color; ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawEnemy(e){
  let fillColor = e.hitFlash>0 ? "#FF4D6A" : e.baseColor;
  drawRock(e.x, e.y, e.radius, e.shape, fillColor, e.type==="freeze" ? "#7EC8FF" : "#3A2E55", e.rot);

  if(e.type === "armored" && e.wordIndex === 0){
    ctx.save(); ctx.strokeStyle = "rgba(255,201,107,0.7)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.radius+6, 0, Math.PI*2); ctx.stroke(); ctx.restore();
  }
  if(freezeTimer > 0){
    ctx.save(); ctx.strokeStyle = "rgba(126,200,255,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.radius+3, 0, Math.PI*2); ctx.stroke(); ctx.restore();
  }

  const w = getCurrentWord(e);
  const typed = toDisplayText(w.slice(0,e.typedIndex));
  const rest = toDisplayText(w.slice(e.typedIndex));
  ctx.font = "20px 'Courier New', monospace";
  const typedW = ctx.measureText(typed).width;
  const totalW = ctx.measureText(toDisplayText(w)).width;
  const startX = e.x - totalW/2;
  const textY = e.y-e.radius-14;

  ctx.fillStyle = "#C8FF4D"; ctx.fillText(typed, startX, textY);
  if(e.type === "speedster"){
    const blink = Math.sin(clock*14) > 0;
    ctx.fillStyle = blink ? "#FF4D6A" : "#FF9FB4";
  } else {
    ctx.fillStyle = "#E8E3F5";
  }
  ctx.fillText(rest, startX+typedW, textY);
}

function drawLightnings(){
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  for(const l of lightnings){
    const fade = Math.max(1 - l.time/l.maxTime, 0);
    const alpha = fade * l.intensity;
    if(alpha <= 0) continue;

    // Lapis luar: glow lebar ungu/biru magis
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = "#7C4DFF"; ctx.lineWidth = 9;
    ctx.shadowColor = "#7C4DFF"; ctx.shadowBlur = 14;
    strokeBoltPath(l.points, l.closed);

    // Lapis tengah: cyan neon
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = "#35F0D0"; ctx.lineWidth = 4;
    ctx.shadowColor = "#35F0D0"; ctx.shadowBlur = 10;
    strokeBoltPath(l.points, l.closed);

    // Inti: putih terang
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 1.6;
    ctx.shadowBlur = 0;
    strokeBoltPath(l.points, l.closed);
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}
function strokeBoltPath(points, closed){
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y);
  if(closed) ctx.closePath();
  ctx.stroke();
}

function drawBoss(){
  drawRock(W/2, H*0.35, 56, boss.shape, boss.hitFlash>0? "#FF4D6A" : "#5C3A66", "#FF3E9A", boss.rot);
  ctx.font = "26px 'Courier New', monospace";
  const typed = toDisplayText(boss.phrase.slice(0,boss.typedIndex));
  const rest = toDisplayText(boss.phrase.slice(boss.typedIndex));
  const totalW = ctx.measureText(toDisplayText(boss.phrase)).width;
  const startX = W/2 - totalW/2;
  ctx.fillStyle = "#C8FF4D"; ctx.fillText(typed, startX, H*0.35-80);
  ctx.fillStyle = "#E8E3F5"; ctx.fillText(rest, startX+ctx.measureText(typed).width, H*0.35-80);
  const timerRatio = Math.max(boss.timer/BOSS_TIME_PER_PHRASE,0);
  ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(W/2-100, H*0.35-105, 200, 6);
  ctx.fillStyle = timerRatio<0.3 ? "#FF4D6A" : "#35F0D0"; ctx.fillRect(W/2-100, H*0.35-105, 200*timerRatio, 6);
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  if(id) document.getElementById(id).classList.remove('hidden');
}
function setHudVisible(visible){ document.getElementById('hud').style.display = visible ? 'flex' : 'none'; }
function clearFx(){ particles=[]; lightnings=[]; rings=[]; pillars=[]; empShockwave=null; shakeTime=0; shakeStrength=0; document.getElementById('vignette').classList.remove('active'); document.getElementById('finisherTag').style.opacity='0'; }

function renderLevelGrid(){
  const grid = document.getElementById('levelGrid');
  grid.innerHTML = "";
  for(let lv=1; lv<=5; lv++){
    const card = document.createElement('div'); card.className = "levelCard";
    card.innerHTML = `<div class="lvNum">${lv}</div><div class="lvName">${LEVEL_CONFIG[lv].name}</div><div class="lvBest">Terbaik: ${getHighScore(lv)}</div>`;
    card.addEventListener('click', ()=> startLevel(lv));
    grid.appendChild(card);
  }
}
function startLevel(level){ resetForLevel(level); setHudVisible(true); showScreen(null); document.getElementById('hiddenInput').focus({preventScroll:true}); }
function startEndless(){ resetForEndless(); setHudVisible(true); showScreen(null); document.getElementById('hiddenInput').focus({preventScroll:true}); }

function triggerLevelComplete(){
  state = "LEVEL_COMPLETE"; clearFx();
  const best = saveHighScore(currentLevel, score);
  document.getElementById('lcScore').textContent = score;
  document.getElementById('lcBest').textContent = best;
  document.getElementById('lcWpm').textContent = document.getElementById('wpmVal').textContent;
  document.getElementById('lcAcc').textContent = document.getElementById('accVal').textContent;
  document.getElementById('nextLevelBtn').style.display = currentLevel <= 4 ? 'inline-block' : 'none';
  showScreen('levelCompleteScreen');
}

function triggerGameOver(){
  state = "GAMEOVER"; clearFx(); AudioEngine.gameover();
  document.getElementById('goScore').textContent = score;
  document.getElementById('goWpm').textContent = document.getElementById('wpmVal').textContent;
  document.getElementById('goAcc').textContent = document.getElementById('accVal').textContent;
  document.getElementById('goCombo').textContent = maxCombo;

  const survivalLine = document.getElementById('goSurvivalLine');
  if(isEndless){
    const best = saveHighScore('endless', score);
    document.getElementById('goBestLabel').textContent = "Skor tertinggi Bertahan Hidup";
    document.getElementById('goBest').textContent = best;
    document.getElementById('goSurvival').textContent = Math.floor(endlessElapsed());
    survivalLine.style.display = 'block';
  } else {
    document.getElementById('goBestLabel').textContent = "Skor tertinggi Level " + currentLevel;
    document.getElementById('goBest').textContent = getHighScore(currentLevel);
    survivalLine.style.display = 'none';
  }
  showScreen('gameOverScreen');
}

function triggerVictory(){
  state = "VICTORY"; clearFx(); AudioEngine.victory();
  const best = saveHighScore(5, score);
  document.getElementById('vScore').textContent = score;
  document.getElementById('vBest').textContent = best;
  document.getElementById('vWpm').textContent = document.getElementById('wpmVal').textContent;
  document.getElementById('vAcc').textContent = document.getElementById('accVal').textContent;
  showScreen('victoryScreen');
}

function returnToLevelMenu(){ state = "MENU"; clearFx(); setHudVisible(false); renderLevelGrid(); showScreen('menuScreen'); }
function returnToLobby(){
  state = "LOBBY"; clearFx(); setHudVisible(false);
  document.getElementById('lobbyEndlessBest').textContent = getHighScore('endless');
  showScreen('lobbyScreen');
}
function backFromGameOver(){ if(isEndless) returnToLobby(); else returnToLevelMenu(); }
function retryFromGameOver(){ if(isEndless) startEndless(); else startLevel(currentLevel); }

document.getElementById('lobbyStartBtn').addEventListener('click', ()=>{ AudioEngine.unlock(); state="MENU"; renderLevelGrid(); showScreen('menuScreen'); });
document.getElementById('lobbyEndlessBtn').addEventListener('click', ()=>{ AudioEngine.unlock(); startEndless(); });
document.getElementById('lobbyOptionsBtn').addEventListener('click', ()=> showScreen('optionsScreen'));
document.getElementById('optionsBackBtn').addEventListener('click', ()=> showScreen('lobbyScreen'));
document.getElementById('menuBackBtn').addEventListener('click', returnToLobby);

document.getElementById('lobbyExitBtn').addEventListener('click', ()=>{
  try{ window.close(); }catch(e){}
  showScreen('exitScreen');
});
document.getElementById('exitBackBtn').addEventListener('click', returnToLobby);

document.getElementById('pauseBtn').addEventListener('click', ()=>{
  if(state !== "PLAYING" && state !== "BOSS" && state !== "ENDLESS") return;
  stateBeforePause = state; state = "PAUSED"; showScreen('pauseScreen');
});
document.getElementById('resumeBtn').addEventListener('click', ()=>{
  state = stateBeforePause; showScreen(null); document.getElementById('hiddenInput').focus({preventScroll:true});
});
document.getElementById('quitBtn').addEventListener('click', ()=>{ isEndless ? returnToLobby() : returnToLevelMenu(); });
document.getElementById('nextLevelBtn').addEventListener('click', ()=> startLevel(Math.min(currentLevel+1,5)));
document.getElementById('lcMenuBtn').addEventListener('click', returnToLevelMenu);
document.getElementById('retryBtn').addEventListener('click', retryFromGameOver);
document.getElementById('menuBtnGO').addEventListener('click', backFromGameOver);
document.getElementById('playAgainBtn').addEventListener('click', ()=> startLevel(currentLevel));
document.getElementById('vMenuBtn').addEventListener('click', returnToLevelMenu);

const volumeSlider = document.getElementById('volumeSlider');
const volumeLabel = document.getElementById('volumeLabel');
volumeSlider.value = Math.round(AudioEngine.getVolume()*100);
volumeLabel.textContent = volumeSlider.value + "%";
volumeSlider.addEventListener('input', (e)=>{
  const v = parseInt(e.target.value,10);
  AudioEngine.setVolume(v/100);
  volumeLabel.textContent = v + "%";
});

const hiddenInput = document.getElementById('hiddenInput');
const focusHiddenInput = ()=>{ AudioEngine.unlock(); hiddenInput.focus({preventScroll:true}); };
document.getElementById('stage').addEventListener('click', focusHiddenInput);
document.getElementById('stage').addEventListener('touchend', focusHiddenInput);
hiddenInput.addEventListener('input', (e)=>{
  const data = e.data;
  if(data){
    for(const ch of data){ processChar(ch); }
  }
  hiddenInput.value = "";
});
window.addEventListener('keydown', (e)=>{
  if(e.key === "Escape" && (state==="PLAYING"||state==="BOSS"||state==="ENDLESS")){ document.getElementById('pauseBtn').click(); return; }
  if(e.key === "Enter" && state === "ENDLESS"){ triggerEmpBurst(); return; }
  // Karakter huruf/spasi TIDAK diproses di sini — itu tugas event 'input' pada
  // hiddenInput di bawah, supaya tidak terjadi penghitungan ganda (lihat perbaikan #1).
});

document.getElementById('lobbyEndlessBest').textContent = getHighScore('endless');
setHudVisible(false);

// Mengunci posisi scroll halaman ke (0,0) — mencegah layar "terdorong" saat
// hiddenInput difokuskan atau keyboard virtual Android muncul.
window.addEventListener('scroll', () => window.scrollTo(0, 0));

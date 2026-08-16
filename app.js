const memStore = {};
const LS_OK = (function(){try{localStorage.setItem('__t__','1');localStorage.removeItem('__t__');return true}catch(e){return false}})();
let warnedNoStore=false;
function save(k,v){memStore[k]=v;if(LS_OK){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}else if(!warnedNoStore){warnedNoStore=true;toast('浏览器存储不可用，数据仅本次有效')}}
function load(k,d){let raw=null;if(LS_OK){try{raw=localStorage.getItem(k)}catch(e){}}if(raw===null&&memStore[k]!==undefined)raw=JSON.stringify(memStore[k]);if(raw===null||raw===undefined)return d;try{return JSON.parse(raw)}catch(e){return d}}
const LS={s:'mt3_s',chars:'mt3_chars',chats:'mt3_chats',protas:'mt3_protas',protaId:'mt3_protaid',wallet:'mt3_wallet',moments:'mt3_moments',w:'mt3_w',mem:'mt3_mem',vocab:'mt3_vocab',wallpaper:'mt3_wallpaper',wpimg:'mt3_wpimg',lockWall:'mt3_lockwall',lockWpImg:'mt3_lockwpimg',notifWall:'mt3_notifwall',notifWpImg:'mt3_notifwpimg',notifs:'mt3_notifs',activeMsg:'mt3_active'};
const DEFAULT_SYS='你正在扮演角色「{name}」。严格贴合人设对话，自然生活化，模仿真人语气，口语化表达。禁止出现"作为AI""作为语言模型""很高兴为您服务"等AI话术痕迹。不要解释设定，直接进入角色，回复长度适中。';
const dset={baseurl:'',apiKey:'',model:'',temperature:0.9,topP:1,maxTokens:1024,stream:true,sys:DEFAULT_SYS,genBaseurl:'',genKey:'',genModel:''};
let st=load(LS.s,{...dset});if(!st||typeof st!=='object')st={...dset};st={...dset,...st};
let chars=load(LS.chars,[]);if(!Array.isArray(chars))chars=[];
let chats=load(LS.chats,{});if(!chats||typeof chats!=='object'||Array.isArray(chats))chats={};
let protas=load(LS.protas,null);
if(!Array.isArray(protas)||!protas.length){const old=load('mt3_prota',{name:'我',desc:''});protas=[{id:'p1',name:(old&&old.name)||'我',desc:(old&&old.desc)||''}];}
let protaId=load(LS.protaId,protas[0].id);
function getProta(){return protas.find(p=>p.id===protaId)||protas[0];}
let wallet=load(LS.wallet,{balance:0,bills:[]});if(!wallet||typeof wallet!=='object')wallet={balance:0,bills:[]};if(!Array.isArray(wallet.bills))wallet.bills=[];if(typeof wallet.balance!=='number')wallet.balance=0;
let moments=load(LS.moments,[]);if(!Array.isArray(moments))moments=[];
let lore=load(LS.w,[]);if(!Array.isArray(lore))lore=[];
let mem=load(LS.mem,{});if(!mem||typeof mem!=='object'||Array.isArray(mem))mem={};
let vocab=load(LS.vocab,{custom:[],wrong:{},today:0,right:0,wrongCnt:0,lastDate:''});
if(!vocab||typeof vocab!=='object')vocab={custom:[],wrong:{},today:0,right:0,wrongCnt:0,lastDate:''};
if(!Array.isArray(vocab.custom))vocab.custom=[];
if(!vocab.wrong||typeof vocab.wrong!=='object')vocab.wrong={};
if(typeof vocab.today!=='number')vocab.today=0;
if(typeof vocab.right!=='number')vocab.right=0;
if(typeof vocab.wrongCnt!=='number')vocab.wrongCnt=0;
if(typeof vocab.lastDate!=='string')vocab.lastDate='';
let notifs=load(LS.notifs,[]);if(!Array.isArray(notifs))notifs=[];
let activeMsg=load(LS.activeMsg,{enabled:false,interval:30});if(!activeMsg||typeof activeMsg!=='object')activeMsg={enabled:false,interval:30};
let activeTimer=null;
let avatarTarget='char';
let tmpCharAvatar='';
let tmpProtaAvatar='';
let navAnim='push';
let navLock=false;
let cleanupTimer=null;
let recog=null,listening=false;
let theme=load('mt3_theme','dark');
function applyTheme(){document.documentElement.setAttribute('data-theme',theme);const sw=$('setTheme');if(sw)sw.classList.toggle('on',theme==='dark');}
const WALLPAPERS=[
{id:'aurora',name:'极光',bg:'radial-gradient(ellipse at 20% 14%, rgba(94,60,255,.34), transparent 48%), radial-gradient(ellipse at 85% 30%, rgba(0,140,255,.28), transparent 50%), radial-gradient(ellipse at 55% 95%, rgba(255,80,150,.24), transparent 52%), #08080c'},
{id:'ocean',name:'深海',bg:'radial-gradient(ellipse at 30% 20%, rgba(0,80,200,.4), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0,200,180,.3), transparent 50%), #04060c'},
{id:'forest',name:'森林',bg:'radial-gradient(ellipse at 25% 15%, rgba(40,180,120,.35), transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(120,200,60,.22), transparent 50%), #050a06'},
{id:'gold',name:'暗金',bg:'radial-gradient(ellipse at 30% 20%, rgba(220,170,60,.3), transparent 50%), radial-gradient(ellipse at 75% 75%, rgba(140,90,30,.3), transparent 52%), #0a0805'},
{id:'sunset',name:'日落',bg:'radial-gradient(ellipse at 20% 20%, rgba(255,120,60,.35), transparent 50%), radial-gradient(ellipse at 80% 75%, rgba(200,50,90,.32), transparent 52%), #0c0508'},
{id:'night',name:'星夜',bg:'radial-gradient(ellipse at 30% 25%, rgba(80,90,200,.3), transparent 50%), radial-gradient(ellipse at 75% 70%, rgba(20,40,90,.35), transparent 52%), #02030a'}
];
let wallpaper=load(LS.wallpaper,'aurora');
let lockWallpaper=load(LS.lockWall,'aurora');
let notifWallpaper=load(LS.notifWall,'aurora');
if(!WALLPAPERS.some(w=>w.id===wallpaper)&&wallpaper!=='custom')wallpaper='aurora';
if(!WALLPAPERS.some(w=>w.id===lockWallpaper)&&lockWallpaper!=='custom')lockWallpaper='aurora';
if(!WALLPAPERS.some(w=>w.id===notifWallpaper)&&notifWallpaper!=='custom')notifWallpaper='aurora';
let wpImgUrl=null,lockImgUrl=null,notifImgUrl=null;
(function initWPImg(){
  try{const r=localStorage.getItem(LS.wpimg);if(r)wpImgUrl=r;}catch(e){}
  try{const r=localStorage.getItem(LS.lockWpImg);if(r)lockImgUrl=r;}catch(e){}
  try{const r=localStorage.getItem(LS.notifWpImg);if(r)notifImgUrl=r;}catch(e){}
})();
let wpTarget='home';
function getBg(wp,img){if(wp==='custom'&&img)return '#08080c url('+img+') center/cover no-repeat';const w=WALLPAPERS.find(x=>x.id===wp)||WALLPAPERS[0];return w.bg;}
const BUILTIN_WORDS=[
{w:'abandon',m:'放弃'},{w:'absorb',m:'吸收'},{w:'abundant',m:'丰富的'},{w:'access',m:'进入；通道'},{w:'accompany',m:'陪伴'},
{w:'accomplish',m:'完成'},{w:'accurate',m:'准确的'},{w:'achieve',m:'实现'},{w:'acquire',m:'获得'},{w:'adapt',m:'适应'},
{w:'adequate',m:'足够的'},{w:'adjust',m:'调整'},{w:'admire',m:'钦佩'},{w:'advocate',m:'提倡'},{w:'aggressive',m:'好斗的'},
{w:'ambition',m:'雄心'},{w:'analyze',m:'分析'},{w:'ancient',m:'古代的'},{w:'anticipate',m:'预期'},{w:'anxiety',m:'焦虑'},
{w:'apparent',m:'明显的'},{w:'appeal',m:'呼吁；吸引'},{w:'appreciate',m:'感激'},{w:'approach',m:'方法；接近'},{w:'appropriate',m:'适当的'},
{w:'approve',m:'批准'},{w:'assess',m:'评估'},{w:'assign',m:'分配'},{w:'assist',m:'协助'},{w:'assume',m:'假设'},
{w:'attach',m:'附上'},{w:'attempt',m:'尝试'},{w:'attitude',m:'态度'},{w:'attract',m:'吸引'},{w:'authority',m:'权威'},
{w:'available',m:'可获得的'},{w:'aware',m:'意识到的'},{w:'benefit',m:'利益'},{w:'brief',m:'简短的'},{w:'capable',m:'有能力的'},
{w:'category',m:'类别'},{w:'celebrate',m:'庆祝'},{w:'challenge',m:'挑战'},{w:'circumstance',m:'环境'},{w:'commit',m:'承诺；犯(罪)'},
{w:'compensate',m:'补偿'},{w:'compete',m:'竞争'},{w:'complex',m:'复杂的'},{w:'concept',m:'概念'},{w:'conduct',m:'实施；行为'},
{w:'confident',m:'自信的'},{w:'confirm',m:'确认'},{w:'conflict',m:'冲突'},{w:'consequence',m:'后果'},{w:'consist',m:'组成'},
{w:'constant',m:'持续的'},{w:'construct',m:'建造'},{w:'consume',m:'消耗'},{w:'contact',m:'联系'},{w:'contribute',m:'贡献'}
];
let activeCharId=null;
let sending=false;
let chatFilter='',contactFilter='';
let vCur=null,vOpts=[],vLocked=false;
const $=id=>document.getElementById(id);
function toast(t){const e=$('toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2200)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function latin1(u8){let s='';for(let i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return s}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function getChar(id){return chars.find(c=>c.id===id)||null}
function fmtTime(ts){if(!ts)return '';const d=new Date(ts),now=new Date(),p=n=>String(n).padStart(2,'0');if(d.toDateString()===now.toDateString())return p(d.getHours())+':'+p(d.getMinutes());if(d.getFullYear()===now.getFullYear())return (d.getMonth()+1)+'/'+d.getDate();return d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate();}
function todayStr(){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function extractContent(j){if(!j)return '';if(j.candidates&&j.candidates[0]){const cand=j.candidates[0];const c=cand.content;if(c&&Array.isArray(c.parts)){let out='';c.parts.forEach(p=>{if(p==null)return;if(typeof p.text==='string')out+=p.text;});if(out)return out;}if(typeof c==='string')return c;}const ch=j.choices||[];const m=(ch[0]&&(ch[0].message||ch[0].text))||(j.output&&j.output[0])||null;if(!m)return '';const c=m.content!==undefined?m.content:m.text;if(typeof c==='string')return c;if(Array.isArray(c)){let out='';c.forEach(p=>{if(p==null)return;if(typeof p==='string')out+=p;else if(typeof p.text==='string')out+=p.text;else if(typeof p.content==='string')out+=p.content;});return out;}return '';}
function stripThink(s){if(!s)return s;return s.replace(/[\s\S]*?<\/think>/g,'').trim();}
document.addEventListener('click',function(e){const t=e.target.closest('.app-icon,.c-item,.menu-item,.cell,.tab,.btn,.back,.nav-btn,.model-item,.send,.add-fab,.like-btn,.switch,.v-opt,.plus,.prota-chip,.wp-tab');if(t&&navigator.vibrate){try{navigator.vibrate(8)}catch(err){}}});
let stack=[{kind:'home'}];
function getViewEl(v){if(v.kind==='wechat')return $('app-wechat');if(v.kind==='sub')return $(v.id);return null;}
function renderView(){
  const v=stack[stack.length-1];
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active','zoom-in','slide-in','slide-in-left','slide-out'));
  document.querySelectorAll('.sub').forEach(s=>s.classList.remove('active','slide-in','slide-in-left','slide-out'));
  $('tabbar').style.display='none';
  if(v.kind==='home')$('home').classList.add('active');
  else if(v.kind==='wechat'){
    $('app-wechat').classList.add('active');
    if(navAnim==='push')$('app-wechat').classList.add('zoom-in');
    $('tabbar').style.display='flex';
    document.querySelectorAll('.tab-page').forEach(p=>p.classList.remove('active'));
    $('tab-'+v.tab).classList.add('active');
    document.querySelectorAll('.tabbar .tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===v.tab));
    if(v.tab==='wechat')renderChatList();
    if(v.tab==='contacts')renderContacts();
    if(v.tab==='me')renderMe();
  }else if(v.kind==='sub'){
    const el=$(v.id);if(el){el.classList.add('active');if(navAnim==='push')el.classList.add('slide-in');}
    if(v.id==='sub-chat')renderChat();
    else if(v.id==='sub-chat-info')renderChatInfo();
    else if(v.id==='sub-vocab')renderVocab();
    else if(v.id==='sub-moments')renderMoments();
    else if(v.id==='sub-wallet')renderWallet();
    else if(v.id==='sub-prota')renderProta();
    else if(v.id==='sub-music')loadMusicList();
    else if(v.id==='sub-settings')fillSettingsMain();
    else if(v.id==='sub-api-settings')fillApiSetForm();
    else if(v.id==='sub-wallpaper')renderWallpaper();
    else if(v.id==='sub-lore')renderLore();
    else if(v.id==='sub-memory')renderMem();
  }
}
function navigate(v){
  navAnim='push';
  const oldEl=getViewEl(stack[stack.length-1]);
  stack.push(v);
  renderView();
  if(oldEl){
    oldEl.classList.add('active');
    if(cleanupTimer)clearTimeout(cleanupTimer);
    cleanupTimer=setTimeout(()=>{oldEl.classList.remove('active');cleanupTimer=null;},380);
  }
  if(v.kind==='sub'&&v.id==='sub-chat'){setTimeout(()=>{try{$('input').focus()}catch(e){}},120);}
}
function back(){
  if(navLock)return;
  if(stack.length<=1)return;
  navAnim='pop';
  const curEl=getViewEl(stack[stack.length-1]);
  stack.pop();
  if(curEl&&curEl.classList.contains('active')){
    navLock=true;
    renderView();
    curEl.classList.add('active','slide-out');
    setTimeout(()=>{curEl.classList.remove('active','slide-out');navLock=false;},380);
  }else{renderView();}
}
function goHome(){
  if(navLock)return;
  navAnim='pop';
  const curEl=getViewEl(stack[stack.length-1]);
  stack=[{kind:'home'}];
  if(curEl&&curEl.classList.contains('active')){
    navLock=true;
    renderView();
    curEl.classList.add('active','slide-out');
    setTimeout(()=>{curEl.classList.remove('active','slide-out');navLock=false;},380);
  }else{renderView();}
}
function switchTab(tab){const top=stack[stack.length-1];if(top&&top.kind==='wechat')top.tab=tab;else{navAnim='push';stack.push({kind:'wechat',tab});}renderView();}
function openApp(el,app){
  let ox='50%',oy='50%';
  if(el){const rect=el.getBoundingClientRect();ox=(rect.left+rect.width/2)+'px';oy=(rect.top+rect.height/2)+'px';}
  let targetId='';
  if(app==='wechat')targetId='app-wechat';
  else if(app==='vocab')targetId='sub-vocab';
  else if(app==='settings')targetId='sub-settings';
  else if(app==='lore')targetId='sub-lore';
  else if(app==='memory')targetId='sub-memory';
  else if(app==='data')targetId='sub-data';
  else if(app==='music')targetId='sub-music';
  if(targetId){const t=document.getElementById(targetId);if(t)t.style.transformOrigin=ox+' '+oy;}
  if(app==='wechat')navigate({kind:'wechat',tab:'wechat'});
  else if(app==='vocab')navigate({kind:'sub',id:'sub-vocab'});
  else if(app==='settings')navigate({kind:'sub',id:'sub-settings'});
  else if(app==='lore')navigate({kind:'sub',id:'sub-lore'});
  else if(app==='memory')navigate({kind:'sub',id:'sub-memory'});
  else if(app==='data')navigate({kind:'sub',id:'sub-data'});
  else if(app==='music')navigate({kind:'sub',id:'sub-music'});
}
document.querySelectorAll('[data-hide]').forEach(el=>el.addEventListener('click',back));
document.querySelectorAll('.back-home').forEach(el=>el.addEventListener('click',goHome));
document.querySelectorAll('.tabbar .tab').forEach(t=>t.addEventListener('click',()=>switchTab(t.dataset.tab)));
document.querySelectorAll('.app-icon').forEach(el=>el.addEventListener('click',()=>openApp(el,el.dataset.app)));
document.querySelectorAll('.wp-tab').forEach(t=>t.addEventListener('click',()=>{wpTarget=t.dataset.wp;renderWallpaper();}));
let gx=0,gy=0;
document.addEventListener('touchstart',e=>{gx=e.touches[0].clientX;gy=e.touches[0].clientY;},{passive:true});
document.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-gx;const dy=e.changedTouches[0].clientY-gy;const np=$('notifPanel');if(np&&np.classList.contains('show'))return;if(gx<42&&dx>70&&Math.abs(dx)>Math.abs(dy)*1.5&&stack.length>1)back();},{passive:true});
function tick(){const d=new Date(),p=n=>String(n).padStart(2,'0');const t=p(d.getHours())+':'+p(d.getMinutes());$('sbTime').textContent=t;const a=$('lsTime');if(a)a.textContent=t;const b=$('npTime');if(b)b.textContent=t;const date=(d.getMonth()+1)+'月'+d.getDate()+'日 周'+'日一二三四五六'[d.getDay()];const c=$('lsDate');if(c)c.textContent=date;const e=$('npDate');if(e)e.textContent=date;}
tick();setInterval(tick,10000);
function applyWallpaper(){
  $('homeWall').style.background=getBg(wallpaper,wpImgUrl);
  const ls=$('lockScreen');if(ls)ls.style.background=getBg(lockWallpaper,lockImgUrl);
  const np=$('notifPanel');if(np)np.style.background=getBg(notifWallpaper,notifImgUrl);
}
function getCurWp(){if(wpTarget==='lock')return {wp:lockWallpaper,img:lockImgUrl};if(wpTarget==='notif')return {wp:notifWallpaper,img:notifImgUrl};return {wp:wallpaper,img:wpImgUrl};}
function setCurWp(wp,img){
  if(wpTarget==='lock'){lockWallpaper=wp;lockImgUrl=img;save(LS.lockWall,wp);try{if(img)localStorage.setItem(LS.lockWpImg,img);else localStorage.removeItem(LS.lockWpImg);}catch(e){}}
  else if(wpTarget==='notif'){notifWallpaper=wp;notifImgUrl=img;save(LS.notifWall,wp);try{if(img)localStorage.setItem(LS.notifWpImg,img);else localStorage.removeItem(LS.notifWpImg);}catch(e){}}
  else{wallpaper=wp;wpImgUrl=img;save(LS.wallpaper,wp);try{if(img)localStorage.setItem(LS.wpimg,img);else localStorage.removeItem(LS.wpimg);}catch(e){}}
}
function renderWallpaper(){
  const tabs=$('wpTabs');
  if(tabs){tabs.querySelectorAll('.wp-tab').forEach(t=>t.classList.toggle('on',t.dataset.wp===wpTarget));}
  const cur=getCurWp();
  const box=$('wpGrid');box.innerHTML='';
  WALLPAPERS.forEach(w=>{const d=document.createElement('div');d.className='wp-item'+(w.id===cur.wp?' sel':'');d.style.background=w.bg;d.innerHTML=`<div class="wp-label">${esc(w.name)}</div><div class="wp-check">✓</div>`;d.onclick=()=>{setCurWp(w.id,null);applyWallpaper();renderWallpaper();toast('已切换到 '+w.name)};box.appendChild(d);});
  if(cur.img){const d=document.createElement('div');d.className='wp-item'+(cur.wp==='custom'?' sel':'');d.style.background='#08080c url('+cur.img+') center/cover no-repeat';d.innerHTML=`<div class="wp-label">自定义</div><div class="wp-check">✓</div>`;d.onclick=()=>{setCurWp('custom',cur.img);applyWallpaper();renderWallpaper();toast('已切换到自定义壁纸')};box.appendChild(d);}
  const up=document.createElement('div');up.className='wp-item';up.style.cssText='display:flex;align-items:center;justify-content:center;font-size:30px;border:2px dashed rgba(255,255,255,.25)';up.innerHTML='<div style="text-align:center"><div>＋</div><div style="font-size:11px;color:var(--text2)">上传图片</div></div>';up.onclick=()=>{$('fileWP').click()};box.appendChild(up);
}
function allWords(){return BUILTIN_WORDS.concat(vocab.custom)}
function checkNewDay(){const t=todayStr();if(vocab.lastDate!==t){vocab.lastDate=t;vocab.today=0;vocab.right=0;vocab.wrongCnt=0;save(LS.vocab,vocab)}}
function renderVocab(){checkNewDay();$('vsToday').textContent=vocab.today;const total=vocab.right+vocab.wrongCnt;$('vsRate').textContent=total?Math.round(vocab.right/total*100)+'%':'-';$('vsWrong').textContent=Object.keys(vocab.wrong).length;renderWrongList();newQuestion();}
function newQuestion(){vLocked=false;$('vResult').textContent='';$('vResult').className='v-result';$('btnNext').style.display='none';const all=allWords();if(!all.length){$('vWord').textContent='-';$('vHint').textContent='词库是空的，点右上角 ＋词 添加';$('vOptions').innerHTML='';return;}vCur=all[Math.floor(Math.random()*all.length)];const others=all.filter(w=>w.m!==vCur.m);const dist=shuffle(others).slice(0,3).map(w=>w.m);vOpts=shuffle([vCur.m,...dist]);$('vWord').textContent=vCur.w;$('vHint').textContent='选择正确的中文释义';const box=$('vOptions');box.innerHTML='';vOpts.forEach(m=>{const b=document.createElement('div');b.className='v-opt';b.textContent=m;b.onclick=()=>choose(m,b);box.appendChild(b);});}
function choose(m,btn){if(vLocked)return;vLocked=true;const box=$('vOptions');const opts=box.querySelectorAll('.v-opt');const ok=m===vCur.m;opts.forEach(o=>{if(o.textContent===vCur.m)o.classList.add('correct');if(o===btn&&!ok)o.classList.add('wrong');o.disabled=true;});if(ok){vocab.today++;vocab.right++;$('vResult').textContent='✓ 答对了 '+vCur.w+' = '+vCur.m;$('vResult').className='v-result ok';}else{vocab.today++;vocab.wrongCnt++;if(!vocab.wrong[vCur.w])vocab.wrong[vCur.w]={m:vCur.m,times:0};vocab.wrong[vCur.w].times++;$('vResult').textContent='✗ 是 '+vCur.m;$('vResult').className='v-result no';}save(LS.vocab,vocab);renderVocabStatsOnly();renderWrongList();$('btnNext').style.display='block';}
function renderVocabStatsOnly(){$('vsToday').textContent=vocab.today;const total=vocab.right+vocab.wrongCnt;$('vsRate').textContent=total?Math.round(vocab.right/total*100)+'%':'-';$('vsWrong').textContent=Object.keys(vocab.wrong).length;}
function renderWrongList(){const box=$('wrongList');box.innerHTML='';const keys=Object.keys(vocab.wrong);if(!keys.length){box.innerHTML='<div class="empty" style="padding:20px">暂无错词，加油</div>';return}keys.forEach(k=>{const d=document.createElement('div');d.className='c-item';d.innerHTML=`<div class="info"><div class="name">${esc(k)}</div><div class="last">${esc(vocab.wrong[k].m)} · 错 ${vocab.wrong[k].times} 次</div></div>`;box.appendChild(d);});}
$('btnNext').onclick=()=>{newQuestion()};
$('btnVocabAdd').onclick=()=>{openSheet(`<div class="field"><label>英文单词</label><input id="newWord" placeholder="如：serendipity"></div><div class="field"><label>中文释义</label><input id="newMeaning" placeholder="如：意外发现珍宝的运气"></div><button class="btn wx" id="btnWordOk">添加</button><button class="btn gray" id="btnWordCancel">取消</button>`);$('btnWordOk').onclick=()=>{const w=$('newWord').value.trim(),m=$('newMeaning').value.trim();if(!w||!m){toast('单词和释义都要填');return}if(allWords().some(x=>x.w===w)){toast('这个词已经在词库里了');return}vocab.custom.push({w,m});save(LS.vocab,vocab);closeSheet();toast('已添加');newQuestion();};$('btnWordCancel').onclick=closeSheet;};
function renderChatList(){const box=$('chatList');box.innerHTML='';const pr=getProta();let items=chars.filter(c=>(chats[c.id]||[]).length).sort((a,b)=>{const la=chats[a.id]?.[chats[a.id].length-1]?.time||0;const lb=chats[b.id]?.[chats[b.id].length-1]?.time||0;return lb-la;});if(chatFilter)items=items.filter(c=>c.name.includes(chatFilter));if(!items.length){box.innerHTML=chatFilter?'<div class="empty">没有匹配的会话</div>':'<div class="empty">还没有会话<br>点右上角「＋」添加好友</div>';return;}items.forEach(c=>{const msgs=chats[c.id]||[],last=msgs[msgs.length-1];const d=document.createElement('div');d.className='c-item';const avInner=c.avatar?`<img src="${c.avatar}">`:esc(c.name[0]||'?');d.innerHTML=`<div class="av" style="background:linear-gradient(135deg,rgba(94,92,230,.7),rgba(191,90,242,.6))">${avInner}</div><div class="info"><div class="name">${esc(c.remark||c.name)}</div><div class="last">${esc((last.role==='user'?(pr.name+'：'):'')+(last.type==='image'?'[图片]':last.content))}</div></div><div class="time">${fmtTime(last.time)}</div>`;d.onclick=()=>{activeCharId=c.id;navigate({kind:'sub',id:'sub-chat'})};box.appendChild(d);});}
function renderContacts(){const box=$('contactList');box.innerHTML='';let items=chars;if(contactFilter)items=items.filter(c=>c.name.includes(contactFilter));if(!items.length){box.innerHTML=contactFilter?'<div class="empty">没有匹配的联系人</div>':'<div class="empty">通讯录空空如也<br>点右上角「＋」添加角色</div>';return;}items.forEach(c=>{const d=document.createElement('div');d.className='c-item';const avInner=c.avatar?`<img src="${c.avatar}">`:esc(c.name[0]||'?');d.innerHTML=`<div class="av" style="background:linear-gradient(135deg,rgba(94,92,230,.7),rgba(191,90,242,.6))">${avInner}</div><div class="info"><div class="name">${esc(c.remark||c.name)}</div><div class="last">${esc((c.desc||c.personality||'暂无简介')).slice(0,30)}</div></div>`;d.onclick=()=>{activeCharId=c.id;navigate({kind:'sub',id:'sub-chat'})};box.appendChild(d);});}
function renderMe(){const p=getProta();$('meName').textContent=p.name||'未设置';if(p.avatar){$('meAvatar').innerHTML=`<img src="${p.avatar}">`;}else{$('meAvatar').textContent=(p.name||'我')[0];}$('walletPreview').textContent='¥'+wallet.balance.toFixed(2);const n=moments.length;const b=$('momentsBadge');if(n){b.style.display='flex';b.textContent=n}else b.style.display='none';}
function scrollBottom(){const c=$('chatMsgList');c.scrollTop=c.scrollHeight}
function bindLongPress(el,cb){let timer=null,sx=0,sy=0;el.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;timer=setTimeout(()=>{timer=null;cb()},500)},{passive:true});el.addEventListener('touchmove',e=>{const t=e.touches[0];if(Math.abs(t.clientX-sx)>10||Math.abs(t.clientY-sy)>10)clearTimeout(timer)},{passive:true});el.addEventListener('touchend',()=>clearTimeout(timer));el.addEventListener('contextmenu',e=>{e.preventDefault();cb()});}
function renderChat(){const c=getChar(activeCharId);if(!c){back();return}$('chatTitle').textContent=c.remark||c.name;const box=$('chatMsgList');box.innerHTML='';const msgs=chats[activeCharId]||[];let lastT=0;const pr=getProta();const showAv=c.showAvatar!==false;msgs.forEach((m,idx)=>{const t=m.time||0;if(t&&(!lastT||t-lastT>300000)){const td=document.createElement('div');td.className='time-row';td.textContent=fmtTime(t);box.appendChild(td);}const isMe=m.role==='user';const d=document.createElement('div');d.className='msg '+(isMe?'me':(m.role==='system'?'sys':'other'));if(m.role!=='system'&&showAv){const av=document.createElement('div');av.className='avatar';const avSrc=isMe?pr.avatar:c.avatar;if(avSrc){const im=document.createElement('img');im.src=avSrc;av.appendChild(im);}else{av.textContent=isMe?((pr.name||'我')[0]):(c.name[0]||'?');}d.appendChild(av);}const b=document.createElement('div');b.className='bubble'+(m.type==='image'?' img':'');if(m.type==='image'){const img=document.createElement('img');img.src=m.content;img.alt='表情';img.onerror=()=>{b.textContent='[图片加载失败]';b.classList.remove('img')};b.appendChild(img);}else{b.textContent=m.content||'';}d.appendChild(b);if(m.role!=='system')bindLongPress(b,()=>msgMenu(idx));box.appendChild(d);if(t)lastT=t;});scrollBottom();}
function msgMenu(idx){const msgs=chats[activeCharId]||[];const m=msgs[idx];if(!m)return;let html=`<div class="menu-item" id="mCopy" style="border:none;border-radius:10px;margin-bottom:6px">复制</div>`;if(m.role==='assistant')html+=`<div class="menu-item" id="mRegen" style="border:none;border-radius:10px;margin-bottom:6px">重新生成这条</div>`;html+=`<div class="menu-item" id="mDel" style="border:none;border-radius:10px;color:var(--red)">删除</div><button class="btn gray" id="mCancel" style="margin-top:10px">取消</button>`;openSheet(html);$('mCopy').onclick=()=>{const txt=m.type==='image'?m.content:m.content;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>toast('已复制')).catch(()=>toast('复制失败'))}else toast('复制失败');closeSheet()};if(m.role==='assistant')$('mRegen').onclick=()=>{closeSheet();regenAt(idx)};$('mDel').onclick=()=>{msgs.splice(idx,1);save(LS.chats,chats);closeSheet();renderChat();toast('已删除')};$('mCancel').onclick=closeSheet;}
function regenAt(idx){const msgs=chats[activeCharId]||[];if(!msgs.length)return;let lastUser=-1;for(let i=idx-1;i>=0;i--){if(msgs[i].role==='user'){lastUser=i;break}}if(lastUser<0){toast('没有可重发的消息');return}const userMsg=msgs[lastUser];msgs.splice(lastUser);save(LS.chats,chats);renderChat();const text=userMsg.content;chats[activeCharId].push({role:'user',type:'text',content:text,time:Date.now()});save(LS.chats,chats);renderChat();callAI();}
function regenLast(){const msgs=chats[activeCharId]||[];if(!msgs.length){toast('还没有对话');return;}let lastAs=-1;for(let i=msgs.length-1;i>=0;i--){if(msgs[i].role==='assistant'){lastAs=i;break;}}if(lastAs<0){callAI();return;}msgs.splice(lastAs);save(LS.chats,chats);renderChat();callAI();}
function showTyping(on){const c=getChar(activeCharId);const t=$('chatTitle');if(t)t.textContent=on?'对方正在输入中…':(c?(c.remark||c.name):'聊天');}
function pushUserText(text){if(!chats[activeCharId])chats[activeCharId]=[];chats[activeCharId].push({role:'user',type:'text',content:text,time:Date.now()});save(LS.chats,chats);renderChat();}
function sendText(){const t=$('input').value.trim();if(!t)return;$('input').value='';$('input').style.height='auto';pushUserText(t);}
function speakNow(){callAI();}
function initRecog(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;const r=new SR();r.lang='zh-CN';r.continuous=false;r.interimResults=false;r.onresult=e=>{let txt='';for(let i=0;i<e.results.length;i++){txt+=e.results[i][0].transcript;}txt=txt.trim();if(txt){pushUserText(txt);}closeVoice();};r.onend=()=>closeVoice();r.onerror=()=>closeVoice();return r;}
function startVoice(){if(listening)return;if(!recog)recog=initRecog();if(!recog){toast('浏览器不支持语音输入，请用文字');return;}listening=true;try{recog.start();}catch(e){}const b=$('btnMic');if(b)b.classList.add('rec');toast('正在听…松开结束');}
function stopVoice(){if(!listening)return;listening=false;try{recog.stop();}catch(e){}const b=$('btnMic');if(b)b.classList.remove('rec');}
function closeVoice(){listening=false;const b=$('btnMic');if(b)b.classList.remove('rec');}
async function callAI(){if(sending)return;if(!st.baseurl||!st.apiKey){toast('先到「设置」填 API');return}if(!st.model){toast('先选择模型');return}const c=getChar(activeCharId);if(!c){toast('没有角色');return}sending=true;const sb=$('btnSpeak');if(sb)sb.disabled=true;showTyping(true);const list=buildMsgList(c);try{const raw=await callAPI(list,null);showTyping(false);processAI(raw,c);maybeSum(c);}catch(e){showTyping(false);toast(e.message);chats[activeCharId].push({role:'assistant',type:'text',content:'⚠️ '+e.message,time:Date.now()});save(LS.chats,chats);renderChat();}sending=false;const sb2=$('btnSpeak');if(sb2)sb2.disabled=false;scrollBottom();}
function buildMsgList(c){const msgs=chats[activeCharId]||[];const lim=c.histCount||200;const recent=msgs.slice(-lim);const clean=recent.map(m=>({role:m.role==='user'?'user':'assistant',content:m.type==='image'?'[图片]':m.content}));const sys=buildSys(clean[clean.length-1]?clean[clean.length-1].content:'',c);return [{role:'system',content:sys},...clean];}
function processAI(raw,c){if(!raw){raw='(对方没回出内容，检查模型名是否正确)'}const parts=raw.split(/<<<SPLIT>>>/).map(s=>s.trim()).filter(Boolean);if(!parts.length)parts.push(raw.trim());parts.forEach(p=>{const imgMatch=p.match(/<<<IMG:(.+?)>>>/);if(imgMatch&&p.trim()===imgMatch[0].trim()){chats[activeCharId].push({role:'assistant',type:'image',content:imgMatch[1].trim(),time:Date.now()});}else{chats[activeCharId].push({role:'assistant',type:'text',content:p,time:Date.now()});}});save(LS.chats,chats);renderChat();scrollBottom();}
function hitLore(t){if(!t)return[];return lore.filter(it=>it.keys.split(',').map(k=>k.trim()).filter(Boolean).some(k=>t.includes(k))).map(it=>it.content)}
function buildSys(last,chara){const p=[];const pr=getProta();if(pr.name&&pr.name!=='我')p.push(`你正在和「${pr.name}」对话，${pr.name}的情况：${pr.desc||'（未详细设定）'}`.trim());if(chara){p.push(`你正在扮演角色「${chara.name}」，严格贴合以下人设，不要跳出角色。`);if(chara.desc)p.push(`【背景】\n${chara.desc}`);if(chara.personality)p.push(`【性格】\n${chara.personality}`);if(chara.scenario)p.push(`【场景】\n${chara.scenario}`);if(chara.mes_example)p.push(`【对话示例·模仿其语气】\n${chara.mes_example}`);}const l=hitLore(last);if(l.length)p.push(`【世界设定·涉及相关内容时参考】\n${l.join('\n')}`);const mi=mem[chara.id];if(mi&&mi.summary)p.push(`【之前对话摘要·保持连贯，勿主动提及】\n${mi.summary}`);let s=st.sys||DEFAULT_SYS;s=s.replace(/\{name\}/g,chara?chara.name:'对方');p.push(s);p.push('【回复格式要求】\n像真人聊天一样回复，可以连续发多条短消息。需要发多条时，用 <<<SPLIT>>> 分隔每条消息。想要发表情包图片时，单独发一条 <<<IMG:图片URL>>> 格式的消息。平时简短自然回复一条即可，不要总是一大段。');return p.join('\n\n');}
async function callAPI(list,onDelta){
  const url=st.baseurl.replace(/\/+$/,'')+'/chat/completions';
  const ctrl=new AbortController();
  const tm=setTimeout(()=>ctrl.abort(),600000);
  let res;
  try{
    res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+st.apiKey},body:JSON.stringify({model:st.model,messages:list,temperature:st.temperature,max_tokens:st.maxTokens,top_p:st.topP,stream:false}),signal:ctrl.signal});
  }catch(e){
    clearTimeout(tm);
    if(e.name==='AbortError')throw new Error('请求超时（10分钟没响应），模型推理慢或中转站拥堵');
    throw new Error('请求被浏览器拦截，可能是跨域(CORS)限制，换个支持跨域的API服务或加代理');
  }
  clearTimeout(tm);
  if(!res.ok){const t=await res.text().catch(()=>'');throw new Error('HTTP '+res.status+' '+t.slice(0,120))}
  const text=await res.text();
  let j=null;
  try{j=JSON.parse(text);}catch(e){
    let full='';
    const lines=text.split('\n');
    for(const line of lines){const tt=line.trim();if(!tt.startsWith('data:'))continue;const js=tt.slice(5).trim();if(js==='[DONE]')continue;try{const chunk=JSON.parse(js);const d=chunk.choices?.[0]?.delta?.content;if(d)full+=d;}catch(_){}}
    if(full)return stripThink(full);
    throw new Error('响应解析失败');
  }
  return stripThink(extractContent(j));
}
$('btnSpeak').onclick=speakNow;
$('btnEmoji').onclick=openImgSheet;
$('btnPlus').onclick=openPlusPanel;
$('btnMic').addEventListener('touchstart',e=>{e.preventDefault();startVoice();});
$('btnMic').addEventListener('touchend',e=>{e.preventDefault();stopVoice();});
function openPlusPanel(){
  const items=[
    {name:'照片',icon:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',fn:()=>{closeSheet();openImgSheet();}},
    {name:'重新回复',icon:'<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>',fn:()=>{closeSheet();regenLast();}},
    {name:'批量发送',icon:'<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>',fn:()=>{closeSheet();openBatchSheet();}},
    {name:'钱包',icon:'<svg viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',fn:()=>{closeSheet();navigate({kind:'sub',id:'sub-wallet'});}},
    {name:'位置',icon:'<svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',fn:()=>{closeSheet();toast('位置功能待开发');}},
    {name:'红包',icon:'<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',fn:()=>{closeSheet();toast('红包功能待开发');}},
    {name:'转账',icon:'<svg viewBox="0 0 24 24"><path d="M7 10h13l-4-4"/><path d="M17 14H4l4 4"/></svg>',fn:()=>{closeSheet();toast('转账功能待开发');}},
    {name:'语音输入',icon:'<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>',fn:()=>{closeSheet();startVoice();}}
  ];
  let html='<div class="plus-grid">';
  items.forEach((it,i)=>{html+=`<div class="plus-item" id="pi_${i}"><div class="pi-ico">${it.icon}</div><div class="pi-name">${it.name}</div></div>`;});
  html+='</div>';
  openSheet(html);
  items.forEach((it,i)=>{const el=$('pi_'+i);if(el)el.onclick=it.fn;});
}
function openImgSheet(){openSheet(`<div class="field"><label>表情包图片 URL</label><input id="imgUrl" placeholder="https://.../xxx.png"></div><div style="text-align:center;color:var(--text2);font-size:12px;margin-bottom:10px">填图片直链地址，发送后显示为表情包</div><button class="btn wx" id="imgSend">发送图片</button><button class="btn gray" id="imgCancel">取消</button>`);$('imgSend').onclick=()=>{const u=$('imgUrl').value.trim();if(!u){toast('填个图片URL');return}if(!chats[activeCharId])chats[activeCharId]=[];chats[activeCharId].push({role:'user',type:'image',content:u,time:Date.now()});save(LS.chats,chats);closeSheet();renderChat();};$('imgCancel').onclick=closeSheet;}
function openBatchSheet(){openSheet(`<div class="field"><label>批量发送（每行一句）</label><textarea id="batchText" style="min-height:120px" placeholder="第一句\n第二句\n第三句"></textarea></div><button class="btn wx" id="batchSend">发送</button><button class="btn gray" id="batchCancel">取消</button>`);$('batchSend').onclick=()=>{const lines=$('batchText').value.split('\n').map(s=>s.trim()).filter(Boolean);if(!lines.length){toast('写点内容');return}closeSheet();lines.forEach(l=>pushUserText(l));};$('batchCancel').onclick=closeSheet;}
function renderLore(){const box=$('wbList');box.innerHTML='';if(!lore.length){box.innerHTML='<div class="empty">世界书是空的<br>点右下角 + 添加关键词触发的设定</div>';return}lore.forEach((it,i)=>{const d=document.createElement('div');d.className='card';d.innerHTML=`<div style="color:var(--yellow);font-size:12px;margin-bottom:6px">关键词 ${esc(it.keys)}</div><div style="color:var(--text2);font-size:13px;line-height:1.5;white-space:pre-wrap">${esc(it.content)}</div>`;const del=document.createElement('button');del.style.cssText='margin-top:10px;background:none;border:1px solid var(--red);color:var(--red);border-radius:8px;padding:5px 12px;font-size:12px;cursor:pointer';del.textContent='删除';del.onclick=()=>{lore.splice(i,1);save(LS.w,lore);renderLore()};d.appendChild(del);box.appendChild(d);});}
$('btnAddWb').onclick=()=>{openSheet(`<div class="field"><label>触发关键词（逗号分隔）</label><input id="wbKeys" placeholder="酒吧,咖啡馆,老板"></div><div class="field"><label>设定内容</label><textarea id="wbContent" style="min-height:90px"></textarea></div><button class="btn wx" id="btnWbOk">添加</button><button class="btn gray" id="btnWbCancel">取消</button>`);$('btnWbOk').onclick=()=>{const k=$('wbKeys').value.trim(),c=$('wbContent').value.trim();if(!k||!c){toast('关键词和内容都要填');return}lore.push({keys:k,content:c});save(LS.w,lore);closeSheet();renderLore();toast('已添加')};$('btnWbCancel').onclick=closeSheet;};
function renderMoments(){const box=$('momentList');box.innerHTML='';const pr=getProta();if(!moments.length){box.innerHTML='<div class="empty">朋友圈空空如也<br>点右下角发布第一条动态</div>';return}[...moments].sort((a,b)=>b.time-a.time).forEach(m=>{const d=document.createElement('div');d.className='card';const avInner=pr.avatar?`<img src="${pr.avatar}">`:esc((pr.name||'我')[0]);d.innerHTML=`<div class="c-head"><div class="c-av">${avInner}</div><div class="c-name">${esc(pr.name||'我')}</div></div><div class="c-text">${esc(m.text)}</div><div class="c-foot"><button class="like-btn ${m.liked?'liked':''}">${m.liked?'已赞':'赞'}</button><span class="c-time">${fmtTime(m.time)}</span></div>`;d.querySelector('.like-btn').onclick=()=>{m.liked=!m.liked;save(LS.moments,moments);renderMoments()};box.appendChild(d);});}
function openMomentSheet(){openSheet(`<div class="field"><label>说点什么…</label><textarea id="momentText" style="min-height:100px" placeholder="这一刻的想法…"></textarea></div><button class="btn wx" id="btnMomentOk">发布</button><button class="btn gray" id="btnMomentCancel">取消</button>`);$('btnMomentOk').onclick=()=>{const t=$('momentText').value.trim();if(!t){toast('写点东西再发');return}moments.push({id:uid(),text:t,time:Date.now(),liked:false});save(LS.moments,moments);closeSheet();renderMoments();renderMe();toast('已发布')};$('btnMomentCancel').onclick=closeSheet;}
$('miMoments').onclick=()=>navigate({kind:'sub',id:'sub-moments'});
$('btnNewMoment').onclick=openMomentSheet;
$('fabMoment').onclick=openMomentSheet;
function renderWallet(){$('walletNum').textContent='¥'+wallet.balance.toFixed(2);$('walletPreview').textContent='¥'+wallet.balance.toFixed(2);const box=$('billList');box.innerHTML='';if(!wallet.bills.length){box.innerHTML='<div class="empty">暂无账单</div>';return}[...wallet.bills].reverse().forEach(b=>{const d=document.createElement('div');d.className='bill-item';d.innerHTML=`<span class="bi-note">${esc(b.note)}</span><span class="bi-amt ${b.type}">${b.type==='in'?'+':'-'}¥${Math.abs(b.amount).toFixed(2)}</span><span class="bi-time">${fmtTime(b.time)}</span>`;box.appendChild(d);});}
function walletIn(){wallet.balance+=100;wallet.bills.push({type:'in',amount:100,note:'模拟入账',time:Date.now()});save(LS.wallet,wallet);renderWallet();toast('+¥100.00')}
function walletOut(){wallet.balance-=10;wallet.bills.push({type:'out',amount:10,note:'模拟消费（奶茶）',time:Date.now()});save(LS.wallet,wallet);renderWallet();toast('-¥10.00')}
$('btnWalletIn').onclick=walletIn;
$('btnWalletOut').onclick=walletOut;
$('miWallet').onclick=()=>navigate({kind:'sub',id:'sub-wallet'});
$('miProta').onclick=()=>navigate({kind:'sub',id:'sub-prota'});
$('meProfile').onclick=()=>navigate({kind:'sub',id:'sub-prota'});
$('cellWallpaper').onclick=()=>navigate({kind:'sub',id:'sub-wallpaper'});
$('cellAbout').onclick=()=>navigate({kind:'sub',id:'sub-about'});
function renderProta(){const box=$('protaList');box.innerHTML='';protas.forEach(p=>{const d=document.createElement('div');d.className='c-item';const avInner=p.avatar?`<img src="${p.avatar}">`:esc(p.name[0]||'?');d.innerHTML=`<div class="av" style="background:linear-gradient(135deg,rgba(10,132,255,.6),rgba(48,209,88,.5))">${avInner}</div><div class="info"><div class="name">${esc(p.name)}${p.id===protaId?' · 当前':''}</div><div class="last">${esc(p.desc||'暂无描述')}</div></div>`;d.onclick=()=>{protaId=p.id;save(LS.protaId,protaId);renderProta();renderMe();toast('已切换到 '+p.name);};box.appendChild(d);});}
$('btnProtaAdd').onclick=()=>{tmpProtaAvatar='';openSheet(`<div class="field"><label>名字</label><input id="npName" placeholder="这个主角叫什么"></div><div class="field"><label>人设描述</label><textarea id="npDesc" placeholder="性格、身份、背景…"></textarea></div><div class="field"><label>头像（可选）</label><button class="btn gray" id="btnNpAvatar">＋ 选择头像</button></div><button class="btn wx" id="npOk">创建</button><button class="btn gray" id="npCancel">取消</button>`);$('btnNpAvatar').onclick=()=>{avatarTarget='protaNew';$('fileAvatar').click();};$('npOk').onclick=()=>{const n=$('npName').value.trim();if(!n){toast('名字不能为空');return}const p={id:uid(),name:n,desc:$('npDesc').value.trim(),avatar:tmpProtaAvatar};protas.push(p);save(LS.protas,protas);protaId=p.id;save(LS.protaId,protaId);closeSheet();renderProta();renderMe();toast('已创建：'+n);};$('npCancel').onclick=closeSheet;};
$('btnWechatAdd').onclick=()=>{openSheet(`<div class="menu-item" id="mAddFriend" style="border:none;border-radius:12px;margin-bottom:8px">添加好友</div><div class="menu-item" id="mAddGroup" style="border:none;border-radius:12px">加入群聊</div><button class="btn gray" id="mWAddCancel" style="margin-top:12px">取消</button>`);$('mAddFriend').onclick=()=>{closeSheet();openAddFriendSheet();};$('mAddGroup').onclick=()=>{closeSheet();toast('群聊即将上线');};$('mWAddCancel').onclick=closeSheet;};
function openAddFriendSheet(){if(!chars.length){toast('先去通讯录创建角色');return;}let html='<div class="group-title">选择主角人设</div><div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px">';protas.forEach(p=>{const on=p.id===protaId;html+=`<div class="prota-chip" id="chip_${p.id}" style="padding:8px 14px;border-radius:20px;background:${on?'rgba(10,132,255,.22)':'rgba(255,255,255,.06)'};border:1px solid ${on?'var(--blue)':'var(--border)'};cursor:pointer;font-size:13px">${esc(p.name)}</div>`;});html+='</div><div class="group-title">选择好友</div>';chars.forEach(c=>{html+=`<div class="menu-item" id="friend_${c.id}" style="border:none;border-radius:12px;margin-bottom:6px"><span class="mi-ico" style="background:linear-gradient(135deg,rgba(94,92,230,.6),rgba(191,90,242,.5))">${c.avatar?`<img src="${c.avatar}">`:esc(c.name[0]||'?')}</span><span class="mi-name">${esc(c.name)}</span><span class="mi-chev">›</span></div>`;});html+='<button class="btn gray" id="afCancel" style="margin-top:10px">取消</button>';openSheet(html);protas.forEach(p=>{const chip=$('chip_'+p.id);if(chip)chip.onclick=()=>{protaId=p.id;save(LS.protaId,protaId);openAddFriendSheet();};});chars.forEach(c=>{const item=$('friend_'+c.id);if(item)item.onclick=()=>{closeSheet();activeCharId=c.id;navigate({kind:'sub',id:'sub-chat'});};});$('afCancel').onclick=closeSheet;}
function fillSettingsMain(){
  $('settingsModelPreview').textContent=st.model||'未设置';
  $('wallpaperName').textContent=wallpaper==='custom'?'自定义':(WALLPAPERS.find(w=>w.id===wallpaper)||WALLPAPERS[0]).name;
  $('setActive').classList.toggle('on',activeMsg.enabled);
  $('setActiveInterval').value=activeMsg.interval;
  $('setTheme').classList.toggle('on',theme==='dark');
}
function fillApiSetForm(){
  $('setBaseurl').value=st.baseurl;
  $('setKey').value=st.apiKey;
  $('setModel').textContent=st.model||'未选择';
  $('setGenBaseurl').value=st.genBaseurl||'';
  $('setGenKey').value=st.genKey||'';
  $('setGenModel').textContent=st.genModel||'未选择';
  $('setTemp').value=st.temperature;
  $('tempVal').textContent=st.temperature;
}
function saveApiSet(){
  st.baseurl=$('setBaseurl').value.trim();
  st.apiKey=$('setKey').value.trim();
  st.genBaseurl=$('setGenBaseurl').value.trim();
  st.genKey=$('setGenKey').value.trim();
  st.temperature=parseFloat($('setTemp').value);
  save(LS.s,st);
  toast('设置已保存');
}
function pickChatModel(){
  if(!st.baseurl||!st.apiKey){toast('先填 API 地址和 Key');return;}
  toast('正在拉取模型列表…');
  fetch(st.baseurl.replace(/\/+$/,'')+'/models',{headers:{'Authorization':'Bearer '+st.apiKey}})
    .then(res=>{if(!res.ok)throw new Error('HTTP '+res.status);return res.json()})
    .then(j=>{
      const arr=j.data||j.models||[];
      if(!arr.length){toast('接口返回空列表');return;}
      let html='<div class="group-title">选择模型</div>';
      arr.forEach((m,i)=>{const id=m.id||m;html+=`<div class="menu-item" id="cm_${i}" style="border:none;border-radius:12px;margin-bottom:6px"><span class="mi-name">${esc(id)}</span>${id===st.model?'<span class="mi-chev">✓</span>':''}</div>`;});
      html+='<button class="btn gray" id="cmCancel" style="margin-top:10px">取消</button>';
      openSheet(html);
      arr.forEach((m,i)=>{const id=m.id||m;const it=$('cm_'+i);if(it)it.onclick=()=>{st.model=id;save(LS.s,st);$('setModel').textContent=id;closeSheet();toast('已选 '+id);};});
      $('cmCancel').onclick=closeSheet;
    })
    .catch(e=>toast('拉取失败：'+e.message));
}
function pickGenModel(){
  if(!st.genBaseurl||!st.genKey){toast('先填生图地址和 Key');return;}
  toast('正在拉取生图模型…');
  fetch(st.genBaseurl.replace(/\/+$/,'')+'/models',{headers:{'Authorization':'Bearer '+st.genKey}})
    .then(res=>{if(!res.ok)throw new Error('HTTP '+res.status);return res.json()})
    .then(j=>{
      const arr=j.data||j.models||[];
      if(!arr.length){toast('接口返回空列表');return;}
      let html='<div class="group-title">选择生图模型</div>';
      arr.forEach((m,i)=>{const id=m.id||m;html+=`<div class="menu-item" id="gm_${i}" style="border:none;border-radius:12px;margin-bottom:6px"><span class="mi-name">${esc(id)}</span>${id===st.genModel?'<span class="mi-chev">✓</span>':''}</div>`;});
      html+='<button class="btn gray" id="gmCancel" style="margin-top:10px">取消</button>';
      openSheet(html);
      arr.forEach((m,i)=>{const id=m.id||m;const it=$('gm_'+i);if(it)it.onclick=()=>{st.genModel=id;save(LS.s,st);$('setGenModel').textContent=id;closeSheet();toast('已选 '+id);};});
      $('gmCancel').onclick=closeSheet;
    })
    .catch(e=>toast('拉取失败：'+e.message));
}
$('cellApiSettings').onclick=()=>navigate({kind:'sub',id:'sub-api-settings'});
$('cellChatModel').onclick=pickChatModel;
$('cellGenModel').onclick=pickGenModel;
$('btnSaveApi').onclick=saveApiSet;
$('setTheme').onclick=function(){this.classList.toggle('on');theme=this.classList.contains('on')?'dark':'light';save('mt3_theme',theme);applyTheme();};
$('setActive').onclick=function(){this.classList.toggle('on');activeMsg.enabled=this.classList.contains('on');save(LS.activeMsg,activeMsg);startActiveTimer();};
$('setActiveInterval').addEventListener('change',function(){activeMsg.interval=parseInt(this.value)||30;save(LS.activeMsg,activeMsg);startActiveTimer();});
$('setTemp').oninput=e=>$('tempVal').textContent=e.target.value;
async function doSum(){const c=getChar(activeCharId);if(!c){toast('先进入一个角色的聊天');return}const r=(chats[activeCharId]||[]).slice(-20);if(r.length<4){toast('对话太短，没啥好总结的');return}toast('正在总结记忆…');try{const url=st.baseurl.replace(/\/+$/,'')+'/chat/completions';const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+st.apiKey},body:JSON.stringify({model:st.model,stream:false,messages:[{role:'system',content:'你是记忆整理助手。用简体中文3-5句话概括以下对话中值得记住的信息，只输出概括。'},{role:'user',content:r.map(m=>m.role+': '+(m.type==='image'?'[图片]':m.content)).join('\n')}]})});if(!res.ok)throw new Error('HTTP '+res.status);const j=await res.json();const s=stripThink(extractContent(j)).trim();if(s){mem[activeCharId]={summary:s,lastCount:(chats[activeCharId]||[]).length};save(LS.mem,mem);renderMem();toast('记忆已更新')}}catch(e){toast('总结失败：'+e.message)}}
function maybeSum(c){const msgs=chats[c.id]||[];const info=mem[c.id]||{summary:'',lastCount:0};if(msgs.length>=20&&msgs.length-info.lastCount>=10){activeCharId=c.id;doSum()}}
function renderMem(){const info=mem[activeCharId];if(!activeCharId){$('memText').textContent='请先从微信进入一个角色的聊天，才能查看记忆';return}$('memText').textContent=(info&&info.summary)||'（暂无记忆。对话超过 20 条后可自动总结。）';}
function addChar(cd){if(!Array.isArray(chars))chars=[];const c={id:uid(),name:cd.name||'未命名',desc:cd.desc||'',personality:cd.personality||'',scenario:cd.scenario||'',first_mes:cd.first_mes||'',mes_example:cd.mes_example||'',avatar:cd.avatar||'',remark:'',showSeconds:false,showDate:true,showRead:true,showAvatar:true,histCount:200,autoMsg:false,genImgChat:false,genImgMoments:false};chars.push(c);save(LS.chars,chars);if(c.first_mes&&!(chats[c.id]||[]).length){chats[c.id]=[{role:'assistant',content:c.first_mes,time:Date.now()}];save(LS.chats,chats);}return c;}
function openSheet(html){$('sheetContent').innerHTML=html;$('sheetMask').classList.add('show');$('sheet').classList.add('show');}
function closeSheet(){$('sheetMask').classList.remove('show');$('sheet').classList.remove('show')}
$('sheetMask').onclick=closeSheet;
function openAddCharSheet(){tmpCharAvatar='';openSheet(`<div class="field"><label>名字</label><input id="newCharName" placeholder="角色叫什么"></div><div class="field"><label>性格 / 人设</label><textarea id="newCharPersonality" placeholder="ta 是什么性格，怎么说话…"></textarea></div><div class="field"><label>背景设定（可选）</label><textarea id="newCharDesc" placeholder="ta 的身份、背景故事…"></textarea></div><div class="field"><label>开场白（可选）</label><textarea id="newCharFirst" placeholder="填了的话，创建后 ta 会先发这句"></textarea></div><div class="field"><label>头像（可选）</label><button class="btn gray" id="btnNewCharAvatar">＋ 选择头像</button></div><button class="btn wx" id="btnNewCharOk">创建并聊天</button><button class="btn gray" id="btnSheetCancel">取消</button>`);$('btnNewCharAvatar').onclick=function(){avatarTarget='charNew';$('fileAvatar').click();};$('btnNewCharOk').onclick=function(){try{const n=$('newCharName').value.trim();if(!n){toast('名字不能为空');return}const c=addChar({name:n,personality:$('newCharPersonality').value.trim(),desc:$('newCharDesc').value.trim(),first_mes:$('newCharFirst').value.trim(),avatar:tmpCharAvatar});closeSheet();activeCharId=c.id;navigate({kind:'sub',id:'sub-chat'});toast('已创建：'+c.name);}catch(e){toast('创建失败：'+(e&&e.message?e.message:e))}};$('btnSheetCancel').onclick=closeSheet;}
$('btnAddChar').onclick=openAddCharSheet;
$('fileAvatar').addEventListener('change',function(){const f=this.files[0];if(!f)return;if(f.size>2*1024*1024){toast('头像太大，选 2MB 以内的');this.value='';return;}const r=new FileReader();r.onload=()=>{const img=r.result;if(avatarTarget==='charNew'){tmpCharAvatar=img;toast('头像已选，创建后生效');}else if(avatarTarget==='protaNew'){tmpProtaAvatar=img;toast('头像已选，创建后生效');}else{const c=getChar(activeCharId);if(c){c.avatar=img;save(LS.chars,chars);renderChatInfo();toast('头像已设置');}}};r.readAsDataURL(f);this.value='';});
$('fileWP').addEventListener('change',function(){const f=this.files[0];if(!f)return;if(f.size>4*1024*1024){toast('图片太大，选 4MB 以内的');this.value='';return}const reader=new FileReader();reader.onload=()=>{const img=reader.result;setCurWp('custom',img);applyWallpaper();renderWallpaper();toast('壁纸已设置');};reader.readAsDataURL(f);this.value='';});
$('btnChatMore').onclick=()=>{navigate({kind:'sub',id:'sub-chat-info'});};
function renderChatInfo(){const c=getChar(activeCharId);if(!c){back();return;}const box=$('chatInfoBody');if(!box)return;if(c.remark===undefined)c.remark='';if(c.showSeconds===undefined)c.showSeconds=false;if(c.showDate===undefined)c.showDate=true;if(c.showRead===undefined)c.showRead=true;if(c.showAvatar===undefined)c.showAvatar=true;if(c.histCount===undefined)c.histCount=200;if(c.autoMsg===undefined)c.autoMsg=false;if(c.genImgChat===undefined)c.genImgChat=false;if(c.genImgMoments===undefined)c.genImgMoments=false;let html='';html+='<div class="group-title">基础信息</div><div class="group">';html+=`<div class="cell" id="ciRemark"><span class="label">备注设置</span><span class="value">${esc(c.remark||'无')}</span><span class="chev">›</span></div>`;html+=`<div class="cell" id="ciAvatar"><span class="label">头像</span><span class="value">${c.avatar?'已设置':'未设置'}</span><span class="chev">›</span></div>`;html+='</div>';html+='<div class="group-title">外观显示</div><div class="group">';html+=`<div class="cell"><span class="label">时间显示秒数</span><div class="switch ${c.showSeconds?'on':''}" id="ciSec"></div></div>`;html+=`<div class="cell"><span class="label">时间显示日期</span><div class="switch ${c.showDate?'on':''}" id="ciDate"></div></div>`;html+=`<div class="cell"><span class="label">已读显示</span><div class="switch ${c.showRead?'on':''}" id="ciRead"></div></div>`;html+=`<div class="cell"><span class="label">头像显示</span><div class="switch ${c.showAvatar?'on':''}" id="ciShowAv"></div></div>`;html+='</div>';html+='<div class="group-title">AI 设定</div><div class="group">';html+=`<div class="cell"><span class="label">允许主动发消息</span><div class="switch ${c.autoMsg?'on':''}" id="ciAuto"></div></div>`;html+=`<div class="cell" id="ciGenChat"><span class="label">聊天生图</span><span class="value">${c.genImgChat?'开':'关'}</span><span class="chev">›</span></div>`;html+=`<div class="cell" id="ciGenMom"><span class="label">朋友圈生图</span><span class="value">${c.genImgMoments?'开':'关'}</span><span class="chev">›</span></div>`;html+='</div>';html+='<div class="group-title">历史与隐私</div><div class="group">';html+=`<div class="cell" id="ciHist"><span class="label">参考历史对话条数</span><span class="value">${c.histCount}条</span><span class="chev">›</span></div>`;html+=`<div class="cell" id="ciClear"><span class="label" style="color:var(--red)">清空聊天记录</span><span class="chev">›</span></div>`;html+='</div>';html+=`<button class="btn red" id="ciDel" style="margin-top:14px">删除联系人</button>`;box.innerHTML=html;$('ciRemark').onclick=()=>{openSheet(`<div class="field"><label>备注</label><input id="ciRemarkInput" value="${esc(c.remark||'')}" placeholder="给 ta 起个备注"></div><button class="btn wx" id="ciRemarkOk">保存</button><button class="btn gray" id="ciRemarkCancel">取消</button>`);$('ciRemarkOk').onclick=()=>{c.remark=$('ciRemarkInput').value.trim();save(LS.chars,chars);closeSheet();renderChatInfo();};$('ciRemarkCancel').onclick=closeSheet;};$('ciAvatar').onclick=()=>{avatarTarget='char';$('fileAvatar').click();};$('ciSec').onclick=()=>{c.showSeconds=!c.showSeconds;save(LS.chars,chars);renderChatInfo();};$('ciDate').onclick=()=>{c.showDate=!c.showDate;save(LS.chars,chars);renderChatInfo();};$('ciRead').onclick=()=>{c.showRead=!c.showRead;save(LS.chars,chars);renderChatInfo();};$('ciShowAv').onclick=()=>{c.showAvatar=!c.showAvatar;save(LS.chars,chars);renderChatInfo();};$('ciAuto').onclick=()=>{c.autoMsg=!c.autoMsg;save(LS.chars,chars);renderChatInfo();};$('ciGenChat').onclick=()=>{c.genImgChat=!c.genImgChat;save(LS.chars,chars);renderChatInfo();};$('ciGenMom').onclick=()=>{c.genImgMoments=!c.genImgMoments;save(LS.chars,chars);renderChatInfo();};$('ciHist').onclick=()=>{openSheet(`<div class="field"><label>参考历史对话条数</label><input id="ciHistInput" type="number" value="${c.histCount}"></div><button class="btn wx" id="ciHistOk">保存</button><button class="btn gray" id="ciHistCancel">取消</button>`);$('ciHistOk').onclick=()=>{const n=parseInt($('ciHistInput').value)||200;c.histCount=Math.max(10,Math.min(1000,n));save(LS.chars,chars);closeSheet();renderChatInfo();};$('ciHistCancel').onclick=closeSheet;};$('ciClear').onclick=()=>{if(!confirm('清空当前角色聊天记录？'))return;chats[activeCharId]=[];save(LS.chats,chats);renderChatInfo();toast('已清空');};$('ciDel').onclick=()=>{if(!confirm('删除这个联系人？聊天记录会一并删除。'))return;chars=chars.filter(x=>x.id!==activeCharId);delete chats[activeCharId];delete mem[activeCharId];save(LS.chars,chars);save(LS.chats,chats);save(LS.mem,mem);goHome();toast('已删除');};}
$('searchChat').addEventListener('input',e=>{chatFilter=e.target.value.trim();renderChatList()});
$('searchContact').addEventListener('input',e=>{contactFilter=e.target.value.trim();renderContacts()});
$('btnExport').onclick=()=>{const data={st,chars,chats,protas,protaId,wallet,moments,lore,mem,vocab,wallpaper,lockWallpaper,notifWallpaper,notifs,activeMsg,t:new Date().toISOString()};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='小手机备份.json';a.click();URL.revokeObjectURL(a.href);toast('已导出');};
$('btnImportTrigger').onclick=()=>$('fileImport').click();
$('fileImport').addEventListener('change',function(){const f=this.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d.st){st={...dset,...d.st};save(LS.s,st)}if(d.chars){chars=d.chars;save(LS.chars,chars)}if(d.chats){chats=d.chats;save(LS.chats,chats)}if(d.protas){protas=d.protas;save(LS.protas,protas)}if(d.protaId){protaId=d.protaId;save(LS.protaId,protaId)}if(d.wallet){wallet=d.wallet;save(LS.wallet,wallet)}if(d.moments){moments=d.moments;save(LS.moments,moments)}if(d.lore){lore=d.lore;save(LS.w,lore)}if(d.mem){mem=d.mem;save(LS.mem,mem)}if(d.vocab){vocab=d.vocab;save(LS.vocab,vocab)}if(d.wallpaper){wallpaper=d.wallpaper;save(LS.wallpaper,wallpaper)}if(d.lockWallpaper){lockWallpaper=d.lockWallpaper;save(LS.lockWall,lockWallpaper)}if(d.notifWallpaper){notifWallpaper=d.notifWallpaper;save(LS.notifWall,notifWallpaper)}if(d.notifs){notifs=d.notifs;save(LS.notifs,notifs)}if(d.activeMsg){activeMsg=d.activeMsg;save(LS.activeMsg,activeMsg)}applyWallpaper();renderChatList();renderContacts();renderMe();renderWallet();toast('导入成功');}catch(e){toast('导入失败：'+e.message)}};r.readAsText(f);this.value='';});
$('btnWipeAll').onclick=()=>{if(!confirm('恢复出厂设置？所有数据将被清除！'))return;localStorage.clear();location.reload();};
$('btnSummarize').onclick=doSum;
$('btnClearMemory').onclick=()=>{mem={};save(LS.mem,mem);renderMem();toast('记忆已清空')};
$('input').addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'});
$('input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();}});
function initLock(){const ls=$('lockScreen');if(!ls)return;let sy=0;ls.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;},{passive:true});ls.addEventListener('touchend',e=>{if(sy-e.changedTouches[0].clientY>40)unlock();},{passive:true});ls.addEventListener('click',e=>{if(e.target.closest('.ls-btn'))return;unlock();});}
function unlock(){const ls=$('lockScreen');if(!ls)return;if(!ls.classList.contains('show'))return;ls.classList.remove('show');ls.classList.add('hide');}
function initLockMusic(){try{const raw=localStorage.getItem('lastSong');if(raw){const o=JSON.parse(raw);if(o&&o.name){const st=o.playing?'正在播放':'已暂停';const title=o.name+(o.artist&&o.artist!=='未知歌手'?' - '+o.artist:'');const ls=$('lsMusic'),np=$('npMusic');if(ls){ls.style.display='flex';$('lsMusicTitle').textContent=title;$('lsMusicStatus').textContent=st;}if(np){np.style.display='flex';$('npMusicTitle').textContent=title;$('npMusicStatus').textContent=st;}}}}catch(e){}}
$('lsFlash').onclick=(e)=>{e.stopPropagation();const ls=$('lockScreen');if(!ls)return;let mask=document.getElementById('flashMask');if(!mask){mask=document.createElement('div');mask.id='flashMask';ls.appendChild(mask);}mask.classList.add('on');setTimeout(()=>mask.classList.remove('on'),1500);};
$('lsCam').onclick=(e)=>{e.stopPropagation();toast('相机占位');};
function initNotif(){let sy=0,sx=0;document.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;sx=e.touches[0].clientX;},{passive:true});document.addEventListener('touchend',e=>{const dy=e.changedTouches[0].clientY-sy;const dx=e.changedTouches[0].clientX-sx;if(sy<50&&dy>60&&Math.abs(dx)<40)openNotif();},{passive:true});const np=$('notifPanel');if(np){let npy=0;np.addEventListener('touchstart',e=>{npy=e.touches[0].clientY;},{passive:true});np.addEventListener('touchend',e=>{if(npy-e.changedTouches[0].clientY>40)closeNotif();},{passive:true});}}
function openNotif(){const np=$('notifPanel');if(np)np.classList.add('show');}
function closeNotif(){const np=$('notifPanel');if(np)np.classList.remove('show');}
$('btnCloseNotifs').onclick=closeNotif;
function renderNotifs(){const box=$('notifList');if(!box)return;box.innerHTML='';if(!notifs.length){box.innerHTML='<div class="empty" style="padding:30px">暂无通知</div>';return;}notifs.forEach(n=>{const d=document.createElement('div');d.className='notif-item';d.innerHTML=`<div class="ni-av" style="background:linear-gradient(135deg,rgba(94,92,230,.7),rgba(191,90,242,.6))">${esc(n.charName[0]||'?')}</div><div class="ni-info"><div class="ni-name">${esc(n.charName)}</div><div class="ni-text">${esc(n.content)}</div></div><div class="ni-time">${fmtTime(n.time)}</div><button class="ni-clear">清除</button>`;d.querySelector('.ni-clear').onclick=(e)=>{e.stopPropagation();notifs=notifs.filter(x=>x.id!==n.id);save(LS.notifs,notifs);renderNotifs();};d.onclick=()=>{notifs=notifs.filter(x=>x.id!==n.id);save(LS.notifs,notifs);closeNotif();activeCharId=n.charId;navigate({kind:'sub',id:'sub-chat'});};box.appendChild(d);});}
function startActiveTimer(){if(activeTimer){clearInterval(activeTimer);activeTimer=null;}if(!activeMsg.enabled)return;activeTimer=setInterval(()=>{proactiveTick();},Math.max(5,activeMsg.interval)*60*1000);}
async function proactiveTick(){if(sending)return;if(!st.baseurl||!st.apiKey||!st.model)return;if(!chars.length)return;const c=chars[Math.floor(Math.random()*chars.length)];const sys=buildProactiveSys(c);try{const url=st.baseurl.replace(/\/+$/,'')+'/chat/completions';const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+st.apiKey},body:JSON.stringify({model:st.model,stream:false,messages:[{role:'system',content:sys}],temperature:st.temperature,max_tokens:st.maxTokens})});if(!res.ok)return;const j=await res.json();const text=stripThink(extractContent(j)).trim();if(!text)return;if(!chats[c.id])chats[c.id]=[];chats[c.id].push({role:'assistant',type:'text',content:text,time:Date.now()});save(LS.chats,chats);const top=stack[stack.length-1];const inChat=top&&top.kind==='sub'&&top.id==='sub-chat'&&activeCharId===c.id;if(!inChat){notifs.unshift({id:uid(),charId:c.id,charName:c.name,content:text,time:Date.now()});save(LS.notifs,notifs);renderNotifs();}if(activeCharId===c.id)renderChat();renderChatList();}catch(e){}}
function buildProactiveSys(c){const pr=getProta();const p=[];p.push(`你正在扮演角色「${c.name}」。`);if(c.personality)p.push(`【性格】\n${c.personality}`);if(c.desc)p.push(`【背景】\n${c.desc}`);p.push(`现在你要主动给「${pr.name||'对方'}」发一条消息，开启一个新话题。自然生活化，像真人一样，不要问"在吗"这种废话，不要解释你在做什么，直接说。简短一条即可。`);return p.join('\n\n');}
applyTheme();
initLock();
initNotif();
initLockMusic();
renderNotifs();
startActiveTimer();
if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(regs=>{regs.forEach(r=>r.unregister())}).catch(()=>{});}
applyWallpaper();
renderChatList();renderContacts();renderMe();renderWallet();
renderView();
/* ===== 音乐 ===== */
const DB_NAME='mini-phone-db',DB_VER=1,STORE='songs';
let _dbp=null;
function openDB(){if(_dbp)return _dbp;_dbp=new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VER);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});return _dbp;}
function idbReq(req){return new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});}
async function idbPut(song){const db=await openDB();const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(song);return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
async function idbAll(){const db=await openDB();const tx=db.transaction(STORE,'readonly');return idbReq(tx.objectStore(STORE).getAll());}
async function idbDel(id){const db=await openDB();const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
let musicList=[];
let curSong=null;
let curIdx=-1;
let audioEl=null;
let lrcParsed=[];
const AUDIO_EXT=['mp3','wav','flac','m4a','aac','ogg','opus','oga','mid','midi','aiff','aif'];
async function loadMusicList(){musicList=await idbAll();musicList.sort((a,b)=>(b.addedAt||0)-(a.addedAt||0));renderSongList();}
function renderSongList(){
  const box=$('songList');if(!box)return;
  if(!musicList.length){box.innerHTML='<div class="empty">还没有音乐<br>点右上角「＋导入」加歌</div>';return;}
  box.innerHTML='';
  musicList.forEach((s,i)=>{
    const d=document.createElement('div');d.className='c-item song-item';
    const coverHtml=s.cover?`<img class="song-cover" src="${s.cover}">`:`<div class="song-cover song-cover-ph"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>`;
    d.innerHTML=`${coverHtml}<div class="info"><div class="name">${esc(s.name)}</div><div class="last">${esc(s.artist||'未知歌手')}</div></div>`;
    d.onclick=()=>{curIdx=i;playSong(s);};
    box.appendChild(d);
  });
}
async function playSong(s){
  curSong=s;
  if(!audioEl){
    audioEl=new Audio();
    audioEl.addEventListener('timeupdate',onTimeUpdate);
    audioEl.addEventListener('loadedmetadata',onMeta);
    audioEl.addEventListener('ended',()=>{if(curIdx<musicList.length-1){curIdx++;playSong(musicList[curIdx]);}});
    audioEl.addEventListener('error',()=>{toast('这格式可能播不了，试试 mp3/wav/flac/m4a');setPlayIcon(false);const d=$('disc');if(d)d.classList.remove('spin');});
  }
  if(audioEl.src)URL.revokeObjectURL(audioEl.src);
  audioEl.src=URL.createObjectURL(s.audio);
  lrcParsed=parseLrc(s.lrc||'');
  renderPlayer(s);
  navigate({kind:'sub',id:'sub-player'});
  const d=$('disc');if(d)d.classList.add('spin');
  try{localStorage.setItem('lastSong',JSON.stringify({name:s.name,artist:s.artist,playing:true}));}catch(e){}
  updateLockMusic();
  audioEl.play().catch(()=>{});
}
function updateLockMusic(){
  const s=curSong;
  const st=(audioEl&&!audioEl.paused)?'正在播放':'已暂停';
  const ls=$('lsMusic'),np=$('npMusic');
  if(s){
    const title=s.name+(s.artist&&s.artist!=='未知歌手'?' - '+s.artist:'');
    if(ls){ls.style.display='flex';$('lsMusicTitle').textContent=title;$('lsMusicStatus').textContent=st;}
    if(np){np.style.display='flex';$('npMusicTitle').textContent=title;$('npMusicStatus').textContent=st;}
  }else{
    if(ls)ls.style.display='none';
    if(np)np.style.display='none';
  }
  updateMusicBar();
}
function updateMusicBar(){
  if(!audioEl||!isFinite(audioEl.duration)||audioEl.duration<=0)return;
  const p=Math.min(100,audioEl.currentTime/audioEl.duration*100);
  const f1=$('lsMusicFill'),f2=$('npMusicFill');
  if(f1)f1.style.width=p+'%';
  if(f2)f2.style.width=p+'%';
}
function onMeta(){const d=audioEl.duration;if(isFinite(d)){$('pDur').textContent=fmtDur(d);$('pSeek').max=Math.floor(d);}}
function onTimeUpdate(){const t=audioEl.currentTime;$('pCur').textContent=fmtDur(t);$('pSeek').value=Math.floor(t);updateLrc(t);updateMusicBar();}
function fmtDur(s){s=Math.floor(s);const m=Math.floor(s/60),sec=s%60;return m+':'+String(sec).padStart(2,'0');}
function setPlayIcon(playing){
  const play=$('pPlay').querySelector('.icp-play');
  const pause=$('pPlay').querySelector('.icp-pause');
  if(play&&pause){play.style.display=playing?'none':'block';pause.style.display=playing?'block':'none';}
}
function renderPlayer(s){
  $('pName').textContent=s.name;
  $('pArtist').textContent=s.artist||'未知歌手';
  const cv=$('pCover');
  const ph=document.querySelector('.disc-cover-ph');
  if(s.cover){cv.src=s.cover;cv.style.display='block';if(ph)ph.style.display='none';}
  else{cv.style.display='none';if(ph)ph.style.display='flex';}
  $('pCur').textContent='0:00';$('pDur').textContent='0:00';$('pSeek').value=0;$('pSeek').max=0;
  setPlayIcon(true);
  renderLrc();
}
function renderLrc(){
  const box=$('pLyrics');if(!box)return;
  if(!lrcParsed.length){box.innerHTML='<div class="empty" style="padding:20px">暂无歌词<br><span style="font-size:12px">导入 .lrc 歌词后这里会滚动显示</span></div>';return;}
  box.innerHTML='';
  lrcParsed.forEach((l,i)=>{const d=document.createElement('div');d.className='lrc-line';d.textContent=l.text;d.onclick=()=>{if(audioEl&&isFinite(audioEl.duration))audioEl.currentTime=l.t;};box.appendChild(d);});
}
function updateLrc(t){
  const lines=document.querySelectorAll('.lrc-line');if(!lines.length)return;
  let cur=-1;
  for(let i=0;i<lrcParsed.length;i++){if(lrcParsed[i].t<=t)cur=i;else break;}
  lines.forEach((el,i)=>el.classList.toggle('on',i===cur));
  if(cur>=0){try{lines[cur].scrollIntoView({block:'center',behavior:'smooth'});}catch(e){}}
}
function parseLrc(lrc){
  const res=[];
  (lrc||'').split('\n').forEach(line=>{
    const ms=line.match(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g);
    if(!ms)return;
    const text=line.replace(/\[[^\]]*\]/g,'').trim();
    if(!text)return;
    ms.forEach(m=>{
      const mm=m.match(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/);
      const min=+mm[1],sec=+mm[2],f=mm[3]||'0';
      const msNum=+f*(f.length===1?100:f.length===2?10:1);
      res.push({t:min*60+sec+msNum/1000,text});
    });
  });
  res.sort((a,b)=>a.t-b.t);
  return res;
}
$('pPlay').onclick=()=>{if(!audioEl)return;if(audioEl.paused){audioEl.play();setPlayIcon(true);const d=$('disc');if(d)d.classList.add('spin');try{localStorage.setItem('lastSong',JSON.stringify({name:curSong?curSong.name:'',artist:curSong?curSong.artist:'',playing:true}));}catch(e){}updateLockMusic();}else{audioEl.pause();setPlayIcon(false);const d=$('disc');if(d)d.classList.remove('spin');try{localStorage.setItem('lastSong',JSON.stringify({name:curSong?curSong.name:'',artist:curSong?curSong.artist:'',playing:false}));}catch(e){}updateLockMusic();}};
$('pPrev').onclick=()=>{if(curIdx>0){curIdx--;playSong(musicList[curIdx]);}};
$('pNext').onclick=()=>{if(curIdx<musicList.length-1){curIdx++;playSong(musicList[curIdx]);}};
$('pSeek').addEventListener('input',e=>{if(audioEl&&isFinite(audioEl.duration))audioEl.currentTime=+e.target.value;});
$('btnImportSong').onclick=()=>{openSheet(`<div class="menu-item" id="impAudio" style="border:none;border-radius:12px;margin-bottom:8px">导入音频（可多选）</div><div class="menu-item" id="impLrc" style="border:none;border-radius:12px;margin-bottom:8px">导入歌词（.lrc/.txt）</div><div class="menu-item" id="impCover" style="border:none;border-radius:12px">导入封面</div><button class="btn gray" id="impCancel" style="margin-top:12px">取消</button>`);$('impAudio').onclick=()=>{closeSheet();$('fileAudio').click();};$('impLrc').onclick=()=>{closeSheet();$('fileLrc').click();};$('impCover').onclick=()=>{closeSheet();$('fileCover').click();};$('impCancel').onclick=closeSheet;};
$('fileAudio').addEventListener('change',function(){
  const all=[...this.files];if(!all.length)return;
  const pending=all.filter(f=>{const ext=(f.name.split('.').pop()||'').toLowerCase();return AUDIO_EXT.includes(ext);});
  const skipped=all.length-pending.length;
  if(!pending.length){toast('没识别到音频（支持 mp3/wav/flac/m4a/aac）');this.value='';return;}
  const files=pending.map(f=>({name:f.name.replace(/\.[^.]+$/,''),artist:'未知歌手',audio:f,cover:'',lrc:''}));
  (async()=>{
    for(const p of files){await idbPut({id:uid(),name:p.name,artist:p.artist,audio:p.audio,cover:p.cover,lrc:p.lrc,addedAt:Date.now()});}
    this.value='';
    await loadMusicList();
    toast('已导入 '+files.length+' 首'+(skipped?'，跳过 '+skipped+' 个非音频文件':''));
  })().catch(e=>toast('导入失败：'+e.message));
});
$('fileLrc').addEventListener('change',function(){
  const f=this.files[0];if(!f)return;
  const r=new FileReader();r.onload=()=>{
    const text=r.result;
    const target=curSong||musicList[0];
    if(target){target.lrc=text;idbPut(target).then(()=>{toast('歌词已绑定「'+target.name+'」');loadMusicList();if(curSong&&curSong.id===target.id){lrcParsed=parseLrc(text);renderLrc();}});}
    else toast('先导入音频，再导歌词');
  };
  r.readAsText(f);this.value='';
});
$('fileCover').addEventListener('change',function(){
  const f=this.files[0];if(!f)return;
  const r=new FileReader();r.onload=()=>{
    const data=r.result;
    const target=curSong||musicList[0];
    if(target){target.cover=data;idbPut(target).then(()=>{toast('封面已绑定「'+target.name+'」');loadMusicList();if(curSong&&curSong.id===target.id){renderPlayer(curSong);}});}
    else toast('先导入音频，再导封面');
  };
  r.readAsDataURL(f);this.value='';
});
$('btnListenTogether').onclick=()=>{
  if(!curSong){toast('先放首歌');return;}
  if(!chars.length){toast('先去微信建个角色');return;}
  let html='<div class="group-title">选谁一起听</div>';
  chars.forEach(c=>{html+=`<div class="menu-item" id="lt_${c.id}" style="border:none;border-radius:12px;margin-bottom:6px"><span class="mi-ico" style="background:linear-gradient(135deg,rgba(94,92,230,.6),rgba(191,90,242,.5))">${esc(c.name[0]||'?')}</span><span class="mi-name">${esc(c.name)}</span></div>`;});
  html+='<button class="btn gray" id="ltCancel" style="margin-top:10px">取消</button>';
  openSheet(html);
  chars.forEach(c=>{const it=$('lt_'+c.id);if(it)it.onclick=()=>{closeSheet();startListen(c);};});
  $('ltCancel').onclick=closeSheet;
};
async function startListen(c){
  if(!st.baseurl||!st.apiKey){toast('先到设置填 API');return;}
  if(!st.model){toast('先选模型');return;}
  const panel=$('listenPanel');if(!panel)return;
  panel.style.display='flex';
  $('listenChar').textContent=c.name;
  $('listenLog').innerHTML='<div class="empty" style="padding:20px">'+esc(c.name)+' 正在听《'+esc(curSong.name)+'》…</div>';
  const lyric=lrcParsed.map(l=>l.text).join('\n')||'(无歌词)';
  const sys=buildListenSys(c,curSong,lyric);
  try{
    const url=st.baseurl.replace(/\/+$/,'')+'/chat/completions';
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+st.apiKey},body:JSON.stringify({model:st.model,stream:false,messages:[{role:'system',content:sys}],temperature:st.temperature,max_tokens:st.maxTokens})});
    if(!res.ok){const t=await res.text().catch(()=>'');throw new Error('HTTP '+res.status+' '+t.slice(0,80));}
    const j=await res.json();
    const raw=stripThink(extractContent(j));
    const parts=raw.split(/<<<SPLIT>>>/).map(s=>s.trim()).filter(Boolean);
    $('listenLog').innerHTML='';
    (parts.length?parts:['（ta 没说话，就静静听着）']).forEach((p,idx)=>{setTimeout(()=>addListenMsg(c,p),idx*900);});
  }catch(e){
    $('listenLog').innerHTML='<div class="empty" style="padding:20px">⚠️ '+esc(e.message)+'</div>';
  }
}
function addListenMsg(c,text){
  const log=$('listenLog');if(!log)return;
  const d=document.createElement('div');d.className='listen-msg';
  d.innerHTML=`<div class="lm-av" style="background:linear-gradient(135deg,rgba(94,92,230,.7),rgba(191,90,242,.6))">${esc(c.name[0]||'?')}</div><div class="lm-bubble">${esc(text)}</div>`;
  log.appendChild(d);log.scrollTop=log.scrollHeight;
}
function buildListenSys(c,song,lyric){
  const pr=getProta();
  const p=[];
  p.push(`你正在扮演角色「${c.name}」，严格贴合人设，不要跳出角色。`);
  if(c.personality)p.push(`【性格】\n${c.personality}`);
  if(c.desc)p.push(`【背景】\n${c.desc}`);
  if(c.mes_example)p.push(`【对话示例】\n${c.mes_example}`);
  p.push(`现在你和「${pr.name||'对方'}」一起在听一首歌：\n《${song.name}》 - ${song.artist||'未知歌手'}\n\n歌词如下：\n${lyric}`);
  p.push(`请以角色的口吻，自然地对这首歌发表反应：可以跟唱几句歌词、说说听这首歌的感想、联想到自己的事。像真人一边听歌一边和身边人闲聊那样，口语化、简短。用 <<<SPLIT>>> 分隔你要说的多条短消息。不要一大段，不要解释设定。`);
  return p.join('\n\n');
}
$('listenClose').onclick=()=>{$('listenPanel').style.display='none';};
loadMusicList();
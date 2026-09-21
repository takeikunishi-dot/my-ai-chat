const P={FU:'歩',KY:'香',KE:'桂',GI:'銀',KI:'金',KA:'角',HI:'飛',OU:'玉'};
const PROM={FU:'と',KY:'杏',KE:'圭',GI:'全',KA:'馬',HI:'龍'};
const VAL={FU:100,KY:300,KE:350,GI:450,KI:550,KA:850,HI:1000,OU:10000};
const GOLD=['FU','KY','KE','GI'];
const D={OU:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],KI:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1]],GI:[[1,1],[-1,1],[1,-1],[-1,-1],[0,-1]],KE:[[1,-2],[-1,-2]],FU:[[0,-1]],KY:[[0,-1]],KA:[[1,1],[1,-1],[-1,1],[-1,-1]],HI:[[1,0],[-1,0],[0,1],[0,-1]]};
let board,turn,hands,history=[],selected=null,lastMove=null,gameOver=false,aiBusy=false;
const empty=()=>Array.from({length:9},()=>Array(9).fill(null));
function initialBoard(){const b=empty(),back=['KY','KE','GI','KI','OU','KI','GI','KE','KY'];back.forEach((p,x)=>{b[8][x]={p,s:0};b[0][8-x]={p,s:1}});b[7][1]={p:'HI',s:0};b[1][7]={p:'HI',s:1};b[7][7]={p:'KA',s:0};b[1][1]={p:'KA',s:1};for(let x=0;x<9;x++){b[6][x]={p:'FU',s:0};b[2][x]={p:'FU',s:1}}return b}
function reset(){board=initialBoard();turn=0;hands=[{},{}];history=[];selected=null;lastMove=null;gameOver=false;render();}
function snap(){return{b:board.map(r=>r.map(c=>c&&{...c})),h:hands.map(h=>({...h})),t:turn}}
function load(st){board=st.b.map(r=>r.map(c=>c&&{...c}));hands=st.h.map(h=>({...h}));turn=st.t}
const inside=(x,y)=>x>=0&&x<9&&y>=0&&y<9;
const base=c=>c.p[0]==='+'?c.p.slice(1):c.p;
const forward=s=>s===0?-1:1;
function inZone(s,y){return s===0?y<=2:y>=6}
function mustPromote(q,s,y){return q==='FU'||q==='KY'? (s===0?y===0:y===8) : q==='KE' ? (s===0?y<=1:y>=7) : false}
function dropOK(b,s,q,x,y){if(b[y][x])return false;if(mustPromote(q,s,y))return false;if(q==='FU'){for(let yy=0;yy<9;yy++){const c=b[yy][x];if(c&&c.s===s&&base(c)==='FU'&&c.p[0]!=='+' )return false}}return true}
function pseudo(b,h,s,withDrops=true){const out=[];for(let y=0;y<9;y++)for(let x=0;x<9;x++){const c=b[y][x];if(!c||c.s!==s)continue;const q=base(c),prom=c.p[0]==='+',f=forward(s);let ds;
 if(prom) ds=GOLD.includes(q)?D.KI:q==='KA'?D.KA:q==='HI'?D.HI:D.KI; else ds=D[q];
 if(q==='KA'||q==='HI'||(prom&&(q==='KA'||q==='HI'))){for(const [dx,dy0] of ds){let xx=x+dx,yy=y+dy0;while(inside(xx,yy)){if(!b[yy][xx])out.push({fx:x,fy:y,tx:xx,ty:yy});else{if(b[yy][xx].s!==s)out.push({fx:x,fy:y,tx:xx,ty:yy});break}xx+=dx;yy+=dy0}}}
 else if(q==='KY'&&!prom){for(let yy=y+f;inside(x,yy);yy+=f){if(!b[yy][x])out.push({fx:x,fy:y,tx:x,ty:yy});else{if(b[yy][x].s!==s)out.push({fx:x,fy:y,tx:x,ty:yy});break}}}
 else for(const [dx,dy0] of ds){const xx=x+dx,yy=y+dy0*f;if(inside(xx,yy)&&(!b[yy][xx]||b[yy][xx].s!==s))out.push({fx:x,fy:y,tx:xx,ty:yy})}
 }
 if(withDrops)for(const q in h[s])if(h[s][q]>0)for(let y=0;y<9;y++)for(let x=0;x<9;x++)if(dropOK(b,s,q,x,y))out.push({drop:q,tx:x,ty:y});return out}
function king(b,s){for(let y=0;y<9;y++)for(let x=0;x<9;x++)if(b[y][x]?.s===s&&base(b[y][x])==='OU')return[x,y];return null}
function attacked(b,h,s,x,y){return pseudo(b,h,s,false).some(m=>m.tx===x&&m.ty===y)}
function checked(b,h,s){const k=king(b,s);return !k||attacked(b,h,1-s,k[0],k[1])}
function apply(st,m,prom=false){const b=st.b,h=st.h,s=st.t;if(m.drop){h[s][m.drop]--;b[m.ty][m.tx]={p:m.drop,s}}else{const c=b[m.fy][m.fx],cap=b[m.ty][m.tx];if(cap){const q=base(cap);h[s][q]=(h[s][q]||0)+1}b[m.fy][m.fx]=null;b[m.ty][m.tx]={p:prom?'+'+base(c):base(c),s}}st.t=1-s;return st}
function legal(s){const out=[];for(const m of pseudo(board,hands,s)){const c=m.drop?null:board[m.fy][m.fx];let choices=[false];if(c&&inZone(s,m.fy)||c&&inZone(s,m.ty))choices=[false,true];for(const pr of choices){if(c&&mustPromote(base(c),s,m.ty)&&!pr)continue;const st=snap();apply(st,m,pr);if(!checked(st.b,st.h,s))out.push({...m,prom:pr})}}return out}
function text(m){if(m.drop)return'持駒'+P[m.drop]+'打';const c=board[m.fy][m.fx];return `${m.tx+1}${m.ty+1}${P[base(c)]}${m.prom?'成':''}`}
function same(a,b){return a.fx===b.fx&&a.fy===b.fy&&a.tx===b.tx&&a.ty===b.ty&&a.drop===b.drop&&!!a.prom===!!b.prom}
function play(m){const lm=legal(turn),v=lm.find(x=>same(x,m));if(!v||gameOver)return;history.push({state:snap(),text:text(v)});apply({b:board,h:hands,t:turn},v,v.prom);lastMove=v;selected=null;turn=1-turn;render();finishCheck()}
function finishCheck(){const lm=legal(turn);if(!lm.length){gameOver=true;render();document.querySelector('#reviewBox').innerHTML=`<strong>${turn?'先手':'後手'}の勝ち。</strong><br>${checked(board,hands,turn)?'詰みです。':'合法手がありません。'}`}}
function render(){const el=document.querySelector('#board');el.innerHTML='';const targets=selected?legal(turn).filter(m=>selected.drop?m.drop===selected.drop:m.fx===selected.x&&m.fy===selected.y):[];for(let y=0;y<9;y++)for(let x=0;x<9;x++){const d=document.createElement('div');d.className='sq';const c=board[y][x];if(selected&&!selected.drop&&selected.x===x&&selected.y===y)d.classList.add('select');if(targets.some(m=>m.tx===x&&m.ty===y))d.classList.add('target');if(lastMove&&((lastMove.tx===x&&lastMove.ty===y)||(lastMove.fx===x&&lastMove.fy===y)))d.classList.add('last');if(c){const s=document.createElement('span');s.className='piece '+(c.s?'gote':'');s.textContent=c.p[0]==='+'?PROM[base(c)]:P[base(c)];d.appendChild(s)}d.onclick=()=>square(x,y);el.appendChild(d)}document.querySelector('#turn').textContent=gameOver?'対局終了':(turn===0?'先手の番':'後手の番');renderHands();const ml=document.querySelector('#moves');ml.innerHTML=history.map((h,i)=>`<li>${i+1}. ${h.text}</li>`).join('');ml.scrollTop=ml.scrollHeight}
function renderHands(){for(let s=0;s<2;s++){const el=document.querySelector(s?'#handGote':'#handSente');el.innerHTML='';for(const q of ['FU','KY','KE','GI','KI','KA','HI'])if(hands[s][q]){const b=document.createElement('button');b.className='handpiece'+(selected?.drop===q&&selected?.s===s?' selected':'');b.innerHTML=P[q]+`<small>${hands[s][q]}</small>`;b.onclick=()=>{if(turn===s){selected={drop:q,s};render()}};el.appendChild(b)}}}
function square(x,y){if(turn!==0&&!aiBusy)return;if(selected?.drop){const m=legal(turn).find(m=>m.drop===selected.drop&&m.tx===x&&m.ty===y);if(m)play(m);return}const c=board[y][x];if(selected){const ms=legal(turn).filter(m=>m.fx===selected.x&&m.fy===selected.y&&m.tx===x&&m.ty===y);if(ms.length){let m=ms[0];if(ms.some(z=>z.prom)&&ms.some(z=>!z.prom))m=confirm('成りますか？')?ms.find(z=>z.prom):ms.find(z=>!z.prom);play(m);return}}if(c?.s===turn){selected={x,y};render()}}
function evaluate(b){let e=0;for(const row of b)for(const c of row)if(c){let v=VAL[base(c)]||0;if(c.p[0]==='+')v+=80;e+=c.s===0?v:-v}return e}
function clone(st){return{b:st.b.map(r=>r.map(c=>c&&{...c})),h:st.h.map(h=>({...h})),t:st.t}}
function search(st,depth,alpha=-Infinity,beta=Infinity){const ms=(()=>{const save=snap();load(st);const r=legal(st.t);load(save);return r})();if(!ms.length)return st.t===0?999999:-999999;if(depth<=0)return evaluate(st.b);if(st.t===0){let v=-Infinity;for(const m of ms){v=Math.max(v,search(apply(clone(st),m,m.prom),depth-1,alpha,beta));alpha=Math.max(alpha,v);if(alpha>=beta)break}return v}else{let v=Infinity;for(const m of ms){v=Math.min(v,search(apply(clone(st),m,m.prom),depth-1,alpha,beta));beta=Math.min(beta,v);if(alpha>=beta)break}return v}}
function aiPick(){const ms=legal(1);if(!ms.length)return null;const depth=+document.querySelector('#depth').value;let best=ms[0],score=Infinity;for(const m of ms){const v=search(apply(clone(snap()),m,m.prom),depth-1);if(v<score){score=v;best=m}}return best}
async function ai(){if(gameOver||turn!==1||aiBusy)return;aiBusy=true;document.querySelector('#aiMove').disabled=true;await new Promise(r=>setTimeout(r,100));const m=aiPick();if(m)play(m);aiBusy=false;document.querySelector('#aiMove').disabled=false}
async function review(){
 const box=document.querySelector('#reviewBox');
 if(!history.length){box.textContent='まず対局を始めてください。';return}
 box.textContent='Geminiが棋譜を分析中…';
 const moves=history.map(h=>h.text);
 try{
   const r=await fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({moves})});
   const data=await r.json();
   if(!r.ok) throw new Error(data.error||'AI感想戦に失敗しました。');
   box.innerHTML='<strong>Gemini AI感想戦</strong><br><br>'+String(data.text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
 }catch(e){box.textContent='AI感想戦エラー：'+e.message;}
}
document.querySelector('#newGame').onclick=reset;document.querySelector('#undo').onclick=()=>{if(!history.length)return;load(history.pop().state);gameOver=false;selected=null;lastMove=null;render()};document.querySelector('#aiMove').onclick=ai;document.querySelector('#review').onclick=review;reset();

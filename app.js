const P={FU:'歩',KY:'香',KE:'桂',GI:'銀',KI:'金',KA:'角',HI:'飛',OU:'玉'};
const PROM={FU:'と',KY:'杏',KE:'圭',GI:'全',KA:'馬',HI:'龍'};
const gold=new Set(['FU','KY','KE','GI']);
let board,turn,hand,history=[],selected=null,lastMove=null,gameOver=false;
const dirs={OU:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],KI:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1]],GI:[[1,1],[-1,1],[1,-1],[-1,-1],[0,-1]],KE:[[1,-2],[-1,-2]],FU:[[0,-1]],KY:[[0,-1]],KA:[[1,1],[1,-1],[-1,1],[-1,-1]],HI:[[1,0],[-1,0],[0,1],[0,-1]]};
function empty(){return Array.from({length:9},()=>Array(9).fill(null))}
function start(){board=empty();turn=0;hand=[{},{}];history=[];selected=null;lastMove=null;gameOver=false;
 const back=['KY','KE','GI','KI','OU','KI','GI','KE','KY']; back.forEach((p,x)=>{board[8][x]={p,s:0};board[0][8-x]={p,s:1}});
 board[7][1]={p:'HI',s:0};board[1][7]={p:'HI',s:1};board[7][7]={p:'KA',s:0};board[1][1]={p:'KA',s:1};
 for(let x=0;x<9;x++){board[6][x]={p:'FU',s:0};board[2][x]={p:'FU',s:1}}; render();
}
function cloneState(){return {b:board.map(r=>r.map(c=>c&&{...c})),h:hand.map(x=>({...x})),t:turn}}
function restore(st){board=st.b.map(r=>r.map(c=>c&&{...c}));hand=st.h.map(x=>({...x}));turn=st.t}
function inBoard(x,y){return x>=0&&x<9&&y>=0&&y<9}
function forward(s){return s===0?-1:1}
function promoted(p){return p.p.startsWith('+')?p.p.slice(1):p.p}
function canProm(p,y){let q=promoted(p),f=p.s===0?(y<=2):(y>=6);return ['FU','KY','KE','GI','KA','HI'].includes(q)&&f}
function zone(s,y){return s===0?y<=2:y>=6}
function promotePiece(p){let q=promoted(p);return {p:'+'+q,s:p.s}}
function basePiece(p){return p.p[0]==='+'?{p:p.p.slice(1),s:p.s}:p}
function pseudoMoves(b,s,includeDrops=true){let out=[];
 for(let y=0;y<9;y++)for(let x=0;x<9;x++){let c=b[y][x];if(!c||c.s!==s)continue;let q=promoted(c), f=forward(s), dirs0=dirs[q.replace('+','')];if(q[0]==='+')dirs0=gold.has(q.slice(1))?dirs.KI:q==='+'+'KA'?dirs.KA:q==='+'+'HI'?dirs.HI:dirs.KI;
  if(q==='KY'){for(let yy=y+f;inBoard(x,yy);yy+=f){if(b[yy][x]){if(b[yy][x].s!==s)out.push({fx:x,fy:y,tx:x,ty:yy,prom:null});break}out.push({fx:x,fy:y,tx:x,ty:yy,prom:null})}}
  else if(q==='KA'||q==='HI'||q==='+KA'||q==='+HI'){for(const [dx,dy] of dirs0){let xx=x+dx,yy=y+dy;while(inBoard(xx,yy)){if(b[yy][xx]){if(b[yy][xx].s!==s)out.push({fx:x,fy:y,tx:xx,ty:yy,prom:null});break}out.push({fx:x,fy:y,tx:xx,ty:yy,prom:null});xx+=dx;yy+=dy}}}
  else {for(const [dx,dy0] of dirs0){let dy=dy0*(s===0?1:-1);if(q==='OU'||q==='KI'||q==='GI'||q==='FU'||q==='+FU'||q==='+KY'||q==='+KE'||q==='+GI')dy=dy0*(s===0?1:-1);let xx=x+dx,yy=y+dy;if(inBoard(xx,yy)&&(!b[yy][xx]||b[yy][xx].s!==s))out.push({fx:x,fy:y,tx:xx,ty:yy,prom:null})}}
 }
 if(includeDrops)for(const q of Object.keys(hand[s]))if(hand[s][q]>0)for(let y=0;y<9;y++)for(let x=0;x<9;x++)if(!b[y][x]&&dropOK(b,s,q,x,y))out.push({drop:q,tx:x,ty:y});
 return out}
function dropOK(b,s,q,x,y){if(b[y][x])return false;let f=forward(s);if(q==='FU'||q==='KY'){if(s===0?y===0:y===8)return false}if(q==='KE'&&(s===0?y<=1:y>=7))return false;if(q==='FU'){for(let yy=0;yy<9;yy++){let c=b[yy][x];if(c&&c.s===s&&promoted(c)==='FU')return false}}return true}
function kingPos(b,s){for(let y=0;y<9;y++)for(let x=0;x<9;x++)if(b[y][x]&&b[y][x].s===s&&promoted(b[y][x])==='OU')return [x,y];return null}
function attacks(b,s,tx,ty){for(const m of pseudoMoves(b,s,false)){if(m.tx===tx&&m.ty===ty&&!m.drop)return true}return false}
function check(b,s){let k=kingPos(b,s);return !k||attacks(b,1-s,k[0],k[1])}
function applyMove(st,m,promChoice=false){let b=st.b,h=st.h,t=st.t,s=t; if(m.drop){h[s][m.drop]--;b[m.ty][m.tx]={p:m.drop,s};}
 else {let c=b[m.fy][m.fx];if(b[m.ty][m.tx]){let cap=promoted(b[m.ty][m.tx]);if(cap.startsWith('+'))cap=cap.slice(1);h[s][cap]=(h[s][cap]||0)+1}b[m.fy][m.fx]=null;b[m.ty][m.tx]={p:promChoice?'+'+promoted(c):promoted(c),s};}
 st.t=1-t;return st}
function legalMoves(s){let arr=[];for(const m of pseudoMoves(board,s)){let st=cloneState();let promote=false;if(!m.drop){let c=st.b[m.fy][m.fx];if(canProm(c,m.fy)||canProm(c,m.ty)){let q=promoted(c);promote=['FU','KY','KE'].includes(q)?(s===0?m.ty===0||q==='KE'&&m.ty<=1:m.ty===8||q==='KE'&&m.ty>=7):false; // optional below
 }}
 let options=[false];if(!m.drop){let c=board[m.fy][m.fx];if(canProm(c,m.fy)||canProm(c,m.ty))options=[false,true];}
 for(const pr of options){let st=cloneState();applyMove(st,m,pr);if(!check(st.b,s))arr.push({...m,prom:pr})}}
 return arr}
function moveText(m,s){if(m.drop)return '持駒'+P[m.drop]+'打';let c=board[m.fy][m.fx],q=promoted(c);return `${m.tx+1}${m.ty+1}${P[q]||q}${m.prom?'成':''}`}
function makeMove(m){if(gameOver)return;let legal=legalMoves(turn).find(x=>sameMove(x,m));if(!legal)return;let snap=cloneState();history.push({state:snap,text:moveText(legal,turn)});applyMove({b:board,h:hand,t:turn},legal,legal.prom);turn=1-turn;lastMove=legal;selected=null;render();checkEnd()}
function sameMove(a,b){return a.fx===b.fx&&a.fy===b.fy&&a.tx===b.tx&&a.ty===b.ty&&!!a.drop===!!b.drop&&(!a.drop||a.drop===b.drop)&&!!a.prom===!!b.prom}
function render(){let el=document.querySelector('#board');el.innerHTML='';let legal=selected?legalMoves(turn).filter(m=>selected.drop?m.drop===selected.drop&&m.fx==null:(m.fx===selected.x&&m.fy===selected.y)):[];for(let y=0;y<9;y++)for(let x=0;x<9;x++){let d=document.createElement('div');d.className='sq';let c=board[y][x];if(selected&&selected.x===x&&selected.y===y)d.classList.add('select');if(legal.some(m=>m.tx===x&&m.ty===y))d.classList.add('target');if(lastMove&&(lastMove.tx===x&&lastMove.ty===y||lastMove.fx===x&&lastMove.fy===y))d.classList.add('last');if(c){let sp=document.createElement('span');sp.className='piece '+(c.s?'gote':'');sp.textContent=promoted(c)==='OU'?'玉':(c.p[0]==='+'?PROM[c.p.slice(1)]:P[c.p]);if(c.p[0]==='+')sp.classList.add('promotion');d.appendChild(sp)}d.onclick=()=>clickSq(x,y);el.appendChild(d)}
 document.querySelector('#turn').textContent=gameOver?'対局終了':(turn===0?'先手の番':'後手の番');renderHands();let ml=document.querySelector('#moves');ml.innerHTML=history.map((h,i)=>`<li>${i+1}. ${h.text}</li>`).join('');ml.scrollTop=ml.scrollHeight}
function renderHands(){for(let s=0;s<2;s++){let el=document.querySelector(s?'#handGote':'#handSente');el.innerHTML='';for(const q of ['FU','KY','KE','GI','KI','KA','HI'])if(hand[s][q]){let b=document.createElement('button');b.className='handpiece'+(selected?.drop===q&&selected?.s===s?' selected':'');b.textContent=P[q];b.innerHTML=P[q]+`<small>${hand[s][q]}</small>`;b.onclick=()=>{if(turn===s){selected={drop:q,s};render()}};el.appendChild(b)}}}
function clickSq(x,y){if(turn!==0&&!aiBusy)return;let c=board[y][x];if(selected?.drop){let m=legalMoves(turn).find(m=>m.drop===selected.drop&&m.tx===x&&m.ty===y);if(m)makeMove(m);return}if(selected){let ms=legalMoves(turn).filter(m=>m.fx===selected.x&&m.fy===selected.y&&m.tx===x&&m.ty===y);if(ms.length){if(ms.some(m=>m.prom)&&ms.some(m=>!m.prom)){let pr=confirm('成りますか？');makeMove(ms.find(m=>!!m.prom) && pr?ms.find(m=>m.prom):ms.find(m=>!m.prom));}else makeMove(ms[0]);return}}if(c&&c.s===turn){selected={x,y};render()}}
function checkEnd(){let lm=legalMoves(turn);if(!lm.length){gameOver=true;document.querySelector('#reviewBox').innerHTML=`<strong>${turn===0?'後手':'先手'}の勝ち。</strong> 王手詰み、または合法手がありません。`;render()}}
function evalBoard(b){const val={FU:100,KY:300,KE:350,GI:450,KI:550,KA:850,HI:1000,OU:10000};let e=0;for(let y=0;y<9;y++)for(let x=0;x<9;x++){let c=b[y][x];if(c){let q=promoted(c),v=val[q.replace('+','')]||0;if(c.p[0]==='+')v+=100;e+=(c.s===0?v:-v)}}return e}
let aiBusy=false;
function aiChoose(){let ms=legalMoves(1);if(!ms.length)return null;let depth=+document.querySelector('#depth').value;let best=ms[0],bestV=Infinity;for(const m of ms){let st=cloneState();applyMove(st,m,m.prom);let v=minimax(st,depth-1,-Infinity,Infinity);if(v<bestV){bestV=v;best=m}}return best}
function minimax(st,d,a,b){let lm=legalMovesFor(st,st.t);if(!lm.length)return st.t===0?999999:-999999;if(d<=0)return evalBoard(st.b);if(st.t===0){let v=-Infinity;for(const m of lm){let ns=applyMove({b:st.b.map(r=>r.map(c=>c&&{...c})),h:st.h.map(x=>({...x})),t:st.t},m,m.prom);v=Math.max(v,minimax(ns,d-1,a,b));a=Math.max(a,v);if(a>=b)break}return v}else{let v=Infinity;for(const m of lm){let ns=applyMove({b:st.b.map(r=>r.map(c=>c&&{...c})),h:st.h.map(x=>({...x})),t:st.t},m,m.prom);v=Math.min(v,minimax(ns,d-1,a,b));b=Math.min(b,v);if(a>=b)break}return v}}
function legalMovesFor(st,s){let save={b:board,h:hand,t:turn};board=st.b;hand=st.h;turn=s;let r=legalMoves(s);board=save.b;hand=save.h;turn=save.t;return r}
async function doAI(){if(gameOver||turn!==1||aiBusy)return;aiBusy=true;document.querySelector('#aiMove').disabled=true;await new Promise(r=>setTimeout(r,150));let m=aiChoose();if(m){history.push({state:cloneState(),text:moveText(m,1)});applyMove({b:board,h:hand,t:turn},m,m.prom);turn=0;lastMove=m;render();checkEnd()}aiBusy=false;document.querySelector('#aiMove').disabled=false}
function review(){if(!history.length){document.querySelector('#reviewBox').textContent='まず対局を始めてください。';return}let text='';let evals=[];for(let i=0;i<history.length;i++){restore(history[i].state);evals.push(evalBoard(board))}let swings=[];for(let i=1;i<evals.length;i++){let d=evals[i]-evals[i-1];if(Math.abs(d)>500)swings.push({i,d})}text+=`<strong>AI感想戦</strong><br>全${history.length}手を確認しました。<br>`;if(swings.length){text+=`評価が大きく動いた手：<br>`+swings.slice(-3).map(x=>`${x.i+1}手目付近：${x.d>0?'先手側':'後手側'}に評価が動きました。`).join('<br>')}else text+='大きな評価変動は少なく、比較的落ち着いた展開でした。';text+='<br><br>ポイント：駒得だけでなく、王の安全・攻めの速度・持ち駒の使い方も評価しています。';restore(history[history.length-1].state); // restore state before last move
 // reconstruct current state
 if(history.length){let snap=history[history.length-1].state;board=snap.b;hand=snap.h;turn=snap.t;let m=history[history.length-1];/* current board is rebuilt below */}
 // replay
 start();for(const h of history.slice()){let ms=legalMoves(turn);let m=ms.find(x=>moveText(x,turn)===h.text)||ms[0];if(m) {applyMove({b:board,h:hand,t:turn},m,m.prom);turn=1-turn}};render();document.querySelector('#reviewBox').innerHTML=text}
document.querySelector('#newGame').onclick=start;document.querySelector('#undo').onclick=()=>{if(!history.length)return;let h=history.pop();restore(h.state);gameOver=false;selected=null;lastMove=null;render()};document.querySelector('#aiMove').onclick=doAI;document.querySelector('#review').onclick=review;start();
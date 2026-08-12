// 마을 소품 밀도 자 — 화면을 열 띠로 나눠 칸당 굴림을 그대로 흉내 내 소품 수를 센다.
//   node tools/scatter_density.mjs
// 눈으로 「비었다」를 판정하면 매번 다르게 읽힌다. 골(가운데가 3~5, 끝이 18~23)이
// 보이면 밀도가 뒤집힌 것이다. js/ground.js 의 tiers 를 바꾸면 여기 NEW 도 같이 고친다.

const CELL=165;
function hash2(x,y){let h=(x*374761393+y*668265263)|0;h=(h^(h>>>13))*1274126177|0;return (h^(h>>>16))>>>0;}
function run(label,tiers,w=414,h=860){
  const RS=300,M=0.05,scByW=(w*(1-M*2))/(RS*2);
  const sq=Math.max(0.56,Math.min(0.86,(h*(1-M*2))/(RS*2*scByW)));
  const sc=Math.min(scByW,(h*(1-M*2))/(RS*2*sq));
  const cx=w/2, cy=h*0.5;
  const hw=(w/2)/sc, hh=(h/2)/(sc*sq);
  const R={x:hw*0.92,y:hh*0.62};
  const anchors=[[0,-0.55*R.y],[-0.62*R.x,-0.05*R.y],[0.62*R.x,-0.05*R.y],[0,0.30*R.y]];
  const near=(x,y)=>Math.min(...anchors.map(a=>Math.hypot(x-a[0],y-a[1])));
  const clear=210;
  const halfW=(w/2)/sc+CELL, halfH=(h/2)/(sc*sq)+CELL;
  const gx0=Math.floor(-halfW/CELL),gx1=Math.ceil(halfW/CELL);
  const gy0=Math.floor(-halfH/CELL),gy1=Math.ceil(halfH/CELL);
  const NB=10, bands=Array.from({length:NB},()=>0); let total=0;
  for(let gy=gy0;gy<=gy1;gy++)for(let gx=gx0;gx<=gx1;gx++){
    const rnd=hash2(gx,gy); const d=near(gx*CELL,gy*CELL);
    const t = d<220?tiers[0]:d<420?tiers[1]:tiers[2];
    for(let k=0;k<t.rolls;k++){
      const r2=k===0?rnd:hash2(gx*31+k*7717,gy*17+k*6311);
      if(r2%100>=t.dens)continue;
      const wxw=gx*CELL+((r2>>11)%CELL)-CELL/2, wyw=gy*CELL+((r2>>17)%CELL)-CELL/2;
      if(Math.hypot(wxw,wyw)<clear)continue;
      const py=cy+wyw*sc*sq, px=cx+wxw*sc;
      if(py<-40||py>h+40||px<-80||px>w+80)continue;
      total++; bands[Math.max(0,Math.min(NB-1,Math.floor(py/(h/NB))))]++;
    }
  }
  console.log(`${label}  ${w}x${h}  total=${total}`);
  console.log("  " + bands.map(n=>String(n).padStart(3)).join(""));
}
const OLD=[{dens:49,rolls:1},{dens:95,rolls:1},{dens:95,rolls:3}];
const NEW=[{dens:78,rolls:3},{dens:68,rolls:3},{dens:60,rolls:3}];
for(const [w,h] of [[414,860],[900,700]]){ run("OLD",OLD,w,h); run("NEW",NEW,w,h); }

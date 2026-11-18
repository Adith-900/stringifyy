const $=id=>document.getElementById(id);
const crop=$("cropCanvas"), cc=crop.getContext("2d"), out=$("result"), ctx=out.getContext("2d",{willReadFrequently:true});
const S=900, SAMPLE=240;
let img=null, cropState={zoom:1,panX:0,panY:0,drag:false,lastX:0,lastY:0}, route=[], nails=[], busy=false;
const cropStage=$("cropStage");
function drawCrop(){
  cc.clearRect(0,0,360,360);cc.fillStyle="#171717";cc.fillRect(0,0,360,360);
  if(!img){cc.fillStyle="#aaa";cc.font="12px sans-serif";cc.textAlign="center";cc.fillText("Upload a photo to crop",180,180);return;}
  const scale=Math.max(360/img.width,360/img.height)*cropState.zoom;
  const w=img.width*scale,h=img.height*scale,x=(360-w)/2+cropState.panX,y=(360-h)/2+cropState.panY;
  cc.save();cc.beginPath();cc.arc(180,180,178,0,Math.PI*2);cc.clip();cc.drawImage(img,x,y,w,h);cc.restore();
  cc.strokeStyle="#c5a16b";cc.lineWidth=1.2;cc.beginPath();cc.arc(180,180,178,0,Math.PI*2);cc.stroke();
}
function getCropSource(){
  const scale=Math.max(360/img.width,360/img.height)*cropState.zoom;
  const w=img.width*scale,h=img.height*scale,x=(360-w)/2+cropState.panX,y=(360-h)/2+cropState.panY;
  const sx=Math.max(0,Math.min(img.width-360/scale,-x/scale)),sy=Math.max(0,Math.min(img.height-360/scale,-y/scale));
  const sw=Math.min(img.width-sx,360/scale),sh=Math.min(img.height-sy,360/scale);
  const c=document.createElement("canvas");c.width=c.height=SAMPLE;
  const xctx=c.getContext("2d");xctx.fillStyle="#fff";xctx.fillRect(0,0,SAMPLE,SAMPLE);
  xctx.drawImage(img,sx,sy,sw,sh,0,0,SAMPLE,SAMPLE);return c;
}
$("photoInput").addEventListener("change",e=>{
 const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/"))return alert("Choose an image file.");
 const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{img=im;cropState={zoom:1,panX:0,panY:0,drag:false,lastX:0,lastY:0};drawCrop();$("generateBtn").disabled=false;$("status").textContent="PHOTO READY";$("meta").textContent=f.name.toUpperCase();$("empty").style.display="none";URL.revokeObjectURL(u)};im.onerror=()=>alert("Could not read this image.");im.src=u;
});
function pointerDown(e){if(!img)return;cropState.drag=true;cropState.lastX=e.clientX;cropState.lastY=e.clientY;cropStage.setPointerCapture(e.pointerId)}
function pointerMove(e){if(!cropState.drag)return;const r=cropStage.getBoundingClientRect();cropState.panX+=(e.clientX-cropState.lastX)*360/r.width;cropState.panY+=(e.clientY-cropState.lastY)*360/r.height;cropState.lastX=e.clientX;cropState.lastY=e.clientY;drawCrop()}
function pointerUp(){cropState.drag=false}
cropStage.addEventListener("pointerdown",pointerDown);cropStage.addEventListener("pointermove",pointerMove);cropStage.addEventListener("pointerup",pointerUp);cropStage.addEventListener("pointercancel",pointerUp);
$("zoomRange").addEventListener("input",e=>{cropState.zoom=+e.target.value;$("zoomVal").value=cropState.zoom.toFixed(2)+"×";drawCrop()});
$("centerBtn").onclick=()=>{cropState.panX=0;cropState.panY=0;cropState.zoom=1;$("zoomRange").value=1;$("zoomVal").value="1.00×";drawCrop()};
for(const [id,outid,suffix] of [["brightness","brightnessVal",""],["contrast","contrastVal",""],["detail","detailVal","%"]])$(id).addEventListener("input",e=>$(outid).value=e.target.value+suffix);
function makeNails(n){return Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;return{x:S/2+Math.cos(a)*S*.455,y:S/2+Math.sin(a)*S*.455}})}
function linePoints(a,b){let x0=Math.round(a.x/S*(SAMPLE-1)),y0=Math.round(a.y/S*(SAMPLE-1)),x1=Math.round(b.x/S*(SAMPLE-1)),y1=Math.round(b.y/S*(SAMPLE-1));let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy,pts=[];while(true){if(x0>=2&&x0<SAMPLE-2&&y0>=2&&y0<SAMPLE-2)pts.push(y0*SAMPLE+x0);if(x0===x1&&y0===y1)break;let e=2*err;if(e>=dy){err+=dy;x0+=sx}if(e<=dx){err+=dx;y0+=sy}}return pts}
function buildDarkness(){
 const c=getCropSource(),x=c.getContext("2d"),data=x.getImageData(0,0,SAMPLE,SAMPLE).data,dark=new Float32Array(SAMPLE*SAMPLE);
 const brightness=+$("brightness").value,contrast=+$("contrast").value,detail=+$("detail").value/100;
 const factor=(259*(contrast+255))/(255*(259-contrast));
 for(let i=0,j=0;i<data.length;i+=4,j++){let lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];lum=factor*(lum-128)+128+brightness;lum=Math.max(0,Math.min(255,lum));let d=(255-lum)/255;d=Math.max(0,(d-.22)*1.45);dark[j]=Math.min(1,d*(.55+detail*.9))}
 // Soft circular mask: ignore outside the nail field, fade near edge.
 for(let y=0;y<SAMPLE;y++)for(let x=0;x<SAMPLE;x++){const dx=(x-SAMPLE/2)/(SAMPLE*.47),dy=(y-SAMPLE/2)/(SAMPLE*.47),r=Math.sqrt(dx*dx+dy*dy),i=y*SAMPLE+x;if(r>1)dark[i]=0;else if(r>.88)dark[i]*=(1-r)/.12}
 return dark;
}
function createPath(dark,n,steps){
 const pts=makeNails(n),cache=Array.from({length:n},()=>new Array(n)),res=Float32Array.from(dark),path=[];
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)cache[i][j]=linePoints(pts[i],pts[j]);
 let current=0,previous=-1;
 // Use a brightness-aware greedy optimizer. A mild length normalization avoids
 // always choosing long chords; repeat/adjacent nail connections are excluded.
 for(let step=0;step<steps;step++){
  let best=-1,bestScore=-1e9,bestLine=null;
  for(let next=0;next<n;next++){
   if(next===current||next===previous)continue;
   const line=cache[Math.min(current,next)][Math.max(current,next)];let score=0;
   for(let k=0;k<line.length;k++)score+=res[line[k]];
   score=score/Math.pow(line.length,.52);
   if(score>bestScore){bestScore=score;best=next;bestLine=line}
  }
  if(best<0||bestScore<.008)break;
  const reduction=.12;
  for(let k=0;k<bestLine.length;k++){const p=bestLine[k];res[p]=Math.max(0,res[p]-reduction)}
  path.push([current,best]);previous=current;current=best;
 }
 return {pts,path};
}
function render(pts,path){
 ctx.fillStyle="#171716";ctx.fillRect(0,0,S,S);
 // subtle dark circular board and clean perimeter
 ctx.save();ctx.beginPath();ctx.arc(S/2,S/2,S*.465,0,Math.PI*2);ctx.clip();
 ctx.strokeStyle=$("threadColor").value;ctx.globalAlpha=.42;ctx.lineWidth=.8;ctx.lineCap="round";ctx.beginPath();
 for(const [a,b] of path){ctx.moveTo(pts[a].x,pts[a].y);ctx.lineTo(pts[b].x,pts[b].y)}ctx.stroke();ctx.restore();ctx.globalAlpha=1;
 ctx.strokeStyle="#b79562";ctx.lineWidth=3;ctx.beginPath();ctx.arc(S/2,S/2,S*.465,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle="#e0c99f";for(const p of pts){ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,Math.PI*2);ctx.fill()}
}
function fillRouteTable(){const body=$("routeRows");body.innerHTML="";const frag=document.createDocumentFragment();route.forEach(([a,b],i)=>{const tr=document.createElement("tr");[String(i+1).padStart(4,"0"),String(a+1),String(b+1)].forEach(t=>{const td=document.createElement("td");td.textContent=t;tr.appendChild(td)});frag.appendChild(tr)});body.appendChild(frag);$("routeTotal").textContent=route.length.toLocaleString()+" CONNECTIONS"}
$("generateBtn").onclick=()=>{
 if(!img||busy)return;busy=true;$("generateBtn").disabled=true;$("status").textContent="ANALYSING PHOTO…";
 setTimeout(()=>{try{const n=+$("nails").value,steps=+$("lineCount").value;const dark=buildDarkness(),result=createPath(dark,n,steps);nails=result.pts;route=result.path;render(nails,route);out.style.display="block";$("status").textContent="PORTRAIT GENERATED";$("meta").textContent=`${n} NAILS · ${route.length.toLocaleString()} THREAD CONNECTIONS`;$("specNails").textContent=n;$("specLines").textContent=route.length.toLocaleString();fillRouteTable();$("savePng").disabled=false;$("saveJson").disabled=false;$("printGuide").disabled=false}catch(err){console.error(err);alert("Could not generate this portrait. Try adjusting the crop or image settings.")}finally{busy=false;$("generateBtn").disabled=false}},60);
};
$("savePng").onclick=()=>{const a=document.createElement("a");a.href=out.toDataURL("image/png");a.download="stringify-portrait.png";a.click()};
$("saveJson").onclick=()=>{const payload={format:"STRINGIFY_ROUTE_V2",board:{shape:"circle",diameter_cm:36,board_cm:[40,40]},nail_count:nails.length,numbering:"clockwise; nail 1 at 12 o'clock",connections:route.map(([a,b],i)=>({step:i+1,from_nail:a+1,to_nail:b+1}))};download(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),"stringify-thread-route.json")};
$("printGuide").onclick=()=>{
 const w=window.open("","_blank");if(!w)return alert("Allow pop-ups to print the guide.");
 const nailDots=nails.map((p,i)=>`<span style="left:${p.x/S*100}%;top:${p.y/S*100}%">${(i+1)%10===1?i+1:""}</span>`).join("");
 const rows=route.map(([a,b],i)=>`<tr><td>${i+1}</td><td>${a+1}</td><td>${b+1}</td></tr>`).join("");
 w.document.write(`<!doctype html><html><head><title>Stringify build guide</title><style>body{font:12px Arial;padding:22px;color:#222}h1{font:25px Georgia}.board{position:relative;width:360mm;height:360mm;max-width:90vw;max-height:90vw;border:2px solid #555;border-radius:50%;margin:20px auto}.board span{position:absolute;transform:translate(-50%,-50%);font-size:7px;color:#222}table{border-collapse:collapse;width:100%;font-size:10px}td,th{padding:5px;border-bottom:1px solid #ddd;text-align:left}@media print{.board{width:360mm;height:360mm;max-width:none;max-height:none;page-break-after:always}}</style></head><body><h1>STRINGIFY — Circular nail & thread guide</h1><p>36 cm nail circle · ${nails.length} nails · ${route.length} connections. Nail 1 is at 12 o’clock; number clockwise.</p><div class="board">${nailDots}</div><h2>Thread sequence</h2><p>Follow the connections in order. Tie the thread at nail 1, then move from the FROM nail to the TO nail for each step.</p><table><thead><tr><th>Step</th><th>From nail</th><th>To nail</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
};
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
drawCrop();

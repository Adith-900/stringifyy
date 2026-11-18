const $ = (id) => document.getElementById(id);
const photoInput = $("photoInput"), canvas = $("artCanvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
const state = { image: null, path: [], nails: [], shape: "circle", color: "#f3eee4", lines: 2400, nailCount: 180, sourceName: "" };
const SIZE = 900, SAMPLE = 180;

$("nailsRange").addEventListener("input", e => { state.nailCount = +e.target.value; $("nailsValue").value = e.target.value; });
$("linesRange").addEventListener("input", e => { state.lines = +e.target.value; $("linesValue").value = Number(e.target.value).toLocaleString(); });
$("shapeSelect").addEventListener("change", e => state.shape = e.target.value);
$("colorSelect").addEventListener("change", e => { state.color = e.target.value; });
photoInput.addEventListener("change", e => {
  const file = e.target.files?.[0]; if (!file) return;
  if (!file.type.startsWith("image/")) return alert("Please choose an image file.");
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => { state.image = img; state.sourceName = file.name; $("generateBtn").disabled = false; $("emptyState").style.display = "none"; $("previewStatus").textContent = "IMAGE READY"; $("canvasMeta").textContent = file.name.toUpperCase(); drawSourcePreview(); URL.revokeObjectURL(url); };
  img.onerror = () => alert("That image could not be opened."); img.src = url;
});
function drawSourcePreview() {
  ctx.fillStyle = "#171715"; ctx.fillRect(0,0,SIZE,SIZE);
  const crop = cropSquare(state.image); ctx.drawImage(crop,0,0,SIZE,SIZE);
  canvas.style.display = "block";
}
function cropSquare(img) {
  const c=document.createElement("canvas"); c.width=c.height=SAMPLE; const x=c.getContext("2d");
  const s=Math.min(img.naturalWidth,img.naturalHeight), sx=(img.naturalWidth-s)/2, sy=(img.naturalHeight-s)/2;
  x.drawImage(img,sx,sy,s,s,0,0,SAMPLE,SAMPLE); return c;
}
function makeNails(n, shape) {
  const out=[], r=shape==="circle"?0.455:0.43, cx=SIZE/2, cy=SIZE/2;
  for(let i=0;i<n;i++){ const a=-Math.PI/2+2*Math.PI*i/n; out.push({x:cx+Math.cos(a)*SIZE*r,y:cy+Math.sin(a)*SIZE*r}); }
  return out;
}
function prepareDarkness(img) {
  const c=document.createElement("canvas"); c.width=c.height=SAMPLE; const x=c.getContext("2d",{willReadFrequently:true});
  const crop=cropSquare(img); x.drawImage(crop,0,0);
  const d=x.getImageData(0,0,SAMPLE,SAMPLE).data, arr=new Float32Array(SAMPLE*SAMPLE);
  // Convert luminance into darkness; a mild contrast curve helps facial features stand out.
  for(let p=0,j=0;p<d.length;p+=4,j++){ const lum=.2126*d[p]+.7152*d[p+1]+.0722*d[p+2]; const v=(255-lum)/255; arr[j]=Math.max(0,Math.min(1,(v-.32)*1.55)); }
  return arr;
}
function linePixels(a,b) {
  const x0=Math.round(a.x/SIZE*(SAMPLE-1)), y0=Math.round(a.y/SIZE*(SAMPLE-1));
  const x1=Math.round(b.x/SIZE*(SAMPLE-1)), y1=Math.round(b.y/SIZE*(SAMPLE-1));
  const dx=Math.abs(x1-x0), sx=x0<x1?1:-1, dy=-Math.abs(y1-y0), sy=y0<y1?1:-1;
  let err=dx+dy,x=x0,y=y0; const pts=[];
  while(true){ if(x>=0&&x<SAMPLE&&y>=0&&y<SAMPLE)pts.push(y*SAMPLE+x); if(x===x1&&y===y1)break; const e=2*err;if(e>=dy){err+=dy;x+=sx}if(e<=dx){err+=dx;y+=sy} }
  return pts;
}
function generatePath(dark, nails, maxLines) {
  // Greedy string-art optimization: each selected chord removes darkness from the image.
  const residual=Float32Array.from(dark), path=[]; let current=0, previous=-1;
  const candidates=Array.from({length:nails.length},(_,i)=>i);
  const cache=new Map();
  function pixels(i,j){const key=i<j?`${i}-${j}`:`${j}-${i}`;if(!cache.has(key))cache.set(key,linePixels(nails[i],nails[j]));return cache.get(key);}
  for(let step=0;step<maxLines;step++){
    let best=-1,bestScore=-Infinity,bestPts=null;
    for(const next of candidates){
      if(next===current||next===previous)continue;
      const pts=pixels(current,next); let score=0;
      for(let k=0;k<pts.length;k++)score+=residual[pts[k]];
      score/=Math.pow(pts.length,.72);
      if(score>bestScore){bestScore=score;best=next;bestPts=pts;}
    }
    if(best<0||bestScore<.02)break;
    // Thread darkens the chosen line: subtract a small amount from its sampled pixels.
    for(const p of bestPts)residual[p]=Math.max(0,residual[p]-.16);
    path.push([current,best]); previous=current; current=best;
    if(step%250===0){ $("previewStatus").textContent=`CALCULATING · ${step.toLocaleString()} LINES`; }
  }
  return path;
}
function drawStringArt(nails,path) {
  ctx.clearRect(0,0,SIZE,SIZE);
  ctx.fillStyle=state.shape==="circle"?"#191919":"#191919";ctx.fillRect(0,0,SIZE,SIZE);
  if(state.shape==="circle"){ctx.save();ctx.beginPath();ctx.arc(SIZE/2,SIZE/2,SIZE*.465,0,Math.PI*2);ctx.clip();}
  // Subtle board texture
  ctx.strokeStyle="rgba(255,255,255,.035)";ctx.lineWidth=1;
  for(let y=0;y<SIZE;y+=12){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(SIZE,y);ctx.stroke();}
  ctx.globalAlpha=.66;ctx.strokeStyle=state.color;ctx.lineWidth=.72;ctx.lineCap="round";
  ctx.beginPath();for(const [a,b] of path){ctx.moveTo(nails[a].x,nails[a].y);ctx.lineTo(nails[b].x,nails[b].y);}ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle="#d8c6a4";for(const p of nails){ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,Math.PI*2);ctx.fill();}
  if(state.shape==="circle"){ctx.restore();ctx.strokeStyle="#a58a61";ctx.lineWidth=3;ctx.beginPath();ctx.arc(SIZE/2,SIZE/2,SIZE*.465,0,Math.PI*2);ctx.stroke();}
}
function updateResults(){
  const distance=state.path.reduce((sum,[a,b])=>sum+Math.hypot(state.nails[a].x-state.nails[b].x,state.nails[a].y-state.nails[b].y),0);
  $("specNails").textContent=state.nails.length;$("specLines").textContent=state.path.length.toLocaleString();
  $("specBoard").textContent=state.shape==="circle"?"Circular":"Square";
  $("specLength").textContent=`${(distance/1000*1.15).toFixed(1)} m`;
  $("resultState").textContent="PATTERN READY";$("pathCount").textContent=`${state.path.length.toLocaleString()} CONNECTIONS`;
  const body=$("pathBody");body.innerHTML="";
  const frag=document.createDocumentFragment();
  state.path.forEach(([a,b],i)=>{const tr=document.createElement("tr");[String(i+1).padStart(4,"0"),String(a+1),String(b+1),"1 strand"].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td)});frag.appendChild(tr);});
  body.appendChild(frag);
  $("downloadBtn").disabled=false;$("printBtn").disabled=false;
}
$("generateBtn").addEventListener("click",()=>{
  if(!state.image)return;
  $("generateBtn").disabled=true;$("previewStatus").textContent="ANALYSING IMAGE…";
  setTimeout(()=>{
    try{
      state.nails=makeNails(state.nailCount,state.shape);
      const darkness=prepareDarkness(state.image);
      state.path=generatePath(darkness,state.nails,state.lines);
      drawStringArt(state.nails,state.path);updateResults();
      $("previewStatus").textContent="ARTWORK GENERATED";$("canvasMeta").textContent=`${state.nails.length} NAILS · ${state.path.length.toLocaleString()} THREAD LINES`;
    }catch(err){console.error(err);alert("Could not generate this image. Try another photo.");}
    finally{$("generateBtn").disabled=false;}
  },40);
});
$("downloadBtn").addEventListener("click",()=>{
  const data={app:"STRINGIFY",version:1,source:state.sourceName,board:{shape:state.shape,diameterCm:40},nailCount:state.nails.length,threadColor:state.color,estimatedThreadMeters:+(state.path.reduce((s,[a,b])=>s+Math.hypot(state.nails[a].x-state.nails[b].x,state.nails[a].y-state.nails[b].y),0)/1000*1.15).toFixed(1),nails:state.nails.map((p,i)=>({nail:i+1,x:+(p.x/SIZE).toFixed(5),y:+(p.y/SIZE).toFixed(5)})),connections:state.path.map(([a,b],i)=>({step:i+1,from:a+1,to:b+1}))};
  downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),"stringify-pattern.json");
});
$("printBtn").addEventListener("click",()=>{
  const w=window.open("","_blank");if(!w)return alert("Please allow pop-ups to print the guide.");
  const rows=state.path.map(([a,b],i)=>`<tr><td>${i+1}</td><td>${a+1}</td><td>${b+1}</td></tr>`).join("");
  const points=state.nails.map((p,i)=>`<span style="position:absolute;left:${p.x/SIZE*100}%;top:${p.y/SIZE*100}%">${i+1}</span>`).join("");
  w.document.write(`<!doctype html><html><head><title>Stringify Nail Guide</title><style>body{font:12px Arial;padding:24px;color:#222}h1{font:28px Georgia}.board{width:440px;height:440px;border:2px solid #555;border-radius:${state.shape==="circle"?"50%":"0"};position:relative;margin:25px auto}.board span{position:absolute;transform:translate(-50%,-50%);font:7px Arial;color:#333}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{padding:5px;border-bottom:1px solid #ddd;text-align:left}@media print{.board{break-inside:avoid}}</style></head><body><h1>STRINGIFY — Nail placement guide</h1><p>${state.nails.length} nails · ${state.path.length} connections · ${state.shape} board</p><p>Mark the nail numbers clockwise, starting at the top. Then follow the connection table in order.</p><div class="board">${points}</div><h2>Thread sequence</h2><table><thead><tr><th>Step</th><th>From nail</th><th>To nail</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
});
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}

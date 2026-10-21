const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/',
  beforeParse(w){w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
    w.requestAnimationFrame=w.requestAnimationFrame||(f=>setTimeout(f,0));
    w.HTMLCanvasElement.prototype.getContext=()=>null;
    w.addEventListener('error',e=>errs.push(String(e.message)));}});
const d=dom.window.document;
setTimeout(()=>{
  const tiles=d.querySelectorAll('.tile,.item').length;
  console.log('tiles/items:',tiles,'title:',d.title,'scripts:',d.querySelectorAll('script').length);
  console.log('errors:',errs.length? errs.slice(0,5):'none');
  process.exit(0);
},1500);

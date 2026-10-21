const M=require('./merge.js');
function gen(records, per, writers){
  const ws=[...Array(writers)].map((_,i)=>new M.Writer('p'+i+'x','u'));
  const all=[]; const headsBy={};
  for(let i=0;i<per;i++) for(let r=0;r<records;r++){
    const w=ws[(i+r)%writers]; const rid='r'+r;
    const parents=headsBy[rid]||[];
    const e=M.makeEvent(w.w,w.n,w.prev,{rid,op:'set',f:{a:i%3,b:i},parents,hlc:w.tick(1e12+i),ts:'',tsrc:'local',by:'u'});
    w.n++; w.prev=e.h; headsBy[rid]=[e.id]; all.push(e);
  }
  return all;
}
for(const [rec,per] of [[200,100],[20,1000],[1,2000],[1,5000]]){
  const ev=gen(rec,per,8); const t=Date.now(); const m=M.materialize(ev); 
  console.log(`records=${rec} per=${per} events=${ev.length} ms=${Date.now()-t} rssMB=${Math.round(process.memoryUsage().rss/1e6)}`);
}

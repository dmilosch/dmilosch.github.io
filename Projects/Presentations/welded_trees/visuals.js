/* Purpose-built, text-sparse diagrams. All animation advances with the presenter. */
(function () {
  'use strict';
  const C={ink:'#182331',blue:'#2563eb',teal:'#138a78',coral:'#d75a4a',purple:'#7860ba',gray:'#c7d0d7',muted:'#667583',pale:'#f3f6f8',line:'#dce3e8'};
  const line=(x1,y1,x2,y2,c=C.gray,w=3,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const path=(d,c=C.gray,w=3,extra='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const dot=(x,y,c=C.ink,r=7,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${extra}/>`;
  const ring=(x,y,c=C.blue,r=15)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="white" stroke="${c}" stroke-width="3"/>`;
  const rect=(x,y,w,h,fill=C.pale,stroke='none',rx=10,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2" ${extra}/>`;
  const arrow=(x1,y1,x2,y2,c=C.gray,w=3)=>line(x1,y1,x2,y2,c,w)+path(`M ${x2-10} ${y2-7} L ${x2} ${y2} L ${x2-10} ${y2+7}`,c,w);
  const label=(x,y,s,c=C.ink,size=24)=>`<text x="${x}" y="${y}" fill="${c}" font-family="Consolas,monospace" font-size="${size}" text-anchor="middle" dominant-baseline="central">${s}</text>`;
  const group=(x,y,scale,content,extra='')=>`<g transform="translate(${x} ${y}) scale(${scale})" ${extra}>${content}</g>`;
  function tree(x,y,s=1,c=C.ink,branch=0,rootColor=C.blue){
    const pts=[[0,0],[74,-58],[78,56],[157,-91],[150,-20],[158,40],[158,103]];
    const edges=[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]];
    let out=edges.map(([a,b])=>line(pts[a][0],pts[a][1],pts[b][0],pts[b][1],c,3.5)).join('');
    out+=pts.map(([a,b],i)=>dot(a,b,i===0?rootColor:c,i===0?9:6)).join('');
    if(branch)out+=line(157,-91,218,-118,C.teal,4)+dot(218,-118,C.teal,7);
    return group(x,y,s,out);
  }
  function record(x,y,w=130,h=155,rows=3,c=C.blue){let out=rect(x,y,w,h,'white',C.line,9);for(let i=0;i<rows;i++){let yy=y+30+i*34;out+=dot(x+28,yy,c,5)+line(x+40,yy,x+w-35,yy,C.gray,2)+rect(x+w-30,yy-5,12,10,c,'none',2);}return out;}
  function fork(x,y,s,c=C.gray){return group(x,y,s,line(0,0,65,-55,c,4)+line(0,0,65,55,c,4)+dot(0,0,c,8)+dot(65,-55,c,7)+dot(65,55,c,7));}

  const scenes={
    subspace(){return `<path d="M83 278 L198 132 L445 132 L330 278Z" fill="#eef3fc" stroke="#b7c8e4" stroke-width="2"/>`+line(181,241,342,168,C.blue,5)+dot(181,241,C.blue,8)+dot(342,168,C.blue,9)+arrow(490,205,595,205,C.gray,3)+`<path d="M661 278 L776 132 L1023 132 L908 278Z" fill="#eef8f4" stroke="#b2d8cf" stroke-width="2"/>`+line(722,241,896,179,C.teal,5)+line(722,241,896,97,C.blue,4)+line(896,179,896,97,C.coral,4,'stroke-dasharray="6 7"')+dot(722,241,C.teal,8)+ring(896,179,C.teal,10)+dot(896,97,C.blue,9);},
    oracle(stage){
      if(!stage){const p=[[85,115],[240,80],[407,134],[593,75],[767,140],[978,90],[155,287],[336,345],[531,284],[733,347],[915,280],[1047,370]];return p.map(([x,y],i)=>ring(x,y,i===0?C.blue:C.line,33)+label(x,y,(19+i*17).toString(2).padStart(8,'0'),i===0?C.blue:C.muted,18)).join('')+ring(85,115,C.blue,44);}
      let out=rect(423,111,248,220,C.ink,'none',15)+arrow(190,221,401,221,C.blue,4)+arrow(697,221,904,221,C.teal,4);
      out+=ring(125,221,C.blue,49)+label(125,221,'00110101',C.blue,19)+ring(975,221,C.teal,49)+label(975,221,'10100110',C.teal,19);
      out+=line(548,221,490,169,C.blue,6)+line(548,221,613,180,C.teal,6)+line(548,221,580,281,C.coral,6)+dot(548,221,'white',11)+dot(490,169,'white',8)+dot(613,180,'white',8)+dot(580,281,'white',8);
      return out;
    },
    uphill(stage,variant){
      const active=variant==='escape'?2:stage;const p=[[150,338],[345,273],[540,208],[735,143],[930,78]];let out='';
      p.slice(0,-1).forEach(([x,y],i)=>{const [xx,yy]=p[i+1];out+=line(x,y,xx,yy,active>0?C.teal:C.gray,active>0?5:3);if(i>0||active>0)out+=line(x,y,x+87,y+64,active===1?C.coral:C.gray,3)+dot(x+87,y+64,active===1?C.coral:C.gray,7);});
      out+=p.map(([x,y],i)=>dot(x,y,i===0?C.blue:active>0?C.teal:C.gray,i===0?12:8)).join('');
      if(active===0)out+=line(150,338,236,397,C.gray,3)+dot(236,397,C.gray,7);
      if(active>0)out+=ring(930,78,C.teal,19);
      if(active===2)out+=path('M 466 354 C 510 416 736 423 1007 374',C.gray,2,'stroke-dasharray="5 9"');
      return out;
    },
    linewalk(stage){let out='';for(let i=0;i<9;i++)out+=line(92+i*104,205,196+i*104,205,i===4?C.coral:C.gray,i===4?9:5);for(let i=0;i<10;i++)out+=dot(92+i*104,205,i===0?C.blue:i===9?C.teal:C.ink,11);const x=stage?1028:300;out+=`<ellipse cx="${x}" cy="205" rx="67" ry="55" fill="${stage?C.teal:C.blue}" opacity=".08"/>`+ring(x,205,stage?C.teal:C.blue,29);return out;},
    proofmap(stage,variant){
      return record(105,35,130,190,4,C.blue);
    },
    recording(stage){let out=rect(90,132,185,185,C.ink,'none',15)+line(120,266,245,180,'white',3)+dot(125,180,'white',8)+dot(241,267,'white',8);out+=path('M300 223 C380 223 375 113 460 113',C.gray,2)+line(300,223,460,223,C.gray,2)+path('M300 223 C380 223 375 333 460 333',C.gray,2);for(let i=0;i<3;i++){out+=record(500+i*191,112,151,209,stage?i+1:2,[C.blue,C.teal,C.purple][i]);}return out;},
    unquery(stage){let out=record(117,111,222,235,0)+arrow(370,228,490,228,C.gray,3)+record(532,111,222,235,stage===2?0:2,C.blue);out+=ring(930,228,stage===2?C.line:C.blue,54);if(stage!==2)out+=dot(930,228,C.blue,14);if(stage===1)out+=line(642,346,642,390,C.blue,3)+line(642,390,930,390,C.blue,3)+line(930,390,930,283,C.blue,3);if(stage===2)out+=path('M 527 84 C 463 29 357 28 291 83',C.teal,3)+path('M 299 64 L 289 84 L 312 83',C.teal,3);return out;},
    permutations(stage){let out=line(559,45,559,405,C.line,2);const map=stage?[2,0,3,1]:[0,1,2,3];for(let i=0;i<4;i++){const y=83+i*90,yy=83+map[i]*90;out+=line(139,y,373,yy,C.blue,3)+dot(139,y,C.ink,10)+rect(367,yy-15,71,30,'#eaf0ff',C.blue,4);for(let k=0;k<3;k++)out+=line(379+k*16,yy-5,379+k*16,yy+5,C.blue,2);out+=line(721,y,976,yy,C.purple,3)+dot(721,y,C.ink,9)+dot(976,yy,C.ink,9);}return out;},
    rewire(stage){let out='';const c=[C.blue,C.blue,C.teal,C.coral];const map=stage?[1,0,2,3]:[0,1,2,3];for(let i=0;i<4;i++){let y=78+i*94,yy=78+map[i]*94;out+=line(290,y,820,yy,c[i],5)+dot(290,y,C.ink,11)+dot(820,yy,C.ink,11);out+=line(209,y-25,290,y,C.gray,2)+line(820,yy,901,yy+25,C.gray,2)+dot(209,y-25,C.gray,5)+dot(901,yy+25,C.gray,5);}return out;},
    pipeline(stage){let out='';for(let i=0;i<3;i++){const x=75+380*i;out+=rect(x,97,214,214,i===stage?'#eff4ff':C.pale,i===stage?C.blue:C.line,14);if(i<2)out+=arrow(x+234,204,x+350,204,C.gray,3);if(i===0){out+=rect(x+38,184,62,34,'white',C.blue,4)+arrow(x+109,202,x+151,202,C.blue,2)+dot(x+173,202,C.ink,13);}else if(i===1){out+=line(x+55,233,x+157,164,C.purple,5)+dot(x+55,233,C.ink,12)+dot(x+157,164,C.ink,12);}else{out+=dot(x+40,202,C.ink,13)+arrow(x+62,202,x+105,202,C.blue,2)+rect(x+124,184,62,34,'white',C.blue,4);}}return out;},
    database(stage){let out=record(116,96,162,209,4,C.blue)+record(319,96,162,209,3,C.purple)+arrow(517,205,636,205,C.gray,3);let p=[[700,206],[773,148],[852,225],[939,155],[1030,204]];p.slice(0,-1).forEach(([x,y],i)=>out+=line(x,y,p[i+1][0],p[i+1][1],stage?C.blue:C.gray,4));out+=p.map(([x,y],i)=>dot(x,y,i===0?C.blue:i===4?C.teal:stage?C.blue:C.gray,10)).join('');return out;},
    freshchoices(stage){let out='';const source=[212,220];out+=tree(56,220,.7,C.muted)+ring(source[0],source[1],C.blue,20)+dot(source[0],source[1],C.blue,10);const pts=[];for(let r=0;r<6;r++)for(let c=0;c<10;c++)pts.push([497+c*57,58+r*62]);const taken=new Set([12,13,22,42]);pts.forEach(([x,y],i)=>{out+=dot(x,y,taken.has(i)?C.coral:C.teal,taken.has(i)?7:5);if(taken.has(i))out+=ring(x,y,C.coral,14);});out+=line(pts[12][0],pts[12][1],pts[13][0],pts[13][1],C.muted,3)+line(pts[12][0],pts[12][1],pts[22][0],pts[22][1],C.muted,3);if(!stage){[5,16,28,34,48,57].forEach(i=>out+=line(...source,...pts[i],C.teal,1.5,'opacity=".24"'));out+=line(...source,...pts[22],C.coral,2,'stroke-dasharray="6 8" opacity=".65"');}else{out+=line(...source,...pts[34],C.teal,5)+ring(...pts[34],C.teal,15);}return out;},
    forest(stage){let out=tree(98,233,1.15,C.muted)+tree(710,214,1.1,C.muted);if(stage===0){out+=line(279,129,368,75,C.teal,5)+dot(368,75,C.teal,9);}else if(stage===1){out+=line(188,297,279,351,'white',8)+ring(188,297,C.coral,12)+ring(279,351,C.coral,12);}else{out+=line(188,297,279,351,'white',8)+line(279,351,373,314,C.teal,5)+dot(373,314,C.teal,9)+line(798,150,879,80,C.teal,5)+dot(879,80,C.teal,9);}return out;},
    timeline(stage){let out=line(80,345,1050,345,C.line,4);for(let i=0;i<9;i++)out+=line(90+i*113,337,90+i*113,353,C.gray,2);out+=rect(172,312,173,20,C.gray,'none',3)+rect(425,312,85,20,C.gray,'none',3)+rect(625,308,393,28,stage?C.coral:C.gray,'none',4);out+=line(625,75,625,368,stage?C.coral:C.line,2,'stroke-dasharray="5 8"');out+=dot(625,321,C.coral,10);if(stage===0)out+=tree(190,175,.5,C.gray)+tree(425,175,.5,C.gray);if(stage>=1)out+=line(622,193,703,193,C.coral,6)+dot(622,193,C.gray,8)+dot(703,193,C.blue,10);if(stage>=2)out+=tree(703,193,1,C.blue,1);return out;},
    inside(stage){let out=tree(107,227,1.1,stage?C.gray:C.muted)+line(281,270,423,270,C.coral,6)+dot(423,270,C.blue,11);if(stage===0){out+=tree(423,270,1.55,C.ink);}else{out+=path('M353 88 L353 366',C.coral,2,'stroke-dasharray="6 9"');out+=group(stage===2?623:466,235,1.3,tree(0,0,1,C.blue,1));}if(stage===2){let x=623,y=235;[[74,-58],[78,56],[157,-91],[150,-20],[158,40],[158,103]].forEach(([a,b],i)=>out+=rect(x+a*1.3+11,y+b*1.3-5,20+(i%2)*9,10,[C.blue,C.teal,C.purple][i%3],'none',2));}return out;},
    embeddings(stage){let out='';const origins=[[62,252],[427,193],[784,258]];origins.forEach(([x,y],k)=>{out+=rect(x-24,46,303,333,'#f8fafb','none',12);for(let i=0;i<30;i++)out+=dot(x+((i*67+k*19)%253),76+((i*83+k*41)%275),C.line,2.5);let p=k===0?[[0,0],[58,-70],[80,49],[134,-96],[153,-21]]:k===1?[[0,0],[81,65],[101,-47],[179,101],[157,26]]:[[0,0],[65,-100],[76,37],[162,-63],[130,-142]];if(stage)p=p.map(([a,b],i)=>i?[a+(i%2?16:-8),-b*.8]:[a,b]);const es=[[0,1],[0,2],[1,3],[1,4]];es.forEach(([a,b],i)=>out+=line(x+p[a][0],y+p[a][1],x+p[b][0],y+p[b][1],[C.blue,C.teal,C.purple,C.teal][i],3.5));p.forEach(([a,b],i)=>{out+=dot(x+a,y+b,i===0?C.coral:C.ink,i===0?9:6)+rect(x+a+9,y+b-4,10+(i%3)*6,8,[C.blue,C.teal,C.purple,C.blue,C.teal][i],'none',2);});out+=ring(x,y,C.coral,17);});return out;},
    operations(stage){let out='';for(let i=0;i<3;i++){const x=90+i*380;out+=rect(x-30,53,260,290,i===stage?'#f3f7fb':'white',i===stage?C.line:'none',12);if(i===0)out+=tree(x,208,.86,C.muted,1);if(i===1)out+=tree(x,208,.86,C.blue,1)+ring(x+135,130,C.teal,13);if(i===2)out+=line(x,208,x+139,208,C.coral,6)+dot(x,208,C.gray,11)+dot(x+139,208,C.blue,11)+ring(x+139,208,C.blue,21);}return out;},
    orthogonal(stage){let out='';for(let i=0;i<3;i++){const y=97+i*113,c=[C.blue,C.teal,C.purple][i];out+=rect(62,y-33,1025,70,C.pale,'none',7)+line(125,y,806,y,c,4)+dot(125,y,c,10)+ring(821,y,c,13);if(stage)out+=arrow(844,y,981,y,C.coral,3)+dot(1000,y,C.coral,7);}return out;},
    hybrid(stage){let out=line(90,272,1015,272,C.teal,5);const p=[[90,272],[225,268],[360,257],[495,237],[630,217],[765,190],[900,155],[1030,120]];out+=path('M'+p.map(a=>a.join(' ')).join(' L'),C.blue,4);p.forEach(([x,y],i)=>{out+=dot(x,272,C.teal,7)+dot(x,y,C.blue,7);if(i>0)out+=line(x,y+8,x,263,C.gray,2,'stroke-dasharray="4 6"');});if(stage)out+=line(1066,122,1066,272,C.coral,3)+line(1058,122,1075,122,C.coral,3)+line(1058,272,1075,272,C.coral,3);return out;},
    walkmemory(stage){const x=[139,382,625,868];let out='';for(let i=0;i<3;i++)out+=line(x[i],100,x[i+1],100,C.gray,4);x.forEach((a,i)=>out+=dot(a,100,i===0?C.blue:i===3?C.teal:C.gray,10));let now=stage?2:1;out+=ring(x[now],100,C.blue,24);out+=record(358,205,342,160,0);if(stage===0){out+=dot(408,259,C.blue,9)+dot(640,259,C.blue,9)+line(426,259,622,259,C.purple,4)+rect(397,290,24,11,C.blue,'none',3)+rect(629,290,24,11,C.blue,'none',3);}else if(stage===1){out+=dot(408,259,C.gray,9)+dot(640,259,C.blue,9)+line(426,259,622,259,C.purple,4)+rect(397,290,24,11,C.gray,'none',3)+rect(629,290,24,11,C.blue,'none',3);}else{out+=dot(529,259,C.blue,12)+rect(514,290,30,11,C.blue,'none',3);}out+=line(x[now],130,529,192,C.blue,2,'stroke-dasharray="5 7" opacity=".5"');return out;},
    cycles(stage){let out='';function cycle(cx,cy,r,num){let points=[];for(let i=0;i<num;i++){let a=i*2*Math.PI/num;points.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}points.forEach(([x,y],i)=>{let [xx,yy]=points[(i+1)%num];out+=line(x,y,xx,yy,C.coral,3)+dot(x,y,i%2?C.teal:C.blue,7);});}cycle(172,130,66,6);cycle(337,263,83,8);arrow(479,205,604,205,C.gray,3);cycle(849,208,150,14);return out;}
  };
  const descriptions={oracle:'Random vertex labels reveal no geometry. A colored neighbor oracle returns one adjacent label.',uphill:'An upward chain with an alternative downward branch at each internal choice.',linewalk:'A line of ten column states with a stronger central coupling.',proofmap:'Partial records, a growing forest, and an escaping branch.',recording:'An algorithm workspace entangled with several possible partial databases.',unquery:'A query exposes a record; coherent uncomputation removes the temporary record.',permutations:'Independent matchings for vertex labels and compatible edge assignments.',rewire:'Two edges of the same color exchange endpoints while other colors stay fixed.',pipeline:'Three logical stages: invert the labeling, follow the edge, apply the labeling.',database:'Two partial databases support a connected labeled path.',freshchoices:'Few occupied endpoints among many fresh compatible choices.',forest:'Recorded trees grow, split when records are erased, and grow at fresh endpoints.',timeline:'A record is repeatedly inserted and removed; its final insertion starts a surviving branch.',inside:'Cut the selected weld conceptually, retain the outside, and describe the inside by its colored shape.',embeddings:'The same colored shape and label marks in three different structural placements.',operations:'Operations on the outside database, inside shape, and retained weld.',orthogonal:'Error vectors lie in separate orthogonal output sectors.',hybrid:'Actual and projected reference evolutions diverge by small successive errors; the reference cannot escape.',walkmemory:'Moving the current position temporarily stores an edge and two labels, then erases the edge and previous label.',cycles:'Several alternating weld cycles compared with one alternating cycle.'};
  descriptions.subspace='A state in the first good subspace evolves close to the second good subspace, with a small orthogonal error.';
  window.DeckVisuals={render(el,stage=0){
    const name=el.dataset.scene,fn=scenes[name];
    // Older slide markup uses data-scene; both entry points share the same graph.
    if(name==='collision')return window.WeldedGraph.render(el,{mode:'collision',stage});
    if(name==='proofmap'&&el.dataset.variant==='forest')return window.WeldedGraph.render(el,{mode:'recorded-forest',stage});
    if(name==='interference')return window.WeldedGraph.render(el,{mode:'interference',variant:el.dataset.variant||(stage?'recording':'source')});
    if(!fn)throw new Error('Unknown scene '+name);
    const attributes=['x1','y1','x2','y2','cx','cy','x','y'];
    const moving=['rewire','permutations','inside','embeddings'].includes(name)&&el.dataset.sceneStage!==undefined&&Number(el.dataset.sceneStage)!==stage&&el.closest('section.present')&&!location.search.includes('print-pdf')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previous=moving?Array.from(el.querySelectorAll('line,circle,rect')).map(node=>({tag:node.tagName,attrs:Object.fromEntries(attributes.map(k=>[k,node.getAttribute(k)]))})):[];
    if(el._morphFrame)cancelAnimationFrame(el._morphFrame);
    const description=name==='proofmap'?'A partial database of recorded assignments.':(descriptions[name]||name);
    const viewBox=name==='proofmap'?'0 0 340 260':'0 0 1120 440';
    el.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${description}"><title>${description}</title>${fn(stage,el.dataset.variant)}</svg>`;
    el.dataset.sceneStage=stage;
    if(!moving)return;
    const tweens=[];
    el.querySelectorAll('line,circle,rect').forEach((node,i)=>{const old=previous[i];if(!old||old.tag!==node.tagName)return;for(const attr of attributes){const before=old.attrs[attr],after=node.getAttribute(attr);if(before!==null&&after!==null&&before!==after&&Number.isFinite(Number(before))&&Number.isFinite(Number(after))){tweens.push({node,attr,a:Number(before),b:Number(after)});node.setAttribute(attr,before);}}});
    const start=performance.now();
    function frame(now){const t=Math.min(1,(now-start)/480),ease=t*t*(3-2*t);tweens.forEach(({node,attr,a,b})=>node.setAttribute(attr,a+(b-a)*ease));if(t<1)el._morphFrame=requestAnimationFrame(frame);}
    el._morphFrame=requestAnimationFrame(frame);
  }};
})();

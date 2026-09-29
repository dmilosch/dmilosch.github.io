(function () {
  'use strict';
  const slides=Array.from(document.querySelectorAll('.slides > section'));
  const printMode=new URLSearchParams(location.search).has('print-pdf');
  function renderSlide(slide,stage) {
    if (!slide) return;
    const max=Number(slide.dataset.stages||0);
    const current=stage===undefined?(printMode?max:slide.querySelectorAll('.steps .fragment.visible').length):stage;
    slide.dataset.currentStage=current;
    slide.querySelectorAll('[data-scene]').forEach(el=>window.DeckVisuals.render(el,current));
    slide.querySelectorAll('[data-walk-records]').forEach(el=>window.WalkRecords.render(el,current));
    slide.querySelectorAll('[data-escape-records]').forEach(el=>window.EscapeRecords.render(el,current));
    slide.querySelectorAll('[data-good-assignments]').forEach(el=>window.GoodAssignments.render(el,current));
    slide.querySelectorAll('[data-graph]').forEach(el=>{
      const options=JSON.parse(el.dataset.graph);
      window.WeldedGraph.render(el,Object.assign({stage:current},options));
    });
    slide.querySelectorAll('[data-show]').forEach(el=>{
      const visible=el.dataset.show.split(',').map(Number).includes(current);
      el.classList.toggle('stage-hidden',!visible);
      el.setAttribute('aria-hidden',String(!visible));
    });
    slide.querySelectorAll('[data-from]').forEach(el=>{
      const visible=current>=Number(el.dataset.from);
      el.classList.toggle('stage-hidden',!visible);
      el.setAttribute('aria-hidden',String(!visible));
    });
  }
  slides.forEach(slide=>{
    const count=Number(slide.dataset.stages||0);
    if(count){const steps=document.createElement('div');steps.className='steps';steps.setAttribute('aria-hidden','true');for(let i=0;i<count;i++){const step=document.createElement('span');step.className='fragment';step.dataset.fragmentIndex=i;steps.appendChild(step);}slide.appendChild(steps);}
    renderSlide(slide);
  });
  renderMathInElement(document.body,{delimiters:[{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false}],throwOnError:true,strict:'warn',ignoredTags:['script','noscript','style','textarea','pre','code','option','aside']});
  const mainSlides=slides.filter(s=>s.dataset.part!=='Backup');
  const backupSlides=slides.filter(s=>s.dataset.part==='Backup');
  window.DeckPresentation={slides,renderSlide,renderAllFinal(){slides.forEach(s=>renderSlide(s,Number(s.dataset.stages||0)));}};
  Reveal.initialize({
    width:1280,height:720,margin:0,minScale:0.1,maxScale:3,
    hash:true,history:true,hashOneBasedIndex:false,center:false,
    transition:'fade',transitionSpeed:'fast',backgroundTransition:'none',
    controls:true,controlsTutorial:false,controlsLayout:'bottom-right',controlsBackArrows:'faded',
    progress:true,keyboard:true,overview:true,touch:true,help:true,
    autoSlide:0,showNotes:false,pdfSeparateFragments:false,pdfMaxPagesPerSlide:1,
    slideNumber:()=>{const s=Reveal.getCurrentSlide()||slides[0];return [s.dataset.part==='Backup'?`A${backupSlides.indexOf(s)+1}`:`${mainSlides.indexOf(s)+1} / ${mainSlides.length}`];},
    plugins:[RevealNotes]
  }).then(async()=>{
    await document.fonts.ready;
    if(printMode)window.DeckPresentation.renderAllFinal();
    else renderSlide(Reveal.getCurrentSlide());
    Reveal.layout();
    document.documentElement.dataset.deckReady='true';
    window.dispatchEvent(new Event('deck-ready'));
  });
  Reveal.on('slidechanged',e=>renderSlide(e.currentSlide));
  Reveal.on('fragmentshown',()=>renderSlide(Reveal.getCurrentSlide()));
  Reveal.on('fragmenthidden',()=>renderSlide(Reveal.getCurrentSlide()));
})();

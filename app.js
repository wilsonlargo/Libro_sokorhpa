/*
 * SOKORHPA · lector editorial de muestra
 * Funciona localmente y sin bibliotecas externas.
 * La apariencia de cada hoja procede, sin remaquetar, del PDF original.
 */
(() => {
  'use strict';
  const TOTAL = 15;
  const labels = [
    'Portada','Ilustración: tejido','Presentación','El territorio de Sokorhpa',
    'Mapa del territorio','Guía de lectura','Contenido','Kosarhi: apertura',
    'Kosarhi: cartografía','Kosarhi: lectura bilingüe','Kosarhi: lectura bilingüe',
    'Kosarhi: lectura bilingüe','Kosarhi: lectura bilingüe','Kosarhi: archivo fotográfico',
    'Kosarhi: archivo fotográfico'
  ];
  const byId = id => document.getElementById(id);
  const $ = {
    shell:byId('bookShell'),stage:byId('bookStage'),leftSlot:byId('leftSlot'),rightSlot:byId('rightSlot'),
    left:byId('leftPage'),right:byId('rightPage'),leaf:byId('turningLeaf'),
    leafFront:byId('leafFront'),leafBack:byId('leafBack'),
    previousArrow:byId('previousArrow'),nextArrow:byId('nextArrow'),
    previousButton:byId('previousButton'),nextButton:byId('nextButton'),
    count:byId('pageCount'),jump:byId('jumpSelect'),thumbs:byId('thumbnailTrack'),
    zoomDialog:byId('zoomDialog'),zoomImage:byId('zoomImage'),zoomTitle:byId('zoomTitle'),
    zoomPercentage:byId('zoomPercentage'),zoomScroller:byId('zoomScroller'),
    resourcesDialog:byId('resourcesDialog'),resourcesGrid:byId('resourcesGrid')
  };
  const mobileQuery = window.matchMedia('(max-width:720px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {mobile:mobileQuery.matches,spread:0,page:1,turn:null,drag:null,quietUntil:0,zoom:1,zoomLandscape:false};
  const resourceItems = Array.isArray(window.SOKORHPA_RECURSOS) ? window.SOKORHPA_RECURSOS : [];

  function pageUrl(number){
    return number>=1 && number<=TOTAL ? `assets/paginas/pagina-${String(number).padStart(2,'0')}.webp` : '';
  }
  function setPage(img, number){
    const src=pageUrl(number);
    if(!src){img.removeAttribute('src');img.alt='';return;}
    if(img.getAttribute('src')!==src) img.src=src;
    img.alt=`Página ${number}. ${labels[number-1]}.`;
  }
  function visiblePages(){
    if(state.mobile) return {left:null,right:state.page};
    return {left:state.spread===0 ? null : state.spread*2,right:state.spread*2+1};
  }
  function canTurn(direction){
    if(state.mobile) return direction===1 ? state.page<TOTAL : state.page>1;
    return direction===1 ? state.spread<7 : state.spread>0;
  }
  function updateControls(){
    for(const control of [$.previousArrow,$.previousButton]) control.disabled=!canTurn(-1);
    for(const control of [$.nextArrow,$.nextButton]) control.disabled=!canTurn(1);
    const p=visiblePages();
    const primary=state.mobile ? `Página ${p.right}` : (p.left===null?'Portada':`Páginas ${p.left}–${p.right}`);
    const secondary=state.mobile ? `${labels[p.right-1]} · de 15` : (p.left===null?'Pág. 1 de 15':`${String(p.left).padStart(2,'0')}—${String(p.right).padStart(2,'0')} · de 15`);
    $.count.replaceChildren();
    const first=document.createElement('span');first.className='count-primary';first.textContent=primary;
    const second=document.createElement('span');second.className='count-secondary';second.textContent=secondary;
    $.count.append(first,second);
    $.jump.value=String(state.mobile?state.page:p.right);
    document.querySelectorAll('.thumb').forEach(el=>{
      const n=Number(el.dataset.page);
      const selected=state.mobile ? n===state.page : n===p.right||n===p.left;
      el.classList.toggle('active',selected);
      if(selected) el.setAttribute('aria-current','page');
      else el.removeAttribute('aria-current');
    });
    byId('zoomButton').title=`Ampliar página ${p.right}`;
  }
  function render(){
    const p=visiblePages();
    setPage($.left,p.left);
    setPage($.right,p.right);
    $.leftSlot.classList.toggle('is-empty',!p.left);
    $.shell.classList.toggle('is-cover',!state.mobile && state.spread===0);
    updateControls();
    for(let i=Math.max(1,p.right-2);i<=Math.min(TOTAL,p.right+3);i++){
      const img=new Image();img.src=pageUrl(i);
    }
  }

  function beginTurn(direction){
    if(state.turn||!canTurn(direction))return false;
    const forward=direction===1;
    const next=state.mobile ? state.page+direction : state.spread+direction;
    let baseLeft,baseRight,front,back;
    if(state.mobile){
      baseLeft=null;
      baseRight=forward ? state.page+1 : state.page;
      front=forward ? state.page : next;
      back=forward ? next : state.page;
    }else{
      baseLeft=forward ? (state.spread===0?null:state.spread*2) : (next===0?null:next*2);
      baseRight=forward ? next*2+1 : state.spread*2+1;
      front=forward ? state.spread*2+1 : next*2+1;
      back=forward ? next*2 : state.spread*2;
    }
    setPage($.left,baseLeft);setPage($.right,baseRight);
    $.leftSlot.classList.toggle('is-empty',!baseLeft);
    setPage($.leafFront,front);setPage($.leafBack,back);
    if(state.mobile && forward){
      // During a single-page turn the back of the departing sheet is plain paper.
      $.leafBack.removeAttribute('src');
    }
    $.leaf.style.transition='none';
    $.leaf.style.transform=forward?'rotateY(0deg)':'rotateY(-180deg)';
    $.leaf.classList.add('is-turning');
    $.stage.classList.add('is-turning');
    $.shell.classList.toggle('is-cover',!state.mobile && (forward?false:next===0));
    state.turn={direction,next,progress:0,finished:false};
    return true;
  }
  function setProgress(progress){
    if(!state.turn)return;
    progress=Math.max(0,Math.min(1,progress));
    state.turn.progress=progress;
    const angle=state.turn.direction===1 ? -180*progress : -180+180*progress;
    $.leaf.style.transform=`rotateY(${angle}deg)`;
  }
  function settle(commit){
    const turn=state.turn;if(!turn||turn.finished)return;
    turn.finished=true;
    const target=commit?1:0;
    const from=turn.progress;
    const targetAngle=turn.direction===1 ? -180*target : -180+180*target;
    const distance=Math.abs(from-target);
    const ms=reducedMotion.matches?15:Math.max(230,Math.round(720*distance));
    $.leaf.style.transition=`transform ${ms}ms cubic-bezier(.18,.7,.25,1)`;
    let done=false;
    function finish(){
      if(done)return;done=true;
      $.leaf.removeEventListener('transitionend',onTransition);
      if(state.turn!==turn)return;
      if(commit){if(state.mobile)state.page=turn.next;else state.spread=turn.next;}
      state.turn=null;
      $.leaf.classList.remove('is-turning');$.stage.classList.remove('is-turning');
      $.leaf.style.transition='none';$.leaf.style.transform='';
      render();
    }
    function onTransition(e){if(e.target===$.leaf && e.propertyName==='transform')finish();}
    $.leaf.addEventListener('transitionend',onTransition);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{$.leaf.style.transform=`rotateY(${targetAngle}deg)`;}));
    setTimeout(finish,ms+120);
  }
  function turn(direction){
    if(!beginTurn(direction))return;
    if(reducedMotion.matches){settle(true);return;}
    requestAnimationFrame(()=>requestAnimationFrame(()=>settle(true)));
  }
  function goToPage(n){
    n=Math.max(1,Math.min(TOTAL,Math.floor(Number(n)||1)));
    if(state.turn)return;
    if(state.mobile)state.page=n;else state.spread=Math.floor(n/2);
    render();
    document.querySelector(`.thumb[data-page="${n}"]`)?.scrollIntoView({inline:'nearest',block:'nearest',behavior:'smooth'});
  }
  function createThumbs(){
    const fragment=document.createDocumentFragment();
    for(let i=1;i<=TOTAL;i++){
      const button=document.createElement('button');
      button.type='button';button.className='thumb';button.dataset.page=String(i);
      button.setAttribute('aria-label',`Ir a la página ${i}: ${labels[i-1]}`);
      button.title=`${i}. ${labels[i-1]}`;
      const image=document.createElement('img');image.loading='lazy';image.alt='';
      image.src=`assets/miniaturas/pagina-${String(i).padStart(2,'0')}.webp`;
      const text=document.createElement('span');text.textContent=String(i).padStart(2,'0');
      button.append(image,text);
      button.addEventListener('click',()=>goToPage(i));
      fragment.appendChild(button);
    }
    $.thumbs.appendChild(fragment);
  }
  // Pointer-driven turns, with the next leaf following the drag direction.
  $.stage.addEventListener('pointerdown',event=>{
    if(state.turn||event.button!==0||event.target.closest('button'))return;
    const bounds=$.stage.getBoundingClientRect();
    const x=(event.clientX-bounds.left)/bounds.width;
    let direction=null;
    if(state.mobile){if(x>.42)direction=1;else if(x<.28)direction=-1;}
    else{if(x>.62)direction=1;else if(x<.38)direction=-1;}
    if(direction&&!canTurn(direction))return;
    state.drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,direction,started:false};
  });
  $.stage.addEventListener('pointermove',event=>{
    const drag=state.drag;if(!drag||drag.pointerId!==event.pointerId||!drag.direction)return;
    const diff=event.clientX-drag.startX;
    const displacement=drag.direction===1?-diff:diff;
    if(!drag.started){
      if(Math.abs(event.clientY-drag.startY)>25)return;
      if(displacement<10)return;
      if(!beginTurn(drag.direction))return;
      drag.started=true;
      try{$.stage.setPointerCapture(event.pointerId);}catch(_ignored){}
    }
    event.preventDefault();
    const width=$.stage.getBoundingClientRect().width/(state.mobile?1:2);
    setProgress(displacement/Math.max(1,width));
  });
  function endDrag(event){
    const drag=state.drag;if(!drag||drag.pointerId!==event.pointerId)return;
    state.drag=null;
    if(drag.started){
      state.quietUntil=Date.now()+400;
      settle(Boolean(state.turn&&state.turn.progress>=.24));
    }
  }
  $.stage.addEventListener('pointerup',endDrag);
  $.stage.addEventListener('pointercancel',endDrag);
  $.stage.addEventListener('click',event=>{
    if(Date.now()<state.quietUntil||state.turn)return;
    const rect=$.stage.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width;
    turn(x<(state.mobile?.30:.50)?-1:1);
  });

  for(const element of [$.nextArrow,$.nextButton]) element.addEventListener('click',()=>turn(1));
  for(const element of [$.previousArrow,$.previousButton]) element.addEventListener('click',()=>turn(-1));
  $.jump.addEventListener('change',()=>goToPage($.jump.value));
  byId('homeLink').addEventListener('click',event=>{event.preventDefault();goToPage(1);window.scrollTo({top:0,behavior:'smooth'});});
  document.addEventListener('keydown',event=>{
    if($.zoomDialog.open||$.resourcesDialog.open)return;
    if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
    if(event.key==='ArrowRight'){event.preventDefault();turn(1);}
    if(event.key==='ArrowLeft'){event.preventDefault();turn(-1);}
    if(event.key==='Home'){event.preventDefault();goToPage(1);}
    if(event.key==='End'){event.preventDefault();goToPage(15);}
    if(event.key==='Escape'&&document.fullscreenElement){document.exitFullscreen().catch(()=>{});}
  });
  function updateLayout(event){
    const mobile=event.matches;
    if(mobile===state.mobile)return;
    if(state.turn)return;
    if(mobile){state.page=state.spread*2+1;}
    else{state.spread=Math.floor(state.page/2);}
    state.mobile=mobile;render();
  }
  if(mobileQuery.addEventListener)mobileQuery.addEventListener('change',updateLayout);
  else mobileQuery.addListener(updateLayout);
  byId('fullscreenButton').addEventListener('click',()=>{
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    else document.querySelector('.reader').requestFullscreen?.().catch(()=>{});
  });

  function updateZoom(){
    const viewportWidth=$.zoomScroller.clientWidth||window.innerWidth;
    const baseWidth=state.zoomLandscape ? Math.min(1000,viewportWidth-28) : Math.min(720,viewportWidth-28);
    $.zoomImage.style.width=`${Math.round(baseWidth*state.zoom)}px`;
    $.zoomPercentage.textContent=`${Math.round(state.zoom*100)}%`;
  }
  function showImage(src,title){
    state.zoom=1;
    state.zoomLandscape=false;
    $.zoomTitle.textContent=title;
    $.zoomImage.onload=()=>{
      state.zoomLandscape=$.zoomImage.naturalWidth>$.zoomImage.naturalHeight;
      updateZoom();
      $.zoomScroller.scrollTo({top:0,left:0});
    };
    $.zoomImage.src=src;
    $.zoomImage.alt=title;
    $.zoomDialog.showModal();
    updateZoom();
  }
  byId('zoomButton').addEventListener('click',()=>{
    const p=visiblePages().right;
    showImage(pageUrl(p),`Página ${p} · ${labels[p-1]}`);
  });
  byId('zoomClose').addEventListener('click',()=>$.zoomDialog.close());
  byId('zoomIn').addEventListener('click',()=>{state.zoom=Math.min(3,Math.round((state.zoom+.25)*100)/100);updateZoom();});
  byId('zoomOut').addEventListener('click',()=>{state.zoom=Math.max(.75,Math.round((state.zoom-.25)*100)/100);updateZoom();});
  window.addEventListener('resize',()=>{if($.zoomDialog.open)updateZoom();});
  $.zoomDialog.addEventListener('click',event=>{if(event.target===$.zoomDialog)$.zoomDialog.close();});

  function buildResources(){
    const f=document.createDocumentFragment();
    for(const item of resourceItems){
      const tile=document.createElement('button');tile.type='button';tile.className='resource-tile';
      const frame=document.createElement('span');frame.className='resource-image';
      const image=document.createElement('img');image.loading='lazy';image.src=item.thumb;image.alt='';
      const name=document.createElement('span');name.className='resource-name';name.textContent=item.name;
      frame.appendChild(image);tile.append(frame,name);
      tile.title=`Ampliar: ${item.name}`;
      tile.addEventListener('click',()=>{$.resourcesDialog.close();showImage(item.file,item.name);});
      f.appendChild(tile);
    }
    $.resourcesGrid.appendChild(f);
    document.querySelector('.resource-number').textContent=String(resourceItems.length);
  }
  byId('resourcesButton').addEventListener('click',()=>$.resourcesDialog.showModal());
  byId('resourcesClose').addEventListener('click',()=>$.resourcesDialog.close());
  $.resourcesDialog.addEventListener('click',event=>{if(event.target===$.resourcesDialog)$.resourcesDialog.close();});
  buildResources();createThumbs();render();
})();

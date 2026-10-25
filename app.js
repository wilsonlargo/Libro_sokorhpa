/*
 * SOKORHPA · lector editorial de muestra
 * Funciona localmente y sin bibliotecas externas.
 * La apariencia de cada hoja procede, sin remaquetar, del PDF original.
 */
(() => {
  'use strict';
  const TOTAL = 31;
  const labels = [
    'Portada','Tejido tradicional','Presentación','El territorio de Sokorhpa',
    'Mapa del territorio','Guía de lectura','Índice actualizado','Sokorhpa · apertura',
    'Sokorhpa · mapa comunitario','Sokorhpa · nombre y significado',
    'Sokorhpa · ubicación y afluentes','Sokorhpa · lugares sagrados',
    'Sokorhpa · sitios de interés','Sokorhpa · aspectos sociales y políticos',
    'Sokorhpa · historia comunitaria','Sokorhpa · organización comunitaria',
    'Sokorhpa · economía propia','Sokorhpa · plantas y frutos',
    'Sokorhpa · plantas medicinales','Sokorhpa · materiales para artesanías',
    'Sokorhpa · fauna y avances tecnológicos','Kosarhi · apertura',
    'Kosarhi · mapa comunitario','Kosarhi · lectura bilingüe',
    'Kosarhi · lectura bilingüe','Kosarhi · lectura bilingüe',
    'Kosarhi · lectura bilingüe','Kosarhi · fotografía comunitaria',
    'Kosarhi · fotografía comunitaria','Kosarhi · ilustración comunitaria',
    'Owaya Koyipa / Tierra Fría · mapa comunitario'
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
    resourcesDialog:byId('resourcesDialog'),resourcesGrid:byId('resourcesGrid'),
    pageHotspots:byId('pageHotspots'),zoomHotspots:byId('zoomHotspots'),
    zoomCanvas:byId('zoomCanvas'),interactiveNote:byId('interactiveNote')
  };
  const mobileQuery = window.matchMedia('(max-width:720px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {mobile:mobileQuery.matches,spread:0,page:1,turn:null,drag:null,quietUntil:0,zoom:1,zoomLandscape:false,noteTimer:null,zoomPage:0};
  const resourceItems = Array.isArray(window.SOKORHPA_RECURSOS) ? window.SOKORHPA_RECURSOS : [];

  function pageUrl(number){
    return number>=1 && number<=TOTAL ? `assets/paginas/pagina-${String(number).padStart(2,'0')}.webp` : '';
  }
  // Las coordenadas de los enlaces son porcentajes de la página original,
  // no de la pantalla. Por ello conservan su posición en móvil y al ampliar.
  const indexEntries = [
    {name:'Sokorhpa',page:9},
    {name:'Kosarhi',page:23},
    {name:'Owaya Koyipa / Tierra Fría',page:31},
    {name:'Asatatpo',page:39},
    {name:'Las Peñas',page:47},
    {name:'Kushna Ayitpo',page:51},
    {name:'Santo Tomás / Wayiko',page:59},
    {name:'Mayoría',page:67},
    {name:'Kuya',page:73},
    {name:'Ipika',page:81}
  ];
  // Map coordinates correspond to the unchanged cartography on page 5.
  // Pending entries remain discoverable but never navigate outside the sample.
  const mapEntries = [
    {name:'Sokorhpa / La Misión',page:9,left:60.7,top:51.3,width:19.2,height:3.3,
     description:'El nombre Sokorhpa se relaciona con el rocío permanente que mantenía húmeda la vegetación de este lugar.'},
    {name:'Kosarhi',page:23,left:44.1,top:73.4,width:9.7,height:4.2,
     description:'Su nombre recuerda los brotes de palma cocotera que abundaban junto a los caños cuando llegaron los primeros habitantes.'},
    {name:'Owaya Koyipa / Tierra Fría',page:31,left:55,top:72.1,width:13.4,height:5.1,
     description:'El nombre Tierra Fría se relaciona con el clima de montaña de la comunidad; en yukpa se denomina Owaya Koyipa.'},
    {name:'Asatatpo',page:39,left:12.9,top:70.4,width:16.1,height:5.5,
     description:'Nombre ancestral asociado a lugares de descanso, encuentro y actividades comunitarias como la pesca.'},
    {name:'Las Peñas',page:47,left:41.5,top:68.1,width:9.1,height:4.3,
     description:'Asentamiento del territorio Yukpa de Sokorhpa.'},
    {name:'Kushna Ayitpo',page:51,left:29.6,top:51.9,width:13.5,height:4.1,
     description:'Lugar recordado como punto de descanso y recolección durante los recorridos ancestrales.'},
    {name:'Santo Tomás / Wayiko',page:59,left:69.6,top:55,width:10.2,height:4.7,
     description:'Wayiko es el nombre tradicional del barro utilizado para elaborar pipas y vasijas.'},
    {name:'Mayoría',page:67,left:50.6,top:66.6,width:8.2,height:4.7,
     description:'Comunidad también conocida por el nombre Yikunashkakoch.'},
    {name:'Kuya',page:73,left:12.4,top:49.6,width:8.9,height:5.2,
     description:'Kuya es el nombre en lengua wonirh de la palma de iraca presente en el lugar.'},
    {name:'Ipika',page:81,left:6.9,top:57.3,width:8.3,height:5.2,
     description:'Comunidad de la zona baja del resguardo, a orillas del río Maracas.'}
  ];
  function informUnavailable(entry){
    clearTimeout(state.noteTimer);
    $.interactiveNote.textContent=`${entry.name} comienza en la página ${entry.page}. Esta muestra contiene solamente las páginas 1 a ${TOTAL}.`;
    $.interactiveNote.hidden=false;
    state.noteTimer=setTimeout(()=>{$.interactiveNote.hidden=true;},5200);
  }
  function navigateFromPage(entry){
    if(entry.page>TOTAL){if($.zoomDialog.open)$.zoomDialog.close();informUnavailable(entry);return;}
    if($.zoomDialog.open)$.zoomDialog.close();
    goToPage(entry.page);
  }
  function createInteractiveButton(kind,label,entry){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className=`page-hotspot ${kind}`;
    btn.setAttribute('aria-label',label);
    btn.title=kind==='index-hotspot' ? (entry.page<=TOTAL ? `Ir a ${entry.name} · página ${entry.page}` : `${entry.name} · página ${entry.page} todavía no incorporada`) : '';
    // El clic sobre el texto del mapa o del índice nunca debe pasar hojas.
    for(const type of ['pointerdown','pointerup','pointermove','click']){
      btn.addEventListener(type,event=>event.stopPropagation());
    }
    btn.addEventListener('click',()=>navigateFromPage(entry));
    return btn;
  }
  function fillHotspots(layer,page){
    layer.replaceChildren();
    layer.hidden=page!==5&&page!==7;
    if(layer.hidden)return;
    if(page===5){
      mapEntries.forEach(entry=>{
        const available=entry.page<=TOTAL;
        const hotspot=createInteractiveButton(
          'map-hotspot'+(available?'':' is-pending'),
          `${entry.name}. ${entry.description} ${available ? 'Abrir capítulo en la página '+entry.page : 'Capítulo aún no disponible: página '+entry.page}.`,
          entry
        );
        Object.assign(hotspot.style,{
          left:entry.left+'%',top:entry.top+'%',width:entry.width+'%',height:entry.height+'%'
        });
        hotspot.classList.add(entry.left<20?'map-spot-west':(entry.left>60?'map-spot-east':'map-spot-center'));
        const tip=document.createElement('span');
        tip.className='map-tooltip';tip.setAttribute('role','tooltip');
        const heading=document.createElement('strong');heading.textContent=entry.name;
        const desc=document.createElement('span');desc.textContent=entry.description;
        const link=document.createElement('em');
        link.textContent=available ? `Ir al capítulo · página ${entry.page} ↗` : `Próximamente · página ${entry.page}`;
        tip.append(heading,desc,link);hotspot.appendChild(tip);
        layer.appendChild(hotspot);
      });
    }else{
      indexEntries.forEach((entry,i)=>{
        const active=entry.page<=TOTAL;
        const hotspot=createInteractiveButton(
          'index-hotspot'+(active?'':' is-pending'),
          active ? `Abrir ${entry.name}, página ${entry.page}` : `${entry.name}, página ${entry.page}, aún no incorporada a la muestra`,
          entry
        );
        hotspot.style.left='6.9%';hotspot.style.top=`${28.05+i*5.5}%`;
        hotspot.style.width='86.2%';hotspot.style.height='4.3%';
        layer.appendChild(hotspot);
      });
    }
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
    return direction===1 ? state.spread<Math.floor((TOTAL-1)/2) : state.spread>0;
  }
  function updateControls(){
    for(const control of [$.previousArrow,$.previousButton]) control.disabled=!canTurn(-1);
    for(const control of [$.nextArrow,$.nextButton]) control.disabled=!canTurn(1);
    const p=visiblePages();
    const primary=state.mobile ? `Página ${p.right}` : (p.left===null?'Portada':`Páginas ${p.left}–${p.right}`);
    const secondary=state.mobile ? `${labels[p.right-1]} · de ${TOTAL}` : (p.left===null?`Pág. 1 de ${TOTAL}`:`${String(p.left).padStart(2,'0')}—${String(p.right).padStart(2,'0')} · de ${TOTAL}`);
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
    fillHotspots($.pageHotspots,p.right);
    byId('readerHelp').textContent=p.right===5 ? 'Mapa interactivo: explora los asentamientos, conoce su nombre y visita los capítulos disponibles' : p.right===7 ? 'Índice interactivo actualizado: selecciona una comunidad para abrir su capítulo' : 'Haz clic en los bordes para pasar las hojas · Arrastra la esquina para girarlas · Usa ← →';
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
  function populatePageSelect(){
    $.jump.replaceChildren();
    labels.forEach((label,i)=>{
      const option=document.createElement('option');
      option.value=String(i+1);
      option.textContent=String(i+1).padStart(2,'0')+' · '+label;
      $.jump.appendChild(option);
    });
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
    if(event.key==='End'){event.preventDefault();goToPage(TOTAL);}
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
    $.zoomCanvas.style.width=`${Math.round(baseWidth*state.zoom)}px`;
    $.zoomPercentage.textContent=`${Math.round(state.zoom*100)}%`;
  }
  function showImage(src,title,pageNumber=0){
    state.zoom=1;
    state.zoomLandscape=false;
    state.zoomPage=pageNumber;
    fillHotspots($.zoomHotspots,pageNumber);
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
    showImage(pageUrl(p),`Página ${p} · ${labels[p-1]}`,p);
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
  buildResources();populatePageSelect();createThumbs();render();
})();

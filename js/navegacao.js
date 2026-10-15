/* Painel SGQ · CRCO — js/navegacao.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/navegacao.js']='0.18.0';
  function pgVisLer(){ try{ return JSON.parse(localStorage.getItem('crco-pgvis')||'{}')||{}; }catch(e){ return {}; } }
  function pgVisDef(aba,on){ state.pgVis[aba]=on; try{ localStorage.setItem('crco-pgvis',JSON.stringify(state.pgVis)); }catch(e){} pgVisSw(); render(); }
  function pgVisSw(){ var el=$('pgVisSw'); if (el) el.innerHTML=''; var bv=$('btnVis'), k=state.aba; if (bv) bv.setAttribute('aria-pressed',(k==='vis'||(PG_VIS[k]&&state.pgVis[k]))?'true':'false'); }
  function menuAbrir(sim){ document.body.classList.toggle('menu-aberto',!!sim); $('menuFundo').hidden=!sim; }
  function irAba(k){ if ((k==='imp'||k==='eqp'||k==='apr') && !podeEscrever) k='geral'; if (typeof svModo==='function' && svModo()==='cert' && (k==='geral'||SO_SERV.indexOf(k)>=0)) k='cer'; state.aba=k; $('pgGeral').hidden=k!=='geral'; $('pgConteudo').hidden=k==='geral'||k==='imp'; $('importar').hidden=k!=='imp'; $('pgTitulo').textContent=TITULOS[k]||''; pgVisSw(); menuAbrir(false); window.scrollTo(0,0); if (k==='geral'){ if (state.sujo&&state.sujo.geral) pagPendente('geral'); else renderGraficos(); } document.querySelectorAll('.tab').forEach(function(b){ b.setAttribute('aria-selected',b.dataset.tab===k?'true':'false'); });
    var MAP={nat:'tabNat',k1:'tabK1',cer:'tabCer',eta:'tabEta',fp:'tabFp',ex:'tabEx',nao:'tabNao',at:'tabAt',tri:'tabTri',lanc:'tabLanc',rel:'tabRel',met:'tabMet',des:'tabDes',vis:'tabVis',cfg:'tabCfg',sau:'tabSau',eqp:'tabEqp',apr:'tabApr'}; Object.keys(MAP).forEach(function(x){ $(MAP[x]).hidden=state.aba!==x; });
    if (state.sujo && ['rel','tri','lanc','at'].indexOf(k)>=0) delete state.sujo[k]; else if (k!=='geral') pagPendente(k);
    if (k==='rel') renderRel(); if (k==='cfg') renderCfg(); if (k==='sau') renderSau(); if (k==='eqp') renderEqp(); if (k==='apr') renderApr(); if (k==='tri') renderTri(); if (k==='imp') renderExcluir();  if (k==='lanc') renderLanc(); if (k==='at') renderAtend(); if (k==='des') renderDes(); if (k==='vis') renderVis(); var bv=$('btnVis'); if (bv) bv.setAttribute('aria-pressed',(k==='vis'||(PG_VIS[k]&&state.pgVis[k]))?'true':'false'); }
  function avRascunho(t){ var row=t.closest&&t.closest('#tabEx tr[data-cod]'); if (!row||!t.matches('select.mini,input.mini')) return false;
    var cod=row.dataset.cod, a=atoPorCod(cod); if (!a) return true; var res=row.querySelector('select').value, ob=row.querySelector('input').value.trim(), sv=state.aval[idDoc(cod)]||{};
    if ((sv.resultado||'')===res && (sv.obs||'')===ob) delete state.avDraft[cod]; else state.avDraft[cod]={res:res,obs:ob};
    row.classList.toggle('rasc',!!state.avDraft[cod]); var n=Object.keys(state.avDraft).length, b=$('avTudo'); if (b){ b.disabled=!n; b.textContent=n?'Salvar tudo ('+n+' alterada'+(n>1?'s':'')+')':'Salvar tudo'; }
    if (t.tagName==='SELECT'){ var bf=row.querySelector('[data-av-fb]'); if (res==='nc' && !bf){ var sb=row.querySelector('[data-av-salvar]'); sb.insertAdjacentHTML('afterend',' <button class="btn sm" type="button" data-av-fb="1" title="Abrir o feedback da pessoa que redigiu a exigência">→ Feedback</button>'); } else if (res!=='nc' && bf) bf.remove(); }
    return true; }
  function dicaGo(el,toq){ var g=el.dataset.goh?el:(el.closest&&el.closest('[data-go]')); return g&&g.dataset.goh?'<div class="tip-go">▸ '+(toq?'Toque de novo para ':'Clique para ')+esc(g.dataset.goh)+'</div>':''; }
  // no celular o 1º toque mostra a dica; o 2º toque no mesmo elemento abre
  function toqueSoDica(el){ if (Date.now()-toque.t>900 || toque.el!==el || !toque.novo || !el.hasAttribute('data-tip')) return false; toque.novo=false; return true; }
  function avisar(t){ var a=$('avisoDb'); a.textContent=t; a.hidden=false; }

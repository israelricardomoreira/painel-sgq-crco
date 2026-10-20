/* Painel SGQ · CRCO — js/kpis.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/kpis.js']='0.21.0';
  function compLabel(m){ var p=m.split('-'); return p[1]+'. '+MES_C[+p[1]-1]+'/'+p[0]; }
  function evidLabel(m){ var p=m.split('-'); return MES_C[+p[1]-1]+' '+p[0]; }
  function mesAnt(m){ var p=m.split('-').map(Number); p[1]--; if(!p[1]){ p[1]=12; p[0]--; } return p[0]+'-'+(p[1]<10?'0':'')+p[1]; }
  function mesHoje(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()<9?'0':'')+(d.getMonth()+1); }
  function numBR(x,dec){ if (x==null||isNaN(x)) return ''; var d=dec==null?2:dec, f=Math.pow(10,d); return (Math.round(x*f)/f).toLocaleString('pt-BR',{maximumFractionDigits:d,useGrouping:false}); }
  function numIn(s){ if (s==null) return null; s=String(s).trim(); if (!s) return null; var m=s.match(/^(\d+):(\d{1,2})$/); if (m) return +m[1]+(+m[2])/60; var v=parseFloat(s.replace(/\./g,'').replace(',','.')); if (/^\d+\.\d+$/.test(s)) v=parseFloat(s); return isNaN(v)?null:v; }
  function mmss(min){ var t=Math.round(min*60); return Math.floor(t/60)+'m'+String(t%60).padStart(2,'0')+'s'; }
  function maior(x){ return function(r){ return r>=x; }; } function menor(x){ return function(r){ return r<=x; }; }
  function kpiDef(id){ for (var i=0;i<KPIS.length;i++) if (KPIS[i].id===id) return KPIS[i]; return null; }
  function kpEntrada(m,id){ var d=state.kp[m]; return (d&&d.v&&d.v[id])||{}; }
  function histDe(m,id){ var d=state.kp[m]; if (d&&d.hist) return d.hist[id]||null; return (HIST_SEMENTE[m]&&HIST_SEMENTE[m][id])||null; }
  function histMigrar(){ if (histMigrado || !dbPronto || !podeEscrever || !window.nuvem) return; histMigrado=true;
    var p=Promise.resolve(), n=0;
    Object.keys(HIST_SEMENTE).forEach(function(m){ p=p.then(function(){ return window.nuvem.ler('kpis',m).then(function(x){ if (x&&x.hist) return;
      var doc={mes:m, v:(x&&x.v)||{}, lanc:(x&&x.lanc)||{}, hist:JSON.parse(JSON.stringify(HIST_SEMENTE[m]))};
      return db.doc('kpis/'+m).set(doc).then(function(){ n++; state.kp[m]=Object.assign({},state.kp[m]||{mes:m,v:doc.v,lanc:doc.lanc},{hist:doc.hist}); }); }); }); });
    p.then(function(){ if (n) toast('Histórico dos KPIs manuais guardado no banco ('+n+' meses)'); }).catch(function(){ histMigrado=false; }); }
  function k9Ler(rows, nomeArq){
    var funcs={}, cur=null, per=null;
    rows.forEach(function(r){
      r.forEach(function(c){ if (!per && typeof c==='string'){ var mm=c.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(?:à|a|até|-)\s*(\d{2})\/(\d{2})\/(\d{4})/); if (mm) per=mm; } });
      var mat=r[1], c7=r[6], val=r[10];
      if (typeof mat==='number' && mat%1===0 && typeof c7==='string' && c7.trim().length>5){ cur=String(mat); funcs[cur]={nome:c7.trim(),ev:{}}; }
      else if (cur && typeof c7==='string' && typeof val==='number' && c7.indexOf('Total')!==0) funcs[cur].ev[c7.trim()]=(funcs[cur].ev[c7.trim()]||0)+val;
    });
    var ks=Object.keys(funcs); if (!ks.length) return null;
    var mes=per?per[6]+'-'+per[5]:null;
    var jorn=ks.map(function(k){ return K9_JOR.reduce(function(s,e){ return s+(funcs[k].ev[e]||0); },0); }).filter(function(x){return x>0;}).sort(function(a,b){return a-b;});
    var md=jorn.length?(jorn.length%2?jorn[(jorn.length-1)/2]:(jorn[jorn.length/2-1]+jorn[jorn.length/2])/2):0, jornada=Math.round(md);
    var hAus=0, hLeg=0, pessoas=[];
    ks.forEach(function(k){ var ev=funcs[k].ev, h=0, hl=0, comp=[];
      K9_AUS.forEach(function(e){ if (ev[e]){ h+=ev[e]; comp.push(e+': '+numBR(ev[e])+'h'); } });
      K9_LEG.forEach(function(e){ if (ev[e]){ hl+=ev[e]; comp.push(e+': '+numBR(ev[e])+'h'); } });
      hAus+=h; hLeg+=hl; if (h>0||hl>0) pessoas.push({mat:k, nome:funcs[k].nome, h:Math.round(h*100)/100, hl:Math.round(hl*100)/100, comp:comp.join(' · ')}); });
    return {mes:mes, periodo:per?per[1]+'/'+per[2]+'/'+per[3]+' a '+per[4]+'/'+per[5]+'/'+per[6]:'', arquivo:nomeArq, headcount:ks.length, jornada:jornada,
      hAus:Math.round(hAus*100)/100, hLeg:Math.round(hLeg*100)/100, prev:ks.length*jornada, pessoas:pessoas, em:new Date().toISOString()};
  }


  // valores de cada KPI no mês: {n,d,r,fonte,txt,aviso}
  // 1.10.1: ao marcar "lançado", o valor do mês fica travado (é o que está no ANOREG+). O cálculo vivo continua disponível em o.atual.
  function kpiTravado(m,id){ var L=state.kp[m]&&state.kp[m].lanc&&state.kp[m].lanc[id]; return (L&&typeof L==='object')?L:null; }
  function kpiValor(id, m, semTexto, vivo){
    var f=vivo?null:kpiTravado(m,id), o=kpiValorVivo(id,m,semTexto);
    if (!f) return o;
    if (f.n==null) return o?Object.assign({},o,{atual:o, travado:f}):null;
    return {n:f.n, d:f.d, r:f.r, txt:f.txt||'', fonte:'Lançado no ANOREG+ em '+fmtDataHora(f.em)+' (painel '+(f.ver||'?')+')', travado:f, atual:o};
  }
  function fmtDataHora(iso){ if (!iso) return '?'; var d=new Date(iso); return isNaN(d)?'?':d.toLocaleDateString('pt-BR'); }
  function kpiTravar(K,m){
    var o=kpiValorVivo(K.id,m), e=kpEntrada(m,K.id), txt=e.a!=null?e.a:((o&&o.txt)||'');
    return {n:o?o.n:null, d:o?o.d:null, r:o?o.r:null, sit:kpiSituacao(K,o), txt:txt, em:new Date().toISOString(), ver:APP_VERSAO};
  }
  function kpiValorVivo(id, m, semTexto){
    var K=kpiDef(id), e=kpEntrada(m,id), h=histDe(m,id), o=null;
    if (K.auto==='k1' && state.docs[m]){
      var todos=incTodos(), d=state.docs[m], temInc=(state.inconf[m]||[]).length>0;
      if (todos.length){
        { var q=kpi1Mes(d.atos,todos), R={}; d.atos.forEach(function(a){ if (a.cat==='R') R[a.c]=1; });
          var cc={}; todos.forEach(function(r){ if (r.t==='RI' && R[r.c]){ var c=catDe(r); cc[c]=(cc[c]||0)+1; } });
          var top=Object.keys(cc).sort(function(a,b){return cc[b]-cc[a];}).slice(0,3).map(function(c){ return c+' ('+cc[c]+')'; });
          o={n:q.c, d:q.n, fonte:'Painel · atos com inconformidade', txt:q.c+' dos '+q.n+' atos RI registrados no mês tiveram ao menos 1 inconformidade'+(q.e?' ('+q.e+' com erro externo)':'')+'.'+(top.length?' Principais erros: '+top.join('; ')+'.':'')}; }
        var maxD=todos.reduce(function(s,r){ return r.d>s?r.d:s; },''), pm=m.split('-').map(Number), ult=m+'-'+new Date(pm[0],pm[1],0).getDate();
        if (!temInc) o.aviso='Não há inconformidades importadas com data neste mês — confira se a planilha cobre o mês inteiro.';
        else if (maxD<ult) o.aviso='Inconformidades importadas só até '+maxD.split('-').reverse().join('/')+' — importe a planilha do mês inteiro antes de lançar.';
      }
    } else if ((K.auto==='k2'||K.auto==='k2c') && state.docs[m]){
      aplicarTri7(); var s=resumo(state.docs[m].atos), xT=cancSoTri7Mes(m,true);
      if (K.auto==='k2') o={n:s.dentro, d:s.n, fonte:'Painel · 20 d.u. (retorno + 5)', txt:s.dentro+' de '+s.n+' atos RI registrados no mês concluídos dentro do prazo legal (20 dias úteis — art. 205 c/c art. 9º, §1º, da Lei 6.015/73; com reingresso, 5 dias úteis após o retorno — art. 188, §1º, III)'+(s.J?', incluindo '+s.J+' com prazo especial justificado':'')+'. Mediana de '+numBR(s.medB,1)+' dias úteis do ingresso ao registro. Pesquisas qualificadas, Informação Verbal - Visualização de Matrícula e protocolos cancelados ficam fora da base.'};
      else o={n:s.N+xT.length, d:s.total+xT.length, fonte:'Painel · cancelados (VHL + Tri7)', txt:(s.N+xT.length)+' de '+(s.total+xT.length)+' protocolos do mês não chegaram ao registro (cancelamento por decurso do prazo após exigência não cumprida, desistência ou devolução)'+(xT.length?', incluindo '+xT.length+' cancelado'+(xT.length>1?'s':'')+' no Tri7 e ainda sem finalização no VHL':'')+'.'};
    } else if (K.auto==='k9' && state.k9[m]){
      var k=state.k9[m], pic=k.pessoas.filter(function(p){return p.h>=28;}).length;
      o={n:k.hAus, d:k.prev, fonte:'Rel. Eventos '+(k.periodo||''), txt:'Ausência gerenciável de '+numBR(k.hAus)+' h (atestados e faltas abonadas) sobre jornada prevista de '+numBR(k.prev,0)+' h ('+k.headcount+' colaboradores × '+k.jornada+' h).'+(k.hLeg?' Afastamento legal (licença) de '+numBR(k.hLeg)+' h rastreado à parte, fora da meta.':'')+(pic?' '+pic+' colaborador(es) com pico ≥ 28 h no mês.':' Sem pico individual ≥ 28 h no mês.')};
    } else if (K.auto==='k8'){
      var hc=state.k9[m]?state.k9[m].headcount:(h?h[1]:null), at=numIn(e.ativos)!=null?numIn(e.ativos):hc, ad=numIn(e.adm), de=numIn(e.desl);
      if (ad!=null||de!=null){ ad=ad||0; de=de||0; o={n:(ad+de)/2, d:at, fonte:'Manual', txt:(ad||de?ad+' admissão(ões) e '+de+' desligamento(s) no mês, sobre '+at+' colaboradores ativos.':'Sem admissões ou desligamentos no mês.')}; }
    } else if (K.auto==='k13' && state.senhas[m]){
      var S=senhasResumo(state.senhas[m].L), mn=Math.round(S.med/60*100)/100;
      o={n:mn, d:100, fonte:'Consulta de senhas (VHL)', txt:'Tempo médio de espera de '+fmtMS(S.med)+' ('+numBR(mn)+' min) em '+S.na+' senhas atendidas. Mediana de '+fmtMS(S.mediana)+'; '+numBR(S.na?S.a10/S.na*100:0,1)+'% esperaram 10 min ou mais (gatilho do PCA) e a espera máxima foi de '+fmtMS(S.mx)+'.'+(S.des?' '+S.des+' senhas finalizadas sem chamada (desistência).':'')};
    } else if (!K.auto || (K.auto==='k13' && !state.senhas[m])){
      var n=numIn(e.n), dd=K.cont?0:(K.den!=null?K.den:numIn(e.d));
      if (n!=null && dd!=null){ o={n:n, d:dd, fonte:'Manual'};
        if (K.cont) o.txt=n?n+' ocorrência(s) no mês — tratamento caso a caso ('+K.cont+').':'Sem ocorrência reportada no período.';
        else if (K.minutos) o.txt='Tempo médio de espera de '+mmss(n)+' (VHL). '+numBR(n)+' equivale a '+mmss(n)+'.';
        else if (!dd && K.vazio) o.txt=K.vazio; }
    }
    if (!o && h) o={n:h[0], d:h[1], fonte:'Já lançado no ANOREG+', hist:true};
    if (!o) return null;
    o.r=o.d?o.n/o.d*100:null;
    if (K.cont) o.r=null;
    if (h && !o.hist) o.lancado=h;
    return o;
  }
  function kpiSituacao(K,o){
    if (!o) return '';
    if (K.baseline) return 'Baseline';
    if (K.cont) return o.n?'Não atende':'Atende';
    if (o.r==null) return K.zeroOk?'Atende':'Sem apuração';
    if (K.implant && o.r<100) return 'Em andamento';
    return K.bom(o.r)?'Atende':'Não atende';
  }
  function kpiComp(o){ return o==null?null:(o.r!=null?o.r:o.n); }
  function kpiTendencia(K,o,m){
    if (!o) return '';
    if (K.implant && o.r>=100) return '✓ meta atingida';
    var p=null, mm=m; for (var i=0;i<3&&p==null;i++){ mm=mesAnt(mm); p=kpiComp(kpiValor(K.id,mm)); }
    var a=kpiComp(o); if (p==null||a==null) return '● primeira medição';
    var df=Math.round((a-p)*100)/100; return df>0?'↗':df<0?'↓':'→';
  }
  function kpiTendLeitura(K,o,m){
    if (!o || K.implant) return '';
    var p=null, mm=m; for (var i=0;i<3&&p==null;i++){ mm=mesAnt(mm); p=kpiComp(kpiValor(K.id,mm)); }
    var a=kpiComp(o); if (p==null||a==null) return '';
    var df=Math.round((a-p)*100)/100; if (!df) return 'estável em relação a '+nomeMes(mm);
    var menorMelhor=K.sentido==='menor'||!!K.cont||K.auto==='k2c';
    return ((df<0)===menorMelhor?'melhorou':'piorou')+' em relação a '+nomeMes(mm);
  }
  function lancMeses(){
    var s={}; [state.docs,state.k9,state.kp,HIST_SEMENTE,state.senhas].forEach(function(o){ Object.keys(o||{}).forEach(function(m){ if (/^\d{4}-\d{2}$/.test(m)) s[m]=1; }); });
    var h=mesHoje(); s[h]=1; s[mesAnt(h)]=1; return Object.keys(s).sort().reverse();
  }
  function cp(lab, val, cls){ var v=val==null?'':String(val); return '<button type="button" class="cp'+(cls?' '+cls:'')+'" data-cp="'+esc(v)+'" title="Clique para copiar"><span class="cpl">'+lab+'</span><span class="cpv">'+(v?esc(v):'<i>vazio</i>')+'</span></button>'; }
  function cardSaida(K, m){
    var o=kpiValor(K.id,m), sit=kpiSituacao(K,o), tend=kpiTendencia(K,o,m), e=kpEntrada(m,K.id);
    var txt=(o&&o.travado&&o.travado.n!=null)?(o.txt||''):(e.a!=null?e.a:((o&&o.txt)||''));
    var nTxt=o?numBR(o.n):'', dTxt=o?numBR(o.d):'';
    var h='<div class="lc-grid">'+cp('Competência',compLabel(m))+cp('KPI',K.id)+cp('Indicador',K.nome,'w2')+cp('Numerador',nTxt,'big')+cp('Denominador',dTxt,'big')+cp('Meta',K.meta)+cp('Situação',sit,sit==='Não atende'?'bad':sit==='Atende'?'good':'')+cp('Tendência',tend)+cp('Evidência (Link)',e.ev!=null?e.ev:evidLabel(m))+'</div>';
    var res=o&&o.r!=null?numBR(o.r):(o&&K.cont?'—':'');
    var nota=[];
    if (o) nota.push('Resultado (o ANOREG+ calcula): <b>'+(res||'—')+(o.r!=null&&!K.minutos&&K.den!==100?'%':'')+'</b>'+(K.minutos&&o?' · '+mmss(o.n):''));
    var lt=kpiTendLeitura(K,o,m); if (lt) nota.push('Tendência '+tend+' = '+lt+(K.baseline&&!K.metaV?' (sem meta fixada)':''));
    if (o&&o.fonte) nota.push('Fonte: '+esc(o.fonte));
    if (o&&o.travado&&o.travado.n!=null){ var at=o.atual, rA=at?kpiComp(at):null, rT=kpiComp(o), dif=(rA!=null&&rT!=null)?Math.round((rA-rT)*100)/100:null;
      if (!at) nota.push('<span class="mut">Sem dados para recalcular hoje — vale o valor travado.</span>');
      else if (at.n!==o.n||at.d!==o.d) nota.push('<span class="lc-warn">Pela regra/dados de hoje daria '+numBR(at.n)+' / '+numBR(at.d)+(dif!=null?' (diferença de '+numBR(dif)+(o.r!=null&&!K.minutos?' p.p.':'')+')':'')+'. Vale o lançado. Só corrija no ANOREG+ se for erro de dado e mudar a situação ou passar de 1 p.p.</span>');
      else nota.push('<span class="mut">O cálculo de hoje confere com o lançado.</span>'); }
    if (o&&o.lancado) nota.push('Lançado antes no ANOREG+: '+numBR(o.lancado[0])+' / '+numBR(o.lancado[1]));
    if (o&&o.aviso) nota.push('<span class="lc-warn">'+esc(o.aviso)+'</span>');
    if (sit==='Não atende' && K.taxa){ var p=kpiValor(K.id,mesAnt(m)), ps=kpiSituacao(K,p); nota.push('<span class="lc-bad">'+(ps==='Não atende'?'2º mês seguido fora da meta → abrir NC (CRT-SGQ-001).':'1º mês fora da meta → registrar a análise da causa.')+'</span>'); }
    if (!o) nota.push(K.auto==='k9'?'Importe o Rel. Eventos de Apuração por Período deste mês.':K.auto&&K.auto!=='k8'?'Sem dados do painel para este mês.':'Preencha os números acima.');
    return {html:h+'<div class="lc-nota">'+nota.join(' · ')+'</div>', txt:txt, sit:sit};
  }
  function cardEntrada(K,m){
    var e=kpEntrada(m,K.id), h=histDe(m,K.id);
    function inp(campo,lab,ph,val){ return '<label class="lc-in"><span>'+lab+'</span><input type="text" inputmode="decimal" data-kpin="'+campo+'" value="'+esc(val!=null?val:'')+'" placeholder="'+esc(ph||'')+'"></label>'; }
    if (K.auto==='k8'){ var hc=state.k9[m]?state.k9[m].headcount:''; return inp('adm','Admissões','0',e.adm)+inp('desl','Desligamentos','0',e.desl)+inp('ativos','Colaboradores ativos',hc?String(hc)+' (do KPI-09)':'',e.ativos); }
    if (K.auto && !(K.auto==='k13' && !state.senhas[m])) return '';
    if (K.cont) return inp('n','Ocorrências no mês','0',e.n!=null?e.n:(h?numBR(h[0]):''));
    if (K.den!=null) return inp('n',K.um,'',e.n!=null?e.n:(h?numBR(h[0]):''))+(K.dica?'<span class="lc-dica">'+esc(K.dica)+'</span>':'');
    return inp('n',K.lab[0],'',e.n!=null?e.n:(h?numBR(h[0]):''))+inp('d',K.lab[1],'',e.d!=null?e.d:(h?numBR(h[1]):''));
  }
  function renderLanc(forca){
    var el=$('tabLanc'); if (!el) return;
    if (state.lancEdit){ if (forca===true||!el.querySelector('.kpied')) el.innerHTML=renderKpiEditor(); return; } // no modo edição só redesenha por ação, para não perder o que está sendo digitado
    var ms=lancMeses(); if (!state.lancMes || ms.indexOf(state.lancMes)<0) state.lancMes=mesAnt(mesHoje());
    var m=state.lancMes, L=(state.kp[m]&&state.kp[m].lanc)||{};
    var vis=KPIS.filter(function(K){ return state.lancTodos || !K.fora; });
    var feitos=vis.filter(function(K){ return L[K.id]; }).length;
    var h='<div class="sec-h"><span class="note">Clique em qualquer campo para copiar e cole na linha do IND-SGQ-001. O Resultado o ANOREG+ calcula sozinho.</span></div>'+
      '<div class="search"><select id="lancMes" aria-label="Competência">'+ms.map(function(x){ return '<option value="'+x+'"'+(x===m?' selected':'')+'>'+compLabel(x)+'</option>'; }).join('')+'</select>'+
      '<span class="chip'+(feitos===vis.length?' ok':'')+'">'+feitos+' de '+vis.length+' lançados</span>'+
      '<label class="lc-chk"><input type="checkbox" id="lancTodos"'+(state.lancTodos?' checked':'')+'> mostrar ocultos</label>'+(podeEscrever?'<button class="btn sm" type="button" id="kpiEdBtn">Editar indicadores</button>':'')+
      '<span class="spacer"></span><button class="btn sm" type="button" id="memBtn" title="Planilha com o cálculo de cada KPI deste mês, ato por ato, com fórmulas do Excel — para anexar no ANOREG+">Baixar memória de cálculo (.xlsx)</button>'+'</div>'+'';
    h+=saudeAvisoLanc(m); // 0.14.0: avisa fonte incompleta do mês antes de lançar
    // 0.13.0: lista do mês à esquerda e o indicador escolhido à direita (no celular aparecem todos, um embaixo do outro)
    if (!state.lancSel || !vis.some(function(K){ return K.id===state.lancSel; })){ var pend=vis.filter(function(K){ return !L[K.id]; })[0]; state.lancSel=(pend||vis[0]||{}).id; }
    h+='<div class="lc-lay"><nav class="lc-lista" aria-label="Indicadores do mês">'+vis.map(function(K){ var o=kpiValor(K.id,m), sit=kpiSituacao(K,o), res=o?(o.r!=null&&!K.cont?numBR(o.r)+(K.minutos||K.den===100?'':'%'):numBR(o.n)):'—';
        return '<button type="button" class="lc-it'+(K.id===state.lancSel?' on':'')+'" data-lancsel="'+esc(K.id)+'"><b>'+esc(K.id)+'</b><span class="lc-itn">'+esc(K.nome)+'</span><small class="num">'+res+(sit?' · '+esc(sit):'')+'</small><em class="'+(L[K.id]?'l':'p')+'">'+(L[K.id]?'Lançado':'Pendente')+'</em></button>'; }).join('')+'</nav><div class="lc-cards">';
    h+=vis.map(function(K){
      var s=cardSaida(K,m), done=!!L[K.id], tr=kpiTravado(m,K.id);
      return '<div class="lc-card'+(done?' done':'')+(tr?' travado':'')+(K.id===state.lancSel?' lc-on':'')+'" data-kpi="'+esc(K.id)+'">'+
        '<div class="lc-top"><b>'+esc(K.id)+'</b><span class="lc-nome">'+esc(K.nome)+'</span>'+(K.freq?'<span class="chip">'+K.freq+'</span>':'')+(K.novo?'<span class="chip">ainda não existe no ANOREG+</span>':'')+
        '<span class="spacer"></span><label class="lc-chk"><input type="checkbox" data-lanc="1"'+(done?' checked':'')+(podeEscrever?'':' disabled')+'> lançado</label></div>'+
        (tr?'<div class="lc-trava"><span class="selo ok">'+SELO_OK+'Lançado em '+fmtDataHora(tr.em)+' · valor travado</span> Painel '+esc(tr.ver||'?')+'. Mudanças do painel não alteram este mês; para mudar, desmarque "lançado".</div>':done?'<div class="lc-trava velho">Marcado como lançado antes da trava (1.10.1): o valor não foi guardado. Desmarque e marque de novo para travar o valor de hoje.</div>':'')+
        '<div class="lc-ins">'+(tr?'':cardEntrada(K,m))+'</div>'+
        '<div class="lc-out">'+s.html+'</div>'+
        '<div class="lc-an"><div class="lc-anh"><span class="cpl">Análise / Ação</span><button type="button" class="btn sm" data-cpan="1">Copiar análise</button>'+(!tr&&kpEntrada(m,K.id).a!=null?'<button type="button" class="btn sm" data-anreset="1">Voltar ao texto sugerido</button>':'')+'</div>'+
        '<textarea data-kpin="a" rows="4"'+(tr?' readonly':'')+' placeholder="Sem texto sugerido — escreva a análise se houver">'+esc(s.txt)+'</textarea></div></div>';
    }).join('')+'</div></div>';
    // destaques do KPI-09 (só na tela)
    var k9=state.k9[m];
    if (k9){
      var hist={}; Object.keys(state.k9).sort().forEach(function(x){ state.k9[x].pessoas.forEach(function(p){ if (p.h>0){ var q=hist[p.mat]=hist[p.mat]||{nome:p.nome,meses:[],h:0}; q.meses.push(compLabel(x).slice(4)); q.h+=p.h; } }); });
      var rec=Object.keys(hist).filter(function(k){ return hist[k].meses.length>=3; }).map(function(k){ return hist[k]; });
      var pic=k9.pessoas.filter(function(p){ return p.h>=28; }), lic=k9.pessoas.filter(function(p){ return p.hl>0; });
      h+='<details class="lc-det"><summary>KPI-09 · destaques para o gestor (não vão para o ANOREG+)</summary><div class="hint" style="margin:8px 0">Período '+esc(k9.periodo)+' · arquivo '+esc(k9.arquivo)+' · jornada pela mediana do relatório.</div>'+
        '<div class="tbl-wrap"><table><thead><tr><th>Colaborador</th><th>Ausência gerenciável</th><th>Licença</th><th>Composição</th></tr></thead><tbody>'+
        k9.pessoas.slice().sort(function(a,b){return (b.h+b.hl)-(a.h+a.hl);}).map(function(p){ return '<tr><td>'+esc(p.nome)+(p.h>=28?' <span class="chip">pico</span>':'')+(hist[p.mat]&&hist[p.mat].meses.length>=3?' <span class="chip">recorrente</span>':'')+'</td><td>'+(p.h?numBR(p.h)+' h':'—')+'</td><td>'+(p.hl?numBR(p.hl)+' h':'—')+'</td><td class="mut">'+esc(p.comp)+'</td></tr>'; }).join('')+'</tbody></table></div>'+
        '<p class="hint">Pico = ≥ 28 h no mês ('+pic.length+'). Recorrente = atestado em 3+ meses importados ('+rec.length+(rec.length?': '+rec.map(function(r){return esc(r.nome)+' ('+r.meses.join(', ')+')';}).join('; '):'')+'). Licença legal fica fora da meta e não é questão de desempenho.</p></details>';
    }
    el.innerHTML=h;
  }
  function lancSalvar(m){ lancPend[m]=1; clearTimeout(lancTimer); lancTimer=setTimeout(function(){ var ms=Object.keys(lancPend); lancPend={}; ms.forEach(function(x){ if (dbPronto&&podeEscrever&&state.kp[x]) db.doc('kpis/'+x).set(state.kp[x]).catch(function(){ toast('Não consegui salvar'); }); }); },700); }
  function lancDoc(m){ return state.kp[m]=state.kp[m]||{mes:m,v:{},lanc:{}}; }
  function lancAtualizarCard(card){
    var K=kpiDef(card.dataset.kpi), m=state.lancMes, s=cardSaida(K,m);
    card.querySelector('.lc-out').innerHTML=s.html;
    var ta=card.querySelector('textarea[data-kpin="a"]'); if (kpEntrada(m,K.id).a==null && document.activeElement!==ta) ta.value=s.txt;
  }
  function copiarTexto(txt, el){
    function ok(){ if (el){ el.classList.add('copiado'); setTimeout(function(){ el.classList.remove('copiado'); },900); } toast('Copiado'); }
    function alt(){ var t=document.createElement('textarea'); t.value=txt; t.setAttribute('readonly',''); t.style.position='fixed'; t.style.top='0'; t.style.opacity='0'; document.body.appendChild(t); t.select(); var r=false; try{ r=document.execCommand('copy'); }catch(e){} t.remove(); if (r) ok(); else toast('Não consegui copiar — selecione o texto e use Ctrl+C'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, alt); else alt();
  }

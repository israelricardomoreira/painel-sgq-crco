/* Painel SGQ · CRCO — js/atendimento.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/atendimento.js']='0.21.4';
  function hms(s){ if (s==null||s==='') return null; if (typeof s==='number') return Math.round(s*86400); var p=String(s).trim().split(':').map(Number); if (p.length<2||p.some(isNaN)) return null; return p[0]*3600+p[1]*60+(p[2]||0); }
  function fmtMS(seg){ if (seg==null||isNaN(seg)) return '—'; seg=Math.round(seg); var h=Math.floor(seg/3600), m=Math.floor(seg%3600/60), s=seg%60; return (h?h+'h':'')+(h||m?(h?String(m).padStart(2,'0'):m)+'min':'')+(h?'':String(s).padStart(m?2:1,'0')+'s'); }
  function hhmm(seg){ return seg==null?'—':String(Math.floor(seg/3600)).padStart(2,'0')+':'+String(Math.floor(seg%3600/60)).padStart(2,'0'); }
  function senhasEhArquivo(cab){ return cab.indexOf('H.Gerada')>=0 && cab.indexOf('T.Espera')>=0 && cab.indexOf('Fila')>=0; }
  function senhasImportar(rows, nome){
    var porMes={}, filas=[], ats=[], ign=0;
    function idx(arr,v){ var i=arr.indexOf(v); if (i<0){ arr.push(v); i=arr.length-1; } return i; }
    rows.forEach(function(r){
      var dt=r['Data Registro'], y, mo, d;
      if (typeof dt==='number'){ var pc=XLSX.SSF.parse_date_code(dt); y=pc.y; mo=pc.m; d=pc.d; }
      else { var mm=String(dt||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (mm){ d=+mm[1]; mo=+mm[2]; y=+mm[3]; } else { var m2=String(dt||'').match(/(\d{4})-(\d{2})-(\d{2})/); if (m2){ y=+m2[1]; mo=+m2[2]; d=+m2[3]; } } }
      var g=hms(r['H.Gerada']); if (!y||g==null){ ign++; return; }
      var mes=y+'-'+(mo<10?'0':'')+mo, cod=String(r['Código']||''), pri=/^[A-Z]+P\d/.test(cod)?1:0, pre=(cod.match(/^[A-Z]+?(?=P?\d)/)||[''])[0];
      var c=hms(r['H.Chamada']), z=hms(r['H.Finalizada']), e=hms(r['T.Espera']), t=hms(r['T.Atendimento']);
      if (c!=null && e==null) e=c-g;
      var lin=[d, idx(filas,String(r['Fila']||'—')), pri, g, c==null?'':c, z==null?'':z, e==null?'':e, t==null?'':t, r['Atendente']?idx(ats,String(r['Atendente']).trim()):'', pre].join(',');
      (porMes[mes]=porMes[mes]||[]).push(lin);
    });
    var ms=Object.keys(porMes).sort(); if (!ms.length){ toast('Não encontrei senhas em '+nome); return; }
    ms.forEach(function(m){ var doc={mes:m, arquivo:nome, filas:filas, atend:ats, rows:porMes[m].join(';'), em:new Date().toISOString()};
      state.senhas[m]=senhasDecod(doc); if (dbPronto&&podeEscrever) db.doc('senhas/'+m).set(doc).catch(function(){ toast('Não consegui salvar as senhas de '+m); }); });
    toast('Senhas importadas: '+ms.map(compLabel).join(', ')+(ign?' · '+ign+' linhas ignoradas':''));
    render();
  }
  function senhasDecod(doc){
    var p=doc.mes.split('-').map(Number);
    var L=String(doc.rows||'').split(';').filter(Boolean).map(function(s){ var x=s.split(','); function n(v){ return v===''||v==null?null:+v; }
      var dia=+x[0], dt=new Date(p[0],p[1]-1,dia);
      return {dia:doc.mes+'-'+(dia<10?'0':'')+dia, dw:dt.getDay(), fila:doc.filas[+x[1]], pri:x[2]==='1', g:n(x[3]), c:n(x[4]), z:n(x[5]), e:n(x[6]), t:n(x[7]), at:x[8]===''?null:doc.atend[+x[8]], pre:x[9]||''}; });
    return {mes:doc.mes, arquivo:doc.arquivo, L:L};
  }
  function senhasLista(m){ var out=[]; Object.keys(state.senhas).sort().forEach(function(k){ if (!m||m==='todos'||m===k) out=out.concat(state.senhas[k].L); }); return out; }
  function quant(a,q){ if (!a.length) return null; var s=a.slice().sort(function(x,y){return x-y;}), i=(s.length-1)*q, lo=Math.floor(i); return s[lo]+(s[Math.min(lo+1,s.length-1)]-s[lo])*(i-lo); }
  function senhasResumo(L){
    var at=L.filter(function(s){ return s.c!=null && s.e!=null; }), es=at.map(function(s){return s.e;}), des=L.filter(function(s){ return s.c==null; });
    var tAt=at.filter(function(s){ return s.t!=null && s.t<=3600; }).map(function(s){return s.t;});
    return {n:L.length, na:at.length, med:es.length?es.reduce(function(a,b){return a+b;},0)/es.length:null, mediana:quant(es,.5), p90:quant(es,.9), mx:es.length?Math.max.apply(null,es):null,
      a10:at.filter(function(s){return s.e>=600;}).length, a15:at.filter(function(s){return s.e>900;}).length, des:des.length, tMed:quant(tAt,.5), tMedia:tAt.length?tAt.reduce(function(a,b){return a+b;},0)/tAt.length:null};
  }
  function senhasDias(L){
    var por={}; L.forEach(function(s){ (por[s.dia]=por[s.dia]||[]).push(s); });
    return Object.keys(por).sort().map(function(d){ var arr=por[d], ev=[];
      arr.forEach(function(s){ var fim=s.c!=null?s.c:s.z; if (fim==null) return; ev.push([s.g,1]); ev.push([fim,-1]); });
      ev.sort(function(a,b){ return a[0]-b[0]||a[1]-b[1]; }); var cur=0, pico=0, hp=null; ev.forEach(function(x){ cur+=x[1]; if (cur>pico){ pico=cur; hp=x[0]; } });
      var R=senhasResumo(arr); return {dia:d, dw:arr[0].dw, n:arr.length, med:R.med, mx:R.mx, a10:R.a10, des:R.des, pico:pico, hp:hp, gat:R.a10>0||pico>=5}; });
  }
  // análise por atendente — tempo comparado com a equipe NA MESMA FILA (serviços diferentes têm tempos diferentes)
  function atendAnalise(L){
    var E={}, P={};
    L.forEach(function(s){ if (!s.at || s.c==null) return; var ok=s.t!=null && s.t<=3600;
      var e=E[s.fila]=E[s.fila]||{t:[]}; if (ok) e.t.push(s.t);
      var p=P[s.at]=P[s.at]||{nome:s.at,n:0,t:[],dias:{},F:{},H:{},M:{},abertos:0,longos:0,curtos:0,pri:0};
      p.n++; p.dias[s.dia]=1; if (s.pri) p.pri++;
      var f=p.F[s.fila]=p.F[s.fila]||{n:0,t:[]}; f.n++;
      var hr=Math.floor((s.c!=null?s.c:s.g)/3600); p.H[hr]=(p.H[hr]||0)+1;
      var mm=s.dia.slice(0,7), M=p.M[mm]=p.M[mm]||{n:0,t:[]}; M.n++;
      if (s.t!=null && s.t>3600) p.abertos++;
      if (ok){ p.t.push(s.t); f.t.push(s.t); M.t.push(s.t); if (s.t>1800) p.longos++; if (s.t<60) p.curtos++; } });
    Object.keys(E).forEach(function(f){ E[f].med=quant(E[f].t,.5); E[f].p90=quant(E[f].t,.9); E[f].n=E[f].t.length; });
    Object.keys(P).forEach(function(k){ var p=P[k], sp=0, se=0;
      var ac=0, ab=0;
      Object.keys(p.F).forEach(function(f){ var x=p.F[f]; x.med=quant(x.t,.5); x.q1=quant(x.t,.25); x.q3=quant(x.t,.75); x.eq=E[f].med; x.idx=x.t.length>=5&&x.eq?x.med/x.eq:null;
        x.ac=x.t.filter(function(t){return t>x.eq;}).length; x.ab=x.t.filter(function(t){return t<x.eq;}).length; x.p=testeSinal(x.ac,x.ab); ac+=x.ac; ab+=x.ab;
        x.sig=x.idx!=null&&x.t.length>=MIN_N&&x.p<0.05; if (x.idx!=null){ sp+=x.t.length*x.med; se+=x.t.length*x.eq; } });
      p.idx=se?sp/se:null; p.p=testeSinal(ac,ab); p.sig=p.idx!=null&&p.p<0.05; p.med=quant(p.t,.5); p.nd=Object.keys(p.dias).length; p.nv=p.t.length; });
    return {E:E,P:P};
  }
  function atendLeitura(p){
    var fortes=[], aten=[];
    Object.keys(p.F).sort(function(a,b){return p.F[b].n-p.F[a].n;}).forEach(function(f){ var x=p.F[f]; if (!x.sig) return;
      if (x.idx>=1.2) aten.push(f+': atendimento mediano de '+fmtMS(x.med)+' contra '+fmtMS(x.eq)+' da equipe (+'+Math.round((x.idx-1)*100)+'%) em '+x.t.length+' atendimentos; '+pct(x.ac/(x.ac+x.ab)*100)+' deles acima da mediana da equipe — diferença consistente, não acaso. Vale entender se é complexidade dos casos ou ponto de treinamento nesse serviço.');
      else if (x.idx<=0.85) fortes.push(f+': atendimento mediano de '+fmtMS(x.med)+', mais ágil que a equipe ('+fmtMS(x.eq)+').'); });
    if (p.abertos>=3) aten.push(p.abertos+' senhas ficaram abertas mais de 1 hora — reforçar a finalização da senha no sistema ao encerrar o atendimento.');
    if (p.nv>=30 && p.curtos/p.nv>0.1) aten.push(numBR(p.curtos/p.nv*100,0)+'% dos atendimentos duraram menos de 1 minuto — conferir se são senhas chamadas e redirecionadas, ou chamadas por engano.');
    if (p.nv>=30 && p.longos/p.nv>0.15) aten.push(numBR(p.longos/p.nv*100,0)+'% dos atendimentos passaram de 30 minutos.');
    if (Object.keys(p.F).length>=4) fortes.push('Atende '+Object.keys(p.F).length+' filas diferentes (polivalência no balcão).');
    return {fortes:fortes, aten:aten};
  }
  function atendPessoaHTML(p, A, impresso){
    var fk=Object.keys(p.F).sort(function(a,b){return p.F[b].n-p.F[a].n;}), Lr=atendLeitura(p), hrs=Object.keys(p.H).map(Number).sort(function(a,b){return a-b;}), hmx=Math.max.apply(null,hrs.map(function(x){return p.H[x];}));
    var h=(impresso?tilesRel:function(arr){ return '<div class="kpis" style="margin:8px 0 12px">'+arr.map(function(t,i){ return kpi(t[0],String(t[1]),t[2]||'',i===3&&p.idx!=null?(p.idx>=1.3?'canc':''):''); }).join('')+'</div>'; })([
      ['Senhas atendidas',p.n,pct(p.pri/p.n*100)+' prioritárias'],['Dias no guichê',p.nd,numBR(p.n/p.nd,1)+' senhas por dia'],
      ['Atendimento (mediana)',fmtMS(p.med),'equipe por fila ao lado'],['Tempo vs equipe',p.idx==null?'—':(p.idx>=1?'+':'')+Math.round((p.idx-1)*100)+'%','ajustado pela fila (0% = igual à equipe)']]);
    var th=impresso?'':' class="n"';
    h+=(impresso?'<h2>Atendimento por fila</h2>':'<div class="sub-h">Por fila · comparado com a equipe na mesma fila</div>')+'<'+(impresso?'':'div class="tbl-wrap"><')+'table><thead><tr><th>Fila</th><th class="n">Senhas</th><th class="n">Mediana da pessoa</th><th class="n">Mediana da equipe</th><th class="n">Diferença</th></tr></thead><tbody>'+
      fk.map(function(f){ var x=p.F[f], cls=!x.sig?'':x.idx>=1.2?(impresso?' acima':' lc-bad'):x.idx<=0.85?(impresso?' bom':''):''; return '<tr><td>'+esc(f)+'</td><td class="n">'+x.n+'</td><td class="n'+cls+'">'+fmtMS(x.med)+'</td><td class="n">'+fmtMS(x.eq)+'</td><td class="n'+cls+'">'+(x.idx==null?'—':(x.idx>=1?'+':'')+Math.round((x.idx-1)*100)+'%'+(x.sig?'':' <span style="font-weight:400;opacity:.7">(pode ser acaso)</span>'))+'</td></tr>'; }).join('')+'</tbody></table>'+(impresso?'':'</div>');
    var mk=Object.keys(p.M).sort();
    if (mk.length>1) h+=(impresso?'<h2>Atendimento mês a mês</h2>':'<div class="sub-h">Mês a mês</div>')+'<'+(impresso?'':'div class="tbl-wrap"><')+'table><thead><tr><th>Mês</th><th class="n">Senhas</th><th class="n">Atendimento (mediana)</th></tr></thead><tbody>'+mk.map(function(m){ return '<tr><td>'+compLabel(m)+'</td><td class="n">'+p.M[m].n+'</td><td class="n">'+fmtMS(quant(p.M[m].t,.5))+'</td></tr>'; }).join('')+'</tbody></table>'+(impresso?'':'</div>');
    if (!impresso) h+='<div class="sub-h">Em que horário atende</div>'+hrs.map(function(x){ return '<div class="etapa-row"><div class="nm">'+x+'h</div><div class="track"><div class="fill" style="width:'+(p.H[x]/hmx*100).toFixed(0)+'%"></div></div><div class="vv">'+p.H[x]+'</div></div>'; }).join('');
    h+=(impresso?'<h2>Leitura do atendimento</h2>':'<div class="sub-h">Leitura para o feedback</div>')+
      (Lr.fortes.length?'<p><b>Pontos fortes</b></p><ul>'+Lr.fortes.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'')+
      (Lr.aten.length?'<p><b>Pontos de atenção / treinamento</b></p><ul>'+Lr.aten.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'<p>Nenhum ponto de atenção no tempo de atendimento: em linha com a equipe nas filas que atende.</p>')+
      '<p class="'+(impresso?'nota':'hint')+'">Tempo de atendimento = da chamada à finalização da senha. Comparado com a mediana da equipe na mesma fila, porque cada serviço tem duração própria. Só vira ponto de atenção quando a diferença é consistente (menos de 5% de chance de ser acaso, pelo teste do sinal) e com 10+ atendimentos na fila. Tempo maior não é, sozinho, problema: pode ser caso mais complexo ou atendimento mais cuidadoso. É ponto de conversa, não nota. Atendimentos acima de 1 h (senha não finalizada) ficam fora.</p>';
    return h;
  }
  function renderAtend(){
    var el=$('tabAt'); if (!el) return;
    var ms=Object.keys(state.senhas).sort();
    if (!ms.length){ el.innerHTML='<div class="empty"><b>Nenhuma senha importada</b>Exporte a <b>Consulta de senhas</b> do VHL e solte em Importar dados (pode ser vários meses de uma vez). Ela alimenta o KPI-13 e esta análise.</div>'; return; }
    var per=state.periodo||'todos';
    if (per!=='todos' && ms.indexOf(per)<0){ el.innerHTML='<div class="empty"><b>Sem senhas importadas em '+nomeMes(per)+'</b>Escolha outro mês no Período, no topo, ou importe a Consulta de senhas desse mês.</div>'; return; }
    var Ltodas=senhasLista(per), L=Ltodas.filter(senhaOk), R=senhasResumo(L), D=senhasDias(L), nd=D.length;
    if (state.pgVis.at){ el.innerHTML=visAtend(L); return; }
    var h='<div class="sec-h"><h2>Atendimento · tempo de espera</h2><span class="note">Fonte: VHL · Consulta de senhas. Espera = da emissão da senha à chamada no guichê. KPI-13 = média da espera das senhas chamadas em todas as filas'+(k13Of()?'':' — aqui só as filas de '+esc(selNome())+', por isso o número não é o KPI-13')+'.</span></div>'+
      '<div class="search"><span class="chip ok">'+(per==='todos'?'Todos os meses ('+ms.length+')':compLabel(per))+'</span>'+      '<span class="hint" style="margin:0">'+R.n.toLocaleString('pt-BR')+' senhas · '+nd+' dias com atendimento</span></div>';
    h+='<div class="kpis" style="margin:4px 0 16px">'+
      (k13Of()?kpi('KPI-13 · espera média',fmtMS(R.med),'meta ≤ 15 min · '+numBR(R.med/60)+' min','hero'):kpi('Espera média · '+esc(selNome()),fmtMS(R.med),numBR(R.med/60)+' min · só as filas desta serventia · o KPI-13 usa todas as filas','hero'))+
      kpi('Mediana',fmtMS(R.mediana),'metade espera menos que isso')+
      kpi('90% esperam até',fmtMS(R.p90),'percentil 90')+
      kpi('Acima de 10 min',pctK(R.na?R.a10/R.na*100:null),R.a10+' senhas · gatilho do PCA',R.a10?'canc':'')+
      kpi('Acima de 15 min',pctK(R.na?R.a15/R.na*100:null),R.a15+' senhas · além da meta',R.a15?'canc':'')+
      kpi('Espera máxima',fmtMS(R.mx),'pior caso do período')+
      kpi('Desistências',pctK(R.n?R.des/R.n*100:null),R.des+' senhas finalizadas sem chamada')+'</div>';
    // mês a mês
    if (ms.length>1 && per==='todos'){
      h+='<div class="sub-h">Mês a mês</div><div class="tbl-wrap"><table><thead><tr><th>Mês</th><th class="n">Senhas</th><th class="n">'+(k13Of()?'KPI-13 (média)':'Espera média')+'</th><th class="n">Mediana</th><th class="n">P90</th><th class="n">≥ 10 min</th><th class="n">Máxima</th><th class="n">Desistências</th><th class="n">Dias com gatilho</th></tr></thead><tbody>'+
        ms.map(function(m){ var Lm=state.senhas[m].L.filter(senhaOk), r=senhasResumo(Lm), dd=senhasDias(Lm); return '<tr><td>'+compLabel(m)+'</td><td class="n">'+r.n+'</td><td class="n"><b>'+numBR(r.med/60)+' min</b></td><td class="n">'+fmtMS(r.mediana)+'</td><td class="n">'+fmtMS(r.p90)+'</td><td class="n">'+pct(r.a10/r.na*100)+'</td><td class="n">'+fmtMS(r.mx)+'</td><td class="n">'+pct(r.des/r.n*100)+'</td><td class="n">'+dd.filter(function(x){return x.gat;}).length+' de '+dd.length+'</td></tr>'; }).join('')+'</tbody></table></div>';
    }
    var tAll=L.filter(function(s){return s.c!=null&&s.t!=null&&s.t<=3600;}).map(function(s){return s.t/60;}), eAll=L.filter(function(s){return s.c!=null&&s.e!=null;}).map(function(s){return s.e/60;});
    var rotM=function(x){ return x<1?Math.round(x*60)+' s':x+' min'; };
    h+='<div class="two" style="margin-top:18px"><div><div class="sub-h">Espera · como se distribui</div>'+faixasHTML(eAll,[0.5,1,2,5,10,15],'',rotM)+'</div><div><div class="sub-h">Atendimento · como se distribui</div>'+faixasHTML(tAll,[2,5,10,15,20,30],'',rotM)+'<p class="hint">Mediana '+fmtMS(R.tMed)+' · média '+fmtMS(R.tMedia)+'. Atendimentos acima de 1 h (senha não finalizada) ficam fora.</p></div></div>';
    // mapa de calor
    var met=state.atMet||'esp', horas=[], cel={}, cntDw={};
    D.forEach(function(x){ cntDw[x.dw]=(cntDw[x.dw]||0)+1; });
    L.forEach(function(s){ var hr=Math.floor(s.g/3600), k=s.dw+'_'+hr; var c=cel[k]=cel[k]||{n:0,es:[],a10:0,L:[]}; c.n++; c.L.push(s); if (s.c!=null&&s.e!=null){ c.es.push(s.e); if (s.e>=600) c.a10++; } if (horas.indexOf(hr)<0) horas.push(hr); });
    horas.sort(function(a,b){return a-b;}); horas=horas.filter(function(hr){ var t=0; [1,2,3,4,5].forEach(function(dw){ t+=(cel[dw+'_'+hr]||{n:0}).n; }); return t>=Math.max(5,nd*0.2); });
    function valor(c,dw){ if (!c||!c.n) return null; if (met==='vol') return c.n/(cntDw[dw]||1); if (met==='a10') return c.es.length?c.a10/c.es.length*100:null; return c.es.length?c.es.reduce(function(a,b){return a+b;},0)/c.es.length/60:null; }
    var vals=[]; [1,2,3,4,5].forEach(function(dw){ horas.forEach(function(hr){ var v=valor(cel[dw+'_'+hr],dw); if (v!=null) vals.push(v); }); });
    var vmax=vals.length?Math.max.apply(null,vals):1, MIX=[6,20,38,60,85];
    function bin(v){ return v==null?-1:Math.min(4,Math.floor(v/(vmax||1)*5-1e-9)); }
    function rot(v){ return v==null?'':met==='vol'?numBR(v,1):met==='a10'?numBR(v,0)+'%':numBR(v,1); }
    h+='<div class="sub-h" style="margin-top:18px">Quando aperta · dia da semana × hora da emissão</div>'+
      '<div class="search"><div class="seg" role="group" aria-label="Métrica do mapa"><button type="button" class="segb" data-atmet="esp" aria-pressed="'+(met==='esp')+'">Espera média (min)</button><button type="button" class="segb" data-atmet="a10" aria-pressed="'+(met==='a10')+'">% acima de 10 min</button><button type="button" class="segb" data-atmet="vol" aria-pressed="'+(met==='vol')+'">Senhas por dia</button></div></div>'+
      '<div class="tbl-wrap"><table class="hm"><thead><tr><th></th>'+horas.map(function(hr){ return '<th>'+hr+'h</th>'; }).join('')+'</tr></thead><tbody>'+
      [1,2,3,4,5].map(function(dw){ return '<tr><th>'+DSEM[dw]+'</th>'+horas.map(function(hr){ var c=cel[dw+'_'+hr], v=valor(c,dw), b=bin(v);
        var tip='<b>'+DSEM[dw]+' · '+hr+'h–'+(hr+1)+'h</b><br>'+(c?c.n+' senhas no período ('+numBR(c.n/(cntDw[dw]||1),1)+' por dia)<br>Espera média: '+(c.es.length?fmtMS(c.es.reduce(function(a,x){return a+x;},0)/c.es.length):'—')+'<br>≥ 10 min: '+c.a10:'sem senhas');
        return '<td class="hmc b'+b+'" style="'+(b>=0?'background:color-mix(in srgb, var(--brand) '+MIX[b]+'%, var(--surface))':'')+'" data-tip="'+esc(tip)+'"'+goAttr(c?goLista(DSEM[dw]+' '+hr+'h · senhas','senhas',c.L):null)+'>'+rot(v)+'</td>'; }).join('')+'</tr>'; }).join('')+
      '</tbody></table></div><p class="hint">Quanto mais escuro, pior. Use para escala de guichê e horário de almoço: as células escuras com muitas senhas por dia são onde um guichê a mais rende mais.</p>';
    // dias com gatilho
    var G=D.filter(function(x){return x.gat;}).sort(function(a,b){ return b.a10-a.a10 || b.pico-a.pico || (b.mx||0)-(a.mx||0); });
    h+='<div class="sub-h" style="margin-top:18px">Dias em que o gatilho do PCA disparou · '+G.length+' de '+nd+'</div>'+
      '<p class="hint" style="margin-top:0">Gatilho (PCA-SGQ-001): senha esperando 10 min ou mais, ou 5+ senhas em espera ao mesmo tempo. Confira se o plano foi acionado nesses dias.</p>'+
      (G.length?'<div class="tbl-wrap"><table><thead><tr><th>Dia</th><th class="n">Senhas</th><th class="n">≥ 10 min</th><th class="n">Pico em espera</th><th>Horário do pico</th><th class="n">Espera média</th><th class="n">Máxima</th><th class="n">Desist.</th></tr></thead><tbody>'+
      G.slice(0,state.atTodosDias?999:15).map(function(x){ return '<tr><td>'+DSEM[x.dw]+' '+x.dia.split('-').reverse().join('/')+'</td><td class="n">'+x.n+'</td><td class="n'+(x.a10>=5?' lc-bad':'')+'">'+x.a10+'</td><td class="n'+(x.pico>=5?' lc-bad':'')+'">'+x.pico+'</td><td>'+hhmm(x.hp)+'</td><td class="n">'+fmtMS(x.med)+'</td><td class="n">'+fmtMS(x.mx)+'</td><td class="n">'+(x.des||'')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      (G.length>15?'<button class="btn sm" type="button" data-attodos="1" style="margin-top:8px">'+(state.atTodosDias?'Mostrar só os 15 piores':'Mostrar todos os '+G.length)+'</button>':''):'<div class="empty">Nenhum dia com gatilho no período.</div>');
    // por fila + prioridade
    var F={}; L.forEach(function(s){ var f=F[s.fila]=F[s.fila]||{L:[],N:[],P:[]}; f.L.push(s); if (s.c!=null&&s.e!=null) (s.pri?f.P:f.N).push(s.e); });
    var fk=Object.keys(F).sort(function(a,b){ return F[b].L.length-F[a].L.length; });
    function mean(a){ return a.length?a.reduce(function(x,y){return x+y;},0)/a.length:null; }
    var alerta=0;
    h+='<div class="sub-h" style="margin-top:18px">Por fila · prioritária × normal</div><div class="tbl-wrap"><table><thead><tr><th>Fila</th><th class="n">Senhas</th><th class="n">Espera média</th><th class="n">≥ 10 min</th><th class="n">Normal</th><th class="n">Prioritária</th><th class="n">Atendimento (mediana)</th><th class="n">Desist.</th></tr></thead><tbody>'+
      fk.map(function(k){ var f=F[k], r=senhasResumo(f.L), mn=mean(f.N), mp=mean(f.P), ruim=mp!=null&&mn!=null&&mp-mn>=30; if (ruim) alerta++;
        return '<tr><td>'+esc(k)+'</td><td class="n">'+r.n+'</td><td class="n">'+fmtMS(r.med)+'</td><td class="n">'+pct(r.na?r.a10/r.na*100:null)+'</td><td class="n">'+fmtMS(mn)+'</td><td class="n'+(ruim?' lc-bad':'')+'">'+fmtMS(mp)+(ruim?' ⚠':'')+'</td><td class="n">'+fmtMS(r.tMed)+'</td><td class="n">'+pct(r.n?r.des/r.n*100:null)+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      (alerta?'<p class="hint"><span class="lc-bad">⚠ Prioritária esperando mais que a normal em '+alerta+' fila(s)</span> (diferença de 30 s ou mais na média). A prioridade de atendimento é obrigatória (Lei 10.048/2000) — vale revisar a regra de chamada do painel de senhas nessas filas.</p>':'<p class="hint">Prioritárias com espera igual ou menor que a normal em todas as filas.</p>');
    // por atendente
    var AN=atendAnalise(L), ak=Object.keys(AN.P).sort(function(a,b){ return AN.P[b].n-AN.P[a].n; }), tot=ak.reduce(function(s,k){return s+AN.P[k].n;},0);
    if (state.atPessoa && !AN.P[state.atPessoa]) state.atPessoa=null;
    h+='<div class="sub-h" style="margin-top:18px">Por atendente · clique na pessoa para ver a análise individual</div><p class="hint" style="margin-top:0">"Tempo vs equipe" compara o atendimento da pessoa com a mediana da equipe <b>na mesma fila</b> (0% = igual; só filas com 5+ atendimentos). “≈” = diferença que pode ser acaso. Serve para direcionar treinamento, não para ranking.</p>'+
      '<div class="tbl-wrap"><table><thead><tr><th>Atendente</th><th class="n">Senhas</th><th class="n">% do volume</th><th class="n">Dias no guichê</th><th class="n">Por dia</th><th class="n">Atendimento (mediana)</th><th class="n">Tempo vs equipe</th><th class="n">&gt; 30 min</th><th class="n">Abertas &gt; 1 h</th><th>Filas</th></tr></thead><tbody>'+
      ak.map(function(k){ var a=AN.P[k], sel=state.atPessoa===k; return '<tr class="click" tabindex="0" data-atpessoa="'+esc(k)+'"'+(sel?' style="background:var(--brand-soft)"':'')+'><td>'+esc(k)+'</td><td class="n">'+a.n+'</td><td class="n">'+pct(a.n/tot*100)+'</td><td class="n">'+a.nd+'</td><td class="n">'+numBR(a.n/a.nd,1)+'</td><td class="n">'+fmtMS(a.med)+'</td><td class="n'+(a.sig&&a.idx>=1.2?' lc-bad':'')+'" title="'+(a.sig?'Diferença consistente (menos de 5% de chance de ser acaso)':'Diferença pequena ou inconsistente — pode ser acaso')+'">'+(a.idx==null?'—':(a.idx>=1?'+':'')+Math.round((a.idx-1)*100)+'%'+(a.sig?'':' <span class="mut">≈</span>'))+'</td><td class="n">'+(a.longos||'')+'</td><td class="n'+(a.abertos>=3?' lc-bad':'')+'">'+(a.abertos||'')+'</td><td class="mut" style="white-space:normal;min-width:200px">'+Object.keys(a.F).map(esc).join(', ')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    if (state.atPessoa){ var ap=AN.P[state.atPessoa];
      h+='<div class="panel" id="atDet" style="margin-top:12px"><div class="sec-h"><h2>'+esc(ap.nome)+'</h2><span><button class="btn sm" type="button" data-atrel="1">Abrir no relatório individual</button> <button class="btn sm" type="button" data-atfechar="1">Fechar</button></span></div>'+atendPessoaHTML(ap,AN,false)+'</div>'; }
    // qualidade dos dados
    var abertos=L.filter(function(s){ return s.t!=null && s.t>3600; }).length, prefFila={};
    L.forEach(function(s){ var k=s.fila; (prefFila[k]=prefFila[k]||{})[s.pre]=(prefFila[k][s.pre]||0)+1; });
    var mist=fk.filter(function(k){ return Object.keys(prefFila[k]).length>1; }).map(function(k){ return esc(k)+' ('+Object.keys(prefFila[k]).map(function(p){ return p+': '+prefFila[k][p]; }).join(', ')+')'; });
    h+='<div class="sub-h" style="margin-top:18px">Qualidade do registro</div><ul class="hint">'+
      '<li><b>'+R.des+'</b> senhas finalizadas sem chamada (desistência ou senha descartada). Não entram na média do KPI-13 — se a pessoa desistiu por demora, a espera real foi maior que a apurada.</li>'+
      '<li><b>'+abertos+'</b> atendimentos com mais de 1 hora aberta — provável senha não finalizada no guichê. Ficam fora da mediana de atendimento.</li>'+
      (mist.length?'<li>Filas recebendo senhas de prefixos diferentes: '+mist.join('; ')+'. Confira se a senha de Óbito (OB) deveria cair na fila de Nascimento.</li>':'')+'</ul>';
    // quem atende o quê: senhas de cada atendente por serventia (sempre com todas as filas)
    var AS={}, svs=['RI','RC','RTD/PJ']; Ltodas.forEach(function(x){ if (!x.at||x.c==null) return; var sv=FILA_SV[semAc(x.fila)]||'outra', a=AS[x.at]=AS[x.at]||{n:0}; a.n++; a[sv]=(a[sv]||0)+1; });
    var ak=Object.keys(AS).sort(function(a,b){ return AS[b].n-AS[a].n; });
    if (ak.length) h+='<div class="sub-h" style="margin-top:18px">Quem atende o quê · senhas chamadas por serventia</div><p class="hint" style="margin:0 0 6px">Mostra se a pessoa atende uma fila só ou várias (todas as filas, independente do filtro). Comparar tempo de espera entre pessoas só é justo dentro da mesma fila.</p><div class="tbl-wrap"><table><thead><tr><th class="tleft">Atendente</th><th>Total</th>'+svs.map(function(s){ return '<th>'+s+'</th>'; }).join('')+'<th class="tleft">Perfil</th></tr></thead><tbody>'+
      ak.map(function(k){ var a=AS[k], top=svs.slice().sort(function(x,y){ return (a[y]||0)-(a[x]||0); })[0], pt=(a[top]||0)/a.n; return '<tr><td class="tleft">'+esc(k)+'</td><td class="num"><b>'+a.n+'</b></td>'+svs.map(function(s){ var v=a[s]||0; return '<td class="num">'+(v?'<span class="barra" style="--w:'+Math.round(v/a.n*100)+'%">'+v+' <span class="mut">'+Math.round(v/a.n*100)+'%</span></span>':'<span class="mut">·</span>')+'</td>'; }).join('')+'<td class="tleft mut">'+(pt>=0.9?'só '+top:pt>=0.6?'principalmente '+top:'várias filas')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    el.innerHTML=h;
  }

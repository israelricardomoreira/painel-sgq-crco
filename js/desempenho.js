/* Painel SGQ · CRCO — js/desempenho.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/desempenho.js']='0.21.3';
  // ═════════ desempenho: linha normal de cada pessoa, comparação com a equipe e tendência macro ═════════
  function mesDeDia(d){ return new Date(d*864e5).toISOString().slice(0,7); }
  // cada execução de etapa (VHL · Produção por Etapa): pessoa, etapa, natureza, mês da execução e dias úteis que o documento ficou na etapa
  function desExecs(){
    var modo=svModo(), chave=[modo,svAtual(),subAtual(),state.riOrig||'todas',state.grVer,Object.keys(state.docs).length,Object.keys(state.logs).length,Object.keys(state.serv).length,state.andVer||0].join('|');
    if (state._desX&&state._desX.k===chave) return state._desX.v;
    var X=[];
    // mês = mês de finalização do ato (o mesmo critério do resto do painel): assim um mês não perde os atos que ainda estavam em andamento
    function add(rp,et,nat,m,pz,sv,c){ if (!rp||pz==null||isNaN(pz)||!m) return; X.push({k:semAc(rp), nome:rp, et:et, nat:nat, m:m, pz:pz, sv:sv, c:c}); }
    if (modo==='ri'||modo==='todas') Object.keys(state.docs).forEach(function(m){ if (!state.logs[m]) return; var map=state.logCache[m]||(state.logCache[m]=Motor.decodificarLog(state.logs[m]));
      state.docs[m].atos.filter(origOk).forEach(function(a){ var L=map[a.c]; if (!L) return; L.ev.forEach(function(e){ add(e.rp,e.et,a.nat,m,e.pz,'RI',a.c); }); }); });
    if (modo==='serv'||modo==='todas') Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ if (modo==='serv'&&!docOk(d)) return; var sv=svDe(d.t); if (sv==='Apoio') return; d.ets.forEach(function(e){ add(e.rp,e.et,d.nat,m,e.pz,sv,d.c); }); }); });
    // média de cada célula (etapa × natureza) na equipe, e por pessoa, para o "esperado" sem a própria pessoa
    var EM={}; X.forEach(function(x){ var e=EM[x.et]=EM[x.et]||{n:0,s:0}; e.n++; e.s+=x.pz; }); X=X.filter(function(x){ return EM[x.et].s/EM[x.et].n>=0.05; }); // etapa sempre feita no mesmo dia não diz nada sobre ritmo
    var C={}; X.forEach(function(x){ var c=C[x.et+'|'+x.nat]=C[x.et+'|'+x.nat]||{n:0,s:0,p:{}}; c.n++; c.s+=x.pz; var q=c.p[x.k]=c.p[x.k]||{n:0,s:0}; q.n++; q.s+=x.pz; });
    X.forEach(function(x){ var c=C[x.et+'|'+x.nat], q=c.p[x.k], no=c.n-q.n; x.espG=c.s/c.n; x.esp=no>=5?(c.s-q.s)/no:null; x.dv=x.esp==null?null:x.pz-x.esp; x.dvG=x.pz-x.espG; });
    state._desX={k:chave, v:X}; return X;
  }
  function desJanelas(X){
    var ms={}; X.forEach(function(x){ ms[x.m]=1; }); ms=Object.keys(ms).sort();
    var cnt={}, parcial=null; X.forEach(function(x){ cnt[x.m]=(cnt[x.m]||0)+1; });
    var agora=state.periodo!=='todos'&&ms.indexOf(state.periodo)>=0?state.periodo:ms[ms.length-1];
    if (state.periodo==='todos' && ms.length>2){ var ult=ms[ms.length-1], ref=mediana(ms.slice(-7,-1).map(function(m){ return cnt[m]; })); if (cnt[ult]<0.6*ref){ parcial=ult; agora=ms[ms.length-2]; } }
    var i=ms.indexOf(agora);
    return {ms:ms.filter(function(m){ return m!==parcial; }), agora:agora, antes:ms.slice(Math.max(0,i-6),i), parcial:parcial};
  }
  function zWelch(a,b){ var ea=est(a), eb=est(b); if (ea.n<2||eb.n<2) return null; var va=0, vb=0; a.forEach(function(x){ va+=(x-ea.media)*(x-ea.media); }); b.forEach(function(x){ vb+=(x-eb.media)*(x-eb.media); }); va/=ea.n-1; vb/=eb.n-1; var se=Math.sqrt(va/ea.n+vb/eb.n); return {dif:ea.media-eb.media, z:se>0?(ea.media-eb.media)/se:0, ma:ea.media, mb:eb.media, na:ea.n, nb:eb.n}; }
  function zMedia(a){ var e=est(a); if (e.n<2) return null; var v=0; a.forEach(function(x){ v+=(x-e.media)*(x-e.media); }); var se=Math.sqrt(v/(e.n-1)/e.n); return {m:e.media, z:se>0?e.media/se:0, n:e.n, sd:Math.sqrt(v/(e.n-1))}; } // diferença mínima (d.u. por execução) para chamar de "diferente": evita alarme por diferença irrelevante
  function leitura(t, n, maisTxt, menosTxt){ if (!t||n<MIN_N) return {txt:'poucos dados', cls:'mut'}; if (Math.abs(t.z)>=2&&Math.abs(t.dif!=null?t.dif:t.m)>=DES_MIN_DIF) return (t.dif!=null?t.dif:t.m)>0?{txt:maisTxt,cls:'acima'}:{txt:menosTxt,cls:'bom'}; return {txt:'normal',cls:''}; }
  function duMes(m){ var du=Motor.criarCalendario(state.extras||[]), p=m.split('-'), a=Math.round(Date.UTC(+p[0],+p[1]-1,1)/864e5), b=Math.round(Date.UTC(+p[0],+p[1],1)/864e5); return du(a,b); }
  function fDif(v){ return v==null||isNaN(v)?'—':(v>0?'+':'')+numBR(v,2)+' d.u.'; }

  function desVolume(X){ // pessoa -> mês -> documentos trabalhados
    var V={}, modo=svModo();
    if (modo==='ri') Object.keys(state.docs).forEach(function(m){ var pr=(state.docs[m].raw||{}).producao||{}; Object.keys(pr).forEach(function(n){ var v=pr[n], d=typeof v==='number'?v:v&&v.d; if (!d) return; var k=semAc(n); (V[k]=V[k]||{})[m]=(V[k][m]||0)+d; }); });
    else X.forEach(function(x){ (V[x.k]=V[x.k]||{})[x.m]=(V[x.k][x.m]||0)+1; });
    return V;
  }
  function desPessoas(X, J){
    var P={}, VOL=desVolume(X), PD=prodDiaria(); X.forEach(function(x){ var p=P[x.k]=P[x.k]||{k:x.k,nome:x.nome,ag:[],an:[],agAll:0,porMes:{},dvMes:{}}; p.porMes[x.m]=(p.porMes[x.m]||0)+1;
      if (x.dv!=null) (p.dvMes[x.m]=p.dvMes[x.m]||[]).push(x.dv);
      if (x.m===J.agora){ p.agAll++; if (x.dv!=null) p.ag.push(x.dv); } else if (J.antes.indexOf(x.m)>=0 && x.dv!=null) p.an.push(x.dv); });
    var duAg=duMes(J.agora);
    return Object.keys(P).map(function(k){ var p=P[k];
      p.vsEq=zMedia(p.ag); p.lEq=leitura(p.vsEq,p.ag.length,'mais lento que a equipe','mais rápido que a equipe');
      p.ritmo=zWelch(p.ag,p.an); p.lRi=p.an.length<MIN_N?{txt:'sem histórico',cls:'mut'}:leitura(p.ritmo,p.ag.length,'reduziu o ritmo','acelerou');
      var vm=VOL[k]||{}, vAg=vm[J.agora]||0, mesesAntes=J.antes.filter(function(m){ return vm[m]; }), taxa=mesesAntes.length>=2?mesesAntes.reduce(function(s,m){ return s+vm[m]/Math.max(1,duMes(m)); },0)/mesesAntes.length:null;
      p.vAg=vAg; p.volAg=vAg/Math.max(1,duAg); p.volAn=taxa; var lam=taxa!=null?taxa*duAg:null; p.porDiaAtivo=false;
      // com as execuções do VHL: documentos por DIA ATIVO (férias e afastamento não derrubam a média), comparado com a média dela por dia ativo
      var PDp=PD&&PD[k]; if (PD){ var q=PDp&&PDp.m[J.agora]; p.dAg=q?q.na:0; p.vAg=q?q.nd:0; p.duAg=duAg; p.porDiaAtivo=true; p.volAg=p.dAg?p.vAg/p.dAg:0;
        var an=J.antes.filter(function(m){ var x=PDp&&PDp.m[m]; return x&&x.na>=3; }); taxa=an.length>=2?media(an.map(function(m){ return PDp.m[m].nd/PDp.m[m].na; })):null; p.volAn=taxa; lam=taxa!=null?taxa*p.dAg:null; vAg=p.vAg; }
      p.lVol=lam==null||lam<MIN_N?{txt:'—',cls:'mut'}:((vAg-lam)/Math.sqrt(lam)<=-2&&vAg<lam*0.7)?{txt:'abaixo do normal',cls:'acima'}:((vAg-lam)/Math.sqrt(lam)>=2&&vAg>lam*1.3)?{txt:'acima do normal',cls:'bom'}:{txt:'normal',cls:''};
      return p; }).filter(function(p){ return p.agAll>0; }).sort(function(a,b){ return b.agAll-a.agAll; });
  }
  function renderDes(){
    var el=$('tabDes'); if (!el) return;
    if (svModo()==='cert'){ el.innerHTML='<div class="empty"><b>Certidões não têm etapas no VHL</b>Veja quem fez e o tempo na página Certidões.</div>'; return; }
    var X=desExecs(); if (!X.length){ el.innerHTML='<div class="empty"><b>Sem execuções de etapa</b>Importe a Produção por Etapa (PAINEL-02) e a Prazo e Tempo Médio dos meses.</div>'; return; }
    var J=desJanelas(X), P=desPessoas(X,J);
    var h='<div class="sec-h"><h2>Desempenho · '+esc(nomeMes(J.agora))+(J.parcial?' <span class="pill warn">'+esc(nomeMes(J.parcial))+' parece incompleto e ficou de fora; escolha no Período para ver</span>':'')+'</h2><span class="note">Cada execução de etapa no VHL é comparada com o que a equipe leva <b>na mesma etapa e na mesma natureza</b> (sem contar a própria pessoa). Assim quem pega atos mais difíceis não é prejudicado. A <b>linha normal</b> de cada pessoa é o desvio dela nos '+J.antes.length+' meses anteriores ('+(J.antes.length?nomeMes(J.antes[0])+' a '+nomeMes(J.antes[J.antes.length-1]):'sem histórico')+'). Só aponta diferença quando ela é real (95% de confiança) e de pelo menos '+numBR(DES_MIN_DIF,1)+' d.u. por execução.</span></div>';
    h+=desMacroHTML(X,J);
    // por pessoa
    var alertas=P.filter(function(p){ return p.lRi.cls==='acima'||p.lVol.cls==='acima'; });
    h+='<div class="sub-h" style="margin-top:18px">Por pessoa · '+esc(nomeMes(J.agora))+'</div>';
    if (alertas.length) h+='<div class="banner warn" style="margin:0 0 10px">'+alertas.map(function(p){ return '<b>'+esc(p.nome)+'</b>: '+[p.lRi.cls==='acima'?'tempo por execução acima da linha normal dela ('+fDif(p.ritmo&&p.ritmo.dif)+')':'',p.lVol.cls==='acima'?'volume abaixo do normal ('+numBR(p.volAg,1)+' por dia '+(p.porDiaAtivo?'ativo':'útil')+', normal '+numBR(p.volAn,1)+')':''].filter(Boolean).join(' e '); }).join(' · ')+'. Antes de concluir, confira férias, afastamento ou mudança de função.</div>';
    h+='<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Pessoa</th><th class="num">Execuções</th>'+(prodDiaria()?'<th class="num" title="Dias úteis com ao menos 1 execução no VHL, de quantos dias úteis teve o mês">Dias ativos</th><th class="num" title="Documentos trabalhados ÷ dias ativos">Docs por dia ativo</th>':'<th class="num" title="'+(svModo()==='ri'?'Documentos trabalhados no VHL':'Execuções')+' por dia útil do mês">Por dia útil</th>')+'<th>Volume × normal dela</th><th class="num" title="Média de (tempo dela − tempo da equipe na mesma etapa e natureza)">× equipe</th><th>Leitura</th><th class="num" title="Desvio médio nos meses anteriores">Linha normal</th><th>Ritmo</th></tr></thead><tbody>'+
      P.map(function(p){ var nl=p.an.length?media(p.an):null, ag=p.ag.length?media(p.ag):null;
        return '<tr class="click'+(state.desSel===p.k?' sel':'')+'" data-dessel="'+esc(p.k)+'"><td>'+esc(p.nome)+'</td><td class="num">'+p.agAll+'</td>'+(p.porDiaAtivo?'<td class="num">'+p.dAg+' <span class="mut">de '+p.duAg+'</span></td><td class="num" title="'+esc(p.vAg+' documentos em '+p.dAg+' dias ativos')+'"><b>'+numBR(p.volAg,1)+'</b></td>':'<td class="num">'+numBR(p.volAg,1)+'</td>')+'<td class="'+p.lVol.cls+'">'+p.lVol.txt+(p.volAn!=null?' <span class="mut">('+numBR(p.volAn,1)+')</span>':'')+'</td><td class="num">'+fDif(ag)+'</td><td class="'+p.lEq.cls+'">'+p.lEq.txt+'</td><td class="num">'+fDif(nl)+'</td><td class="'+p.lRi.cls+'">'+p.lRi.txt+'</td></tr>'; }).join('')+'</tbody></table></div>'+
      '<p class="hint">Desvio = dias úteis da pessoa na etapa − média da equipe na mesma etapa e natureza. Negativo é mais rápido. '+(prodDiaria()?'Dia ativo = dia útil com ao menos 1 execução no VHL; "Volume × normal dela" compara os documentos por dia ativo do mês com a média dela por dia ativo nos meses anteriores, então férias não viram queda de volume. ':'(Carregando as execuções para a média por dia ativo…) ')+'Clique numa pessoa para ver a carta de controle dela.</p>';
    var sel=P.filter(function(p){ return p.k===state.desSel; })[0]; if (sel) h+=desPessoaHTML(sel,X,J);
    el.innerHTML=h;
  }
  function desCarta(p, J, irMes){
    var ms=J.ms.filter(function(m){ return m<=J.agora; }).slice(-12), base=p.an, eb=zMedia(base), cen=eb?eb.m:null, sd=eb?eb.sd:null;
    var serie=ms.map(function(m){ var v=p.dvMes[m]; return v&&v.length>=3?media(v):null; }), nM=ms.map(function(m){ return (p.dvMes[m]||[]).length; });
    var lb=function(i){ return Math.max(DES_MIN_DIF,2*sd/Math.sqrt(nM[i])); };
    var bl=ms.map(function(m,i){ return cen!=null&&nM[i]>=3?cen-lb(i):null; }), bh=ms.map(function(m,i){ return cen!=null&&nM[i]>=3?cen+lb(i):null; });
    var alerta=serie.map(function(v,i){ return v!=null&&bh[i]!=null&&(v>bh[i]||v<bl[i]); });
    return gLinhas(ms,[{nome:p.nome,cor:'var(--c1)',v:serie,alerta:alerta,extra:nM.map(function(n){ return n+' execuções'; })}],{titulo:'Carta de controle',un:'d.u.',irMes:irMes,banda:cen!=null?{lo:bl,hi:bh}:null,ref:[{v:0,nome:'equipe'}].concat(cen!=null?[{v:cen,nome:'linha normal'}]:[])});
  }
  function desPessoaHTML(p, X, J){
    var h='<div class="sub-h" style="margin-top:18px">'+esc(p.nome)+' · carta de controle</div><div class="vz-grid">';
    h+=vzCard('Desvio por mês × linha normal','faixa cinza = variação normal dela; ponto vermelho = fora da faixa',desCarta(p,J,'des'),'vz-wide');
    // por etapa: dela × equipe (box plot)
    var me=X.filter(function(x){ return x.k===p.k&&(x.m===J.agora||J.antes.indexOf(x.m)>=0); }), cnt={}; me.forEach(function(x){ cnt[x.et]=(cnt[x.et]||0)+1; });
    var top=Object.keys(cnt).sort(function(a,b){ return cnt[b]-cnt[a]; }).slice(0,5), g=[];
    top.forEach(function(et){ var dela=me.filter(function(x){ return x.et===et; }), nats={}; dela.forEach(function(x){ nats[x.nat]=1; });
      var eq=X.filter(function(x){ return x.et===et&&x.k!==p.k&&nats[x.nat]&&(x.m===J.agora||J.antes.indexOf(x.m)>=0); });
      var ptE=function(x){ return {v:x.pz, item:x.c, lab:x.c+' · '+x.pz+' d.u.', go:x.c?{t:'prot',c:x.c}:null, tip:'<b>Protocolo '+esc(x.c||'—')+'</b><br>'+esc(x.nome)+' · '+esc(et)+'<br>'+esc(x.nat)+'<br>'+x.pz+' d.u. na etapa'+(x.esp!=null?' · equipe '+numBR(x.esp,1):'')}; };
      var et2=et.length>22?et.slice(0,21)+'…':et; g.push({nome:et2+' · dela',cor:'var(--c1)',pts:dela.map(ptE),sub:dela.length+' execuções'}); g.push({nome:et2+' · equipe',cor:'var(--c2)',pts:eq.map(ptE),sub:eq.length+' execuções (mesmas naturezas)'}); });
    h+=vzCard('Dias úteis na etapa · dela × equipe','últimos '+(J.antes.length+1)+' meses, mesmas naturezas',gBox(g,{un:'d.u.',pl:230,tipoLista:'prots'}),'vz-wide');
    // tabela etapa × natureza
    var cel={}; me.filter(function(x){ return x.dv!=null; }).forEach(function(x){ var k=x.et+'|'+x.nat, c=cel[k]=cel[k]||{et:x.et,nat:x.nat,v:[],e:[]}; c.v.push(x.pz); c.e.push(x.esp); });
    var cl=Object.keys(cel).map(function(k){ return cel[k]; }).sort(function(a,b){ return b.v.length-a.v.length; }).slice(0,15);
    h+='</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Etapa</th><th>Natureza</th><th class="num">Execuções</th><th class="num">Dela (média)</th><th class="num">Equipe (média)</th><th class="num">Diferença</th></tr></thead><tbody>'+
      cl.map(function(c){ var a=media(c.v), b=media(c.e), d=a-b; return '<tr><td>'+esc(c.et)+'</td><td>'+esc(c.nat)+'</td><td class="num">'+c.v.length+'</td><td class="num">'+numBR(a,1)+'</td><td class="num">'+numBR(b,1)+'</td><td class="num '+(c.v.length>=5&&d>=0.5?'acima':c.v.length>=5&&d<=-0.5?'bom':'')+'">'+fDif(d)+'</td></tr>'; }).join('')+'</tbody></table></div>';
    return h;
  }
  // tendência da equipe: etapa a etapa e o protocolo inteiro, "antes × agora"
  function desMacroHTML(X, J){
    var ms=J.ms.filter(function(m){ return m<=J.agora; }).slice(-12), h='<div class="sub-h">Equipe · antes × agora</div>';
    // protocolo inteiro
    var prot=desProtocolos(), ag=prot.filter(function(x){ return x.m===J.agora; }), an=prot.filter(function(x){ return J.antes.indexOf(x.m)>=0; });
    var tB=zWelch(ag.map(function(x){ return x.b; }),an.map(function(x){ return x.b; })), tL=zWelch(ag.filter(function(x){ return x.l!=null; }).map(function(x){ return x.l; }),an.filter(function(x){ return x.l!=null; }).map(function(x){ return x.l; }));
    function tile(nome,t,sub){ if (!t) return kpi(nome,'—','poucos dados'); var l=leitura(t,t.na,'piorou','melhorou'); return kpi(nome,numBR(t.mb,1)+' → '+numBR(t.ma,1)+' <small style="font-size:14px">d.u.</small>','antes → agora (média) · <span class="'+(l.cls==='acima'?'gm-mau':l.cls==='bom'?'gm-bom':'')+'">'+(l.txt==='normal'?'sem mudança real':l.txt)+'</span> · '+sub); }
    h+='<div class="kpis" style="margin-bottom:10px">'+tile('Protocolo · tempo total (bruto)',tB,ag.length+' agora × '+an.length+' antes')+(tL?tile('Protocolo · tempo com o cartório (líquido)',tL,'sem a espera do cliente'):'')+
      (function(){ var t=zWelch(X.filter(function(x){ return x.m===J.agora; }).map(function(x){ return x.dvG; }),X.filter(function(x){ return J.antes.indexOf(x.m)>=0; }).map(function(x){ return x.dvG; })); if (!t) return ''; var l=leitura(t,t.na,'equipe mais lenta','equipe mais rápida');
        return kpi('Etapas · mesmo mix de atos',fDif(t.dif),'por execução, agora × antes · <span class="'+(l.cls==='acima'?'gm-mau':l.cls==='bom'?'gm-bom':'')+'">'+(l.txt==='normal'?'sem mudança real':l.txt)+'</span>'); })()+'</div>';
    // etapas: top 6 por volume
    var cnt={}; X.forEach(function(x){ if (x.m===J.agora||J.antes.indexOf(x.m)>=0) cnt[x.et]=(cnt[x.et]||0)+1; });
    var top=Object.keys(cnt).sort(function(a,b){ return cnt[b]-cnt[a]; }).slice(0,8);
    var linhas=top.map(function(et){ var a=X.filter(function(x){ return x.et===et&&x.m===J.agora; }), b=X.filter(function(x){ return x.et===et&&J.antes.indexOf(x.m)>=0; });
      var t=zWelch(a.map(function(x){ return x.dvG; }),b.map(function(x){ return x.dvG; })), ma=media(a.map(function(x){ return x.pz; })), mb=media(b.map(function(x){ return x.pz; }));
      var quem=null; if (t&&t.dif>0){ var pp={}; a.forEach(function(x){ var q=pp[x.k]=pp[x.k]||{nome:x.nome,s:0}; q.s+=x.dvG; }); var best=Object.keys(pp).sort(function(u,v){ return pp[v].s-pp[u].s; })[0]; if (best&&pp[best].s>0) quem=pp[best].nome; }
      return {et:et, na:a.length, nb:b.length, ma:ma, mb:mb, t:t, l:leitura(t,a.length,'piorou','melhorou'), quem:quem}; });
    h+='<div class="vz-grid">'+vzCard('Dias úteis por etapa · média mensal','etapas com mais execuções',gLinhas(ms,top.slice(0,6).map(function(et,i){ return {nome:et,cor:CAT[i],v:ms.map(function(m){ var v=X.filter(function(x){ return x.et===et&&x.m===m; }).map(function(x){ return x.pz; }); return v.length>=5?media(v):null; })}; }),{titulo:'Dias por etapa',un:'d.u.',zero:true,rotulos:false,irMes:'des'}),'vz-wide')+
      vzCard('Protocolo · tempo até o registro','mediana e média por mês',gLinhas(ms,[{nome:'Mediana',cor:'var(--c1)',v:ms.map(function(m){ var v=prot.filter(function(x){ return x.m===m; }).map(function(x){ return x.b; }); return v.length?mediana(v):null; })},{nome:'Média',cor:'var(--c2)',tracejado:true,v:ms.map(function(m){ var v=prot.filter(function(x){ return x.m===m; }).map(function(x){ return x.b; }); return v.length?media(v):null; })}],{titulo:'Tempo do protocolo',un:'d.u.',zero:true,irMes:'des'}),'vz-wide')+'</div>';
    h+='<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Etapa</th><th class="num">Antes (média)</th><th class="num">Agora (média)</th><th class="num">Variação</th><th class="num" title="Mudança descontando a troca de naturezas">Mesmo mix</th><th>Leitura</th><th>Maior contribuição</th></tr></thead><tbody>'+
      linhas.map(function(r){ var vp=r.mb?((r.ma-r.mb)/r.mb*100):null; return '<tr><td>'+esc(r.et)+' <span class="mut">('+r.na+' agora)</span></td><td class="num">'+numBR(r.mb,1)+'</td><td class="num">'+numBR(r.ma,1)+'</td><td class="num">'+(vp==null||!isFinite(vp)?'—':(vp>0?'+':'')+numBR(vp,0)+'%')+'</td><td class="num">'+fDif(r.t&&r.t.dif)+'</td><td class="'+r.l.cls+'">'+(r.l.txt==='normal'?'sem mudança real':r.l.txt)+'</td><td>'+(r.l.cls==='acima'&&r.quem?esc(r.quem):'<span class="mut">·</span>')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    return h;
  }
  // tempo do protocolo inteiro: RI (bruto e líquido dos registrados) e demais serventias (dias úteis do ingresso à finalização)
  function desProtocolos(){
    var modo=svModo(), out=[];
    if (modo==='ri'||modo==='todas') Object.keys(state.docs).forEach(function(m){ state.docs[m].atos.filter(origOk).forEach(function(a){ if (a.cat==='R'&&a.bruto!=null&&!justDe(a)) out.push({m:m,b:a.bruto,l:a.liq}); }); });
    if (modo==='serv'||modo==='todas') Object.keys(state.serv).forEach(function(m){ state.serv[m].forEach(function(d){ if (modo==='serv'&&!docOk(d)) return; if (svDe(d.t)==='Apoio') return; var v=servDu(d); if (v!=null) out.push({m:m,b:v,l:null}); }); });
    return out;
  }

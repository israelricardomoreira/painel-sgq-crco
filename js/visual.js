/* Painel SGQ · CRCO — js/visual.js (0.12.0: o app.js foi dividido por página; tudo continua no mesmo escopo global, na ordem do index.html) */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/visual.js']='0.23.0';
  // ═════════ modo visual: o painel em gráficos (segue Serventia e Período do topo) ═════════
  function renderVis(){
    var el=$('tabVis'); if (!el) return; var modo=svModo(), ms=mesesGraficos(), cards=[];
    var per=nomePeriodo();
    if (modo==='ri'||modo==='cert'){
      aplicarTri7(); var atos=todosAtos(), r=resumo(atos), msR=ms.filter(function(m){ return state.docs[m]; });
      if (modo==='ri'){
        cards.push(vzCard('Volume de atos','atos RI por mês, sem pesquisas qualificadas · clique no mês para ver só ele em Por natureza',gLinhas(msR,[{nome:'Atos',cor:'var(--c1)',v:msR.map(function(m){ return atosDoMes(m).length; })}],{titulo:'Volume',area:true,irMes:'nat'}),'vz-wide'));
        cards.push(vzCard('KPI-02 · no prazo','% por mês · clique no mês para ver os fora do prazo',gLinhas(msR,[{nome:'No prazo',cor:'var(--c1)',v:msR.map(function(m){ var x=resumo(atosDoMes(m)); return x.n?x.kpi:null; })}],{titulo:'KPI-02',un:'%',W:360,H:210,irMes:'fp'})));
        var tud=atos.filter(function(a){ return a.cat==='R'||a.cat==='N'; }), cenL=tud.filter(function(a){ return origemAto(a)==='central'; }), balL=tud.filter(function(a){ return origemAto(a)!=='central'; });
        cards.push(vzCard('Origem dos protocolos',per+' · clique na fatia para listar',gRosca([{nome:'Balcão',v:balL.length,cor:'var(--c1)',go:goLista('Protocolos de balcão','atos',balL)},{nome:'Central (ONR)',v:cenL.length,cor:'var(--c2)',go:goLista('Protocolos da central (ONR)','atos',cenL)}],{titulo:'Origem'})));
        var R=r.Rall, E0=R.filter(function(a){ return !a.nex; }), E1=R.filter(function(a){ return a.nex===1; }), E2=R.filter(function(a){ return a.nex>=2; });
        cards.push(vzCard('Exigências por título registrado',per+' · clique na fatia para listar',gRosca([{nome:'Sem exigência',v:E0.length,cor:'var(--c3)',go:goLista('Registrados sem exigência','atos',E0)},{nome:'1 exigência',v:E1.length,cor:'var(--c4)',go:goLista('Registrados com 1 exigência','atos',E1)},{nome:'2 ou mais',v:E2.length,cor:'var(--c2)',go:goLista('Registrados com 2 ou mais exigências','atos',E2)}],{titulo:'Exigências',centro:pct(R.length?E0.length/R.length*100:null),sub:'1ª qualificação'})));
        var nat={}; atos.forEach(function(a){ var n=nat[a.nat]=nat[a.nat]||{n:0,b:[],R:[]}; n.n++; if (a.cat==='R'&&a.bruto!=null){ n.b.push(a.bruto); n.R.push(a); } });
        var topN=Object.keys(nat).sort(function(a,b){ return nat[b].n-nat[a].n; });
        cards.push(vzCard('Naturezas com mais protocolos',per+' · clique para abrir a natureza',gBarrasH(topN.slice(0,10).map(function(k){ return {nome:k,v:nat[k].n,go:goNatRI(k)}; }))));
        cards.push(vzCard('Dias úteis até o registro · por natureza','box plot · linha vermelha = 20 d.u. · cada ponto é um protocolo fora do padrão (clique abre a ficha) · clique na linha para abrir a natureza',
          gBox(topN.slice(0,8).filter(function(k){ return nat[k].b.length>=3; }).map(function(k){ return {nome:k,pts:nat[k].R.map(function(a){ return ptAto(a,a.bruto); }),sub:nat[k].b.length+' registrados',go:goNatRI(k)}; }),{un:'d.u.',ref:20,pl:200,tipoLista:'atos'}),'vz-wide'));
        cards.push(vzCard('Distribuição do tempo até o registro','histograma · todos os registrados · clique na coluna para listar os protocolos',gHisto(r.R.map(function(a){ return a.bruto; }),{un:'d.u.',passo:1,max:30,lim:20,xl:'dias úteis brutos',itens:r.R,tipoLista:'atos',nomeLista:'tempo até o registro'}),'vz-wide'));
        cards.push(vzCard('Volume × tempo por natureza','dispersão · cada ponto é uma natureza · clique para abrir',gDispersao(topN.filter(function(k){ return nat[k].b.length>=3; }).map(function(k,i){ return {nome:k,x:nat[k].n,y:mediana(nat[k].b),rot:i<5?nat[k].n:0,extra:nat[k].b.length+' registrados',go:goNatRI(k)}; }),{xl:'protocolos no período (escala log)',yl:'mediana d.u.',logX:true,refY:20,refYNome:'prazo 20 d.u.',quem:'natureza'}),'vz-wide'));
      }
      // certidões
      var all=certCalc(certRecs()), hum=all.filter(function(x){ return x.u&&!/^tri7$/i.test(x.u); }), auto=[], temAuto=false;
      Object.keys(state.cert).forEach(function(m){ if (state.periodo==='todos'||state.periodo===m){ var rw=state.cert[m].raw||{}; if (rw.auto){ temAuto=true; auto=auto.concat(rw.auto); } } });
      if (all.length && modo==='cert'){ // 1.10.4: certidões só na visão Certidões
        cards.push(vzCard('Certidões · de onde vêm',per+' · balcão × central',certOrigemRosca(all)));
        if (temAuto) cards.push(vzCard('Certidões · quem fez',per,gRosca([{nome:'Escreventes',v:hum.length,cor:'var(--c1)',go:goLista('Certidões feitas por escreventes','cert',hum)},{nome:'Automáticas (Tri7)',v:auto.length,cor:'var(--c2)',go:goLista('Certidões automáticas (Tri7)','cods',auto)}],{titulo:'Certidões'})));
        var pc={}; hum.forEach(function(x){ pc[x.u]=(pc[x.u]||0)+1; });
        cards.push(vzCard('Certidões por escrevente','quem gerou o selo · clique para o relatório individual',gBarrasH(Object.keys(pc).sort(function(a,b){ return pc[b]-pc[a]; }).slice(0,10).map(function(k){ return {nome:k,v:pc[k],go:goPessoa(k)}; }))));
        cards.push(vzCard('Horas úteis até a certidão','box plot · balcão × central · cada ponto é um pedido'+(all.some(function(x){ return x.intim; })?' · sem as '+all.filter(function(x){ return x.intim; }).length+' do fluxo de intimação':''),certBox(all.filter(function(x){ return !x.intim; })),'vz-wide'));
      }
    } else {
      var D=selDocs(), msS=ms.filter(function(m){ return state.serv[m]; }), AT=[];
      var docsMes=function(m){ return selDocsMes(m).filter(function(d){ return svDe(d.t)!=='Apoio'; }); };
      if (modo==='todas'){ // 1.10.4: mesma regra do Painel geral — sem certidões; no RI, protocolos registrados e cancelados
        var sv=['RI','RC','RTD/PJ'], semCert=function(d){ return svDe(d.t)!=='Apoio' && clsDe(d.t,d.nat)!=='cert'; };
        var atosRN=function(m){ return state.docs[m]?state.docs[m].atos.filter(function(a){ return a.cat==='R'||a.cat==='N'; }):[]; };
        cards.push(vzCard('Produção por serventia','documentos finalizados por mês (sem certidões, mesma regra do Painel geral) · % do mês · clique no segmento para ver só aquela serventia no mês',graficoBarras(msS,sv.map(function(s,i){ return {nome:s,cor:CAT[i],v:msS.map(function(m){ var n=(state.serv[m]||[]).filter(function(d){ return svDe(d.t)===s && semCert(d); }).length; if (s==='RI') n+=atosRN(m).length; return n; })}; }),{titulo:'Produção por serventia',goMes:function(m){ return goMes(m,'vis'); },goSeg:function(m,i,se){ return {t:'sv',sv:se.nome,m:m}; }}),'vz-wide'));
        D=servDocs('__todas').filter(semCert); mesesPeriodo().forEach(function(m){ AT=AT.concat(atosRN(m)); });
        var tot={}; sv.forEach(function(s){ tot[s]=0; }); D.forEach(function(d){ var s=svDe(d.t); if (tot[s]!=null) tot[s]++; }); tot.RI+=AT.length;
        cards.push(vzCard('Participação na produção',per+' · sem certidões · clique para ver só a serventia',gRosca(sv.map(function(s,i){ return {nome:s,v:tot[s],cor:CAT[i],go:{t:'sv',sv:s}}; }),{titulo:'Participação'})));
      } else {
        cards.push(vzCard('Volume','documentos por mês · clique no mês para ver só ele',gLinhas(msS,[{nome:'Documentos',cor:'var(--c1)',v:msS.map(function(m){ return docsMes(m).length; })}],{titulo:'Volume',area:true,irMes:'nat'}),'vz-wide'));
        cards.push(vzCard('No prazo','% por mês · só naturezas com prazo cadastrado em Por natureza · clique no mês',gLinhas(msS,[{nome:'No prazo',cor:'var(--c1)',v:msS.map(function(m){ var c=docsMes(m).filter(function(d){ return servPrazo(d)!=null; }); return c.length?c.filter(servOk).length/c.length*100:null; })}],{titulo:'No prazo',un:'%',W:360,H:210,irMes:'fp'})));
      }
      D=D.filter(function(d){ return svDe(d.t)!=='Apoio'; });
      var nt={}; D.forEach(function(d){ var n=nt[d.nat]=nt[d.nat]||{n:0,v:[],P:[]}; n.n++; var v=servDu(d); if (v!=null){ n.v.push(v); n.P.push(ptDoc(d,v)); } });
      AT.forEach(function(a){ var n=nt['RI · '+a.nat]=nt['RI · '+a.nat]||{n:0,v:[],P:[],ato:1}; n.n++; if (a.cat==='R'&&a.bruto!=null){ n.v.push(a.bruto); n.P.push(ptAto(a,a.bruto)); } });
      var tn=Object.keys(nt).sort(function(a,b){ return nt[b].n-nt[a].n; }), todosV=[].concat.apply([],tn.map(function(k){ return nt[k].v; })), todosD=[].concat.apply([],tn.map(function(k){ return nt[k].P.map(function(p){ return p.item; }); }));
      var goNt=function(k){ return modo==='todas'?null:goNatServ(k,D); };
      cards.push(vzCard('Naturezas com mais documentos',per+(modo==='todas'?' · protocolos do RI marcados com "RI ·" · sem certidões':' · clique para abrir a natureza'),gBarrasH(tn.slice(0,10).map(function(k){ return {nome:k,v:nt[k].n,go:goNt(k)}; }))));
      cards.push(vzCard('Dias úteis do ingresso à finalização · por natureza','box plot · cada ponto é um documento fora do padrão (clique abre a ficha)'+(AT.length?' · no RI, até o registro':''),gBox(tn.slice(0,8).filter(function(k){ return nt[k].v.length>=3; }).map(function(k){ return {nome:k,pts:nt[k].P,sub:nt[k].n+(nt[k].ato?' protocolos':' documentos'),go:goNt(k),tipoLista:nt[k].ato?'atos':'docs'}; }),{un:'d.u.',pl:220,tipoLista:'docs'}),'vz-wide'));
      cards.push(vzCard('Distribuição do tempo',AT.length?'histograma · protocolos do RI (até o registro) e documentos das demais serventias':'histograma · clique na coluna para listar os documentos',gHisto(todosV,{un:'d.u.',xl:'dias úteis',itens:AT.length?null:todosD,tipoLista:'docs',nomeLista:'tempo até finalizar'}),'vz-wide'));
      cards.push(vzCard('Volume × tempo por natureza','dispersão · cada ponto é uma natureza',gDispersao(tn.filter(function(k){ return nt[k].v.length>=3; }).map(function(k,i){ return {nome:k,x:nt[k].n,y:mediana(nt[k].v),rot:i<5?nt[k].n:0,go:goNt(k)}; }),{xl:'documentos (escala log)',yl:'mediana d.u.',logX:true,quem:'natureza'}),'vz-wide'));
    }
    // pessoas: produção × inconformidades
    var RD=relDados(), PP=RD.P, II=RD.I;
    if (modo==='ri'){ PP={}; todosAtos().forEach(function(a){ var vist={}; nxEventos(a).forEach(function(e){ if (!e.rp) return; var k=semAc(e.rp); if (vist[k]) return; vist[k]=1; var q=PP[k]=PP[k]||{nome:e.rp,docs:0}; q.docs++; }); });
      II={}; incRecs().filter(function(r){ return r.t==='RI'; }).forEach(function(r){ var k=semAc(r.r), x=II[k]=II[k]||{recs:[]}; x.recs.push(r); }); } // 1.10.4: só protocolos do RI
    if (modo==='cert') PP={}; // 1.10.4: em Certidões vale 'Certidões por escrevente'
    var pts=Object.keys(PP).map(function(k){ var p=PP[k], inc=((II[k]||{}).recs||[]).length; return p.docs>=MIN_PROD?{nome:p.nome,x:p.docs,y:inc/p.docs*100,rot:p.docs,extra:inc+' inconformidades',go:goPessoa(p.nome)}:null; }).filter(Boolean);
    var prodP=Object.keys(PP).map(function(k){ return {nome:PP[k].nome,v:PP[k].docs,go:goPessoa(PP[k].nome)}; }).filter(function(x){ return x.v; }).sort(function(a,b){ return b.v-a.v; }).slice(0,12);
    if (prodP.length) cards.push(vzCard('Produção por pessoa',(modo==='ri'?'protocolos do RI':'documentos')+' trabalhados no VHL · clique para o relatório individual',gBarrasH(prodP)));
    if (pts.length>=2) cards.push(vzCard('Produção × inconformidades','dispersão · cada ponto é uma pessoa com '+MIN_PROD+'+ documentos · clique para o relatório',gDispersao(pts,{xl:'documentos trabalhados',yl:'% inconformidades',unY:'%',nRot:6,quem:'pessoa'}),'vz-wide'));
    if (modo!=='cert'){ var X=desExecs(); if (X.length){ var J=desJanelas(X), P=desPessoas(X,J).filter(function(p){ return p.ag.length>=MIN_N; });
      if (P.length) cards.push(vzCard('Ritmo × equipe · '+nomeMes(J.agora),'d.u. por execução vs equipe (mesma etapa e natureza) · negativo = mais rápido · clique para a carta de controle',gBarrasH(P.map(function(p){ return {nome:p.nome,v:Math.round(media(p.ag)*100)/100,cor:media(p.ag)>DES_MIN_DIF?'var(--c2)':'var(--c1)',extra:p.ag.length+' execuções · '+p.lEq.txt,go:{t:'des',k:p.k}}; }).sort(function(a,b){ return a.v-b.v; }),{un:''}))); } }
    var h='<div class="sec-h"><span class="note">Os mesmos números das outras páginas, em gráfico. Segue a Serventia e o Período do topo ('+esc(per)+'). Passe o mouse para ver os valores; clique (no celular, toque duas vezes) para ir ao dado de origem.</span></div>';
    el.innerHTML=h+(cards.length?'<div class="vz-grid">'+cards.join('')+'</div>':'<div class="empty">Sem dados para o período.</div>');
  }
  function visGrade(cards){ return VIS_DICA+(cards.length?'<div class="vz-grid">'+cards.join('')+'</div>':'<div class="empty">Sem dados para o período.</div>'); }
  // mapa de calor genérico · linhas/colunas [{k,nome,curto?,go?,tip?}] · cel(linha,coluna) -> {v, txt?, tip, go}
  function gMapa(linhas, colunas, cel){
    var vals=[]; linhas.forEach(function(r){ colunas.forEach(function(c){ var x=cel(r,c); if (x&&x.v) vals.push(x.v); }); });
    var mx=vals.length?Math.max.apply(null,vals):1, MIX=[10,24,40,60,82];
    return '<div class="tbl-wrap"><table class="hm"><thead><tr><th></th>'+colunas.map(function(c){ return '<th title="'+esc(c.nome)+'">'+esc(c.curto||c.nome)+'</th>'; }).join('')+'</tr></thead><tbody>'+
      linhas.map(function(r){ return '<tr><th class="hm-r"'+(r.tip?' data-tip="'+esc(r.tip)+'"':'')+goAttr(r.go)+'>'+esc(r.nome)+'</th>'+colunas.map(function(c){ var x=cel(r,c)||{};
        if (!x.v) return '<td class="hmc"></td>'; var b=Math.max(0,Math.min(4,Math.floor(x.v/mx*5-1e-9)));
        return '<td class="hmc b'+b+'" style="background:color-mix(in srgb, var(--brand) '+MIX[b]+'%, var(--surface))" data-tip="'+esc(x.tip||'')+'"'+goAttr(x.go)+'>'+(x.txt!=null?x.txt:x.v)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div>';
  }
  function abrev(s,n){ s=String(s||''); return s.length>n?s.slice(0,n-1)+'…':s; }

  // ——— Inconformidades
  function visK1(atos){
    var A=atrAtual(), todos=incTodos(), filtro=function(r){ return A!=='RI'?incOk(r):(state.incSetor==='todos'||r.t==='RI'); }, recs=incRecs().filter(filtro), per=nomePeriodo(), cards=[];
    if (!recs.length) return '<div class="empty">Sem inconformidades no período com este filtro.</div>';
    var pc={}; recs.forEach(function(r){ var c=catDe(r); (pc[c]=pc[c]||[]).push(r); });
    var cats=Object.keys(pc).sort(function(a,b){ return pc[b].length-pc[a].length; });
    cards.push(vzCard('Erros por tipo',per+' · '+recs.length+' registros',gBarrasH(cats.map(function(c){ return {nome:c, v:pc[c].length, extra:pct(pc[c].length/recs.length*100)+' dos registros', go:goLista('Erro: '+c,'inc',pc[c])}; }))));
    var I=recs.filter(function(r){ return grupoDe(r)!=='E'; }), E=recs.filter(function(r){ return grupoDe(r)==='E'; });
    cards.push(vzCard('Interno × externo',per+' · externo = o erro saiu do cartório',gRosca([{nome:'Interno',v:I.length,cor:'var(--c1)',go:goLista('Inconformidades internas','inc',I)},{nome:'Externo',v:E.length,cor:'var(--c2)',go:goLista('Inconformidades externas','inc',E)}],{titulo:'Interno × externo',sub:'registros'})));
    var ms=Object.keys(state.inconf).sort().slice(-12), porM=ms.map(function(m){ return (state.inconf[m]||[]).filter(filtro); });
    cards.push(vzCard('Registros por mês','todos os meses importados · clique no mês para ver só ele',gLinhas(ms,[{nome:'Registros',cor:'var(--c1)',v:porM.map(function(x){ return x.length; }),extra:porM.map(function(x){ return x.filter(function(r){ return grupoDe(r)==='E'; }).length+' externos'; })}],{titulo:'Registros por mês',zero:true,area:true,irMes:'k1'}),'vz-wide'));
    if (A==='RI'){ var msR=Object.keys(state.docs).sort().slice(-12), kv=msR.map(function(m){ return kpi1Mes(state.docs[m].atos,todos); });
      cards.push(vzCard('KPI-01 · atos com inconformidade','% dos atos RI registrados no mês',gLinhas(msR,[{nome:'KPI-01',cor:'var(--c2)',v:kv.map(function(q){ return q.k; }),extra:kv.map(function(q){ return q.c+' de '+q.n+' atos'; })}],{titulo:'KPI-01',un:'%',zero:true,ref:[{v:metaDe('KPI-01',16.5),nome:'meta'}],irMes:'k1'}),'vz-wide')); }
    // pessoa × tipo
    var pes={}; recs.forEach(function(r){ if (r.r) (pes[r.r]=pes[r.r]||[]).push(r); });
    var pk=Object.keys(pes).sort(function(a,b){ return pes[b].length-pes[a].length; }).slice(0,15), ck=cats.slice(0,8);
    if (pk.length) cards.push(vzCard('Pessoa × tipo de erro','as 15 pessoas e os 8 erros com mais registros · mais escuro = mais registros · clique no número para listar, no nome para o relatório',
      gMapa(pk.map(function(p){ return {k:p, nome:p, tip:'<b>'+esc(p)+'</b><br>'+pes[p].length+' registros no período', go:goPessoa(p)}; }), ck.map(function(c){ return {k:c, nome:c, curto:abrev(c,16)}; }),
        function(r,c){ var L=pes[r.k].filter(function(x){ return catDe(x)===c.k; }); return L.length?{v:L.length, tip:'<b>'+esc(r.k)+'</b><br>'+esc(c.k)+': '+L.length, go:goLista(r.k+' · '+c.k,'inc',L)}:null; }),'vz-wide'));
    // taxa × produção
    var RD=relDados(), pts=Object.keys(RD.P).map(function(k){ var p=RD.P[k], inc=((RD.I[k]||{}).recs||[]).filter(function(r){ return !!state.docs[r.d.slice(0,7)]; }).length, lt=RD.LT[k];
      return p.docs>=MIN_PROD?{nome:p.nome, x:p.docs, y:inc/p.docs*100, rot:p.docs, cor:lt&&lt.sig==='acima'?'var(--c2)':'var(--c1)', extra:inc+' inconformidades'+(lt?' · '+lt.txt:''), go:goPessoa(p.nome)}:null; }).filter(Boolean);
    if (pts.length>=2) cards.push(vzCard('Taxa × produção por pessoa','cada ponto é uma pessoa com '+MIN_PROD+'+ documentos · laranja = acima do esperado para o volume dela',gDispersao(pts,{xl:'documentos trabalhados no VHL',yl:'% de inconformidades',unY:'%',nRot:6,quem:'pessoa',refY:RD.taxaEq,refYNome:'média da equipe'}),'vz-wide'));
    return visGrade(cards);
  }

  // ——— Atendimento
  function visAtend(L){
    var cards=[], at=L.filter(function(s){ return s.c!=null&&s.e!=null; }), per=nomePeriodo();
    if (!at.length) return '<div class="empty">Sem senhas chamadas no período.</div>';
    var FX=[[0,30,'até 30 s'],[30,60,'30 s a 1 min'],[60,120,'1 a 2 min'],[120,300,'2 a 5 min'],[300,600,'5 a 10 min'],[600,900,'10 a 15 min'],[900,1e9,'15 min ou mais']];
    cards.push(vzCard('Espera até a chamada · por faixa',per+' · laranja = 10 min ou mais (gatilho do PCA) · clique para listar as senhas',gBarrasH(FX.map(function(f){ var L2=at.filter(function(s){ return s.e>=f[0]&&s.e<f[1]; }); return {nome:f[2], v:L2.length, cor:f[0]>=600?'var(--c2)':'var(--c1)', extra:pct(L2.length/at.length*100)+' das senhas chamadas', go:goLista('Espera '+f[2],'senhas',L2)}; }))));
    // dia da semana × hora
    var cel={}, horas={}; L.forEach(function(s){ var hr=Math.floor(s.g/3600), k=s.dw+'_'+hr, c=cel[k]=cel[k]||{L:[],es:[]}; c.L.push(s); if (s.c!=null&&s.e!=null) c.es.push(s.e); horas[hr]=(horas[hr]||0)+1; });
    var hs=Object.keys(horas).map(Number).filter(function(h){ return horas[h]>=Math.max(5,L.length*0.005); }).sort(function(a,b){ return a-b; });
    cards.push(vzCard('Quando aperta · espera média (min)','dia da semana × hora da emissão · clique na célula para listar as senhas',gMapa([1,2,3,4,5].map(function(dw){ return {k:dw, nome:DSEM[dw]}; }), hs.map(function(h){ return {k:h, nome:h+'h'}; }),
      function(r,c){ var x=cel[r.k+'_'+c.k]; if (!x||!x.es.length) return null; var m=media(x.es)/60; return {v:Math.max(0.01,m), txt:numBR(m,1), tip:'<b>'+DSEM[r.k]+' · '+c.k+'h–'+(c.k+1)+'h</b><br>'+x.L.length+' senhas · espera média '+fmtMS(media(x.es))+'<br>≥ 10 min: '+x.es.filter(function(e){ return e>=600; }).length, go:goLista(DSEM[r.k]+' '+c.k+'h · senhas','senhas',x.L)}; }),'vz-wide'));
    // por atendente
    var P={}; L.forEach(function(s){ if (!s.at||s.c==null||s.t==null||s.t>3600) return; (P[s.at]=P[s.at]||[]).push(s); });
    var ak=Object.keys(P).filter(function(k){ return P[k].length>=MIN_N; }).sort(function(a,b){ return P[b].length-P[a].length; }).slice(0,12);
    if (ak.length) cards.push(vzCard('Tempo de atendimento por atendente','minutos, da chamada à finalização · clique no nome para o relatório individual · pontos = atendimentos fora do padrão',
      gBox(ak.map(function(k,i){ return {nome:k, cor:'var(--c1)', sub:P[k].length+' atendimentos', go:goPessoa(k), pts:P[k].map(function(s){ return {v:s.t/60, item:s, lab:fmtData(s.dia)+' '+hhmm(s.c)+' · '+fmtMS(s.t), tip:'<b>'+esc(k)+'</b><br>'+fmtData(s.dia)+' às '+hhmm(s.c)+' · '+esc(s.fila)+'<br>Atendimento: '+fmtMS(s.t)}; })}; }),{un:'min',pl:260,tipoLista:'senhas'}),'vz-wide'));
    // mês a mês (todas as senhas, não só o período)
    var ms=Object.keys(state.senhas).sort().slice(-12), Rm=ms.map(function(m){ return senhasResumo(state.senhas[m].L.filter(senhaOk)); });
    cards.push(vzCard((k13Of()?'KPI-13 · espera média':'Espera média · '+esc(selNome()))+' por mês','minutos · clique no mês para ver só ele',gLinhas(ms,[{nome:'Espera média',cor:'var(--c1)',v:Rm.map(function(r){ return r.med!=null?r.med/60:null; }),extra:Rm.map(function(r){ return r.na+' senhas'; })}],{titulo:'Espera média',zero:true,irMes:'at',W:360,H:210})));
    cards.push(vzCard('Senhas com espera ≥ 10 min','% das senhas chamadas no mês',gLinhas(ms,[{nome:'≥ 10 min',cor:'var(--c2)',v:Rm.map(function(r){ return r.na?r.a10/r.na*100:null; }),extra:Rm.map(function(r){ return r.a10+' senhas'; })}],{titulo:'Espera ≥ 10 min',un:'%',zero:true,irMes:'at',W:360,H:210})));
    var F={}; L.forEach(function(s){ (F[s.fila]=F[s.fila]||[]).push(s); });
    cards.push(vzCard('Espera média por fila',per+' · clique para listar as senhas da fila',gBarrasH(Object.keys(F).map(function(f){ var r=senhasResumo(F[f]); return {nome:f, v:r.med!=null?Math.round(r.med/6)/10:0, extra:F[f].length+' senhas · '+fmtMS(r.med)+' em média', go:goLista('Fila '+f,'senhas',F[f])}; }).sort(function(a,b){ return b.v-a.v; }),{un:'min'})));
    return visGrade(cards);
  }

  // ——— Certidões (box plot balcão × central usado aqui e no Modo visual)
  function certBox(C){
    var B=C.filter(function(x){ return x.origem==='Balcão'; }), O=C.filter(function(x){ return x.origem!=='Balcão'; });
    function pts(L){ return L.map(function(c){ return {v:c.hu, item:c, lab:c.p+' · '+fmtH(c.hu), tip:'<b>Pedido '+esc(c.p)+'</b><br>'+esc(c.tipo)+'<br>'+fmtH(c.hu)+' úteis · prazo '+fmtLim(c.lim)+'<br>Selo gerado por '+esc(c.u||'—')}; }); }
    return gBox([{nome:'Balcão',cor:'var(--c1)',pts:pts(B),sub:B.length+' pedidos',go:goLista('Certidões de balcão','cert',B)},{nome:'Central / online',cor:'var(--c2)',pts:pts(O),sub:O.length+' pedidos',go:goLista('Certidões da central','cert',O)}],{un:'h',pl:130,tipoLista:'cert'});
  }
  function visCer(){
    var all=certCalc(certRecs()), hum=all.filter(function(x){ return x.u&&!/^tri7$/i.test(x.u); }), C=all.filter(function(x){ return !x.intim; }), per=nomePeriodo(), cards=[];
    if (!all.length) return '<div class="empty">Sem certidões no período.</div>';
    var AP=certAutoPeriodo(), auto=AP.L, temAuto=AP.tem;
    cards.push(vzCard('De onde vêm os pedidos',per+' · balcão × central · clique na fatia para listar',certOrigemRosca(all)));
    var Bt={}; all.filter(function(x){ return x.origem==='Balcão'; }).forEach(function(x){ (Bt[x.tipo]=Bt[x.tipo]||[]).push(x); }); var btk=Object.keys(Bt).sort(function(a,b){ return Bt[b].length-Bt[a].length; });
    cards.push(vzCard('Balcão · por tipo de certidão',per+' · clique na fatia para listar',gRosca(btk.slice(0,5).map(function(k,i){ return {nome:k,v:Bt[k].length,cor:CAT[i],go:goLista('Balcão · '+k,'cert',Bt[k])}; }).concat(btk.length>5?[{nome:'Outros tipos',v:btk.slice(5).reduce(function(s2,k){ return s2+Bt[k].length; },0),cor:'var(--c6)',go:goLista('Balcão · outros tipos','cert',[].concat.apply([],btk.slice(5).map(function(k){ return Bt[k]; })))}]:[]),{titulo:'Balcão por tipo',sub:'balcão'})));
    var om=certOrigemMensal(); if (om) cards.push(vzCard('Fluxo por mês · balcão × central','colunas empilhadas · clique no segmento para listar',om,'vz-wide'));
    if (temAuto) cards.push(vzCard('Quem fez as certidões',per,gRosca([{nome:'Escreventes',v:hum.length,cor:'var(--c1)',go:goLista('Certidões feitas por escreventes','cert',hum)},{nome:'Automáticas (Tri7)',v:auto.length,cor:'var(--c2)',go:goLista('Certidões automáticas (Tri7)','cods',auto)}],{titulo:'Quem fez',sub:'certidões'})));
    var pc={}; hum.forEach(function(x){ (pc[x.u]=pc[x.u]||[]).push(x); });
    cards.push(vzCard('Certidões por escrevente','quem gerou o selo · clique para o relatório individual',gBarrasH(Object.keys(pc).sort(function(a,b){ return pc[b].length-pc[a].length; }).slice(0,12).map(function(k){ var L=pc[k].filter(function(x){ return !x.intim; }), ok=L.filter(function(x){ return x.ok; }).length; return {nome:k, v:pc[k].length, extra:L.length?pct(ok/L.length*100)+' no prazo':'fluxo de intimação', go:goPessoa(k)}; }))));
    cards.push(vzCard('Horas úteis até a certidão','balcão × central · pontos = pedidos fora do padrão (clique no fim da linha para listar os que passam do eixo)'+(all.length>C.length?' · sem as '+(all.length-C.length)+' do fluxo de intimação':''),certBox(C),'vz-wide'));
    var ms=Object.keys(state.cert).sort().slice(-12), pm=ms.map(function(m){ var a=certCalc(state.cert[m].recs).filter(function(x){ return !x.intim; }); return {n:a.length, ok:a.filter(function(x){ return x.ok; }).length}; });
    cards.push(vzCard('Certidões no prazo por mês','% dos pedidos concluídos no mês · clique no mês para ver só ele',gLinhas(ms,[{nome:'No prazo',cor:'var(--c1)',v:pm.map(function(x){ return x.n?x.ok/x.n*100:null; }),extra:pm.map(function(x){ return x.ok+' de '+x.n; })}],{titulo:'No prazo',un:'%',irMes:'cer'}),'vz-wide'));
    var g={}; C.forEach(function(x){ var k=x.origem+' · '+x.tipo; (g[k]=g[k]||[]).push(x); });
    cards.push(vzCard('Pedidos por origem e tipo',per+' · clique para listar',gBarrasH(Object.keys(g).sort(function(a,b){ return g[b].length-g[a].length; }).slice(0,12).map(function(k){ var ok=g[k].filter(function(x){ return x.ok; }).length; return {nome:k, v:g[k].length, extra:pct(ok/g[k].length*100)+' no prazo · prazo '+fmtLim(g[k][0].lim), go:goLista(k,'cert',g[k])}; }))));
    var fora=C.filter(function(x){ return !x.ok; }).sort(function(a,b){ return b.hu-a.hu; });
    if (fora.length) cards.push(vzCard('Fora do prazo por tipo',per+' · '+fora.length+' pedidos',gBarrasH((function(){ var t={}; fora.forEach(function(x){ (t[x.tipo]=t[x.tipo]||[]).push(x); }); return Object.keys(t).sort(function(a,b){ return t[b].length-t[a].length; }).map(function(k){ return {nome:k, v:t[k].length, cor:'var(--c2)', go:goLista('Fora do prazo · '+k,'cert',t[k])}; }); })())));
    return visGrade(cards);
  }

  // ——— Cancelados e especiais
  function visNao(atos){
    atos=atos.concat(cancSoTri7Periodo());
    var R=atos.filter(function(a){ return a.cat==='R'; }), N=atos.filter(function(a){ return a.cat==='N'; }), E=atos.filter(function(a){ return a.cat==='E'; }), I=atos.filter(function(a){ return a.cat==='I'; }), per=nomePeriodo(), cards=[];
    if (!atos.length) return '<div class="empty">Sem protocolos no período.</div>';
    cards.push(vzCard('Situação dos protocolos',per,gRosca([{nome:'Registrados',v:R.length,cor:'var(--c1)',go:goLista('Registrados','atos',R)},{nome:'Cancelados',v:N.length,cor:'var(--c2)',go:goLista('Cancelados','atos',N)},{nome:'Abertura + outros',v:E.length,cor:'var(--c3)',go:goLista('Abertura de matrícula + outros atos','atos',E)},{nome:'Sem histórico',v:I.length,cor:'var(--c4)',go:goLista('Sem histórico suficiente','atos',I)}],{titulo:'Situação',centro:pct(atos.length?N.length/atos.length*100:null),sub:'cancelados'})));
    var pm={}; N.forEach(function(a){ (pm[a.motivo]=pm[a.motivo]||[]).push(a); });
    cards.push(vzCard('Motivos do cancelamento',per+' · clique para listar',gBarrasH(Object.keys(pm).sort(function(a,b){ return pm[b].length-pm[a].length; }).map(function(k){ return {nome:MOTIVOS[k]||k, v:pm[k].length, cor:'var(--c2)', extra:pct(pm[k].length/N.length*100)+' dos cancelados', go:goLista('Cancelados · '+(MOTIVOS[k]||k),'atos',pm[k])}; }))));
    var ms=Object.keys(state.docs).sort().slice(-12), rm=ms.map(function(m){ var A=atosDoMes(m), x=cancSoTri7Mes(m).length, n=A.filter(function(a){ return a.cat==='N'; }).length+x; return {n:n, t:A.length+x}; });
    cards.push(vzCard('Cancelamento por mês','% dos protocolos do mês (KPI-02 complementar) · clique no mês para ver só ele',gLinhas(ms,[{nome:'Cancelados',cor:'var(--c2)',v:rm.map(function(x){ return x.t?x.n/x.t*100:null; }),extra:rm.map(function(x){ return x.n+' de '+x.t; })}],{titulo:'Cancelamento',un:'%',zero:true,irMes:'nao'}),'vz-wide'));
    var pn={}, tn={}; N.forEach(function(a){ if (!a.soTri7) (pn[a.nat]=pn[a.nat]||[]).push(a); }); atos.forEach(function(a){ tn[a.nat]=(tn[a.nat]||0)+1; });
    cards.push(vzCard('Naturezas com mais cancelados',per+' · clique para abrir a natureza',gBarrasH(Object.keys(pn).sort(function(a,b){ return pn[b].length-pn[a].length; }).slice(0,12).map(function(k){ return {nome:k, v:pn[k].length, cor:'var(--c2)', extra:pct(pn[k].length/tn[k]*100)+' dos '+tn[k]+' protocolos da natureza', go:goNatRI(k)}; }))));
    if (E.length) cards.push(vzCard('Abertura de matrícula + outros atos',per+' · dias úteis no Prazo do VHL · clique na coluna para listar',gHisto(E.map(function(a){ return a.pv; }),{un:'d.u.',xl:'Prazo do VHL (d.u.)',itens:E,tipoLista:'atos',nomeLista:'abertura + outros',W:380,H:230})));
    return visGrade(cards);
  }
  function grMapa(){ var m={}; (state.natGr.grupos||[]).forEach(function(g){ if (g.ativo) g.nats.forEach(function(n){ m[n]=g.nome; }); }); return m; }
  function grDefinir(grupos){ state.natGr.grupos=grupos||[]; state._grM=grMapa(); state.grVer++; state._desX=null; }
  function grAtivoPorNome(nome){ return (state.natGr.grupos||[]).filter(function(g){ return g.ativo&&g.nome===nome; })[0]||null; }
  function natsDe(nome){ var g=grAtivoPorNome(nome); return g?g.nats.slice():[nome]; }
  function aplicarGrupos(){ var v=state.grVer, M=state._grM;
    Object.keys(state.docs).forEach(function(k){ var d=state.docs[k]; if (d._grV===v) return; d.atos.forEach(function(a){ if (a.natOrig===undefined) a.natOrig=a.nat; a.nat=M[a.natOrig]||a.natOrig; }); d._grV=v; });
    Object.keys(state.serv).forEach(function(k){ var L=state.serv[k]; if (L._grV===v) return; L.forEach(function(d){ if (d.natOrig===undefined) d.natOrig=d.nat; d.nat=M[d.natOrig]||d.natOrig; }); L._grV=v; }); }
  function grSalvar(msg){ grDefinir(state.natGr.grupos);
    if (dbPronto&&podeEscrever) db.doc('config/naturezas').set({grupos:state.natGr.grupos, em:new Date().toISOString()}).then(function(){ toast(msg||'Grupos salvos'); }).catch(function(){ toast('Não consegui salvar os grupos'); });
    else toast((msg||'Grupos alterados')+' (só nesta sessão)'); render(); }

  // estatística das comparações: Mann-Whitney (tempos) e teste z de duas proporções (percentuais) · 95%, mínimo de 10 casos em cada lado
  function phi(z){ var t=1/(1+0.2316419*Math.abs(z)), d=0.3989423*Math.exp(-z*z/2), p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274)))); return z>0?1-p:p; }
  function mannWhitney(a,b){ var n1=a.length, n2=b.length; if (n1<MIN_N||n2<MIN_N) return null;
    var all=a.map(function(v){ return [v,0]; }).concat(b.map(function(v){ return [v,1]; })).sort(function(x,y){ return x[0]-y[0]; }), N=all.length, R1=0, tie=0, i=0;
    while (i<N){ var j=i; while (j+1<N&&all[j+1][0]===all[i][0]) j++; var rk=(i+j)/2+1, t=j-i+1; tie+=t*t*t-t; for (var q=i;q<=j;q++) if (all[q][1]===0) R1+=rk; i=j+1; }
    var U=R1-n1*(n1+1)/2, mu=n1*n2/2, sg=Math.sqrt(n1*n2/12*((N+1)-tie/(N*(N-1)))); if (!sg) return {z:0,p:1}; var z=(U-mu)/sg; return {z:z, p:2*(1-phi(Math.abs(z)))}; }
  function zProp(k1,n1,k2,n2){ if (n1<MIN_N||n2<MIN_N) return null; var p=(k1+k2)/(n1+n2), se=Math.sqrt(p*(1-p)*(1/n1+1/n2)); if (!se) return {z:0,p:1}; var z=(k2/n2-k1/n1)/se; return {z:z, p:2*(1-phi(Math.abs(z)))}; }
  function leituraTeste(t){ return !t?{txt:'poucos casos',cls:'mut'}:t.p<0.05?{txt:'diferença real',cls:'real'}:{txt:'pode ser acaso',cls:'acaso'}; }

  // itens da serventia do topo: RI = protocolos (todosAtos), demais = documentos finalizados
  function nxRI(){ return atrAtual()==='RI'; }
  function nxItens(){ return nxRI()?todosAtos():selDocs().filter(function(d){ return svDe(d.t)!=='Apoio'; }); }
  function nxNat(x){ return x.natOrig||x.nat; }
  function nxDias(x){ return nxRI()?(x.cat==='R'?x.bruto:null):servDu(x); }
  function nxPrazo(x){ return nxRI()?(x.cat==='R'?ok(x):null):servOk(x); }
  function nxLiq(x){ return nxRI()&&x.cat==='R'&&x.liq!=null?x.liq:null; } // 1.10.4: tempo com o cartório, sem suspensões
  function nxMetricas(L){ var ri=nxRI(), dias=L.map(nxDias).filter(function(v){ return v!=null; }), pz=L.map(nxPrazo).filter(function(v){ return v!=null; });
    var m={n:L.length, dias:dias, e:est(dias), pz:[pz.filter(Boolean).length,pz.length]};
    if (ri){ var R=L.filter(function(a){ return a.cat==='R'; }), RN=L.filter(function(a){ return a.cat==='R'||a.cat==='N'; });
      m.liq=L.map(nxLiq).filter(function(v){ return v!=null; }); m.eL=est(m.liq); m.R=R.length; m.exig=[R.filter(function(a){ return a.nex>0; }).length,R.length]; m.canc=[L.filter(function(a){ return a.cat==='N'; }).length,L.length]; m.cen=[RN.filter(function(a){ return origemAto(a)==='central'; }).length,RN.length]; }
    return m; }
  function pp(x){ return x[1]?x[0]/x[1]*100:null; }

  function nxOpsHTML(cont){
    var q=semAc(state.nx.busca), ks=Object.keys(cont).filter(function(n){ return !q||semAc(n).indexOf(q)>=0; }).sort(function(a,b){ return cont[b]-cont[a]; }), mx=q?60:24;
    return (ks.length?ks.slice(0,mx).map(function(n){ var on=state.nx.sel.indexOf(n)>=0; return '<button type="button" class="chip nx-op'+(on?' ok':'')+'" data-nxnat="'+esc(n)+'" aria-pressed="'+on+'">'+(on?'✓ ':'+ ')+esc(n)+' <span class="mut">'+cont[n]+'</span></button>'; }).join(''):'<span class="hint">Nenhuma natureza com esse nome no período.</span>')+
      (ks.length>mx?'<span class="hint">+ '+(ks.length-mx)+' naturezas. Refine a busca.</span>':'');
  }
  function visNat(){
    var itens=nxItens(), cont={}; itens.forEach(function(x){ var n=nxNat(x); cont[n]=(cont[n]||0)+1; });
    var S=state.nx, sel=S.sel, grs=state.natGr.grupos||[];
    var h='<p class="vis-dica">Escolha uma ou várias naturezas (os nomes originais do '+(nxRI()?'VHL':'VHL nesta serventia')+'). <b>Juntar</b> trata a seleção como um ato só; <b>Comparar</b> mostra cada uma lado a lado e diz se a diferença é real (95% de confiança, 10+ casos de cada lado). Segue a Serventia e o Período do topo.</p>';
    h+='<div class="nx-box"><div class="search" style="margin:0 0 8px"><input type="search" id="nxBusca" placeholder="Pesquisar natureza (ex.: contrato, escritura, onr)" value="'+esc(S.busca)+'" aria-label="Pesquisar natureza">'+
      '<div class="seg" role="group" aria-label="Modo"><button type="button" class="segb" data-nxmodo="juntar" aria-pressed="'+(S.modo==='juntar')+'">Juntar</button><button type="button" class="segb" data-nxmodo="comparar" aria-pressed="'+(S.modo==='comparar')+'">Comparar</button></div></div>'+
      '<div class="chips" id="nxOps" style="margin:0 0 10px">'+nxOpsHTML(cont)+'</div>'+
      '<div class="sub-h" style="margin:8px 0 4px">Selecionadas ('+sel.length+')</div><div class="chips" style="margin:0">'+(sel.length?sel.map(function(n,i){ return '<span class="chip ok"><i class="dot" style="background:'+(S.modo==='comparar'&&i<6?CAT[i]:'var(--good)')+'"></i>'+esc(n)+' <span class="mut">'+(cont[n]||0)+'</span> <button type="button" class="lnk" data-nxrm="'+esc(n)+'" aria-label="Tirar '+esc(n)+'">✕</button></span>'; }).join('')+'<button type="button" class="btn sm" data-nxlimpar="1">Limpar</button>':'<span class="hint">Nenhuma. Clique nas naturezas acima.</span>')+'</div>';
    // grupos salvos
    h+='<div class="sub-h" style="margin:14px 0 4px">Grupos salvos</div>'+(grs.length?'<div class="nx-grs">'+grs.map(function(g){ return '<div class="nx-gr'+(g.ativo?' on':'')+'"><div><b>'+esc(g.nome)+'</b>'+(g.ativo?' <span class="pill good">ativo nas outras páginas</span>':'')+'<div class="mut" style="font-size:12px">'+g.nats.map(esc).join(' + ')+'</div></div><div class="ctl"><button type="button" class="btn sm" data-nxabrir="'+esc(g.id)+'">Abrir</button>'+(podeEscrever?'<button type="button" class="btn sm'+(g.ativo?'':' primary')+'" data-nxativar="'+esc(g.id)+'">'+(g.ativo?'Desfazer nas outras páginas':'Usar como uma natureza só')+'</button><button type="button" class="btn sm" data-nxexcluir="'+esc(g.id)+'">Excluir</button>':'')+'</div></div>'; }).join('')+'</div>':'<p class="hint" style="margin:0">Nenhum grupo salvo.</p>')+
      (podeEscrever&&sel.length>=2?'<div class="ctl" style="margin-top:8px"><input type="text" id="nxNome" class="mini" style="width:280px" placeholder="Nome do grupo (ex.: Contrato (balcão + central))" aria-label="Nome do grupo"><button type="button" class="btn sm primary" data-nxsalvar="1">Salvar a seleção como grupo</button></div>':'')+'</div>';
    if (!sel.length) return h+'<div class="empty" style="margin-top:14px"><b>Escolha ao menos uma natureza</b>Pesquise pelo nome e clique para incluir.</div>';
    var por={}; sel.forEach(function(n){ por[n]=[]; }); itens.forEach(function(x){ var n=nxNat(x); if (por[n]) por[n].push(x); });
    return h+(S.modo==='comparar'?(sel.length<2?'<div class="empty" style="margin-top:14px"><b>Escolha duas ou mais para comparar</b>Ou volte para Juntar.</div>':nxComparar(sel.slice(0,6),por)+(sel.length>6?'<p class="hint">Comparando as 6 primeiras selecionadas.</p>':'')):nxJuntar(sel,[].concat.apply([],sel.map(function(n){ return por[n]; }))));
  }

  function nxJuntar(sel, L){
    var ri=nxRI(), m=nxMetricas(L), e=m.e, nome=sel.length>1?sel.length+' naturezas juntas':sel[0], cards=[];
    var ms=Object.keys(state.docs).concat(Object.keys(state.serv)).filter(function(x,i,a){ return a.indexOf(x)===i; }).sort().slice(-12), porM={}; L.forEach(function(x){ (porM[x.mes]=porM[x.mes]||[]).push(x); });
    var h='<div class="sub-h" style="margin-top:16px">'+esc(nome)+(sel.length>1?' <span class="mut" style="text-transform:none;letter-spacing:0">('+sel.map(esc).join(' + ')+')</span>':'')+'</div><div class="kpis" style="margin-bottom:12px">'+
      kpi(ri?'Protocolos':'Documentos',m.n.toLocaleString('pt-BR'),ri?m.R+' registrados':'finalizados no período','hero')+
      kpi(ri?'Mediana bruta':'Mediana',e.n?numBR(e.mediana,1)+' <small style="font-size:14px">d.u.</small>':'—',e.n?'média '+numBR(e.media,1)+(e.moda!=null?' · mais comum '+e.moda+' ('+pct(e.modaPct)+')':'')+' · 90% em até '+numBR(e.p90,1)+(e.n<MIN_N?' · poucos casos':''):'')+
      (ri?kpi('Mediana líquida',m.eL.n?numBR(m.eL.mediana,1)+' <small style="font-size:14px">d.u.</small>':'—',m.eL.n?'média '+numBR(m.eL.media,1)+' · só o tempo com o cartório (sem suspensões)':''):'')+
      kpi('No prazo',m.pz[1]?pct(pp(m.pz)):'—',m.pz[1]?m.pz[0]+' de '+m.pz[1]:(ri?'':'sem prazo cadastrado (Configuração)'))+
      (ri?kpi('Com exigência',pct(pp(m.exig)),m.exig[0]+' de '+m.exig[1]+' registrados')+kpi('Cancelados',pct(pp(m.canc)),m.canc[0]+' de '+m.canc[1])+kpi('Pela central (ONR)',pct(pp(m.cen)),m.cen[0]+' central · '+(m.cen[1]-m.cen[0])+' balcão'):'')+'</div>';
    cards.push(vzCard('Volume por mês','clique no mês para ver só ele',gLinhas(ms,[{nome:'Volume',cor:'var(--c1)',v:ms.map(function(x){ return (porM[x]||[]).length||null; })}],{titulo:'Volume',area:true,zero:true,irMes:'nat'}),'vz-wide'));
    cards.push(vzCard('Mediana de dias úteis por mês',(ri?'bruto = do ingresso ao registro · líquido = só o tempo com o cartório (sem suspensões)':'dias úteis do ingresso ao fim · no RC e no RTD/PJ o VHL não traz as suspensões: só existe o tempo total'),gLinhas(ms,[{nome:ri?'Mediana bruta':'Mediana',cor:'var(--c1)',v:ms.map(function(x){ var v=(porM[x]||[]).map(nxDias).filter(function(y){ return y!=null; }); return v.length?mediana(v):null; })},{nome:'P90',cor:'var(--c2)',tracejado:true,v:ms.map(function(x){ var v=est((porM[x]||[]).map(nxDias).filter(function(y){ return y!=null; })); return v.n?v.p90:null; })}].concat(ri?[{nome:'Mediana líquida',cor:'var(--c3)',v:ms.map(function(x){ var v=(porM[x]||[]).map(nxLiq).filter(function(y){ return y!=null; }); return v.length?mediana(v):null; })}]:[]),{titulo:'Mediana por mês',un:'d.u.',zero:true,irMes:'nat',ref:ri?[{v:20,nome:'20 d.u.'}]:[]}),'vz-wide'));
    var comD=L.filter(function(x){ return nxDias(x)!=null; });
    cards.push(vzCard(ri?'Distribuição do tempo bruto':'Distribuição dos dias','histograma · clique na coluna para listar',gHisto(comD.map(nxDias),{un:'d.u.',passo:1,max:ri?30:undefined,lim:ri?20:undefined,xl:'dias úteis',itens:comD,tipoLista:ri?'atos':'docs',nomeLista:nome}),'vz-wide'));
    if (ri){ var comL=L.filter(function(x){ return nxLiq(x)!=null; }); if (comL.length) cards.push(vzCard('Distribuição do tempo líquido','histograma · só o tempo com o cartório (sem suspensões) · clique na coluna para listar',gHisto(comL.map(nxLiq),{un:'d.u.',passo:1,max:30,lim:20,xl:'dias úteis líquidos',itens:comL,tipoLista:'atos',nomeLista:nome+' · líquido'}),'vz-wide')); }
    // tempo por etapa
    var et={}; if (ri) L.forEach(function(a){ if (a.cat!=='R') return; (a.etapas||[]).forEach(function(p){ var x=et[p[0]]=et[p[0]]||{s:0,n:0}; x.s+=p[1]; x.n++; }); });
    else L.forEach(function(d){ d.ets.forEach(function(p){ var x=et[p.et]=et[p.et]||{s:0,n:0}; x.s+=p.pz; x.n++; }); });
    var ek=Object.keys(et).sort(function(a,b){ return et[b].s-et[a].s; }).slice(0,10);
    if (ek.length) cards.push(vzCard('Onde o tempo vai · por etapa','média de dias úteis na etapa · as 10 que somam mais tempo',gBarrasH(ek.map(function(k){ return {nome:k, v:Math.round(et[k].s/et[k].n*10)/10, extra:et[k].n+' passagens · '+et[k].s+' d.u. no total'}; }),{un:'d.u.'})));
    if (ri){ var R=L.filter(function(a){ return a.cat==='R'; }), E0=R.filter(function(a){ return !a.nex; }), E1=R.filter(function(a){ return a.nex===1; }), E2=R.filter(function(a){ return a.nex>=2; });
      cards.push(vzCard('Exigências','registrados · clique na fatia para listar',gRosca([{nome:'Sem exigência',v:E0.length,cor:'var(--c3)',go:goLista(nome+' · sem exigência','atos',E0)},{nome:'1 exigência',v:E1.length,cor:'var(--c4)',go:goLista(nome+' · 1 exigência','atos',E1)},{nome:'2 ou mais',v:E2.length,cor:'var(--c2)',go:goLista(nome+' · 2 ou mais exigências','atos',E2)}],{titulo:'Exigências',centro:pct(R.length?E0.length/R.length*100:null),sub:'1ª qualificação'})));
      var RN=L.filter(function(a){ return a.cat==='R'||a.cat==='N'; }), Bc=RN.filter(function(a){ return origemAto(a)!=='central'; }), Cc=RN.filter(function(a){ return origemAto(a)==='central'; });
      cards.push(vzCard('Balcão × central','clique na fatia para listar',gRosca([{nome:'Balcão',v:Bc.length,cor:'var(--c1)',go:goLista(nome+' · balcão','atos',Bc)},{nome:'Central (ONR)',v:Cc.length,cor:'var(--c2)',go:goLista(nome+' · central','atos',Cc)}],{titulo:'Origem'})));
      var N=L.filter(function(a){ return a.cat==='N'; }), O=L.filter(function(a){ return a.cat==='E'||a.cat==='I'; });
      cards.push(vzCard('Situação','clique na fatia para listar',gRosca([{nome:'Registrados',v:R.length,cor:'var(--c1)',go:goLista(nome+' · registrados','atos',R)},{nome:'Cancelados',v:N.length,cor:'var(--c2)',go:goLista(nome+' · cancelados','atos',N)},{nome:'Especiais / sem histórico',v:O.length,cor:'var(--c4)',go:goLista(nome+' · especiais','atos',O)}],{titulo:'Situação',centro:pct(L.length?N.length/L.length*100:null),sub:'cancelados'}))); }
    // quem trabalha nelas
    var pes={}; L.forEach(function(x){ var ev=ri?nxEventos(x):x.ets.map(function(e){ return {rp:e.rp,pz:e.pz}; }); var vist={}; ev.forEach(function(e){ if (!e.rp) return; var q=pes[e.rp]=pes[e.rp]||{n:0,docs:0,pz:0}; q.n++; q.pz+=e.pz; if (!vist[e.rp]){ vist[e.rp]=1; q.docs++; } }); });
    var pk=Object.keys(pes).sort(function(a,b){ return pes[b].n-pes[a].n; }).slice(0,12);
    if (pk.length) cards.push(vzCard('Quem trabalha nelas','execuções de etapa no VHL · clique para o relatório individual',gBarrasH(pk.map(function(k){ return {nome:k, v:pes[k].n, extra:pes[k].docs+' documentos · média '+numBR(pes[k].pz/pes[k].n,1)+' d.u. por etapa', go:goPessoa(k)}; }))));
    // inconformidades ligadas pelo código
    var cods={}; L.forEach(function(x){ cods[String(x.c).toUpperCase()]=1; }); var inc=incTodos().filter(function(r){ return cods[String(r.c).toUpperCase()]&&(ri?r.t==='RI':incOk(r)); });
    if (inc.length){ var pc={}, com={}; inc.forEach(function(r){ var c=catDe(r); (pc[c]=pc[c]||[]).push(r); com[String(r.c).toUpperCase()]=1; });
      cards.push(vzCard('Inconformidades ligadas',inc.length+' registros · '+pct(Object.keys(com).length/L.length*100)+' dos '+(ri?'protocolos':'documentos')+' tiveram ao menos 1 · clique para listar',gBarrasH(Object.keys(pc).sort(function(a,b){ return pc[b].length-pc[a].length; }).slice(0,10).map(function(c){ return {nome:c, v:pc[c].length, cor:'var(--c2)', go:goLista(nome+' · '+c,'inc',pc[c])}; })))); }
    return h+'<div class="vz-grid">'+cards.join('')+'</div>';
  }
  // execuções de etapa de um protocolo (linha do tempo salva em logs)
  function nxEventos(a){ var L=logDe(a.c, a.mes); return L?L.ev:[]; }

  function nxComparar(sel, por){
    var ri=nxRI(), M=sel.map(function(n){ return nxMetricas(por[n]); }), ref=M[0];
    function difDias(i){ var t=mannWhitney(ref.dias,M[i].dias), d=(M[i].e.n&&ref.e.n)?M[i].e.mediana-ref.e.mediana:null; return {t:t,d:d}; }
    function cel(v,dif){ return '<td class="num">'+v+(dif?'<div class="nx-dif '+dif.cls+'">'+dif.txt+'</div>':'')+'</td>'; }
    function difP(i,campo){ var a=ref[campo], b=M[i][campo]; if (!a||!b||!a[1]||!b[1]) return null; var t=zProp(a[0],a[1],b[0],b[1]), d=pp(b)-pp(a), l=leituraTeste(t); return {cls:l.cls, txt:(d>0?'+':'')+numBR(d,1)+' p.p. · '+l.txt}; }
    var linhas=[
      ['Volume',function(m){ return m.n.toLocaleString('pt-BR'); },null],
      ['Média (d.u.)',function(m){ return m.e.n?numBR(m.e.media,1):'—'; },null],
      [ri?'Mediana bruta (d.u.)':'Mediana (d.u.)',function(m){ return m.e.n?'<b>'+numBR(m.e.mediana,1)+'</b>':'—'; },function(i){ var x=difDias(i); if (x.d==null) return null; var l=leituraTeste(x.t); return {cls:l.cls, txt:(x.d>0?'+':'')+numBR(x.d,1)+' d.u. · '+l.txt}; }],
      ['Mais comum (moda)',function(m){ return m.e.moda!=null?m.e.moda+' <span class="mut">('+pct(m.e.modaPct)+')</span>':'—'; },null],
      ['90% em até (P90)',function(m){ return m.e.n?numBR(m.e.p90,1):'—'; },null],
      ['No prazo',function(m){ return m.pz[1]?pct(pp(m.pz)):'—'; },function(i){ return difP(i,'pz'); }]];
    if (ri) linhas.splice(3,0,['Mediana líquida (d.u.)',function(m){ return m.eL.n?'<b>'+numBR(m.eL.mediana,1)+'</b>':'—'; },function(i){ if (!ref.liq.length||!M[i].liq.length) return null; var t=mannWhitney(ref.liq,M[i].liq), d=M[i].eL.mediana-ref.eL.mediana, l=leituraTeste(t); return {cls:l.cls, txt:(d>0?'+':'')+numBR(d,1)+' d.u. · '+l.txt}; }]);
    if (ri) linhas.push(['Com exigência',function(m){ return pct(pp(m.exig)); },function(i){ return difP(i,'exig'); }],['Cancelados',function(m){ return pct(pp(m.canc)); },function(i){ return difP(i,'canc'); }],['Pela central (ONR)',function(m){ return pct(pp(m.cen)); },function(i){ return difP(i,'cen'); }]);
    var h='<div class="sub-h" style="margin-top:16px">Comparação · referência: '+esc(sel[0])+'</div><div class="tbl-wrap"><table class="nx-cmp"><thead><tr><th class="tleft">Indicador</th>'+sel.map(function(n,i){ return '<th><i class="dot" style="background:'+CAT[i]+'"></i>'+esc(n)+(i?'':' <span class="mut">(ref.)</span>')+'</th>'; }).join('')+'</tr></thead><tbody>'+
      linhas.map(function(l){ return '<tr><td class="tleft">'+l[0]+'</td>'+M.map(function(m,i){ return cel(l[1](m), i&&l[2]?l[2](i):null); }).join('')+'</tr>'; }).join('')+'</tbody></table></div>';
    // frases
    var fr=sel.slice(1).map(function(n,i){ var x=difDias(i+1); if (x.d==null) return ''; var l=leituraTeste(x.t); return '<li><b>'+esc(n)+'</b>: mediana '+numBR(M[i+1].e.mediana,1)+' d.u. × <b>'+esc(sel[0])+'</b>: '+numBR(ref.e.mediana,1)+' d.u. → '+(x.d>0?'+':'')+numBR(x.d,1)+' d.u. <span class="nx-dif '+l.cls+'">'+l.txt+'</span></li>'; }).filter(Boolean);
    if (fr.length) h+='<ul class="hint" style="margin:8px 0 0;padding-left:18px">'+fr.join('')+'</ul>';
    h+='<p class="hint">"Diferença real" = o teste confirma com 95% de confiança (Mann-Whitney para os dias, teste de proporções para os %), com 10 ou mais casos de cada lado. "Pode ser acaso" = a diferença existe nos números, mas cabe na variação normal.</p>';
    var cards=[], ms=Object.keys(state.docs).concat(Object.keys(state.serv)).filter(function(x,i,a){ return a.indexOf(x)===i; }).sort().slice(-12);
    cards.push(vzCard('Dias úteis · lado a lado','box plot · cada ponto junta os casos fora do padrão de um valor (clique para listar)',gBox(sel.map(function(n,i){ var L=por[n].filter(function(x){ return nxDias(x)!=null; }); return {nome:n, cor:CAT[i], sub:L.length+(ri?' registrados':' documentos'), pts:L.map(function(x){ return ri?ptAto(x,x.bruto):ptDoc(x,servDu(x)); })}; }),{un:'d.u.',ref:ri?20:null,pl:220,tipoLista:ri?'atos':'docs'}),'vz-wide'));
    if (ri) cards.push(vzCard('Dias úteis líquidos · lado a lado','box plot · só o tempo com o cartório (sem suspensões)',gBox(sel.map(function(n,i){ var L=por[n].filter(function(x){ return nxLiq(x)!=null; }); return {nome:n, cor:CAT[i], sub:L.length+' registrados', pts:L.map(function(x){ return ptAto(x,x.liq); })}; }),{un:'d.u.',ref:20,pl:220,tipoLista:'atos'}),'vz-wide'));
    var porM=sel.map(function(n){ var o={}; por[n].forEach(function(x){ (o[x.mes]=o[x.mes]||[]).push(x); }); return o; });
    cards.push(vzCard(ri?'Mediana bruta por mês':'Mediana de dias úteis por mês','linhas sobrepostas · clique no mês para ver só ele',gLinhas(ms,sel.map(function(n,i){ return {nome:n, cor:CAT[i], v:ms.map(function(m){ var v=(porM[i][m]||[]).map(nxDias).filter(function(y){ return y!=null; }); return v.length>=3?mediana(v):null; }), extra:ms.map(function(m){ return (porM[i][m]||[]).length+' no mês'; })}; }),{titulo:'Mediana por mês',un:'d.u.',zero:true,irMes:'nat',ref:ri?[{v:20,nome:'20 d.u.'}]:[]}),'vz-wide'));
    if (ri) cards.push(vzCard('Mediana líquida por mês','linhas sobrepostas · só o tempo com o cartório (sem suspensões)',gLinhas(ms,sel.map(function(n,i){ return {nome:n, cor:CAT[i], v:ms.map(function(m){ var v=(porM[i][m]||[]).map(nxLiq).filter(function(y){ return y!=null; }); return v.length>=3?mediana(v):null; })}; }),{titulo:'Mediana líquida por mês',un:'d.u.',zero:true,irMes:'nat'}),'vz-wide'));
    cards.push(vzCard('Volume por mês','linhas sobrepostas',gLinhas(ms,sel.map(function(n,i){ return {nome:n, cor:CAT[i], v:ms.map(function(m){ return (porM[i][m]||[]).length||null; })}; }),{titulo:'Volume por mês',zero:true,irMes:'nat'}),'vz-wide'));
    cards.push(vzCard('No prazo','% de cada natureza no período',gBarrasH(sel.map(function(n,i){ return {nome:n, v:M[i].pz[1]?Math.round(pp(M[i].pz)*10)/10:0, cor:CAT[i], extra:M[i].pz[0]+' de '+M[i].pz[1], go:goLista(n+' · fora do prazo',ri?'atos':'docs',por[n].filter(function(x){ return nxPrazo(x)===false; }))}; }),{un:'%'})));
    if (ri) cards.push(vzCard('Com exigência','% dos registrados',gBarrasH(sel.map(function(n,i){ return {nome:n, v:Math.round((pp(M[i].exig)||0)*10)/10, cor:CAT[i], extra:M[i].exig[0]+' de '+M[i].exig[1], go:goLista(n+' · com exigência','atos',por[n].filter(function(a){ return a.cat==='R'&&a.nex>0; }))}; }),{un:'%'})));
    return h+'<div class="vz-grid" style="margin-top:12px">'+cards.join('')+'</div>';
  }

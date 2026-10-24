/* Painel SGQ · CRCO — js/pessoas.js (0.24.0: cadastro único de pessoas)
 * Cada pessoa tem UM nome de exibição, escolhido pelo Gestor da Qualidade, ligado aos nomes que cada sistema traz:
 * VHL (Produção por Etapa, Prazo e Tempo Médio, Desempenho Usuário), Tri7 (nome do usuário), senhas (atendente),
 * inconformidades (responsável) e folha. O painel inteiro passa a mostrar só o nome de exibição; os nomes de origem
 * ficam na trilha (dica do nome e nesta página). Guardado em config/pessoas = {p:{id:{nome, v:[nomes de origem], sit, ate, ign}}, em, por}.
 * A troca dos nomes acontece quando os dados são lidos (decodificação), por isso salvar o cadastro recarrega a página. */
(window.PAINEL_ARQ=window.PAINEL_ARQ||{})['js/pessoas.js']='0.24.0';
  var PES={p:{}, map:{}, carregado:false}, PES_VISTOS={};
  var PES_FONTES={vhl:'VHL', tri7:'Tri7', senhas:'Senhas', inc:'Inconformidades', trab:'Desempenho Usuário', folha:'Folha'};
  function pesNorm(s){ return semAc(s).replace(/\s+/g,' ').trim(); }
  function pesAplicarCfg(c){ PES.p={}; PES.map={}; Object.keys((c&&c.p)||{}).forEach(function(id){ var x=c.p[id]; if (!x||!x.nome) return; PES.p[id]={nome:x.nome, v:(x.v||[]).slice(), sit:x.sit||'ativa', ate:x.ate||'', ign:!!x.ign}; PES.map[pesNorm(x.nome)]=id; PES.p[id].v.forEach(function(n){ PES.map[pesNorm(n)]=id; }); }); PES.carregado=true; }
  // nome de origem → nome de exibição (e registra o nome visto, com a fonte, para a página de nomes)
  function pesNome(raw, fonte){ if (raw==null||raw==='') return raw; var s=String(raw).trim(), k=pesNorm(s); if (!k) return raw;
    var v=PES_VISTOS[k]=PES_VISTOS[k]||{raw:s, f:{}}; if (fonte) v.f[fonte]=(v.f[fonte]||0)+1;
    var id=PES.map[k]; return id&&PES.p[id]?PES.p[id].nome:s; }
  function pesDe(nome){ var id=PES.map[pesNorm(nome)]; return id?PES.p[id]:null; }
  function pesOrigens(nome){ var p=pesDe(nome); return p?p.v:[]; }
  // ——— troca dos nomes na leitura dos dados (os decodificadores do motor e das páginas)
  (function(){
    var dLog=Motor.decodificarLog, dServ=Motor.decodificarServ, dCert=Motor.decodificarCert, dAto=Motor.decodificar;
    Motor.decodificarLog=function(x){ var r=dLog(x); Object.keys(r).forEach(function(c){ (r[c].ev||[]).forEach(function(e){ if (e.rp) e.rp=pesNome(e.rp,'vhl'); }); }); return r; };
    Motor.decodificarServ=function(x){ var r=dServ(x); r.forEach(function(d){ (d.ets||[]).forEach(function(e){ if (e.rp) e.rp=pesNome(e.rp,'vhl'); }); }); return r; };
    Motor.decodificarCert=function(x){ var r=dCert(x); r.forEach(function(c){ if (c.u&&!/^tri7$/i.test(c.u)) c.u=pesNome(c.u,'tri7'); }); return r; };
    Motor.decodificar=function(raw){ var pr=raw&&raw.producao; if (pr&&!raw._pes){ var o={}; Object.keys(pr).forEach(function(n){ var c=pesNome(n,'vhl'), v=pr[n]; if (!o[c]){ o[c]=v; return; }
        var a=o[c]; if (typeof a==='number'||typeof v==='number'){ o[c]=(typeof a==='number'?a:a.d||0)+(typeof v==='number'?v:v.d||0); return; }
        var m={d:(a.d||0)+(v.d||0), e:Object.assign({},a.e), z:Object.assign({},a.z)}; Object.keys(v.e||{}).forEach(function(k){ m.e[k]=(m.e[k]||0)+v.e[k]; }); Object.keys(v.z||{}).forEach(function(k){ m.z[k]=(m.z[k]||0)+v.z[k]; }); o[c]=m; });
        raw.producao=o; Object.defineProperty(raw,'_pes',{value:true,enumerable:false}); }
      return dAto(raw); };
  })();
  function pesEmbrulhar(){ // funções das páginas (carregadas antes deste arquivo)
    if (typeof senhasDecod==='function' && !senhasDecod._pes){ var sd=senhasDecod; senhasDecod=function(doc){ var r=sd(doc); r.L.forEach(function(s){ if (s.at) s.at=pesNome(s.at,'senhas'); }); return r; }; senhasDecod._pes=1; }
    if (typeof trDecodificar==='function' && !trDecodificar._pes){ var td=trDecodificar; trDecodificar=function(doc){ var r=td(doc), P={}; Object.keys(r.p).forEach(function(n){ var c=pesNome(n,'trab'); if (!P[c]){ P[c]=r.p[n]; return; } P[c]=Object.assign({},P[c],{L:P[c].L.concat(r.p[n].L)}); }); r.p=P; return r; }; trDecodificar._pes=1; }
    if (typeof nomeLogin==='function' && !nomeLogin._pes){ var nl=nomeLogin; nomeLogin=function(l){ var n=nl(l); return l&&!/^tri7$/i.test(l)?pesNome(n,'tri7'):n; }; nomeLogin._pes=1; }
    if (typeof eqOculto==='function' && !eqOculto._pes){ var eo=eqOculto; eqOculto=function(k){ if (eo(k)) return true; var id=PES.map[pesNorm(k)]; return !!(id&&PES.p[id]&&PES.p[id].ign); }; eqOculto._pes=1; }
  }
  pesEmbrulhar();
  function pesInc(recs){ return (recs||[]).map(function(r){ if (!r||!r.r) return r; var n=pesNome(r.r,'inc'); return n===r.r?r:Object.assign({},r,{r:n}); }); }
  function pesFolha(){ Object.keys(state.k9||{}).forEach(function(m){ var k=state.k9[m]; (k&&k.pessoas?(Array.isArray(k.pessoas)?k.pessoas:Object.keys(k.pessoas)):[]).forEach(function(p){ var n=typeof p==='string'?p:(p&&(p.nome||p.n)); if (n) pesNome(n,'folha'); }); }); }

  // ═════════ página "Nomes das pessoas" (menu Dados) ═════════
  function pesSugestao(){ // agrupa os nomes vistos pelo primeiro + último nome
    var G={}; Object.keys(PES_VISTOS).forEach(function(k){ if (PES.map[k]) return; var v=PES_VISTOS[k], ck=chavePessoa(v.raw)||k; (G[ck]=G[ck]||[]).push(v); });
    return Object.keys(G).map(function(ck){ var L=G[ck].sort(function(a,b){ return tot(b)-tot(a)||b.raw.length-a.raw.length; }); var nome=L.filter(function(v){ return /[a-záéíóúâêôãõç]/.test(v.raw); })[0]||L[0];
      return {ck:ck, nome:titulo(nome.raw), v:L, naoPessoa:L.every(function(v){ return /^\(|^caixa$|^tri7$/i.test(v.raw)||v.raw.trim().split(/\s+/).length<2; })}; });
    function tot(v){ return Object.keys(v.f).reduce(function(s,f){ return s+v.f[f]; },0); }
    function titulo(s){ return /[a-z]/.test(s)?s:s.toLowerCase().replace(/(^|\s)(\S)/g,function(m,a,b){ return a+b.toUpperCase(); }).replace(/\s(Da|De|Do|Das|Dos|E)\s/g,function(m){ return m.toLowerCase(); }); }
  }
  function pesFontesTxt(v){ return Object.keys(v.f).map(function(f){ return PES_FONTES[f]||f; }).join(', '); }
  function renderPes(){
    var el=$('tabPes'); if (!el) return; if (!podeEscrever){ el.innerHTML='<div class="empty"><b>Só quem administra o painel edita os nomes.</b></div>'; return; }
    if (typeof etapasBrutas==='function') etapasBrutas(); pesFolha();
    try{ eqExecs(); Object.keys(state.usr||{}).concat(Object.keys(state.usrAuto||{})).forEach(function(l){ nomeLogin(l); }); }catch(e){} // todos os nomes de origem passam por pesNome
    var ids=Object.keys(PES.p).sort(function(a,b){ return PES.p[a].nome.localeCompare(PES.p[b].nome,'pt-BR'); }), S=pesSugestao(), ed=state.pesEd||{};
    var h='<div class="sec-h"><h2>Nomes das pessoas</h2><span class="note">Escolha o nome que o painel deve mostrar e ligue a ele os nomes que cada sistema traz (VHL, Tri7, senhas, inconformidades, Desempenho Usuário, folha). Depois de salvar, a página recarrega e todas as telas passam a usar só o nome escolhido.</span></div>';
    if (S.length) h+='<div class="banner warn"><b>'+S.length+' '+(S.length===1?'nome sem vínculo':'nomes sem vínculo')+'.</b> O painel juntou os que têm o mesmo primeiro e último nome. Confira e confirme; nada é ligado sem você confirmar. <button type="button" class="btn sm primary" data-pesaceitar="todas">Aceitar todas as sugestões</button></div>'+
      '<div class="tbl-wrap"><table class="tleft"><thead><tr><th>Nome sugerido</th><th>Nomes encontrados nos sistemas</th><th>Ação</th></tr></thead><tbody>'+
      S.map(function(g,i){ return '<tr><td>'+(g.naoPessoa?'<span class="mut">'+esc(g.v[0].raw)+'</span> <span class="pill warn">parece não ser pessoa</span>':'<b>'+esc(g.nome)+'</b>')+'</td><td>'+g.v.map(function(v){ return esc(v.raw)+' <span class="mut">('+esc(pesFontesTxt(v))+')</span>'; }).join('<br>')+'</td><td style="white-space:nowrap">'+(g.naoPessoa?'<button type="button" class="btn sm" data-pesign="'+i+'">Não é pessoa</button> <button type="button" class="btn sm" data-pesaceitar="'+i+'">É pessoa</button>':'<button type="button" class="btn sm" data-pesaceitar="'+i+'">Confirmar</button> <button type="button" class="btn sm" data-pesign="'+i+'">Não é pessoa</button>')+(ids.length?' <select class="mini" data-pesjuntar="'+i+'" aria-label="Juntar a uma pessoa já cadastrada"><option value="">juntar a…</option>'+ids.filter(function(id){ return !PES.p[id].ign; }).map(function(id){ return '<option value="'+esc(id)+'">'+esc(PES.p[id].nome)+'</option>'; }).join('')+'</select>':'')+'</td></tr>'; }).join('')+'</tbody></table></div>';
    else if (!ids.length) h+='<div class="empty"><b>Nenhum nome encontrado ainda</b>Importe as planilhas e volte aqui.</div>';
    if (ids.length){
      h+='<div class="sub-h" style="margin-top:16px">Pessoas cadastradas · '+ids.filter(function(id){ return !PES.p[id].ign; }).length+'</div><div class="tbl-wrap"><table class="tleft"><thead><tr><th>Nome no painel</th><th>Nomes ligados (origem)</th><th>Situação</th><th>Na comparação</th><th></th></tr></thead><tbody>'+
        ids.map(function(id){ var p=PES.p[id], e=ed[id]||{}, k=semAc(p.nome), oc=!!(state.eqOcl&&state.eqOcl[k]);
          return '<tr data-pesid="'+esc(id)+'"><td>'+(p.ign?'<span class="mut">'+esc(p.nome)+'</span> <span class="pill mute">não é pessoa</span>':'<input type="text" class="mini" style="min-width:220px" data-pesnome="'+esc(id)+'" value="'+esc(e.nome!=null?e.nome:p.nome)+'" aria-label="Nome no painel">')+'</td>'+
            '<td>'+p.v.map(function(n){ var vv=PES_VISTOS[pesNorm(n)]; return '<span class="chip">'+esc(n)+(vv?' <span class="mut">'+esc(pesFontesTxt(vv))+'</span>':'')+' <button type="button" class="lnk" data-pesdesl="'+esc(id)+'|'+esc(n)+'" title="Desligar este nome" aria-label="Desligar '+esc(n)+'">×</button></span>'; }).join(' ')+'</td>'+
            '<td>'+(p.ign?'—':'<select class="mini" data-pessit="'+esc(id)+'" aria-label="Situação"><option value="ativa"'+((e.sit||p.sit)==='ativa'?' selected':'')+'>ativa</option><option value="desligada"'+((e.sit||p.sit)==='desligada'?' selected':'')+'>desligada</option></select>'+((e.sit||p.sit)==='desligada'?' <input type="date" class="mini" data-pesate="'+esc(id)+'" value="'+esc(e.ate!=null?e.ate:p.ate)+'" aria-label="Desligada em">':''))+'</td>'+
            '<td>'+(p.ign?'—':'<label class="lc-chk"><input type="checkbox" data-pesoc="'+esc(id)+'"'+(oc?'':' checked')+'> '+(oc?'fora (oculta)':'entra')+'</label>')+'</td>'+
            '<td><button type="button" class="lnk" data-pesrem="'+esc(id)+'">'+(p.ign?'É pessoa':'Remover')+'</button></td></tr>'; }).join('')+'</tbody></table></div>'+
        '<p class="hint">"Na comparação": desmarque para tirar a pessoa das faixas, do tempo-padrão e dos rankings (gestão, apoio eventual). As horas dela continuam na carga. Situação "desligada" guarda a data; a pessoa continua no histórico.</p>';
    }
    var mud=state.pesMud||[];
    h+='<div class="ctl" style="margin-top:12px;flex-wrap:wrap;gap:8px"><input type="text" id="pesMotivo" class="mini" style="min-width:280px" placeholder="Motivo da mudança (obrigatório)" aria-label="Motivo da mudança"><button type="button" class="btn primary" id="pesSalvar"'+(mud.length||Object.keys(ed).length?'':' disabled')+'>Salvar e aplicar'+(mud.length||Object.keys(ed).length?' ('+(mud.length+Object.keys(ed).length)+')':'')+'</button>'+(mud.length||Object.keys(ed).length?'<button type="button" class="btn" id="pesDescartar">Descartar</button>':'')+'</div>'+
      (mud.length?'<ul class="hint" style="margin:6px 0 0;padding-left:18px">'+mud.map(function(m){ return '<li>'+esc(m)+'</li>'; }).join('')+'</ul>':'');
    el.innerHTML=h.replace(/<div class="tbl-wrap"/g,'<div class="tbl-wrap" tabindex="0" role="region" aria-label="Tabela (role para ver tudo)"');
  }
  function pesRecarregar(){ location.reload(); }
  function pesNovoId(){ return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function pesMud(t){ (state.pesMud=state.pesMud||[]).push(t); }
  function pesClique(t){
    var d=t.dataset||{}; if (!(d.pesaceitar!=null||d.pesign!=null||d.pesdesl||d.pesrem||t.id==='pesSalvar'||t.id==='pesDescartar')) return false;
    var S=pesSugestao();
    function criar(g, ign){ var id=pesNovoId(); PES.p[id]={nome:ign?g.v[0].raw:g.nome, v:g.v.map(function(v){ return v.raw; }), sit:'ativa', ate:'', ign:!!ign}; g.v.forEach(function(v){ PES.map[pesNorm(v.raw)]=id; }); PES.map[pesNorm(PES.p[id].nome)]=id; pesMud((ign?'Não é pessoa: ':'Pessoa: ')+PES.p[id].nome+' ← '+g.v.map(function(v){ return v.raw; }).join(', ')); }
    if (d.pesaceitar==='todas'){ S.forEach(function(g){ criar(g, g.naoPessoa); }); return renderPes(), true; }
    if (d.pesaceitar!=null){ var g=S[+d.pesaceitar]; if (g) criar(g,false); return renderPes(), true; }
    if (d.pesign!=null){ var g2=S[+d.pesign]; if (g2) criar(g2,true); return renderPes(), true; }
    if (d.pesdesl){ var pp=d.pesdesl.split('|'), id=pp[0], n=pp.slice(1).join('|'), p=PES.p[id]; if (!p) return true; if (p.v.length<=1&&!confirm('É o único nome ligado a '+p.nome+'. Desligar remove a pessoa do cadastro. Continuar?')) return true;
      p.v=p.v.filter(function(x){ return x!==n; }); delete PES.map[pesNorm(n)]; if (!p.v.length){ delete PES.map[pesNorm(p.nome)]; delete PES.p[id]; } pesMud('Desligado: '+n+' de '+p.nome); return renderPes(), true; }
    if (d.pesrem){ var p3=PES.p[d.pesrem]; if (!p3) return true; if (p3.ign){ p3.ign=false; pesMud('Passa a ser pessoa: '+p3.nome); return renderPes(), true; }
      if (!confirm('Remover '+p3.nome+' do cadastro? Os nomes de origem voltam para a lista sem vínculo.')) return true; p3.v.concat([p3.nome]).forEach(function(n){ delete PES.map[pesNorm(n)]; }); delete PES.p[d.pesrem]; pesMud('Removida do cadastro: '+p3.nome); return renderPes(), true; }
    if (t.id==='pesDescartar'){ state.pesMud=[]; state.pesEd={}; pesAplicarCfg(state.pesCfg||{}); return renderPes(), true; }
    if (t.id==='pesSalvar'){ var mot=($('pesMotivo')||{}).value; mot=String(mot||'').trim(); if (!mot){ toast('Escreva o motivo da mudança'); var mi=$('pesMotivo'); if (mi) mi.focus(); return true; }
      var ed=state.pesEd||{}, ocl=Object.assign({},state.eqOcl||{}), mudOc=false;
      Object.keys(ed).forEach(function(id){ var p=PES.p[id], e=ed[id]; if (!p) return; if (e.nome!=null&&e.nome.trim()&&e.nome.trim()!==p.nome){ pesMud('Nome: '+p.nome+' → '+e.nome.trim()); if (p.v.indexOf(p.nome)<0) p.v.push(p.nome); p.nome=e.nome.trim(); }
        if (e.sit&&e.sit!==p.sit){ pesMud('Situação de '+p.nome+': '+e.sit); p.sit=e.sit; } if (e.ate!=null&&e.ate!==p.ate){ p.ate=e.ate; }
        if (e.oc!=null){ var k=semAc(p.nome), antes=!!ocl[k]; if (e.oc&&!antes){ ocl[k]=p.nome; mudOc=true; pesMud('Fora da comparação: '+p.nome); } if (!e.oc&&antes){ delete ocl[k]; mudOc=true; pesMud('Volta à comparação: '+p.nome); } } });
      var out={p:{}, em:new Date().toISOString(), por:nomeUsuario()}; Object.keys(PES.p).forEach(function(id){ var p=PES.p[id]; out.p[id]={nome:p.nome, v:p.v, sit:p.sit, ate:p.ate||'', ign:!!p.ign}; });
      var mudTxt=(state.pesMud||[]).slice(); if (!mudTxt.length){ toast('Nada mudou'); return true; }
      if (!(dbPronto&&podeEscrever)){ toast('Banco indisponível — nada foi salvo'); return true; }
      t.disabled=true; t.textContent='Salvando…';
      if (typeof apurLog==='function'){ apurLog('Nomes das pessoas', '—', mudTxt.length+' mudança(s): '+mudTxt.slice(0,6).join(' · ')+(mudTxt.length>6?' …':''), 'imediato', mot); }
      var p=db.doc('config/pessoas').set(out); if (mudOc){ state.eqOcl=ocl; p=p.then(function(){ return db.doc('config/equipe').set({ocultos:ocl}); }); }
      if (typeof apurSalvar==='function') p=p.then(function(){ return db.doc('config/apuracao').set(state.apur); });
      p.then(function(){ toast('Nomes salvos — recarregando para aplicar'); setTimeout(function(){ try{ sessionStorage.setItem('crco-aba','pes'); }catch(e){} pesRecarregar(); },700); })
       .catch(function(){ t.disabled=false; t.textContent='Salvar e aplicar'; toast('Não consegui salvar os nomes'); });
      return true; }
    return false;
  }
  function pesMudou(t){ var d=t.dataset||{}; var ed=state.pesEd=state.pesEd||{};
    if (d.pesnome){ (ed[d.pesnome]=ed[d.pesnome]||{}).nome=t.value; return pesBotao(), true; }
    if (d.pessit){ (ed[d.pessit]=ed[d.pessit]||{}).sit=t.value; return renderPes(), true; }
    if (d.pesate){ (ed[d.pesate]=ed[d.pesate]||{}).ate=t.value; return pesBotao(), true; }
    if (d.pesoc){ (ed[d.pesoc]=ed[d.pesoc]||{}).oc=!t.checked; return pesBotao(), true; }
    if (d.pesjuntar!=null&&t.value){ var g=pesSugestao()[+d.pesjuntar], p=PES.p[t.value]; if (g&&p){ g.v.forEach(function(v){ if (p.v.indexOf(v.raw)<0) p.v.push(v.raw); PES.map[pesNorm(v.raw)]=t.value; }); pesMud('Juntado a '+p.nome+': '+g.v.map(function(v){ return v.raw; }).join(', ')); } return renderPes(), true; }
    return false; }
  function pesBotao(){ var b=$('pesSalvar'); if (!b) return; var n=(state.pesMud||[]).length+Object.keys(state.pesEd||{}).length; b.disabled=!n; b.textContent='Salvar e aplicar'+(n?' ('+n+')':''); }

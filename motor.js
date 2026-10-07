// MOTOR-INICIO ———————————————————————————————————————————————
var Motor = (function(){
  var DIA = 86400000;
  function semAcento(s){ return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(); }
  function isoDeDia(n){ var d=new Date(n*DIA); return d.toISOString().slice(0,10); }
  function diaDeIso(s){ var p=s.split('-'); return Math.round(Date.UTC(+p[0],+p[1]-1,+p[2])/DIA); }
  function paraDia(v, SSF){
    if (v==null || v==='') return null;
    if (typeof v==='number'){ var o=SSF.parse_date_code(v); if(!o) return null; return Math.round(Date.UTC(o.y,o.m-1,o.d)/DIA); }
    if (v instanceof Date) return Math.round(Date.UTC(v.getFullYear(),v.getMonth(),v.getDate())/DIA);
    var s=String(v).trim(), m;
    if ((m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/))) return Math.round(Date.UTC(+m[3],+m[2]-1,+m[1])/DIA);
    if ((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return Math.round(Date.UTC(+m[1],+m[2]-1,+m[3])/DIA);
    return null;
  }
  function pascoa(a){
    var b=a%19,c=Math.floor(a/100),d=a%100,e=Math.floor(c/4),f=c%4,g=Math.floor((c+8)/25),h=Math.floor((c-g+1)/3),
        i=(19*b+c-e-h+15)%30,k=Math.floor(d/4),l=d%4,L=(32+2*f+2*k-i-l)%7,mm=Math.floor((b+11*i+22*L)/451),
        mes=Math.floor((i+L-7*mm+114)/31),dia=((i+L-7*mm+114)%31)+1;
    return Math.round(Date.UTC(a,mes-1,dia)/DIA);
  }
  function feriadosNacionais(a){
    var p=pascoa(a), f=[];
    [[1,1],[4,21],[5,1],[9,7],[10,12],[11,2],[11,15],[11,20],[12,25]].forEach(function(x){ f.push(Math.round(Date.UTC(a,x[0]-1,x[1])/DIA)); });
    f.push(p-48,p-47,p-2,p+60); // Carnaval seg/ter, Sexta-feira Santa, Corpus Christi
    return f;
  }
  function criarCalendario(extras){
    var set={};
    for (var a=2022;a<=2032;a++) feriadosNacionais(a).forEach(function(d){ set[d]=1; });
    (extras||[]).forEach(function(s){ set[diaDeIso(s)]=1; });
    return function diasUteis(a,b){ // conta [a,b): exclui o dia do começo? -> igual ao VHL: inclui a, exclui b
      if (a==null||b==null) return null; if (b<=a) return 0;
      var n=0; for (var d=a; d<b; d++){ var w=((d%7)+7+4)%7; if (w!==0&&w!==6&&!set[d]) n++; } return n;
    };
  }
  function linhas(rows){ // normaliza cabeçalhos
    return rows.map(function(r){ var o={}; for (var k in r) o[semAcento(k)]=r[k]; return o; });
  }
  function detectar(cabecalhos){
    var h=cabecalhos.map(semAcento);
    var tem=function(x){ return h.indexOf(x)>=0; };
    if (tem('etapa') && tem('data execucao')) return 'etapa';
    if (tem('status') && tem('vencimento')) return 'demanda';
    if (tem('grupo de inconformidade') && tem('justificativa')) return 'inconf';
    if (tem('status do andamento') && tem('data andam.')) return 'andam';
    if (tem('tipo protocolo') && tem('data protocolo') && tem('data andamento')) return 'tri7';
    if (tem('finalizacao') && tem('prazo') && (tem('tempo') || tem('tempo permanencia'))) return 'prazo';
    return null;
  }
  var NAO_REG_ULTIMA = ['re-analise - 1 d','onr - nota de devolucao','cancelamento de protocolo','onr - envio do recibo do protocolo'];
  var POS_REGISTRO = /imprimir ficha|arquivamento|envio de registro|digitalizar selo/;
  var ESPECIAL = 'abertura de matricula + outros atos';
  var PESQUISA = 'onr - pesquisa qualificada';

  function processar(prazoRows, etapaRows, demandaRows, SSF, extras){
    var du = criarCalendario(extras);
    var P = linhas(prazoRows), E = linhas(etapaRows), D = linhas(demandaRows);
    // demanda: status por código
    var dem={}; D.forEach(function(r){ var c=String(r['codigo']); dem[c]=semAcento(r['status']); }); var temDemanda=D.length>0;
    // etapas: dedupe + agrupa
    var vistos={}, porCod={}, prod={}, minEt=Infinity, maxEt=-Infinity, idx=0;
    E.forEach(function(r){
      var c=String(r['codigo']), d=paraDia(r['data execucao'],SSF), et=String(r['etapa']||'').trim(), pz=+r['prazo']||0;
      if (d==null) return;
      var chave=c+'|'+d+'|'+et+'|'+(r['responsavel']||'')+'|'+pz;
      if (vistos[chave]) return; vistos[chave]=1;
      if (d<minEt) minEt=d; if (d>maxEt) maxEt=d;
      (porCod[c]=porCod[c]||[]).push({d:d,et:et,etn:semAcento(et),pz:pz,i:idx++,rp:String(r['responsavel']||'').trim()});
      var rp=String(r['responsavel']||'').trim(); if (rp){ var mm=isoDeDia(d).slice(0,7), P1=prod[mm]=prod[mm]||{}, Q=P1[rp]=P1[rp]||{docs:{},et:{},z:{}}; Q.docs[c]=1; Q.et[et]=(Q.et[et]||0)+1; Q.z[et]=(Q.z[et]||0)+pz; }
    });
    for (var c in porCod) porCod[c].sort(function(a,b){ return a.d-b.d || a.i-b.i; });
    // prazo: dedupe por código (última linha vence)
    var atosMap={}, certTip={};
    P.forEach(function(r){
      if (semAcento(r['tipo de documento'])==='certidao - ri'){ var fc=paraDia(r['finalizacao'],SSF); if (fc!=null){ var mc=isoDeDia(fc).slice(0,7); (certTip[mc]=certTip[mc]||{})[String(r['codigo'])]=String(r['natureza']||'').trim(); } return; }
      if (semAcento(r['tipo de documento'])!=='ri') return;
      var c=String(r['codigo']); atosMap[c]=r;
    });
    var meses={};
    Object.keys(atosMap).forEach(function(c){
      var r=atosMap[c], nat=String(r['natureza']||'').trim(), natn=semAcento(nat);
      var ing=paraDia(r['ingresso'],SSF), fin=paraDia(r['finalizacao'],SSF), pv=+r['prazo']||0;
      if (fin==null) return;
      var mes=isoDeDia(fin).slice(0,7);
      var M=meses[mes]=meses[mes]||{mes:mes,atos:[],pesquisa:0};
      if (natn===PESQUISA){ M.pesquisa++; return; }
      var ets=porCod[c]||[], ult=ets.length?ets[ets.length-1].etn:'';
      var rev=null; ets.forEach(function(e){ if (e.etn.indexOf('revisao oficial')>=0 && e.etn.indexOf('previa')<0) rev=e.d; });
      var st=dem[c]||'';
      var motivo='';
      if (st==='cancelado') motivo='C';
      else if (ult==='cancelamento de protocolo') motivo='P';
      else if (ult==='onr - envio do recibo do protocolo') motivo='O';
      else if (rev==null && ult==='onr - nota de devolucao') motivo='D';
      else if (rev==null && ult==='re-analise - 1 d') motivo='A';
      var reing = ets.some(function(e){ return /re-analise|revisao de exigencia/.test(e.etn); }) || (c in dem);
      var susp = !temDemanda || (c in dem), nex=0, npg=0, nri=0, dias=[];
      ets.forEach(function(e){ if (POS_REGISTRO.test(e.etn) || (rev!=null && e.d>rev)) return;
        var u=dias[dias.length-1]; if (!u||u.d!==e.d) dias.push({d:e.d,pz:e.pz,re:/re-analise|revisao de exigencia/.test(e.etn)});
        else { u.pz=Math.max(u.pz,e.pz); u.re=u.re||/re-analise|revisao de exigencia/.test(e.etn); } });
      for (var k=1;k<dias.length;k++){ var gap=du(dias[k-1].d,dias[k].d)-dias[k].pz;
        if (gap>=1 && susp){ if (dias[k].re) nex++; else npg++; } else if (dias[k].re) nri++; }
      var hist = ing!=null && minEt!==Infinity && ing>=minEt;
      var cat, bruto=null, liq=null, medida='', etapasStr=[];
      if (motivo) cat='N';
      else if (natn===ESPECIAL) cat='E';
      else if (rev!=null){ cat='R'; medida='R'; bruto=du(ing,rev); }
      else if (hist){ cat='R'; medida='V'; bruto=pv; }
      else cat='I';
      if ((cat==='R'||cat==='E') && hist){
        var lim = rev!=null ? rev : Infinity, soma=0, agg={};
        ets.forEach(function(e){ if (e.d<=lim && !POS_REGISTRO.test(e.etn)){ soma+=e.pz; agg[e.et]=(agg[e.et]||0)+e.pz; } });
        liq=soma; if (bruto!=null && liq>bruto) liq=bruto;
        etapasStr=Object.keys(agg).map(function(k){ return [k,agg[k]]; });
      }
      M.atos.push({c:c,nat:nat,ing:ing!=null?isoDeDia(ing):'',reg:rev!=null?isoDeDia(rev):'',fin:isoDeDia(fin),
        bruto:bruto,liq:liq,reing:reing?1:0,cat:cat,pv:pv,medida:medida,etapas:etapasStr,motivo:motivo,nex:nex,npg:npg,nri:nri,log:ets,st:st,ingD:ing});
    });
    Object.keys(certTip).forEach(function(m){ (meses[m]=meses[m]||{mes:m,atos:[],pesquisa:0}).cert=certTip[m]; });
    var producao={}; Object.keys(prod).forEach(function(m){ producao[m]={}; Object.keys(prod[m]).forEach(function(p){ producao[m][p]={d:Object.keys(prod[m][p].docs).length,e:prod[m][p].et,z:prod[m][p].z}; }); });
    return {meses:meses, producao:producao, etapaIni: minEt===Infinity?null:isoDeDia(minEt), etapaFim: maxEt===-Infinity?null:isoDeDia(maxEt)};
  }

  // log por protocolo (linha do tempo completa) — coleção separada, 1 documento por mês
  function codificarLog(M){ var ets=[],ei={},rps=[],ri={},sts=[],si={}; function id(arr,map,v){ if(!(v in map)){ map[v]=arr.length; arr.push(v); } return map[v]; }
    var rows=M.atos.map(function(a){ return [a.c, a.ingD==null?'':a.ingD, id(sts,si,a.st||''), (a.log||[]).map(function(e){ return e.d+'~'+id(ets,ei,e.et)+'~'+id(rps,ri,e.rp||'')+'~'+e.pz; }).join(',')].join('|'); });
    return {mes:M.mes, v:1, ets:ets, rps:rps, sts:sts, rows:rows.join(';')}; }
  function decodificarLog(doc){ var map={}; String(doc.rows||'').split(';').forEach(function(s){ if (!s) return; var p=s.split('|');
      map[p[0]]={ing:p[1]===''?null:+p[1], st:doc.sts[+p[2]]||'', ev:(p[3]?p[3].split(','):[]).map(function(x){ var q=x.split('~'); return {d:+q[0], et:doc.ets[+q[1]], rp:doc.rps[+q[2]], pz:+q[3]}; })}; });
    return map; }
  // codificação compacta para o banco (1 documento por mês)
  function codificar(M, origem, producao){
    var nats=[], ni={}, ets=[], ei={};
    function idn(n){ if(!(n in ni)){ ni[n]=nats.length; nats.push(n);} return ni[n]; }
    function ide(n){ if(!(n in ei)){ ei[n]=ets.length; ets.push(n);} return ei[n]; }
    var atos=M.atos.map(function(a){
      var es=a.etapas.map(function(p){ return ide(p[0])+':'+p[1]; }).join(';');
      return [a.c,idn(a.nat),a.ing,a.reg,a.fin,a.bruto==null?'':a.bruto,a.liq==null?'':a.liq,a.reing,a.cat,a.pv,a.medida,es,a.motivo,a.nex||0,a.npg||0,a.nri||0].join('|');
    });
    var inc=M.atos.filter(function(a){return a.cat==='I';}).length;
    var cn=[], cni={}, ct=Object.keys(M.cert||{}).map(function(k){ var n=M.cert[k]; if(!(n in cni)){ cni[n]=cn.length; cn.push(n);} return k+':'+cni[n]; }).join(';');
    return {mes:M.mes, v:2, atualizadoEm:new Date().toISOString(), pesquisa:M.pesquisa, incompletos:inc,
      total:M.atos.length, naturezas:nats, etapas:ets, atos:atos, origem:origem||{}, producao:producao||{}, certNats:cn, certTipos:ct};
  }
  function decodificar(doc){
    return doc.atos.map(function(s){
      var f=s.split('|');
      var es=f[11]?f[11].split(';').map(function(x){ var q=x.split(':'); return [doc.etapas[+q[0]], +q[1]]; }):[];
      var a={c:f[0],nat:doc.naturezas[+f[1]],ing:f[2],reg:f[3],fin:f[4],bruto:f[5]===''?null:+f[5],liq:f[6]===''?null:+f[6],
        reing:+f[7],cat:f[8],pv:+f[9],medida:f[10],etapas:es,motivo:f[12]||'',nex:+(f[13]||0),npg:+(f[14]||0),nri:+(f[15]||0),mes:doc.mes};
      a.lim=a.reing?25:20; a.dentro=a.bruto!=null && a.bruto<=a.lim;
      a.espera=(a.bruto!=null&&a.liq!=null)?Math.max(0,a.bruto-a.liq):null;
      return a;
    });
  }
  var REGRAS_ERRO = [
    ["Registro civil: dados do assento", /assento|termo de reconhecimento|\bdo\b \(declaracao de obito\)|livro b rtd/],
    ["Prazo / documento parado", /dias (na etapa|em analise)|permanec\w* .*analise|perdeu o prazo|dentro do prazo legal|parado por|ultimo dia do prazo|protocolo vencido|prazo para (solicitar|requerer)/],
    ["Reingresso / retorno não feito", /reingress|retorno d\w* (documento|exigencia)|dar retorno|deixou de retornar|baixa da exigencia|nao foi realizado o retorno|nao houve registro de andamento/],
    ["Certidão pós-registro", /certidao pos|certidoes pos|certidao pos-registro|certidoes pos-registro|pedido de certidao/],
    ["GO-REURB / DOI / SIG-RI", /go-?\s?reurb|reurb-s|\bsee\b|planilha de controle do reurb|\bdoi\b|doitu|sig-ri|quadro (da )?reurb/],
    ["Selo / gratuidade", /\bselo|gratuidade|justica gratuita|isent|gratuit/],
    ["Cobrança / OS / pagamento", /cobr|emolumento|\bos\s?(n|\d)|na os\b|da os\b|a os\b|duplicidade de os|ordem de servico|baixa (de|do) pagamento|pagamento (na|no|efetuado)|lancou o pagamento|lancamento do pagamento|\bpix\b|deposito previo|repasse|recibo|saldo (credor|do caixa)|fechamento do caixa|desconto pmcmv|pmcmv\/sfh|sem desconto|com desconto|igp-?m|atualiza\w* (dos )?valor|custas|reembolso|devolucao do valor|tabela de (registro|arbitramento|averbacao)/],
    ["Exigência indevida ou fracionada", /exigencia indevida|exigencia (formulada )?de forma fracionada|nao e necessari|nao sendo necessari|nao e cabivel|nao constitui impedimento|nao impede|exigencia nao|tal exigencia nao|primeira (analise|exigencia)|exigencia anterior|duas exigencias|tres exigencias|exigencia foi realizada com base|exigiu .* embora|item \d+ da (nota de )?exigencia|exigencia solicita esclarecimentos|desconsiderou|ja foi anteriormente apresentada|ja constassem|ja possu/],
    ["Qualificação: exigência não feita", /nao solicitou|deixou de solicitar|faltou solicitar|nao exigiu|nao foi exigida|nao observou|nao notou|nao verificou|nao se atentou|nao identificad|nao foi identificad|faltou (a |o )?(assinatura|confrontacao)|sem (a )?assinatura|data posterior/],
    ["Atos do protocolo (faltou/errado)", /(incluiu|inclusao|deixou de incluir|nao incluiu|faltou incluir|manteve) (no |o )?(protocolo|ato)|ato de (endereçamento|enderecamento|codigo do imovel|cancelamento|abertura|busca|retificacao)|busca(s)? no protocolo|uma busca|duas buscas|endereçamento postal|enderecamento postal|codigo do imovel|deixou o ato|atos .* (duplicad|ordem)|deixou no protocolo/],
    ["GED / acervo / anexos", /\bged\b|acervo|anex|imagens?|\.zip|digitaliz|inativou documento|excluir arquivo|cadastrou (no ged|o itbi no ged)/],
    ["Cadastro no sistema (partes, imóvel, ônus)", /cadastr|transmitente|adquirente.*(cadastrad|como)|dados (da parte|do imovel|do pedido)|sem onus|onus|porcentagem|percentual|\bmatricula (mae )?errad|vinculou|vincul|duplicad|indicador|telefone|celular|numero do cliente|super quadra|registro anterior|campo/],
    ["Minuta: dados das partes", /(minuta|qualificacao).*(rg|cpf|cnh|estado civil|nome|solteir|casad|divorciad|conjuge|uniao estavel|orgao expedidor|profiss)|\b(rg|cpf|cnh)\b|orgao expedidor|estado civil|nome d[oa] (comprador|adquirente|proprietari|vendedor|mae|conjuge)|sobrenome|divergencia no nome/],
    ["Minuta: valores, datas e referências", /valor|data d|r\$|\bav-?\d|\br-?\d|clausula|cci|cep|confronta|cidade onde|prazo de \d|area|numero d[oa] (contrato|processo|cedula)|horario|livro|titulo do contrato/],
    ["Minuta não feita ou modelo errado", /minuta|modelo|tabela|texto/],
    ["Fluxo / etapa errada", /avanc|etapa|fluxo|suspend|revisao oficial previa/],
    ["Prenotação / protocolização", /prenot|protocoliz|comarca|valparaiso|luziania|santo antonio/]
  ];
  var CATS_ERRO = REGRAS_ERRO.map(function(r){ return r[0]; }).concat(['Outros']);
  function nomearErro(obs, just){
    var t=semAcento(obs), j=semAcento(just);
    for (var i=0;i<REGRAS_ERRO.length;i++) if (REGRAS_ERRO[i][1].test(t)) return REGRAS_ERRO[i][0];
    if (j.indexOf('cobranca')>=0) return 'Cobrança / OS / pagamento';
    if (j.indexOf('minuta')>=0) return 'Minuta: valores, datas e referências';
    if (j.indexOf('ged')>=0 || j.indexOf('digitaliz')>=0) return 'GED / acervo / anexos';
    if (j.indexOf('odin')>=0 || j.indexOf('cadastro')>=0) return 'Cadastro no sistema (partes, imóvel, ônus)';
    if (j.indexOf('etapa')>=0) return 'Fluxo / etapa errada';
    if (j.indexOf('laudo de exigencias')>=0) return 'Qualificação: exigência não feita';
    return 'Outros';
  }
  function hash(str){ var h=5381; for (var i=0;i<str.length;i++){ h=((h<<5)+h+str.charCodeAt(i))|0; } return (h>>>0).toString(36); }
  function processarInconf(rows, SSF){
    var L=linhas(rows), out={}, vistos={};
    L.forEach(function(r){
      var doc=String(r['documento']||'').trim(), sp=doc.indexOf(' '), cod=sp>0?doc.slice(0,sp):doc, tipo=sp>0?doc.slice(sp+1).trim():'';
      var dia=paraDia(r['data registro'],SSF); if (dia==null || !cod) return;
      var iso=isoDeDia(dia), mes=iso.slice(0,7);
      var rec={c:cod,t:tipo,n:String(r['natureza']||'').trim(),r:String(r['responsavel']||'').trim(),p:+r['peso']||0,
        g:/externo/i.test(String(r['grupo de inconformidade']||''))?'E':'I',j:String(r['justificativa']||'').trim(),o:String(r['observacao']||'').trim(),d:iso};
      var id=hash([rec.c,rec.d,rec.r,rec.j,rec.o].join('|')), k=id, n=1; while (vistos[k]) { if (vistos[k]===2) return; k=id+'-'+(++n); }
      vistos[k]=1; rec.id=k; (out[mes]=out[mes]||[]).push(rec);
    });
    return out;
  }
  // ——— certidões (Tri7 · Andamentos)
  function paraMin(v){ // 'dd/mm/aaaa hh:mm:ss' (UTC no export do Tri7) -> minutos locais (UTC-3) desde a época, como relógio "ingênuo"
    if (v==null||v==='') return null; var s=String(v).trim(), m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null; return Math.round(Date.UTC(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+(m[6]||0))/60000) - 180;
  }
  function isoMin(n){ return new Date(n*60000).toISOString().slice(0,16); }
  function minIso(s){ var p=s.split(/[-T:]/); return Math.round(Date.UTC(+p[0],+p[1]-1,+p[2],+p[3],+p[4])/60000); }
  function feriadoSet(extras){ var set={}; for (var a=2022;a<=2032;a++) feriadosNacionais(a).forEach(function(d){ set[d]=1; }); (extras||[]).forEach(function(s){ set[diaDeIso(s)]=1; }); return set; }
  function horasUteis(a,b,fer,h0,h1){ // a,b em minutos "ingênuos"
    if (a==null||b==null||b<=a) return 0; var t=0, d0=Math.floor(a/1440), d1=Math.floor(b/1440);
    for (var d=d0; d<=d1; d++){ var w=((d%7)+7+4)%7; if (w===0||w===6||fer[d]) continue;
      var s=Math.max(a,d*1440+h0*60), e=Math.min(b,d*1440+h1*60); if (e>s) t+=e-s; }
    return t/60;
  }
  function limiteCert(tipo, h0, h1){ var t=semAcento(tipo), dia=h1-h0;
    if (!t || t.indexOf('inteiro teor')>=0) return 4;
    if (t.indexOf('onus')>=0 || t.indexOf('situacao juridica')>=0) return dia;
    return 5*dia; }
  function processarCert(rows){
    var L=linhas(rows), out={};
    L.forEach(function(r){
      if (semAcento(r['etapa grupo'])!=='certidoes gerais') return;
      var et=semAcento(r['etapa']), i=paraMin(r['data protocolo']), f=paraMin(r['data andamento']); if (i==null) return;
      var p=String(r['protocolo']), u=String(r['usuario']||'').trim();
      if (et==='concluida' && f!=null){ var mes=isoMin(f).slice(0,7), M=out[mes]=out[mes]||{mes:mes,recs:[],erros:0,pend:0}; M.recs.push({p:p,i:i,f:f,u:u}); }
      else { var mes2=isoMin(i).slice(0,7), M2=out[mes2]=out[mes2]||{mes:mes2,recs:[],erros:0,pend:0}; if (et==='erro de validacao') M2.erros++; else M2.pend++; }
    });
    return out;
  }
  function codificarCert(M, origem){
    var us=[], ui={}; function idu(n){ if(!(n in ui)){ ui[n]=us.length; us.push(n);} return ui[n]; }
    var o={mes:M.mes, v:1, atualizadoEm:new Date().toISOString(), origem:origem||'', erros:M.erros, pend:M.pend, usuarios:us,
      recs:M.recs.map(function(r){ return [r.p,isoMin(r.i),isoMin(r.f),idu(r.u)].join('|'); })};
    if (M.auto) o.auto=M.auto.filter(function(x,i,a){ return a.indexOf(x)===i; }); // protocolos de certidão com selo gerado pelo próprio Tri7 (automáticas)
    return o;
  }
  function decodificarCert(doc){
    return doc.recs.map(function(s){ var f=s.split('|'); return {p:f[0],i:minIso(f[1]),f:minIso(f[2]),u:doc.usuarios[+f[3]],mes:doc.mes}; });
  }


  // ——— Tri7 · Relatório de andamentos (quem fez cada andamento; horário local, sem ajuste)
  var AND_ST={'prenotado':'PN','prenotado automaticamente':'PA','prenotado automaticamente (saec/onr)':'PA','re-analise':'RA','revisao de exigencia':'RE','nota de exigencia':'NE','selos gerados':'SG','recebido para entrega':'RC','custas informadas (saec/onr)':'CI','custas informadas':'CI','aguardando pagamento':'AP'};
  var AND_NOME={PN:'Prenotado',PA:'Prenotado automaticamente',RA:'Re-análise',RE:'Revisão de Exigência',NE:'Nota de Exigência',SG:'Selos Gerados',RC:'Recebido para Entrega',CI:'Custas Informadas (ONR)',AP:'Aguardando Pagamento'};
  function andMin(dv, hv){ // data (serial ou dd/mm/aaaa) + hora (fração ou hh:mm[:ss]) -> minutos "ingênuos" locais
    var d=null, h=0, m;
    if (typeof dv==='number') d=Math.floor(dv)-25569+(dv%1);
    else if (dv!=null && (m=String(dv).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/))){ d=Date.UTC(+m[3],+m[2]-1,+m[1])/DIA; if (m[4]) d+=(+m[4]*60+ +m[5]+(+(m[6]||0))/60)/1440; }
    if (d==null) return null;
    if (typeof hv==='number') h=hv%1;
    else if (hv!=null && (m=String(hv).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/))) h=(+m[1]*60+ +m[2]+(+(m[3]||0))/60)/1440;
    return Math.round((d+h)*1440);
  }
  function processarAndam(rows){
    var L=linhas(rows), ev={}, cert={}, ini=Infinity, fim=-Infinity, nP=0, nC=0, nAuto=0;
    L.forEach(function(r){
      var tipo=semAcento(r['tipo']), st=semAcento(r['status do andamento']), num=r['nº']!=null?r['nº']:(r['no']!=null?r['no']:r['n°']);
      if (num==null||num===''||!st) return; num=String(num).replace(/\.0+$/,'').trim();
      var mi=andMin(r['data andam.'], r['hora andam.']); if (mi==null) return;
      var u=String(r['usuario']||'').trim().toUpperCase();
      if (mi<ini) ini=mi; if (mi>fim) fim=mi;
      if (tipo.indexOf('certid')>=0){ // certidões: pedido -> Selos Gerados
        if (st!=='selos gerados') return;
        if (u==='TRI7'){ nAuto++; var ma=isoMin(mi).slice(0,7), CA=cert[ma]=cert[ma]||{mes:ma,recs:[],erros:0,pend:0}; (CA.auto=CA.auto||[]).push(num); return; } // emitida automaticamente pelo sistema (SAEC), sem ação humana
        var i=andMin(r['data prot.']); if (i==null) return; nC++;
        var mc=isoMin(mi).slice(0,7), C=cert[mc]=cert[mc]||{mes:mc,recs:[],erros:0,pend:0};
        C.recs.push({p:num,i:i,f:mi,u:u,nat:String(r['natureza titulo']||'').trim()}); return;
      }
      var t=tipo==='protocolo'?'P':tipo.indexOf('exame')===0?'E':null; if (!t) return;
      var cod=AND_ST[st]||String(r['status do andamento']).trim(), me=isoMin(mi).slice(0,7); nP++;
      (ev[me]=ev[me]||[]).push({t:t,n:num,s:cod,u:u,m:mi});
    });
    return {ev:ev, cert:cert, ini:ini===Infinity?null:isoMin(ini), fim:fim===-Infinity?null:isoMin(fim), nP:nP, nC:nC, nAuto:nAuto};
  }
  function andChave(e){ return e.t+'|'+e.n+'|'+e.s+'|'+e.u+'|'+e.m; }
  function codificarAndam(mes, lista, origem){
    var us=[], ui={}, ss=[], si={}, vistos={}, rows=[];
    function id(a,ix,x){ if(!(x in ix)){ ix[x]=a.length; a.push(x);} return ix[x]; }
    lista.slice().sort(function(a,b){ return a.m-b.m || (a.n<b.n?-1:a.n>b.n?1:0); }).forEach(function(e){ var k=andChave(e); if (vistos[k]) return; vistos[k]=1;
      rows.push([e.t,e.n,id(ss,si,e.s),id(us,ui,e.u),e.m].join('|')); });
    return {mes:mes, v:1, atualizadoEm:new Date().toISOString(), origem:origem||'', us:us, ss:ss, rows:rows};
  }
  function decodificarAndam(doc){
    var ss=(doc.ss||[]).map(function(x){ return AND_NOME[x]?x:(AND_ST[semAcento(x)]||x); });
    return (doc.rows||[]).map(function(s){ var f=s.split('|'); return {t:f[0],n:f[1],s:ss[+f[2]],u:doc.us[+f[3]],m:+f[4]}; });
  }

  // ——— outras atribuições (RC, RTD, RPJ, Intimações, Malote Digital, Arquivo…) a partir do Prazo e Tempo Médio + Produção por Etapa
  function segDe(v){ if (v==null||v==='') return null; if (typeof v==='number') return Math.round(v*86400); var p=String(v).trim().split(':').map(Number); if (p.length<2||p.some(isNaN)) return null; return p[0]*3600+p[1]*60+(p[2]||0); }
  function tipoServ(t){ var n=semAcento(t); if (!n || n==='ri' || n==='certidao - ri' || n.indexOf('x ')===0) return null; return String(t).trim(); }
  function processarServ(prazoRows, etapaRows, SSF){
    var P=linhas(prazoRows), E=linhas(etapaRows), porCod={}, meses={};
    E.forEach(function(r){ var c=String(r['codigo']==null?'':r['codigo']).trim(), d=paraDia(r['data execucao'],SSF); if (!c||d==null) return;
      (porCod[c]=porCod[c]||[]).push({d:d, et:String(r['etapa']||'').trim(), rp:String(r['responsavel']||'').trim(), pz:+r['prazo']||0}); });
    var vistos={};
    P.forEach(function(r){
      var t=tipoServ(r['tipo de documento']); if (!t) return;
      var c=String(r['codigo']==null?'':r['codigo']).trim(); if (!c || /teste/i.test(c)) return; if (/desabilitada|nao usar/.test(semAcento(r['natureza']))) return;
      var ing=paraDia(r['ingresso'],SSF), fin=paraDia(r['finalizacao'],SSF); if (ing==null||fin==null) return;
      var k=t+'|'+c+'|'+fin; if (vistos[k]) return; vistos[k]=1;
      var ets=(porCod[c]||[]).filter(function(e){ return e.d>=ing && e.d<=fin; }).sort(function(a,b){ return a.d-b.d; });
      var m=isoDeDia(fin).slice(0,7);
      (meses[m]=meses[m]||[]).push({t:t, c:c, nat:String(r['natureza']||'').trim()||'(sem natureza)', ing:ing, fin:fin, pv:+r['prazo']||0, tempo:segDe(r['tempo']), ets:ets});
    });
    return meses;
  }
  function codificarServ(mes, docs, origem){
    var L={t:[],n:[],e:[],r:[]}, I={t:{},n:{},e:{},r:{}};
    function id(k,v){ if (!(v in I[k])){ I[k][v]=L[k].length; L[k].push(v); } return I[k][v]; }
    var rows=docs.map(function(d){ return [id('t',d.t), d.c.replace(/[|;:]/g,'_'), id('n',d.nat), d.ing, d.fin, d.pv, d.tempo==null?'':d.tempo,
      d.ets.map(function(e){ return id('e',e.et)+':'+id('r',e.rp)+':'+e.d+':'+e.pz; }).join(';')].join('|'); });
    return {mes:mes, v:1, atualizadoEm:new Date().toISOString(), origem:origem||'', tipos:L.t, nats:L.n, ets:L.e, resps:L.r, rows:rows};
  }
  function decodificarServ(doc){
    return (doc.rows||[]).map(function(s){ var f=s.split('|');
      return {t:doc.tipos[+f[0]], c:f[1], nat:doc.nats[+f[2]], ing:+f[3], fin:+f[4], pv:+f[5], tempo:f[6]===''?null:+f[6], mes:doc.mes,
        ets:f[7]?f[7].split(';').map(function(x){ var q=x.split(':'); return {et:doc.ets[+q[0]], rp:doc.resps[+q[1]], d:+q[2], pz:+q[3]}; }):[]}; });
  }

  return {processarServ:processarServ, codificarServ:codificarServ, decodificarServ:decodificarServ, tipoServ:tipoServ, processarAndam:processarAndam, codificarAndam:codificarAndam, decodificarAndam:decodificarAndam, andChave:andChave, AND_NOME:AND_NOME, isoMin:isoMin, processar:processar, processarInconf:processarInconf, processarCert:processarCert, codificarCert:codificarCert, decodificarCert:decodificarCert, horasUteis:horasUteis, limiteCert:limiteCert, feriadoSet:feriadoSet, nomearErro:nomearErro, CATS_ERRO:CATS_ERRO, detectar:detectar, codificar:codificar, decodificar:decodificar, criarCalendario:criarCalendario, diaDeIso:diaDeIso, isoDeDia:isoDeDia, codificarLog:codificarLog, decodificarLog:decodificarLog, paraDia:paraDia, semAcento:semAcento, linhas:linhas};
})();
if (typeof module!=='undefined') module.exports=Motor;
// MOTOR-FIM ———————————————————————————————————————————————————

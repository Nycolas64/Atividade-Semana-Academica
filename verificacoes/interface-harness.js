// Harness de interface: carrega api/public/index.html + app.js num DOM mínimo
// dentro de vm, com fetch falso e relógio controlável. Não usa criarServidor()
// nem rede — nenhuma requisição sai para a API real.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VAZIOS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

class Elemento {
  constructor(tag, doc) {
    this.tipoNo = 'elemento';
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.listeners = new Map();
    this._textoManual = undefined;
    this._html = '';
    this.value = '';
  }

  get children() { return this.childNodes.filter((n) => n instanceof Elemento); }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }

  get className() { return this.attributes.get('class') || ''; }
  set className(v) { this.attributes.set('class', String(v)); }
  get id() { return this.attributes.get('id') || ''; }
  set id(v) { this.attributes.set('id', String(v)); }

  get classList() {
    const el = this;
    return {
      add(...cs) {
        const s = new Set(el.className.split(/\s+/).filter(Boolean));
        cs.forEach((c) => s.add(c));
        el.className = [...s].join(' ');
      },
      remove(...cs) {
        const s = new Set(el.className.split(/\s+/).filter(Boolean));
        cs.forEach((c) => s.delete(c));
        el.className = [...s].join(' ');
      },
      contains(c) { return el.className.split(/\s+/).filter(Boolean).includes(c); },
      toggle(c) {
        if (this.contains(c)) { this.remove(c); return false; }
        this.add(c);
        return true;
      }
    };
  }

  get textContent() {
    if (this._textoManual !== undefined) return this._textoManual;
    return this.childNodes
      .map((n) => (n instanceof Elemento ? n.textContent : n.data))
      .join('');
  }
  set textContent(v) { this._textoManual = String(v); }

  set innerHTML(html) {
    this.childNodes = [];
    this._textoManual = undefined;
    this._html = String(html);
    inserirHtml(this, String(html), this.ownerDocument);
  }
  get innerHTML() { return this._html; }

  setAttribute(nome, valor) { this.attributes.set(nome, String(valor)); }
  getAttribute(nome) { return this.attributes.has(nome) ? this.attributes.get(nome) : null; }
  hasAttribute(nome) { return this.attributes.has(nome); }

  appendChild(no) {
    if (no && no.parentNode && typeof no.parentNode.removeChild === 'function') {
      no.parentNode.removeChild(no);
    }
    if (no instanceof Elemento) no.parentNode = this;
    this.childNodes.push(no);
    return no;
  }

  removeChild(no) {
    const i = this.childNodes.indexOf(no);
    if (i >= 0) this.childNodes.splice(i, 1);
    if (no instanceof Elemento) no.parentNode = null;
    return no;
  }

  addEventListener(tipo, fn) {
    if (!this.listeners.has(tipo)) this.listeners.set(tipo, []);
    this.listeners.get(tipo).push(fn);
  }

  removeEventListener(tipo, fn) {
    const ls = this.listeners.get(tipo) || [];
    const i = ls.indexOf(fn);
    if (i >= 0) ls.splice(i, 1);
  }

  dispatchEvent(evt) {
    const e = {
      type: evt.type,
      target: evt.target ?? this,
      currentTarget: this,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {}
    };
    for (const fn of [...(this.listeners.get(evt.type) || [])]) fn.call(this, e);
    return !e.defaultPrevented;
  }

  click() { this.dispatchEvent({ type: 'click', target: this }); }

  querySelector(sel) { return procurar(this, sel); }
  querySelectorAll(sel) { return procurarTodos(this, sel); }
}

function inserirHtml(pai, html, doc) {
  const limpo = String(html).replace(/<!--[\s\S]*?-->/g, '');
  const reTag = /<(\/)?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  const pilha = [pai];
  let ultimo = 0;
  let m;

  const alvoAtual = () => {
    const t = pilha[pilha.length - 1];
    return t instanceof Elemento ? t : null;
  };
  const acrescentarTexto = (trecho) => {
    if (trecho.trim() === '') return;
    const alvo = alvoAtual();
    if (alvo) alvo.childNodes.push({ tipoNo: 'texto', data: trecho });
  };

  while ((m = reTag.exec(limpo)) !== null) {
    acrescentarTexto(limpo.slice(ultimo, m.index));
    ultimo = reTag.lastIndex;

    const [, fecha, tagBruto, corpoBruto] = m;
    const tag = tagBruto.toLowerCase();

    if (fecha) {
      for (let i = pilha.length - 1; i >= 1; i--) {
        const no = pilha[i];
        if (no instanceof Elemento && no.tagName === tag.toUpperCase()) {
          pilha.length = i;
          break;
        }
      }
      continue;
    }

    const el = new Elemento(tag, doc);
    const corpo = corpoBruto.trim();
    const reAtributo = /([^\s=]+)(?:\s*=\s*"([^"]*)")?/g;
    let a;
    while ((a = reAtributo.exec(corpo)) !== null) {
      const nome = a[1];
      if (!nome || nome === '/' || nome === '=') continue;
      el.attributes.set(nome, a[2] ?? '');
    }

    const atual = pilha[pilha.length - 1];
    el.parentNode = atual instanceof Elemento ? atual : null;
    atual.childNodes.push(el);
    if (!VAZIOS.has(tag)) pilha.push(el);
  }
  acrescentarTexto(limpo.slice(ultimo));
}

function combina(el, sel) {
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('[')) {
    const mm = sel.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
    if (!mm) return false;
    if (!el.hasAttribute(mm[1])) return false;
    return mm[2] === undefined || el.getAttribute(mm[1]) === mm[2];
  }
  return el.tagName === sel.toUpperCase();
}

function procurar(raiz, sel) {
  for (const filho of raiz.childNodes) {
    if (!(filho instanceof Elemento)) continue;
    if (combina(filho, sel)) return filho;
    const achado = procurar(filho, sel);
    if (achado) return achado;
  }
  return null;
}

function procurarTodos(raiz, sel) {
  const achados = [];
  for (const filho of raiz.childNodes) {
    if (!(filho instanceof Elemento)) continue;
    if (combina(filho, sel)) achados.push(filho);
    achados.push(...procurarTodos(filho, sel));
  }
  return achados;
}

function percorrer(el, pred) {
  if (pred(el)) return el;
  for (const filho of el.childNodes) {
    if (filho instanceof Elemento) {
      const r = percorrer(filho, pred);
      if (r) return r;
    }
  }
  return null;
}

function criarDocumento() {
  const doc = {
    documentElement: null,
    listeners: new Map(),
    addEventListener(tipo, fn) {
      if (!this.listeners.has(tipo)) this.listeners.set(tipo, []);
      this.listeners.get(tipo).push(fn);
    },
    dispatchEvent(evt) {
      for (const fn of [...(this.listeners.get(evt.type) || [])]) {
        fn.call(this, { type: evt.type, target: this });
      }
      return true;
    },
    createElement(tag) { return new Elemento(tag, doc); },
    getElementById(id) {
      if (!doc.documentElement) return null;
      return percorrer(doc.documentElement, (el) => el.id === id);
    },
    querySelector(sel) {
      return doc.documentElement ? procurar(doc.documentElement, sel) : null;
    },
    querySelectorAll(sel) {
      return doc.documentElement ? procurarTodos(doc.documentElement, sel) : [];
    }
  };
  return doc;
}

function criarFetch() {
  const rotas = [];
  const chamadas = [];

  function fetch(url, init = {}) {
    const metodo = String(init.method || 'GET').toUpperCase();
    const caminho = String(url).split('?')[0];
    chamadas.push({
      metodo,
      caminho,
      url: String(url),
      headers: init.headers || {},
      body: init.body
    });
    const rota = rotas.find((r) => r.metodo === metodo && r.caminho === caminho);
    if (!rota) {
      return Promise.reject(new Error(`rota não programada na API falsa: ${metodo} ${caminho}`));
    }
    return Promise.resolve({
      ok: rota.status >= 200 && rota.status < 300,
      status: rota.status,
      json: async () => rota.corpo
    });
  }

  fetch.programar = (metodo, caminho, status, corpo) => {
    rotas.push({ metodo: String(metodo).toUpperCase(), caminho, status, corpo });
  };
  fetch.chamadas = chamadas;
  return fetch;
}

export async function aguardar(rounds = 5) {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

export async function carregarInterface(opcoes = {}) {
  const {
    agora = '2026-10-19T09:00:00-03:00',
    atividades = [],
    inscricoes = [],
    usuario = 'p-carla'
  } = opcoes;

  const html = fs.readFileSync(path.join(RAIZ, 'api', 'public', 'index.html'), 'utf8');
  const codigo = fs.readFileSync(path.join(RAIZ, 'api', 'public', 'app.js'), 'utf8');

  const doc = criarDocumento();
  const raiz = { tipoNo: 'documento', childNodes: [] };
  inserirHtml(raiz, html, doc);
  doc.documentElement = raiz.childNodes.find((n) => n instanceof Elemento) || null;
  if (!doc.documentElement) throw new Error('index.html não gerou documentElement');

  const fetch = criarFetch();
  fetch.programar('GET', '/salas', 200, []);
  fetch.programar('GET', '/atividades', 200, atividades);
  fetch.programar('GET', '/inscricoes', 200, inscricoes);
  for (const atv of atividades) {
    fetch.programar('GET', `/atividades/${atv.id}`, 200, atv);
  }

  let instante = Date.parse(agora);
  if (Number.isNaN(instante)) throw new Error(`agora inválida: ${agora}`);

  class RelogioFalso extends Date {
    constructor(...args) {
      if (args.length === 0) super(instante);
      else super(...args);
    }
    static now() { return instante; }
  }

  const intervalos = [];
  const agendados = [];
  let proximoId = 1;

  const sandbox = {
    document: doc,
    window: { addEventListener() {}, removeEventListener() {} },
    fetch,
    Date: RelogioFalso,
    setInterval(fn, ms) {
      const id = proximoId++;
      intervalos.push({ id, fn, ms });
      return id;
    },
    clearInterval(id) {
      const i = intervalos.findIndex((x) => x.id === id);
      if (i >= 0) intervalos.splice(i, 1);
    },
    setTimeout(fn, ms = 0) {
      agendados.push({ fn, ms });
      return agendados.length;
    },
    clearTimeout() {},
    alert() {},
    confirm() { return true; },
    console,
    URLSearchParams
  };

  vm.createContext(sandbox);
  vm.runInContext(codigo, sandbox, { filename: 'api/public/app.js' });

  const select = doc.getElementById('usuario-select');
  if (!select) throw new Error('usuario-select não encontrado em index.html');
  select.value = usuario;

  doc.dispatchEvent({ type: 'DOMContentLoaded' });
  await aguardar();

  return {
    document: doc,
    fetch,
    intervalos,
    agendados,
    definirAgora(iso) {
      const t = Date.parse(iso);
      if (Number.isNaN(t)) throw new Error(`agora inválida: ${iso}`);
      instante = t;
    },
    rodarIntervalos() {
      for (const intervalo of [...intervalos]) intervalo.fn();
    },
    aguardar
  };
}

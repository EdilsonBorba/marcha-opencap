// "Me pague um café": janela com Pix (QR Code + chave para copiar) e Ko-fi. Nada é carregado de terceiros
// além da biblioteca do QR (só ao abrir a janela); o Ko-fi é um link comum, sem o widget deles.
import { CREDITOS } from './creditos.js';
import { idioma, tr } from './i18n.js';

// BR Code (padrão EMV do Pix, Banco Central) para Pix estático sem valor
function crc16(s) {
  let c = 0xFFFF;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
const campo = (id, v) => id + String(v.length).padStart(2, '0') + v;
const limpo = (s, n) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, n);
export function brCode({ pix, pixNome, pixCidade }) {
  const p = campo('00', '01') + campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', pix)) + campo('52', '0000') + campo('53', '986')
    + campo('58', 'BR') + campo('59', limpo(pixNome, 25)) + campo('60', limpo(pixCidade, 15)) + campo('62', campo('05', '***')) + '6304';
  return p + crc16(p);
}

function carregarQR() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  return new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    s.onload = () => ok(window.qrcode); s.onerror = erro; document.head.appendChild(s);
  });
}

const ICONE_COPIAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const ICONE_EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

export function iniciarApoio(botao) {
  const A = CREDITOS.apoio; if (!A || (!A.pix && !A.kofi)) { botao.hidden = true; return; }
  const dlg = document.createElement('dialog'); dlg.className = 'apoio'; dlg.id = 'dlg-apoio';
  const codigo = A.pixCodigo || (A.pix && A.pixCidade ? brCode(A) : null);
  dlg.innerHTML = `
    <div class="apoio-cab"><h3>Me pague um café</h3><button class="fechar" type="button" aria-label="Fechar">×</button></div>
    <p class="dica">A ferramenta é gratuita e aberta. Se ela ajuda no seu trabalho, considere apoiar o desenvolvimento.</p>
    <div class="apoio-opcoes">
      ${A.pix ? `<div class="apoio-op" data-op="pix">
        <h4>Pix <span class="dica">(Brasil)</span></h4>
        ${codigo ? '<div class="qr" aria-label="QR Code do Pix"></div>' : ''}
        <div class="chave"><code>${A.pix}</code></div>
        <button type="button" class="prim copiar" data-txt="${codigo || A.pix}">${ICONE_COPIAR}<span>${codigo ? 'Copiar Pix copia e cola' : 'Copiar chave Pix'}</span></button>
        <p class="dica">${codigo ? 'Aponte a câmera do app do banco para o QR Code' : 'Chave aleatória'}</p>
      </div>` : ''}
      ${A.kofi ? `<div class="apoio-op" data-op="kofi">
        <h4>Ko-fi <span class="dica">(internacional)</span></h4>
        <p>Cartão ou PayPal, de qualquer país, em dólar.</p>
        <a class="botao prim" href="${A.kofi}" target="_blank" rel="noopener">${ICONE_EXT}<span>Apoiar pelo Ko-fi</span></a>
        <p class="dica">${A.kofi.replace('https://', '')}</p>
      </div>` : ''}
    </div>`;
  document.body.appendChild(dlg);
  dlg.querySelector('.fechar').onclick = () => dlg.close();
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // clique fora fecha
  dlg.querySelector('.copiar')?.addEventListener('click', async (e) => {
    const b = e.currentTarget, sp = b.querySelector('span'), antes = sp.textContent;
    try { await navigator.clipboard.writeText(b.dataset.txt); sp.textContent = tr('Copiado!'); }
    catch { sp.textContent = tr('Não consegui copiar; selecione a chave'); }
    setTimeout(() => { sp.textContent = antes; }, 2000);
  });
  botao.onclick = async () => {
    dlg.classList.toggle('en', idioma() === 'en');   // em inglês, o Ko-fi vem primeiro
    dlg.showModal();
    const alvo = dlg.querySelector('.qr');
    if (alvo && !alvo.firstChild) {
      try { const qr = (await carregarQR())(0, 'M'); qr.addData(codigo); qr.make(); alvo.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }
      catch { alvo.remove(); }
    }
  };
}

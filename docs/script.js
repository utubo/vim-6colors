const BASE_URL = location.href.replace(/\?.*/, '');
const styleSheet = document.styleSheets[0];
const dest = document.getElementById('dest');
const cbBackground = document.getElementById('cb_background');
const cbN0 = document.getElementById('cb_n0');
const cbN4 = document.getElementById('cb_n4');

let colorSchemeName = '';
let author = '';
const colorsGui = {};
const colorsCterm = {};

const init = () => {
  const fragment = document.createDocumentFragment();
  const letColorReg = /let s:([a-z]\d) = '([^']+)'/;
  const fgReg = /s:fg s:([a-z]\d)/;
  const bgReg = /s:bg s:([a-z]\d)/;
  const hiReg = /exe 'hi (\S+)'/;
  const linkReg = /hi! link (\S+) (\S+)/;
  const hiMap = {};
  const afterLink = [];
  let isGui = true;
  for (let line of DEFAULT.split('\n')) {
    const span = document.createElement('SPAN');
    let hiName;
    let className = 'line';
    let subItem;
    if (hiReg.test(line)) {
      hiName = RegExp.$1;
      if (fgReg.test(line)) {
        className += ` fg-${RegExp.$1}`;
      }
      if (bgReg.test(line)) {
        className += ` bg-${RegExp.$1}`;
      }
      if (line.includes('s:bold')) {
        className += ' bold';
      }
      if (line.includes('s:italic')) {
        className += ' italic';
      }
      if (line.includes('underline')) {
        className += ' underline';
      }
      if (line.includes('undercurl')) {
        className += ' undercurl';
      }
    } else if (linkReg.test(line)) {
      hiName = RegExp.$1;
      className = hiMap[RegExp.$2];
      if (!className) {
        afterLink.push({ span: span, link: RegExp.$2 });
      }
    } else if (isGui && line.includes("let s:term = 'cterm'")) {
      isGui = false;
    } else if (letColorReg.test(line)) {
      const colorName = RegExp.$1;
      const value = RegExp.$2;
      span.id = (isGui ? 'gui_' : 'cterm_') + colorName;
      subItem = document.createElement('SPAN');
      subItem.className = 'color-thumb';
      if (isGui) {
        colorsGui[colorName] = value;
        subItem.style.background = value;
      } else {
        colorsCterm[colorName] = value;
        subItem.style.background = termColors[value].hex;
      }
    }
    span.className = className;
    span.textContent = line;
    if (subItem) {
      span.appendChild(subItem);
    }
    if (hiName) {
      hiMap[hiName] = className;
    }
    fragment.appendChild(span);
  }
  for (let after of afterLink) {
    after.span.className = hiMap[after.link] || 'line';
  }
  dest.replaceChild(fragment, dest.firstChild);
  refreshColorInputs();
};

// Apply colors
const quoteReg = /'[^']+'/;
const lightColors = {
  n0: 'n4', n1: 'n3', n3: 'n1', n4: 'n0',
  b1: 'b3', b3: 'b1', b4: 'b9',
  g1: 'g3', g3: 'g1', g4: 'g9',
  y1: 'y3', y3: 'y1', y4: 'y9',
  r1: 'r3', r3: 'r1', r4: 'r9',
};
const applyColors = async (opt = {}) => {
  for (let i = styleSheet.cssRules.length - 1; 0 <= i; i --) {
    styleSheet.deleteRule(i);
  }
  for (let [c, value] of Object.entries(colorsGui)) {
    let v = value;
    if (cbBackground.checked) {
      v = colorsGui[lightColors[c] || c];
    }
    styleSheet.insertRule(`.fg-${c} { color: ${v}; }`);
    styleSheet.insertRule(`.bg-${c} { background: ${v}; }`);
    const span = document.getElementById(`gui_${c}`);
    if (!span) continue;
    span.firstChild.nodeValue = span.textContent.replace(quoteReg, `'${value}'`);
    span.getElementsByClassName('color-thumb')[0].style.background = value;
  }
  for (let [c, value] of Object.entries(colorsCterm)) {
    const span = document.getElementById(`cterm_${c}`);
    if (!span) continue;
    span.firstChild.nodeValue = span.textContent.replace(quoteReg, `'${value}'`);
    span.getElementsByClassName('color-thumb')[0].style.background = termColors[value].hex;
  }
  cbN0.setAttribute('for', cbBackground.checked ? 'ci_n4' : 'ci_n0');
  cbN4.setAttribute('for', cbBackground.checked ? 'ci_n0' : 'ci_n4');
  if (!opt.keepUrl) {
    history.replaceState('', '', BASE_URL);
  }
};

// Color-buttons
const refreshColorInputs = () => {
  for (let c of ['n0', 'n4', 'b4', 'g4', 'y4', 'r4']) {
    const value = colorsGui[c];
    const ci = document.getElementById('ci_' + c);
    if (ci && ci.value !== value) {
      ci.value = value;
    }
  }
};
const applyOneColor = (colorName, value) => {
  const c = colorName[0];
  if (colorName[1] === '4') {
    if (c !== 'n') {
      colorsGui[c + '9'] = value;
    }
    const c4RGB = hexToRGB(value);
    const n0RGB = hexToRGB(colorsGui.n0);
    const opacities = [0, 0.2, 0.6, 0.8, 1];
    for (let i = 0; i < 5; i++) {
      let rgb = '#';
      const opacity = opacities[i];
      for (let j of ['r', 'g', 'b']) {
        let mergeValue = 0;
        mergeValue += n0RGB[j] * (1 - opacity);
        mergeValue += c4RGB[j] * opacity;
        mergeValue = Math.floor(mergeValue);
        mergeValue = Math.min(mergeValue, 255);
        rgb += ('0' + mergeValue.toString(16)).slice(-2);
      }
      colorsGui[c + i] = rgb;
    }
  }
  for (let i of [0, 1, 2, 3, 4, 9]) {
    const key = c + i;
    if (colorsGui[key]) {
      colorsCterm[key] = findTermColor(colorsGui[key]).index;
    }
  }
};
const onInputColorLazy = () => {
  const colorName = onInputColorTarget.id.replace('ci_', '');
  const value = onInputColorTarget.value;
  if (colorsGui[colorName] === value) return;
  colorsGui[colorName] = value;
  applyOneColor(colorName, value);
  applyColors();
};
let onInputColorTimer;
let onInputColorTarget;
const onInputColor = e => {
  clearTimeout(onInputColorTimer);
  onInputColorTarget = e.target;
  onInputColorTimer = setTimeout(onInputColorLazy, 100);
};
addEventListener('input', e=> {
  if (!e.target) return;
  if (!e.target.classList) return;
  if (e.target.classList.contains('color-input')) {
    onInputColor(e);
  }
});

// ----------------
// - Tool buttons -
// ----------------
// Background
cbBackground.checked = false;
cbBackground.addEventListener('click', applyColors);

// Sampling
document.getElementById('file_pic').addEventListener('input', async e => {
  const reader = new FileReader();
  const img = new Image();
  await new Promise(resolve => {
    reader.onload = resolve;
    reader.readAsDataURL(e.target.files[0]);
  });
  await new Promise(resolve => {
    img.onload = resolve;
    img.src = reader.result;
  });
  const canvas = document.getElementById('work_canvas');
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  let pixels = [];
  for (let x = 0; x < w; x ++) {
    for (let y = 0; y < h; y ++) {
      const data = ctx.getImageData(x, y, 1, 1).data;
      if (!data[0] && !data[1] && !data[2]) continue;
      const pixel = { r: data[0], g: data[1], b: data[2] };
      Object.assign(pixel, rgbToHSL(pixel));
      pixels.push(pixel);
    }
  }
  const toHex = rgb => {
    return '#' +
      ('0' + rgb.r.toString(16)).slice(-2) +
      ('0' + rgb.g.toString(16)).slice(-2) +
      ('0' + rgb.b.toString(16)).slice(-2);
  };
  // Sort by Lightness
  pixels.sort((a, b) => a.l - b.l);
  const darkest = pixels[0];
  const brightest = pixels.slice(-1)[0];
  applyOneColor('n0', toHex(darkest));
  applyOneColor('n4', toHex(brightest));
  // Remove too bright and too dark.
  const minL = (brightest.l - darkest.l) * 2 / 5 + darkest.l;
  const maxL = (brightest.l - darkest.l) * 4 / 5 + darkest.l;
  pixels = pixels.filter(c => (minL < c.l && c.l < maxL));
  // Remove gray.
  pixels.sort((a, b) => b.s - a.s);
  const minS = pixels[0].s / 4;
  pixels = pixels.filter(c => minS < c.s);
  // Sort by hue.(0=red, 90=yellow, 180=green, 270=blue)
  pixels.sort((a, b) => a.h - b.h);
  const quoter = a => pixels[Math.floor(pixels.length * a / 4)];
  applyOneColor('b4', toHex(quoter(3)));
  applyOneColor('g4', toHex(quoter(2)));
  applyOneColor('y4', toHex(quoter(1)));
  applyOneColor('r4', toHex(quoter(0)));
  refreshColorInputs();
  applyColors();
});

// Name
const applyTextInfo = () => {
  const lines = document.getElementsByClassName('line');
  lines[0].textContent = `" * ${colorSchemeName || 'the color scheme name here'} *`;
  lines[1].textContent = `" Author: ${author || '***'}`;
};
document.getElementById('btn_name').addEventListener('click', e=> {
  colorSchemeName = prompt('Input the color scheme name.', colorSchemeName) || '';
  applyTextInfo();
});

// Author
document.getElementById('btn_author').addEventListener('click', e=> {
  author = prompt('Input your name. (Author)', author) || '';
  applyTextInfo();
});

// Download
document.getElementById('btn_download').addEventListener('click', e=> {
  const lnDownload = document.getElementById('ln_download');
  const lines = [];
  for (let line of dest.getElementsByClassName('line')) {
    lines.push(line.textContent);
  }
  lnDownload.download = `${colorSchemeName || 'mycolor'}.vim`;
  lnDownload.href = 'data:text/plain;charset=utf8,' + encodeURIComponent(lines.join('\n'));
  lnDownload.click();
});

// Permalink
const MAX_LENGTH = 2000;
const createLink = () => {
  const kv = [];
  for (let [key, value] of Object.entries(colorsGui)) {
    kv.push(`${key}-${value.slice(1)}`);
  }
  for (let [key, value] of Object.entries(colorsCterm)) {
    kv.push(`${key}-${value}`);
  }
  return CCCompress(kv.join('_'), MAX_LENGTH);
};
const loadFromQuery = (q) => {
  q = CCDecompress(q, MAX_LENGTH);
  for (let kv of q.split('_')) {
    const [key, value] = kv.split('-');
    if (value.length <= 3) {
      colorsCterm[key] = value | 0;
    } else if (value.length === 6) {
      colorsGui[key] = '#' + value;
    }
  }
  refreshColorInputs();
  applyColors({ keepUrl: 1 });
};
document.getElementById('btn_permalink').addEventListener('click', e => {
  let href = '?c=' + createLink();
  if (colorSchemeName) {
    href += `&n=${encodeURI(colorSchemeName)}`;
  }
  if (author) {
    href += `&a=${encodeURI(author)}`;
  }
  e.target.href = href;
});

init();
if (location.search.match(/n=([^&]+)/)) {
  colorSchemeName = decodeURI(RegExp.$1).slice(0, 255);
}
if (location.search.match(/a=([^&]+)/)) {
  author = decodeURI(RegExp.$1).slice(0, 255);
}
applyTextInfo();
if (location.search.match(/c=([^&]+)/)) {
  loadFromQuery(RegExp.$1);
} else {
  applyColors();
}


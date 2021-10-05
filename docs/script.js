const BASE_URL = location.href.replace(/\?.*/, '');
const styleSheet = document.styleSheets[0];
const source = document.getElementById('source');
const cbBackground = document.getElementById('cb_background');
const btnCterm = document.getElementById('btn_cterm');
const cbN0 = document.getElementById('cb_n0');
const cbN4 = document.getElementById('cb_n4');
const ciThumb = document.getElementById('ci_xx');
let ctermDlg;

let previewCterm = false;
let colorSchemeName = '';
let author = '';
let colorsGui = {};
let colorsCterm = {};

const middle = (a, b, c) => [a, b, c].sort()[1];
const deepCopy = o => JSON.parse(JSON.stringify(o));

const init = () => {
  const fragment = document.createDocumentFragment();
  const letColorReg = /let s:([a-z]\d) = '([^']+)'/;
  const fgReg = /s:fg s:([a-z]\d)/;
  const bgReg = /s:bg s:([a-z]\d)/;
  const spReg = /s:sp s:([a-z]\d)/;
  const hiReg = /exe 'hi (\S+)'/;
  const linkReg = /hi! link (\S+) (\S+)/;
  const hiMap = {};
  const afterLink = [];
  let isGui = true;
  for (const line of DEFAULT.split('\n')) {
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
      if (spReg.test(line)) {
        className += ` sp-${RegExp.$1}`;
      }
      if (line.includes('s:bold')) {
        className += ' bold';
      }
      if (line.includes('s:italic')) {
        className += ' italic';
      }
      if (line.includes('s:underline')) {
        className += ' underline';
      }
      if (line.includes('s:undercurl')) {
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
      subItem = document.createDocumentFragment();
      const thumb = document.createElement('SPAN');
      const autoLink = document.createElement('SPAN');
      autoLink.className = 'btn-auto-link-color';
      autoLink.title = 'Link the color of gui and the color of cterm';
      thumb.setAttribute('data-target', colorName);
      if (isGui) {
        colorsGui[colorName] = value;
        thumb.style.background = value;
        thumb.className += ' gui-color-thumb';
      } else {
        colorsCterm[colorName] = value;
        thumb.style.background = termColors[value].hex;
        thumb.className += ' cterm-color-thumb';
      }
      subItem.appendChild(thumb);
      subItem.appendChild(autoLink);
    }
    span.className = className;
    const lineText = document.createElement('SPAN');
    lineText.className = 'line-text';
    lineText.textContent = line + '\n';
    span.appendChild(lineText);
    if (subItem) {
      span.appendChild(subItem);
    }
    if (hiName) {
      hiMap[hiName] = className;
    }
    fragment.appendChild(span);
  }
  for (const after of afterLink) {
    after.span.className = hiMap[after.link] || 'line';
  }
  source.replaceChild(fragment, source.firstChild);
  refreshColorInputs();
};

// Apply colors
const quoteReg = /'[^']+'/;
const lightColors = {
  n1: 'n3', n2: 'n2', n3: 'n1', n4: 'n0', n0: 'n4',
  b1: 'b3', b2: 'b2', b3: 'b1', b4: 'b9',
  g1: 'g3', g2: 'g2', g3: 'g1', g4: 'g9',
  y1: 'y3', y2: 'y2', y3: 'y1', y4: 'y9',
  r1: 'r3', r2: 'r2', r3: 'r1', r4: 'r9',
  c2: 'c4', c4: 'c2',
  m2: 'm4', m4: 'm2',
};
const applyColors = async (opt = {}) => {
  // Clear CSS
  for (let i = styleSheet.cssRules.length - 1; 0 <= i; i --) {
    styleSheet.deleteRule(i);
  }
  // for the Preview mode
  let getValue = (x, v) => v; // default
  if (previewCterm) {
    getValue = (x, v) => {
      const t = termColors[colorsCterm[cbBackground.checked ? lightColors[x] : x]];
      return t ? t.hex : v;
    };
  } else if (cbBackground.checked) {
    getValue = (x, v) => colorsGui[lightColors[x]];
  }
  // Add css rules
  for (const [x, value] of Object.entries(colorsGui)) {
    let v = getValue(x, value);
    styleSheet.insertRule(`.fg-${x} { color: ${v}; }`);
    styleSheet.insertRule(`.bg-${x} { background: ${v}; }`);
    styleSheet.insertRule(`.sp-${x} { border-color: ${v}; }`);
    const span = document.getElementById(`gui_${x}`);
    if (!span) continue;
    let lineText = span.getElementsByClassName('line-text')[0];
    lineText.textContent = lineText.textContent.replace(quoteReg, `'${value}'`);
    span.getElementsByClassName('gui-color-thumb')[0].style.background = value;
  }
  for (const [x, value] of Object.entries(colorsCterm)) {
    const span = document.getElementById(`cterm_${x}`);
    if (!span) continue;
    let lineText = span.getElementsByClassName('line-text')[0];
    lineText.textContent = lineText.textContent.replace(quoteReg, `'${value}'`);
    span.getElementsByClassName('cterm-color-thumb')[0].style.background = termColors[value].hex;
  }
  cbN0.setAttribute('for', cbBackground.checked ? 'ci_n4' : 'ci_n0');
  cbN4.setAttribute('for', cbBackground.checked ? 'ci_n0' : 'ci_n4');
  if (!opt.keepUrl) {
    history.replaceState('', '', BASE_URL);
  }
};

// -----------------
// - Color buttons -
// -----------------
const refreshColorInputs = () => {
  for (const x of ['n0', 'n4', 'b4', 'g4', 'y4', 'r4']) {
    const value = colorsGui[x];
    const ci = document.getElementById('ci_' + x);
    if (ci && ci.value !== value) {
      ci.value = value;
    }
  }
};
const mergeHexs = (h1, h2) => {
  const rgb1 = hexToRGB(h1);
  const rgb2 = hexToRGB(h2);
  const rgbM = {
    r: Math.floor((rgb1.r + rgb2.r) / 2),
    g: Math.floor((rgb1.g + rgb2.g) / 2),
    b: Math.floor((rgb1.b + rgb2.b) / 2),
  };
  return rgbToHex(rgbM);
};
const makeMagenta = () => {
  colorsGui.m2 = mergeHexs(colorsGui.b2, colorsGui.r2);
  colorsGui.m4 = mergeHexs(colorsGui.b4, colorsGui.r4);
  colorsCterm.m2 = findTermColor(colorsGui.m2).index;
  colorsCterm.m4 = findTermColor(colorsGui.m4).index;
};
const makeCyan = () => {
  colorsGui.c2 = mergeHexs(colorsGui.b2, colorsGui.g2);
  colorsGui.c4 = mergeHexs(colorsGui.b4, colorsGui.g4);
  colorsCterm.c2 = findTermColor(colorsGui.c2).index;
  colorsCterm.c4 = findTermColor(colorsGui.c4).index;
};
const applyOneColor = (colorName, value) => {
  const x = colorName[0];
  if (colorName[1] === '4') {
    const x4RGB = hexToRGB(value);
    const n0RGB = hexToRGB(colorsGui.n0);
    const opacities = [0, 0.2, 0.6, 0.8, 1];
    for (let i = 0; i < 5; i++) {
      let rgb = '#';
      const opacity = opacities[i];
      for (const j of ['r', 'g', 'b']) {
        let mergeValue = 0;
        mergeValue += n0RGB[j] * (1 - opacity);
        mergeValue += x4RGB[j] * opacity;
        mergeValue = Math.floor(mergeValue);
        mergeValue = Math.min(mergeValue, 255);
        rgb += ('0' + mergeValue.toString(16)).slice(-2);
      }
      colorsGui[x + i] = rgb;
    }
  }
  if (x !== 'n') {
    // make x9
    const hsl = hexToHSL(colorsGui[x + '3']);
    if (hsl.h < 180) {
      hsl.s = Math.min(hsl.s * 1.25, 1);
      hsl.l *= 1.0 - Math.sin(hsl.h / 180 * Math.PI) / 2.0;
      colorsGui[x + '9'] = hslToHex(hsl);
    } else {
      colorsGui[x + '9'] = colorsGui[x + '4'];
    }
  }
  if (x === 'b' || x === 'r') {
    makeMagenta();
  }
  if (x === 'b' || x === 'g') {
    makeCyan();
  }
  for (const i of [0, 1, 2, 3, 4, 9]) {
    const key = x + i;
    if (colorsGui[key]) {
      colorsCterm[key] = findTermColor(colorsGui[key]).index;
    }
  }
};
const onInputColorLazy = () => {
  const key = onInputColorTarget.getAttribute('data-target');
  const value = onInputColorTarget.value;
  if (colorsGui[key] === value) return;
  colorsGui[key] = value;
  if (onInputColorTarget === ciThumb) {
    if (isAutoLinkColor()) {
      colorsCterm[key] = findTermColor(colorsGui[key]).index;
    }
  } else if (key === 'n0') {
    applyOneColor('n4', colorsGui.n4);
    applyOneColor('b4', colorsGui.b4);
    applyOneColor('g4', colorsGui.g4);
    applyOneColor('y4', colorsGui.y4);
    applyOneColor('r4', colorsGui.r4);
  } else {
    applyOneColor(key, value);
  }
  applyColors();
};
let onInputColorTimer;
let onInputColorTarget;
const onInputColor = e => {
  clearTimeout(onInputColorTimer);
  onInputColorTarget = e.target;
  onInputColorTimer = setTimeout(onInputColorLazy, 100);
};
addEventListener('input',  e=> {
  const target = e.target;
  if (!target) return;
  if (!target.classList) return;
  if (target.classList.contains('color-input')) {
    onInputColor(e);
  }
});

// --------------------
// - Color thumbnails -
// --------------------
source.classList.add('auto-link-color');
const isAutoLinkColor = () => source.classList.contains('auto-link-color');

const onClickGuiColorThumb = target => {
  const key = target.getAttribute('data-target');
  if (!key) return;
  ciThumb.setAttribute('data-target', key);
  ciThumb.value = colorsGui[key];
  ciThumb.focus();
  ciThumb.click();
};

const createCtermDlg = () => {
  if (ctermDlg) return;
  const f = document.createDocumentFragment();
  let x = 0;
  for (const x of termColors) {
    const tile = document.createElement('DIV');
    tile.id = 'cterm_dlg_tile_' + x.index;
    tile.className = 'cterm-dlg-tile';
    tile.title = x.index;
    tile.style.background = x.hex;
    f.appendChild(tile);
    if (++x === 16) {
      f.appendChild(document.createElement('BR'));
      x = 0;
    }
  }
  ctermDlg = document.createElement('DIV');
  ctermDlg.className = 'cterm-dlg transparent';
  ctermDlg.appendChild(f);
  ctermDlg.addEventListener('blur', () => {
    ctermDlg.classList.add('transparent');
  });
  document.body.appendChild(ctermDlg);
};

const hideCtermDlg = () => {
  if (!ctermDlg) return;
  ctermDlg.classList.add('transparent');
};

const onClickCtermColorThumb = target => {
  createCtermDlg();
  const dataTarget = target.getAttribute('data-target');
  ctermDlg.setAttribute('data-target', dataTarget);
  // Update selected.
  const selected = ctermDlg.getElementsByClassName('selected')[0];
  selected && selected.classList.remove('selected');
  const index = colorsCterm[dataTarget];
  const targetTile = document.getElementById('cterm_dlg_tile_' + index);
  targetTile && targetTile.classList.add('selected');
  // Show
  const rect = target.getBoundingClientRect();
  ctermDlg.style.left = (rect.right + scrollX) + 'px';
  ctermDlg.style.top = (rect.top + scrollY) + 'px';
  ctermDlg.classList.remove('transparent');
  ctermDlg.focus();
};

const onClickCtermDlgTile = target => {
  const key = ctermDlg.getAttribute('data-target');
  colorsCterm[key] = target.title;
  if (isAutoLinkColor()) {
    colorsGui[key] = termColors[target.title].hex;
  }
  applyColors();
};

addEventListener('click', e=> {
  const target = e.target;
  if (!target) return;
  if (!target.classList) return;
  if (target.classList.contains('gui-color-thumb')) {
    onClickGuiColorThumb(target);
    return;
  }
  if (target.classList.contains('cterm-color-thumb')) {
    onClickCtermColorThumb(target);
    return;
  }
  if (target.classList.contains('cterm-dlg-tile')) {
    onClickCtermDlgTile(target);
    return;
  }
  if (target.classList.contains('btn-auto-link-color')) { source.classList.toggle('auto-link-color');
    return;
  }
  hideCtermDlg();
});

// ----------------
// - Tool buttons -
// ----------------
// Background
cbBackground.checked = false;
cbBackground.addEventListener('click', applyColors);

// Cterm
btnCterm.classList.add('disabled');
btnCterm.addEventListener('click', () => {
  previewCterm = !previewCterm;
  if (previewCterm) {
    btnCterm.classList.remove('disabled');
  } else{
    btnCterm.classList.add('disabled');
  }
  applyColors();
});

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
  // Sort by Lightness
  pixels.sort((a, b) => a.l - b.l);
  const darkest = pixels[0];
  const brightest = pixels.slice(-1)[0];
  applyOneColor('n0', rgbToHex(darkest));
  applyOneColor('n4', rgbToHex(brightest));
  // Remove too bright and too dark.
  const minL = (brightest.l - darkest.l) * 2 / 5 + darkest.l;
  const maxL = (brightest.l - darkest.l) * 4 / 5 + darkest.l;
  pixels = pixels.filter(x => (minL < x.l && x.l < maxL));
  // Remove gray.
  pixels.sort((a, b) => b.s - a.s);
  const minS = pixels[0].s / 4;
  pixels = pixels.filter(x => minS < x.s);
  // Sort by hue.(0=red, 90=yellow, 180=green, 270=blue)
  pixels.sort((a, b) => a.h - b.h);
  // grouping by rounded hues.
  const rounded = {};
  for (const p of pixels) {
    const rh = Math.round(p.h / 4);
    rounded[rh] = rounded[rh] || [];
    rounded[rh].push(p);
  }
  const quarter = (a, q) => a[Math.floor(a.length * q / 4)];
  const quarterH = q => {
    const rh = quarter(Object.keys(rounded), q);
    return quarter(rounded[rh], 2);
  };
  applyOneColor('b4', rgbToHex(quarterH(3)));
  applyOneColor('g4', rgbToHex(quarterH(2)));
  applyOneColor('y4', rgbToHex(quarterH(1)));
  applyOneColor('r4', rgbToHex(quarterH(0)));
  refreshColorInputs();
  applyColors();
});

// Name
const applyTextInfo = () => {
  const lineTexts = document.getElementsByClassName('line-text');
  lineTexts[0].textContent = `" * ${colorSchemeName || 'the color scheme name here'} *\n`;
  lineTexts[1].textContent = `" Author: ${author || '***'}\n`;
};
document.getElementById('btn_name').addEventListener('click', () => {
  const i = prompt('Input the color scheme name.', colorSchemeName);
  if (i === null) return;
  colorSchemeName = i || '';
  applyTextInfo();
});

// Author
document.getElementById('btn_author').addEventListener('click', () => {
  const i = prompt('Input your name. (Author)', author);
  if (i === null) return;
  author = i || '';
  applyTextInfo();
});

// Download
document.getElementById('btn_download').addEventListener('click', () => {
  const lnDownload = document.getElementById('ln_download');
  lnDownload.download = `${colorSchemeName || 'mycolor'}.vim`;
  lnDownload.href = 'data:text/plain;charset=utf8,' + encodeURIComponent(source.textContent);
  lnDownload.click();
});

// Permalink
const MAX_LENGTH = 2000;
const createLink = () => {
  const kv = [];
  for (const [key, value] of Object.entries(colorsGui)) {
    kv.push(`${key}-${value.slice(1)}`);
  }
  for (const [key, value] of Object.entries(colorsCterm)) {
    kv.push(`${key}-${value}`);
  }
  return CCCompress(kv.join('_'), MAX_LENGTH);
};
const loadFromQuery = (q) => {
  colorsGui = {};
  colorsCterm = {};
  q = CCDecompress(q, MAX_LENGTH);
  for (const kv of q.split('_')) {
    const [key, value] = kv.split('-');
    if (value.length <= 3) {
      colorsCterm[key] = value | 0;
    } else if (value.length === 6) {
      colorsGui[key] = '#' + value;
    }
  }
  if (!colorsGui.m2) {
    makeMagenta();
  }
  if (!colorsGui.c2) {
    makeCyan();
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

// HSL sliders
const hslSliderModal = document.getElementById('modal_hsl');
const sliderH = document.getElementById('slider_h');
const sliderS = document.getElementById('slider_s');
const sliderL = document.getElementById('slider_l');
let beforeColorsGui = {};
let beforeColorsCterm = {};
const showHSLSlider = () => {
  beforeColorsGui = deepCopy(colorsGui);
  beforeColorsCterm = deepCopy(colorsCterm);
  sliderH.value = 0;
  sliderS.value = 0;
  sliderL.value = 0;
  hslSliderModal.classList.remove('transparent');
};
const okHSLSlider = () => {
  hslSliderModal.classList.add('transparent');
};
const resetHSLSlider = () => {
  Object.assign(colorsGui, beforeColorsGui);
  Object.assign(colorsCterm, beforeColorsCterm);
  refreshColorInputs();
  applyColors();
  sliderH.value = 0;
  sliderS.value = 0;
  sliderL.value = 0;
};
const onInputSliderLazy = () => {
  const h = Number(sliderH.value);
  const s = (sliderS.value) / 100;
  const l = (sliderL.value) / 100;
  const getNewValue = value => {
      const hsl = hexToHSL(value);
      hsl.h += h;
      if  (hsl.h > 360) hsl.h -= Number(360);
      hsl.s = middle(Number(0), Number(1), hsl.s + s);
      hsl.l = middle(Number(0), Number(1), hsl.l + l);
      return hslToHex(hsl);
  };
  for (const [key, value] of Object.entries(beforeColorsGui)) {
    colorsGui[key] = getNewValue(value);
  }
  for (const [key, value] of Object.entries(beforeColorsCterm)) {
    colorsCterm[key] = findTermColor(getNewValue(termColors[value].hex)).index;
  }
  refreshColorInputs();
  applyColors();
};
let onInputSliderTimer;
hslSliderModal.addEventListener('input', () => {
  clearTimeout(onInputSliderTimer);
  onInputSliderTimer = setTimeout(onInputSliderLazy, 50);
});
document.getElementById('btn_hsl').addEventListener('click', showHSLSlider);
document.getElementById('btn_okhsl').addEventListener('click', okHSLSlider);
document.getElementById('btn_resethsl').addEventListener('click', resetHSLSlider);

// ----------------
// - START HERE ! -
// ----------------
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


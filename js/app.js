/* ============================================================
   Personal Toolkit — shared utilities
   ============================================================ */

function toolkitToast(message, opts = {}) {
  let el = document.getElementById('toolkit-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toolkit-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = 'toast show' + (opts.danger ? ' danger' : '');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.classList.remove('show');
  }, opts.duration || 2200);
}

// Read a File (from <input type=file>) and resize/compress it to a JPEG data URL.
// Keeps IndexedDB entries small — important since everything lives on-device.
function toolkitFileToResizedDataUrl(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function toolkitFormatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function toolkitEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// Register the service worker (called from every page)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = document.body.dataset.swPath || '/sw.js';
    navigator.serviceWorker.register(swPath).catch(() => {
      /* offline caching is a nice-to-have, fail silently */
    });
  });
}

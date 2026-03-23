/* ── Language preference persistence ── */
(function () {
  var KEY = 'nojima_lang';

  // Seed preference on first-ever page visit (does not overwrite an explicit choice)
  try {
    if (!localStorage.getItem(KEY)) {
      var pageLang = document.documentElement.lang;
      if (pageLang) localStorage.setItem(KEY, pageLang);
    }
  } catch (e) {}

  // Explicit lang button click always wins
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.getAttribute('hreflang') || '';
      if (lang) {
        try { localStorage.setItem(KEY, lang); } catch (e) {}
      }
    });
  });
}());

/* ── Mobile Menu ── */
(function () {
  const hamburger = document.querySelector('.hamburger');
  const navMenu   = document.querySelector('.nav-menu');
  if (!hamburger || !navMenu) return;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', String(!isOpen));
    navMenu.classList.toggle('open', !isOpen);
  });

  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
      hamburger.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('open');
    }
  });

  navMenu.querySelectorAll('a:not(.lang-btn)').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('open');
    });
  });
}());

/* ── Bilingual error messages ── */
const isJa = document.documentElement.lang === 'ja';
const ERR = {
  required  : isJa ? 'この項目は必須です。'                             : 'This field is required.',
  email     : isJa ? '有効なメールアドレスを入力してください。'          : 'Please enter a valid email address.',
  phone     : isJa ? '有効な電話番号を入力してください。'                : 'Please enter a valid phone number.',
  minLen    : (n) => isJa ? `${n}文字以上入力してください。`             : `Please enter at least ${n} characters.`,
  fileType  : isJa ? 'PDF、DOC、またはDOCXファイルのみ対応しています。'  : 'Only PDF, DOC or DOCX files are accepted.',
  fileSize  : (mb) => isJa ? `ファイルが大きすぎます。最大${mb}MBです。` : `File is too large. Maximum size is ${mb} MB.`,
};

/* ── Validation helpers ── */
function getErrorMsg(field) {
  const v = field.value;

  if (field.required && !v.trim()) return ERR.required;

  if (field.type === 'email' && v.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return ERR.email;
  }

  if (field.type === 'tel' && v.trim()) {
    if (!/^[+\d\s\-().]{7,20}$/.test(v.trim())) return ERR.phone;
  }

  const min = field.dataset.minLength ? Number(field.dataset.minLength) : 0;
  if (min > 0 && v.trim().length < min) return ERR.minLen(min);

  return null;
}

function markError(field, msg) {
  field.classList.remove('is-valid');
  field.classList.add('is-error');
  field.setAttribute('aria-invalid', 'true');
  let el = field.closest('.fg').querySelector('.field-error');
  if (!el) {
    el = document.createElement('p');
    el.className = 'field-error';
    el.setAttribute('role', 'alert');
    field.closest('.fg').appendChild(el);
  }
  el.textContent = msg;
}

function clearMark(field) {
  field.classList.remove('is-error');
  field.removeAttribute('aria-invalid');
  if (field.value.trim()) field.classList.add('is-valid');
  const el = field.closest('.fg')?.querySelector('.field-error');
  if (el) el.remove();
}

function validateField(field) {
  const msg = getErrorMsg(field);
  if (msg) { markError(field, msg); return false; }
  clearMark(field);
  return true;
}

/* ── Attach validation to all managed forms ── */
document.querySelectorAll('form[data-success-id]').forEach(form => {
  const fields = Array.from(
    form.querySelectorAll('input:not([type="file"]):not([type="submit"]), select, textarea')
  );

  fields.forEach(field => {
    field.addEventListener('blur', () => {
      if (field.required || field.type === 'email' || field.type === 'tel' || field.dataset.minLength) {
        validateField(field);
      }
    });
    field.addEventListener('input', () => {
      if (field.classList.contains('is-error')) clearMark(field);
    });
    field.addEventListener('change', () => {
      if (field.classList.contains('is-error')) clearMark(field);
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    let valid = true;
    fields.forEach(f => {
      if (f.required || f.type === 'email' || f.type === 'tel' || f.dataset.minLength) {
        if (!validateField(f)) valid = false;
      }
    });

    if (!valid) {
      const first = form.querySelector('.is-error');
      if (first) { first.focus(); first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return;
    }

    const successEl = document.getElementById(form.dataset.successId);
    const errorEl   = document.getElementById(form.dataset.errorId);
    const submitBtn = form.querySelector('[type="submit"]');
    const workerUrl = form.dataset.worker;

    if (workerUrl) {
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      const loadingLabel = isJa ? '送信中…' : 'Sending…';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
        submitBtn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${loadingLabel}`;
      }
      if (errorEl) errorEl.classList.remove('show');

      const restoreBtn = () => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
          submitBtn.innerHTML = originalBtnHtml;
        }
      };

      const payload = {};
      new FormData(form).forEach((val, key) => { payload[key] = val; });

      try {
        const isMultipart = form.enctype === 'multipart/form-data';
        const res  = await fetch(workerUrl, isMultipart
          ? { method: 'POST', body: new FormData(form) }
          : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.ok) {
          if (successEl) {
            successEl.classList.add('show');
            successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          form.reset();
          fields.forEach(f => f.classList.remove('is-valid', 'is-error'));
          form.querySelectorAll('.file-preview').forEach(p => p.classList.remove('show'));
          form.querySelectorAll('.file-upload-zone').forEach(z => z.classList.remove('has-file'));
          restoreBtn();
          setTimeout(() => {
            if (successEl) successEl.classList.remove('show');
          }, 7000);
        } else {
          if (errorEl) {
            errorEl.classList.add('show');
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          restoreBtn();
        }
      } catch (_) {
        if (errorEl) {
          errorEl.classList.add('show');
          errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        restoreBtn();
      }
      return;
    }

    /* fallback: no Formspree ID — just show success locally */
    if (successEl) {
      successEl.classList.add('show');
      form.reset();
      fields.forEach(f => f.classList.remove('is-valid', 'is-error'));
      form.querySelectorAll('.file-preview').forEach(p => p.classList.remove('show'));
      form.querySelectorAll('.file-upload-zone').forEach(z => z.classList.remove('has-file'));
      if (submitBtn) submitBtn.disabled = true;
      setTimeout(() => {
        successEl.classList.remove('show');
        if (submitBtn) submitBtn.disabled = false;
      }, 7000);
    }
  });
});

/* ── File Upload UX ── */
document.querySelectorAll('.file-upload-zone').forEach(zone => {
  const input     = zone.querySelector('input[type="file"]');
  const fg        = zone.closest('.fg');
  const preview   = fg?.querySelector('.file-preview');
  const nameEl    = fg?.querySelector('.fp-name');
  const sizeEl    = fg?.querySelector('.fp-size');
  const iconEl    = fg?.querySelector('.fp-icon');
  const removeBtn = fg?.querySelector('.fp-remove');
  const MAX_MB    = 5;

  const EXT_ICONS = { pdf: '📄', doc: '📝', docx: '📝' };

  function fmt(bytes) {
    if (bytes < 1024)         return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function showUploadErr(msg) {
    let el = fg?.querySelector('.field-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'field-error';
      el.setAttribute('role', 'alert');
      fg.appendChild(el);
    }
    el.textContent = msg;
  }

  function clearUploadErr() {
    const el = fg?.querySelector('.field-error');
    if (el) el.remove();
  }

  function clearFile() {
    if (input) input.value = '';
    if (preview) preview.classList.remove('show');
    zone.classList.remove('has-file');
  }

  function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      showUploadErr(ERR.fileType);
      clearFile();
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      showUploadErr(ERR.fileSize(MAX_MB));
      clearFile();
      return;
    }
    clearUploadErr();
    if (iconEl) iconEl.textContent = EXT_ICONS[ext] || '📎';
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = fmt(file.size);
    if (preview) preview.classList.add('show');
    zone.classList.add('has-file');
  }

  if (input) {
    input.addEventListener('change', () => handleFile(input.files[0]));
  }

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('dragover'); });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file && input) {
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
      } catch (_) {}
    }
    handleFile(file);
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', e => {
      e.preventDefault();
      clearFile();
      clearUploadErr();
    });
  }
});

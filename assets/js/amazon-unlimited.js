/*
  Printly Suprimentos — Amazon import sem Microlink
  v0.3.1

  Este arquivo intercepta somente o importador Amazon.
  - Não usa o serviço externo META_IMPORTER_URL.
  - Não possui limite diário próprio.
  - Identifica ASIN e aproveita o slug da URL para sugerir o título.
  - Deixa um ponto de integração seguro para uma futura Edge Function/Creators API.

  IMPORTANTE: credenciais secretas da Amazon nunca devem ser colocadas neste arquivo.
*/
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function extractAsin(input) {
    const raw = normalizeText(input);
    if (/^[A-Z0-9]{10}$/i.test(raw)) return raw.toUpperCase();

    const patterns = [
      /\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i,
      /\/gp\/product\/([A-Z0-9]{10})(?:[/?#]|$)/i,
      /\/product\/([A-Z0-9]{10})(?:[/?#]|$)/i,
      /[?&]asin=([A-Z0-9]{10})(?:&|$)/i
    ];

    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match) return match[1].toUpperCase();
    }
    return null;
  }

  function canonicalUrl(asin) {
    return `https://www.amazon.com.br/dp/${asin}`;
  }

  function titleFromAmazonUrl(input) {
    try {
      const url = new URL(input);
      const parts = url.pathname.split('/').filter(Boolean);
      const dpIndex = parts.findIndex((part) => part.toLowerCase() === 'dp');
      const gpIndex = parts.findIndex((part) => part.toLowerCase() === 'gp');
      let slug = '';

      if (dpIndex > 0) slug = parts[dpIndex - 1];
      else if (gpIndex > 0) slug = parts[gpIndex - 1];

      if (!slug || /^[A-Z0-9]{10}$/i.test(slug)) return '';

      const decoded = decodeURIComponent(slug)
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (decoded.length < 5) return '';
      return decoded.replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      return '';
    }
  }

  function guessCategory(text) {
    const t = normalizeText(text).toLowerCase();
    if (/filamento|\bpla\b|petg|tpu|\babs\b|\basa\b/.test(t)) {
      const sub = /petg/.test(t) ? 'PETG' : /tpu/.test(t) ? 'TPU' : /\basa\b/.test(t) ? 'ASA' : /\babs\b/.test(t) ? 'ABS' : 'PLA';
      return ['Filamentos', sub];
    }
    if (/resina|405nm|msla|\bsla\b/.test(t)) return ['Resinas', 'Resina'];
    if (/impressora 3d|3d printer/.test(t)) return ['Impressoras', ''];
    if (/bico|nozzle|hotend|extrusor|ptfe|correia|pei|build plate|mesa/.test(t)) return ['Peças', ''];
    if (/paquímetro|paquimetro|alicate|espátula|espatula|ferramenta|chave|estilete|secador|dryer/.test(t)) return ['Ferramentas', ''];
    if (/lixa|primer|tinta|cola|adesivo|acabamento/.test(t)) return ['Acabamento', ''];
    if (/embalagem|caixa|saco|etiqueta|sílica|silica/.test(t)) return ['Embalagens', ''];
    return ['Outros', ''];
  }

  function setStatus(message, type = '') {
    const el = $('#amazonImportStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `amazon-status ${type}`;
  }

  function showToast(message, type = '') {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    window.setTimeout(() => { toast.className = 'toast'; }, 3000);
  }

  function setValue(selector, value, overwrite = true) {
    const el = $(selector);
    if (!el || value == null || value === '') return;
    if (!overwrite && normalizeText(el.value)) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function addAsinTag(asin) {
    const tags = $('#tags');
    if (!tags) return;
    const values = tags.value.split(',').map((x) => x.trim()).filter(Boolean);
    const tag = `ASIN:${asin}`;
    if (!values.some((x) => x.toUpperCase() === tag.toUpperCase())) values.push(tag);
    tags.value = values.join(', ');
    tags.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function tryOfficialEndpoint(asin) {
    const endpoint = normalizeText(window.PRINTLY_CONFIG?.AMAZON_IMPORT_ENDPOINT);
    if (!endpoint) return null;

    const url = endpoint + (endpoint.includes('?') ? '&' : '?') + `asin=${encodeURIComponent(asin)}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`Importador Amazon respondeu ${response.status}.`);
    return response.json();
  }

  function applyApiData(data) {
    if (!data || typeof data !== 'object') return false;

    const title = data.title || data.itemInfo?.title || '';
    const image = data.image || data.imageUrl || data.images?.primary?.large?.url || data.images?.primary?.medium?.url || '';
    const description = data.description || data.features?.join?.(' • ') || '';
    const brand = data.brand || data.itemInfo?.brand || '';
    const detailUrl = data.detailPageUrl || data.url || '';
    const affiliateUrl = data.affiliateUrl || data.detailPageUrl || '';

    if (title) setValue('#title', title);
    if (image) setValue('#image', image);
    if (description) setValue('#description', description);
    if (brand) setValue('#brand', brand);
    if (detailUrl) setValue('#sourceUrl', detailUrl);
    if (affiliateUrl && /(?:amazon\.com\.br|amzn\.to)/i.test(affiliateUrl)) setValue('#affiliateUrl', affiliateUrl, false);

    if (title) {
      const [cat, sub] = guessCategory(title);
      setValue('#category', cat);
      if (sub) setValue('#subcategory', sub);
    }

    return Boolean(title || image || description || brand);
  }

  async function importAmazon(input) {
    const raw = normalizeText(input);
    if (!raw) {
      setStatus('Cole a URL da Amazon ou um ASIN.', 'error');
      showToast('Cole a URL da Amazon ou o ASIN.', 'error');
      return;
    }

    const asin = extractAsin(raw);
    if (!asin) {
      setStatus('Não consegui identificar o ASIN. Use a página do produto da Amazon ou o código de 10 caracteres.', 'error');
      showToast('ASIN não identificado.', 'error');
      return;
    }

    const canonical = canonicalUrl(asin);
    const urlTitle = /^https?:\/\//i.test(raw) ? titleFromAmazonUrl(raw) : '';

    setValue('#sourceUrl', canonical);
    setValue('#store', 'Amazon');
    addAsinTag(asin);

    if (urlTitle && !normalizeText($('#title')?.value)) {
      setValue('#title', urlTitle);
      const [cat, sub] = guessCategory(urlTitle);
      setValue('#category', cat);
      if (sub) setValue('#subcategory', sub);
    }

    // Se a própria URL já contém tag de associado, ela pode ser usada como link de afiliado.
    if (/amazon\.com\.br/i.test(raw) && /[?&]tag=/i.test(raw)) {
      setValue('#affiliateUrl', raw, false);
      setValue('#amazonAffiliateUrl', raw, false);
    }

    const openButton = $('#openAmazonProduct');
    if (openButton) {
      openButton.href = canonical;
      openButton.hidden = false;
    }

    const copyButton = $('#copyAmazonAsin');
    if (copyButton) {
      copyButton.dataset.asin = asin;
      copyButton.hidden = false;
    }

    setStatus(`ASIN ${asin} identificado sem consumir o limite do antigo importador. Preparando cadastro…`, 'working');

    // Quando a futura Edge Function oficial estiver configurada, usamos a Creators API por aqui.
    try {
      const apiData = await tryOfficialEndpoint(asin);
      if (apiData && applyApiData(apiData)) {
        setStatus(`ASIN ${asin} importado pela integração Amazon. Confira os dados e salve.`, 'ok');
        showToast('Produto Amazon importado.', 'ok');
        return;
      }
    } catch (error) {
      console.error('Amazon official endpoint:', error);
      setStatus(`ASIN ${asin} preparado. A integração oficial não respondeu; complete apenas os campos que faltarem.`, 'error');
      showToast('ASIN preparado; revise os dados.', 'error');
      return;
    }

    const hasSuggestedTitle = Boolean(normalizeText($('#title')?.value));
    setStatus(
      hasSuggestedTitle
        ? `ASIN ${asin} preparado sem limite externo. Confira título/imagem, cole o link do SiteStripe e salve.`
        : `ASIN ${asin} preparado sem limite externo. Informe título e imagem, cole o link do SiteStripe e salve.`,
      'ok'
    );
    showToast('Produto Amazon preparado sem limite diário.', 'ok');
  }

  function init() {
    const button = $('#importAmazonBtn');
    if (!button) return;

    // Captura o clique antes do handler antigo, evitando qualquer chamada ao Microlink.
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      importAmazon($('#amazonProductInput')?.value);
    }, true);

    const input = $('#amazonProductInput');
    if (input) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          importAmazon(input.value);
        }
      });
    }

    const status = $('#amazonImportStatus');
    if (status) {
      status.textContent = 'Amazon sem limite do importador externo: cole URL/ASIN → preparar → cole seu link SiteStripe → salvar.';
    }

    const header = document.querySelector('.amazon-import-head h2');
    if (header) header.textContent = 'Amazon — importação sem limite externo';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/*
  PRINTLY SUPRIMENTOS — CONFIGURAÇÃO
  ---------------------------------
  Chave pública do Supabase para uso no navegador.
  NUNCA coloque aqui Secret key / service_role.
*/
window.PRINTLY_CONFIG = {
  SUPABASE_URL: 'https://uiesczevcmkzdtybxuez.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_imVDY4_4fWx9oECG8-KSWg_Sw8ZtM8S',

  // Mantido apenas para o importador genérico de OUTROS parceiros.
  // O fluxo Amazon não usa mais este serviço e não consome seu limite diário.
  META_IMPORTER_URL: 'https://api.microlink.io',

  // Futuro endpoint seguro (ex.: Supabase Edge Function) para Creators API Amazon.
  // Credenciais secretas da Amazon NUNCA devem ser colocadas neste arquivo público.
  AMAZON_IMPORT_ENDPOINT: '',

  SITE_NAME: 'Printly Suprimentos'
};

/*
  Carrega o módulo Amazon sem limite externo somente no painel administrativo.
  Ele intercepta o botão Amazon antes do importador antigo e impede chamadas ao
  Microlink para produtos Amazon.
*/
(() => {
  const path = String(window.location.pathname || '').toLowerCase();
  const isAdmin = path.includes('/admin') || path.endsWith('/admin.html');
  if (!isAdmin) return;

  const script = document.createElement('script');
  const adminFolder = /\/admin\/?(?:index\.html)?$/i.test(window.location.pathname);
  script.src = adminFolder ? '../assets/js/amazon-unlimited.js' : 'assets/js/amazon-unlimited.js';
  script.defer = true;
  document.head.appendChild(script);
})();

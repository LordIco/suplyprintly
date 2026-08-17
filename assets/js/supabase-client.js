(function(){
  const cfg = window.PRINTLY_CONFIG || {};
  const configured = Boolean(
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_PUBLISHABLE_KEY &&
    !String(cfg.SUPABASE_URL).includes('COLE_AQUI') &&
    !String(cfg.SUPABASE_PUBLISHABLE_KEY).includes('COLE_AQUI')
  );
  window.PrintlyBackend = { configured, client: null };
  if (!configured) return;
  if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase JS não carregou.');
    return;
  }
  window.PrintlyBackend.client = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  );
})();

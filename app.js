// ==========================================
// INICIALIZACIÓN DE SUPABASE Y AUTENTICACIÓN
// ==========================================
const SUPABASE_URL = 'https://ippdmibozcpxzsczvpqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcGRtaWJvemNweHpzY3p2cHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDI1MDUsImV4cCI6MjEwNTkxODUwNX0.6izD8ivkoovQdX1RE8MarIZbgVumzuavl7FB6P0boLU';

// Instancia única del cliente Supabase
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado global de usuario y autenticación
let currentUser = null;
let currentAuthMode = 'login';

// -------------------------------------------------------------
// CONTROL DE AUTENTICACIÓN Y SESIÓN (SUPABASE AUTH)
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  // Setear fecha de hoy en los formularios
  const inputFechaFC = document.getElementById('fc-fecha');
  if (inputFechaFC && !inputFechaFC.value) inputFechaFC.value = new Date().toISOString().split('T')[0];
  if (typeof cargarFacturasDesdeSupabase === 'function') cargarFacturasDesdeSupabase();
  
  const inputFechaFF = document.getElementById('ff-fecha');
  if (inputFechaFF) inputFechaFF.valueAsDate = new Date();

  const inputFechaOP = document.getElementById('op-fecha');
  if (inputFechaOP && !inputFechaOP.value) inputFechaOP.value = new Date().toISOString().split('T')[0];

  const inputFechaRC = document.getElementById('rc-fecha');
  if (inputFechaRC && !inputFechaRC.value) inputFechaRC.value = new Date().toISOString().split('T')[0];

  const inputFechaAsiento = document.getElementById('asiento-fecha');
  if (inputFechaAsiento && !inputFechaAsiento.value) inputFechaAsiento.value = new Date().toISOString().split('T')[0];

  // Subpanel cupón de tarjeta en Recibos de Cobro
  const selMedioRC = document.getElementById('rc-medio-cobro');
  if (selMedioRC) {
    selMedioRC.addEventListener('change', (e) => {
      const pnl = document.getElementById('rc-panel-cupon');
      if (pnl) {
        if (e.target.value.startsWith('TJ')) pnl.classList.remove('hidden');
        else pnl.classList.add('hidden');
      }
    });
  }

  // Subpanel tarjeta corporativa en Órdenes de Pago
  const selMedioOP = document.getElementById('op-medio-pago');
  if (selMedioOP) {
    selMedioOP.addEventListener('change', (e) => {
      const pnl = document.getElementById('op-panel-tarjeta-corp');
      if (pnl) {
        if (e.target.value === 'Tarjeta Corporativa') pnl.classList.remove('hidden');
        else pnl.classList.add('hidden');
      }
    });
  }

  // Adjunto en Órdenes de Pago
  const inputAdjunto = document.getElementById('op-adjunto');
  if (inputAdjunto) {
    inputAdjunto.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return (adjuntoBase64Temp = null);
      const reader = new FileReader();
      reader.onload = ev => (adjuntoBase64Temp = ev.target.result);
      reader.readAsDataURL(file);
    });
  }

  // Listener de sesión Supabase
  db.auth.onAuthStateChange((event, session) => {
    const authModal = document.getElementById('auth-modal');
    const userDisplay = document.getElementById('user-display-email');

    if (session) {
      currentUser = session.user;
      if (authModal) authModal.classList.add('hidden');
      if (userDisplay) userDisplay.textContent = session.user.email;
      cargarRegistrosFondoFijo();
    } else {
      currentUser = null;
      if (authModal) authModal.classList.remove('hidden');
      if (userDisplay) userDisplay.textContent = 'No autenticado';
    }
  });

  if (typeof cargarPadronContactos === 'function') cargarPadronContactos();
  if (typeof cargarFacturasImpagasParaOP === 'function') cargarFacturasImpagasParaOP();
  if (typeof renderHistorialOP === 'function') renderHistorialOP();
  if (typeof initRecibos === 'function') initRecibos();
  if (typeof cambiarMedioPagoSugerido === 'function') cambiarMedioPagoSugerido('Transferencia Bancaria');
  if (typeof inicializarAsientoManual === 'function') inicializarAsientoManual();
  if (typeof renderLibroDiario === 'function') renderLibroDiario();
  if (typeof cargarPlanCuentas === 'function') cargarPlanCuentas();
  if (typeof actualizarDashboardMetrics === 'function') actualizarDashboardMetrics();
  if (typeof cargarResumenesTarjetaCorp === 'function') cargarResumenesTarjetaCorp();
});

// -------------------------------------------------------------
// CONTROL DE AUTENTICACIÓN
// -------------------------------------------------------------
function setAuthMode(mode) {
  currentAuthMode = mode;
  const btnLogin = document.getElementById('btn-login');
  const btnSignup = document.getElementById('btn-signup');

  if (mode === 'login') {
    if (btnLogin) btnLogin.className = "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-lg transition shadow-sm cursor-pointer";
    if (btnSignup) btnSignup.className = "w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm py-2.5 rounded-lg transition border border-slate-300 cursor-pointer";
  } else {
    if (btnSignup) btnSignup.className = "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-lg transition shadow-sm cursor-pointer";
    if (btnLogin) btnLogin.className = "w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm py-2.5 rounded-lg transition border border-slate-300 cursor-pointer";
  }
}

async function handleAuth(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const errorEl = document.getElementById('auth-error');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email || !password) {
    if (errorEl) {
      errorEl.textContent = 'Por favor, completá el correo y la contraseña.';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  if (errorEl) errorEl.classList.add('hidden');

  try {
    let result;
    if (currentAuthMode === 'login') {
      result = await db.auth.signInWithPassword({ email, password });
    } else {
      result = await db.auth.signUp({ email, password });
    }

    if (result.error) throw result.error;

    if (currentAuthMode === 'signup' && !result.data.session) {
      alert('Registro iniciado correctamente. Por favor, revisá tu correo para confirmar la cuenta.');
    }
  } catch (err) {
    console.error('Error Auth:', err);
    if (errorEl) {
      errorEl.textContent = err.message || 'Error al autenticar. Verificá los datos ingresados.';
      errorEl.classList.remove('hidden');
    }
  }
}

async function logout() {
  await db.auth.signOut();
}

// -------------------------------------------------------------
// ENRUTADOR PRINCIPAL: 6 MÓDULOS DE NAVEGACIÓN
// -------------------------------------------------------------
function switchTab(tabId) {
  const tabs = ['dashboard', 'facturacion', 'tesoreria', 'conciliaciones', 'auditoria-fiscal', 'contabilidad'];
  
  tabs.forEach(t => {
    const sec = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`nav-${t}`);
    
    if (sec) sec.classList.add('hidden');
    if (btn) {
      btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 cursor-pointer";
    }
  });

  const targetSec = document.getElementById(`tab-${tabId}`);
  const targetBtn = document.getElementById(`nav-${tabId}`);
  
  if (targetSec) targetSec.classList.remove('hidden');
  if (targetBtn) {
    targetBtn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all bg-indigo-600 text-white shadow-sm cursor-pointer";
  }

  // Carga de datos según el módulo activado
  if (tabId === 'dashboard') actualizarDashboardMetrics();
  if (tabId === 'facturacion') cargarFacturasDesdeSupabase();
  if (tabId === 'tesoreria') {
    initRecibos();
    renderHistorialRC();
  }
  if (tabId === 'contabilidad') renderLibroDiario();
}

// -------------------------------------------------------------
// CONTROLADOR DE SUB-PESTAÑAS INTERNAS
// -------------------------------------------------------------
function switchSubTab(modulo, subTab) {
  if (modulo === 'facturacion') {
    const panelCV = document.getElementById('panel-subtab-facturacion-cv');
    const panelTalonarios = document.getElementById('panel-subtab-facturacion-talonarios');
    const btnVentas = document.getElementById('btn-subtab-fact-ventas');
    const btnCompras = document.getElementById('btn-subtab-fact-compras');
    const btnTalonarios = document.getElementById('btn-subtab-fact-talonarios');

    [btnVentas, btnCompras, btnTalonarios].forEach(b => {
      if (b) b.className = 'px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
    });

    if (subTab === 'ventas') {
      if (panelCV) panelCV.classList.remove('hidden');
      if (panelTalonarios) panelTalonarios.classList.add('hidden');
      if (btnVentas) btnVentas.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white text-emerald-700 shadow-xs transition-all cursor-pointer';
      cambiarCircuitoFacturacion('VENTAS');
    } else if (subTab === 'compras') {
      if (panelCV) panelCV.classList.remove('hidden');
      if (panelTalonarios) panelTalonarios.classList.add('hidden');
      if (btnCompras) btnCompras.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs transition-all cursor-pointer';
      cambiarCircuitoFacturacion('COMPRAS');
    } else if (subTab === 'talonarios') {
      if (panelCV) panelCV.classList.add('hidden');
      if (panelTalonarios) panelTalonarios.classList.remove('hidden');
      if (btnTalonarios) btnTalonarios.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs transition-all cursor-pointer';
      cargarTalonarios();
    }
  }

  if (modulo === 'tesoreria') {
    const tabsTes = ['rc', 'op', 'tarjetas', 'ff'];
    tabsTes.forEach(t => {
      const p = document.getElementById(`panel-subtab-tesoreria-${t}`);
      const b = document.getElementById(`btn-subtab-tes-${t}`);
      if (p) p.classList.add('hidden');
      if (b) b.className = 'px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
    });

    const activeP = document.getElementById(`panel-subtab-tesoreria-${subTab}`);
    const activeB = document.getElementById(`btn-subtab-tes-${subTab}`);
    if (activeP) activeP.classList.remove('hidden');
    if (activeB) activeB.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs transition-all cursor-pointer';

    if (subTab === 'rc') { initRecibos(); renderHistorialRC(); }
    if (subTab === 'op') { cargarFacturasImpagasParaOP(); renderHistorialOP(); }
    if (subTab === 'tarjetas') { cargarCuponesTarjetas(); cargarResumenesTarjetaCorp(); }
    if (subTab === 'ff') { cargarRegistrosFondoFijo(); }
  }

  if (modulo === 'conciliaciones') {
    const pBanco = document.getElementById('panel-subtab-conciliaciones-banco');
    const pCtacte = document.getElementById('panel-subtab-conciliaciones-ctacte');
    const btnBanco = document.getElementById('btn-subtab-conc-banco');
    const btnCtacte = document.getElementById('btn-subtab-conc-ctacte');

    [btnBanco, btnCtacte].forEach(b => {
      if (b) b.className = 'px-4 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
    });

    if (subTab === 'banco') {
      if (pBanco) pBanco.classList.remove('hidden');
      if (pCtacte) pCtacte.classList.add('hidden');
      if (btnBanco) btnBanco.className = 'px-4 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs transition-all cursor-pointer';
    } else {
      if (pBanco) pBanco.classList.add('hidden');
      if (pCtacte) pCtacte.classList.remove('hidden');
      if (btnCtacte) btnCtacte.className = 'px-4 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs transition-all cursor-pointer';
    }
  }

  if (modulo === 'auditoria') {
    const pCruzador = document.getElementById('panel-subtab-auditoria-cruzador');
    const pRet = document.getElementById('panel-subtab-auditoria-retenciones');
    const btnCruzador = document.getElementById('btn-subtab-aud-cruzador');
    const btnRet = document.getElementById('btn-subtab-aud-retenciones');

    [btnCruzador, btnRet].forEach(b => {
      if (b) b.className = 'px-4 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
    });

    if (subTab === 'cruzador') {
      if (pCruzador) pCruzador.classList.remove('hidden');
      if (pRet) pRet.classList.add('hidden');
      if (btnCruzador) btnCruzador.className = 'px-4 py-1.5 text-xs font-bold rounded-lg bg-white text-sky-700 shadow-xs transition-all cursor-pointer';
    } else {
      if (pCruzador) pCruzador.classList.add('hidden');
      if (pRet) pRet.classList.remove('hidden');
      if (btnRet) btnRet.className = 'px-4 py-1.5 text-xs font-bold rounded-lg bg-white text-sky-700 shadow-xs transition-all cursor-pointer';
    }
  }

  if (modulo === 'contabilidad') {
    const tabsCont = ['diario', 'mayor', 'plancuentas'];
    tabsCont.forEach(t => {
      const p = document.getElementById(`panel-subtab-contabilidad-${t}`);
      const b = document.getElementById(`btn-subtab-cont-${t}`);
      if (p) p.classList.add('hidden');
      if (b) b.className = 'px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
    });

    const activeP = document.getElementById(`panel-subtab-contabilidad-${subTab}`);
    const activeB = document.getElementById(`btn-subtab-cont-${subTab}`);
    if (activeP) activeP.classList.remove('hidden');
    if (activeB) activeB.className = 'px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs transition-all cursor-pointer';

    if (subTab === 'diario') renderLibroDiario();
    if (subTab === 'mayor') cargarMayorYBalance();
    if (subTab === 'plancuentas') cargarPlanCuentas();
  }

  if (window.lucide) lucide.createIcons();
}

// ==========================================
// MOTOR 0: CONFIGURACIÓN DE EMPRESA Y LOGO
// ==========================================
let datosEmpresaActual = null;
let logoBase64Temp = null;

async function cargarDatosEmpresa() {
  try {
    const { data, error } = await db
      .from('empresas')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      datosEmpresaActual = data;
      actualizarEncabezadoEmpresa(data);
    }
  } catch (err) {
    console.warn('Aviso cargando empresa:', err);
  }
}

function actualizarEncabezadoEmpresa(emp) {
  const headerEmpresa = document.querySelector('header strong.text-slate-700');
  if (headerEmpresa && emp.razon_social) {
    headerEmpresa.textContent = emp.nombre_fantasia || emp.razon_social;
  }
}

function abrirModalEmpresa() {
  const modal = document.getElementById('modal-config-empresa');
  if (!modal) return;

  if (datosEmpresaActual) {
    document.getElementById('empresa-razon-social').value = datosEmpresaActual.razon_social || '';
    document.getElementById('empresa-nombre-fantasia').value = datosEmpresaActual.nombre_fantasia || '';
    document.getElementById('empresa-cuit').value = datosEmpresaActual.cuit || '';
    document.getElementById('empresa-condicion-iva').value = datosEmpresaActual.condicion_iva || 'Responsable Inscripto';
    document.getElementById('empresa-iibb').value = datosEmpresaActual.iibb || '';
    document.getElementById('empresa-domicilio').value = datosEmpresaActual.domicilio_comercial || '';
    document.getElementById('empresa-inicio-actividades').value = datosEmpresaActual.inicio_actividades || '';
    document.getElementById('empresa-leyenda').value = datosEmpresaActual.leyenda_comprobantes || '';

    logoBase64Temp = datosEmpresaActual.logo_base64 || null;
    mostrarPreviewLogo(logoBase64Temp);
  }

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function cerrarModalEmpresa() {
  const modal = document.getElementById('modal-config-empresa');
  if (modal) modal.classList.add('hidden');
}

function procesarArchivoLogo(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert('El archivo no debe superar los 2MB.');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    logoBase64Temp = e.target.result;
    mostrarPreviewLogo(logoBase64Temp);
  };
  reader.readAsDataURL(file);
}

function mostrarPreviewLogo(base64) {
  const img = document.getElementById('empresa-logo-preview');
  const placeholder = document.getElementById('empresa-logo-placeholder');
  const btnRemover = document.getElementById('btn-remover-logo');

  if (base64) {
    if (img) { img.src = base64; img.classList.remove('hidden'); }
    if (placeholder) placeholder.classList.add('hidden');
    if (btnRemover) btnRemover.classList.remove('hidden');
  } else {
    if (img) { img.src = ''; img.classList.add('hidden'); }
    if (placeholder) placeholder.classList.remove('hidden');
    if (btnRemover) btnRemover.classList.add('hidden');
  }
}

function removerLogoEmpresa() {
  logoBase64Temp = null;
  mostrarPreviewLogo(null);
  const input = document.getElementById('empresa-logo-input');
  if (input) input.value = '';
}

async function guardarDatosEmpresa(e) {
  if (e) e.preventDefault();

  const razon_social = document.getElementById('empresa-razon-social').value.trim();
  const nombre_fantasia = document.getElementById('empresa-nombre-fantasia').value.trim();
  const cuit = document.getElementById('empresa-cuit').value.trim();
  const condicion_iva = document.getElementById('empresa-condicion-iva').value;
  const iibb = document.getElementById('empresa-iibb').value.trim();
  const domicilio_comercial = document.getElementById('empresa-domicilio').value.trim();
  const inicio_actividades = document.getElementById('empresa-inicio-actividades').value || null;
  const leyenda_comprobantes = document.getElementById('empresa-leyenda').value.trim();

  const payload = {
    razon_social,
    nombre_fantasia,
    cuit,
    condicion_iva,
    iibb,
    domicilio_comercial,
    inicio_actividades,
    leyenda_comprobantes,
    logo_base64: logoBase64Temp
  };

  try {
    const { error } = await db
      .from('empresas')
      .upsert([payload], { onConflict: 'cuit' });

    if (error) throw error;

    showToast('Datos de la empresa y logo guardados correctamente.');
    cerrarModalEmpresa();
    await cargarDatosEmpresa();
  } catch (err) {
    console.error('Error al guardar datos de la empresa:', err);
    alert(`Error: ${err.message}`);
  }
}

// ==========================================
// MOTOR 1: FACTURACIÓN CON PADRÓN Y MULTICOMPROBANTES
// ==========================================
let circuitoFacturacionActual = 'VENTAS';
let listaFacturasActuales = [];
let padronContactos = [];

function abrirModalContacto() {
  const modal = document.getElementById('modal-nuevo-contacto');
  const selTipo = document.getElementById('contacto-tipo');
  if (selTipo) {
    selTipo.value = circuitoFacturacionActual === 'COMPRAS' ? 'PROVEEDOR' : 'CLIENTE';
  }
  if (modal) modal.classList.remove('hidden');
}

function cerrarModalContacto() {
  const modal = document.getElementById('modal-nuevo-contacto');
  if (modal) modal.classList.add('hidden');
  document.getElementById('form-nuevo-contacto')?.reset();
}

async function guardarContactoRapido(e) {
  e.preventDefault();
  const tipo = document.getElementById('contacto-tipo').value;
  const razon_social = document.getElementById('contacto-razon-social').value.trim();
  const cuit = document.getElementById('contacto-cuit').value.trim();
  const condicion_iva = document.getElementById('contacto-condicion-iva').value;
  const iibb_alicuota = parseFloat(document.getElementById('contacto-iibb').value) || 0;
  const cbu_alias = document.getElementById('contacto-cbu').value.trim() || null;

  try {
    const { error } = await db.from('clientes_proveedores').upsert([{
      tipo,
      razon_social,
      cuit,
      condicion_iva,
      iibb_alicuota,
      cbu_alias
    }], { onConflict: 'cuit' });

    if (error) throw error;

    showToast(`Contacto ${razon_social} guardado en el padrón.`);
    cerrarModalContacto();
    await cargarPadronContactos();

    const inputEntidad = document.getElementById('fc-entidad');
    if (inputEntidad) {
      inputEntidad.value = razon_social;
      seleccionarContactoPadron(razon_social);
    }
  } catch (err) {
    console.error('Error guardando contacto:', err);
    showToast('Error al guardar el contacto en Supabase.', 'error');
  }
}

async function cargarPadronContactos() {
  try {
    const { data, error } = await db.from('clientes_proveedores').select('*').order('razon_social');
    if (!error && data) {
      padronContactos = data;
      actualizarDatalistContactos();
    }
  } catch (err) {
    console.warn('Padrón de contactos no cargado:', err);
  }
}

function actualizarDatalistContactos() {
  const datalist = document.getElementById('lista-padron-contactos');
  if (!datalist) return;
  const tipoBuscado = circuitoFacturacionActual === 'COMPRAS' ? 'PROVEEDOR' : 'CLIENTE';

  datalist.innerHTML = '';
  padronContactos
    .filter(c => c.tipo === tipoBuscado || c.tipo === 'AMBOS')
    .forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.razon_social;
      opt.label = `${c.condicion_iva} \vert{} CUIT:${c.cuit}`;
      datalist.appendChild(opt);
    });
}

function seleccionarContactoPadron(nombre) {
  const c = padronContactos.find(item => item.razon_social.toLowerCase() === nombre.trim().toLowerCase());
  if (c) {
    const inputCuit = document.getElementById('fc-cuit');
    const selectCondicion = document.getElementById('fc-condicion-iva');
    if (inputCuit) inputCuit.value = c.cuit || '';
    if (selectCondicion && c.condicion_iva) selectCondicion.value = c.condicion_iva;
  }
}

function adaptarFormularioPorTipoDoc(tipoDoc) {
  const selectIVA = document.getElementById('fc-alicuota-iva');
  if (tipoDoc.includes('Factura C') || tipoDoc.includes('Nota de Crédito C') || tipoDoc.includes('Recibo C') || tipoDoc.includes('X')) {
    if (selectIVA) {
      selectIVA.value = '0';
      selectIVA.disabled = true;
    }
  } else {
    if (selectIVA) {
      selectIVA.disabled = false;
      if (selectIVA.value === '0') selectIVA.value = '21';
    }
  }
  calcularTotalesFactura();
}

async function cambiarCircuitoFacturacion(circuito) {
  circuitoFacturacionActual = circuito;
  const formTitulo = document.getElementById('fc-form-titulo');
  const labelEntidad = document.getElementById('fc-label-entidad');
  const inputEntidad = document.getElementById('fc-entidad');
  const tablaTitulo = document.getElementById('fc-tabla-titulo');
  const panelImport = document.getElementById('panel-importacion-compras');

  if (circuito === 'VENTAS') {
    if (formTitulo) formTitulo.innerHTML = `<i data-lucide="file-plus-2" class="w-4 h-4 text-emerald-600"></i> Emitir Factura de Venta`;
    if (labelEntidad) labelEntidad.textContent = 'Razón Social Cliente';
    if (inputEntidad) inputEntidad.placeholder = 'Escribí o seleccioná un cliente...';
    if (tablaTitulo) tablaTitulo.textContent = 'Comprobantes de Venta Registrados';
    if (panelImport) panelImport.classList.add('hidden');
  } else {
    if (formTitulo) formTitulo.innerHTML = `<i data-lucide="file-plus-2" class="w-4 h-4 text-indigo-600"></i> Registrar Factura de Compra`;
    if (labelEntidad) labelEntidad.textContent = 'Razón Social Proveedor';
    if (inputEntidad) inputEntidad.placeholder = 'Escribí o seleccioná un proveedor...';
    if (tablaTitulo) tablaTitulo.textContent = 'Comprobantes de Compra Registrados';
    if (panelImport) panelImport.classList.remove('hidden');
  }

  actualizarDatalistContactos();
  if (window.lucide) lucide.createIcons();
  await cargarFacturasDesdeSupabase();
}

function calcularTotalesFactura() {
  const neto = parseFloat(document.getElementById('fc-neto')?.value) || 0;
  const alicuota = parseFloat(document.getElementById('fc-alicuota-iva')?.value) || 0;
  const percepIIBB = parseFloat(document.getElementById('fc-percep-iibb')?.value) || 0;
  const percepIVA = parseFloat(document.getElementById('fc-percep-iva')?.value) || 0;
  const noGravado = parseFloat(document.getElementById('fc-no-gravado')?.value) || 0;
  const tipoDoc = document.getElementById('fc-tipo-doc')?.value || 'Factura A';

  const esNotaCredito = tipoDoc.includes('Nota de Crédito');
  const iva = Math.round((neto * (alicuota / 100)) * 100) / 100;
  const total = Math.round((neto + iva + percepIIBB + percepIVA + noGravado) * 100) / 100;

  const inputIVA = document.getElementById('fc-iva');
  const lblTotal = document.getElementById('fc-lbl-total');

  if (inputIVA) inputIVA.value = iva.toFixed(2);
  if (lblTotal) {
    lblTotal.textContent = `${esNotaCredito ? '- ' : ''}$ ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    lblTotal.className = esNotaCredito ? 'font-bold text-rose-600 text-sm font-mono' : 'font-bold text-indigo-700 text-sm font-mono';
  }
}

async function guardarFactura(e) {
  if (e) e.preventDefault();

  const fecha = document.getElementById('fc-fecha').value;
  const tipo_doc = document.getElementById('fc-tipo-doc').value;
  const numero_doc = document.getElementById('fc-numero-doc').value.trim();
  const entidad = document.getElementById('fc-entidad').value.trim();
  const cuit = document.getElementById('fc-cuit').value.trim() || 'S/D';
  const condicion_iva = document.getElementById('fc-condicion-iva').value;
  const concepto = document.getElementById('fc-concepto').value.trim();

  const neto = parseFloat(document.getElementById('fc-neto').value) || 0;
  const alicuota = parseFloat(document.getElementById('fc-alicuota-iva').value) || 0;
  const iva = parseFloat(document.getElementById('fc-iva').value) || 0;
  const percepIIBB = parseFloat(document.getElementById('fc-percep-iibb').value) || 0;
  const percepIVA = parseFloat(document.getElementById('fc-percep-iva').value) || 0;
  const noGravado = parseFloat(document.getElementById('fc-no-gravado').value) || 0;
  const totalBruto = Math.round((neto + iva + percepIIBB + percepIVA + noGravado) * 100) / 100;

  if (!fecha || !numero_doc || !entidad || !concepto || totalBruto <= 0) {
    showToast('Completá todos los campos obligatorios.', 'error');
    return;
  }

  const esNC = tipo_doc.includes('Nota de Crédito');
  const esNoFiscal = tipo_doc.includes('X');

  try {
    const { data: { user } } = await db.auth.getUser();
    const tabla = circuitoFacturacionActual === 'COMPRAS' ? 'comprobantes_compra' : 'comprobantes_venta';

    if (cuit && cuit !== 'S/D') {
      await db.from('clientes_proveedores').upsert([{
        tipo: circuitoFacturacionActual === 'COMPRAS' ? 'PROVEEDOR' : 'CLIENTE',
        razon_social: entidad,
        cuit,
        condicion_iva
      }], { onConflict: 'cuit' });
      await cargarPadronContactos();
    }

    const payload = {
      fecha,
      tipo_doc,
      numero_doc,
      concepto,
      neto_gravado: neto,
      alicuota_iva: alicuota,
      iva,
      percep_iibb: percepIIBB,
      percep_iva: percepIVA,
      no_gravado: noGravado,
      percepciones: percepIIBB + percepIVA,
      total: totalBruto,
      saldo: totalBruto,
      user_id: user?.id || null
    };

    if (circuitoFacturacionActual === 'COMPRAS') {
      payload.proveedor = entidad;
      payload.cuit = cuit;
      payload.estado_pago = esNC ? 'Aplicado' : 'Impago';
    } else {
      payload.cliente = entidad;
      payload.cuit = cuit;
      payload.estado_cobro = esNC ? 'Aplicado' : 'Impago';
    }

    const { error: errFactura } = await db.from(tabla).insert([payload]);
    if (errFactura) throw errFactura;

    // Asiento Contable Automático de Devengamiento
    if (!esNoFiscal) {
      const glosa = `${tipo_doc} ${numero_doc} -${entidad}`;
      const { data: asiento, error: errAsiento } = await db
        .from('asientos')
        .insert([{ fecha, user_id: user?.id || null, concepto: glosa }])
        .select()
        .single();

      if (!errAsiento && asiento) {
        const lineas = [];

        if (circuitoFacturacionActual === 'COMPRAS') {
          if (!esNC) {
            lineas.push({ asiento_id: asiento.id, debe: neto, haber: 0, cuenta_nombre: 'Mercaderías / Gastos', detalle: concepto });
            if (noGravado > 0) lineas.push({ asiento_id: asiento.id, debe: noGravado, haber: 0, cuenta_nombre: 'Conceptos No Gravados / Tasas', detalle: 'Exento o no gravado' });
            if (iva > 0) lineas.push({ asiento_id: asiento.id, debe: iva, haber: 0, cuenta_nombre: 'IVA Crédito Fiscal', detalle: `IVA ${alicuota}%` });
            if (percepIIBB > 0) lineas.push({ asiento_id: asiento.id, debe: percepIIBB, haber: 0, cuenta_nombre: 'Percepciones IIBB a Favor', detalle: 'Percepción IIBB factura' });
            if (percepIVA > 0) lineas.push({ asiento_id: asiento.id, debe: percepIVA, haber: 0, cuenta_nombre: 'Percepciones IVA a Favor', detalle: 'Percepción IVA factura' });
            lineas.push({ asiento_id: asiento.id, debe: 0, haber: totalBruto, cuenta_nombre: 'Proveedores / Cuentas por Pagar', detalle: `Factura ${numero_doc}` });
          } else {
            lineas.push({ asiento_id: asiento.id, debe: totalBruto, haber: 0, cuenta_nombre: 'Proveedores / Cuentas por Pagar', detalle: `NC ${numero_doc}` });
            lineas.push({ asiento_id: asiento.id, debe: 0, haber: neto, cuenta_nombre: 'Mercaderías / Gastos', detalle: 'Ajuste crédito' });
            if (noGravado > 0) lineas.push({ asiento_id: asiento.id, debe: 0, haber: noGravado, cuenta_nombre: 'Conceptos No Gravados / Tasas', detalle: 'Reversión no gravado' });
            if (iva > 0) lineas.push({ asiento_id: asiento.id, debe: 0, haber: iva, cuenta_nombre: 'IVA Crédito Fiscal', detalle: `Reversión IVA` });
            if (percepIIBB > 0) lineas.push({ asiento_id: asiento.id, debe: 0, haber: percepIIBB, cuenta_nombre: 'Percepciones IIBB a Favor', detalle: 'Reversión IIBB' });
            if (percepIVA > 0) lineas.push({ asiento_id: asiento.id, debe: 0, haber: percepIVA, cuenta_nombre: 'Percepciones IVA a Favor', detalle: 'Reversión Percep. IVA' });
          }
        } else {
          if (!esNC) {
            lineas.push({ asiento_id: asiento.id, debe: totalBruto, haber: 0, cuenta_nombre: 'Deudores por Ventas', detalle: `Factura ${numero_doc}` });
            lineas.push({ asiento_id: asiento.id, debe: 0, haber: neto, cuenta_nombre: 'Ventas', detalle: concepto });
            if (noGravado > 0) lineas.push({ asiento_id: asiento.id, debe: 0, haber: noGravado, cuenta_nombre: 'Ventas Exentas / No Gravadas', detalle: 'Conceptos no gravados' });
            if (iva > 0) lineas.push({ asiento_id: asiento.id, debe: 0, haber: iva, cuenta_nombre: 'IVA Débito Fiscal', detalle: `IVA ${alicuota}%` });
            if (percepIIBB > 0) lineas.push({ asiento_id: asiento.id, debe: 0, haber: percepIIBB, cuenta_nombre: 'Percepciones IIBB a Depositar', detalle: 'Percep. IIBB aplicada' });
          } else {
            lineas.push({ asiento_id: asiento.id, debe: neto, haber: 0, cuenta_nombre: 'Ventas', detalle: 'Bonificación / Anulación' });
            if (noGravado > 0) lineas.push({ asiento_id: asiento.id, debe: 0, haber: noGravado, cuenta_nombre: 'Ventas Exentas / No Gravadas', detalle: 'Reversión exento' });
            if (iva > 0) lineas.push({ asiento_id: asiento.id, debe: 0, haber: iva, cuenta_nombre: 'IVA Débito Fiscal', detalle: `Reversión IVA` });
            lineas.push({ asiento_id: asiento.id, debe: 0, haber: totalBruto, cuenta_nombre: 'Deudores por Ventas', detalle: `NC ${numero_doc}` });
          }
        }

        await db.from('asiento_detalles').insert(lineas);
      }
    }

    showToast(`Comprobante ${tipo_doc} guardado y desglosado correctamente.`);

    document.getElementById('form-factura').reset();
    document.getElementById('fc-fecha').value = new Date().toISOString().split('T')[0];
    adaptarFormularioPorTipoDoc('Factura A');

    await cargarFacturasDesdeSupabase();
    if (typeof cargarFacturasImpagasParaOP === 'function') await cargarFacturasImpagasParaOP();
    if (typeof renderLibroDiario === 'function') await renderLibroDiario();
    if (typeof actualizarDashboardMetrics === 'function') await actualizarDashboardMetrics();
  } catch (err) {
    console.error('Error guardando factura:', err);
    showToast('Error al registrar el comprobante en Supabase.', 'error');
  }
}

async function cargarFacturasDesdeSupabase() {
  const tbody = document.getElementById('tbody-facturas');
  if (!tbody) return;
  tbody.innerHTML = '';

  const tabla = circuitoFacturacionActual === 'COMPRAS' ? 'comprobantes_compra' : 'comprobantes_venta';

  try {
    const { data, error } = await db
      .from(tabla)
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    listaFacturasActuales = data || [];
    renderizarTablaFacturas();
  } catch (err) {
    console.error('Error cargando comprobantes:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-rose-500">Error al consultar comprobantes.</td></tr>`;
  }
}

function renderizarTablaFacturas() {
  const tbody = document.getElementById('tbody-facturas');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtro = (document.getElementById('fc-buscar')?.value || '').toLowerCase();

  const filtrados = listaFacturasActuales.filter(f => {
    const ent = (f.proveedor || f.cliente || '').toLowerCase();
    const nro = (f.numero_doc || '').toLowerCase();
    const cuit = (f.cuit || '').toLowerCase();
    return ent.includes(filtro) || nro.includes(filtro) || cuit.includes(filtro);
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">No hay comprobantes cargados.</td></tr>`;
    return;
  }

  filtrados.forEach(f => {
    const entidad = f.proveedor || f.cliente;
    const estado = f.estado_pago || f.estado_cobro || 'Impago';
    const esNC = f.tipo_doc && f.tipo_doc.includes('Nota de Crédito');
    const claseEstado = estado === 'Pagado' || estado === 'Cobrado' 
      ? 'bg-emerald-100 text-emerald-800' 
      : estado === 'Aplicado' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800';

    tbody.innerHTML += `
      <tr class="hover:bg-slate-50 transition-colors text-xs ${esNC ? 'bg-rose-50/20' : ''}">
        <td class="p-2.5 text-slate-600 whitespace-nowrap">${f.fecha}</td>
        <td class="p-2.5 font-bold text-slate-800">${f.tipo_doc}<div class="text-[11px] font-mono font-normal text-slate-400">${f.numero_doc}</div></td>
        <td class="p-2.5 font-semibold text-slate-800">${entidad}<div class="text-[11px] font-normal text-slate-400">CUIT: ${f.cuit || 'S/D'}</div></td>
        <td class="p-2.5 text-right font-mono text-slate-600">${esNC ? '-' : ''}$ ${parseFloat(f.neto_gravado || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-2.5 text-right font-mono font-bold ${esNC ? 'text-rose-600' : 'text-slate-900'}">${esNC ? '-' : ''}$ ${parseFloat(f.total).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${claseEstado}">${estado}</span></td>
        <td class="p-2.5 text-center whitespace-nowrap">
          <button onclick="eliminarFactura('${f.id}')" class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer" title="Eliminar">🗑️</button>
          <button onclick="descargarPDFFactura('${f.id}')" class="text-indigo-600 hover:text-indigo-800 p-1 mr-1 cursor-pointer" title="Descargar PDF">📄</button>
        </td>
      </tr>
    `;
  });
}

async function eliminarFactura(id) {
  if (!confirm('¿Eliminar este comprobante?')) return;
  const tabla = circuitoFacturacionActual === 'COMPRAS' ? 'comprobantes_compra' : 'comprobantes_venta';

  try {
    const { error } = await db.from(tabla).delete().eq('id', id);
    if (error) throw error;
    showToast('Comprobante eliminado con éxito.');
    await cargarFacturasDesdeSupabase();
    if (typeof cargarFacturasImpagasParaOP === 'function') await cargarFacturasImpagasParaOP();
  } catch (err) {
    console.error('Error eliminando comprobante:', err);
    showToast('Error al eliminar.', 'error');
  }
}

async function importarCSVCompras(file) {
  if (!file) return;
  const statusEl = document.getElementById('fc-status-import');
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const texto = e.target.result;
      const lineas = texto.split(/\r\n|\n/).filter(l => l.trim() !== '');
      if (lineas.length <= 1) return showToast('El archivo no contiene registros.', 'error');

      const { data: { user } } = await db.auth.getUser();
      const insertables = [];

      for (let i = 1; i < lineas.length; i++) {
        const c = lineas[i].split(',').map(v => v.replace(/"/g, '').trim());
        if (c.length >= 6) {
          const fecha = c[0];
          const tipo_doc = c[1] || 'Factura A';
          const numero_doc = c[2] || `0001-${i}`;
          const cuit = c[3] || 'S/D';
          const proveedor = c[4] || 'Proveedor Importado';
          const total = parseFloat(c[5]) || 0;
          const neto = parseFloat(c[6]) || Math.round((total / 1.21) * 100) / 100;
          const iva = parseFloat(c[7]) || (total - neto);

          if (fecha && total > 0) {
            insertables.push({
              fecha,
              tipo_doc,
              numero_doc,
              cuit,
              proveedor,
              concepto: 'Importación lote Mis Comprobantes',
              neto_gravado: neto,
              alicuota_iva: 21,
              iva,
              total,
              saldo: total,
              estado_pago: 'Impago',
              user_id: user?.id || null
            });
          }
        }
      }

      if (insertables.length === 0) return showToast('No se encontraron filas con datos válidos.', 'error');

      const { error } = await db.from('comprobantes_compra').insert(insertables);
      if (error) throw error;

      showToast(`Se importaron ${insertables.length} comprobantes de compra.`);
      if (statusEl) statusEl.textContent = `✓ ${insertables.length} importados.`;

      await cargarFacturasDesdeSupabase();
      if (typeof cargarFacturasImpagasParaOP === 'function') await cargarFacturasImpagasParaOP();
    } catch (err) {
      console.error('Error importando CSV:', err);
      showToast('Error al procesar el archivo CSV de compras.', 'error');
    }
  };
  reader.readAsText(file);
}

function descargarPlantillaComprasCSV() {
  const headers = "Fecha,TipoComprobante,NumeroComprobante,CUIT,Proveedor,Total,NetoGravado,IVA\n";
  const rows = '2026-10-01,"Factura A","00001-00045120","30-49765934-6","Pinturerías Rex SA",121000.00,100000.00,21000.00\n';
  const blob = new Blob([headers + rows], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'plantilla_compras_arca.csv';
  a.click();
}

// ==========================================
// MOTOR PDF: MEMBRETE CORPORATIVO Y FACTURAS
// ==========================================
function dibujarMembretePDF(doc, tituloDocumento, numeroDoc, fechaDoc) {
  const emp = datosEmpresaActual || {
    razon_social: 'Demostración SA',
    nombre_fantasia: 'Demostración Comercial',
    cuit: '30-71123456-9',
    condicion_iva: 'Responsable Inscripto',
    iibb: '30-71123456-9',
    domicilio_comercial: 'Av. Corrientes 1234, CABA'
  };

  if (emp.logo_base64) {
    try {
      doc.addImage(emp.logo_base64, 'PNG', 14, 12, 32, 18, undefined, 'FAST');
    } catch (e) {
      console.warn('No se pudo renderizar imagen en PDF:', e);
    }
  }

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(emp.nombre_fantasia || emp.razon_social, emp.logo_base64 ? 50 : 14, 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Razón Social: ${emp.razon_social}`, emp.logo_base64 ? 50 : 14, 23);
  doc.text(`CUIT: ${emp.cuit} \vert{} IVA:${emp.condicion_iva}`, emp.logo_base64 ? 50 : 14, 27);
  doc.text(`IIBB: ${emp.iibb \vert{}\vert{} '-'} \vert{} Domicilio:${emp.domicilio_comercial || '-'}`, emp.logo_base64 ? 50 : 14, 31);

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(130, 12, 66, 22, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(tituloDocumento, 163, 19, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(numeroDoc, 163, 25, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${fechaDoc}`, 163, 30, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 38, 196, 38);
}

function descargarPDFFactura(id) {
  const f = listaFacturasActuales.find(item => String(item.id) === String(id));
  if (!f) return;
  if (!window.jspdf) return alert('Librería jsPDF no disponible.');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  dibujarMembretePDF(doc, f.tipo_doc.toUpperCase(), f.numero_doc, f.fecha);

  const esCompra = circuitoFacturacionActual === 'COMPRAS';
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(esCompra ? 'PROVEEDOR' : 'CLIENTE', 14, 45);

  doc.setFont('helvetica', 'normal');
  doc.text(`Razón Social: ${f.cliente || f.proveedor}`, 14, 50);
  doc.text(`CUIT: ${f.cuit || 'S/D'}`, 14, 55);

  doc.autoTable({
    startY: 62,
    head: [['Detalle / Concepto', 'Neto Gravado', 'IVA', 'Percepciones', 'Total ($)']],
    body: [
      [
        f.concepto,
        `$ ${parseFloat(f.neto_gravado || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`,
        `$ ${parseFloat(f.iva || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`,
        `$ ${parseFloat(f.percepciones || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`,
        `$ ${parseFloat(f.total).toLocaleString('es-AR', {minimumFractionDigits: 2})}`
      ]
    ],
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 8 },
    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
  });

  doc.save(`${f.tipo_doc}_${f.numero_doc}.pdf`);
}

// ==========================================
// MOTOR 2: RECIBOS DE COBRO (RC)
// ==========================================
let comprobantesPendientesRC = [];
let retencionesSufridasRC = [];

function initRecibos() {
  const fechaInput = document.getElementById('rc-fecha');
  if (fechaInput && !fechaInput.value) fechaInput.value = new Date().toISOString().split('T')[0];
  generarProximoNumeroRC();
  cargarClientesSelectRC();
  renderHistorialRC();
  if (window.lucide) lucide.createIcons();
}

async function generarProximoNumeroRC() {
  try {
    const { data, error } = await db
      .from('recibos_cobro')
      .select('numero')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    let siguienteNro = 1;
    if (data && data.length > 0 && data[0].numero) {
      const match = data[0].numero.match(/\d+$/);
      if (match) siguienteNro = parseInt(match[0], 10) + 1;
    }
    const inputNum = document.getElementById('rc-numero');
    if (inputNum) inputNum.value = `RC-0001-${String(siguienteNro).padStart(8, '0')}`;
  } catch (err) {
    console.error('Error al generar número RC:', err);
    const inputNum = document.getElementById('rc-numero');
    if (inputNum) inputNum.value = `RC-0001-00000001`;
  }
}

async function cargarClientesSelectRC() {
  const select = document.getElementById('rc-cliente-select');
  if (!select) return;

  try {
    const { data, error } = await db
      .from('clientes_proveedores')
      .select('id, razon_social, cuit')
      .order('razon_social');
    
    if (error) throw error;
    select.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
    (data || []).forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.razon_social} (${c.cuit})</option>`;
    });
  } catch (err) {
    console.error('Error cargando clientes en RC:', err);
  }
}

async function cargarFacturasPendientesCliente(clienteId) {
  const tbody = document.getElementById('rc-facturas-tbody');
  if (!tbody) return;

  if (!clienteId) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">Seleccione un cliente para consultar deudas pendientes.</td></tr>';
    comprobantesPendientesRC = [];
    calcularTotalesRC();
    return;
  }

  tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">Consultando comprobantes...</td></tr>';

  try {
    const clienteObj = padronContactos.find(c => String(c.id) === String(clienteId));
    let query = db.from('comprobantes_venta').select('*');

    if (clienteObj) {
      query = query.or(`cliente.eq."${clienteObj.razon_social}",cuit.eq."${clienteObj.cuit}"`);
    }

    const { data, error } = await query.order('fecha', { ascending: true });
    if (error) throw error;

    comprobantesPendientesRC = (data || []).filter(c => (parseFloat(c.saldo) || parseFloat(c.total)) > 0 && c.estado_cobro !== 'Cobrado');

    if (comprobantesPendientesRC.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">El cliente no registra facturas con saldo pendiente.</td></tr>';
      calcularTotalesRC();
      return;
    }

    tbody.innerHTML = comprobantesPendientesRC.map((comp, idx) => {
      const saldoComp = parseFloat(comp.saldo || comp.total || 0);
      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-2.5 text-center">
            <input type="checkbox" id="rc-chk-${comp.id}" onchange="toggleComprobanteRC(${idx}, this.checked)" class="rounded border-slate-300" />
          </td>
          <td class="p-2.5 text-slate-600 font-mono text-xs">${comp.fecha}</td>
          <td class="p-2.5 font-semibold text-slate-700">${comp.tipo_doc || 'Factura'} ${comp.numero_doc \vert{}\vert{} comp.id}</td>           <td class="p-2.5 text-right font-mono font-bold text-slate-800">$${saldoComp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
          <td class="p-2.5 text-right">
            <input type="number" step="0.01" min="0" max="${saldoComp}" id="rc-imp-${comp.id}" 
                   value="0.00" disabled oninput="actualizarImporteImputadoRC(${idx}, this.value)"
                   class="w-full text-right font-mono border rounded px-2 py-1 text-xs bg-slate-100 focus:bg-white" />
          </td>
        </tr>
      `;
    }).join('');

    calcularTotalesRC();
  } catch (err) {
    console.error('Error:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500 text-xs">Error: ${err.message}</td></tr>`;
  }
}

function toggleComprobanteRC(index, checked) {
  const comp = comprobantesPendientesRC[index];
  const saldoComp = parseFloat(comp.saldo || comp.total || 0);
  const input = document.getElementById(`rc-imp-${comp.id}`);
  if (checked) {
    input.disabled = false;
    input.value = saldoComp.toFixed(2);
    comp.imputado = saldoComp;
  } else {
    input.disabled = true;
    input.value = '0.00';
    comp.imputado = 0;
  }
  calcularTotalesRC();
}

function toggleSelectAllComprobantes(checked) {
  comprobantesPendientesRC.forEach((c, idx) => {
    const chk = document.getElementById(`rc-chk-${c.id}`);
    if (chk) {
      chk.checked = checked;
      toggleComprobanteRC(idx, checked);
    }
  });
}

function actualizarImporteImputadoRC(index, valor) {
  const comp = comprobantesPendientesRC[index];
  const saldoComp = parseFloat(comp.saldo || comp.total || 0);
  const m = parseFloat(valor) || 0;
  comp.imputado = Math.min(m, saldoComp);
  calcularTotalesRC();
}

function agregarFilaRetencion() {
  const idRow = Date.now();
  const tbody = document.getElementById('rc-retenciones-tbody');
  const tr = document.createElement('tr');
  tr.id = `ret-row-${idRow}`;
  tr.innerHTML = `
    <td class="p-2">
      <select class="w-full border rounded p-1 text-xs" onchange="calcularTotalesRC()">
        <option value="IIBB">Retención IIBB Sufrida</option>
        <option value="GANANCIAS">Retención Ganancias Sufrida</option>
        <option value="IVA">Retención IVA Sufrida</option>
        <option value="SUSS">Retención SUSS Sufrida</option>
      </select>
    </td>
    <td class="p-2">
      <input type="text" placeholder="N° Certificado" class="w-full border rounded p-1 text-xs" />
    </td>
    <td class="p-2 text-right">
      <input type="number" step="0.01" min="0" value="0.00" oninput="calcularTotalesRC()" class="ret-monto w-full text-right font-mono border rounded p-1 text-xs" />
    </td>
    <td class="p-2 text-center">
      <button type="button" onclick="eliminarFilaRetencion('${idRow}')" class="text-red-500 hover:text-red-700">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
  if (window.lucide) lucide.createIcons();
  calcularTotalesRC();
}

function eliminarFilaRetencion(idRow) {
  const row = document.getElementById(`ret-row-${idRow}`);
  if (row) row.remove();
  calcularTotalesRC();
}

function calcularTotalesRC() {
  const totalImputado = comprobantesPendientesRC.reduce((acc, c) => acc + (c.imputado || 0), 0);

  let totalRetenciones = 0;
  document.querySelectorAll('.ret-monto').forEach(input => {
    totalRetenciones += parseFloat(input.value) || 0;
  });

  const netoPercibido = Math.max(0, totalImputado - totalRetenciones);

  const elImp = document.getElementById('rc-resumen-imputado');
  const elRet = document.getElementById('rc-resumen-retenciones');
  const elNet = document.getElementById('rc-resumen-neto');

  if (elImp) elImp.innerText = `$${totalImputado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  if (elRet) elRet.innerText = `-$${totalRetenciones.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  if (elNet) elNet.innerText = `$${netoPercibido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  return { totalImputado, totalRetenciones, netoPercibido };
}

async function guardarReciboCobro() {
  const clienteId = document.getElementById('rc-cliente-select').value;
  const fecha = document.getElementById('rc-fecha').value;
  const numero = document.getElementById('rc-numero').value;
  const medioCobro = document.getElementById('rc-medio-cobro').value;
  const observaciones = document.getElementById('rc-observaciones').value;

  const { totalImputado, totalRetenciones, netoPercibido } = calcularTotalesRC();

  if (!clienteId) return alert('Seleccione un cliente.');
  if (totalImputado <= 0) return alert('Debe imputar al menos un comprobante de venta.');
  if (totalRetenciones > totalImputado) return alert('Las retenciones no pueden superar el total de facturas imputadas.');

  const retencionesPayload = [];
  document.querySelectorAll('#rc-retenciones-tbody tr').forEach(tr => {
    const tipo = tr.querySelector('select').value;
    const cert = tr.querySelector('input[type="text"]').value;
    const monto = parseFloat(tr.querySelector('.ret-monto').value) || 0;
    if (monto > 0) {
      retencionesPayload.push({ tipo, certificado: cert, importe: monto });
    }
  });

  try {
    const { data: { user } } = await db.auth.getUser();

    // 1. Asiento Contable Automático de Cobranza
    const clienteObj = padronContactos.find(c => String(c.id) === String(clienteId));
    const nombreCliente = clienteObj ? clienteObj.razon_social : 'Cliente';
    const glosa = `Cobranza ${numero} -${nombreCliente}`;

    const { data: asientoData, error: asientoError } = await db
      .from('asientos')
      .insert([{ fecha, concepto: glosa, user_id: user?.id || null }])
      .select()
      .single();

    if (asientoError) throw asientoError;
    const asientoId = asientoData.id;

    const renglones = [];
    let cuentaDisponibilidad = 'Banco Cuentas Corrientes';
    if (medioCobro === 'EF') {
      cuentaDisponibilidad = 'Caja Central';
    } else if (medioCobro.startsWith('TJ')) {
      cuentaDisponibilidad = 'Cupones a Acreditar (Tarjetas)';
    }
    
    if (netoPercibido > 0) {
      renglones.push({
        asiento_id: asientoId,
        cuenta_nombre: cuentaDisponibilidad,
        debe: netoPercibido,
        haber: 0,
        detalle: `Cobro según ${numero}`
      });
    }

    retencionesPayload.forEach(r => {
      renglones.push({
        asiento_id: asientoId,
        cuenta_nombre: `Retenciones Sufridas ${r.tipo}`,
        debe: r.importe,
        haber: 0,
        detalle: `Cert. ${r.certificado || 'S/D'}`
      });
    });

    renglones.push({
      asiento_id: asientoId,
      cuenta_nombre: 'Deudores por Ventas',
      debe: 0,
      haber: totalImputado,
      detalle: `Cancelación facturas ${nombreCliente}`
    });

    const { error: renglonesError } = await db.from('asiento_detalles').insert(renglones);
    if (renglonesError) throw renglonesError;

    // 2. Cabecera Recibo de Cobro
    const { data: reciboData, error: reciboError } = await db
      .from('recibos_cobro')
      .insert([{
        numero: numero,
        fecha: fecha,
        cliente_id: clienteId,
        total_cobrado: totalImputado,
        total_retenciones: totalRetenciones,
        total_neto_percibido: netoPercibido,
        medio_cobro: medioCobro,
        retenciones_sufridas: retencionesPayload,
        observaciones: observaciones,
        asiento_id: asientoId
      }])
      .select()
      .single();

    if (reciboError) throw reciboError;

    // 3. Imputación de comprobantes
    const comprobantesAfectados = comprobantesPendientesRC.filter(c => (c.imputado || 0) > 0);
    const detallesPayload = comprobantesAfectados.map(c => ({
      recibo_id: reciboData.id,
      comprobante_venta_id: c.id,
      importe_imputado: c.imputado
    }));

    const { error: detError } = await db.from('recibo_cobro_detalles').insert(detallesPayload);
    if (detError) throw detError;

    for (const c of comprobantesAfectados) {
      const saldoOriginal = parseFloat(c.saldo !== undefined ? c.saldo : c.total);
      const nuevoSaldo = Math.max(0, saldoOriginal - Number(c.imputado));
      const updateData = { saldo: nuevoSaldo };
      if (nuevoSaldo <= 0.01) updateData.estado_cobro = 'Cobrado';
      await db.from('comprobantes_venta').update(updateData).eq('id', c.id);
    }

    // 4. Inserción de cupón si el cobro fue con tarjeta
    if (medioCobro.startsWith('TJ')) {
      const tarjetaMarca = document.getElementById('rc-cupon-marca')?.value || 'Visa';
      const numCupon = document.getElementById('rc-cupon-numero')?.value.trim() || String(Date.now()).slice(-4);
      const terminal = document.getElementById('rc-cupon-terminal')?.value.trim() || '001';
      const lote = document.getElementById('rc-cupon-lote')?.value.trim() || '01';
      const cuotas = parseInt(document.getElementById('rc-cupon-cuotas')?.value || '1', 10);
      const tipoTarjeta = medioCobro === 'TJ_DEB' ? 'DEBITO' : 'CREDITO';

      await db.from('cupones_tarjeta').insert([{
        fecha: fecha,
        recibo_cobro_id: reciboData.id,
        cliente: nombreCliente,
        tarjeta: tarjetaMarca,
        tipo: tipoTarjeta,
        terminal: terminal,
        lote: lote,
        numero_cupon: numCupon,
        cuotas: cuotas,
        monto_bruto: netoPercibido,
        estado: 'PENDIENTE'
      }]);
    }

    showToast(`¡Recibo ${numero} emitido con éxito! Asiento generado.`);
    limpiarFormularioRecibo();
    renderHistorialRC();
    await cargarFacturasDesdeSupabase();
    if (typeof renderLibroDiario === 'function') await renderLibroDiario();
    if (typeof actualizarDashboardMetrics === 'function') await actualizarDashboardMetrics();
  } catch (err) {
    console.error('Error al registrar recibo de cobro:', err);
    alert(`Ocurrió un error: ${err.message}`);
  }
}

function limpiarFormularioRecibo() {
  const sel = document.getElementById('rc-cliente-select');
  if (sel) sel.value = '';
  const obs = document.getElementById('rc-observaciones');
  if (obs) obs.value = '';
  const tbRet = document.getElementById('rc-retenciones-tbody');
  if (tbRet) tbRet.innerHTML = '';
  const tbFac = document.getElementById('rc-facturas-tbody');
  if (tbFac) tbFac.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">Seleccione un cliente para consultar deudas pendientes.</td></tr>';
  
  const pnlCupon = document.getElementById('rc-panel-cupon');
  if (pnlCupon) pnlCupon.classList.add('hidden');

  comprobantesPendientesRC = [];
  calcularTotalesRC();
  generarProximoNumeroRC();
}

async function descargarPDFRecibo(reciboId) {
  if (!window.jspdf) return alert('Librería jsPDF no disponible.');

  try {
    const { data: rc, error } = await db
      .from('recibos_cobro')
      .select('*, clientes_proveedores(razon_social, cuit, condicion_iva)')
      .eq('id', reciboId)
      .single();

    if (error || !rc) throw error;

    const cliente = rc.clientes_proveedores || {};
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    dibujarMembretePDF(doc, 'RECIBO DE COBRO', rc.numero, rc.fecha);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 14, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${cliente.razon_social || 'Cliente'}`, 14, 50);
    doc.text(`CUIT: ${cliente.cuit || 'S/D'}`, 14, 55);
    doc.text(`Condición IVA: ${cliente.condicion_iva || 'Consumidor Final'}`, 120, 50);
    doc.text(`Medio de Cobro: ${rc.medio_cobro}`, 120, 55);

    const retenciones = rc.retenciones_sufridas || [];
    let cuerpoTabla = [
      ['Total Facturas Canceladas', `$ ${parseFloat(rc.total_cobrado).toLocaleString('es-AR', {minimumFractionDigits: 2})}`]
    ];

    retenciones.forEach(r => {
      cuerpoTabla.push([
        `Retención Sufrida: ${r.tipo} (Cert.${r.certificado || 'S/D'})`,
        `-$ ${parseFloat(r.importe).toLocaleString('es-AR', {minimumFractionDigits: 2})}`
      ]);
    });

    cuerpoTabla.push([
      'NETO PERCIBIDO (DISPONIBILIDADES)',
      `$ ${parseFloat(rc.total_neto_percibido).toLocaleString('es-AR', {minimumFractionDigits: 2})}`
    ]);

    doc.autoTable({
      startY: 62,
      head: [['Concepto / Imputación', 'Importe ($)']],
      body: cuerpoTabla,
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    if (rc.observaciones) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Observaciones: ${rc.observaciones}`, 14, finalY);
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(datosEmpresaActual?.leyenda_comprobantes || 'Comprobante emitido mediante Suite Contable', 105, 280, { align: 'center' });

    doc.save(`Recibo_${rc.numero}.pdf`);
  } catch (err) {
    console.error('Error al generar PDF de Recibo:', err);
    alert('Error al generar el PDF del recibo.');
  }
}

let listaHistorialRC = [];

async function renderHistorialRC() {
  const tbody = document.getElementById('tbody-rc-historial');
  if (!tbody) return;

  try {
    const { data, error } = await db
      .from('recibos_cobro')
      .select('*, clientes_proveedores(razon_social, cuit)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    listaHistorialRC = data || [];

    const filtro = (document.getElementById('rc-buscar-historial')?.value || '').toLowerCase();
    const filtrados = listaHistorialRC.filter(r => {
      const cli = (r.clientes_proveedores?.razon_social || '').toLowerCase();
      const num = (r.numero || '').toLowerCase();
      return cli.includes(filtro) || num.includes(filtro);
    });

    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">No hay recibos registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = filtrados.map(rc => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-3 font-bold text-slate-900">${rc.numero}<div class="text-[11px] font-normal text-slate-400">${rc.fecha}</div></td>
        <td class="p-3 font-semibold text-slate-800">${rc.clientes_proveedores?.razon_social || 'Cliente'}<div class="text-[11px] font-normal text-slate-400">CUIT: ${rc.clientes_proveedores?.cuit || 'S/D'}</div></td>
        <td class="p-3"><span class="px-2 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200">${rc.medio_cobro}</span></td>         <td class="p-3 text-right font-mono text-slate-600">$${parseFloat(rc.total_cobrado).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-right font-mono text-rose-600">-$${parseFloat(rc.total_retenciones).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>         <td class="p-3 text-right font-mono font-bold text-indigo-700">$${parseFloat(rc.total_neto_percibido).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-center">
          <button onclick="descargarPDFRecibo('${rc.id}')" class="text-indigo-600 hover:text-indigo-800 font-bold p-1 cursor-pointer" title="Descargar PDF">📄 PDF</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error cargando historial de recibos:', err);
  }
}

// ==========================================
// MOTOR 3: CONCILIADOR BANCARIO (Fuzzy Engine)
// ==========================================
let resultadoConciliacionGlobal = null;

function ejecutarConciliacionBancaria() {
  const fileBanco = document.getElementById('file-banco-csv')?.files[0];
  const fileLibro = document.getElementById('file-libro-csv')?.files[0];

  if (fileBanco && fileLibro) {
    Promise.all([leerArchivoCSV(fileBanco), leerArchivoCSV(fileLibro)])
      .then(([datosBanco, datosLibro]) => {
        procesarCruzeFuzzy(datosBanco, datosLibro);
      })
      .catch(err => alert("Error al leer los archivos: " + err));
  } else {
    runConciliationDemo();
  }
}

function leerArchivoCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const lineas = e.target.result.split('\n').filter(l => l.trim().length > 0);
      const registros = lineas.slice(1).map(l => {
        const cols = l.split(',').map(c => c.replace(/"/g, '').trim());
        return {
          fecha: cols[0] || '',
          concepto: cols[1] || 'Sin concepto',
          monto: parseFloat(cols[2]) || 0
        };
      });
      resolve(registros);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function runConciliationDemo() {
  const bankData = [
    { fecha: '2026-09-10', concepto: 'DEP. TRANSFERENCIA 458', monto: 150000.00 },
    { fecha: '2026-09-12', concepto: 'PAGO PROVEEDOR REX', monto: -45000.00 },
    { fecha: '2026-09-18', concepto: 'COMISION BANCARIA MANTENIMIENTO', monto: -4500.00 },
    { fecha: '2026-09-20', concepto: 'DEPOSITO CHEQUE 48HS', monto: 88000.00 }
  ];

  const bookData = [
    { fecha: '2026-09-10', concepto: 'Cobro Cliente Perez', monto: 150000.00 },
    { fecha: '2026-09-15', concepto: 'Pago REX Pinturas', monto: -45000.00 },
    { fecha: '2026-09-22', concepto: 'Transferencia emitida Sueldos', monto: -210000.00 }
  ];

  procesarCruzeFuzzy(bankData, bookData);
}

function calcularSimilitudTexto(str1, str2) {
  const s1 = (str1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = (str2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (s1 === s2) return 100;
  const palabras1 = s1.split(' ');
  let coincidencias = 0;

  palabras1.forEach(p1 => {
    if (p1.length > 2 && s2.includes(p1)) coincidencias++;
  });

  return Math.min(100, Math.round((coincidencias / Math.max(palabras1.length, 1)) * 100));
}

function procesarCruzeFuzzy(banco, libro) {
  const umbralTexto = parseInt(document.getElementById('param-umbral-texto')?.value || '80');
  const margenDias = parseInt(document.getElementById('param-margen-dias')?.value || '3');

  const coincidentes = [];
  const pendientesBanco = [];
  const libroCopia = [...libro];

  banco.forEach(itemB => {
    let matchIndex = -1;

    for (let i = 0; i < libroCopia.length; i++) {
      const itemL = libroCopia[i];
      if (Math.abs(itemB.monto - itemL.monto) < 0.01) {
        const diffDias = Math.abs(new Date(itemB.fecha) - new Date(itemL.fecha)) / (1000 * 60 * 60 * 24);
        if (isNaN(diffDias) || diffDias <= margenDias) {
          const sim = calcularSimilitudTexto(itemB.concepto, itemL.concepto);
          if (sim >= (umbralTexto - 30)) { 
            matchIndex = i;
            break;
          }
        }
      }
    }

    if (matchIndex !== -1) {
      coincidentes.push({ banco: itemB, libro: libroCopia[matchIndex] });
      libroCopia.splice(matchIndex, 1);
    } else {
      pendientesBanco.push(itemB);
    }
  });

  resultadoConciliacionGlobal = { coincidentes, pendientesBanco, pendientesLibro: libroCopia };
  renderResultadosConciliacion();
}

function renderResultadosConciliacion() {
  if (!resultadoConciliacionGlobal) return;
  const { coincidentes, pendientesBanco, pendientesLibro } = resultadoConciliacionGlobal;

  const panelResumen = document.getElementById('panel-resumen-conciliacion');
  if (panelResumen) panelResumen.classList.remove('hidden');

  const elStatCoinc = document.getElementById('stat-coincidentes');
  const elStatPendB = document.getElementById('stat-pend-banco');
  const elStatPendL = document.getElementById('stat-pend-libro');

  if (elStatCoinc) elStatCoinc.textContent = coincidentes.length;
  if (elStatPendB) elStatPendB.textContent = pendientesBanco.length;
  if (elStatPendL) elStatPendL.textContent = pendientesLibro.length;

  const btnExp = document.getElementById('btn-exportar-conciliacion');
  if (btnExp) {
    btnExp.disabled = false;
    btnExp.className = "bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm";
  }

  const contenedor = document.getElementById('contenedor-resultado-conciliacion');
  if (!contenedor) return;

  contenedor.className = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 text-xs";

  let html = `<div class="p-4 bg-slate-50 font-bold text-slate-700 flex justify-between items-center"><span>Detalle del Resultado de la Conciliación</span></div>`;

  html += `<div class="p-3 bg-emerald-50/50 font-semibold text-emerald-800 flex items-center gap-2"><span>✅ Coincidencias Confirmadas</span> <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">${coincidentes.length}</span></div>`;
  if (coincidentes.length === 0) {
    html += `<div class="p-3 text-slate-400 italic">No se encontraron movimientos coincidentes.</div>`;
  } else {
    coincidentes.forEach(c => {
      html += `
        <div class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-slate-100 text-slate-700">
          <div><strong>Banco:</strong> ${c.banco.fecha} | ${c.banco.concepto} \vert{} <span class="font-mono font-bold text-slate-900">$ ${c.banco.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></div>
          <div><strong>Libro:</strong> ${c.libro.fecha} | ${c.libro.concepto} \vert{} <span class="font-mono font-bold text-slate-900">$ ${c.libro.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></div>
        </div>
      `;
    });
  }

  html += `<div class="p-3 bg-amber-50/50 font-semibold text-amber-800 flex items-center gap-2"><span>⚠ Solo en Extracto Bancario</span> <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px]">${pendientesBanco.length}</span></div>`;
  if (pendientesBanco.length === 0) {
    html += `<div class="p-3 text-slate-400 italic">No hay movimientos pendientes en el banco.</div>`;
  } else {
    pendientesBanco.forEach(b => {
      html += `<div class="p-3 flex justify-between items-center text-slate-700 border-b border-slate-100"><span>${b.fecha} - ${b.concepto}</span><span class="font-mono font-bold">$ ${b.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></div>`;
    });
  }

  html += `<div class="p-3 bg-rose-50/50 font-semibold text-rose-800 flex items-center gap-2"><span>⚠️ Solo en Libro Contable</span> <span class="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px]">${pendientesLibro.length}</span></div>`;
  if (pendientesLibro.length === 0) {
    html += `<div class="p-3 text-slate-400 italic">No hay movimientos pendientes en el libro.</div>`;
  } else {
    pendientesLibro.forEach(l => {
      html += `<div class="p-3 flex justify-between items-center text-slate-700 border-b border-slate-100"><span>${l.fecha} - ${l.concepto}</span><span class="font-mono font-bold">$ ${l.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></div>`;
    });
  }

  contenedor.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

function exportarInformeConciliacionCSV() {
  if (!resultadoConciliacionGlobal) return;
  let csv = 'Estado,Origen,Fecha,Concepto,Monto\n';

  resultadoConciliacionGlobal.coincidentes.forEach(c => {
    csv += `"Coincidente","Banco",${c.banco.fecha},"${c.banco.concepto}",${c.banco.monto}\n`;
    csv += `"Coincidente","Libro",${c.libro.fecha},"${c.libro.concepto}",${c.libro.monto}\n`;
  });

  resultadoConciliacionGlobal.pendientesBanco.forEach(b => {
    csv += `"Pendiente Banco","Banco",${b.fecha},"${

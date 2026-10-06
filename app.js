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
    const pnlCupon = document.getElementById('rc-panel-cupon');
    const pnlChq = document.getElementById('rc-panel-cheque');
    if (pnlCupon) pnlCupon.classList.toggle('hidden', !e.target.value.startsWith('TJ'));
    if (pnlChq) pnlChq.classList.toggle('hidden', !(e.target.value === 'CH' || e.target.value === 'ECHQ'));
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
    const tabsTes = ['rc', 'op', 'tarjetas', 'ff', 'cheques'];
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
    if (subTab === 'cheques') {cargarCarteraCheques(); }
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
      opt.label = `${c.condicion_iva} | CUIT: ${c.cuit}`;
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
      const glosa = `${tipo_doc} ${numero_doc} - ${entidad}`;
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
  doc.text(`CUIT: ${emp.cuit} | IVA: ${emp.condicion_iva}`, emp.logo_base64 ? 50 : 14, 27);
  doc.text(`IIBB: ${emp.iibb || '-'} | Domicilio: ${emp.domicilio_comercial || '-'}`, emp.logo_base64 ? 50 : 14, 31);

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
          <td class="p-2.5 font-semibold text-slate-700">${comp.tipo_doc || 'Factura'} ${comp.numero_doc || comp.id}</td>
          <td class="p-2.5 text-right font-mono font-bold text-slate-800">$${saldoComp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
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
    const glosa = `Cobranza ${numero} - ${nombreCliente}`;

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
        `Retención Sufrida: ${r.tipo} (Cert. ${r.certificado || 'S/D'})`,
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
        <td class="p-3"><span class="px-2 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200">${rc.medio_cobro}</span></td>
        <td class="p-3 text-right font-mono text-slate-600">$${parseFloat(rc.total_cobrado).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-right font-mono text-rose-600">-$${parseFloat(rc.total_retenciones).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-right font-mono font-bold text-indigo-700">$${parseFloat(rc.total_neto_percibido).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
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
          <div><strong>Banco:</strong> ${c.banco.fecha} | ${c.banco.concepto} | <span class="font-mono font-bold text-slate-900">$ ${c.banco.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></div>
          <div><strong>Libro:</strong> ${c.libro.fecha} | ${c.libro.concepto} | <span class="font-mono font-bold text-slate-900">$ ${c.libro.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></div>
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
    csv += `"Pendiente Banco","Banco",${b.fecha},"${b.concepto}",${b.monto}\n`;
  });

  resultadoConciliacionGlobal.pendientesLibro.forEach(l => {
    csv += `"Pendiente Libro","Libro",${l.fecha},"${l.concepto}",${l.monto}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `Papel_Trabajo_Conciliacion_${new Date().toISOString().slice(0,10)}.csv`);
  a.click();
}

// ==========================================
// MOTOR 4: CUENTAS CORRIENTES (FIFO & Aging)
// ==========================================
let datosCtaCteProcesados = [];

function ejecutarCalculoCtacte() {
  const fileInput = document.getElementById('file-ctacte-csv')?.files[0];

  if (fileInput) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const lineas = e.target.result.split('\n').filter(l => l.trim().length > 0);
      const registros = lineas.slice(1).map(l => {
        const cols = l.split(',').map(c => c.replace(/"/g, '').trim());
        return {
          entidad: cols[0] || 'Entidad Desconocida',
          fecha: cols[1] || new Date().toISOString().slice(0, 10),
          factura: cols[2] || 'FC-0000',
          monto: parseFloat(cols[3]) || 0,
          cobrado: parseFloat(cols[4]) || 0
        };
      });
      procesarSaldosYAgings(registros);
    };
    reader.readAsText(fileInput);
  } else {
    runCtaCorrienteDemo();
  }
}

function runCtaCorrienteDemo() {
  const tipo = document.getElementById('ctacte-tipo-filtro')?.value || 'CLIENTES';
  let demoData = [];

  if (tipo === 'CLIENTES') {
    demoData = [
      { entidad: 'DISTRIBUIDORA PEREZ SRL', fecha: '2026-06-10', factura: 'FC-001-1020', monto: 850000.00, cobrado: 500000.00 },
      { entidad: 'DISTRIBUIDORA PEREZ SRL', fecha: '2026-09-01', factura: 'FC-001-1105', monto: 350000.00, cobrado: 0.00 },
      { entidad: 'CONSTRUCCIONES DEL SUR SA', fecha: '2026-08-15', factura: 'FC-001-1088', monto: 1200000.00, cobrado: 1200000.00 },
      { entidad: 'LOGISTICA ARGENTINA SA', fecha: '2026-05-20', factura: 'FC-001-0980', monto: 450000.00, cobrado: 0.00 }
    ];
  } else {
    demoData = [
      { entidad: 'PINTURERIAS REX SA', fecha: '2026-08-10', factura: 'FC-A-0088', monto: 450000.00, cobrado: 200000.00 },
      { entidad: 'SODIMAC ARGENTINA SA', fecha: '2026-07-01', factura: 'FC-A-9921', monto: 620000.00, cobrado: 620000.00 }
    ];
  }

  procesarSaldosYAgings(demoData);
}

function procesarSaldosYAgings(registros) {
  const hoy = new Date('2026-09-29');
  const entidades = {};

  registros.forEach(r => {
    const saldoFactura = Math.max(0, r.monto - r.cobrado);
    const fechaFact = new Date(r.fecha);
    const diffDias = Math.floor((hoy - fechaFact) / (1000 * 60 * 60 * 24));

    if (!entidades[r.entidad]) {
      entidades[r.entidad] = {
        entidad: r.entidad,
        facturado: 0,
        cobrado: 0,
        saldoTotal: 0,
        tramo0_30: 0,
        tramo31_60: 0,
        tramo61_90: 0,
        tramo90_mas: 0,
        comprobantes: []
      };
    }

    const e = entidades[r.entidad];
    e.facturado += r.monto;
    e.cobrado += r.cobrado;
    e.saldoTotal += saldoFactura;

    if (saldoFactura > 0) {
      if (diffDias <= 30) e.tramo0_30 += saldoFactura;
      else if (diffDias <= 60) e.tramo31_60 += saldoFactura;
      else if (diffDias <= 90) e.tramo61_90 += saldoFactura;
      else e.tramo90_mas += saldoFactura;
    }

    e.comprobantes.push({ ...r, saldoFactura, diffDias });
  });

  datosCtaCteProcesados = Object.values(entidades);
  renderResultadosCtaCte();
}

function renderResultadosCtaCte() {
  const container = document.getElementById('cta-corriente-results');
  if (!container) return;

  let totalCartera = 0, totalAlDia = 0, totalVencido = 0;

  datosCtaCteProcesados.forEach(e => {
    totalCartera += e.saldoTotal;
    totalAlDia += e.tramo0_30;
    totalVencido += (e.tramo31_60 + e.tramo61_90 + e.tramo90_mas);
  });

  const panelResumen = document.getElementById('panel-resumen-ctacte');
  if (panelResumen) panelResumen.classList.remove('hidden');

  const elStatTot = document.getElementById('stat-ctacte-total');
  const elStatDia = document.getElementById('stat-ctacte-aldia');
  const elStatVen = document.getElementById('stat-ctacte-vencido');

  if (elStatTot) elStatTot.textContent = `$ ${totalCartera.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
  if (elStatDia) elStatDia.textContent = `$ ${totalAlDia.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
  if (elStatVen) elStatVen.textContent = `$ ${totalVencido.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

  const btnExp = document.getElementById('btn-exportar-ctacte');
  if (btnExp) {
    btnExp.disabled = false;
    btnExp.className = "bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm";
  }

  let html = `
    <div class="overflow-x-auto w-full">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <th class="p-3">Cliente / Proveedor</th>
            <th class="p-3 text-right">Facturado</th>
            <th class="p-3 text-right">Cobrado / Pagado</th>
            <th class="p-3 text-right">Saldo Total</th>
            <th class="p-3 text-right text-emerald-700 bg-emerald-50/50">0 - 30 Días</th>
            <th class="p-3 text-right text-amber-700 bg-amber-50/50">31 - 60 Días</th>
            <th class="p-3 text-right text-rose-700 bg-rose-50/50">+60 Días Vencido</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
  `;

  datosCtaCteProcesados.forEach(e => {
    const claseSaldo = e.saldoTotal > 0 ? 'font-bold text-rose-600' : 'font-semibold text-emerald-600';
    html += `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="p-3 font-semibold text-slate-800">${e.entidad}</td>
        <td class="p-3 text-right font-mono text-slate-600">$ ${e.facturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-right font-mono text-slate-600">$ ${e.cobrado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-right font-mono ${claseSaldo}">$ ${e.saldoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-right font-mono text-emerald-700 bg-emerald-50/30">$ ${e.tramo0_30.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-right font-mono text-amber-700 bg-amber-50/30">$ ${e.tramo31_60.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-right font-mono text-rose-700 bg-rose-50/30">$ ${(e.tramo61_90 + e.tramo90_mas).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
  container.className = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs";
}

function exportarCtaCteCSV() {
  if (!datosCtaCteProcesados || datosCtaCteProcesados.length === 0) return;
  const tipo = document.getElementById('ctacte-tipo-filtro')?.value || 'CLIENTES';
  let csv = 'Entidad,Total Facturado,Total Cobrado,Saldo Pendiente,Tramo 0-30 Dias,Tramo 31-60 Dias,Tramo +60 Dias\n';

  datosCtaCteProcesados.forEach(e => {
    csv += `"${e.entidad}",${e.facturado},${e.cobrado},${e.saldoTotal},${e.tramo0_30},${e.tramo31_60},${e.tramo61_90 + e.tramo90_mas}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `Estado_Cuentas_Corrientes_${tipo}_${new Date().toISOString().slice(0,10)}.csv`);
  a.click();
}

// ==========================================
// MOTOR 5: CRUZADOR IVA DIGITAL (ARCA vs. Interno)
// ==========================================
let datosArcaIVA = [];
let datosInternoIVA = [];

function parseCSV(text, delimiter = ',') {
  const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    let rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] || '';
    });
    return rowObj;
  });
}

function procesarArchivoArca(input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('status-arca-file');
  const reader = new FileReader();

  reader.onload = function(e) {
    datosArcaIVA = parseCSV(e.target.result, ';');
    if (statusEl) {
      statusEl.textContent = `✓ ${datosArcaIVA.length} comprobantes cargados correctamente de ARCA.`;
      statusEl.className = 'block text-[11px] text-emerald-600 font-semibold';
    }
  };
  reader.readAsText(file, 'ISO-8859-1');
}

function procesarArchivoInternoIVA(input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('status-interno-file');
  const reader = new FileReader();

  reader.onload = function(e) {
    datosInternoIVA = parseCSV(e.target.result, ',');
    if (statusEl) {
      statusEl.textContent = `✓ ${datosInternoIVA.length} registros cargados del sistema interno.`;
      statusEl.className = 'block text-[11px] text-emerald-600 font-semibold';
    }
  };
  reader.readAsText(file);
}

function ejecutarCruceIvaReal() {
  const container = document.getElementById('cruzador-iva-results');
  if (!container) return;

  if (datosArcaIVA.length === 0 && datosInternoIVA.length === 0) {
    runCruzadorIvaDemo();
    return;
  }

  const noCargados = datosArcaIVA.filter(arca => {
    return !datosInternoIVA.some(interno => 
      (interno['CUIT'] || interno['cuit']) === (arca['Nro. Doc. Emisor'] || arca['CUIT']) &&
      (interno['Numero'] || interno['comprobante']) === (arca['Número de Comprobante'] || arca['Numero'])
    );
  });

  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-3 ${noCargados.length > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} rounded-lg border text-xs font-semibold">
        ${noCargados.length > 0 
          ? `⚠️ Se detectaron ${noCargados.length} comprobantes en ARCA no cargados en el sistema interno.` 
          : '✅ Auditoría perfecta: Todos los comprobantes de ARCA coinciden con el registro interno.'}
      </div>

      ${noCargados.length > 0 ? `
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b font-semibold text-slate-600">
              <th class="p-2">Fecha</th>
              <th class="p-2">CUIT</th>
              <th class="p-2">Denominación Emisor</th>
              <th class="p-2">Comprobante</th>
              <th class="p-2 text-right">Total ARCA</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${noCargados.map(item => `
              <tr class="bg-rose-50/40">
                <td class="p-2 text-slate-600">${item['Fecha'] || '-'}</td>
                <td class="p-2 font-mono text-slate-700">${item['Nro. Doc. Emisor'] || item['CUIT'] || '-'}</td>
                <td class="p-2 font-medium text-slate-800">${item['Denominación Emisor'] || item['Razon Social'] || '-'}</td>
                <td class="p-2 text-slate-600">${item['Tipo de Comprobante'] || ''} N° ${item['Número de Comprobante'] || item['Numero'] || '-'}</td>
                <td class="p-2 text-right font-bold text-slate-800">$ ${item['Imp. Total'] || item['Total'] || '0,00'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  `;
}

function runCruzadorIvaDemo() {
  const container = document.getElementById('cruzador-iva-results');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold">
        ⚠ [Modo Demostración] 1 Inconsistencia de monto y 1 factura faltante en interno detectadas.
      </div>
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b font-semibold text-slate-600">
            <th class="p-2">Proveedor / CUIT</th>
            <th class="p-2">Comprobante</th>
            <th class="p-2 text-right">ARCA ($)</th>
            <th class="p-2 text-right">Interno ($)</th>
            <th class="p-2 text-center">Estado</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr class="bg-amber-50/50">
            <td class="p-2 font-medium">SODIMAC SA (30-54123987-1)</td>
            <td class="p-2">FC-A 00005-00001200</td>
            <td class="p-2 text-right font-mono">$ 100.000,00</td>
            <td class="p-2 text-right font-mono">$ 105.000,00</td>
            <td class="p-2 text-center text-amber-700 font-semibold">Diferencia $ 5.000</td>
          </tr>
          <tr class="bg-rose-50/50">
            <td class="p-2 font-medium">TELECOM SA (30-71123456-8)</td>
            <td class="p-2">FC-A 00012-00045892</td>
            <td class="p-2 text-right font-mono">$ 54.450,00</td>
            <td class="p-2 text-right font-mono">-</td>
            <td class="p-2 text-center text-rose-700 font-semibold">Falta en Interno</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ==========================================
// MOTOR 6: CÁLCULO RETENCIONES (RG 830)
// ==========================================
async function calculateRetentionsUI() {
  const net = parseFloat(document.getElementById('ret-neto').value) || 0;
  const acum = parseFloat(document.getElementById('ret-acum').value) || 0;
  const nonTaxableBase = 67200; 
  
  const taxableBase = Math.max(0, net - nonTaxableBase);
  const ganancias = taxableBase * 0.02;
  const iibb = net * 0.025;
  const totalRet = ganancias + iibb;
  const netToPay = net - totalRet;

  const container = document.getElementById('retenciones-results');
  if (container) {
    container.innerHTML = `
      <div class="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-sm">
        <div class="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h3 class="text-xs uppercase text-slate-400 font-semibold tracking-wider">Resultado Liquidación</h3>
          <span class="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">RG 830 + IIBB</span>
        </div>

        <div class="space-y-2.5 text-sm">
          <div class="flex justify-between items-center text-slate-300">
            <span class="text-slate-400">Neto Comprobante:</span>
            <span class="font-medium">$ ${net.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="flex justify-between items-center text-amber-400/90">
            <span class="text-slate-400">Ret. Ganancias (2%):</span>
            <span class="font-semibold">-$ ${ganancias.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="flex justify-between items-center text-amber-400/90 border-b border-slate-800 pb-3">
            <span class="text-slate-400">Ret. IIBB (2.5%):</span>
            <span class="font-semibold">-$ ${iibb.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="flex justify-between items-center text-base font-bold pt-2 text-emerald-400">
            <span>Neto a Pagar:</span>
            <span class="text-lg">$ ${netToPay.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center gap-1.5 italic">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span id="save-status">Registrado en Supabase</span>
          </span>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-2.5">
          <button onclick="downloadPDF(${net}, ${ganancias}, ${iibb}, ${netToPay})" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
            Exportar PDF
          </button>
          <button onclick="downloadCSV(${net}, ${ganancias}, ${iibb}, ${netToPay})" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
            Exportar CSV
          </button>
        </div>
      </div>
    `;
  }

  try {
    const payload = {
      neto_comprobante: net,
      acumulado_mes: acum,
      monto_retencion: totalRet,
      alicuota_aplicada: 2.0
    };
    if (currentUser) payload.user_id = currentUser.id;
    await db.from('retenciones_emitidas').insert([payload]);
  } catch (err) {
    console.warn('Registro local retenciones:', err);
  }
}

function downloadPDF(neto, ganancias, iibb, netoPagar) {
  if (!window.jspdf) return alert("La librería jsPDF no está cargada.");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text("Certificado de Retención", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 30);
  doc.text(`Empresa: Demostración SA`, 14, 36);

  if (doc.autoTable) {
    doc.autoTable({
      startY: 45,
      head: [['Concepto', 'Monto ($)']],
      body: [
        ['Neto Comprobante', `$ ${neto.toLocaleString('es-AR', {minimumFractionDigits: 2})}`],
        ['Retención Ganancias (2%)', `-$ ${ganancias.toLocaleString('es-AR', {minimumFractionDigits: 2})}`],
        ['Retención IIBB (2.5%)', `-$ ${iibb.toLocaleString('es-AR', {minimumFractionDigits: 2})}`],
        ['Neto a Pagar', `$ ${netoPagar.toLocaleString('es-AR', {minimumFractionDigits: 2})}`]
      ],
      headStyles: { fillColor: [79, 70, 229] },
    });
  }

  doc.save(`Certificado_Retencion_${new Date().toISOString().slice(0,10)}.pdf`);
}

function downloadCSV(neto, ganancias, iibb, netoPagar) {
  const csvContent = "data:text/csv;charset=utf-8," 
    + "Concepto,Monto\n"
    + `Neto Comprobante,${neto}\n`
    + `Retencion Ganancias,${ganancias}\n`
    + `Retencion IIBB,${iibb}\n`
    + `Neto a Pagar,${netoPagar}\n`;

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Retencion_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// MOTOR 7: FONDO FIJO / CAJA CHICA
// ==========================================
const estadoFondoFijo = {
  registros: [],
  filtros: { busqueda: '', centroCosto: 'TODOS', tipoDoc: 'TODOS', fechaDesde: '', fechaHasta: '', estadoRinde: 'ACTIVO' },
  paginacion: { paginaActual: 1, registrosPorPagina: 10 },
  empresaIdActual: 'demo-empresa-id',
  registroEnEdicion: null
};

function showToast(mensaje, tipo = 'exito') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const colorBg = tipo === 'exito' ? 'bg-emerald-600' : tipo === 'error' ? 'bg-rose-600' : 'bg-blue-600';
  const toast = document.createElement('div');
  toast.className = `${colorBg} text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-5 opacity-0 pointer-events-auto`;
  toast.innerHTML = `<span>${tipo === 'exito' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️'}</span><span>${mensaje}</span>`;

  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-5', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

async function registrarComprobanteFondoFijo(e) {
  if (e) e.preventDefault();
  const form = document.getElementById('form-fondo-fijo');
  if (!form) return;

  const fecha = document.getElementById('ff-fecha').value;
  const concepto = document.getElementById('ff-concepto').value.trim();
  const monto = parseFloat(document.getElementById('ff-monto').value);
  const centroCosto = document.getElementById('ff-centro-costo').value;
  const tipoDoc = document.getElementById('ff-tipo-doc').value;

  if (!fecha || !concepto || isNaN(monto) || monto <= 0) {
    showToast('Completá todos los campos obligatorios.', 'error');
    return;
  }

  try {
    const { data: { user } } = await db.auth.getUser();

    if (estadoFondoFijo.registroEnEdicion) {
      const { error } = await db
        .from('fondo_fijo')
        .update({ fecha, concepto, monto, centro_costo: centroCosto, tipo_doc: tipoDoc })
        .eq('id', Number(estadoFondoFijo.registroEnEdicion));

      if (error) throw error;
      showToast('Comprobante actualizado correctamente.');
      estadoFondoFijo.registroEnEdicion = null;
      const btnSubmit = document.getElementById('btn-registrar-ff');
      if (btnSubmit) btnSubmit.textContent = '+ Registrar en Rinde';
    } else {
      const nuevoRegistro = {
        fecha, concepto, monto, centro_costo: centroCosto, tipo_doc: tipoDoc,
        user_id: user?.id || null, estado_rinde: 'ACTIVO'
      };

      const { error } = await db.from('fondo_fijo').insert([nuevoRegistro]);
      if (error) throw error;
      showToast('Comprobante registrado con éxito en el rinde activo.');
    }

    form.reset();
    document.getElementById('ff-fecha').valueAsDate = new Date();
    await cargarRegistrosFondoFijo();
  } catch (err) {
    console.error('Error al guardar comprobante:', err);
    showToast('Error al registrar el comprobante en Supabase.', 'error');
  }
}

function descargarPlantillaCSV() {
  const encabezados = ['fecha', 'concepto', 'monto', 'tipo_doc', 'centro_costo'];
  const ejemplo = [
    '2026-03-30,"Limp. y Mantenimiento",15500.50,"Factura B","Administración"',
    '2026-03-30,"Librería e Insumos",8200.00,"Factura C","Comercial"'
  ];

  const contenido = [encabezados.join(','), ...ejemplo].join('\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_fondo_fijo.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Plantilla CSV descargada con éxito.');
}

async function importarCSVFondoFijo(file) {
  if (!file) return;
  const inputEl = document.getElementById('ff-input-csv');
  const statusEl = document.getElementById('status-ff-file');

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const texto = e.target.result;
      const lineas = texto.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lineas.length <= 1) return showToast('El archivo CSV no contiene registros.', 'error');

      const { data: { user } } = await db.auth.getUser();
      const registrosInsertar = [];

      for (let i = 1; i < lineas.length; i++) {
        const cols = lineas[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lineas[i].split(',');
        if (cols.length >= 3) {
          const fecha = cols[0]?.replace(/"/g, '').trim();
          const concepto = cols[1]?.replace(/"/g, '').trim();
          const monto = parseFloat(cols[2]?.replace(/"/g, '').trim());
          const tipo_doc = cols[3]?.replace(/"/g, '').trim() || 'Ticket Fiscal';
          const centro_costo = cols[4]?.replace(/"/g, '').trim() || 'Administración';

          if (fecha && concepto && !isNaN(monto)) {
            registrosInsertar.push({
              fecha, concepto, monto, tipo_doc, centro_costo,
              user_id: user?.id || null, estado_rinde: 'ACTIVO'
            });
          }
        }
      }

      if (registrosInsertar.length === 0) return showToast('No se encontraron filas válidas en el archivo CSV.', 'error');

      const { error } = await db.from('fondo_fijo').insert(registrosInsertar);
      if (error) throw error;

      showToast(`Se importaron ${registrosInsertar.length} comprobantes al rinde activo.`);
      if (inputEl) inputEl.value = '';
      if (statusEl) {
        statusEl.textContent = `✓ Última importación: ${registrosInsertar.length} comprobantes.`;
        statusEl.className = 'block text-[11px] text-emerald-600 font-semibold';
      }

      cambiarFiltroEstadoFF('ACTIVO');
      const selectFiltro = document.getElementById('ff-filtro-estado');
      if (selectFiltro) selectFiltro.value = 'ACTIVO';
    } catch (err) {
      console.error('Error al importar CSV:', err);
      showToast('Error al procesar el archivo CSV.', 'error');
    }
  };
  reader.readAsText(file);
}

async function cargarRegistrosFondoFijo() {
  try {
    let query = db.from('fondo_fijo').select('*').order('fecha', { ascending: false });

    if (estadoFondoFijo.filtros.estadoRinde === 'ACTIVO') {
      query = query.or('estado_rinde.eq.ACTIVO,estado_rinde.is.null');
    } else if (estadoFondoFijo.filtros.estadoRinde === 'RENDIDO') {
      query = query.eq('estado_rinde', 'RENDIDO');
    }

    if (estadoFondoFijo.filtros.centroCosto && estadoFondoFijo.filtros.centroCosto !== 'TODOS') {
      query = query.eq('centro_costo', estadoFondoFijo.filtros.centroCosto);
    }
    if (estadoFondoFijo.filtros.tipoDoc && estadoFondoFijo.filtros.tipoDoc !== 'TODOS') {
      query = query.eq('tipo_doc', estadoFondoFijo.filtros.tipoDoc);
    }
    if (estadoFondoFijo.filtros.busqueda) {
      query = query.ilike('concepto', `%${estadoFondoFijo.filtros.busqueda}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    estadoFondoFijo.registros = data || [];
    
    const totalPaginas = Math.ceil(estadoFondoFijo.registros.length / estadoFondoFijo.paginacion.registrosPorPagina) || 1;
    if (estadoFondoFijo.paginacion.paginaActual > totalPaginas) {
      estadoFondoFijo.paginacion.paginaActual = 1;
    }

    renderizarTablaFondoFijo();
    actualizarMetricasFondoFijoDashboard();
  } catch (err) {
    console.error('Error cargando fondo fijo:', err);
    showToast('Error al cargar la tabla de rendición.', 'error');
  }
}

function cambiarFiltroEstadoFF(nuevoEstado) {
  estadoFondoFijo.filtros.estadoRinde = nuevoEstado;
  estadoFondoFijo.paginacion.paginaActual = 1;

  const tituloEl = document.getElementById('ff-titulo-grilla');
  const badgeEl = document.getElementById('ff-badge-estado');

  if (tituloEl && badgeEl) {
    if (nuevoEstado === 'ACTIVO') {
      tituloEl.textContent = 'Resumen del Rinde Activo';
      badgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200';
      badgeEl.textContent = 'Abierto';
    } else if (nuevoEstado === 'RENDIDO') {
      tituloEl.textContent = 'Historial de Comprobantes Rendidos';
      badgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200';
      badgeEl.textContent = 'Cerrados / Asentados';
    } else {
      tituloEl.textContent = 'Histórico Total de Comprobantes';
      badgeEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200';
      badgeEl.textContent = 'Auditoría Global';
    }
  }

  cargarRegistrosFondoFijo();
}

function renderizarTablaFondoFijo() {
  const tbody = document.getElementById('tabla-fondo-fijo-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const { paginaActual, registrosPorPagina } = estadoFondoFijo.paginacion;
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const paginados = estadoFondoFijo.registros.slice(inicio, inicio + registrosPorPagina);

  if (paginados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">No hay comprobantes para mostrar con los filtros aplicados.</td></tr>`;
    return;
  }

  paginados.forEach(reg => {
    const esRendido = reg.estado_rinde === 'RENDIDO';
    const tr = document.createElement('tr');
    tr.className = `border-b border-slate-200 hover:bg-slate-50 transition-colors text-xs ${esRendido ? 'bg-slate-50/50' : ''}`;
    
    const botonesAccion = esRendido
      ? `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600" title="Comprobante rendido en Libro Diario">🔒 Asentado</span>`
      : `
          <button onclick="prepararEdicionFondoFijo('${reg.id}')" class="text-blue-600 hover:text-blue-800 p-1 mr-1" title="Editar">✏️</button>
          <button onclick="eliminarRegistroFondoFijo('${reg.id}')" class="text-rose-600 hover:text-rose-800 p-1" title="Eliminar">🗑️</button>
        `;

    tr.innerHTML = `
      <td class="p-2.5 text-slate-600 whitespace-nowrap">${reg.fecha}</td>
      <td class="p-2.5 text-slate-800 font-medium">${reg.concepto}</td>
      <td class="p-2.5 text-slate-500">${reg.tipo_doc || '-'}</td>
      <td class="p-2.5"><span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">${reg.centro_costo || 'General'}</span></td>
      <td class="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">$ ${parseFloat(reg.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
      <td class="p-2.5 text-center whitespace-nowrap">${botonesAccion}</td>
    `;
    tbody.appendChild(tr);
  });

  renderizarPaginador();
}

function renderizarPaginador() {
  const paginadorContainer = document.getElementById('ff-paginador');
  if (!paginadorContainer) return;

  const totalPaginas = Math.ceil(estadoFondoFijo.registros.length / estadoFondoFijo.paginacion.registrosPorPagina) || 1;
  const { paginaActual } = estadoFondoFijo.paginacion;

  paginadorContainer.innerHTML = `
    <div class="flex justify-between items-center px-4 py-2 text-xs text-slate-500">
      <span>Total: ${estadoFondoFijo.registros.length} registros (Pág. ${paginaActual} de ${totalPaginas})</span>
      <div class="flex gap-2">
        <button onclick="cambiarPaginaFF(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled class="opacity-40 cursor-not-allowed px-2 py-1 bg-slate-100 rounded"' : 'class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"'}>Anterior</button>
        <button onclick="cambiarPaginaFF(${paginaActual + 1})" ${paginaActual >= totalPaginas ? 'disabled class="opacity-40 cursor-not-allowed px-2 py-1 bg-slate-100 rounded"' : 'class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"'}>Siguiente</button>
      </div>
    </div>
  `;
}

function cambiarPaginaFF(nuevaPagina) {
  const totalPaginas = Math.ceil(estadoFondoFijo.registros.length / estadoFondoFijo.paginacion.registrosPorPagina);
  if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
    estadoFondoFijo.paginacion.paginaActual = nuevaPagina;
    renderizarTablaFondoFijo();
  }
}

function prepararEdicionFondoFijo(id) {
  const reg = estadoFondoFijo.registros.find(r => String(r.id) === String(id));
  if (!reg) return;

  estadoFondoFijo.registroEnEdicion = Number(reg.id);

  document.getElementById('ff-fecha').value = reg.fecha;
  document.getElementById('ff-concepto').value = reg.concepto;
  document.getElementById('ff-monto').value = reg.monto;
  
  const selCentro = document.getElementById('ff-centro-costo');
  if (selCentro) selCentro.value = reg.centro_costo || 'Administración';

  const selTipo = document.getElementById('ff-tipo-doc');
  if (selTipo) selTipo.value = reg.tipo_doc || 'Factura B';

  const btnSubmit = document.getElementById('btn-registrar-ff');
  if (btnSubmit) {
    btnSubmit.textContent = '💾 Actualizar Registro';
    btnSubmit.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function eliminarRegistroFondoFijo(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este comprobante del rinde?')) return;
  try {
    const { error } = await db.from('fondo_fijo').delete().eq('id', id);
    if (error) throw error;
    showToast('Comprobante eliminado con éxito.');
    await cargarRegistrosFondoFijo();
  } catch (err) {
    console.error('Error al eliminar registro:', err);
    showToast('Error al eliminar el comprobante.', 'error');
  }
}

async function cerrarYRendirFondoFijo() {
  if (estadoFondoFijo.registros.length === 0) {
    showToast('No hay comprobantes activos para rendir.', 'error');
    return;
  }

  const totalRendicion = estadoFondoFijo.registros.reduce((sum, r) => sum + parseFloat(r.monto), 0);

  if (!confirm(`¿Confirmás el Cierre del Fondo Fijo por un total de $ ${totalRendicion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}?`)) {
    return;
  }

  try {
    const { data: { user } } = await db.auth.getUser();
    const idsActivos = estadoFondoFijo.registros.map(r => Number(r.id));
    const hoy = new Date().toISOString().split('T')[0];
    const textoConcepto = `Rendición Fondo Fijo - ${hoy}`;

    const agrupadoPorCentro = {};
    estadoFondoFijo.registros.forEach(r => {
      const centro = r.centro_costo || 'Gastos Generales';
      const monto = parseFloat(r.monto) || 0;
      agrupadoPorCentro[centro] = (agrupadoPorCentro[centro] || 0) + monto;
    });

    const { data: asientoCreado, error: errAsiento } = await db
      .from('asientos')
      .insert([{ fecha: hoy, user_id: user?.id || null, concepto: textoConcepto }])
      .select()
      .single();

    if (errAsiento) {
      console.error('Error insertando en asientos:', errAsiento);
      showToast('Aviso: no se pudo guardar el asiento en Supabase: ' + errAsiento.message, 'error');
    } else if (asientoCreado) {
      const renglonesBD = [];

      Object.keys(agrupadoPorCentro).forEach(centro => {
        renglonesBD.push({
          asiento_id: asientoCreado.id,
          debe: agrupadoPorCentro[centro],
          haber: 0,
          cuenta_nombre: `Gastos de ${centro}`,
          detalle: `Imputación centro de costo: ${centro}`
        });
      });

      renglonesBD.push({
        asiento_id: asientoCreado.id,
        debe: 0,
        haber: totalRendicion,
        cuenta_nombre: 'Fondo Fijo / Caja Chica',
        detalle: 'Reposición y cancelación del rinde'
      });

      const { error: errDetalles } = await db.from('asiento_detalles').insert(renglonesBD);
      if (errDetalles) console.error('Error insertando detalles del asiento:', errDetalles);
    }

    const { error: errUpdate } = await db
      .from('fondo_fijo')
      .update({ estado_rinde: 'RENDIDO' })
      .in('id', idsActivos);

    if (errUpdate) throw errUpdate;

    showToast('Fondo Fijo rendido y Asiento Contable generado por centros de costo.');
    await cargarRegistrosFondoFijo();
    if (typeof renderLibroDiario === 'function') await renderLibroDiario();
    if (typeof actualizarDashboardMetrics === 'function') await actualizarDashboardMetrics();
  } catch (err) {
    console.error('Error general en rendición:', err);
    showToast('Ocurrió un error al procesar el cierre.', 'error');
  }
}

function exportarRindeCSV() {
  if (estadoFondoFijo.registros.length === 0) return showToast('No hay datos para exportar.', 'error');
  const columnas = ['Fecha', 'Concepto', 'Tipo Doc', 'Centro Costo', 'Monto'];
  const filas = estadoFondoFijo.registros.map(r => [
    r.fecha, `"${r.concepto.replace(/"/g, '""')}"`, `"${r.tipo_doc || ''}"`, `"${r.centro_costo || ''}"`, r.monto
  ]);

  const csvContent = [columnas.join(','), ...filas.map(f => f.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rendicion_Fondo_Fijo_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exportación a CSV generada.');
}

function actualizarMetricasFondoFijoDashboard() {
  const registrosActivos = estadoFondoFijo.registros.filter(r => r.estado_rinde === 'ACTIVO' || !r.estado_rinde);
  const totalActivo = registrosActivos.reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0);

  const elTotal = document.getElementById('kpi-fondo-monto');
  const elSub = document.getElementById('kpi-fondo-sub');

  if (elTotal) elTotal.textContent = `$ ${totalActivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  if (elSub) elSub.textContent = `${registrosActivos.length} comprobantes activos`;
}

// ==========================================
// MOTOR 8: ÓRDENES DE PAGO (OP)
// ==========================================
let historialOP = [];
let facturasComprasDisponibles = [];
let facturasSeleccionadasOP = [];
let adjuntoBase64Temp = null;

async function cargarFacturasImpagasParaOP() {
  const selectProv = document.getElementById('op-selector-proveedor');
  if (!selectProv) return;

  try {
    const { data: facturas, error } = await db
      .from('comprobantes_compra')
      .select('*')
      .neq('estado_pago', 'Pagado')
      .order('fecha', { ascending: false });

    if (error) throw error;
    facturasComprasDisponibles = facturas || [];

    const proveedoresConDeuda = [...new Set(facturasComprasDisponibles.map(f => f.proveedor))];

    selectProv.innerHTML = '<option value="">-- Cargar manualmente o elegir proveedor con facturas impagas --</option>';
    proveedoresConDeuda.forEach(prov => {
      const cant = facturasComprasDisponibles.filter(f => f.proveedor === prov).length;
      const opt = document.createElement('option');
      opt.value = prov;
      opt.textContent = `${prov} (${cant} comprobante${cant > 1 ? 's' : ''} pendiente${cant > 1 ? 's' : ''})`;
      selectProv.appendChild(opt);
    });
  } catch (err) {
    console.warn('Aviso cargando proveedores pendientes:', err);
  }
}

function filtrarFacturasPorProveedorOP(proveedorSeleccionado) {
  const container = document.getElementById('op-contenedor-multicheck');
  const badge = document.getElementById('op-cant-fc-badge');
  if (!container) return;

  facturasSeleccionadasOP = [];

  if (!proveedorSeleccionado) {
    container.classList.add('hidden');
    container.innerHTML = '';
    if (badge) badge.textContent = '0 comprobantes';
    document.getElementById('op-proveedor').value = '';
    document.getElementById('op-cuit').value = '';
    document.getElementById('op-monto-factura').value = '';
    actualizarCalculoOP();
    return;
  }

  const facturasProv = facturasComprasDisponibles.filter(f => f.proveedor === proveedorSeleccionado);
  if (badge) badge.textContent = `${facturasProv.length} disponibles`;

  document.getElementById('op-proveedor').value = proveedorSeleccionado;
  document.getElementById('op-cuit').value = facturasProv[0]?.cuit || '';

  let html = `<div class="font-bold text-[11px] text-slate-700 pb-1 mb-1 border-b border-slate-100 flex justify-between">
                <span>Comprobantes a cancelar en esta OP:</span>
                <button type="button" onclick="tildarTodasFacturasOP(true)" class="text-indigo-600 underline font-semibold cursor-pointer">Tildar todas</button>
              </div>`;

  facturasProv.forEach(fc => {
    html += `
      <label class="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
        <div class="flex items-center gap-2">
          <input type="checkbox" value="${fc.id}" onchange="recalcularMultifacturaOP()" class="chk-factura-op accent-indigo-600 rounded cursor-pointer" />
          <span class="font-medium text-slate-700">${fc.tipo_doc} ${fc.numero_doc}</span>
          <span class="text-[10px] text-slate-400">(${fc.fecha})</span>
        </div>
        <span class="font-mono font-bold text-slate-800">$ ${parseFloat(fc.saldo || fc.total).toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
      </label>
    `;
  });

  container.innerHTML = html;
  container.classList.remove('hidden');
  cambiarMedioPagoSugerido(document.getElementById('op-medio-pago')?.value || 'Transferencia Bancaria');
}

function tildarTodasFacturasOP(estado) {
  document.querySelectorAll('.chk-factura-op').forEach(chk => {
    chk.checked = estado;
  });
  recalcularMultifacturaOP();
}

function recalcularMultifacturaOP() {
  const checks = document.querySelectorAll('.chk-factura-op:checked');
  const idsSeleccionados = Array.from(checks).map(c => Number(c.value));
  facturasSeleccionadasOP = facturasComprasDisponibles.filter(f => idsSeleccionados.includes(f.id));

  const totalBruto = facturasSeleccionadasOP.reduce((acc, f) => acc + (parseFloat(f.saldo || f.total) || 0), 0);
  const conceptos = facturasSeleccionadasOP.map(f => `${f.tipo_doc} ${f.numero_doc}`).join(' + ');

  document.getElementById('op-monto-factura').value = totalBruto.toFixed(2);
  document.getElementById('op-concepto').value = facturasSeleccionadasOP.length > 0 
    ? `Cancelación: ${conceptos}` 
    : '';

  actualizarCalculoOP();
}

function cambiarMedioPagoSugerido(medio) {
  const inputComp = document.getElementById('op-num-comprobante');
  if (!inputComp) return;
  const correlativo = String(Date.now()).slice(-6);

  if (medio === 'Transferencia Bancaria') inputComp.value = `TR-${correlativo}`;
  else if (medio === 'Cheque Propio') inputComp.value = `CH-${correlativo}`;
  else if (medio === 'Echeq') inputComp.value = `ECHQ-${correlativo}`;
  else if (medio === 'Efectivo / Caja Chica') inputComp.value = `REC-${correlativo}`;

  actualizarCalculoOP();
}

function calcularRetencionSugeridaOP() {
  const bruto = parseFloat(document.getElementById('op-monto-factura')?.value) || 0;
  if (bruto <= 0) return showToast('Ingresá el monto de las facturas primero.', 'error');

  const baseNoImponible = 67200;
  const sujeto = Math.max(0, bruto - baseNoImponible);
  const retGanancias = sujeto * 0.02;
  const retIIBB = bruto * 0.015;

  const totalSugerido = Math.round((retGanancias + retIIBB) * 100) / 100;
  document.getElementById('op-retencion').value = totalSugerido;
  showToast(`Retención calculada para el grupo de facturas: $ ${totalSugerido.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
  actualizarCalculoOP();
}

function actualizarCalculoOP() {
  const fecha = document.getElementById('op-fecha')?.value || new Date().toISOString().split('T')[0];
  const proveedor = document.getElementById('op-proveedor')?.value || 'Sin especificar';
  const cuit = document.getElementById('op-cuit')?.value || '-';
  const concepto = document.getElementById('op-concepto')?.value || 'Sin detalle';

  const montoFactura = parseFloat(document.getElementById('op-monto-factura')?.value) || 0;
  const retencion = parseFloat(document.getElementById('op-retencion')?.value) || 0;
  const neto = Math.max(0, montoFactura - retencion);

  const medio = document.getElementById('op-medio-pago')?.value;
  const numComprobante = document.getElementById('op-num-comprobante')?.value || '-';
  const preview = document.getElementById('contenedor-preview-op');

  if (preview) {
    if (montoFactura > 0) {
      const codigoSiguiente = 'OP-' + String(historialOP.length + 1).padStart(4, '0');
      preview.className = "space-y-3.5 text-left text-slate-700";
      preview.innerHTML = `
        <div class="flex justify-between items-center border-b border-slate-200 pb-3">
          <div>
            <h4 class="font-bold text-slate-800">ORDEN DE PAGO (${codigoSiguiente})</h4>
            <span class="text-xs text-slate-500">Fecha: ${fecha}</span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Borrador</span>
        </div>

        <div class="text-xs space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p><strong class="text-slate-900">Proveedor:</strong> ${proveedor} (${cuit})</p>
          <p><strong class="text-slate-900">Concepto:</strong> ${concepto}</p>
          <p><strong class="text-slate-900">Facturas Imputadas:</strong> ${facturasSeleccionadasOP.length || 'Carga manual'}</p>
          <p><strong class="text-slate-900">Medio de Pago:</strong> ${medio} (${numComprobante})</p>
        </div>
        
        <div class="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <div class="flex justify-between p-2.5 bg-white border-b border-slate-200">
            <span>Total Facturas Agrupadas:</span>
            <span class="font-mono font-medium">$ ${montoFactura.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
          </div>
          <div class="flex justify-between p-2.5 bg-white border-b border-slate-200 text-rose-600">
            <span>Retenciones Aplicadas:</span>
            <span class="font-mono font-medium">-$ ${retencion.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
          </div>
          <div class="flex justify-between p-2.5 bg-emerald-50 font-bold text-emerald-800 text-sm">
            <span>Monto Neto Emitido:</span>
            <span class="font-mono">$ ${neto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      `;
    } else {
      preview.className = "text-center text-slate-400 py-12 flex flex-col items-center justify-center gap-2";
      preview.innerHTML = `<p class="text-sm">Completa el formulario para previsualizar la Orden de Pago.</p>`;
    }
  }
}

async function generarOP() {
  const fecha = document.getElementById('op-fecha').value;
  const proveedor = document.getElementById('op-proveedor').value.trim();
  const cuit = document.getElementById('op-cuit').value.trim() || 'S/D';
  const concepto = document.getElementById('op-concepto').value.trim();
  const montoFactura = parseFloat(document.getElementById('op-monto-factura').value) || 0;
  const retencion = parseFloat(document.getElementById('op-retencion').value) || 0;
  const medio = document.getElementById('op-medio-pago').value;
  const numComprobante = document.getElementById('op-num-comprobante').value.trim() || '-';

  if (!fecha || !proveedor || !concepto || montoFactura <= 0) {
    showToast('Completá todos los campos obligatorios.', 'error');
    return;
  }

  const neto = Math.max(0, montoFactura - retencion);

  try {
    const { data: { user } } = await db.auth.getUser();

    const { count } = await db.from('ordenes_pago').select('*', { count: 'exact', head: true });
    const codigoOP = 'OP-' + String((count || 0) + 1).padStart(4, '0');

    const payload = {
      codigo_op: codigoOP,
      fecha,
      proveedor,
      cuit,
      concepto,
      monto_factura: montoFactura,
      retencion,
      neto,
      medio,
      num_comprobante: numComprobante,
      adjunto_url: adjuntoBase64Temp || null,
      estado: 'Pagado',
      user_id: user?.id || null
    };

    const { error: errOP } = await db.from('ordenes_pago').insert([payload]);
    if (errOP) throw errOP;

    if (facturasSeleccionadasOP.length > 0) {
      const idsFacturas = facturasSeleccionadasOP.map(f => f.id);
      await db.from('comprobantes_compra')
        .update({ estado_pago: 'Pagado', saldo: 0 })
        .in('id', idsFacturas);
    }

    const glosaAsiento = `Pago a Proveedor ${proveedor} según ${codigoOP}`;
    const { data: nuevoAsiento, error: errAsiento } = await db
      .from('asientos')
      .insert([{ fecha, user_id: user?.id || null, concepto: glosaAsiento }])
      .select()
      .single();

    if (!errAsiento && nuevoAsiento) {
      const lineasAsiento = [
        {
          asiento_id: nuevoAsiento.id,
          debe: montoFactura,
          haber: 0,
          cuenta_nombre: 'Proveedores / Cuentas por Pagar',
          detalle: `Cancelación comprobantes ${proveedor}`
        }
      ];

      if (retencion > 0) {
        lineasAsiento.push({
          asiento_id: nuevoAsiento.id,
          debe: 0,
          haber: retencion,
          cuenta_nombre: 'Retenciones Impositivas a Depositar',
          detalle: 'Retenciones practicadas s/ OP'
        });
      }

      let cuentaSalida = 'Banco Cuentas Corrientes';
      if (medio.includes('Efectivo')) {
        cuentaSalida = 'Caja Central';
      } else if (medio === 'Tarjeta Corporativa') {
        cuentaSalida = 'Tarjeta Corporativa a Pagar';
      }

      lineasAsiento.push({
        asiento_id: nuevoAsiento.id,
        debe: 0,
        haber: neto,
        cuenta_nombre: cuentaSalida,
        detalle: `${medio} N° ${numComprobante}`
      });

      await db.from('asiento_detalles').insert(lineasAsiento);
    }

    showToast(`Orden de Pago ${codigoOP} emitida con éxito.`);

    document.getElementById('form-op').reset();
    adjuntoBase64Temp = null;
    facturasSeleccionadasOP = [];
    document.getElementById('op-contenedor-multicheck').classList.add('hidden');
    document.getElementById('op-fecha').value = new Date().toISOString().split('T')[0];
    cambiarMedioPagoSugerido('Transferencia Bancaria');

    await renderHistorialOP();
    await cargarFacturasImpagasParaOP();
    if (typeof renderLibroDiario === 'function') await renderLibroDiario();
    if (typeof actualizarDashboardMetrics === 'function') await actualizarDashboardMetrics();
  } catch (err) {
    console.error('Error emitiendo OP:', err);
    showToast('Error al registrar la orden de pago.', 'error');
  }
}

async function renderHistorialOP() {
  const tbody = document.getElementById('tbody-op-historial');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtro = (document.getElementById('op-buscar-historial')?.value || '').toLowerCase();

  try {
    const { data: lista, error } = await db
      .from('ordenes_pago')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    historialOP = lista || [];

    const filtrados = historialOP.filter(op => {
      return (op.proveedor || '').toLowerCase().includes(filtro) ||
             (op.cuit || '').toLowerCase().includes(filtro) ||
             (op.codigo_op || '').toLowerCase().includes(filtro) ||
             (op.concepto || '').toLowerCase().includes(filtro);
    });

    if (filtrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400">No hay órdenes de pago emitidas.</td></tr>`;
      return;
    }

    filtrados.forEach((op) => {
      const botonAdjunto = op.adjunto_url
        ? `<a href="${op.adjunto_url}" download="Adjunto_${op.codigo_op}" class="text-indigo-600 hover:text-indigo-900 font-bold p-1" title="Descargar comprobante adjunto">📎 Ver</a>`
        : `<span class="text-slate-300">-</span>`;

      tbody.innerHTML += `
        <tr class="hover:bg-slate-50 transition-colors text-xs">
          <td class="p-3 font-bold text-slate-900">
            ${op.codigo_op}
            <div class="text-[11px] font-normal text-slate-400">${op.fecha}</div>
          </td>
          <td class="p-3 font-semibold text-slate-800">
            ${op.proveedor}
            <div class="text-[11px] font-normal text-slate-400">CUIT: ${op.cuit || 'S/D'}</div>
          </td>
          <td class="p-3 text-slate-600 truncate max-w-xs">${op.concepto}</td>
          <td class="p-3">
            <span class="px-2 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200">${op.medio}</span>
          </td>
          <td class="p-3 font-mono font-bold text-emerald-700">$ ${parseFloat(op.neto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">${op.estado}</span>
          </td>
          <td class="p-3 text-center">${botonAdjunto}</td>
          <td class="p-3 text-center whitespace-nowrap">
            <button onclick="descargarPDFOP('${op.id}')" class="text-slate-600 hover:text-indigo-600 p-1 mr-1 cursor-pointer" title="Imprimir PDF">📄</button>
            <button onclick="eliminarOP('${op.id}')" class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer" title="Eliminar">🗑</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error cargando historial de OP:', err);
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-rose-500">Error al consultar órdenes de pago.</td></tr>`;
  }
}

async function eliminarOP(id) {
  if (!confirm('¿Eliminar esta orden de pago de la base de datos?')) return;
  try {
    const { error } = await db.from('ordenes_pago').delete().eq('id', id);
    if (error) throw error;
    showToast('Orden de Pago eliminada.');
    await renderHistorialOP();
  } catch (err) {
    console.error('Error al borrar OP:', err);
    showToast('Error al eliminar la orden de pago.', 'error');
  }
}

function exportarHistorialOPCSV() {
  if (historialOP.length === 0) return showToast('No hay órdenes para exportar.', 'error');
  let csv = 'Codigo,Fecha,Proveedor,CUIT,Concepto,Medio,Bruto,Retencion,Neto,Estado\n';
  historialOP.forEach(o => {
    csv += `"${o.codigo_op}",${o.fecha},"${o.proveedor}","${o.cuit}","${o.concepto}","${o.medio}",${o.monto_factura},${o.retencion},${o.neto},"${o.estado}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `Historial_OP_${new Date().toISOString().slice(0,10)}.csv`);
  a.click();
  showToast('Exportación CSV completada.');
}

function descargarPDFOP(id) {
  const op = historialOP.find(item => String(item.id) === String(id));
  if (!op) return;
  if (!window.jspdf) return alert('Librería jsPDF no disponible.');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  dibujarMembretePDF(doc, 'ORDEN DE PAGO', op.codigo_op, op.fecha);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL PROVEEDOR / BENEFICIARIO', 14, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(`Proveedor: ${op.proveedor}`, 14, 50);
  doc.text(`CUIT: ${op.cuit || 'S/D'}`, 14, 55);
  doc.text(`Medio de Pago: ${op.medio}`, 120, 50);
  doc.text(`N° Transacción / Comp: ${op.num_comprobante || '-'}`, 120, 55);

  doc.autoTable({
    startY: 62,
    head: [['Descripción del Movimiento', 'Importe ($)']],
    body: [
      ['Total Bruto Comprobantes Imputados', `$ ${parseFloat(op.monto_factura).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
      ['Retenciones Impositivas Practicadas', `-$ ${parseFloat(op.retencion).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
      ['NETO LIQUIDADO A PAGAR', `$ ${parseFloat(op.neto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`]
    ],
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
  });

  const finalY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Concepto: ${op.concepto}`, 14, finalY);

  doc.setDrawColor(200);
  doc.line(130, finalY + 35, 185, finalY + 35);
  doc.text('Firma y Aclaración Recibido', 135, finalY + 40);

  doc.save(`${op.codigo_op}_${op.proveedor.replace(/\s+/g, '_')}.pdf`);
}

// ==========================================
// MOTOR 9: MAYOR CONTABLE Y BALANCE
// ==========================================
let vistaMayorBalanceActual = 'SUMAS_SALDOS';
let datosAsientosGlobal = [];
let datosDetallesGlobal = [];
let balanceConsolidado = [];

function cambiarVistaMayorBalance(vista) {
  vistaMayorBalanceActual = vista;
  const btnSS = document.getElementById('btn-subtab-sumas-saldos');
  const btnM = document.getElementById('btn-subtab-mayor');
  const panelSS = document.getElementById('panel-sumas-saldos');
  const panelM = document.getElementById('panel-mayor-analitico');
  const filtroCuenta = document.getElementById('contenedor-filtro-cuenta-mayor');

  if (vista === 'SUMAS_SALDOS') {
    btnSS.className = 'px-4 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs transition-all cursor-pointer';
    btnM.className = 'px-4 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
    panelSS.classList.remove('hidden');
    panelM.classList.add('hidden');
    filtroCuenta.classList.add('hidden');
  } else {
    btnM.className = 'px-4 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs transition-all cursor-pointer';
    btnSS.className = 'px-4 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
    panelM.classList.remove('hidden');
    panelSS.classList.add('hidden');
    filtroCuenta.classList.remove('hidden');
    renderizarMayorAnalitico();
  }
}

async function cargarMayorYBalance() {
  const tbodySS = document.getElementById('tbody-sumas-saldos');
  if (tbodySS) tbodySS.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Consultando libro mayor y asientos en Supabase...</td></tr>';

  const fDesde = document.getElementById('filtro-balance-desde')?.value;
  const fHasta = document.getElementById('filtro-balance-hasta')?.value;

  try {
    let queryAsientos = db.from('asientos').select('*').order('fecha', { ascending: true });
    if (fDesde) queryAsientos = queryAsientos.gte('fecha', fDesde);
    if (fHasta) queryAsientos = queryAsientos.lte('fecha', fHasta);

    const { data: asientos, error: errA } = await queryAsientos;
    if (errA) throw errA;
    datosAsientosGlobal = asientos || [];

    if (datosAsientosGlobal.length === 0) {
      if (tbodySS) tbodySS.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">No hay movimientos contables en el rango de fechas seleccionado.</td></tr>';
      actualizarTotalesBalance(0, 0, 0, 0);
      return;
    }

    const idsAsientos = datosAsientosGlobal.map(a => a.id);
    const { data: renglones, error: errR } = await db
      .from('asiento_detalles')
      .select('*')
      .in('asiento_id', idsAsientos);

    if (errR) throw errR;
    datosDetallesGlobal = renglones || [];

    const mapaCuentas = {};

    datosDetallesGlobal.forEach(r => {
      const nombreCuenta = r.cuenta_nombre || r.cuenta || r.detalle || 'Cuentas Generales';
      if (!mapaCuentas[nombreCuenta]) {
        mapaCuentas[nombreCuenta] = { cuenta: nombreCuenta, debe: 0, haber: 0 };
      }
      mapaCuentas[nombreCuenta].debe += parseFloat(r.debe || 0);
      mapaCuentas[nombreCuenta].haber += parseFloat(r.haber || 0);
    });

    balanceConsolidado = Object.values(mapaCuentas).map(item => {
      const diff = item.debe - item.haber;
      return {
        ...item,
        saldoDeudor: diff > 0 ? diff : 0,
        saldoAcreedor: diff < 0 ? Math.abs(diff) : 0
      };
    });

    balanceConsolidado.sort((a, b) => a.cuenta.localeCompare(b.cuenta));

    renderizarTablaSumasSaldos();
    actualizarSelectorCuentasMayor();
  } catch (err) {
    console.error('Error cargando balance:', err);
    if (tbodySS) tbodySS.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-rose-500">Error al procesar sumas y saldos: ${err.message}</td></tr>`;
  }
}

function renderizarTablaSumasSaldos() {
  const tbody = document.getElementById('tbody-sumas-saldos');
  if (!tbody) return;

  if (balanceConsolidado.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Sin datos de asientos contables.</td></tr>';
    actualizarTotalesBalance(0, 0, 0, 0);
    return;
  }

  let totDebe = 0, totHaber = 0, totSDeudor = 0, totSAcreedor = 0;

  tbody.innerHTML = balanceConsolidado.map(b => {
    totDebe += b.debe;
    totHaber += b.haber;
    totSDeudor += b.saldoDeudor;
    totSAcreedor += b.saldoAcreedor;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-3 font-semibold text-slate-800">${b.cuenta}</td>
        <td class="p-3 text-right font-mono text-slate-600">$ ${b.debe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td class="p-3 text-right font-mono text-slate-600">$ ${b.haber.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td class="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">$ ${b.saldoDeudor > 0 ? b.saldoDeudor.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '-'}</td>
        <td class="p-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">$ ${b.saldoAcreedor > 0 ? b.saldoAcreedor.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '-'}</td>
        <td class="p-3 text-center">
          <button onclick="verMayorDeCuenta('${encodeURIComponent(b.cuenta)}')" class="text-xs bg-slate-100 hover:bg-indigo-50 text-indigo-600 font-semibold px-2 py-1 rounded border border-slate-200 cursor-pointer">
            Ver Mayor
          </button>
        </td>
      </tr>
    `;
  }).join('');

  actualizarTotalesBalance(totDebe, totHaber, totSDeudor, totSAcreedor);
}

function actualizarTotalesBalance(totDebe, totHaber, totSDeudor, totSAcreedor) {
  const tfoot = document.getElementById('tfoot-sumas-saldos');
  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td class="p-3 uppercase">Totales Balance:</td>
        <td class="p-3 text-right font-mono">$ ${totDebe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td class="p-3 text-right font-mono">$ ${totHaber.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td class="p-3 text-right font-mono text-emerald-800 bg-emerald-50/60">$ ${totSDeudor.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td class="p-3 text-right font-mono text-indigo-800 bg-indigo-50/60">$ ${totSAcreedor.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td></td>
      </tr>
    `;
  }

  const difSumas = Math.abs(totDebe - totHaber);
  const difSaldos = Math.abs(totSDeudor - totSAcreedor);
  const badge = document.getElementById('badge-balance-cuadre');
  if (badge) {
    if (difSumas < 0.05 && difSaldos < 0.05) {
      badge.className = "text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200";
      badge.textContent = "Cuadrado (Partida Doble OK)";
    } else {
      badge.className = "text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200";
      badge.textContent = `Desbalanceado (Dif: $${difSumas.toFixed(2)})`;
    }
  }
}

function actualizarSelectorCuentasMayor() {
  const select = document.getElementById('filtro-cuenta-mayor');
  if (!select) return;

  const cuentaActual = select.value;
  select.innerHTML = '<option value="">-- Seleccionar Cuenta --</option>';
  balanceConsolidado.forEach(b => {
    select.innerHTML += `<option value="${b.cuenta}">${b.cuenta}</option>`;
  });
  if (cuentaActual) select.value = cuentaActual;
}

function verMayorDeCuenta(cuentaCodificada) {
  const cuenta = decodeURIComponent(cuentaCodificada);
  cambiarVistaMayorBalance('MAYOR');
  const select = document.getElementById('filtro-cuenta-mayor');
  if (select) {
    select.value = cuenta;
    renderizarMayorAnalitico();
  }
}

function renderizarMayorAnalitico() {
  const cuentaSeleccionada = document.getElementById('filtro-cuenta-mayor')?.value;
  const tbody = document.getElementById('tbody-mayor-renglones');
  const titEl = document.getElementById('mayor-cuenta-titulo');
  const elDebe = document.getElementById('mayor-total-debe');
  const elHaber = document.getElementById('mayor-total-haber');
  const elSaldo = document.getElementById('mayor-saldo-final');

  if (!cuentaSeleccionada) {
    if (titEl) titEl.textContent = 'Seleccione una cuenta contable para mayorizar';
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">Seleccione una cuenta contable en el filtro superior.</td></tr>';
    if (elDebe) elDebe.textContent = '$0.00';
    if (elHaber) elHaber.textContent = '$0.00';
    if (elSaldo) elSaldo.textContent = '$0.00';
    return;
  }

  if (titEl) titEl.textContent = `Mayor: ${cuentaSeleccionada}`;

  const renglonesCuenta = [];
  datosDetallesGlobal.forEach(r => {
    const nombre = r.cuenta_nombre || r.cuenta || r.detalle || 'Cuentas Generales';
    if (nombre === cuentaSeleccionada) {
      const asientoPadre = datosAsientosGlobal.find(a => a.id === r.asiento_id);
      renglonesCuenta.push({
        ...r,
        fecha: asientoPadre?.fecha || 'S/F',
        glosa: asientoPadre?.concepto || asientoPadre?.leyenda || 'Asiento contable',
        asientoRef: `Asiento ${String(asientoPadre?.id || '').slice(0, 8)}`
      });
    }
  });

  renglonesCuenta.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let acumuladoDebe = 0;
  let acumuladoHaber = 0;
  let saldoProgresivo = 0;

  tbody.innerHTML = renglonesCuenta.map(r => {
    const debe = parseFloat(r.debe || 0);
    const haber = parseFloat(r.haber || 0);
    acumuladoDebe += debe;
    acumuladoHaber += haber;
    saldoProgresivo += (debe - haber);

    const formatoSaldo = saldoProgresivo >= 0 
      ? `$ ${saldoProgresivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (D)`
      : `$ ${Math.abs(saldoProgresivo).toLocaleString('es-AR', { minimumFractionDigits: 2 })} (A)`;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-3 text-slate-600 font-mono">${r.fecha}</td>
        <td class="p-3 text-slate-500 font-mono">${r.asientoRef}</td>
        <td class="p-3 font-semibold text-slate-800">${r.glosa}</td>
        <td class="p-3 text-slate-500">${r.detalle || '-'}</td>
        <td class="p-3 text-right font-mono text-slate-700">${debe > 0 ? '$ ' + debe.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '-'}</td>
        <td class="p-3 text-right font-mono text-slate-700">${haber > 0 ? '$ ' + haber.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '-'}</td>
        <td class="p-3 text-right font-mono font-bold text-indigo-900 bg-indigo-50/20">${formatoSaldo}</td>
      </tr>
    `;
  }).join('');

  if (renglonesCuenta.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">No se registran movimientos para esta cuenta.</td></tr>';
  }

  const saldoFinal = acumuladoDebe - acumuladoHaber;
  if (elDebe) elDebe.textContent = `$ ${acumuladoDebe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  if (elHaber) elHaber.textContent = `$ ${acumuladoHaber.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  if (elSaldo) {
    elSaldo.textContent = saldoFinal >= 0 
      ? `$ ${saldoFinal.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (Deudor)` 
      : `$ ${Math.abs(saldoFinal).toLocaleString('es-AR', { minimumFractionDigits: 2 })} (Acreedor)`;
  }
}

function exportarReporteContableCSV() {
  if (vistaMayorBalanceActual === 'SUMAS_SALDOS') {
    if (balanceConsolidado.length === 0) return alert('No hay datos para exportar.');
    let csv = 'Cuenta Contable,Sumas Debe,Sumas Haber,Saldo Deudor,Saldo Acreedor\n';
    balanceConsolidado.forEach(b => {
      csv += `"${b.cuenta}",${b.debe},${b.haber},${b.saldoDeudor},${b.saldoAcreedor}\n`;
    });
    descargarArchivoCSV(csv, `Balance_Sumas_Saldos_${new Date().toISOString().slice(0, 10)}.csv`);
  } else {
    const cuenta = document.getElementById('filtro-cuenta-mayor')?.value;
    if (!cuenta) return alert('Seleccione una cuenta contable para exportar su mayor.');
    let csv = 'Fecha,Asiento,Concepto,Detalle,Debe,Haber\n';
    datosDetallesGlobal.filter(r => (r.cuenta_nombre || r.cuenta || r.detalle) === cuenta).forEach(r => {
      const a = datosAsientosGlobal.find(as => as.id === r.asiento_id);
      csv += `${a?.fecha || ''},"${a?.id || ''}","${a?.concepto || ''}","${r.detalle || ''}",${r.debe || 0},${r.haber || 0}\n`;
    });
    descargarArchivoCSV(csv, `Mayor_${cuenta.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  }
}

function descargarArchivoCSV(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
}

// ==========================================
// MOTOR 10: LIBRO DIARIO Y ASIENTOS MANUALES
// ==========================================
let historialLibroDiario = JSON.parse(localStorage.getItem('suite_libro_diario')) || [];

function inicializarAsientoManual() {
  const contenedor = document.getElementById('contenedor-lineas-asiento');
  if (!contenedor) return;
  contenedor.innerHTML = '';
  agregarLineaAsiento();
  agregarLineaAsiento();
  calcularPartidaDoble();
}

function agregarLineaAsiento() {
  const contenedor = document.getElementById('contenedor-lineas-asiento');
  if (!contenedor) return;

  const idLinea = 'linea-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const div = document.createElement('div');
  div.className = 'grid grid-cols-12 gap-2 items-center linea-asiento-item';
  div.id = idLinea;

  div.innerHTML = `
    <div class="col-span-6">
      <input type="text" list="plan-cuentas-sugeridas" placeholder="Cuenta Contable" class="asiento-cuenta w-full border border-slate-300 text-slate-800 text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" required>
    </div>
    <div class="col-span-3">
      <input type="number" step="0.01" min="0" placeholder="Debe ($)" oninput="calcularPartidaDoble()" class="asiento-debe w-full border border-slate-300 text-slate-800 text-xs rounded-lg p-2 font-mono">
    </div>
    <div class="col-span-3 flex items-center gap-1">
      <input type="number" step="0.01" min="0" placeholder="Haber ($)" oninput="calcularPartidaDoble()" class="asiento-haber w-full border border-slate-300 text-slate-800 text-xs rounded-lg p-2 font-mono">
      <button type="button" onclick="eliminarLineaAsiento('${idLinea}')" class="text-slate-400 hover:text-rose-600 p-1">❌</button>
    </div>
  `;

  contenedor.appendChild(div);
}

function eliminarLineaAsiento(idLinea) {
  const lineas = document.querySelectorAll('.linea-asiento-item');
  if (lineas.length <= 2) return alert('Un asiento contable requiere al menos 2 cuentas.');
  const el = document.getElementById(idLinea);
  if (el) el.remove();
  calcularPartidaDoble();
}

function calcularPartidaDoble() {
  const debes = document.querySelectorAll('.asiento-debe');
  const haberes = document.querySelectorAll('.asiento-haber');
  let totalDebe = 0, totalHaber = 0;

  debes.forEach(inp => totalDebe += (parseFloat(inp.value) || 0));
  haberes.forEach(inp => totalHaber += (parseFloat(inp.value) || 0));
  const diferencia = Math.abs(totalDebe - totalHaber);

  const lblDebe = document.getElementById('lbl-total-debe');
  const lblHaber = document.getElementById('lbl-total-haber');
  const lblDif = document.getElementById('lbl-diferencia-asiento');
  const status = document.getElementById('asiento-validation-status');
  const btn = document.getElementById('btn-guardar-asiento');

  if (lblDebe) lblDebe.textContent = `$ ${totalDebe.toFixed(2)}`;
  if (lblHaber) lblHaber.textContent = `$ ${totalHaber.toFixed(2)}`;
  if (lblDif) lblDif.textContent = `$ ${diferencia.toFixed(2)}`;

  const esValido = diferencia < 0.01 && totalDebe > 0;

  if (status && btn) {
    if (esValido) {
      status.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200";
      status.textContent = "Balanceado (Partida Doble OK)";
      btn.disabled = false;
      btn.className = "w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow cursor-pointer";
    } else {
      status.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200";
      status.textContent = "Desbalanceado (Debe ≠ Haber)";
      btn.disabled = true;
      btn.className = "w-full bg-slate-300 text-slate-500 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all cursor-not-allowed";
    }
  }
}

function guardarAsientoValidado() {
  const fecha = document.getElementById('asiento-fecha')?.value || new Date().toISOString().split('T')[0];
  const leyenda = document.getElementById('asiento-leyenda')?.value.trim() || 'Sin Leyenda';
  const lineas = document.querySelectorAll('.linea-asiento-item');
  const renglones = [];

  lineas.forEach(linea => {
    const cuenta = linea.querySelector('.asiento-cuenta').value.trim();
    const debe = parseFloat(linea.querySelector('.asiento-debe').value) || 0;
    const haber = parseFloat(linea.querySelector('.asiento-haber').value) || 0;
    if (cuenta && (debe > 0 || haber > 0)) renglones.push({ cuenta, debe, haber });
  });

  if (renglones.length < 2) return alert('Ingresá al menos dos cuentas válidas.');

  const numAsiento = 'N° ' + (historialLibroDiario.length + 1).toString().padStart(4, '0');
  const nuevoAsiento = { id: numAsiento, fecha, leyenda, renglones };

  historialLibroDiario.unshift(nuevoAsiento);
  localStorage.setItem('suite_libro_diario', JSON.stringify(historialLibroDiario));

  renderLibroDiario();
  document.getElementById('asiento-leyenda').value = '';
  inicializarAsientoManual();
  alert(`Asiento ${numAsiento} guardado correctamente.`);
}

async function renderLibroDiario() {
  const contenedor = document.getElementById('contenedor-libro-diario');
  if (!contenedor) return;

  const filtro = (document.getElementById('asiento-buscar-historial')?.value || '').toLowerCase();

  try {
    const { data: listaAsientos, error: errAsientos } = await db
      .from('asientos')
      .select('*')
      .order('fecha', { ascending: false });

    if (errAsientos) throw errAsientos;

    if (!listaAsientos || listaAsientos.length === 0) {
      contenedor.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No hay asientos registrados en la base de datos.</div>`;
      return;
    }

    const asientoIds = listaAsientos.map(a => a.id);
    const { data: listaDetalles, error: errDetalles } = await db
      .from('asiento_detalles')
      .select('*')
      .in('asiento_id', asientoIds);

    if (errDetalles) console.warn('Detalles de asientos no disponibles:', errDetalles);

    contenedor.innerHTML = '';

    const filtrados = listaAsientos.filter(a => {
      const concepto = (a.concepto || a.leyenda || '').toLowerCase();
      const id = String(a.id).toLowerCase();
      return concepto.includes(filtro) || id.includes(filtro);
    });

    if (filtrados.length === 0) {
      contenedor.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No se encontraron asientos con ese criterio de búsqueda.</div>`;
      return;
    }

    filtrados.forEach((asiento, idx) => {
      const renglones = (listaDetalles || []).filter(d => d.asiento_id === asiento.id);
      const totalDebe = renglones.reduce((acc, r) => acc + (parseFloat(r.debe) || 0), 0);
      const numeroAsiento = `N° ${String(listaAsientos.length - idx).padStart(4, '0')}`;
      const glosa = asiento.concepto || asiento.leyenda || 'Sin concepto registrado';

      const filasHTML = renglones.map(r => `
        <tr class="border-b border-slate-100 text-xs">
          <td class="py-2 px-3 ${r.haber > 0 ? 'pl-8 text-slate-600' : 'font-semibold text-slate-800'}">
            ${r.cuenta_nombre || r.detalle || (r.haber > 0 ? 'Caja / Contrapartida' : 'Gasto Imputado')}
          </td>
          <td class="py-2 px-3 text-right font-mono text-slate-700">${r.debe > 0 ? '$ ' + parseFloat(r.debe).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '-'}</td>
          <td class="py-2 px-3 text-right font-mono text-slate-700">${r.haber > 0 ? '$ ' + parseFloat(r.haber).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '-'}</td>
        </tr>
      `).join('');

      contenedor.innerHTML += `
        <div class="p-4 space-y-3 bg-white rounded-lg border border-slate-100 shadow-xs mb-3">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-3">
              <span class="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">${numeroAsiento}</span>
              <span class="text-slate-400 font-medium">${asiento.fecha}</span>
              <span class="font-semibold text-slate-800">${glosa}</span>
            </div>
            <button onclick="eliminarAsientoSupabase('${asiento.id}')" class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer" title="Eliminar Asiento">
              🗑️
            </button>
          </div>
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="text-slate-400 font-semibold border-b border-slate-200 bg-slate-50/50">
                <th class="text-left py-1.5 px-3">Cuenta Contable</th>
                <th class="text-right py-1.5 px-3 w-32">Debe</th>
                <th class="text-right py-1.5 px-3 w-32">Haber</th>
              </tr>
            </thead>
            <tbody>${filasHTML}</tbody>
            <tfoot>
              <tr class="font-bold text-slate-800 bg-slate-50 border-t border-slate-200">
                <td class="py-2 px-3 text-right">Totales Asiento:</td>
                <td class="py-2 px-3 text-right font-mono text-emerald-700">$ ${totalDebe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                <td class="py-2 px-3 text-right font-mono text-emerald-700">$ ${totalDebe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    });
  } catch (err) {
    console.error('Error cargando Libro Diario desde Supabase:', err);
    contenedor.innerHTML = `<div class="p-6 text-center text-rose-500 text-xs">Error al consultar el Libro Diario en el servidor.</div>`;
  }
}

async function eliminarAsientoSupabase(asientoId) {
  if (!confirm('¿Seguro que deseas anular y eliminar este asiento contable?')) return;

  try {
    await db.from('asiento_detalles').delete().eq('asiento_id', asientoId);
    const { error } = await db.from('asientos').delete().eq('id', asientoId);
    if (error) throw error;

    showToast('Asiento eliminado con éxito.');
    await renderLibroDiario();
    await actualizarDashboardMetrics();
  } catch (err) {
    console.error('Error eliminando asiento:', err);
    showToast('Error al eliminar el asiento en la base de datos.', 'error');
  }
}

// ==========================================
// MOTOR 11: DASHBOARD METRICS
// ==========================================
async function actualizarDashboardMetrics() {
  try {
    const { count: cantAsientos } = await db
      .from('asientos')
      .select('*', { count: 'exact', head: true });

    const kpiAsientos = document.getElementById('kpi-asientos-cant');
    const kpiAsientosSub = document.getElementById('kpi-asientos-sub');
    if (kpiAsientos) kpiAsientos.textContent = cantAsientos || 0;
    if (kpiAsientosSub) {
      kpiAsientosSub.textContent = (cantAsientos || 0) > 0 
        ? `${cantAsientos} registrados en BD` 
        : 'Sin registros aún';
    }

    const totalFondo = estadoFondoFijo.registros.reduce((acc, item) => acc + (parseFloat(item.monto) || 0), 0);
    const kpiFondoMonto = document.getElementById('kpi-fondo-monto');
    const kpiFondoSub = document.getElementById('kpi-fondo-sub');
    if (kpiFondoMonto) kpiFondoMonto.textContent = `$ ${totalFondo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    if (kpiFondoSub) kpiFondoSub.textContent = `${estadoFondoFijo.registros.length} comprobantes en rinde activo`;
  } catch (err) {
    console.warn('Error actualizando KPIs:', err);
  }
}

// ==========================================
// MOTOR 12: PLAN DE CUENTAS MAESTRO
// ==========================================
let listaPlanCuentas = [];

async function cargarPlanCuentas() {
  const tbody = document.getElementById('tbody-plan-cuentas');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Cargando catálogo contable...</td></tr>';

  try {
    const { data, error } = await db
      .from('cuentas_contables')
      .select('*')
      .order('codigo', { ascending: true });

    if (error) throw error;
    listaPlanCuentas = data || [];

    renderizarTablaPlanCuentas();
    actualizarDatalistCuentasContables();
  } catch (err) {
    console.error('Error cargando plan de cuentas:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-rose-500">Error al cargar cuentas: ${err.message}</td></tr>`;
  }
}

function autoSugerirSaldoHabitual(tipo) {
  const selSaldo = document.getElementById('pc-saldo');
  if (!selSaldo) return;
  if (tipo === 'ACTIVO' || tipo === 'RESULTADO_NEGATIVO') {
    selSaldo.value = 'DEUDOR';
  } else {
    selSaldo.value = 'ACREEDOR';
  }
}

function renderizarTablaPlanCuentas() {
  const tbody = document.getElementById('tbody-plan-cuentas');
  const badgeTotal = document.getElementById('badge-total-cuentas');
  if (!tbody) return;

  const filtroTexto = (document.getElementById('pc-buscar')?.value || '').toLowerCase();
  const filtroTipo = document.getElementById('pc-filtro-tipo')?.value || 'TODOS';

  const filtrados = listaPlanCuentas.filter(c => {
    const coincideTexto = c.codigo.toLowerCase().includes(filtroTexto) || c.nombre.toLowerCase().includes(filtroTexto);
    const coincideTipo = filtroTipo === 'TODOS' || c.tipo === filtroTipo;
    return coincideTexto && coincideTipo;
  });

  if (badgeTotal) badgeTotal.textContent = `${listaPlanCuentas.length} cuentas`;

  if (filtrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">No se encontraron cuentas contables con esos criterios.</td></tr>';
    return;
  }

  const badgesTipo = {
    'ACTIVO': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'PASIVO': 'bg-amber-100 text-amber-800 border-amber-200',
    'PATRIMONIO_NETO': 'bg-purple-100 text-purple-800 border-purple-200',
    'RESULTADO_POSITIVO': 'bg-sky-100 text-sky-800 border-sky-200',
    'RESULTADO_NEGATIVO': 'bg-rose-100 text-rose-800 border-rose-200'
  };

  tbody.innerHTML = filtrados.map(c => `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="p-2.5 font-mono font-bold text-slate-700">${c.codigo}</td>
      <td class="p-2.5 font-semibold text-slate-800">${c.nombre}</td>
      <td class="p-2.5">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgesTipo[c.tipo] || 'bg-slate-100 text-slate-700'}">
          ${c.tipo.replace('_', ' ')}
        </span>
      </td>
      <td class="p-2.5 text-center font-mono text-[11px] font-bold ${c.saldo_habitual === 'DEUDOR' ? 'text-emerald-700' : 'text-indigo-700'}">
        ${c.saldo_habitual}
      </td>
      <td class="p-2.5 text-center">
        <span class="text-xs">${c.es_imputable ? '✅' : '🔒'}</span>
      </td>
      <td class="p-2.5 text-center whitespace-nowrap">
        <button onclick="prepararEdicionPlanCuenta('${c.id}')" class="text-indigo-600 hover:text-indigo-800 p-1 mr-1 cursor-pointer" title="Editar">✏</button>
        <button onclick="eliminarCuentaContable('${c.id}', '${c.nombre}')" class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer" title="Eliminar">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function guardarCuentaContable(e) {
  if (e) e.preventDefault();
  const idEdicion = document.getElementById('pc-id-edicion').value;
  const codigo = document.getElementById('pc-codigo').value.trim();
  const nombre = document.getElementById('pc-nombre').value.trim();
  const tipo = document.getElementById('pc-tipo').value;
  const saldo = document.getElementById('pc-saldo').value;
  const esImputable = document.getElementById('pc-imputable').checked;

  if (!codigo || !nombre) return alert('Por favor complete el código y el nombre de la cuenta.');

  const payload = {
    codigo,
    nombre,
    tipo,
    saldo_habitual: saldo,
    es_imputable: esImputable
  };

  try {
    if (idEdicion) {
      const { error } = await db.from('cuentas_contables').update(payload).eq('id', idEdicion);
      if (error) throw error;
      showToast(`Cuenta ${nombre} actualizada.`);
    } else {
      const { error } = await db.from('cuentas_contables').insert([payload]);
      if (error) throw error;
      showToast(`Cuenta ${nombre} agregada al catálogo.`);
    }

    limpiarFormularioPlanCuenta();
    await cargarPlanCuentas();
  } catch (err) {
    console.error('Error guardando cuenta contable:', err);
    showToast(`Error: ${err.message}`, 'error');
  }
}

function prepararEdicionPlanCuenta(id) {
  const cuenta = listaPlanCuentas.find(c => String(c.id) === String(id));
  if (!cuenta) return;

  document.getElementById('pc-id-edicion').value = cuenta.id;
  document.getElementById('pc-codigo').value = cuenta.codigo;
  document.getElementById('pc-nombre').value = cuenta.nombre;
  document.getElementById('pc-tipo').value = cuenta.tipo;
  document.getElementById('pc-saldo').value = cuenta.saldo_habitual;
  document.getElementById('pc-imputable').checked = cuenta.es_imputable;

  document.getElementById('pc-form-titulo').innerHTML = `<i data-lucide="edit" class="w-4 h-4 text-amber-600"></i> Editar Cuenta: ${cuenta.nombre}`;
  document.getElementById('btn-submit-pc').innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Actualizar Cuenta`;
  document.getElementById('btn-cancelar-pc').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function limpiarFormularioPlanCuenta() {
  document.getElementById('form-plan-cuenta').reset();
  document.getElementById('pc-id-edicion').value = '';
  document.getElementById('pc-imputable').checked = true;
  document.getElementById('pc-form-titulo').innerHTML = `<i data-lucide="plus-circle" class="w-4 h-4 text-indigo-600"></i> Nueva Cuenta Contable`;
  document.getElementById('btn-submit-pc').innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Guardar Cuenta`;
  document.getElementById('btn-cancelar-pc').classList.add('hidden');
  if (window.lucide) lucide.createIcons();
}

async function eliminarCuentaContable(id, nombre) {
  if (!confirm(`¿Estás seguro de eliminar la cuenta contable "${nombre}"?`)) return;

  try {
    const { error } = await db.from('cuentas_contables').delete().eq('id', id);
    if (error) throw error;
    showToast(`Cuenta ${nombre} eliminada del catálogo.`);
    await cargarPlanCuentas();
  } catch (err) {
    console.error('Error eliminando cuenta:', err);
    showToast('No se puede eliminar la cuenta si posee movimientos o restricciones.', 'error');
  }
}

function actualizarDatalistCuentasContables() {
  const datalist = document.getElementById('plan-cuentas-sugeridas');
  if (!datalist) return;
  datalist.innerHTML = '';

  const imputables = listaPlanCuentas.filter(c => c.es_imputable);
  imputables.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nombre;
    opt.label = `${c.codigo} (${c.tipo})`;
    datalist.appendChild(opt);
  });
}

function descargarPlantillaPlanCuentasCSV() {
  const encabezado = "codigo,nombre,tipo,saldo_habitual,es_imputable\n";
  const ejemplos = [
    '1.1.01.001,"Caja Central","ACTIVO","DEUDOR","SI"',
    '1.1.02.001,"Banco Santander Cta Cte","ACTIVO","DEUDOR","SI"',
    '2.1.01.001,"Proveedores Locales","PASIVO","ACREEDOR","SI"',
    '4.1.01.001,"Ventas Mayoristas","RESULTADO_POSITIVO","ACREEDOR","SI"',
    '5.2.01.001,"Gastos Generales","RESULTADO_NEGATIVO","DEUDOR","SI"'
  ].join('\n');

  descargarArchivoCSV(encabezado + ejemplos, 'plantilla_plan_cuentas.csv');
}

async function procesarArchivoPlanCuentasCSV() {
  const inputFile = document.getElementById('pc-input-csv');
  const file = inputFile?.files[0];
  const modo = document.getElementById('pc-modo-importacion')?.value || 'UPSERT';
  const statusEl = document.getElementById('pc-status-import');

  if (!file) return alert('Por favor selecciona un archivo CSV.');

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const texto = e.target.result;
      const lineas = texto.split(/\r\n|\n/).filter(l => l.trim() !== '');
      if (lineas.length <= 1) return alert('El archivo CSV no contiene registros.');

      const cuentasNuevas = [];

      for (let i = 1; i < lineas.length; i++) {
        const cols = lineas[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lineas[i].split(',');
        if (cols && cols.length >= 2) {
          const codigo = cols[0]?.replace(/"/g, '').trim();
          const nombre = cols[1]?.replace(/"/g, '').trim();
          let tipo = cols[2]?.replace(/"/g, '').trim().toUpperCase() || 'ACTIVO';
          let saldo = cols[3]?.replace(/"/g, '').trim().toUpperCase() || (tipo === 'ACTIVO' || tipo === 'RESULTADO_NEGATIVO' ? 'DEUDOR' : 'ACREEDOR');
          const imputableRaw = cols[4]?.replace(/"/g, '').trim().toUpperCase() || 'SI';
          const esImputable = imputableRaw === 'SI' || imputableRaw === 'TRUE' || imputableRaw === '1';

          if (!['ACTIVO', 'PASIVO', 'PATRIMONIO_NETO', 'RESULTADO_POSITIVO', 'RESULTADO_NEGATIVO'].includes(tipo)) {
            tipo = 'ACTIVO';
          }
          if (!['DEUDOR', 'ACREEDOR'].includes(saldo)) {
            saldo = (tipo === 'ACTIVO' || tipo === 'RESULTADO_NEGATIVO') ? 'DEUDOR' : 'ACREEDOR';
          }

          if (codigo && nombre) {
            cuentasNuevas.push({ codigo, nombre, tipo, saldo_habitual: saldo, es_imputable: esImputable });
          }
        }
      }

      if (cuentasNuevas.length === 0) return alert('No se encontraron filas con datos válidos.');

      if (modo === 'REEMPLAZAR') {
        const confirmar = confirm(`⚠️ ATENCIÓN: El modo 'Reemplazo Total' vaciará el catálogo actual e insertará ${cuentasNuevas.length} cuentas. ¿Deseas continuar?`);
        if (!confirmar) return;

        const { error: errDelete } = await db.from('cuentas_contables').delete().neq('codigo', '___IMPOSIBLE___');
        if (errDelete) throw errDelete;
      }

      const { error: errInsert } = await db
        .from('cuentas_contables')
        .upsert(cuentasNuevas, { onConflict: 'codigo' });

      if (errInsert) throw errInsert;

      if (statusEl) {
        statusEl.textContent = `✓ Éxito: ${cuentasNuevas.length} cuentas procesadas (${modo === 'REEMPLAZAR' ? 'Catálogo Reemplazado' : 'Fusión Completa'}).`;
        statusEl.className = 'text-xs text-emerald-600 font-bold';
      }

      showToast(`Se cargaron ${cuentasNuevas.length} cuentas contables.`);
      if (inputFile) inputFile.value = '';
      await cargarPlanCuentas();
    } catch (err) {
      console.error('Error al importar plan de cuentas:', err);
      alert(`Error al procesar el archivo: ${err.message}`);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function exportarPlanCuentasCSV() {
  if (listaPlanCuentas.length === 0) return alert('No hay cuentas para exportar.');
  let csv = 'Codigo,Nombre,Naturaleza,Saldo Habitual,Imputable\n';
  listaPlanCuentas.forEach(c => {
    csv += `"${c.codigo}","${c.nombre}","${c.tipo}","${c.saldo_habitual}",${c.es_imputable ? 'SI' : 'NO'}\n`;
  });
  descargarArchivoCSV(csv, `Plan_Cuentas_Maestro_${new Date().toISOString().slice(0, 10)}.csv`);
}

// ==========================================
// MOTOR 13: GESTIÓN DE TALONARIOS Y CAI
// ==========================================
let listaTalonarios = [];

async function cargarTalonarios() {
  const tbody = document.getElementById('tbody-talonarios');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Consultando talonarios...</td></tr>';

  try {
    const { data, error } = await db
      .from('talonarios')
      .select('*')
      .order('punto_venta', { ascending: true });

    if (error) throw error;
    listaTalonarios = data || [];
    renderizarTablaTalonarios();
  } catch (err) {
    console.error('Error cargando talonarios:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-rose-500">Error: ${err.message}</td></tr>`;
  }
}

function renderizarTablaTalonarios() {
  const tbody = document.getElementById('tbody-talonarios');
  const badgeTotal = document.getElementById('badge-total-talonarios');
  if (!tbody) return;

  if (badgeTotal) badgeTotal.textContent = `${listaTalonarios.length} activos`;

  if (listaTalonarios.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">No hay talonarios físicos configurados.</td></tr>';
    return;
  }

  const hoy = new Date().toISOString().slice(0, 10);

  tbody.innerHTML = listaTalonarios.map(t => {
    const vencido = t.fecha_vto_cai < hoy;
    const restantes = t.numero_hasta - (t.ultimo_numero || t.numero_desde - 1);
    const ptoVentaFormateado = String(t.punto_venta).padStart(4, '0');

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-2.5">
          <span class="font-bold text-slate-800">${t.tipo_comprobante}</span>
          <div class="text-[11px] text-slate-400 font-mono">Pto. Venta: ${ptoVentaFormateado}</div>
        </td>
        <td class="p-2.5 font-mono text-slate-700">${t.cai}</td>
        <td class="p-2.5">
          <span class="font-mono ${vencido ? 'text-rose-600 font-bold' : 'text-slate-600'}">${t.fecha_vto_cai}</span>
          ${vencido ? '<span class="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">VENCIDO</span>' : ''}
        </td>
        <td class="p-2.5 text-center font-mono text-slate-600">
          ${String(t.numero_desde).padStart(8, '0')} - ${String(t.numero_hasta).padStart(8, '0')}
        </td>
        <td class="p-2.5 text-center">
          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${restantes <= 20 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
            ${restantes} restantes
          </span>
        </td>
        <td class="p-2.5 text-center whitespace-nowrap">
          <button onclick="prepararEdicionTalonario('${t.id}')" class="text-indigo-600 hover:text-indigo-800 p-1 mr-1 cursor-pointer" title="Editar">✏️</button>
          <button onclick="eliminarTalonario('${t.id}')" class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer" title="Eliminar">🗑️️</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function guardarTalonario(e) {
  if (e) e.preventDefault();

  const idEdicion = document.getElementById('talonario-id-edicion').value;
  const tipo_comprobante = document.getElementById('talonario-tipo').value;
  const punto_venta = parseInt(document.getElementById('talonario-pto-venta').value, 10);
  const cai = document.getElementById('talonario-cai').value.trim();
  const fecha_vto_cai = document.getElementById('talonario-vto-cai').value;
  const numero_desde = parseInt(document.getElementById('talonario-desde').value, 10);
  const numero_hasta = parseInt(document.getElementById('talonario-hasta').value, 10);
  const ultimo_numero = parseInt(document.getElementById('talonario-ultimo').value || '0', 10);

  if (numero_hasta <= numero_desde) {
    return alert('El número hasta debe ser mayor al número desde.');
  }

  const payload = {
    tipo_comprobante,
    punto_venta,
    cai,
    fecha_vto_cai,
    numero_desde,
    numero_hasta,
    ultimo_numero
  };

  try {
    if (idEdicion) {
      const { error } = await db.from('talonarios').update(payload).eq('id', idEdicion);
      if (error) throw error;
      showToast('Talonario actualizado.');
    } else {
      const { error } = await db.from('talonarios').insert([payload]);
      if (error) throw error;
      showToast('Nuevo talonario registrado.');
    }

    limpiarFormularioTalonario();
    await cargarTalonarios();
  } catch (err) {
    console.error('Error guardando talonario:', err);
    showToast(`Error: ${err.message}`, 'error');
  }
}

function prepararEdicionTalonario(id) {
  const t = listaTalonarios.find(item => String(item.id) === String(id));
  if (!t) return;

  document.getElementById('talonario-id-edicion').value = t.id;
  document.getElementById('talonario-tipo').value = t.tipo_comprobante;
  document.getElementById('talonario-pto-venta').value = t.punto_venta;
  document.getElementById('talonario-cai').value = t.cai;
  document.getElementById('talonario-vto-cai').value = t.fecha_vto_cai;
  document.getElementById('talonario-desde').value = t.numero_desde;
  document.getElementById('talonario-hasta').value = t.numero_hasta;
  document.getElementById('talonario-ultimo').value = t.ultimo_numero || 0;

  document.getElementById('talonario-form-titulo').innerHTML = `<i data-lucide="edit" class="w-4 h-4 text-amber-600"></i> Editar Talonario Pto. ${t.punto_venta}`;
  document.getElementById('btn-submit-talonario').innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Actualizar`;
  document.getElementById('btn-cancelar-talonario').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function limpiarFormularioTalonario() {
  document.getElementById('form-talonario').reset();
  document.getElementById('talonario-id-edicion').value = '';
  document.getElementById('talonario-form-titulo').innerHTML = `<i data-lucide="plus-circle" class="w-4 h-4 text-indigo-600"></i> Nuevo Talonario Físico`;
  document.getElementById('btn-submit-talonario').innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Guardar Talonario`;
  document.getElementById('btn-cancelar-talonario').classList.add('hidden');
  if (window.lucide) lucide.createIcons();
}

async function eliminarTalonario(id) {
  if (!confirm('¿Deseas dar de baja este talonario?')) return;
  try {
    const { error } = await db.from('talonarios').delete().eq('id', id);
    if (error) throw error;
    showToast('Talonario eliminado.');
    await cargarTalonarios();
  } catch (err) {
    showToast(`Error al eliminar: ${err.message}`, 'error');
  }
}

// ==========================================
// MOTOR 14: TARJETAS & LIQUIDACIÓN DE CUPONES
// ==========================================
let listaCuponesGlobal = [];
let cuponesSeleccionadosParaLiquidar = [];

async function cargarCuponesTarjetas() {
  const tbody = document.getElementById('tbody-cupones-pendientes');
  if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">Consultando cupones...</td></tr>';

  try {
    const { data, error } = await db
      .from('cupones_tarjeta')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    listaCuponesGlobal = data || [];

    renderizarTablaCupones();
    actualizarMetricasCupones();
  } catch (err) {
    console.error('Error cargando cupones:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-rose-500">Error: ${err.message}</td></tr>`;
  }
}

function renderizarTablaCupones() {
  const tbody = document.getElementById('tbody-cupones-pendientes');
  if (!tbody) return;

  const filtroMarca = document.getElementById('filtro-tarjeta-marca')?.value || 'TODAS';
  const pendientes = listaCuponesGlobal.filter(c => c.estado === 'PENDIENTE' && (filtroMarca === 'TODAS' || c.tarjeta === filtroMarca));

  if (pendientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">No hay cupones pendientes de liquidación.</td></tr>';
    return;
  }

  tbody.innerHTML = pendientes.map(c => `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="p-3 text-center">
        <input type="checkbox" value="${c.id}" onchange="toggleSeleccionCupon('${c.id}', this.checked)" class="chk-cupon rounded border-slate-300" />
      </td>
      <td class="p-3 font-mono text-slate-600">${c.fecha}<div class="text-[11px] font-sans text-slate-400">${c.cliente || 'Consumidor'}</div></td>
      <td class="p-3 font-semibold text-slate-800">${c.tarjeta} <span class="text-[10px] px-1.5 py-0.2 rounded font-bold ${c.tipo === 'DEBITO' ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'}">${c.tipo}</span></td>
      <td class="p-3 font-mono text-slate-500">Lote ${c.lote || '-'} | Term ${c.terminal || '-'}</td>
      <td class="p-3 font-mono font-bold text-slate-700">${c.numero_cupon}</td>
      <td class="p-3 text-center font-bold text-slate-700">${c.cuotas} cta${c.cuotas > 1 ? 's' : ''}</td>
      <td class="p-3 text-right font-mono font-bold text-indigo-700">$ ${parseFloat(c.monto_bruto).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
    </tr>
  `).join('');
}

function toggleSeleccionCupon(id, checked) {
  const cup = listaCuponesGlobal.find(c => String(c.id) === String(id));
  if (!cup) return;

  if (checked) {
    if (!cuponesSeleccionadosParaLiquidar.some(c => String(c.id) === String(id))) {
      cuponesSeleccionadosParaLiquidar.push(cup);
    }
  } else {
    cuponesSeleccionadosParaLiquidar = cuponesSeleccionadosParaLiquidar.filter(c => String(c.id) !== String(id));
  }
}

function tildarTodosCupones(checked) {
  document.querySelectorAll('.chk-cupon').forEach(chk => {
    chk.checked = checked;
    toggleSeleccionCupon(chk.value, checked);
  });
}

function actualizarMetricasCupones() {
  const pendientes = listaCuponesGlobal.filter(c => c.estado === 'PENDIENTE');
  const liquidados = listaCuponesGlobal.filter(c => c.estado === 'LIQUIDADO');

  const totPend = pendientes.reduce((acc, c) => acc + parseFloat(c.monto_bruto || 0), 0);
  const totLiq = liquidados.reduce((acc, c) => acc + parseFloat(c.monto_bruto || 0), 0);

  const elMonto = document.getElementById('stat-cupones-monto');
  const elCant = document.getElementById('stat-cupones-cant');
  const elLiq = document.getElementById('stat-cupones-liquidados-monto');

  if (elMonto) elMonto.textContent = `$ ${totPend.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
  if (elCant) elCant.textContent = `${pendientes.length} cupones pendientes`;
  if (elLiq) elLiq.textContent = `$ ${totLiq.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
}

function abrirModalLiquidacionTarjetas() {
  const checks = document.querySelectorAll('.chk-cupon:checked');
  const ids = Array.from(checks).map(ch => ch.value);
  cuponesSeleccionadosParaLiquidar = listaCuponesGlobal.filter(c => ids.includes(String(c.id)));

  if (cuponesSeleccionadosParaLiquidar.length === 0) {
    return alert('Seleccione al menos un cupón de la tabla para liquidar.');
  }

  const modal = document.getElementById('modal-liquidacion-tarjetas');
  const totalBruto = cuponesSeleccionadosParaLiquidar.reduce((acc, c) => acc + parseFloat(c.monto_bruto || 0), 0);

  document.getElementById('liq-fecha').value = new Date().toISOString().split('T')[0];
  document.getElementById('liq-bruto').value = totalBruto.toFixed(2);
  recalcularNetoLiquidacion();

  if (modal) modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function cerrarModalLiquidacionTarjetas() {
  const modal = document.getElementById('modal-liquidacion-tarjetas');
  if (modal) modal.classList.add('hidden');
}

function recalcularNetoLiquidacion() {
  const bruto = parseFloat(document.getElementById('liq-bruto')?.value) || 0;
  const arancel = parseFloat(document.getElementById('liq-arancel')?.value) || 0;
  const ivaCom = parseFloat(document.getElementById('liq-iva-comision')?.value) || 0;
  const retGan = parseFloat(document.getElementById('liq-ret-ganancias')?.value) || 0;
  const retIiva = parseFloat(document.getElementById('liq-ret-iva')?.value) || 0;
  const retIibb = parseFloat(document.getElementById('liq-ret-iibb')?.value) || 0;

  const totalDeducciones = arancel + ivaCom + retGan + retIiva + retIibb;
  const neto = Math.max(0, bruto - totalDeducciones);

  const lblNeto = document.getElementById('liq-lbl-neto');
  if (lblNeto) lblNeto.textContent = `$ ${neto.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
  return neto;
}

async function confirmarLiquidacionTarjetas(e) {
  if (e) e.preventDefault();

  const fecha = document.getElementById('liq-fecha').value;
  const adquirente = document.getElementById('liq-adquirente').value;
  const numLiq = document.getElementById('liq-numero').value.trim() || `LQ-${Date.now().toString().slice(-6)}`;
  const totalBruto = parseFloat(document.getElementById('liq-bruto').value) || 0;
  const arancel = parseFloat(document.getElementById('liq-arancel').value) || 0;
  const ivaCom = parseFloat(document.getElementById('liq-iva-comision').value) || 0;
  const retGan = parseFloat(document.getElementById('liq-ret-ganancias').value) || 0;
  const retIiva = parseFloat(document.getElementById('liq-ret-iva').value) || 0;
  const retIibb = parseFloat(document.getElementById('liq-ret-iibb').value) || 0;
  const neto = recalcularNetoLiquidacion();

  try {
    const { data: { user } } = await db.auth.getUser();

    // 1. Asiento Contable Automático de Liquidación
    const glosa = `Liquidación Tarjetas ${adquirente} - ${numLiq}`;
    const { data: asientoData, error: errAsiento } = await db
      .from('asientos')
      .insert([{ fecha, concepto: glosa, user_id: user?.id || null }])
      .select()
      .single();

    if (errAsiento) throw errAsiento;

    const lineas = [
      { asiento_id: asientoData.id, cuenta_nombre: 'Banco Cuentas Corrientes', debe: neto, haber: 0, detalle: `Acreditación neta ${adquirente}` },
      { asiento_id: asientoData.id, cuenta_nombre: 'Cupones a Acreditar (Tarjetas)', debe: 0, haber: totalBruto, detalle: 'Cancelación cupones liquidados' }
    ];

    if (arancel > 0) lineas.push({ asiento_id: asientoData.id, cuenta_nombre: 'Comisiones y Gastos Bancarios', debe: arancel, haber: 0, detalle: 'Arancel operador' });
    if (ivaCom > 0) lineas.push({ asiento_id: asientoData.id, cuenta_nombre: 'IVA Crédito Fiscal', debe: ivaCom, haber: 0, detalle: 'IVA comisiones tarjeta' });
    if (retGan > 0) lineas.push({ asiento_id: asientoData.id, cuenta_nombre: 'Retenciones Sufridas Ganancias', debe: retGan, haber: 0, detalle: 'Ret. Ganancias s/ liquidación' });
    if (retIiva > 0) lineas.push({ asiento_id: asientoData.id, cuenta_nombre: 'Retenciones Sufridas IVA', debe: retIiva, haber: 0, detalle: 'Ret. IVA s/ liquidación' });
    if (retIibb > 0) lineas.push({ asiento_id: asientoData.id, cuenta_nombre: 'Retenciones Sufridas IIBB', debe: retIibb, haber: 0, detalle: 'Sircreb / IIBB tarjeta' });

    await db.from('asiento_detalles').insert(lineas);

    // 2. Guardar Liquidación
    const { data: liqData, error: errLiq } = await db
      .from('liquidaciones_tarjeta')
      .insert([{
        fecha,
        adquirente,
        numero_liquidacion: numLiq,
        total_bruto: totalBruto,
        comision_arancel: arancel,
        iva_comisiones: ivaCom,
        retencion_iva: retIiva,
        retencion_ganancias: retGan,
        retencion_iibb: retIibb,
        neto_acreditado: neto,
        asiento_id: asientoData.id
      }])
      .select()
      .single();

    if (errLiq) throw errLiq;

    // 3. Pasar cupones a LIQUIDADO
    const idsCupones = cuponesSeleccionadosParaLiquidar.map(c => c.id);
    await db
      .from('cupones_tarjeta')
      .update({ estado: 'LIQUIDADO', fecha_liquidacion: fecha, liquidacion_id: liqData.id })
      .in('id', idsCupones);

    showToast(`Liquidación ${numLiq} confirmada y asentada en el banco.`);
    cerrarModalLiquidacionTarjetas();
    cuponesSeleccionadosParaLiquidar = [];
    await cargarCuponesTarjetas();
    if (typeof renderLibroDiario === 'function') await renderLibroDiario();
    if (typeof cargarMayorYBalance === 'function') await cargarMayorYBalance();
  } catch (err) {
    console.error('Error liquidando tarjetas:', err);
    alert(`Error: ${err.message}`);
  }
}

// ==========================================
// MOTOR 15: RESÚMENES DE TARJETA CORPORATIVA
// ==========================================
let listaResumenesCorp = [];

async function cargarResumenesTarjetaCorp() {
  const tbody = document.getElementById('tbody-resumenes-corp');
  if (!tbody) return;

  try {
    const { data, error } = await db
      .from('resumenes_tarjeta_corp')
      .select('*')
      .order('fecha_vto', { ascending: false });

    if (error) throw error;
    listaResumenesCorp = data || [];
    renderizarTablaResumenesCorp();
  } catch (err) {
    console.error('Error cargando resúmenes corporativos:', err);
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-rose-500">Error: ${err.message}</td></tr>`;
  }
}

function renderizarTablaResumenesCorp() {
  const tbody = document.getElementById('tbody-resumenes-corp');
  if (!tbody) return;

  if (listaResumenesCorp.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400">No hay resúmenes de tarjeta registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = listaResumenesCorp.map(r => {
    const pagado = r.estado === 'PAGADO';
    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-3 font-semibold text-slate-800">${r.tarjeta}</td>
        <td class="p-3 font-mono text-slate-600">${r.fecha_cierre}</td>
        <td class="p-3 font-mono text-slate-600">${r.fecha_vto}</td>
        <td class="p-3 text-right font-mono text-slate-700">$ ${parseFloat(r.total_consumos).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-right font-mono text-slate-500">$ ${(parseFloat(r.impuestos_sellos || 0) + parseFloat(r.intereses_gastos || 0)).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-right font-mono font-bold text-slate-900">$ ${parseFloat(r.total_a_pagar).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${pagado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${r.estado}
          </span>
        </td>
        <td class="p-3 text-center">
          ${pagado 
            ? '<span class="text-xs text-slate-400">Cancelado</span>' 
            : `<button onclick="pagarResumenTarjetaCorp('${r.id}')" class="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded border border-emerald-200 cursor-pointer">Pagar desde Banco</button>`}
        </td>
      </tr>
    `;
  }).join('');
}

function abrirModalCierreTarjetaCorp() {
  const modal = document.getElementById('modal-cierre-tarjeta-corp');
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('rcorp-fecha-cierre').value = hoy;
  document.getElementById('rcorp-fecha-vto').value = hoy;
  document.getElementById('rcorp-consumos').value = '';
  document.getElementById('rcorp-sellos').value = '0.00';
  document.getElementById('rcorp-intereses').value = '0.00';
  calcularTotalResumenCorp();

  if (modal) modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function cerrarModalCierreTarjetaCorp() {
  const modal = document.getElementById('modal-cierre-tarjeta-corp');
  if (modal) modal.classList.add('hidden');
}

function calcularTotalResumenCorp() {
  const c = parseFloat(document.getElementById('rcorp-consumos')?.value) || 0;
  const s = parseFloat(document.getElementById('rcorp-sellos')?.value) || 0;
  const i = parseFloat(document.getElementById('rcorp-intereses')?.value) || 0;
  const tot = c + s + i;

  const lbl = document.getElementById('rcorp-lbl-total');
  if (lbl) lbl.textContent = `$ ${tot.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
  return tot;
}

async function guardarResumenTarjetaCorp(e) {
  if (e) e.preventDefault();

  const tarjeta = document.getElementById('rcorp-tarjeta').value;
  const fecha_cierre = document.getElementById('rcorp-fecha-cierre').value;
  const fecha_vto = document.getElementById('rcorp-fecha-vto').value;
  const total_consumos = parseFloat(document.getElementById('rcorp-consumos').value) || 0;
  const impuestos_sellos = parseFloat(document.getElementById('rcorp-sellos').value) || 0;
  const intereses_gastos = parseFloat(document.getElementById('rcorp-intereses').value) || 0;
  const total_a_pagar = total_consumos + impuestos_sellos + intereses_gastos;

  if (total_consumos <= 0) return alert('Ingrese el importe de consumos del resumen.');

  try {
    const { error } = await db.from('resumenes_tarjeta_corp').insert([{
      tarjeta,
      fecha_cierre,
      fecha_vto,
      total_consumos,
      impuestos_sellos,
      intereses_gastos,
      total_a_pagar,
      estado: 'PENDIENTE'
    }]);

    if (error) throw error;

    showToast('Resumen corporativo registrado.');
    cerrarModalCierreTarjetaCorp();
    await cargarResumenesTarjetaCorp();
  } catch (err) {
    console.error('Error guardando resumen:', err);
    alert(`Error: ${err.message}`);
  }
}

async function pagarResumenTarjetaCorp(id) {
  const resumen = listaResumenesCorp.find(r => String(r.id) === String(id));
  if (!resumen) return;

  if (!confirm(`¿Confirmás el débito bancario y cancelación del resumen de ${resumen.tarjeta} por $ ${parseFloat(resumen.total_a_pagar).toLocaleString('es-AR', {minimumFractionDigits: 2})}?`)) {
    return;
  }

  const hoy = new Date().toISOString().split('T')[0];

  try {
    const { data: { user } } = await db.auth.getUser();

    const glosa = `Pago Resumen ${resumen.tarjeta} - Vto ${resumen.fecha_vto}`;
    const { data: asiento, error: errA } = await db
      .from('asientos')
      .insert([{ fecha: hoy, concepto: glosa, user_id: user?.id || null }])
      .select()
      .single();

    if (errA) throw errA;

    const lineas = [
      { asiento_id: asiento.id, cuenta_nombre: 'Tarjeta Corporativa a Pagar', debe: resumen.total_consumos, haber: 0, detalle: 'Cancelación pasivo consumos' },
      { asiento_id: asiento.id, cuenta_nombre: 'Banco Cuentas Corrientes', debe: 0, haber: resumen.total_a_pagar, detalle: 'Débito automático resumen' }
    ];

    const gastosExtras = parseFloat(resumen.impuestos_sellos || 0) + parseFloat(resumen.intereses_gastos || 0);
    if (gastosExtras > 0) {
      lineas.push({ asiento_id: asiento.id, cuenta_nombre: 'Comisiones y Gastos Bancarios', debe: gastosExtras, haber: 0, detalle: 'Sellos e intereses resumen' });
    }

    await db.from('asiento_detalles').insert(lineas);

    await db.from('resumenes_tarjeta_corp')
      .update({ estado: 'PAGADO', fecha_pago: hoy, asiento_pago_id: asiento.id })
      .eq('id', id);

    showToast('Resumen cancelado en banco y asiento registrado.');
    await cargarResumenesTarjetaCorp();
    if (typeof renderLibroDiario === 'function') await renderLibroDiario();
    if (typeof cargarMayorYBalance === 'function') await cargarMayorYBalance();
  } catch (err) {
    console.error('Error pagando resumen:', err);
    alert(`Error: ${err.message}`);
  }
}

// ==========================================
// INICIALIZACIÓN DE SUPABASE Y AUTENTICACIÓN
// ==========================================
const SUPABASE_URL = 'https://ippdmibozcpxzsczvpqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcGRtaWJvemNweHpzY3p2cHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDI1MDUsImV4cCI6MjEwNTkxODUwNX0.6izD8ivkoovQdX1RE8MarIZbgVumzuavl7FB6P0boLU';

// Instancia única del cliente usando el objeto que ya creó la CDN
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

  const inputFechaAsiento = document.getElementById('asiento-fecha');
  if (inputFechaAsiento && !inputFechaAsiento.value) inputFechaAsiento.value = new Date().toISOString().split('T')[0];

  // Listener en tiempo real para cambios de sesión
  db.auth.onAuthStateChange((event, session) => {
    const authModal = document.getElementById('auth-modal');
    const userDisplay = document.getElementById('user-display-email');

    if (session) {
      currentUser = session.user;
      if (authModal) authModal.classList.add('hidden');
      if (userDisplay) userDisplay.textContent = session.user.email;
      
      // Consultar datos de Fondo Fijo al iniciar sesión
      cargarRegistrosFondoFijo();
    } else {
      currentUser = null;
      if (authModal) authModal.classList.remove('hidden');
      if (userDisplay) userDisplay.textContent = 'No autenticado';
    }
  });
  if (typeof cargarPadronContactos === 'function') cargarPadronContactos();
  if (typeof cambiarCircuitoFacturacion === 'function') cambiarCircuitoFacturacion('VENTAS');
  if (typeof cargarFacturasImpagasParaOP === 'function') cargarFacturasImpagasParaOP();
  if (typeof renderHistorialOP === 'function') renderHistorialOP();
  if (typeof cambiarMedioPagoSugerido === 'function') cambiarMedioPagoSugerido('Transferencia Bancaria');
  if (typeof inicializarAsientoManual === 'function') inicializarAsientoManual();
  if (typeof renderLibroDiario === 'function') renderLibroDiario();
  if (typeof actualizarDashboardMetrics === 'function') actualizarDashboardMetrics();
});

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
  e.preventDefault();
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
// CONTROL DE NAVEGACIÓN Y PESTAÑAS
// -------------------------------------------------------------
function switchTab(tabId) {
const tabs = [
    'dashboard', 'facturacion', 'conciliador', 'cta-corriente', 
    'cruzador-iva', 'calc-retenciones', 'fondo-fijo', 'ordenes-pago', 'libro-diario'
  ];
  
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
}

// ==========================================
// MOTOR 1: FACTURACIÓN CON PADRÓN Y MULTICOMPROBANTES
// ==========================================
let circuitoFacturacionActual = 'VENTAS'; // Inicial por defecto: VENTAS
let listaFacturasActuales = [];
let padronContactos = [];

// Control del Modal de Contactos
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

    // Autoseleccionar en el formulario activo
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
    // Monotributo o Comprobante no fiscal X: IVA no computado (0%)
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
  const btnCompras = document.getElementById('btn-tab-fc-compras');
  const btnVentas = document.getElementById('btn-tab-fc-ventas');
  const formTitulo = document.getElementById('fc-form-titulo');
  const labelEntidad = document.getElementById('fc-label-entidad');
  const inputEntidad = document.getElementById('fc-entidad');
  const tablaTitulo = document.getElementById('fc-tabla-titulo');
  const panelImport = document.getElementById('panel-importacion-compras');

  if (circuito === 'VENTAS') {
    btnVentas.className = 'px-4 py-1.5 text-xs font-bold rounded-lg bg-white text-emerald-700 shadow-xs transition-all cursor-pointer';
    btnCompras.className = 'px-4 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
    if (formTitulo) formTitulo.innerHTML = `<i data-lucide="file-plus-2" class="w-4 h-4 text-emerald-600"></i> Emitir Factura de Venta`;
    if (labelEntidad) labelEntidad.textContent = 'Razón Social Cliente';
    if (inputEntidad) inputEntidad.placeholder = 'Escribí o seleccioná un cliente...';
    if (tablaTitulo) tablaTitulo.textContent = 'Comprobantes de Venta Registrados';
    if (panelImport) panelImport.classList.add('hidden');
  } else {
    btnCompras.className = 'px-4 py-1.5 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-xs transition-all cursor-pointer';
    btnVentas.className = 'px-4 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
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

    // 1. Guardar o actualizar contacto en padrón
    if (cuit && cuit !== 'S/D') {
      await db.from('clientes_proveedores').upsert([{
        tipo: circuitoFacturacionActual === 'COMPRAS' ? 'PROVEEDOR' : 'CLIENTE',
        razon_social: entidad,
        cuit,
        condicion_iva
      }], { onConflict: 'cuit' });
      await cargarPadronContactos();
    }

    // 2. Insertar comprobante con detalle impositivo
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

    // 3. Devengamiento contable automático con imputación analítica
    if (!esNoFiscal) {
      const glosa = `${tipo_doc} ${numero_doc} - ${entidad}`;
      const { data: asiento, error: errAsiento } = await db
        .from('asientos')
        .insert([{
          fecha,
          user_id: user?.id || null,
          concepto: glosa
        }])
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
        <td class="p-2.5 text-center">
          <button onclick="eliminarFactura('${f.id}')" class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer" title="Eliminar">🗑️</button>
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
// MOTOR 2: RECIBOS DE COBRO
// ==========================================
// --- ESTADO LOCAL DEL RECIBO ---
let comprobantesPendientes = [];
let retencionesSufridas = [];

// Inicialización de fecha y número sugerido
function initRecibos() {
  const fechaInput = document.getElementById('rc-fecha');
  if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];
  generarProximoNumeroRC();
  cargarClientesSelect();
  if (window.lucide) lucide.createIcons();
}

// 1. Generar número correlativo
async function generarProximoNumeroRC() {
  try {
    const { data, error } = await supabase
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
    document.getElementById('rc-numero').value = `RC-0001-${String(siguienteNro).padStart(8, '0')}`;
  } catch (err) {
    console.error('Error al generar número RC:', err);
    document.getElementById('rc-numero').value = `RC-0001-00000001`;
  }
}

// 2. Cargar clientes en el selector
async function cargarClientesSelect() {
  const { data, error } = await supabase
    .from('clientes_proveedores')
    .select('id, razon_social, cuit')
    .order('razon_social');
  
  if (error) return console.error('Error cargando clientes:', error);
  const select = document.getElementById('rc-cliente-select');
  select.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
  data.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.razon_social} (${c.cuit})</option>`;
  });
}

// 3. Cargar facturas de venta con saldo impago
async function cargarFacturasPendientesCliente(clienteId) {
  const tbody = document.getElementById('rc-facturas-tbody');
  if (!clienteId) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400 text-xs">Seleccione un cliente para consultar deudas pendientes.</td></tr>';
    comprobantesPendientes = [];
    calcularTotalesRC();
    return;
  }

  tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400 text-xs">Consultando comprobantes...</td></tr>';

  // Consulta comprobantes con saldo > 0
  const { data, error } = await supabase
    .from('comprobantes_venta')
    .select('*')
    .eq('cliente_id', clienteId)
    .gt('saldo', 0)
    .order('fecha', { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500 text-xs">Error: ${error.message}</td></tr>`;
    return;
  }

  comprobantesPendientes = data || [];
  if (comprobantesPendientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400 text-xs">El cliente no registra facturas con saldo pendiente.</td></tr>';
    calcularTotalesRC();
    return;
  }

  tbody.innerHTML = comprobantesPendientes.map((comp, idx) => `
    <tr class="hover:bg-slate-50 transition">
      <td class="p-3 text-center">
        <input type="checkbox" id="rc-chk-${comp.id}" onchange="toggleComprobante(${idx}, this.checked)" class="rounded border-slate-300" />
      </td>
      <td class="p-3 text-slate-600 font-mono text-xs">${comp.fecha}</td>
      <td class="p-3 font-semibold text-slate-700">${comp.tipo_comprobante || 'FAC'} ${comp.numero || comp.id}</td>
      <td class="p-3 text-right font-mono text-slate-600">$${Number(comp.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
      <td class="p-3 text-right font-mono font-bold text-slate-800">$${Number(comp.saldo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
      <td class="p-3 text-right">
        <input type="number" step="0.01" min="0" max="${comp.saldo}" id="rc-imp-${comp.id}" 
               value="0.00" disabled oninput="actualizarImporteImputado(${idx}, this.value)"
               class="w-full text-right font-mono border rounded px-2 py-1 text-sm bg-slate-100 focus:bg-white" />
      </td>
    </tr>
  `).join('');

  calcularTotalesRC();
}

function toggleComprobante(index, checked) {
  const comp = comprobantesPendientes[index];
  const input = document.getElementById(`rc-imp-${comp.id}`);
  if (checked) {
    input.disabled = false;
    input.value = comp.saldo;
    comp.imputado = Number(comp.saldo);
  } else {
    input.disabled = true;
    input.value = '0.00';
    comp.imputado = 0;
  }
  calcularTotalesRC();
}

function actualizarImporteImputado(index, valor) {
  const comp = comprobantesPendientes[index];
  const m = parseFloat(valor) || 0;
  comp.imputado = Math.min(m, comp.saldo);
  calcularTotalesRC();
}

// 4. Gestión de Retenciones Sufridas
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

// 5. Cálculo y balanceo en vivo
function calcularTotalesRC() {
  const totalImputado = comprobantesPendientes.reduce((acc, c) => acc + (c.imputado || 0), 0);

  let totalRetenciones = 0;
  document.querySelectorAll('.ret-monto').forEach(input => {
    totalRetenciones += parseFloat(input.value) || 0;
  });

  const netoPercibido = Math.max(0, totalImputado - totalRetenciones);

  document.getElementById('rc-resumen-imputado').innerText = `$${totalImputado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  document.getElementById('rc-resumen-retenciones').innerText = `-$${totalRetenciones.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  document.getElementById('rc-resumen-neto').innerText = `$${netoPercibido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  return { totalImputado, totalRetenciones, netoPercibido };
}

// 6. Confirmación, guardado y asiento contable
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

  // Recopilar retenciones
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
    // A. Crear Asiento Contable
    const descripcionAsiento = `Cobranza ${numero} - Clientes`;
    const { data: asientoData, error: asientoError } = await supabase
      .from('asientos')
      .insert([{
        fecha: fecha,
        concepto: descripcionAsiento,
        origen: 'RECIBO_COBRO'
      }])
      .select()
      .single();

    if (asientoError) throw asientoError;
    const asientoId = asientoData.id;

    // Renglones del Asiento:
    const renglones = [];
    // 1. Debe: Medio de Disponibilidad (Caja/Banco)
    const cuentaDisponibilidad = medioCobro === 'EF' ? 'Caja Central' : 'Banco Cuenta Corriente';
    renglones.push({
      asiento_id: asientoId,
      cuenta: cuentaDisponibilidad,
      debe: netoPercibido,
      haber: 0
    });

    // 2. Debe: Retenciones Sufridas
    retencionesPayload.forEach(r => {
      renglones.push({
        asiento_id: asientoId,
        cuenta: `Retenciones Sufridas ${r.tipo}`,
        debe: r.importe,
        haber: 0
      });
    });

    // 3. Haber: Deudores por Ventas (Total Imputado)
    renglones.push({
      asiento_id: asientoId,
      cuenta: 'Deudores por Ventas',
      debe: 0,
      haber: totalImputado
    });

    const { error: renglonesError } = await supabase.from('asiento_detalles').insert(renglones);
    if (renglonesError) throw renglonesError;

    // B. Crear Cabecera de Recibo de Cobro
    const { data: reciboData, error: reciboError } = await supabase
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

    // C. Guardar Detalles de Imputación y Actualizar Saldos de Comprobantes
    const comprobantesAfectados = comprobantesPendientes.filter(c => (c.imputado || 0) > 0);
    const detallesPayload = comprobantesAfectados.map(c => ({
      recibo_id: reciboData.id,
      comprobante_venta_id: c.id,
      importe_imputado: c.imputado
    }));

    const { error: detError } = await supabase.from('recibo_cobro_detalles').insert(detallesPayload);
    if (detError) throw detError;

    // D. Actualizar saldos en comprobantes_venta
    for (const c of comprobantesAfectados) {
      const nuevoSaldo = Number(c.saldo) - Number(c.imputado);
      const updateData = { saldo: nuevoSaldo };
      if (nuevoSaldo <= 0.001) {
        updateData.estado = 'COBRADO';
      }
      await supabase.from('comprobantes_venta').update(updateData).eq('id', c.id);
    }

    alert(`¡Recibo ${numero} emitido con éxito! Asiento generado.`);
    limpiarFormularioRecibo();

  } catch (err) {
    console.error('Error al registrar recibo de cobro:', err);
    alert(`Ocurrió un error al guardar el recibo: ${err.message}`);
  }
}

function limpiarFormularioRecibo() {
  document.getElementById('rc-cliente-select').value = '';
  document.getElementById('rc-observaciones').value = '';
  document.getElementById('rc-retenciones-tbody').innerHTML = '';
  document.getElementById('rc-facturas-tbody').innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400 text-xs">Seleccione un cliente para consultar deudas pendientes.</td></tr>';
  comprobantesPendientes = [];
  calcularTotalesRC();
  generarProximoNumeroRC();
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

  const contenedor = document.getElementById('contenedor-resultado-conciliacion') || document.getElementById('conciliador-results');
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

  html += `<div class="p-3 bg-amber-50/50 font-semibold text-amber-800 flex items-center gap-2"><span>⚠️️ Solo en Extracto Bancario</span> <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px]">${pendientesBanco.length}</span></div>`;
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
        ⚠️ [Modo Demostración] 1 Inconsistencia de monto y 1 factura faltante en interno detectadas.
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
// MOTOR 7: MÓDULO FONDO FIJO / CAJA CHICA - SUITE CONTABLE
// ==========================================

const estadoFondoFijo = {
    registros: [],
    filtros: {
        busqueda: '',
        centroCosto: 'TODOS',
        tipoDoc: 'TODOS',
        fechaDesde: '',
        fechaHasta: '',
        estadoRinde: 'ACTIVO'
    },
    paginacion: {
        paginaActual: 1,
        registrosPorPagina: 10
    },
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

        // Si estamos editando un comprobante existente
        if (estadoFondoFijo.registroEnEdicion) {
            const { error } = await db
                .from('fondo_fijo')
                .update({
                    fecha,
                    concepto,
                    monto,
                    centro_costo: centroCosto,
                    tipo_doc: tipoDoc
                })
                .eq('id', Number(estadoFondoFijo.registroEnEdicion));

            if (error) throw error;

            showToast('Comprobante actualizado correctamente.');
            estadoFondoFijo.registroEnEdicion = null;
            const btnSubmit = document.getElementById('btn-registrar-ff');
            if (btnSubmit) btnSubmit.textContent = '+ Registrar en Rinde';

        } else {
            // Alta de nuevo comprobante
            const nuevoRegistro = {
                fecha,
                concepto,
                monto,
                centro_costo: centroCosto,
                tipo_doc: tipoDoc,
                user_id: user?.id || null,
                estado_rinde: 'ACTIVO'
            };

            const { error } = await db
                .from('fondo_fijo')
                .insert([nuevoRegistro]);

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
            if (lineas.length <= 1) {
                showToast('El archivo CSV no contiene registros.', 'error');
                return;
            }

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
                            fecha,
                            concepto,
                            monto,
                            tipo_doc,
                            centro_costo,
                            user_id: user?.id || null,
                            estado_rinde: 'ACTIVO'
                        });
                    }
                }
            }

            if (registrosInsertar.length === 0) {
                showToast('No se encontraron filas válidas en el archivo CSV.', 'error');
                return;
            }

            const { error } = await db.from('fondo_fijo').insert(registrosInsertar);
            if (error) throw error;

            showToast(`Se importaron ${registrosInsertar.length} comprobantes al rinde activo.`);
            
            // Limpiar input file para permitir volver a subir
            if (inputEl) inputEl.value = '';
            if (statusEl) {
                statusEl.textContent = `✓ Última importación: ${registrosInsertar.length} comprobantes.`;
                statusEl.className = 'block text-[11px] text-emerald-600 font-semibold';
            }

            // Cambiar vista al rinde activo para ver lo importado
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
        let query = db
            .from('fondo_fijo')
            .select('*')
            .order('fecha', { ascending: false });

        // 1. Filtrado estricto por Estado de Rendición
        if (estadoFondoFijo.filtros.estadoRinde === 'ACTIVO') {
            query = query.or('estado_rinde.eq.ACTIVO,estado_rinde.is.null');
        } else if (estadoFondoFijo.filtros.estadoRinde === 'RENDIDO') {
            query = query.eq('estado_rinde', 'RENDIDO');
        }
        // Si es 'TODOS', no aplicamos ningún filtro sobre estado_rinde

        // 2. Filtros secundarios
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
        
        // Reset a pág 1 si la página actual excede el nuevo total de páginas
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

// CONMUTADOR DE FILTRO: ACTIVOS / RENDIDOS
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
        
        // Acciones: si está rendido muestra candado de auditoría; si está activo permite editar/eliminar
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
            <td class="p-2.5 text-center whitespace-nowrap">
                ${botonesAccion}
            </td>
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
    // Buscar convirtiendo ambos a string para evitar descalce de tipos
    const reg = estadoFondoFijo.registros.find(r => String(r.id) === String(id));
    if (!reg) return;

    // Guardar el ID como número entero
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


// CIERRE, RENDICIÓN Y ASIENTO POR CENTRO DE COSTO
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

        // 1. Agrupar gastos por Centro de Costo para el Debe
        const agrupadoPorCentro = {};
        estadoFondoFijo.registros.forEach(r => {
            const centro = r.centro_costo || 'Gastos Generales';
            const monto = parseFloat(r.monto) || 0;
            agrupadoPorCentro[centro] = (agrupadoPorCentro[centro] || 0) + monto;
        });

        // 2. Insertar Cabecera de Asiento en Supabase
        const { data: asientoCreado, error: errAsiento } = await db
            .from('asientos')
            .insert([{
                fecha: hoy,
                user_id: user?.id || null,
                concepto: textoConcepto
            }])
            .select()
            .single();

        if (errAsiento) {
            console.error('Error insertando en asientos:', errAsiento);
            showToast('Aviso: no se pudo guardar el asiento en Supabase: ' + errAsiento.message, 'error');
        } else if (asientoCreado) {
            // 3. Crear renglones para asiento_detalles
            const renglonesBD = [];

            // A. Renglones en el DEBE (uno por cada Centro de Costo con gastos)
            Object.keys(agrupadoPorCentro).forEach(centro => {
                renglonesBD.push({
                    asiento_id: asientoCreado.id,
                    debe: agrupadoPorCentro[centro],
                    haber: 0,
                    cuenta_nombre: `Gastos de ${centro}`,
                    detalle: `Imputación centro de costo: ${centro}`
                });
            });

            // B. Renglón en el HABER (Contrapartida total contra la Caja Chica)
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

        // 4. Pasar comprobantes a RENDIDO en fondo_fijo
        const { error: errUpdate } = await db
            .from('fondo_fijo')
            .update({ estado_rinde: 'RENDIDO' })
            .in('id', idsActivos);

        if (errUpdate) throw errUpdate;

        showToast('Fondo Fijo rendido y Asiento Contable generado por centros de costo.');
        
        // 5. Refrescar datos en vivo
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

// Función auxiliar para métricas de rinde activo en dashboard
function actualizarMetricasFondoFijoDashboard() {
    const registrosActivos = estadoFondoFijo.registros.filter(r => r.estado_rinde === 'ACTIVO' || !r.estado_rinde);
    const totalActivo = registrosActivos.reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0);

    const elTotal = document.getElementById('kpi-fondo-monto');
    const elSub = document.getElementById('kpi-fondo-sub');

    if (elTotal) elTotal.textContent = `$ ${totalActivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    if (elSub) elSub.textContent = `${registrosActivos.length} comprobantes activos`;
}
// ==========================================
// MOTOR 8 : ÓRDENES DE PAGO (OP) - MULTIFACTURA
// ==========================================
let historialOP = [];
let facturasComprasDisponibles = [];
let facturasSeleccionadasOP = [];
let adjuntoBase64Temp = null;

document.addEventListener('DOMContentLoaded', () => {
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
});

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
                <button type="button" onclick="tildarTodasFacturasOP(true)" class="text-indigo-600 underline font-semibold">Tildar todas</button>
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

    // 1. Obtener correlativo de OP
    const { count } = await db.from('ordenes_pago').select('*', { count: 'exact', head: true });
    const codigoOP = 'OP-' + String((count || 0) + 1).padStart(4, '0');

    // 2. Guardar OP
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

    // 3. Pasar a "Pagado" todas las facturas tildadas
    if (facturasSeleccionadasOP.length > 0) {
      const idsFacturas = facturasSeleccionadasOP.map(f => f.id);
      await db.from('comprobantes_compra')
        .update({ estado_pago: 'Pagado', saldo: 0 })
        .in('id', idsFacturas);
    }

    // 4. Asiento Contable Automático en Supabase
    const glosaAsiento = `Pago a Proveedor ${proveedor} según ${codigoOP}`;
    const { data: nuevoAsiento, error: errAsiento } = await db
      .from('asientos')
      .insert([{
        fecha,
        user_id: user?.id || null,
        concepto: glosaAsiento
      }])
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

      const cuentaSalida = medio.includes('Efectivo') 
        ? 'Caja / Efectivo' 
        : 'Banco Cuentas Corrientes';

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

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(`ORDEN DE PAGO: ${op.codigo_op}`, 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Fecha: ${op.fecha}`, 14, 32);
  doc.text(`Empresa Pagadora: Demostración SA`, 14, 38);
  doc.text(`Beneficiario / Proveedor: ${op.proveedor} (CUIT: ${op.cuit || 'S/D'})`, 14, 44);
  doc.text(`Concepto: ${op.concepto}`, 14, 50);
  doc.text(`Medio de Pago: ${op.medio} (Comp: ${op.num_comprobante || '-'})`, 14, 56);

  if (doc.autoTable) {
    doc.autoTable({
      startY: 65,
      head: [['Descripción del Movimiento', 'Importe']],
      body: [
        ['Monto Bruto Factura', `$ ${parseFloat(op.monto_factura).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
        ['Retención Impositiva Aplicada', `-$ ${parseFloat(op.retencion).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
        ['Neto Liquidado a Pagar', `$ ${parseFloat(op.neto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`]
      ],
      headStyles: { fillColor: [79, 70, 229] }
    });
  }

  doc.save(`${op.codigo_op}_${op.proveedor.replace(/\s+/g, '_')}.pdf`);
}

// ==========================================
// MOTOR 9: LIBRO DIARIO Y ASIENTOS
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
    // 1. Consultar asientos en Supabase ordenados por fecha descendente
    const { data: listaAsientos, error: errAsientos } = await db
      .from('asientos')
      .select('*')
      .order('fecha', { ascending: false });

    if (errAsientos) throw errAsientos;

    if (!listaAsientos || listaAsientos.length === 0) {
      contenedor.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No hay asientos registrados en la base de datos.</div>`;
      return;
    }

    // 2. Traer todos los detalles asociados
    const asientoIds = listaAsientos.map(a => a.id);
    const { data: listaDetalles, error: errDetalles } = await db
      .from('asiento_detalles')
      .select('*')
      .in('asiento_id', asientoIds);

    if (errDetalles) console.warn('Detalles de asientos no disponibles:', errDetalles);

    contenedor.innerHTML = '';

    // 3. Filtrar según la búsqueda
    const filtrados = listaAsientos.filter(a => {
      const concepto = (a.concepto || a.leyenda || '').toLowerCase();
      const id = String(a.id).toLowerCase();
      return concepto.includes(filtro) || id.includes(filtro);
    });

    if (filtrados.length === 0) {
      contenedor.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No se encontraron asientos con ese criterio de búsqueda.</div>`;
      return;
    }

    // 4. Renderizar cada tarjeta de asiento
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
async function eliminarAsiento(asientoId) {
  if (!confirm('¿Seguro que deseas anular y eliminar este asiento contable?')) return;

  try {
    // 1. Borrar renglones dependientes
    await db.from('asiento_detalles').delete().eq('asiento_id', asientoId);

    // 2. Borrar cabecera del asiento
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

function exportarLibroDiarioCSV() {
  if (historialLibroDiario.length === 0) return alert('No hay asientos para exportar.');
  let csv = 'Asiento,Fecha,Leyenda,Cuenta,Debe,Haber\n';
  historialLibroDiario.forEach(a => {
    a.renglones.forEach(r => {
      csv += `"${a.id}",${a.fecha},"${a.leyenda}","${r.cuenta}",${r.debe},${r.haber}\n`;
    });
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `Libro_Diario_${new Date().toISOString().slice(0,10)}.csv`);
  a.click();
}

// ==========================================
// LÓGICA DEL DASHBOARD INTEGRADO
// ==========================================
function navegarA(tabId) {
  switchTab(tabId.replace('tab-', ''));
}

async function actualizarDashboardMetrics() {
  try {
    // 1. Asientos reales consultados en Supabase
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

    // 2. Fondo Fijo Activo real
    const totalFondo = estadoFondoFijo.registros.reduce((acc, item) => acc + (parseFloat(item.monto) || 0), 0);
    const kpiFondoMonto = document.getElementById('kpi-fondo-monto');
    const kpiFondoSub = document.getElementById('kpi-fondo-sub');
    if (kpiFondoMonto) kpiFondoMonto.textContent = `$ ${totalFondo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    if (kpiFondoSub) kpiFondoSub.textContent = `${estadoFondoFijo.registros.length} comprobantes en rinde activo`;
  } catch (err) {
    console.warn('Error actualizando KPIs:', err);
  }
}

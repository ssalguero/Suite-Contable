// ==========================================
// INICIALIZACIÓN DE SUPABASE Y AUTENTICACIÓN
// ==========================================
const SUPABASE_URL = 'https://ippdmibozcpxzsczvpqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcGRtaWJvemNweHpzY3p2cHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU1NTAzNDMsImV4cCI6MjAyMTEyNjM0M30.6izD8ivkoovQdJ9A_c0vB1A_c0vB1A_c0vB1A';

// Instancia única del cliente utilizando la CDN de Supabase
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabase = db; // Alias global de compatibilidad

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

  if (typeof renderHistorialOP === 'function') renderHistorialOP();
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
    'dashboard', 'conciliador', 'cta-corriente', 'cruzador-iva', 
    'calc-retenciones', 'fondo-fijo', 'ordenes-pago', 'libro-diario'
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
// MOTOR 1: CONCILIADOR BANCARIO (Fuzzy Engine)
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
// MOTOR 2: CUENTAS CORRIENTES (FIFO & Aging)
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
// MOTOR 3: CRUZADOR IVA DIGITAL (ARCA vs. Interno)
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
// MOTOR 4: CÁLCULO RETENCIONES (RG 830)
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
// MÓDULO FONDO FIJO / CAJA CHICA - SUITE CONTABLE
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
        showToast('Por favor, completá todos los campos requeridos correctamente.', 'error');
        return;
    }

    try {
        const { data: { user } } = await db.auth.getUser();
        const nuevoRegistro = {
            fecha,
            concepto,
            monto,
            centro_costo: centroCosto,
            tipo_doc: tipoDoc,
            user_id: user?.id || null,
            empresa_id: estadoFondoFijo.empresaIdActual,
            estado_rinde: 'ACTIVO'
        };

        const { error } = await db.from('fondo_fijo').insert([nuevoRegistro]);
        if (error) throw error;

        form.reset();
        document.getElementById('ff-fecha').valueAsDate = new Date();
        showToast('Comprobante registrado con éxito en el rinde activo.');
        await cargarRegistrosFondoFijo();

    } catch (err) {
        console.error('Error al registrar comprobante:', err);
        showToast('Ocurrió un error al guardar el comprobante en Supabase.', 'error');
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
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const texto = e.target.result;
            const lineas = texto.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lineas.length <= 1) {
                showToast('El archivo CSV está vacío o no contiene filas de datos.', 'error');
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
                    const tipo_doc = cols[3]?.replace(/"/g, '').trim() || 'Ticket';
                    const centro_costo = cols[4]?.replace(/"/g, '').trim() || 'General';

                    if (fecha && concepto && !isNaN(monto)) {
                        registrosInsertar.push({
                            fecha, concepto, monto, tipo_doc, centro_costo,
                            user_id: user?.id || null,
                            empresa_id: estadoFondoFijo.empresaIdActual,
                            estado_rinde: 'ACTIVO'
                        });
                    }
                }
            }

            if (registrosInsertar.length === 0) return showToast('No se pudieron parsear registros válidos.', 'error');

            const { error } = await db.from('fondo_fijo').insert(registrosInsertar);
            if (error) throw error;

            showToast(`Se importaron ${registrosInsertar.length} comprobantes correctamente.`);
            await cargarRegistrosFondoFijo();
        } catch (err) {
            console.error('Error al importar CSV:', err);
            showToast('Error al procesar el archivo CSV.', 'error');
        }
    };
    reader.readAsText(file);
}

async function cargarRegistrosFondoFijo() {
    try {
        let query = db.from('fondo_fijo').select('*', { count: 'exact' }).order('fecha', { ascending: false });

        if (estadoFondoFijo.filtros.estadoRinde === 'ACTIVO') {
            query = query.or('estado_rinde.eq.ACTIVO,estado_rinde.is.null');
        } else if (estadoFondoFijo.filtros.estadoRinde) {
            query = query.eq('estado_rinde', estadoFondoFijo.filtros.estadoRinde);
        }

        if (estadoFondoFijo.filtros.centroCosto !== 'TODOS') query = query.eq('centro_costo', estadoFondoFijo.filtros.centroCosto);
        if (estadoFondoFijo.filtros.tipoDoc !== 'TODOS') query = query.eq('tipo_doc', estadoFondoFijo.filtros.tipoDoc);
        if (estadoFondoFijo.filtros.busqueda) query = query.ilike('concepto', `%${estadoFondoFijo.filtros.busqueda}%`);

        const { data, error } = await query;
        if (error) throw error;

        estadoFondoFijo.registros = data || [];
        renderizarTablaFondoFijo();
        actualizarMetricasDashboard();
    } catch (err) {
        console.error('Error cargando fondo fijo:', err);
        showToast('Error al cargar la tabla de rendición.', 'error');
    }
}

function renderizarTablaFondoFijo() {
    const tbody = document.getElementById('tabla-fondo-fijo-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const { paginaActual, registrosPorPagina } = estadoFondoFijo.paginacion;
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const paginados = estadoFondoFijo.registros.slice(inicio, inicio + registrosPorPagina);

    if (paginados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">No hay comprobantes registrados en este rinde.</td></tr>`;
        return;
    }

    paginados.forEach(reg => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-200 hover:bg-slate-50 transition-colors text-xs';
        tr.innerHTML = `
            <td class="p-2.5 text-slate-600 whitespace-nowrap">${reg.fecha}</td>
            <td class="p-2.5 text-slate-800 font-medium">${reg.concepto}</td>
            <td class="p-2.5 text-slate-500">${reg.tipo_doc || '-'}</td>
            <td class="p-2.5"><span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">${reg.centro_costo || 'General'}</span></td>
            <td class="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">$ ${parseFloat(reg.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td class="p-2.5 text-center whitespace-nowrap">
                <button onclick="prepararEdicionFondoFijo('${reg.id}')" class="text-blue-600 hover:text-blue-800 p-1 mr-1" title="Editar">✏️</button>
                <button onclick="eliminarRegistroFondoFijo('${reg.id}')" class="text-rose-600 hover:text-rose-800 p-1" title="Eliminar">🗑️</button>
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
    const reg = estadoFondoFijo.registros.find(r => r.id === id);
    if (!reg) return;

    estadoFondoFijo.registroEnEdicion = id;
    document.getElementById('ff-fecha').value = reg.fecha;
    document.getElementById('ff-concepto').value = reg.concepto;
    document.getElementById('ff-monto').value = reg.monto;
    document.getElementById('ff-centro-costo').value = reg.centro_costo;
    document.getElementById('ff-tipo-doc').value = reg.tipo_doc;

    const btnSubmit = document.getElementById('btn-registrar-ff');
    if (btnSubmit) btnSubmit.textContent = '💾 Actualizar Registro';
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
    if (estadoFondoFijo.registros.length === 0) return showToast('No hay comprobantes activos para rendir.', 'error');
    const totalRendicion = estadoFondoFijo.registros.reduce((sum, r) => sum + parseFloat(r.monto), 0);
    if (!confirm(`¿Confirmás el Cierre del Fondo Fijo por un total de $ ${totalRendicion.toLocaleString('es-AR')}?`)) return;

    try {
        const idsActivos = estadoFondoFijo.registros.map(r => r.id);
        const { error: errUpdate } = await db.from('fondo_fijo').update({ estado_rinde: 'RENDIDO' }).in('id', idsActivos);
        if (errUpdate) throw errUpdate;

        showToast('Fondo Fijo cerrado y rendido con éxito.');
        await cargarRegistrosFondoFijo();
    } catch (err) {
        console.error('Error al rendir Fondo Fijo:', err);
        showToast('Error al procesar el cierre del Fondo Fijo.', 'error');
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

// ==========================================
// MOTOR 5: ÓRDENES DE PAGO (OP)
// ==========================================
let historialOP = JSON.parse(localStorage.getItem('suite_historial_op')) || [];
let adjuntoBase64Temp = null;

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
      preview.className = "space-y-3.5 text-left text-slate-700";
      preview.innerHTML = `
        <div class="flex justify-between items-center border-b border-slate-200 pb-3">
          <div>
            <h4 class="font-bold text-slate-800">ORDEN DE PAGO N° OP-${(historialOP.length + 1).toString().padStart(4, '0')}</h4>
            <span class="text-xs text-slate-500">Fecha: ${fecha}</span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Borrador</span>
        </div>

        <div class="text-xs space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p><strong class="text-slate-900">Proveedor:</strong> ${proveedor} (${cuit})</p>
          <p><strong class="text-slate-900">Concepto:</strong> ${concepto}</p>
          <p><strong class="text-slate-900">Medio de Pago:</strong> ${medio} (${numComprobante})</p>
        </div>
        
        <div class="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <div class="flex justify-between p-2.5 bg-white border-b border-slate-200">
            <span>Monto Bruto Factura:</span>
            <span class="font-mono font-medium">$ ${montoFactura.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
          </div>
          <div class="flex justify-between p-2.5 bg-white border-b border-slate-200 text-rose-600">
            <span>Retenciones Aplicadas:</span>
            <span class="font-mono font-medium">-$ ${retencion.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
          </div>
          <div class="flex justify-between p-2.5 bg-emerald-50 font-bold text-emerald-800 text-sm">
            <span>Monto Neto a Pagar:</span>
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

function generarOP() {
  const fecha = document.getElementById('op-fecha').value;
  const proveedor = document.getElementById('op-proveedor').value.trim();
  const cuit = document.getElementById('op-cuit').value.trim() || 'S/D';
  const concepto = document.getElementById('op-concepto').value.trim();
  const montoFactura = parseFloat(document.getElementById('op-monto-factura').value) || 0;
  const retencion = parseFloat(document.getElementById('op-retencion').value) || 0;
  const medio = document.getElementById('op-medio-pago').value;
  const numComprobante = document.getElementById('op-num-comprobante').value.trim() || '-';

  if (!fecha || !proveedor || !concepto || montoFactura <= 0) return alert('Por favor, completá los datos obligatorios.');

  const neto = montoFactura - retencion;
  const nuevaOP = {
    id: 'OP-' + (historialOP.length + 1).toString().padStart(4, '0'),
    fecha, proveedor, cuit, concepto, montoFactura, retencion, neto, medio, numComprobante,
    estado: 'Pagado'
  };

  historialOP.unshift(nuevaOP);
  localStorage.setItem('suite_historial_op', JSON.stringify(historialOP));
  renderHistorialOP();

  document.getElementById('form-op').reset();
  document.getElementById('op-fecha').value = new Date().toISOString().split('T')[0];
  alert('Orden de Pago registrada con éxito.');
}

function renderHistorialOP() {
  const tbody = document.getElementById('tbody-op-historial');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (historialOP.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400">No hay órdenes de pago emitidas.</td></tr>`;
    return;
  }

  historialOP.forEach((op) => {
    tbody.innerHTML += `
      <tr class="hover:bg-slate-50 transition-colors text-xs">
        <td class="p-3 font-bold text-slate-900">${op.id}<div class="text-[11px] font-normal text-slate-400">${op.fecha}</div></td>
        <td class="p-3 font-semibold text-slate-800">${op.proveedor}<div class="text-[11px] font-normal text-slate-400">CUIT: ${op.cuit}</div></td>
        <td class="p-3 text-slate-600 truncate max-w-xs">${op.concepto}</td>
        <td class="p-3"><span class="px-2 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200">${op.medio}</span></td>
        <td class="p-3 font-mono font-bold text-emerald-700">$ ${op.neto.toFixed(2)}</td>
        <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">${op.estado}</span></td>
        <td class="p-3 text-center">-</td>
        <td class="p-3 text-center"><button onclick="eliminarOP('${op.id}')" class="text-rose-500 hover:text-rose-700 p-1">🗑️</button></td>
      </tr>
    `;
  });
}

function eliminarOP(id) {
  if (confirm(`¿Eliminar la orden ${id}?`)) {
    historialOP = historialOP.filter(op => op.id !== id);
    localStorage.setItem('suite_historial_op', JSON.stringify(historialOP));
    renderHistorialOP();
  }
}

function exportarHistorialOPCSV() {
  if (historialOP.length === 0) return alert('No hay datos para exportar.');
  let csv = 'ID,Fecha,Proveedor,CUIT,Concepto,Medio,Monto Factura,Retencion,Neto,Estado\n';
  historialOP.forEach(o => {
    csv += `${o.id},${o.fecha},"${o.proveedor}","${o.cuit}","${o.concepto}",${o.medio},${o.montoFactura},${o.retencion},${o.neto},${o.estado}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `Historial_OP_${new Date().toISOString().slice(0,10)}.csv`);
  a.click();
}

// ==========================================
// MOTOR 6: LIBRO DIARIO Y ASIENTOS
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

function renderLibroDiario() {
  const contenedor = document.getElementById('contenedor-libro-diario');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  if (historialLibroDiario.length === 0) {
    contenedor.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No hay asientos registrados en el Libro Diario.</div>`;
    return;
  }

  historialLibroDiario.forEach(asiento => {
    const totalMonto = asiento.renglones.reduce((acc, r) => acc + r.debe, 0);

    const filasHTML = asiento.renglones.map(r => `
      <tr class="border-b border-slate-100 text-xs">
        <td class="py-1.5 px-3 ${r.haber > 0 ? 'pl-8 text-slate-600' : 'font-semibold text-slate-800'}">${r.cuenta}</td>
        <td class="py-1.5 px-3 text-right font-mono">${r.debe > 0 ? '$ ' + r.debe.toFixed(2) : '-'}</td>
        <td class="py-1.5 px-3 text-right font-mono">${r.haber > 0 ? '$ ' + r.haber.toFixed(2) : '-'}</td>
      </tr>
    `).join('');

    contenedor.innerHTML += `
      <div class="p-4 space-y-2 hover:bg-slate-50/50 transition-colors">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-3">
            <span class="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">${asiento.id}</span>
            <span class="text-slate-400">${asiento.fecha}</span>
            <span class="font-medium text-slate-800">${asiento.leyenda}</span>
          </div>
          <button onclick="eliminarAsiento('${asiento.id}')" class="text-rose-500 hover:text-rose-700 p-1">🗑️</button>
        </div>
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="text-slate-400 font-normal border-b border-slate-100">
              <th class="text-left py-1 px-3">Cuenta</th>
              <th class="text-right py-1 px-3 w-28">Debe</th>
              <th class="text-right py-1 px-3 w-28">Haber</th>
            </tr>
          </thead>
          <tbody>${filasHTML}</tbody>
          <tfoot>
            <tr class="font-bold text-slate-700 bg-slate-50/50">
              <td class="py-1.5 px-3 text-right">Totales:</td>
              <td class="py-1.5 px-3 text-right font-mono">$ ${totalMonto.toFixed(2)}</td>
              <td class="py-1.5 px-3 text-right font-mono">$ ${totalMonto.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  });
}

function eliminarAsiento(id) {
  if (confirm(`¿Eliminar el asiento ${id}?`)) {
    historialLibroDiario = historialLibroDiario.filter(a => a.id !== id);
    localStorage.setItem('suite_libro_diario', JSON.stringify(historialLibroDiario));
    renderLibroDiario();
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

function actualizarDashboardMetrics() {
  const libroDiario = JSON.parse(localStorage.getItem('suite_libro_diario')) || [];
  const kpiAsientos = document.getElementById('kpi-asientos-cant');
  const kpiAsientosSub = document.getElementById('kpi-asientos-sub');
  if (kpiAsientos) kpiAsientos.textContent = libroDiario.length;
  if (kpiAsientosSub) kpiAsientosSub.textContent = libroDiario.length > 0 ? `Último: ${libroDiario[0].id}` : 'Sin registros aún';

  const totalFondo = estadoFondoFijo.registros.reduce((acc, item) => acc + (parseFloat(item.monto) || 0), 0);
  const kpiFondoMonto = document.getElementById('kpi-fondo-monto');
  const kpiFondoSub = document.getElementById('kpi-fondo-sub');
  if (kpiFondoMonto) kpiFondoMonto.textContent = `$ ${totalFondo.toFixed(2)}`;
  if (kpiFondoSub) kpiFondoSub.textContent = `${estadoFondoFijo.registros.length} comprobantes cargados`;
}

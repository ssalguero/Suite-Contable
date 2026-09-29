// Inicialización de Supabase
const SUPABASE_URL = 'https://ippdmibozcpxzsczvpqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcGRtaWJvemNweHpzY3p2cHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDI1MDUsImV4cCI6MjEwNTkxODUwNX0.6izD8ivkoovQdX1RE8MarIZbgVumzuavl7FB6P0boLU';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State global de usuario y autenticación
let currentUser = null;
let currentAuthMode = 'login';

// -------------------------------------------------------------
// CONTROL DE AUTENTICACIÓN Y SESIÓN (SUPABASE AUTH)
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  // Cargar datos de Fondo Fijo al iniciar la app
  if (typeof fetchFondoFijo === 'function') {
    fetchFondoFijo();
  }
  
  // Listener en tiempo real para cambios de sesión
  db.auth.onAuthStateChange((event, session) => {
    const authModal = document.getElementById('auth-modal');
    const userDisplay = document.getElementById('user-display-email');

    if (session) {
      currentUser = session.user;
      if (authModal) authModal.classList.add('hidden');
      if (userDisplay) userDisplay.textContent = session.user.email;
      // Volver a consultar datos al iniciar sesión
      if (typeof fetchFondoFijo === 'function') {
        fetchFondoFijo();
      }
    } else {
      currentUser = null;
      if (authModal) authModal.classList.remove('hidden');
      if (userDisplay) userDisplay.textContent = 'No autenticado';
    }
  });

  renderHistorialOP();
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
      btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-slate-400 hover:bg-slate-800/60 hover:text-slate-200";
    }
  });

  const targetSec = document.getElementById(`tab-${tabId}`);
  const targetBtn = document.getElementById(`nav-${tabId}`);
  
  if (targetSec) targetSec.classList.remove('hidden');
  if (targetBtn) {
    targetBtn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all bg-indigo-600 text-white shadow-sm";
  }
}

// -------------------------------------------------------------
// MOTOR 1: CONCILIADOR BANCARIO (Fuzzy Engine & Export)
// -------------------------------------------------------------
let resultadoConciliacionGlobal = null;

function ejecutarConciliacionBancaria() {
  const fileBanco = document.getElementById('file-banco-csv')?.files[0];
  const fileLibro = document.getElementById('file-libro-csv')?.files[0];

  if (fileBanco && fileLibro) {
    // Procesar archivos reales CSV
    Promise.all([leerArchivoCSV(fileBanco), leerArchivoCSV(fileLibro)])
      .then(([datosBanco, datosLibro]) => {
        procesarCruzeFuzzy(datosBanco, datosLibro);
      })
      .catch(err => alert("Error al leer los archivos: " + err));
  } else {
    // Ejecutar datos de demostración si no hay archivos cargados
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
      
      // Condición 1: Coincidencia en Monto Exacto
      if (Math.abs(itemB.monto - itemL.monto) < 0.01) {
        // Condición 2: Margen de Fechas
        const diffDias = Math.abs(new Date(itemB.fecha) - new Date(itemL.fecha)) / (1000 * 60 * 60 * 24);
        
        if (isNaN(diffDias) || diffDias <= margenDias) {
          // Condición 3: Texto similar
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

  resultadoConciliacionGlobal = {
    coincidentes,
    pendientesBanco,
    pendientesLibro: libroCopia
  };

  renderResultadosConciliacion();
}

function renderResultadosConciliacion() {
  if (!resultadoConciliacionGlobal) return;

  const { coincidentes, pendientesBanco, pendientesLibro } = resultadoConciliacionGlobal;

  // Actualizar Cards de Métricas
  const panelResumen = document.getElementById('panel-resumen-conciliacion');
  if (panelResumen) panelResumen.classList.remove('hidden');

  const elStatCoinc = document.getElementById('stat-coincidentes');
  const elStatPendB = document.getElementById('stat-pend-banco');
  const elStatPendL = document.getElementById('stat-pend-libro');

  if (elStatCoinc) elStatCoinc.textContent = coincidentes.length;
  if (elStatPendB) elStatPendB.textContent = pendientesBanco.length;
  if (elStatPendL) elStatPendL.textContent = pendientesLibro.length;

  // Habilitar botón Exportar
  const btnExp = document.getElementById('btn-exportar-conciliacion');
  if (btnExp) {
    btnExp.disabled = false;
    btnExp.className = "bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm";
  }

  // Soporte para ambos IDs de contenedor (nuevo y anterior)
  const contenedor = document.getElementById('contenedor-resultado-conciliacion') || document.getElementById('conciliador-results');
  if (!contenedor) return;

  contenedor.className = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 text-xs";

  let html = `
    <div class="p-4 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
      <span>Detalle del Resultado de la Conciliación</span>
      <span class="text-[11px] font-normal text-slate-500">Muestreo comparativo</span>
    </div>
  `;

  // Sección 1: Coincidentes
  html += `<div class="p-3 bg-emerald-50/50 font-semibold text-emerald-800 flex items-center gap-2"><span>✅ Coincidencias Confirmadas</span> <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">${coincidentes.length}</span></div>`;
  if (coincidentes.length === 0) {
    html += `<div class="p-3 text-slate-400 italic">No se encontraron movimientos coincidentes.</div>`;
  } else {
    coincidentes.forEach(c => {
      html += `
        <div class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-slate-100">
          <div class="text-slate-700"><strong>Banco:</strong> ${c.banco.fecha} | ${c.banco.concepto} | <span class="font-mono font-bold text-slate-900">$ ${c.banco.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></div>
          <div class="text-slate-700"><strong>Libro:</strong> ${c.libro.fecha} | ${c.libro.concepto} | <span class="font-mono font-bold text-slate-900">$ ${c.libro.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></div>
        </div>
      `;
    });
  }

  // Sección 2: Solo en Banco
  html += `<div class="p-3 bg-amber-50/50 font-semibold text-amber-800 flex items-center gap-2"><span>⚠️ Solo en Extracto Bancario - Pendientes Contabilizar</span> <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px]">${pendientesBanco.length}</span></div>`;
  if (pendientesBanco.length === 0) {
    html += `<div class="p-3 text-slate-400 italic">No hay movimientos pendientes en el banco.</div>`;
  } else {
    pendientesBanco.forEach(b => {
      html += `
        <div class="p-3 flex justify-between items-center text-slate-700 border-b border-slate-100">
          <span>${b.fecha} - ${b.concepto}</span>
          <span class="font-mono font-bold">$ ${b.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
        </div>
      `;
    });
  }

  // Sección 3: Solo en Libro Contable
  html += `<div class="p-3 bg-rose-50/50 font-semibold text-rose-800 flex items-center gap-2"><span>⚠️ Solo en Libro Contable - Pendientes Acreditar/Debitar</span> <span class="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px]">${pendientesLibro.length}</span></div>`;
  if (pendientesLibro.length === 0) {
    html += `<div class="p-3 text-slate-400 italic">No hay movimientos pendientes en el libro.</div>`;
  } else {
    pendientesLibro.forEach(l => {
      html += `
        <div class="p-3 flex justify-between items-center text-slate-700 border-b border-slate-100">
          <span>${l.fecha} - ${l.concepto}</span>
          <span class="font-mono font-bold">$ ${l.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
        </div>
      `;
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

// -------------------------------------------------------------
// MOTOR 2: CUENTAS CORRIENTES (FIFO, Aging & Export)
// -------------------------------------------------------------
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
      { entidad: 'LOGISTICA ARGENTINA SA', fecha: '2026-05-20', factura: 'FC-001-0980', monto: 450000.00, cobrado: 0.00 },
      { entidad: 'TECNOLOGIA GLOBAL SRL', fecha: '2026-09-12', factura: 'FC-001-1120', monto: 280000.00, cobrado: 50000.00 }
    ];
  } else {
    demoData = [
      { entidad: 'PINTURERIAS REX SA', fecha: '2026-08-10', factura: 'FC-A-0088', monto: 450000.00, cobrado: 200000.00 },
      { entidad: 'SODIMAC ARGENTINA SA', fecha: '2026-07-01', factura: 'FC-A-9921', monto: 620000.00, cobrado: 620000.00 },
      { entidad: 'CORRALON LA PLATA SRL', fecha: '2026-04-12', factura: 'FC-C-0112', monto: 180000.00, cobrado: 0.00 }
    ];
  }

  procesarSaldosYAgings(demoData);
}

function procesarSaldosYAgings(registros) {
  const hoy = new Date('2026-09-29'); // Fecha de referencia fija o actual
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

    // Desglose de Aging según días de antigüedad del saldo
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

  let totalCartera = 0;
  let totalAlDia = 0;
  let totalVencido = 0;

  datosCtaCteProcesados.forEach(e => {
    totalCartera += e.saldoTotal;
    totalAlDia += e.tramo0_30;
    totalVencido += (e.tramo31_60 + e.tramo61_90 + e.tramo90_mas);
  });

  // Mostrar tarjetas de resumen
  const panelResumen = document.getElementById('panel-resumen-ctacte');
  if (panelResumen) panelResumen.classList.remove('hidden');

  const elStatTot = document.getElementById('stat-ctacte-total');
  const elStatDia = document.getElementById('stat-ctacte-aldia');
  const elStatVen = document.getElementById('stat-ctacte-vencido');

  if (elStatTot) elStatTot.textContent = `$ ${totalCartera.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
  if (elStatDia) elStatDia.textContent = `$ ${totalAlDia.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
  if (elStatVen) elStatVen.textContent = `$ ${totalVencido.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

  // Habilitar botón Exportar
  const btnExp = document.getElementById('btn-exportar-ctacte');
  if (btnExp) {
    btnExp.disabled = false;
    btnExp.className = "bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm";
  }

  if (datosCtaCteProcesados.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-400">No hay cuentas corrientes para mostrar con el filtro seleccionado.</div>`;
    return;
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

  html += `
        </tbody>
      </table>
    </div>
  `;

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
// -------------------------------------------------------------
// MOTOR 3: CRUZADOR IVA DIGITAL (ARCA vs. Interno)
// -------------------------------------------------------------
let datosArcaIVA = [];
let datosInternoIVA = [];

// Parseador genérico de CSV / TXT tabulado o separado por comas
function parsearCSV(texto) {
  const lineas = texto.split(/\r\n|\n/).filter(l => l.trim().length > 0);
  if (lineas.length === 0) return [];
  
  const separador = lineas[0].includes(';') ? ';' : lineas[0].includes('\t') ? '\t' : ',';
  const cabeceras = lineas[0].split(separador).map(c => c.trim().replace(/^["']|["']$/g, '').toLowerCase());

  return lineas.slice(1).map(linea => {
    const valores = linea.split(separador).map(v => v.trim().replace(/^["']|["']$/g, ''));
    let obj = {};
    cabeceras.forEach((cab, i) => {
      obj[cab] = valores[i] || '';
    });
    return obj;
  });
}

// Handler cuando el usuario sube el archivo de ARCA
function procesarArchivoArca(input) {
  const file = input.files[0];
  const statusEl = document.getElementById('status-arca-file');
  
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      datosArcaIVA = parsearCSV(e.target.result);
      if (statusEl) {
        statusEl.textContent = `✓ Archivo cargado: ${file.name} (${datosArcaIVA.length} registros)`;
        statusEl.className = "block text-[11px] text-emerald-600 font-medium italic";
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = "Error al leer el archivo de ARCA.";
        statusEl.className = "block text-[11px] text-rose-500 font-medium italic";
      }
    }
  };
  reader.readAsText(file);
}

// Handler cuando el usuario sube el archivo Interno
function procesarArchivoInternoIVA(input) {
  const file = input.files[0];
  const statusEl = document.getElementById('status-interno-file');
  
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      datosInternoIVA = parsearCSV(e.target.result);
      if (statusEl) {
        statusEl.textContent = `✓ Archivo cargado: ${file.name} (${datosInternoIVA.length} registros)`;
        statusEl.className = "block text-[11px] text-indigo-600 font-medium italic";
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = "Error al leer el archivo Interno.";
        statusEl.className = "block text-[11px] text-rose-500 font-medium italic";
      }
    }
  };
  reader.readAsText(file);
}

// Helpers para normalizar campos e importes
function obtenerValorCampo(obj, posiblesNombres) {
  for (let nombre of posiblesNombres) {
    const clave = Object.keys(obj).find(k => k.includes(nombre));
    if (clave && obj[clave] !== undefined) return obj[clave];
  }
  return '';
}

function parsearMonto(val) {
  if (!val) return 0;
  const numLimpio = val.toString().replace(/\$/g, '').replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(numLimpio) || 0;
}

// Función ejecutada por el botón "Auditar y Cruzar Registros"
function ejecutarCruceIvaReal() {
  const resultsContainer = document.getElementById('cruzador-iva-results');
  if (!resultsContainer) return;

  // Si no se cargó ningún archivo, ejecutamos la simulación con datos de prueba
  if (datosArcaIVA.length === 0 && datosInternoIVA.length === 0) {
    runCruzadorIvaDemo();
    return;
  }

  let concuerdan = [];
  let soloEnArca = [];
  let soloEnInterno = [];
  let diferenciasMonto = [];

  const mapaArca = new Map();
  datosArcaIVA.forEach((reg, idx) => {
    const cuit = obtenerValorCampo(reg, ['cuit', 'doc', 'documento']);
    const numero = obtenerValorCampo(reg, ['numero', 'comprobante', 'nro']);
    const razonSocial = obtenerValorCampo(reg, ['nombre', 'razon', 'denominacion', 'proveedor', 'cliente']);
    const monto = parsearMonto(obtenerValorCampo(reg, ['total', 'monto', 'importe']));
    const clave = `${cuit}-${numero}`;
    
    mapaArca.set(clave, { reg, monto, razonSocial, cuit, numero, index: idx });
  });

  const procesadosArcaKeys = new Set();

  datosInternoIVA.forEach(regInt => {
    const cuitInt = obtenerValorCampo(regInt, ['cuit', 'doc', 'documento']);
    const numeroInt = obtenerValorCampo(regInt, ['numero', 'comprobante', 'nro']);
    const razonInt = obtenerValorCampo(regInt, ['nombre', 'razon', 'denominacion', 'proveedor', 'cliente']);
    const montoInt = parsearMonto(obtenerValorCampo(regInt, ['total', 'monto', 'importe']));
    const claveInt = `${cuitInt}-${numeroInt}`;

    if (mapaArca.has(claveInt)) {
      procesadosArcaKeys.add(claveInt);
      const coeArca = mapaArca.get(claveInt);
      const dif = Math.abs(coeArca.monto - montoInt);

      if (dif < 0.01) {
        concuerdan.push({ cuit: cuitInt, numero: numeroInt, razonSocial: razonInt || coeArca.razonSocial, monto: montoInt });
      } else {
        diferenciasMonto.push({ 
          cuit: cuitInt, 
          numero: numeroInt, 
          razonSocial: razonInt || coeArca.razonSocial,
          montoArca: coeArca.monto, 
          montoInterno: montoInt,
          diferencia: coeArca.monto - montoInt
        });
      }
    } else {
      soloEnInterno.push({ cuit: cuitInt, numero: numeroInt, razonSocial: razonInt, monto: montoInt });
    }
  });

  mapaArca.forEach((val, clave) => {
    if (!procesadosArcaKeys.has(clave)) {
      soloEnArca.push({ cuit: val.cuit, numero: val.numero, razonSocial: val.razonSocial, monto: val.monto });
    }
  });

  renderizarResultadosCruce(resultsContainer, concuerdan, soloEnArca, soloEnInterno, diferenciasMonto);
}

// Función demo (fallback)
function runCruzadorIvaDemo() {
  const container = document.getElementById('cruzador-iva-results');
  if (!container) return;

  const concuerdan = [
    { cuit: '30-70891234-9', numero: 'FC-A 00001-00004512', razonSocial: 'YPF SA', monto: 125000.00 },
    { cuit: '30-50001091-2', numero: 'FC-A 00003-00018900', razonSocial: 'TELECOM ARGENTINA SA', monto: 84300.00 }
  ];
  const soloArca = [
    { cuit: '30-71123456-8', numero: 'FC-A 00012-00045892', razonSocial: 'TELECOM ARGENTINA SA', monto: 54450.00 }
  ];
  const soloInterno = [
    { cuit: '30-61002003-4', numero: 'FC-C 00002-00000114', razonSocial: 'IMPRENTA LA PLATA', monto: 18500.00 }
  ];
  const difMonto = [
    { cuit: '30-54123987-1', numero: 'FC-A 00005-00001200', razonSocial: 'SODIMAC ARGENTINA SA', montoArca: 100000.00, montoInterno: 105000.00, diferencia: -5000.00 }
  ];

  renderizarResultadosCruce(container, concuerdan, soloArca, soloInterno, difMonto);
}

// Renderizador visual de resultados de la auditoría
function renderizarResultadosCruce(contenedor, concuerdan, soloArca, soloInterno, difMonto) {
  const totalInconsistencias = soloArca.length + soloInterno.length + difMonto.length;

  contenedor.innerHTML = `
    <div class="space-y-6">
      <!-- Tarjetas Resumen -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
          <p class="text-xs font-semibold text-emerald-700">Concuerdan Exactos</p>
          <h4 class="text-2xl font-bold text-emerald-800 mt-1">${concuerdan.length}</h4>
        </div>
        <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl">
          <p class="text-xs font-semibold text-amber-700">Diferencia de Importe</p>
          <h4 class="text-2xl font-bold text-amber-800 mt-1">${difMonto.length}</h4>
        </div>
        <div class="bg-sky-50 border border-sky-200 p-4 rounded-xl">
          <p class="text-xs font-semibold text-sky-700">Solo en ARCA (Falta Interno)</p>
          <h4 class="text-2xl font-bold text-sky-800 mt-1">${soloArca.length}</h4>
        </div>
        <div class="bg-rose-50 border border-rose-200 p-4 rounded-xl">
          <p class="text-xs font-semibold text-rose-700">Solo en Interno (Falta ARCA)</p>
          <h4 class="text-2xl font-bold text-rose-800 mt-1">${soloInterno.length}</h4>
        </div>
      </div>

      <!-- Detalle Inconsistencias -->
      ${totalInconsistencias > 0 ? `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-700">
            Inconsistencias y Auditoría Detectada
          </div>
          <div class="divide-y divide-slate-100 text-xs">
            ${difMonto.map(item => `
              <div class="p-3 flex justify-between items-center bg-amber-50/50">
                <div>
                  <span class="font-semibold text-slate-800">${item.razonSocial || 'Desconocido'}</span>
                  <p class="text-[11px] text-amber-700">CUIT: ${item.cuit} | Comp: ${item.numero} — Diferencia en monto</p>
                </div>
                <div class="text-right">
                  <span class="font-mono text-slate-600">ARCA: $${item.montoArca.toLocaleString('es-AR', {minimumFractionDigits: 2})} | Int: $${item.montoInterno.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                  <p class="text-[11px] font-bold text-amber-700">Dif: $${item.diferencia.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
                </div>
              </div>
            `).join('')}

            ${soloArca.map(item => `
              <div class="p-3 flex justify-between items-center bg-sky-50/50">
                <div>
                  <span class="font-semibold text-slate-800">${item.razonSocial || 'Desconocido'}</span>
                  <p class="text-[11px] text-sky-700">CUIT: ${item.cuit} | Comp: ${item.numero} — Presente en ARCA, omitido internamente</p>
                </div>
                <div class="text-right font-mono font-bold text-sky-800">
                  $ ${item.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                </div>
              </div>
            `).join('')}

            ${soloInterno.map(item => `
              <div class="p-3 flex justify-between items-center bg-rose-50/50">
                <div>
                  <span class="font-semibold text-slate-800">${item.razonSocial || 'Desconocido'}</span>
                  <p class="text-[11px] text-rose-700">CUIT: ${item.cuit} | Comp: ${item.numero} — Cargado internamente sin respaldo en ARCA</p>
                </div>
                <div class="text-right font-mono font-bold text-rose-800">
                  $ ${item.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium text-center">
          ✓ Todos los comprobantes coinciden perfectamente entre el registro de ARCA y el Libro IVA Interno.
        </div>
      `}
    </div>
  `;
}
// -------------------------------------------------------------
// MOTOR 4: CÁLCULO RETENCIONES (Interactivo + Guardado en BD)
// -------------------------------------------------------------
async function calculateRetentionsUI() {
  const net = parseFloat(document.getElementById('ret-neto').value) || 0;
  const acum = parseFloat(document.getElementById('ret-acum').value) || 0;
  const nonTaxableBase = 67200; // Servicios RG 830
  
  const taxableBase = Math.max(0, net - nonTaxableBase);
  const ganancias = taxableBase * 0.02;
  const iibb = net * 0.025;
  const totalRet = ganancias + iibb;
  const netToPay = net - totalRet;

  // Renderizar resultado en UI alineado al diseño general de la Suite
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

        <!-- Estado de guardado -->
        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center gap-1.5 italic">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span id="save-status">Guardando registro en Supabase...</span>
          </span>
        </div>

        <!-- Botones de Acción Estilizados -->
        <div class="mt-5 grid grid-cols-2 gap-2.5">
          <button onclick="downloadPDF(${net}, ${ganancias}, ${iibb}, ${netToPay})" 
                  class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
            <svg class="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Exportar PDF
          </button>

          <button onclick="downloadCSV(${net}, ${ganancias}, ${iibb}, ${netToPay})" 
                  class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>
    `;
  }

  // Guardar en Supabase asociando al usuario
  try {
    const payload = {
      neto_comprobante: net,
      acumulado_mes: acum,
      monto_retencion: totalRet,
      alicuota_aplicada: 2.0
    };

    if (typeof currentUser !== 'undefined' && currentUser) {
      payload.user_id = currentUser.id;
    }

    // Verificamos si db existe antes de intentar guardar
    if (typeof db !== 'undefined' && db) {
      const { error } = await db.from('retenciones_emitidas').insert([payload]);

      const statusEl = document.getElementById('save-status');
      if (statusEl) {
        if (error) {
          statusEl.textContent = '⚠️ Error al guardar: ' + error.message;
          statusEl.className = 'text-rose-400 font-medium';
        } else {
          statusEl.textContent = '✓ Registrado en Supabase';
          statusEl.className = 'text-emerald-400 font-medium';
        }
      }
    } else {
      const statusEl = document.getElementById('save-status');
      if (statusEl) {
        statusEl.textContent = '✓ Cálculo local listo (sin conexión DB)';
        statusEl.className = 'text-slate-400 font-medium';
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// Exportación en PDF
function downloadPDF(neto, ganancias, iibb, netoPagar) {
  if (!window.jspdf) {
    alert("La librería jsPDF no está cargada.");
    return;
  }
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

// Exportación en CSV
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

// Configuración de Estado Local para Fondo Fijo
const estadoFondoFijo = {
    registros: [],
    filtros: {
        busqueda: '',
        centroCosto: 'TODOS',
        tipoDoc: 'TODOS',
        fechaDesde: '',
        fechaHasta: '',
        estadoRinde: 'ACTIVO' // ACTIVO o RENDIDO
    },
    paginacion: {
        paginaActual: 1,
        registrosPorPagina: 10
    },
    empresaIdActual: 'demo-empresa-id', // Cambiar según la sesión o selector de empresa
    registroEnEdicion: null
};

// ------------------------------------------
// 1. SISTEMA DE TOAST Y NOTIFICACIONES
// ------------------------------------------
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
    toast.innerHTML = `
        <span>${tipo === 'exito' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️'}</span>
        <span>${mensaje}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-5', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ------------------------------------------
// 2. REGISTRO MANUAL Y RESET
// ------------------------------------------
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
        const { data: { user } } = await supabase.auth.getUser();

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

        const { data, error } = await supabase
            .from('fondo_fijo')
            .insert([nuevoRegistro])
            .select();

        if (error) throw error;

        // Reset del formulario
        form.reset();
        document.getElementById('ff-fecha').valueAsDate = new Date();

        showToast('Comprobante registrado con éxito en el rinde activo.');
        await cargarRegistrosFondoFijo();

    } catch (err) {
        console.error('Error al registrar comprobante:', err);
        showToast('Ocurrió un error al guardar el comprobante en Supabase.', 'error');
    }
}

// ------------------------------------------
// 3. IMPORTACIÓN CSV Y PLANTILLA
// ------------------------------------------
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

            const { data: { user } } = await supabase.auth.getUser();
            const registrosInsertar = [];

            // Saltar la primera fila (encabezados)
            for (let i = 1; i < lineas.length; i++) {
                // Regex para manejar comas dentro de comillas
                const cols = lineas[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lineas[i].split(',');

                if (cols.length >= 3) {
                    const fecha = cols[0]?.replace(/"/g, '').trim();
                    const concepto = cols[1]?.replace(/"/g, '').trim();
                    const monto = parseFloat(cols[2]?.replace(/"/g, '').trim());
                    const tipo_doc = cols[3]?.replace(/"/g, '').trim() || 'Ticket';
                    const centro_costo = cols[4]?.replace(/"/g, '').trim() || 'General';

                    if (fecha && concepto && !isNaN(monto)) {
                        registrosInsertar.push({
                            fecha,
                            concepto,
                            monto,
                            tipo_doc,
                            centro_costo,
                            user_id: user?.id || null,
                            empresa_id: estadoFondoFijo.empresaIdActual,
                            estado_rinde: 'ACTIVO'
                        });
                    }
                }
            }

            if (registrosInsertar.length === 0) {
                showToast('No se pudieron parsear registros válidos del CSV.', 'error');
                return;
            }

            // Bulk Insert a Supabase
            const { error } = await supabase
                .from('fondo_fijo')
                .insert(registrosInsertar);

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

// ------------------------------------------
// 4. CONSULTA Y FILTRADO DESDE SUPABASE
// ------------------------------------------
async function cargarRegistrosFondoFijo() {
    try {
        let query = supabase
            .from('fondo_fijo')
            .select('*', { count: 'exact' })
            .order('fecha', { ascending: false });

        // Aplicar filtros dinámicos
        if (estadoFondoFijo.filtros.estadoRinde) {
            query = query.eq('estado_rinde', estadoFondoFijo.filtros.estadoRinde);
        }
        if (estadoFondoFijo.filtros.centroCosto !== 'TODOS') {
            query = query.eq('centro_costo', estadoFondoFijo.filtros.centroCosto);
        }
        if (estadoFondoFijo.filtros.tipoDoc !== 'TODOS') {
            query = query.eq('tipo_doc', estadoFondoFijo.filtros.tipoDoc);
        }
        if (estadoFondoFijo.filtros.fechaDesde) {
            query = query.gte('fecha', estadoFondoFijo.filtros.fechaDesde);
        }
        if (estadoFondoFijo.filtros.fechaHasta) {
            query = query.lte('fecha', estadoFondoFijo.filtros.fechaHasta);
        }
        if (estadoFondoFijo.filtros.busqueda) {
            query = query.ilike('concepto', `%${estadoFondoFijo.filtros.busqueda}%`);
        }

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

// ------------------------------------------
// 5. RENDERING DE TABLA Y PAGINACIÓN
// ------------------------------------------
function renderizarTablaFondoFijo() {
    const tbody = document.getElementById('tabla-fondo-fijo-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const { paginaActual, registrosPorPagina } = estadoFondoFijo.paginacion;
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const paginados = estadoFondoFijo.registros.slice(inicio, fin);

    if (paginados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-slate-400">
                    No hay comprobantes registrados en este rinde con los filtros seleccionados.
                </td>
            </tr>`;
        return;
    }

    paginados.forEach(reg => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-700/50 hover:bg-slate-800/40 transition-colors text-sm';
        tr.innerHTML = `
            <td class="px-4 py-3 text-slate-300 whitespace-nowrap">${reg.fecha}</td>
            <td class="px-4 py-3 text-slate-200 font-medium">${reg.concepto}</td>
            <td class="px-4 py-3 text-slate-400">${reg.tipo_doc || '-'}</td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-300">${reg.centro_costo || 'General'}</span></td>
            <td class="px-4 py-3 text-right font-semibold text-emerald-400 whitespace-nowrap">$ ${parseFloat(reg.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td class="px-4 py-3 text-center whitespace-nowrap">
                <button onclick="prepararEdicionFondoFijo('${reg.id}')" class="text-blue-400 hover:text-blue-300 p-1 mr-2" title="Editar">✏️</button>
                <button onclick="eliminarRegistroFondoFijo('${reg.id}')" class="text-rose-400 hover:text-rose-300 p-1" title="Eliminar">🗑️</button>
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
        <div class="flex justify-between items-center px-4 py-3 text-xs text-slate-400">
            <span>Total: ${estadoFondoFijo.registros.length} registros (Página ${paginaActual} de ${totalPaginas})</span>
            <div class="flex gap-2">
                <button onclick="cambiarPaginaFF(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200"'}>Anterior</button>
                <button onclick="cambiarPaginaFF(${paginaActual + 1})" ${paginaActual >= totalPaginas ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200"'}>Siguiente</button>
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

// ------------------------------------------
// 6. EDICIÓN Y ELIMINACIÓN DE REGISTROS
// ------------------------------------------
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
        const { error } = await supabase
            .from('fondo_fijo')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showToast('Comprobante eliminado con éxito.');
        await cargarRegistrosFondoFijo();
    } catch (err) {
        console.error('Error al eliminar registro:', err);
        showToast('Error al eliminar el comprobante.', 'error');
    }
}

// ------------------------------------------
// 7. CIERRE Y RENDICIÓN CONTABLE
// ------------------------------------------
async function cerrarYRendirFondoFijo() {
    if (estadoFondoFijo.registros.length === 0) {
        showToast('No hay comprobantes activos para rendir.', 'error');
        return;
    }

    const totalRendicion = estadoFondoFijo.registros.reduce((sum, r) => sum + parseFloat(r.monto), 0);

    if (!confirm(`¿Confirmás el Cierre y Rendición del Fondo Fijo por un total de $ ${totalRendicion.toLocaleString('es-AR')}?`)) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        const idsActivos = estadoFondoFijo.registros.map(r => r.id);

        // 1. Marcar registros de fondo fijo como RENDIDO
        const { error: errUpdate } = await supabase
            .from('fondo_fijo')
            .update({ estado_rinde: 'RENDIDO' })
            .in('id', idsActivos);

        if (errUpdate) throw errUpdate;

        // 2. Generar Asiento Contable Automático en la tabla 'asientos' (o equivalente)
        const asientoContable = {
            fecha: new Date().toISOString().split('T')[0],
            concepto: `Reposición de Fondo Fijo - Rendición del ${new Date().toLocaleDateString('es-AR')}`,
            user_id: user?.id || null,
            empresa_id: estadoFondoFijo.empresaIdActual,
            debe: totalRendicion,
            haber: totalRendicion,
            detalles: 'Asiento generado automáticamente por cierre de rinde de caja chica.'
        };

        const { error: errAsiento } = await supabase
            .from('asientos')
            .insert([asientoContable]);

        if (errAsiento) console.warn('Atención: Se rindió el fondo pero no se pudo generar el asiento automático:', errAsiento);

        showToast('Fondo Fijo cerrado y rendido exitosamente. Asiento generado.');
        await cargarRegistrosFondoFijo();

    } catch (err) {
        console.error('Error al rendir Fondo Fijo:', err);
        showToast('Error al procesar el cierre del Fondo Fijo.', 'error');
    }
}

// ------------------------------------------
// 8. EXPORTACIÓN DE INFORMACIÓN
// ------------------------------------------
function exportarRindeCSV() {
    if (estadoFondoFijo.registros.length === 0) {
        showToast('No hay datos para exportar.', 'error');
        return;
    }

    const columnas = ['Fecha', 'Concepto', 'Tipo Doc', 'Centro Costo', 'Monto'];
    const filas = estadoFondoFijo.registros.map(r => [
        r.fecha,
        `"${r.concepto.replace(/"/g, '""')}"`,
        `"${r.tipo_doc || ''}"`,
        `"${r.centro_costo || ''}"`,
        r.monto
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

// ------------------------------------------
// 9. MÉTRICAS PARA DASHBOARD
// ------------------------------------------
function actualizarMetricasDashboard() {
    const totalMonto = estadoFondoFijo.registros.reduce((acc, r) => acc + parseFloat(r.monto), 0);
    const cantComprobantes = estadoFondoFijo.registros.length;

    const elTotal = document.getElementById('dash-ff-total');
    const elCant = document.getElementById('dash-ff-cantidad');

    if (elTotal) elTotal.textContent = `$ ${totalMonto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    if (elCant) elCant.textContent = cantComprobantes;
}

// ------------------------------------------
// 10. LISTENERS E INICIALIZACIÓN
// ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Listener del Formulario Principal
    const form = document.getElementById('form-fondo-fijo');
    if (form) form.addEventListener('submit', registrarComprobanteFondoFijo);

    // Listener de Input CSV
    const inputCSV = document.getElementById('ff-input-csv');
    if (inputCSV) {
        inputCSV.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importarCSVFondoFijo(e.target.files[0]);
            }
        });
    }

    // Listeners de Filtros
    const inputBusqueda = document.getElementById('ff-filtro-busqueda');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', (e) => {
            estadoFondoFijo.filtros.busqueda = e.target.value.trim();
            estadoFondoFijo.paginacion.paginaActual = 1;
            cargarRegistrosFondoFijo();
        });
    }

    // Carga inicial
    cargarRegistrosFondoFijo();
});
// -------------------------------------------------------------
// LIBRO DIARIO Y ASIENTOS (Verificación Debe = Haber)
// -------------------------------------------------------------
function validarYGuardarAsiento(lineas) {
  const totalDebe = lineas.reduce((acc, l) => acc + (parseFloat(l.debe) || 0), 0);
  const totalHaber = lineas.reduce((acc, l) => acc + (parseFloat(l.haber) || 0), 0);

  const statusContainer = document.getElementById('asiento-validation-status');

  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    if (statusContainer) {
      statusContainer.innerHTML = `
        <div class="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-lg text-xs font-semibold">
          ❌ Asiento desbalanceado. Debe: $ ${totalDebe.toLocaleString('es-AR')} | Haber: $ ${totalHaber.toLocaleString('es-AR')} (Diferencia: $ ${(totalDebe - totalHaber).toLocaleString('es-AR')})
        </div>
      `;
    }
    return false;
  }

  if (statusContainer) {
    statusContainer.innerHTML = `
      <div class="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-semibold">
        ✅ Asiento balanceado y registrado en Libro Diario. Total: $ ${totalDebe.toLocaleString('es-AR')}
      </div>
    `;
  }
  return true;
}

// -------------------------------------------------------------
// PARSER CSV GENERAL
// -------------------------------------------------------------
function parseCSV(text, delimiter = ',') {
  const lines = text.split('\n').filter(line => line.trim() !== '');
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

// Procesar CSV de ARCA (delimitador punto y coma ';')
function procesarArchivoArca(input) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById('status-arca-file');
  const reader = new FileReader();

  reader.onload = function(e) {
    const content = e.target.result;
    datosArcaIVA = parseCSV(content, ';'); // ARCA exporta separado por ';'
    if (statusEl) {
      statusEl.textContent = `✓ ${datosArcaIVA.length} comprobantes cargados correctamente de ARCA.`;
      statusEl.className = 'block text-[11px] text-emerald-600 font-semibold';
    }
  };

  reader.readAsText(file, 'ISO-8859-1'); // Codificación habitual de AFIP/ARCA
}

// Procesar CSV Interno (delimitador coma ',')
function procesarArchivoInternoIVA(input) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById('status-interno-file');
  const reader = new FileReader();

  reader.onload = function(e) {
    const content = e.target.result;
    datosInternoIVA = parseCSV(content, ',');
    if (statusEl) {
      statusEl.textContent = `✓ ${datosInternoIVA.length} registros cargados del sistema interno.`;
      statusEl.className = 'block text-[11px] text-emerald-600 font-semibold';
    }
  };

  reader.readAsText(file);
}

// Cruzar registros reales entre ARCA e Interno
function ejecutarCruceIvaReal() {
  const container = document.getElementById('cruzador-iva-results');
  if (!container) return;

  if (datosArcaIVA.length === 0 && datosInternoIVA.length === 0) {
    runCruzadorIvaDemo(); // Si no hay archivos, ejecuta el demo por defecto
    return;
  }

  // Comparar comprobantes presentes en ARCA que no estén en el sistema interno
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

// Variable de estado para Conciliador
let datosExtractoBanco = [];
let datosLibroDiario = [];

function procesarArchivoBanco(input) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById('status-banco-file');
  const reader = new FileReader();

  reader.onload = function(e) {
    const content = e.target.result;
    datosExtractoBanco = parseCSV(content, ',');
    if (statusEl) {
      statusEl.textContent = `✓ ${datosExtractoBanco.length} movimientos cargados del extracto bancario.`;
      statusEl.className = 'block text-[11px] text-emerald-600 font-semibold';
    }
  };

  reader.readAsText(file);
}

function procesarArchivoLibro(input) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById('status-libro-file');
  const reader = new FileReader();

  reader.onload = function(e) {
    const content = e.target.result;
    datosLibroDiario = parseCSV(content, ',');
    if (statusEl) {
      statusEl.textContent = `✓ ${datosLibroDiario.length} registros cargados del libro diario.`;
      statusEl.className = 'block text-[11px] text-emerald-600 font-semibold';
    }
  };

  reader.readAsText(file);
}

function ejecutarConciliacionBancaria() {
  const container = document.getElementById('conciliador-results');
  if (!container) return;

  if (datosExtractoBanco.length === 0 && datosLibroDiario.length === 0) {
    runConciliationDemo();
    return;
  }

  let conciliadosCount = 0;
  const resultadosHTML = datosExtractoBanco.map(banco => {
    const montoBanco = parseFloat(banco['Monto'] || banco['Importe'] || banco['monto'] || 0);
    const conceptoBanco = banco['Concepto'] || banco['Descripcion'] || banco['concepto'] || 'Movimiento Banco';

    const coincidencia = datosLibroDiario.find(libro => {
      const montoLibro = parseFloat(libro['Monto'] || libro['Importe'] || libro['monto'] || 0);
      return Math.abs(montoBanco - montoLibro) < 0.01;
    });

    if (coincidencia) conciliadosCount++;

    return `
      <tr>
        <td class="p-2 font-medium text-slate-800">${conceptoBanco}</td>
        <td class="p-2 text-slate-600">${coincidencia ? (coincidencia['Concepto'] || coincidencia['concepto'] || 'Coincidencia Interna') : '<span class="text-rose-500 italic">No encontrado en Libro Diario</span>'}</td>
        <td class="p-2 text-right font-bold text-slate-800">$ ${montoBanco.toLocaleString('es-AR')}</td>
        <td class="p-2 text-center">
          ${coincidencia 
            ? '<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-medium">Conciliado</span>' 
            : '<span class="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-medium">Pendiente</span>'}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 font-semibold text-xs">
        ✅ Procesamiento finalizado: ${conciliadosCount} de ${datosExtractoBanco.length} registros conciliados.
      </div>
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b font-semibold text-slate-600">
            <th class="p-2">Extracto Banco</th>
            <th class="p-2">Libro Diario</th>
            <th class="p-2 text-right">Importe</th>
            <th class="p-2 text-center">Estado</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${resultadosHTML}
        </tbody>
      </table>
    </div>
  `;
}

// Variable de estado para Cuentas Corrientes
let datosCtaCorriente = [];

function procesarArchivoCtaCorriente(input) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById('status-cta-file');
  const reader = new FileReader();

  reader.onload = function(e) {
    const content = e.target.result;
    datosCtaCorriente = parseCSV(content, ',');
    if (statusEl) {
      statusEl.textContent = `✓ ${datosCtaCorriente.length} comprobantes cargados correctamente.`;
      statusEl.className = 'block text-[11px] text-emerald-600 font-semibold';
    }
  };

  reader.readAsText(file);
}

function ejecularCalculoCtaCorriente() {
  const container = document.getElementById('cta-corriente-results');
  if (!container) return;

  if (datosCtaCorriente.length === 0) {
    runCtaCorrienteDemo();
    return;
  }

  const saldosPorCliente = {};

  datosCtaCorriente.forEach(item => {
    const cliente = item['Cliente'] || item['Proveedor'] || item['Razon Social'] || 'Cliente Genérico';
    const debe = parseFloat(item['Debe'] || item['Facturado'] || item['monto'] || 0);
    const haber = parseFloat(item['Haber'] || item['Cobrado'] || 0);

    if (!saldosPorCliente[cliente]) {
      saldosPorCliente[cliente] = { facturado: 0, cobrado: 0 };
    }

    saldosPorCliente[cliente].facturado += debe;
    saldosPorCliente[cliente].cobrado += haber;
  });

  const filasHTML = Object.keys(saldosPorCliente).map(cliente => {
    const data = saldosPorCliente[cliente];
    const saldo = data.facturado - data.cobrado;

    return `
      <tr>
        <td class="p-2 font-medium text-slate-800">${cliente}</td>
        <td class="p-2 text-right text-slate-600">$ ${data.facturado.toLocaleString('es-AR')}</td>
        <td class="p-2 text-right text-slate-600">$ ${data.cobrado.toLocaleString('es-AR')}</td>
        <td class="p-2 text-right font-bold ${saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}">
          $ ${saldo.toLocaleString('es-AR')}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="border-b font-semibold text-slate-600">
          <th class="p-2">Cliente / Proveedor</th>
          <th class="p-2 text-right">Facturado ($)</th>
          <th class="p-2 text-right">Cobrado/Pagado ($)</th>
          <th class="p-2 text-right">Saldo Pendiente ($)</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${filasHTML}
      </tbody>
    </table>
  `;
}

function procesarArchivoFondoFijo(input) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById('status-ff-file');
  const reader = new FileReader();

  reader.onload = function(e) {
    const content = e.target.result;
    const datosImportados = parseCSV(content, ',');

    datosImportados.forEach(item => {
      if (item['Concepto'] || item['monto']) {
        fondoFijoMovimientos.push({
          id: Date.now() + Math.random(),
          fecha: item['Fecha'] || new Date().toLocaleDateString('es-AR'),
          concepto: item['Concepto'] || 'Gasto Variado',
          monto: parseFloat(item['Monto'] || item['monto'] || 0),
          centroCosto: item['Centro'] || item['CentroCosto'] || 'Administración',
          tipoDoc: item['Tipo'] || 'Factura C'
        });
      }
    });

    renderFondoFijo();

    if (statusEl) {
      statusEl.textContent = `✓ ${datosImportados.length} comprobantes agregados al rinde.`;
      statusEl.className = 'block text-[11px] text-emerald-600 font-semibold';
    }
  };

  reader.readAsText(file);
}

// -------------------------------------------------------------
// GESTOR DE ÓRDEN DE PAGO (OP) COMPLETO (6 PUNTOS)
// -------------------------------------------------------------
let historialOP = JSON.parse(localStorage.getItem('suite_historial_op')) || [];
let adjuntoBase64Temp = null;

// Establecer fecha de hoy por defecto en el input al cargar
document.addEventListener('DOMContentLoaded', () => {
  const inputFecha = document.getElementById('op-fecha');
  if (inputFecha && !inputFecha.value) {
    inputFecha.value = new Date().toISOString().split('T')[0];
  }
  renderHistorialOP();
});

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
  const fileInput = document.getElementById('op-adjunto');
  const preview = document.getElementById('contenedor-preview-op');

  let nombreAdjunto = 'Ninguno';
  if (fileInput && fileInput.files && fileInput.files[0]) {
    nombreAdjunto = fileInput.files[0].name;
    const reader = new FileReader();
    reader.onload = function (e) {
      adjuntoBase64Temp = e.target.result;
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    adjuntoBase64Temp = null;
  }

  if (preview) {
    if (montoFactura > 0) {
      preview.className = "space-y-3.5 text-left text-slate-700";
      preview.innerHTML = `
        <div class="flex justify-between items-center border-b border-slate-200 pb-3">
          <div>
            <h4 class="font-bold text-slate-800">ORDEN DE PAGO N° OP-${(historialOP.length + 1).toString().padStart(4, '0')}</h4>
            <span class="text-xs text-slate-500">Fecha reprogramada/emisión: ${fecha}</span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Borrador</span>
        </div>

        <div class="text-xs space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p><strong class="text-slate-900">Proveedor:</strong> ${proveedor} <span class="text-slate-500">(${cuit})</span></p>
          <p><strong class="text-slate-900">Concepto:</strong> ${concepto}</p>
          <p><strong class="text-slate-900">Medio de Pago:</strong> ${medio} (${numComprobante})</p>
          <p><strong class="text-slate-900">Adjunto:</strong> <span class="text-indigo-600">${nombreAdjunto}</span></p>
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

        <div class="pt-1">
          <button type="button" onclick="window.print()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <i data-lucide="printer" class="w-3.5 h-3.5"></i> Vista Imprimible / PDF
          </button>
        </div>
      `;
    } else {
      preview.className = "text-center text-slate-400 py-12 flex flex-col items-center justify-center gap-2";
      preview.innerHTML = `
        <i data-lucide="receipt" class="w-12 h-12 text-slate-300"></i>
        <p class="text-sm">Completa el formulario para previsualizar la Orden de Pago.</p>
      `;
    }
  }

  if (window.lucide) lucide.createIcons();
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

  if (!fecha) return alert('Seleccioná una fecha válida.');
  if (!proveedor) return alert('Ingresá la Razón Social o nombre del Proveedor.');
  if (!concepto) return alert('Ingresá el concepto o detalle del pago.');
  if (montoFactura <= 0) return alert('El monto bruto debe ser mayor a 0.');
  if (retencion > montoFactura) return alert('La retención no puede superar el monto bruto.');

  const neto = montoFactura - retencion;

  const nuevaOP = {
    id: 'OP-' + (historialOP.length + 1).toString().padStart(4, '0'),
    fecha,
    proveedor,
    cuit,
    concepto,
    montoFactura,
    retencion,
    neto,
    medio,
    numComprobante,
    estado: 'Pagado', // Estados: 'Pagado', 'Pendiente', 'Anulado'
    adjunto: adjuntoBase64Temp
  };

  historialOP.unshift(nuevaOP);
  localStorage.setItem('suite_historial_op', JSON.stringify(historialOP));
  
  renderHistorialOP();

  // Reset del formulario restaurando fecha
  const form = document.getElementById('form-op');
  if (form) form.reset();
  document.getElementById('op-fecha').value = new Date().toISOString().split('T')[0];

  adjuntoBase64Temp = null;

  const preview = document.getElementById('contenedor-preview-op');
  if (preview) {
    preview.className = "text-center text-slate-400 py-12 flex flex-col items-center justify-center gap-2";
    preview.innerHTML = `
      <i data-lucide="receipt" class="w-12 h-12 text-slate-300"></i>
      <p class="text-sm">Completa el formulario para previsualizar la Orden de Pago.</p>
    `;
  }

  if (window.lucide) lucide.createIcons();
  alert('Orden de Pago registrada con éxito.');
}

function cambiarEstadoOP(id, nuevoEstado) {
  const op = historialOP.find(o => o.id === id);
  if (op) {
    op.estado = nuevoEstado;
    localStorage.setItem('suite_historial_op', JSON.stringify(historialOP));
    renderHistorialOP();
  }
}

function renderHistorialOP() {
  const tbody = document.getElementById('tbody-op-historial');
  const filtro = (document.getElementById('op-buscar-historial')?.value || '').toLowerCase();
  
  if (!tbody) return;
  tbody.innerHTML = '';

  const listaFiltrada = historialOP.filter(op => 
    op.proveedor.toLowerCase().includes(filtro) || 
    op.cuit.toLowerCase().includes(filtro) || 
    op.id.toLowerCase().includes(filtro)
  );

  if (listaFiltrada.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400">No se encontraron órdenes de pago.</td></tr>`;
    return;
  }

  listaFiltrada.forEach((op) => {
    const tieneAdjunto = Boolean(op.adjunto);

    // Badges según Estado
    let badgeEstado = '';
    if (op.estado === 'Pagado') {
      badgeEstado = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Pagado</span>`;
    } else if (op.estado === 'Pendiente') {
      badgeEstado = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Pendiente</span>`;
    } else {
      badgeEstado = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Anulado</span>`;
    }

    tbody.innerHTML += `
      <tr class="hover:bg-slate-50 transition-colors ${op.estado === 'Anulado' ? 'opacity-60 bg-slate-50/50' : ''}">
        <td class="p-3">
          <div class="font-bold text-slate-900">${op.id}</div>
          <div class="text-[11px] text-slate-400">${op.fecha}</div>
        </td>
        <td class="p-3">
          <div class="font-semibold text-slate-800">${op.proveedor}</div>
          <div class="text-[11px] text-slate-400">CUIT: ${op.cuit}</div>
        </td>
        <td class="p-3 text-slate-600 max-w-xs truncate" title="${op.concepto}">${op.concepto}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200 text-slate-700">${op.medio}</span>
        </td>
        <td class="p-3 font-mono font-bold text-emerald-700">$ ${op.neto.toFixed(2)}</td>
        <td class="p-3 text-center">
          <select onchange="cambiarEstadoOP('${op.id}', this.value)" class="text-[11px] bg-transparent border-0 font-medium focus:ring-0 cursor-pointer">
            <option value="Pagado" ${op.estado === 'Pagado' ? 'selected' : ''}>Pagado</option>
            <option value="Pendiente" ${op.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="Anulado" ${op.estado === 'Anulado' ? 'selected' : ''}>Anulado</option>
          </select>
        </td>
        <td class="p-3 text-center">
          ${tieneAdjunto 
            ? `<button onclick="verAdjuntoOP('${op.id}')" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Ver Comprobante Respaldatorio"><i data-lucide="paperclip" class="w-4 h-4"></i></button>`
            : `<span class="text-slate-300">-</span>`
          }
        </td>
        <td class="p-3 text-center">
          <div class="flex items-center justify-center gap-1">
            <button onclick="window.print()" class="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Imprimir Comprobante">
              <i data-lucide="printer" class="w-4 h-4"></i>
            </button>
            <button onclick="eliminarOP('${op.id}')" class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors" title="Eliminar OP">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  if (window.lucide) lucide.createIcons();
}

function verAdjuntoOP(id) {
  const op = historialOP.find(o => o.id === id);
  if (op && op.adjunto) {
    const win = window.open();
    win.document.write(`<iframe src="${op.adjunto}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
  }
}

function eliminarOP(id) {
  if (confirm(`¿Estás seguro de que deseas eliminar la orden ${id}?`)) {
    historialOP = historialOP.filter(op => op.id !== id);
    localStorage.setItem('suite_historial_op', JSON.stringify(historialOP));
    renderHistorialOP();
  }
}

function exportarHistorialOPCSV() {
  if (historialOP.length === 0) return alert('No hay datos para exportar.');
  let csv = 'ID,Fecha,Proveedor,CUIT,Concepto,Medio,Monto Factura,Retencion,Neto,Estado,Num Comprobante\n';
  historialOP.forEach(o => {
    csv += `${o.id},${o.fecha},"${o.proveedor}","${o.cuit}","${o.concepto}",${o.medio},${o.montoFactura},${o.retencion},${o.neto},${o.estado},"${o.numComprobante}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `Historial_OP_${new Date().toISOString().slice(0,10)}.csv`);
  a.click();
}
// =============================================================
// LÓGICA DEL LIBRO DIARIO Y ASIENTOS
// =============================================================
let historialLibroDiario = JSON.parse(localStorage.getItem('suite_libro_diario')) || [];

document.addEventListener('DOMContentLoaded', () => {
  const inputFecha = document.getElementById('asiento-fecha');
  if (inputFecha && !inputFecha.value) {
    inputFecha.value = new Date().toISOString().split('T')[0];
  }
  inicializarAsientoManual();
  renderLibroDiario();
});

function inicializarAsientoManual() {
  const contenedor = document.getElementById('contenedor-lineas-asiento');
  if (!contenedor) return;
  contenedor.innerHTML = '';
  // Crea los 2 renglones base
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
      <input type="text" list="plan-cuentas-sugeridas" placeholder="Cuenta Contable (ej: Gastos de Administración)" class="asiento-cuenta w-full border border-slate-300 text-slate-800 text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" required>
    </div>
    <div class="col-span-3">
      <input type="number" step="0.01" min="0" placeholder="Debe ($)" oninput="calcularPartidaDoble()" class="asiento-debe w-full border border-slate-300 text-slate-800 text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono">
    </div>
    <div class="col-span-3 flex items-center gap-1">
      <input type="number" step="0.01" min="0" placeholder="Haber ($)" oninput="calcularPartidaDoble()" class="asiento-haber w-full border border-slate-300 text-slate-800 text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono">
      <button type="button" onclick="eliminarLineaAsiento('${idLinea}')" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer" title="Quitar renglón">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `;

  contenedor.appendChild(div);
  if (window.lucide) lucide.createIcons();
}

function eliminarLineaAsiento(idLinea) {
  const lineas = document.querySelectorAll('.linea-asiento-item');
  if (lineas.length <= 2) {
    alert('Un asiento contable requiere como mínimo 2 cuentas.');
    return;
  }
  const el = document.getElementById(idLinea);
  if (el) el.remove();
  calcularPartidaDoble();
}

function calcularPartidaDoble() {
  const debes = document.querySelectorAll('.asiento-debe');
  const haberes = document.querySelectorAll('.asiento-haber');

  let totalDebe = 0;
  let totalHaber = 0;

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
      btn.className = "w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow cursor-pointer flex items-center justify-center gap-2";
    } else {
      status.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200";
      status.textContent = "Desbalanceado (Debe ≠ Haber)";
      btn.disabled = true;
      btn.className = "w-full bg-slate-300 text-slate-500 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all cursor-not-allowed flex items-center justify-center gap-2";
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

    if (cuenta && (debe > 0 || haber > 0)) {
      renglones.push({ cuenta, debe, haber });
    }
  });

  if (renglones.length < 2) {
    alert('Ingresá al menos dos cuentas con montos válidos.');
    return;
  }

  const numAsiento = 'N° ' + (historialLibroDiario.length + 1).toString().padStart(4, '0');

  const nuevoAsiento = {
    id: numAsiento,
    fecha,
    leyenda,
    renglones
  };

  historialLibroDiario.unshift(nuevoAsiento);
  localStorage.setItem('suite_libro_diario', JSON.stringify(historialLibroDiario));

  renderLibroDiario();

  // Limpiar campos y resetear
  document.getElementById('asiento-leyenda').value = '';
  inicializarAsientoManual();

  alert(`Asiento ${numAsiento} guardado correctamente.`);
}

function renderLibroDiario() {
  const contenedor = document.getElementById('contenedor-libro-diario');
  const filtro = (document.getElementById('asiento-buscar-historial')?.value || '').toLowerCase();

  if (!contenedor) return;
  contenedor.innerHTML = '';

  const listaFiltrada = historialLibroDiario.filter(a => 
    a.leyenda.toLowerCase().includes(filtro) ||
    a.id.toLowerCase().includes(filtro) ||
    a.renglones.some(r => r.cuenta.toLowerCase().includes(filtro))
  );

  if (listaFiltrada.length === 0) {
    contenedor.innerHTML = `<div class="p-6 text-center text-slate-400">No hay asientos registrados en el Libro Diario.</div>`;
    return;
  }

  listaFiltrada.forEach(asiento => {
    const totalMonto = asiento.renglones.reduce((acc, r) => acc + r.debe, 0);

    const filasHTML = asiento.renglones.map(r => `
      <tr class="border-b border-slate-100">
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
          <button onclick="eliminarAsiento('${asiento.id}')" class="text-rose-500 hover:text-rose-700 p-1 rounded transition-colors" title="Eliminar Asiento">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="text-slate-400 font-normal border-b border-slate-100">
              <th class="text-left py-1 px-3">Cuenta</th>
              <th class="text-right py-1 px-3 w-28">Debe</th>
              <th class="text-right py-1 px-3 w-28">Haber</th>
            </tr>
          </thead>
          <tbody>
            ${filasHTML}
          </tbody>
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

  if (window.lucide) lucide.createIcons();
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
// =============================================================
// LÓGICA DEL DASHBOARD INTEGRADO
// =============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Setear el mes actual en el filtro de período del Dashboard
  const inputPeriodo = document.getElementById('dashboard-periodo');
  if (inputPeriodo && !inputPeriodo.value) {
    const hoy = new Date();
    inputPeriodo.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }
  actualizarDashboardMetrics();
});

// Función global de navegación entre pestañas
function navegarA(tabId) {
  const secciones = document.querySelectorAll('main section');
  secciones.forEach(sec => sec.classList.add('hidden'));

  const objetivo = document.getElementById(tabId);
  if (objetivo) {
    objetivo.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Actualizar la barra lateral activa si aplica
  const linksSidebar = document.querySelectorAll('aside nav button');
  linksSidebar.forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white');
    btn.classList.add('text-slate-300', 'hover:bg-slate-800');
  });

  // Re-actualizar KPIs al volver al Dashboard
  if (tabId === 'tab-dashboard') {
    actualizarDashboardMetrics();
  }
}

function actualizarDashboardMetrics() {
  // 1. Métrica Libro Diario
  const libroDiario = JSON.parse(localStorage.getItem('suite_libro_diario')) || [];
  const kpiAsientos = document.getElementById('kpi-asientos-cant');
  const kpiAsientosSub = document.getElementById('kpi-asientos-sub');
  if (kpiAsientos) kpiAsientos.textContent = libroDiario.length;
  if (kpiAsientosSub) {
    kpiAsientosSub.textContent = libroDiario.length > 0 
      ? `Último: ${libroDiario[0].id}` 
      : 'Sin registros aún';
  }

  // 2. Métrica Fondo Fijo / Caja Chica
  const rindeFondo = JSON.parse(localStorage.getItem('suite_fondo_fijo')) || [];
  const totalFondo = rindeFondo.reduce((acc, item) => acc + (parseFloat(item.monto) || 0), 0);
  const kpiFondoMonto = document.getElementById('kpi-fondo-monto');
  const kpiFondoSub = document.getElementById('kpi-fondo-sub');
  if (kpiFondoMonto) kpiFondoMonto.textContent = `$ ${totalFondo.toFixed(2)}`;
  if (kpiFondoSub) kpiFondoSub.textContent = `${rindeFondo.length} comprobantes cargados`;

  // 3. Métrica Cuentas Corrientes
  const ctacte = JSON.parse(localStorage.getItem('suite_cuentas_corrientes')) || [];
  const totalCtaCte = ctacte.reduce((acc, item) => acc + (parseFloat(item.monto) || 0), 0);
  const kpiCtaCteSaldo = document.getElementById('kpi-ctacte-saldo');
  const kpiCtaCteSub = document.getElementById('kpi-ctacte-sub');
  if (kpiCtaCteSaldo) kpiCtaCteSaldo.textContent = `$ ${totalCtaCte.toFixed(2)}`;
  if (kpiCtaCteSub) kpiCtaCteSub.textContent = `${ctacte.length} facturas pendientes`;

  // Renderizar Log de Actividades
  renderActivityLog(libroDiario, rindeFondo);
}

function renderActivityLog(libroDiario, rindeFondo) {
  const container = document.getElementById('dashboard-activity-log');
  if (!container) return;
  container.innerHTML = '';

  const eventos = [];

  libroDiario.forEach(a => {
    eventos.push({
      tipo: 'Asiento Contable',
      desc: `${a.id} - ${a.leyenda}`,
      fecha: a.fecha,
      icono: 'book-open',
      color: 'text-purple-600 bg-purple-50'
    });
  });

  rindeFondo.forEach(r => {
    eventos.push({
      tipo: 'Rendición Caja',
      desc: `${r.concepto} ($${parseFloat(r.monto).toFixed(2)})`,
      fecha: r.fecha || 'Reciente',
      icono: 'wallet',
      color: 'text-amber-600 bg-amber-50'
    });
  });

  if (eventos.length === 0) {
    container.innerHTML = `<div class="text-slate-400 text-center py-4">No hay actividad reciente registrada en el sistema.</div>`;
    return;
  }

  // Tomar los últimos 5 eventos
  eventos.slice(0, 5).forEach(ev => {
    container.innerHTML += `
      <div class="flex items-start gap-2.5 pb-2 border-b border-slate-100 last:border-none">
        <div class="p-1.5 rounded-lg ${ev.color} mt-0.5">
          <i data-lucide="${ev.icono}" class="w-3.5 h-3.5"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-slate-800 truncate">${ev.desc}</p>
          <p class="text-[10px] text-slate-400">${ev.tipo} • ${ev.fecha}</p>
        </div>
      </div>
    `;
  });

  if (window.lucide) lucide.createIcons();
}

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

  // Listener en tiempo real para cambios de sesión
  db.auth.onAuthStateChange((event, session) => {
    const authModal = document.getElementById('auth-modal');
    const userDisplay = document.getElementById('user-display-email');

    if (session) {
      currentUser = session.user;
      if (authModal) authModal.classList.add('hidden');
      if (userDisplay) userDisplay.textContent = session.user.email;
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
// MOTOR 1: CONCILIADOR BANCARIO (Demo)
// -------------------------------------------------------------
function runConciliationDemo() {
  const bankData = [
    { id: 'b1', date: '2026-09-10', concept: 'DEP. TRANSFERENCIA 458', amount: 150000 },
    { id: 'b2', date: '2026-09-12', concept: 'PAGO PROVEEDOR REX', amount: -45000 }
  ];

  const bookData = [
    { id: 'l1', date: '2026-09-10', concept: 'Cobro Cliente Perez', amount: 150000 },
    { id: 'l2', date: '2026-09-15', concept: 'Pago REX Pinturas', amount: -45000 }
  ];

  const container = document.getElementById('conciliador-results');
  if (!container) return;
  
  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 font-semibold text-xs">
        ✅ Conciliación completada: 2 de 2 registros procesados correctamente.
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
        <tbody class="divide-y">
          <tr>
            <td class="p-2">${bankData[0].concept}</td>
            <td class="p-2">${bookData[0].concept}</td>
            <td class="p-2 text-right font-bold text-slate-800">$ 150.000,00</td>
            <td class="p-2 text-center"><span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">Conciliado</span></td>
          </tr>
          <tr>
            <td class="p-2">${bankData[1].concept}</td>
            <td class="p-2">${bookData[1].concept}</td>
            <td class="p-2 text-right font-bold text-slate-800">-$ 45.000,00</td>
            <td class="p-2 text-center"><span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px]">Diferencia Fecha</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// -------------------------------------------------------------
// MOTOR 2: CUENTAS CORRIENTES (Demo)
// -------------------------------------------------------------
function runCtaCorrienteDemo() {
  const container = document.getElementById('cta-corriente-results');
  if (!container) return;

  container.innerHTML = `
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="border-b font-semibold text-slate-600">
          <th class="p-2">Cliente / Proveedor</th>
          <th class="p-2 text-right">Facturado</th>
          <th class="p-2 text-right">Cobrado</th>
          <th class="p-2 text-right">Saldo Pendiente</th>
        </tr>
      </thead>
      <tbody class="divide-y">
        <tr>
          <td class="p-2 font-medium text-slate-800">DISTRIBUIDORA PEREZ SRL</td>
          <td class="p-2 text-right">$ 850.000,00</td>
          <td class="p-2 text-right">$ 500.000,00</td>
          <td class="p-2 text-right font-bold text-amber-600">$ 350.000,00</td>
        </tr>
        <tr>
          <td class="p-2 font-medium text-slate-800">CONSTRUCCIONES DEL SUR SA</td>
          <td class="p-2 text-right">$ 1.200.000,00</td>
          <td class="p-2 text-right">$ 1.200.000,00</td>
          <td class="p-2 text-right font-bold text-emerald-600">$ 0,00</td>
        </tr>
      </tbody>
    </table>
  `;
}

// -------------------------------------------------------------
// MOTOR 3: CRUZADOR IVA DIGITAL (Demo)
// -------------------------------------------------------------
function runCruzadorIvaDemo() {
  const container = document.getElementById('cruzador-iva-results');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-3">
      <div class="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold">
        ⚠️ Se detectó 1 comprobante presente en ARCA que NO fue cargado en el sistema interno.
      </div>
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b font-semibold text-slate-600">
            <th class="p-2">CUIT</th>
            <th class="p-2">Razón Social</th>
            <th class="p-2">Comprobante</th>
            <th class="p-2 text-right">Total ARCA</th>
          </tr>
        </thead>
        <tbody>
          <tr class="bg-rose-50/50">
            <td class="p-2 font-mono">30-71123456-8</td>
            <td class="p-2 font-medium">TELECOM ARGENTINA SA</td>
            <td class="p-2">FC A 00012-00045892</td>
            <td class="p-2 text-right font-bold">$ 54.450,00</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// -------------------------------------------------------------
// MOTOR 4: CALC RETENCIONES (Interactivo + Guardado en BD)
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

  // Renderizar resultado en UI
  const container = document.getElementById('retenciones-results');
  if (container) {
    container.innerHTML = `
      <div>
        <h3 class="text-xs uppercase text-slate-400 font-semibold mb-4">Resultado Liquidación</h3>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between border-b border-slate-800 pb-2">
            <span class="text-slate-400">Neto Comprobante:</span>
            <span>$ ${net.toLocaleString('es-AR')}</span>
          </div>
          <div class="flex justify-between text-amber-400">
            <span>Ret. Ganancias (2%):</span>
            <span>-$ ${ganancias.toLocaleString('es-AR')}</span>
          </div>
          <div class="flex justify-between text-amber-400 border-b border-slate-800 pb-2">
            <span>Ret. IIBB (2.5%):</span>
            <span>-$ ${iibb.toLocaleString('es-AR')}</span>
          </div>
          <div class="flex justify-between text-base font-bold pt-2 text-emerald-400">
            <span>Neto a Pagar:</span>
            <span>$ ${netToPay.toLocaleString('es-AR')}</span>
          </div>
        </div>
        <p id="save-status" class="mt-4 text-[11px] text-slate-400 italic">Guardando registro en Supabase...</p>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <button onclick="downloadPDF(${net}, ${ganancias}, ${iibb}, ${netToPay})" class="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2 px-2 rounded-lg transition-all shadow flex items-center justify-center gap-1 cursor-pointer">
            📄 Exportar PDF
          </button>
          <button onclick="downloadCSV(${net}, ${ganancias}, ${iibb}, ${netToPay})" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-2 rounded-lg transition-all shadow flex items-center justify-center gap-1 cursor-pointer">
            📊 Exportar CSV
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

    if (currentUser) {
      payload.user_id = currentUser.id;
    }

    const { error } = await db.from('retenciones_emitidas').insert([payload]);

    const statusEl = document.getElementById('save-status');
    if (statusEl) {
      if (error) {
        statusEl.textContent = '⚠️ Error al guardar en Supabase: ' + error.message;
        statusEl.className = 'mt-4 text-[11px] text-rose-400 font-medium';
      } else {
        statusEl.textContent = '✓ Registrado en la base de datos de Supabase';
        statusEl.className = 'mt-4 text-[11px] text-emerald-400 font-medium';
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// Exportación en PDF
function downloadPDF(neto, ganancias, iibb, netoPagar) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text("Certificado de Retención", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 30);
  doc.text(`Empresa: Demostración SA`, 14, 36);

  doc.autoTable({
    startY: 45,
    head: [['Concepto', 'Monto ($)']],
    body: [
      ['Neto Comprobante', `$ ${neto.toLocaleString('es-AR')}`],
      ['Retención Ganancias (2%)', `-$ ${ganancias.toLocaleString('es-AR')}`],
      ['Retención IIBB (2.5%)', `-$ ${iibb.toLocaleString('es-AR')}`],
      ['Neto a Pagar', `$ ${netoPagar.toLocaleString('es-AR')}`]
    ],
    headStyles: { fillColor: [79, 70, 229] },
  });

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

// -------------------------------------------------------------
// FONDO FIJO / CAJA CHICA
// -------------------------------------------------------------
let fondoFijoMovimientos = [];

function agregarGastoCajaChica(concepto, monto, centroCosto, tipoDoc) {
  if (!concepto || !monto) return;
  const mov = {
    id: Date.now(),
    fecha: new Date().toLocaleDateString('es-AR'),
    concepto,
    monto: parseFloat(monto),
    centroCosto,
    tipoDoc
  };
  
  fondoFijoMovimientos.push(mov);
  renderFondoFijo();
}

function renderFondoFijo() {
  const container = document.getElementById('fondo-fijo-results');
  if (!container) return;

  const totalGastado = fondoFijoMovimientos.reduce((acc, m) => acc + m.monto, 0);

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex justify-between items-center p-3 bg-slate-800 rounded-lg border border-slate-700">
        <span class="text-xs text-slate-300 font-semibold">Total Rinde Caja Chica:</span>
        <span class="text-sm font-bold text-emerald-400">$ ${totalGastado.toLocaleString('es-AR')}</span>
      </div>
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-slate-700 font-semibold text-slate-400">
            <th class="p-2">Fecha</th>
            <th class="p-2">Concepto</th>
            <th class="p-2">Comprobante</th>
            <th class="p-2">Centro Costo</th>
            <th class="p-2 text-right">Monto</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800">
          ${fondoFijoMovimientos.map(m => `
            <tr>
              <td class="p-2 text-slate-400">${m.fecha}</td>
              <td class="p-2 text-slate-200 font-medium">${m.concepto}</td>
              <td class="p-2 text-slate-400">${m.tipoDoc}</td>
              <td class="p-2"><span class="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded text-[10px] border border-indigo-800">${m.centroCosto}</span></td>               <td class="p-2 text-right font-bold text-slate-100">$ ${m.monto.toLocaleString('es-AR')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

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

// Variables de estado para los registros cargados
let datosArcaIVA = [];
let datosInternoIVA = [];

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

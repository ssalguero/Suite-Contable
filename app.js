// Inicializar íconos de Lucide al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
});

// Inicialización de Supabase
const SUPABASE_URL = 'https://ippdmibozcpxzsczvpqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcGRtaWJvemNweHpzY3p2cHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDI1MDUsImV4cCI6MjEwNTkxODUwNX0.6izD8ivkoovQdX1RE8MarIZbgVumzuavl7FB6P0boLU';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Control de Pestañas Navegación
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
// NUEVA FUNCIÓN 1: FONDO FIJO / CAJA CHICA
// -------------------------------------------------------------
let fondoFijoMovimientos = [];

function agregarGastoCajaChica(concepto, monto, centroCosto, tipoDoc) {
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
// NUEVA FUNCIÓN 2: GESTOR DE ÓRDEN DE PAGO (OP)
// -------------------------------------------------------------
function generarOrdenPago(proveedor, montoFactura, retencionAplicada, medioPago) {
  const netoAPagar = montoFactura - retencionAplicada;
  
  const opContainer = document.getElementById('op-results');
  if (!opContainer) return;

  opContainer.innerHTML = `
    <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
      <div class="flex justify-between items-center border-b border-slate-800 pb-2">
        <h4 class="text-xs font-bold uppercase text-indigo-400">Órden de Pago Generada</h4>
        <span class="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">Emitida</span>
      </div>
      <div class="space-y-1.5 text-xs text-slate-300">
        <div class="flex justify-between"><span>Proveedor:</span> <strong class="text-slate-100">${proveedor}</strong></div>
        <div class="flex justify-between"><span>Total Comprobante:</span> <span>$ ${montoFactura.toLocaleString('es-AR')}</span></div>
        <div class="flex justify-between text-amber-400"><span>Retenciones Aplicadas:</span> <span>-$ ${retencionAplicada.toLocaleString('es-AR')}</span></div>
        <div class="flex justify-between"><span>Medio de Pago:</span> <span>${medioPago}</span></div>
        <div class="flex justify-between text-sm font-bold border-t border-slate-800 pt-2 text-emerald-400">
          <span>Total a Transferir/Emitir:</span>
          <span>$ ${netoAPagar.toLocaleString('es-AR')}</span>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// NUEVA FUNCIÓN 3: LIBRO DIARIO Y ASIENTOS (Verificación Debe = Haber)
// -------------------------------------------------------------
let renglonesAsiento = [
  { cuenta: '', debe: 0, haber: 0 }
];

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
// UTILIDAD GENERAL PARA IMPORTACIÓN DE ARCHIVOS (CSV / TXT)
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

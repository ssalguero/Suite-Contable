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

// Función para guardar retención calculada en Supabase
async function guardarRetencionBD(neto, acumulado, retencion, alicuota) {
  const { data, error } = await db
    .from('retenciones_emitidas')
    .insert([
      {
        neto_comprobante: neto,
        acumulado_mes: acumulado,
        monto_retencion: retencion,
        alicuota_aplicada: alicuota
      }
    ]);

  if (error) {
    console.error('Error al guardar en Supabase:', error.message);
  } else {
    console.log('Registro guardado exitosamente en Supabase:', data);
  }
}

// Control de Pestañas
function switchTab(tabId) {
  const tabs = ['dashboard', 'conciliador', 'cta-corriente', 'cruzador-iva', 'calc-retenciones'];
  
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
        <button onclick="downloadPDF(${net}, ${ganancias}, ${iibb}, ${netToPay})" class="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2 px-2 rounded-lg transition-all shadow flex items-center justify-center gap-1">
          📄 Exportar PDF
        </button>
        <button onclick="downloadCSV(${net}, ${ganancias}, ${iibb}, ${netToPay})" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-2 rounded-lg transition-all shadow flex items-center justify-center gap-1">
          📊 Exportar CSV
        </button>
      </div>
    </div>
  `;

  // Guardar en la base de datos automáticamente
  try {
    await guardarRetencionBD(net, acum, totalRet, 2.0);
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
      statusEl.textContent = '✓ Registrado en la base de datos de Supabase';
      statusEl.className = 'mt-4 text-[11px] text-emerald-400 font-medium';
    }
  } catch (err) {
    console.error(err);
  }
}

// Función para generar y descargar el Certificado en PDF
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

// Función para generar y descargar el reporte en CSV / Excel
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

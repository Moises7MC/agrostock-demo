/* ============================================================
   app.js — Lógica completa del sistema AgroStock
   ============================================================ */

// ===================== HELPERS =====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const formatPEN = (n) => `S/ ${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
const formatDate = (str) => {
    const d = new Date(str + 'T00:00:00');
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getDate()} ${meses[d.getMonth()]}`;
};
const formatDateLong = (str) => {
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const today = () => new Date().toISOString().split('T')[0];
const initials = (str) => str.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const findProducto = (id) => productos.find(p => p.id === id);
const findProveedor = (id) => proveedores.find(p => p.id === id);
const findCliente = (id) => clientes.find(c => c.id === id);
const findCategoria = (id) => categorias.find(c => c.id === id);
const findUnidad = (id) => unidades.find(u => u.id === id);

// Total facturado de una venta multi-producto
const ventaTotal = (v) => v.items.reduce((s, it) => s + it.cantidad * it.precioUnit, 0);
const ventaCantidadTotal = (v) => v.items.reduce((s, it) => s + it.cantidad, 0);

// Ventas a crédito: cuánto ha abonado el cliente y cuánto le falta pagar
const ventaMontoPagado = (v) => (v.abonos || []).reduce((s, a) => s + a.monto, 0);
const ventaSaldoPendiente = (v) => v.formaPago === 'Crédito' ? Math.max(0, ventaTotal(v) - ventaMontoPagado(v)) : 0;
const ventaEstaPagada = (v) => v.formaPago !== 'Crédito' || ventaSaldoPendiente(v) <= 0.01;

const DIAS_ALERTA_VENCIMIENTO = 90;

const diasParaVencer = (fechaVencimiento) => {
    const hoy = new Date(today() + 'T00:00:00');
    const venc = new Date(fechaVencimiento + 'T00:00:00');
    return Math.round((venc - hoy) / (1000 * 60 * 60 * 24));
};

const estadoVencimiento = (dias) => {
    if (dias < 0) return { tag: 'tag-red', texto: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}` };
    if (dias <= 30) return { tag: 'tag-red', texto: `Vence en ${dias} día${dias === 1 ? '' : 's'}` };
    if (dias <= DIAS_ALERTA_VENCIMIENTO) return { tag: 'tag-amber', texto: `Vence en ${dias} días` };
    return { tag: 'tag-green', texto: 'Vigente' };
};

const tagFormaPago = (v) => {
    if (v.formaPago !== 'Crédito') return { tag: 'tag-green', texto: 'Contado' };
    if (ventaEstaPagada(v)) return { tag: 'tag-green', texto: 'Crédito - Pagado' };
    const est = estadoVencimiento(diasParaVencer(v.fechaPagoAcordada));
    return { tag: est.tag, texto: `Debe ${formatPEN(ventaSaldoPendiente(v))}` };
};

const estadoStock = (p) => {
    if (p.stock === 0) return { tag: 'tag-red', texto: 'Agotado', barColor: 'var(--accent-red)' };
    if (p.stock <= p.stockMin) return { tag: 'tag-amber', texto: 'Stock bajo', barColor: 'var(--accent-amber)' };
    return { tag: 'tag-green', texto: 'Disponible', barColor: 'var(--green-primary)' };
};

const tagPorCategoria = (cat) => {
    const map = {
        'Herbicida': 'tag-green',
        'Insecticida': 'tag-amber',
        'Fungicida': 'tag-dark',
        'Fertilizante': 'tag-green'
    };
    return map[cat] || 'tag-green';
};

// ===================== TOAST =====================
function toast(msg, type = 'success') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    setTimeout(() => el.classList.remove('show'), 3000);
}

// ===================== LOGIN =====================
$('#formLogin').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = $('#loginUser').value.trim();
    const p = $('#loginPass').value;
    const user = usuarios.find(usr => usr.usuario === u && usr.password === p);

    const errEl = $('#loginError');
    if (!user) {
        errEl.textContent = '✗ Usuario o contraseña incorrectos';
        errEl.classList.add('show');
        return;
    }
    errEl.classList.remove('show');
    currentUser = user;
    enterApp();
});

function enterApp() {
    $('#loginScreen').classList.remove('active');
    $('#appContainer').style.display = 'flex';

    // Restaurar si el usuario había dejado el menú lateral oculto; si nunca
    // lo tocó, en pantallas chicas arranca oculto para no tapar el contenido
    const preferenciaSidebar = localStorage.getItem('agrostock_sidebar_collapsed');
    const debeColapsar = preferenciaSidebar !== null ? preferenciaSidebar === '1' : window.innerWidth <= 768;
    if (debeColapsar) {
        $('#appContainer').classList.add('sidebar-collapsed');
    }

    // Actualizar info del usuario en sidebar
    $('#userAvatar').textContent = currentUser.iniciales;
    $('#userName').textContent = currentUser.nombre;
    $('#userRole').textContent = currentUser.rol;

    // Aplicar permisos por rol
    aplicarPermisos();

    // Cargar datos desde localStorage (si existen)
    const cargado = initStorage();

    // Renderizar todas las vistas
    renderAll();
    initCharts();

    if (cargado) {
        toast(`👋 Bienvenido de vuelta, ${currentUser.nombre}. Datos cargados.`, 'success');
    } else {
        toast(`👋 Bienvenido, ${currentUser.nombre}`, 'success');
    }
}

async function logout() {
    const ok = await askConfirm({
        title: '¿Cerrar sesión?',
        message: 'Deberás volver a ingresar tu usuario y contraseña para continuar.',
        confirmText: 'Sí, cerrar sesión'
    });
    if (!ok) return;

    currentUser = null;
    $('#loginScreen').classList.add('active');
    $('#appContainer').style.display = 'none';
    $('#formLogin').reset();
    // Volver al dashboard para la próxima sesión
    switchView('dashboard');
}

function aplicarPermisos() {
    const rol = currentUser.rol;
    // Mostrar/ocultar items del menú según roles permitidos
    $$('.nav-item').forEach(item => {
        const roles = (item.dataset.roles || '').split(',');
        if (roles.includes(rol)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
    // Botones que solo ve admin
    $$('[data-roles="Administrador"]').forEach(btn => {
        if (btn.classList.contains('nav-item')) return;
        btn.style.display = rol === 'Administrador' ? '' : 'none';
    });
}

// ===================== MENÚ LATERAL (mostrar / ocultar) =====================
function toggleSidebar() {
    const collapsed = $('#appContainer').classList.toggle('sidebar-collapsed');
    localStorage.setItem('agrostock_sidebar_collapsed', collapsed ? '1' : '0');
}

// ===================== NAVEGACIÓN =====================
const pageTitles = {
    dashboard: { title: 'Dashboard', subtitle: 'Resumen general de tu negocio agrícola' },
    inventario: { title: 'Inventario', subtitle: 'Controla el stock de tus productos' },
    ingresos: { title: 'Ingresos', subtitle: 'Registro de compras y reposiciones' },
    ventas: { title: 'Ventas', subtitle: 'Registra y da seguimiento a tu actividad comercial' },
    flujocaja: { title: 'Flujo de Caja', subtitle: 'Todo lo que entra y sale de tu negocio' },
    productos: { title: 'Productos', subtitle: 'Catálogo completo de agroquímicos' },
    proveedores: { title: 'Proveedores', subtitle: 'Aliados que abastecen tu negocio' },
    facturas: { title: 'Facturas', subtitle: 'Cuentas por pagar a tus proveedores' },
    clientes: { title: 'Clientes', subtitle: 'Tu cartera de compradores' },
    mantenedores: { title: 'Categorías y Unidades', subtitle: 'Personaliza los tipos y unidades de tu catálogo' },
    usuarios: { title: 'Usuarios', subtitle: 'Administra quién tiene acceso al sistema' },
    configuracion: { title: 'Configuración', subtitle: 'Respaldos y administración del sistema' }
};

function switchView(view) {
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#view-${view}`)?.classList.add('active');

    $$('.nav-item').forEach(n => n.classList.remove('active'));
    $(`.nav-item[data-view="${view}"]`)?.classList.add('active');

    if (pageTitles[view]) {
        $('#pageTitle').textContent = pageTitles[view].title;
        $('#pageSubtitle').textContent = pageTitles[view].subtitle;
    }
    renderView(view);
}

$$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(item.dataset.view);
    });
});

// ===================== MODALES =====================
function openModal(id) {
    $(`#${id}`).classList.add('active');

    // Poblar selects al abrir
    if (id === 'modalProducto') {
        $('#modalProductoTitle').textContent = 'Nuevo Producto';
        $('#prodId').value = '';
        $('#formProducto').reset();
        populateSelectProveedores('#prodProveedor');
        populateSelectCategoriasProducto();
        populateSelectUnidadesProducto();
    }
    if (id === 'modalIngreso') {
        $('#modalIngresoTitle').textContent = 'Registrar Ingreso';
        $('#ingId').value = '';
        populateSelectProductos('#ingProducto');
        populateSelectProveedores('#ingProveedor');
        populateDatalistFacturas();
    }
    if (id === 'modalVenta') {
        ventaCart = [];
        populateSelectProductos('#venProductoSel');
        populateSelectClientes('#venCliente');
        $('#venCantidadSel').value = 1;
        $('#venFormaPago').value = 'Contado';
        $('#venFechaPagoAcordada').value = '';
        toggleCampoCredito();
        renderVentaCart();
    }
    if (id === 'modalCliente') {
        $('#modalClienteTitle').textContent = 'Nuevo Cliente';
        $('#cliId').value = '';
        $('#formCliente').reset();
    }
    if (id === 'modalProveedor') {
        $('#modalProveedorTitle').textContent = 'Nuevo Proveedor';
        $('#provId').value = '';
        $('#formProveedor').reset();
    }
    if (id === 'modalCategoria') {
        $('#modalCategoriaTitle').textContent = 'Nueva Categoría';
        $('#catId').value = '';
        $('#formCategoria').reset();
    }
    if (id === 'modalUnidad') {
        $('#modalUnidadTitle').textContent = 'Nueva Unidad';
        $('#uniId').value = '';
        $('#formUnidad').reset();
    }
    if (id === 'modalUsuario') {
        $('#modalUsuarioTitle').textContent = 'Nuevo Usuario';
        $('#usrId').value = '';
        $('#formUsuario').reset();
    }
    if (id === 'modalFactura') {
        $('#facNumero').value = '';
        $('#facFecha').value = '';
        $('#facMonto').value = '';
        $('#facNumLetras').value = 1;
        $('#facLetrasBody').innerHTML = '';
        $('#facLetrasWrapper').style.display = 'none';
        populateSelectProveedores('#facProveedor');
        populateDatalistNumerosFacturaPendientes();
    }
    if (id === 'modalStockBajo') {
        renderStockBajoModal();
    }
    if (id === 'modalPorVencer') {
        renderPorVencerModal();
    }
    if (id === 'modalLetrasPorVencer') {
        renderLetrasPorVencerModal();
    }
    if (id === 'modalCobranzasPorVencer') {
        renderCobranzasPorVencerModal();
    }
}

function closeModal(id) {
    $(`#${id}`).classList.remove('active');
    const form = $(`#${id} form`);
    if (form) form.reset();
}

// Cerrar modal al hacer click fuera
$$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

// ===================== MODAL DE CONFIRMACIÓN =====================
let _confirmResolve = null;

function askConfirm({ title, message, confirmText = 'Sí, eliminar' } = {}) {
    $('#confirmTitle').textContent = title;
    $('#confirmMessage').textContent = message;
    $('#confirmBtnYes').textContent = confirmText;
    $('#modalConfirm').classList.add('active');
    return new Promise((resolve) => { _confirmResolve = resolve; });
}

function resolveConfirm(value) {
    $('#modalConfirm').classList.remove('active');
    const resolve = _confirmResolve;
    _confirmResolve = null;
    if (resolve) resolve(value);
}

// Click fuera del modal de confirmación = Cancelar (no dejar la promesa colgada)
$('#modalConfirm').addEventListener('click', (e) => {
    if (e.target.id === 'modalConfirm') resolveConfirm(false);
});

// ===================== POBLAR SELECTS =====================
function populateDatalistFacturas() {
    $('#facturasDatalist').innerHTML = facturas.map(f => {
        const prov = findProveedor(f.proveedorId);
        return `<option value="${f.numeroFactura}">${f.numeroFactura} — ${prov ? prov.nombre : '—'}</option>`;
    }).join('');
}

// Números de factura que ya se escribieron en Ingresos pero que todavía no
// tienen su plan de letras armado en el menú Facturas
function populateDatalistNumerosFacturaPendientes() {
    const yaFacturados = new Set(facturas.map(f => f.numeroFactura));
    const pendientes = [...new Set(
        ingresos.filter(i => i.numeroFactura && !yaFacturados.has(i.numeroFactura)).map(i => i.numeroFactura)
    )];

    $('#facNumeroDatalist').innerHTML = pendientes.map(num => {
        const ing = ingresos.find(i => i.numeroFactura === num);
        const prov = findProveedor(ing.proveedorId);
        return `<option value="${num}">${num} — ${prov ? prov.nombre : '—'} (pendiente de armar letras)</option>`;
    }).join('');
}

// Si el número escrito coincide con una factura pendiente de Ingresos,
// autocompleta proveedor, fecha y un monto sugerido (suma de esos ingresos)
$('#facNumero').addEventListener('input', (e) => {
    const ingsDeEstaFactura = ingresos.filter(i => i.numeroFactura === e.target.value);
    if (!ingsDeEstaFactura.length) return;

    const primerIngreso = [...ingsDeEstaFactura].sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    $('#facProveedor').value = primerIngreso.proveedorId;
    $('#facFecha').value = primerIngreso.fecha;
    const montoSugerido = ingsDeEstaFactura.reduce((s, i) => s + i.cantidad * i.costoUnit, 0);
    $('#facMonto').value = montoSugerido.toFixed(2);
});

function populateSelectProveedores(selector) {
    $(selector).innerHTML = proveedores.map(p =>
        `<option value="${p.id}">${p.nombre}</option>`
    ).join('');
}

function populateSelectProductos(selector) {
    $(selector).innerHTML = productos.map(p =>
        `<option value="${p.id}">${p.nombre} — Stock: ${p.stock} ${p.unidad}</option>`
    ).join('');
}

function populateSelectClientes(selector) {
    $(selector).innerHTML = clientes.map(c =>
        `<option value="${c.id}">${c.nombre}</option>`
    ).join('');
}

function populateSelectCategoriasProducto() {
    $('#prodCategoria').innerHTML = categorias.map(c =>
        `<option value="${c.nombre}">${c.nombre}</option>`
    ).join('');
}

function populateSelectUnidadesProducto() {
    $('#prodUnidad').innerHTML = unidades.map(u =>
        `<option value="${u.codigo}">${u.nombre} (${u.codigo})</option>`
    ).join('');
}

function populateFilterCategorias() {
    const sel = $('#filterCategoria');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">Todas las categorías</option>' +
        categorias.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    if (categorias.some(c => c.nombre === prev)) sel.value = prev;
}

// ===================== GRÁFICOS (Chart.js) =====================
let chartVentasInst = null;
let chartCategoriasInst = null;
let chartTopInst = null;
let chartFlujoCajaInst = null;

function initCharts() {
    // Configuración global
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#4a4a4a';

    renderChartVentas();
    renderChartCategorias();
    renderChartTopProductos();
    renderChartFlujoCaja();
}

function renderChartVentas() {
    const ctx = document.getElementById('chartVentas');
    if (!ctx) return;

    // Calcular ventas por mes (últimos 6 meses)
    const meses = [];
    const totales = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const yyyymm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const nombreMes = d.toLocaleDateString('es-PE', { month: 'short' });
        meses.push(nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1));

        const total = ventas
            .filter(v => v.fecha.startsWith(yyyymm))
            .reduce((s, v) => s + ventaTotal(v), 0);
        totales.push(total);
    }

    if (chartVentasInst) chartVentasInst.destroy();
    chartVentasInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Ventas (S/)',
                data: totales,
                borderColor: '#3d6b26',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
                    gradient.addColorStop(0, 'rgba(61, 107, 38, 0.35)');
                    gradient.addColorStop(1, 'rgba(61, 107, 38, 0)');
                    return gradient;
                },
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#3d6b26',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#17190f',
                    padding: 12,
                    titleFont: { size: 12, weight: '500' },
                    bodyFont: { family: "'Fraunces', serif", size: 14, weight: '600' },
                    callbacks: {
                        label: (ctx) => formatPEN(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                },
                y: {
                    grid: { color: '#f5f5f5' },
                    ticks: {
                        callback: (v) => 'S/ ' + (v >= 1000 ? (v / 1000) + 'k' : v),
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

function renderChartCategorias() {
    const ctx = document.getElementById('chartCategorias');
    if (!ctx) return;

    // Stock total por categoría
    const cats = {};
    productos.forEach(p => {
        cats[p.categoria] = (cats[p.categoria] || 0) + p.stock;
    });

    const paletaCategorias = ['#1e3a17', '#3d6b26', '#7ea855', '#c98a3b', '#c1503d', '#8a6d3f', '#5c8a3a', '#9c6423'];
    const labels = Object.keys(cats);

    if (chartCategoriasInst) chartCategoriasInst.destroy();
    chartCategoriasInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: Object.values(cats),
                backgroundColor: labels.map((_, i) => paletaCategorias[i % paletaCategorias.length]),
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 14,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: '#17190f',
                    padding: 12,
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.raw} unidades`
                    }
                }
            }
        }
    });
}

function renderChartTopProductos() {
    const ctx = document.getElementById('chartTopProductos');
    if (!ctx) return;

    // Top 5 productos más vendidos (por monto)
    const ventasPorProducto = {};
    ventas.forEach(v => {
        v.items.forEach(it => {
            ventasPorProducto[it.productoId] = (ventasPorProducto[it.productoId] || 0) + it.cantidad * it.precioUnit;
        });
    });

    const top = Object.entries(ventasPorProducto)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const labels = top.map(([id]) => {
        const p = findProducto(parseInt(id));
        return p ? p.nombre.split(' ').slice(0, 2).join(' ') : '?';
    });
    const data = top.map(([, m]) => m);

    if (chartTopInst) chartTopInst.destroy();
    chartTopInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: '#3d6b26',
                hoverBackgroundColor: '#1e3a17',
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#17190f',
                    padding: 12,
                    callbacks: {
                        label: (ctx) => formatPEN(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#f5f5f5' },
                    ticks: {
                        callback: (v) => 'S/ ' + (v >= 1000 ? (v / 1000) + 'k' : v),
                        font: { size: 10 }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                }
            }
        }
    });
}

// ===================== RENDER: DASHBOARD =====================
function renderDashboard() {
    // Stats
    const totalProductos = productos.reduce((sum, p) => sum + p.stock, 0);
    const mesActual = today().substring(0, 7);
    const ingresosMes = ventas
        .filter(v => v.fecha.startsWith(mesActual))
        .reduce((sum, v) => sum + ventaTotal(v), 0);
    const ventasTotal = ventas.length;
    const stockBajo = productos.filter(p => p.stock <= p.stockMin).length;
    const porVencer = ingresos.filter(i =>
        i.cantidadDisponible > 0 && i.fechaVencimiento && diasParaVencer(i.fechaVencimiento) <= DIAS_ALERTA_VENCIMIENTO
    ).length;
    const letrasPorVencer = facturas.reduce((sum, f) =>
        sum + f.letras.filter(l => !l.pagada && diasParaVencer(l.fechaVencimiento) <= DIAS_ALERTA_VENCIMIENTO).length, 0);
    const cobranzasPorVencer = ventas.filter(v =>
        v.formaPago === 'Crédito' && !ventaEstaPagada(v) && diasParaVencer(v.fechaPagoAcordada) <= DIAS_ALERTA_VENCIMIENTO
    ).length;

    $('#statProductos').textContent = totalProductos.toLocaleString('es-PE');
    $('#statIngresos').textContent = formatPEN(ingresosMes);
    $('#statVentas').textContent = ventasTotal;
    $('#statBajoStock').textContent = stockBajo;
    $('#statPorVencer').textContent = porVencer;
    $('#statLetrasPorVencer').textContent = letrasPorVencer;
    $('#statCobranzasPorVencer').textContent = cobranzasPorVencer;

    // Movimientos recientes
    const movs = [
        ...ingresos.map(i => ({ ...i, tipo: 'ingreso', monto: i.cantidad * i.costoUnit })),
        ...ventas.map(v => ({ ...v, tipo: 'venta', monto: ventaTotal(v) }))
    ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);

    $('#movementsList').innerHTML = movs.map(m => {
        const isIngreso = m.tipo === 'ingreso';
        let titulo, entidad;
        if (isIngreso) {
            const prod = findProducto(m.productoId);
            titulo = prod ? prod.nombre : '(producto eliminado)';
            entidad = findProveedor(m.proveedorId)?.nombre || '—';
        } else {
            const primerProd = findProducto(m.items[0].productoId);
            titulo = m.items.length === 1
                ? (primerProd ? primerProd.nombre : '(producto eliminado)')
                : `${m.items.length} productos`;
            entidad = findCliente(m.clienteId)?.nombre || '—';
        }
        return `
            <div class="movement-row">
                <div class="movement-icon ${isIngreso ? 'movement-icon--in' : 'movement-icon--out'}">
                    ${isIngreso ? '↓' : '↑'}
                </div>
                <div class="movement-info">
                    <span class="movement-title">${titulo}</span>
                    <span class="movement-meta">${isIngreso ? 'Ingreso de' : 'Venta a'} ${entidad}</span>
                </div>
                <span class="movement-amount" style="color: ${isIngreso ? 'var(--accent-amber)' : 'var(--green-deep)'}">
                    ${isIngreso ? '−' : '+'} ${formatPEN(m.monto)}
                </span>
                <span class="movement-date">${formatDate(m.fecha)}</span>
            </div>
        `;
    }).join('');

    // Alertas
    const lowStock = productos.filter(p => p.stock <= p.stockMin);
    $('#alertsGrid').innerHTML = lowStock.length
        ? lowStock.map(p => `
            <div class="alert-card">
                <div class="alert-card-name">${p.nombre}</div>
                <div class="alert-card-meta">Stock actual: <span class="alert-stock">${p.stock} ${p.unidad}</span> · Mínimo: ${p.stockMin}</div>
            </div>
        `).join('')
        : '<div class="empty-state">✨ Todos los productos tienen stock saludable</div>';
}

// ===================== RENDER: INVENTARIO =====================
function renderInventario() {
    const filtro = $('#filterCategoria')?.value || '';
    const search = ($('#invSearch')?.value || '').toLowerCase();

    let lista = productos;
    if (filtro) lista = lista.filter(p => p.categoria === filtro);
    if (search) lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(search) ||
        p.codigo.toLowerCase().includes(search)
    );

    if (!lista.length) {
        $('#inventarioTable').innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron productos</td></tr>';
        return;
    }

    const isAdmin = currentUser?.rol === 'Administrador';

    $('#inventarioTable').innerHTML = lista.map(p => {
        const prov = findProveedor(p.proveedorId);
        const { tag: estadoTag, texto: estadoTexto } = estadoStock(p);

        return `
            <tr onclick="handleInventarioRowClick(event, ${p.id})">
                <td>
                    <div class="product-cell">
                        <div class="product-thumb">${initials(p.nombre)}</div>
                        <div>
                            <div class="product-name">${p.nombre}</div>
                            <div class="product-cat">${p.codigo}${p.aplicaIgv === false ? '<span class="tag-igv-exento" title="Exonerado de IGV">Sin IGV</span>' : ''}</div>
                        </div>
                    </div>
                </td>
                <td><span class="tag ${tagPorCategoria(p.categoria)}">${p.categoria}</span></td>
                <td><strong>${p.stock}</strong> ${p.unidad}</td>
                <td>${formatPEN(p.precio)}</td>
                <td>${prov ? prov.nombre : '—'}</td>
                <td><span class="tag ${estadoTag}">${estadoTexto}</span></td>
                <td>
                    <div class="actions-cell">
                        ${isAdmin ? `<button class="btn-small" onclick="editarProducto(${p.id})">Editar</button>` : ''}
                        ${isAdmin ? `<button class="btn-small-outline" onclick="openModalIngresoFromProduct(${p.id})">+ Stock</button>` : ''}
                        ${isAdmin ? `<button class="btn-danger" onclick="eliminarProducto(${p.id})">Eliminar</button>` : ''}
                        ${!isAdmin ? '<span class="tag tag-green">Solo lectura</span>' : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ===================== MODAL: STOCK BAJO =====================
function renderStockBajoModal() {
    const lista = productos
        .filter(p => p.stock <= p.stockMin)
        .sort((a, b) => a.stock - b.stock);

    if (!lista.length) {
        $('#stockBajoList').innerHTML = '<div class="empty-state">✨ Todos los productos tienen stock saludable</div>';
        return;
    }

    $('#stockBajoList').innerHTML = lista.map(p => {
        const prov = findProveedor(p.proveedorId);
        const { tag, texto, barColor } = estadoStock(p);
        const pct = p.stockMin > 0 ? Math.min(100, Math.round((p.stock / p.stockMin) * 100)) : 0;

        return `
            <div class="stock-bajo-item">
                <div class="stock-bajo-item-top">
                    <div>
                        <div class="stock-bajo-item-name">${p.nombre}</div>
                        <div class="stock-bajo-item-meta">${p.codigo} · ${p.categoria} · Proveedor: ${prov ? prov.nombre : '—'}</div>
                    </div>
                    <span class="tag ${tag}">${texto}</span>
                </div>
                <div class="stock-bajo-bar-wrap">
                    <div class="stock-bajo-bar" style="width:${pct}%; background:${barColor}"></div>
                </div>
                <div class="stock-bajo-item-bottom">
                    <span>Stock actual: <strong>${p.stock} ${p.unidad}</strong></span>
                    <span>Mínimo requerido: <strong>${p.stockMin} ${p.unidad}</strong></span>
                    ${currentUser?.rol === 'Administrador' ? `<button class="btn-small" onclick="closeModal('modalStockBajo'); openModalIngresoFromProduct(${p.id})">+ Stock</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===================== MODAL: LOTES POR VENCER =====================
function renderPorVencerModal() {
    const lista = ingresos
        .filter(i => i.cantidadDisponible > 0 && i.fechaVencimiento && diasParaVencer(i.fechaVencimiento) <= DIAS_ALERTA_VENCIMIENTO)
        .map(i => ({ ingreso: i, dias: diasParaVencer(i.fechaVencimiento) }))
        .sort((a, b) => a.dias - b.dias);

    if (!lista.length) {
        $('#porVencerList').innerHTML = '<div class="empty-state">✨ Ningún lote vence en los próximos 90 días</div>';
        return;
    }

    $('#porVencerList').innerHTML = lista.map(({ ingreso: i, dias }) => {
        const prod = findProducto(i.productoId);
        const prov = findProveedor(i.proveedorId);
        const { tag, texto } = estadoVencimiento(dias);
        const pct = dias < 0 ? 100 : Math.max(0, 100 - Math.round((dias / DIAS_ALERTA_VENCIMIENTO) * 100));
        const barColor = dias < 0 || dias <= 30 ? 'var(--accent-red)' : 'var(--accent-amber)';

        return `
            <div class="stock-bajo-item">
                <div class="stock-bajo-item-top">
                    <div>
                        <div class="stock-bajo-item-name">${prod ? prod.nombre : '(producto eliminado)'}</div>
                        <div class="stock-bajo-item-meta">Lote: ${i.numeroLote || '—'} · Vence: ${formatDate(i.fechaVencimiento)} · Proveedor: ${prov ? prov.nombre : '—'}</div>
                    </div>
                    <span class="tag ${tag}">${texto}</span>
                </div>
                <div class="stock-bajo-bar-wrap">
                    <div class="stock-bajo-bar" style="width:${pct}%; background:${barColor}"></div>
                </div>
                <div class="stock-bajo-item-bottom">
                    <span>Cantidad disponible de este lote: <strong>${i.cantidadDisponible} ${prod ? prod.unidad : ''}</strong></span>
                </div>
            </div>
        `;
    }).join('');
}

// ===================== RENDER: INGRESOS =====================
function renderIngresos() {
    const search = ($('#ingSearch')?.value || '').toLowerCase().trim();

    let lista = [...ingresos].sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (search) {
        lista = lista.filter(i => {
            const prod = findProducto(i.productoId);
            return (i.numeroFactura || '').toLowerCase().includes(search) ||
                (i.numeroLote || '').toLowerCase().includes(search) ||
                (prod ? prod.nombre.toLowerCase().includes(search) : false);
        });
    }

    if (!lista.length) {
        const mensaje = search ? 'No se encontraron ingresos que coincidan con la búsqueda' : 'No hay ingresos registrados';
        $('#ingresosTable').innerHTML = `<tr><td colspan="9" class="empty-state">${mensaje}</td></tr>`;
        return;
    }
    const isAdmin = currentUser?.rol === 'Administrador';

    $('#ingresosTable').innerHTML = lista.map(i => {
        const prod = findProducto(i.productoId);
        const prov = findProveedor(i.proveedorId);
        const venceHtml = i.fechaVencimiento
            ? (() => {
                const { tag, texto } = estadoVencimiento(diasParaVencer(i.fechaVencimiento));
                return `<span class="tag ${tag}">${formatDate(i.fechaVencimiento)}</span><div class="stock-bajo-item-meta">${texto}</div>`;
            })()
            : '—';
        return `
            <tr onclick="handleIngresoRowClick(event, ${i.id})">
                <td>${formatDate(i.fecha)}</td>
                <td><strong>${prod ? prod.nombre : '(producto eliminado)'}</strong></td>
                <td>${i.numeroLote || '—'}${i.numeroFactura ? `<div class="stock-bajo-item-meta">Factura: ${i.numeroFactura}</div>` : ''}</td>
                <td>${venceHtml}</td>
                <td>${i.cantidad} ${prod ? prod.unidad : ''}</td>
                <td>${formatPEN(i.costoUnit)}</td>
                <td><strong>${formatPEN(i.cantidad * i.costoUnit)}</strong></td>
                <td>${prov ? prov.nombre : '(proveedor eliminado)'}</td>
                <td>
                    <div class="actions-cell">
                        ${isAdmin ? `<button class="btn-small" onclick="editarIngreso(${i.id})">Editar</button>` : ''}
                        ${isAdmin ? `<button class="btn-danger" onclick="eliminarIngreso(${i.id})">Eliminar</button>` : ''}
                        ${!isAdmin ? '<span class="tag tag-green">Solo lectura</span>' : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ===================== RENDER: VENTAS =====================
function renderVentas() {
    const total = ventas.reduce((s, v) => s + ventaTotal(v), 0);
    const promedio = ventas.length ? total / ventas.length : 0;

    const conteo = {};
    ventas.forEach(v => {
        v.items.forEach(it => {
            conteo[it.productoId] = (conteo[it.productoId] || 0) + it.cantidad;
        });
    });
    const topId = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a])[0];
    const topProd = topId ? findProducto(parseInt(topId)) : null;

    $('#ventasTotal').textContent = formatPEN(total);
    $('#ventasPromedio').textContent = formatPEN(promedio);
    $('#ventasTop').textContent = topProd ? topProd.nombre : '—';

    const lista = [...ventas].sort((a, b) => b.fecha.localeCompare(a.fecha));
    $('#ventasTable').innerHTML = lista.map(v => {
        const cli = findCliente(v.clienteId);
        const productosHtml = v.items.map(it => {
            const prod = findProducto(it.productoId);
            return `<div>${it.cantidad} ${prod ? prod.unidad : ''} · ${prod ? prod.nombre : '(producto eliminado)'}</div>`;
        }).join('');
        const { tag, texto } = tagFormaPago(v);
        return `
            <tr>
                <td><span class="boleta-num">${v.numBoleta}</span></td>
                <td>${formatDate(v.fecha)}</td>
                <td><strong>${cli ? cli.nombre : '(cliente eliminado)'}</strong></td>
                <td>${productosHtml}</td>
                <td>${v.items.length > 1 ? `${v.items.length} productos` : ventaCantidadTotal(v)}</td>
                <td><strong>${formatPEN(ventaTotal(v))}</strong></td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-small" onclick="verBoleta(${v.id})">Ver Boleta</button>
                        ${v.formaPago === 'Crédito' ? `<button class="btn-small-outline" onclick="abrirGestionPago(${v.id})">Gestionar pago</button>` : ''}
                        <span class="tag ${tag}">${texto}</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ===================== FLUJO DE CAJA =====================
// Arma la lista de movimientos de caja a partir de datos que ya existen en
// el sistema (no se registra nada aparte):
//  - Entradas: ventas al contado + abonos de ventas a crédito
//  - Salidas: compras (Ingresos) que NO están cubiertas por un plan de letras,
//    y las letras de Facturas que ya se marcaron como pagadas
function calcularMovimientosCaja(desde, hasta) {
    const movimientos = [];

    ventas.forEach(v => {
        if (v.formaPago !== 'Crédito') {
            movimientos.push({
                fecha: v.fecha,
                tipo: 'Entrada',
                concepto: `Venta ${v.numBoleta} · ${findCliente(v.clienteId)?.nombre || '(cliente eliminado)'}`,
                monto: ventaTotal(v)
            });
        } else {
            (v.abonos || []).forEach(a => {
                movimientos.push({
                    fecha: a.fecha,
                    tipo: 'Entrada',
                    concepto: `Abono venta ${v.numBoleta} · ${findCliente(v.clienteId)?.nombre || '(cliente eliminado)'}`,
                    monto: a.monto
                });
            });
        }
    });

    const numerosConFactura = new Set(facturas.map(f => f.numeroFactura));
    ingresos.forEach(i => {
        if (!i.numeroFactura || !numerosConFactura.has(i.numeroFactura)) {
            const prod = findProducto(i.productoId);
            movimientos.push({
                fecha: i.fecha,
                tipo: 'Salida',
                concepto: `Compra · ${prod ? prod.nombre : '(producto eliminado)'} (Lote ${i.numeroLote || '—'})`,
                monto: i.cantidad * i.costoUnit
            });
        }
    });

    facturas.forEach(f => {
        const prov = findProveedor(f.proveedorId);
        f.letras.forEach(l => {
            if (l.pagada) {
                movimientos.push({
                    fecha: l.fechaPago || l.fechaVencimiento,
                    tipo: 'Salida',
                    concepto: `Letra ${l.numero}/${f.letras.length} · Factura ${f.numeroFactura} · ${prov ? prov.nombre : '—'}`,
                    monto: l.monto
                });
            }
        });
    });

    movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));

    // El saldo acumulado se calcula sobre TODO el historial, no solo el
    // período filtrado, para que sea un saldo real y no reinicie en 0
    let saldo = 0;
    const conSaldo = movimientos.map(m => {
        saldo += m.tipo === 'Entrada' ? m.monto : -m.monto;
        return { ...m, saldoAcumulado: saldo };
    });

    return conSaldo.filter(m => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta));
}

function renderFlujoCaja() {
    if (!$('#cajaDesde').value) {
        const hoy = new Date(today() + 'T00:00:00');
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        $('#cajaDesde').value = primerDiaMes.toISOString().split('T')[0];
    }
    if (!$('#cajaHasta').value) {
        $('#cajaHasta').value = today();
    }

    const desde = $('#cajaDesde').value;
    const hasta = $('#cajaHasta').value;
    const movimientos = calcularMovimientosCaja(desde, hasta);

    const entradas = movimientos.filter(m => m.tipo === 'Entrada').reduce((s, m) => s + m.monto, 0);
    const salidas = movimientos.filter(m => m.tipo === 'Salida').reduce((s, m) => s + m.monto, 0);

    $('#cajaEntradas').textContent = formatPEN(entradas);
    $('#cajaSalidas').textContent = formatPEN(salidas);
    $('#cajaSaldo').textContent = formatPEN(entradas - salidas);

    if (!movimientos.length) {
        $('#flujoCajaTable').innerHTML = '<tr><td colspan="5" class="empty-state">No hay movimientos de caja en este período</td></tr>';
        return;
    }

    $('#flujoCajaTable').innerHTML = [...movimientos].reverse().map(m => `
        <tr>
            <td>${formatDate(m.fecha)}</td>
            <td><span class="tag ${m.tipo === 'Entrada' ? 'tag-green' : 'tag-red'}">${m.tipo}</span></td>
            <td>${m.concepto}</td>
            <td><strong style="color: ${m.tipo === 'Entrada' ? 'var(--green-deep)' : 'var(--accent-red)'}">${m.tipo === 'Entrada' ? '+' : '−'} ${formatPEN(m.monto)}</strong></td>
            <td><strong>${formatPEN(m.saldoAcumulado)}</strong></td>
        </tr>
    `).join('');
}

function renderChartFlujoCaja() {
    const ctx = document.getElementById('chartFlujoCaja');
    if (!ctx) return;

    const todosMovimientos = calcularMovimientosCaja(null, null);
    const hoy = new Date(today() + 'T00:00:00');
    const meses = [];
    for (let i = 5; i >= 0; i--) {
        meses.push(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1).toISOString().substring(0, 7));
    }
    const nombresMeses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const labels = meses.map(m => nombresMeses[parseInt(m.substring(5, 7), 10) - 1]);
    const entradasPorMes = meses.map(m => todosMovimientos.filter(x => x.tipo === 'Entrada' && x.fecha.startsWith(m)).reduce((s, x) => s + x.monto, 0));
    const salidasPorMes = meses.map(m => todosMovimientos.filter(x => x.tipo === 'Salida' && x.fecha.startsWith(m)).reduce((s, x) => s + x.monto, 0));

    if (chartFlujoCajaInst) chartFlujoCajaInst.destroy();
    chartFlujoCajaInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Entradas', data: entradasPorMes, backgroundColor: '#3d6b26', borderRadius: 6 },
                { label: 'Salidas', data: salidasPorMes, backgroundColor: '#c1503d', borderRadius: 6 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11 } } },
                tooltip: {
                    backgroundColor: '#17190f',
                    padding: 12,
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatPEN(ctx.raw)}` }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    grid: { color: '#f5f5f5' },
                    ticks: { callback: (v) => 'S/ ' + (v >= 1000 ? (v / 1000) + 'k' : v), font: { size: 11 } }
                }
            }
        }
    });
}

// ===================== RENDER: PRODUCTOS =====================
function renderProductos() {
    $('#productosGrid').innerHTML = productos.map(p => `
        <div class="product-card">
            <div class="product-card-img">${initials(p.nombre)}</div>
            <span class="product-card-tag">${p.categoria} · ${p.codigo}</span>
            ${p.aplicaIgv === false ? '<span class="tag-igv-exento" title="Exonerado de IGV">Sin IGV</span>' : ''}
            <div class="product-card-name">${p.nombre}</div>
            <div class="product-card-footer">
                <span class="product-card-price">${formatPEN(p.precio)}</span>
                <span class="product-card-stock">${p.stock} ${p.unidad} en stock</span>
            </div>
        </div>
    `).join('');
}

// ===================== RENDER: PROVEEDORES =====================
function renderProveedores() {
    const isAdmin = currentUser?.rol === 'Administrador';
    $('#proveedoresGrid').innerHTML = proveedores.map(p => `
        <div class="entity-card">
            <div class="entity-avatar">${initials(p.nombre)}</div>
            <div class="entity-name">${p.nombre}</div>
            <div class="entity-info">👤 ${p.contacto}</div>
            <div class="entity-info">📞 ${p.telefono}</div>
            <div class="entity-info">✉ ${p.email}</div>
            <div class="entity-info">📍 ${p.direccion}</div>
            ${isAdmin ? `
                <div class="entity-actions">
                    <button class="btn-small" onclick="editarProveedor(${p.id})">Editar</button>
                    <button class="btn-danger" onclick="eliminarProveedor(${p.id})">Eliminar</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// ===================== RENDER: FACTURAS =====================
const facturaMontoPagado = (f) => f.letras.filter(l => l.pagada).reduce((s, l) => s + l.monto, 0);
const facturaMontoPendiente = (f) => f.letras.filter(l => !l.pagada).reduce((s, l) => s + l.monto, 0);
const facturaProximaLetra = (f) => f.letras
    .filter(l => !l.pagada)
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))[0] || null;

function renderFacturas() {
    if (!facturas.length) {
        $('#facturasGrid').innerHTML = '<div class="empty-state">Aún no ha registrado facturas</div>';
        return;
    }

    $('#facturasGrid').innerHTML = facturas.map(f => {
        const prov = findProveedor(f.proveedorId);
        const pagado = facturaMontoPagado(f);
        const pendiente = facturaMontoPendiente(f);
        const proxima = facturaProximaLetra(f);

        let tag = 'tag-green', texto = 'Pagada por completo';
        if (proxima) {
            const est = estadoVencimiento(diasParaVencer(proxima.fechaVencimiento));
            tag = est.tag;
            texto = `Próx. letra: ${est.texto}`;
        }

        return `
            <div class="entity-card">
                <div class="entity-name">${f.numeroFactura}</div>
                <div class="entity-info">🏢 ${prov ? prov.nombre : '—'}</div>
                <div class="entity-info">📅 ${formatDateLong(f.fecha)}</div>
                <div class="entity-info">💰 Total: ${formatPEN(f.montoTotal)}</div>
                <div class="entity-info">Pagado: ${formatPEN(pagado)} · Pendiente: ${formatPEN(pendiente)}</div>
                <span class="tag ${tag}" style="margin-bottom: 0.85rem; display: inline-block;">${texto}</span>
                <div class="entity-actions">
                    <button class="btn-small" onclick="verFactura(${f.id})">Ver letras</button>
                </div>
            </div>
        `;
    }).join('');
}

// Genera las filas de letras en el modal "Nueva Factura", repartiendo el
// monto total en partes iguales y proponiendo vencimientos mensuales
function generarLetras() {
    const numLetras = parseInt($('#facNumLetras').value) || 0;
    const montoTotal = parseFloat($('#facMonto').value) || 0;
    const fechaBase = $('#facFecha').value;

    if (numLetras < 1) {
        toast('✗ Ingrese al menos 1 letra', 'error');
        return;
    }
    if (!fechaBase) {
        toast('✗ Ingrese primero la fecha de la factura', 'error');
        return;
    }

    const montoPorLetra = montoTotal / numLetras;
    let filas = '';
    for (let i = 1; i <= numLetras; i++) {
        const fechaLetra = new Date(fechaBase + 'T00:00:00');
        fechaLetra.setMonth(fechaLetra.getMonth() + i);
        const fechaStr = fechaLetra.toISOString().split('T')[0];
        filas += `
            <tr>
                <td>#${i}</td>
                <td><input type="number" class="letra-input" step="0.01" min="0" value="${montoPorLetra.toFixed(2)}" data-letra-monto="${i}"></td>
                <td><input type="date" class="letra-input" value="${fechaStr}" data-letra-fecha="${i}"></td>
            </tr>
        `;
    }
    $('#facLetrasBody').innerHTML = filas;
    $('#facLetrasWrapper').style.display = '';
}

function guardarFactura() {
    const numeroFactura = $('#facNumero').value.trim();
    const proveedorId = parseInt($('#facProveedor').value);
    const fecha = $('#facFecha').value;
    const montoTotal = parseFloat($('#facMonto').value);

    if (!numeroFactura || !proveedorId || !fecha || !montoTotal) {
        toast('✗ Complete todos los datos de la factura', 'error');
        return;
    }

    const filas = $$('#facLetrasBody tr');
    if (!filas.length) {
        toast('✗ Genere las letras antes de guardar', 'error');
        return;
    }

    const letras = [];
    let sumaLetras = 0;
    filas.forEach((fila, idx) => {
        const monto = parseFloat(fila.querySelector('[data-letra-monto]').value) || 0;
        const fechaVencimiento = fila.querySelector('[data-letra-fecha]').value;
        letras.push({ numero: idx + 1, monto, fechaVencimiento, pagada: false });
        sumaLetras += monto;
    });

    if (Math.abs(sumaLetras - montoTotal) > 0.5) {
        toast(`✗ La suma de las letras (${formatPEN(sumaLetras)}) no coincide con el monto total (${formatPEN(montoTotal)})`, 'error');
        return;
    }

    facturas.push({ id: nextFacturaId++, numeroFactura, proveedorId, fecha, montoTotal, letras });

    toast(`✓ Factura ${numeroFactura} registrada`, 'success');
    closeModal('modalFactura');
    persistAndRender();
}

function verFactura(id) {
    const f = facturas.find(x => x.id === id);
    if (!f) return;
    const prov = findProveedor(f.proveedorId);
    const isAdmin = currentUser?.rol === 'Administrador';

    $('#modalDetalleFacturaTitle').textContent = `Factura ${f.numeroFactura}`;
    $('#detalleFacturaList').innerHTML = f.letras.map(l => {
        const dias = diasParaVencer(l.fechaVencimiento);
        const { tag, texto } = l.pagada ? { tag: 'tag-green', texto: 'Pagada' } : estadoVencimiento(dias);

        return `
            <div class="stock-bajo-item">
                <div class="stock-bajo-item-top">
                    <div>
                        <div class="stock-bajo-item-name">Letra ${l.numero} de ${f.letras.length}</div>
                        <div class="stock-bajo-item-meta">Vence: ${formatDate(l.fechaVencimiento)} · Proveedor: ${prov ? prov.nombre : '—'}</div>
                    </div>
                    <span class="tag ${tag}">${texto}</span>
                </div>
                <div class="stock-bajo-item-bottom">
                    <span>Monto: <strong>${formatPEN(l.monto)}</strong></span>
                    ${isAdmin ? `<button class="btn-small${l.pagada ? '-outline' : ''}" onclick="toggleLetraPagada(${f.id}, ${l.numero})">${l.pagada ? 'Marcar como pendiente' : 'Marcar como pagada'}</button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    $('#modalDetalleFactura').classList.add('active');
}

function toggleLetraPagada(facturaId, numeroLetra) {
    const f = facturas.find(x => x.id === facturaId);
    if (!f) return;
    const letra = f.letras.find(l => l.numero === numeroLetra);
    if (!letra) return;

    letra.pagada = !letra.pagada;
    letra.fechaPago = letra.pagada ? today() : null;
    toast(letra.pagada ? '✓ Letra marcada como pagada' : 'Letra marcada como pendiente', 'success');
    persistAndRender();
    verFactura(facturaId);
    if ($('#modalLetrasPorVencer').classList.contains('active')) renderLetrasPorVencerModal();
}

// ===================== MODAL: LETRAS POR VENCER =====================
function renderLetrasPorVencerModal() {
    const items = [];
    facturas.forEach(f => {
        f.letras.forEach(l => {
            const dias = diasParaVencer(l.fechaVencimiento);
            if (!l.pagada && dias <= DIAS_ALERTA_VENCIMIENTO) items.push({ factura: f, letra: l, dias });
        });
    });
    items.sort((a, b) => a.dias - b.dias);

    if (!items.length) {
        $('#letrasPorVencerList').innerHTML = '<div class="empty-state">✨ No hay letras por vencer en los próximos 90 días</div>';
        return;
    }

    $('#letrasPorVencerList').innerHTML = items.map(({ factura: f, letra: l, dias }) => {
        const prov = findProveedor(f.proveedorId);
        const { tag, texto } = estadoVencimiento(dias);
        const pct = dias < 0 ? 100 : Math.max(0, 100 - Math.round((dias / DIAS_ALERTA_VENCIMIENTO) * 100));
        const barColor = dias < 0 || dias <= 30 ? 'var(--accent-red)' : 'var(--accent-amber)';

        return `
            <div class="stock-bajo-item">
                <div class="stock-bajo-item-top">
                    <div>
                        <div class="stock-bajo-item-name">Factura ${f.numeroFactura} — Letra ${l.numero} de ${f.letras.length}</div>
                        <div class="stock-bajo-item-meta">Proveedor: ${prov ? prov.nombre : '—'} · Vence: ${formatDate(l.fechaVencimiento)}</div>
                    </div>
                    <span class="tag ${tag}">${texto}</span>
                </div>
                <div class="stock-bajo-bar-wrap">
                    <div class="stock-bajo-bar" style="width:${pct}%; background:${barColor}"></div>
                </div>
                <div class="stock-bajo-item-bottom">
                    <span>Monto: <strong>${formatPEN(l.monto)}</strong></span>
                    ${currentUser?.rol === 'Administrador' ? `<button class="btn-small" onclick="toggleLetraPagada(${f.id}, ${l.numero})">Marcar como pagada</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===================== GESTIÓN DE PAGO (ventas a crédito) =====================
function abrirGestionPago(ventaId) {
    const v = ventas.find(x => x.id === ventaId);
    if (!v) return;

    const cli = findCliente(v.clienteId);
    const total = ventaTotal(v);
    const pagado = ventaMontoPagado(v);
    const saldo = ventaSaldoPendiente(v);
    const { tag, texto } = tagFormaPago(v);

    const abonosHtml = (v.abonos || []).length
        ? v.abonos.map(a => `
            <div class="stock-bajo-item">
                <div class="stock-bajo-item-top">
                    <div>
                        <div class="stock-bajo-item-name">Abono</div>
                        <div class="stock-bajo-item-meta">${formatDateLong(a.fecha)}</div>
                    </div>
                    <span class="tag tag-green">${formatPEN(a.monto)}</span>
                </div>
            </div>
        `).join('')
        : '<div class="empty-state">Aún no ha registrado abonos</div>';

    $('#modalGestionPagoTitle').textContent = `Pago — Boleta ${v.numBoleta}`;
    $('#gestionPagoContent').innerHTML = `
        <div class="detalle-grid">
            <div>
                <div class="label">Cliente</div>
                <div class="value">${cli ? cli.nombre : '(cliente eliminado)'}</div>
            </div>
            <div>
                <div class="label">Fecha de venta</div>
                <div class="value">${formatDateLong(v.fecha)}</div>
            </div>
            <div>
                <div class="label">Total de la venta</div>
                <div class="value">${formatPEN(total)}</div>
            </div>
            <div>
                <div class="label">Fecha de pago acordada</div>
                <div class="value">${formatDateLong(v.fechaPagoAcordada)}</div>
            </div>
            <div>
                <div class="label">Pagado hasta hoy</div>
                <div class="value">${formatPEN(pagado)}</div>
            </div>
            <div>
                <div class="label">Saldo pendiente</div>
                <div class="value">${formatPEN(saldo)}</div>
            </div>
        </div>
        <span class="tag ${tag}" style="margin: 0.85rem 0; display: inline-block;">${texto}</span>

        <h4 style="font-family: var(--font-display); font-weight: 500; margin-bottom: 0.75rem;">Historial de abonos</h4>
        <div class="stock-bajo-list" style="margin-bottom: 1.25rem;">${abonosHtml}</div>

        ${saldo > 0.01 ? `
            <div class="venta-add-row">
                <div class="form-group" style="flex: 1;">
                    <label>Monto del abono (S/)</label>
                    <input type="number" id="abonoMonto" step="0.01" min="0.01" max="${saldo.toFixed(2)}" value="${saldo.toFixed(2)}">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Fecha</label>
                    <input type="date" id="abonoFecha" value="${today()}">
                </div>
                <button type="button" class="btn-primary venta-add-btn" onclick="registrarAbono(${v.id})">Registrar</button>
            </div>
        ` : ''}
    `;

    $('#modalGestionPago').classList.add('active');
}

function registrarAbono(ventaId) {
    const v = ventas.find(x => x.id === ventaId);
    if (!v) return;

    const monto = parseFloat($('#abonoMonto').value);
    const fecha = $('#abonoFecha').value;

    if (!monto || monto <= 0) {
        toast('✗ Ingrese un monto válido', 'error');
        return;
    }
    if (!fecha) {
        toast('✗ Ingrese la fecha del abono', 'error');
        return;
    }

    const saldo = ventaSaldoPendiente(v);
    if (monto > saldo + 0.01) {
        toast(`✗ El monto no puede superar el saldo pendiente (${formatPEN(saldo)})`, 'error');
        return;
    }

    v.abonos = v.abonos || [];
    v.abonos.push({ fecha, monto });

    toast(`✓ Abono de ${formatPEN(monto)} registrado`, 'success');
    persistAndRender();
    abrirGestionPago(ventaId);
    if ($('#modalCobranzasPorVencer').classList.contains('active')) renderCobranzasPorVencerModal();
}

// ===================== MODAL: COBRANZAS POR VENCER =====================
function renderCobranzasPorVencerModal() {
    const items = ventas
        .filter(v => v.formaPago === 'Crédito' && !ventaEstaPagada(v))
        .map(v => ({ venta: v, dias: diasParaVencer(v.fechaPagoAcordada) }))
        .filter(x => x.dias <= DIAS_ALERTA_VENCIMIENTO)
        .sort((a, b) => a.dias - b.dias);

    if (!items.length) {
        $('#cobranzasPorVencerList').innerHTML = '<div class="empty-state">✨ No hay cobranzas por vencer en los próximos 90 días</div>';
        return;
    }

    $('#cobranzasPorVencerList').innerHTML = items.map(({ venta: v, dias }) => {
        const cli = findCliente(v.clienteId);
        const { tag, texto } = estadoVencimiento(dias);
        const pct = dias < 0 ? 100 : Math.max(0, 100 - Math.round((dias / DIAS_ALERTA_VENCIMIENTO) * 100));
        const barColor = dias < 0 || dias <= 30 ? 'var(--accent-red)' : 'var(--accent-amber)';

        return `
            <div class="stock-bajo-item">
                <div class="stock-bajo-item-top">
                    <div>
                        <div class="stock-bajo-item-name">${cli ? cli.nombre : '(cliente eliminado)'} — Boleta ${v.numBoleta}</div>
                        <div class="stock-bajo-item-meta">Vence: ${formatDate(v.fechaPagoAcordada)}</div>
                    </div>
                    <span class="tag ${tag}">${texto}</span>
                </div>
                <div class="stock-bajo-bar-wrap">
                    <div class="stock-bajo-bar" style="width:${pct}%; background:${barColor}"></div>
                </div>
                <div class="stock-bajo-item-bottom">
                    <span>Saldo pendiente: <strong>${formatPEN(ventaSaldoPendiente(v))}</strong></span>
                    <button class="btn-small" onclick="closeModal('modalCobranzasPorVencer'); abrirGestionPago(${v.id})">Gestionar pago</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===================== RENDER: CLIENTES =====================
function renderClientes() {
    const isAdmin = currentUser?.rol === 'Administrador';
    $('#clientesGrid').innerHTML = clientes.map(c => {
        const tagClass = c.tipo === 'Empresa' ? 'tag-dark' : c.tipo === 'Cooperativa' ? 'tag-green' : 'tag-amber';
        return `
            <div class="entity-card">
                <div class="entity-avatar">${initials(c.nombre)}</div>
                <div class="entity-name">${c.nombre}</div>
                <span class="tag ${tagClass}" style="margin-bottom: 0.85rem; display: inline-block;">${c.tipo}</span>
                <div class="entity-info">👤 ${c.contacto}</div>
                <div class="entity-info">📞 ${c.telefono}</div>
                <div class="entity-info">✉ ${c.email}</div>
                <div class="entity-info">📍 ${c.direccion}</div>
                ${isAdmin ? `
                    <div class="entity-actions">
                        <button class="btn-small" onclick="editarCliente(${c.id})">Editar</button>
                        <button class="btn-danger" onclick="eliminarCliente(${c.id})">Eliminar</button>
                    </div>
                ` : `<div class="entity-actions"><button class="btn-small" onclick="editarCliente(${c.id})">Editar</button></div>`}
            </div>
        `;
    }).join('');
}

// ===================== RENDER: MANTENEDORES (Categorías y Unidades) =====================
function renderMantenedores() {
    const isAdmin = currentUser?.rol === 'Administrador';

    if (!categorias.length) {
        $('#categoriasList').innerHTML = '<div class="empty-state">Aún no hay categorías registradas</div>';
    } else {
        $('#categoriasList').innerHTML = categorias.map(c => {
            const enUso = productos.filter(p => p.categoria === c.nombre).length;
            return `
                <div class="maint-item">
                    <div class="maint-item-info">
                        <span class="maint-item-name">${c.nombre}</span>
                        <span class="maint-item-meta">${enUso} producto${enUso === 1 ? '' : 's'}</span>
                    </div>
                    ${isAdmin ? `
                        <div class="maint-item-actions">
                            <button class="btn-small-outline" onclick="editarCategoria(${c.id})">Editar</button>
                            <button class="btn-danger" onclick="eliminarCategoria(${c.id})">Eliminar</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    if (!unidades.length) {
        $('#unidadesList').innerHTML = '<div class="empty-state">Aún no hay unidades registradas</div>';
    } else {
        $('#unidadesList').innerHTML = unidades.map(u => {
            const enUso = productos.filter(p => p.unidad === u.codigo).length;
            return `
                <div class="maint-item">
                    <div class="maint-item-info">
                        <span class="maint-item-name">${u.nombre}<span class="maint-item-code">${u.codigo}</span></span>
                        <span class="maint-item-meta">${enUso} producto${enUso === 1 ? '' : 's'}</span>
                    </div>
                    ${isAdmin ? `
                        <div class="maint-item-actions">
                            <button class="btn-small-outline" onclick="editarUnidad(${u.id})">Editar</button>
                            <button class="btn-danger" onclick="eliminarUnidad(${u.id})">Eliminar</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
}

// ===================== RENDER: USUARIOS =====================
function renderUsuarios() {
    $('#usuariosGrid').innerHTML = usuarios.map(u => {
        const esUnicoAdmin = u.rol === 'Administrador' && usuarios.filter(x => x.rol === 'Administrador').length === 1;
        const esUsuarioActual = currentUser && u.id === currentUser.id;
        return `
            <div class="entity-card">
                <div class="entity-avatar">${u.iniciales}</div>
                <div class="entity-name">${u.nombre}${esUsuarioActual ? ' <span style="font-size:0.75rem; color:var(--gray-500);">(tú)</span>' : ''}</div>
                <span class="tag ${u.rol === 'Administrador' ? 'tag-dark' : 'tag-green'}" style="margin-bottom: 0.85rem; display: inline-block;">${u.rol}</span>
                <div class="entity-info">👤 Usuario: ${u.usuario}</div>
                <div class="entity-actions">
                    <button class="btn-small" onclick="editarUsuario(${u.id})">Editar</button>
                    ${!esUsuarioActual && !esUnicoAdmin ? `<button class="btn-danger" onclick="eliminarUsuario(${u.id})">Eliminar</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===================== RENDER: CONFIGURACIÓN =====================
function renderConfiguracion() {
    const info = getStorageInfo();
    const stats = $('#storageStats');
    if (!stats) return;

    if (!info) {
        stats.innerHTML = '<div class="empty-state">Sin datos guardados aún</div>';
        return;
    }

    const fechaMod = new Date(info.ultimaModificacion);
    const fechaStr = fechaMod.toLocaleString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    stats.innerHTML = `
        <div class="config-stat-row">
            <span class="label">Productos</span>
            <span class="value">${info.productos}</span>
        </div>
        <div class="config-stat-row">
            <span class="label">Proveedores</span>
            <span class="value">${info.proveedores}</span>
        </div>
        <div class="config-stat-row">
            <span class="label">Clientes</span>
            <span class="value">${info.clientes}</span>
        </div>
        <div class="config-stat-row">
            <span class="label">Ingresos registrados</span>
            <span class="value">${info.ingresos}</span>
        </div>
        <div class="config-stat-row">
            <span class="label">Ventas registradas</span>
            <span class="value">${info.ventas}</span>
        </div>
        <div class="config-stat-row">
            <span class="label">Categorías</span>
            <span class="value">${info.categorias}</span>
        </div>
        <div class="config-stat-row">
            <span class="label">Unidades de medida</span>
            <span class="value">${info.unidades}</span>
        </div>
        <div class="config-stat-row">
            <span class="label">Tamaño total</span>
            <span class="value">${info.tamano}</span>
        </div>
        <div class="config-stat-row">
            <span class="label">Última modificación</span>
            <span class="value" style="font-size:0.78rem;">${fechaStr}</span>
        </div>
    `;
}

// ===================== HANDLERS DE RESPALDO =====================
function handleExport() {
    try {
        exportBackup();
        toast('✓ Respaldo descargado correctamente', 'success');
    } catch (err) {
        toast('✗ Error al exportar: ' + err.message, 'error');
    }
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const okImport = await askConfirm({
        title: '¿Importar este respaldo?',
        message: 'Esto reemplazará TODOS los datos actuales (productos, ventas, clientes, etc). Asegúrese de haber descargado un respaldo antes de continuar.',
        confirmText: 'Sí, importar'
    });
    if (!okImport) {
        event.target.value = '';
        return;
    }

    try {
        await importBackup(file);
        toast('✓ Respaldo importado correctamente', 'success');
        renderAll();
        if (chartVentasInst) {
            renderChartVentas();
            renderChartCategorias();
            renderChartTopProductos();
        }
    } catch (err) {
        toast('✗ Error: ' + err.message, 'error');
    }
    event.target.value = '';
}

async function handleResetDemo() {
    const ok = await askConfirm({
        title: '¿Restablecer datos de demostración?',
        message: 'Se borrarán todos los productos, ventas, clientes, proveedores, categorías, unidades y facturas que haya agregado, y se reemplazarán por los datos originales de ejemplo. Esta acción no se puede deshacer.',
        confirmText: 'Sí, restablecer'
    });
    if (!ok) return;

    clearStorage();
    toast('✓ Datos de demostración restaurados', 'success');
    renderAll();
    if (chartVentasInst) {
        renderChartVentas();
        renderChartCategorias();
        renderChartTopProductos();
    }
}

async function handleEmptyAll() {
    const ok = await askConfirm({
        title: '¿Vaciar todo el sistema?',
        message: 'El sistema quedará completamente en blanco: sin productos, ventas, clientes, proveedores, categorías, unidades ni facturas. No hay forma de recuperar estos datos, salvo que tenga un respaldo exportado.',
        confirmText: 'Sí, vaciar todo'
    });
    if (!ok) return;

    emptyAll();
    toast('✓ Sistema vaciado. Listo para empezar de cero.', 'success');
    renderAll();
    if (chartVentasInst) {
        renderChartVentas();
        renderChartCategorias();
        renderChartTopProductos();
    }
}

// ===================== ROUTER DE RENDER =====================
function renderView(view) {
    switch (view) {
        case 'dashboard': renderDashboard(); break;
        case 'inventario': renderInventario(); break;
        case 'ingresos': renderIngresos(); break;
        case 'ventas': renderVentas(); break;
        case 'flujocaja': renderFlujoCaja(); if (chartFlujoCajaInst) renderChartFlujoCaja(); break;
        case 'productos': renderProductos(); break;
        case 'proveedores': renderProveedores(); break;
        case 'facturas': renderFacturas(); break;
        case 'clientes': renderClientes(); break;
        case 'mantenedores': renderMantenedores(); break;
        case 'usuarios': renderUsuarios(); break;
        case 'configuracion': renderConfiguracion(); break;
    }
}

function renderAll() {
    populateFilterCategorias();
    renderDashboard();
    renderInventario();
    renderIngresos();
    renderVentas();
    renderProductos();
    renderProveedores();
    renderFacturas();
    renderClientes();
    renderMantenedores();
    renderUsuarios();
    renderFlujoCaja();
    renderConfiguracion();
    if (currentUser) {
        // Re-renderizar gráficos solo si ya están inicializados
        if (chartVentasInst) renderChartVentas();
        if (chartCategoriasInst) renderChartCategorias();
        if (chartTopInst) renderChartTopProductos();
        if (chartFlujoCajaInst) renderChartFlujoCaja();
    }
}

// Igual que renderAll() pero guardando antes en localStorage
function persistAndRender() {
    saveToStorage();
    renderAll();
}

// ===================== ACCIONES PRODUCTOS =====================
function openModalIngresoFromProduct(productoId) {
    openModal('modalIngreso');
    setTimeout(() => $('#ingProducto').value = productoId, 50);
}

// Clic en la fila de Inventario = ver detalle, salvo que el clic haya sido
// sobre alguno de los botones de Acciones (esos ya tienen su propia acción)
function handleInventarioRowClick(e, id) {
    if (e.target.closest('.actions-cell')) return;
    verProducto(id);
}

function verProducto(id) {
    const p = findProducto(id);
    if (!p) return;

    const prov = findProveedor(p.proveedorId);
    const { tag: estadoTag, texto: estadoTexto } = estadoStock(p);
    const isAdmin = currentUser?.rol === 'Administrador';

    $('#verProductoContent').innerHTML = `
        <div class="detalle-producto-header">
            <div class="product-thumb">${initials(p.nombre)}</div>
            <div>
                <div class="detalle-producto-nombre">${p.nombre}</div>
                <div class="detalle-producto-codigo">${p.codigo} · <span class="tag ${tagPorCategoria(p.categoria)}">${p.categoria}</span> <span class="tag ${estadoTag}">${estadoTexto}</span>${p.aplicaIgv === false ? '<span class="tag-igv-exento" title="Exonerado de IGV">Sin IGV</span>' : ''}</div>
            </div>
        </div>
        <div class="detalle-grid">
            <div>
                <div class="label">Stock actual</div>
                <div class="value">${p.stock} ${p.unidad}</div>
            </div>
            <div>
                <div class="label">Stock mínimo</div>
                <div class="value">${p.stockMin} ${p.unidad}</div>
            </div>
            <div>
                <div class="label">Precio venta</div>
                <div class="value">${formatPEN(p.precio)}</div>
            </div>
            <div>
                <div class="label">Precio costo</div>
                <div class="value">${formatPEN(p.costo)}</div>
            </div>
            <div>
                <div class="label">Proveedor</div>
                <div class="value">${prov ? prov.nombre : '—'}</div>
            </div>
            <div>
                <div class="label">Aplica IGV</div>
                <div class="value">${p.aplicaIgv === false ? 'No (exonerado)' : 'Sí'}</div>
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn-outline" onclick="closeModal('modalVerProducto')">Cerrar</button>
            ${isAdmin ? `<button class="btn-primary" onclick="closeModal('modalVerProducto'); editarProducto(${p.id})">Editar producto</button>` : ''}
        </div>
    `;

    $('#modalVerProducto').classList.add('active');
}

function editarProducto(id) {
    const p = findProducto(id);
    if (!p) return;
    openModal('modalProducto');
    $('#modalProductoTitle').textContent = 'Editar Producto';
    $('#prodId').value = p.id;
    $('#prodNombre').value = p.nombre;
    $('#prodCategoria').value = p.categoria;
    $('#prodUnidad').value = p.unidad;
    $('#prodCosto').value = p.costo;
    $('#prodPrecio').value = p.precio;
    $('#prodStock').value = p.stock;
    $('#prodStockMin').value = p.stockMin;
    $('#prodProveedor').value = p.proveedorId;
    $('#prodAplicaIgv').checked = p.aplicaIgv !== false;
}

async function eliminarProducto(id) {
    const p = findProducto(id);
    if (!p) return;

    const ok = await askConfirm({
        title: `¿Eliminar "${p.nombre}"?`,
        message: 'Este producto saldrá de tu inventario junto con su historial de stock. Esta acción no se puede deshacer.',
        confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    const idx = productos.findIndex(x => x.id === id);
    if (idx > -1) {
        productos.splice(idx, 1);
        toast('Producto eliminado', 'success');
        persistAndRender();
    }
}

// ===================== ACCIONES INGRESOS =====================
function handleIngresoRowClick(e, id) {
    if (e.target.closest('.actions-cell')) return;
    verIngreso(id);
}

function verIngreso(id) {
    const i = ingresos.find(x => x.id === id);
    if (!i) return;

    const prod = findProducto(i.productoId);
    const prov = findProveedor(i.proveedorId);
    const isAdmin = currentUser?.rol === 'Administrador';
    const vencInfo = i.fechaVencimiento ? estadoVencimiento(diasParaVencer(i.fechaVencimiento)) : null;

    $('#verIngresoContent').innerHTML = `
        <div class="detalle-producto-header">
            <div class="product-thumb">${prod ? initials(prod.nombre) : '—'}</div>
            <div>
                <div class="detalle-producto-nombre">${prod ? prod.nombre : '(producto eliminado)'}</div>
                <div class="detalle-producto-codigo">${formatDate(i.fecha)}${vencInfo ? ` · <span class="tag ${vencInfo.tag}">${vencInfo.texto}</span>` : ''}</div>
            </div>
        </div>
        <div class="detalle-grid">
            <div>
                <div class="label">Número de lote</div>
                <div class="value">${i.numeroLote || '—'}</div>
            </div>
            <div>
                <div class="label">Fecha de vencimiento</div>
                <div class="value">${i.fechaVencimiento ? formatDate(i.fechaVencimiento) : '—'}</div>
            </div>
            <div>
                <div class="label">Cantidad comprada</div>
                <div class="value">${i.cantidad} ${prod ? prod.unidad : ''}</div>
            </div>
            <div>
                <div class="label">Disponible de este lote</div>
                <div class="value">${i.cantidadDisponible} ${prod ? prod.unidad : ''}</div>
            </div>
            <div>
                <div class="label">Costo unitario</div>
                <div class="value">${formatPEN(i.costoUnit)}</div>
            </div>
            <div>
                <div class="label">Total</div>
                <div class="value">${formatPEN(i.cantidad * i.costoUnit)}</div>
            </div>
            <div>
                <div class="label">Proveedor</div>
                <div class="value">${prov ? prov.nombre : '—'}</div>
            </div>
            <div>
                <div class="label">Número de factura</div>
                <div class="value">${i.numeroFactura || '—'}</div>
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn-outline" onclick="closeModal('modalVerIngreso')">Cerrar</button>
            ${isAdmin ? `<button class="btn-primary" onclick="closeModal('modalVerIngreso'); editarIngreso(${i.id})">Editar ingreso</button>` : ''}
        </div>
    `;

    $('#modalVerIngreso').classList.add('active');
}

function editarIngreso(id) {
    const i = ingresos.find(x => x.id === id);
    if (!i) return;

    if (i.cantidadDisponible !== i.cantidad) {
        toast('✗ No se puede editar: ya se vendieron unidades de este lote. Revise el historial en Ventas.', 'error');
        return;
    }

    openModal('modalIngreso');
    $('#modalIngresoTitle').textContent = 'Editar Ingreso';
    $('#ingId').value = i.id;
    $('#ingProducto').value = i.productoId;
    $('#ingLote').value = i.numeroLote || '';
    $('#ingVencimiento').value = i.fechaVencimiento || '';
    $('#ingCantidad').value = i.cantidad;
    $('#ingCosto').value = i.costoUnit;
    $('#ingProveedor').value = i.proveedorId;
    $('#ingFactura').value = i.numeroFactura || '';
}

async function eliminarIngreso(id) {
    const i = ingresos.find(x => x.id === id);
    if (!i) return;

    if (i.cantidadDisponible !== i.cantidad) {
        toast('✗ No se puede eliminar: ya se vendieron unidades de este lote. Revise el historial en Ventas.', 'error');
        return;
    }

    const prod = findProducto(i.productoId);
    const ok = await askConfirm({
        title: `¿Eliminar este ingreso de "${prod ? prod.nombre : 'producto eliminado'}"?`,
        message: `Se restará ${i.cantidad} ${prod ? prod.unidad : ''} del stock actual. Esta acción no se puede deshacer.`,
        confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    if (prod) prod.stock -= i.cantidad;

    const idx = ingresos.findIndex(x => x.id === id);
    if (idx > -1) {
        ingresos.splice(idx, 1);
        toast('Ingreso eliminado', 'success');
        persistAndRender();
    }
}

// ===================== ACCIONES CLIENTES =====================
function editarCliente(id) {
    const c = findCliente(id);
    if (!c) return;
    openModal('modalCliente');
    $('#modalClienteTitle').textContent = 'Editar Cliente';
    $('#cliId').value = c.id;
    $('#cliNombre').value = c.nombre;
    $('#cliDocumento').value = c.documento;
    $('#cliTipo').value = c.tipo;
    $('#cliContacto').value = c.contacto;
    $('#cliTelefono').value = c.telefono;
    $('#cliEmail').value = c.email;
    $('#cliDireccion').value = c.direccion;
}

async function eliminarCliente(id) {
    const c = findCliente(id);
    if (!c) return;

    const ok = await askConfirm({
        title: `¿Eliminar a "${c.nombre}"?`,
        message: 'Este cliente saldrá de tu cartera. Su historial de compras quedará como "cliente eliminado". Esta acción no se puede deshacer.',
        confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    const idx = clientes.findIndex(x => x.id === id);
    if (idx > -1) {
        clientes.splice(idx, 1);
        toast('Cliente eliminado', 'success');
        persistAndRender();
    }
}

// ===================== ACCIONES PROVEEDORES =====================
function editarProveedor(id) {
    const p = findProveedor(id);
    if (!p) return;
    openModal('modalProveedor');
    $('#modalProveedorTitle').textContent = 'Editar Proveedor';
    $('#provId').value = p.id;
    $('#provNombre').value = p.nombre;
    $('#provContacto').value = p.contacto;
    $('#provTelefono').value = p.telefono;
    $('#provEmail').value = p.email;
    $('#provDireccion').value = p.direccion;
}

async function eliminarProveedor(id) {
    const prov = findProveedor(id);
    if (!prov) return;

    const ok = await askConfirm({
        title: `¿Eliminar a "${prov.nombre}"?`,
        message: 'Este proveedor saldrá de tu lista de aliados comerciales. Su historial de ingresos quedará como "proveedor eliminado". Esta acción no se puede deshacer.',
        confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    const idx = proveedores.findIndex(x => x.id === id);
    if (idx > -1) {
        proveedores.splice(idx, 1);
        toast('Proveedor eliminado', 'success');
        persistAndRender();
    }
}

// ===================== ACCIONES CATEGORÍAS =====================
function editarCategoria(id) {
    const c = findCategoria(id);
    if (!c) return;
    openModal('modalCategoria');
    $('#modalCategoriaTitle').textContent = 'Editar Categoría';
    $('#catId').value = c.id;
    $('#catNombre').value = c.nombre;
}

async function eliminarCategoria(id) {
    const c = findCategoria(id);
    if (!c) return;

    const enUso = productos.filter(p => p.categoria === c.nombre).length;
    if (enUso) {
        toast(`✗ No se puede eliminar: hay ${enUso} producto(s) con esta categoría`, 'error');
        return;
    }

    const ok = await askConfirm({
        title: `¿Eliminar la categoría "${c.nombre}"?`,
        message: 'Esta categoría dejará de estar disponible al registrar productos. Esta acción no se puede deshacer.',
        confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    const idx = categorias.findIndex(x => x.id === id);
    if (idx > -1) {
        categorias.splice(idx, 1);
        toast('Categoría eliminada', 'success');
        persistAndRender();
    }
}

// ===================== ACCIONES UNIDADES =====================
function editarUnidad(id) {
    const u = findUnidad(id);
    if (!u) return;
    openModal('modalUnidad');
    $('#modalUnidadTitle').textContent = 'Editar Unidad';
    $('#uniId').value = u.id;
    $('#uniCodigo').value = u.codigo;
    $('#uniNombre').value = u.nombre;
}

async function eliminarUnidad(id) {
    const u = findUnidad(id);
    if (!u) return;

    const enUso = productos.filter(p => p.unidad === u.codigo).length;
    if (enUso) {
        toast(`✗ No se puede eliminar: hay ${enUso} producto(s) con esta unidad`, 'error');
        return;
    }

    const ok = await askConfirm({
        title: `¿Eliminar la unidad "${u.nombre}"?`,
        message: 'Esta unidad dejará de estar disponible al registrar productos. Esta acción no se puede deshacer.',
        confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    const idx = unidades.findIndex(x => x.id === id);
    if (idx > -1) {
        unidades.splice(idx, 1);
        toast('Unidad eliminada', 'success');
        persistAndRender();
    }
}

// ===================== ACCIONES USUARIOS =====================
function editarUsuario(id) {
    const u = usuarios.find(x => x.id === id);
    if (!u) return;
    openModal('modalUsuario');
    $('#modalUsuarioTitle').textContent = 'Editar Usuario';
    $('#usrId').value = u.id;
    $('#usrNombre').value = u.nombre;
    $('#usrUsuario').value = u.usuario;
    $('#usrRol').value = u.rol;
    $('#usrPassword').value = '';
}

async function eliminarUsuario(id) {
    const u = usuarios.find(x => x.id === id);
    if (!u) return;

    if (currentUser && u.id === currentUser.id) {
        toast('✗ No puede eliminar su propio usuario mientras tiene la sesión abierta', 'error');
        return;
    }
    if (u.rol === 'Administrador' && usuarios.filter(x => x.rol === 'Administrador').length === 1) {
        toast('✗ No se puede eliminar: debe quedar al menos un Administrador en el sistema', 'error');
        return;
    }

    const ok = await askConfirm({
        title: `¿Eliminar a "${u.nombre}"?`,
        message: `Este usuario ya no podrá iniciar sesión en el sistema. Esta acción no se puede deshacer.`,
        confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    const idx = usuarios.findIndex(x => x.id === id);
    if (idx > -1) {
        usuarios.splice(idx, 1);
        toast('Usuario eliminado', 'success');
        persistAndRender();
    }
}

// ===================== BOLETA =====================
function verBoleta(ventaId) {
    const v = ventas.find(x => x.id === ventaId);
    if (!v) return;

    const cli = findCliente(v.clienteId);
    const subtotal = ventaTotal(v);

    // El IGV se calcula línea por línea: no todos los productos lo aplican
    // (ej. algunas nutriciones foliares están exoneradas), así que la base
    // gravada y la exonerada se acumulan por separado, como en una boleta real
    let baseGravada = 0;
    let opExonerada = 0;
    let igvIncluido = 0;

    const filasHtml = v.items.map(it => {
        const prod = findProducto(it.productoId);
        const importe = it.cantidad * it.precioUnit;
        const aplicaIgv = prod ? prod.aplicaIgv !== false : true;

        if (aplicaIgv) {
            const baseItem = importe / 1.18;
            baseGravada += baseItem;
            igvIncluido += importe - baseItem;
        } else {
            opExonerada += importe;
        }

        const loteTexto = it.lotes && it.lotes.length
            ? it.lotes.map(l => l.numeroLote ? `${l.numeroLote} (${l.cantidad})` : `sin lote (${l.cantidad})`).join(', ')
            : null;

        return `
                <tr>
                    <td>${it.cantidad} ${prod ? prod.unidad : ''}</td>
                    <td class="bold">${prod ? prod.nombre : '(producto eliminado)'}<br><small style="color:#888">${prod ? `${prod.codigo} · ${prod.categoria}` : ''}${aplicaIgv ? '' : ' · <strong>Exonerado de IGV</strong>'}</small>${loteTexto ? `<br><small style="color:#888">Lote: ${loteTexto}</small>` : ''}</td>
                    <td class="text-right">${formatPEN(it.precioUnit)}</td>
                    <td class="text-right bold">${formatPEN(importe)}</td>
                </tr>
        `;
    }).join('');

    $('#boletaContent').innerHTML = `
        <div class="boleta-header">
            <div class="boleta-business">
                <div class="boleta-logo">AgroStock<sup>®</sup></div>
                <div class="boleta-business-info">
                    <strong>${negocio.razonSocial}</strong><br>
                    ${negocio.direccion}<br>
                    Tel: ${negocio.telefono} · ${negocio.email}
                </div>
            </div>
            <div class="boleta-doc-info">
                <div class="boleta-doc-type">Nota de Venta</div>
                <div class="boleta-doc-ruc">RUC ${negocio.ruc}</div>
                <div class="boleta-doc-num">${v.numBoleta}</div>
            </div>
        </div>

        <div class="boleta-cliente">
            <div>
                <div class="label">Cliente</div>
                <div class="value">${cli ? cli.nombre : '(cliente eliminado)'}</div>
            </div>
            <div>
                <div class="label">RUC / DNI</div>
                <div class="value">${cli ? cli.documento : '—'}</div>
            </div>
            <div>
                <div class="label">Dirección</div>
                <div class="value">${cli ? cli.direccion : '—'}</div>
            </div>
            <div>
                <div class="label">Fecha de emisión</div>
                <div class="value">${formatDateLong(v.fecha)}</div>
            </div>
            <div>
                <div class="label">Forma de pago</div>
                <div class="value">${v.formaPago === 'Crédito' ? `Crédito${ventaEstaPagada(v) ? ' (pagada)' : ` — saldo ${formatPEN(ventaSaldoPendiente(v))}`}` : 'Contado'}</div>
            </div>
            ${v.formaPago === 'Crédito' ? `
            <div>
                <div class="label">Fecha de pago acordada</div>
                <div class="value">${formatDateLong(v.fechaPagoAcordada)}</div>
            </div>
            ` : ''}
        </div>

        <table class="boleta-table">
            <thead>
                <tr>
                    <th>Cant.</th>
                    <th>Descripción</th>
                    <th class="text-right">P. Unit.</th>
                    <th class="text-right">Importe</th>
                </tr>
            </thead>
            <tbody>
                ${filasHtml}
            </tbody>
        </table>

        <div class="boleta-totales">
            <div class="boleta-totales-box">
                <div class="totales-row">
                    <span>Op. Gravada:</span>
                    <span>${formatPEN(baseGravada)}</span>
                </div>
                ${opExonerada > 0 ? `
                <div class="totales-row">
                    <span>Op. Exonerada:</span>
                    <span>${formatPEN(opExonerada)}</span>
                </div>
                ` : ''}
                <div class="totales-row">
                    <span>IGV (18%):</span>
                    <span>${formatPEN(igvIncluido)}</span>
                </div>
                <div class="totales-row total">
                    <span>TOTAL S/</span>
                    <span>${formatPEN(subtotal)}</span>
                </div>
            </div>
        </div>

        <div class="boleta-footer">
            Atendido por <strong>${currentUser?.nombre || 'Sistema'}</strong> · ${currentUser?.rol || ''}<br>
            Gracias por su compra · <strong>${negocio.web}</strong><br>
            Representación impresa de la Boleta Electrónica · Consultar en SUNAT
        </div>
    `;

    $('#modalBoleta').classList.add('active');
}

// ===================== FORMULARIOS =====================

// Producto (crear/editar)
$('#formProducto').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#prodId').value;
    const data = {
        nombre: $('#prodNombre').value.trim(),
        categoria: $('#prodCategoria').value,
        unidad: $('#prodUnidad').value,
        costo: parseFloat($('#prodCosto').value),
        precio: parseFloat($('#prodPrecio').value),
        stock: parseInt($('#prodStock').value),
        stockMin: parseInt($('#prodStockMin').value),
        proveedorId: parseInt($('#prodProveedor').value),
        aplicaIgv: $('#prodAplicaIgv').checked
    };

    if (id) {
        // Editar
        const p = findProducto(parseInt(id));
        Object.assign(p, data);
        toast(`✓ Producto "${p.nombre}" actualizado`, 'success');
    } else {
        // Crear
        const nuevo = {
            id: nextProductoId++,
            codigo: `PROD-${String(nextProductoId).padStart(3, '0')}`,
            ...data
        };
        productos.push(nuevo);
        toast(`✓ Producto "${nuevo.nombre}" agregado`, 'success');
    }
    closeModal('modalProducto');
    persistAndRender();
});

// Ingreso
$('#formIngreso').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#ingId').value;
    const productoId = parseInt($('#ingProducto').value);
    const numeroLote = $('#ingLote').value.trim();
    const fechaVencimiento = $('#ingVencimiento').value;
    const cantidad = parseInt($('#ingCantidad').value);
    const costoUnit = parseFloat($('#ingCosto').value);
    const proveedorId = parseInt($('#ingProveedor').value);
    const numeroFactura = $('#ingFactura').value.trim() || null;

    if (id) {
        // Editar: solo se permite si nadie ha comprado todavía de este lote
        const i = ingresos.find(x => x.id === parseInt(id));
        if (i.cantidadDisponible !== i.cantidad) {
            toast('✗ No se puede editar: ya se vendieron unidades de este lote.', 'error');
            closeModal('modalIngreso');
            return;
        }

        // Revertir el efecto del ingreso original en el stock del producto
        const prodAnterior = findProducto(i.productoId);
        if (prodAnterior) prodAnterior.stock -= i.cantidad;

        Object.assign(i, {
            productoId, numeroLote, fechaVencimiento, cantidad, costoUnit, proveedorId, numeroFactura,
            cantidadDisponible: cantidad
        });

        const prodNuevo = findProducto(productoId);
        prodNuevo.stock += cantidad;
        prodNuevo.costo = costoUnit;

        toast('✓ Ingreso actualizado', 'success');
    } else {
        // Crear
        ingresos.push({
            id: nextIngresoId++,
            fecha: today(),
            productoId, numeroLote, fechaVencimiento, cantidad, costoUnit, proveedorId, numeroFactura,
            cantidadDisponible: cantidad
        });

        const prod = findProducto(productoId);
        prod.stock += cantidad;
        // El "precio costo" de la ficha es solo referencial: lo actualizamos con
        // el costo de la compra más reciente para que no se quede desactualizado
        prod.costo = costoUnit;

        toast(`✓ Ingreso registrado: +${cantidad} ${prod.unidad} de ${prod.nombre}`, 'success');
    }

    closeModal('modalIngreso');
    persistAndRender();
});

// Venta (carrito multi-producto)
let ventaCart = [];

function toggleCampoCredito() {
    const esCredito = $('#venFormaPago').value === 'Crédito';
    $('#venFechaCreditoWrap').style.display = esCredito ? '' : 'none';
    $('#venFechaPagoAcordada').required = esCredito;
}

function agregarProductoVenta() {
    const productoId = parseInt($('#venProductoSel').value);
    const cantidad = parseInt($('#venCantidadSel').value);

    if (!productoId) {
        toast('✗ Seleccione un producto', 'error');
        return;
    }
    if (!cantidad || cantidad < 1) {
        toast('✗ Ingrese una cantidad válida', 'error');
        return;
    }

    const prod = findProducto(productoId);
    const enCarrito = ventaCart.find(it => it.productoId === productoId);
    const yaAgregado = enCarrito ? enCarrito.cantidad : 0;
    const disponible = prod.stock - yaAgregado;

    if (cantidad > disponible) {
        toast(`✗ Stock insuficiente. Disponible: ${disponible} ${prod.unidad}`, 'error');
        return;
    }

    if (enCarrito) {
        enCarrito.cantidad += cantidad;
    } else {
        ventaCart.push({ productoId, cantidad, precioUnit: prod.precio });
    }

    $('#venCantidadSel').value = 1;
    renderVentaCart();
}

function actualizarCantidadCarrito(productoId, nuevaCantidad, inputEl) {
    const cantidad = parseInt(nuevaCantidad);
    const item = ventaCart.find(it => it.productoId === productoId);
    if (!item) return;

    if (!cantidad || cantidad < 1) {
        ventaCart = ventaCart.filter(it => it.productoId !== productoId);
        renderVentaCart();
        return;
    }

    const prod = findProducto(productoId);
    if (cantidad > prod.stock) {
        toast(`✗ Stock insuficiente. Disponible: ${prod.stock} ${prod.unidad}`, 'error');
        inputEl.value = item.cantidad;
        return;
    }

    item.cantidad = cantidad;
    renderVentaCart();
}

function quitarProductoVenta(productoId) {
    ventaCart = ventaCart.filter(it => it.productoId !== productoId);
    renderVentaCart();
}

function renderVentaCart() {
    const tbody = $('#ventaCartBody');
    const resumen = $('#ventaResumen');

    if (!ventaCart.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Aún no ha agregado productos</td></tr>';
        resumen.classList.remove('active');
        return;
    }

    tbody.innerHTML = ventaCart.map(it => {
        const prod = findProducto(it.productoId);
        return `
            <tr>
                <td>
                    <div class="cart-item-name">${prod.nombre}</div>
                    <div class="cart-item-unidad">${formatPEN(it.precioUnit)} / ${prod.unidad}</div>
                </td>
                <td>
                    <input type="number" class="cart-qty-input" min="1" value="${it.cantidad}"
                        onchange="actualizarCantidadCarrito(${it.productoId}, this.value, this)">
                </td>
                <td><strong>${formatPEN(it.cantidad * it.precioUnit)}</strong></td>
                <td>
                    <button type="button" class="cart-remove-btn" onclick="quitarProductoVenta(${it.productoId})" title="Quitar">×</button>
                </td>
            </tr>
        `;
    }).join('');

    const total = ventaCart.reduce((s, it) => s + it.cantidad * it.precioUnit, 0);
    const nItems = ventaCart.reduce((s, it) => s + it.cantidad, 0);
    resumen.innerHTML = `${ventaCart.length} producto(s) · ${nItems} unidades <br> Total: <strong>${formatPEN(total)}</strong>`;
    resumen.classList.add('active');
}

// Descuenta la cantidad vendida de los lotes más antiguos primero (FIFO):
// así se rota el stock viejo antes de que venza, y queda registrado de qué
// lote(s) salió cada venta, para poder rastrear un reclamo hasta su Ingreso
function asignarLotesFIFO(productoId, cantidadNecesaria) {
    const disponibles = ingresos
        .filter(i => i.productoId === productoId && (i.cantidadDisponible || 0) > 0)
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);

    const asignacion = [];
    let restante = cantidadNecesaria;

    for (const ing of disponibles) {
        if (restante <= 0) break;
        const tomar = Math.min(ing.cantidadDisponible, restante);
        ing.cantidadDisponible -= tomar;
        asignacion.push({ ingresoId: ing.id, numeroLote: ing.numeroLote || null, cantidad: tomar });
        restante -= tomar;
    }

    if (restante > 0) {
        // No hay suficiente stock con lote registrado (ej. viene del "stock
        // inicial" al crear el producto, que no pasó por Ingresos)
        asignacion.push({ ingresoId: null, numeroLote: null, cantidad: restante });
    }

    return asignacion;
}

function confirmarVentaMultiple() {
    const clienteId = parseInt($('#venCliente').value);

    if (!clienteId) {
        toast('✗ Seleccione un cliente', 'error');
        return;
    }
    if (!ventaCart.length) {
        toast('✗ Agregue al menos un producto', 'error');
        return;
    }

    const formaPago = $('#venFormaPago').value;
    const fechaPagoAcordada = $('#venFechaPagoAcordada').value;
    if (formaPago === 'Crédito' && !fechaPagoAcordada) {
        toast('✗ Ingrese la fecha de pago acordada con el cliente', 'error');
        return;
    }

    // Revalidar stock por si cambió mientras se armaba el carrito
    for (const it of ventaCart) {
        const prod = findProducto(it.productoId);
        if (it.cantidad > prod.stock) {
            toast(`✗ Stock insuficiente de ${prod.nombre}. Disponible: ${prod.stock} ${prod.unidad}`, 'error');
            return;
        }
    }

    const numBoleta = `B001-${String(nextBoleta++).padStart(5, '0')}`;
    const nuevaVenta = {
        id: nextVentaId++,
        numBoleta,
        fecha: today(),
        clienteId,
        items: ventaCart.map(it => ({ ...it, lotes: asignarLotesFIFO(it.productoId, it.cantidad) })),
        formaPago,
        fechaPagoAcordada: formaPago === 'Crédito' ? fechaPagoAcordada : null,
        abonos: []
    };
    ventas.push(nuevaVenta);
    ventaCart.forEach(it => { findProducto(it.productoId).stock -= it.cantidad; });

    toast(`✓ Venta ${numBoleta} registrada: ${formatPEN(ventaTotal(nuevaVenta))}`, 'success');
    closeModal('modalVenta');
    ventaCart = [];
    persistAndRender();

    // Mostrar boleta automáticamente
    setTimeout(() => verBoleta(nuevaVenta.id), 400);
}

// Cliente (crear/editar)
$('#formCliente').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#cliId').value;
    const data = {
        nombre: $('#cliNombre').value.trim(),
        documento: $('#cliDocumento').value.trim(),
        tipo: $('#cliTipo').value,
        contacto: $('#cliContacto').value.trim(),
        telefono: $('#cliTelefono').value.trim(),
        email: $('#cliEmail').value.trim(),
        direccion: $('#cliDireccion').value.trim()
    };

    if (id) {
        const c = findCliente(parseInt(id));
        Object.assign(c, data);
        toast(`✓ Cliente "${c.nombre}" actualizado`, 'success');
    } else {
        clientes.push({ id: nextClienteId++, ...data });
        toast(`✓ Cliente "${data.nombre}" agregado`, 'success');
    }
    closeModal('modalCliente');
    persistAndRender();
});

// Proveedor (crear/editar)
$('#formProveedor').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#provId').value;
    const data = {
        nombre: $('#provNombre').value.trim(),
        contacto: $('#provContacto').value.trim(),
        telefono: $('#provTelefono').value.trim(),
        email: $('#provEmail').value.trim(),
        direccion: $('#provDireccion').value.trim()
    };

    if (id) {
        const p = findProveedor(parseInt(id));
        Object.assign(p, data);
        toast(`✓ Proveedor "${p.nombre}" actualizado`, 'success');
    } else {
        proveedores.push({ id: nextProveedorId++, ...data });
        toast(`✓ Proveedor "${data.nombre}" agregado`, 'success');
    }
    closeModal('modalProveedor');
    persistAndRender();
});

// Categoría (crear/editar)
$('#formCategoria').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#catId').value;
    const nombre = $('#catNombre').value.trim();

    const duplicada = categorias.some(c =>
        c.nombre.toLowerCase() === nombre.toLowerCase() && String(c.id) !== id
    );
    if (duplicada) {
        toast(`✗ Ya existe una categoría llamada "${nombre}"`, 'error');
        return;
    }

    if (id) {
        const c = findCategoria(parseInt(id));
        const nombreAnterior = c.nombre;
        c.nombre = nombre;
        // Los productos guardan el nombre de la categoría como texto: si se
        // renombra, hay que actualizarlos para que no queden huérfanos
        if (nombreAnterior !== nombre) {
            productos.forEach(p => { if (p.categoria === nombreAnterior) p.categoria = nombre; });
        }
        toast(`✓ Categoría "${nombre}" actualizada`, 'success');
    } else {
        categorias.push({ id: nextCategoriaId++, nombre });
        toast(`✓ Categoría "${nombre}" agregada`, 'success');
    }
    closeModal('modalCategoria');
    persistAndRender();
});

// Unidad (crear/editar)
$('#formUnidad').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#uniId').value;
    const codigo = $('#uniCodigo').value.trim();
    const nombre = $('#uniNombre').value.trim();

    const duplicada = unidades.some(u =>
        u.codigo.toLowerCase() === codigo.toLowerCase() && String(u.id) !== id
    );
    if (duplicada) {
        toast(`✗ Ya existe una unidad con el código "${codigo}"`, 'error');
        return;
    }

    if (id) {
        const u = findUnidad(parseInt(id));
        const codigoAnterior = u.codigo;
        u.codigo = codigo;
        u.nombre = nombre;
        // Los productos guardan el código de la unidad como texto: si se
        // renombra, hay que actualizarlos para que no queden huérfanos
        if (codigoAnterior !== codigo) {
            productos.forEach(p => { if (p.unidad === codigoAnterior) p.unidad = codigo; });
        }
        toast(`✓ Unidad "${nombre}" actualizada`, 'success');
    } else {
        unidades.push({ id: nextUnidadId++, codigo, nombre });
        toast(`✓ Unidad "${nombre}" agregada`, 'success');
    }
    closeModal('modalUnidad');
    persistAndRender();
});

// Usuario (crear/editar)
$('#formUsuario').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#usrId').value;
    const nombre = $('#usrNombre').value.trim();
    const usuario = $('#usrUsuario').value.trim();
    const rol = $('#usrRol').value;
    const password = $('#usrPassword').value;

    const duplicado = usuarios.some(u =>
        u.usuario.toLowerCase() === usuario.toLowerCase() && String(u.id) !== id
    );
    if (duplicado) {
        toast(`✗ Ya existe un usuario con el nombre de usuario "${usuario}"`, 'error');
        return;
    }

    if (id) {
        // Editar: si no rellenó contraseña, se conserva la actual
        const u = usuarios.find(x => x.id === parseInt(id));
        if (u.rol === 'Administrador' && rol !== 'Administrador' && usuarios.filter(x => x.rol === 'Administrador').length === 1) {
            toast('✗ No se puede cambiar el rol: debe quedar al menos un Administrador en el sistema', 'error');
            return;
        }
        u.nombre = nombre;
        u.usuario = usuario;
        u.rol = rol;
        u.iniciales = initials(nombre);
        if (password) u.password = password;
        toast(`✓ Usuario "${nombre}" actualizado`, 'success');
    } else {
        if (!password) {
            toast('✗ Ingrese una contraseña para el nuevo usuario', 'error');
            return;
        }
        usuarios.push({ id: nextUsuarioId++, usuario, password, nombre, rol, iniciales: initials(nombre) });
        toast(`✓ Usuario "${nombre}" agregado`, 'success');
    }
    closeModal('modalUsuario');
    persistAndRender();
});

// ===================== FILTROS Y BÚSQUEDA =====================
$('#filterCategoria').addEventListener('change', renderInventario);

// Buscador propio de Inventario y el de la barra superior quedan sincronizados
// para que cualquiera de los dos funcione, sin importar cuál use el usuario
$('#invSearch').addEventListener('input', (e) => {
    $('#globalSearch').value = e.target.value;
    renderInventario();
});

$('#globalSearch').addEventListener('input', (e) => {
    if ($('#view-inventario').classList.contains('active')) {
        $('#invSearch').value = e.target.value;
        renderInventario();
    }
});

$('#ingSearch').addEventListener('input', renderIngresos);

$('#cajaDesde').addEventListener('change', renderFlujoCaja);
$('#cajaHasta').addEventListener('change', renderFlujoCaja);

// ===================== INICIALIZACIÓN =====================
// Pre-cargamos los inputs del login para que sea más fácil presentarlo
document.addEventListener('DOMContentLoaded', () => {
    $('#loginUser').value = 'admin';
    $('#loginPass').value = 'admin123';
    $('#loginUser').focus();
});

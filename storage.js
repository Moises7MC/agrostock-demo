/* ============================================================
   storage.js — Capa de persistencia con localStorage
   ============================================================
   Se encarga de:
   - Cargar datos al iniciar (si hay nada usa los de data.js)
   - Guardar automáticamente cada cambio
   - Exportar e importar respaldos
   ============================================================ */

const STORAGE_KEY = 'agrostock_data_v1';

// Convierte ventas del formato antiguo (1 producto por venta) al formato
// actual (varios productos por venta en "items"), para no romper datos
// que ya estén guardados en el localStorage de usuarios existentes.
function normalizeVentas(lista) {
    lista.forEach(v => {
        if (!v.items) {
            v.items = [{ productoId: v.productoId, cantidad: v.cantidad, precioUnit: v.precioUnit }];
            delete v.productoId;
            delete v.cantidad;
            delete v.precioUnit;
        }
        // Ventas registradas antes de que existiera la venta a crédito se
        // consideran al contado, sin abonos pendientes
        if (v.formaPago === undefined) v.formaPago = 'Contado';
        if (v.fechaPagoAcordada === undefined) v.fechaPagoAcordada = null;
        if (v.abonos === undefined) v.abonos = [];
    });
}

// Ingresos guardados antes de que existiera el control de lotes no traen
// numeroLote ni cantidadDisponible: se completan para que el FIFO de lotes
// no se rompa con datos viejos
function normalizeIngresos(lista) {
    lista.forEach(i => {
        if (i.cantidadDisponible === undefined) i.cantidadDisponible = i.cantidad;
        if (i.numeroLote === undefined) i.numeroLote = null;
        if (i.fechaVencimiento === undefined) i.fechaVencimiento = null;
        if (i.numeroFactura === undefined) i.numeroFactura = null;
    });
}

// Datos de demostración (los originales de data.js)
// Sirven como fallback cuando localStorage está vacío
const DEMO_DATA = {
    productos: null,
    proveedores: null,
    clientes: null,
    ingresos: null,
    ventas: null,
    categorias: null,
    unidades: null,
    facturas: null,
    usuarios: null,
    contadores: null
};

// ===================== CARGAR =====================
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data;
    } catch (err) {
        console.error('Error leyendo localStorage:', err);
        return null;
    }
}

// ===================== GUARDAR =====================
function saveToStorage() {
    try {
        const data = {
            productos,
            proveedores,
            clientes,
            ingresos,
            ventas,
            categorias,
            unidades,
            facturas,
            usuarios,
            contadores: {
                nextProductoId,
                nextIngresoId,
                nextVentaId,
                nextClienteId,
                nextProveedorId,
                nextBoleta,
                nextCategoriaId,
                nextUnidadId,
                nextFacturaId,
                nextUsuarioId
            },
            ultimaModificacion: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (err) {
        console.error('Error guardando en localStorage:', err);
        return false;
    }
}

// ===================== INICIALIZAR =====================
// Llamada UNA SOLA VEZ al cargar la app, antes de renderizar.
// Si hay datos en localStorage los aplica reemplazando los de demo.
function initStorage() {
    // Asegura que los propios datos de demostración (data.js) también
    // tengan los campos más nuevos, no solo los que vienen de localStorage
    normalizeVentas(ventas);

    // Guardamos los datos demo (de data.js) como respaldo
    DEMO_DATA.productos = JSON.parse(JSON.stringify(productos));
    DEMO_DATA.proveedores = JSON.parse(JSON.stringify(proveedores));
    DEMO_DATA.clientes = JSON.parse(JSON.stringify(clientes));
    DEMO_DATA.ingresos = JSON.parse(JSON.stringify(ingresos));
    DEMO_DATA.ventas = JSON.parse(JSON.stringify(ventas));
    DEMO_DATA.categorias = JSON.parse(JSON.stringify(categorias));
    DEMO_DATA.unidades = JSON.parse(JSON.stringify(unidades));
    DEMO_DATA.facturas = JSON.parse(JSON.stringify(facturas));
    DEMO_DATA.usuarios = JSON.parse(JSON.stringify(usuarios));
    DEMO_DATA.contadores = {
        nextProductoId, nextIngresoId, nextVentaId,
        nextClienteId, nextProveedorId, nextBoleta,
        nextCategoriaId, nextUnidadId, nextFacturaId, nextUsuarioId
    };

    const stored = loadFromStorage();
    if (!stored) {
        // Primera vez: guardamos los demo en localStorage para que ya queden persistidos
        saveToStorage();
        return false; // false = se usaron datos demo
    }

    // Reemplazar los arrays con los datos guardados
    // (mantenemos las MISMAS referencias modificando el contenido)
    productos.length = 0;
    productos.push(...(stored.productos || []));

    proveedores.length = 0;
    proveedores.push(...(stored.proveedores || []));

    clientes.length = 0;
    clientes.push(...(stored.clientes || []));

    ingresos.length = 0;
    ingresos.push(...(stored.ingresos || []));
    normalizeIngresos(ingresos);

    ventas.length = 0;
    ventas.push(...(stored.ventas || []));
    normalizeVentas(ventas);

    // Categorías y unidades: solo reemplazar si el respaldo ya las trae
    // (usuarios existentes que guardaron antes de que esto existiera
    // conservan las de data.js en vez de quedarse sin ninguna)
    if (stored.categorias && stored.categorias.length) {
        categorias.length = 0;
        categorias.push(...stored.categorias);
    }
    if (stored.unidades && stored.unidades.length) {
        unidades.length = 0;
        unidades.push(...stored.unidades);
    }
    if (stored.facturas && stored.facturas.length) {
        facturas.length = 0;
        facturas.push(...stored.facturas);
    }
    if (stored.usuarios && stored.usuarios.length) {
        usuarios.length = 0;
        usuarios.push(...stored.usuarios);
    }

    // Restaurar contadores
    if (stored.contadores) {
        nextProductoId = stored.contadores.nextProductoId || nextProductoId;
        nextIngresoId = stored.contadores.nextIngresoId || nextIngresoId;
        nextVentaId = stored.contadores.nextVentaId || nextVentaId;
        nextClienteId = stored.contadores.nextClienteId || nextClienteId;
        nextProveedorId = stored.contadores.nextProveedorId || nextProveedorId;
        nextBoleta = stored.contadores.nextBoleta || nextBoleta;
        nextCategoriaId = stored.contadores.nextCategoriaId || nextCategoriaId;
        nextUnidadId = stored.contadores.nextUnidadId || nextUnidadId;
        nextFacturaId = stored.contadores.nextFacturaId || nextFacturaId;
        nextUsuarioId = stored.contadores.nextUsuarioId || nextUsuarioId;
    }

    return true; // true = se cargaron datos guardados
}

// ===================== EXPORTAR RESPALDO =====================
function exportBackup() {
    const data = {
        productos,
        proveedores,
        clientes,
        ingresos,
        ventas,
        categorias,
        unidades,
        facturas,
        usuarios,
        contadores: {
            nextProductoId, nextIngresoId, nextVentaId,
            nextClienteId, nextProveedorId, nextBoleta,
            nextCategoriaId, nextUnidadId, nextFacturaId, nextUsuarioId
        },
        version: 'agrostock_v1',
        exportadoEn: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fecha = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `agrostock_respaldo_${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===================== IMPORTAR RESPALDO =====================
function importBackup(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.version || !data.version.startsWith('agrostock')) {
                    reject(new Error('El archivo no es un respaldo válido de AgroStock'));
                    return;
                }

                productos.length = 0;
                productos.push(...(data.productos || []));
                proveedores.length = 0;
                proveedores.push(...(data.proveedores || []));
                clientes.length = 0;
                clientes.push(...(data.clientes || []));
                ingresos.length = 0;
                ingresos.push(...(data.ingresos || []));
                normalizeIngresos(ingresos);
                ventas.length = 0;
                ventas.push(...(data.ventas || []));
                normalizeVentas(ventas);

                // Respaldos antiguos no traen categorías/unidades: si no vienen,
                // se conservan las que ya había en vez de dejar los selects vacíos
                if (data.categorias && data.categorias.length) {
                    categorias.length = 0;
                    categorias.push(...data.categorias);
                }
                if (data.unidades && data.unidades.length) {
                    unidades.length = 0;
                    unidades.push(...data.unidades);
                }
                if (data.facturas && data.facturas.length) {
                    facturas.length = 0;
                    facturas.push(...data.facturas);
                }
                if (data.usuarios && data.usuarios.length) {
                    usuarios.length = 0;
                    usuarios.push(...data.usuarios);
                }

                if (data.contadores) {
                    nextProductoId = data.contadores.nextProductoId;
                    nextIngresoId = data.contadores.nextIngresoId;
                    nextVentaId = data.contadores.nextVentaId;
                    nextClienteId = data.contadores.nextClienteId;
                    nextProveedorId = data.contadores.nextProveedorId;
                    nextBoleta = data.contadores.nextBoleta;
                    nextCategoriaId = data.contadores.nextCategoriaId || nextCategoriaId;
                    nextUnidadId = data.contadores.nextUnidadId || nextUnidadId;
                    nextFacturaId = data.contadores.nextFacturaId || nextFacturaId;
                    nextUsuarioId = data.contadores.nextUsuarioId || nextUsuarioId;
                }

                saveToStorage();
                resolve(true);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo el archivo'));
        reader.readAsText(file);
    });
}

// ===================== LIMPIAR TODO =====================
function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
    // Restaurar datos demo en memoria
    productos.length = 0;
    productos.push(...JSON.parse(JSON.stringify(DEMO_DATA.productos)));
    proveedores.length = 0;
    proveedores.push(...JSON.parse(JSON.stringify(DEMO_DATA.proveedores)));
    clientes.length = 0;
    clientes.push(...JSON.parse(JSON.stringify(DEMO_DATA.clientes)));
    ingresos.length = 0;
    ingresos.push(...JSON.parse(JSON.stringify(DEMO_DATA.ingresos)));
    ventas.length = 0;
    ventas.push(...JSON.parse(JSON.stringify(DEMO_DATA.ventas)));
    categorias.length = 0;
    categorias.push(...JSON.parse(JSON.stringify(DEMO_DATA.categorias)));
    unidades.length = 0;
    unidades.push(...JSON.parse(JSON.stringify(DEMO_DATA.unidades)));
    facturas.length = 0;
    facturas.push(...JSON.parse(JSON.stringify(DEMO_DATA.facturas)));
    usuarios.length = 0;
    usuarios.push(...JSON.parse(JSON.stringify(DEMO_DATA.usuarios)));

    nextProductoId = DEMO_DATA.contadores.nextProductoId;
    nextIngresoId = DEMO_DATA.contadores.nextIngresoId;
    nextVentaId = DEMO_DATA.contadores.nextVentaId;
    nextClienteId = DEMO_DATA.contadores.nextClienteId;
    nextProveedorId = DEMO_DATA.contadores.nextProveedorId;
    nextBoleta = DEMO_DATA.contadores.nextBoleta;
    nextCategoriaId = DEMO_DATA.contadores.nextCategoriaId;
    nextUnidadId = DEMO_DATA.contadores.nextUnidadId;
    nextFacturaId = DEMO_DATA.contadores.nextFacturaId;
    nextUsuarioId = DEMO_DATA.contadores.nextUsuarioId;

    saveToStorage();
}

// ===================== VACIAR (sin datos demo) =====================
function emptyAll() {
    productos.length = 0;
    proveedores.length = 0;
    clientes.length = 0;
    ingresos.length = 0;
    ventas.length = 0;
    categorias.length = 0;
    unidades.length = 0;
    facturas.length = 0;
    nextProductoId = 1;
    nextIngresoId = 1;
    nextVentaId = 1;
    nextClienteId = 1;
    nextProveedorId = 1;
    nextBoleta = 1;
    nextCategoriaId = 1;
    nextUnidadId = 1;
    nextFacturaId = 1;
    saveToStorage();
}

// ===================== INFO DE STORAGE =====================
function getStorageInfo() {
    const stored = loadFromStorage();
    if (!stored) return null;
    const sizeBytes = new Blob([JSON.stringify(stored)]).size;
    const sizeKB = (sizeBytes / 1024).toFixed(2);
    return {
        productos: stored.productos?.length || 0,
        proveedores: stored.proveedores?.length || 0,
        clientes: stored.clientes?.length || 0,
        ingresos: stored.ingresos?.length || 0,
        ventas: stored.ventas?.length || 0,
        categorias: stored.categorias?.length ?? categorias.length,
        unidades: stored.unidades?.length ?? unidades.length,
        ultimaModificacion: stored.ultimaModificacion,
        tamano: `${sizeKB} KB`
    };
}

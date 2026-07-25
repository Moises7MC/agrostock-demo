/* ============================================================
   data.js — Datos hardcodeados del sistema
   Más adelante esto se reemplaza por consultas a la BD
   ============================================================ */

// ---------- DATOS DEL NEGOCIO (para boletas/facturas) ----------
const negocio = {
    razonSocial: "Agroquímicos del Valle E.I.R.L.",
    ruc: "20578934561",
    direccion: "Av. La Libertad 234, Chepén, La Libertad",
    telefono: "+51 944 123 456",
    email: "ventas@agrovalle.pe",
    web: "www.agrovalle.pe"
};

// ---------- USUARIOS DEL SISTEMA ----------
const usuarios = [
    { id: 1, usuario: "admin", password: "admin123", nombre: "José Mendoza", rol: "Administrador", iniciales: "JM" },
    { id: 2, usuario: "vendedor", password: "vendedor123", nombre: "Ana Vargas", rol: "Vendedor", iniciales: "AV" }
];

// ---------- PROVEEDORES ----------
const proveedores = [
    { id: 1, nombre: "AgroQuímica del Norte SAC", contacto: "Carlos Vásquez", telefono: "+51 944 123 456", email: "ventas@agroquimicanorte.pe", direccion: "Av. Industrial 234, Trujillo" },
    { id: 2, nombre: "Bayer CropScience Perú", contacto: "María Fernández", telefono: "+51 987 654 321", email: "info@bayer.pe", direccion: "Av. Javier Prado 1234, Lima" },
    { id: 3, nombre: "Syngenta Perú", contacto: "Roberto Salinas", telefono: "+51 933 555 777", email: "contacto@syngenta.pe", direccion: "Av. La Marina 800, Lima" },
    { id: 4, nombre: "Farmagro S.A.", contacto: "Elena Rojas", telefono: "+51 922 333 444", email: "elena@farmagro.com.pe", direccion: "Calle Los Pinos 56, Chiclayo" }
];

// ---------- CLIENTES ----------
const clientes = [
    { id: 1, nombre: "Fundo San Lorenzo", documento: "20111222333", contacto: "Pedro Chávez", telefono: "+51 944 888 222", email: "pchavez@fsanlorenzo.pe", direccion: "Carretera Panamericana Km 685, Chepén", tipo: "Empresa" },
    { id: 2, nombre: "Agrícola Pampa Verde", documento: "20444555666", contacto: "Luisa Mendoza", telefono: "+51 933 777 111", email: "ventas@pampaverde.com", direccion: "Sector Pampa Verde s/n, Pacasmayo", tipo: "Empresa" },
    { id: 3, nombre: "Manuel Ramírez", documento: "44556677", contacto: "Manuel Ramírez", telefono: "+51 977 654 432", email: "manu.ramirez@gmail.com", direccion: "Calle Los Olivos 145, Chepén", tipo: "Particular" },
    { id: 4, nombre: "Cooperativa Valle Alto", documento: "20777888999", contacto: "Juan Quispe", telefono: "+51 955 432 198", email: "info@valleato.coop.pe", direccion: "Av. Principal 567, Guadalupe", tipo: "Cooperativa" },
    { id: 5, nombre: "Hacienda El Olivar", documento: "20999111222", contacto: "Sofía Torres", telefono: "+51 988 765 234", email: "storres@elolivar.pe", direccion: "Fundo El Olivar, San Pedro de Lloc", tipo: "Empresa" }
];

// ---------- CATEGORÍAS DE PRODUCTO ----------
const categorias = [
    { id: 1, nombre: "Herbicida" },
    { id: 2, nombre: "Insecticida" },
    { id: 3, nombre: "Fungicida" },
    { id: 4, nombre: "Fertilizante" }
];

// ---------- UNIDADES DE MEDIDA ----------
const unidades = [
    { id: 1, codigo: "L", nombre: "Litro" },
    { id: 2, codigo: "kg", nombre: "Kilogramo" },
    { id: 3, codigo: "unid", nombre: "Unidad" }
];

// ---------- PRODUCTOS ----------
const productos = [
    { id: 1, nombre: "Glifosato 48% SL", categoria: "Herbicida", unidad: "L", costo: 28.00, precio: 42.00, stock: 85, stockMin: 20, proveedorId: 1, codigo: "HERB-001", aplicaIgv: true },
    { id: 2, nombre: "Cipermetrina 25% EC", categoria: "Insecticida", unidad: "L", costo: 35.50, precio: 52.00, stock: 12, stockMin: 15, proveedorId: 2, codigo: "INS-002", aplicaIgv: true },
    { id: 3, nombre: "Mancozeb 80% WP", categoria: "Fungicida", unidad: "kg", costo: 22.00, precio: 35.00, stock: 64, stockMin: 25, proveedorId: 3, codigo: "FUN-003", aplicaIgv: true },
    { id: 4, nombre: "Urea 46% N", categoria: "Fertilizante", unidad: "kg", costo: 3.20, precio: 4.80, stock: 450, stockMin: 100, proveedorId: 1, codigo: "FERT-004", aplicaIgv: true },
    { id: 5, nombre: "Atrazina 50% SC", categoria: "Herbicida", unidad: "L", costo: 31.00, precio: 48.00, stock: 28, stockMin: 20, proveedorId: 4, codigo: "HERB-005", aplicaIgv: true },
    { id: 6, nombre: "Clorpirifós 48% EC", categoria: "Insecticida", unidad: "L", costo: 42.00, precio: 65.00, stock: 7, stockMin: 15, proveedorId: 2, codigo: "INS-006", aplicaIgv: true },
    { id: 7, nombre: "Sulfato de Cobre", categoria: "Fungicida", unidad: "kg", costo: 18.00, precio: 28.50, stock: 95, stockMin: 30, proveedorId: 3, codigo: "FUN-007", aplicaIgv: true },
    { id: 8, nombre: "Fosfato Diamónico (DAP)", categoria: "Fertilizante", unidad: "kg", costo: 4.50, precio: 6.80, stock: 320, stockMin: 80, proveedorId: 1, codigo: "FERT-008", aplicaIgv: true },
    { id: 9, nombre: "Paraquat 27.6% SL", categoria: "Herbicida", unidad: "L", costo: 38.00, precio: 58.00, stock: 18, stockMin: 20, proveedorId: 4, codigo: "HERB-009", aplicaIgv: true },
    { id: 10, nombre: "Abamectina 1.8% EC", categoria: "Insecticida", unidad: "L", costo: 95.00, precio: 145.00, stock: 22, stockMin: 10, proveedorId: 2, codigo: "INS-010", aplicaIgv: true },
    { id: 11, nombre: "Azoxistrobina 25% SC", categoria: "Fungicida", unidad: "L", costo: 110.00, precio: 165.00, stock: 8, stockMin: 12, proveedorId: 3, codigo: "FUN-011", aplicaIgv: true },
    { id: 12, nombre: "Cloruro de Potasio", categoria: "Fertilizante", unidad: "kg", costo: 3.80, precio: 5.50, stock: 280, stockMin: 100, proveedorId: 1, codigo: "FERT-012", aplicaIgv: true }
];

// ---------- INGRESOS (compras a proveedores) ----------
const ingresos = [
    { id: 1, fecha: "2026-04-22", productoId: 4, cantidad: 200, costoUnit: 3.20, proveedorId: 1, numeroLote: "L-0422A", cantidadDisponible: 200, fechaVencimiento: "2027-06-01", numeroFactura: "F001-2288" },
    { id: 2, fecha: "2026-04-21", productoId: 1, cantidad: 50, costoUnit: 28.00, proveedorId: 1, numeroLote: "L-0421A", cantidadDisponible: 50, fechaVencimiento: "2026-08-20", numeroFactura: null },
    { id: 3, fecha: "2026-04-20", productoId: 7, cantidad: 60, costoUnit: 18.00, proveedorId: 3, numeroLote: "L-0420A", cantidadDisponible: 60, fechaVencimiento: "2026-07-01", numeroFactura: null },
    { id: 4, fecha: "2026-04-19", productoId: 3, cantidad: 40, costoUnit: 22.00, proveedorId: 3, numeroLote: "L-0419A", cantidadDisponible: 40, fechaVencimiento: "2026-10-05", numeroFactura: "F002-0134" },
    { id: 5, fecha: "2026-04-18", productoId: 8, cantidad: 150, costoUnit: 4.50, proveedorId: 1, numeroLote: "L-0418A", cantidadDisponible: 150, fechaVencimiento: "2027-08-01", numeroFactura: null },
    { id: 6, fecha: "2026-04-15", productoId: 10, cantidad: 15, costoUnit: 95.00, proveedorId: 2, numeroLote: "L-0415A", cantidadDisponible: 15, fechaVencimiento: "2026-09-15", numeroFactura: null },
    { id: 7, fecha: "2026-04-12", productoId: 12, cantidad: 200, costoUnit: 3.80, proveedorId: 1, numeroLote: "L-0412A", cantidadDisponible: 200, fechaVencimiento: "2028-01-10", numeroFactura: null }
];

// ---------- FACTURAS DE PROVEEDORES (compras a crédito, pagadas en letras) ----------
const facturas = [
    {
        id: 1, numeroFactura: "F001-2288", proveedorId: 1, fecha: "2026-04-20", montoTotal: 15000,
        letras: [
            { numero: 1, monto: 2500, fechaVencimiento: "2026-05-20", pagada: true, fechaPago: "2026-05-20" },
            { numero: 2, monto: 2500, fechaVencimiento: "2026-06-20", pagada: true, fechaPago: "2026-06-20" },
            { numero: 3, monto: 2500, fechaVencimiento: "2026-07-20", pagada: false, fechaPago: null },
            { numero: 4, monto: 2500, fechaVencimiento: "2026-08-20", pagada: false, fechaPago: null },
            { numero: 5, monto: 2500, fechaVencimiento: "2026-09-20", pagada: false, fechaPago: null },
            { numero: 6, monto: 2500, fechaVencimiento: "2026-10-20", pagada: false, fechaPago: null }
        ]
    },
    {
        id: 2, numeroFactura: "F002-0134", proveedorId: 3, fecha: "2026-06-01", montoTotal: 6000,
        letras: [
            { numero: 1, monto: 2000, fechaVencimiento: "2026-07-01", pagada: true, fechaPago: "2026-07-01" },
            { numero: 2, monto: 2000, fechaVencimiento: "2026-08-01", pagada: false, fechaPago: null },
            { numero: 3, monto: 2000, fechaVencimiento: "2026-09-01", pagada: false, fechaPago: null }
        ]
    }
];

// ---------- VENTAS ----------
// Cada venta puede incluir varios productos en "items" (una sola boleta, N líneas)
const ventas = [
    { id: 1, numBoleta: "B001-00001", fecha: "2026-04-24", clienteId: 1, items: [
        { productoId: 1, cantidad: 15, precioUnit: 42.00 },
        { productoId: 8, cantidad: 20, precioUnit: 6.80 }
    ], formaPago: "Crédito", fechaPagoAcordada: "2026-09-24", abonos: [
        { fecha: "2026-06-15", monto: 400 }
    ] },
    { id: 2, numBoleta: "B001-00002", fecha: "2026-04-24", clienteId: 2, items: [
        { productoId: 4, cantidad: 50, precioUnit: 4.80 }
    ] },
    { id: 3, numBoleta: "B001-00003", fecha: "2026-04-23", clienteId: 4, items: [
        { productoId: 3, cantidad: 8, precioUnit: 35.00 }
    ] },
    { id: 4, numBoleta: "B001-00004", fecha: "2026-04-23", clienteId: 3, items: [
        { productoId: 7, cantidad: 12, precioUnit: 28.50 },
        { productoId: 5, cantidad: 5, precioUnit: 48.00 }
    ] },
    { id: 5, numBoleta: "B001-00005", fecha: "2026-04-22", clienteId: 1, items: [
        { productoId: 8, cantidad: 80, precioUnit: 6.80 }
    ] },
    { id: 6, numBoleta: "B001-00006", fecha: "2026-04-22", clienteId: 5, items: [
        { productoId: 2, cantidad: 6, precioUnit: 52.00 }
    ] },
    { id: 7, numBoleta: "B001-00007", fecha: "2026-04-21", clienteId: 2, items: [
        { productoId: 10, cantidad: 4, precioUnit: 145.00 },
        { productoId: 12, cantidad: 25, precioUnit: 5.50 }
    ], formaPago: "Crédito", fechaPagoAcordada: "2026-08-10", abonos: [] },
    { id: 8, numBoleta: "B001-00008", fecha: "2026-04-21", clienteId: 4, items: [
        { productoId: 5, cantidad: 10, precioUnit: 48.00 }
    ] },
    { id: 9, numBoleta: "B001-00009", fecha: "2026-04-20", clienteId: 1, items: [
        { productoId: 12, cantidad: 60, precioUnit: 5.50 }
    ], formaPago: "Crédito", fechaPagoAcordada: "2026-07-01", abonos: [
        { fecha: "2026-06-28", monto: 330 }
    ] },
    { id: 10, numBoleta: "B001-00010", fecha: "2026-04-19", clienteId: 3, items: [
        { productoId: 6, cantidad: 5, precioUnit: 65.00 }
    ] },
    // Ventas históricas para que los gráficos se vean ricos
    { id: 11, numBoleta: "B001-00011", fecha: "2026-03-28", clienteId: 2, items: [
        { productoId: 1, cantidad: 25, precioUnit: 42.00 }
    ] },
    { id: 12, numBoleta: "B001-00012", fecha: "2026-03-15", clienteId: 1, items: [
        { productoId: 4, cantidad: 100, precioUnit: 4.80 }
    ] },
    { id: 13, numBoleta: "B001-00013", fecha: "2026-03-10", clienteId: 4, items: [
        { productoId: 8, cantidad: 60, precioUnit: 6.80 }
    ] },
    { id: 14, numBoleta: "B001-00014", fecha: "2026-02-22", clienteId: 5, items: [
        { productoId: 3, cantidad: 15, precioUnit: 35.00 }
    ] },
    { id: 15, numBoleta: "B001-00015", fecha: "2026-02-10", clienteId: 1, items: [
        { productoId: 1, cantidad: 30, precioUnit: 42.00 }
    ] },
    { id: 16, numBoleta: "B001-00016", fecha: "2026-01-25", clienteId: 2, items: [
        { productoId: 7, cantidad: 20, precioUnit: 28.50 }
    ] },
    { id: 17, numBoleta: "B001-00017", fecha: "2026-01-12", clienteId: 4, items: [
        { productoId: 4, cantidad: 80, precioUnit: 4.80 }
    ] },
    { id: 18, numBoleta: "B001-00018", fecha: "2025-12-20", clienteId: 1, items: [
        { productoId: 10, cantidad: 6, precioUnit: 145.00 }
    ] },
    { id: 19, numBoleta: "B001-00019", fecha: "2025-12-05", clienteId: 3, items: [
        { productoId: 1, cantidad: 18, precioUnit: 42.00 }
    ] },
    { id: 20, numBoleta: "B001-00020", fecha: "2025-11-28", clienteId: 5, items: [
        { productoId: 8, cantidad: 90, precioUnit: 6.80 }
    ] }
];

// Contadores para nuevos IDs
let nextProductoId = productos.length + 1;
let nextIngresoId = ingresos.length + 1;
let nextVentaId = ventas.length + 1;
let nextClienteId = clientes.length + 1;
let nextProveedorId = proveedores.length + 1;
let nextBoleta = ventas.length + 1;
let nextCategoriaId = categorias.length + 1;
let nextUnidadId = unidades.length + 1;
let nextFacturaId = facturas.length + 1;
let nextUsuarioId = usuarios.length + 1;

// Usuario actualmente logueado
let currentUser = null;

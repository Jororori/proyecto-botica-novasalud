import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

function App() {
  const [tab, setTab] = useState('inventario'); // 'inventario', 'ventas', 'alertas', 'historial'

  // Datos principales
  const [productosList, setProductosList] = useState([]);
  const [alertasList, setAlertasList] = useState([]);
  const [ventasList, setVentasList] = useState([]);
  const [dashboard, setDashboard] = useState({
    total_productos: 0,
    total_alertas: 0,
    ventas_hoy: 0,
    ingresos_hoy: 0
  });

  // Formulario Inventario (Registro / Edición)
  const [id, setId] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stockActual, setStockActual] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [editar, setEditar] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Formulario Punto de Venta (POS)
  const [carrito, setCarrito] = useState([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [filtroPOS, setFiltroPOS] = useState('');

  // Modal Detalle de Venta
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [detalleItems, setDetalleItems] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  const verDetalleVenta = (venta) => {
    setVentaSeleccionada(venta);
    setDetalleItems([]);
    setCargandoDetalle(true);
    axios
      .get(`${API_URL}/ventas/${venta.id}/detalle`)
      .then((res) => {
        setDetalleItems(res.data);
        setCargandoDetalle(false);
      })
      .catch((err) => {
        console.error(err);
        setCargandoDetalle(false);
        Swal.fire('Error', 'No se pudo obtener el detalle de los medicamentos vendidos', 'error');
      });
  };

  const cerrarDetalleVenta = () => {
    setVentaSeleccionada(null);
    setDetalleItems([]);
  };

  // Cargar datos
  const cargarTodo = () => {
    axios.get(`${API_URL}/productos`).then((res) => setProductosList(res.data)).catch(console.error);
    axios.get(`${API_URL}/alertas/bajo-stock`).then((res) => setAlertasList(res.data)).catch(console.error);
    axios.get(`${API_URL}/ventas`).then((res) => setVentasList(res.data)).catch(console.error);
    axios.get(`${API_URL}/dashboard`).then((res) => setDashboard(res.data)).catch(console.error);
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // ==========================================
  // FUNCIONES DE INVENTARIO
  // ==========================================
  const limpiarFormulario = () => {
    setId('');
    setCodigoBarras('');
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setStockActual('');
    setStockMinimo('');
    setFechaVencimiento('');
    setEditar(false);
  };

  const guardarProducto = (e) => {
    e.preventDefault();
    if (!nombre || !precio || !stockActual) {
      Swal.fire('Atención', 'Nombre, precio y stock son campos obligatorios.', 'warning');
      return;
    }

    const payload = {
      codigo_barras: codigoBarras,
      nombre,
      descripcion,
      precio: parseFloat(precio),
      stock_actual: parseInt(stockActual),
      stock_minimo: parseInt(stockMinimo || 5),
      fecha_vencimiento: fechaVencimiento || null
    };

    if (editar) {
      axios.put(`${API_URL}/productos/${id}`, payload).then(() => {
        cargarTodo();
        limpiarFormulario();
        Swal.fire('¡Actualizado!', 'El medicamento ha sido actualizado con éxito.', 'success');
      }).catch(console.error);
    } else {
      axios.post(`${API_URL}/productos`, payload).then(() => {
        cargarTodo();
        limpiarFormulario();
        Swal.fire('¡Registrado!', 'Medicamento añadido al inventario.', 'success');
      }).catch(console.error);
    }
  };

  const prepararEdicion = (val) => {
    setEditar(true);
    setId(val.id);
    setCodigoBarras(val.codigo_barras || '');
    setNombre(val.nombre || '');
    setDescripcion(val.descripcion || '');
    setPrecio(val.precio || '');
    setStockActual(val.stock_actual || '');
    setStockMinimo(val.stock_minimo || '');
    setFechaVencimiento(val.fecha_vencimiento ? val.fecha_vencimiento.substring(0, 10) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarProducto = (val) => {
    Swal.fire({
      title: '¿Eliminar medicamento?',
      text: `Se borrará "${val.nombre}" del catálogo.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`${API_URL}/productos/${val.id}`).then(() => {
          cargarTodo();
          Swal.fire('Eliminado', 'El medicamento fue retirado del sistema.', 'success');
        }).catch(console.error);
      }
    });
  };

  // ==========================================
  // FUNCIONES DE VENTAS (POS)
  // ==========================================
  const agregarAlCarrito = (producto) => {
    if (producto.stock_actual <= 0) {
      Swal.fire('Sin existencias', 'Este medicamento está agotado.', 'error');
      return;
    }

    const itemExistente = carrito.find((item) => item.id === producto.id);
    if (itemExistente) {
      if (itemExistente.cantidad >= producto.stock_actual) {
        Swal.fire('Límite de Stock', `Solo hay ${producto.stock_actual} unidades disponibles.`, 'warning');
        return;
      }
      setCarrito(carrito.map((item) =>
        item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(carrito.map((item) => {
      if (item.id === id) {
        const nuevaCant = item.cantidad + delta;
        if (nuevaCant <= 0) return null;
        if (nuevaCant > item.stock_actual) {
          Swal.fire('Límite de Stock', `Máximo stock: ${item.stock_actual}`, 'warning');
          return item;
        }
        return { ...item, cantidad: nuevaCant };
      }
      return item;
    }).filter(Boolean));
  };

  const quitarDelCarrito = (id) => {
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  const totalVenta = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const procesarVenta = () => {
    if (carrito.length === 0) {
      Swal.fire('Carrito Vacío', 'Agrega medicamentos antes de cobrar.', 'info');
      return;
    }

    axios.post(`${API_URL}/ventas`, {
      cliente_nombre: clienteNombre || 'Cliente General',
      cliente_dni: clienteDni || '',
      metodo_pago: metodoPago,
      total: totalVenta,
      items: carrito
    }).then(() => {
      setCarrito([]);
      setClienteNombre('');
      setClienteDni('');
      cargarTodo();
      Swal.fire({
        title: '¡Venta Realizada con Éxito!',
        text: `Total cobrado: S/. ${totalVenta.toFixed(2)}. Stock actualizado en tiempo real.`,
        icon: 'success'
      });
    }).catch((err) => {
      Swal.fire('Error', 'No se pudo procesar la venta.', 'error');
      console.error(err);
    });
  };

  // Filtros de búsqueda
  const productosFiltrados = productosList.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.includes(busqueda))
  );

  const productosPOS = productosList.filter((p) =>
    p.nombre.toLowerCase().includes(filtroPOS.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.includes(filtroPOS))
  );

  return (
    <div className="pb-5">
      {/* Barra de Navegación Superior */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 px-4 shadow-sm">
        <div className="container-fluid">
          <div className="navbar-brand-custom text-white">
            <span className="brand-icon">
              <i className="bi bi-capsule-pill"></i>
            </span>
            <div>
              <div className="h5 mb-0 fw-bold">Botica Nova Salud</div>
              <small className="text-secondary">Gestión de Inventario y Ventas</small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary px-3 py-2 rounded-pill">
              <i className="bi bi-clock me-1"></i> En Línea (Docker)
            </span>
          </div>
        </div>
      </nav>

      <div className="container my-4">
        {/* KPI Dashboard Cards */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card stat-card p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-semibold">TOTAL PRODUCTOS</div>
                  <h3 className="fw-bold mb-0 text-dark">{dashboard.total_productos}</h3>
                </div>
                <div className="stat-icon bg-primary bg-opacity-10 text-primary">
                  <i className="bi bi-box-seam"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card stat-card p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-semibold">ALERTAS BAJO STOCK</div>
                  <h3 className="fw-bold mb-0 text-danger">{dashboard.total_alertas}</h3>
                </div>
                <div className="stat-icon bg-danger bg-opacity-10 text-danger">
                  <i className="bi bi-exclamation-triangle"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card stat-card p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-semibold">VENTAS DE HOY</div>
                  <h3 className="fw-bold mb-0 text-success">{dashboard.ventas_hoy}</h3>
                </div>
                <div className="stat-icon bg-success bg-opacity-10 text-success">
                  <i className="bi bi-cart-check"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card stat-card p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-semibold">INGRESOS DE HOY</div>
                  <h3 className="fw-bold mb-0 text-info">S/. {Number(dashboard.ingresos_hoy).toFixed(2)}</h3>
                </div>
                <div className="stat-icon bg-info bg-opacity-10 text-info">
                  <i className="bi bi-cash-stack"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Menú de Pestañas */}
        <ul className="nav nav-pills mb-4 bg-white p-2 rounded-3 shadow-sm">
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'inventario' ? 'active' : ''}`}
              onClick={() => setTab('inventario')}
            >
              <i className="bi bi-boxes me-2"></i> Inventario & Medicamentos
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'ventas' ? 'active' : ''}`}
              onClick={() => setTab('ventas')}
            >
              <i className="bi bi-shop me-2"></i> Punto de Venta (POS)
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'alertas' ? 'active' : ''}`}
              onClick={() => setTab('alertas')}
            >
              <i className="bi bi-bell me-2"></i> Alertas de Reposición ({alertasList.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'historial' ? 'active' : ''}`}
              onClick={() => setTab('historial')}
            >
              <i className="bi bi-receipt me-2"></i> Historial de Ventas
            </button>
          </li>
        </ul>

        {/* ==================================================== */}
        {/* PESTAÑA 1: GESTIÓN DE INVENTARIO                     */}
        {/* ==================================================== */}
        {tab === 'inventario' && (
          <div>
            {/* Formulario Estilizado */}
            <div className="card card-custom mb-4">
              <div className="card-header-custom">
                <span>
                  <i className="bi bi-pencil-square text-primary me-2"></i>
                  {editar ? 'Editar Medicamento' : 'Registrar Nuevo Medicamento en Farmacia'}
                </span>
                {editar && (
                  <button className="btn btn-sm btn-outline-secondary" onClick={limpiarFormulario}>
                    Cancelar edición
                  </button>
                )}
              </div>
              <div className="card-body p-4">
                <form onSubmit={guardarProducto}>
                  <div className="row g-3">
                    <div className="col-md-3">
                      <label className="form-label small fw-bold">Código de Barras</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej. 7750001001"
                        value={codigoBarras}
                        onChange={(e) => setCodigoBarras(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Nombre del Medicamento *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej. Amoxicilina 500mg"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-bold">Precio Unitario (S/.) *</label>
                      <input
                        type="number"
                        step="0.10"
                        className="form-control"
                        placeholder="0.00"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Presentación / Descripción</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej. Caja x 30 cápsulas"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small fw-bold">Stock Actual *</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0"
                        value={stockActual}
                        onChange={(e) => setStockActual(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small fw-bold">Stock Mínimo (Alerta)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="5"
                        value={stockMinimo}
                        onChange={(e) => setStockMinimo(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small fw-bold">Vencimiento</label>
                      <input
                        type="date"
                        className="form-control"
                        value={fechaVencimiento}
                        onChange={(e) => setFechaVencimiento(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 text-end">
                    {editar ? (
                      <div>
                        <button type="button" className="btn btn-secondary me-2" onClick={limpiarFormulario}>
                          Descartar
                        </button>
                        <button type="submit" className="btn btn-warning px-4 fw-bold">
                          <i className="bi bi-check2-circle me-1"></i> Guardar Cambios
                        </button>
                      </div>
                    ) : (
                      <button type="submit" className="btn btn-primary px-4 fw-bold">
                        <i className="bi bi-plus-circle me-1"></i> Registrar Medicamento
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Listado con Filtro de Búsqueda */}
            <div className="card card-custom">
              <div className="card-header-custom">
                <span className="fw-bold">Catálogo de Medicamentos</span>
                <div className="w-50">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Buscar por nombre o código..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-custom table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Medicamento</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Estado</th>
                      <th>Vencimiento</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">
                          No se encontraron medicamentos en el inventario.
                        </td>
                      </tr>
                    ) : (
                      productosFiltrados.map((item) => {
                        const esBajoStock = item.stock_actual <= item.stock_minimo;
                        return (
                          <tr key={item.id}>
                            <td>
                              <span className="badge bg-light text-dark font-monospace">
                                {item.codigo_barras || 'S/C'}
                              </span>
                            </td>
                            <td>
                              <div className="fw-bold text-dark">{item.nombre}</div>
                              <small className="text-muted">{item.descripcion || 'Sin detalle'}</small>
                            </td>
                            <td className="fw-bold text-primary">S/. {Number(item.precio).toFixed(2)}</td>
                            <td>
                              <span className={`fw-bold ${item.stock_actual === 0 ? 'text-danger' : 'text-dark'}`}>
                                {item.stock_actual} unid.
                              </span>
                            </td>
                            <td>
                              {item.stock_actual === 0 ? (
                                <span className="badge bg-dark">Agotado</span>
                              ) : esBajoStock ? (
                                <span className="badge bg-danger">Bajo Stock (Min: {item.stock_minimo})</span>
                              ) : (
                                <span className="badge bg-success">Abastecido</span>
                              )}
                            </td>
                            <td className="small text-muted">
                              {item.fecha_vencimiento ? item.fecha_vencimiento.substring(0, 10) : 'N/A'}
                            </td>
                            <td className="text-center">
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-outline-primary" onClick={() => prepararEdicion(item)}>
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button className="btn btn-outline-danger" onClick={() => eliminarProducto(item)}>
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* PESTAÑA 2: PUNTO DE VENTA (POS)                      */}
        {/* ==================================================== */}
        {tab === 'ventas' && (
          <div className="row g-4">
            {/* Columna Izquierda: Selección de Medicamentos */}
            <div className="col-lg-7">
              <div className="card card-custom h-100">
                <div className="card-header-custom">
                  <span><i className="bi bi-search text-primary me-2"></i> Seleccionar Medicamentos</span>
                  <div className="w-50">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Filtrar producto..."
                      value={filtroPOS}
                      onChange={(e) => setFiltroPOS(e.target.value)}
                    />
                  </div>
                </div>
                <div className="card-body p-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <div className="row g-2">
                    {productosPOS.map((prod) => (
                      <div className="col-md-6" key={prod.id}>
                        <div
                          className={`pos-product-item ${prod.stock_actual === 0 ? 'opacity-50' : ''}`}
                          onClick={() => agregarAlCarrito(prod)}
                        >
                          <div className="d-flex justify-content-between align-items-start">
                            <span className="fw-bold text-dark">{prod.nombre}</span>
                            <span className="badge bg-primary">S/. {Number(prod.precio).toFixed(2)}</span>
                          </div>
                          <small className="text-muted d-block">{prod.descripcion || 'Sin presentación'}</small>
                          <div className="mt-2 d-flex justify-content-between align-items-center">
                            <small className={`fw-semibold ${prod.stock_actual <= prod.stock_minimo ? 'text-danger' : 'text-success'}`}>
                              Stock: {prod.stock_actual} unid.
                            </small>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-0 px-2"
                              disabled={prod.stock_actual <= 0}
                            >
                              + Añadir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Boleta / Carrito de Venta */}
            <div className="col-lg-5">
              <div className="card card-custom">
                <div className="card-header-custom bg-light">
                  <span className="fw-bold"><i className="bi bi-cart3 text-success me-2"></i> Carrito de Atención</span>
                  <span className="badge bg-success rounded-pill">{carrito.length} artículos</span>
                </div>
                <div className="card-body p-3">
                  {/* Datos del Cliente */}
                  <div className="row g-2 mb-3">
                    <div className="col-7">
                      <label className="form-label small fw-bold">Cliente</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Nombre o Razón Social"
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                      />
                    </div>
                    <div className="col-5">
                      <label className="form-label small fw-bold">DNI / RUC</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Opcional"
                        value={clienteDni}
                        onChange={(e) => setClienteDni(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Tabla del Carrito */}
                  <div className="table-responsive border rounded-3 mb-3" style={{ maxHeight: '250px' }}>
                    <table className="table table-sm table-borderless mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Item</th>
                          <th className="text-center">Cant.</th>
                          <th className="text-end">Subtotal</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {carrito.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center py-4 text-muted small">
                              Haz clic en un medicamento para añadirlo.
                            </td>
                          </tr>
                        ) : (
                          carrito.map((item) => (
                            <tr key={item.id} className="border-bottom">
                              <td>
                                <div className="fw-semibold small">{item.nombre}</div>
                                <span className="text-muted small">S/. {Number(item.precio).toFixed(2)} c/u</span>
                              </td>
                              <td className="text-center align-middle">
                                <div className="d-flex align-items-center justify-content-center gap-1">
                                  <button
                                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                                    onClick={() => cambiarCantidad(item.id, -1)}
                                  >-</button>
                                  <span className="fw-bold px-1">{item.cantidad}</span>
                                  <button
                                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                                    onClick={() => cambiarCantidad(item.id, 1)}
                                  >+</button>
                                </div>
                              </td>
                              <td className="text-end align-middle fw-bold text-dark">
                                S/. {(item.precio * item.cantidad).toFixed(2)}
                              </td>
                              <td className="text-center align-middle">
                                <button
                                  className="btn btn-link text-danger p-0"
                                  onClick={() => quitarDelCarrito(item.id)}
                                >
                                  <i className="bi bi-x-circle"></i>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Método de pago */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Método de Pago</label>
                    <select
                      className="form-select form-select-sm"
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Yape / Plin">Yape / Plin</option>
                      <option value="Tarjeta Débito/Crédito">Tarjeta Débito/Crédito</option>
                    </select>
                  </div>

                  {/* Resumen Total y Botón */}
                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3 mb-3">
                    <span className="h5 mb-0 fw-bold">Total a Pagar:</span>
                    <span className="h4 mb-0 fw-bold text-success">S/. {totalVenta.toFixed(2)}</span>
                  </div>

                  <button
                    className="btn btn-success w-100 py-2 fw-bold shadow-sm"
                    disabled={carrito.length === 0}
                    onClick={procesarVenta}
                  >
                    <i className="bi bi-check-lg me-1"></i> Cobrar y Actualizar Stock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* PESTAÑA 3: ALERTAS DE REPOSICIÓN                    */}
        {/* ==================================================== */}
        {tab === 'alertas' && (
          <div className="card card-custom">
            <div className="card-header-custom bg-danger bg-opacity-10 text-danger">
              <span className="fw-bold">
                <i className="bi bi-exclamation-octagon-fill me-2"></i>
                Alertas Automáticas de Desabastecimiento ({alertasList.length} medicamentos críticos)
              </span>
            </div>
            <div className="card-body p-0 table-responsive">
              <table className="table table-custom table-hover mb-0">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Medicamento</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Estado de Riesgo</th>
                    <th>Acción Inmediata</th>
                  </tr>
                </thead>
                <tbody>
                  {alertasList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-success fw-bold">
                        🎉 ¡Excelente! No hay productos con riesgo de desabastecimiento.
                      </td>
                    </tr>
                  ) : (
                    alertasList.map((item) => (
                      <tr key={item.id}>
                        <td className="font-monospace">{item.codigo_barras || 'S/C'}</td>
                        <td>
                          <span className="fw-bold text-dark">{item.nombre}</span>
                          <small className="text-muted d-block">{item.descripcion}</small>
                        </td>
                        <td>
                          <span className="badge bg-danger fs-6 px-3">{item.stock_actual} unid.</span>
                        </td>
                        <td>{item.stock_minimo} unid.</td>
                        <td>
                          {item.stock_actual === 0 ? (
                            <span className="badge bg-dark">Agotado Total</span>
                          ) : (
                            <span className="badge bg-warning text-dark">Reposición Urgente</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              setTab('inventario');
                              prepararEdicion(item);
                            }}
                          >
                            <i className="bi bi-box-arrow-in-up me-1"></i> Reabastecer Stock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* PESTAÑA 4: HISTORIAL DE VENTAS                       */}
        {/* ==================================================== */}
        {tab === 'historial' && (
          <div className="card card-custom">
            <div className="card-header-custom">
              <span className="fw-bold"><i className="bi bi-clock-history text-primary me-2"></i> Comprobantes de Venta</span>
            </div>
            <div className="card-body p-0 table-responsive">
              <table className="table table-custom table-hover mb-0">
                <thead>
                  <tr>
                    <th>Nº Venta</th>
                    <th>Fecha y Hora</th>
                    <th>Cliente</th>
                    <th>DNI / Doc</th>
                    <th>Medicamentos Vendidos</th>
                    <th>Método</th>
                    <th>Total Cobrado</th>
                    <th className="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-muted">
                        Aún no se han registrado transacciones de venta.
                      </td>
                    </tr>
                  ) : (
                    ventasList.map((v) => (
                      <tr key={v.id}>
                        <td><span className="badge bg-light text-dark font-monospace">#{v.id}</span></td>
                        <td>{new Date(v.fecha).toLocaleString()}</td>
                        <td className="fw-semibold text-dark">{v.cliente_nombre}</td>
                        <td className="text-muted">{v.cliente_dni || '-'}</td>
                        <td style={{ maxWidth: '280px' }}>
                          <div className="text-truncate" title={v.productos_resumen || ''}>
                            <i className="bi bi-capsule text-primary me-1"></i>
                            <span className="text-dark small fw-semibold">{v.productos_resumen || 'Sin detalle'}</span>
                          </div>
                          <small className="text-muted d-block">{v.total_articulos} {v.total_articulos === 1 ? 'artículo' : 'artículos'}</small>
                        </td>
                        <td><span className="badge bg-secondary">{v.metodo_pago}</span></td>
                        <td className="fw-bold text-success">S/. {Number(v.total).toFixed(2)}</td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-primary fw-semibold"
                            onClick={() => verDetalleVenta(v)}
                            title="Ver detalle completo de los medicamentos vendidos"
                          >
                            <i className="bi bi-receipt me-1"></i> Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de Detalle de Venta */}
        {ventaSeleccionada && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1055 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content shadow border-0 rounded-4">
                <div className="modal-header bg-primary text-white rounded-top-4">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-receipt-cutoff me-2"></i>
                    Comprobante de Venta #{ventaSeleccionada.id}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={cerrarDetalleVenta}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  {/* Ficha resumen de la venta */}
                  <div className="row g-3 mb-4 p-3 bg-light rounded-3 border">
                    <div className="col-sm-6 col-md-4">
                      <span className="text-muted small d-block">CLIENTE</span>
                      <strong className="text-dark">{ventaSeleccionada.cliente_nombre || 'Cliente General'}</strong>
                      <div className="small text-secondary">Doc: {ventaSeleccionada.cliente_dni || '-'}</div>
                    </div>
                    <div className="col-sm-6 col-md-4">
                      <span className="text-muted small d-block">FECHA Y HORA</span>
                      <strong className="text-dark">{new Date(ventaSeleccionada.fecha).toLocaleString()}</strong>
                    </div>
                    <div className="col-sm-6 col-md-4">
                      <span className="text-muted small d-block">MÉTODO DE PAGO</span>
                      <span className="badge bg-secondary">{ventaSeleccionada.metodo_pago}</span>
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark mb-3">
                    <i className="bi bi-box-seam text-primary me-2"></i>
                    Medicamentos Vendidos:
                  </h6>

                  {cargandoDetalle ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status"></div>
                      <p className="text-muted mt-2 mb-0">Cargando productos vendidos...</p>
                    </div>
                  ) : detalleItems.length === 0 ? (
                    <div className="alert alert-warning text-center">
                      No se encontraron registros de detalle para esta venta.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Medicamento</th>
                            <th className="text-center">Código</th>
                            <th className="text-center">Cantidad</th>
                            <th className="text-end">Precio Unit.</th>
                            <th className="text-end">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalleItems.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td>{idx + 1}</td>
                              <td>
                                <div className="fw-bold text-dark">{item.producto_nombre}</div>
                                {item.categoria_nombre && (
                                  <small className="text-muted">{item.categoria_nombre}</small>
                                )}
                              </td>
                              <td className="text-center font-monospace small">{item.codigo_barras || '-'}</td>
                              <td className="text-center">
                                <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 fs-6">
                                  {item.cantidad}
                                </span>
                              </td>
                              <td className="text-end text-muted">S/. {Number(item.precio_unitario).toFixed(2)}</td>
                              <td className="text-end fw-bold text-dark">S/. {Number(item.subtotal).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="table-light">
                            <td colSpan="5" className="text-end fw-bold fs-6">TOTAL COBRADO:</td>
                            <td className="text-end fw-bold text-success fs-5">
                              S/. {Number(ventaSeleccionada.total).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer bg-light rounded-bottom-4">
                  <button type="button" className="btn btn-secondary px-4" onClick={cerrarDetalleVenta}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

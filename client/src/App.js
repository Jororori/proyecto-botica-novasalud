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

  // Formulario Inventario (Registro / Edici+¶n)
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

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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
      Swal.fire('Atenci+¶n', 'Nombre, precio y stock son campos obligatorios.', 'warning');
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
        Swal.fire('-ÌActualizado!', 'El medicamento ha sido actualizado con +Æxito.', 'success');
      }).catch(console.error);
    } else {
      axios.post(`${API_URL}/productos`, payload).then(() => {
        cargarTodo();
        limpiarFormulario();
        Swal.fire('-ÌRegistrado!', 'Medicamento a+¶adido al inventario.', 'success');
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
      title: '-+Eliminar medicamento?',
      text: `Se borrar+Ì "${val.nombre}" del cat+Ìlogo.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'S+°, eliminar',
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
      Swal.fire('Sin existencias', 'Este medicamento est+Ì agotado.', 'error');
      return;
    }

    const itemExistente = carrito.find((item) => item.id === producto.id);
    if (itemExistente) {
      if (itemExistente.cantidad >= producto.stock_actual) {
        Swal.fire('L+°mite de Stock', `Solo hay ${producto.stock_actual} unidades disponibles.`, 'warning');
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
          Swal.fire('L+°mite de Stock', `M+Ìximo stock: ${item.stock_actual}`, 'warning');
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
      Swal.fire('Carrito Vac+°o', 'Agrega medicamentos antes de cobrar.', 'info');
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
        title: '-ÌVenta Realizada con +Îxito!',
        text: `Total cobrado: S/. ${totalVenta.toFixed(2)}. Stock actualizado en tiempo real.`,
        icon: 'success'
      });
    }).catch((err) => {
      Swal.fire('Error', 'No se pudo procesar la venta.', 'error');
      console.error(err);
    });
  };

  // Filtros de b+¶squeda
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
      {/* Barra de Navegaci+¶n Superior */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 px-4 shadow-sm">
        <div className="container-fluid">
          <div className="navbar-brand-custom text-white">
            <span className="brand-icon">
              <i className="bi bi-capsule-pill"></i>
            </span>
            <div>
              <div className="h5 mb-0 fw-bold">Botica Nova Salud</div>
              <small className="text-secondary">Gesti+¶n de Inventario y Ventas</small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary px-3 py-2 rounded-pill">
              <i className="bi bi-clock me-1"></i> En L+°nea (Docker)
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

        {/* Men+¶ de Pesta+¶as */}
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
              <i className="bi bi-bell me-2"></i> Alertas de Reposici+¶n ({alertasList.length})
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
        {/* PESTA+ÊA 1: GESTI+ÙN DE INVENTARIO                     */}
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
                    Cancelar edici+¶n
                  </button>
                )}
              </div>
              <div className="card-body p-4">
                <form onSubmit={guardarProducto}>
                  <div className="row g-3">
                    <div className="col-md-3">
                      <label className="form-label small fw-bold">C+¶digo de Barras</label>
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
                      <label className="form-label small fw-bold">Presentaci+¶n / Descripci+¶n</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej. Caja x 30 c+Ìpsulas"
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
                      <label className="form-label small fw-bold">Stock M+°nimo (Alerta)</label>
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

            {/* Listado con Filtro de B+¶squeda */}
            <div className="card card-custom">
              <div className="card-header-custom">
                <span className="fw-bold">Cat+Ìlogo de Medicamentos</span>
                <div className="w-50">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Buscar por nombre o c+¶digo..."
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
                      <th>C+¶digo</th>
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
    </div>
  );
}

export default App;

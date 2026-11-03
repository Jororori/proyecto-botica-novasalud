import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

function App() {
  const [tab, setTab] = useState('inventario');
  const [dashboard, setDashboard] = useState({
    total_productos: 0,
    total_alertas: 0,
    ventas_hoy: 0,
    ingresos_hoy: 0
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    axios.get(`${API_URL}/dashboard`).then((res) => setDashboard(res.data)).catch(console.error);
  }, []);

  return (
    <div className="container-fluid py-4 px-md-5">
      {/* Header Corporativo */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div className="navbar-brand-custom">
          <span className="brand-icon">
            <i className="bi bi-capsule-pill fs-4"></i>
          </span>
          <div>
            <h2 className="mb-0 fw-bold text-primary">BOTICA NOVA SALUD</h2>
            <small className="text-muted">Sistema de Control Farmac+®utico y Punto de Venta</small>
          </div>
        </div>
      </div>

      {/* Dashboard KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card stat-card p-3 border-start border-primary border-4">
            <div className="d-flex align-items-center">
              <div className="stat-icon bg-primary bg-opacity-10 text-primary rounded-3 p-3 me-3">
                <i className="bi bi-box-seam fs-3"></i>
              </div>
              <div>
                <span className="text-muted small fw-semibold">Total Productos</span>
                <h3 className="mb-0 fw-bold">{dashboard.total_productos}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card stat-card p-3 border-start border-danger border-4">
            <div className="d-flex align-items-center">
              <div className="stat-icon bg-danger bg-opacity-10 text-danger rounded-3 p-3 me-3">
                <i className="bi bi-exclamation-triangle-fill fs-3"></i>
              </div>
              <div>
                <span className="text-muted small fw-semibold">Alertas Stock</span>
                <h3 className="mb-0 fw-bold text-danger">{dashboard.total_alertas}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card stat-card p-3 border-start border-success border-4">
            <div className="d-flex align-items-center">
              <div className="stat-icon bg-success bg-opacity-10 text-success rounded-3 p-3 me-3">
                <i className="bi bi-receipt fs-3"></i>
              </div>
              <div>
                <span className="text-muted small fw-semibold">Ventas Hoy</span>
                <h3 className="mb-0 fw-bold">{dashboard.ventas_hoy}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card stat-card p-3 border-start border-info border-4">
            <div className="d-flex align-items-center">
              <div className="stat-icon bg-info bg-opacity-10 text-info rounded-3 p-3 me-3">
                <i className="bi bi-cash-stack fs-3"></i>
              </div>
              <div>
                <span className="text-muted small fw-semibold">Ingresos Hoy</span>
                <h3 className="mb-0 fw-bold">S/. {parseFloat(dashboard.ingresos_hoy || 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

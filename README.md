# Botica Nova Salud - Sistema de Gestión de Inventario y Ventas

Sistema web para el control de inventario farmacéutico, ventas en mostrador (POS) y alertas automatizadas de reposición de bajo stock, desarrollado con arquitectura en contenedores Docker.

---

## 💻 Tecnologías Utilizadas
- **Frontend**: React (Hooks `useState`, `useEffect`), Bootstrap 5, Bootstrap Icons, SweetAlert2, Axios.
- **Backend**: Node.js, Express.js, CORS, MySQL2.
- **Base de Datos**: MySQL 8.0 con transacciones y llaves foráneas.
- **Despliegue**: Docker y Docker Compose.

---

## 🌟 Módulos Implementados

1. **Dashboard KPI**: Tarjetas en tiempo real con total de productos, alertas críticas de stock bajo, ventas e ingresos del día.
2. **Gestión de Inventario (CRUD)**:
   - Registro y edición de medicamentos con código de barras, precio, stock actual, stock mínimo y fecha de vencimiento.
   - Búsqueda en vivo por nombre o código de barras.
   - Eliminación interactiva con confirmación SweetAlert2.
3. **Punto de Venta (POS) & Atención al Cliente**:
   - Catálogo interactivo para añadir medicamentos al carrito con un clic.
   - Control de límite de existencias al agregar unidades.
   - Registro de datos del cliente (Nombre y DNI) y método de pago (Efectivo, Yape/Plin, Tarjeta).
   - **Descuento automático de stock** en la base de datos al confirmar la venta.
4. **Módulo de Alertas de Reposición**:
   - Panel visual filtrado con los medicamentos que alcanzaron o superaron el límite de `stock_minimo`.
   - Botón de acceso directo para reabastecimiento inmediato.
5. **Historial de Ventas**:
   - Registro y consulta de ventas con resumen visible de medicamentos y comprobante detallado con desglose de ítems, cantidades, precios unitarios y subtotales.

---

## 🚀 Instrucciones de Ejecución con Docker

### 1. Iniciar el sistema completo:
Abre una terminal en la carpeta raíz del proyecto y ejecuta:

```bash
docker compose up --build
```

### 2. Acceder a las aplicaciones:
- **Página Web (Frontend React)**: [http://localhost:3000](http://localhost:3000)
- **API REST (Backend Node.js)**: [http://localhost:3001/api/productos](http://localhost:3001/api/productos)
- **Base de Datos (MySQL)**: Puerto `3306` (Usuario: `root`, Contraseña: `rootpassword`, BD: `botica_novasalud`)

### 3. Detener los contenedores:
```bash
docker compose down
```

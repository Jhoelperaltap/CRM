# Ebenezer Tax Services CRM
## Manual del Administrador

**Versión:** 1.1
**Fecha:** Febrero 2026

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Gestión de Usuarios](#gestión-de-usuarios)
3. [Gestión de Departamentos](#gestión-de-departamentos)
4. [Roles y Permisos](#roles-y-permisos)
5. [Configuración del Sistema](#configuración-del-sistema)
6. [Auditoría y Seguridad](#auditoría-y-seguridad)
7. [Respaldos](#respaldos)

---

## Introducción

Como administrador del CRM de Ebenezer Tax Services, usted tiene acceso completo a todas las funcionalidades del sistema, incluyendo la gestión de usuarios, departamentos, roles y configuraciones.

### Panel de Administración

<!-- IMAGEN: Dashboard de administrador -->
**Figura 1:** Panel de control del administrador

---

## Gestión de Usuarios

### Ver Lista de Usuarios

1. Navegue a **Configuración** > **Usuarios**
2. Verá la lista de todos los usuarios del sistema

<!-- IMAGEN: Lista de usuarios -->
**Figura 2:** Lista de usuarios del sistema

### Crear Nuevo Usuario

1. Haga clic en **"Nuevo Usuario"**
2. Complete los campos:
   - **Nombre completo**
   - **Correo electrónico** (será el login)
   - **Rol asignado**
   - **Departamento** (opcional)
3. Haga clic en **"Crear"**
4. El usuario recibirá un correo con instrucciones

<!-- IMAGEN: Formulario de nuevo usuario -->
**Figura 3:** Formulario de creación de usuario

### Editar Usuario

1. Haga clic en el nombre del usuario
2. Modifique los campos necesarios:
   - Información personal
   - Rol
   - Departamento
   - Estado (activo/inactivo)
3. Guarde los cambios

<!-- IMAGEN: Formulario de edición de usuario -->
**Figura 4:** Edición de usuario

### Asignar Usuario a Departamento

1. Edite el usuario
2. Seleccione el departamento en el campo correspondiente
3. Guarde los cambios

El departamento asignado determina:
- Qué carpetas de documentos puede ver
- A qué equipo pertenece

---

## Gestión de Departamentos

Los departamentos organizan a los usuarios y los documentos de los clientes.

### Ver Departamentos

1. Navegue a **Configuración** > **Departamentos**
2. Verá la lista de departamentos

<!-- IMAGEN: Lista de departamentos -->
**Figura 5:** Lista de departamentos

### Departamentos Predefinidos

| Departamento | Código | Color | Icono |
|--------------|--------|-------|-------|
| Accounting | ACCT | Azul | Calculator |
| Payroll | PAY | Verde | DollarSign |
| Billing | BILL | Amarillo | Receipt |
| Audit | AUD | Rojo | FileSearch |
| Representation | REP | Púrpura | Scale |
| Client Visit | VISIT | Cyan | Users |

### Crear Nuevo Departamento

1. Haga clic en **"Nuevo Departamento"**
2. Complete los campos:
   - **Nombre:** Nombre del departamento
   - **Código:** Código corto (ej: ACCT)
   - **Color:** Color para identificación visual
   - **Icono:** Icono de Lucide (opcional)
   - **Descripción:** Descripción del departamento
3. Haga clic en **"Guardar"**

<!-- IMAGEN: Formulario de nuevo departamento -->
**Figura 6:** Crear nuevo departamento

### Editar Departamento

1. Haga clic en el nombre del departamento
2. Modifique los campos necesarios
3. Guarde los cambios

<!-- IMAGEN: Edición de departamento -->
**Figura 7:** Editar departamento

### Desactivar Departamento

1. Edite el departamento
2. Cambie **"Activo"** a **No**
3. Los usuarios del departamento no podrán ver sus carpetas

---

## Carpetas de Departamento por Cliente

### Concepto

Cada cliente (contacto o corporación) tiene carpetas organizadas por departamento:

```
Cliente: John Smith
├── Accounting/
│   ├── Tax Returns/
│   ├── Financial Statements/
│   └── Correspondence/
├── Payroll/
│   ├── W-2 Forms/
│   └── Payroll Reports/
├── Billing/
│   └── Invoices/
└── ...
```

<!-- IMAGEN: Árbol de carpetas de un cliente -->
**Figura 8:** Estructura de carpetas por departamento

### Inicializar Carpetas para un Cliente

1. Abra el contacto o corporación
2. Vaya a la pestaña **"Documentos"**
3. Haga clic en **"Inicializar Carpetas"**
4. Se crearán carpetas predeterminadas para cada departamento activo

<!-- IMAGEN: Botón de inicializar carpetas -->
**Figura 9:** Inicializar carpetas de departamento

### Crear Subcarpeta

1. En la vista de carpetas del cliente
2. Haga clic en el menú (⋮) de una carpeta
3. Seleccione **"Nueva Subcarpeta"**
4. Nombre la subcarpeta
5. Haga clic en **"Crear"**

<!-- IMAGEN: Crear subcarpeta -->
**Figura 10:** Crear nueva subcarpeta

### Permisos de Carpetas

| Rol | Acceso |
|-----|--------|
| **Admin** | Todas las carpetas de todos los departamentos |
| **Usuarios** | Solo carpetas de su propio departamento |

---

## Roles y Permisos

### Roles Predefinidos

| Rol | Contactos | Casos | Documentos | Reportes | Config |
|-----|-----------|-------|------------|----------|--------|
| Admin | CRUD | CRUD | CRUD | Ver/Export | Total |
| Manager | CRUD | CRUD | CRUD | Ver/Export | Limitado |
| Preparer | Ver/Edit | CRUD | CRUD | Ver | No |
| Receptionist | CRUD | Ver | Ver/Subir | No | No |

<!-- IMAGEN: Matriz de permisos por rol -->
**Figura 11:** Permisos por rol

### Crear Rol Personalizado

1. Vaya a **Configuración** > **Roles**
2. Haga clic en **"Nuevo Rol"**
3. Nombre el rol
4. Configure permisos por módulo:
   - **Ver:** Puede visualizar registros
   - **Crear:** Puede crear nuevos registros
   - **Editar:** Puede modificar registros
   - **Eliminar:** Puede eliminar registros
5. Guarde el rol

<!-- IMAGEN: Formulario de creación de rol -->
**Figura 12:** Crear rol personalizado

---

## Configuración del Sistema

### Configuración General

Navegue a **Configuración** > **General**:

- **Nombre de la Empresa:** Aparece en reportes y correos
- **Logo:** Imagen para documentos y portal
- **Zona Horaria:** Default para todo el sistema
- **Formato de Fecha:** MM/DD/YYYY o DD/MM/YYYY

<!-- IMAGEN: Configuración general -->
**Figura 13:** Configuración general del sistema

### Configuración de Correo

1. Vaya a **Configuración** > **Email**
2. Configure:
   - **SMTP Server:** Servidor de correo saliente
   - **Puerto:** 587 (TLS) o 465 (SSL)
   - **Usuario:** Cuenta de correo
   - **Contraseña:** Credenciales

<!-- IMAGEN: Configuración de email -->
**Figura 14:** Configuración de correo

---

## Auditoría y Seguridad

### Ver Logs de Auditoría

1. Vaya a **Configuración** > **Auditoría**
2. Filtre por:
   - Usuario
   - Acción (crear, editar, eliminar, ver)
   - Módulo
   - Rango de fechas
3. Exporte a CSV si necesita

<!-- IMAGEN: Logs de auditoría -->
**Figura 15:** Logs de auditoría

### Eventos Registrados

- Inicio/cierre de sesión
- Creación de registros
- Modificación de registros
- Eliminación de registros
- Acceso a documentos
- Cambios de configuración
- Intentos de acceso fallidos

### Configuración de Seguridad

Vaya a **Configuración** > **Seguridad**:

| Opción | Descripción |
|--------|-------------|
| Timeout de Sesión | Tiempo de inactividad (default: 30 min) |
| Sesiones Concurrentes | Permitir múltiples dispositivos |
| 2FA Obligatorio | Requerir autenticación de dos factores |
| IP Whitelist | Solo permitir IPs específicas |

<!-- IMAGEN: Configuración de seguridad -->
**Figura 16:** Configuración de seguridad

---

## Respaldos

### Respaldos Automáticos

El sistema realiza respaldos automáticos:
- **Base de datos:** Diario a las 2:00 AM
- **Documentos:** Semanal
- **Configuración:** Después de cada cambio

### Respaldo Manual

1. Vaya a **Configuración** > **Sistema** > **Respaldos**
2. Haga clic en **"Crear Respaldo Ahora"**
3. Descargue el archivo cuando esté listo

<!-- IMAGEN: Pantalla de respaldos -->
**Figura 17:** Gestión de respaldos

---

## Soporte

### Contacto

- **Email:** soporte@ebenezer-crm.com
- **Teléfono:** (XXX) XXX-XXXX
- **Horario:** Lunes a Viernes, 9:00 AM - 6:00 PM EST

---

**© 2026 Ebenezer Tax Services. Todos los derechos reservados.**

---

## Instrucciones para Generar PDF

Para convertir este documento a PDF con imágenes:

### Opción 1: Pandoc

```bash
pandoc MANUAL-PDF-ADMINISTRADOR.md -o MANUAL-ADMINISTRADOR.pdf --pdf-engine=wkhtmltopdf
```

### Opción 2: Visual Studio Code

1. Instalar extensión "Markdown PDF"
2. Abrir este archivo
3. Presionar Ctrl+Shift+P
4. Seleccionar "Markdown PDF: Export (pdf)"

### Agregar Imágenes

Reemplace cada comentario `<!-- IMAGEN -->` con:
```markdown
![Descripción](images/nombre-imagen.png)
```

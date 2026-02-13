# Manual del Administrador - Ebenezer Tax Services CRM

**Versión:** 1.0
**Fecha:** Febrero 2026
**Sistema:** CRM para Servicios de Impuestos

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Panel de Control](#panel-de-control)
4. [Gestión de Usuarios](#gestión-de-usuarios)
5. [Gestión de Roles y Permisos](#gestión-de-roles-y-permisos)
6. [Configuración del Sistema](#configuración-del-sistema)
7. [Gestión de Módulos](#gestión-de-módulos)
8. [Auditoría y Seguridad](#auditoría-y-seguridad)
9. [Reportes y Análisis](#reportes-y-análisis)
10. [Portal del Cliente](#portal-del-cliente)
11. [Configuración de IA](#configuración-de-ia)
12. [Respaldos y Mantenimiento](#respaldos-y-mantenimiento)

---

## Introducción

El CRM de Ebenezer Tax Services es un sistema integral diseñado para gestionar contactos, casos de impuestos, documentos, citas y comunicaciones con clientes. Como administrador, usted tiene acceso completo a todas las funcionalidades del sistema.

### Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| **Admin** | Acceso completo a todas las funcionalidades |
| **Manager** | Gestión de equipo y reportes |
| **Preparer** | Preparación de casos de impuestos |
| **Receptionist** | Atención al cliente y citas |

---

## Acceso al Sistema

### URL de Acceso
- **Sistema Web:** `https://[su-dominio]/`
- **API:** `https://[su-dominio]/api/v1/`
- **Documentación API:** `https://[su-dominio]/api/docs/`

### Primer Inicio de Sesión

1. Ingrese su correo electrónico registrado
2. Ingrese su contraseña
3. Si tiene 2FA habilitado, ingrese el código de su aplicación autenticadora

### Recuperación de Contraseña

1. Haga clic en "¿Olvidó su contraseña?"
2. Ingrese su correo electrónico
3. Revise su bandeja de entrada
4. Siga el enlace para crear nueva contraseña

---

## Panel de Control

### Dashboard Principal

El dashboard muestra métricas clave:

- **Casos Activos:** Número de casos en proceso
- **Casos Pendientes:** Casos sin asignar o en espera
- **Citas de Hoy:** Reuniones programadas
- **Tareas Pendientes:** Items por completar
- **Ingresos del Mes:** Resumen financiero

### Widgets Personalizables

1. Navegue a **Dashboard** → **Configurar**
2. Arrastre y suelte widgets
3. Configure el rango de fechas
4. Guarde la configuración

---

## Gestión de Usuarios

### Crear Nuevo Usuario

1. Vaya a **Configuración** → **Usuarios**
2. Haga clic en **"Nuevo Usuario"**
3. Complete los campos:
   - Nombre completo
   - Correo electrónico (será el login)
   - Rol asignado
   - Departamento (opcional)
4. Haga clic en **"Crear"**
5. El usuario recibirá un correo con instrucciones

### Editar Usuario

1. En la lista de usuarios, haga clic en el nombre
2. Modifique los campos necesarios
3. Haga clic en **"Guardar"**

### Desactivar Usuario

1. Abra el perfil del usuario
2. Cambie el estado a **"Inactivo"**
3. Confirme la acción

> **Nota:** Desactivar un usuario preserva su historial de actividades.

### Resetear Contraseña

1. Abra el perfil del usuario
2. Haga clic en **"Resetear Contraseña"**
3. El usuario recibirá un correo con instrucciones

### Gestión de Sesiones

1. Vaya a **Configuración** → **Seguridad**
2. Configure:
   - **Timeout de Sesión:** Tiempo de inactividad (default: 30 min)
   - **Sesiones Concurrentes:** Permitir múltiples dispositivos
   - **Bloqueo por Intentos:** Número de intentos fallidos

---

## Gestión de Roles y Permisos

### Roles Predefinidos

| Rol | Contactos | Casos | Documentos | Reportes | Configuración |
|-----|-----------|-------|------------|----------|---------------|
| Admin | CRUD | CRUD | CRUD | Ver/Exportar | Total |
| Manager | CRUD | CRUD | CRUD | Ver/Exportar | Limitado |
| Preparer | Ver/Editar | CRUD | CRUD | Ver | No |
| Receptionist | CRUD | Ver | Ver/Subir | No | No |

### Crear Rol Personalizado

1. Vaya a **Configuración** → **Roles**
2. Haga clic en **"Nuevo Rol"**
3. Nombre el rol
4. Configure permisos por módulo:
   - **Ver:** Puede visualizar registros
   - **Crear:** Puede crear nuevos registros
   - **Editar:** Puede modificar registros existentes
   - **Eliminar:** Puede eliminar registros
5. Guarde el rol

### Permisos por Módulo

Cada módulo tiene permisos granulares:

```
Módulo: Contactos
├── Puede ver lista de contactos
├── Puede ver detalle de contacto
├── Puede crear contactos
├── Puede editar contactos
├── Puede eliminar contactos
├── Puede importar CSV
└── Puede exportar CSV
```

---

## Configuración del Sistema

### Configuración General

Navegue a **Configuración** → **General**:

- **Nombre de la Empresa:** Aparece en reportes y correos
- **Logo:** Imagen para documentos y portal
- **Zona Horaria:** Default para todo el sistema
- **Formato de Fecha:** MM/DD/YYYY o DD/MM/YYYY
- **Moneda:** USD, EUR, etc.

### Configuración de Correo

Vaya a **Configuración** → **Email**:

1. **SMTP Server:** Servidor de correo saliente
2. **Puerto:** 587 (TLS) o 465 (SSL)
3. **Usuario:** Cuenta de correo
4. **Contraseña:** Credenciales
5. **Email de Sistema:** Dirección "from"

### Plantillas de Correo

1. Vaya a **Configuración** → **Plantillas**
2. Seleccione el tipo:
   - Bienvenida
   - Recordatorio de Cita
   - Notificación de Caso
   - Reseteo de Contraseña
3. Edite el contenido usando variables:
   - `{{contact.first_name}}` - Nombre del contacto
   - `{{appointment.date}}` - Fecha de cita
   - `{{case.number}}` - Número de caso

---

## Gestión de Módulos

### Módulos Disponibles

| Módulo | Descripción |
|--------|-------------|
| **Contactos** | Gestión de clientes y prospectos |
| **Corporaciones** | Empresas y entidades comerciales |
| **Casos** | Casos de impuestos y seguimiento |
| **Documentos** | Almacenamiento y gestión de archivos |
| **Citas** | Calendario y programación |
| **Tareas** | Asignación y seguimiento |
| **Emails** | Integración con correo |
| **Portal** | Acceso de clientes |
| **Cotizaciones** | Presupuestos y facturación |
| **Workflows** | Automatización de procesos |
| **Reportes** | Análisis y exportación |
| **Inventario** | Control de suministros |
| **E-Sign** | Firmas electrónicas |

### Habilitar/Deshabilitar Módulos

1. Vaya a **Configuración** → **Módulos**
2. Toggle para activar/desactivar
3. Los módulos desactivados no aparecen en navegación

---

## Auditoría y Seguridad

### Ver Logs de Auditoría

1. Vaya a **Configuración** → **Auditoría**
2. Filtre por:
   - Usuario
   - Acción (crear, editar, eliminar, ver)
   - Módulo
   - Rango de fechas
3. Exporte a CSV si necesita

### Tipos de Eventos Registrados

- Inicio/cierre de sesión
- Creación de registros
- Modificación de registros
- Eliminación de registros
- Acceso a documentos
- Cambios de configuración
- Intentos de acceso fallidos

### Gestión de IPs

#### Lista Blanca (Whitelist)
1. Vaya a **Configuración** → **Seguridad** → **IP Whitelist**
2. Agregue IPs permitidas
3. Active "Solo permitir IPs de lista blanca"

#### Lista Negra (Blacklist)
1. Vaya a **Configuración** → **Seguridad** → **IP Blacklist**
2. Agregue IPs a bloquear
3. Especifique razón y duración

### Configuración de 2FA

1. Vaya a **Configuración** → **Seguridad**
2. Active "Requerir 2FA para todos los usuarios"
3. Los usuarios configurarán en su próximo inicio de sesión

---

## Reportes y Análisis

### Reportes Disponibles

1. **Reporte de Casos**
   - Por estado
   - Por preparador
   - Por tipo de impuesto
   - Por período

2. **Reporte de Ingresos**
   - Por mes/trimestre/año
   - Por servicio
   - Por cliente

3. **Reporte de Productividad**
   - Casos por empleado
   - Tiempo promedio de resolución
   - Tareas completadas

4. **Reporte de Clientes**
   - Nuevos clientes
   - Retención
   - Valor de vida del cliente

### Generar Reporte

1. Vaya a **Reportes**
2. Seleccione tipo de reporte
3. Configure filtros y rango de fechas
4. Haga clic en **"Generar"**
5. Opciones de exportación: PDF, Excel, CSV

### Programar Reportes

1. En la pantalla del reporte, haga clic en **"Programar"**
2. Configure frecuencia (diario, semanal, mensual)
3. Agregue destinatarios de email
4. Active la programación

---

## Portal del Cliente

### Configuración del Portal

1. Vaya a **Configuración** → **Portal**
2. Configure:
   - Logo y colores
   - Módulos visibles para clientes
   - Permisos de subida de documentos

### Crear Acceso para Cliente

1. Abra el contacto
2. Vaya a la pestaña **"Portal"**
3. Haga clic en **"Crear Acceso"**
4. Se enviará email con credenciales

### Gestionar Accesos

1. Vaya a **Configuración** → **Portal** → **Usuarios**
2. Ver todos los accesos de portal
3. Puede desactivar o resetear contraseñas

---

## Configuración de IA

### Agente de IA

El sistema incluye un agente de IA que puede:
- Analizar emails y crear notas
- Enviar recordatorios de citas
- Monitorear tareas vencidas
- Generar insights de negocio

### Configurar Agente

1. Vaya a **Configuración** → **Agente IA**
2. Active/desactive funcionalidades:
   - Análisis de emails
   - Recordatorios automáticos
   - Monitoreo de tareas
   - Análisis de métricas
3. Configure nivel de autonomía:
   - **Manual:** Todas las acciones requieren aprobación
   - **Semi-automático:** Algunas acciones automáticas
   - **Automático:** Acciones sin aprobación

### Ver Actividad del Agente

1. Vaya a **Agente IA** → **Actividad**
2. Ver acciones pendientes de aprobación
3. Revisar insights generados
4. Aprobar o rechazar acciones

---

## Respaldos y Mantenimiento

### Respaldos Automáticos

El sistema realiza respaldos automáticos:
- **Base de datos:** Diario a las 2:00 AM
- **Documentos:** Semanal
- **Configuración:** Después de cada cambio

### Respaldo Manual

1. Vaya a **Configuración** → **Sistema** → **Respaldos**
2. Haga clic en **"Crear Respaldo Ahora"**
3. Descargue el archivo cuando esté listo

### Restaurar Respaldo

1. Contacte al equipo de IT
2. Proporcione el archivo de respaldo
3. Especifique qué restaurar:
   - Base de datos completa
   - Solo configuración
   - Archivos específicos

---

## Soporte

### Contacto de Soporte

- **Email:** soporte@ebenezer-crm.com
- **Teléfono:** (XXX) XXX-XXXX
- **Horario:** Lunes a Viernes, 9:00 AM - 6:00 PM EST

### Recursos Adicionales

- Manual de Usuario: `MANUAL-USUARIO.md`
- Manual Técnico: `MANUAL-TECNICO.md`
- Documentación API: `/api/docs/`

---

**© 2026 Ebenezer Tax Services. Todos los derechos reservados.**

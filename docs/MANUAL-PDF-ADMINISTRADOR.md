#  EJFLOW CRM
## Manual del Administrador

**Versión:** 2.0
**Fecha:** Febrero 2026

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Gestión de Usuarios](#gestión-de-usuarios)
3. [Gestión de Departamentos](#gestión-de-departamentos)
4. [Roles y Permisos](#roles-y-permisos)
5. [Estado del Cliente (Corporaciones)](#estado-del-cliente-corporaciones)
6. [Configuración del Sistema](#configuración-del-sistema)
7. [Configuración de Inteligencia Artificial](#configuración-de-inteligencia-artificial)
8. [Portal del Cliente](#portal-del-cliente)
9. [Auditoría y Seguridad](#auditoría-y-seguridad)
10. [Sistema de Respaldos](#sistema-de-respaldos)

---

## Introducción

Como administrador del CRM de EJFLOW Ebenezer, usted tiene acceso completo a todas las funcionalidades del sistema, incluyendo la gestión de usuarios, departamentos, roles y configuraciones.

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

## Estado del Cliente (Corporaciones)

El sistema de Estado del Cliente permite gestionar el ciclo de vida de cada corporación/empresa en el CRM. Esta funcionalidad es esencial para mantener un control preciso sobre el estado de cada cliente.

### Estados Disponibles

| Estado | Color | Descripción |
|--------|-------|-------------|
| **Active** | Verde | Cliente activo, operaciones normales |
| **Payment Pending** | Rojo | Pagos pendientes, requiere seguimiento |
| **Paid** | Verde | Pagos al día |
| **Paused** | Ámbar | Cliente pausado temporalmente |
| **Business Closed** | Rojo | Empresa cerrada permanentemente |

<!-- IMAGEN: Dropdown de estado del cliente -->
**Figura 13:** Selector de estado del cliente en el header

### Cambiar Estado de un Cliente

1. Abra la página de detalle de la corporación
2. En el header, junto al nombre, encontrará el **dropdown de estado**
3. Haga clic en el estado actual para ver las opciones
4. Seleccione el nuevo estado

<!-- IMAGEN: Opciones del dropdown de estado -->
**Figura 14:** Opciones del selector de estado

### Estados que Requieren Justificación

#### Cerrar una Empresa (Business Closed)

Cuando selecciona **"Business Closed"**, el sistema:

1. Muestra un diálogo de confirmación
2. Requiere una **nota obligatoria** explicando el motivo del cierre
3. Registra:
   - Quién cerró la empresa
   - Fecha y hora del cierre
   - Motivo del cierre

<!-- IMAGEN: Diálogo de cierre de empresa -->
**Figura 15:** Diálogo para cerrar una empresa

**Campos registrados:**
- `closure_reason`: Motivo del cierre
- `closed_at`: Fecha/hora del cierre
- `closed_by`: Usuario que realizó el cierre

#### Pausar una Empresa (Paused)

Cuando selecciona **"Paused"**, el sistema:

1. Muestra un diálogo de confirmación
2. Requiere una **nota obligatoria** explicando el motivo de la pausa
3. Registra:
   - Quién pausó la empresa
   - Fecha y hora de la pausa
   - Motivo de la pausa

<!-- IMAGEN: Diálogo de pausa de empresa -->
**Figura 16:** Diálogo para pausar una empresa

### Indicadores Visuales en la Lista

En la lista de corporaciones, los estados especiales se muestran con indicadores visuales:

| Estado | Indicador Visual |
|--------|------------------|
| Business Closed | Fondo rojo claro, icono ⛔, texto tachado |
| Paused | Fondo ámbar claro, icono ⏸️ |
| Payment Pending | Badge rojo |
| Paid | Badge verde |

<!-- IMAGEN: Lista de corporaciones con indicadores de estado -->
**Figura 17:** Indicadores de estado en la lista de corporaciones

### Advertencia al Acceder a Empresas Cerradas/Pausadas

Cuando un usuario accede a una corporación cerrada o pausada:

1. Se muestra un **modal de advertencia** indicando:
   - El estado actual de la empresa
   - El motivo del cierre/pausa
   - Quién realizó la acción y cuándo
2. El usuario debe hacer clic en "Continuar" para acceder

<!-- IMAGEN: Modal de advertencia de empresa cerrada -->
**Figura 18:** Modal de advertencia para empresas cerradas

### Banner Permanente

Además del modal inicial, las empresas cerradas o pausadas muestran un **banner permanente** en la parte superior de la página:

- **Empresas Cerradas:** Banner rojo con icono de advertencia
- **Empresas Pausadas:** Banner ámbar con icono de pausa

El banner incluye:
- Estado actual
- Motivo del cierre/pausa
- Nombre del usuario y fecha de la acción

<!-- IMAGEN: Banner de empresa cerrada -->
**Figura 19:** Banner de advertencia permanente

### Sistema de Notificaciones

Cuando un usuario accede a una empresa cerrada o pausada, el sistema **notifica automáticamente** a todos los managers y administradores.

La notificación incluye:
- Nombre de la empresa accedida
- Usuario que accedió
- Fecha y hora del acceso
- Estado de la empresa
- Motivo del cierre/pausa

Esto permite a los supervisores monitorear el acceso a clientes inactivos.

<!-- IMAGEN: Notificación de acceso a empresa cerrada -->
**Figura 20:** Notificación de acceso a empresa cerrada

### Reactivar una Empresa

Para reactivar una empresa cerrada o pausada:

1. Abra la página de detalle de la corporación
2. Haga clic en el selector de estado
3. Seleccione **"Active"**, **"Payment Pending"** o **"Paid"**
4. Los campos de cierre/pausa se limpian automáticamente

---

## Configuración del Sistema

### Configuración General

Navegue a **Configuración** > **General**:

- **Nombre de la Empresa:** Aparece en reportes y correos
- **Logo:** Imagen para documentos y portal
- **Zona Horaria:** Default para todo el sistema
- **Formato de Fecha:** MM/DD/YYYY o DD/MM/YYYY

<!-- IMAGEN: Configuración general -->
**Figura 21:** Configuración general del sistema

### Configuración de Correo

1. Vaya a **Configuración** > **Email**
2. Configure:
   - **SMTP Server:** Servidor de correo saliente
   - **Puerto:** 587 (TLS) o 465 (SSL)
   - **Usuario:** Cuenta de correo
   - **Contraseña:** Credenciales

<!-- IMAGEN: Configuración de email -->
**Figura 22:** Configuración de correo

---

## Configuración de Inteligencia Artificial

EJFLOW CRM integra capacidades de Inteligencia Artificial tanto en el chatbot del portal del cliente como en funcionalidades internas del sistema.

### Chatbot del Portal del Cliente

El chatbot asiste a los clientes en el portal con consultas sobre sus casos, documentos y estado de servicios.

#### Configuración del Chatbot

1. Navegue a **Configuración** > **IA** > **Chatbot**
2. Configure los siguientes parámetros:

| Parámetro | Descripción | Valor Recomendado |
|-----------|-------------|-------------------|
| **Modelo** | Modelo de IA a utilizar | GPT-4 / Claude 3 |
| **Temperatura** | Creatividad de respuestas (0-1) | 0.7 |
| **Max Tokens** | Longitud máxima de respuesta | 1000 |
| **Sistema Prompt** | Instrucciones base del asistente | Ver abajo |

<!-- IMAGEN: Configuración del chatbot -->
**Figura 23:** Panel de configuración del chatbot

#### Sistema Prompt Recomendado

```
Eres el asistente virtual de EJFLOW, una firma de servicios tributarios.
Tu rol es ayudar a los clientes con:
- Consultas sobre el estado de sus casos
- Información sobre documentos requeridos
- Preguntas frecuentes sobre servicios
- Programación de citas

Siempre sé profesional, amable y preciso. Si no conoces la respuesta,
indica que un representante se pondrá en contacto.

IMPORTANTE: No proporciones asesoría fiscal específica. Deriva esas
consultas al equipo profesional.
```

#### Contexto del Chatbot

El chatbot tiene acceso a:
- Información pública del cliente (nombre, casos activos)
- Estado de documentos pendientes
- Horarios de oficina
- Preguntas frecuentes configuradas

**El chatbot NO tiene acceso a:**
- Información financiera detallada
- Documentos confidenciales
- Datos de otros clientes
- Información de facturación

<!-- IMAGEN: Conversación de ejemplo del chatbot -->
**Figura 24:** Ejemplo de conversación con el chatbot

#### Personalización de Respuestas

1. Vaya a **Configuración** > **IA** > **Respuestas Predefinidas**
2. Agregue pares de pregunta-respuesta para consultas comunes:

| Pregunta | Respuesta |
|----------|-----------|
| "¿Cuál es el horario de oficina?" | "Nuestro horario es de Lunes a Viernes, 9:00 AM - 6:00 PM EST" |
| "¿Cómo subo un documento?" | "En su portal, haga clic en 'Documentos' y luego en 'Subir Documento'" |

### IA en la Aplicación Web (Staff)

La aplicación web utiliza IA para asistir al personal interno con diversas tareas.

#### Funcionalidades de IA Interna

| Funcionalidad | Descripción | Ubicación |
|---------------|-------------|-----------|
| **Resumen de Casos** | Genera resúmenes automáticos de casos complejos | Detalle del caso |
| **Borrador de Emails** | Sugiere respuestas a correos de clientes | Bandeja de entrada |
| **Análisis de Documentos** | Extrae información de documentos subidos | Vista de documento |
| **Búsqueda Semántica** | Búsqueda inteligente en toda la base de datos | Barra de búsqueda |

<!-- IMAGEN: Asistente de IA en la aplicación -->
**Figura 25:** Asistente de IA para el personal

#### Configuración de IA Interna

1. Navegue a **Configuración** > **IA** > **Asistente Interno**
2. Configure:

| Opción | Descripción |
|--------|-------------|
| **Habilitar IA** | Activa/desactiva funciones de IA |
| **Proveedor** | OpenAI / Anthropic / Azure |
| **API Key** | Clave de API del proveedor |
| **Modelo Preferido** | Modelo a usar para cada función |

<!-- IMAGEN: Configuración de IA interna -->
**Figura 26:** Configuración de IA interna

#### Claves de API

Para configurar la IA, necesita obtener claves de API de los proveedores:

**OpenAI:**
1. Visite https://platform.openai.com
2. Vaya a API Keys
3. Cree una nueva clave
4. Copie y pegue en la configuración

**Anthropic (Claude):**
1. Visite https://console.anthropic.com
2. Vaya a API Keys
3. Cree una nueva clave
4. Copie y pegue en la configuración

**Importante:** Las claves de API se almacenan encriptadas. Nunca las comparta.

#### Límites y Costos

Configure límites para controlar costos:

| Parámetro | Descripción | Valor Sugerido |
|-----------|-------------|----------------|
| **Límite Diario** | Máximo de consultas por día | 1000 |
| **Límite por Usuario** | Máximo por usuario/hora | 50 |
| **Alerta de Gasto** | Notificar al alcanzar $ | $100 |

<!-- IMAGEN: Configuración de límites de IA -->
**Figura 27:** Configuración de límites de uso de IA

### Privacidad y Seguridad de IA

EJFLOW implementa las siguientes medidas de seguridad para el uso de IA:

1. **Anonimización de Datos:** Información sensible se enmascara antes de enviar a la IA
2. **Sin Entrenamiento:** Los datos no se usan para entrenar modelos externos
3. **Logs de Auditoría:** Todas las consultas de IA quedan registradas
4. **Retención Limitada:** Los proveedores no retienen datos más de 30 días

---

## Portal del Cliente

El Portal del Cliente (EJFLOW Client) permite a los clientes acceder a su información, documentos y comunicarse con la firma.

### Acceso al Portal

Los clientes acceden al portal mediante:
- URL: `https://[su-dominio]/portal`
- Credenciales proporcionadas por email

<!-- IMAGEN: Página de login del portal -->
**Figura 28:** Página de acceso al portal del cliente

### Funcionalidades del Portal

| Función | Descripción |
|---------|-------------|
| **Dashboard** | Vista general de casos activos y tareas pendientes |
| **Mis Casos** | Lista de todos los casos del cliente |
| **Documentos** | Subir y descargar documentos |
| **Mensajes** | Comunicación con el equipo |
| **Perfil** | Actualizar información personal |

### Subir Documentos

Los clientes pueden subir documentos desde el portal:

1. Ir a **Documentos**
2. Seleccionar el caso correspondiente
3. Hacer clic en **"Subir Documento"**
4. Seleccionar el archivo
5. Agregar descripción (opcional)
6. Confirmar

<!-- IMAGEN: Diálogo de subida de documentos -->
**Figura 29:** Subir documentos en el portal

### Notificaciones del Portal

Los clientes reciben notificaciones cuando:
- Se actualiza el estado de un caso
- Se requiere un documento
- Hay un mensaje nuevo
- Se aproxima una fecha límite

### Chatbot de Asistencia

El chatbot está disponible 24/7 en el portal para:
- Responder preguntas frecuentes
- Guiar en la navegación
- Tomar mensajes para el equipo
- Proporcionar información de contacto

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
**Figura 30:** Logs de auditoría

### Eventos Registrados

- Inicio/cierre de sesión
- Creación de registros
- Modificación de registros
- Eliminación de registros
- Acceso a documentos
- Cambios de configuración
- Intentos de acceso fallidos
- **Acceso a empresas cerradas/pausadas**
- **Cambios de estado de cliente**

### Configuración de Seguridad

Vaya a **Configuración** > **Seguridad**:

| Opción | Descripción |
|--------|-------------|
| Timeout de Sesión | Tiempo de inactividad (default: 30 min) |
| Sesiones Concurrentes | Permitir múltiples dispositivos |
| 2FA Obligatorio | Requerir autenticación de dos factores |
| IP Whitelist | Solo permitir IPs específicas |

<!-- IMAGEN: Configuración de seguridad -->
**Figura 31:** Configuración de seguridad

---

## Sistema de Respaldos

EJFLOW cuenta con un sistema avanzado de respaldos que permite proteger la información del CRM mediante copias de seguridad encriptadas.

### Tipos de Respaldo

| Tipo | Descripción | Contenido |
|------|-------------|-----------|
| **Global** | Respaldo completo del sistema | Toda la base de datos + archivos multimedia |
| **Tenant** | Respaldo de una corporación específica | Datos de una empresa y sus documentos |

### Características de Seguridad

- **Encriptación AES-128:** Todos los respaldos se encriptan con Fernet
- **Verificación SHA-256:** Checksum para verificar integridad
- **Compresión ZIP:** Reduce el tamaño del archivo

### Crear Respaldo Global

1. Navegue a **Configuración** > **Respaldos**
2. Haga clic en **"Crear Respaldo"**
3. Seleccione **"Respaldo Global"**
4. Opciones:
   - **Incluir Multimedia:** Marca para incluir archivos (documentos, imágenes)
   - **Nombre:** Descripción del respaldo
5. Haga clic en **"Crear"**

<!-- IMAGEN: Formulario de respaldo global -->
**Figura 32:** Crear respaldo global

El sistema:
1. Exporta toda la base de datos a JSON
2. Comprime los archivos en ZIP
3. Encripta el archivo resultante
4. Calcula el checksum de integridad
5. Guarda el archivo en el servidor

### Crear Respaldo de Tenant

Para respaldar una corporación específica:

1. Navegue a **Configuración** > **Respaldos**
2. Haga clic en **"Crear Respaldo"**
3. Seleccione **"Respaldo de Tenant"**
4. Seleccione la **Corporación** a respaldar
5. Opciones:
   - **Incluir Multimedia:** Documentos de la corporación
6. Haga clic en **"Crear"**

<!-- IMAGEN: Formulario de respaldo de tenant -->
**Figura 33:** Crear respaldo de tenant

**Datos incluidos en respaldo de tenant:**
- Información de la corporación
- Contactos asociados
- Casos tributarios
- Notas de casos
- Documentos
- Enlaces de documentos
- Cotizaciones

### Lista de Respaldos

La lista de respaldos muestra:

| Columna | Descripción |
|---------|-------------|
| Nombre | Descripción del respaldo |
| Tipo | Global o Tenant |
| Estado | Pendiente, En Progreso, Completado, Fallido |
| Tamaño | Tamaño del archivo |
| Fecha | Cuándo se creó |
| Acciones | Descargar, Restaurar, Eliminar |

<!-- IMAGEN: Lista de respaldos -->
**Figura 34:** Lista de respaldos del sistema

### Estados del Respaldo

| Estado | Icono | Descripción |
|--------|-------|-------------|
| Pending | ⏳ | Esperando procesamiento |
| In Progress | 🔄 | Creándose actualmente |
| Completed | ✅ | Listo para descargar |
| Failed | ❌ | Error durante la creación |

### Descargar Respaldo

1. En la lista de respaldos
2. Haga clic en el ícono de descarga
3. El archivo `.enc` se descargará
4. Guarde en ubicación segura

**Nota:** Los archivos están encriptados. Se requiere la clave de encriptación para restaurar.

### Restaurar Respaldo

**ADVERTENCIA:** Restaurar un respaldo reemplaza los datos actuales.

1. En la lista de respaldos
2. Haga clic en **"Restaurar"**
3. Confirme la acción
4. El sistema:
   - Verifica el checksum
   - Desencripta el archivo
   - Restaura los datos
   - Restaura archivos multimedia (si están incluidos)

<!-- IMAGEN: Diálogo de confirmación de restauración -->
**Figura 35:** Confirmar restauración de respaldo

### Respaldos Automáticos

Configure respaldos automáticos:

1. Vaya a **Configuración** > **Respaldos** > **Programación**
2. Configure:
   - **Frecuencia:** Diario, Semanal, Mensual
   - **Hora:** Hora de ejecución
   - **Tipo:** Global o por tenant
   - **Retención:** Cuántos respaldos mantener

<!-- IMAGEN: Configuración de respaldos automáticos -->
**Figura 36:** Programación de respaldos automáticos

### Configuración de Encriptación

La encriptación utiliza la clave `FIELD_ENCRYPTION_KEY` del sistema.

**IMPORTANTE:**
- Guarde esta clave en un lugar seguro
- Sin la clave, los respaldos NO se pueden restaurar
- La clave debe tener formato Fernet válido (44 caracteres base64)

### Eliminar Respaldo

1. En la lista de respaldos
2. Haga clic en el ícono de papelera
3. Confirme la eliminación
4. El archivo se elimina permanentemente

**Nota:** Esta acción no se puede deshacer.

---

## Glosario

| Término | Definición |
|---------|------------|
| **Client Status** | Estado del ciclo de vida de una corporación en el CRM |
| **Tenant Backup** | Respaldo específico de una corporación individual |
| **Global Backup** | Respaldo completo de todo el sistema |
| **Fernet** | Algoritmo de encriptación simétrica (AES-128) |
| **Checksum** | Verificación de integridad mediante hash SHA-256 |
| **2FA** | Autenticación de dos factores |
| **Portal** | Interfaz web para clientes externos |

---

## Preguntas Frecuentes

### Estado del Cliente

**P: ¿Puedo reactivar una empresa cerrada?**
R: Sí, simplemente cambie el estado a "Active" o cualquier otro estado activo.

**P: ¿Quién puede cerrar una empresa?**
R: Cualquier usuario autenticado puede cambiar el estado, pero se requiere justificación.

**P: ¿Qué pasa con los datos de una empresa cerrada?**
R: Los datos se mantienen intactos. El cierre es solo un estado, no elimina información.

### Respaldos

**P: ¿Dónde se almacenan los respaldos?**
R: En el directorio `media/backups/` del servidor.

**P: ¿Puedo restaurar un respaldo en otro servidor?**
R: Sí, siempre que tenga la misma clave de encriptación configurada.

**P: ¿Cuánto espacio ocupan los respaldos?**
R: Depende del tamaño de la base de datos y si incluye multimedia.

### Inteligencia Artificial

**P: ¿Los datos se envían a terceros?**
R: Sí, las consultas de IA se procesan por el proveedor configurado (OpenAI/Anthropic).

**P: ¿Puedo desactivar la IA?**
R: Sí, en Configuración > IA > Deshabilitar.

---

## Soporte

### Contacto

- **Email:** jhoelp@ejsupportit.com
- **Teléfono:** (347) 854-5662
- **Horario:** Lunes a Viernes, 9:00 AM - 6:00 PM EST

### Recursos Adicionales

- **Documentación Técnica:** `/docs/` en el repositorio
- **API Reference:** `https://[su-dominio]/api/docs/`
- **Changelog:** Historial de cambios en cada versión

---

**© 2026 E & J Support IT. Todos los derechos reservados.**

**EJFLOW** es una marca registrada de E & J Support IT.

---

## Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 2.0 | Feb 2026 | Sistema de Estado del Cliente, Respaldos avanzados, Configuración de IA |
| 1.1 | Feb 2026 | Gestión de departamentos, Portal del cliente |
| 1.0 | Ene 2026 | Versión inicial |

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

### Lista de Figuras

| # | Descripción |
|---|-------------|
| 1 | Panel de control del administrador |
| 2 | Lista de usuarios del sistema |
| 3 | Formulario de creación de usuario |
| 4 | Edición de usuario |
| 5 | Lista de departamentos |
| 6 | Crear nuevo departamento |
| 7 | Editar departamento |
| 8 | Estructura de carpetas por departamento |
| 9 | Inicializar carpetas de departamento |
| 10 | Crear nueva subcarpeta |
| 11 | Permisos por rol |
| 12 | Crear rol personalizado |
| 13 | Selector de estado del cliente |
| 14 | Opciones del selector de estado |
| 15 | Diálogo para cerrar una empresa |
| 16 | Diálogo para pausar una empresa |
| 17 | Indicadores de estado en lista |
| 18 | Modal de advertencia empresa cerrada |
| 19 | Banner de advertencia permanente |
| 20 | Notificación de acceso |
| 21 | Configuración general del sistema |
| 22 | Configuración de correo |
| 23 | Panel de configuración del chatbot |
| 24 | Ejemplo de conversación con chatbot |
| 25 | Asistente de IA para el personal |
| 26 | Configuración de IA interna |
| 27 | Límites de uso de IA |
| 28 | Login del portal del cliente |
| 29 | Subir documentos en el portal |
| 30 | Logs de auditoría |
| 31 | Configuración de seguridad |
| 32 | Crear respaldo global |
| 33 | Crear respaldo de tenant |
| 34 | Lista de respaldos |
| 35 | Confirmar restauración |
| 36 | Programación de respaldos automáticos |

# Ebenezer Tax Services CRM
## Manual del Usuario

**Versión:** 1.2
**Fecha:** Febrero 2026

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Dashboard Principal](#dashboard-principal)
4. [Gestión de Contactos](#gestión-de-contactos)
5. [Gestión de Casos](#gestión-de-casos)
6. [Documentos y Carpetas](#documentos-y-carpetas)
7. [Calendario y Citas](#calendario-y-citas)
8. [Comunicaciones](#comunicaciones)
9. [Configuración](#configuración)

---

## Introducción

El CRM de Ebenezer Tax Services es un sistema integral diseñado para gestionar todos los aspectos de su práctica de servicios de impuestos. Este manual le guiará a través de las principales funcionalidades del sistema.

### Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| **Admin** | Acceso completo a todas las funcionalidades |
| **Manager** | Gestión de equipo y reportes |
| **Preparer** | Preparación de casos de impuestos |
| **Receptionist** | Atención al cliente y citas |

---

## Acceso al Sistema

### Inicio de Sesión

1. Navegue a la URL del sistema
2. Ingrese su correo electrónico
3. Ingrese su contraseña
4. Haga clic en "Iniciar Sesión"

![Pantalla de inicio de sesión](images/figura-01-login.png)
**Figura 1:** Pantalla de inicio de sesión

### Autenticación de Dos Factores (2FA)

Si tiene 2FA habilitado:
1. Abra su aplicación autenticadora (Google Authenticator, Authy, etc.)
2. Ingrese el código de 6 dígitos mostrado
3. El código cambia cada 30 segundos

![Verificación de dos factores](images/figura-02-2fa.png)
**Figura 2:** Verificación de dos factores

### Recuperar Contraseña

1. Haga clic en "¿Olvidó su contraseña?"
2. Ingrese su correo electrónico
3. Revise su bandeja de entrada
4. Siga el enlace para crear nueva contraseña

---

## Dashboard Principal

Al iniciar sesión, verá el panel de control con información relevante de su trabajo.

![Dashboard principal](images/figura-03-dashboard.png)
**Figura 3:** Dashboard principal

### Widgets del Dashboard

| Widget | Descripción |
|--------|-------------|
| Casos Activos | Número de casos en proceso |
| Citas de Hoy | Reuniones programadas |
| Tareas Pendientes | Items por completar |
| Sticky Notes | Notas rápidas personales |

### Sticky Notes (Notas Adhesivas)

Las notas adhesivas le permiten guardar recordatorios personales:

1. Haga clic en "Nueva Nota" (+)
2. Escriba su contenido
3. La nota se guarda automáticamente
4. Use el ícono de papelera para eliminar

---

## Gestión de Contactos

### Lista de Contactos

![Lista de contactos](images/figura-04-lista-contactos.png)
**Figura 4:** Lista de contactos con filtros

Para ver contactos:
1. Navegue a **Contactos** en el menú lateral
2. Use los filtros para buscar
3. Haga clic en un contacto para ver detalles

### Crear Nuevo Contacto

1. Haga clic en "Nuevo Contacto"
2. Complete los campos requeridos:
   - Nombre y apellido
   - Correo electrónico
   - Teléfono
   - Corporaciones (ver sección siguiente)
3. Haga clic en "Guardar"

### Asignar Contacto a Múltiples Corporaciones

Un contacto puede estar asociado a múltiples corporaciones:

| Tipo | Descripción |
|------|-------------|
| **Corporación Primaria** | Empresa principal del contacto, visible en listas |
| **Corporaciones Adicionales** | Otras empresas asociadas, visibles en detalle |

Para agregar corporaciones:
1. Al crear o editar un contacto
2. Seleccione la **Corporación Primaria** del menú desplegable
3. Use **"Agregar Corporación"** para vincular empresas adicionales
4. Las corporaciones aparecen como badges que puede eliminar

![Formulario de contacto con múltiples corporaciones](images/figura-05-formulario-contacto.png)
**Figura 5:** Formulario de contacto con selector de múltiples corporaciones

### Detalle del Contacto

La página de detalle del contacto muestra:
- Información personal
- **Corporación primaria** (destacada)
- **Corporaciones adicionales** (en sección separada)
- Historial de casos
- Documentos asociados
- Notas y comentarios
- Carpetas por departamento

![Detalle del contacto](images/figura-06-detalle-contacto.png)
**Figura 6:** Vista de detalle del contacto con corporaciones asociadas

---

## Gestión de Casos

### Lista de Casos

La lista de casos muestra todos los casos de impuestos organizados por estado.

### Estados del Caso

| Estado | Color | Descripción |
|--------|-------|-------------|
| New | Azul | Caso recién creado |
| In Progress | Amarillo | En proceso |
| Review | Naranja | En revisión |
| Ready to File | Morado | Listo para enviar |
| Filed | Verde | Enviado al IRS |
| Completed | Gris | Finalizado |

### Crear Nuevo Caso

1. Haga clic en "Nuevo Caso"
2. Seleccione el contacto
3. Complete la información fiscal:
   - Año fiscal
   - Tipo de declaración
   - Formularios requeridos
4. Haga clic en "Crear"

### Detalle del Caso

En el detalle del caso puede:
- Ver información general
- Gestionar documentos
- Agregar notas
- Ver historial de actividades

---

## Documentos y Carpetas

### Sistema de Carpetas por Departamento

Los documentos se organizan en carpetas por departamento para cada cliente:

| Departamento | Color | Uso |
|--------------|-------|-----|
| Accounting | Azul | Contabilidad general |
| Payroll | Verde | Nóminas y W-2 |
| Billing | Amarillo | Facturación |
| Audit | Rojo | Auditorías |
| Representation | Púrpura | Representación ante IRS |
| Client Visit | Cyan | Visitas a clientes |

![Carpetas por departamento](images/figura-11-carpetas.png)
**Figura 7:** Sistema de carpetas por departamento

### Ver Carpetas de un Cliente

1. Abra el contacto o corporación
2. Vaya a la pestaña "Documentos"
3. Verá las carpetas organizadas por departamento
4. Haga clic en una carpeta para ver su contenido

### Subir Documentos

1. Navegue a la carpeta deseada
2. Haga clic en "Subir Documento"
3. Seleccione el archivo (PDF, imagen, etc.)
4. El documento se guarda automáticamente

### Vista Previa de Documentos

- Haga clic en un documento para verlo
- Los PDFs se muestran directamente en el navegador
- Las imágenes se muestran en un visor
- Use los controles para zoom y navegación

### Descargar Documentos

1. Haga clic en el ícono de descarga
2. El archivo se guardará en su carpeta de descargas

---

## Calendario y Citas

### Vista del Calendario

El calendario muestra:
- Vista mensual, semanal o diaria
- Citas codificadas por color según tipo
- Indicadores de disponibilidad

### Crear Nueva Cita

1. Haga clic en la fecha/hora deseada
2. Complete los campos:
   - Título
   - Contacto
   - Fecha y hora
   - Ubicación o enlace virtual
3. Configure recordatorios
4. Haga clic en "Guardar"

### Tipos de Citas

| Tipo | Descripción |
|------|-------------|
| Consulta Inicial | Primera reunión con cliente |
| Revisión de Documentos | Revisar documentación |
| Firma | Firmar documentos |
| Virtual | Reunión por videoconferencia |

---

## Comunicaciones

### Comentarios en Contactos/Casos

Puede agregar comentarios a contactos y casos para mantener un historial de comunicaciones:

1. Abra el contacto o caso
2. Desplácese a la sección "Comentarios"
3. Escriba su comentario
4. Opcionalmente adjunte archivos
5. Haga clic en "Enviar"

### Adjuntar Archivos en Comentarios

Los archivos adjuntos en comentarios se guardan automáticamente en la carpeta del departamento seleccionado:

1. Al crear un comentario, seleccione "Adjuntar archivo"
2. Seleccione la carpeta de departamento destino
3. Suba el archivo
4. El archivo quedará vinculado al comentario Y guardado en la carpeta

### Mensajes del Portal

Puede ver y responder mensajes enviados por clientes desde el portal:

1. Vaya a **Mensajes** en el menú
2. Vea mensajes entrantes
3. Haga clic para responder

---

## Configuración

### Perfil de Usuario

1. Haga clic en su nombre (esquina superior derecha)
2. Seleccione "Mi Perfil"
3. Actualice su información
4. Guarde los cambios

### Preferencias

En **Configuración** > **Preferencias**:

| Opción | Descripción |
|--------|-------------|
| Tema | Claro / Oscuro / Auto |
| Idioma | Español / English |
| Zona Horaria | Su zona horaria local |
| Notificaciones | Qué alertas recibir |

### Cambiar Contraseña

1. Vaya a **Configuración** > **Seguridad**
2. Haga clic en "Cambiar Contraseña"
3. Ingrese contraseña actual
4. Ingrese nueva contraseña (2 veces)
5. Guarde los cambios

---

## Soporte

### Contacto

- **Email:** soporte@ebenezer-crm.com
- **Teléfono:** (XXX) XXX-XXXX
- **Horario:** Lunes a Viernes, 9:00 AM - 6:00 PM EST

### Recursos Adicionales

- Manual del Administrador: `MANUAL-ADMINISTRADOR.md`
- Documentación de API: `/api/docs/`

---

**© 2026 Ebenezer Tax Services. Todos los derechos reservados.**

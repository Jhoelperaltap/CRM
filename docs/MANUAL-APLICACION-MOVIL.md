# Manual de la Aplicación Móvil - Portal del Cliente

**Versión:** 1.0
**Fecha:** Febrero 2026
**Plataformas:** iOS y Android

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Instalación](#instalación)
3. [Registro y Acceso](#registro-y-acceso)
4. [Pantalla Principal](#pantalla-principal)
5. [Mis Casos](#mis-casos)
6. [Documentos](#documentos)
7. [Mensajes](#mensajes)
8. [Citas](#citas)
9. [Notificaciones](#notificaciones)
10. [Chatbot Asistente](#chatbot-asistente)
11. [Mi Perfil](#mi-perfil)
12. [Solución de Problemas](#solución-de-problemas)

---

## Introducción

La aplicación móvil del Portal del Cliente de Ebenezer Tax Services le permite:

- ✅ Ver el estado de sus casos de impuestos
- 📄 Subir y ver documentos
- 💬 Comunicarse con su preparador
- 📅 Ver y gestionar sus citas
- 🔔 Recibir notificaciones importantes
- 🤖 Obtener ayuda del asistente virtual

---

## Instalación

### iOS (iPhone/iPad)

1. Abra la **App Store**
2. Busque **"Ebenezer Tax Services"**
3. Toque **"Obtener"**
4. Confirme con Face ID, Touch ID o su contraseña
5. Espere a que se instale

### Android

1. Abra **Google Play Store**
2. Busque **"Ebenezer Tax Services"**
3. Toque **"Instalar"**
4. Acepte los permisos requeridos
5. Espere a que se instale

### Requisitos

| Plataforma | Versión Mínima |
|------------|----------------|
| iOS | 14.0 o superior |
| Android | 8.0 (API 26) o superior |

---

## Registro y Acceso

### Primera Vez (Nuevo Usuario)

Si es la primera vez que usa la aplicación:

1. Abra la aplicación
2. Toque **"No tengo cuenta"**
3. Ingrese el correo electrónico que proporcionó a Ebenezer
4. Recibirá un correo con un enlace de activación
5. Abra el enlace y cree su contraseña
6. Vuelva a la aplicación e inicie sesión

### Iniciar Sesión

1. Abra la aplicación
2. Ingrese su **correo electrónico**
3. Ingrese su **contraseña**
4. Toque **"Iniciar Sesión"**

### ¿Olvidó su Contraseña?

1. Toque **"¿Olvidó su contraseña?"**
2. Ingrese su correo electrónico
3. Toque **"Enviar enlace"**
4. Revise su correo (incluyendo spam)
5. Siga el enlace para crear nueva contraseña

### Mantener Sesión Iniciada

- La aplicación recuerda su sesión
- Solo necesita iniciar sesión de nuevo después de cerrar sesión manualmente
- Por seguridad, la sesión expira después de 7 días de inactividad

---

## Pantalla Principal

### Vista General

Al iniciar sesión verá el **Dashboard** con:

```
┌─────────────────────────────────┐
│  Welcome back,                  │
│  [Su Nombre]                    │
├─────────────────────────────────┤
│ ┌─────────┬─────────┬─────────┐ │
│ │  📁     │  📧     │  📅     │ │
│ │   1     │   3     │   2     │ │
│ │ Active  │ Unread  │ Upcoming│ │
│ │ Cases   │Messages │ Appts   │ │
│ └─────────┴─────────┴─────────┘ │
├─────────────────────────────────┤
│  Quick Actions                  │
│ ┌─────────────┐ ┌─────────────┐ │
│ │📤 Upload    │ │💬 Send      │ │
│ │  Document   │ │  Message    │ │
│ └─────────────┘ └─────────────┘ │
└─────────────────────────────────┘
```

### Tarjetas de Resumen

| Tarjeta | Descripción |
|---------|-------------|
| **Active Cases** | Número de casos en proceso |
| **Unread Messages** | Mensajes sin leer |
| **Appointments** | Citas próximas |

### Acciones Rápidas

- **Upload Document:** Subir un documento directamente
- **Send Message:** Enviar mensaje a su preparador

### Navegación

Use la barra inferior para navegar:

| Ícono | Sección |
|-------|---------|
| 🏠 | Home (Inicio) |
| 📁 | Cases (Casos) |
| 📄 | Documents (Documentos) |
| 💬 | Messages (Mensajes) |
| 🤖 | Chat (Asistente) |
| 📅 | Appointments (Citas) |
| 🔔 | Alerts (Notificaciones) |
| 👤 | Profile (Perfil) |

---

## Mis Casos

### Ver Lista de Casos

1. Toque el ícono **📁 Cases** en la barra inferior
2. Verá todos sus casos de impuestos

### Información del Caso

Cada caso muestra:
- **Número de caso:** Identificador único
- **Año fiscal:** 2024, 2023, etc.
- **Estado:** En qué etapa está
- **Preparador:** Quién lo está atendiendo

### Estados del Caso

| Estado | Significado |
|--------|-------------|
| 🔵 **New** | Caso recién creado |
| 🟡 **In Progress** | Se está trabajando |
| 🟠 **Review** | En revisión |
| 🟣 **Ready to File** | Listo para enviar |
| 🟢 **Filed** | Enviado al IRS |
| ✅ **Completed** | Finalizado |

### Ver Detalle del Caso

1. Toque en un caso para ver detalles
2. Verá:
   - Información general
   - Documentos requeridos (checklist)
   - Documentos subidos
   - Notas del preparador

### Checklist de Documentos

El checklist muestra qué documentos necesita entregar:

```
Documentos Requeridos:
☑ W-2 Employer 1
☐ W-2 Employer 2
☑ 1099-INT Bank Statement
☐ Previous Year Tax Return
☐ ID Document
```

- ☑ = Ya subido
- ☐ = Pendiente

---

## Documentos

### Ver Documentos

1. Toque el ícono **📄 Documents**
2. Verá todos los documentos de sus casos

### Filtrar Documentos

- **Todos:** Todos los documentos
- **Por Caso:** Documentos de un caso específico
- **Por Tipo:** W-2, 1099, etc.

### Subir Documento

#### Método 1: Desde Documentos
1. Toque el botón **"+"** o **"Upload"**
2. Seleccione el origen:
   - **Cámara:** Tomar foto
   - **Galería:** Seleccionar imagen existente
   - **Archivos:** Seleccionar PDF u otro archivo

#### Método 2: Desde un Caso
1. Abra el caso
2. En la sección de checklist
3. Toque el item pendiente
4. Suba el documento correspondiente

### Tomar Foto de Documento

Para mejores resultados al fotografiar documentos:

1. **Buena iluminación:** Luz natural o artificial uniforme
2. **Superficie plana:** Coloque el documento en una mesa
3. **Encuadre completo:** Todo el documento debe verse
4. **Evite sombras:** No tape la luz con su mano
5. **Enfoque claro:** Espere a que la cámara enfoque

### Ver Documento

1. Toque el documento en la lista
2. Se abrirá en el visor
3. Use gestos para:
   - **Zoom:** Pellizque para acercar/alejar
   - **Desplazar:** Arrastre para mover

### Descargar Documento

1. Abra el documento
2. Toque el ícono de descarga **⬇️**
3. Se guardará en su dispositivo

---

## Mensajes

### Ver Mensajes

1. Toque el ícono **💬 Messages**
2. Verá su historial de mensajes

### Leer un Mensaje

1. Toque el mensaje para abrirlo
2. Lea el contenido completo
3. Los mensajes no leídos tienen un indicador azul

### Enviar Mensaje

1. Toque el botón **"+ New Message"** o **"Compose"**
2. Escriba su mensaje
3. Opcionalmente adjunte un archivo
4. Toque **"Send"**

### Adjuntar Archivo a Mensaje

1. Al redactar un mensaje
2. Toque el ícono de clip 📎
3. Seleccione el archivo
4. El archivo se mostrará adjunto
5. Envíe el mensaje

### Notificaciones de Mensajes

- Recibirá notificación push cuando reciba un mensaje nuevo
- El badge en el ícono muestra mensajes sin leer

---

## Citas

### Ver Citas

1. Toque el ícono **📅 Appointments**
2. Verá sus citas próximas

### Información de la Cita

Cada cita muestra:
- **Fecha y hora**
- **Tipo de cita** (Consulta, Revisión, etc.)
- **Ubicación** (Oficina, Virtual)
- **Con quién** (Preparador asignado)

### Agregar Cita al Calendario

1. Abra el detalle de la cita
2. Toque **"Add to Calendar"**
3. Se agregará a su calendario del dispositivo

### Citas Virtuales

Para citas virtuales:
1. Abra la cita
2. Toque **"Join Meeting"** cuando sea la hora
3. Se abrirá la aplicación de videoconferencia

### Recordatorios

Recibirá recordatorios automáticos:
- 24 horas antes
- 2 horas antes
- 15 minutos antes

---

## Notificaciones

### Ver Notificaciones

1. Toque el ícono **🔔 Alerts**
2. Verá todas las notificaciones

### Tipos de Notificaciones

| Tipo | Descripción |
|------|-------------|
| 📧 **Message** | Nuevo mensaje recibido |
| 📁 **Case Update** | Cambio de estado en caso |
| 📅 **Appointment** | Recordatorio de cita |
| 📄 **Document** | Solicitud de documento |
| ⚠️ **System** | Avisos importantes |

### Marcar como Leída

- Toque la notificación para marcarla como leída
- Use **"Mark All Read"** para marcar todas

### Configurar Notificaciones Push

1. Vaya a **Profile** → **Settings**
2. En **Notifications**:
   - Active/desactive tipos específicos
   - Configure horarios de silencio

---

## Chatbot Asistente

### Acceder al Chat

1. Toque el ícono **🤖 Chat**
2. Se abrirá el asistente virtual

### Qué Puede Hacer el Asistente

El chatbot puede ayudarle con:

- ❓ Responder preguntas frecuentes
- 📊 Información sobre el estado de su caso
- 📄 Guía sobre documentos necesarios
- 📅 Información de citas
- 🔍 Buscar información en su cuenta

### Cómo Usar el Chat

1. Escriba su pregunta en lenguaje natural
2. El asistente responderá
3. Si necesita ayuda humana, escriba **"Hablar con agente"**

### Ejemplos de Preguntas

```
"¿Cuál es el estado de mi caso?"
"¿Qué documentos me faltan?"
"¿Cuándo es mi próxima cita?"
"¿Cómo subo un W-2?"
"Necesito hablar con mi preparador"
```

---

## Mi Perfil

### Acceder al Perfil

1. Toque el ícono **👤 Profile**
2. Verá su información personal

### Información Disponible

- **Nombre completo**
- **Correo electrónico**
- **Teléfono**
- **Dirección**

### Cambiar Contraseña

1. En Profile, toque **"Change Password"**
2. Ingrese contraseña actual
3. Ingrese nueva contraseña
4. Confirme nueva contraseña
5. Toque **"Update"**

### Configuración

En **Settings** puede configurar:

| Opción | Descripción |
|--------|-------------|
| **Notifications** | Qué alertas recibir |
| **Theme** | Claro / Oscuro / Auto |
| **Language** | Español / English |

### Cerrar Sesión

1. En Profile, desplácese hacia abajo
2. Toque **"Sign Out"**
3. Confirme que desea cerrar sesión

---

## Solución de Problemas

### La aplicación no carga

1. Verifique su conexión a internet
2. Cierre y vuelva a abrir la aplicación
3. Si persiste, reinicie su dispositivo

### No puedo iniciar sesión

1. Verifique que su correo esté correcto
2. Use "¿Olvidó su contraseña?" para resetear
3. Verifique que no tenga Caps Lock activado

### No recibo notificaciones

1. Vaya a Configuración del dispositivo → Notificaciones
2. Busque "Ebenezer Tax Services"
3. Active las notificaciones
4. En la app, verifique Settings → Notifications

### Las fotos de documentos salen borrosas

1. Limpie la cámara de su dispositivo
2. Asegúrese de tener buena iluminación
3. Mantenga el dispositivo estable
4. Espere a que enfoque antes de tomar la foto

### Error al subir documento

1. Verifique el tamaño del archivo (máximo 25 MB)
2. Verifique formato permitido (PDF, JPG, PNG)
3. Verifique su conexión a internet
4. Intente de nuevo en unos minutos

### La aplicación se cierra inesperadamente

1. Actualice a la última versión
2. Libere espacio en su dispositivo
3. Reinicie el dispositivo
4. Si persiste, desinstale y reinstale

### ¿Cómo actualizo la aplicación?

**iOS:**
1. Abra App Store
2. Toque su perfil
3. Busque actualizaciones pendientes
4. Actualice Ebenezer Tax Services

**Android:**
1. Abra Play Store
2. Toque Menú → Mis apps
3. Busque actualizaciones pendientes
4. Actualice Ebenezer Tax Services

---

## Contacto de Soporte

Si necesita ayuda adicional:

- **Email:** soporte@ebenezer-crm.com
- **Teléfono:** (XXX) XXX-XXXX
- **En la app:** Chat → "Hablar con agente"
- **Horario:** Lunes a Viernes, 9:00 AM - 6:00 PM

---

## Seguridad y Privacidad

### Protección de sus Datos

- 🔒 Conexión encriptada (HTTPS)
- 🔐 Contraseña protegida
- 📱 Datos almacenados de forma segura en el dispositivo
- ⏰ Sesión con tiempo de expiración

### Recomendaciones

1. **No comparta** su contraseña con nadie
2. **Use contraseña fuerte** (mínimo 8 caracteres)
3. **No acceda** desde redes WiFi públicas no seguras
4. **Cierre sesión** en dispositivos compartidos
5. **Mantenga actualizada** la aplicación

---

**© 2026 Ebenezer Tax Services. Todos los derechos reservados.**

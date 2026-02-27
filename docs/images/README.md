# Imágenes para los Manuales de EJFLOW CRM

## Archivo de Mockups

El archivo `mockups.html` contiene todas las figuras necesarias para los manuales en formato HTML interactivo.

### Cómo usar

1. **Abrir el archivo** `mockups.html` en Google Chrome
2. **Capturar las imágenes** usando uno de estos métodos:

#### Método 1: Herramienta de Recorte de Windows
```
Win + Shift + S → Seleccionar cada mockup → Guardar como PNG
```

#### Método 2: Extensión de Chrome
- Instalar "GoFullPage" o "Full Page Screen Capture"
- Capturar página completa o secciones individuales

#### Método 3: DevTools
1. F12 → Abrir DevTools
2. Ctrl+Shift+P → "Capture node screenshot"
3. Seleccionar el elemento `.mockup-container`

### Figuras Incluidas

| # | Figura | Descripción |
|---|--------|-------------|
| 1 | Login | Pantalla de inicio de sesión |
| 2 | 2FA | Verificación de dos factores |
| 3 | Dashboard | Panel principal con métricas y sticky notes |
| 4 | Lista Contactos | Tabla de contactos con filtros |
| 5 | Formulario Contacto | Multi-corporación (primaria + adicionales) |
| 6 | Detalle Contacto | Vista completa con corporaciones asociadas |
| 7 | Lista Corporaciones | Con indicadores de estado |
| 8 | Selector Estado | Dropdown de estados del cliente |
| 9 | Modal Cierre | Diálogo para cerrar empresa |
| 10 | Banners | Advertencias para empresas cerradas/pausadas |
| 11 | Carpetas Departamento | Sistema de carpetas con documentos |
| 12 | Detalle Corporación | Contactos, relacionadas y subsidiarias |

### Nomenclatura Sugerida

Al guardar las imágenes, usar estos nombres:

```
figura-01-login.png
figura-02-2fa.png
figura-03-dashboard.png
figura-04-lista-contactos.png
figura-05-formulario-contacto-multicorp.png
figura-06-detalle-contacto.png
figura-07-lista-corporaciones.png
figura-08-selector-estado.png
figura-09-modal-cierre.png
figura-10-banners-advertencia.png
figura-11-carpetas-departamento.png
figura-12-detalle-corporacion.png
```

### Actualizar los Manuales

Después de guardar las imágenes, reemplazar en los manuales:

```markdown
<!-- IMAGEN: descripción -->
**Figura X:** Título

↓ Cambiar a ↓

![Título](images/figura-XX-nombre.png)
**Figura X:** Título
```

---

Generado automáticamente para EJFLOW CRM v1.2

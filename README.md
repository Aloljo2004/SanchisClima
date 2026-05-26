# 📱 Javier Sanchis Climas de Alzira — Aplicaciones Móviles

Este repositorio contiene las dos aplicaciones móviles oficiales desarrolladas para el equipo de **Javier Sanchis Climas de Alzira**. Ambas aplicaciones están construidas sobre **React Native** con **Expo** e integradas en tiempo real con el ERP **Odoo** de la empresa, permitiendo centralizar y optimizar el flujo de trabajo diario de los empleados y técnicos de campo.

---

## 📂 Estructura del Proyecto

El repositorio está dividido en dos proyectos independientes y listos para producción:

1.  **`EntradaSanchis/`**: Aplicación de control de presencia y registro de jornada laboral (Fichaje de entrada y salida).
2.  **`ProyectoSanchis/AppSanchis/`**: Aplicación de partes de trabajo, gestión de actividades, control de materiales (usados y para pedir) e inspección de facturas/chatter.

---

## 📲 1. EntradaSanchis (Control de Presencia)

### ❓ ¿Qué es?
Es la aplicación corporativa para el registro obligatorio de jornada laboral de todo el personal. Cumple estrictamente con la normativa de control de presencia, registrando las horas exactas de inicio y fin de la jornada directamente en el modelo de asistencias de Odoo (`hr.attendance`).

### ✨ Funcionalidades y Componentes Clave

#### 🔐 Inicio de Sesión y Seguridad Premium
*   **Acceso mediante Odoo**: Autenticación segura y directa utilizando las credenciales de usuario del ERP.
*   **Acceso Biométrico Rápido**: Integración nativa con **Huella Dactilar** o **Reconocimiento Facial** (`expo-local-authentication`) tras el primer login para accesos ultra-rápidos y seguros.
*   **Almacenamiento Seguro**: Credenciales persistidas y encriptadas localmente en el llavero del dispositivo usando `expo-secure-store`.
*   **Configuración Dinámica de Servidor**: Modal en la pantalla de login para configurar o cambiar de forma ágil la URL del servidor Odoo (ideal para alternar entre servidores de desarrollo, staging y producción).

#### ⏱️ Pantalla de Fichaje Dinámica (`InicioScreen`)
*   **Botones de Acción Intuitivos**: Dos grandes botones visuales de **INICIAR** (Entrada, color verde) y **FINALIZAR** (Salida, color rojo) diseñados para evitar errores del operario.
*   **Último Fichaje Reciente**: Muestra en tiempo real una tarjeta destacada con los detalles del último fichaje registrado (Tipo, fecha, hora exacta) con bordes adaptativos de color según el estado.
*   **Geolocalización GPS Integrada**: Captura y valida las coordenadas de latitud y longitud (`expo-location`) del operario en el momento de realizar el fichaje si se activa el interruptor *"Fichaje con GPS"*.
*   **Selector de Motivo con Autocierre**: Al presionar sobre un fichaje, se abre un modal interactivo con un grid numérico del 1 al 10 para asignar un código de motivo. La app cuenta con un **auto-registro automático sin motivo** tras una cuenta atrás de 4 segundos si el usuario no pulsa nada, agilizando el flujo diario.

#### ⏰ Sistema Avanzado de Alertas y Recordatorios (`AlertasScreen`)
*   **Recordatorios Personalizados**: Permite al usuario configurar alertas específicas con nombres como "Entrada", "Salida" o "Almuerzo".
*   **Selector de Hora Estilizado**: Reloj interactivo mediante ruedas de selección manuales de horas y minutos.
*   **Frecuencia Semanal**: Selector de días de la semana para activar las alertas únicamente los días laborales (ej. de lunes a viernes).
*   **Alertas In-App en Tiempo Real**: Notificación sonora y visual a pantalla completa mediante modal y un hook de chequeo continuo (`useAlarmChecker`) si el usuario tiene la aplicación abierta a la hora programada.
*   **Gestión y Búsqueda**: Buscador interactivo por nombre de alerta y controles rápidos para editarlas, eliminarlas o activarlas/desactivarlas con un interruptor (`Switch`).

#### 📅 Historial Completo (`HistoricoScreen`)
*   Lista cronológica ordenada que permite consultar de manera retroactiva todos los registros de fichajes hechos por el operario.

---

## 🛠️ 2. AppSanchis (Partes de Trabajo y Gestión de Actividades)

### ❓ ¿Qué es?
Es la herramienta central de operaciones para el equipo técnico en campo. Les permite ver sus hojas de ruta diarias, iniciar y finalizar intervenciones de asistencia técnica, registrar el consumo de materiales o solicitar repuestos nuevos en tiempo real, así como consultar la documentación fiscal asociada a cada servicio.

### ✨ Funcionalidades y Componentes Clave

#### 📋 Dashboard del Técnico (`DashboardScreen`)
La pantalla de inicio clasifica de forma automática e inteligente todos los partes asignados en cuatro secciones para una organización impecable:
*   📅 **Actividades de hoy**: Tareas asignadas para la fecha en curso. **Las tareas en estado "En curso" (activas) se ordenan y priorizan automáticamente en la cima de la pantalla.**
*   👷 **Mis actividades**: Todas las tareas e intervenciones asignadas al técnico.
*   📭 **Actividades sin asignar**: Bolsa de trabajo disponible para que cualquier operario pueda auto-asignarse un servicio pendiente.
*   📋 **Actividades finalizadas**: Historial completo de tareas ejecutadas con soporte para paginación progresiva mediante el botón *"Cargar más"*.
*   *Sincronización instantánea mediante el gesto "Pull-to-refresh".*

#### ▶️ Detalle y Control de Tiempos (`ActividadDetailScreen`)
Muestra información detallada sobre el parte de trabajo (Cliente, dirección, factura y referencia de origen) y ofrece los siguientes controles de estado:
*   **Iniciar Actividad (Play)**: Guarda en Odoo la hora exacta de inicio de la asistencia.
*   **Pausar Actividad (Pause)**: Detiene el contador de tiempo. Debido a que el modelo de tareas de Odoo no posee un estado nativo de "Pausa", la app lo solventa de manera sumamente elegante modificando el estado a nivel del proyecto asociado, permitiendo pausar y reanudar la labor tantas veces como sea necesario.
*   **Finalizar Actividad (Stop)**: Finaliza definitivamente el registro de tiempo en Odoo y redirige inmediatamente al operario a la pantalla de materiales para agilizar el reporte de gastos de obra.

#### 📦 Gestión Avanzada de Materiales (`MaterialesScreen`)
Divide el flujo de materiales mediante pestañas gemelas de gran usabilidad:
1.  🔩 **Utilizados**: Consumos reales que se imputarán directamente a la actividad del cliente en Odoo.
2.  🛒 **Restantes (A pedir)**: Solicitud de repuestos o materiales necesarios que no se tienen en stock y deben pedirse a almacén.
*   **Buscador con Debounce (400ms)**: El operario puede escribir el nombre de cualquier material del catálogo de Odoo y la app realiza la búsqueda filtrada de forma optimizada para reducir el consumo de datos móviles y evitar sobrecargar el servidor.
*   **Cantidad Decimal Precisa**: Sustituye los botones +/- por un **campo de entrada de texto directo compatible con decimales** (ej. "0.5" kg de refrigerante o "1.5" metros de tubería).
*   **Validación Visual Inteligente**: La app detecta si el valor local difiere del guardado en el servidor de Odoo. Si hay diferencias, muestra de forma interactiva un botón verde de guardado (`✓`) para enviar el cambio, o un botón de aspa roja (`✕`) para eliminar el material por completo si su cantidad pasa a ser cero.
*   **Botón de Salida Prominente**: Botón rojo brillante *"Salir"* en la cabecera para regresar de manera segura al dashboard de tareas.

#### 🧾 Visualizador de Facturas y Odoo Chatter (`FacturaDetailScreen`)
Si la actividad cuenta con una factura asignada, el técnico puede acceder a una potente suite de consulta que incluye:
*   **Pestaña de Información General**: Datos de cabecera como cliente, fecha de facturación, vencimiento, origen, referencia y términos y condiciones comerciales con limpieza automática de etiquetas HTML (`cleanHtml`).
*   **Seguridad de Multi-compañía**: Banner interactivo de advertencia si el usuario tiene restricciones de permisos entre filiales en Odoo, permitiéndole aun así examinar las líneas de productos y la mensajería Chatter de forma segura.
*   **Pestaña de Conceptos/Líneas**: Desglose con el nombre del producto, descripción detallada, cantidad utilizada y unidad de medida (UoM).
*   **Pestaña de Mensajes (Odoo Chatter) y Archivos Adjuntos**:
    *   Historial completo de notas internas, mensajes de sistema y correos intercambiados vinculados a la factura, obra o proyecto de origen.
    *   **Previsualización Inline de Imágenes**: Las fotos y capturas adjuntas en la sección Chatter se previsualizan directamente de manera integrada.
    *   **Descarga y Compartición**: Descarga local segura en el almacenamiento en caché (`expo-file-system`) y menús de compartición nativos del sistema móvil (`expo-sharing`) para enviar PDFs o imágenes a clientes mediante WhatsApp, email, etc.

---

## 🔧 Stack Tecnológico Principal

Ambas aplicaciones han sido desarrolladas bajo un ecosistema robusto y moderno:

*   **Core**: [Expo SDK 54](https://expo.dev/) y [React Native 0.81](https://reactnative.dev/)
*   **Navegación**:
    *   `EntradaSanchis`: React Navigation (Bottom Tabs, Native Stack)
    *   `AppSanchis`: Expo Router v3 (Navegación basada en archivos con rutas dinámicas `[id].tsx`)
*   **Conectividad**: Consultas seguras JSON-RPC en Odoo mediante peticiones de **Axios**.
*   **Sensores y Hardware**:
    *   Biometría nativa mediante `expo-local-authentication`.
    *   Geolocalización fina y gruesa mediante `expo-location`.
*   **Almacenamiento**: `expo-secure-store` y `@react-native-async-storage/async-storage`.
*   **Formatos**: Gestión y localización al español de fechas mediante `date-fns`.
*   **Diseño**: Vanilla StyleSheet optimizado con un sistema robusto de tokens corporativos (Colors, Typography, Spacing, Radius, Shadow).

---

## 🚀 Instalación y Configuración Local

### Requisitos Previos
*   Tener instalado [Node.js](https://nodejs.org/) (v18 o superior recomendado).
*   Disponer de un terminal con Git.
*   Instalar la aplicación gratuita **Expo Go** en su smartphone [iOS](https://apps.apple.com/app/expo-go/id982107779) o [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) para testeo instantáneo en red local.

### Ejecución en Entorno de Desarrollo

1.  **Clona el repositorio en tu ordenador**:
    ```bash
    git clone https://github.com/Aloljo2004/SanchisClima.git
    cd SanchisClima
    ```

2.  **Iniciar la aplicación de Control de Presencia (`EntradaSanchis`)**:
    ```bash
    cd EntradaSanchis
    npm install
    npx expo start
    ```
    *Escanea el código QR que se visualiza en la terminal usando la cámara de tu móvil (iOS) o la app Expo Go (Android).*

3.  **Iniciar la aplicación de Partes de Trabajo (`AppSanchis`)**:
    ```bash
    cd ../ProyectoSanchis/AppSanchis
    npm install
    npx expo start
    ```
    *Escanea el código QR que se muestra en tu terminal para levantar y probar la suite técnica.*

---

## 🏗️ Compilación y Distribución con EAS

El proyecto se encuentra 100% pre-configurado para compilarse y generar binarios nativos listos para producción e instalación local utilizando **EAS Build** (Expo Application Services):

*   **Generar un APK de pruebas para Android** (de cualquiera de las dos aplicaciones):
    ```bash
    eas build --platform android --profile preview
    ```
*   **Generar el paquete oficial para publicación en Google Play Store (`.aab`)**:
    ```bash
    eas build --platform android --profile production
    ```

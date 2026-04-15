# 🔧 Partes de Trabajo — Javier Sanchis Climas de Alzira

Aplicación móvil desarrollada con **React Native + Expo** para la gestión de partes de trabajo del equipo técnico de **Javier Sanchis Climas de Alzira**. Permite a los operarios consultar, iniciar y finalizar sus actividades del día, así como gestionar los materiales utilizados, todo integrado en tiempo real con el ERP **Odoo**.

---

## 📱 Capturas de pantalla

> _Pantalla de login · Dashboard · Detalle de actividad · Gestión de materiales_

---

## ✨ Funcionalidades principales

| Funcionalidad | Descripción |
|---|---|
| 🔐 **Autenticación Odoo** | Login con usuario y contraseña contra la API JSON-RPC de Odoo |
| 👆 **Biometría** | Acceso rápido con huella dactilar (Face ID / Touch ID) |
| 📅 **Dashboard por secciones** | Actividades de hoy, mis actividades, sin asignar e histórico |
| ▶️ **Iniciar actividad** | Registra la hora de inicio en Odoo y pone el parte en curso |
| ⏹️ **Finalizar actividad** | Registra la hora de fin y mueve la tarea Kanban a la etapa cerrada |
| 📦 **Gestión de materiales** | Consulta y añade materiales usados en cada actividad |
| 🔄 **Pull-to-refresh** | Recarga los datos con un gesto de arrastre hacia abajo |
| ⏳ **Skeleton loading** | Animaciones de carga mientras se obtienen datos de la API |
| ⚡ **Sesión persistente** | La sesión se guarda de forma segura con `expo-secure-store` |
| 🌙 **Tema oscuro** | Interfaz oscura con sistema de diseño personalizado |

---

## 🛠️ Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| **React Native** | 0.81.5 | Framework UI multiplataforma |
| **Expo** | ~54.0 | Toolchain y SDK nativo |
| **Expo Router** | ~6.0 | Navegación basada en sistema de archivos |
| **TypeScript** | ~5.9 | Tipado estático |
| **Zustand** | ^5.0 | Gestión de estado global (auth) |
| **Axios** | ^1.8 | Cliente HTTP para la API JSON-RPC de Odoo |
| **expo-secure-store** | ~15.0 | Almacenamiento seguro de sesión y credenciales |
| **expo-local-authentication** | ~17.0 | Autenticación biométrica (huella / Face ID) |
| **react-native-paper** | ^5.13 | Componentes UI base |
| **react-native-reanimated** | ~4.1 | Animaciones fluidas |
| **date-fns** | ^4.1 | Formateo de fechas |

---

## 📁 Estructura del proyecto

```
AppSanchis/
├── app/                        # Pantallas (Expo Router)
│   ├── _layout.tsx             # Layout raíz y protección de rutas
│   ├── index.tsx               # Pantalla de redirección inicial
│   ├── login.tsx               # Pantalla de login
│   ├── dashboard.tsx           # Dashboard principal
│   └── actividad/
│       ├── [id].tsx            # Detalle de una actividad
│       └── materiales/
│           └── [id].tsx        # Gestión de materiales de una actividad
│
├── components/                 # Componentes reutilizables
│   ├── ActividadCard.tsx       # Tarjeta de actividad para el listado
│   ├── ErrorBanner.tsx         # Banner de error con reintento
│   └── LoadingSkeleton.tsx     # Skeletons de carga animados
│
├── services/                   # Capa de acceso a datos
│   ├── odoo.ts                 # Cliente JSON-RPC y autenticación Odoo
│   ├── auth.ts                 # Gestión de credenciales y biometría
│   ├── partes.ts               # Consulta de partes y actividades
│   ├── actividades.ts          # Iniciar / finalizar actividades
│   ├── materiales.ts           # CRUD de materiales
│   └── mockData.ts             # Datos de prueba para desarrollo
│
├── store/
│   └── authStore.ts            # Estado global de autenticación (Zustand)
│
├── constants/
│   └── theme.ts                # Sistema de diseño (colores, tipografía, espaciado)
│
├── app.json                    # Configuración de Expo
└── package.json
```

---

## 🚀 Instalación y puesta en marcha

### Prerrequisitos

- **Node.js** >= 18
- **npm** o **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- Dispositivo físico o emulador con la app **Expo Go** instalada

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/AppSanchis.git
cd AppSanchis

# 2. Instalar dependencias
npm install

# 3. Arrancar el servidor de desarrollo
npm start
# o para plataformas específicas:
npm run android
npm run ios
```

Escanea el QR con **Expo Go** (Android) o la cámara (iOS) para abrir la app en tu dispositivo.

---

## ⚙️ Configuración

La URL del servidor Odoo y el nombre de la base de datos se configuran en `services/odoo.ts`:

```typescript
export const BASE_URL = 'https://odoopruebas.aleza.pro';
export const DB_NAME  = 'odoo';
```

> **Nota:** No se incluyen credenciales en el repositorio. La sesión se almacena de forma cifrada en el dispositivo mediante `expo-secure-store`.

---

## 🔗 Integración con Odoo

La aplicación se comunica con Odoo mediante su API **JSON-RPC** estándar (`/web/dataset/call_kw`). Los modelos utilizados son:

| Modelo Odoo | Descripción |
|---|---|
| `jornada.proyecto` | Partes de trabajo |
| `jornada.actividad` | Actividades dentro de un parte |
| `jornada.actividad.material` | Materiales usados en una actividad |
| `project.task` | Tareas de proyectos (sincronización de etapa Kanban) |
| `project.task.type` | Tipos/etapas de tarea Kanban |

### Flujo de autenticación

```
App  →  POST /web/session/authenticate  →  Odoo
                                    ←  session_id (cookie)
App  →  Guarda session_id en expo-secure-store
App  →  Inyecta Cookie: session_id=... en cada petición
```

---

## 🗺️ Flujo de navegación

```
/               → Redirección automática según sesión
├── /login      → Pantalla de acceso (credenciales o biometría)
└── /dashboard  → Vista principal con 4 secciones de actividades
    └── /actividad/[id]             → Detalle y acciones de actividad
        └── /actividad/materiales/[id]  → Materiales de la actividad
```

---

## 🔒 Seguridad

- Las credenciales y el `session_id` se almacenan con **`expo-secure-store`** (Keychain en iOS, Keystore en Android).
- La autenticación biométrica utiliza **`expo-local-authentication`** y nunca envía datos biométricos al servidor.
- Las sesiones expiradas se detectan automáticamente y redirigen al login.

---

## 📦 Scripts disponibles

```bash
npm start          # Inicia el servidor Expo (Metro Bundler)
npm run android    # Abre en emulador/dispositivo Android
npm run ios        # Abre en simulador/dispositivo iOS
npm run web        # Abre en el navegador web
```

---

## 🧑‍💻 Autor

**Salvador Cano** — Proyecto de prácticas en **Javier Sanchis Climas de Alzira**

---

## 📄 Licencia

Este proyecto es privado y de uso interno para **Javier Sanchis Climas de Alzira**. Todos los derechos reservados.

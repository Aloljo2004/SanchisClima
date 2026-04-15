# 🔧 Partes de Trabajo

Aplicación móvil para el equipo técnico de **Javier Sanchis Climas de Alzira**. Permite a los operarios gestionar sus actividades del día directamente desde el móvil, conectada en tiempo real con el ERP Odoo de la empresa.

---

## 📲 ¿Qué es esta app?

**Partes de Trabajo** es una app para Android e iOS que permite a cada técnico:

- Ver las actividades que tiene asignadas para hoy
- Iniciar y finalizar cada actividad registrando la hora exacta
- Consultar y añadir los materiales utilizados
- Acceder con huella dactilar para mayor comodidad

Todo queda registrado automáticamente en el sistema de la empresa (Odoo).

---

## ✨ Funcionalidades

### 🔐 Inicio de sesión
- Acceso con el usuario y contraseña de Odoo
- Opción de acceso rápido con **huella dactilar** (una vez iniciada sesión por primera vez)
- La sesión se guarda de forma segura en el dispositivo

### 📋 Dashboard (pantalla principal)
La pantalla principal muestra las actividades organizadas en cuatro secciones:

| Sección | Descripción |
|---|---|
| 📅 **Actividades de hoy** | Las tareas programadas para el día actual |
| 👷 **Mis actividades** | Todas las actividades asignadas al técnico |
| 📭 **Sin asignar** | Actividades disponibles aún no asignadas |
| 📋 **Finalizadas** | Historial de actividades completadas |

### ▶️ Detalle de actividad
Al entrar en una actividad se puede ver:
- Nombre de la actividad, cliente y factura asociada
- Estado actual: **Pendiente**, **En curso** o **Finalizada**
- Hora de inicio y fin (cuando corresponda)
- Referencia del parte de origen

Y realizar las siguientes acciones:
- **Iniciar** — registra la hora de inicio en Odoo
- **Finalizar** — registra la hora de finalización y abre la pantalla de materiales
- **Ver materiales** — accede a los materiales usados (disponible también en curso)

### 📦 Materiales
- Lista de materiales registrados en la actividad
- Posibilidad de añadir nuevos materiales con cantidad

---

## 📥 Cómo instalar

### Opción 1 — Expo Go (recomendado para pruebas)

1. Instala la app **Expo Go** en tu móvil:
   - [Android (Google Play)](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS (App Store)](https://apps.apple.com/app/expo-go/id982107779)

2. Clona el repositorio y arranca el proyecto:
```bash
git clone https://github.com/tu-usuario/AppSanchis.git
cd AppSanchis
npm install
npm start
```

3. Escanea el código QR que aparece en la terminal con la app Expo Go.

### Opción 2 — APK para Android

> Si tienes un archivo `.apk` compilado, instálalo directamente en el dispositivo Android activando la opción **"Instalar desde fuentes desconocidas"** en los ajustes del sistema.

---

## 🖐️ Cómo usar la app

1. **Abre la app** e inicia sesión con tu usuario y contraseña de Odoo.
2. Si es la primera vez, guarda tus credenciales para poder usar la **huella dactilar** en el futuro.
3. En el **dashboard**, verás tus actividades del día bajo la sección *"Actividades de hoy"*.
4. Pulsa sobre una actividad para ver sus detalles.
5. Cuando llegues a la obra, pulsa **▶ Iniciar Actividad** — quedará registrada la hora.
6. Al terminar, pulsa **⏹ Finalizar** — se registrará la hora de fin y podrás añadir los materiales utilizados.
7. En cualquier momento puedes hacer **pull-to-refresh** (arrastrar hacia abajo) para actualizar los datos.

---

## 📋 Requisitos

- Android 8.0 o superior / iOS 13 o superior
- Conexión a internet (para sincronizar con Odoo)
- Usuario activo en el Odoo de la empresa

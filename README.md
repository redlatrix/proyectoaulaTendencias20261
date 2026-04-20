
# Gestión de Recursos

Sistema completo de gestión de recursos físicos, digitales y espacios dentro de una organización. Incluye un **backend** en Django REST Framework y un **frontend** en React + Vite.

---

## Stack tecnológico

### Backend (`introducion/`)
- Python 3.x · Django 6.0.2 · Django REST Framework 3.16.1
- Simple JWT 5.5.1 (autenticación JWT)
- drf-spectacular 0.29.0 (Swagger/OpenAPI)
- SQLite (desarrollo)

### Frontend (`mi-app/`)
- React 19 · Vite 8 · TypeScript · Tailwind CSS 4
- Zustand (estado global) · Axios (cliente HTTP) · React Router v6

---

## Instalación y arranque

### 1. Backend

```bash
cd introducion

# Crear y activar entorno virtual
python -m venv env
env\Scripts\activate          # Windows
source env/bin/activate       # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt

# Aplicar migraciones
python manage.py migrate

# Crear superusuario (primer administrador)
python manage.py createsuperuser

# Iniciar servidor (http://127.0.0.1:8000)
python manage.py runserver
```

### 2. Frontend

```bash
cd mi-app

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (http://localhost:5173)
npm run dev
```

> El frontend se conecta al backend en `http://127.0.0.1:8000` por defecto.  
> Para cambiar la URL crea un archivo `mi-app/.env` con `VITE_API_URL=http://tu-backend`.

---

## Roles

| Rol | Cómo se asigna | Permisos |
|-----|----------------|----------|
| **Superusuario** | `createsuperuser` | Acceso total |
| **Administrador** | Grupo `Administrador` (desde `/admin/` o con `seed_test_user`) | CRUD completo |
| **Empleado** | Asignado automáticamente al registrar usuario | Solo sus recursos y asignaciones |

---

## Endpoints del API

### Autenticación — `/api/authentication/`

| Método | URL | Acceso | Descripción |
|--------|-----|--------|-------------|
| `POST` | `/api/authentication/login/` | Público | Obtener tokens JWT |
| `POST` | `/api/authentication/refresh/` | Público | Renovar access token |
| `GET` | `/api/authentication/me/` | Autenticado | Perfil del usuario actual |
| `POST` | `/api/authentication/register/` | Admin | Crear nuevo empleado |
| `GET` | `/api/authentication/users/` | Admin | Listar empleados |
| `DELETE` | `/api/authentication/users/{id}/` | Admin | Eliminar empleado |

### Recursos — `/api/resource/`

| Método | URL | Acceso | Descripción |
|--------|-----|--------|-------------|
| `GET/POST` | `/api/resource/resource-types/` | Auth / Admin | Tipos de recurso |
| `GET/PUT/PATCH/DELETE` | `/api/resource/resource-types/{id}/` | Admin | Gestionar tipo |
| `GET/POST` | `/api/resource/resources/` | Auth* / Admin | Recursos |
| `GET/PUT/PATCH/DELETE` | `/api/resource/resources/{id}/` | Admin | Gestionar recurso |
| `GET/POST` | `/api/resource/assignments/` | Auth* / Admin | Asignaciones |
| `GET/PUT/PATCH/DELETE` | `/api/resource/assignments/{id}/` | Admin | Gestionar asignación |

### Mantenimiento — `/api/maintenance/`

| Método | URL | Acceso | Descripción |
|--------|-----|--------|-------------|
| `GET/POST` | `/api/maintenance/maintenances/` | Admin | Mantenimientos |
| `GET/PUT/PATCH/DELETE` | `/api/maintenance/maintenances/{id}/` | Admin | Gestionar mantenimiento |
| `GET` | `/api/maintenance/maintenances/alerts/` | Admin | Alertas próximas (param: `?days=7`) |

> \* Empleados solo ven sus propios recursos y asignaciones activas.

---

## Autenticación con JWT

```http
POST /api/authentication/login/
Content-Type: application/json

{ "username": "usuario", "password": "contraseña" }
```

Luego incluir en cada petición protegida:
```
Authorization: Bearer <access_token>
```

---

## Estados de recursos

| Estado | Valor | Descripción |
|--------|-------|-------------|
| Disponible | `AVAILABLE` | Listo para asignar |
| Asignado | `ASSIGNED` | Tiene asignación activa |
| En mantenimiento | `MAINTENANCE` | No disponible |
| Dado de baja | `RETIRED` | Fuera de servicio |

> No se puede eliminar un recurso con estado `ASSIGNED` o `MAINTENANCE`.

---

## Pruebas

### Pruebas unitarias del backend

```bash
cd introducion

# Ejecutar todas las pruebas
python manage.py test authentication resource

# Con detalle
python manage.py test authentication resource --verbosity=2
```

**54 pruebas** distribuidas en:

| Módulo | Pruebas |
|--------|---------|
| `authentication` | 19 |
| `resource` | 35 |

---

### Pruebas de interfaz (Selenium)

Las pruebas UI están en `introducion/test/ui/` y usan un **usuario de prueba dedicado** creado por el seeder.

#### 1. Instalar dependencias de testing

```bash
cd introducion
pip install pytest selenium webdriver-manager
```

#### 2. Crear el usuario de prueba (seeder)

```bash
python manage.py seed_test_user
```

Crea (o actualiza) el usuario `test_selenium` con rol Administrador. Es **idempotente**: se puede ejecutar múltiples veces sin error.

| Campo | Valor |
|-------|-------|
| Usuario | `test_selenium` |
| Contraseña | `TestUI_2024!` |
| Rol | Administrador |

#### 3. Ejecutar las pruebas UI

Con el backend (`runserver`) y el frontend (`npm run dev`) corriendo:

```bash
cd introducion
pytest test/ui/ -v
```

El `conftest.py` llama automáticamente al seeder antes de abrir el navegador, por lo que el paso 2 es opcional si ya se ejecutó antes.

#### Pruebas disponibles

| Archivo | Test | Descripción |
|---------|------|-------------|
| `test_auth.py` | `test_login_flow` | Login con usuario de prueba y verificación de redirección |
| `test_resources.py` | `test_crear_tipo_recurso` | Crear un tipo de recurso desde el modal |
| `test_resources.py` | `test_crear_recurso_nuevo` | Crear un recurso desde el modal |

---

## Documentación interactiva (backend)

- **Swagger UI:** http://127.0.0.1:8000/api/docs/
- **ReDoc:** http://127.0.0.1:8000/api/redoc/
- **Schema OpenAPI:** http://127.0.0.1:8000/api/schema/

---

## Estructura del proyecto

```
proyectoaulaTendencias20261/
├── introducion/                  # Backend Django
│   ├── authentication/           # Usuarios y autenticación JWT
│   │   ├── management/
│   │   │   └── commands/
│   │   │       └── seed_test_user.py   # Seeder usuario de prueba
│   │   ├── models.py             # CustomUser (cargo, area)
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── permissions.py        # IsAdministrador
│   │   └── signals.py            # Auto-asigna grupo Empleado
│   ├── resource/                 # Recursos y asignaciones
│   ├── maintenance/              # Mantenimientos y alertas
│   ├── test/
│   │   └── ui/                   # Pruebas Selenium
│   │       ├── conftest.py       # Driver + seeder automático
│   │       ├── test_auth.py
│   │       └── test_resources.py
│   └── manage.py
└── mi-app/                       # Frontend React
    ├── src/
    │   ├── features/             # Módulos por dominio (auth, recursos, ...)
    │   ├── pages/                # Páginas de la aplicación
    │   ├── components/           # Componentes compartidos (Modal, Layout...)
    │   ├── routes/               # Definición de rutas
    │   └── store/                # Estado global (Zustand)
    └── vite.config.ts
```

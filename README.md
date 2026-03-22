
# Gestión de Recursos — API REST

API para la gestión de recursos físicos, digitales y espacios dentro de una organización. Permite a administradores crear y asignar recursos, y a empleados consultar los que tienen asignados.

---

## Tecnologías

- Python 3.x
- Django 6.0.2
- Django REST Framework 3.16.1
- Simple JWT 5.5.1
- drf-spectacular 0.29.0 (Swagger/OpenAPI)
- SQLite (desarrollo)

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd introducion

# 2. Crear y activar entorno virtual
python -m venv env
# Windows
env\Scripts\activate
# Linux/Mac
source env/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Aplicar migraciones
python manage.py migrate

# 5. Crear superusuario (primer administrador)
python manage.py createsuperuser

# 6. Iniciar servidor
python manage.py runserver
```

> Accede a la documentación interactiva en: http://127.0.0.1:8000/api/docs/

---

## Roles

| Rol | Cómo se asigna | Permisos |
|-----|----------------|----------|
| **Superusuario** | `createsuperuser` | Acceso total |
| **Administrador** | Grupo `Administrador` (asignar desde `/admin/`) | CRUD completo en todos los endpoints |
| **Empleado** | Grupo `Empleado` (asignado automáticamente al crear usuario) | Solo lectura de sus propios recursos y asignaciones |

---

## Endpoints

### Autenticación — `/api/authentication/`

| Método | URL | Acceso | Descripción |
|--------|-----|--------|-------------|
| `POST` | `/api/authentication/login/` | Público | Obtener tokens JWT |
| `POST` | `/api/authentication/refresh/` | Público | Renovar access token |
| `GET` | `/api/authentication/me/` | Autenticado | Perfil del usuario actual |
| `POST` | `/api/authentication/register/` | Admin | Crear nuevo empleado |
| `GET` | `/api/authentication/users/` | Admin | Listar empleados |
| `GET` | `/api/authentication/users/{id}/` | Admin | Detalle de empleado |
| `PUT/PATCH` | `/api/authentication/users/{id}/` | Admin | Actualizar empleado |
| `DELETE` | `/api/authentication/users/{id}/` | Admin | Eliminar empleado |

### Recursos — `/api/resource/`

| Método | URL | Acceso | Descripción |
|--------|-----|--------|-------------|
| `GET` | `/api/resource/resource-types/` | Autenticado | Listar tipos de recurso |
| `POST` | `/api/resource/resource-types/` | Admin | Crear tipo de recurso |
| `GET/PUT/PATCH/DELETE` | `/api/resource/resource-types/{id}/` | Admin | Gestionar tipo |
| `GET` | `/api/resource/resources/` | Autenticado* | Listar recursos |
| `POST` | `/api/resource/resources/` | Admin | Crear recurso |
| `GET/PUT/PATCH/DELETE` | `/api/resource/resources/{id}/` | Admin | Gestionar recurso |
| `GET` | `/api/resource/assignments/` | Autenticado* | Listar asignaciones |
| `POST` | `/api/resource/assignments/` | Admin | Crear asignación |
| `GET/PUT/PATCH/DELETE` | `/api/resource/assignments/{id}/` | Admin | Gestionar asignación |

> \* Empleados solo ven sus propios recursos y asignaciones activas.

---

## Autenticación con JWT

Todas las peticiones a endpoints protegidos requieren el header:

```
Authorization: Bearer <access_token>
```

**1. Obtener tokens:**
```http
POST /api/authentication/login/
Content-Type: application/json

{
  "username": "usuario",
  "password": "contraseña"
}
```

**Respuesta:**
```json
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}
```

**2. Renovar token:**
```http
POST /api/authentication/refresh/
Content-Type: application/json

{
  "refresh": "eyJ..."
}
```

---

## Ejemplos de uso

### Crear un empleado (admin)
```http
POST /api/authentication/register/
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "username": "jperez",
  "password": "Pass1234!",
  "email": "jperez@empresa.com",
  "first_name": "Juan",
  "last_name": "Pérez",
  "cargo": "Docente",
  "area": "Sistemas"
}
```

### Crear un tipo de recurso (admin)
```http
POST /api/resource/resource-types/
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "name": "Laptop",
  "description": "Computadora portátil",
  "category": "PHYSICAL"
}
```

Categorías disponibles: `PHYSICAL`, `DIGITAL`, `SPACE`

### Crear un recurso (admin)
```http
POST /api/resource/resources/
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "name": "MacBook Pro",
  "code": "LAP-001",
  "type": 1,
  "technical_description": "Apple M2, 16GB RAM",
  "acquisition_date": "2024-01-15",
  "value": "5000000.00",
  "responsible_area": "TI"
}
```

> El estado inicial siempre es `AVAILABLE` sin importar lo que se envíe.

### Asignar un recurso a un empleado (admin)
```http
POST /api/resource/assignments/
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "resource": 1,
  "assignee": 3,
  "start_date": "2025-03-22",
  "expected_return_date": "2025-04-22",
  "notes": "Para uso en proyecto de investigación"
}
```

### Registrar devolución (admin)
```http
PATCH /api/resource/assignments/1/
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "returned_at": "2025-04-10"
}
```

### Ver mis recursos asignados (empleado)
```http
GET /api/resource/resources/
Authorization: Bearer <token_empleado>
```

---

## Estados de recursos

| Estado | Valor | Descripción |
|--------|-------|-------------|
| Disponible | `AVAILABLE` | Listo para asignar |
| Asignado | `ASSIGNED` | Tiene asignación activa |
| En mantenimiento | `MAINTENANCE` | No disponible, no se puede eliminar |
| Dado de baja | `RETIRED` | Fuera de servicio |

> **Regla:** No se puede eliminar un recurso con estado `ASSIGNED` o `MAINTENANCE`.

---

## Pruebas

```bash
# Ejecutar todas las pruebas
python manage.py test authentication resource

# Con detalle
python manage.py test authentication resource --verbosity=2
```

**Cobertura: 54 pruebas** distribuidas en:

| Módulo | Clases de prueba | Pruebas |
|--------|-----------------|---------|
| `authentication` | Modelo, Permiso, Login, Me, Registro, CRUD empleados | 19 |
| `resource` | Modelo recurso, Tipo, Serializer recurso, Serializer asignación, API tipos, API recursos, API asignaciones | 35 |

---

## Documentación interactiva

Disponible en desarrollo:

- **Swagger UI:** http://127.0.0.1:8000/api/docs/
- **ReDoc:** http://127.0.0.1:8000/api/redoc/
- **Schema OpenAPI:** http://127.0.0.1:8000/api/schema/

---

## Estructura del proyecto

```
introducion/
├── authentication/          # App de usuarios y autenticación
│   ├── models.py            # CustomUser (cargo, area)
│   ├── serializers.py       # UserSerializer, RegisterSerializer
│   ├── views.py             # Login, Me, CRUD empleados
│   ├── permissions.py       # IsAdministrador
│   ├── signals.py           # Asigna grupo Empleado al crear usuario
│   └── urls.py
├── resource/                # App de gestión de recursos
│   ├── models.py            # ResourceType, Resource, Assignment
│   ├── serializers.py       # Serializers con validaciones de negocio
│   ├── views.py             # ViewSets con filtrado por rol
│   └── urls.py
└── introducion/             # Configuración del proyecto
    ├── settings.py
    └── urls.py
```

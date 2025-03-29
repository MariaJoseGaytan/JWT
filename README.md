# Guía de Autenticación con JWT + Refresh Tokens (Web & Móvil)

Este proyecto implementa un backend en **Node.js + Express + MongoDB** que autentica usuarios utilizando **JSON Web Tokens (JWT)**. Incluye **access tokens de corta duración** y **refresh tokens para renovar el access token sin volver a iniciar sesión**.

---

## ¿Qué necesitas para que esto funcione?

Antes de probar o modificar el proyecto, **debes tener instalado y configurado lo siguiente**:

- Node.js y npm 
- MongoDB instalado localmente (o usar Atlas)
- Postman para pruebas
- Instalar dependencias del proyecto
```bash
npm install
```
- Crea un archivo `.env` con el siguiente contenido:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/jwt-auth
JWT_SECRET=clave_segura_para_access
JWT_REFRESH_SECRET=clave_segura_para_refresh
JWT_EXPIRATION=60s
JWT_REFRESH_EXPIRATION=60s
```

---

## ¿Cómo funciona el flujo JWT con refresh tokens?

1. El usuario inicia sesión con su correo y contraseña.
2. El backend responde con:
   - `accessToken`: válido por 60 segundos
   - `refreshToken`: válido también por 60 segundos (puedes modificarlo en `.env`)
3. El cliente (app web o móvil):
   - Guarda ambos tokens (por ejemplo, en localStorage o SharedPreferences).
4. El `accessToken` se usa para acceder a rutas protegidas (se manda como `Bearer Token`).
5. Cuando el `accessToken` expira, el backend responde con error 401.
6. El cliente **automáticamente** hace una petición a `/api/refresh` con el `refreshToken`.
7. Si el `refreshToken` es válido, se genera un nuevo `accessToken`, y el usuario sigue navegando sin interrupción.

---

## Endpoints disponibles del proyecto

| Método | Ruta                | Protegida | Descripción                                     |
|--------|---------------------|-----------|-------------------------------------------------|
| POST   | `/api/register`     | No        | Registrar usuario con email y password          |
| POST   | `/api/login`        | No        | Iniciar sesión, retorna accessToken y refreshToken |
| GET    | `/api/protected`    | Sí        | Ruta privada que requiere access token válido   |
| POST   | `/api/refresh`      | No        | Genera un nuevo access token usando el refresh token |

---

## Ejemplo de uso en Postman

### 1. Registrar usuario
`POST /api/register`
```json
{
  "email": "maria@correo.com",
  "password": "123456"
}
```

### 2. Login
`POST /api/login`
```json
{
  "email": "maria@correo.com",
  "password": "123456"
}
```
**Respuesta:**
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### 3. Acceso a ruta protegida
`GET /api/protected`
- Header: `Authorization: Bearer ACCESS_TOKEN`

### 4. Token expirado → usar `/api/refresh`
`POST /api/refresh`
```json
{
  "refreshToken": "..."
}
```
**Respuesta:**
```json
{
  "accessToken": "nuevo_token"
}
```

---

## ¿Cómo vamos a usar esto en nuestras apps web y móvil?

En ambas plataformas, el cliente debe:
1. Guardar el `accessToken` y el `refreshToken` tras login.
2. Usar `accessToken` para acceder a rutas protegidas.
3. Detectar si el access token expiró (status 401).
4. En ese caso, hacer un `POST` a `/api/refresh` con el `refreshToken`.
5. Guardar el nuevo `accessToken` recibido.
6. Reintentar la petición original.

Este flujo se puede automatizar en una función central, por ejemplo:

### Web 
```js
async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem("accessToken");

  let res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");
    const refreshRes = await fetch("/api/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      localStorage.setItem("accessToken", data.accessToken);
      return fetchWithAuth(url, options);
    } else {
      window.location.href = "/login";
    }
  }

  return res;
}
```

---

## Consideraciones:

- En este proyecto de pruebas usamos `60s` para expiración, pero en producción se recomienda:
  - `accessToken`: 15 minutos
  - `refreshToken`: 7 días o más
- Los tokens deben guardarse en lugares seguros según el entorno (cookies httpOnly, encrypted storage, etc.)

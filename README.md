# Guía de Autenticación con JWT + Refresh Tokens (Web & Móvil)

>  **Propósito del proyecto:**  
> Aprender a implementar un sistema de autenticación  usando JSON Web Tokens con `accessToken` de corta duración y `refreshToken` para renovarlo automáticamente sin que el usuario tenga que iniciar sesión otra vez.

Este proyecto implementa un backend en **Node.js + Express + MongoDB** que autentica usuarios utilizando **JWT**. Es compatible tanto con aplicaciones **web como móviles**.

---

## ¿Qué necesitas para que esto funcione?

- Node.js y npm
- MongoDB local (o usar Atlas)
- Postman
- VS Code y GitHub (opcional pero útil)
- Instalación:
```bash
npm install
```
- Crear archivo `.env`:
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

1. El usuario inicia sesión.
2. El backend responde con:
   - `accessToken`: válido por 60 segundos
   - `refreshToken`: válido por 60 segundos (configurable)
3. El cliente guarda ambos tokens.
4. Usa el `accessToken` para acceder a rutas privadas.
5. Si el token expira, se recibe un error `401`.
6. El cliente hace una petición a `/api/refresh` con el `refreshToken`.
7. Se genera un nuevo `accessToken` sin volver a loguear al usuario.

---
---

## ¿Cómo se usan los tokens en el backend (`index.js`)?

En el archivo `index.js`, después de configurar Express y los middlewares, se conectan las rutas de autenticación. Pero lo más importante es cómo se protegen las rutas privadas usando un **middleware** que verifica el `accessToken`.

### 1. Middleware: `verifyToken.js`
```js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(403).json({ message: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Se guarda el usuario en la request
    next(); // Continúa a la ruta protegida
  } catch (err) {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

module.exports = verifyToken;
```

---

### 2. Uso del middleware en rutas protegidas

En el archivo `routes/auth.js` o en cualquier otro archivo de rutas, puedes proteger una ruta así:

```js
const verifyToken = require('../middleware/verifyToken');

router.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: 'Acceso permitido',
    usuario: req.user
  });
});
```

Esto asegura que solo usuarios con un token válido pueden acceder a esa ruta.

---

## Endpoints disponibles

| Método | Ruta             | Protegida | Descripción                                     |
|--------|------------------|-----------|-------------------------------------------------|
| POST   | `/api/register`  | No        | Crear un nuevo usuario                          |
| POST   | `/api/login`     | No        | Iniciar sesión y recibir tokens                 |
| GET    | `/api/protected` | Sí        | Ruta protegida con JWT                          |
| POST   | `/api/refresh`   | No        | Obtener nuevo `accessToken` con `refreshToken` |

---

## Ejemplo de uso en Postman

### 1. Registro
```http
POST /api/register
```
```json
{
  "email": "maria@correo.com",
  "password": "123456"
}
```

### 2. Login
```http
POST /api/login
```
```json
{
  "email": "maria@correo.com",
  "password": "123456"
}
```

**Respuesta esperada:**
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### 3. Ruta protegida
```http
GET /api/protected
```
**Header:**  
```
Authorization: Bearer ACCESS_TOKEN
```

### 4. Token expirado → refrescar
```http
POST /api/refresh
```
```json
{
  "refreshToken": "..."
}
```

---

## ¿Cómo configuramos los tokens?

En el archivo `.env`, puedes definir cuánto tiempo duran los tokens:

```env
JWT_EXPIRATION=60s
JWT_REFRESH_EXPIRATION=60s
```

Estos valores son usados en el código para generar los tokens:

```js
const accessToken = jwt.sign(
  { id: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRATION }
);

const refreshToken = jwt.sign(
  { id: user._id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: process.env.JWT_REFRESH_EXPIRATION }
);
```

La duración puede ser:  
- `'60s'` → 60 segundos  
- `'15m'` → 15 minutos  
- `'7d'` → 7 días  
- o directamente un número en segundos

---

## ¿Cómo usamos esto en nuestras apps web y móvil?

### Flujo del cliente:
1. Guarda `accessToken` y `refreshToken` tras login.
2. Usa `accessToken` en las peticiones protegidas.
3. Si el token expira (401), automáticamente llama a `/api/refresh`.
4. Reemplaza el `accessToken` viejo por el nuevo.
5. Reintenta la petición original.

---

### Ejemplo en Web (JS)
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

## 📌 Consideraciones

- Usa tokens cortos (`60s`) para pruebas. En producción:
  - `accessToken`: 15 min
  - `refreshToken`: 7 días
- Guarda los tokens en:
  - Web: `localStorage` o cookies seguras
  - Móvil: `SharedPreferences` o almacenamiento seguro

## Resumen 

- El `accessToken` viaja en el **header Authorization**
- El backend usa un middleware para verificarlo
- Las rutas privadas solo funcionan si el token es válido
- Si el token expiró, el frontend puede usar el `refreshToken` para obtener uno nuevo automáticamente

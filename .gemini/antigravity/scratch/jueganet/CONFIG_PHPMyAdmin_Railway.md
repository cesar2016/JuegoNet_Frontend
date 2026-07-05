# Configuración de phpMyAdmin para MySQL en Railway

## Información de Conexión

Para conectar phpMyAdmin a tu base de datos MySQL en Railway, necesitarás los siguientes detalles:

### 1. Obtener los Detalles de la Base de Datos

Ve a tu panel de Railway: https://railway.app

1. Selecciona el proyecto: `6c7f0880-ba0b-41bb-b8bd-2fe91ba6fb2b`
2. Haz clic en "Databases" en el menú lateral
3. Haz clic en tu base de datos MySQL
4. Haz clic en "Connect" o "View Details"

Deberías ver algo como:

```
Host: mydb.region.db.railway.internal
Puerto: 3306
Nombre de la Base de Datos: railway
Nombre de Usuario: root
Contraseña: [tu-password-generado]
```

### 2. Configurar phpMyAdmin

Abre phpMyAdmin (normalmente en http://localhost/phpMyAdmin o http://localhost/admin)

**Método 1: Configuración Manual**

1. Haz clic en **Configuración** (icono de engranaje) → **Preferencias** → **SQL queries**
2. Haz clic en **Servidor:** → **Agregar un servidor**
3. Completa la siguiente información:

```
Nombre del servidor: MySQL de Railway
Host: mydb.region.db.railway.internal
Puerto: 3306
Nombre de Usuario: root
Contraseña: [tu-password-generado]
```

4. Haz clic en **Guardar**

**Método 2: Usar la URL de Conexión de Railway**

Railway también proporciona una URL de conexión temporal:

```
mysql://root:[password]@mydb.region.db.railway.internal:3306/railway?charset=utf8mb4&ssl-mode=REQUIRED
```

Puedes usar esta URL con phpMyAdmin si la copias en el campo "Servidor" como:
`root:[password]@mydb.region.db.railway.internal:3306/railway`

### 3. Actualizar el Archivo .env de Laravel

Una vez que tengas los detalles de conexión, actualiza `/home/cesar/.gemini/antigravity/scratch/jueganet/backend/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=mydb.region.db.railway.internal
DB_PORT=3306
DB_DATABASE=railway
DB_USERNAME=root
DB_PASSWORD=[tu-password-generado]
```

### 4. Probar la Conexión

```bash
cd /home/cesar/.gemini/antigravity/scratch/jueganet/backend
php artisan db:connect
```

Si la conexión es exitosa, verás:
```
Connected to MySQL
```

### 5. Probar con phpMyAdmin

1. Abre phpMyAdmin
2. Selecciona tu servidor de Railway de la lista
3. Haz clic en la base de datos `railway`
4. Deberías ver las tablas:
   - `migrations`
   - `orders`
   - `tickets`
   - `raffles`
   - `users`

### 6. Solución de Problemas

**Error 1075: Variable desconocida 'sql_mode'**

Si ves este error, ve a **Configuración** → **Preferencias** → **SQL queries** y desactiva "Evitar edición de múltiples valores"

**Error 1049: Base de datos desconocida 'railway'**

Verifica que el nombre de la base de datos sea correcto en el archivo .env

**Error de conexión SSL**

Railway requiere SSL. phpMyAdmin debería manejar esto automáticamente, pero si tienes problemas:
1. Ve a **Configuración** → **Preferencias** → ** Navegación** 
2. Activa "Forzar SSL"
3. Guarda los cambios

### 7. Script de Configuración Automática

Puedes crear un script para verificar la conexión:

```bash
#!/bin/bash

echo "Verificando conexión a MySQL en Railway..."

echo "DB_HOST=$(grep DB_HOST backend/.env | cut -d'=' -f2)"
echo "DB_PORT=$(grep DB_PORT backend/.env | cut -d'=' -f2)"
echo "DB_DATABASE=$(grep DB_DATABASE backend/.env | cut -d'=' -f2)"
echo "DB_USERNAME=$(grep DB_USERNAME backend/.env | cut -d'=' -f2)"

echo "Probando conexión..."
php artisan db:connect

if [ $? -eq 0 ]; then
    echo "✓ Conexión exitosa a MySQL en Railway"
else
    echo "✗ Error de conexión a MySQL"
    echo "Por favor verifica los detalles de conexión en backend/.env"
fi
```

Guarda este script como `check-railway-connection.sh` y ejecútalo con:
```bash
chmod +x check-railway-connection.sh
./check-railway-connection.sh
```

## Próximos Pasos

1. Obtén los detalles de conexión de tu base de datos en Railway
2. Configura phpMyAdmin con esos detalles
3. Actualiza el archivo .env de Laravel
4. Prueba la conexión
5. ¡Listo para usar!

¿Necesitas ayuda con alguna parte específica del proceso?
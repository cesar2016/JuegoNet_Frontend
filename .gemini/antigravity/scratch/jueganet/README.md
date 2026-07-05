# Configuración de phpMyAdmin para MySQL en Railway

## Resumen

Este script ayuda a configurar phpMyAdmin para conectarse a tu base de datos MySQL en Railway (Proyecto ID: `6c7f0880-ba0b-41bb-b8bd-2fe91ba6fb2b`).

## Pasos de Configuración

### 1. Instalar phpMyAdmin

```bash
# Si usas el script
./setup-phpmyadmin-railway.sh install

# O manualmente
sudo apt-get update
sudo apt-get install -y phpmyadmin
```

### 2. Configurar phpMyAdmin para Apache

```bash
# Si usas el script
./setup-phpmyadmin-railway.sh configure

# O manualmente
sudo cp phpmyadmin.conf /etc/apache2/conf-available/
sudo a2enconf phpmyadmin
sudo systemctl restart apache2
```

### 3. Obtener los Detalles de Conexión de Railway

```bash
# Si usas el script (requiere RAILWAY_API_KEY)
export RAILWAY_API_KEY=tu-api-key-aquí
./setup-phpmyadmin-railway.sh get-details

# O manualmente:
# Ve a https://railway.app/projects/6c7f0880-ba0b-41bb-b8bd-2fe91ba6fb2b/databases
# Copia los detalles de conexión
```

### 4. Actualizar el Archivo .env de Laravel

Edita `/home/cesar/.gemini/antigravity/scratch/jueganet/backend/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=[tu-host]
DB_PORT=3306
DB_DATABASE=railway
DB_USERNAME=root
DB_PASSWORD=[tu-password]
```

### 5. Probar la Conexión

```bash
# Si usas el script
./setup-phpmyadmin-railway.sh test

# O manualmente
cd /home/cesar/.gemini/antigravity/scratch/jueganet/backend
php artisan db:connect
```

## Scripts Disponibles

1. `setup-phpmyadmin-railway.sh` - Script principal de configuración
2. `CONFIG_PHPMyAdmin_Railway.md` - Guía completa de configuración
3. `README_PHPMyAdmin_Railway.md` - Este archivo
4. `phpmyadmin.conf` - Configuración de Apache para phpMyAdmin

## Problemas Comunes y Soluciones

### Error 1075: Variable desconocida 'sql_mode'

**Síntoma:** phpMyAdmin muestra "Error 1075: Variable desconocida 'sql_mode'"

**Solución:**
1. Abre phpMyAdmin
2. Haz clic en **Configuración** (icono de engranaje)
3. Ve a **Preferencias** → **Consultas SQL**
4. Desmarca **Evitar edición de múltiples valores**
5. Haz clic en **Guardar**

### Error 1049: Base de datos desconocida 'railway'

**Síntoma:** phpMyAdmin muestra "Error 1049: Base de datos desconocida 'railway'"

**Solución:**
1. Verifica que el nombre de la base de datos en `backend/.env` sea correcto
2. Asegúrate de que el usuario tenga permisos para acceder a la base de datos
3. Verifica que la base de datos exista en el servidor MySQL

### Error de conexión SSL

**Síntoma:** phpMyAdmin no puede conectarse a MySQL en Railway

**Solución:**
1. Abre phpMyAdmin
2. Haz clic en **Configuración** (icono de engranaje)
3. Ve a **Preferencias** → **Navegación**
4. Activa **Forzar SSL**
5. Haz clic en **Guardar**

### Error de autenticación

**Síntoma:** phpMyAdmin muestra "Acceso no autorizado"

**Solución:**
1. Verifica que el nombre de usuario y contraseña sean correctos
2. Asegúrate de que el usuario tenga permisos para acceder a phpMyAdmin
3. Si usaste autenticación HTTP, verifica que el archivo htpasswd existe

## Próximos Pasos

1. Ejecuta el script de configuración o sigue los pasos manuales
2. Obtén los detalles de conexión de Railway
3. Configura phpMyAdmin con esos detalles
4. Actualiza el archivo .env de Laravel
5. ¡Prueba la conexión!

## Contacto

Si necesitas ayuda, consulta la guía completa en `CONFIG_PHPMyAdmin_Railway.md` o contacta con el soporte de Railway.

## Nota Importante

Este script es una guía para configurar phpMyAdmin con MySQL en Railway. No puede acceder directamente a la API de Railway sin una API key válida. Por favor, sigue los pasos manuales si no tienes una API key.

## Licencia

Este script está bajo licencia MIT.
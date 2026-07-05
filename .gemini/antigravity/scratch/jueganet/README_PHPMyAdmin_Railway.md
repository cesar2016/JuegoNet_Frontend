# Configuración de phpMyAdmin para MySQL en Railway

Este script ayuda a configurar phpMyAdmin para conectarse a tu base de datos MySQL en Railway.

## Requisitos

- Sistema operativo Linux (preferiblemente Ubuntu/Debian)
- Acceso de root (o usar sudo)
- API key de Railway
- Apache2 instalado

## Instalación

1. Clona este repositorio:
```bash
cd /home/cesar/.gemini/antigravity/scratch/jueganet
git clone <tu-repositorio>
cd jueganet
```

2. Haz el script ejecutable:
```bash
chmod +x setup-phpmyadmin-railway.sh
```

3. Ejecuta el script:
```bash
./setup-phpmyadmin-railway.sh
```

## Uso Manual

Si prefieres configurar phpMyAdmin manualmente:

### 1. Instalar phpMyAdmin
```bash
sudo apt-get update
sudo apt-get install -y phpmyadmin
```

### 2. Configurar phpMyAdmin para Apache
```bash
sudo cp phpmyadmin.conf /etc/apache2/conf-available/
sudo a2enconf phpmyadmin
sudo systemctl restart apache2
```

### 3. Obtener los Detalles de Conexión de Railway

Ve a https://railway.app/projects/6c7f0880-ba0b-41bb-b8bd-2fe91ba6fb2b/databases

Haz clic en "Connect" para obtener:
- Host: [tu-host]
- Puerto: 3306
- Base de Datos: railway
- Usuario: root
- Contraseña: [tu-password]

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
cd /home/cesar/.gemini/antigravity/scratch/jueganet/backend
php artisan db:connect
```

## Scripts Disponibles

1. `setup-phpmyadmin-railway.sh` - Script principal de configuración
2. `CONFIG_PHPMyAdmin_Railway.md` - Guía completa de configuración

## Problemas Comunes

### Error 1075: Variable desconocida 'sql_mode'

Ve a phpMyAdmin → Configuración → Preferencias → Consultas SQL → Desactivar "Evitar edición de múltiples valores"

### Error 1049: Base de datos desconocida 'railway'

Verifica que el nombre de la base de datos sea correcto en .env

### Error de conexión SSL

Activa "Forzar SSL" en phpMyAdmin → Configuración → Preferencias → Navegación

## Próximos Pasos

1. Ejecuta el script de configuración o sigue los pasos manuales
2. Obtén los detalles de conexión de Railway
3. Configura phpMyAdmin con esos detalles
4. Actualiza el archivo .env de Laravel
5. ¡Prueba la conexión!

¿Necesitas ayuda con alguna parte específica del proceso?
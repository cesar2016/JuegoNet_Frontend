#!/bin/bash

# Script para configurar phpMyAdmin para MySQL en Railway
# Uso: ./setup-phpmyadmin-railway.sh

set -e

PROJECT_ID="6c7f0880-ba0b-41bb-b8bd-2fe91ba6fb2b"
BACKEND_DIR="/home/cesar/.gemini/antigravity/scratch/jueganet/backend"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

# Función para imprimir mensajes de éxito
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Función para imprimir mensajes de advertencia
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Función para imprimir mensajes de error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Función para imprimir mensajes informativos
print_info() {
    echo -e "ℹ $1"
}

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para verificar si un archivo existe
file_exists() {
    [ -f "$1" ]
}

# Función para verificar si un directorio existe
dir_exists() {
    [ -d "$1" ]
}

# Función para verificar si un paquete está instalado
package_installed() {
    dpkg -l | grep -q "^ii  $1 "
}

# Función para instalar phpMyAdmin
install_phpmyadmin() {
    print_info "Instalando phpMyAdmin..."
    
    if ! command_exists apt-get; then
        print_error "apt-get no está disponible. Por favor instala phpMyAdmin manualmente."
        return 1
    fi
    
    # Instalar phpMyAdmin
    apt-get update
    apt-get install -y phpmyadmin
    
    print_success "phpMyAdmin instalado"
}

# Función para configurar phpMyAdmin
configure_phpmyadmin() {
    print_info "Configurando phpMyAdmin..."
    
    # Verificar si phpMyAdmin está instalado
    if ! dir_exists "/usr/share/phpmyadmin"; then
        print_error "phpMyAdmin no está instalado. Por favor ejecuta el script de instalación primero."
        return 1
    fi
    
    # Copiar la configuración
    cp "$(dirname "$0")/phpmyadmin.conf" "/etc/apache2/conf-available/" 2>/dev/null || true
    
    # Habilitar la configuración
    a2enconf phpmyadmin
    
    # Reiniciar Apache
    systemctl restart apache2
    
    print_success "phpMyAdmin configurado"
}

# Función para obtener los detalles de conexión de Railway
get_railway_connection_details() {
    print_info "Obteniendo detalles de conexión de Railway..."
    
    # Verificar si curl está instalado
    if ! command_exists curl; then
        print_error "curl no está instalado. Por favor instala curl primero."
        return 1
    fi
    
    # Verificar si jq está instalado
    if ! command_exists jq; then
        print_error "jq no está instalado. Por favor instala jq primero."
        return 1
    fi
    
    # Obtener los detalles de conexión usando la API de Railway
    # Nota: Esto es un ejemplo, necesitarás tu propia API key de Railway
    RAILWAY_API_KEY="${RAILWAY_API_KEY:-}"
    
    if [ -z "$RAILWAY_API_KEY" ]; then
        print_warning "RAILWAY_API_KEY no está configurada."
        print_info "Por favor configura tu API key de Railway:"
        print_info "export RAILWAY_API_KEY=tu-api-key-aquí"
        print_info ""
        print_info "También puedes obtener los detalles manualmente desde:"
        print_info "https://railway.app/projects/${PROJECT_ID}/databases"
        return 1
    fi
    
    # Obtener los detalles de la base de datos usando la API de Railway
    DB_DETAILS=$(curl -s -X GET "https://railway.app/api/v2/projects/${PROJECT_ID}/databases" \
        -H "Authorization: Bearer ${RAILWAY_API_KEY}" \
        -H "Content-Type: application/json" | jq '.data[0]')
    
    if [ -z "$DB_DETAILS" ]; then
        print_error "No se pudieron obtener los detalles de la base de datos."
        return 1
    fi
    
    # Extraer los detalles de conexión
    DB_HOST=$(echo "$DB_DETAILS" | jq -r '.connection.host')
    DB_PORT=$(echo "$DB_DETAILS" | jq -r '.connection.port')
    DB_DATABASE=$(echo "$DB_DETAILS" | jq -r '.connection.database')
    DB_USERNAME=$(echo "$DB_DETAILS" | jq -r '.connection.username')
    DB_PASSWORD=$(echo "$DB_DETAILS" | jq -r '.connection.password')
    
    # Guardar los detalles en un archivo
    cat > "${BACKEND_DIR}/.railway-db-details" << EOF
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_DATABASE=${DB_DATABASE}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
EOF
    
    print_success "Detalles de conexión de Railway guardados en ${BACKEND_DIR}/.railway-db-details"
}

# Función para actualizar el archivo .env
update_env_file() {
    print_info "Actualizando archivo .env..."
    
    # Verificar si el archivo .env existe
    if ! file_exists "${BACKEND_DIR}/.env"; then
        print_error "Archivo .env no encontrado en ${BACKEND_DIR}/"
        return 1
    fi
    
    # Verificar si el archivo de detalles existe
    if ! file_exists "${BACKEND_DIR}/.railway-db-details"; then
        print_error "Archivo de detalles de Railway no encontrado."
        return 1
    fi
    
    # Cargar los detalles de conexión
    source "${BACKEND_DIR}/.railway-db-details"
    
    # Actualizar el archivo .env
    sed -i "s|^DB_HOST=.*|DB_HOST=${DB_HOST}|" "${BACKEND_DIR}/.env"
    sed -i "s|^DB_PORT=.*|DB_PORT=${DB_PORT}|" "${BACKEND_DIR}/.env"
    sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_DATABASE}|" "${BACKEND_DIR}/.env"
    sed -i "s|^DB_USERNAME=.*|DB_USERNAME=${DB_USERNAME}|" "${BACKEND_DIR}/.env"
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" "${BACKEND_DIR}/.env"
    
    print_success "Archivo .env actualizado"
}

# Función para probar la conexión
 test_connection() {
    print_info "Probando conexión a MySQL..."
    
    # Verificar si el archivo .env existe
    if ! file_exists "${BACKEND_DIR}/.env"; then
        print_error "Archivo .env no encontrado en ${BACKEND_DIR}/"
        return 1
    fi
    
    # Probar la conexión
    cd "${BACKEND_DIR}"
    if php artisan db:connect; then
        print_success "Conexión exitosa a MySQL"
    else
        print_error "Error al conectar a MySQL"
        return 1
    fi
}

# Función para mostrar el menú principal
show_menu() {
    echo "========================================"
    echo "  Configuración de phpMyAdmin para Railway"
    echo "========================================"
    echo ""
    echo "Proyecto: ${PROJECT_ID}"
    echo "Directorio Backend: ${BACKEND_DIR}"
    echo ""
    echo "Opciones:"
    echo "  1) Instalar phpMyAdmin"
    echo "  2) Configurar phpMyAdmin"
    echo "  3) Obtener detalles de conexión de Railway"
    echo "  4) Actualizar archivo .env"
    echo "  5) Probar conexión"
    echo "  6) Salir"
    echo ""
    echo "========================================"
    echo ""
}

# Función para mostrar el uso
usage() {
    echo "Uso: $0 [opción]"
    echo ""
    echo "Opciones:"
    echo "  install      Instalar phpMyAdmin"
    echo "  configure    Configurar phpMyAdmin"
    echo "  get-details  Obtener detalles de conexión de Railway"
    echo "  update-env   Actualizar archivo .env"
    echo "  test         Probar conexión"
    echo "  all          Ejecutar todas las opciones"
    echo "  help         Mostrar este mensaje de ayuda"
    echo ""
}

# Función principal
main() {
    # Verificar si se proporcionó un argumento
    if [ $# -eq 0 ]; then
        # Mostrar menú interactivo
        while true; do
            show_menu
            read -p "Selecciona una opción (1-6): " choice
            
            case $choice in
                1) install_phpmyadmin ;;
                2) configure_phpmyadmin ;;
                3) get_railway_connection_details ;;
                4) update_env_file ;;
                5) test_connection ;;
                6) exit 0 ;;
                *) print_error "Opción no válida" ;;
            esac
            
            echo ""
            read -p "Presiona Enter para continuar..." dummy
        done
    else
        case $1 in
            install) install_phpmyadmin ;;
            configure) configure_phpmyadmin ;;
            get-details) get_railway_connection_details ;;
            update-env) update_env_file ;;
            test) test_connection ;;
            all)
                install_phpmyadmin
                configure_phpmyadmin
                get_railway_connection_details
                update_env_file
                test_connection
                ;;
            help|*) usage ;;
        esac
    fi
}

# Ejecutar la función principal
main "$@"
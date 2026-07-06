<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Restablecer contraseña</title></head>
<body style="font-family: Arial, sans-serif; background: #f0fdf4; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <h1 style="color: #166534; font-size: 22px; margin: 0 0 8px;">JuegaNet</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5;">Hola <strong>{{ $user->name }}</strong>,</p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5;">Hacé clic en el botón para restablecer tu contraseña. Este enlace expira en 60 minutos.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{{ $resetUrl }}" style="display: inline-block; background: #16a34a; color: white; font-weight: bold; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-size: 15px;">Restablecer contraseña</a>
    </div>
    <p style="color: #6b7280; font-size: 13px;">Si no solicitaste este cambio, ignorá este mensaje.</p>
  </div>
</body>
</html>

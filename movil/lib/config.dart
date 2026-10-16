/// Configuración de la app.
///
/// La URL del servidor se puede cambiar al compilar, por ejemplo para probar
/// contra el computador local desde el emulador de Android:
///   flutter run --dart-define=API_URL=http://10.0.2.2:3000
const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://eventflow-ten-jet.vercel.app',
);

/// Página de la política de tratamiento de datos (Ley 1581 de 2012).
const String urlPolitica = '$apiUrl/politica-de-datos';

/// Validaciones de formularios. Son las mismas reglas de la web
/// (lib/validacion.ts); el servidor las vuelve a aplicar siempre.
library;

String normalizarTelefono(String v) => v.replaceAll(RegExp(r'[\s().-]'), '');

String? validarNombre(String? v) {
  final n = (v ?? '').trim().replaceAll(RegExp(r'\s+'), ' ');
  return n.length < 2 || n.length > 80 ? 'El nombre debe tener entre 2 y 80 caracteres.' : null;
}

String? validarCorreo(String? v) {
  final c = (v ?? '').trim();
  return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(c) && c.length <= 120 ? null : 'El correo no es válido.';
}

String? validarTelefono(String? v, {bool requerido = false}) {
  final t = normalizarTelefono(v ?? '');
  if (t.isEmpty) return requerido ? 'Escribe tu teléfono.' : null;
  return RegExp(r'^\+?\d{7,15}$').hasMatch(t) ? null : 'El teléfono debe tener entre 7 y 15 dígitos.';
}

String? validarDocumento(String? v, {bool requerido = false}) {
  final d = (v ?? '').trim();
  if (d.isEmpty) return requerido ? 'Escribe tu documento.' : null;
  return RegExp(r'^[A-Za-z0-9.-]{5,20}$').hasMatch(d)
      ? null
      : 'Entre 5 y 20 caracteres: letras, números, punto o guion.';
}

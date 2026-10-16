/// Formatos de fechas, dinero y códigos, sin dependencias externas.
library;

const _meses = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const _mesesCortos = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/// "2026-10-18" -> "18 de octubre de 2026".
String fechaLarga(String iso) {
  final f = DateTime.tryParse(iso);
  if (f == null) return iso;
  return '${f.day} de ${_meses[f.month - 1]} de ${f.year}';
}

/// "2026-10-18" -> "18 oct".
String fechaCorta(String iso) {
  final f = DateTime.tryParse(iso);
  if (f == null) return iso;
  return '${f.day} ${_mesesCortos[f.month - 1]}';
}

/// Fecha y hora local de un instante ISO, por ejemplo "18 oct, 6:05 p. m.".
String fechaHora(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final f = DateTime.tryParse(iso)?.toLocal();
  if (f == null) return iso;
  return '${f.day} ${_mesesCortos[f.month - 1]}, ${hora(iso)}';
}

/// Hora local de un instante ISO, por ejemplo "6:05 p. m.".
String hora(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final f = DateTime.tryParse(iso)?.toLocal();
  if (f == null) return iso;
  final h12 = f.hour % 12 == 0 ? 12 : f.hour % 12;
  final mm = f.minute.toString().padLeft(2, '0');
  return '$h12:$mm ${f.hour < 12 ? 'a. m.' : 'p. m.'}';
}

/// 45000 -> "$45.000".
String pesos(num valor) {
  final entero = valor.round().abs().toString();
  final partes = <String>[];
  for (var i = entero.length; i > 0; i -= 3) {
    partes.insert(0, entero.substring(i - 3 < 0 ? 0 : i - 3, i));
  }
  return '${valor < 0 ? '-' : ''}\$${partes.join('.')}';
}

String _nueve(int n) => n.toString().padLeft(9, '0');

/// Códigos oficiales (los mismos de la web, lib/codigos.ts).
String codigoParticipante(int n) => _nueve(n);
String codigoOrganizador(int n) => 'O${_nueve(n)}';
String codigoEvento(int n) => 'E${_nueve(n)}';

/// Hoy en Colombia (UTC-5) como AAAA-MM-DD, igual que el servidor.
String hoyBogota() {
  final ahora = DateTime.now().toUtc().subtract(const Duration(hours: 5));
  return ahora.toIso8601String().substring(0, 10);
}

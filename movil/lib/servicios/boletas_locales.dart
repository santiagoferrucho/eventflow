import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../formato.dart';
import '../modelos.dart';

/// Boleta guardada en el dispositivo para mostrarla sin conexión el día del
/// evento. Solo contiene lo necesario para el ingreso (nombre, evento, QR) y
/// se borra al cerrar sesión.
class BoletaLocal {
  BoletaLocal({
    required this.registroId,
    required this.eventoNombre,
    required this.eventoCodigo,
    required this.fecha,
    required this.lugar,
    required this.categoria,
    required this.participante,
    required this.documento,
    required this.qr,
    required this.guardadaEn,
    this.participanteCodigo,
  });

  final String registroId;
  final String eventoNombre;
  final String eventoCodigo;
  final String fecha;
  final String lugar;
  final String categoria;
  final String participante;
  final String documento;
  final String? participanteCodigo;
  final String qr;
  final String guardadaEn;

  /// Arma la boleta a partir de una inscripción pagada.
  static BoletaLocal? desde(Inscripcion r, Evento? e) {
    final qr = r.boletaCodigoQR;
    if (!r.pagada || qr == null || e == null) return null;
    return BoletaLocal(
      registroId: r.id,
      eventoNombre: e.nombre,
      eventoCodigo: codigoEvento(e.numero),
      fecha: e.fecha,
      lugar: e.lugar,
      categoria: e.categoria(r.categoriaId)?.nombre ?? '—',
      participante: r.participante.nombre,
      documento: r.participante.documento,
      participanteCodigo: r.participanteNumero == null ? null : codigoParticipante(r.participanteNumero!),
      qr: qr,
      guardadaEn: DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toJson() => {
        'registroId': registroId,
        'eventoNombre': eventoNombre,
        'eventoCodigo': eventoCodigo,
        'fecha': fecha,
        'lugar': lugar,
        'categoria': categoria,
        'participante': participante,
        'documento': documento,
        'participanteCodigo': participanteCodigo,
        'qr': qr,
        'guardadaEn': guardadaEn,
      };

  factory BoletaLocal.fromJson(Map<String, dynamic> j) => BoletaLocal(
        registroId: j['registroId'] as String? ?? '',
        eventoNombre: j['eventoNombre'] as String? ?? '',
        eventoCodigo: j['eventoCodigo'] as String? ?? '',
        fecha: j['fecha'] as String? ?? '',
        lugar: j['lugar'] as String? ?? '',
        categoria: j['categoria'] as String? ?? '',
        participante: j['participante'] as String? ?? '',
        documento: j['documento'] as String? ?? '',
        participanteCodigo: j['participanteCodigo'] as String?,
        qr: j['qr'] as String? ?? '',
        guardadaEn: j['guardadaEn'] as String? ?? '',
      );
}

class BoletasLocales {
  static const _clave = 'eventflow.boletas.v1';

  static Future<List<BoletaLocal>> leer() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final crudo = prefs.getString(_clave);
      if (crudo == null) return [];
      final lista = (jsonDecode(crudo) as List)
          .map((e) => BoletaLocal.fromJson(Map<String, dynamic>.from(e as Map)))
          .where((b) => b.qr.isNotEmpty)
          .toList();
      lista.sort((a, b) => a.fecha.compareTo(b.fecha));
      return lista;
    } catch (_) {
      return [];
    }
  }

  /// Guarda (o reemplaza) las boletas de las inscripciones pagadas.
  static Future<void> sincronizar(List<MiInscripcion> inscripciones) async {
    final nuevas = <String, BoletaLocal>{};
    for (final i in inscripciones) {
      final b = BoletaLocal.desde(i.registro, i.evento);
      if (b != null) nuevas[b.registroId] = b;
    }
    await _escribir(nuevas.values.toList());
  }

  static Future<void> guardar(BoletaLocal boleta) async {
    final otras = (await leer()).where((b) => b.registroId != boleta.registroId).toList();
    await _escribir([...otras, boleta]);
  }

  static Future<void> borrarTodas() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_clave);
    } catch (_) {
      // Sin almacenamiento disponible: no hay nada que borrar.
    }
  }

  static Future<void> _escribir(List<BoletaLocal> boletas) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_clave, jsonEncode(boletas.map((b) => b.toJson()).toList()));
    } catch (_) {
      // Si no se puede guardar, la boleta sigue disponible en línea.
    }
  }
}

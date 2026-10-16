import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../modelos.dart';

/// Notificaciones locales de las novedades que publica el organizador.
///
/// No usa un servicio de push externo: cuando la app consulta las novedades
/// (al abrirse o al volver a primer plano), muestra una notificación del
/// sistema por cada novedad que la persona todavía no había visto.
class Notificaciones {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _listo = false;
  static const _claveUltima = 'eventflow.novedades.ultima';

  static const _canal = AndroidNotificationDetails(
    'novedades',
    'Novedades de eventos',
    channelDescription: 'Avisos que envía el organizador de los eventos en los que estás inscrito.',
    importance: Importance.high,
    priority: Priority.high,
  );

  static Future<void> iniciar() async {
    if (_listo) return;
    try {
      const ajustes = InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      );
      await _plugin.initialize(ajustes);
      _listo = true;
    } catch (_) {
      // En plataformas sin soporte (por ejemplo, pruebas) simplemente no se notifica.
    }
  }

  /// Pide el permiso de notificaciones (Android 13 o superior lo exige).
  static Future<void> pedirPermiso() async {
    if (!_listo) return;
    try {
      await _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
    } catch (_) {
      // Si la persona no lo concede, las novedades se siguen viendo dentro de la app.
    }
  }

  /// Notifica las novedades más nuevas que la última vista. La primera vez
  /// solo marca como vistas las existentes, para no inundar a la persona.
  static Future<void> avisarNuevas(List<Novedad> novedades) async {
    if (novedades.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final ultima = prefs.getInt(_claveUltima);
    final maxId = novedades.map((n) => n.id).reduce((a, b) => a > b ? a : b);
    if (ultima != null && _listo) {
      final nuevas = novedades.where((n) => n.id > ultima).toList()..sort((a, b) => a.id.compareTo(b.id));
      for (final n in nuevas.take(5)) {
        try {
          await _plugin.show(
            n.id,
            '${n.eventoNombre}: ${n.titulo}',
            n.mensaje,
            const NotificationDetails(android: _canal),
          );
        } catch (_) {
          // Sin permiso: la novedad igual aparece en la pestaña Novedades.
        }
      }
    }
    if (ultima == null || maxId > ultima) await prefs.setInt(_claveUltima, maxId);
  }

  static Future<void> reiniciar() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_claveUltima);
  }
}

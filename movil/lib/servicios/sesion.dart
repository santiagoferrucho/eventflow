import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../modelos.dart';
import 'api.dart';
import 'boletas_locales.dart';

/// Estado global de la sesión. El token se guarda cifrado en el dispositivo
/// (Keystore de Android) y se borra al cerrar sesión, junto con las boletas
/// guardadas para usar sin conexión.
class Sesion extends ChangeNotifier {
  Sesion({Api? api, FlutterSecureStorage? almacen})
      : api = api ?? Api(),
        _almacen = almacen ?? const FlutterSecureStorage() {
    this.api.alPerderSesion = _sesionVencida;
  }

  final Api api;
  final FlutterSecureStorage _almacen;

  static const _claveToken = 'eventflow.token';
  static const _claveUsuario = 'eventflow.usuario';

  Usuario? usuario;
  bool cargando = true;

  /// Verdadero si el usuario se cargó del dispositivo pero no se pudo
  /// confirmar con el servidor (sin conexión).
  bool sinConexion = false;

  bool get autenticado => usuario != null;

  /// Al abrir la app: recupera la sesión guardada y la confirma con el servidor.
  Future<void> iniciar() async {
    try {
      final token = await _almacen.read(key: _claveToken);
      final guardado = await _almacen.read(key: _claveUsuario);
      if (token != null && guardado != null) {
        api.token = token;
        usuario = Usuario.fromJson(Map<String, dynamic>.from(jsonDecode(guardado) as Map));
        try {
          usuario = await api.yo();
          await _guardarUsuario();
          sinConexion = false;
        } on ApiException catch (e) {
          if (e.sinSesion) {
            await _limpiar();
          } else {
            // Sin red: se deja entrar con los datos guardados (boletas offline).
            sinConexion = true;
          }
        }
      }
    } catch (_) {
      await _limpiar();
    } finally {
      cargando = false;
      notifyListeners();
    }
  }

  Future<void> login(String correo, String password) async {
    final (token, u) = await api.login(correo.trim(), password);
    await _establecer(token, u);
  }

  Future<void> registro({
    required String nombre,
    required String correo,
    required String password,
    required String documento,
    required String telefono,
    required bool aceptaPolitica,
  }) async {
    final (token, u) = await api.registro(
      nombre: nombre,
      correo: correo.trim(),
      password: password,
      documento: documento,
      telefono: telefono,
      aceptaPolitica: aceptaPolitica,
    );
    await _establecer(token, u);
  }

  /// Vuelve a pedir los datos de la persona (por ejemplo tras cambiar la contraseña).
  Future<void> refrescar() async {
    usuario = await api.yo();
    sinConexion = false;
    await _guardarUsuario();
    notifyListeners();
  }

  Future<void> cerrar() async {
    try {
      await api.salir();
    } catch (_) {
      // Aunque el servidor no responda, la sesión se cierra en el dispositivo.
    }
    await _limpiar();
    notifyListeners();
  }

  Future<void> _establecer(String token, Usuario u) async {
    api.token = token;
    usuario = u;
    sinConexion = false;
    await _almacen.write(key: _claveToken, value: token);
    await _guardarUsuario();
    notifyListeners();
  }

  Future<void> _guardarUsuario() async {
    final u = usuario;
    if (u != null) await _almacen.write(key: _claveUsuario, value: jsonEncode(u.toJson()));
  }

  void _sesionVencida() {
    if (usuario == null) return;
    _limpiar().then((_) => notifyListeners());
  }

  Future<void> _limpiar() async {
    api.token = null;
    usuario = null;
    sinConexion = false;
    try {
      await _almacen.delete(key: _claveToken);
      await _almacen.delete(key: _claveUsuario);
    } catch (_) {
      // Si el almacén falla no hay nada más que hacer.
    }
    await BoletasLocales.borrarTodas();
  }
}

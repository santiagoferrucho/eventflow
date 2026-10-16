import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../modelos.dart';

/// Error con un mensaje listo para mostrarse a la persona.
class ApiException implements Exception {
  ApiException(this.mensaje, {this.status = 0});

  final String mensaje;
  final int status;

  /// La sesión venció o el token ya no es válido.
  bool get sinSesion => status == 401;

  @override
  String toString() => mensaje;
}

/// Cliente de la API REST /api/movil del servidor EventFlow.
///
/// Toda la lógica de negocio y los permisos viven en el servidor; aquí solo
/// se envían peticiones con el token de sesión (Authorization: Bearer).
class Api {
  Api({http.Client? cliente}) : _cliente = cliente ?? http.Client();

  final http.Client _cliente;
  String? token;

  /// Se llama cuando el servidor responde 401 (la sesión terminó).
  void Function()? alPerderSesion;

  static const _espera = Duration(seconds: 20);

  Uri _uri(String ruta, [Map<String, String>? query]) =>
      Uri.parse('$apiUrl$ruta').replace(queryParameters: query);

  Map<String, String> get _encabezados => {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<dynamic> get(String ruta, {Map<String, String>? query}) =>
      _enviar(() => _cliente.get(_uri(ruta, query), headers: _encabezados));

  Future<dynamic> post(String ruta, [Map<String, dynamic>? cuerpo]) => _enviar(
        () => _cliente.post(_uri(ruta), headers: _encabezados, body: jsonEncode(cuerpo ?? {})),
      );

  Future<dynamic> _enviar(Future<http.Response> Function() peticion) async {
    http.Response res;
    try {
      res = await peticion().timeout(_espera);
    } on SocketException {
      throw ApiException('Sin conexión a internet. Revisa tu red e intenta de nuevo.');
    } on TimeoutException {
      throw ApiException('El servidor tardó demasiado en responder. Intenta de nuevo.');
    } on http.ClientException {
      throw ApiException('No pudimos conectar con el servidor. Intenta de nuevo.');
    }
    return _procesar(res);
  }

  dynamic _procesar(http.Response res) {
    dynamic datos;
    try {
      datos = res.body.isEmpty ? null : jsonDecode(utf8.decode(res.bodyBytes));
    } on FormatException {
      datos = null;
    }
    if (res.statusCode >= 200 && res.statusCode < 300) return datos;
    final mensaje = datos is Map && datos['error'] is String
        ? datos['error'] as String
        : 'Algo salió mal (código ${res.statusCode}). Intenta de nuevo.';
    if (res.statusCode == 401) alPerderSesion?.call();
    throw ApiException(mensaje, status: res.statusCode);
  }

  // --- Sesión ---

  Future<(String, Usuario)> login(String correo, String password) async {
    final d = await post('/api/movil/auth/login', {'correo': correo, 'password': password});
    return _sesion(d);
  }

  Future<(String, Usuario)> registro({
    required String nombre,
    required String correo,
    required String password,
    required String documento,
    required String telefono,
    required bool aceptaPolitica,
  }) async {
    final d = await post('/api/movil/auth/registro', {
      'nombre': nombre,
      'correo': correo,
      'password': password,
      'documento': documento,
      'telefono': telefono,
      'aceptaPolitica': aceptaPolitica,
    });
    return _sesion(d);
  }

  (String, Usuario) _sesion(dynamic d) {
    final m = Map<String, dynamic>.from(d as Map);
    return (m['token'] as String, Usuario.fromJson(Map<String, dynamic>.from(m['usuario'] as Map)));
  }

  Future<Usuario> yo() async =>
      Usuario.fromJson(Map<String, dynamic>.from(await get('/api/movil/yo') as Map));

  Future<void> salir() async {
    await post('/api/movil/auth/salir');
  }

  Future<void> cambiarPassword(String actual, String nueva, {required bool aceptaPolitica}) async {
    await post('/api/movil/auth/cambiar-password', {
      'actual': actual,
      'nueva': nueva,
      'aceptaPolitica': aceptaPolitica,
    });
  }

  // --- Eventos ---

  List<Map<String, dynamic>> _lista(dynamic d) =>
      (d as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();

  Future<List<Evento>> eventos() async =>
      _lista(await get('/api/movil/eventos')).map(Evento.fromJson).toList();

  Future<List<Evento>> populares() async =>
      _lista(await get('/api/movil/eventos/populares')).map(Evento.fromJson).toList();

  Future<List<EventoCercano>> cercanos(double lat, double lng) async => _lista(
        await get('/api/movil/eventos/cercanos', query: {'lat': '$lat', 'lng': '$lng'}),
      ).map(EventoCercano.fromJson).toList();

  Future<Evento> evento(String id) async =>
      Evento.fromJson(Map<String, dynamic>.from(await get('/api/movil/eventos/$id') as Map));

  // --- Inscripciones ---

  Future<Inscripcion> inscribirse({
    required String eventoId,
    required String categoriaId,
    required String documento,
    required String telefono,
    required Map<String, String> respuestas,
    required bool aceptaPolitica,
  }) async {
    final d = await post('/api/movil/inscripciones', {
      'eventoId': eventoId,
      'categoriaId': categoriaId,
      'documento': documento,
      'telefono': telefono,
      'respuestas': respuestas,
      'aceptaPolitica': aceptaPolitica,
    });
    return Inscripcion.fromJson(Map<String, dynamic>.from(d as Map));
  }

  Future<Inscripcion> pagar(String registroId) async => Inscripcion.fromJson(
        Map<String, dynamic>.from(await post('/api/movil/inscripciones/$registroId/pagar') as Map),
      );

  Future<List<MiInscripcion>> misInscripciones() async =>
      _lista(await get('/api/movil/inscripciones')).map(MiInscripcion.fromJson).toList();

  Future<List<Novedad>> novedades() async =>
      _lista(await get('/api/movil/novedades')).map(Novedad.fromJson).toList();

  /// Sube una imagen para una pregunta de tipo "imagen". Devuelve el valor que
  /// se guarda como respuesta (img:...).
  Future<String> subirImagen(File archivo) async {
    final req = http.MultipartRequest('POST', _uri('/api/imagenes'));
    if (token != null) req.headers['Authorization'] = 'Bearer $token';
    req.files.add(await http.MultipartFile.fromPath('archivo', archivo.path));
    http.Response res;
    try {
      res = await http.Response.fromStream(await _cliente.send(req).timeout(const Duration(seconds: 60)));
    } on SocketException {
      throw ApiException('Sin conexión a internet. Revisa tu red e intenta de nuevo.');
    } on TimeoutException {
      throw ApiException('La imagen tardó demasiado en subir. Intenta con una más liviana.');
    }
    final d = _procesar(res);
    return (d as Map)['valor'] as String;
  }

  // --- Organizador ---

  Future<List<EventoResumen>> misEventosGestion() async =>
      _lista(await get('/api/movil/organizador/eventos')).map(EventoResumen.fromJson).toList();

  Future<EventoGestion> eventoGestion(String id) async => EventoGestion.fromJson(
        Map<String, dynamic>.from(await get('/api/movil/organizador/eventos/$id') as Map),
      );

  Future<Escaneo> escanear(String eventoId, String texto) async => Escaneo.fromJson(
        Map<String, dynamic>.from(
          await post('/api/movil/organizador/eventos/$eventoId/escanear', {'texto': texto}) as Map,
        ),
      );

  /// Registra el ingreso. Devuelve la inscripción y si ya había ingresado antes.
  Future<(Inscripcion, bool)> registrarIngreso(String registroId) async {
    final d = Map<String, dynamic>.from(
      await post('/api/movil/organizador/ingresos', {'registroId': registroId}) as Map,
    );
    return (Inscripcion.fromJson(Map<String, dynamic>.from(d['registro'] as Map)), d['yaIngreso'] == true);
  }

  Future<Evento> cambiarEstado(String eventoId, String estado) async => Evento.fromJson(
        Map<String, dynamic>.from(
          await post('/api/movil/organizador/eventos/$eventoId/estado', {'estado': estado}) as Map,
        ),
      );

  Future<int> enviarNovedad(String eventoId, String titulo, String mensaje) async {
    final d = await post('/api/movil/organizador/eventos/$eventoId/novedades', {
      'titulo': titulo,
      'mensaje': mensaje,
    });
    return ((d as Map)['destinatarios'] as num?)?.toInt() ?? 0;
  }
}

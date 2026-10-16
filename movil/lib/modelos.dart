/// Modelos del dominio. Reflejan exactamente los tipos de la web
/// (lib/types.ts) tal como los devuelve la API /api/movil.
library;

String _s(Object? v) => v is String ? v : (v == null ? '' : v.toString());
String? _sn(Object? v) => v is String ? v : null;
int _i(Object? v) => v is num ? v.toInt() : int.tryParse(_s(v)) ?? 0;
int? _in(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) : null);
double? _dn(Object? v) => v is num ? v.toDouble() : (v is String ? double.tryParse(v) : null);
bool _b(Object? v) => v == true;
Map<String, dynamic> _m(Object? v) => v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};
List<dynamic> _l(Object? v) => v is List ? v : const [];

class Usuario {
  Usuario({
    required this.id,
    required this.nombre,
    required this.correo,
    required this.rol,
    this.telefono,
    this.documento,
    this.numero,
    this.debeCambiarPassword = false,
  });

  final String id;
  final String nombre;
  final String correo;
  final String rol; // participante | organizador | administrador
  final String? telefono;
  final String? documento;
  final int? numero;
  final bool debeCambiarPassword;

  bool get gestiona => rol == 'organizador' || rol == 'administrador';

  /// Código oficial: participantes solo números, organizadores con O.
  String? get codigo {
    final n = numero;
    if (n == null) return null;
    if (rol == 'participante') return n.toString().padLeft(9, '0');
    if (rol == 'organizador') return 'O${n.toString().padLeft(9, '0')}';
    return null;
  }

  factory Usuario.fromJson(Map<String, dynamic> j) => Usuario(
        id: _s(j['id']),
        nombre: _s(j['nombre']),
        correo: _s(j['correo']),
        rol: _s(j['rol']),
        telefono: _sn(j['telefono']),
        documento: _sn(j['documento']),
        numero: _in(j['numero']),
        debeCambiarPassword: _b(j['debeCambiarPassword']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'nombre': nombre,
        'correo': correo,
        'rol': rol,
        'telefono': telefono,
        'documento': documento,
        'numero': numero,
        'debeCambiarPassword': debeCambiarPassword,
      };
}

class Categoria {
  Categoria({
    required this.id,
    required this.nombre,
    required this.cupos,
    required this.cuposDisponibles,
    required this.tarifa,
  });

  final String id;
  final String nombre;
  final int cupos;
  final int cuposDisponibles;
  final int tarifa;

  factory Categoria.fromJson(Map<String, dynamic> j) => Categoria(
        id: _s(j['id']),
        nombre: _s(j['nombre']),
        cupos: _i(j['cupos']),
        cuposDisponibles: _i(j['cuposDisponibles']),
        tarifa: _i(j['tarifa']),
      );
}

/// Pregunta adicional del formulario del organizador (al estilo Google Forms).
class CampoAdicional {
  CampoAdicional({
    required this.id,
    required this.etiqueta,
    required this.tipo,
    required this.requerido,
    this.descripcion,
    this.opciones = const [],
  });

  final String id;
  final String etiqueta;
  final String? descripcion;
  // corta | parrafo | opcion_multiple | casillas | desplegable | fecha | hora | numero | imagen
  final String tipo;
  final bool requerido;
  final List<String> opciones;

  factory CampoAdicional.fromJson(Map<String, dynamic> j) => CampoAdicional(
        id: _s(j['id']),
        etiqueta: _s(j['etiqueta']),
        descripcion: _sn(j['descripcion']),
        tipo: _s(j['tipo']),
        requerido: _b(j['requerido']),
        opciones: _l(j['opciones']).map(_s).toList(),
      );
}

class Recomendacion {
  Recomendacion({required this.tipo, required this.nombre, this.descripcion, this.enlace});

  final String tipo; // hospedaje | comida | transporte | otro
  final String nombre;
  final String? descripcion;
  final String? enlace;

  factory Recomendacion.fromJson(Map<String, dynamic> j) => Recomendacion(
        tipo: _s(j['tipo']),
        nombre: _s(j['nombre']),
        descripcion: _sn(j['descripcion']),
        enlace: _sn(j['enlace']),
      );
}

class Evento {
  Evento({
    required this.id,
    required this.numero,
    required this.organizadorId,
    required this.nombre,
    required this.disciplina,
    required this.fecha,
    required this.lugar,
    required this.descripcion,
    required this.estado,
    required this.categorias,
    required this.camposAdicionales,
    required this.recomendaciones,
    this.latitud,
    this.longitud,
    this.bannerId,
  });

  final String id;
  final int numero;
  final String organizadorId;
  final String nombre;
  final String disciplina;
  final String fecha; // AAAA-MM-DD
  final String lugar;
  final double? latitud;
  final double? longitud;
  final String descripcion;
  final String estado; // borrador | publicado | pausado | cerrado | suspendido
  final List<Categoria> categorias;
  final List<CampoAdicional> camposAdicionales;
  final List<Recomendacion> recomendaciones;
  final String? bannerId;

  bool get tieneUbicacion => latitud != null && longitud != null;
  bool get recibeInscripciones => estado == 'publicado';
  int get cuposTotales => categorias.fold(0, (s, c) => s + c.cupos);
  int get cuposLibres => categorias.fold(0, (s, c) => s + c.cuposDisponibles);
  int get tarifaDesde => categorias.isEmpty
      ? 0
      : categorias.map((c) => c.tarifa).reduce((a, b) => a < b ? a : b);

  /// Ruta relativa del banner público (la sirve la web).
  String? get rutaBanner => bannerId == null ? null : '/api/banners/$id?v=$bannerId';

  Categoria? categoria(String categoriaId) {
    for (final c in categorias) {
      if (c.id == categoriaId) return c;
    }
    return null;
  }

  factory Evento.fromJson(Map<String, dynamic> j) => Evento(
        id: _s(j['id']),
        numero: _i(j['numero']),
        organizadorId: _s(j['organizadorId']),
        nombre: _s(j['nombre']),
        disciplina: _s(j['disciplina']),
        fecha: _s(j['fecha']),
        lugar: _s(j['lugar']),
        latitud: _dn(j['latitud']),
        longitud: _dn(j['longitud']),
        descripcion: _s(j['descripcion']),
        estado: _s(j['estado']),
        categorias: _l(j['categorias']).map((c) => Categoria.fromJson(_m(c))).toList(),
        camposAdicionales:
            _l(j['camposAdicionales']).map((c) => CampoAdicional.fromJson(_m(c))).toList(),
        recomendaciones:
            _l(j['recomendaciones']).map((c) => Recomendacion.fromJson(_m(c))).toList(),
        bannerId: _sn(j['bannerId']),
      );
}

class Participante {
  Participante({required this.nombre, required this.correo, required this.documento, required this.telefono});

  final String nombre;
  final String correo;
  final String documento;
  final String telefono;

  factory Participante.fromJson(Map<String, dynamic> j) => Participante(
        nombre: _s(j['nombre']),
        correo: _s(j['correo']),
        documento: _s(j['documento']),
        telefono: _s(j['telefono']),
      );
}

class Inscripcion {
  Inscripcion({
    required this.id,
    required this.eventoId,
    required this.categoriaId,
    required this.participante,
    required this.respuestas,
    required this.precioPagado,
    required this.estadoPago,
    required this.checkInRealizado,
    required this.creadoEn,
    this.participanteNumero,
    this.boletaCodigoQR,
    this.checkInEn,
    this.checkInPor,
  });

  final String id;
  final String eventoId;
  final String categoriaId;
  final int? participanteNumero;
  final Participante participante;
  final Map<String, String> respuestas;
  final int precioPagado;
  // pendiente | procesando | confirmado | rechazado | expirado
  final String estadoPago;
  final String? boletaCodigoQR;
  final bool checkInRealizado;
  final String? checkInEn;
  final String? checkInPor;
  final String creadoEn;

  bool get pagada => estadoPago == 'confirmado';

  factory Inscripcion.fromJson(Map<String, dynamic> j) => Inscripcion(
        id: _s(j['id']),
        eventoId: _s(j['eventoId']),
        categoriaId: _s(j['categoriaId']),
        participanteNumero: _in(j['participanteNumero']),
        participante: Participante.fromJson(_m(j['participante'])),
        respuestas: _m(j['respuestas']).map((k, v) => MapEntry(k, _s(v))),
        precioPagado: _i(j['precioPagado']),
        estadoPago: _s(j['estadoPago']),
        boletaCodigoQR: _sn(j['boletaCodigoQR']),
        checkInRealizado: _b(j['checkInRealizado']),
        checkInEn: _sn(j['checkInEn']),
        checkInPor: _sn(j['checkInPor']),
        creadoEn: _s(j['creadoEn']),
      );
}

/// Una inscripción con su evento (respuesta de GET /api/movil/inscripciones).
class MiInscripcion {
  MiInscripcion({required this.registro, this.evento});

  final Inscripcion registro;
  final Evento? evento;

  factory MiInscripcion.fromJson(Map<String, dynamic> j) => MiInscripcion(
        registro: Inscripcion.fromJson(_m(j['registro'])),
        evento: j['evento'] == null ? null : Evento.fromJson(_m(j['evento'])),
      );
}

class EventoCercano {
  EventoCercano({required this.evento, required this.distanciaKm});

  final Evento evento;
  final double distanciaKm;

  factory EventoCercano.fromJson(Map<String, dynamic> j) => EventoCercano(
        evento: Evento.fromJson(_m(j['evento'])),
        distanciaKm: _dn(j['distanciaKm']) ?? 0,
      );
}

class Novedad {
  Novedad({
    required this.id,
    required this.eventoId,
    required this.eventoNombre,
    required this.titulo,
    required this.mensaje,
    required this.enviadoEn,
  });

  final int id;
  final String eventoId;
  final String eventoNombre;
  final String titulo;
  final String mensaje;
  final String enviadoEn;

  factory Novedad.fromJson(Map<String, dynamic> j) => Novedad(
        id: _i(j['id']),
        eventoId: _s(j['eventoId']),
        eventoNombre: _s(j['eventoNombre']),
        titulo: _s(j['titulo']),
        mensaje: _s(j['mensaje']),
        enviadoEn: _s(j['enviadoEn']),
      );
}

/// Evento del organizador con sus cifras.
class EventoResumen {
  EventoResumen({
    required this.evento,
    required this.inscritos,
    required this.confirmados,
    required this.ingresados,
    required this.recaudo,
  });

  final Evento evento;
  final int inscritos;
  final int confirmados;
  final int ingresados;
  final int recaudo;

  factory EventoResumen.fromJson(Map<String, dynamic> j) => EventoResumen(
        evento: Evento.fromJson(_m(j['evento'])),
        inscritos: _i(j['inscritos']),
        confirmados: _i(j['confirmados']),
        ingresados: _i(j['ingresados']),
        recaudo: _i(j['recaudo']),
      );
}

class EventoGestion {
  EventoGestion({required this.evento, required this.registros});

  final Evento evento;
  final List<Inscripcion> registros;

  factory EventoGestion.fromJson(Map<String, dynamic> j) => EventoGestion(
        evento: Evento.fromJson(_m(j['evento'])),
        registros: _l(j['registros']).map((r) => Inscripcion.fromJson(_m(r))).toList(),
      );
}

class RespuestaVista {
  RespuestaVista(this.etiqueta, this.valor);
  final String etiqueta;
  final String valor;
}

/// Resultado de leer un QR en la puerta.
class Escaneo {
  Escaneo({required this.estado, this.registro, this.categoria, this.respuestas = const [], this.eventoNombre});

  // listo | ya_ingreso | pago_pendiente | otro_evento | no_valido
  final String estado;
  final Inscripcion? registro;
  final String? categoria;
  final List<RespuestaVista> respuestas;
  final String? eventoNombre;

  factory Escaneo.fromJson(Map<String, dynamic> j) {
    final info = j['info'] == null ? null : _m(j['info']);
    return Escaneo(
      estado: _s(j['estado']),
      eventoNombre: _sn(j['eventoNombre']),
      registro: info == null ? null : Inscripcion.fromJson(_m(info['registro'])),
      categoria: info == null ? null : _s(info['categoria']),
      respuestas: info == null
          ? const []
          : _l(info['respuestas'])
              .map((r) => RespuestaVista(_s(_m(r)['etiqueta']), _s(_m(r)['valor'])))
              .toList(),
    );
  }
}

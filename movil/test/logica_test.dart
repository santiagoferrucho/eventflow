import 'package:eventflow/formato.dart';
import 'package:eventflow/modelos.dart';
import 'package:eventflow/servicios/boletas_locales.dart';
import 'package:eventflow/validacion.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('formato', () {
    test('pesos colombianos con separador de miles', () {
      expect(pesos(45000), r'$45.000');
      expect(pesos(1250000), r'$1.250.000');
      expect(pesos(0), r'$0');
      expect(pesos(999), r'$999');
    });

    test('fechas en español', () {
      expect(fechaLarga('2026-10-20'), '20 de octubre de 2026');
      expect(fechaCorta('2026-01-05'), '5 ene');
      expect(fechaLarga('no-es-fecha'), 'no-es-fecha');
    });

    test('códigos oficiales iguales a la web', () {
      expect(codigoParticipante(12), '000000012');
      expect(codigoOrganizador(7), 'O000000007');
      expect(codigoEvento(45), 'E000000045');
    });
  });

  group('validación (mismas reglas que lib/validacion.ts)', () {
    test('teléfono', () {
      expect(validarTelefono('300 123 4567', requerido: true), isNull);
      expect(validarTelefono('+57 (300) 123-4567'), isNull);
      expect(validarTelefono('123', requerido: true), isNotNull);
      expect(validarTelefono('', requerido: true), isNotNull);
      expect(validarTelefono(''), isNull);
    });

    test('documento', () {
      expect(validarDocumento('1098765432', requerido: true), isNull);
      expect(validarDocumento('12', requerido: true), isNotNull);
      expect(validarDocumento('abc 123', requerido: true), isNotNull);
    });

    test('nombre y correo', () {
      expect(validarNombre('Ana'), isNull);
      expect(validarNombre('A'), isNotNull);
      expect(validarCorreo('ana@test.co'), isNull);
      expect(validarCorreo('ana@'), isNotNull);
    });
  });

  group('modelos', () {
    final eventoJson = <String, dynamic>{
      'id': 'evt-1',
      'numero': 45,
      'organizadorId': 'org-1',
      'organizadorNumero': 7,
      'nombre': 'Carrera Atardecer',
      'disciplina': 'Running',
      'fecha': '2026-10-20',
      'lugar': 'Parque de los Niños',
      'latitud': 7.12,
      'longitud': -73.12,
      'descripcion': 'Carrera nocturna',
      'estado': 'publicado',
      'categorias': [
        {'id': 'c5', 'nombre': '5K', 'cupos': 200, 'cuposDisponibles': 137, 'tarifa': 45000},
        {'id': 'c10', 'nombre': '10K', 'cupos': 150, 'cuposDisponibles': 62, 'tarifa': 60000},
      ],
      'camposAdicionales': [
        {'id': 't', 'etiqueta': 'Talla', 'tipo': 'opcion_multiple', 'requerido': true, 'opciones': ['S', 'M']},
      ],
      'recomendaciones': [
        {'id': 'r1', 'tipo': 'hospedaje', 'nombre': 'Hotel Centro', 'enlace': 'https://ejemplo.co'},
      ],
      'bannerId': null,
      'creadoEn': '2026-10-01T10:00:00.000Z',
    };

    test('evento: cupos, tarifa mínima y ubicación', () {
      final e = Evento.fromJson(eventoJson);
      expect(e.cuposTotales, 350);
      expect(e.cuposLibres, 199);
      expect(e.tarifaDesde, 45000);
      expect(e.tieneUbicacion, isTrue);
      expect(e.recibeInscripciones, isTrue);
      expect(e.categoria('c10')?.nombre, '10K');
      expect(e.camposAdicionales.single.opciones, ['S', 'M']);
      expect(e.rutaBanner, isNull);
    });

    test('boleta local solo para inscripciones pagadas', () {
      final e = Evento.fromJson(eventoJson);
      Inscripcion inscripcion(String estado, String? qr) => Inscripcion.fromJson({
            'id': 'reg-abc',
            'eventoId': 'evt-1',
            'categoriaId': 'c5',
            'userId': 'u1',
            'participanteNumero': 12,
            'participante': {'nombre': 'Ana', 'correo': 'ana@test.co', 'documento': '1098', 'telefono': '300'},
            'respuestas': {'t': 'M'},
            'precioPagado': 45000,
            'estadoPago': estado,
            'boletaCodigoQR': qr,
            'checkInRealizado': false,
            'checkInEn': null,
            'checkInPor': null,
            'creadoEn': '2026-10-02T10:00:00.000Z',
          });

      expect(BoletaLocal.desde(inscripcion('pendiente', null), e), isNull);
      final b = BoletaLocal.desde(inscripcion('confirmado', 'EVENTFLOW:reg-abc'), e)!;
      expect(b.qr, 'EVENTFLOW:reg-abc');
      expect(b.categoria, '5K');
      expect(b.participanteCodigo, '000000012');
      expect(b.eventoCodigo, 'E000000045');
      final copia = BoletaLocal.fromJson(b.toJson());
      expect(copia.registroId, b.registroId);
      expect(copia.qr, b.qr);
    });

    test('resultado del escáner', () {
      final r = Escaneo.fromJson({
        'estado': 'otro_evento',
        'eventoNombre': 'Otra carrera',
      });
      expect(r.estado, 'otro_evento');
      expect(r.registro, isNull);
      expect(r.eventoNombre, 'Otra carrera');
    });
  });
}

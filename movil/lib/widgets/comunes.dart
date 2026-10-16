import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../formato.dart';
import '../modelos.dart';
import '../tema.dart';

/// Abre un enlace en la app que corresponda (navegador, Maps, Waze...).
Future<void> abrirEnlace(BuildContext context, String url) async {
  final uri = Uri.tryParse(url);
  final ok = uri != null && await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!ok && context.mounted) {
    mostrarMensaje(context, 'No pudimos abrir el enlace.');
  }
}

void mostrarMensaje(BuildContext context, String texto, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(texto),
      backgroundColor: error ? Colores.peligro : null,
      behavior: SnackBarBehavior.floating,
    ));
}

/// Pantalla de error con botón para reintentar.
class VistaError extends StatelessWidget {
  const VistaError({super.key, required this.mensaje, required this.alReintentar});

  final String mensaje;
  final VoidCallback alReintentar;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined, size: 48, color: Colores.tintaTenue),
            const SizedBox(height: 12),
            Text(mensaje, textAlign: TextAlign.center, style: const TextStyle(color: Colores.tintaSuave)),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: alReintentar,
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Mensaje centrado para listas vacías.
class VistaVacia extends StatelessWidget {
  const VistaVacia({super.key, required this.icono, required this.texto});

  final IconData icono;
  final String texto;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      child: Column(
        children: [
          Icon(icono, size: 48, color: Colores.tintaTenue),
          const SizedBox(height: 12),
          Text(texto, textAlign: TextAlign.center, style: const TextStyle(color: Colores.tintaSuave)),
        ],
      ),
    );
  }
}

/// Etiqueta pequeña de color (estado, disciplina...).
class Insignia extends StatelessWidget {
  const Insignia(this.texto, {super.key, this.color = Colores.marca, this.fondo = Colores.marcaSuave});

  final String texto;
  final Color color;
  final Color fondo;

  factory Insignia.estadoPago(String estado) {
    switch (estado) {
      case 'confirmado':
        return const Insignia('Pagada', color: Colores.exito, fondo: Colores.exitoSuave);
      case 'expirado':
        return const Insignia('Reserva vencida', color: Colores.tintaSuave, fondo: Colores.linea);
      case 'rechazado':
        return const Insignia('Rechazada', color: Colores.peligro, fondo: Colores.peligroSuave);
      default:
        return const Insignia('Pago pendiente', color: Colores.oro, fondo: Colores.oroSuave);
    }
  }

  factory Insignia.estadoEvento(String estado) {
    switch (estado) {
      case 'publicado':
        return const Insignia('Publicado', color: Colores.exito, fondo: Colores.exitoSuave);
      case 'pausado':
        return const Insignia('Pausado', color: Colores.oro, fondo: Colores.oroSuave);
      case 'suspendido':
        return const Insignia('Suspendido', color: Colores.peligro, fondo: Colores.peligroSuave);
      case 'cerrado':
        return const Insignia('Cerrado', color: Colores.tintaSuave, fondo: Colores.linea);
      default:
        return Insignia(estado);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: fondo, borderRadius: BorderRadius.circular(999)),
      child: Text(texto, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}

/// Banner del evento (o un degradado con el ícono si no tiene).
class BannerEvento extends StatelessWidget {
  const BannerEvento({super.key, required this.evento, this.alto = 140});

  final Evento evento;
  final double alto;

  @override
  Widget build(BuildContext context) {
    final ruta = evento.rutaBanner;
    final respaldo = Container(
      height: alto,
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Colores.marca, Colores.acento]),
      ),
      alignment: Alignment.center,
      child: const Icon(Icons.directions_run, color: Colors.white70, size: 48),
    );
    if (ruta == null) return respaldo;
    return Image.network(
      '$apiUrl$ruta',
      height: alto,
      width: double.infinity,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => respaldo,
    );
  }
}

/// Tarjeta de evento para las listas.
class TarjetaEvento extends StatelessWidget {
  const TarjetaEvento({
    super.key,
    required this.evento,
    required this.alTocar,
    this.distanciaKm,
    this.compacta = false,
  });

  final Evento evento;
  final VoidCallback alTocar;
  final double? distanciaKm;

  /// Versión de alto fijo para los carruseles horizontales.
  final bool compacta;

  @override
  Widget build(BuildContext context) {
    final libres = evento.cuposLibres;
    final total = evento.cuposTotales;
    final ocupacion = total == 0 ? 0.0 : (total - libres) / total;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: alTocar,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            BannerEvento(evento: evento, alto: compacta ? 100 : 130),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Insignia(evento.disciplina),
                      const Spacer(),
                      if (distanciaKm != null)
                        Text('${distanciaKm!.toStringAsFixed(distanciaKm! < 10 ? 1 : 0)} km',
                            style: const TextStyle(color: Colores.tintaSuave, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(evento.nombre,
                      maxLines: compacta ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colores.tinta)),
                  const SizedBox(height: 4),
                  Text('${fechaLarga(evento.fecha)} · ${evento.lugar}',
                      maxLines: compacta ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colores.tintaSuave, fontSize: 13)),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      value: ocupacion,
                      minHeight: 6,
                      backgroundColor: Colores.linea,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        libres == 0 ? 'Agotado' : '$libres cupos disponibles',
                        style: TextStyle(
                          color: libres == 0 ? Colores.peligro : Colores.tintaSuave,
                          fontSize: 13,
                        ),
                      ),
                      const Spacer(),
                      Text('Desde ${pesos(evento.tarifaDesde)}',
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Colores.marcaOscura)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Casilla obligatoria de la política de datos (Ley 1581 de 2012).
/// Siempre empieza desmarcada; el servidor también exige la aceptación.
class AceptarPolitica extends StatelessWidget {
  const AceptarPolitica({super.key, required this.valor, required this.alCambiar, required this.para});

  final bool valor;
  final ValueChanged<bool> alCambiar;

  /// Para qué se usan los datos, por ejemplo "gestionar mi inscripción".
  final String para;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Checkbox(value: valor, onChanged: (v) => alCambiar(v ?? false)),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text.rich(
              TextSpan(
                style: const TextStyle(color: Colores.tintaSuave, fontSize: 13),
                children: [
                  const TextSpan(text: 'Autorizo el tratamiento de mis datos personales para '),
                  TextSpan(text: para),
                  const TextSpan(text: ', según la '),
                  TextSpan(
                    text: 'política de tratamiento de datos',
                    style: const TextStyle(color: Colores.marcaOscura, fontWeight: FontWeight.w600),
                    recognizer: TapGestureRecognizer()..onTap = () => abrirEnlace(context, urlPolitica),
                  ),
                  const TextSpan(text: '.'),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Cifra grande con su etiqueta (paneles del organizador).
class Cifra extends StatelessWidget {
  const Cifra({super.key, required this.valor, required this.etiqueta});

  final String valor;
  final String etiqueta;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        child: Column(
          children: [
            FittedBox(
              child: Text(valor,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colores.marcaOscura)),
            ),
            const SizedBox(height: 2),
            Text(etiqueta, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: Colores.tintaSuave)),
          ],
        ),
      ),
    );
  }
}

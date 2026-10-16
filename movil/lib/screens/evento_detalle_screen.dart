import 'package:flutter/material.dart';

import '../formato.dart';
import '../modelos.dart';
import '../servicios/api.dart';
import '../tema.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';
import 'inscripcion_screen.dart';

/// Ficha del evento: datos, ubicación (Google Maps / Waze), categorías con su
/// cupo y tarifa, y recomendaciones de hospedaje, comida y transporte.
class EventoDetalleScreen extends StatefulWidget {
  const EventoDetalleScreen({super.key, required this.eventoId, this.inicial});

  final String eventoId;
  final Evento? inicial;

  @override
  State<EventoDetalleScreen> createState() => _EventoDetalleScreenState();
}

class _EventoDetalleScreenState extends State<EventoDetalleScreen> {
  Evento? _evento;
  String? _error;

  @override
  void initState() {
    super.initState();
    _evento = widget.inicial;
    _cargar();
  }

  Future<void> _cargar() async {
    try {
      final e = await SesionScope.leer(context).api.evento(widget.eventoId);
      if (mounted) setState(() => _evento = e);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    }
  }

  String _urlMaps(Evento e) => e.tieneUbicacion
      ? 'https://www.google.com/maps/search/?api=1&query=${e.latitud},${e.longitud}'
      : 'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(e.lugar)}';

  String _urlWaze(Evento e) => e.tieneUbicacion
      ? 'https://waze.com/ul?ll=${e.latitud},${e.longitud}&navigate=yes'
      : 'https://waze.com/ul?q=${Uri.encodeComponent(e.lugar)}&navigate=yes';

  Future<void> _inscribirse(Evento e, Categoria c) async {
    final resultado = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => InscripcionScreen(evento: e, categoria: c)),
    );
    if (resultado == true) _cargar();
  }

  @override
  Widget build(BuildContext context) {
    final e = _evento;
    if (e == null) {
      return Scaffold(
        appBar: AppBar(),
        body: _error != null
            ? VistaError(mensaje: _error!, alReintentar: _cargar)
            : const Center(child: CircularProgressIndicator()),
      );
    }
    final pasado = e.fecha.compareTo(hoyBogota()) < 0;
    return Scaffold(
      appBar: AppBar(title: Text(codigoEvento(e.numero), style: const TextStyle(fontSize: 14))),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: ListView(
          children: [
            BannerEvento(evento: e, alto: 190),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Insignia(e.disciplina),
                    const SizedBox(width: 8),
                    if (!e.recibeInscripciones) Insignia.estadoEvento(e.estado),
                  ]),
                  const SizedBox(height: 10),
                  Text(e.nombre,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colores.tinta)),
                  const SizedBox(height: 12),
                  _dato(Icons.calendar_today_outlined, fechaLarga(e.fecha)),
                  _dato(Icons.place_outlined, e.lugar),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => abrirEnlace(context, _urlMaps(e)),
                        icon: const Icon(Icons.map_outlined),
                        label: const Text('Google Maps'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => abrirEnlace(context, _urlWaze(e)),
                        icon: const Icon(Icons.navigation_outlined),
                        label: const Text('Waze'),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 20),
                  Text(e.descripcion, style: const TextStyle(color: Colores.tintaSuave, height: 1.4)),
                  const SizedBox(height: 24),
                  const Text('Categorías',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colores.tinta)),
                  const SizedBox(height: 8),
                  if (pasado)
                    const Text('Este evento ya se realizó.', style: TextStyle(color: Colores.tintaSuave))
                  else if (!e.recibeInscripciones)
                    const Text('Este evento no está recibiendo inscripciones en este momento.',
                        style: TextStyle(color: Colores.tintaSuave)),
                  for (final c in e.categorias) ...[
                    _categoria(e, c, habilitada: e.recibeInscripciones && !pasado),
                    const SizedBox(height: 8),
                  ],
                  if (e.recomendaciones.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Text('Recomendaciones del organizador',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colores.tinta)),
                    const SizedBox(height: 8),
                    for (final r in e.recomendaciones) _recomendacion(r),
                  ],
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dato(IconData icono, String texto) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icono, size: 18, color: Colores.tintaSuave),
          const SizedBox(width: 8),
          Expanded(child: Text(texto, style: const TextStyle(color: Colores.tinta))),
        ]),
      );

  Widget _categoria(Evento e, Categoria c, {required bool habilitada}) {
    final agotada = c.cuposDisponibles <= 0;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(c.nombre, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 2),
                  Text('${c.cuposDisponibles} de ${c.cupos} cupos · ${pesos(c.tarifa)}',
                      style: const TextStyle(color: Colores.tintaSuave, fontSize: 13)),
                ],
              ),
            ),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(110, 44)),
              onPressed: habilitada && !agotada ? () => _inscribirse(e, c) : null,
              child: Text(agotada ? 'Agotado' : 'Inscribirme'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _recomendacion(Recomendacion r) {
    final icono = switch (r.tipo) {
      'hospedaje' => Icons.hotel_outlined,
      'comida' => Icons.restaurant_outlined,
      'transporte' => Icons.directions_bus_outlined,
      _ => Icons.lightbulb_outline,
    };
    final enlace = r.enlace;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icono, color: Colores.marca),
        title: Text(r.nombre),
        subtitle: r.descripcion == null ? null : Text(r.descripcion!),
        trailing: enlace == null ? null : const Icon(Icons.open_in_new, size: 18),
        onTap: enlace == null ? null : () => abrirEnlace(context, enlace),
      ),
    );
  }
}

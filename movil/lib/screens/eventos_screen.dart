import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../modelos.dart';
import '../servicios/api.dart';
import '../tema.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';
import 'evento_detalle_screen.dart';

/// Lista de eventos con buscador y la sección de cercanos / populares.
///
/// La ubicación se pide solo cuando la persona pulsa "Ver eventos cercanos",
/// después de explicarle para qué se usa. Si no la comparte, se muestran los
/// eventos más populares. La ubicación no se guarda en ningún lado.
class EventosScreen extends StatefulWidget {
  const EventosScreen({super.key});

  @override
  State<EventosScreen> createState() => _EventosScreenState();
}

class _EventosScreenState extends State<EventosScreen> {
  List<Evento>? _eventos;
  List<Evento> _populares = [];
  List<EventoCercano>? _cercanos;
  String? _error;
  String _busqueda = '';
  String? _disciplina;
  bool _buscandoUbicacion = false;
  String? _avisoUbicacion;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final api = SesionScope.leer(context).api;
    setState(() => _error = null);
    try {
      final resultados = await Future.wait([api.eventos(), api.populares()]);
      if (!mounted) return;
      setState(() {
        _eventos = resultados[0];
        _populares = resultados[1];
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    }
  }

  Future<void> _verCercanos() async {
    final acepta = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eventos cerca de ti'),
        content: const Text(
          'Usaremos tu ubicación aproximada solo para ordenar los eventos por distancia. '
          'No la guardamos ni la compartimos. Si prefieres no compartirla, te mostramos los eventos más populares.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Ahora no')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Compartir ubicación')),
        ],
      ),
    );
    if (acepta != true || !mounted) {
      setState(() => _avisoUbicacion = 'Te mostramos los eventos más populares.');
      return;
    }
    final api = SesionScope.leer(context).api;
    setState(() {
      _buscandoUbicacion = true;
      _avisoUbicacion = null;
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw _SinUbicacion('Activa la ubicación del celular para ver los eventos cercanos.');
      }
      var permiso = await Geolocator.checkPermission();
      if (permiso == LocationPermission.denied) permiso = await Geolocator.requestPermission();
      if (permiso == LocationPermission.denied || permiso == LocationPermission.deniedForever) {
        throw _SinUbicacion('No diste permiso de ubicación. Te mostramos los eventos más populares.');
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.low, timeLimit: Duration(seconds: 15)),
      );
      final cercanos = await api.cercanos(pos.latitude, pos.longitude);
      if (!mounted) return;
      setState(() {
        _cercanos = cercanos;
        if (cercanos.isEmpty) _avisoUbicacion = 'No hay eventos con ubicación cerca. Mira los más populares.';
      });
    } on _SinUbicacion catch (e) {
      if (mounted) setState(() => _avisoUbicacion = e.mensaje);
    } on ApiException catch (e) {
      if (mounted) setState(() => _avisoUbicacion = e.mensaje);
    } catch (_) {
      if (mounted) setState(() => _avisoUbicacion = 'No pudimos obtener tu ubicación. Te mostramos los más populares.');
    } finally {
      if (mounted) setState(() => _buscandoUbicacion = false);
    }
  }

  void _abrir(Evento e) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => EventoDetalleScreen(eventoId: e.id, inicial: e)));
  }

  List<Evento> get _filtrados {
    final q = _busqueda.trim().toLowerCase();
    return (_eventos ?? []).where((e) {
      if (_disciplina != null && e.disciplina != _disciplina) return false;
      if (q.isEmpty) return true;
      return '${e.nombre} ${e.lugar} ${e.disciplina}'.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final eventos = _eventos;
    return Scaffold(
      appBar: AppBar(title: const Text('Eventos')),
      body: _error != null && eventos == null
          ? VistaError(mensaje: _error!, alReintentar: _cargar)
          : eventos == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _cargar,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _seccionCercanos(),
                      const SizedBox(height: 20),
                      TextField(
                        decoration: const InputDecoration(
                          hintText: 'Buscar por nombre, lugar o disciplina',
                          prefixIcon: Icon(Icons.search),
                        ),
                        onChanged: (v) => setState(() => _busqueda = v),
                      ),
                      const SizedBox(height: 8),
                      _filtroDisciplinas(eventos),
                      const SizedBox(height: 8),
                      Text('Próximos eventos (${_filtrados.length})',
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Colores.tintaSuave)),
                      const SizedBox(height: 8),
                      if (_filtrados.isEmpty)
                        const VistaVacia(icono: Icons.event_busy, texto: 'No hay eventos que coincidan.'),
                      for (final e in _filtrados) ...[
                        TarjetaEvento(evento: e, alTocar: () => _abrir(e)),
                        const SizedBox(height: 12),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _filtroDisciplinas(List<Evento> eventos) {
    final disciplinas = eventos.map((e) => e.disciplina).toSet().toList()..sort();
    if (disciplinas.length < 2) return const SizedBox.shrink();
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: const Text('Todas'),
              selected: _disciplina == null,
              onSelected: (_) => setState(() => _disciplina = null),
            ),
          ),
          for (final d in disciplinas)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(d),
                selected: _disciplina == d,
                onSelected: (_) => setState(() => _disciplina = _disciplina == d ? null : d),
              ),
            ),
        ],
      ),
    );
  }

  Widget _seccionCercanos() {
    final cercanos = _cercanos;
    final mostrarCercanos = cercanos != null && cercanos.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                mostrarCercanos ? 'Cerca de ti' : 'Populares',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colores.tinta),
              ),
            ),
            TextButton.icon(
              onPressed: _buscandoUbicacion ? null : _verCercanos,
              icon: _buscandoUbicacion
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.my_location, size: 18),
              label: const Text('Cercanos'),
            ),
          ],
        ),
        if (_avisoUbicacion != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(_avisoUbicacion!, style: const TextStyle(color: Colores.tintaSuave, fontSize: 13)),
          ),
        SizedBox(
          height: 280,
          child: mostrarCercanos
              ? ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: cercanos.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (_, i) => SizedBox(
                    width: 280,
                    child: TarjetaEvento(
                      evento: cercanos[i].evento,
                      distanciaKm: cercanos[i].distanciaKm,
                      compacta: true,
                      alTocar: () => _abrir(cercanos[i].evento),
                    ),
                  ),
                )
              : _populares.isEmpty
                  ? const VistaVacia(icono: Icons.local_fire_department_outlined, texto: 'Aún no hay eventos populares.')
                  : ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _populares.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (_, i) => SizedBox(
                        width: 280,
                        child: TarjetaEvento(
                          evento: _populares[i],
                          compacta: true,
                          alTocar: () => _abrir(_populares[i]),
                        ),
                      ),
                    ),
        ),
      ],
    );
  }
}

class _SinUbicacion implements Exception {
  _SinUbicacion(this.mensaje);
  final String mensaje;
}

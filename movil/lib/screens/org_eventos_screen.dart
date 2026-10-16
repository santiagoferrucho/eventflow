import 'package:flutter/material.dart';

import '../formato.dart';
import '../modelos.dart';
import '../servicios/api.dart';
import '../tema.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';
import 'escaner_screen.dart';
import 'org_evento_screen.dart';

/// Eventos que gestiona el organizador (el administrador ve todos), con sus
/// cifras. Crear y editar eventos se hace desde el panel web.
class OrgEventosScreen extends StatefulWidget {
  const OrgEventosScreen({super.key});

  @override
  State<OrgEventosScreen> createState() => _OrgEventosScreenState();
}

class _OrgEventosScreenState extends State<OrgEventosScreen> {
  List<EventoResumen>? _filas;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    try {
      final filas = await SesionScope.leer(context).api.misEventosGestion();
      filas.sort((a, b) => a.evento.fecha.compareTo(b.evento.fecha));
      if (mounted) {
        setState(() {
          _filas = filas;
          _error = null;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    }
  }

  Future<void> _abrir(EventoResumen f) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OrgEventoScreen(eventoId: f.evento.id)));
    _cargar();
  }

  @override
  Widget build(BuildContext context) {
    final filas = _filas;
    return Scaffold(
      appBar: AppBar(title: const Text('Mis eventos')),
      body: _error != null && filas == null
          ? VistaError(mensaje: _error!, alReintentar: _cargar)
          : filas == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _cargar,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _resumen(filas),
                      const SizedBox(height: 16),
                      if (filas.isEmpty)
                        const VistaVacia(
                          icono: Icons.event_note_outlined,
                          texto: 'Todavía no tienes eventos. Créalos desde el panel web de EventFlow.',
                        ),
                      for (final f in filas) _tarjeta(f),
                    ],
                  ),
                ),
    );
  }

  Widget _resumen(List<EventoResumen> filas) {
    final inscritos = filas.fold<int>(0, (s, f) => s + f.inscritos);
    final pagados = filas.fold<int>(0, (s, f) => s + f.confirmados);
    final ingresados = filas.fold<int>(0, (s, f) => s + f.ingresados);
    final recaudo = filas.fold<int>(0, (s, f) => s + f.recaudo);
    return Column(children: [
      Row(children: [
        Expanded(child: Cifra(valor: '$inscritos', etiqueta: 'Inscripciones')),
        const SizedBox(width: 8),
        Expanded(child: Cifra(valor: '$pagados', etiqueta: 'Pagadas')),
        const SizedBox(width: 8),
        Expanded(child: Cifra(valor: '$ingresados', etiqueta: 'Ingresaron')),
      ]),
      const SizedBox(height: 8),
      SizedBox(width: double.infinity, child: Cifra(valor: pesos(recaudo), etiqueta: 'Recaudo confirmado')),
    ]);
  }

  Widget _tarjeta(EventoResumen f) {
    final e = f.evento;
    final total = e.cuposTotales;
    final ocupados = total - e.cuposLibres;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _abrir(f),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Text(codigoEvento(e.numero), style: const TextStyle(color: Colores.tintaTenue, fontSize: 12)),
                const Spacer(),
                Insignia.estadoEvento(e.estado),
              ]),
              const SizedBox(height: 4),
              Text(e.nombre, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colores.tinta)),
              Text('${fechaLarga(e.fecha)} · ${e.lugar}', style: const TextStyle(color: Colores.tintaSuave, fontSize: 13)),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: total == 0 ? 0 : ocupados / total,
                  minHeight: 6,
                  backgroundColor: Colores.linea,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '$ocupados de $total cupos · ${f.confirmados} pagados · ${f.ingresados} ingresaron · ${pesos(f.recaudo)}',
                style: const TextStyle(color: Colores.tintaSuave, fontSize: 13),
              ),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => EscanerScreen(eventoId: e.id, eventoNombre: e.nombre)),
                    ),
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Escanear'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(onPressed: () => _abrir(f), child: const Text('Gestionar')),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

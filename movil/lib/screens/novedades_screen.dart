import 'package:flutter/material.dart';

import '../formato.dart';
import '../modelos.dart';
import '../servicios/api.dart';
import '../servicios/notificaciones.dart';
import '../tema.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';

/// Novedades que publican los organizadores de los eventos en los que la
/// persona tiene cupo (cambios de hora, recomendaciones, avisos).
class NovedadesScreen extends StatefulWidget {
  const NovedadesScreen({super.key});

  @override
  State<NovedadesScreen> createState() => _NovedadesScreenState();
}

class _NovedadesScreenState extends State<NovedadesScreen> {
  List<Novedad>? _novedades;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    try {
      final lista = await SesionScope.leer(context).api.novedades();
      await Notificaciones.avisarNuevas(lista);
      if (mounted) {
        setState(() {
          _novedades = lista;
          _error = null;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lista = _novedades;
    return Scaffold(
      appBar: AppBar(title: const Text('Novedades')),
      body: _error != null && lista == null
          ? VistaError(mensaje: _error!, alReintentar: _cargar)
          : lista == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _cargar,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (lista.isEmpty)
                        const VistaVacia(
                          icono: Icons.campaign_outlined,
                          texto: 'Aquí verás los avisos de los organizadores de tus eventos.',
                        ),
                      for (final n in lista)
                        Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(n.eventoNombre,
                                    style: const TextStyle(color: Colores.marcaOscura, fontSize: 12, fontWeight: FontWeight.w600)),
                                const SizedBox(height: 4),
                                Text(n.titulo,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colores.tinta)),
                                const SizedBox(height: 4),
                                Text(n.mensaje, style: const TextStyle(color: Colores.tintaSuave)),
                                const SizedBox(height: 6),
                                Text(fechaHora(n.enviadoEn), style: const TextStyle(color: Colores.tintaTenue, fontSize: 12)),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
    );
  }
}

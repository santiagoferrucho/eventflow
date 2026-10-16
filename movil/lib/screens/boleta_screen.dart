import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../formato.dart';
import '../servicios/boletas_locales.dart';
import '../tema.dart';
import '../widgets/comunes.dart';

/// Boleta digital con su código QR. Funciona sin conexión: todo lo que muestra
/// está guardado en el dispositivo. Se puede compartir o guardar como imagen.
class BoletaScreen extends StatefulWidget {
  const BoletaScreen({super.key, required this.boleta, this.recienPagada = false});

  final BoletaLocal boleta;
  final bool recienPagada;

  @override
  State<BoletaScreen> createState() => _BoletaScreenState();
}

class _BoletaScreenState extends State<BoletaScreen> {
  final _llave = GlobalKey();
  bool _compartiendo = false;

  /// Convierte la boleta en una imagen PNG y abre el menú de compartir del
  /// sistema (guardar en la galería, enviar por WhatsApp, etc.).
  Future<void> _compartir() async {
    setState(() => _compartiendo = true);
    try {
      final borde = _llave.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final imagen = await borde.toImage(pixelRatio: 3);
      final datos = await imagen.toByteData(format: ui.ImageByteFormat.png);
      if (datos == null) throw StateError('sin imagen');
      final dir = await getTemporaryDirectory();
      final archivo = File('${dir.path}/boleta-${widget.boleta.registroId}.png');
      await archivo.writeAsBytes(datos.buffer.asUint8List());
      await Share.shareXFiles(
        [XFile(archivo.path, mimeType: 'image/png')],
        text: 'Mi boleta para ${widget.boleta.eventoNombre}',
      );
    } catch (_) {
      if (mounted) mostrarMensaje(context, 'No pudimos generar la imagen de la boleta.', error: true);
    } finally {
      if (mounted) setState(() => _compartiendo = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.boleta;
    return Scaffold(
      appBar: AppBar(title: const Text('Mi boleta')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (widget.recienPagada)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: Colores.exitoSuave, borderRadius: BorderRadius.circular(12)),
                child: const Row(children: [
                  Icon(Icons.check_circle, color: Colores.exito),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text('Pago confirmado. Tu boleta quedó guardada en este celular.',
                        style: TextStyle(color: Colores.exito, fontWeight: FontWeight.w600)),
                  ),
                ]),
              ),
            RepaintBoundary(
              key: _llave,
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colores.linea),
                ),
                child: Column(
                  children: [
                    const Text('EventFlow',
                        style: TextStyle(color: Colores.marca, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                    const SizedBox(height: 8),
                    Text(b.eventoNombre,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colores.tinta)),
                    const SizedBox(height: 4),
                    Text('${fechaLarga(b.fecha)} · ${b.lugar}',
                        textAlign: TextAlign.center, style: const TextStyle(color: Colores.tintaSuave)),
                    const SizedBox(height: 16),
                    QrImageView(
                      data: b.qr,
                      size: 240,
                      backgroundColor: Colors.white,
                      errorCorrectionLevel: QrErrorCorrectLevel.M,
                    ),
                    const SizedBox(height: 16),
                    _dato('Participante', b.participante),
                    _dato('Documento', b.documento),
                    _dato('Categoría', b.categoria),
                    if (b.participanteCodigo != null) _dato('Código de participante', b.participanteCodigo!),
                    _dato('Evento', b.eventoCodigo),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Muestra este código en la entrada del evento. Funciona sin conexión a internet.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colores.tintaSuave, fontSize: 13),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _compartiendo ? null : _compartir,
              icon: const Icon(Icons.download_outlined),
              label: const Text('Guardar o compartir imagen'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dato(String etiqueta, String valor) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Text(etiqueta, style: const TextStyle(color: Colores.tintaSuave, fontSize: 13)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(valor,
                textAlign: TextAlign.right,
                style: const TextStyle(fontWeight: FontWeight.w600, color: Colores.tinta, fontSize: 13)),
          ),
        ]),
      );
}

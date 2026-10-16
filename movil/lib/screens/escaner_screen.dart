import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../formato.dart';
import '../modelos.dart';
import '../servicios/api.dart';
import '../tema.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';

/// Control de ingreso con la cámara del celular.
///
/// 1. Se lee el QR de la boleta y el servidor dice quién es y si puede entrar
///    (pago confirmado, que sea de este evento y que no haya ingresado).
/// 2. El organizador confirma y el ingreso queda registrado con la hora y quién
///    lo hizo. Un segundo escaneo avisa "ya ingresó".
class EscanerScreen extends StatefulWidget {
  const EscanerScreen({super.key, required this.eventoId, required this.eventoNombre});

  final String eventoId;
  final String eventoNombre;

  @override
  State<EscanerScreen> createState() => _EscanerScreenState();
}

class _EscanerScreenState extends State<EscanerScreen> {
  final _camara = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );
  final _manual = TextEditingController();
  Escaneo? _resultado;
  bool _ocupado = false;
  bool _registrado = false;
  String? _error;
  int _ingresados = 0;
  int _pagados = 0;

  @override
  void initState() {
    super.initState();
    _contar();
  }

  @override
  void dispose() {
    _camara.dispose();
    _manual.dispose();
    super.dispose();
  }

  Future<void> _contar() async {
    try {
      final d = await SesionScope.leer(context).api.eventoGestion(widget.eventoId);
      final pagados = d.registros.where((r) => r.pagada).toList();
      if (mounted) {
        setState(() {
          _pagados = pagados.length;
          _ingresados = pagados.where((r) => r.checkInRealizado).length;
        });
      }
    } on ApiException {
      // El contador es informativo; el escáner funciona igual.
    }
  }

  Future<void> _procesar(String texto) async {
    if (_ocupado || _resultado != null || texto.trim().isEmpty) return;
    setState(() {
      _ocupado = true;
      _error = null;
      _registrado = false;
    });
    final api = SesionScope.leer(context).api;
    try {
      final r = await api.escanear(widget.eventoId, texto);
      if (r.estado == 'listo') {
        await HapticFeedback.mediumImpact();
      } else {
        await HapticFeedback.heavyImpact();
      }
      if (mounted) setState(() => _resultado = r);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  Future<void> _confirmar() async {
    final registro = _resultado?.registro;
    if (registro == null) return;
    setState(() => _ocupado = true);
    final api = SesionScope.leer(context).api;
    try {
      final (_, ya) = await api.registrarIngreso(registro.id);
      if (!mounted) return;
      setState(() {
        _registrado = true;
        if (!ya) _ingresados++;
      });
      if (ya) mostrarMensaje(context, 'Esta persona ya había ingresado.');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  void _siguiente() {
    setState(() {
      _resultado = null;
      _registrado = false;
      _error = null;
      _manual.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Control de ingreso'),
          Text(widget.eventoNombre, style: const TextStyle(fontSize: 12, color: Colores.tintaSuave)),
        ]),
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Insignia('$_ingresados / $_pagados', color: Colores.exito, fondo: Colores.exitoSuave),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 5,
            child: Stack(
              fit: StackFit.expand,
              children: [
                MobileScanner(
                  controller: _camara,
                  onDetect: (captura) {
                    for (final b in captura.barcodes) {
                      final v = b.rawValue;
                      if (v != null && v.isNotEmpty) {
                        _procesar(v);
                        break;
                      }
                    }
                  },
                  errorBuilder: (context, error) => const _SinCamara(),
                ),
                const IgnorePointer(child: _Marco()),
                if (_ocupado)
                  const ColoredBox(
                    color: Color(0x66000000),
                    child: Center(child: CircularProgressIndicator(color: Colors.white)),
                  ),
                Positioned(
                  right: 12,
                  bottom: 12,
                  child: IconButton.filledTonal(
                    tooltip: 'Linterna',
                    onPressed: () => _camara.toggleTorch(),
                    icon: const Icon(Icons.flashlight_on_outlined),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 4,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _resultado == null ? _entradaManual() : _tarjetaResultado(_resultado!),
            ),
          ),
        ],
      ),
    );
  }

  Widget _entradaManual() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Apunta la cámara al código QR de la boleta.',
            textAlign: TextAlign.center, style: TextStyle(color: Colores.tintaSuave)),
        const SizedBox(height: 16),
        const Text('¿No lee? Escribe el código:', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: TextField(
              controller: _manual,
              decoration: const InputDecoration(hintText: 'EVENTFLOW:reg-...'),
              onSubmitted: _procesar,
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            onPressed: _ocupado ? null : () => _procesar(_manual.text),
            icon: const Icon(Icons.search),
          ),
        ]),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: Colores.peligro)),
        ],
      ],
    );
  }

  Widget _tarjetaResultado(Escaneo r) {
    final (titulo, color, fondo, icono) = switch (r.estado) {
      'listo' when _registrado => ('Ingreso registrado', Colores.exito, Colores.exitoSuave, Icons.check_circle),
      'listo' => ('Boleta válida: puede ingresar', Colores.exito, Colores.exitoSuave, Icons.verified),
      'ya_ingreso' => ('Ya ingresó', Colores.oro, Colores.oroSuave, Icons.history),
      'pago_pendiente' => ('Pago pendiente: no puede ingresar', Colores.peligro, Colores.peligroSuave, Icons.block),
      'otro_evento' => ('Boleta de otro evento', Colores.peligro, Colores.peligroSuave, Icons.event_busy),
      _ => ('Código no válido', Colores.peligro, Colores.peligroSuave, Icons.error_outline),
    };
    final registro = r.registro;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: fondo, borderRadius: BorderRadius.circular(12)),
          child: Row(children: [
            Icon(icono, color: color, size: 32),
            const SizedBox(width: 10),
            Expanded(child: Text(titulo, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 16))),
          ]),
        ),
        if (r.estado == 'otro_evento' && r.eventoNombre != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text('Es para: ${r.eventoNombre}', style: const TextStyle(color: Colores.tintaSuave)),
          ),
        if (registro != null) ...[
          const SizedBox(height: 12),
          Text(registro.participante.nombre, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          _dato('Documento', registro.participante.documento),
          if (registro.participanteNumero != null) _dato('Código', codigoParticipante(registro.participanteNumero!)),
          _dato('Categoría', r.categoria ?? '—'),
          if (registro.checkInRealizado && !_registrado) _dato('Ingresó', fechaHora(registro.checkInEn)),
          for (final x in r.respuestas) _dato(x.etiqueta, x.valor.startsWith('img:') ? 'Imagen adjunta' : x.valor),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: Colores.peligro)),
        ],
        const SizedBox(height: 16),
        if (r.estado == 'listo' && !_registrado)
          FilledButton.icon(
            onPressed: _ocupado ? null : _confirmar,
            icon: const Icon(Icons.how_to_reg),
            label: const Text('Confirmar ingreso'),
          ),
        const SizedBox(height: 8),
        OutlinedButton(onPressed: _ocupado ? null : _siguiente, child: const Text('Escanear otro')),
      ],
    );
  }

  Widget _dato(String etiqueta, String valor) => Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 110, child: Text(etiqueta, style: const TextStyle(color: Colores.tintaSuave))),
          Expanded(child: Text(valor, style: const TextStyle(fontWeight: FontWeight.w500))),
        ]),
      );
}

class _Marco extends StatelessWidget {
  const _Marco();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 230,
        height: 230,
        decoration: BoxDecoration(
          border: Border.all(color: Colores.acento, width: 4),
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    );
  }
}

class _SinCamara extends StatelessWidget {
  const _SinCamara();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Colores.tinta,
      child: Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'No pudimos abrir la cámara. Revisa el permiso de cámara en los ajustes del celular, '
            'o escribe el código a mano.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white),
          ),
        ),
      ),
    );
  }
}

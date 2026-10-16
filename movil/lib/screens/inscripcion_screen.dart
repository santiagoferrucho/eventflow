import 'package:flutter/material.dart';

import '../formato.dart';
import '../modelos.dart';
import '../servicios/api.dart';
import '../servicios/boletas_locales.dart';
import '../tema.dart';
import '../validacion.dart';
import '../widgets/campos_formulario.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';
import 'boleta_screen.dart';

/// Inscripción en tres pasos, igual que en la web: datos, pago y boleta.
///
/// Nombre y correo salen de la cuenta. El documento, una vez registrado, queda
/// bloqueado. Al crear la inscripción el cupo queda reservado 30 minutos.
class InscripcionScreen extends StatefulWidget {
  const InscripcionScreen({super.key, required this.evento, required this.categoria});

  final Evento evento;
  final Categoria categoria;

  @override
  State<InscripcionScreen> createState() => _InscripcionScreenState();
}

class _InscripcionScreenState extends State<InscripcionScreen> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _documento;
  late final TextEditingController _telefono;
  final Map<String, String> _respuestas = {};
  bool _acepta = false;
  bool _procesando = false;
  String? _error;
  Inscripcion? _registro;

  @override
  void initState() {
    super.initState();
    final u = SesionScope.leer(context).usuario;
    _documento = TextEditingController(text: u?.documento ?? '');
    _telefono = TextEditingController(text: u?.telefono ?? '');
  }

  @override
  void dispose() {
    _documento.dispose();
    _telefono.dispose();
    super.dispose();
  }

  Future<void> _crear() async {
    if (!_form.currentState!.validate()) return;
    final faltante = CamposFormulario.validar(widget.evento.camposAdicionales, _respuestas);
    if (faltante != null) {
      setState(() => _error = faltante);
      return;
    }
    if (!_acepta) {
      setState(() => _error = 'Debes aceptar la política de tratamiento de datos para inscribirte.');
      return;
    }
    setState(() {
      _procesando = true;
      _error = null;
    });
    try {
      final r = await SesionScope.leer(context).api.inscribirse(
            eventoId: widget.evento.id,
            categoriaId: widget.categoria.id,
            documento: _documento.text.trim(),
            telefono: _telefono.text,
            respuestas: _respuestas,
            aceptaPolitica: _acepta,
          );
      if (mounted) setState(() => _registro = r);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  Future<void> _pagar() async {
    final registro = _registro;
    if (registro == null) return;
    setState(() {
      _procesando = true;
      _error = null;
    });
    final sesion = SesionScope.leer(context);
    final navegador = Navigator.of(context);
    try {
      final pagado = await sesion.api.pagar(registro.id);
      final boleta = BoletaLocal.desde(pagado, widget.evento);
      if (boleta != null) await BoletasLocales.guardar(boleta);
      if (!mounted) return;
      navegador.pop(true);
      if (boleta != null) {
        navegador.push(MaterialPageRoute<void>(builder: (_) => BoletaScreen(boleta: boleta, recienPagada: true)));
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sesion = SesionScope.of(context);
    final u = sesion.usuario;
    final documentoBloqueado = (u?.documento ?? '').isNotEmpty;
    final registro = _registro;
    return Scaffold(
      appBar: AppBar(title: const Text('Inscripción')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('${widget.evento.nombre} · ${widget.categoria.nombre}',
                style: const TextStyle(color: Colores.tintaSuave)),
            const SizedBox(height: 4),
            Text(fechaLarga(widget.evento.fecha), style: const TextStyle(color: Colores.tintaTenue, fontSize: 13)),
            const SizedBox(height: 16),
            _Pasos(actual: registro == null ? 0 : 1),
            const SizedBox(height: 16),
            if (registro == null)
              Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      initialValue: u?.nombre ?? '',
                      readOnly: true,
                      decoration: const InputDecoration(labelText: 'Nombre (de tu cuenta)'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      initialValue: u?.correo ?? '',
                      readOnly: true,
                      decoration: const InputDecoration(labelText: 'Correo (de tu cuenta)'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _documento,
                      readOnly: documentoBloqueado,
                      decoration: InputDecoration(
                        labelText: 'Documento',
                        helperText: documentoBloqueado ? null : 'Una vez guardado, no se puede cambiar.',
                      ),
                      validator: (v) => validarDocumento(v, requerido: true),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _telefono,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: 'Teléfono'),
                      validator: (v) => validarTelefono(v, requerido: true),
                    ),
                    const SizedBox(height: 20),
                    CamposFormulario(
                      campos: widget.evento.camposAdicionales,
                      respuestas: _respuestas,
                      api: sesion.api,
                      alCambiar: (id, v) => setState(() => _respuestas[id] = v),
                    ),
                    AceptarPolitica(
                      valor: _acepta,
                      alCambiar: (v) => setState(() => _acepta = v),
                      para: 'gestionar mi inscripción y compartirlos con el organizador del evento para su realización y el control de ingreso',
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(_error!, style: const TextStyle(color: Colores.peligro)),
                    ],
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _procesando ? null : _crear,
                      child: _procesando
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Continuar al pago'),
                    ),
                  ],
                ),
              )
            else
              _pago(registro),
          ],
        ),
      ),
    );
  }

  Widget _pago(Inscripcion registro) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _fila('Categoría', widget.categoria.nombre),
            _fila('Participante', registro.participante.nombre),
            const Divider(height: 24),
            _fila('Total a pagar', pesos(registro.precioPagado), destacado: true),
            const SizedBox(height: 12),
            const Text(
              'Tu cupo queda reservado por 30 minutos. Pago simulado: en esta versión no se cobra dinero real; '
              'al integrar la pasarela, este paso abrirá su pantalla de pago.',
              style: TextStyle(color: Colores.tintaSuave, fontSize: 13),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Colores.peligro)),
            ],
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _procesando ? null : _pagar,
              icon: const Icon(Icons.lock_outline),
              label: Text(_procesando ? 'Procesando...' : 'Pagar ${pesos(registro.precioPagado)}'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _fila(String etiqueta, String valor, {bool destacado = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Text(etiqueta, style: const TextStyle(color: Colores.tintaSuave)),
          const Spacer(),
          Text(valor,
              style: TextStyle(
                fontWeight: destacado ? FontWeight.w800 : FontWeight.w500,
                fontSize: destacado ? 18 : 14,
                color: destacado ? Colores.marcaOscura : Colores.tinta,
              )),
        ]),
      );
}

class _Pasos extends StatelessWidget {
  const _Pasos({required this.actual});

  final int actual;

  @override
  Widget build(BuildContext context) {
    const nombres = ['Tus datos', 'Pago', 'Boleta'];
    return Row(
      children: [
        for (var i = 0; i < nombres.length; i++) ...[
          CircleAvatar(
            radius: 12,
            backgroundColor: i <= actual ? Colores.marca : Colores.linea,
            child: Text('${i + 1}', style: TextStyle(fontSize: 12, color: i <= actual ? Colors.white : Colores.tintaSuave)),
          ),
          const SizedBox(width: 6),
          Text(nombres[i], style: TextStyle(fontSize: 13, color: i <= actual ? Colores.tinta : Colores.tintaTenue)),
          if (i < nombres.length - 1) const Expanded(child: Divider(indent: 6, endIndent: 6)),
        ],
      ],
    );
  }
}

import 'package:flutter/material.dart';

import '../servicios/api.dart';
import '../tema.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';

/// Cambio de contraseña. Si es [obligatorio] (organizador con contraseña
/// temporal creada por el administrador), también pide aceptar la política.
class CambiarPasswordScreen extends StatefulWidget {
  const CambiarPasswordScreen({super.key, this.obligatorio = false});

  final bool obligatorio;

  @override
  State<CambiarPasswordScreen> createState() => _CambiarPasswordScreenState();
}

class _CambiarPasswordScreenState extends State<CambiarPasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _actual = TextEditingController();
  final _nueva = TextEditingController();
  final _repetir = TextEditingController();
  bool _acepta = false;
  bool _cargando = false;
  String? _error;

  @override
  void dispose() {
    _actual.dispose();
    _nueva.dispose();
    _repetir.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    if (!_form.currentState!.validate()) return;
    if (widget.obligatorio && !_acepta) {
      setState(() => _error = 'Debes aceptar la política de tratamiento de datos para continuar.');
      return;
    }
    setState(() {
      _cargando = true;
      _error = null;
    });
    final sesion = SesionScope.leer(context);
    final navegador = Navigator.of(context);
    try {
      await sesion.api.cambiarPassword(_actual.text, _nueva.text, aceptaPolitica: _acepta);
      await sesion.refrescar();
      if (!widget.obligatorio && mounted) {
        mostrarMensaje(context, 'Contraseña actualizada.');
        navegador.pop();
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cambiar contraseña'),
        actions: [
          if (widget.obligatorio)
            TextButton(
              onPressed: () => SesionScope.leer(context).cerrar(),
              child: const Text('Salir'),
            ),
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              if (widget.obligatorio)
                const Padding(
                  padding: EdgeInsets.only(bottom: 16),
                  child: Text(
                    'Tu cuenta se creó con una contraseña temporal. Elige una propia para continuar.',
                    style: TextStyle(color: Colores.tintaSuave),
                  ),
                ),
              TextFormField(
                controller: _actual,
                obscureText: true,
                decoration: InputDecoration(labelText: widget.obligatorio ? 'Contraseña temporal' : 'Contraseña actual'),
                validator: (v) => (v ?? '').isEmpty ? 'Escribe tu contraseña actual.' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nueva,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Contraseña nueva', helperText: 'Mínimo 8 caracteres.'),
                validator: (v) => (v ?? '').length < 8 ? 'Mínimo 8 caracteres.' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _repetir,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Repite la contraseña nueva'),
                validator: (v) => v != _nueva.text ? 'Las contraseñas no coinciden.' : null,
              ),
              if (widget.obligatorio) ...[
                const SizedBox(height: 8),
                AceptarPolitica(
                  valor: _acepta,
                  alCambiar: (v) => setState(() => _acepta = v),
                  para: 'administrar mi cuenta y los eventos que gestione en EventFlow',
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: Colores.peligro)),
              ],
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _cargando ? null : _guardar,
                child: _cargando
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Guardar contraseña'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

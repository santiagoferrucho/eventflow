import 'package:flutter/material.dart';

import '../servicios/api.dart';
import '../tema.dart';
import '../validacion.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';

/// Registro público: siempre crea una cuenta de participante.
class RegistroScreen extends StatefulWidget {
  const RegistroScreen({super.key});

  @override
  State<RegistroScreen> createState() => _RegistroScreenState();
}

class _RegistroScreenState extends State<RegistroScreen> {
  final _form = GlobalKey<FormState>();
  final _nombre = TextEditingController();
  final _correo = TextEditingController();
  final _documento = TextEditingController();
  final _telefono = TextEditingController();
  final _password = TextEditingController();
  bool _acepta = false;
  bool _cargando = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_nombre, _correo, _documento, _telefono, _password]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _crear() async {
    if (!_form.currentState!.validate()) return;
    if (!_acepta) {
      setState(() => _error = 'Debes aceptar la política de tratamiento de datos para crear tu cuenta.');
      return;
    }
    setState(() {
      _cargando = true;
      _error = null;
    });
    final navegador = Navigator.of(context);
    try {
      await SesionScope.leer(context).registro(
        nombre: _nombre.text,
        correo: _correo.text,
        password: _password.text,
        documento: _documento.text.trim(),
        telefono: _telefono.text,
        aceptaPolitica: _acepta,
      );
      // La raíz ya muestra el inicio; se cierra esta pantalla.
      navegador.popUntil((r) => r.isFirst);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Crear cuenta')),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              TextFormField(
                controller: _nombre,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Nombre completo'),
                validator: validarNombre,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _correo,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Correo'),
                validator: validarCorreo,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _documento,
                decoration: const InputDecoration(
                  labelText: 'Documento',
                  helperText: 'No se puede cambiar después: es el que verán en la puerta.',
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
              const SizedBox(height: 12),
              TextFormField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Contraseña', helperText: 'Mínimo 8 caracteres.'),
                validator: (v) => (v ?? '').length < 8 ? 'La contraseña debe tener al menos 8 caracteres.' : null,
              ),
              const SizedBox(height: 8),
              AceptarPolitica(
                valor: _acepta,
                alCambiar: (v) => setState(() => _acepta = v),
                para: 'crear mi cuenta, gestionar mis inscripciones y recibir mis boletas',
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: Colores.peligro)),
              ],
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _cargando ? null : _crear,
                child: _cargando
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Crear cuenta'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

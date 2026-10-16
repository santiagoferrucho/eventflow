import 'package:flutter/material.dart';

import '../servicios/api.dart';
import '../tema.dart';
import '../widgets/sesion_scope.dart';
import 'registro_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _correo = TextEditingController();
  final _password = TextEditingController();
  bool _cargando = false;
  bool _verPassword = false;
  String? _error;

  @override
  void dispose() {
    _correo.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _ingresar() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      await SesionScope.leer(context).login(_correo.text, _password.text);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Image.asset('assets/icono.png', width: 80, height: 80),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'EventFlow',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Colores.tinta),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Inscripciones, pago y boleta con QR en un solo lugar.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colores.tintaSuave),
                  ),
                  const SizedBox(height: 32),
                  TextFormField(
                    controller: _correo,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(labelText: 'Correo', prefixIcon: Icon(Icons.mail_outline)),
                    validator: (v) => (v ?? '').trim().contains('@') ? null : 'Escribe un correo válido.',
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _password,
                    obscureText: !_verPassword,
                    autofillHints: const [AutofillHints.password],
                    decoration: InputDecoration(
                      labelText: 'Contraseña',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        tooltip: _verPassword ? 'Ocultar' : 'Mostrar',
                        icon: Icon(_verPassword ? Icons.visibility_off : Icons.visibility),
                        onPressed: () => setState(() => _verPassword = !_verPassword),
                      ),
                    ),
                    validator: (v) => (v ?? '').isEmpty ? 'Escribe tu contraseña.' : null,
                    onFieldSubmitted: (_) => _ingresar(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: Colores.peligro)),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _cargando ? null : _ingresar,
                    child: _cargando
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Iniciar sesión'),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: _cargando
                        ? null
                        : () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const RegistroScreen())),
                    child: const Text('¿No tienes cuenta? Crear una'),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Las cuentas de organizador las crea el administrador de EventFlow.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colores.tintaTenue, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

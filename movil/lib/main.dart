import 'package:flutter/material.dart';

import 'screens/cambiar_password_screen.dart';
import 'screens/inicio_screen.dart';
import 'screens/login_screen.dart';
import 'servicios/notificaciones.dart';
import 'servicios/sesion.dart';
import 'tema.dart';
import 'widgets/sesion_scope.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Notificaciones.iniciar();
  final sesion = Sesion();
  runApp(EventFlowApp(sesion: sesion));
  await sesion.iniciar();
}

class EventFlowApp extends StatelessWidget {
  const EventFlowApp({super.key, required this.sesion});

  final Sesion sesion;

  @override
  Widget build(BuildContext context) {
    return SesionScope(
      sesion: sesion,
      child: MaterialApp(
        title: 'EventFlow',
        debugShowCheckedModeBanner: false,
        theme: temaEventFlow(),
        home: const _Raiz(),
      ),
    );
  }
}

/// Decide qué mostrar según el estado de la sesión.
class _Raiz extends StatelessWidget {
  const _Raiz();

  @override
  Widget build(BuildContext context) {
    final sesion = SesionScope.of(context);
    final usuario = sesion.usuario;
    if (sesion.cargando) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (usuario == null) return const LoginScreen();
    if (usuario.debeCambiarPassword) return const CambiarPasswordScreen(obligatorio: true);
    // La clave hace que el inicio se reconstruya desde cero al cambiar de cuenta.
    return InicioScreen(key: ValueKey(usuario.id));
  }
}

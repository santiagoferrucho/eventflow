import 'package:flutter/material.dart';

import '../servicios/notificaciones.dart';
import '../widgets/sesion_scope.dart';
import 'eventos_screen.dart';
import 'mis_boletas_screen.dart';
import 'novedades_screen.dart';
import 'org_eventos_screen.dart';
import 'perfil_screen.dart';

/// Pantalla principal con pestañas. El participante ve eventos, boletas y
/// novedades; el organizador (o administrador) ve además sus eventos con el
/// escáner de ingreso.
class InicioScreen extends StatefulWidget {
  const InicioScreen({super.key});

  @override
  State<InicioScreen> createState() => _InicioScreenState();
}

class _InicioScreenState extends State<InicioScreen> with WidgetsBindingObserver {
  int _pestana = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await Notificaciones.pedirPermiso();
      await _revisarNovedades();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _revisarNovedades();
  }

  /// Consulta las novedades y avisa con una notificación las que son nuevas.
  Future<void> _revisarNovedades() async {
    if (!mounted) return;
    final sesion = SesionScope.leer(context);
    if (sesion.usuario?.rol != 'participante' || sesion.sinConexion) return;
    try {
      await Notificaciones.avisarNuevas(await sesion.api.novedades());
    } catch (_) {
      // Sin conexión: se intentará de nuevo al volver a la app.
    }
  }

  @override
  Widget build(BuildContext context) {
    final usuario = SesionScope.of(context).usuario!;
    final gestiona = usuario.gestiona;

    final paginas = <Widget>[
      if (gestiona) const OrgEventosScreen(),
      const EventosScreen(),
      if (!gestiona) const MisBoletasScreen(),
      if (!gestiona) const NovedadesScreen(),
      const PerfilScreen(),
    ];
    final destinos = <NavigationDestination>[
      if (gestiona)
        const NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Mis eventos'),
      const NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Eventos'),
      if (!gestiona)
        const NavigationDestination(
            icon: Icon(Icons.confirmation_number_outlined), selectedIcon: Icon(Icons.confirmation_number), label: 'Boletas'),
      if (!gestiona)
        const NavigationDestination(icon: Icon(Icons.campaign_outlined), selectedIcon: Icon(Icons.campaign), label: 'Novedades'),
      const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Perfil'),
    ];
    final indice = _pestana.clamp(0, paginas.length - 1);

    return Scaffold(
      body: IndexedStack(index: indice, children: paginas),
      bottomNavigationBar: NavigationBar(
        selectedIndex: indice,
        onDestinationSelected: (i) => setState(() => _pestana = i),
        destinations: destinos,
      ),
    );
  }
}

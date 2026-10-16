import 'package:flutter/widgets.dart';

import '../servicios/sesion.dart';

/// Da acceso a la sesión desde cualquier pantalla y la redibuja cuando cambia.
class SesionScope extends InheritedNotifier<Sesion> {
  const SesionScope({super.key, required Sesion sesion, required super.child}) : super(notifier: sesion);

  static Sesion of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<SesionScope>();
    assert(scope != null, 'Falta SesionScope en el árbol de widgets');
    return scope!.notifier!;
  }

  /// Igual que [of], pero sin suscribirse a los cambios (para usar en callbacks).
  static Sesion leer(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<SesionScope>();
    return scope!.notifier!;
  }
}

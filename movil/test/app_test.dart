import 'package:eventflow/main.dart';
import 'package:eventflow/servicios/sesion.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('sin sesión muestra la pantalla de inicio de sesión', (tester) async {
    final sesion = Sesion()..cargando = false;
    await tester.pumpWidget(EventFlowApp(sesion: sesion));
    await tester.pump();

    expect(find.text('EventFlow'), findsOneWidget);
    expect(find.text('Iniciar sesión'), findsOneWidget);
    expect(find.text('¿No tienes cuenta? Crear una'), findsOneWidget);
  });

  testWidgets('el formulario de inicio de sesión valida los campos', (tester) async {
    final sesion = Sesion()..cargando = false;
    await tester.pumpWidget(EventFlowApp(sesion: sesion));
    await tester.tap(find.widgetWithText(FilledButton, 'Iniciar sesión'));
    await tester.pump();

    expect(find.text('Escribe un correo válido.'), findsOneWidget);
    expect(find.text('Escribe tu contraseña.'), findsOneWidget);
  });
}

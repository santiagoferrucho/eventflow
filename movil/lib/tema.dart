import 'package:flutter/material.dart';

/// Colores de EventFlow: los mismos tokens que usa la web (app/globals.css).
class Colores {
  static const fondo = Color(0xFFF6F7FB);
  static const superficie = Color(0xFFFFFFFF);
  static const tinta = Color(0xFF0B1120);
  static const tintaSuave = Color(0xFF5B6478);
  static const tintaTenue = Color(0xFF94A0B8);
  static const linea = Color(0xFFE6E9F2);
  static const marca = Color(0xFF6355FF);
  static const marcaOscura = Color(0xFF4D3FE0);
  static const marcaSuave = Color(0xFFEEECFF);
  static const acento = Color(0xFF17C3D6);
  static const exito = Color(0xFF17A06B);
  static const exitoSuave = Color(0xFFE4F8EF);
  static const oro = Color(0xFFB8860B);
  static const oroSuave = Color(0xFFFBF1D9);
  static const peligro = Color(0xFFE0304A);
  static const peligroSuave = Color(0xFFFDEAED);
}

ThemeData temaEventFlow() {
  final esquema = ColorScheme.fromSeed(
    seedColor: Colores.marca,
    primary: Colores.marca,
    surface: Colores.superficie,
    error: Colores.peligro,
  );
  final bordeCampo = OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: Colores.linea),
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: esquema,
    scaffoldBackgroundColor: Colores.fondo,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colores.superficie,
      foregroundColor: Colores.tinta,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: Colores.superficie,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Colores.linea),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colores.superficie,
      border: bordeCampo,
      enabledBorder: bordeCampo,
      focusedBorder: bordeCampo.copyWith(
        borderSide: const BorderSide(color: Colores.marca, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
  );
}

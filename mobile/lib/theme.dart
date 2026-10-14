import 'package:flutter/material.dart';

class CrColors {
  CrColors._();

  static const background = Color(0xFF070D1A);
  static const backgroundDeep = Color(0xFF040810);
  static const surface = Color(0xFF121F38);
  static const surfaceMuted = Color(0xFF0C1528);
  static const surfaceHover = Color(0xFF1A2D52);
  static const border = Color(0x1AFFFFFF);
  static const accent = Color(0xFF3478F6);
  static const accentStrong = Color(0xFF2563D4);
  static const accentSoft = Color(0xFF6BA3FF);
  static const yellow = Color(0xFFFACC15);
  static const yellowDark = Color(0xFFEAB308);
  static const textMuted = Color(0x8AFFFFFF);
  static const danger = Color(0xFFF87171);
  static const success = Color(0xFF34D399);
}

ThemeData buildCityRunTheme() {
  const scheme = ColorScheme.dark(
    primary: CrColors.accent,
    secondary: CrColors.yellow,
    surface: CrColors.surface,
    error: CrColors.danger,
    onPrimary: Colors.white,
    onSecondary: Color(0xFF0F172A),
    onSurface: Colors.white,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    scaffoldBackgroundColor: CrColors.background,
    canvasColor: CrColors.background,
    splashFactory: InkRipple.splashFactory,
    appBarTheme: const AppBarTheme(
      backgroundColor: CrColors.background,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0x08FFFFFF),
      hintStyle: const TextStyle(color: Color(0x4DFFFFFF)),
      labelStyle: const TextStyle(color: CrColors.textMuted),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: CrColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: CrColors.accent),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: CrColors.danger),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: CrColors.accent,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        side: const BorderSide(color: Color(0x26FFFFFF)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
  );
}

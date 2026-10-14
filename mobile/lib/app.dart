import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/screens/customer_shell.dart';
import 'package:cityrun_app/screens/rider_screen.dart';
import 'package:cityrun_app/screens/splash_screen.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';
import 'package:cityrun_app/widgets/ui.dart';

class CityRunApp extends StatelessWidget {
  const CityRunApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => SessionController()..restore(),
      child: MaterialApp(
        title: 'City Run',
        debugShowCheckedModeBanner: false,
        theme: buildCityRunTheme(),
        home: const CityRunRoot(),
      ),
    );
  }
}

class CityRunRoot extends StatelessWidget {
  const CityRunRoot({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionController>();

    if (!session.ready) {
      return const AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.dark,
        child: Scaffold(
          backgroundColor: Colors.white,
          body: Center(child: CityRunLogo(size: 120, dark: false)),
        ),
      );
    }

    if (session.isRider) return const RiderScreen();
    if (session.role == AuthRole.none) return const SplashScreen();
    return const CustomerShell();
  }
}

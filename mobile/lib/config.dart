import 'package:flutter/foundation.dart';

class AppConfig {
  AppConfig._();

  /// Production website that hosts the City Run APIs.
  static const productionApiBase = 'https://www.citygateshl.org';

  /// Android emulator loopback to the host machine.
  static const emulatorApiBase = 'http://10.0.2.2:3000';

  /// Override at build time:
  /// `flutter run --dart-define=CITYRUN_API_BASE=http://192.168.x.x:3000`
  static const _fromDefine = String.fromEnvironment('CITYRUN_API_BASE');

  static String get apiBase {
    if (_fromDefine.trim().isNotEmpty) {
      return _fromDefine.trim().replaceAll(RegExp(r'/$'), '');
    }
    if (kDebugMode) return emulatorApiBase;
    return productionApiBase;
  }

  static const tripPriceNaira = 1000;
  static const tripPriceKobo = 100000;
  static const minTopupNaira = 1000;
  static const topupPresets = [1000, 2000, 5000, 10000];

  static const bankAccountName = 'CITYGATES HAULAGE AND LOGISTICS LIMITED';
  static const bankAccountNumber = '0065356567';
  static const bankName = 'Stanbic IBTC Bank Plc';
}

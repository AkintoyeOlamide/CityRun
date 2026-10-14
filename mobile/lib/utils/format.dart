import 'package:intl/intl.dart';

final _naira = NumberFormat.currency(
  locale: 'en_NG',
  symbol: '₦',
  decimalDigits: 0,
);

String formatNairaFromKobo(int kobo) {
  return _naira.format(kobo / 100);
}

String formatNaira(int naira) => _naira.format(naira);

int tripsFromKobo(int balanceKobo) => (balanceKobo / 100000).floor();

String shortId(String id) {
  if (id.length < 8) return id.toUpperCase();
  return id.substring(0, 8).toUpperCase();
}

String formatWhen(DateTime? value) {
  if (value == null) return '';
  return DateFormat('d MMM, h:mm a').format(value.toLocal());
}

int? asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value');
}

double? asDouble(dynamic value) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  return double.tryParse('$value');
}

String asString(dynamic value, [String fallback = '']) {
  if (value == null) return fallback;
  return value.toString();
}

bool asBool(dynamic value) => value == true;

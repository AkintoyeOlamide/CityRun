import 'package:cityrun_app/models/models.dart';
import 'package:url_launcher/url_launcher.dart';

String mapsNavigateUrl(AddressValue address) {
  final params = {'api': '1', 'travelmode': 'driving'};
  if (address.lat != null && address.lng != null) {
    params['destination'] = '${address.lat},${address.lng}';
  } else if (address.formatted.trim().isNotEmpty) {
    params['destination'] = address.formatted.trim();
  } else {
    return '';
  }
  return Uri.https('www.google.com', '/maps/dir/', params).toString();
}

Future<void> openMaps(AddressValue address) async {
  final url = mapsNavigateUrl(address);
  if (url.isEmpty) return;
  final uri = Uri.parse(url);
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

Future<void> callPhone(String phone) async {
  final digits = phone.replaceAll(RegExp(r'[^0-9+]'), '');
  if (digits.isEmpty) return;
  final uri = Uri(scheme: 'tel', path: digits);
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri);
  }
}

String initialsFor(String name, [String fallback = '?']) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return fallback;
  final parts = trimmed.split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
  if (parts.length >= 2) {
    return '${parts.first[0]}${parts.elementAt(1)[0]}'.toUpperCase();
  }
  return trimmed.substring(0, trimmed.length >= 2 ? 2 : 1).toUpperCase();
}

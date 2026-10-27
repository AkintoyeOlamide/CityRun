import 'package:dio/dio.dart';

import 'package:cityrun_app/config.dart';
import 'package:cityrun_app/models/models.dart';

class GooglePlacesClient {
  GooglePlacesClient._();

  static final GooglePlacesClient instance = GooglePlacesClient._();

  static bool get enabled => AppConfig.googleMapsApiKey.trim().isNotEmpty;

  final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 12),
      validateStatus: (status) => status != null && status < 500,
    ),
  );

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': AppConfig.googleMapsApiKey,
        'X-Android-Package': AppConfig.androidPackage,
        'X-Android-Cert': AppConfig.androidCertSha1,
      };

  Future<List<PlacePrediction>> autocomplete(String input) async {
    if (!enabled || input.trim().length < 3) return [];
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        'https://places.googleapis.com/v1/places:autocomplete',
        data: {
          'input': input.trim(),
          'includedRegionCodes': ['ng'],
          'locationBias': {
            'circle': {
              'center': {'latitude': 6.5244, 'longitude': 3.3792},
              'radius': 50000.0,
            },
          },
        },
        options: Options(headers: _headers),
      );
      if ((res.statusCode ?? 0) >= 400) return [];
      final suggestions = res.data?['suggestions'];
      if (suggestions is! List) return [];
      return suggestions
          .whereType<Map>()
          .map(_predictionFromSuggestion)
          .whereType<PlacePrediction>()
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<AddressValue?> placeDetails(PlacePrediction prediction) async {
    if (!enabled) return null;
    if (prediction.lat != null && prediction.lng != null) {
      return AddressValue(
        formatted: prediction.description,
        placeId: prediction.placeId,
        lat: prediction.lat,
        lng: prediction.lng,
      );
    }
    final id = prediction.placeId.replaceFirst(RegExp(r'^places/'), '');
    if (id.isEmpty || id.startsWith('nominatim:') || id.startsWith('photon:')) {
      return null;
    }
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        'https://places.googleapis.com/v1/places/$id',
        options: Options(
          headers: {
            ..._headers,
            'X-Goog-FieldMask': 'id,formattedAddress,location,displayName',
          },
        ),
      );
      if ((res.statusCode ?? 0) >= 400) return null;
      final data = res.data ?? {};
      final location = data['location'];
      final lat = location is Map ? (location['latitude'] as num?)?.toDouble() : null;
      final lng = location is Map ? (location['longitude'] as num?)?.toDouble() : null;
      final displayName = data['displayName'];
      final displayText = displayName is Map ? displayName['text'] : null;
      final formatted =
          (data['formattedAddress'] ?? displayText ?? prediction.description)
              .toString();
      return AddressValue(
        formatted: formatted,
        placeId: id,
        lat: lat,
        lng: lng,
      );
    } catch (_) {
      return null;
    }
  }

  PlacePrediction? _predictionFromSuggestion(Map item) {
    final pred = item['placePrediction'];
    if (pred is! Map) return null;
    final text = pred['text'];
    final description = text is Map
        ? (text['text']?.toString() ?? '')
        : pred['text']?.toString() ?? '';
    var placeId = pred['placeId']?.toString() ?? pred['place']?.toString() ?? '';
    placeId = placeId.replaceFirst(RegExp(r'^places/'), '');
    if (description.isEmpty || placeId.isEmpty) return null;
    return PlacePrediction(description: description, placeId: placeId);
  }
}

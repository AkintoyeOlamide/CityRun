import 'package:geolocator/geolocator.dart';

import 'package:cityrun_app/config.dart';
import 'package:cityrun_app/models/models.dart';

/// City Run (bicycle) stays a flat ₦1,000. Plus is a distance fare.
class DeliveryPricing {
  DeliveryPricing._();

  static const plusBaseKobo = 80000;
  static const plusPerKmKobo = 25000;
  static const plusPerMeterKobo = 25; // ₦250/km = ₦0.25/m
  static const plusMinimumKobo = 120000;
  static const roadDistanceFactor = 1.3;
  static const plusRateHint = '₦250/km · ₦0.25/m';

  static FareQuote estimate({
    required ServiceMode? serviceMode,
    AddressValue? pickup,
    AddressValue? dropoff,
  }) {
    if (serviceMode != ServiceMode.cityrunPlus) {
      return const FareQuote(
        fareKobo: AppConfig.tripPriceKobo,
        pricedByDistance: false,
      );
    }

    final from = _point(pickup);
    final to = _point(dropoff);
    if (from == null || to == null) {
      return const FareQuote(
        fareKobo: plusMinimumKobo,
        pricedByDistance: true,
        needsCoordinates: true,
      );
    }

    final distanceKm =
        (Geolocator.distanceBetween(from.$1, from.$2, to.$1, to.$2) / 1000) *
            roadDistanceFactor;
    return FareQuote(
      fareKobo: plusFareKobo(distanceKm),
      distanceKm: (distanceKm * 10).round() / 10,
      pricedByDistance: true,
    );
  }

  static int plusFareKobo(double distanceKm) {
    final raw = plusBaseKobo + (distanceKm < 0 ? 0 : distanceKm) * plusPerKmKobo;
    return _max(plusMinimumKobo, _roundUpToNearestNaira(raw.round()));
  }

  static (double, double)? _point(AddressValue? address) {
    final lat = address?.lat;
    final lng = address?.lng;
    if (lat == null || lng == null) return null;
    if (!lat.isFinite || !lng.isFinite) return null;
    return (lat, lng);
  }

  static int _roundUpToNearestNaira(int kobo, {int stepNaira = 50}) {
    final stepKobo = stepNaira * 100;
    return ((kobo + stepKobo - 1) ~/ stepKobo) * stepKobo;
  }

  static int _max(int a, int b) => a > b ? a : b;
}

class FareQuote {
  const FareQuote({
    required this.fareKobo,
    this.distanceKm,
    required this.pricedByDistance,
    this.needsCoordinates = false,
  });

  final int fareKobo;
  final double? distanceKm;
  final bool pricedByDistance;
  final bool needsCoordinates;
}

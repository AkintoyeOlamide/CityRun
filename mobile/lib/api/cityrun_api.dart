import 'package:cityrun_app/api/api_client.dart';
import 'package:cityrun_app/api/google_places.dart';
import 'package:cityrun_app/models/models.dart';

class CityRunApi {
  CityRunApi(this._client);

  final ApiClient _client;

  Future<void> signInCustomer({
    required String email,
    required String password,
  }) async {
    final res = await _client.post('/api/cityrun/auth/signin', data: {
      'email': email,
      'password': password,
    });
    _client.ensureOk(res, fallback: 'Sign in failed');
  }

  Future<String> signUpCustomer({
    required String email,
    required String password,
    required String fullName,
    required String phone,
    String accountType = 'individual',
    String? businessName,
    String? natureOfGoods,
    AddressValue? businessAddress,
  }) async {
    final res = await _client.post('/api/cityrun/auth/signup', data: {
      'email': email,
      'password': password,
      'fullName': fullName,
      'phone': phone,
      'accountType': accountType,
      if (accountType == 'business') ...{
        'businessName': businessName,
        'natureOfGoods': natureOfGoods,
        'businessAddress': businessAddress?.toJson(),
      },
    });
    _client.ensureOk(res, fallback: 'Could not create account');
    return _client.jsonMap(res)['accountType']?.toString() ?? accountType;
  }

  Future<String> forgotPassword(String email) async {
    final res = await _client.post('/api/cityrun/auth/forgot-password', data: {
      'email': email,
    });
    _client.ensureOk(res, fallback: 'Could not send reset email');
    return _client.jsonMap(res)['message']?.toString() ??
        'If an account exists for that email, we sent a reset link.';
  }

  Future<void> signOutCustomer() async {
    await _client.post('/api/cityrun/auth/signout');
  }

  Future<RiderPublic> signInRider({
    required String username,
    required String password,
  }) async {
    final res = await _client.post('/api/cityrun/rider/login', data: {
      'username': username,
      'password': password,
    });
    _client.ensureOk(res, fallback: 'Rider sign in failed');
    final rider = _client.jsonMap(res)['rider'];
    if (rider is! Map) {
      throw ApiException('Rider sign in failed');
    }
    return RiderPublic.fromJson(Map<String, dynamic>.from(rider));
  }

  Future<void> signOutRider() async {
    await _client.post('/api/cityrun/rider/logout');
  }

  Future<UserProfile?> currentProfile() async {
    final res = await _client.get('/api/cityrun/profile');
    if (res.statusCode == 401) return null;
    _client.ensureOk(res, fallback: 'Could not load profile');
    return UserProfile.fromJson(_client.jsonMap(res));
  }

  Future<UserProfile> updateProfile(Map<String, dynamic> patch) async {
    final res = await _client.patch('/api/cityrun/profile', data: patch);
    _client.ensureOk(res, fallback: 'Could not update profile');
    return UserProfile.fromJson(_client.jsonMap(res));
  }

  Future<RiderPublic?> currentRider() async {
    final res = await _client.get('/api/cityrun/rider/me');
    final body = _client.jsonMap(res);
    if (body['authenticated'] != true || body['rider'] is! Map) return null;
    return RiderPublic.fromJson(Map<String, dynamic>.from(body['rider'] as Map));
  }

  Future<List<DeliveryOrder>> myOrders() async {
    final res = await _client.get('/api/cityrun/my-orders');
    if (res.statusCode == 401) return [];
    _client.ensureOk(res, fallback: 'Could not load trips');
    final data = res.data;
    if (data is! List) return [];
    return data
        .whereType<Map>()
        .map((item) => DeliveryOrder.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<DeliveryOrder> getOrder(String id) async {
    final res = await _client.get('/api/cityrun/orders/$id');
    _client.ensureOk(res, fallback: 'Order not found');
    return DeliveryOrder.fromJson(_client.jsonMap(res));
  }

  Future<({String id, String status, int? fareKobo})> createOrder({
    required DeliveryKind kind,
    required AddressValue pickup,
    required AddressValue dropoff,
    required String itemDescription,
    required String contactName,
    required String contactPhone,
    String itemSize = 'medium',
    String notes = '',
    String? itemPhotoUrl,
    String? serviceMode,
  }) async {
    final res = await _client.post('/api/cityrun/orders', data: {
      'kind': kind.apiValue,
      'pickup': pickup.toJson(),
      'dropoff': dropoff.toJson(),
      'itemDescription': itemDescription,
      'itemSize': itemSize,
      'notes': notes,
      'contactName': contactName,
      'contactPhone': contactPhone,
      if (itemPhotoUrl != null) 'itemPhotoUrl': itemPhotoUrl,
      if (serviceMode != null) 'serviceMode': serviceMode,
    });
    _client.ensureOk(res, fallback: 'Could not create delivery request');
    final body = _client.jsonMap(res);
    return (
      id: body['id']?.toString() ?? '',
      status: body['status']?.toString() ?? 'pending',
      fareKobo: int.tryParse('${body['fareKobo']}'),
    );
  }

  Future<({int fareKobo, double? distanceKm, bool pricedByDistance})> quoteFare({
    required AddressValue pickup,
    required AddressValue dropoff,
    String? serviceMode,
  }) async {
    final res = await _client.post('/api/cityrun/orders/quote', data: {
      'pickup': pickup.toJson(),
      'dropoff': dropoff.toJson(),
      if (serviceMode != null) 'serviceMode': serviceMode,
    });
    _client.ensureOk(res, fallback: 'Could not quote delivery');
    final body = _client.jsonMap(res);
    return (
      fareKobo: int.tryParse('${body['fareKobo']}') ?? 100000,
      distanceKm: double.tryParse('${body['distanceKm']}'),
      pricedByDistance: body['pricedByDistance'] == true,
    );
  }

  Future<DeliveryOrder> cancelOrder(String id) async {
    final res = await _client.post('/api/cityrun/orders/$id/cancel');
    _client.ensureOk(res, fallback: 'Could not cancel delivery');
    final order = _client.jsonMap(res)['order'];
    if (order is Map) {
      return DeliveryOrder.fromJson(Map<String, dynamic>.from(order));
    }
    return getOrder(id);
  }

  Future<DeliveryOrder> payWithWallet(String orderId) async {
    final res = await _client.post('/api/cityrun/orders/$orderId/pay', data: {
      'useWallet': true,
    });
    _client.ensureOk(res, fallback: 'Wallet payment failed');
    final order = _client.jsonMap(res)['order'];
    if (order is Map) {
      return DeliveryOrder.fromJson(Map<String, dynamic>.from(order));
    }
    return getOrder(orderId);
  }

  Future<({String url, String reference})> startOrderPaystack(
    String orderId, {
    String? email,
  }) async {
    final res = await _client.post(
      '/api/cityrun/orders/$orderId/pay/paystack',
      data: {if (email != null && email.contains('@')) 'email': email},
    );
    _client.ensureOk(res, fallback: 'Could not start payment');
    final body = _client.jsonMap(res);
    return (
      url: body['authorizationUrl']?.toString() ?? '',
      reference: body['reference']?.toString() ?? '',
    );
  }

  Future<DeliveryOrder> verifyOrderPayment({
    required String orderId,
    required String reference,
  }) async {
    final res = await _client.get(
      '/api/cityrun/orders/$orderId/pay/verify',
      query: {'reference': reference},
    );
    _client.ensureOk(res, fallback: 'Payment verification failed');
    final order = _client.jsonMap(res)['order'];
    if (order is Map) {
      return DeliveryOrder.fromJson(Map<String, dynamic>.from(order));
    }
    return getOrder(orderId);
  }

  Future<WalletOverview?> wallet() async {
    final res = await _client.get('/api/cityrun/wallet');
    if (res.statusCode == 401) return null;
    _client.ensureOk(res, fallback: 'Could not load wallet');
    return WalletOverview.fromJson(_client.jsonMap(res));
  }

  Future<({String url, String reference})> startWalletTopup(
    int amountNaira,
  ) async {
    final res = await _client.post('/api/cityrun/wallet/topup', data: {
      'amountNaira': amountNaira,
    });
    _client.ensureOk(res, fallback: 'Could not start top-up');
    final body = _client.jsonMap(res);
    return (
      url: body['authorizationUrl']?.toString() ?? '',
      reference: body['reference']?.toString() ?? '',
    );
  }

  Future<void> verifyWalletTopup(String reference) async {
    final res = await _client.get(
      '/api/cityrun/wallet/verify',
      query: {'reference': reference},
    );
    _client.ensureOk(res, fallback: 'Could not verify top-up');
  }

  Future<List<PlacePrediction>> autocomplete(String input) async {
    final google = await GooglePlacesClient.instance.autocomplete(input);
    if (google.isNotEmpty) return google;
    final res = await _client.get(
      '/api/cityrun/places/autocomplete',
      query: {'input': input},
    );
    final predictions = _client.jsonMap(res)['predictions'];
    if (predictions is! List) return [];
    return predictions
        .whereType<Map>()
        .map((item) => PlacePrediction.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<AddressValue> placeDetails(PlacePrediction prediction) async {
    final google = await GooglePlacesClient.instance.placeDetails(prediction);
    if (google != null && google.formatted.trim().isNotEmpty) return google;
    final res = await _client.get('/api/cityrun/places/details', query: {
      'placeId': prediction.placeId,
      'description': prediction.description,
      if (prediction.lat != null) 'lat': prediction.lat,
      if (prediction.lng != null) 'lng': prediction.lng,
    });
    _client.ensureOk(res, fallback: 'Could not resolve place');
    return AddressValue.fromJson(_client.jsonMap(res));
  }

  Future<AddressValue> reverseGeocode(double lat, double lng) async {
    final res = await _client.get('/api/cityrun/places/reverse', query: {
      'lat': lat,
      'lng': lng,
    });
    _client.ensureOk(res, fallback: 'Could not find address');
    return AddressValue.fromJson(_client.jsonMap(res));
  }

  Future<List<DeliveryOrder>> riderOrders({String? filter}) async {
    final res = await _client.get(
      '/api/cityrun/rider/orders',
      query: {if (filter != null) 'filter': filter},
    );
    _client.ensureOk(res, fallback: 'Could not load rider orders');
    final data = res.data;
    if (data is! List) return [];
    return data
        .whereType<Map>()
        .map((item) => DeliveryOrder.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<DeliveryOrder> updateRiderOrderStatus({
    required String orderId,
    required String status,
  }) async {
    final res = await _client.patch(
      '/api/cityrun/rider/orders/$orderId',
      data: {'status': status},
    );
    _client.ensureOk(res, fallback: 'Could not update order');
    return DeliveryOrder.fromJson(_client.jsonMap(res));
  }

  Future<void> updateRiderLocation({
    required double lat,
    required double lng,
    double? accuracy,
  }) async {
    final res = await _client.patch('/api/cityrun/rider/location', data: {
      'lat': lat,
      'lng': lng,
      if (accuracy != null) 'accuracy': accuracy,
    });
    _client.ensureOk(res, fallback: 'Could not update location');
  }
}

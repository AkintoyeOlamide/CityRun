import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:geolocator/geolocator.dart';

import 'package:cityrun_app/api/api_client.dart';
import 'package:cityrun_app/api/cityrun_api.dart';
import 'package:cityrun_app/models/models.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AuthRole { none, guest, customer, rider }

class SessionController extends ChangeNotifier with WidgetsBindingObserver {
  SessionController() {
    _api = CityRunApi(ApiClient.instance);
    WidgetsBinding.instance.addObserver(this);
  }

  late final CityRunApi _api;
  CityRunApi get api => _api;

  AuthRole role = AuthRole.none;
  UserProfile? profile;
  RiderPublic? rider;
  ServiceMode? serviceMode;
  bool ready = false;
  bool busy = false;
  String? error;

  Timer? _locationTimer;
  bool locationOn = false;

  bool get isCustomer => role == AuthRole.customer;
  bool get isRider => role == AuthRole.rider;
  bool get isGuest => role == AuthRole.guest;
  bool get signedIn => isCustomer || isRider;

  Future<void> restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      serviceMode = ServiceModeX.tryParse(prefs.getString('cityrun-service-mode'));

      final existingRider = await _api.currentRider();
      if (existingRider != null) {
        rider = existingRider;
        profile = null;
        role = AuthRole.rider;
        _startLocationLoop();
        ready = true;
        notifyListeners();
        return;
      }

      final existingProfile = await _api.currentProfile();
      if (existingProfile != null) {
        profile = existingProfile;
        rider = null;
        role = AuthRole.customer;
        ready = true;
        notifyListeners();
        return;
      }
    } catch (_) {
      /* stay signed out */
    }

    role = AuthRole.none;
    profile = null;
    rider = null;
    ready = true;
    notifyListeners();
  }

  Future<void> setServiceMode(ServiceMode mode) async {
    serviceMode = mode;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('cityrun-service-mode', mode.apiValue);
  }

  void continueAsGuest() {
    role = AuthRole.guest;
    profile = null;
    rider = null;
    notifyListeners();
  }

  Future<void> signInCustomer(String email, String password) async {
    await _run(() async {
      await _api.signInCustomer(email: email, password: password);
      profile = await _api.currentProfile();
      rider = null;
      role = AuthRole.customer;
    });
  }

  Future<void> signUpCustomer({
    required String email,
    required String password,
    required String fullName,
    required String phone,
    String accountType = 'individual',
    String? businessName,
    String? natureOfGoods,
    AddressValue? businessAddress,
  }) async {
    await _run(() async {
      await _api.signUpCustomer(
        email: email,
        password: password,
        fullName: fullName,
        phone: phone,
        accountType: accountType,
        businessName: businessName,
        natureOfGoods: natureOfGoods,
        businessAddress: businessAddress,
      );
      profile = await _api.currentProfile();
      rider = null;
      role = AuthRole.customer;
    });
  }

  Future<void> signInRider(String username, String password) async {
    await _run(() async {
      rider = await _api.signInRider(username: username, password: password);
      profile = null;
      role = AuthRole.rider;
      _startLocationLoop();
    });
  }

  Future<String> forgotPassword(String email) {
    return _api.forgotPassword(email);
  }

  Future<void> refreshProfile() async {
    if (!isCustomer) return;
    try {
      profile = await _api.currentProfile();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> signOut() async {
    _stopLocationLoop();
    try {
      if (isRider) {
        await _api.signOutRider();
      } else {
        await _api.signOutCustomer();
      }
    } catch (_) {}
    await ApiClient.instance.clearCookies();
    role = AuthRole.none;
    profile = null;
    rider = null;
    notifyListeners();
  }

  Future<void> _run(Future<void> Function() action) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      await action();
    } on ApiException catch (e) {
      error = e.message;
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  void _startLocationLoop() {
    _stopLocationLoop();
    _pushLocation(requestPermission: true);
    _locationTimer = Timer.periodic(
      const Duration(seconds: 20),
      (_) => _pushLocation(),
    );
  }

  void _stopLocationLoop() {
    _locationTimer?.cancel();
    _locationTimer = null;
  }

  Future<void> requestRiderLocation() {
    return _pushLocation(requestPermission: true);
  }

  Future<void> _pushLocation({bool requestPermission = false}) async {
    if (!isRider) return;
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        _setLocationOn(false);
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied && requestPermission) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _setLocationOn(false);
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );
      await _api.updateRiderLocation(
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy,
      );
      _setLocationOn(true);
    } catch (_) {
      _setLocationOn(false);
    }
  }

  void _setLocationOn(bool value) {
    if (locationOn == value) return;
    locationOn = value;
    notifyListeners();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!isRider) return;
    if (state == AppLifecycleState.resumed) {
      _startLocationLoop();
    } else if (state == AppLifecycleState.paused) {
      _stopLocationLoop();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopLocationLoop();
    super.dispose();
  }
}

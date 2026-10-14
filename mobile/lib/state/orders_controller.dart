import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/state/session_controller.dart';

class OrdersController extends ChangeNotifier {
  OrdersController(this.session);

  final SessionController session;

  List<DeliveryOrder> orders = [];
  bool loading = false;
  String? error;
  Timer? _timer;
  static const _guestKey = 'cityrun_guest_order_ids';

  List<DeliveryOrder> get activeOrders =>
      orders.where((o) => isActiveDelivery(o.status)).toList();

  List<DeliveryOrder> get pendingOrders =>
      orders.where((o) => o.status == 'pending' || o.status == 'confirmed').toList();

  List<DeliveryOrder> get doneOrders =>
      orders.where((o) => o.status == 'delivered' || o.status == 'cancelled').toList();

  DeliveryOrder? get spotlight =>
      activeOrders.isNotEmpty ? activeOrders.first : null;

  void start() {
    refresh();
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 12), (_) => refresh());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> rememberGuestOrder(String id) async {
    if (id.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final ids = prefs.getStringList(_guestKey) ?? [];
    if (!ids.contains(id)) {
      ids.insert(0, id);
      await prefs.setStringList(_guestKey, ids.take(20).toList());
    }
  }

  Future<void> refresh() async {
    loading = orders.isEmpty;
    error = null;
    if (orders.isEmpty) notifyListeners();
    try {
      if (session.isCustomer) {
        orders = await session.api.myOrders();
      } else {
        orders = await _loadGuestOrders();
      }
    } on ApiException catch (e) {
      error = e.message;
    } catch (_) {
      error = 'Could not load trips';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<List<DeliveryOrder>> _loadGuestOrders() async {
    final prefs = await SharedPreferences.getInstance();
    final ids = prefs.getStringList(_guestKey) ?? [];
    final loaded = <DeliveryOrder>[];
    for (final id in ids) {
      try {
        loaded.add(await session.api.getOrder(id));
      } catch (_) {}
    }
    return loaded;
  }

  @override
  void dispose() {
    stop();
    super.dispose();
  }
}

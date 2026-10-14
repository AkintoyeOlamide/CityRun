import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/screens/order_screen.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';
import 'package:cityrun_app/utils/format.dart';
import 'package:cityrun_app/utils/maps.dart';
import 'package:cityrun_app/widgets/ui.dart';

class RiderScreen extends StatefulWidget {
  const RiderScreen({super.key});

  @override
  State<RiderScreen> createState() => _RiderScreenState();
}

class _RiderScreenState extends State<RiderScreen> {
  String _filter = 'available';
  List<DeliveryOrder> _orders = [];
  final _counts = {'available': 0, 'active': 0, 'history': 0};
  bool _loading = true;
  String? _error;
  String? _message;
  String? _updatingId;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _refresh();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SessionController>().requestRiderLocation();
    });
    _timer = Timer.periodic(const Duration(seconds: 12), (_) => _refresh(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh({bool silent = false}) async {
    if (!silent) setState(() => _loading = _orders.isEmpty);
    try {
      final api = context.read<SessionController>().api;
      final orders = await api.riderOrders(filter: _filter);
      final counts = <String, int>{};
      for (final key in ['available', 'active', 'history']) {
        final list = key == _filter ? orders : await api.riderOrders(filter: key);
        counts[key] = list.length;
      }
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _counts.addAll(counts);
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _update(DeliveryOrder order, Map<String, String> action) async {
    setState(() {
      _updatingId = order.id;
      _error = null;
      _message = null;
    });
    try {
      await context.read<SessionController>().api.updateRiderOrderStatus(
            orderId: order.id,
            status: action['nextStatus']!,
          );
      if (action['nextStatus'] == 'rider_assigned') {
        _filter = 'active';
      }
      setState(() => _message = action['notifyText']);
      await _refresh();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _updatingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionController>();
    final rider = session.rider;
    return Scaffold(
      body: MeshBackground(
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
                child: Row(
                  children: [
                    AvatarCircle(initials: initialsFor(rider?.fullName ?? 'R')),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('RIDER', style: TextStyle(color: CrColors.textMuted, fontSize: 10, letterSpacing: 1)),
                          Text(rider?.fullName ?? 'Rider', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                          Text('@${rider?.username ?? ''}', style: const TextStyle(color: CrColors.textMuted, fontSize: 12)),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => session.requestRiderLocation(),
                      icon: Icon(
                        session.locationOn ? Icons.location_on : Icons.location_off_outlined,
                        color: session.locationOn ? const Color(0xFF34D399) : CrColors.textMuted,
                      ),
                    ),
                    IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh)),
                    IconButton(
                      onPressed: () => session.signOut(),
                      icon: const Icon(Icons.logout),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: SegmentedButton<String>(
                  segments: [
                    ButtonSegment(value: 'available', label: Text('New (${_counts['available']})')),
                    ButtonSegment(value: 'active', label: Text('Active (${_counts['active']})')),
                    ButtonSegment(value: 'history', label: Text('History (${_counts['history']})')),
                  ],
                  selected: {_filter},
                  onSelectionChanged: (value) {
                    setState(() => _filter = value.first);
                    _refresh();
                  },
                ),
              ),
              if (_message != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                  child: CrSuccessBanner(_message!),
                ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                  child: CrErrorBanner(_error!),
                ),
              Expanded(
                child: RefreshIndicator(
                  color: CrColors.accent,
                  onRefresh: _refresh,
                  child: _loading
                      ? const Center(child: CircularProgressIndicator())
                      : _orders.isEmpty
                          ? ListView(
                              children: [
                                const SizedBox(height: 80),
                                Text(
                                  switch (_filter) {
                                    'available' => 'No new jobs',
                                    'active' => 'No active deliveries',
                                    _ => 'No history yet',
                                  },
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: CrColors.textMuted),
                                ),
                              ],
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                              itemCount: _orders.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (context, index) {
                                final order = _orders[index];
                                final action = riderNextAction[order.status];
                                final navigateTarget = ['picked_up', 'in_transit', 'arrived_at_dropoff']
                                        .contains(order.status)
                                    ? order.dropoff
                                    : order.pickup;
                                return CrCard(
                                  padding: EdgeInsets.zero,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Padding(
                                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Text(
                                                  order.kind.title.toUpperCase(),
                                                  style: const TextStyle(color: CrColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800),
                                                ),
                                                const SizedBox(width: 8),
                                                Text('#${shortId(order.id)}', style: const TextStyle(color: CrColors.accentSoft, fontSize: 11)),
                                                const Spacer(),
                                                StatusPill(order.riderStatusLabel, tone: toneForStatus(order.status)),
                                              ],
                                            ),
                                            const SizedBox(height: 8),
                                            Text(order.itemDescription, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                                            const SizedBox(height: 4),
                                            Text(order.contactName, style: const TextStyle(color: CrColors.textMuted)),
                                            const SizedBox(height: 12),
                                            RouteLine(label: 'Pickup', address: order.pickup.formatted, icon: Icons.north_east),
                                            const SizedBox(height: 10),
                                            RouteLine(label: 'Dropoff', address: order.dropoff.formatted, icon: Icons.south_east),
                                            if (order.notes.isNotEmpty) ...[
                                              const SizedBox(height: 10),
                                              Text(order.notes, style: const TextStyle(color: CrColors.textMuted, fontSize: 12)),
                                            ],
                                          ],
                                        ),
                                      ),
                                      if (_filter != 'history' && action != null)
                                        Container(
                                          width: double.infinity,
                                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                                          decoration: const BoxDecoration(
                                            color: Color(0x143478F6),
                                            border: Border(top: BorderSide(color: CrColors.border)),
                                          ),
                                          child: order.awaitingPayment
                                              ? const Text(
                                                  'Waiting for payment',
                                                  style: TextStyle(color: CrColors.yellow, fontSize: 13),
                                                )
                                              : BusyButton(
                                                  label: action['buttonLabel'] ?? 'Update',
                                                  busy: _updatingId == order.id,
                                                  onPressed: () => _update(order, Map<String, String>.from(action)),
                                                ),
                                        ),
                                      Padding(
                                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                                        child: Row(
                                          children: [
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                onPressed: () => callPhone(order.contactPhone),
                                                icon: const Icon(Icons.phone, size: 16),
                                                label: const Text('Call'),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                onPressed: navigateTarget.canNavigate
                                                    ? () => openMaps(navigateTarget)
                                                    : null,
                                                icon: const Icon(Icons.navigation, size: 16),
                                                label: const Text('Navigate'),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                onPressed: () {
                                                  Navigator.push(
                                                    context,
                                                    MaterialPageRoute(
                                                      builder: (_) => OrderScreen(orderId: order.id),
                                                    ),
                                                  );
                                                },
                                                icon: const Icon(Icons.open_in_new, size: 16),
                                                label: const Text('Track'),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

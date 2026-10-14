import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/screens/order_screen.dart';
import 'package:cityrun_app/screens/request_screen.dart';
import 'package:cityrun_app/state/orders_controller.dart';
import 'package:cityrun_app/theme.dart';
import 'package:cityrun_app/utils/format.dart';
import 'package:cityrun_app/widgets/ui.dart';

enum _TripTab { pending, active, done }

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  _TripTab _tab = _TripTab.active;

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<OrdersController>();
    final list = switch (_tab) {
      _TripTab.pending => controller.pendingOrders,
      _TripTab.active => controller.activeOrders,
      _TripTab.done => controller.doneOrders,
    };

    return MeshBackground(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            child: Row(
              children: [
                const Expanded(
                  child: Text('Trips', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                ),
                IconButton(
                  onPressed: controller.loading ? null : controller.refresh,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: SegmentedButton<_TripTab>(
              segments: [
                ButtonSegment(
                  value: _TripTab.pending,
                  label: Text('Pending (${controller.pendingOrders.length})'),
                ),
                ButtonSegment(
                  value: _TripTab.active,
                  label: Text('Active (${controller.activeOrders.length})'),
                ),
                ButtonSegment(
                  value: _TripTab.done,
                  label: Text('Done (${controller.doneOrders.length})'),
                ),
              ],
              selected: {_tab},
              onSelectionChanged: (value) => setState(() => _tab = value.first),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: CrColors.accent,
              onRefresh: controller.refresh,
              child: controller.loading && controller.orders.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : list.isEmpty
                      ? ListView(
                          children: [
                            const SizedBox(height: 80),
                            Icon(
                              Icons.pedal_bike,
                              size: 42,
                              color: Colors.white.withValues(alpha: 0.25),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              switch (_tab) {
                                _TripTab.pending => 'No pending requests',
                                _TripTab.active => 'No active deliveries',
                                _TripTab.done => 'No completed trips yet',
                              },
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: CrColors.textMuted),
                            ),
                            const SizedBox(height: 16),
                            Center(
                              child: TextButton(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const RequestScreen(kind: DeliveryKind.send),
                                    ),
                                  );
                                },
                                child: const Text('Book a delivery'),
                              ),
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                          itemCount: list.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final order = list[index];
                            return CrCard(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => OrderScreen(orderId: order.id),
                                  ),
                                );
                              },
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      StatusPill(order.statusLabel, tone: toneForStatus(order.status)),
                                      const Spacer(),
                                      Text(
                                        '#${shortId(order.id)}',
                                        style: const TextStyle(color: CrColors.accentSoft, fontSize: 11),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    order.itemDescription,
                                    style: const TextStyle(fontWeight: FontWeight.w700),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    order.dropoff.formatted,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: CrColors.textMuted, fontSize: 12),
                                  ),
                                  if (order.createdAt != null) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      formatWhen(order.createdAt),
                                      style: const TextStyle(color: CrColors.textMuted, fontSize: 11),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}

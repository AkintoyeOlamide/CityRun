import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/screens/auth_screen.dart';
import 'package:cityrun_app/screens/order_screen.dart';
import 'package:cityrun_app/screens/request_screen.dart';
import 'package:cityrun_app/state/orders_controller.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';
import 'package:cityrun_app/utils/format.dart';
import 'package:cityrun_app/utils/maps.dart';
import 'package:cityrun_app/widgets/service_mode_picker.dart';
import 'package:cityrun_app/widgets/ui.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.onOpenAccount, required this.onOpenTrips});

  final VoidCallback onOpenAccount;
  final VoidCallback onOpenTrips;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionController>();
    final orders = context.watch<OrdersController>();
    final profile = session.profile;
    final name = profile?.displayName ?? 'Guest';
    final first = name.split(' ').first;
    final active = orders.activeOrders;

    return MeshBackground(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: onOpenAccount,
                child: Row(
                  children: [
                    session.isCustomer
                        ? AvatarCircle(initials: initialsFor(profile?.fullName ?? name))
                        : Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: CrColors.border),
                              color: const Color(0x0DFFFFFF),
                            ),
                            child: const Icon(Icons.person_outline, size: 20),
                          ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          session.isCustomer ? 'Welcome back' : 'City Run',
                          style: const TextStyle(color: CrColors.textMuted, fontSize: 11),
                        ),
                        Text(
                          session.isCustomer ? first : 'Sign in',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Spacer(),
              if (session.isCustomer)
                GestureDetector(
                  onTap: onOpenAccount,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0x1AFACC15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.account_balance_wallet_outlined, size: 14, color: CrColors.yellow),
                        SizedBox(width: 6),
                        Text(
                          'Wallet',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: CrColors.yellow),
                        ),
                      ],
                    ),
                  ),
                )
              else
                TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const AuthScreen()),
                    );
                  },
                  child: const Text('Sign in'),
                ),
            ],
          ),
          const SizedBox(height: 24),
          if (active.isNotEmpty) ...[
            Text(
              active.length == 1 ? 'Active delivery' : '${active.length} active deliveries',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: CrColors.textMuted,
              ),
            ),
            const SizedBox(height: 10),
            if (active.length == 1)
              _ActiveCard(order: active.first)
            else ...[
              for (final order in active.take(3)) _CompactTrip(order: order),
              TextButton(onPressed: onOpenTrips, child: const Text('View all trips')),
            ],
            const SizedBox(height: 16),
          ] else ...[
            Text(
              profile?.isBusinessLike == true
                  ? (profile!.isBusiness ? 'Send to your customers' : 'Book a delivery run')
                  : 'Where are we riding today?',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, height: 1.2),
            ),
            const SizedBox(height: 8),
            Text(
              profile?.isBusiness == true
                  ? 'We pick up from your registered address — just add where to deliver.'
                  : 'Choose bicycle or motorbike, then send, receive, or pick up from a store.',
              style: const TextStyle(color: CrColors.textMuted, height: 1.4),
            ),
            const SizedBox(height: 22),
          ],
          ServiceModePicker(compact: session.serviceMode != null),
          const SizedBox(height: 18),
          if (session.serviceMode == null)
            const Text(
              'Choose City Run or City Run Plus to continue.',
              style: TextStyle(color: CrColors.textMuted, fontSize: 13),
            )
          else if (profile?.isBusinessLike == true)
            CrCard(
              onTap: session.serviceMode == null
                  ? null
                  : () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const RequestScreen(kind: DeliveryKind.send),
                        ),
                      );
                    },
              child: const Row(
                children: [
                  _KindIcon(icon: Icons.send_outlined, yellow: true),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text('Send items', style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                  Icon(Icons.arrow_forward, size: 16, color: CrColors.textMuted),
                ],
              ),
            )
          else ...[
            _KindTile(
              kind: DeliveryKind.send,
              icon: Icons.send_outlined,
              yellow: true,
              tag: 'Popular',
            ),
            const SizedBox(height: 10),
            _KindTile(
              kind: DeliveryKind.receive,
              icon: Icons.inventory_2_outlined,
            ),
            const SizedBox(height: 10),
            _KindTile(
              kind: DeliveryKind.storePickup,
              icon: Icons.storefront_outlined,
            ),
          ],
        ],
      ),
    );
  }
}

class _KindTile extends StatelessWidget {
  const _KindTile({
    required this.kind,
    required this.icon,
    this.yellow = false,
    this.tag,
  });

  final DeliveryKind kind;
  final IconData icon;
  final bool yellow;
  final String? tag;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionController>();
    return CrCard(
      onTap: session.serviceMode == null
          ? null
          : () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => RequestScreen(kind: kind)),
              );
            },
      child: Row(
        children: [
          _KindIcon(icon: icon, yellow: yellow),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(kind.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                    if (tag != null) ...[
                      const SizedBox(width: 8),
                      StatusPill(tag!, tone: StatusTone.yellow),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(kind.subtitle, style: const TextStyle(color: CrColors.textMuted, fontSize: 12)),
              ],
            ),
          ),
          const Icon(Icons.arrow_forward, size: 16, color: CrColors.textMuted),
        ],
      ),
    );
  }
}

class _KindIcon extends StatelessWidget {
  const _KindIcon({required this.icon, this.yellow = false});
  final IconData icon;
  final bool yellow;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: yellow ? const Color(0x33FACC15) : const Color(0x263478F6),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: yellow ? CrColors.yellow : CrColors.accentSoft, size: 20),
    );
  }
}

class _ActiveCard extends StatelessWidget {
  const _ActiveCard({required this.order});
  final DeliveryOrder order;

  @override
  Widget build(BuildContext context) {
    return CrCard(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => OrderScreen(orderId: order.id)),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusPill(order.statusLabel, tone: toneForStatus(order.status)),
              const Spacer(),
              Text('#${shortId(order.id)}', style: const TextStyle(color: CrColors.accentSoft, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 10),
          Text(order.itemDescription, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          RouteLine(label: 'Pickup', address: order.pickup.formatted, icon: Icons.north_east),
          const SizedBox(height: 10),
          RouteLine(label: 'Dropoff', address: order.dropoff.formatted, icon: Icons.south_east),
          if (order.riderName != null) ...[
            const SizedBox(height: 12),
            Text('Rider · ${order.riderName}', style: const TextStyle(color: CrColors.textMuted, fontSize: 12)),
          ],
        ],
      ),
    );
  }
}

class _CompactTrip extends StatelessWidget {
  const _CompactTrip({required this.order});
  final DeliveryOrder order;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: CrCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => OrderScreen(orderId: order.id)),
          );
        },
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(order.itemDescription, maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(order.statusLabel, style: const TextStyle(color: CrColors.textMuted, fontSize: 12)),
                ],
              ),
            ),
            StatusPill(order.statusLabel, tone: toneForStatus(order.status)),
          ],
        ),
      ),
    );
  }
}

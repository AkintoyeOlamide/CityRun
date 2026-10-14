import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/state/orders_controller.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';
import 'package:cityrun_app/utils/format.dart';
import 'package:cityrun_app/utils/maps.dart';
import 'package:cityrun_app/widgets/paystack_sheet.dart';
import 'package:cityrun_app/widgets/ui.dart';

class OrderScreen extends StatefulWidget {
  const OrderScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  DeliveryOrder? _order;
  bool _loading = true;
  String? _error;
  String? _flash;
  Timer? _timer;
  bool _busy = false;
  final _email = TextEditingController();

  @override
  void initState() {
    super.initState();
    final profile = context.read<SessionController>().profile;
    _email.text = profile?.email ?? '';
    _load();
    _timer = Timer.periodic(const Duration(seconds: 8), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    _email.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = _order == null;
        _error = null;
      });
    }
    try {
      final order = await context.read<SessionController>().api.getOrder(widget.orderId);
      if (!mounted) return;
      if (_order != null && _order!.status != order.status) {
        _flash = order.statusLabel;
      }
      setState(() {
        _order = order;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (_order == null) _error = e.toString();
      });
    }
  }

  Future<void> _cancel() async {
    final order = _order;
    if (order == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel delivery?'),
        content: Text(
          order.status == 'pending' || order.status == 'confirmed'
              ? 'You can place a new request anytime.'
              : 'Your rider has already been assigned.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Cancel delivery')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busy = true);
    try {
      final updated = await context.read<SessionController>().api.cancelOrder(order.id);
      setState(() => _order = updated);
      await _refreshOrders();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _refreshOrders() async {
    try {
      await context.read<OrdersController>().refresh();
    } catch (_) {}
  }

  Future<void> _payWallet() async {
    final order = _order;
    if (order == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await context.read<SessionController>().api.payWithWallet(order.id);
      setState(() => _order = updated);
      await _refreshOrders();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _payPaystack() async {
    final order = _order;
    if (order == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = context.read<SessionController>();
      final started = await session.api.startOrderPaystack(
        order.id,
        email: _email.text.trim().isEmpty ? null : _email.text.trim(),
      );
      if (!mounted) return;
      final reference = await openPaystackCheckout(context, started.url);
      if (reference == null || !mounted) return;
      final updated = await session.api.verifyOrderPayment(
        orderId: order.id,
        reference: reference,
      );
      setState(() => _order = updated);
      await _refreshOrders();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      appBar: AppBar(title: const Text('Track delivery')),
      body: MeshBackground(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : order == null
                ? ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      CrErrorBanner(_error ?? 'Order not found'),
                    ],
                  )
                : RefreshIndicator(
                    color: CrColors.accent,
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                      children: [
                        if (_flash != null) ...[
                          CrSuccessBanner('Status updated: $_flash'),
                          const SizedBox(height: 12),
                        ],
                        CrCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  StatusPill(order.statusLabel, tone: toneForStatus(order.status)),
                                  const Spacer(),
                                  Text('#${shortId(order.id)}', style: const TextStyle(color: CrColors.accentSoft)),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                customerStatusDetails[order.status] ?? order.statusLabel,
                                style: const TextStyle(height: 1.4),
                              ),
                              const SizedBox(height: 14),
                              _Timeline(status: order.status),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        CrCard(
                          child: Column(
                            children: [
                              RouteLine(label: 'Pickup', address: order.pickup.formatted, icon: Icons.north_east),
                              const SizedBox(height: 12),
                              RouteLine(label: 'Dropoff', address: order.dropoff.formatted, icon: Icons.south_east),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        CrCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(order.itemDescription, style: const TextStyle(fontWeight: FontWeight.w700)),
                              const SizedBox(height: 6),
                              Text('${order.kind.title} · ${order.itemSize}', style: const TextStyle(color: CrColors.textMuted, fontSize: 12)),
                              const SizedBox(height: 8),
                              Text('${order.contactName} · ${order.contactPhone}'),
                              if (order.notes.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(order.notes, style: const TextStyle(color: CrColors.textMuted, fontSize: 13)),
                              ],
                            ],
                          ),
                        ),
                        if (order.riderName != null) ...[
                          const SizedBox(height: 12),
                          CrCard(
                            child: Row(
                              children: [
                                AvatarCircle(initials: initialsFor(order.riderName!)),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Your rider', style: TextStyle(color: CrColors.textMuted, fontSize: 11)),
                                      Text(order.riderName!, style: const TextStyle(fontWeight: FontWeight.w700)),
                                      if (order.riderPhone != null)
                                        Text(order.riderPhone!, style: const TextStyle(color: CrColors.textMuted, fontSize: 12)),
                                    ],
                                  ),
                                ),
                                if (order.riderPhone != null)
                                  IconButton(
                                    onPressed: () => callPhone(order.riderPhone!),
                                    icon: const Icon(Icons.phone),
                                  ),
                              ],
                            ),
                          ),
                        ],
                        if (order.awaitingPayment) ...[
                          const SizedBox(height: 12),
                          CrCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Pay to complete delivery', style: TextStyle(fontWeight: FontWeight.w800)),
                                const SizedBox(height: 6),
                                Text(
                                  'Due ${formatNairaFromKobo(order.dueKobo)}',
                                  style: const TextStyle(color: CrColors.yellow, fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 12),
                                if (!context.watch<SessionController>().isCustomer) ...[
                                  const CrFieldLabel('Email for receipt'),
                                  TextField(
                                    controller: _email,
                                    keyboardType: TextInputType.emailAddress,
                                    decoration: const InputDecoration(hintText: 'you@email.com'),
                                  ),
                                  const SizedBox(height: 12),
                                ],
                                BusyButton(
                                  label: 'Pay with Paystack',
                                  onPressed: _payPaystack,
                                  busy: _busy,
                                ),
                                if (context.watch<SessionController>().isCustomer) ...[
                                  const SizedBox(height: 10),
                                  BusyButton(
                                    label: 'Pay with wallet',
                                    outlined: true,
                                    onPressed: _payWallet,
                                    busy: _busy,
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                        if (order.isPaid) ...[
                          const SizedBox(height: 12),
                          CrSuccessBanner('Paid · ${formatNairaFromKobo(order.dueKobo)}'),
                        ],
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          CrErrorBanner(_error!),
                        ],
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: order.pickup.canNavigate ? () => openMaps(order.pickup) : null,
                                icon: const Icon(Icons.map_outlined, size: 16),
                                label: const Text('Pickup map'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: order.dropoff.canNavigate ? () => openMaps(order.dropoff) : null,
                                icon: const Icon(Icons.navigation_outlined, size: 16),
                                label: const Text('Dropoff map'),
                              ),
                            ),
                          ],
                        ),
                        if (order.canCancel) ...[
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: _busy ? null : _cancel,
                            child: const Text('Cancel delivery', style: TextStyle(color: CrColors.danger)),
                          ),
                        ],
                      ],
                    ),
                  ),
      ),
    );
  }
}

class _Timeline extends StatelessWidget {
  const _Timeline({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final current = deliveryStatuses.indexOf(status);
    final steps = deliveryStatuses.where((s) => s != 'cancelled').toList();
    return Column(
      children: [
        for (var i = 0; i < steps.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Icon(
                  i <= current && status != 'cancelled' ? Icons.check_circle : Icons.radio_button_unchecked,
                  size: 16,
                  color: i <= current && status != 'cancelled' ? CrColors.success : CrColors.textMuted,
                ),
                const SizedBox(width: 8),
                Text(
                  customerStatusLabels[steps[i]] ?? steps[i],
                  style: TextStyle(
                    fontSize: 12,
                    color: i <= current ? Colors.white : CrColors.textMuted,
                    fontWeight: i == current ? FontWeight.w700 : FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

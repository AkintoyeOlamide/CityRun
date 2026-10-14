import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/screens/account_screen.dart';
import 'package:cityrun_app/screens/home_screen.dart';
import 'package:cityrun_app/screens/request_screen.dart';
import 'package:cityrun_app/screens/trips_screen.dart';
import 'package:cityrun_app/state/orders_controller.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';

class CustomerShell extends StatefulWidget {
  const CustomerShell({super.key});

  @override
  State<CustomerShell> createState() => _CustomerShellState();
}

class _CustomerShellState extends State<CustomerShell> {
  int _index = 0;
  late final OrdersController _orders;

  @override
  void initState() {
    super.initState();
    _orders = OrdersController(context.read<SessionController>())..start();
  }

  @override
  void dispose() {
    _orders.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: _orders,
      child: Scaffold(
        body: SafeArea(
          child: IndexedStack(
            index: _index,
            children: [
              HomeScreen(
                onOpenAccount: () => setState(() => _index = 3),
                onOpenTrips: () => setState(() => _index = 1),
              ),
              const TripsScreen(),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: EdgeInsets.fromLTRB(20, 12, 20, 0),
                    child: Text(
                      'New delivery',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                    ),
                  ),
                  Expanded(child: RequestScreen(kind: DeliveryKind.send, embedded: true)),
                ],
              ),
              const AccountScreen(),
            ],
          ),
        ),
        bottomNavigationBar: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: CrColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: CrColors.border),
            ),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Row(
                children: [
                  _NavItem(
                    icon: Icons.home_outlined,
                    label: 'Home',
                    selected: _index == 0,
                    onTap: () => setState(() => _index = 0),
                  ),
                  _NavItem(
                    icon: Icons.assignment_outlined,
                    label: 'Trips',
                    selected: _index == 1,
                    onTap: () => setState(() => _index = 1),
                  ),
                  _NavItem(
                    icon: Icons.add,
                    label: 'New',
                    selected: _index == 2,
                    onTap: () => setState(() => _index = 2),
                  ),
                  _NavItem(
                    icon: Icons.person_outline,
                    label: 'Account',
                    selected: _index == 3,
                    onTap: () => setState(() => _index = 3),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected ? CrColors.yellow : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 20,
                color: selected ? const Color(0xFF0F172A) : Colors.white54,
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: selected ? const Color(0xFF0F172A) : Colors.white54,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

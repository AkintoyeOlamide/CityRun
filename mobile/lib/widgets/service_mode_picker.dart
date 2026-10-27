import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';

class ServiceModePicker extends StatelessWidget {
  const ServiceModePicker({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionController>();
    final selected = session.serviceMode;

    if (compact) {
      return Row(
        children: [
          for (final mode in ServiceMode.values) ...[
            if (mode != ServiceMode.values.first) const SizedBox(width: 8),
            Expanded(
              child: _ModeCard(
                mode: mode,
                selected: selected == mode,
                compact: true,
                onTap: () => session.setServiceMode(mode),
              ),
            ),
          ],
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'How should we deliver?',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 14),
        for (final mode in ServiceMode.values) ...[
          _ModeCard(
            mode: mode,
            selected: selected == mode,
            onTap: () => session.setServiceMode(mode),
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _ModeCard extends StatelessWidget {
  const _ModeCard({
    required this.mode,
    required this.selected,
    required this.onTap,
    this.compact = false,
  });

  final ServiceMode mode;
  final bool selected;
  final VoidCallback onTap;
  final bool compact;

  IconData get _icon => switch (mode) {
        ServiceMode.cityrun => Icons.pedal_bike,
        ServiceMode.cityrunPlus => Icons.two_wheeler,
      };

  @override
  Widget build(BuildContext context) {
    final accent = mode == ServiceMode.cityrun ? CrColors.yellow : CrColors.accentSoft;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: EdgeInsets.all(compact ? 12 : 16),
          decoration: BoxDecoration(
            color: selected ? accent.withValues(alpha: 0.22) : const Color(0x0DFFFFFF),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? accent : const Color(0x1AFFFFFF),
              width: selected ? 2.5 : 1,
            ),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: accent.withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              Container(
                width: compact ? 40 : 48,
                height: compact ? 40 : 48,
                decoration: BoxDecoration(
                  color: selected ? accent.withValues(alpha: 0.28) : const Color(0x14FFFFFF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  _icon,
                  color: selected ? accent : const Color(0x66FFFFFF),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  mode.title,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: selected ? Colors.white : const Color(0x99FFFFFF),
                  ),
                ),
              ),
              if (selected)
                Icon(Icons.check_circle, color: accent, size: compact ? 20 : 22),
            ],
          ),
        ),
      ),
    );
  }
}

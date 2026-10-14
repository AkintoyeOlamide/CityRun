import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';
import 'package:cityrun_app/widgets/ui.dart';

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
        const SizedBox(height: 6),
        const Text(
          'Pick a ride type, like Bolt — bicycle for a flat fare, motorbike priced by distance.',
          style: TextStyle(color: CrColors.textMuted, height: 1.4, fontSize: 13),
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
    final yellow = mode == ServiceMode.cityrun;
    return CrCard(
      onTap: onTap,
      padding: EdgeInsets.all(compact ? 12 : 16),
      child: Row(
        children: [
          Container(
            width: compact ? 40 : 48,
            height: compact ? 40 : 48,
            decoration: BoxDecoration(
              color: yellow ? const Color(0x33FACC15) : const Color(0x263478F6),
              borderRadius: BorderRadius.circular(14),
              border: selected
                  ? Border.all(color: yellow ? CrColors.yellow : CrColors.accentSoft)
                  : null,
            ),
            child: Icon(
              _icon,
              color: yellow ? CrColors.yellow : CrColors.accentSoft,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(mode.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(
                  mode.priceHint,
                  style: const TextStyle(
                    color: CrColors.yellow,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (!compact) ...[
                  const SizedBox(height: 4),
                  Text(
                    mode.explanation,
                    style: const TextStyle(color: CrColors.textMuted, fontSize: 12, height: 1.35),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

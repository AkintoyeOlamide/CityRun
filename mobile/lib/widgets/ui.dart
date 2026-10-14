import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'package:cityrun_app/theme.dart';

class MeshBackground extends StatelessWidget {
  const MeshBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(-0.6, -0.85),
          radius: 1.15,
          colors: [Color(0x332563D4), Color(0x00070D1A)],
        ),
      ),
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0.9, -0.2),
            radius: 0.9,
            colors: [Color(0x1AFACC15), Color(0x00070D1A)],
          ),
        ),
        child: child,
      ),
    );
  }
}

class CityRunLogo extends StatelessWidget {
  const CityRunLogo({super.key, this.size = 96, this.dark = true});

  final double size;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SvgPicture.asset(
          'assets/logo.svg',
          width: size,
          height: size,
        ),
        const SizedBox(height: 10),
        Text(
          'CITY RUN',
          style: TextStyle(
            fontSize: size * 0.22,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.6,
            color: dark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }
}

class CrCard extends StatelessWidget {
  const CrCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: const Color(0x0DFFFFFF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: CrColors.border),
      ),
      child: child,
    );
    if (onTap == null) return content;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: content,
      ),
    );
  }
}

class CrErrorBanner extends StatelessWidget {
  const CrErrorBanner(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0x26F87171),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x4DF87171)),
      ),
      child: Text(message, style: const TextStyle(color: CrColors.danger, fontSize: 13)),
    );
  }
}

class CrSuccessBanner extends StatelessWidget {
  const CrSuccessBanner(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0x2634D399),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(message, style: const TextStyle(color: CrColors.success, fontSize: 13)),
    );
  }
}

class StatusPill extends StatelessWidget {
  const StatusPill(this.label, {super.key, this.tone = StatusTone.accent});

  final String label;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = switch (tone) {
      StatusTone.yellow => (const Color(0x33FACC15), CrColors.yellow),
      StatusTone.danger => (const Color(0x26F87171), CrColors.danger),
      StatusTone.success => (const Color(0x2634D399), CrColors.success),
      StatusTone.accent => (const Color(0x263478F6), CrColors.accentSoft),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colors.$1,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: colors.$2,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

enum StatusTone { accent, yellow, danger, success }

StatusTone toneForStatus(String status) {
  return switch (status) {
    'delivered' => StatusTone.success,
    'cancelled' => StatusTone.danger,
    'arrived_at_dropoff' => StatusTone.yellow,
    _ => StatusTone.accent,
  };
}

class RouteLine extends StatelessWidget {
  const RouteLine({
    super.key,
    required this.label,
    required this.address,
    this.icon = Icons.place_outlined,
  });

  final String label;
  final String address;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: const Color(0x14FFFFFF),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: CrColors.accentSoft),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: const TextStyle(
                  color: CrColors.textMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 2),
              Text(address, style: const TextStyle(fontSize: 14, height: 1.3)),
            ],
          ),
        ),
      ],
    );
  }
}

class CrFieldLabel extends StatelessWidget {
  const CrFieldLabel(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: Color(0xCCFFFFFF),
        ),
      ),
    );
  }
}

class BusyButton extends StatelessWidget {
  const BusyButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
    this.outlined = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final child = busy
        ? const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
          )
        : Text(label);
    if (outlined) {
      return OutlinedButton(onPressed: busy ? null : onPressed, child: child);
    }
    return FilledButton(onPressed: busy ? null : onPressed, child: child);
  }
}

class AvatarCircle extends StatelessWidget {
  const AvatarCircle({super.key, required this.initials, this.size = 40});

  final String initials;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [CrColors.accent, CrColors.yellowDark],
        ),
      ),
      child: Text(
        initials,
        style: TextStyle(
          fontWeight: FontWeight.w800,
          fontSize: size * 0.32,
          color: Colors.white,
        ),
      ),
    );
  }
}

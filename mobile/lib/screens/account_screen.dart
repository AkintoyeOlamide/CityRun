import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/config.dart';
import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/screens/auth_screen.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';
import 'package:cityrun_app/utils/format.dart';
import 'package:cityrun_app/utils/maps.dart';
import 'package:cityrun_app/widgets/paystack_sheet.dart';
import 'package:cityrun_app/widgets/ui.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  WalletOverview? _wallet;
  bool _loadingWallet = false;
  String? _walletError;
  String? _walletMessage;
  int _topup = AppConfig.tripPriceNaira;
  bool _busy = false;
  bool _editing = false;
  final _name = TextEditingController();
  final _phone = TextEditingController();

  @override
  void initState() {
    super.initState();
    final profile = context.read<SessionController>().profile;
    _name.text = profile?.fullName ?? '';
    _phone.text = profile?.phone ?? '';
    _loadWallet();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _loadWallet() async {
    final session = context.read<SessionController>();
    if (!session.isCustomer) return;
    setState(() {
      _loadingWallet = _wallet == null;
      _walletError = null;
    });
    try {
      final wallet = await session.api.wallet();
      if (!mounted) return;
      setState(() {
        _wallet = wallet;
        _loadingWallet = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingWallet = false;
        _walletError = e.toString();
      });
    }
  }

  Future<void> _topUp() async {
    setState(() {
      _busy = true;
      _walletError = null;
      _walletMessage = null;
    });
    try {
      final session = context.read<SessionController>();
      final started = await session.api.startWalletTopup(_topup);
      if (!mounted) return;
      final reference = await openPaystackCheckout(context, started.url);
      if (reference == null || !mounted) return;
      await session.api.verifyWalletTopup(reference);
      await _loadWallet();
      setState(() => _walletMessage = 'Wallet funded successfully.');
    } catch (e) {
      setState(() => _walletError = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _busy = true);
    final session = context.read<SessionController>();
    try {
      await session.api.updateProfile({
        'fullName': _name.text.trim(),
        'phone': _phone.text.trim(),
      });
      await session.refreshProfile();
      if (!mounted) return;
      setState(() => _editing = false);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionController>();
    if (!session.isCustomer) {
      return MeshBackground(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
          children: [
            const CityRunLogo(size: 88),
            const SizedBox(height: 16),
            const Text(
              'Sign in to track trips, pay from your wallet, and save your details.',
              textAlign: TextAlign.center,
              style: TextStyle(color: CrColors.textMuted, height: 1.4),
            ),
            const SizedBox(height: 24),
            BusyButton(
              label: 'Sign in',
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
              },
            ),
            const SizedBox(height: 10),
            BusyButton(
              label: 'Create account',
              outlined: true,
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const AuthScreen(initialMode: AuthMode.signup),
                  ),
                );
              },
            ),
          ],
        ),
      );
    }

    final profile = session.profile!;
    final balance = _wallet?.wallet.balanceKobo ?? 0;

    return MeshBackground(
      child: RefreshIndicator(
        color: CrColors.accent,
        onRefresh: () async {
          await session.refreshProfile();
          await _loadWallet();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            Row(
              children: [
                AvatarCircle(initials: initialsFor(profile.displayName), size: 52),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(profile.displayName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                      Text(profile.email, style: const TextStyle(color: CrColors.textMuted, fontSize: 12)),
                      const SizedBox(height: 4),
                      StatusPill(profile.accountType, tone: StatusTone.accent),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            CrCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Wallet', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 8),
                  if (_loadingWallet)
                    const LinearProgressIndicator(minHeight: 2)
                  else ...[
                    Text(
                      formatNairaFromKobo(balance),
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: CrColors.yellow),
                    ),
                    Text(
                      '${tripsFromKobo(balance)} trip${tripsFromKobo(balance) == 1 ? '' : 's'} available',
                      style: const TextStyle(color: CrColors.textMuted),
                    ),
                  ],
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final amount in AppConfig.topupPresets)
                        ChoiceChip(
                          label: Text(formatNaira(amount)),
                          selected: _topup == amount,
                          onSelected: (_) => setState(() => _topup = amount),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  BusyButton(
                    label: 'Fund ${formatNaira(_topup)} with Paystack',
                    onPressed: _topUp,
                    busy: _busy,
                  ),
                  if (_walletError != null) ...[
                    const SizedBox(height: 10),
                    CrErrorBanner(_walletError!),
                  ],
                  if (_walletMessage != null) ...[
                    const SizedBox(height: 10),
                    CrSuccessBanner(_walletMessage!),
                  ],
                  const SizedBox(height: 16),
                  const Text('Or transfer to', style: TextStyle(color: CrColors.textMuted, fontSize: 12)),
                  const SizedBox(height: 6),
                  Text(AppConfig.bankName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(AppConfig.bankAccountName, style: const TextStyle(fontSize: 12, color: CrColors.textMuted)),
                  Row(
                    children: [
                      Text(AppConfig.bankAccountNumber, style: const TextStyle(fontWeight: FontWeight.w700)),
                      IconButton(
                        onPressed: () {
                          Clipboard.setData(const ClipboardData(text: AppConfig.bankAccountNumber));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Account number copied')),
                          );
                        },
                        icon: const Icon(Icons.copy, size: 16),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if ((_wallet?.transactions.isNotEmpty ?? false)) ...[
              const SizedBox(height: 12),
              CrCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Recent activity', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    for (final tx in _wallet!.transactions.take(8))
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(tx.description, style: const TextStyle(fontSize: 13)),
                                  Text(formatWhen(tx.createdAt), style: const TextStyle(color: CrColors.textMuted, fontSize: 11)),
                                ],
                              ),
                            ),
                            Text(
                              '${tx.type == 'debit' ? '-' : '+'}${formatNairaFromKobo(tx.amountKobo.abs())}',
                              style: TextStyle(
                                color: tx.type == 'debit' ? Colors.white : CrColors.success,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            CrCard(
              child: _editing
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const CrFieldLabel('Full name'),
                        TextField(controller: _name),
                        const SizedBox(height: 12),
                        const CrFieldLabel('Phone'),
                        TextField(controller: _phone, keyboardType: TextInputType.phone),
                        const SizedBox(height: 12),
                        BusyButton(label: 'Save', onPressed: _saveProfile, busy: _busy),
                        TextButton(onPressed: () => setState(() => _editing = false), child: const Text('Cancel')),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Expanded(child: Text('Profile', style: TextStyle(fontWeight: FontWeight.w700))),
                            TextButton(
                              onPressed: () => setState(() => _editing = true),
                              child: const Text('Edit'),
                            ),
                          ],
                        ),
                        Text(profile.fullName),
                        Text(profile.phone, style: const TextStyle(color: CrColors.textMuted)),
                        if (profile.businessName != null) ...[
                          const SizedBox(height: 8),
                          Text(profile.businessName!, style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                        if (profile.businessAddress != null) ...[
                          const SizedBox(height: 8),
                          Text(profile.businessAddress!.formatted, style: const TextStyle(color: CrColors.textMuted, fontSize: 13)),
                        ],
                      ],
                    ),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () => session.signOut(),
              icon: const Icon(Icons.logout),
              label: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }
}

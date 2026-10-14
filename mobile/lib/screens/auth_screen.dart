import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';
import 'package:cityrun_app/widgets/address_field.dart';
import 'package:cityrun_app/widgets/ui.dart';

enum AuthMode { signin, signup, forgot }

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, this.initialMode = AuthMode.signin});

  final AuthMode initialMode;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  late AuthMode _mode;
  var _role = 'customer';
  var _accountType = 'individual';
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _username = TextEditingController();
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  final _businessName = TextEditingController();
  final _natureOfGoods = TextEditingController();
  AddressValue _businessAddress = AddressValue.empty;
  String? _message;
  String? _error;
  bool _busy = false;
  bool _obscure = true;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _username.dispose();
    _fullName.dispose();
    _phone.dispose();
    _businessName.dispose();
    _natureOfGoods.dispose();
    super.dispose();
  }

  void _switch(AuthMode mode) {
    setState(() {
      _mode = mode;
      if (mode == AuthMode.signup || mode == AuthMode.forgot) {
        _role = 'customer';
      }
      _error = null;
      _message = null;
    });
  }

  Future<void> _submit() async {
    final session = context.read<SessionController>();
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      if (_mode == AuthMode.forgot) {
        final msg = await session.forgotPassword(_email.text.trim());
        setState(() => _message = msg);
        return;
      }
      if (_mode == AuthMode.signup) {
        if (_fullName.text.trim().isEmpty || _phone.text.trim().isEmpty) {
          throw ApiException('Name and phone are required.');
        }
        if (_accountType == 'business') {
          if (_businessName.text.trim().isEmpty) {
            throw ApiException('Business name is required.');
          }
          if (_natureOfGoods.text.trim().isEmpty) {
            throw ApiException('Nature of goods is required.');
          }
          if (!_businessAddress.isValid) {
            throw ApiException('Business address is required.');
          }
        }
        await session.signUpCustomer(
          email: _email.text.trim(),
          password: _password.text,
          fullName: _fullName.text.trim(),
          phone: _phone.text.trim(),
          accountType: _accountType,
          businessName: _businessName.text.trim(),
          natureOfGoods: _natureOfGoods.text.trim(),
          businessAddress: _accountType == 'business' ? _businessAddress : null,
        );
      } else if (_role == 'rider') {
        await session.signInRider(_username.text.trim(), _password.text);
      } else {
        await session.signInCustomer(_email.text.trim(), _password.text);
      }
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(switch (_mode) {
          AuthMode.signin => 'Sign in',
          AuthMode.signup => 'Create account',
          AuthMode.forgot => 'Reset password',
        }),
      ),
      body: MeshBackground(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            if (_mode == AuthMode.signin) ...[
              const Text(
                'Sign in as',
                style: TextStyle(color: CrColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'customer', label: Text('Customer'), icon: Icon(Icons.person_outline)),
                  ButtonSegment(value: 'rider', label: Text('Rider'), icon: Icon(Icons.pedal_bike)),
                ],
                selected: {_role},
                onSelectionChanged: (value) => setState(() {
                  _role = value.first;
                  _error = null;
                  _message = null;
                }),
              ),
              const SizedBox(height: 20),
            ],
            if (_mode == AuthMode.signup) ...[
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'individual', label: Text('Individual'), icon: Icon(Icons.person_outline)),
                  ButtonSegment(value: 'business', label: Text('Business'), icon: Icon(Icons.storefront_outlined)),
                ],
                selected: {_accountType},
                onSelectionChanged: (value) => setState(() => _accountType = value.first),
              ),
              const SizedBox(height: 20),
              const CrFieldLabel('Full name'),
              TextField(
                controller: _fullName,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(hintText: 'Your name'),
              ),
              const SizedBox(height: 14),
              const CrFieldLabel('Phone'),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(hintText: '0803…'),
              ),
              if (_accountType == 'business') ...[
                const SizedBox(height: 14),
                const CrFieldLabel('Business name'),
                TextField(
                  controller: _businessName,
                  decoration: const InputDecoration(hintText: 'Registered business name'),
                ),
                const SizedBox(height: 14),
                const CrFieldLabel('Nature of goods'),
                TextField(
                  controller: _natureOfGoods,
                  decoration: const InputDecoration(hintText: 'What do you send?'),
                ),
                const SizedBox(height: 14),
                AddressField(
                  label: 'Business address',
                  placeholder: 'Where should riders pick up from?',
                  value: _businessAddress,
                  onChanged: (value) => setState(() => _businessAddress = value),
                ),
              ],
              const SizedBox(height: 14),
            ],
            if (_mode != AuthMode.signin || _role == 'customer') ...[
              const CrFieldLabel('Email'),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(hintText: 'you@email.com'),
              ),
              const SizedBox(height: 14),
            ],
            if (_mode == AuthMode.signin && _role == 'rider') ...[
              const CrFieldLabel('Username'),
              TextField(
                controller: _username,
                autofillHints: const [AutofillHints.username],
                decoration: const InputDecoration(hintText: 'Your rider username'),
              ),
              const SizedBox(height: 14),
            ],
            if (_mode != AuthMode.forgot) ...[
              const CrFieldLabel('Password'),
              TextField(
                controller: _password,
                obscureText: _obscure,
                autofillHints: _mode == AuthMode.signup
                    ? const [AutofillHints.newPassword]
                    : const [AutofillHints.password],
                decoration: InputDecoration(
                  hintText: 'Password',
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 16),
              CrErrorBanner(_error!),
            ],
            if (_message != null) ...[
              const SizedBox(height: 16),
              CrSuccessBanner(_message!),
            ],
            const SizedBox(height: 20),
            BusyButton(
              label: switch (_mode) {
                AuthMode.signin => _role == 'rider' ? 'Sign in as rider' : 'Sign in',
                AuthMode.signup => 'Create account',
                AuthMode.forgot => 'Send reset link',
              },
              busy: _busy,
              onPressed: _submit,
            ),
            const SizedBox(height: 16),
            if (_mode == AuthMode.signin && _role == 'customer') ...[
              TextButton(
                onPressed: () => _switch(AuthMode.forgot),
                child: const Text('Forgot password?'),
              ),
              TextButton(
                onPressed: () => _switch(AuthMode.signup),
                child: const Text('Need an account? Create one'),
              ),
            ],
            if (_mode == AuthMode.signup)
              TextButton(
                onPressed: () => _switch(AuthMode.signin),
                child: const Text('Already have an account? Sign in'),
              ),
            if (_mode == AuthMode.forgot)
              TextButton(
                onPressed: () => _switch(AuthMode.signin),
                child: const Text('Back to sign in'),
              ),
          ],
        ),
      ),
    );
  }
}

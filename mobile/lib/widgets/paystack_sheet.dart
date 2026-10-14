import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'package:cityrun_app/theme.dart';

Future<String?> openPaystackCheckout(BuildContext context, String url) {
  return Navigator.of(context).push<String>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => PaystackSheet(url: url),
    ),
  );
}

class PaystackSheet extends StatefulWidget {
  const PaystackSheet({super.key, required this.url});

  final String url;

  @override
  State<PaystackSheet> createState() => _PaystackSheetState();
}

class _PaystackSheetState extends State<PaystackSheet> {
  late final WebViewController _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(CrColors.background)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onNavigationRequest: (request) {
            final ref = _extractReference(request.url);
            if (ref != null) {
              Navigator.of(context).pop(ref);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
          onUrlChange: (change) {
            final url = change.url;
            if (url == null) return;
            final ref = _extractReference(url);
            if (ref != null && mounted) {
              Navigator.of(context).pop(ref);
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
  }

  String? _extractReference(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return null;
    final params = uri.queryParameters;
    final isVerify =
        params['payment'] == 'verify' || params['wallet'] == 'verify';
    if (!isVerify) return null;
    final ref = params['ref'] ?? params['reference'] ?? params['trxref'];
    if (ref == null || ref.trim().isEmpty) return null;
    return ref.trim();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pay with Paystack'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading)
            const LinearProgressIndicator(
              minHeight: 2,
              color: CrColors.accent,
              backgroundColor: Colors.transparent,
            ),
        ],
      ),
    );
  }
}

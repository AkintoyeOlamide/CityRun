import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:cityrun_app/config.dart';
import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/screens/order_screen.dart';
import 'package:cityrun_app/state/orders_controller.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';
import 'package:cityrun_app/utils/format.dart';
import 'package:cityrun_app/widgets/address_field.dart';
import 'package:cityrun_app/widgets/service_mode_picker.dart';
import 'package:cityrun_app/widgets/ui.dart';

enum _Step { addresses, confirm, details }

class RequestScreen extends StatefulWidget {
  const RequestScreen({super.key, required this.kind, this.embedded = false});

  final DeliveryKind kind;
  final bool embedded;

  @override
  State<RequestScreen> createState() => _RequestScreenState();
}

class _RequestScreenState extends State<RequestScreen> {
  _Step _step = _Step.addresses;
  AddressValue _pickup = AddressValue.empty;
  AddressValue _dropoff = AddressValue.empty;
  final _item = TextEditingController();
  var _size = 'medium';
  final _notes = TextEditingController();
  final _contactName = TextEditingController();
  final _contactPhone = TextEditingController();
  String? _clientId;
  bool _busy = false;
  String? _error;
  int _fareKobo = AppConfig.tripPriceKobo;
  double? _distanceKm;
  bool _quoteLoading = false;

  DeliveryKind get kind => widget.kind;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _prefill());
  }

  @override
  void dispose() {
    _item.dispose();
    _notes.dispose();
    _contactName.dispose();
    _contactPhone.dispose();
    super.dispose();
  }

  void _prefill() {
    final profile = context.read<SessionController>().profile;
    if (profile == null) return;
    final business = profile.businessAddress;
    if (profile.isBusiness && business != null && business.formatted.isNotEmpty) {
      if (kind == DeliveryKind.send || kind == DeliveryKind.storePickup) {
        setState(() => _pickup = business);
      }
      if (kind == DeliveryKind.receive) {
        setState(() => _dropoff = business);
      }
    }
    if (!profile.isBusiness) {
      _contactName.text = profile.fullName;
      _contactPhone.text = profile.phone;
    }
  }

  bool get _pickupLocked {
    final profile = context.read<SessionController>().profile;
    return profile?.isBusiness == true &&
        kind == DeliveryKind.send &&
        (profile?.businessAddress?.formatted.isNotEmpty ?? false);
  }

  bool get _dropoffLocked {
    final profile = context.read<SessionController>().profile;
    return profile?.isBusiness == true &&
        kind == DeliveryKind.receive &&
        (profile?.businessAddress?.formatted.isNotEmpty ?? false);
  }

  bool get _isBusinessSend {
    final profile = context.read<SessionController>().profile;
    return profile?.isBusiness == true && kind == DeliveryKind.send;
  }

  bool get _canContinueAddresses {
    if (_isBusinessSend) {
      return _pickup.isValid && _dropoff.isValid && _contactPhone.text.trim().length >= 10;
    }
    return _pickup.isValid && _dropoff.isValid;
  }

  bool get _canSubmit {
    if (_isBusinessSend) return _canContinueAddresses;
    return _item.text.trim().isNotEmpty &&
        _contactName.text.trim().isNotEmpty &&
        _contactPhone.text.trim().length >= 10;
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = context.read<SessionController>();
      final orders = context.read<OrdersController>();
      final profile = session.profile;
      final created = await session.api.createOrder(
        kind: kind,
        pickup: _pickup,
        dropoff: _dropoff,
        itemDescription: _isBusinessSend ? 'Business delivery' : _item.text.trim(),
        itemSize: _isBusinessSend ? 'medium' : _size,
        notes: _isBusinessSend ? '' : _notes.text.trim(),
        contactName: _isBusinessSend
            ? (_contactName.text.trim().isNotEmpty
                ? _contactName.text.trim()
                : (profile?.businessName ?? profile?.fullName ?? 'Recipient'))
            : _contactName.text.trim(),
        contactPhone: _contactPhone.text.trim(),
        serviceMode: session.serviceMode?.apiValue,
      );
      if (!session.isCustomer) {
        await orders.rememberGuestOrder(created.id);
      }
      await orders.refresh();
      if (!mounted) return;
      final route = MaterialPageRoute(builder: (_) => OrderScreen(orderId: created.id));
      if (widget.embedded) {
        await Navigator.push(context, route);
      } else {
        await Navigator.pushReplacement(context, route);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<SessionController>().profile;
    final clients = profile?.savedClients ?? [];
    final body = MeshBackground(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          if (_step == _Step.addresses) ..._addressStep(clients),
          if (_step == _Step.confirm) ..._confirmStep(),
          if (_step == _Step.details) ..._detailsStep(),
          if (_error != null) ...[
            const SizedBox(height: 12),
            CrErrorBanner(_error!),
          ],
        ],
      ),
    );

    if (widget.embedded) return body;

    return Scaffold(
      appBar: AppBar(
        title: Text(kind.title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_step == _Step.addresses) {
              Navigator.pop(context);
            } else if (_step == _Step.details) {
              setState(() => _step = _Step.confirm);
            } else {
              setState(() => _step = _Step.addresses);
            }
          },
        ),
      ),
      body: body,
    );
  }

  Future<void> _refreshQuote() async {
    if (!_pickup.isValid || !_dropoff.isValid) return;
    setState(() => _quoteLoading = true);
    try {
      final session = context.read<SessionController>();
      final quote = await session.api.quoteFare(
        pickup: _pickup,
        dropoff: _dropoff,
        serviceMode: session.serviceMode?.apiValue,
      );
      if (!mounted) return;
      setState(() {
        _fareKobo = quote.fareKobo;
        _distanceKm = quote.distanceKm;
        _quoteLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _quoteLoading = false);
    }
  }

  List<Widget> _addressStep(List<SavedClient> clients) {
    return [
      const ServiceModePicker(compact: true),
      const SizedBox(height: 16),
      AddressField(
        label: kind.pickupLabel,
        placeholder: kind.pickupPlaceholder,
        value: _pickup,
        onChanged: (value) => setState(() => _pickup = value),
        locked: _pickupLocked,
        showCurrentLocation: kind == DeliveryKind.send && !_pickupLocked,
      ),
      const SizedBox(height: 16),
      AddressField(
        label: kind.dropoffLabel,
        placeholder: kind.dropoffPlaceholder,
        value: _dropoff,
        onChanged: (value) {
          setState(() {
            _dropoff = value;
            _clientId = null;
          });
        },
        locked: _dropoffLocked,
      ),
      if (_isBusinessSend) ...[
        if (clients.isNotEmpty) ...[
          const SizedBox(height: 16),
          const CrFieldLabel('Saved clients'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final client in clients)
                ChoiceChip(
                  label: Text(client.label),
                  selected: _clientId == client.id,
                  onSelected: (_) {
                    setState(() {
                      _clientId = client.id;
                      _dropoff = client.address;
                      _contactPhone.text = client.contactPhone;
                      _contactName.text = client.contactName;
                    });
                  },
                ),
            ],
          ),
        ],
        const SizedBox(height: 16),
        const CrFieldLabel('Recipient phone'),
        TextField(
          controller: _contactPhone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(hintText: 'Customer phone number'),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 12),
        const CrFieldLabel('Recipient name (optional)'),
        TextField(
          controller: _contactName,
          decoration: const InputDecoration(hintText: 'Who is receiving?'),
        ),
      ],
      const SizedBox(height: 24),
      BusyButton(
        label: _isBusinessSend
            ? 'Request delivery · ${formatNairaFromKobo(_fareKobo)}'
            : 'Continue',
        onPressed: _canContinueAddresses
            ? () {
                if (_isBusinessSend) {
                  _submit();
                } else {
                  _refreshQuote();
                  setState(() => _step = _Step.confirm);
                }
              }
            : null,
        busy: _busy,
      ),
    ];
  }

  List<Widget> _confirmStep() {
    return [
      if (widget.embedded)
        TextButton.icon(
          onPressed: () => setState(() => _step = _Step.addresses),
          icon: const Icon(Icons.arrow_back, size: 16),
          label: const Text('Back'),
        ),
      CrCard(
        child: Column(
          children: [
            RouteLine(label: kind.pickupLabel, address: _pickup.formatted, icon: Icons.north_east),
            const SizedBox(height: 12),
            RouteLine(label: kind.dropoffLabel, address: _dropoff.formatted, icon: Icons.south_east),
          ],
        ),
      ),
      const SizedBox(height: 16),
      CrCard(
        child: Row(
          children: [
            const Icon(Icons.payments_outlined, color: CrColors.yellow),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                _quoteLoading
                    ? 'Calculating fare…'
                    : context.watch<SessionController>().serviceMode == ServiceMode.cityrunPlus
                        ? '${formatNairaFromKobo(_fareKobo)}${_distanceKm == null ? '' : ' · ${_distanceKm!.toStringAsFixed(1)} km'}'
                        : 'Flat fare ${formatNaira(AppConfig.tripPriceNaira)}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 24),
      BusyButton(
        label: 'Confirm route',
        onPressed: () => setState(() => _step = _Step.details),
      ),
    ];
  }

  List<Widget> _detailsStep() {
    return [
      if (widget.embedded)
        TextButton.icon(
          onPressed: () => setState(() => _step = _Step.confirm),
          icon: const Icon(Icons.arrow_back, size: 16),
          label: const Text('Back'),
        ),
      const CrFieldLabel('What are we delivering?'),
      TextField(
        controller: _item,
        decoration: const InputDecoration(hintText: 'Documents, food, parcel…'),
        onChanged: (_) => setState(() {}),
      ),
      const SizedBox(height: 16),
      const CrFieldLabel('Size'),
      SegmentedButton<String>(
        segments: const [
          ButtonSegment(value: 'small', label: Text('Small')),
          ButtonSegment(value: 'medium', label: Text('Medium')),
          ButtonSegment(value: 'large', label: Text('Large')),
        ],
        selected: {_size},
        onSelectionChanged: (value) => setState(() => _size = value.first),
      ),
      const SizedBox(height: 16),
      const CrFieldLabel('Contact name'),
      TextField(
        controller: _contactName,
        decoration: const InputDecoration(hintText: 'Who should the rider call?'),
        onChanged: (_) => setState(() {}),
      ),
      const SizedBox(height: 16),
      const CrFieldLabel('Contact phone'),
      TextField(
        controller: _contactPhone,
        keyboardType: TextInputType.phone,
        decoration: const InputDecoration(hintText: '0803…'),
        onChanged: (_) => setState(() {}),
      ),
      const SizedBox(height: 16),
      const CrFieldLabel('Notes (optional)'),
      TextField(
        controller: _notes,
        maxLines: 3,
        decoration: const InputDecoration(hintText: 'Gate code, extra instructions…'),
      ),
      const SizedBox(height: 24),
      BusyButton(
        label: 'Request delivery · ${formatNairaFromKobo(_fareKobo)}',
        onPressed: _canSubmit ? _submit : null,
        busy: _busy,
      ),
    ];
  }
}

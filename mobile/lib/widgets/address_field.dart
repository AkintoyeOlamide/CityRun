import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import 'package:cityrun_app/models/models.dart';
import 'package:cityrun_app/state/session_controller.dart';
import 'package:cityrun_app/theme.dart';
import 'package:cityrun_app/widgets/ui.dart';
import 'package:provider/provider.dart';

class AddressField extends StatefulWidget {
  const AddressField({
    super.key,
    required this.label,
    required this.placeholder,
    required this.value,
    required this.onChanged,
    this.locked = false,
    this.showCurrentLocation = false,
  });

  final String label;
  final String placeholder;
  final AddressValue value;
  final ValueChanged<AddressValue> onChanged;
  final bool locked;
  final bool showCurrentLocation;

  @override
  State<AddressField> createState() => _AddressFieldState();
}

class _AddressFieldState extends State<AddressField> {
  late final TextEditingController _controller;
  Timer? _debounce;
  List<PlacePrediction> _predictions = [];
  bool _searching = false;
  bool _searched = false;
  bool _locating = false;
  String? _error;
  bool _picking = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value.formatted);
  }

  @override
  void didUpdateWidget(covariant AddressField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_picking && widget.value.formatted != _controller.text) {
      _controller.text = widget.value.formatted;
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onTyped(String text) {
    widget.onChanged(AddressValue(formatted: text));
    _debounce?.cancel();
    if (text.trim().length < 3) {
      setState(() {
        _predictions = [];
        _searched = false;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 350), () => _search(text));
  }

  int _searchSeq = 0;

  Future<void> _search(String input) async {
    final seq = ++_searchSeq;
    setState(() {
      _searching = true;
      _error = null;
    });
    try {
      final api = context.read<SessionController>().api;
      var results = await api.autocomplete(input);
      if (results.isEmpty) {
        results = await api.autocomplete(input);
      }
      if (!mounted || seq != _searchSeq) return;
      setState(() {
        _predictions = results;
        _searching = false;
        _searched = true;
      });
    } catch (e) {
      if (!mounted || seq != _searchSeq) return;
      try {
        final retry = await context.read<SessionController>().api.autocomplete(input);
        if (!mounted || seq != _searchSeq) return;
        setState(() {
          _predictions = retry;
          _searching = false;
          _searched = true;
          _error = retry.isEmpty
              ? 'No addresses found — try a street name or landmark'
              : null;
        });
      } catch (_) {
        if (!mounted || seq != _searchSeq) return;
        setState(() {
          _searching = false;
          _predictions = [];
          _error =
              'Could not search addresses. Check your connection and try again.';
        });
      }
    }
  }

  Future<void> _select(PlacePrediction prediction) async {
    _picking = true;
    final fallback = AddressValue(
      formatted: prediction.description,
      placeId: prediction.placeId,
      lat: prediction.lat,
      lng: prediction.lng,
    );
    try {
      if (prediction.lat != null && prediction.lng != null) {
        if (!mounted) return;
        _controller.text = prediction.description;
        widget.onChanged(fallback);
        setState(() {
          _predictions = [];
          _error = null;
        });
        return;
      }
      final api = context.read<SessionController>().api;
      final details = await api.placeDetails(prediction);
      if (!mounted) return;
      _controller.text = details.formatted;
      widget.onChanged(details);
      setState(() {
        _predictions = [];
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      widget.onChanged(fallback);
      _controller.text = prediction.description;
      setState(() {
        _predictions = [];
        _error = fallback.formatted.trim().isEmpty
            ? 'That address could not be confirmed. Try another nearby street or landmark.'
            : null;
      });
    } finally {
      _picking = false;
    }
  }

  Future<void> _useCurrentLocation() async {
    setState(() {
      _locating = true;
      _error = null;
    });
    try {
      final api = context.read<SessionController>().api;
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        throw ApiException('Turn on location services to use your current address.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw ApiException('Location permission is required.');
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      final address = await api.reverseGeocode(position.latitude, position.longitude);
      if (!mounted) return;
      _controller.text = address.formatted;
      widget.onChanged(address);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CrFieldLabel(widget.label),
        TextField(
          controller: _controller,
          enabled: !widget.locked,
          onChanged: _onTyped,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: widget.placeholder,
            suffixIcon: _searching
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : const Icon(Icons.search, color: CrColors.textMuted),
          ),
        ),
        if (widget.showCurrentLocation && !widget.locked) ...[
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: _locating ? null : _useCurrentLocation,
            icon: _locating
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.my_location, size: 16),
            label: Text(_locating ? 'Finding you…' : 'Use current location'),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          CrErrorBanner(_error!),
        ],
        if (_searched && !_searching && _predictions.isEmpty && _controller.text.trim().length >= 3) ...[
          const SizedBox(height: 8),
          const Text(
            'No addresses found — try a street name or landmark',
            style: TextStyle(color: CrColors.textMuted, fontSize: 12),
          ),
        ],
        if (_predictions.isNotEmpty) ...[
          const SizedBox(height: 8),
          CrCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < _predictions.length; i++) ...[
                  if (i > 0) const Divider(height: 1, color: CrColors.border),
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.place_outlined, color: CrColors.accentSoft),
                    title: Text(
                      _predictions[i].description,
                      style: const TextStyle(fontSize: 13),
                    ),
                    onTap: () => _select(_predictions[i]),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

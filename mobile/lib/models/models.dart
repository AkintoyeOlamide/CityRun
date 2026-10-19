import 'package:cityrun_app/utils/format.dart';

class AddressValue {
  const AddressValue({
    required this.formatted,
    this.placeId,
    this.lat,
    this.lng,
  });

  final String formatted;
  final String? placeId;
  final double? lat;
  final double? lng;

  bool get isValid => formatted.trim().length > 5;
  bool get canNavigate =>
      (lat != null && lng != null) || formatted.trim().isNotEmpty;

  AddressValue copyWith({
    String? formatted,
    String? placeId,
    double? lat,
    double? lng,
  }) {
    return AddressValue(
      formatted: formatted ?? this.formatted,
      placeId: placeId ?? this.placeId,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
    );
  }

  Map<String, dynamic> toJson() => {
        'formatted': formatted,
        if (placeId != null) 'placeId': placeId,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
      };

  factory AddressValue.fromJson(dynamic json) {
    if (json is! Map) return const AddressValue(formatted: '');
    return AddressValue(
      formatted: asString(json['formatted']),
      placeId: json['placeId']?.toString(),
      lat: asDouble(json['lat']),
      lng: asDouble(json['lng']),
    );
  }

  static const empty = AddressValue(formatted: '');
}

class PlacePrediction {
  const PlacePrediction({
    required this.description,
    required this.placeId,
    this.lat,
    this.lng,
  });

  final String description;
  final String placeId;
  final double? lat;
  final double? lng;

  factory PlacePrediction.fromJson(Map<String, dynamic> json) {
    return PlacePrediction(
      description: asString(json['description']),
      placeId: asString(json['placeId']),
      lat: asDouble(json['lat']),
      lng: asDouble(json['lng']),
    );
  }
}

class SavedClient {
  const SavedClient({
    required this.id,
    required this.label,
    required this.contactName,
    required this.contactPhone,
    required this.address,
  });

  final String id;
  final String label;
  final String contactName;
  final String contactPhone;
  final AddressValue address;

  factory SavedClient.fromJson(Map<String, dynamic> json) {
    return SavedClient(
      id: asString(json['id']),
      label: asString(json['label']),
      contactName: asString(json['contactName']),
      contactPhone: asString(json['contactPhone']),
      address: AddressValue.fromJson(json['address']),
    );
  }
}

class UserProfile {
  const UserProfile({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.email,
    required this.accountType,
    this.businessName,
    this.natureOfGoods,
    this.businessAddress,
    this.savedClients = const [],
  });

  final String id;
  final String fullName;
  final String phone;
  final String email;
  final String accountType;
  final String? businessName;
  final String? natureOfGoods;
  final AddressValue? businessAddress;
  final List<SavedClient> savedClients;

  bool get isBusiness => accountType == 'business';
  bool get isVendor => accountType == 'vendor';
  bool get isBusinessLike => isBusiness || isVendor;

  String get displayName {
    final business = businessName?.trim();
    if (business != null && business.isNotEmpty) return business;
    if (fullName.trim().isNotEmpty) return fullName.trim();
    return email;
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: asString(json['id']),
      fullName: asString(json['fullName']),
      phone: asString(json['phone']),
      email: asString(json['email']),
      accountType: asString(json['accountType'], 'individual'),
      businessName: json['businessName']?.toString(),
      natureOfGoods: json['natureOfGoods']?.toString(),
      businessAddress: json['businessAddress'] == null
          ? null
          : AddressValue.fromJson(json['businessAddress']),
      savedClients: (json['savedClients'] as List? ?? [])
          .whereType<Map>()
          .map((item) => SavedClient.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
    );
  }
}

class RiderPublic {
  const RiderPublic({
    required this.id,
    required this.username,
    required this.fullName,
    required this.phone,
    required this.active,
    required this.createdAt,
  });

  final String id;
  final String username;
  final String fullName;
  final String phone;
  final bool active;
  final String createdAt;

  factory RiderPublic.fromJson(Map<String, dynamic> json) {
    return RiderPublic(
      id: asString(json['id']),
      username: asString(json['username']),
      fullName: asString(json['fullName']),
      phone: asString(json['phone']),
      active: asBool(json['active']),
      createdAt: asString(json['createdAt']),
    );
  }
}

enum DeliveryKind { send, receive, storePickup }

enum ServiceMode { cityrun, cityrunPlus }

extension ServiceModeX on ServiceMode {
  String get apiValue => switch (this) {
        ServiceMode.cityrun => 'cityrun',
        ServiceMode.cityrunPlus => 'cityrun-plus',
      };

  String get title => switch (this) {
        ServiceMode.cityrun => 'City Run',
        ServiceMode.cityrunPlus => 'City Run Plus',
      };

  String get tagline => switch (this) {
        ServiceMode.cityrun => 'Electric bicycle',
        ServiceMode.cityrunPlus => 'Motorbike',
      };

  String get explanation => switch (this) {
        ServiceMode.cityrun =>
          'Everyday last-mile delivery on an e-bike. One flat price for the trip.',
        ServiceMode.cityrunPlus =>
          'Faster motorbike delivery. The fare is based on how far we ride.',
      };

  String get priceHint => switch (this) {
        ServiceMode.cityrun => 'Flat ₦1,000',
        ServiceMode.cityrunPlus => '₦250/km · ₦0.25/m',
      };

  static ServiceMode? tryParse(String? value) {
    return switch (value) {
      'cityrun' => ServiceMode.cityrun,
      'cityrun-plus' => ServiceMode.cityrunPlus,
      _ => null,
    };
  }
}

extension DeliveryKindX on DeliveryKind {
  String get apiValue => switch (this) {
        DeliveryKind.send => 'send',
        DeliveryKind.receive => 'receive',
        DeliveryKind.storePickup => 'store-pickup',
      };

  String get title => switch (this) {
        DeliveryKind.send => 'Send items',
        DeliveryKind.receive => 'Receive items',
        DeliveryKind.storePickup => 'Store pickup',
      };

  String get subtitle => switch (this) {
        DeliveryKind.send => 'Pick up & deliver anywhere',
        DeliveryKind.receive => 'We collect and bring to your door',
        DeliveryKind.storePickup => 'From shop to you, same day',
      };

  String get pickupLabel => switch (this) {
        DeliveryKind.send => 'Pickup address',
        DeliveryKind.receive => 'Item location',
        DeliveryKind.storePickup => 'Store address',
      };

  String get dropoffLabel => switch (this) {
        DeliveryKind.send => 'Deliver to',
        DeliveryKind.receive => 'Your address',
        DeliveryKind.storePickup => 'Deliver to',
      };

  String get pickupPlaceholder => switch (this) {
        DeliveryKind.send => 'Where should we collect the item?',
        DeliveryKind.receive => 'Where is the item coming from?',
        DeliveryKind.storePickup => 'Which store or pickup point?',
      };

  String get dropoffPlaceholder => switch (this) {
        DeliveryKind.send => 'Where should we deliver it?',
        DeliveryKind.receive => 'Where should we deliver it to you?',
        DeliveryKind.storePickup => 'Your delivery address',
      };

  static DeliveryKind fromApi(String value) {
    return switch (value) {
      'receive' => DeliveryKind.receive,
      'store-pickup' => DeliveryKind.storePickup,
      _ => DeliveryKind.send,
    };
  }
}

const deliveryStatuses = [
  'pending',
  'confirmed',
  'rider_assigned',
  'en_route_pickup',
  'picked_up',
  'in_transit',
  'arrived_at_dropoff',
  'delivered',
  'cancelled',
];

const customerStatusLabels = {
  'pending': 'Request received',
  'confirmed': 'Confirmed',
  'rider_assigned': 'Rider assigned',
  'en_route_pickup': 'Rider heading to pickup',
  'picked_up': 'Item picked up',
  'in_transit': 'Heading to destination',
  'arrived_at_dropoff': 'Rider has arrived',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled',
};

const riderStatusLabels = {
  'pending': 'New',
  'confirmed': 'Confirmed',
  'rider_assigned': 'Accepted',
  'en_route_pickup': 'To pickup',
  'picked_up': 'Picked up',
  'in_transit': 'To customer',
  'arrived_at_dropoff': 'At destination',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled',
};

const customerStatusDetails = {
  'pending': 'Waiting for a rider to accept your delivery.',
  'confirmed': 'Your request is confirmed.',
  'rider_assigned': 'A rider has accepted your order.',
  'en_route_pickup': 'Your rider is travelling to collect the item.',
  'picked_up': 'Your rider has collected the item.',
  'in_transit': 'Your rider is heading to the delivery address.',
  'arrived_at_dropoff':
      'Your rider has arrived. Please pay ₦1,000 to complete delivery.',
  'delivered': 'Your items have been delivered.',
  'cancelled': 'This delivery was cancelled.',
};

const riderNextAction = {
  'pending': {
    'nextStatus': 'rider_assigned',
    'buttonLabel': 'Accept order',
    'notifyText': 'Ride accepted',
  },
  'confirmed': {
    'nextStatus': 'rider_assigned',
    'buttonLabel': 'Accept order',
    'notifyText': 'Ride accepted',
  },
  'rider_assigned': {
    'nextStatus': 'en_route_pickup',
    'buttonLabel': 'On my way to pickup',
    'notifyText': 'Heading to pickup',
  },
  'en_route_pickup': {
    'nextStatus': 'picked_up',
    'buttonLabel': 'Picked up item',
    'notifyText': 'Item picked up',
  },
  'picked_up': {
    'nextStatus': 'in_transit',
    'buttonLabel': 'On my way to customer',
    'notifyText': 'Heading to customer',
  },
  'in_transit': {
    'nextStatus': 'arrived_at_dropoff',
    'buttonLabel': 'Arrived at destination',
    'notifyText': 'Arrived at destination',
  },
  'arrived_at_dropoff': {
    'nextStatus': 'delivered',
    'buttonLabel': 'Mark as delivered',
    'notifyText': 'Delivery completed',
  },
};

const activeDeliveryStatuses = [
  'rider_assigned',
  'en_route_pickup',
  'picked_up',
  'in_transit',
  'arrived_at_dropoff',
];

const cancellableStatuses = [
  'pending',
  'confirmed',
  'rider_assigned',
  'en_route_pickup',
];

bool isActiveDelivery(String status) =>
    activeDeliveryStatuses.contains(status) || status == 'confirmed';

class DeliveryOrder {
  const DeliveryOrder({
    required this.id,
    required this.kind,
    required this.pickup,
    required this.dropoff,
    required this.itemDescription,
    required this.itemSize,
    required this.notes,
    required this.contactName,
    required this.contactPhone,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.itemPhotoUrl,
    this.proofOfDeliveryUrl,
    this.userId,
    this.riderName,
    this.riderPhone,
    this.riderId,
    this.riderLocation,
    this.fareKobo,
    this.paymentMethod,
  });

  final String id;
  final DeliveryKind kind;
  final AddressValue pickup;
  final AddressValue dropoff;
  final String itemDescription;
  final String itemSize;
  final String notes;
  final String contactName;
  final String contactPhone;
  final String status;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? itemPhotoUrl;
  final String? proofOfDeliveryUrl;
  final String? userId;
  final String? riderName;
  final String? riderPhone;
  final String? riderId;
  final AddressValue? riderLocation;
  final int? fareKobo;
  final String? paymentMethod;

  bool get isPaid =>
      paymentMethod == 'wallet' || paymentMethod == 'paystack';
  bool get awaitingPayment => status == 'arrived_at_dropoff' && !isPaid;
  bool get canCancel => cancellableStatuses.contains(status);
  int get dueKobo => fareKobo ?? 100000;
  String get statusLabel =>
      customerStatusLabels[status] ?? status.replaceAll('_', ' ');
  String get riderStatusLabel =>
      riderStatusLabels[status] ?? status.replaceAll('_', ' ');

  factory DeliveryOrder.fromJson(Map<String, dynamic> json) {
    AddressValue? riderLoc;
    final rawLoc = json['riderLocation'];
    if (rawLoc is Map) {
      riderLoc = AddressValue(
        formatted: 'Rider',
        lat: asDouble(rawLoc['lat']),
        lng: asDouble(rawLoc['lng']),
      );
    }
    return DeliveryOrder(
      id: asString(json['id']),
      kind: DeliveryKindX.fromApi(asString(json['kind'], 'send')),
      pickup: AddressValue.fromJson(json['pickup']),
      dropoff: AddressValue.fromJson(json['dropoff']),
      itemDescription: asString(json['itemDescription']),
      itemSize: asString(json['itemSize'], 'medium'),
      notes: asString(json['notes']),
      contactName: asString(json['contactName']),
      contactPhone: asString(json['contactPhone']),
      status: asString(json['status'], 'pending'),
      createdAt: DateTime.tryParse(asString(json['createdAt'])),
      updatedAt: DateTime.tryParse(asString(json['updatedAt'])),
      itemPhotoUrl: json['itemPhotoUrl']?.toString(),
      proofOfDeliveryUrl: json['proofOfDeliveryUrl']?.toString(),
      userId: json['userId']?.toString(),
      riderName: json['riderName']?.toString(),
      riderPhone: json['riderPhone']?.toString(),
      riderId: json['riderId']?.toString(),
      riderLocation: riderLoc,
      fareKobo: asInt(json['fareKobo']),
      paymentMethod: json['paymentMethod']?.toString(),
    );
  }
}

class WalletSummary {
  const WalletSummary({
    required this.userId,
    required this.balanceKobo,
    required this.currency,
    required this.updatedAt,
  });

  final String userId;
  final int balanceKobo;
  final String currency;
  final String updatedAt;

  factory WalletSummary.fromJson(Map<String, dynamic> json) {
    return WalletSummary(
      userId: asString(json['userId']),
      balanceKobo: asInt(json['balanceKobo']) ?? 0,
      currency: asString(json['currency'], 'NGN'),
      updatedAt: asString(json['updatedAt']),
    );
  }
}

class WalletTransaction {
  const WalletTransaction({
    required this.id,
    required this.type,
    required this.amountKobo,
    required this.balanceAfterKobo,
    required this.description,
    required this.createdAt,
    this.orderId,
  });

  final String id;
  final String type;
  final int amountKobo;
  final int balanceAfterKobo;
  final String description;
  final DateTime? createdAt;
  final String? orderId;

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      id: asString(json['id']),
      type: asString(json['type']),
      amountKobo: asInt(json['amountKobo']) ?? 0,
      balanceAfterKobo: asInt(json['balanceAfterKobo']) ?? 0,
      description: asString(json['description']),
      createdAt: DateTime.tryParse(asString(json['createdAt'])),
      orderId: json['orderId']?.toString(),
    );
  }
}

class WalletOverview {
  const WalletOverview({required this.wallet, required this.transactions});

  final WalletSummary wallet;
  final List<WalletTransaction> transactions;

  factory WalletOverview.fromJson(Map<String, dynamic> json) {
    return WalletOverview(
      wallet: WalletSummary.fromJson(
        Map<String, dynamic>.from(json['wallet'] as Map? ?? {}),
      ),
      transactions: (json['transactions'] as List? ?? [])
          .whereType<Map>()
          .map(
            (item) =>
                WalletTransaction.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList(),
    );
  }
}

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

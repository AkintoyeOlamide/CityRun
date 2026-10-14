import 'package:flutter_test/flutter_test.dart';

import 'package:cityrun_app/app.dart';

void main() {
  testWidgets('City Run app boots', (WidgetTester tester) async {
    await tester.pumpWidget(const CityRunApp());
    await tester.pump();
    expect(find.textContaining('CITY RUN'), findsWidgets);
  });
}

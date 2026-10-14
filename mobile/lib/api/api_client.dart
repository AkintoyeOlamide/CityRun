import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';

import 'package:cityrun_app/config.dart';
import 'package:cityrun_app/models/models.dart';

class ApiClient {
  ApiClient._();

  static final ApiClient instance = ApiClient._();

  Dio? _dio;
  PersistCookieJar? _jar;

  Future<Dio> get client async {
    if (_dio != null) return _dio!;
    final dir = await getApplicationSupportDirectory();
    _jar = PersistCookieJar(
      ignoreExpires: true,
      storage: FileStorage('${dir.path}/cookies'),
    );
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBase,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        validateStatus: (status) => status != null && status < 500,
      ),
    );
    dio.interceptors.add(CookieManager(_jar!));
    _dio = dio;
    return dio;
  }

  Future<void> clearCookies() async {
    await _jar?.deleteAll();
  }

  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    final dio = await client;
    return dio.get(path, queryParameters: query);
  }

  Future<Response<dynamic>> post(String path, {Object? data}) async {
    final dio = await client;
    return dio.post(path, data: data);
  }

  Future<Response<dynamic>> patch(String path, {Object? data}) async {
    final dio = await client;
    return dio.patch(path, data: data);
  }

  Map<String, dynamic> jsonMap(Response response) {
    final data = response.data;
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    return {};
  }

  void ensureOk(Response response, {String fallback = 'Request failed'}) {
    final status = response.statusCode ?? 0;
    if (status >= 200 && status < 300) return;
    final body = jsonMap(response);
    throw ApiException(
      body['error']?.toString() ?? fallback,
      statusCode: status,
    );
  }
}

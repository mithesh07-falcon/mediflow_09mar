import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_fonts/google_fonts.dart';

// Import features (Placeholders initially)
// import 'features/elder_portal/presentation/screens/elder_home.dart';
// import 'features/normal_portal/presentation/screens/normal_dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const ProviderScope(child: MediFlowApp()));
}

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const AuthWrapper(),
      ),
      GoRoute(
        path: '/elder',
        builder: (context, state) => const ElderHome(),
      ),
      GoRoute(
        path: '/normal',
        builder: (context, state) => const CaregiverDashboard(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
    ],
    redirect: (context, state) {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null && state.uri.toString() != '/login') {
        return '/login';
      }
      return null; // Let the AuthWrapper handle it
    },
  );
});

class MediFlowApp extends ConsumerWidget {
  const MediFlowApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'MediFlow',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
        textTheme: GoogleFonts.outfitTextTheme(),
      ),
      routerConfig: router,
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snapshot.hasData) {
          // Determine role and route accordingly
          return FutureBuilder<DocumentSnapshot>(
            future: FirebaseFirestore.instance.collection('users').doc(snapshot.data!.uid).get(),
            builder: (context, docSnapshot) {
              if (docSnapshot.connectionState == ConnectionState.waiting) {
                return const Scaffold(body: Center(child: CircularProgressIndicator()));
              }
              if (docSnapshot.hasData && docSnapshot.data!.exists) {
                final role = docSnapshot.data!.get('role') ?? 'normal';
                if (role == 'elder') {
                  return const ElderHome();
                } else {
                  return const CaregiverDashboard();
                }
              }
              return const LoginScreen(); // Fallback if user document doesn't exist yet
            },
          );
        }
        return const LoginScreen();
      },
    );
  }
}

// Temporary placeholders for initial structure verification
class ElderHome extends StatelessWidget {
  const ElderHome({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Elder Mode', style: TextStyle(fontSize: 32))));
}

class CaregiverDashboard extends StatelessWidget {
  const CaregiverDashboard({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Caregiver Mode')));
}

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Login Screen')));
}

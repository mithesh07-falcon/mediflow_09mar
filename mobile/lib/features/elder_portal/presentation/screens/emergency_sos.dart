import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

class EmergencySos extends StatefulWidget {
  const EmergencySos({super.key});

  @override
  State<EmergencySos> createState() => _EmergencySosState();
}

class _EmergencySosState extends State<EmergencySos> {
  bool _isTriggered = false;
  String _status = 'Press Large Button to Call for Help';
  Position? _lastPos;

  @override
  void initState() {
    super.initState();
    _checkLocationPermission();
  }

  void _checkLocationPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
  }

  void _triggerSos() async {
    setState(() {
      _isTriggered = true;
      _status = 'Triggering Emergency Alert...';
    });

    // 1. Get GPS Location
    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );
      _lastPos = position;
    } catch (e) {
      print('Location error: $e');
    }

    // 2. Alert linked caregivers (Mock notification logic)
    print('Sending real-time GPS coordinates: ${_lastPos?.latitude}, ${_lastPos?.longitude}');

    // 3. Initiate Direct Phone Call
    final Uri callUri = Uri(scheme: 'tel', path: '+919999999999'); // Primary contact number
    if (await canLaunchUrl(callUri)) {
      await launchUrl(callUri);
    } else {
      setState(() => _status = 'Error: Could not start call.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(backgroundColor: Colors.red, title: const Text('EMERGENCY SOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
      body: Center(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.warning, size: 100, color: Colors.orange),
            const SizedBox(height: 50),
            Text(
              _status,
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.red),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 80),

            // Large SOS Trigger
            GestureDetector(
              onTap: _triggerSos,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 500),
                decoration: BoxDecoration(
                  color: _isTriggered ? Colors.deepOrange : Colors.red,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: Colors.red.withOpacity(0.5), blurRadius: 40, spreadRadius: 10),
                  ],
                  border: Border.all(color: Colors.white, width: 8),
                ),
                padding: const EdgeInsets.all(50),
                child: const Text(
                  'SOS',
                  style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 4),
                ),
              ),
            ),
            const SizedBox(height: 50),
            if (!_isTriggered)
              const Text(
                "Hold for 3 seconds to cancel accidental touch.",
                style: TextStyle(fontSize: 18, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
          ],
        ),
      ),
    );
  }
}

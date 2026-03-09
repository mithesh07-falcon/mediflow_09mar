import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class CaregiverDashboard extends StatelessWidget {
  const CaregiverDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Caregiver Dashboard'),
        actions: [
          IconButton(icon: const Icon(Icons.notifications), onPressed: () {}),
          IconButton(icon: const Icon(Icons.settings), onPressed: () {}),
        ],
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('links').where('caregiverId', isEqualTo: 'CURRENT_UID').snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) return const Center(child: Text("Error fetching linked accounts."));
          
          final linkedElders = snapshot.data?.docs ?? [];
          if (linkedElders.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(40.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.person_add, size: 80, color: Colors.teal),
                    SizedBox(height: 20),
                    Text("No linked elder accounts. Use invite code to connect.", textAlign: TextAlign.center, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _buildSectionTitle('Active Elder Monitoring'),
              ...linkedElders.map((doc) => _ElderSummaryCard(doc: doc)).toList(),
              const SizedBox(height: 30),
              _buildSectionTitle('Shared Services'),
              _buildServiceGrid(context),
            ],
          );
        },
      ),
      bottomNavigationBar: BottomNavigationBar(
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.wallet), label: 'Wallet'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.teal)),
    );
  }

  Widget _buildServiceGrid(BuildContext context) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 15,
      mainAxisSpacing: 15,
      children: [
        _ServiceCard(label: 'Add Medicine', icon: Icons.add_moderator, color: Colors.blue, onTap: () {}),
        _ServiceCard(label: 'Book Appt', icon: Icons.calendar_month, color: Colors.green, onTap: () {}),
        _ServiceCard(label: 'Top Up Wallet', icon: Icons.account_balance_wallet, color: Colors.purple, onTap: () {}),
        _ServiceCard(label: 'View History', icon: Icons.history, color: Colors.orange, onTap: () {}),
      ],
    );
  }
}

class _ElderSummaryCard extends StatelessWidget {
  final QueryDocumentSnapshot doc;
  const _ElderSummaryCard({required this.doc});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.only(bottom: 20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            const ListTile(
              leading: CircleAvatar(radius: 25, backgroundColor: Colors.teal, child: Icon(Icons.person, color: Colors.white)),
              title: Text('Mr. Suresh Kumar', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              subtitle: Text('Last active: 5 mins ago'),
              trailing: Icon(Icons.circle, color: Colors.green, size: 12),
            ),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStat('BP', '120/80', Colors.red),
                _buildStat('SpO2', '98%', Colors.blue),
                _buildStat('Steps', '4,200', Colors.green),
              ],
            ),
            const SizedBox(height: 15),
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, foregroundColor: Colors.white, minimumSize: const Size(double.infinity, 50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
              child: const Text('View Full Health Report'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 16, color: Colors.grey)),
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ServiceCard({required this.label, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: color.withOpacity(0.05), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withOpacity(0.5), width: 1.5)),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [Icon(icon, size: 40, color: color), const SizedBox(height: 10), Text(label, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color))],
        ),
      ),
    );
  }
}

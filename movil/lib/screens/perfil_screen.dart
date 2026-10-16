import 'package:flutter/material.dart';

import '../config.dart';
import '../tema.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';
import 'cambiar_password_screen.dart';

class PerfilScreen extends StatelessWidget {
  const PerfilScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final sesion = SesionScope.of(context);
    final u = sesion.usuario!;
    final rol = switch (u.rol) {
      'organizador' => 'Organizador',
      'administrador' => 'Administrador',
      _ => 'Participante',
    };
    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: Colores.marcaSuave,
                      child: Text(u.nombre.isEmpty ? '?' : u.nombre[0].toUpperCase(),
                          style: const TextStyle(color: Colores.marcaOscura, fontSize: 22, fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(u.nombre, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                        Text(u.correo, style: const TextStyle(color: Colores.tintaSuave)),
                      ]),
                    ),
                  ]),
                  const Divider(height: 28),
                  _fila('Rol', rol),
                  if (u.codigo != null) _fila('Código', u.codigo!),
                  _fila('Documento', u.documento ?? '—'),
                  _fila('Teléfono', u.telefono ?? '—'),
                ],
              ),
            ),
          ),
          if (sesion.sinConexion)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text('Sin conexión: algunos datos pueden estar desactualizados.',
                  style: TextStyle(color: Colores.oro)),
            ),
          const SizedBox(height: 16),
          Card(
            child: Column(children: [
              ListTile(
                leading: const Icon(Icons.lock_reset),
                title: const Text('Cambiar contraseña'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context)
                    .push(MaterialPageRoute<void>(builder: (_) => const CambiarPasswordScreen())),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.edit_outlined),
                title: const Text('Editar nombre, teléfono o correo'),
                subtitle: const Text('Se hace desde la web de EventFlow'),
                trailing: const Icon(Icons.open_in_new, size: 18),
                onTap: () => abrirEnlace(context, '$apiUrl/perfil'),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.privacy_tip_outlined),
                title: const Text('Política de tratamiento de datos'),
                trailing: const Icon(Icons.open_in_new, size: 18),
                onTap: () => abrirEnlace(context, urlPolitica),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(foregroundColor: Colores.peligro),
            onPressed: () async {
              final si = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Cerrar sesión'),
                  content: const Text('Se borrarán de este celular las boletas guardadas para usar sin conexión.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                    FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Cerrar sesión')),
                  ],
                ),
              );
              if (si == true) await sesion.cerrar();
            },
            icon: const Icon(Icons.logout),
            label: const Text('Cerrar sesión'),
          ),
          const SizedBox(height: 24),
          const Center(
            child: Text('EventFlow móvil 1.0.0', style: TextStyle(color: Colores.tintaTenue, fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Widget _fila(String etiqueta, String valor) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          SizedBox(width: 100, child: Text(etiqueta, style: const TextStyle(color: Colores.tintaSuave))),
          Expanded(child: Text(valor, style: const TextStyle(fontWeight: FontWeight.w500))),
        ]),
      );
}

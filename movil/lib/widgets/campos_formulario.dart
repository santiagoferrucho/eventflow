import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../modelos.dart';
import '../servicios/api.dart';
import '../tema.dart';
import 'comunes.dart';

/// Preguntas adicionales del organizador (al estilo Google Forms).
///
/// Las respuestas se guardan como texto, igual que en la web: las casillas se
/// unen con ", ", la fecha va como AAAA-MM-DD y las imágenes como "img:<id>"
/// después de subirlas al servidor.
class CamposFormulario extends StatelessWidget {
  const CamposFormulario({
    super.key,
    required this.campos,
    required this.respuestas,
    required this.alCambiar,
    required this.api,
  });

  final List<CampoAdicional> campos;
  final Map<String, String> respuestas;
  final void Function(String id, String valor) alCambiar;
  final Api api;

  /// Devuelve el primer mensaje de error, o null si todo está bien.
  static String? validar(List<CampoAdicional> campos, Map<String, String> respuestas) {
    for (final c in campos) {
      if (c.requerido && (respuestas[c.id] ?? '').trim().isEmpty) return 'Falta responder: ${c.etiqueta}';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (campos.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final c in campos) ...[
          _Campo(campo: c, valor: respuestas[c.id] ?? '', alCambiar: (v) => alCambiar(c.id, v), api: api),
          const SizedBox(height: 16),
        ],
      ],
    );
  }
}

class _Campo extends StatelessWidget {
  const _Campo({required this.campo, required this.valor, required this.alCambiar, required this.api});

  final CampoAdicional campo;
  final String valor;
  final ValueChanged<String> alCambiar;
  final Api api;

  @override
  Widget build(BuildContext context) {
    final titulo = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(TextSpan(children: [
          TextSpan(text: campo.etiqueta, style: const TextStyle(fontWeight: FontWeight.w600, color: Colores.tinta)),
          if (campo.requerido) const TextSpan(text: ' *', style: TextStyle(color: Colores.peligro)),
        ])),
        if (campo.descripcion != null && campo.descripcion!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(campo.descripcion!, style: const TextStyle(color: Colores.tintaSuave, fontSize: 13)),
          ),
        const SizedBox(height: 8),
      ],
    );
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [titulo, _entrada(context)]);
  }

  Widget _entrada(BuildContext context) {
    switch (campo.tipo) {
      case 'parrafo':
        return TextFormField(initialValue: valor, maxLines: 4, maxLength: 2000, onChanged: alCambiar);
      case 'numero':
        return TextFormField(
          initialValue: valor,
          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
          onChanged: alCambiar,
        );
      case 'opcion_multiple':
      case 'desplegable':
        return Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final o in campo.opciones)
              ChoiceChip(label: Text(o), selected: valor == o, onSelected: (_) => alCambiar(valor == o ? '' : o)),
          ],
        );
      case 'casillas':
        final elegidas = valor.isEmpty ? <String>{} : valor.split(', ').toSet();
        return Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final o in campo.opciones)
              FilterChip(
                label: Text(o),
                selected: elegidas.contains(o),
                onSelected: (si) {
                  final nuevas = {...elegidas};
                  if (si) {
                    nuevas.add(o);
                  } else {
                    nuevas.remove(o);
                  }
                  // Mismo orden que las opciones, como en la web.
                  alCambiar(campo.opciones.where(nuevas.contains).join(', '));
                },
              ),
          ],
        );
      case 'fecha':
        return OutlinedButton.icon(
          icon: const Icon(Icons.calendar_today_outlined),
          label: Text(valor.isEmpty ? 'Elegir fecha' : valor),
          onPressed: () async {
            final hoy = DateTime.now();
            final f = await showDatePicker(
              context: context,
              initialDate: DateTime.tryParse(valor) ?? hoy,
              firstDate: DateTime(1900),
              lastDate: DateTime(hoy.year + 5),
            );
            if (f != null) {
              alCambiar('${f.year.toString().padLeft(4, '0')}-${f.month.toString().padLeft(2, '0')}-${f.day.toString().padLeft(2, '0')}');
            }
          },
        );
      case 'hora':
        return OutlinedButton.icon(
          icon: const Icon(Icons.schedule),
          label: Text(valor.isEmpty ? 'Elegir hora' : valor),
          onPressed: () async {
            final h = await showTimePicker(context: context, initialTime: TimeOfDay.now());
            if (h != null) alCambiar('${h.hour.toString().padLeft(2, '0')}:${h.minute.toString().padLeft(2, '0')}');
          },
        );
      case 'imagen':
        return _CampoImagen(valor: valor, alCambiar: alCambiar, api: api);
      default:
        return TextFormField(initialValue: valor, maxLength: 2000, onChanged: alCambiar);
    }
  }
}

class _CampoImagen extends StatefulWidget {
  const _CampoImagen({required this.valor, required this.alCambiar, required this.api});

  final String valor;
  final ValueChanged<String> alCambiar;
  final Api api;

  @override
  State<_CampoImagen> createState() => _CampoImagenState();
}

class _CampoImagenState extends State<_CampoImagen> {
  bool _subiendo = false;
  File? _archivo;

  Future<void> _elegir(ImageSource origen) async {
    final elegido = await ImagePicker().pickImage(source: origen, maxWidth: 1600, imageQuality: 85);
    if (elegido == null) return;
    final archivo = File(elegido.path);
    setState(() => _subiendo = true);
    try {
      final valor = await widget.api.subirImagen(archivo);
      if (!mounted) return;
      setState(() => _archivo = archivo);
      widget.alCambiar(valor);
    } on ApiException catch (e) {
      if (mounted) mostrarMensaje(context, e.mensaje, error: true);
    } finally {
      if (mounted) setState(() => _subiendo = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final archivo = _archivo;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (archivo != null && widget.valor.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.file(archivo, height: 160, fit: BoxFit.cover),
            ),
          ),
        Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _subiendo ? null : () => _elegir(ImageSource.camera),
              icon: const Icon(Icons.photo_camera_outlined),
              label: const Text('Cámara'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _subiendo ? null : () => _elegir(ImageSource.gallery),
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text('Galería'),
            ),
          ),
        ]),
        if (_subiendo) const Padding(padding: EdgeInsets.only(top: 8), child: LinearProgressIndicator()),
        if (!_subiendo && widget.valor.isNotEmpty && archivo == null)
          const Padding(
            padding: EdgeInsets.only(top: 6),
            child: Text('Imagen cargada.', style: TextStyle(color: Colores.exito, fontSize: 13)),
          ),
        const Padding(
          padding: EdgeInsets.only(top: 4),
          child: Text('JPG, PNG o WebP, máximo 3 MB.', style: TextStyle(color: Colores.tintaTenue, fontSize: 12)),
        ),
      ],
    );
  }
}

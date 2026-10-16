import 'package:flutter/material.dart';

import '../formato.dart';
import '../modelos.dart';
import '../servicios/api.dart';
import '../tema.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';
import 'escaner_screen.dart';

/// Panel de un evento: cifras, ocupación por categoría, estado, novedades e
/// inscritos (con búsqueda y registro manual del ingreso).
class OrgEventoScreen extends StatefulWidget {
  const OrgEventoScreen({super.key, required this.eventoId});

  final String eventoId;

  @override
  State<OrgEventoScreen> createState() => _OrgEventoScreenState();
}

class _OrgEventoScreenState extends State<OrgEventoScreen> {
  EventoGestion? _datos;
  String? _error;
  String _busqueda = '';
  String _filtro = 'todos';
  String? _marcando;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    try {
      final d = await SesionScope.leer(context).api.eventoGestion(widget.eventoId);
      if (mounted) {
        setState(() {
          _datos = d;
          _error = null;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    }
  }

  Future<void> _cambiarEstado(String estado) async {
    final api = SesionScope.leer(context).api;
    try {
      final e = await api.cambiarEstado(widget.eventoId, estado);
      final d = _datos;
      if (mounted && d != null) setState(() => _datos = EventoGestion(evento: e, registros: d.registros));
    } on ApiException catch (e) {
      if (mounted) mostrarMensaje(context, e.mensaje, error: true);
    }
  }

  Future<void> _marcarIngreso(Inscripcion r) async {
    setState(() => _marcando = r.id);
    final api = SesionScope.leer(context).api;
    try {
      final (nuevo, ya) = await api.registrarIngreso(r.id);
      final d = _datos;
      if (!mounted || d == null) return;
      setState(() => _datos = EventoGestion(
            evento: d.evento,
            registros: [for (final x in d.registros) x.id == nuevo.id ? nuevo : x],
          ));
      mostrarMensaje(context, ya ? 'Esta persona ya había ingresado.' : 'Ingreso registrado.');
    } on ApiException catch (e) {
      if (mounted) mostrarMensaje(context, e.mensaje, error: true);
    } finally {
      if (mounted) setState(() => _marcando = null);
    }
  }

  Future<void> _enviarNovedad() async {
    final api = SesionScope.leer(context).api;
    final titulo = TextEditingController();
    final mensaje = TextEditingController();
    final enviar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Enviar novedad'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titulo, maxLength: 80, decoration: const InputDecoration(labelText: 'Título')),
            const SizedBox(height: 8),
            TextField(
              controller: mensaje,
              maxLength: 300,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Mensaje'),
            ),
            const Text('Llega a quienes tienen cupo en el evento.',
                style: TextStyle(color: Colores.tintaSuave, fontSize: 12)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Enviar')),
        ],
      ),
    );
    final t = titulo.text;
    final m = mensaje.text;
    titulo.dispose();
    mensaje.dispose();
    if (enviar != true) return;
    try {
      final n = await api.enviarNovedad(widget.eventoId, t, m);
      if (mounted) mostrarMensaje(context, 'Novedad enviada a $n ${n == 1 ? 'persona' : 'personas'}.');
    } on ApiException catch (e) {
      if (mounted) mostrarMensaje(context, e.mensaje, error: true);
    }
  }

  List<Inscripcion> _lista(EventoGestion d) {
    final q = _busqueda.trim().toLowerCase();
    return d.registros.where((r) {
      if (_filtro == 'pagados' && !r.pagada) return false;
      if (_filtro == 'pendientes' && r.pagada) return false;
      if (_filtro == 'ingresados' && !r.checkInRealizado) return false;
      if (q.isEmpty) return true;
      final codigo = r.participanteNumero == null ? '' : codigoParticipante(r.participanteNumero!);
      return '${r.participante.nombre} ${r.participante.documento} ${r.participante.correo} $codigo'
          .toLowerCase()
          .contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final d = _datos;
    if (d == null) {
      return Scaffold(
        appBar: AppBar(),
        body: _error != null
            ? VistaError(mensaje: _error!, alReintentar: _cargar)
            : const Center(child: CircularProgressIndicator()),
      );
    }
    final e = d.evento;
    final esAdmin = SesionScope.of(context).usuario?.rol == 'administrador';
    final pagados = d.registros.where((r) => r.pagada).toList();
    final ingresados = pagados.where((r) => r.checkInRealizado).length;
    final recaudo = pagados.fold<int>(0, (s, r) => s + r.precioPagado);
    final bloqueado = e.estado == 'suspendido' && !esAdmin;
    final estados = esAdmin
        ? const ['publicado', 'pausado', 'cerrado', 'suspendido']
        : const ['publicado', 'pausado', 'cerrado'];
    final lista = _lista(d);

    return Scaffold(
      appBar: AppBar(
        title: Text(e.nombre, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(tooltip: 'Enviar novedad', onPressed: _enviarNovedad, icon: const Icon(Icons.campaign_outlined)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => EscanerScreen(eventoId: e.id, eventoNombre: e.nombre)),
          );
          _cargar();
        },
        icon: const Icon(Icons.qr_code_scanner),
        label: const Text('Escanear'),
      ),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            Text('${codigoEvento(e.numero)} · ${fechaLarga(e.fecha)} · ${e.lugar}',
                style: const TextStyle(color: Colores.tintaSuave, fontSize: 13)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: Cifra(valor: '${d.registros.length}', etiqueta: 'Inscritos')),
              const SizedBox(width: 8),
              Expanded(child: Cifra(valor: '${pagados.length}', etiqueta: 'Pagados')),
              const SizedBox(width: 8),
              Expanded(child: Cifra(valor: '$ingresados/${pagados.length}', etiqueta: 'Ingresaron')),
            ]),
            const SizedBox(height: 8),
            SizedBox(width: double.infinity, child: Cifra(valor: pesos(recaudo), etiqueta: 'Recaudo confirmado')),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Text('Estado del evento', style: TextStyle(fontWeight: FontWeight.w600)),
                      const Spacer(),
                      Insignia.estadoEvento(e.estado),
                    ]),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      children: [
                        for (final s in estados)
                          ChoiceChip(
                            label: Text(s[0].toUpperCase() + s.substring(1)),
                            selected: e.estado == s,
                            onSelected: bloqueado || e.estado == s ? null : (_) => _cambiarEstado(s),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      bloqueado
                          ? 'La administración suspendió este evento. Contáctala para reactivarlo.'
                          : 'Solo un evento publicado recibe inscripciones.',
                      style: const TextStyle(color: Colores.tintaSuave, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Ocupación por categoría', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 8),
            for (final c in e.categorias) _ocupacion(c),
            const SizedBox(height: 16),
            const Text('Inscritos', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 8),
            TextField(
              decoration: const InputDecoration(
                hintText: 'Buscar por nombre, documento, correo o código',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _busqueda = v),
            ),
            const SizedBox(height: 8),
            Wrap(spacing: 8, children: [
              for (final f in const ['todos', 'pagados', 'pendientes', 'ingresados'])
                ChoiceChip(
                  label: Text(f[0].toUpperCase() + f.substring(1)),
                  selected: _filtro == f,
                  onSelected: (_) => setState(() => _filtro = f),
                ),
            ]),
            const SizedBox(height: 8),
            if (lista.isEmpty)
              VistaVacia(
                icono: Icons.people_outline,
                texto: d.registros.isEmpty ? 'Todavía no hay inscritos.' : 'Ningún inscrito coincide con el filtro.',
              ),
            for (final r in lista) _inscrito(e, r),
          ],
        ),
      ),
    );
  }

  Widget _ocupacion(Categoria c) {
    final ocupados = c.cupos - c.cuposDisponibles;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(c.nombre, style: const TextStyle(fontWeight: FontWeight.w600)),
          const Spacer(),
          Text('$ocupados / ${c.cupos} · ${pesos(c.tarifa)}', style: const TextStyle(color: Colores.tintaSuave, fontSize: 13)),
        ]),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(
            value: c.cupos == 0 ? 0 : ocupados / c.cupos,
            minHeight: 6,
            backgroundColor: Colores.linea,
          ),
        ),
      ]),
    );
  }

  Widget _inscrito(Evento e, Inscripcion r) {
    final codigo = r.participanteNumero == null ? null : codigoParticipante(r.participanteNumero!);
    Widget accion;
    if (r.checkInRealizado) {
      accion = Text('Ingresó ${hora(r.checkInEn)}', style: const TextStyle(color: Colores.exito, fontSize: 12));
    } else if (r.pagada) {
      accion = TextButton(
        onPressed: _marcando == r.id ? null : () => _marcarIngreso(r),
        child: Text(_marcando == r.id ? '...' : 'Marcar ingreso'),
      );
    } else {
      accion = Insignia.estadoPago(r.estadoPago);
    }
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        shape: const Border(),
        title: Text(r.participante.nombre, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('${e.categoria(r.categoriaId)?.nombre ?? '—'} · ${r.participante.documento}',
            style: const TextStyle(fontSize: 13)),
        trailing: accion,
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (codigo != null) _detalle('Código', codigo),
          _detalle('Correo', r.participante.correo),
          _detalle('Teléfono', r.participante.telefono),
          _detalle('Valor', pesos(r.precioPagado)),
          _detalle('Inscrito', fechaHora(r.creadoEn)),
          if (r.checkInPor != null) _detalle('Ingreso registrado por', r.checkInPor!),
          for (final c in e.camposAdicionales)
            if ((r.respuestas[c.id] ?? '').isNotEmpty)
              _detalle(c.etiqueta, c.tipo == 'imagen' ? 'Imagen adjunta (ver en la web)' : r.respuestas[c.id]!),
        ],
      ),
    );
  }

  Widget _detalle(String etiqueta, String valor) => Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 130, child: Text(etiqueta, style: const TextStyle(color: Colores.tintaSuave, fontSize: 13))),
          Expanded(child: Text(valor, style: const TextStyle(fontSize: 13))),
        ]),
      );
}

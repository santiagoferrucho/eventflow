import 'package:flutter/material.dart';

import '../formato.dart';
import '../modelos.dart';
import '../servicios/api.dart';
import '../servicios/boletas_locales.dart';
import '../tema.dart';
import '../widgets/comunes.dart';
import '../widgets/sesion_scope.dart';
import 'boleta_screen.dart';

/// Mis inscripciones y boletas. Con conexión se consultan al servidor y las
/// pagadas se guardan en el celular; sin conexión se muestran las guardadas.
class MisBoletasScreen extends StatefulWidget {
  const MisBoletasScreen({super.key});

  @override
  State<MisBoletasScreen> createState() => _MisBoletasScreenState();
}

class _MisBoletasScreenState extends State<MisBoletasScreen> {
  List<MiInscripcion>? _lista;
  List<BoletaLocal> _locales = [];
  bool _sinConexion = false;
  bool _cargando = true;
  String? _pagando;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final api = SesionScope.leer(context).api;
    setState(() => _cargando = true);
    try {
      final lista = await api.misInscripciones();
      await BoletasLocales.sincronizar(lista);
      final locales = await BoletasLocales.leer();
      if (!mounted) return;
      setState(() {
        _lista = lista;
        _locales = locales;
        _sinConexion = false;
      });
    } on ApiException {
      final locales = await BoletasLocales.leer();
      if (!mounted) return;
      setState(() {
        _locales = locales;
        _sinConexion = true;
      });
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _pagar(MiInscripcion i) async {
    setState(() => _pagando = i.registro.id);
    final api = SesionScope.leer(context).api;
    try {
      final pagado = await api.pagar(i.registro.id);
      final boleta = BoletaLocal.desde(pagado, i.evento);
      if (boleta != null) await BoletasLocales.guardar(boleta);
      await _cargar();
      if (boleta != null && mounted) {
        Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => BoletaScreen(boleta: boleta, recienPagada: true)));
      }
    } on ApiException catch (e) {
      if (mounted) mostrarMensaje(context, e.mensaje, error: true);
    } finally {
      if (mounted) setState(() => _pagando = null);
    }
  }

  void _abrirBoleta(BoletaLocal b) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => BoletaScreen(boleta: b)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mis boletas')),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: _cargando && _lista == null && _locales.isEmpty
            ? ListView(children: const [SizedBox(height: 200), Center(child: CircularProgressIndicator())])
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_sinConexion)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(color: Colores.oroSuave, borderRadius: BorderRadius.circular(12)),
                      child: const Text(
                        'Sin conexión. Estas son las boletas guardadas en tu celular; sirven para ingresar.',
                        style: TextStyle(color: Colores.oro),
                      ),
                    ),
                  ..._contenido(),
                ],
              ),
      ),
    );
  }

  List<Widget> _contenido() {
    final lista = _lista;
    if (_sinConexion || lista == null) {
      if (_locales.isEmpty) {
        return const [VistaVacia(icono: Icons.confirmation_number_outlined, texto: 'No hay boletas guardadas en este celular.')];
      }
      return [for (final b in _locales) _tarjetaLocal(b)];
    }
    if (lista.isEmpty) {
      return const [
        VistaVacia(icono: Icons.confirmation_number_outlined, texto: 'Todavía no te has inscrito a ningún evento.'),
      ];
    }
    return [for (final i in lista) _tarjeta(i)];
  }

  Widget _tarjetaLocal(BoletaLocal b) => Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: ListTile(
          leading: const Icon(Icons.qr_code_2, color: Colores.marca, size: 36),
          title: Text(b.eventoNombre, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text('${b.categoria} · ${fechaLarga(b.fecha)}'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _abrirBoleta(b),
        ),
      );

  Widget _tarjeta(MiInscripcion i) {
    final r = i.registro;
    final e = i.evento;
    final categoria = e?.categoria(r.categoriaId)?.nombre ?? '—';
    final boleta = BoletaLocal.desde(r, e);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(
                child: Text(e?.nombre ?? 'Evento',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colores.tinta)),
              ),
              Insignia.estadoPago(r.estadoPago),
            ]),
            const SizedBox(height: 4),
            Text('$categoria${e == null ? '' : ' · ${fechaLarga(e.fecha)}'}',
                style: const TextStyle(color: Colores.tintaSuave)),
            if (r.checkInRealizado)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('Ingreso registrado ${fechaHora(r.checkInEn)}',
                    style: const TextStyle(color: Colores.exito, fontSize: 13)),
              ),
            const SizedBox(height: 10),
            if (boleta != null)
              FilledButton.icon(
                onPressed: () => _abrirBoleta(boleta),
                icon: const Icon(Icons.qr_code_2),
                label: const Text('Ver mi boleta'),
              )
            else if (r.estadoPago == 'pendiente')
              FilledButton(
                onPressed: _pagando == r.id ? null : () => _pagar(i),
                child: Text(_pagando == r.id ? 'Procesando...' : 'Completar pago (${pesos(r.precioPagado)})'),
              )
            else if (r.estadoPago == 'expirado')
              const Text('La reserva venció sin pago y el cupo se liberó. Puedes inscribirte de nuevo si aún hay cupos.',
                  style: TextStyle(color: Colores.tintaSuave, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

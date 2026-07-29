import type { Cargo, ResultadoClave, AccionLogro, Requisito, AppData, NivelKey } from './types';
import { seedCargos, seedResultadosClave, seedAccionesLogros, seedRequisitos } from './data/seed';
import { supabase } from './lib/supabase';
import { normalizeNivel } from './utils';

export async function fetchDataFromSupabase(): Promise<AppData> {
  try {
    // 1. Fetch Cargos con Fallback a perfiles_cargo si public.cargos está vacía
    let dbCargos: any[] = [];
    const { data: rawCargos, error: errCargos } = await supabase.from('cargos').select('*');
    if (errCargos) console.error('Error fetching cargos from Supabase:', errCargos);

    if (rawCargos && rawCargos.length > 0) {
      dbCargos = rawCargos;
    } else {
      // Fallback a perfiles_cargo para garantizar que la lista de puestos jamás sea vacía
      const { data: rawPerfiles, error: errPerfiles } = await supabase.from('perfiles_cargo').select('*');
      if (errPerfiles) console.error('Error fetching perfiles_cargo fallback:', errPerfiles);
      if (rawPerfiles && rawPerfiles.length > 0) {
        dbCargos = rawPerfiles;
      }
    }

    // 2. Fetch Resultados Clave
    const { data: dbRC, error: errRC } = await supabase.from('resultados_clave').select('*');
    if (errRC) console.error('Error fetching resultados_clave from Supabase:', errRC);

    // 3. Fetch Indicadores KPI
    const { data: dbKPI, error: errKPI } = await supabase.from('indicadores_kpi').select('*');
    if (errKPI) console.error('Error fetching indicadores_kpi from Supabase:', errKPI);

    // 4. Fetch Acciones y Logros
    const { data: dbAL, error: errAL } = await supabase.from('acciones_logros').select('*');
    if (errAL) console.error('Error fetching acciones_logros from Supabase:', errAL);

    // 5. Fetch Asignaciones
    const { data: dbAsign, error: errAsign } = await supabase.from('asignacion_resultados_cargos').select('*');
    if (errAsign) console.error('Error fetching asignacion_resultados_cargos from Supabase:', errAsign);

    // Map Resultados Clave + KPIs
    let resultadosClave: ResultadoClave[] = (dbRC || []).map((rc: any) => ({
      id: String(rc.id),
      texto: rc.texto || '',
      clasificacion: rc.clasificacion || 'Sin clasificar',
      nivel: rc.nivel || 'Sin nivel',
      kpis: (dbKPI || [])
        .filter((k: any) => String(k.resultado_clave_id) === String(rc.id))
        .map((k: any) => ({ id: String(k.id), texto: k.texto || '', nivel: k.nivel || 'Sin nivel' })),
    }));

    // Map Acciones y Logros
    let accionesLogros: AccionLogro[] = (dbAL || []).map((al: any) => ({
      id: String(al.id),
      accion: al.accion || '',
      logro: al.logro || '',
      clasificacion: al.clasificacion || 'Sin clasificar',
      nivel: al.nivel || 'Sin nivel',
    }));

    // Build map of asignaciones per cargo_id
    const asignacionesByCargo = new Map<string, { rcIds: Set<string>; kpiIds: Set<string>; alIds: Set<string> }>();
    (dbAsign || []).forEach((a: any) => {
      const cargoId = String(a.cargo_id || '');
      if (!cargoId) return;
      if (!asignacionesByCargo.has(cargoId)) {
        asignacionesByCargo.set(cargoId, { rcIds: new Set(), kpiIds: new Set(), alIds: new Set() });
      }
      const entry = asignacionesByCargo.get(cargoId)!;
      if (a.resultado_clave_id) entry.rcIds.add(String(a.resultado_clave_id));
      if (a.kpi_id) entry.kpiIds.add(String(a.kpi_id));
      if (a.accion_logro_id) entry.alIds.add(String(a.accion_logro_id));
    });

    // Map Cargos adaptando dinámicamente cualquier esquema de columnas (cargos o perfiles_cargo)
    const sourceCargos = dbCargos.length > 0 ? dbCargos : seedCargos;
    const cargos: Cargo[] = sourceCargos.map((c: any) => {
      const cargoId = String(c.id || c.idCargo || c.codigo || '');
      const asign = asignacionesByCargo.get(cargoId) || { rcIds: new Set(), kpiIds: new Set(), alIds: new Set() };
      return {
        id: cargoId,
        nombre: c.nombre_completo_cargo || c.nombre_cargo || c.nombre || c.cargo || 'Cargo sin nombre',
        nivel: normalizeNivel(c.nivel_nuevo || c.nivel_jerarquico || c.nivel || 'INTERMEDIO') as NivelKey,
        clasificacion: c.categoria_antigua || c.clasificacion || c.area || c.gerencia || 'Sin clasificar',
        resultadoClaveIds: Array.from(asign.rcIds),
        kpiIds: Array.from(asign.kpiIds),
        accionLogroIds: Array.from(asign.alIds),
        requisitoIds: c.requisitoIds || [],
      };
    });

    // Fallback a semillas si las tablas de resultados están completamente vacías (Sembrado inicial)
    if (resultadosClave.length === 0 && seedResultadosClave.length > 0) {
      resultadosClave = seedResultadosClave;
      accionesLogros = seedAccionesLogros;
      await saveToSupabase({
        cargos: seedCargos,
        resultadosClave: seedResultadosClave,
        accionesLogros: seedAccionesLogros,
        requisitos: seedRequisitos,
      });
    }

    return {
      cargos,
      resultadosClave,
      accionesLogros,
      requisitos: seedRequisitos,
    };
  } catch (error) {
    console.error('Error al cargar datos desde Supabase (fallback a seed):', error);
    return {
      cargos: seedCargos,
      resultadosClave: seedResultadosClave,
      accionesLogros: seedAccionesLogros,
      requisitos: seedRequisitos,
    };
  }
}

export async function saveToSupabase(data: AppData): Promise<void> {
  try {
    // 1. Upsert Resultados Clave
    if (data.resultadosClave && data.resultadosClave.length > 0) {
      const rcRows = data.resultadosClave.map((r) => ({
        id: String(r.id),
        texto: r.texto,
        clasificacion: r.clasificacion || 'Sin clasificar',
        nivel: r.nivel || 'Sin nivel',
      }));
      const { error: errRC } = await supabase.from('resultados_clave').upsert(rcRows);
      if (errRC) console.error('Error upserting resultados_clave:', errRC);

      // 2. Upsert KPIs
      const kpiRows: any[] = [];
      data.resultadosClave.forEach((r) => {
        (r.kpis || []).forEach((k) => {
          kpiRows.push({
            id: String(k.id),
            resultado_clave_id: String(r.id),
            texto: k.texto,
            nivel: k.nivel || r.nivel || 'Sin nivel',
          });
        });
      });
      if (kpiRows.length > 0) {
        const { error: errKPI } = await supabase.from('indicadores_kpi').upsert(kpiRows);
        if (errKPI) console.error('Error upserting indicadores_kpi:', errKPI);
      }
    }

    // 3. Upsert Acciones y Logros
    if (data.accionesLogros && data.accionesLogros.length > 0) {
      const alRows = data.accionesLogros.map((al) => ({
        id: String(al.id),
        accion: al.accion,
        logro: al.logro,
        clasificacion: al.clasificacion || 'Sin clasificar',
        nivel: al.nivel || 'Sin nivel',
      }));
      const { error: errAL } = await supabase.from('acciones_logros').upsert(alRows);
      if (errAL) console.error('Error upserting acciones_logros:', errAL);
    }

    // 4. Sync Asignaciones por Cargo
    const cargoIds = data.cargos.map((c) => String(c.id)).filter(Boolean);
    if (cargoIds.length > 0) {
      await supabase.from('asignacion_resultados_cargos').delete().in('cargo_id', cargoIds);

      const asignRows: any[] = [];
      data.cargos.forEach((c) => {
        const cId = String(c.id);
        (c.resultadoClaveIds || []).forEach((rcId) => {
          asignRows.push({
            cargo_id: cId,
            resultado_clave_id: String(rcId),
          });
        });
        (c.kpiIds || []).forEach((kpiId) => {
          asignRows.push({
            cargo_id: cId,
            kpi_id: String(kpiId),
          });
        });
        (c.accionLogroIds || []).forEach((alId) => {
          asignRows.push({
            cargo_id: cId,
            accion_logro_id: String(alId),
          });
        });
      });

      if (asignRows.length > 0) {
        const { error: errAsign } = await supabase.from('asignacion_resultados_cargos').insert(asignRows);
        if (errAsign) console.error('Error inserting asignacion_resultados_cargos:', errAsign);
      }
    }
  } catch (error) {
    console.error('Error al guardar datos en Supabase:', error);
  }
}

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

    // 5. Fetch Asignaciones relacionales activas
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

    // Construir mapa de asignaciones reales por cargo_id y nombre_cargo (insensible a Mayúsculas/Minúsculas)
    const asignacionesByCargo = new Map<string, { rcIds: Set<string>; kpiIds: Set<string>; alIds: Set<string> }>();
    (dbAsign || []).forEach((a: any) => {
      const cargoIdKey = String(a.cargo_id || '').trim().toLowerCase();
      if (!cargoIdKey) return;
      if (!asignacionesByCargo.has(cargoIdKey)) {
        asignacionesByCargo.set(cargoIdKey, { rcIds: new Set(), kpiIds: new Set(), alIds: new Set() });
      }
      const entry = asignacionesByCargo.get(cargoIdKey)!;
      if (a.resultado_clave_id) entry.rcIds.add(String(a.resultado_clave_id));
      if (a.kpi_id) entry.kpiIds.add(String(a.kpi_id));
      if (a.accion_logro_id) entry.alIds.add(String(a.accion_logro_id));
    });

    // Map Cargos: busca coincidencia de asignaciones estrictamente por cargo_id oficial en Supabase
    const sourceCargos = dbCargos.length > 0 ? dbCargos : seedCargos;
    const cargos: Cargo[] = sourceCargos.map((c: any) => {
      const rawId = String(c.id || c.idCargo || c.codigo || '').trim();
      const rawName = String(c.nombre_completo_cargo || c.nombre_cargo || c.nombre || c.cargo || '').trim();
      
      const asign = asignacionesByCargo.get(rawId.toLowerCase());
      const rcIds = asign ? Array.from(asign.rcIds) : [];
      
      // Cascading KPIs automáticamente desde los Resultados Clave asignados
      const kpiSet = new Set<string>(asign ? Array.from(asign.kpiIds) : []);
      rcIds.forEach((rcId) => {
        const rcObj = resultadosClave.find((r) => String(r.id) === String(rcId));
        if (rcObj && rcObj.kpis) {
          rcObj.kpis.forEach((k) => kpiSet.add(String(k.id)));
        }
      });

      return {
        id: rawId,
        nombre: rawName || 'Cargo sin nombre',
        nivel: normalizeNivel(c.nivel_nuevo || c.nivel_jerarquico || c.nivel || 'INTERMEDIO') as NivelKey,
        clasificacion: c.categoria_antigua || c.clasificacion || c.area || c.gerencia || 'Sin clasificar',
        resultadoClaveIds: rcIds,
        kpiIds: Array.from(kpiSet),
        accionLogroIds: asign ? Array.from(asign.alIds) : [],
        requisitoIds: [],
      };
    });

    // Cargar semillas de catálogo si las tablas están vacías (sin autoguardar asignaciones ficticias)
    if (resultadosClave.length === 0 && seedResultadosClave.length > 0) {
      resultadosClave = seedResultadosClave;
      accionesLogros = seedAccionesLogros;
    }

    return {
      cargos,
      resultadosClave,
      accionesLogros,
      requisitos: seedRequisitos,
    };
  } catch (error) {
    console.error('Error al cargar datos desde Supabase (fallback seguro):', error);
    return {
      cargos: seedCargos.map((c) => ({ ...c, resultadoClaveIds: [], kpiIds: [], accionLogroIds: [], requisitoIds: [] })),
      resultadosClave: seedResultadosClave,
      accionesLogros: seedAccionesLogros,
      requisitos: seedRequisitos,
    };
  }
}

function notifyParentStatus(type: 'success' | 'error' | 'saving', message?: string) {
  try {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'STATUS_WIDGET_UPDATE', statusType: type, message }, '*');
      if ((window.parent as any).updateStatusWidget) {
        (window.parent as any).updateStatusWidget(type, message);
      }
    }
  } catch (e) {
    // Ignore cross-origin errors if any
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
      const { data: resRC, error: errRC } = await supabase.from('resultados_clave').upsert(rcRows).select();
      if (errRC || !resRC || (Array.isArray(resRC) && resRC.length === 0)) {
        console.error('[REACT STORAGE ERROR] [BBDD ERROR] Mutación fallida en resultados_clave:', errRC);
        notifyParentStatus('error', 'Error al guardar en BBDD (resultados_clave)');
        throw errRC || new Error('No se confirmaron escrituras en resultados_clave');
      }
      console.log('[BBDD SUCCESS] Objeto persistido correctamente en resultados_clave. Filas afectadas:', resRC.length);

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
        const { data: resKPI, error: errKPI } = await supabase.from('indicadores_kpi').upsert(kpiRows).select();
        if (errKPI || !resKPI || (Array.isArray(resKPI) && resKPI.length === 0)) {
          console.error('[REACT STORAGE ERROR] [BBDD ERROR] Mutación fallida en indicadores_kpi:', errKPI);
          notifyParentStatus('error', 'Error al guardar en BBDD (indicadores_kpi)');
          throw errKPI || new Error('No se confirmaron escrituras en indicadores_kpi');
        }
        console.log('[BBDD SUCCESS] Objeto persistido correctamente en indicadores_kpi. Filas afectadas:', resKPI.length);
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
      const { data: resAL, error: errAL } = await supabase.from('acciones_logros').upsert(alRows).select();
      if (errAL || !resAL || (Array.isArray(resAL) && resAL.length === 0)) {
        console.error('[REACT STORAGE ERROR] [BBDD ERROR] Mutación fallida en acciones_logros:', errAL);
        notifyParentStatus('error', 'Error al guardar en BBDD (acciones_logros)');
        throw errAL || new Error('No se confirmaron escrituras en acciones_logros');
      }
      console.log('[BBDD SUCCESS] Objeto persistido correctamente en acciones_logros. Filas afectadas:', resAL.length);
    }

    // 4. Sync Asignaciones por Cargo (Purga por ID y por Nombre de Cargo)
    const cargoIdsSet = new Set<string>();
    data.cargos.forEach((c) => {
      if (c.id) cargoIdsSet.add(String(c.id).trim());
      if (c.nombre) cargoIdsSet.add(String(c.nombre).trim());
    });
    const cargoIdsArr = Array.from(cargoIdsSet).filter(Boolean);

    if (cargoIdsArr.length > 0) {
      await supabase.from('asignacion_resultados_cargos').delete().in('cargo_id', cargoIdsArr);

      const asignRows: any[] = [];
      data.cargos.forEach((c) => {
        const cId = String(c.id).trim();
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
        const { data: resAsign, error: errAsign } = await supabase.from('asignacion_resultados_cargos').insert(asignRows).select();
        if (errAsign || !resAsign || (Array.isArray(resAsign) && resAsign.length === 0)) {
          console.error('[REACT STORAGE ERROR] [BBDD ERROR] Mutación fallida en asignacion_resultados_cargos:', errAsign);
          notifyParentStatus('error', 'Error al guardar en BBDD (asignacion_resultados_cargos)');
          throw errAsign || new Error('No se confirmaron escrituras en asignacion_resultados_cargos');
        }
        console.log('[BBDD SUCCESS] Objeto persistido correctamente en asignacion_resultados_cargos. Filas afectadas:', resAsign.length);
      }

      // 5. Sincronización Bi-Direccional hacia public.perfiles_cargo (JSONB)
      for (const c of data.cargos) {
        const cId = String(c.id).trim();
        if (!cId) continue;
        const activeRCs = (data.resultadosClave || [])
          .filter((r) => (c.resultadoClaveIds || []).includes(r.id))
          .map((r) => r.texto);

        const activeKPIs = (data.resultadosClave || [])
          .flatMap((r) => r.kpis || [])
          .filter((k) => (c.kpiIds || []).includes(k.id))
          .map((k) => k.texto);

        const activeContribs = (data.accionesLogros || [])
          .filter((al) => (c.accionLogroIds || []).includes(al.id))
          .map((al) => ({ accion: al.accion, logro_esperado: al.logro }));

        try {
          const { data: resPerf, error: errPerf } = await supabase.from('perfiles_cargo').upsert({
            id: cId,
            resultados_clave: activeRCs,
            kpis: activeKPIs,
            contribuciones: activeContribs,
            fecha_actualizacion: new Date().toISOString()
          }, { onConflict: 'id' }).select();

          if (errPerf || !resPerf || (Array.isArray(resPerf) && resPerf.length === 0)) {
            console.error('[REACT STORAGE ERROR] [BBDD ERROR] Mutación fallida en perfiles_cargo:', errPerf);
            notifyParentStatus('error', 'Error al guardar en BBDD (perfiles_cargo)');
          } else {
            console.log('[BBDD SUCCESS] Objeto persistido correctamente en perfiles_cargo. Filas afectadas:', resPerf.length);
            notifyParentStatus('success', 'Guardado en BBDD ✓');
          }
        } catch (ePerf) {
          console.warn('Aviso no crítico al actualizar perfil JSONB bi-direccional:', ePerf);
        }
      }
    }
  } catch (error) {
    console.error('Error al guardar datos en Supabase:', error);
    notifyParentStatus('error', 'Error al guardar datos en Supabase');
  }
}


import type { Cargo, ResultadoClave, AccionLogro, Requisito, AppData, NivelKey } from './types';
import { seedCargos, seedResultadosClave, seedAccionesLogros, seedRequisitos } from './data/seed';
import { supabase } from './lib/supabase';
import { normalizeNivel } from './utils';

export async function checkIframeAuth(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) return true;

    // Fallback: Verificar sesión del marco principal parent (window.parent)
    if (typeof window !== 'undefined' && (window.parent as any)?.supabaseClient) {
      const { data: { session: parentSession } } = await (window.parent as any).supabaseClient.auth.getSession();
      if (parentSession && parentSession.user && parentSession.access_token) {
        await supabase.auth.setSession({
          access_token: parentSession.access_token,
          refresh_token: parentSession.refresh_token || '',
        });
        return true;
      }
    }
  } catch (e) {}
  return false;
}

export async function fetchDataFromSupabase(): Promise<AppData> {
  try {
    const isAuth = await checkIframeAuth();
    if (!isAuth) {
      console.warn('[AUTH GUARD] Carga de datos abortada en iFrame: Usuario no autenticado.');
      return {
        cargos: [],
        resultadosClave: [],
        accionesLogros: [],
        requisitos: []
      };
    }

    // 1. Fetch Cargos con Fallback a perfiles_cargo si public.cargos está vacía
    let dbCargos: any[] = [];
    const { data: rawCargos, error: errCargos } = await supabase.from('cargos').select('*');
    if (errCargos) console.error('Error fetching cargos from Supabase:', errCargos);

    const { data: rawPerfiles, error: errPerfiles } = await supabase.from('perfiles_cargo').select('*');
    if (errPerfiles) console.error('Error fetching perfiles_cargo fallback:', errPerfiles);

    if (rawCargos && rawCargos.length > 0) {
      dbCargos = rawCargos;
    } else if (rawPerfiles && rawPerfiles.length > 0) {
      dbCargos = rawPerfiles;
    }

    // Mapa auxiliar de perfiles_cargo por id (lower)
    const perfilesMap = new Map<string, any>();
    (rawPerfiles || []).forEach((p: any) => {
      const pid = String(p.id || '').trim().toLowerCase();
      if (pid) perfilesMap.set(pid, p);
    });

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

    // Construir mapa de asignaciones reales por cargo_id
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

    // Map Cargos con Hidratación Inteligente Fallback desde perfiles_cargo (JSONB)
    const sourceCargos = dbCargos.length > 0 ? dbCargos : seedCargos;
    const cargos: Cargo[] = sourceCargos.map((c: any) => {
      const rawId = String(c.id || c.idCargo || c.codigo || '').trim();
      const rawName = String(c.nombre_completo_cargo || c.nombre_cargo || c.nombre || c.cargo || '').trim();
      const lowerId = rawId.toLowerCase();
      
      let asign = asignacionesByCargo.get(lowerId);
      const perfilObj = perfilesMap.get(lowerId);

      let rcIds: string[] = asign ? Array.from(asign.rcIds) : [];
      let alIds: string[] = asign ? Array.from(asign.alIds) : [];
      const kpiSet = new Set<string>(asign ? Array.from(asign.kpiIds) : []);

      // FALLBACK HYDRATION: Si las asignaciones relacionales están vacías pero perfiles_cargo contiene datos JSONB
      if (perfilObj) {
        // Hydrate Resultados Clave desde perfilObj.resultados_clave
        const rawRCs = Array.isArray(perfilObj.resultados_clave) ? perfilObj.resultados_clave : [];
        rawRCs.forEach((rcTxt: any) => {
          const txt = typeof rcTxt === 'string' ? rcTxt.trim() : (rcTxt?.texto || '');
          if (!txt) return;
          let matchRC = resultadosClave.find(r => r.texto.trim().toLowerCase() === txt.toLowerCase());
          if (!matchRC) {
            matchRC = {
              id: `rc-jsonb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              texto: txt,
              clasificacion: c.categoria_antigua || c.clasificacion || 'Sin clasificar',
              nivel: normalizeNivel(c.nivel_nuevo || c.nivel || 'INTERMEDIO'),
              kpis: []
            };
            resultadosClave.push(matchRC);
          }
          if (!rcIds.includes(matchRC.id)) rcIds.push(matchRC.id);
        });

        // Hydrate KPIs desde perfilObj.kpis
        const rawKPIs = Array.isArray(perfilObj.kpis) ? perfilObj.kpis : [];
        rawKPIs.forEach((kpiTxt: any) => {
          const txt = typeof kpiTxt === 'string' ? kpiTxt.trim() : (kpiTxt?.texto || '');
          if (!txt) return;
          // Buscar en todos los KPIs existentes
          for (const rc of resultadosClave) {
            const matchK = rc.kpis?.find(k => k.texto.trim().toLowerCase() === txt.toLowerCase());
            if (matchK) {
              kpiSet.add(matchK.id);
            }
          }
        });

        // Hydrate Contribuciones / Acciones y Logros desde perfilObj.contribuciones
        const rawContribs = Array.isArray(perfilObj.contribuciones) ? perfilObj.contribuciones : [];
        rawContribs.forEach((contrib: any) => {
          const acc = typeof contrib === 'string' ? contrib.trim() : (contrib?.accion || '');
          const logro = typeof contrib === 'object' ? (contrib?.logro_esperado || contrib?.logro || '') : '';
          if (!acc) return;
          let matchAL = accionesLogros.find(al => al.accion.trim().toLowerCase() === acc.toLowerCase());
          if (!matchAL) {
            matchAL = {
              id: `al-jsonb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              accion: acc,
              logro: logro,
              clasificacion: c.categoria_antigua || c.clasificacion || 'Sin clasificar',
              nivel: normalizeNivel(c.nivel_nuevo || c.nivel || 'INTERMEDIO')
            };
            accionesLogros.push(matchAL);
          }
          if (!alIds.includes(matchAL.id)) alIds.push(matchAL.id);
        });
      }
      
      // Cascading KPIs automáticamente desde los Resultados Clave asignados
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
        accionLogroIds: alIds,
        requisitoIds: [],
      };
    });

    // Cargar semillas de catálogo únicamente si las tablas están completamente vacías
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
  // Auth Guard: Verificar si existe una sesión activa antes de mutar Supabase
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData || !sessionData.session) {
      console.warn('[AUTH GUARD] Mutación abortada en iFrame: Usuario no autenticado.');
      return;
    }
  } catch (eAuthCheck) {
    console.warn('[AUTH GUARD] Error al verificar sesión en iFrame:', eAuthCheck);
    return;
  }

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
        console.error('[RLS / AUTH ERROR] Fallo de permisos en resultados_clave:', errRC?.message, errRC?.details, errRC?.code);
        notifyParentStatus('error', 'Error al guardar en BBDD (resultados_clave)');
        throw errRC || new Error('No se confirmaron escrituras en resultados_clave');
      }
      console.log(`[REAL DB TEST - SUBMÓDULO REACT] OK | Filas confirmadas (resultados_clave): ${resRC.length}`);

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
          console.error('[RLS / AUTH ERROR] Fallo de permisos en indicadores_kpi:', errKPI?.message, errKPI?.details, errKPI?.code);
          notifyParentStatus('error', 'Error al guardar en BBDD (indicadores_kpi)');
          throw errKPI || new Error('No se confirmaron escrituras en indicadores_kpi');
        }
        console.log(`[REAL DB TEST - SUBMÓDULO REACT] OK | Filas confirmadas (indicadores_kpi): ${resKPI.length}`);
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
        console.error('[RLS / AUTH ERROR] Fallo de permisos en acciones_logros:', errAL?.message, errAL?.details, errAL?.code);
        notifyParentStatus('error', 'Error al guardar en BBDD (acciones_logros)');
        throw errAL || new Error('No se confirmaron escrituras en acciones_logros');
      }
      console.log(`[REAL DB TEST - SUBMÓDULO REACT] OK | Filas confirmadas (acciones_logros): ${resAL.length}`);
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
          console.error('[RLS / AUTH ERROR] Fallo de permisos en asignacion_resultados_cargos:', errAsign?.message, errAsign?.details, errAsign?.code);
          notifyParentStatus('error', 'Error al guardar en BBDD (asignacion_resultados_cargos)');
          throw errAsign || new Error('No se confirmaron escrituras en asignacion_resultados_cargos');
        }
        console.log(`[REAL DB TEST - SUBMÓDULO REACT] OK | Filas confirmadas (asignacion_resultados_cargos): ${resAsign.length}`);
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
            console.error('[RLS / AUTH ERROR] Fallo de permisos en perfiles_cargo:', errPerf?.message, errPerf?.details, errPerf?.code);
            notifyParentStatus('error', 'Error al guardar en BBDD (perfiles_cargo)');
          } else {
            console.log(`[REAL DB TEST - SUBMÓDULO REACT] OK | Filas confirmadas (perfiles_cargo): ${resPerf.length}`);
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

